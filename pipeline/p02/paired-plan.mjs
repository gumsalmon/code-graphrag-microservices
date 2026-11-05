// Pure planning and synthetic lifecycle tests only. No I/O, runtime adapter, HTTP or Docker.
import { createHash } from 'node:crypto';

const check = (ok, message) => { if (!ok) throw new Error(message); };
export const SOURCE_PIN = '3858f9c630cf989bb6809a86edf47c2be78dc9f1';
export const CONFIG_PIN = '323993ce2519c6d02df63e08bf4458d123d3b611';
export const SERVICES = Object.freeze(['config-server', 'discovery-server', 'customers-service', 'visits-service', 'api-gateway']);
export const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort()) : item);
const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
const keysOnly = (value, keys, message) => check(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key)), message);
const encoded = value => JSON.stringify(value, null, 2) + '\n';
export const PLAN_STATE = Object.freeze({ mode: 'dry_run_only', runtime_backend: 'none', real_execution_enabled: false,
  independent_input_confirmation_received: false, universe_locked: false, labels_created: false, official_scoring_authorized: false,
  actual_http_requests: 0, actual_application_starts: 0, actual_post_requests: 0, actual_cleanup_operations: 0, model_calls: 0 });

export function validateRequestMatrix(fixture, matrix) {
  keysOnly(fixture, ['schema', 'fixture_id', 'status', 'database_mode', 'sql_files', 'primary', 'auxiliary_empty', 'seed_visits', 'snapshots',
    'repetitions', 'requests', 'execution_policy', 'comparison_policy'], 'Unexpected fixture input; no label/output oracle is allowed');
  check(fixture.schema === 'p02-fixture-plan/1' && canonical(fixture.snapshots) === canonical(['baseline', 'mutated']) && fixture.repetitions === 2 &&
    fixture.requests?.length === 10 && fixture.execution_policy?.automatic_execution === false &&
    fixture.execution_policy.post_only_in_run_owned_disposable_database === true && fixture.execution_policy.no_repair_or_consumer_changes === true,
  'Wrong P02 fixture or unsafe execution policy');
  const ids = new Set();
  for (const [index, request] of fixture.requests.entries()) {
    keysOnly(request, ['id', 'target', 'method', 'path', 'role', 'headers', 'body'], 'Unexpected request input; no expected status or polarity');
    check(typeof request.id === 'string' && /^[a-z][a-z0-9_]{0,48}$/.test(request.id) && !ids.has(request.id), 'Duplicate/invalid request ID'); ids.add(request.id);
    check(['visits', 'gateway'].includes(request.target) && ['GET', 'POST'].includes(request.method) && typeof request.role === 'string' &&
      /^\/[A-Za-z0-9_/?&=,.-]*$/.test(request.path) && !request.path.includes('..') && !request.path.includes('//'), 'Unsafe method, target or relative HTTP path');
    if (request.method === 'POST') check(index === fixture.requests.length - 1 && request.target === 'visits' &&
      canonical(request.headers) === canonical({ 'Content-Type': 'application/json' }) && request.body && typeof request.body === 'object', 'POST must be last and use the isolated visits target');
    else check(request.headers === undefined && request.body === undefined, 'GET request unexpectedly carries headers/body');
  }
  check(fixture.requests.filter(request => request.method === 'POST').length === 1, 'Exactly one final POST per group is required');
  keysOnly(matrix, ['schema', 'status', 'base_urls', 'planned_only', 'actual_remote_calls', 'cases'], 'Unexpected matrix input; no output oracle');
  check(matrix.schema === 'p02-runtime-request-plan/1' && matrix.status === 'not_executed' && matrix.planned_only === true &&
    matrix.actual_remote_calls === 0 && canonical(matrix.base_urls) === canonical({ visits: null, gateway: null }) && Array.isArray(matrix.cases), 'Matrix is not an unexecuted plan');
  // Exact order, body, metadata and null observation fields must match the frozen fixture.
  const expected = fixture.snapshots.flatMap(snapshot => [1, 2].flatMap(repetition => fixture.requests.map(request =>
    ({ snapshot, repetition, ...request, actual_http_status: null, raw_response_file: null }))));
  for (const item of matrix.cases) keysOnly(item, ['snapshot', 'repetition', 'id', 'target', 'method', 'path', 'role', 'headers', 'body',
    'actual_http_status', 'raw_response_file'], 'Unexpected matrix case; no labels, predictions or observed output');
  check(matrix.cases.length === 40 && canonical(matrix.cases) === canonical(expected), 'Matrix differs: missing, duplicate, reordered, changed or executed request');
  return { groups: 4, planned_requests: 40, planned_get_requests: 36, planned_post_requests: 4 };
}

export function buildPairedPlan({ scenario, fixture, matrix, bindings, runId }) {
  const counts = validateRequestMatrix(fixture, matrix);
  check(/^[a-z0-9][a-z0-9-]{2,48}$/.test(runId), 'Unsafe/overlong dry-run identifier');
  check(scenario.schema === 'p02-scenario-preparation/1' && scenario.scenario_id === 'P02' && scenario.baseline_commit === SOURCE_PIN &&
    scenario.selection.independent_confirmation_received === false && scenario.evaluation_universe.locked === false &&
    scenario.labels.status === 'not_created' && scenario.official_scoring_authorized === false && scenario.split_intent === 'development', 'Scenario is not the pending-input P02 preparation');
  keysOnly(bindings, ['patch_sha256', 'fixture_sha256', 'universe_draft_sha256', 'request_plan_sha256', 'preparation_manifest_sha256'], 'Unexpected input binding');
  check(['patch_sha256', 'fixture_sha256', 'universe_draft_sha256', 'request_plan_sha256', 'preparation_manifest_sha256'].every(key => /^[a-f0-9]{64}$/.test(bindings[key])), 'Missing input SHA256 binding');
  const groups = fixture.snapshots.flatMap(snapshot => [1, 2].map(repetition => {
    const id = snapshot + '-r' + repetition, prefix = 'p02pair-' + runId + '-' + id;
    const ownership = { label_key: 'code-graphrag.p02-paired', label_value: runId + ':' + id };
    return { id, snapshot, repetition, ownership,
      resources: [{ kind: 'network', name: prefix + '-net', ...ownership }, ...SERVICES.map(service => ({ kind: 'container', service, name: prefix + '-' + service, ...ownership }))],
      isolation: { database: 'fresh_group_owned_in_memory_hsqldb', database_instance_key: prefix + '-db', reuse_database: false,
        persistent_database_mounts: [], host_ports: [], network_internal: true, reset_before_next_group: 'destroy_this_group_then_create_new_services_and_databases',
        source_commit: SOURCE_PIN, config_commit: CONFIG_PIN, fixture_sha256: bindings.fixture_sha256,
        build_identity: snapshot === 'mutated' ? 'not_built_after_input_gate_provider_only_patch' : 'must_bind_verified_baseline_build_before_runtime',
        consumers_unchanged_required: true, configuration_equal_between_snapshots_required: true },
      setup_evidence_required_before_requests: ['exact_build_and_source_patch_identity', 'effective_pinned_config_and_hsqldb_sql',
        'all_readiness_attempts', 'direct_and_gateway_populated_fixture_contents', 'real_consumer_provider_registry'],
      slots: matrix.cases.filter(item => item.snapshot === snapshot && item.repetition === repetition).map((item, index) => ({
        slot_id: id + '/' + item.id, order: index + 1, request: structuredClone(item),
        future_evidence: { request_record: 'groups/' + id + '/observations/' + item.id + '.json',
          response_body: 'groups/' + id + '/observations/' + item.id + '.body', required_even_on_error: true, observed: false }
      })) };
  }));
  return { schema: 'p02-paired-dry-plan/1', run_id: runId, scenario_id: 'P02', scenario_version: scenario.scenario_version,
    source_commit: SOURCE_PIN, config_commit: CONFIG_PIN, bindings: structuredClone(bindings), state: structuredClone(PLAN_STATE), counts,
    real_execution_blockers: ['independent_input_confirmation_and_universe_lock_missing', 'paired_runtime_adapter_not_implemented',
      'mutated_build_identity_not_created', 'paired_environment_and_consumer_unchanged_proof_not_collected'],
    lifecycle: ['allocate_network', 'start_services', 'verify_fixture', 'requests_in_order_post_last', 'capture_logs_even_on_failure',
      'cleanup_owned_resources_in_reverse_order', 'stop_if_failed_or_cleanup_incomplete_before_next_group'],
    failure_policy: { automatic_request_retries: 0, continue_after_failed_group: false, preserve_primary_and_cleanup_errors: true,
      cleanup_by_prefix_or_global_prune: false, unknown_response_is_not_empty_success: true },
    evidence_policy: { runtime_observations_generated_by_dry_run: false, body_bytes_preserved_before_parsing: true,
      header_representation: 'parsed_pairs_not_byte_exact_wire_transcript', statuses_not_predetermined: true, normalize_in_separate_derived_files_only: true,
      keep_all_fields_and_original_array_order: true, runtime_support_requests_separate_from_40_fixture_slots: true,
      draft_labels_and_system_predictions_are_not_inputs: true }, groups };
}

function validatePlanShape(plan) {
  check(plan.schema === 'p02-paired-dry-plan/1' && /^[a-z0-9][a-z0-9-]{2,48}$/.test(plan.run_id) &&
    plan.source_commit === SOURCE_PIN && plan.config_commit === CONFIG_PIN && canonical(plan.state) === canonical(PLAN_STATE) && plan.groups?.length === 4 &&
    canonical(plan.counts) === canonical({ groups: 4, planned_requests: 40, planned_get_requests: 36, planned_post_requests: 4 }), 'Only a complete dry-run plan is allowed');
  const names = new Set(), slots = new Set(), databases = new Set();
  for (const [index, group] of plan.groups.entries()) {
    const snapshot = index < 2 ? 'baseline' : 'mutated', repetition = index % 2 + 1;
    check(group.id === snapshot + '-r' + repetition && group.snapshot === snapshot && group.repetition === repetition && group.slots?.length === 10,
      'Wrong group order or repetition');
    check(group.isolation.reuse_database === false && group.isolation.host_ports.length === 0 && group.isolation.persistent_database_mounts.length === 0 &&
      group.isolation.network_internal === true && !databases.has(group.isolation.database_instance_key), 'Database/resource isolation violated'); databases.add(group.isolation.database_instance_key);
    check(group.resources.length === 6 && group.resources[0].kind === 'network' && canonical(group.resources.slice(1).map(item => item.service)) === canonical(SERVICES), 'Wrong resource inventory');
    for (const resource of group.resources) {
      const expected = 'p02pair-' + plan.run_id + '-' + group.id + '-' + (resource.kind === 'network' ? 'net' : resource.service);
      check(resource.name === expected && !names.has(resource.name) && resource.label_key === 'code-graphrag.p02-paired' && resource.label_value === plan.run_id + ':' + group.id,
        'Wrong, duplicate or foreign resource ownership'); names.add(resource.name);
    }
    for (const [position, slot] of group.slots.entries()) {
      check(slot.order === position + 1 && slot.slot_id === group.id + '/' + slot.request.id && !slots.has(slot.slot_id) &&
        slot.request.snapshot === snapshot && slot.request.repetition === repetition && slot.request.actual_http_status === null && slot.request.raw_response_file === null &&
        slot.request.method === (position === 9 ? 'POST' : 'GET') && slot.future_evidence.observed === false, 'Invalid/observed/reordered request slot'); slots.add(slot.slot_id);
    }
  }
}

export function assertCleanupTarget(plan, group, candidate) {
  const approved = plan.groups.find(item => item.id === group.id);
  check(approved && approved === group && approved.resources.some(item => canonical(item) === canonical(candidate)) &&
    candidate.label_key === 'code-graphrag.p02-paired' && candidate.label_value === plan.run_id + ':' + group.id, 'Refuse cleanup of a foreign or unplanned resource');
  return true;
}

// This intentionally has no pluggable executor. A future real adapter needs a separate implementation and input gate.
export function simulatePairedPlan(plan, { failures = [] } = {}) {
  validatePlanShape(plan);
  check(Array.isArray(failures) && failures.length <= 16, 'Invalid synthetic fault injections');
  const knownPhases = ['allocate_network', 'start_service', 'verify_fixture', 'request', 'capture_logs', 'cleanup'];
  const unique = new Set();
  for (const failure of failures) {
    keysOnly(failure, ['group_id', 'phase', 'subject'], 'Unknown synthetic fault input');
    const group = plan.groups.find(item => item.id === failure.group_id);
    check(group && knownPhases.includes(failure.phase) && !unique.has(canonical(failure)), 'Unknown/duplicate synthetic fault'); unique.add(canonical(failure));
    const subjects = failure.phase === 'start_service' || failure.phase === 'capture_logs' ? SERVICES : failure.phase === 'request' ? group.slots.map(item => item.request.id)
      : failure.phase === 'cleanup' ? group.resources.map(item => item.name) : [null];
    check(subjects.includes(failure.subject), 'Invalid synthetic fault subject');
  }
  const events = [], consumed = new Set(), owned = new Map(), visited = new Set(), rows = [];
  let stopped = false;
  const event = (group, phase, subject, action) => events.push({ sequence: events.length + 1, synthetic_only: true, group_id: group.id, phase, subject, action });
  const perform = (group, phase, subject, row) => {
    event(group, phase, subject, 'simulated_attempt');
    const injection = failures.findIndex((failure, index) => !consumed.has(index) && failure.group_id === group.id && failure.phase === phase && failure.subject === subject);
    if (injection >= 0) {
      consumed.add(injection); const error = { kind: 'synthetic_injected_failure_not_runtime', phase, subject };
      row.synthetic_errors.push(error); event(group, phase, subject, 'synthetic_failure'); return false;
    }
    event(group, phase, subject, 'simulated_completion'); return true;
  };
  for (const group of plan.groups) {
    const row = { group_id: group.id, synthetic_state: 'not_simulated', request_slots_visited: [], post_slot_visited: false,
      fixture_check_simulated: false, synthetic_cleanup_attempted: [], synthetic_cleanup_complete: null, synthetic_errors: [] }; rows.push(row);
    if (stopped) continue;
    check(owned.size === 0, 'Previous group not cleaned; refuse database reuse'); row.synthetic_state = 'simulating';
    // Register intended resources before an attempted allocation/start, including uncertain partial failures.
    const network = group.resources[0]; owned.set(network.name, network);
    let ready = perform(group, 'allocate_network', null, row);
    if (ready) for (const container of group.resources.slice(1)) {
      owned.set(container.name, container);
      if (!perform(group, 'start_service', container.service, row)) { ready = false; break; }
    }
    if (ready) { ready = perform(group, 'verify_fixture', null, row); row.fixture_check_simulated = ready; }
    if (ready) for (const slot of group.slots) {
      check(row.fixture_check_simulated && !row.post_slot_visited && !visited.has(slot.slot_id), 'Request before fixture, after POST or repeated');
      visited.add(slot.slot_id); row.request_slots_visited.push(slot.slot_id);
      if (slot.request.method === 'POST') row.post_slot_visited = true;
      if (!perform(group, 'request', slot.request.id, row)) break;
    }
    // Finally-like path runs for startup, fixture and request failures too; retain errors independently.
    for (const resource of [...owned.values()].filter(item => item.kind === 'container')) perform(group, 'capture_logs', resource.service, row);
    for (const resource of [...owned.values()].reverse()) {
      assertCleanupTarget(plan, group, resource); row.synthetic_cleanup_attempted.push(resource.name);
      if (perform(group, 'cleanup', resource.name, row)) owned.delete(resource.name);
    }
    row.synthetic_cleanup_complete = owned.size === 0;
    row.synthetic_state = row.synthetic_errors.length ? 'simulated_failure' : 'simulated_complete';
    stopped = row.synthetic_errors.length > 0 || owned.size > 0;
  }
  return { schema: 'p02-paired-synthetic-trace/1', plan_sha256: hash(plan), status: stopped ? 'synthetic_failure_exercised_no_runtime' : 'simulation_complete_no_runtime',
    synthetic_only: true, actual_http_requests: 0, actual_application_starts: 0, actual_cleanup_operations: 0, actual_post_requests: 0, labels_created: false, model_calls: 0,
    requested_faults: structuredClone(failures), untriggered_faults: failures.filter((_failure, index) => !consumed.has(index)),
    request_slots_visited_in_simulation: visited.size, synthetic_resource_records_remaining: [...owned.keys()], groups: rows, events };
}

export function exerciseFailurePaths(plan) {
  const group = plan.groups[0];
  const fault = (phase, subject = null) => ({ group_id: group.id, phase, subject });
  const definitions = [
    ['network_partial_failure', [fault('allocate_network')]],
    ['service_partial_failure', [fault('start_service', 'visits-service')]],
    ['fixture_failure', [fault('verify_fixture')]],
    ['request_failure', [fault('request', group.slots[2].request.id)]],
    ['post_failure', [fault('request', group.slots[9].request.id)]],
    ['log_capture_failure', [fault('capture_logs', 'api-gateway')]],
    ['cleanup_failure', [fault('cleanup', group.resources[3].name)]],
    ['primary_plus_log_and_cleanup_failure', [fault('request', group.slots[0].request.id), fault('capture_logs', 'visits-service'), fault('cleanup', group.resources[3].name)]]
  ];
  return { schema: 'p02-paired-synthetic-fault-suite/1', synthetic_only: true, actual_http_requests: 0,
    scenarios: definitions.map(([id, failures]) => ({ id, trace: simulatePairedPlan(plan, { failures }) })) };
}

export function summarizeDryRun(plan, simulation, faults) {
  const onlySynthetic = trace => trace.schema === 'p02-paired-synthetic-trace/1' && trace.synthetic_only === true && trace.plan_sha256 === hash(plan) &&
    ['actual_http_requests', 'actual_application_starts', 'actual_cleanup_operations', 'actual_post_requests', 'model_calls'].every(field => trace[field] === 0) &&
    trace.labels_created === false && trace.events.every(event => event.synthetic_only === true);
  check(onlySynthetic(simulation) && simulation.status === 'simulation_complete_no_runtime' && simulation.request_slots_visited_in_simulation === 40 &&
    simulation.synthetic_resource_records_remaining.length === 0 && simulation.groups.length === 4 && simulation.groups.every(row =>
      row.synthetic_state === 'simulated_complete' && row.request_slots_visited.length === 10 && row.synthetic_errors.length === 0 &&
      row.synthetic_cleanup_complete === true && row.post_slot_visited), 'Happy-path simulation incomplete or not exclusively synthetic');
  check(faults.scenarios.length === 8 && faults.scenarios.every(item => item.trace.status === 'synthetic_failure_exercised_no_runtime' &&
    onlySynthetic(item.trace) && item.trace.untriggered_faults.length === 0 && item.trace.groups.slice(1).every(row => row.synthetic_state === 'not_simulated')), 'Fault simulation incomplete or failed to stop');
  return { schema: 'p02-paired-dry-summary/1', status: 'dry_run_verified_not_runtime_evidence', run_id: plan.run_id,
    ...plan.counts, simulated_request_slots: 40, synthetic_failure_scenarios: 8, real_execution_enabled: false,
    actual_http_requests: 0, actual_post_requests: 0, actual_application_starts: 0, actual_cleanup_operations: 0, model_calls: 0,
    mutation_applied_to_checkout: false, runtime_matrix_completed: false, universe_locked: false, labels_created: false,
    independent_input_confirmation_received: false, official_scoring_authorized: false,
    warning: 'A simulated POST/start/cleanup is only a state transition. No raw application observations, ground truth or method outputs were produced.' };
}

export const jsonText = encoded;
