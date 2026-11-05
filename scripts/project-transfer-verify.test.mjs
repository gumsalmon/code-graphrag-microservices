import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { safeTransferPath, sensitiveTransferPath, isHistoricalManifestPath, verifyProjectTransfer } from './verify_project_transfer.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const head = 'd1f95eb21c71dd6bfb49d2e450142d1290ceda5f';
async function fixture(callback, { files = { 'source/code.mjs': '// toy source\n' }, omissions = [], history = [], flags = {} } = {}) {
  const root = await mkdtemp(resolve(tmpdir(), 'graph-transfer-verifier-test-'));
  try {
    const all = new Map(Object.entries(files).map(([name, bytes]) => [name, Buffer.from(bytes)]));
    const metadata = { schema: 'code-graphrag-project-transfer/1', profile: 'ai-starter', status: 'snapshot_not_research_approval',
      source_head: head, source_branch: 'codex/toy', git_directory_included: false, api_credentials_included: false,
      research_approval: false, official_scoring_authorized: false, files: [...all].map(([path, bytes]) => ({ path, sha256: hash(bytes), bytes: bytes.length })),
      omissions, historical_manifests: history, ...flags };
    all.set('META/transfer.json', Buffer.from(json(metadata)));
    all.set('SHA256SUMS.txt', Buffer.from([...all].sort(([a], [b]) => a.localeCompare(b)).map(([name, bytes]) => hash(bytes) + '  ' + name).join('\n') + '\n'));
    for (const [name, bytes] of all) { await mkdir(dirname(resolve(root, name)), { recursive: true }); await writeFile(resolve(root, name), bytes); }
    await callback(root, metadata, all);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('portable path validation rejects traversal, alternate streams, controls and Windows aliases', () => {
  for (const value of ['../a', '/a', 'C:/a', 'a\\b', 'a//b', 'a/./b', 'a/../b', 'x\nfile', 'name.', 'name ', 'con', 'aux.txt', 'LPT1.log', ''])
    assert.equal(safeTransferPath(value), false, value);
  for (const value of ['META/transfer.json', '.gitattributes', 'bằng-chứng/log.txt', 'a.b/c_d-1']) assert.equal(safeTransferPath(value), true, value);
  assert.equal(safeTransferPath('omitted/', { prefix: true }), true);
  assert.equal(safeTransferPath('omitted/'), false);
});

test('sensitive paths are excluded without reading their values', () => {
  for (const value of ['.git/config', 'copy/.git/HEAD', '.env', '.env.example', 'credentials/key.json', 'secrets/data.txt', 'a/key.clixml',
    'a/key.dpapi', '.ssh/config', '.aws/config', 'a/id_rsa', 'a/provider-response.json', 'a/key.pem', 'a/private_key.txt'])
    assert.equal(sensitiveTransferPath(value), true, value);
  for (const value of ['.gitignore', '.gitattributes', 'docs/gemini-key.mjs', 'source/code.mjs']) assert.equal(sensitiveTransferPath(value), false, value);
});

test('historical manifest recognition is explicit and includes preserved provenance copies', () => {
  for (const value of ['old/SHA256SUMS.txt', 'raw/input_checksums.sha256', 'raw/build-original-checksums.sha256', 'review/ARCHIVES.sha256']) assert.equal(isHistoricalManifestPath(value), true);
  assert.equal(isHistoricalManifestPath('SHA256SUMS.txt'), false);
  assert.equal(isHistoricalManifestPath('scripts/update_checksums.ps1'), false);
});

test('complete synthetic package verifies with no runtime or research approval', async () => fixture(async root => {
  const result = await verifyProjectTransfer(root);
  assert.equal(result.files_verified, 2); assert.equal(result.total_regular_files, 3);
  assert.equal(result.ground_truth_accepted, false); assert.equal(result.remote_calls, 0);
  assert.equal(result.official_scoring_authorized, false); assert.equal(result.original_evidence_rewritten, false);
  assert.equal(result.historical_missing_count, 0);
}));

test('copied manifests keep distinct original hashes for a shared absent basename', async () => {
  const first = 'run/provenance/build-original-checksums.sha256', second = 'run/provenance/baseline-original-checksums.sha256';
  const files = { [first]: hash('build') + '  cleanup.json\n', [second]: hash('runtime') + '  cleanup.json\n' };
  const history = [first, second].map(path => ({ path, verified: 0, omitted: 1 }));
  const omission = { path: 'run/provenance/cleanup.json', reason: 'copied original bases differ',
    original_references: [{ manifest: first, sha256: hash('build') }, { manifest: second, sha256: hash('runtime') }] };
  await fixture(async root => {
    const report = await verifyProjectTransfer(root); assert.equal(report.historical_missing_count, 2);
  }, { files, history, omissions: [omission] });
  await fixture(async root => assert.rejects(verifyProjectTransfer(root), /Copied historical origin\/hash is not declared/u), {
    files, history, omissions: [{ ...omission, original_references: omission.original_references.slice(0, 1) }]
  });
});

test('repository-relative historical manifest uses declared snapshot base without rewriting', async () => {
  const files = { 'audit/SHA256SUMS.txt': hash('source') + '  source/file.txt\n', 'snapshot/source/file.txt': 'source' };
  const history = [{ path: 'audit/SHA256SUMS.txt', verified: 1, omitted: 0, base_directory: 'snapshot' }];
  await fixture(async root => assert.equal((await verifyProjectTransfer(root)).historical_files_verified, 1), { files, history });
  await fixture(async root => assert.rejects(verifyProjectTransfer(root), /Unsafe historical manifest base/u), {
    files, history: [{ ...history[0], base_directory: '../escape' }]
  });
});

test('original semantic smoke is skipped when a required run artifact was intentionally omitted', async () => {
  const path = 'handoff-out/p01-retrieval/20261012T151104176Z-89ba55ec';
  await fixture(async root => {
    const report = await verifyProjectTransfer(root, { smoke: true });
    const item = report.smoke_checks.find(value => value.id === 'p01-retrieval');
    assert.equal(item.status, 'skipped'); assert.match(item.reason, /intentionally omitted/u);
  }, { files: { [path + '/partial.json']: '{}' }, omissions: [{ path: path + '/cache.ses', reason: 'transient session not transferred' }] });
});

test('content tamper is rejected', async () => fixture(async root => {
  await writeFile(resolve(root, 'source/code.mjs'), 'changed');
  await assert.rejects(verifyProjectTransfer(root), /Checksum mismatch/);
}));

test('unlisted file is rejected', async () => fixture(async root => {
  await writeFile(resolve(root, 'extra.txt'), 'extra');
  await assert.rejects(verifyProjectTransfer(root), /missing\/unlisted/);
}));

test('duplicate-case manifest names are rejected independent of host filesystem', async () => fixture(async root => {
  const manifest = await readFile(resolve(root, 'SHA256SUMS.txt'), 'utf8');
  await writeFile(resolve(root, 'SHA256SUMS.txt'), manifest + hash('anything') + '  SOURCE/code.mjs\n');
  await assert.rejects(verifyProjectTransfer(root), /Unsafe\/duplicate\/malformed/);
}));

test('manifest traversal is rejected before resolving a target', async () => fixture(async root => {
  await writeFile(resolve(root, 'SHA256SUMS.txt'), hash('escape') + '  ../escape.txt\n');
  await assert.rejects(verifyProjectTransfer(root), /Unsafe\/duplicate\/malformed/);
}));

for (const flag of ['git_directory_included', 'api_credentials_included', 'research_approval', 'official_scoring_authorized'])
  test('metadata cannot claim ' + flag, async () => fixture(async root => {
    await assert.rejects(verifyProjectTransfer(root), /Transfer cannot authorize or include/);
  }, { flags: { [flag]: true } }));

test('metadata bytes inventory must agree even when root checksums match', async () => fixture(async root => {
  await assert.rejects(verifyProjectTransfer(root), /File inventory differs/);
}, { flags: { files: [{ path: 'source/code.mjs', sha256: hash('// toy source\n'), bytes: 999 }] } }));

test('present historical entries are verified from the original manifest directory', async () => fixture(async root => {
  const result = await verifyProjectTransfer(root);
  assert.equal(result.historical_files_verified, 1); assert.equal(result.historical_missing_count, 0);
}, { files: { 'old/data.txt': 'retained', 'old/checksums.sha256': hash('retained') + '  data.txt\n' },
  history: [{ path: 'old/checksums.sha256', verified: 1, omitted: 0 }] }));

test('multiple historical trailing blank lines are tolerated without rewriting bytes', async () => fixture(async root => {
  const original = await readFile(resolve(root, 'old/checksums.sha256'));
  const result = await verifyProjectTransfer(root);
  assert.equal(result.historical_files_verified, 1);
  assert.deepEqual(await readFile(resolve(root, 'old/checksums.sha256')), original);
}, { files: { 'old/data.txt': 'retained', 'old/checksums.sha256': hash('retained') + '  data.txt\r\n\r\n\r\n' },
  history: [{ path: 'old/checksums.sha256', verified: 1, omitted: 0 }] }));

test('interior blank manifest lines remain invalid', async () => fixture(async root => {
  await assert.rejects(verifyProjectTransfer(root), /Unsafe\/duplicate\/malformed manifest/);
}, { files: { 'old/data.txt': 'retained', 'old/checksums.sha256': hash('retained') + '  data.txt\n\n' + hash('other') + '  absent.txt\n' },
  omissions: [{ path: 'old/absent.txt', reason: 'Excluded' }],
  history: [{ path: 'old/checksums.sha256', verified: 1, omitted: 1 }] }));

test('missing historical file requires an explicit matching omission', async () => fixture(async root => {
  await assert.rejects(verifyProjectTransfer(root), /missing without matching explicit omission/);
}, { files: { 'old/checksums.sha256': hash('omitted raw') + '  provider-response.json\n' },
  history: [{ path: 'old/checksums.sha256', verified: 0, omitted: 1 }] }));

test('explicit omitted file keeps original manifest bytes and pending state', async () => fixture(async root => {
  const before = await readFile(resolve(root, 'old/checksums.sha256'));
  const result = await verifyProjectTransfer(root);
  assert.equal(result.historical_missing_count, 1); assert.equal(result.historical_files_verified, 0);
  assert.equal(result.independent_review_completed, false);
  assert.deepEqual(await readFile(resolve(root, 'old/checksums.sha256')), before);
}, { files: { 'old/checksums.sha256': hash('omitted raw') + '  provider-response.json\n' },
  omissions: [{ path: 'old/provider-response.json', sha256: hash('omitted raw'), reason: 'Raw provider response excluded' }],
  history: [{ path: 'old/checksums.sha256', verified: 0, omitted: 1 }] }));

test('explicit prefix omission covers a missing historical subtree', async () => fixture(async root => {
  assert.equal((await verifyProjectTransfer(root)).historical_missing_count, 1);
}, { files: { 'old/checksums.sha256': hash('binary') + '  artifacts/app.jar\n' },
  omissions: [{ path: 'old/artifacts/', reason: 'Starter profile excludes app binaries' }],
  history: [{ path: 'old/checksums.sha256', verified: 0, omitted: 1 }] }));

test('wrong omitted-file hash is rejected', async () => fixture(async root => {
  await assert.rejects(verifyProjectTransfer(root), /missing without matching explicit omission/);
}, { files: { 'old/checksums.sha256': hash('original') + '  absent.txt\n' },
  omissions: [{ path: 'old/absent.txt', sha256: hash('wrong'), reason: 'Excluded' }],
  history: [{ path: 'old/checksums.sha256', verified: 0, omitted: 1 }] }));

test('historical declared counts cannot pretend omissions were verified', async () => fixture(async root => {
  await assert.rejects(verifyProjectTransfer(root), /counts differ/);
}, { files: { 'old/checksums.sha256': hash('original') + '  absent.txt\n' },
  omissions: [{ path: 'old/absent.txt', reason: 'Excluded' }],
  history: [{ path: 'old/checksums.sha256', verified: 1, omitted: 0 }] }));

test('historical checksum tamper is rejected despite matching root metadata', async () => fixture(async root => {
  await assert.rejects(verifyProjectTransfer(root), /Historical checksum mismatch/);
}, { files: { 'old/data.txt': 'changed', 'old/checksums.sha256': hash('original') + '  data.txt\n' },
  history: [{ path: 'old/checksums.sha256', verified: 1, omitted: 0 }] }));

test('undeclared historical manifest is rejected', async () => fixture(async root => {
  await assert.rejects(verifyProjectTransfer(root), /Historical manifest inventory/);
}, { files: { 'old/data.txt': 'retained', 'old/checksums.sha256': hash('retained') + '  data.txt\n' } }));

test('symlink evidence is rejected if this host permits creating one', async t => fixture(async root => {
  try { await symlink(resolve(root, 'source/code.mjs'), resolve(root, 'alias.mjs'), 'file'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip('Host does not allow synthetic symlink creation'); return; } throw error; }
  await assert.rejects(verifyProjectTransfer(root), /Symlink\/escaped/);
}));

test('smoke explicitly skips absent canonical runs, without automatic setup', async () => fixture(async root => {
  const result = await verifyProjectTransfer(root, { smoke: true });
  assert.equal(result.smoke_checks.length, 5);
  assert.ok(result.smoke_checks.every(item => item.status === 'skipped' && item.reason));
  assert.equal(result.remote_calls, 0); assert.equal(result.docker_operations_performed, false);
}));
