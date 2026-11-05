import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, readdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { safeMember, phatRawBaseline, permittedForPhat, verifyPackage } from '../../scripts/verify_p02_handoff.mjs';
import { inspectTransferFile } from '../../scripts/package_p02_team_handoff.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const metadata = role => ({ schema: 'p02-team-handoff/1', role, official_scoring_authorized: false, human_acknowledgement_received: false,
  independent_universe_confirmation_received: false, contains_accepted_labels: false, contains_model_predictions: false });
async function fixture(callback, role = 'PHAT') {
  const directory = await mkdtemp(join(tmpdir(), 'p02-handoff-test-'));
  try {
    await writeFile(resolve(directory, 'PACKAGE_INDEX.json'), JSON.stringify(metadata(role)));
    await writeFile(resolve(directory, 'START_HERE.md'), 'Synthetic package, not research evidence.\n');
    await seal(directory); await callback(directory);
  } finally { await rm(directory, { recursive: true, force: true }); }
}
async function seal(directory) {
  const files = [];
  async function visit(prefix = '') {
    for (const entry of await readdir(resolve(directory, prefix), { withFileTypes: true })) {
      const name = prefix + entry.name;
      if (entry.isDirectory()) await visit(name + '/'); else if (name !== 'SHA256SUMS.txt') files.push(name);
    }
  } await visit();
  await writeFile(resolve(directory, 'SHA256SUMS.txt'), (await Promise.all(files.sort().map(async name => hash(await readFile(resolve(directory, name))) + '  ' + name))).join('\n') + '\n');
}
test('portable member names reject traversal, Windows absolute paths and ambiguous separators', () => {
  for (const name of ['START_HERE.md', 'input/app/.github/workflows/build.yml', 'evidence/baseline/config/.gitignore']) assert.equal(safeMember(name), true);
  for (const name of ['../x', '/x', 'C:/key', 'C:\\key', 'a//x', 'a/./b', 'a/../b', 'a\\b', 'a/', '', 'x\nfile']) assert.equal(safeMember(name), false);
});
test('Phat raw evidence selection retains HTTP bodies and every readiness attempt, not derived summaries', () => {
  for (const name of ['observations/direct_invalid.body', 'observations/direct_invalid.json', 'ready-api-gateway/readiness-001.json',
    'ready-api-gateway/readiness-010.body', 'logs/api-gateway.log', 'config/visits-service.yml', 'inputs.json', 'observations.exit.json', 'observations.stderr.log']) assert.equal(phatRawBaseline(name), true);
  for (const name of ['result.json', 'observations/observations.json', 'observations.stdout.log', 'ready-api-gateway.stdout.log', 'checksums.sha256']) assert.equal(phatRawBaseline(name), false);
});
test('Phat package filter blocks parser, graph, predictions and label files while allowing source snapshots', () => {
  for (const name of ['input/app/pom.xml', 'input/app/.mvn/wrapper/maven-wrapper.jar', 'draft/inventory.v1.json']) assert.equal(permittedForPhat(name), true);
  for (const name of ['implementation/src/parser.py', 'scripts/run_p02_baseline.mjs', 'graph.json', 'predictions.json', 'labels.v3.json',
    'evidence/baseline/result.json', 'input/app/.git/config', 'input/app/target/app.jar']) assert.equal(permittedForPhat(name), false);
});
test('transfer scan refuses credential paths, private key material and app binaries without printing secret bytes', () => {
  inspectTransferFile('input/app/.mvn/wrapper/maven-wrapper.jar', Buffer.from([0, 1]));
  inspectTransferFile('START_HERE.md', Buffer.from('API key is not required. GEMINI_API_KEY is an environment variable name.'));
  for (const name of ['.env', 'keys/credentials.json', 'input/app/target/app.jar', 'artifacts/visits.jar', '.git/config'])
    assert.throws(() => inspectTransferFile(name, Buffer.from('synthetic')), /path|binary/);
  for (const bytes of [Buffer.from('AIza' + 'x'.repeat(35)), Buffer.from('-----BEGIN PRIVATE KEY-----')])
    assert.throws(() => inspectTransferFile('synthetic.txt', bytes), /Possible secret in transfer file: synthetic.txt/);
});
test('recipient verifier verifies exact bytes without Git, Docker or network', async () => {
  await fixture(async directory => { const result = await verifyPackage(directory); assert.equal(result.files_verified, 2); assert.equal(result.network_calls, 0); });
});
test('changed bytes and extra unmanifested files cannot pass recipient verification', async () => {
  for (const kind of ['changed', 'extra']) await fixture(async directory => {
    await writeFile(resolve(directory, kind === 'changed' ? 'START_HERE.md' : 'extra.txt'), 'Modified');
    await assert.rejects(verifyPackage(directory), /File differs|unmanifested/);
  });
});
test('duplicate/case-colliding and traversal manifest entries are rejected', async () => {
  for (const kind of ['duplicate', 'case', 'traversal']) await fixture(async directory => {
    const original = await readFile(resolve(directory, 'SHA256SUMS.txt'), 'utf8');
    const name = kind === 'duplicate' ? 'START_HERE.md' : kind === 'case' ? 'start_here.md' : '../outside';
    await writeFile(resolve(directory, 'SHA256SUMS.txt'), original + '0'.repeat(64) + '  ' + name + '\n');
    await assert.rejects(verifyPackage(directory), /Unsafe\/duplicate/);
  });
});
test('rehashing cannot promote a preparation handoff to acceptance or claim human confirmation', async () => {
  for (const field of ['official_scoring_authorized', 'human_acknowledgement_received', 'independent_universe_confirmation_received', 'contains_accepted_labels', 'contains_model_predictions'])
    await fixture(async directory => {
      await writeFile(resolve(directory, 'PACKAGE_INDEX.json'), JSON.stringify({ ...metadata('PHAT'), [field]: true })); await seal(directory);
      await assert.rejects(verifyPackage(directory), /Invalid handoff state/);
    });
});
test('even with a new manifest Phat package rejects technical outputs outside its source-first allowlist', async () => {
  for (const name of ['implementation/src/parser.py', 'predictions.json', 'labels.v3.json', 'evidence/baseline/result.json']) await fixture(async directory => {
    await mkdir(dirname(resolve(directory, name)), { recursive: true }); await writeFile(resolve(directory, name), 'Synthetic forbidden input'); await seal(directory);
    await assert.rejects(verifyPackage(directory), /source-first evidence allowlist/);
  });
});
