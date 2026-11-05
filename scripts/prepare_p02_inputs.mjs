// Source/fixture preparation only. No application, parser, graph, model, labels or scoring.
import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = '3858f9c630cf989bb6809a86edf47c2be78dc9f1';
const SPEC = 'benchmark/p02/preparation.v1';
const PRIVATE = resolve(ROOT, 'handoff-out/p02-preparation');
export const PINNED_SOURCE_SHA256 = Object.freeze({
  'LICENSE': 'c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4',
  'spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/application/CustomersServiceClient.java': 'e143b78217975d0a6c2d0da704e483cd931180c7bb95cc76cad3807cc852e4f5',
  'spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/application/VisitsServiceClient.java': 'd7d1437c4dce96d4de5f636511d3bcf5549df4a11b7826fde0375bce358f1e13',
  'spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java': 'bb815e3727be7e56330072d54774944ef5029d66d2d7e56976d7c60dbeafbb21',
  'spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/dto/OwnerDetails.java': '99ee6937040e1c09dd969f7911e829f3435ebe0b553f5d960579b152e6a28823',
  'spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/dto/Visits.java': 'b9be7d4f5f57e26beac0202d23c6b0d58bccf1e30f2901dfdfe0b421ced6203f',
  'spring-petclinic-customers-service/src/main/resources/db/hsqldb/data.sql': 'e8bf4ae1127f10b4f7a69f89999f94a0d0f286ba25ddb29ffff82d5df30adb92',
  'spring-petclinic-customers-service/src/main/resources/db/hsqldb/schema.sql': 'f0c5a917934dd6ba0258a8a5b4223725885454808a48661b6698c582558f7219',
  'spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/model/Visit.java': '1ba057811b032114a7c3ebf70672ac946857bbf93f8313685d74263c707db71b',
  'spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java': '0bf7d4638add57363cde29b964d9fcc44ac55da9df320ff1ebfebc5c9f0786cd',
  'spring-petclinic-visits-service/src/main/resources/db/hsqldb/data.sql': '59b606da305562e38e835128d97d22d23b73031ad1ce72060746ef35c5e82756',
  'spring-petclinic-visits-service/src/main/resources/db/hsqldb/schema.sql': '2b46bd5480d06b9737dd4ad605517a2686da3e499ce924ed9eccb5ef3f7c26af'
});
const SPEC_SHA256 = Object.freeze({ 'scenario.json': '7d415b72a0d60911c104afe012d912ab3c600cb8f2da24e94791f7ab90264557',
  'fixture.json': '2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191',
  'scope.json': '4faf66f411ca91799fb67b5698a7541c8859a50f08bcb628323eccb5cabf6695',
  'optional-query.patch': '091b04de4a504512cbda4e0c5c0759b747b056b4c7028923d8b7808b43303c4f' });
const check = (ok, message) => { if (!ok) throw new Error(message); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value, (key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort()) : item);
const jsonText = item => JSON.stringify(item, null, 2) + '\n';
export function sourceFiles(scope, fixture) {
  const paths = [...new Set([...scope.files.map(item => item.file), ...scope.support_files, ...Object.values(fixture.sql_files), 'LICENSE'])].sort();
  check(canonical(paths) === canonical(Object.keys(PINNED_SOURCE_SHA256).sort()), 'Unexpected source path; fixed source-only allowlist required');
  return paths;
}
export function validatePinnedSources(sources) {
  check(canonical(Object.keys(sources).sort()) === canonical(Object.keys(PINNED_SOURCE_SHA256).sort()), 'Missing/extra pinned source');
  for (const [file, expected] of Object.entries(PINNED_SOURCE_SHA256)) check(hash(sources[file]) === expected, 'Pinned Git source bytes differ: ' + file);
}
export function validateVersionedSpecs(bytes) {
  check(canonical(Object.keys(bytes).sort()) === canonical(Object.keys(SPEC_SHA256).sort()), 'Missing/extra versioned spec');
  for (const [file, expected] of Object.entries(SPEC_SHA256)) check(hash(bytes[file]) === expected, 'Versioned spec bytes changed; create a new version: ' + file);
}

function span(text, anchor) {
  const start = text.indexOf(anchor);
  check(start >= 0 && text.indexOf(anchor, start + 1) < 0, 'Missing/non-unique source declaration: ' + anchor);
  return { line_start: text.slice(0, start).split('\n').length, line_end: text.slice(0, start + anchor.length).split('\n').length, declaration: anchor };
}

// Historical reconstruction only. Its serialized-fixture hash/path bug is retained
// so old frozen artifacts can be checked without rewriting research history.
export function buildHistoricalP02InputsV1({ scenario, fixture, scope, patch, sources }) {
  check(scenario.schema === 'p02-scenario-preparation/1' && scenario.scenario_id === 'P02' && scenario.baseline_commit === BASELINE, 'Wrong P02 scenario/source pin');
  check(scenario.selection.status === 'selected_for_preparation' && scenario.selection.selected_by === 'Huy' && scenario.selection.independent_confirmation_received === false, 'No independent confirmation may be invented');
  check(scenario.runtime.status === 'not_started' && scenario.evaluation_universe.locked === false && scenario.evaluation_universe.polarity_assignment_authorized === false &&
    scenario.labels.status === 'not_created' && scenario.labels.annotator === null && scenario.labels.reviewer === null && scenario.official_scoring_authorized === false &&
    scenario.split_intent === 'development' && scenario.final_test_locked === false && scenario.related_scenarios.includes('P01'), 'Preparation cannot approve runtime/labels/test/scoring');
  check(scope.baseline_commit === BASELINE && scope.files.length === 3 && scope.locked_for_labeling === false && scope.independent_inventory_confirmation_received === false &&
    scope.labels_created === false && scope.official_scoring_authorized === false, 'Scope is not independently confirmed or labeled');
  const paths = sourceFiles(scope, fixture);
  check(canonical(Object.keys(sources).sort()) === canonical(paths), 'Unexpected/missing source file; no hidden oracle inputs');
  for (const path of paths) check(typeof sources[path] === 'string' && !path.includes('..') && !path.startsWith('/'), 'Unsafe/missing source text');
  const original = sources[scenario.mutation.file];
  span(original, scenario.mutation.old_declaration);
  check(scenario.mutation.new_declaration === '    public Visits read(@RequestParam("petId") List<Integer> petIds,\n                       @RequestParam(value = "includeDetails", required = false, defaultValue = "false") boolean includeDetails) {', 'P02 mutation semantics changed');
  const mutated = original.replace(scenario.mutation.old_declaration, scenario.mutation.new_declaration);
  // The exact file is also validated by git apply --check in prepare; no hand-edited outputs are an oracle.
  check(hash(patch) === SPEC_SHA256['optional-query.patch'] && patch.includes('-' + scenario.mutation.old_declaration + '\n') &&
    scenario.mutation.new_declaration.split('\n').every(line => patch.includes('+' + line + '\n')) &&
    (patch.match(/^diff --git /gm) ?? []).length === 1, 'Patch does not describe the declared single-file mutation');
  check(mutated.replace(scenario.mutation.new_declaration, scenario.mutation.old_declaration) === original, 'Mutation changed extra source');
  const sql = sources[fixture.sql_files.visits_data];
  for (const visit of fixture.seed_visits) check(sql.includes(`INSERT INTO visits VALUES (${visit.id}, ${visit.pet_id}, '${visit.date}', '${visit.description}');`), 'Fixture visit differs from pinned SQL');
  check((sql.match(/INSERT INTO visits VALUES/g) ?? []).length === fixture.seed_visits.length, 'Fixture omits seeded visit');
  const customers = sources[fixture.sql_files.customers_data];
  for (const selected of [fixture.primary, fixture.auxiliary_empty]) {
    check(customers.includes('INSERT INTO owners VALUES (' + selected.owner_id + ','), 'Fixture owner missing');
    const pets = [...customers.matchAll(/INSERT INTO pets VALUES \((\d+), '[^']*', '[^']*', \d+, (\d+)\);/g)]
      .filter(match => Number(match[2]) === selected.owner_id).map(match => Number(match[1])).sort((a, b) => a - b);
    check(canonical(pets) === canonical([...selected.pet_ids].sort((a, b) => a - b)), 'Fixture owner/pet mismatch');
  }
  check(fixture.auxiliary_empty.pet_ids.every(id => !fixture.seed_visits.some(row => row.pet_id === id)), 'Empty control contains visits');
  check(fixture.requests.length === 10 && new Set(fixture.requests.map(item => item.id)).size === 10 && fixture.repetitions === 2 && canonical(fixture.snapshots) === canonical(['baseline', 'mutated']), 'Runtime plan coverage changed');
  const prefix = scenario.repository_id + '@' + BASELINE + '::';
  const mutatedSnapshot = BASELINE + '+P02-0.1.0-' + hash(patch).slice(0, 12);
  const entities = [], excluded = [], services = new Set();
  for (const file of scope.files) {
    services.add(file.service);
    for (const method of file.methods) {
      const location = span(sources[file.file], method.anchor);
      const id = prefix + file.service + '::' + file.class_fqn + '#' + method.signature;
      entities.push({ level: 'method', entity_id: id, service: file.service, seed: method.seed === true,
        source: { file: file.file, ...location, sha256: hash(sources[file.file]) } });
      if (method.http) entities.push({ level: 'api', entity_id: prefix + file.service + '::' + method.http,
        service: file.service, seed: method.seed === true, handler_id: id, source: { file: file.file, ...location, sha256: hash(sources[file.file]) } });
    }
    const className = file.class_fqn.split('.').at(-1);
    const constructorLine = sources[file.file].split('\n').find(line => line.includes(className + '('));
    check(constructorLine, 'Missing constructor exclusion evidence');
    excluded.push({ kind: 'constructor', file: file.file, ...span(sources[file.file], constructorLine), reason: 'Initialization excluded by predeclared scope, not a negative label' });
  }
  for (const service of services) entities.push({ level: 'service', entity_id: prefix + service, service, seed: service === 'visits-service',
    source_files: scope.files.filter(item => item.service === service).map(item => item.file) });
  check(entities.filter(item => item.level === 'method').length === 9 && entities.filter(item => item.level === 'api').length === 4 && new Set(entities.map(item => item.entity_id)).size === 15, 'Incomplete/duplicate predeclared census');
  const aliases = entities.map(entity => ({ baseline_id: entity.entity_id,
    mutated_id: entity.entity_id.replace('@' + BASELINE + '::', '@' + mutatedSnapshot + '::')
      .replace('#read(List<Integer>)', '#read(List<Integer>,boolean)'), canonical_id: entity.entity_id,
    evidence_refs: entity.source ? [entity.source.file, 'spec/optional-query.patch'] : entity.source_files,
    reason: entity.seed && entity.level === 'method' ? 'Changed signature of same seed; excluded from propagation scoring' : 'Identity under single-declaration-only patch; pending independent confirmation',
    independently_confirmed: false }));
  const inventory = { schema: 'p02-source-inventory/1', source_commit: BASELINE, scope_id: scope.scope_id,
    prepared_by: 'Codex assisting Huy', independently_confirmed: false, entities, excluded, source_files_sha256: Object.fromEntries(paths.map(path => [path, hash(sources[path])])) };
  const universe = { schema: 'p02-evaluation-universe-draft/1', scenario_id: 'P02', scenario_version: scenario.scenario_version,
    status: 'draft_pending_independent_source_confirmation', locked_for_labeling: false, official_scoring_authorized: false,
    baseline_commit: BASELINE, mutated_snapshot_id: mutatedSnapshot, prepared_by: 'Codex assisting Huy', independently_confirmed_by: null,
    split_intent: 'development', duplicate_group_id: scenario.duplicate_group_id, logical_hop_limit: scope.logical_hop_limit,
    inventory_sha256: hash(jsonText(inventory)), fixture_sha256: hash(jsonText(fixture)),
    eligible_entities: entities.filter(item => !item.seed).map(({ level, entity_id }) => ({ level, entity_id })),
    excluded_seeds: entities.filter(item => item.seed).map(({ level, entity_id }) => ({ level, entity_id })), aliases,
    exclusions: scope.exclusions, evidence_requirements: scope.evidence_requirements, projection_policy: scope.projection_policy,
    warning: 'Inventory is not a label set or full-repo recall claim. Confirm coverage/aliases independently before locking or assigning polarity.' };
  const matrix = { schema: 'p02-runtime-request-plan/1', status: 'not_executed', base_urls: { visits: null, gateway: null },
    planned_only: true, actual_remote_calls: 0, cases: fixture.snapshots.flatMap(snapshot => Array.from({ length: fixture.repetitions }, (_, n) =>
      fixture.requests.map(request => ({ snapshot, repetition: n + 1, ...request, actual_http_status: null, raw_response_file: null }))).flat()) };
  return { inventory, universe, matrix, mutated, patch_sha256: hash(patch) };
}

export function buildP02Inputs(input) {
  check(input.scenario.scenario_version === '0.1.1', 'New preparation requires scenario 0.1.1; v1 is historical only');
  check(Buffer.isBuffer(input.fixtureBytes) || input.fixtureBytes instanceof Uint8Array, 'Raw fixture bytes are required; never hash reserialized JSON');
  check(hash(input.fixtureBytes) === SPEC_SHA256['fixture.json'], 'Raw fixture bytes differ from intended pinned fixture');
  check(canonical(JSON.parse(Buffer.from(input.fixtureBytes).toString('utf8'))) === canonical(input.fixture), 'Fixture object differs from the shipped raw bytes');
  const revision = input.scenario.input_revision;
  check(revision?.schema === 'p02-input-metadata-revision/2' && revision.status === 'candidate_pending_phat_recheck' &&
    revision.intended_fixture_path === SPEC + '/fixture.json' && revision.intended_fixture_sha256 === hash(input.fixtureBytes) &&
    revision.evidence_root === '.' && revision.mutated_snapshot_id_unchanged === true && revision.historical_runtime_evidence_reclassified === false &&
    revision.f03_status === 'missing_unresolved_deferred_runtime_phase', 'Invalid candidate revision or premature runtime/approval claim');
  const built = buildHistoricalP02InputsV1(input);
  built.universe.fixture_sha256 = hash(input.fixtureBytes);
  for (const alias of built.universe.aliases) alias.evidence_refs = alias.evidence_refs.map(path =>
    path === 'spec/optional-query.patch' ? SPEC + '/optional-query.patch' : 'input/app/' + path);
  built.universe.evidence_root = { kind: 'package_root', relative_path: '.', path_separator: '/', resolution: 'Join each evidence_ref to the extracted package root, not the draft/proposal directory or repository root' };
  built.universe.input_revision = input.scenario.input_revision;
  return built;
}

export async function prepareP02Inputs(sourceDirectory) {
  // All new preparation uses the corrected layout. No new v1 run is generated.
  return (await import('./prepare_p02_revision.mjs')).prepareP02Revision(sourceDirectory);
}

export async function verifyP02Preparation(runDirectory) {
  const directory = resolve(runDirectory);
  check(directory.startsWith(PRIVATE + sep) && (await realpath(directory)).startsWith(await realpath(PRIVATE) + sep) && !(await lstat(directory)).isSymbolicLink(), 'Run must be inside private P02 preparation root');
  const manifest = (await readFile(resolve(directory, 'checksums.sha256'), 'utf8')).trim().split('\n'); const seen = new Set();
  for (const line of manifest) {
    const match = /^([a-f0-9]{64})  ([A-Za-z0-9_./-]+)$/.exec(line);
    check(match && !match[2].split('/').includes('..') && !match[2].startsWith('/') && !seen.has(match[2]), 'Unsafe/duplicate manifest entry');
    seen.add(match[2]); const path = resolve(directory, match[2]); check(!(await lstat(path)).isSymbolicLink() && await realpath(path) === path, 'Symlink/junction evidence not allowed');
    check(hash(await readFile(path)) === match[1], 'P02 checksum mismatch: ' + match[2]);
  }
  const actual = [];
  async function visit(prefix = '') { for (const entry of await readdir(resolve(directory, prefix), { withFileTypes: true })) {
    const name = prefix + entry.name; check(!entry.isSymbolicLink(), 'Symlink evidence not allowed');
    if (entry.isDirectory()) await visit(name + '/'); else if (name !== 'checksums.sha256') actual.push(name);
  } }
  await visit(); check(canonical(actual.sort()) === canonical([...seen].sort()), 'Unmanifested/missing artifact');
  const readJson = async name => JSON.parse(await readFile(resolve(directory, name), 'utf8'));
  const specBytes = Object.fromEntries(await Promise.all(Object.keys(SPEC_SHA256).map(async name => [name, await readFile(resolve(directory, 'spec', name))])));
  validateVersionedSpecs(specBytes);
  const scenario = await readJson('spec/scenario.json'), fixture = await readJson('spec/fixture.json'), scope = await readJson('spec/scope.json');
  const expectedNames = ['spec/scenario.json', 'spec/fixture.json', 'spec/scope.json', 'spec/optional-query.patch', 'mutated/' + scenario.mutation.file,
    'inventory.v1.json', 'evaluation_universe.draft.v1.json', 'request-plan.v1.json', 'provenance.json', 'prepared.json', ...sourceFiles(scope, fixture).map(file => 'source/' + file)];
  check(canonical(actual.sort()) === canonical(expectedNames.sort()), 'Unexpected preparation artifact class');
  const sources = Object.fromEntries(await Promise.all(sourceFiles(scope, fixture).map(async file => [file, await readFile(resolve(directory, 'source', file), 'utf8')])));
  validatePinnedSources(sources);
  const built = buildHistoricalP02InputsV1({ scenario, fixture, scope, patch: await readFile(resolve(directory, 'spec/optional-query.patch'), 'utf8'), sources });
  for (const [name, expected] of [['inventory.v1.json', built.inventory], ['evaluation_universe.draft.v1.json', built.universe], ['request-plan.v1.json', built.matrix]])
    check(canonical(await readJson(name)) === canonical(expected), 'Derived P02 artifact differs: ' + name);
  check(await readFile(resolve(directory, 'mutated', scenario.mutation.file), 'utf8') === built.mutated, 'Mutation differs from declared patch');
  const prepared = await readJson('prepared.json'), provenance = await readJson('provenance.json');
  check(prepared.status === 'inputs_prepared_not_locked_not_run' && prepared.official_scoring_authorized === false && prepared.remote_calls === 0 &&
    prepared.patch_sha256 === built.patch_sha256 && prepared.inventory_sha256 === hash(jsonText(built.inventory)) && prepared.universe_draft_sha256 === hash(jsonText(built.universe)) &&
    prepared.fixture_sha256 === hash(await readFile(resolve(directory, 'spec/fixture.json'))), 'Invalid preparation status/hash');
  check(provenance.source_commit === BASELINE && provenance.source_git_status_before === '' && provenance.source_git_status_after === '' && provenance.git_apply_check_exit_code === 0 &&
    provenance.application_build_performed === false && provenance.runtime_executed === false && provenance.evaluated_system_outputs_read === false && provenance.independent_annotator_confirmation_received === false, 'Invalid preparation provenance');
  return { directory, status: prepared.status, manifest_files: seen.size, eligible_entities: Object.fromEntries(['method', 'api', 'service'].map(level => [level, built.universe.eligible_entities.filter(item => item.level === level).length])),
    planned_requests: built.matrix.cases.length, patch_sha256: built.patch_sha256, universe_draft_sha256: prepared.universe_draft_sha256, fixture_sha256: prepared.fixture_sha256,
    runtime_executed: false, locked_for_labeling: false, independent_confirmation_received: false, remote_calls: 0,
    historical_integrity_only: true, admissible_for_new_input_lock: false,
    known_issues: ['F01: universe v1 hashes reserialized JSON, not shipped fixture bytes', 'F02: evidence refs require the versioned portable-path revision'] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Do not await a dynamically imported CLI adapter at module-evaluation time:
  // that adapter imports these builders and needs this module to finish loading.
  void (async () => {
  try {
    const [action, option, value, ...extra] = process.argv.slice(2);
    check(value && extra.length === 0 && (action === 'prepare' && option === '--source' || action === 'check' && option === '--run'), 'Usage: prepare --source PINNED_CLEAN_CLONE | check --run PRIVATE_RUN');
    const verify = async () => {
      const directory = resolve(value);
      if (directory.startsWith(resolve(ROOT, 'handoff-out/p02-input-revision') + sep))
        return (await import('./verify_p02_revision.mjs')).verifyP02Revision(directory);
      return verifyP02Preparation(directory);
    };
    console.log(jsonText(action === 'prepare' ? await prepareP02Inputs(value) : await verify()));
  } catch (error) { console.error('P02 input preparation failed: ' + error.message); process.exitCode = 1; }
  })();
}
