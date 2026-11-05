// Portable, read-only F01/F02 candidate checker. No Git, application, network or label decisions.
import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const V1 = 'benchmark/p02/preparation.v1/';
export const SCENARIO = 'benchmark/p02/preparation.v2/scenario.json';
export const UNIVERSE = 'draft/evaluation_universe.draft.v2.json';
export const HISTORY = 'history/evaluation_universe.draft.v1.json';
export const PROPOSAL = 'history/phat-f02-proposal.original.json';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const jsonText = value => JSON.stringify(value, null, 2) + '\n';
const canonical = value => JSON.stringify(value, (key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort()) : item);
const check = (ok, message) => { if (!ok) throw new Error(message); };
const same = (a, b, message) => check(canonical(a) === canonical(b), message);
export const PINNED_ARTIFACTS = Object.freeze({
  [V1 + 'scenario.json']: '7d415b72a0d60911c104afe012d912ab3c600cb8f2da24e94791f7ab90264557',
  [V1 + 'fixture.json']: '2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191',
  [V1 + 'scope.json']: '4faf66f411ca91799fb67b5698a7541c8859a50f08bcb628323eccb5cabf6695',
  [V1 + 'optional-query.patch']: '091b04de4a504512cbda4e0c5c0759b747b056b4c7028923d8b7808b43303c4f',
  'draft/inventory.v1.json': '9f4a7f1f323a5f11a3902def30f717a16ba3d1b2023ed9982a81f298d9dc74f6',
  'draft/request-plan.v1.json': 'a4613b82f251b957fd97b0e6ba565db913d11e613472c7915b6647fbb0aa43b2',
  [HISTORY]: '8c04bbca98318c3d358ec9135516d889f3b7c017793dbc4aa5319771ed8d7424',
  [PROPOSAL]: 'b133526e1102f6082850171745295c39acbc84c61e1363900f40b5ebf5e407c3'
});
export const EXPECTED_REVISION = Object.freeze({
  schema: 'p02-input-metadata-revision/2', status: 'candidate_pending_phat_recheck',
  supersedes_scenario_version: '0.1.0', supersedes_universe_sha256: PINNED_ARTIFACTS[HISTORY],
  phat_scope_review_commit: '00aa4dcc3eb8cb9a4706572b325e481316cbcad4',
  phat_f02_proposal_sha256: PINNED_ARTIFACTS[PROPOSAL],
  intended_fixture_path: V1 + 'fixture.json', intended_fixture_sha256: PINNED_ARTIFACTS[V1 + 'fixture.json'],
  evidence_root: '.', mutated_snapshot_id_unchanged: true, historical_runtime_evidence_reclassified: false,
  f03_status: 'missing_unresolved_deferred_runtime_phase'
});
export const EXTRA_FILES = Object.freeze([SCENARIO, UNIVERSE, 'START_HERE.md', 'CHANGELOG.md', 'RECHECK_TEMPLATE.md',
  'PROVENANCE.json', 'INPUTS.json', 'verify_p02_revision.mjs', 'tooling/prepare_p02_inputs.mjs', 'tooling/prepare_p02_revision.mjs',
  'tooling/input-revision.test.mjs']);
export function safeMember(name) {
  return typeof name === 'string' && /^[A-Za-z0-9_.@/-]+$/.test(name) && !name.startsWith('/') &&
    !name.split('/').some(part => !part || part === '.' || part === '..');
}

// Cross-artifact relationships are checked independently of the builder. The
// filesystem wrapper additionally authenticates frozen inputs against the pins above.
export function validateRevisionRelations(files) {
  const bytes = name => { check(files[name] !== undefined, 'Missing artifact: ' + name); return files[name]; };
  const json = name => JSON.parse(Buffer.from(bytes(name)).toString('utf8'));
  const oldScenario = json(V1 + 'scenario.json'), scenario = json(SCENARIO);
  const old = json(HISTORY), universe = json(UNIVERSE), proposal = json(PROPOSAL), inventory = json('draft/inventory.v1.json');
  check(oldScenario.scenario_version === '0.1.0' && scenario.scenario_version === '0.1.1' && universe.scenario_version === '0.1.1', 'Wrong scenario/universe version');
  const { input_revision: revision, ...scenarioRest } = scenario;
  same({ ...scenarioRest, scenario_version: '0.1.0' }, oldScenario, 'Scenario changed beyond version/revision metadata');
  check(revision?.status === 'candidate_pending_phat_recheck' && revision.evidence_root === '.' &&
    revision.intended_fixture_path === V1 + 'fixture.json' && revision.intended_fixture_sha256 === sha256(bytes(V1 + 'fixture.json')) &&
    revision.supersedes_universe_sha256 === sha256(bytes(HISTORY)) && revision.phat_f02_proposal_sha256 === sha256(bytes(PROPOSAL)), 'Revision input binding mismatch');
  same(universe.input_revision, revision, 'Scenario/universe revision differs');
  same(universe.evidence_root, { kind: 'package_root', relative_path: '.', path_separator: '/', resolution: 'Join each evidence_ref to the extracted package root, not the draft/proposal directory or repository root' }, 'Ambiguous evidence root');
  check(universe.fixture_sha256 === sha256(bytes(V1 + 'fixture.json')), 'F01: fixture hash must match shipped raw bytes');
  check(universe.inventory_sha256 === sha256(bytes('draft/inventory.v1.json')), 'Inventory byte linkage mismatch');
  const stripped = value => ({ ...value, aliases: value.aliases.map(({ evidence_refs, ...alias }) => alias) });
  const { input_revision, evidence_root, ...universeRest } = universe;
  same(stripped({ ...universeRest, scenario_version: old.scenario_version, fixture_sha256: old.fixture_sha256 }), stripped(old), 'Universe changed beyond the declared F01/F02 metadata repair');
  same(stripped(proposal), stripped(old), 'Historical proposal changes fields beyond evidence refs');
  check(old.aliases.length === 15 && universe.aliases.length === 15, 'Alias census changed');
  let changed = 0;
  for (let i = 0; i < old.aliases.length; i++) {
    const expected = old.aliases[i].evidence_refs.map(path => path === 'spec/optional-query.patch' ? V1 + 'optional-query.patch' : 'input/app/' + path);
    same(universe.aliases[i].evidence_refs, expected, 'F02: wrong portable evidence refs');
    same(proposal.aliases[i].evidence_refs, expected, 'F02: proposal refs were not preserved');
    for (let j = 0; j < expected.length; j++) {
      check(safeMember(expected[j]), 'Unsafe evidence path'); bytes(expected[j]);
      if (expected[j] !== old.aliases[i].evidence_refs[j]) changed++;
    }
  }
  check(changed === 29, 'F02 must contain exactly 29 path repairs');
  check(universe.locked_for_labeling === false && universe.official_scoring_authorized === false && universe.independently_confirmed_by === null &&
    universe.aliases.every(alias => alias.independently_confirmed === false), 'No human confirmation, lock or scoring approval may be invented');
  const matrix = json('draft/request-plan.v1.json');
  check(matrix.planned_only === true && matrix.actual_remote_calls === 0 && matrix.cases.length === 40 &&
    matrix.cases.every(item => item.actual_http_status === null && item.raw_response_file === null), 'Request plan is not runtime evidence');
  return { changed_evidence_refs: changed, aliases: universe.aliases.length,
    fixture_sha256: universe.fixture_sha256, inventory_sha256: universe.inventory_sha256,
    scenario_version: scenario.scenario_version, universe_sha256: sha256(bytes(UNIVERSE)),
    source_files: Object.keys(inventory.source_files_sha256).length };
}

export async function verifyP02Revision(rootDirectory) {
  const requested = resolve(rootDirectory);
  check(!(await lstat(requested)).isSymbolicLink(), 'Symlink root is not allowed');
  const root = await realpath(requested), manifest = new Map(), folded = new Set();
  const manifestBytes = await readFile(resolve(root, 'SHA256SUMS.txt'));
  for (const line of manifestBytes.toString('utf8').trim().split(/\r?\n/)) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    check(match && safeMember(match[2]) && match[2] !== 'SHA256SUMS.txt' && !folded.has(match[2].toLowerCase()), 'Unsafe/duplicate manifest member');
    folded.add(match[2].toLowerCase()); manifest.set(match[2], match[1]);
  }
  const actual = [];
  async function visit(prefix = '') { for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
    const name = prefix + entry.name; check(!entry.isSymbolicLink() && safeMember(name), 'Unsafe/symlink package member');
    if (entry.isDirectory()) await visit(name + '/'); else { check(entry.isFile(), 'Nonregular artifact'); if (name !== 'SHA256SUMS.txt') actual.push(name); }
  } }
  await visit(); same(actual.sort(), [...manifest.keys()].sort(), 'Missing/unmanifested files');
  const files = {};
  for (const [name, expected] of manifest) {
    const file = await realpath(resolve(root, name)); check(file.startsWith(root + sep), 'Artifact escaped package root');
    files[name] = await readFile(file); check(sha256(files[name]) === expected, 'Checksum mismatch: ' + name);
  }
  for (const [name, expected] of Object.entries(PINNED_ARTIFACTS)) check(files[name] && sha256(files[name]) === expected, 'Frozen input pin mismatch: ' + name);
  const inventory = JSON.parse(files['draft/inventory.v1.json']);
  const sourceNames = Object.entries(inventory.source_files_sha256).map(([file, expected]) => {
    const name = 'input/app/' + file; check(safeMember(name) && files[name] && sha256(files[name]) === expected, 'Pinned source mismatch: ' + file); return name;
  });
  same(actual.sort(), [...Object.keys(PINNED_ARTIFACTS), ...EXTRA_FILES, ...sourceNames].sort(), 'Unexpected artifact class (no labels/predictions/scores allowed)');
  const scenario = JSON.parse(files[SCENARIO]); same(scenario.input_revision, EXPECTED_REVISION, 'Unexpected input revision definition');
  const result = validateRevisionRelations(files), inputs = JSON.parse(files['INPUTS.json']), provenance = JSON.parse(files['PROVENANCE.json']);
  same(inputs, { schema: 'p02-recheck-inputs/2', status: 'candidate_pending_phat_recheck', scenario: SCENARIO, universe: UNIVERSE,
    fixture: V1 + 'fixture.json', scenario_sha256: sha256(files[SCENARIO]), universe_sha256: sha256(files[UNIVERSE]), fixture_sha256: result.fixture_sha256,
    independent_confirmation_received: false, locked_for_labeling: false, labels_created: false, official_scoring_authorized: false, runtime_executed: false }, 'Invalid current input selection');
  check(provenance.schema === 'p02-input-revision-provenance/2' && provenance.source_commit === scenario.baseline_commit &&
    provenance.source_git_status_before === '' && provenance.source_git_status_after === '' && provenance.git_apply_check_exit_code === 0 &&
    provenance.application_build_performed === false && provenance.runtime_executed === false && provenance.evaluated_system_outputs_read === false &&
    provenance.independent_recheck_received === false && provenance.remote_calls === 0, 'Invalid preparation provenance');
  for (const name of ['tooling/prepare_p02_inputs.mjs', 'tooling/prepare_p02_revision.mjs', 'tooling/input-revision.test.mjs', 'verify_p02_revision.mjs'])
    check(provenance.code_sha256?.[name] === sha256(files[name]), 'Tooling provenance mismatch: ' + name);
  return { directory: root, status: 'candidate_bytes_and_bindings_verified_not_a_research_approval', files_verified: manifest.size,
    manifest_sha256: sha256(manifestBytes), ...result, independent_confirmation_received: false, locked_for_labeling: false,
    labels_created: false, official_scoring_authorized: false, runtime_executed: false, remote_calls: 0, f03_status: EXPECTED_REVISION.f03_status };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    check(process.argv.length === 2 || process.argv.length === 4 && process.argv[2] === '--root', 'Usage: node verify_p02_revision.mjs [--root DIRECTORY]');
    console.log(jsonText(await verifyP02Revision(process.argv[3] ?? dirname(fileURLToPath(import.meta.url)))));
  } catch (error) { console.error('P02 revision verification failed: ' + error.message); process.exitCode = 1; }
}
