// New immutable F01/F02 recheck package. No source mutation, runtime, system output or approval.
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { buildP02Inputs, buildHistoricalP02InputsV1, sourceFiles, validatePinnedSources, validateVersionedSpecs } from './prepare_p02_inputs.mjs';
import { SCENARIO, UNIVERSE, HISTORY, PROPOSAL, V1, PINNED_ARTIFACTS, EXPECTED_REVISION, sha256, jsonText, verifyP02Revision } from './verify_p02_revision.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = (ok, message) => { if (!ok) throw new Error(message); };
const git = (directory, args) => execFileSync('git', ['-c', 'safe.directory=' + directory.replaceAll('\\', '/'), '-c', 'core.fsmonitor=false', '-C', directory, ...args],
  { windowsHide: true, timeout: 30000, maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

export async function prepareP02Revision(sourceDirectory) {
  const source = await realpath(resolve(sourceDirectory)), files = {};
  const scenarioBytes = await readFile(resolve(ROOT, SCENARIO)), scenario = JSON.parse(scenarioBytes);
  check(JSON.stringify(scenario.input_revision) === JSON.stringify(EXPECTED_REVISION), 'Unexpected revision metadata');
  const before = git(source, ['status', '--porcelain=v1', '--untracked-files=all']).toString('utf8');
  check(before === '' && git(source, ['rev-parse', 'HEAD']).toString('utf8').trim() === scenario.baseline_commit, 'Use a clean clone at the pinned baseline; never reset it');
  const specs = {};
  for (const name of ['scenario.json', 'fixture.json', 'scope.json', 'optional-query.patch']) {
    specs[name] = await readFile(resolve(ROOT, V1, name)); files[V1 + name] = specs[name];
  }
  validateVersionedSpecs(specs);
  const fixture = JSON.parse(specs['fixture.json']), scope = JSON.parse(specs['scope.json']), sources = {};
  for (const file of sourceFiles(scope, fixture)) {
    sources[file] = git(source, ['show', scenario.baseline_commit + ':' + file]).toString('utf8');
    check((await readFile(resolve(source, file), 'utf8')).replaceAll('\r\n', '\n') === sources[file], 'Working tree differs from pinned Git source: ' + file);
    files['input/app/' + file] = Buffer.from(sources[file]);
  }
  validatePinnedSources(sources);
  git(source, ['apply', '--check', '--whitespace=error-all', resolve(ROOT, V1, 'optional-query.patch')]);
  const input = { scenario, fixture, fixtureBytes: specs['fixture.json'], scope, sources, patch: specs['optional-query.patch'].toString('utf8') };
  const built = buildP02Inputs(input), old = buildHistoricalP02InputsV1({ ...input, scenario: JSON.parse(specs['scenario.json']) });
  files[SCENARIO] = scenarioBytes; files[UNIVERSE] = Buffer.from(jsonText(built.universe));
  files['draft/inventory.v1.json'] = Buffer.from(jsonText(built.inventory));
  files['draft/request-plan.v1.json'] = Buffer.from(jsonText(built.matrix));
  files[HISTORY] = Buffer.from(jsonText(old.universe));
  files[PROPOSAL] = await readFile(resolve(ROOT, 'benchmark/p02/preparation.v2/phat-f02-proposal.original.json'));
  for (const [name, expected] of Object.entries(PINNED_ARTIFACTS)) check(sha256(files[name]) === expected, 'Reconstructed frozen input differs: ' + name);
  const tooling = { 'tooling/prepare_p02_inputs.mjs': 'scripts/prepare_p02_inputs.mjs',
    'tooling/prepare_p02_revision.mjs': 'scripts/prepare_p02_revision.mjs', 'tooling/input-revision.test.mjs': 'pipeline/p02/input-revision.test.mjs',
    'verify_p02_revision.mjs': 'scripts/verify_p02_revision.mjs' };
  for (const [name, path] of Object.entries(tooling)) files[name] = await readFile(resolve(ROOT, path));
  for (const name of ['START_HERE.md', 'CHANGELOG.md', 'RECHECK_TEMPLATE.md']) files[name] = await readFile(resolve(ROOT, 'benchmark/p02/preparation.v2', name));
  files['INPUTS.json'] = Buffer.from(jsonText({ schema: 'p02-recheck-inputs/2', status: 'candidate_pending_phat_recheck',
    scenario: SCENARIO, universe: UNIVERSE, fixture: V1 + 'fixture.json', scenario_sha256: sha256(files[SCENARIO]), universe_sha256: sha256(files[UNIVERSE]),
    fixture_sha256: sha256(specs['fixture.json']), independent_confirmation_received: false, locked_for_labeling: false,
    labels_created: false, official_scoring_authorized: false, runtime_executed: false }));
  const after = git(source, ['status', '--porcelain=v1', '--untracked-files=all']).toString('utf8');
  check(before === after, 'Source clone changed during read-only preparation');
  files['PROVENANCE.json'] = Buffer.from(jsonText({ schema: 'p02-input-revision-provenance/2', generated_at: new Date().toISOString(),
    prepared_by: 'Codex assisting Huy; not an independent research approval', source_commit: scenario.baseline_commit,
    source_git_status_before: before, source_git_status_after: after, git_apply_check_exit_code: 0,
    base_project_head: git(ROOT, ['rev-parse', 'HEAD']).toString('utf8').trim(), dirty_project_worktree: git(ROOT, ['status', '--porcelain=v1']).length > 0,
    published_commit_for_this_revision: null, application_build_performed: false, runtime_executed: false, evaluated_system_outputs_read: false,
    independent_recheck_received: false, remote_calls: 0, node: process.version,
    code_sha256: Object.fromEntries(Object.keys(tooling).map(name => [name, sha256(files[name])])),
    historical_evidence: 'Previous baseline/raw/ZIPs remain unchanged and external to this metadata-only package; no new observation is claimed' }));
  const directory = resolve(ROOT, 'handoff-out/p02-input-revision', new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8));
  await mkdir(directory, { recursive: true });
  for (const [name, bytes] of Object.entries(files)) {
    await mkdir(dirname(resolve(directory, name)), { recursive: true }); await writeFile(resolve(directory, name), bytes, { flag: 'wx' });
  }
  await writeFile(resolve(directory, 'SHA256SUMS.txt'), Object.keys(files).sort().map(name => sha256(files[name]) + '  ' + name).join('\n') + '\n', { flag: 'wx' });
  return verifyP02Revision(directory);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    check(process.argv.length === 4 && process.argv[2] === '--source', 'Usage: node scripts/prepare_p02_revision.mjs --source CLEAN_PINNED_CLONE');
    console.log(jsonText(await prepareP02Revision(process.argv[3])));
  } catch (error) { console.error('P02 revision preparation failed: ' + error.message); process.exitCode = 1; }
}
