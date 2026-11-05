// Source-based candidate preparation, not an evaluated parser or label generator.
import { createHash } from 'node:crypto';

export const SOURCE_PIN = '3858f9c630cf989bb6809a86edf47c2be78dc9f1';
export const CONFIG_PIN = '323993ce2519c6d02df63e08bf4458d123d3b611';
export const PROTOCOL_SHA256 = '92258d2a19599f202c39ab5067191248c17631565391ffab9f96d9cc0608d6cb';
export const REPOSITORY = 'spring-petclinic-microservices';
const customer = 'spring-petclinic-customers-service/src/main/java/org/springframework/samples/petclinic/customers/';
const gateway = 'spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/';
export const OWNER_RESOURCE = customer + 'web/OwnerResource.java';
export const OLD_METHOD = '    public Optional<Owner> findOwner(@PathVariable("ownerId") @Min(1) int ownerId) {\n        return ownerRepository.findById(ownerId);\n    }';
export const NEW_METHOD = '    public Optional<Map<String, Object>> findOwner(@PathVariable("ownerId") @Min(1) int ownerId) {\n        return ownerRepository.findById(ownerId).map(owner -> {\n            Map<String, Object> response = new LinkedHashMap<>();\n            response.put("id", owner.getId());\n            response.put("firstName", owner.getFirstName());\n            response.put("lastName", owner.getLastName());\n            response.put("address", owner.getAddress());\n            response.put("city", owner.getCity());\n            response.put("telephone", owner.getTelephone());\n            response.put("animals", owner.getPets());\n            return response;\n        });\n    }';
const method = (signature, anchor, http = null, seed = false) => ({ signature, anchor, http, seed });
export const CENSUS = [
  { file: OWNER_RESOURCE, service: 'customers-service', class_fqn: 'org.springframework.samples.petclinic.customers.web.OwnerResource', methods: [
    method('createOwner(OwnerRequest)', '    public Owner createOwner(@Valid @RequestBody OwnerRequest ownerRequest) {', 'POST /owners'),
    method('findOwner(int)', OLD_METHOD.split('\n')[0], 'GET /owners/{ownerId}', true),
    method('findAll()', '    public List<Owner> findAll() {', 'GET /owners'),
    method('updateOwner(int,OwnerRequest)', '    public void updateOwner(@PathVariable("ownerId") @Min(1) int ownerId, @Valid @RequestBody OwnerRequest ownerRequest) {', 'PUT /owners/{ownerId}')
  ] },
  { file: customer + 'model/Owner.java', service: 'customers-service', class_fqn: 'org.springframework.samples.petclinic.customers.model.Owner', methods: [
    method('getPetsInternal()', '    protected Set<Pet> getPetsInternal() {'),
    method('getPets()', '    public List<Pet> getPets() {'),
    method('addPet(Pet)', '    public void addPet(Pet pet) {'),
    method('toString()', '    public String toString() {'),
    ...['Id', 'FirstName', 'LastName', 'Address', 'City', 'Telephone'].map(name => method('get' + name + '()', `    public ${name === 'Id' ? 'Integer' : 'String'} get${name}() {`)),
    ...['FirstName', 'LastName', 'Address', 'City', 'Telephone'].map(name => method('set' + name + '(String)', `    public void set${name}(String ${name[0].toLowerCase() + name.slice(1)}) {`))
  ] },
  { file: gateway + 'application/CustomersServiceClient.java', service: 'api-gateway', class_fqn: 'org.springframework.samples.petclinic.api.application.CustomersServiceClient', methods: [
    method('getOwner(int)', '    public Mono<OwnerDetails> getOwner(final int ownerId) {')
  ] },
  { file: gateway + 'dto/OwnerDetails.java', service: 'api-gateway', class_fqn: 'org.springframework.samples.petclinic.api.dto.OwnerDetails', methods: [
    method('getPetIds()', '    public List<Integer> getPetIds() {')
  ] },
  { file: gateway + 'boundary/web/ApiGatewayController.java', service: 'api-gateway', class_fqn: 'org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController', methods: [
    method('getOwnerDetails(int)', '    public Mono<OwnerDetails> getOwnerDetails(final @PathVariable int ownerId) {', 'GET /api/gateway/owners/{ownerId}'),
    method('addVisitsToOwner(OwnerDetails)', '    private Function<Visits, OwnerDetails> addVisitsToOwner(OwnerDetails owner) {'),
    method('emptyVisitsForPets()', '    private Mono<Visits> emptyVisitsForPets() {')
  ] },
  { file: gateway + 'application/VisitsServiceClient.java', service: 'api-gateway', class_fqn: 'org.springframework.samples.petclinic.api.application.VisitsServiceClient', methods: [
    method('getVisitsForPets(List<Integer>)', '    public Mono<Visits> getVisitsForPets(final List<Integer> petIds) {'),
    method('joinIds(List<Integer>)', '    private String joinIds(List<Integer> petIds) {'),
    method('setHostname(String)', '    void setHostname(String hostname) {')
  ] }
];
export const SQL = {
  customers_data: 'spring-petclinic-customers-service/src/main/resources/db/hsqldb/data.sql',
  customers_schema: 'spring-petclinic-customers-service/src/main/resources/db/hsqldb/schema.sql',
  visits_data: 'spring-petclinic-visits-service/src/main/resources/db/hsqldb/data.sql',
  visits_schema: 'spring-petclinic-visits-service/src/main/resources/db/hsqldb/schema.sql'
};
export const SOURCE_FILES = [...new Set([
  ...CENSUS.map(item => item.file), ...Object.values(SQL), 'LICENSE', 'pom.xml',
  customer + 'model/OwnerRepository.java', customer + 'model/Pet.java', customer + 'model/PetType.java',
  customer + 'web/OwnerRequest.java', customer + 'web/mapper/OwnerEntityMapper.java',
  gateway + 'dto/PetDetails.java', gateway + 'dto/Visits.java', gateway + 'dto/VisitDetails.java',
  'spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java',
  ...['customers-service', 'visits-service', 'api-gateway'].flatMap(service => ['spring-petclinic-' + service + '/pom.xml', 'spring-petclinic-' + service + '/src/main/resources/application.yml'])
])].sort();
export const CONFIG_FILES = ['LICENSE', 'application.yml', 'customers-service.yml', 'visits-service.yml', 'api-gateway.yml', 'discovery-server.yml'];
export const ensure = (ok, message) => { if (!ok) throw new Error(message); };
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const gitBlob = bytes => createHash('sha1').update('blob ' + Buffer.byteLength(bytes) + '\0').update(bytes).digest('hex');
export const jsonText = value => JSON.stringify(value, null, 2) + '\n';
export const canonical = value => JSON.stringify(value, (key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort()) : item);
export const GATES = Object.freeze({ candidate_selected_by_huy: false, independently_confirmed: false, input_locked: false,
  application_build_performed: false, runtime_executed: false, labels_created: false, draft_annotation_authorized: false,
  evaluated_system_outputs_read: false, final_test_locked: false, official_scoring_authorized: false, model_calls_authorized: false, github_push_authorized: false });

function location(text, anchor) {
  const index = text.indexOf(anchor);
  ensure(index >= 0 && text.indexOf(anchor, index + 1) === -1, 'Missing/non-unique source anchor: ' + anchor);
  return { line_start: text.slice(0, index).split('\n').length, line_end: text.slice(0, index + anchor.length).split('\n').length, excerpt: anchor };
}

export function buildMutation(original) {
  ensure(!original.includes('\r') && original.endsWith('\n'), 'Use exact LF Git blob, not a normalized working tree');
  location(original, OLD_METHOD);
  const replacements = [
    ['import java.util.List;', 'import java.util.LinkedHashMap;\nimport java.util.List;\nimport java.util.Map;'],
    [OLD_METHOD, NEW_METHOD]
  ];
  let mutated = original;
  for (const [before, after] of replacements) { location(original, before); mutated = mutated.replace(before, after); }
  const lines = original.slice(0, -1).split('\n'); let offset = 0;
  const hunks = replacements.map(([before, after]) => {
    const begin = location(original, before).line_start - 1, oldLines = before.split('\n'), newLines = after.split('\n');
    const start = Math.max(0, begin - 3), end = Math.min(lines.length, begin + oldLines.length + 3);
    const hunk = `@@ -${start + 1},${end - start} +${start + 1 + offset},${end - start + newLines.length - oldLines.length} @@\n` +
      lines.slice(start, begin).map(line => ' ' + line).join('\n') + '\n' +
      oldLines.map(line => '-' + line).join('\n') + '\n' + newLines.map(line => '+' + line).join('\n') + '\n' +
      lines.slice(begin + oldLines.length, end).map(line => ' ' + line).join('\n') + '\n';
    offset += newLines.length - oldLines.length; return hunk;
  });
  const patch = `diff --git a/${OWNER_RESOURCE} b/${OWNER_RESOURCE}\n--- a/${OWNER_RESOURCE}\n+++ b/${OWNER_RESOURCE}\n` + hunks.join('');
  return { mutated, patch };
}

export function validateExplicitCensus(sources) {
  // A bounded textual completeness guard, not the evaluated Tree-sitter parser.
  // All explicit top-level-class methods at this pin have one-line declarations.
  // Constructors and the nested builder's eight-space declarations are excluded.
  for (const file of CENSUS) {
    const declarations = sources[file.file].split('\n').filter(line => {
      if (!/^    [^ ]/.test(line)) return false;
      const declaration = line.slice(4).replace(/^(?:(?:public|protected|private|static|final)\s+)+/, '');
      return /^[A-Za-z_$][\w$]*(?:<[^;\n]+>)?(?:\[\])?\s+[A-Za-z_$][\w$]*\s*\([^\n]*\)\s*\{$/.test(declaration);
    });
    ensure(canonical([...declarations].sort()) === canonical(file.methods.map(item => item.anchor).sort()),
      'Explicit method census is incomplete or changed: ' + file.file);
  }
}

export function buildFixture(sources) {
  const customers = sources[SQL.customers_data], visits = sources[SQL.visits_data];
  const owners = [...customers.matchAll(/INSERT INTO owners VALUES \((\d+),/g)].map(row => Number(row[1]));
  const pets = [...customers.matchAll(/INSERT INTO pets VALUES \((\d+), '[^']*', '[^']*', \d+, (\d+)\);/g)].map(row => ({ id: Number(row[1]), owner_id: Number(row[2]) }));
  ensure(owners.length === 10 && pets.length === 13 && owners.every(id => pets.some(pet => pet.owner_id === id)), 'Seed census changed; do not invent an empty-pet owner');
  ensure(canonical(pets.filter(row => row.owner_id === 6).map(row => row.id)) === '[7,8]', 'Primary fixture differs');
  const seedVisits = [...visits.matchAll(/INSERT INTO visits VALUES \((\d+), (\d+), '([^']*)', '([^']*)'\);/g)].map(row => ({ id: Number(row[1]), pet_id: Number(row[2]), date: row[3], description: row[4] }));
  ensure(seedVisits.length === 4 && seedVisits.every(row => [7, 8].includes(row.pet_id)), 'Visit fixture differs');
  const request = (id, target, path, role, extra = {}) => ({ id, target, method: 'GET', path, role, ...extra });
  return { schema: 'p03-fixture-candidate/1', fixture_version: '1', status: 'candidate_not_executed', sql_files: SQL,
    primary: { owner_id: 6, pet_ids: [7, 8] }, no_visits_control: { owner_id: 1, pet_ids: [1], is_owner_without_pets: false },
    seed_owner_ids: owners, seed_pets: pets, seed_visits: seedVisits,
    empty_pets_setup: { method: 'POST', target: 'customers', path: '/owners', run_owned_disposable_database_only: true,
      body: { firstName: 'P03Empty', lastName: 'Control', address: '1 Fixture Lane', city: 'Sandbox', telephone: '0000000000' },
      resolved_id: null, binding: 'empty_owner_id', expected_id_must_not_be_assumed: true,
      setup_post_and_direct_readback_must_prove_empty_pets: true, runtime_authorized: false },
    requests: [
      request('direct_populated', 'customers', '/owners/6', 'Primary changed boundary'),
      request('gateway_populated', 'gateway', '/api/gateway/owners/6', 'Unchanged real consumer; status and full body observed, no expected outcome'),
      request('direct_no_visits', 'customers', '/owners/1', 'Has a pet but no visits; not an empty-pet fixture'),
      request('gateway_no_visits', 'gateway', '/api/gateway/owners/1', 'Same unchanged consumer with a pet without visits'),
      request('direct_empty_pets', 'customers', '/owners/{empty_owner_id}', 'Empty-pet owner created separately during setup'),
      request('gateway_empty_pets', 'gateway', '/api/gateway/owners/{empty_owner_id}', 'Observe decoder/null behavior even with empty collection'),
      request('owner_list_control', 'customers', '/owners', 'Shared Owner representation control, every owner and field retained'),
      request('missing_direct', 'customers', '/owners/2147483647', 'Optional.empty diagnostic; status/body not predetermined'),
      request('missing_gateway', 'gateway', '/api/gateway/owners/2147483647', 'Missing-owner consumer diagnostic, no predetermined status'),
      request('visits_control', 'visits', '/pets/visits?petId=7,8', 'Unchanged Visits provider control'),
      request('create_control', 'customers', '/owners', 'Unchanged POST boundary, after primary GET slots', { method: 'POST',
        body: { firstName: 'P03Write', lastName: 'Control', address: '2 Fixture Lane', city: 'Sandbox', telephone: '0000000001' },
        binds: 'write_owner_id', readback_required: true }),
      request('update_control', 'customers', '/owners/{write_owner_id}', 'Unchanged PUT boundary on newly created owner, after POST', { method: 'PUT',
        body: { firstName: 'P03Updated', lastName: 'Control', address: '2 Fixture Lane', city: 'Sandbox', telephone: '0000000001' }, readback_required: true })
    ], snapshots: ['baseline', 'mutated'], repetitions: 2,
    execution_policy: { automatic_execution: false, fresh_five_service_stack_and_database_per_group: true,
      reset_before_each_group: true, retain_all_setup_readiness_errors_and_raw: true, no_consumer_repair: true,
      collect_configuration_registry_build_identity_and_cleanup: true, writes_only_to_run_owned_disposable_database: true,
      record_request_order: true, no_prediction_or_label_oracle: true },
    comparison_policy: { raw_bodies_immutable: true, duplicate_json_keys_are_errors: true,
      object_key_order_only_may_be_ignored: true, array_order_retained: true, no_field_dropped: true,
      primary_provider_expected_delta_to_be_checked_not_assumed: 'Only top-level pets -> animals; all other fields and collection values must match',
      gateway_result: 'Observe and record; errors, missing data and unknown are not pre-assigned label polarity',
      error_body_equality_not_assumed: true }
  };
}

export function buildCandidate(sources, configSources, protocolBytes) {
  ensure(canonical(Object.keys(sources).sort()) === canonical(SOURCE_FILES), 'Source-only allowlist differs');
  ensure(canonical(Object.keys(configSources).sort()) === canonical([...CONFIG_FILES].sort()), 'Config allowlist differs');
  ensure(sha256(protocolBytes) === PROTOCOL_SHA256, 'Protocol v0.2 bytes differ');
  validateExplicitCensus(sources);
  const { mutated, patch } = buildMutation(sources[OWNER_RESOURCE]);
  const fixture = buildFixture(sources), prefix = REPOSITORY + '@' + SOURCE_PIN + '::';
  const snapshot = SOURCE_PIN + '+P03-0.1.0-' + sha256(patch).slice(0, 12);
  const entities = [];
  for (const file of CENSUS) for (const method of file.methods) {
    const evidence = { file: 'input/app/' + file.file, sha256: sha256(sources[file.file]), ...location(sources[file.file], method.anchor) };
    const id = prefix + file.service + '::' + file.class_fqn + '#' + method.signature;
    entities.push({ level: 'method', entity_id: id, service: file.service, seed: method.seed, evidence });
    if (method.http) entities.push({ level: 'api', entity_id: prefix + file.service + '::' + method.http, service: file.service, seed: method.seed, handler_id: id, evidence });
  }
  for (const service of ['customers-service', 'api-gateway']) entities.push({ level: 'service', entity_id: prefix + service, service,
    seed: service === 'customers-service', evidence_refs: CENSUS.filter(item => item.service === service).map(item => 'input/app/' + item.file) });
  ensure(entities.filter(item => item.level === 'method').length === 27 && entities.filter(item => item.level === 'api').length === 5 && new Set(entities.map(item => item.entity_id)).size === 34, 'Unexpected source census');
  const scope = { schema: 'p03-source-scope-candidate/1', scope_version: '1', scope_id: 'p03-six-top-level-class-census-v1',
    rule: 'Every explicit non-constructor method of the six named top-level classes/record; all five HTTP mappings in those classes; owning services. Selected before runtime/output, not an affected-entity shortlist.',
    files: CENSUS, logical_hop_limit: 3,
    exclusions: [
      { kind: 'constructors_lambdas_synthetic_and_implicit_record_methods', reason: 'No separate canonical Method ID in this bounded development census; source components and enclosing methods remain evidence' },
      { kind: 'nested_builder_classes', reason: 'Explicitly outside the six top-level evaluation classes; retained in source and recorded for independent scope confirmation, not labeled negative' },
      { kind: 'other_repository_classes_and_support_files', reason: 'Support source and SQL/config supplied, not silently included as scored entities; no full-repo recall claim' },
      { kind: 'seed_method_seed_api_and_owning_customers_service', reason: 'Context, excluded from propagated impact credit' }
    ],
    projection_policy: 'No automatic Method -> API -> Service credit; no production output-contract or scorer adoption in this preparation',
    evidence_policy: 'Every eligible entity needs evidence or remains unresolved; an unchanged response does not prove every getter/helper/setter was exercised',
    independently_confirmed: false, locked: false };
  const inventory = { schema: 'p03-source-inventory-candidate/1', source_commit: SOURCE_PIN, scope_id: scope.scope_id,
    prepared_by: 'Codex assisting Huy; explicit source census, not independent human confirmation', entities,
    source_files_sha256: Object.fromEntries(SOURCE_FILES.map(file => [file, sha256(sources[file])])) };
  const auditAnchors = [
    ['customers_class_mapping', OWNER_RESOURCE, '@RequestMapping("/owners")'],
    ['single_owner_mapping', OWNER_RESOURCE, '    @GetMapping(value = "/{ownerId}")'],
    ['single_owner_baseline', OWNER_RESOURCE, OLD_METHOD],
    ['shared_list_handler', OWNER_RESOURCE, '    public List<Owner> findAll() {'],
    ['shared_entity_pet_getter', customer + 'model/Owner.java', '    public List<Pet> getPets() {'],
    ['literal_customers_uri', gateway + 'application/CustomersServiceClient.java', '            .uri("http://customers-service/owners/{ownerId}", ownerId)'],
    ['consumer_decode_type', gateway + 'application/CustomersServiceClient.java', '            .bodyToMono(OwnerDetails.class);'],
    ['record_pet_component', gateway + 'dto/OwnerDetails.java', '    List<PetDetails> pets) {'],
    ['consumer_pet_stream', gateway + 'dto/OwnerDetails.java', '        return pets.stream()'],
    ['gateway_class_mapping', gateway + 'boundary/web/ApiGatewayController.java', '@RequestMapping("/api/gateway")'],
    ['gateway_method_mapping', gateway + 'boundary/web/ApiGatewayController.java', '    @GetMapping(value = "owners/{ownerId}")'],
    ['gateway_pet_id_use', gateway + 'boundary/web/ApiGatewayController.java', '                visitsServiceClient.getVisitsForPets(owner.getPetIds())'],
    ['visits_cb_scope', gateway + 'boundary/web/ApiGatewayController.java', '                        return cb.run(it, throwable -> emptyVisitsForPets());']
  ];
  const audit = { schema: 'p03-source-audit-candidate/1', source_commit: SOURCE_PIN,
    kind: 'builder_prepared_source_locations_not_runtime_or_labels',
    evidence: auditAnchors.map(([id, file, anchor]) => ({ id, file: 'input/app/' + file, sha256: sha256(sources[file]), ...location(sources[file], anchor) })),
    mutated_boundary: { file: 'mutated/app/' + OWNER_RESOURCE, sha256: sha256(mutated), ...location(mutated, NEW_METHOD) },
    questions_requiring_runtime: ['Optional.empty response semantics', 'All nested fields retained at changed boundary',
      'Jackson record handling of missing pets and unknown animals', 'Where a consumer error is propagated or handled',
      'Behavior of list/POST/PUT using unchanged shared Owner representation', 'Which eligible helpers/getters/setters have sufficient evidence'],
    output_contract_adopted: false, label_polarity_assigned: false };
  const universe = { schema: 'p03-evaluation-universe-candidate/1', universe_version: 'draft.v1', scenario_id: 'P03', scenario_version: '0.1.0',
    status: 'candidate_pending_selection_and_independent_inventory_confirmation', split_intent: 'development',
    fixture_sha256: sha256(jsonText(fixture)), inventory_sha256: sha256(jsonText(inventory)), scope_sha256: sha256(jsonText(scope)),
    baseline_commit: SOURCE_PIN, mutated_snapshot_id: snapshot, logical_hop_limit: 3, evidence_root: '.',
    eligible_entities: entities.filter(entity => !entity.seed).map(({ level, entity_id }) => ({ level, entity_id })),
    excluded_seeds: entities.filter(entity => entity.seed).map(({ level, entity_id }) => ({ level, entity_id })),
    aliases: entities.map(entity => ({ level: entity.level, baseline_id: entity.entity_id, canonical_id: entity.entity_id,
      mutated_id: entity.entity_id.replace('@' + SOURCE_PIN + '::', '@' + snapshot + '::'),
      evidence_refs: [...(entity.evidence ? [entity.evidence.file] : entity.evidence_refs), 'spec/owner-response-rename.patch'],
      reason: 'Same service/class/signature/path; seed return type changes but parameter signature is preserved; source and patch need independent confirmation',
      independently_confirmed: false })), ...GATES };
  const scenario = { schema: 'p03-scenario-candidate/1', scenario_id: 'P03', scenario_version: '0.1.0', candidate_id: 'C03-A',
    scenario_kind: 'synthetic_mutation', repository: 'https://github.com/spring-petclinic/spring-petclinic-microservices',
    baseline_commit: SOURCE_PIN, config_commit: CONFIG_PIN, split_intent: 'development',
    duplicate_group_id: 'petclinic:customers-owner-get:response-field-rename:gateway-owner-details:spring-java',
    leakage_group: 'petclinic-owner-details-development-family', related_scenarios: ['P01', 'P02'],
    cross_scenario_dependence: 'Same repository, owner-details gateway and fixture family. Keep P01/P02/P03 in development; these are not three independent systems or unseen tests.',
    preparer_exposure: { coordinator_has_prior_p01_p02_context: true, blinded_preparation_claimed: false,
      inputs_for_this_preparation: 'Allowlisted pinned Git source/config and protocol only; no evaluated-system outputs or labels read as preparation inputs',
      independent_annotator_exposure: 'Not asserted; the human must declare actual exposure at their own checkpoint' },
    selection_status: 'candidate_prepared_for_huy_and_independent_scope_confirmation', selected_by: null, selected_at: null,
    mutation: { file: OWNER_RESOURCE, operator: 'boundary_map_response_pets_to_animals',
      old_method: OLD_METHOD, new_method: NEW_METHOD, changed_files: [OWNER_RESOURCE],
      shared_owner_entity_changed: false, database_schema_changed: false, consumer_changed: false, config_changed: false,
      semantic_limit: 'Explicit seven-field map is a proposed boundary representation. Runtime must verify all non-key fields, nested serialization, Optional.empty and endpoint controls; source isolation alone does not prove JSON equivalence.' },
    build_constraints: { parent_snapshot: SOURCE_PIN, mutation_stacked_on_p01_or_p02: false,
      rebuild_target: 'customers-service', baseline_services_kept_byte_identical: ['config-server', 'discovery-server', 'visits-service', 'api-gateway'],
      reject_p02_mutated_visits_artifact: true, isolated_source_build_directory: true,
      offline_dependencies_and_pinned_local_images_only: true, java_application_tests_not_yet_run: true },
    protocol: { version: '0.2', path: 'protocol/benchmark_protocol_v0.2.md', sha256: sha256(protocolBytes),
      status: 'preparation_and_pilot_review_framework_not_official_test_or_scoring_approval' },
    bindings: { patch_sha256: sha256(patch), fixture_sha256: sha256(jsonText(fixture)), scope_sha256: sha256(jsonText(scope)),
      inventory_sha256: sha256(jsonText(inventory)), universe_sha256: sha256(jsonText(universe)) },
    implementation_output_contract: 'existing draft remains unadopted', labels_status: 'not_created', reviewer: null, ...GATES };
  const plan = { schema: 'p03-runtime-plan-candidate/1', status: 'not_executed_not_authorized',
    groups: fixture.snapshots.flatMap(snapshot => [1, 2].map(repetition => ({ group_id: snapshot + '-r' + repetition, snapshot, repetition,
      fresh_database: true, setup: fixture.empty_pets_setup, requests: fixture.requests }))),
    planned_counts: { groups: 4, fixture_request_slots: 48, get_slots: 40, post_slots: 4, put_slots: 4,
      extra_setup_post: 4, required_write_control_readbacks: 8,
      readiness_config_registry_seed_checks: 'Additional, not counted as fixture slots; retain every attempt' },
    prerequisites: ['Huy selects exact candidate and receives independent scope confirmation', 'Baseline feasibility with exact fixture and no hidden repair',
      'Separate input lock and explicit sandbox runtime/write authorization', 'Runner/checker offline tests and immutable build/config provenance'],
    actual_remote_calls: 0, runtime_authorized: false };
  return { scenario, fixture, scope, inventory, universe, plan, audit, mutated, patch };
}
