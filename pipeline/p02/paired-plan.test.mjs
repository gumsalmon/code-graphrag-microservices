import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildPairedPlan, validateRequestMatrix, simulatePairedPlan, exerciseFailurePaths, summarizeDryRun, assertCleanupTarget,
  canonical, SOURCE_PIN, CONFIG_PIN } from './paired-plan.mjs';
const fixture = JSON.parse(await readFile(new URL('../../benchmark/p02/preparation.v1/fixture.json', import.meta.url), 'utf8'));
const scenario = JSON.parse(await readFile(new URL('../../benchmark/p02/preparation.v1/scenario.json', import.meta.url), 'utf8'));
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function input() {
  const selected = structuredClone(fixture);
  return { scenario: structuredClone(scenario), fixture: selected, runId: 'synthetic-test-01', bindings: Object.fromEntries(
    ['patch_sha256', 'fixture_sha256', 'universe_draft_sha256', 'request_plan_sha256', 'preparation_manifest_sha256'].map(name => [name, sha(name)])),
    matrix: { schema: 'p02-runtime-request-plan/1', status: 'not_executed', base_urls: { visits: null, gateway: null }, planned_only: true, actual_remote_calls: 0,
      cases: ['baseline', 'mutated'].flatMap(snapshot => [1, 2].flatMap(repetition => selected.requests.map(request =>
        ({ snapshot, repetition, ...structuredClone(request), actual_http_status: null, raw_response_file: null })))) } };
}
const plan = () => buildPairedPlan(input());
const fault = (phase, subject = null) => ({ group_id: 'baseline-r1', phase, subject });

test('four groups retain the exact 40 frozen fixture slots, including four last POSTs', () => {
  const built = plan(); assert.equal(built.groups.length, 4);
  assert.deepEqual(built.counts, { groups: 4, planned_requests: 40, planned_get_requests: 36, planned_post_requests: 4 });
  for (const group of built.groups) {
    assert.deepEqual(group.slots.map(slot => slot.request.id), fixture.requests.map(request => request.id));
    assert.equal(group.slots.at(-1).request.method, 'POST');
    assert.ok(group.slots.slice(0, -1).every(slot => slot.request.method === 'GET'));
  }
  assert.equal(built.groups[0].slots.find(slot => slot.request.id === 'direct_invalid').request.role.includes('out-of-valid-domain'), true);
});
test('plan construction and simulation are deterministic and never mutate their inputs', () => {
  const data = input(), before = canonical(data), built = buildPairedPlan(data), saved = canonical(built);
  assert.deepEqual(built, buildPairedPlan(data)); assert.equal(canonical(data), before);
  assert.deepEqual(simulatePairedPlan(built), simulatePairedPlan(built)); assert.equal(canonical(built), saved);
});
test('all resource and database identities are unique, with common pin/fixture and no ports/volumes', () => {
  const built = plan(), names = built.groups.flatMap(group => group.resources.map(resource => resource.name));
  assert.equal(new Set(names).size, 24); assert.equal(new Set(built.groups.map(group => group.isolation.database_instance_key)).size, 4);
  for (const group of built.groups) {
    assert.equal(group.isolation.source_commit, SOURCE_PIN); assert.equal(group.isolation.config_commit, CONFIG_PIN);
    assert.equal(group.isolation.fixture_sha256, built.bindings.fixture_sha256); assert.equal(group.isolation.reuse_database, false);
    assert.equal(group.isolation.network_internal, true); assert.deepEqual(group.isolation.host_ports, []); assert.deepEqual(group.isolation.persistent_database_mounts, []);
  }
});
test('missing/duplicate/reordered/changed matrix cases and fabricated HTTP observations are rejected', () => {
  for (const change of [value => value.matrix.cases.pop(), value => { value.matrix.cases[1] = value.matrix.cases[0]; },
    value => value.matrix.cases.reverse(), value => { value.matrix.cases[0].repetition = 3; }, value => { value.matrix.cases[0].path += '&repair=true'; },
    value => { value.matrix.cases[0].actual_http_status = 200; }, value => { value.matrix.cases[0].raw_response_file = 'fake.body'; },
    value => { value.matrix.cases.at(-1).body.description = 'Different write'; }]) {
    const data = input(); change(data); assert.throws(() => buildPairedPlan(data), /Matrix differs/);
  }
});
test('early/extra/missing POST and unsafe external targets cannot enter the structural plan', () => {
  for (const change of [value => value.fixture.requests.reverse(), value => { value.fixture.requests[0].method = 'POST'; },
    value => { value.fixture.requests.at(-1).method = 'GET'; }, value => { value.fixture.requests[0].target = 'production'; },
    value => { value.fixture.requests[0].path = 'http://localhost:8080/x'; }, value => { value.fixture.requests[0].path = '//evil/x'; },
    value => { value.fixture.requests[0].path = '/x\r\nAuthorization: x'; }, value => { value.fixture.requests[0].path = '/../secret'; },
    value => { value.fixture.execution_policy.post_only_in_run_owned_disposable_database = false; }]) {
    const data = input(); change(data); assert.throws(() => buildPairedPlan(data), /POST|Unsafe|GET|policy/);
  }
});
test('oracle properties are refused before an unknown getter can be read', () => {
  for (const target of ['fixture', 'matrix', 'case']) {
    const data = input(), object = target === 'case' ? data.matrix.cases[0] : data[target];
    Object.defineProperty(object, 'predictions', { enumerable: true, get() { throw new Error('ORACLE READ'); } });
    assert.throws(() => buildPairedPlan(data), /Unexpected/);
  }
});
test('fake gate approvals, scoring and unsafe run IDs cannot create a preparation plan', () => {
  for (const change of [value => { value.scenario.selection.independent_confirmation_received = true; },
    value => { value.scenario.evaluation_universe.locked = true; }, value => { value.scenario.labels.status = 'accepted'; },
    value => { value.scenario.official_scoring_authorized = true; }, value => { value.runId = '../outside'; },
    value => { value.bindings.fixture_sha256 = null; }]) {
    const data = input(); change(data); assert.throws(() => buildPairedPlan(data), /pending-input|identifier|binding/);
  }
});
test('happy-path visits 40 synthetic slots, keeps observation fields null and never claims actual execution', () => {
  const built = plan(), trace = simulatePairedPlan(built), summary = summarizeDryRun(built, trace, exerciseFailurePaths(built));
  assert.equal(trace.request_slots_visited_in_simulation, 40); assert.equal(trace.events.every(event => event.synthetic_only === true), true);
  assert.ok(trace.groups.every(row => row.synthetic_state === 'simulated_complete' && row.synthetic_cleanup_complete && row.post_slot_visited));
  for (const field of ['actual_http_requests', 'actual_application_starts', 'actual_post_requests', 'actual_cleanup_operations', 'model_calls']) {
    assert.equal(trace[field], 0); assert.equal(summary[field], 0);
  }
  assert.equal(summary.runtime_matrix_completed, false); assert.equal(summary.labels_created, false); assert.equal(summary.universe_locked, false);
  assert.ok(built.groups.flatMap(group => group.slots).every(slot => slot.request.actual_http_status === null && slot.request.raw_response_file === null));
});
test('each fixture check precedes requests; each cleanup completes before the next group', () => {
  const built = plan(), trace = simulatePairedPlan(built);
  for (const [index, group] of built.groups.entries()) {
    const local = trace.events.filter(event => event.group_id === group.id);
    assert.ok(local.find(event => event.phase === 'verify_fixture' && event.action === 'simulated_completion').sequence < local.find(event => event.phase === 'request').sequence);
    if (index < 3) assert.ok(local.at(-1).sequence < trace.events.find(event => event.group_id === built.groups[index + 1].id).sequence);
    assert.ok(local.at(-1).phase === 'cleanup');
  }
});
test('partial allocation/start and bad fixture stop requests but still exercise cleanup of intended resources', () => {
  for (const failure of [fault('allocate_network'), fault('start_service', 'visits-service'), fault('verify_fixture')]) {
    const trace = simulatePairedPlan(plan(), { failures: [failure] }), first = trace.groups[0];
    assert.equal(first.request_slots_visited.length, 0); assert.equal(first.synthetic_cleanup_complete, true);
    assert.ok(first.synthetic_cleanup_attempted.length > 0); assert.deepEqual(trace.synthetic_resource_records_remaining, []);
    assert.ok(trace.groups.slice(1).every(row => row.synthetic_state === 'not_simulated'));
  }
});
test('request failure preserves its record, does not retry or proceed to a POST, and captures logs', () => {
  const trace = simulatePairedPlan(plan(), { failures: [fault('request', 'direct_false')] }), row = trace.groups[0];
  assert.equal(row.request_slots_visited.length, 3); assert.equal(row.post_slot_visited, false);
  assert.equal(trace.events.filter(event => event.phase === 'request' && event.subject === 'direct_false' && event.action === 'simulated_attempt').length, 1);
  assert.equal(trace.events.filter(event => event.phase === 'capture_logs' && event.action === 'simulated_attempt').length, 5);
  assert.equal(row.synthetic_cleanup_complete, true); assert.equal(trace.groups[1].synthetic_state, 'not_simulated');
});
test('POST failure cannot contaminate another group; cleanup happens after the failed final slot', () => {
  const trace = simulatePairedPlan(plan(), { failures: [fault('request', 'create_control')] }), row = trace.groups[0];
  assert.equal(row.request_slots_visited.length, 10); assert.equal(row.post_slot_visited, true);
  assert.equal(row.synthetic_cleanup_complete, true); assert.equal(trace.groups[1].request_slots_visited.length, 0);
  assert.equal(trace.actual_post_requests, 0);
});
test('a late mutated-group fault preserves earlier groups and never visits a slot twice', () => {
  const built = plan(), trace = simulatePairedPlan(built, { failures: [{ group_id: 'mutated-r2', phase: 'request', subject: 'direct_true' }] });
  assert.ok(trace.groups.slice(0, 3).every(row => row.synthetic_state === 'simulated_complete' && row.synthetic_cleanup_complete));
  assert.equal(trace.request_slots_visited_in_simulation, 32); assert.equal(trace.groups[3].synthetic_state, 'simulated_failure');
  assert.equal(trace.groups[3].synthetic_cleanup_complete, true);
  const slots = trace.groups.flatMap(row => row.request_slots_visited); assert.equal(new Set(slots).size, slots.length);
});
test('primary, log and cleanup failures stay distinct; other cleanup attempts still run and next group is blocked', () => {
  const built = plan(), resource = built.groups[0].resources[3];
  const trace = simulatePairedPlan(built, { failures: [fault('request', 'direct_omitted'), fault('capture_logs', 'visits-service'), fault('cleanup', resource.name)] });
  assert.deepEqual(trace.groups[0].synthetic_errors.map(error => error.phase), ['request', 'capture_logs', 'cleanup']);
  assert.equal(trace.groups[0].synthetic_cleanup_attempted.length, 6); assert.equal(trace.groups[0].synthetic_cleanup_complete, false);
  assert.deepEqual(trace.synthetic_resource_records_remaining, [resource.name]); assert.equal(trace.groups[1].synthetic_state, 'not_simulated');
});
test('cleanup allowlist rejects same-prefix foreign names, wrong labels and another group resources', () => {
  const built = plan(), group = built.groups[0], candidate = group.resources[0];
  assert.equal(assertCleanupTarget(built, group, structuredClone(candidate)), true);
  for (const resource of [{ ...candidate, name: candidate.name + '-foreign' }, { ...candidate, label_value: 'other-run' },
    { ...candidate, label_key: 'other-label' }, built.groups[1].resources[0]]) assert.throws(() => assertCleanupTarget(built, group, resource), /foreign or unplanned/);
});
test('altering resource ownership, reusing a DB, publishing a port or enabling execution breaks simulation', () => {
  for (const change of [value => { value.groups[1].resources[0].name = value.groups[0].resources[0].name; },
    value => { value.groups[0].resources[1].label_value = 'forged'; }, value => { value.groups[1].isolation.database_instance_key = value.groups[0].isolation.database_instance_key; },
    value => { value.groups[0].isolation.reuse_database = true; }, value => { value.groups[0].isolation.host_ports = [8080]; },
    value => { value.state.real_execution_enabled = true; }, value => { value.groups[0].slots[0].request.actual_http_status = 200; }]) {
    const built = plan(); change(built); assert.throws(() => simulatePairedPlan(built), /dry-run|isolation|ownership|slot/);
  }
});
test('invalid injections cannot silently pass as tested failure paths', () => {
  for (const failures of [[fault('unknown')], [fault('request', 'unknown')], [fault('verify_fixture'), fault('verify_fixture')],
    [{ ...fault('verify_fixture'), group_id: 'mutated-r9' }]]) assert.throws(() => simulatePairedPlan(plan(), { failures }), /fault/);
  const built = plan(), faults = exerciseFailurePaths(built); assert.equal(faults.scenarios.length, 8);
  assert.ok(faults.scenarios.every(item => item.trace.untriggered_faults.length === 0));
});
test('summary refuses incomplete simulations or synthetic fault suites that did not exercise a fault', () => {
  const built = plan(), trace = simulatePairedPlan(built), faults = exerciseFailurePaths(built);
  trace.request_slots_visited_in_simulation = 39; assert.throws(() => summarizeDryRun(built, trace, faults), /incomplete/);
  const valid = simulatePairedPlan(built); faults.scenarios[0].trace.untriggered_faults = [fault('verify_fixture')];
  assert.throws(() => summarizeDryRun(built, valid, faults), /Fault simulation incomplete/);
});
test('summary cannot hide an actual HTTP/start/POST/cleanup/model claim inside a synthetic trace', () => {
  const built = plan(), faults = exerciseFailurePaths(built);
  for (const field of ['actual_http_requests', 'actual_application_starts', 'actual_post_requests', 'actual_cleanup_operations', 'model_calls']) {
    const trace = simulatePairedPlan(built); trace[field] = 1;
    assert.throws(() => summarizeDryRun(built, trace, faults), /not exclusively synthetic/);
  }
});
