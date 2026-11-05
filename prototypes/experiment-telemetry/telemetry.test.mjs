import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSyntheticTelemetry, TelemetryError, TELEMETRY_ID, DESIGN_ID } from './telemetry.mjs';
import { syntheticClock, syntheticPlan, telemetryDemo } from './fixtures.mjs';

function setup(plan = syntheticPlan()) {
  const clock = syntheticClock(); return { plan, clock, recorder: createSyntheticTelemetry(plan, { clock }) };
}
const begin = (recorder, attempt_id = 'toy-attempt-1', run_id = 'toy-run-1', retry_of = null) => recorder.beginAttempt({ attempt_id, run_id, retry_of });
const finish = (recorder, attempt_id = 'toy-attempt-1', validation_status = 'valid') =>
  recorder.finishAttempt({ attempt_id, status: 'completed', validation_status, error: null });
const fail = (recorder, attempt_id = 'toy-attempt-1') => recorder.finishAttempt({ attempt_id, status: 'failed', validation_status: 'not_checked',
  error: { stage: 'transport', code: 'SYNTHETIC_TIMEOUT' } });
const usage = (recorder, native_usage, attempt_id = 'toy-attempt-1') => recorder.recordUsage({ attempt_id, mapping_version: 'toy-usage/1', native_usage });
const stage = (recorder, span_id = 'toy-stage', scope = 'online', owner_id = 'toy-attempt-1', name = 'retrieval') =>
  recorder.beginStage({ scope, owner_id, span_id, stage: name });
const endStage = (recorder, span_id = 'toy-stage') => recorder.finishStage({ span_id, status: 'completed', error_code: null });
const offline = recorder => recorder.beginOffline({ job_id: 'toy-offline', repository_id: 'toy-repository', method_config_id: 'toy-graph-config', cache_regime: 'cold' });
const throws = (fn, code) => assert.throws(fn, error => error instanceof TelemetryError && error.code === code);

test('missing demo retains all planned runs, no fake zero duration/token/cost and no inferred quality', () => {
  const result = telemetryDemo('missing'); assert.equal(result.telemetry_id, TELEMETRY_ID); assert.equal(result.design_id, DESIGN_ID);
  assert.equal(result.document_kind, 'synthetic_telemetry_fixture_not_project_measurements');
  assert.equal(result.operational_counts.planned_runs, 3); assert.equal(result.operational_counts.planned_runs_without_attempt, 3);
  assert.equal(result.operational_counts.registered_attempts, 0);
  assert.equal(result.duration_totals_for_recorded_owners_only.online.known_sum, null);
  assert.equal(result.usage_totals_by_category_not_sum_of_categories.input_tokens.known_sum, null);
  assert.ok(Object.values(result.campaign_cost).every(value => value === null));
  assert.ok(Object.values(result.evaluation_bindings_separate_from_model_input).every(value => value === null));
  for (const field of ['production_ready', 'applied_to_runtime', 'semantic_correctness_verified', 'ground_truth_accepted', 'official_scoring_authorized']) assert.equal(result[field], false);
  assert.equal(result.impact_metrics, null); assert.equal(result.quality_winner, null); assert.equal(result.actual_remote_calls, 0);
});
test('retry demo preserves timeout, ambiguity, usage gaps and all attempts instead of keeping the successful one', () => {
  const result = telemetryDemo('retry'); assert.equal(result.attempts.length, 2);
  assert.equal(result.attempts[0].status, 'failed'); assert.equal(result.attempts[0].error.code, 'SYNTHETIC_TIMEOUT');
  assert.equal(result.attempts[0].provider_receipt_known, null); assert.equal(result.attempts[1].retry_of, result.attempts[0].attempt_id);
  assert.equal(result.attempts[0].duration_ms, 15); assert.equal(result.attempts[1].duration_ms, 12);
  assert.equal(result.operational_counts.failed_attempts, 1); assert.equal(result.operational_counts.completed_attempts, 1);
  assert.equal(result.operational_counts.retry_attempts, 1); assert.equal(result.operational_counts.planned_runs_without_attempt, 2);
  const aggregate = result.usage_totals_by_category_not_sum_of_categories.input_tokens;
  assert.deepEqual(aggregate, { observed: 1, missing: 1, known_sum: 100, sum_for_all_recorded: null, overflow: false });
  assert.equal(result.campaign_usage_total, null); assert.equal(result.campaign_cost.estimated_amount, null);
});
test('overlapping stage sum is not online wall time; offline work is kept separate', () => {
  const result = telemetryDemo('overlap'), attempt = result.attempts[0];
  assert.equal(attempt.duration_ms, 10); assert.equal(attempt.spans.reduce((sum, item) => sum + item.duration_ms, 0), 16);
  assert.equal(result.offline_jobs[0].duration_ms, 25);
  assert.equal(result.duration_totals_for_recorded_owners_only.online.known_sum, 10);
  assert.equal(result.duration_totals_for_recorded_owners_only.offline.known_sum, 25);
  assert.equal(result.duration_totals_for_recorded_owners_only.sum_of_stages_is_owner_wall_time, false);
});
test('backwards UTC remains audit timestamp, while monotonic elapsed time stays correct', () => {
  const { recorder, clock } = setup(); begin(recorder); clock.advance(10); clock.shiftUtc(-60_000); finish(recorder);
  const attempt = recorder.snapshot().attempts[0]; assert.equal(attempt.duration_ms, 10);
  assert.ok(attempt.finished_at_utc < attempt.started_at_utc);
});
test('monotonic clock cannot go backwards and rejected operation does not close the attempt', () => {
  const { recorder, clock } = setup(); clock.advance(20); begin(recorder); const before = recorder.snapshot(); clock.advance(-1);
  throws(() => finish(recorder), 'MONOTONIC_CLOCK'); assert.deepEqual(recorder.snapshot(), before);
  clock.advance(2); finish(recorder); assert.equal(recorder.snapshot().attempts[0].duration_ms, 1);
});
test('clock must be injected and UTC must be canonical; no fallback to wall-clock durations', () => {
  throws(() => createSyntheticTelemetry(syntheticPlan()), 'INJECTED_CLOCK_REQUIRED');
  for (const mono of [NaN, Infinity, -1, null, '0']) {
    const recorder = createSyntheticTelemetry(syntheticPlan(), { clock: { monotonicMs: () => mono, utcNow: () => '2000-01-01T00:00:00.000Z' } });
    throws(() => begin(recorder), 'MONOTONIC_CLOCK'); assert.equal(recorder.snapshot().attempts.length, 0);
  }
  for (const utc of ['not-a-date', '2000-01-01', '2000-01-01T00:00:00+00:00', '2000-02-31T00:00:00.000Z', null]) {
    const recorder = createSyntheticTelemetry(syntheticPlan(), { clock: { monotonicMs: () => 0, utcNow: () => utc } });
    throws(() => begin(recorder), 'UTC_CLOCK'); assert.equal(recorder.snapshot().attempts.length, 0);
  }
});
test('in-flight attempts/stages stay unfinished with null durations when snapshotting', () => {
  const { recorder, clock } = setup(); begin(recorder); stage(recorder); clock.advance(10);
  const result = recorder.snapshot(); assert.equal(result.attempts[0].duration_ms, null); assert.equal(result.attempts[0].spans[0].duration_ms, null);
  assert.equal(result.operational_counts.in_flight_attempts, 1); assert.equal(result.duration_totals_for_recorded_owners_only.online.sum_for_all_recorded, null);
});
test('zero elapsed milliseconds is distinct from missing/unobserved time', () => {
  const { recorder } = setup(); begin(recorder); finish(recorder); const result = recorder.snapshot();
  assert.equal(result.attempts[0].duration_ms, 0); assert.equal(result.duration_totals_for_recorded_owners_only.online.known_sum, 0);
});
test('completed owner cannot hide open spans; failed owner closes them as interrupted with partial duration', () => {
  const { recorder, clock } = setup(); begin(recorder); stage(recorder); const before = recorder.snapshot();
  throws(() => finish(recorder), 'OPEN_STAGE'); assert.deepEqual(recorder.snapshot(), before);
  clock.advance(7); fail(recorder); const attempt = recorder.snapshot().attempts[0];
  assert.equal(attempt.spans[0].status, 'interrupted'); assert.equal(attempt.spans[0].duration_ms, 7);
  throws(() => endStage(recorder), 'SPAN_NOT_ACTIVE');
});
test('offline failed jobs retain their own error, interruption, cache identity and latency', () => {
  const { recorder, clock } = setup(); offline(recorder); stage(recorder, 'toy-offline-stage', 'offline', 'toy-offline', 'parse_resolve');
  clock.advance(9); recorder.finishOffline({ job_id: 'toy-offline', status: 'failed', error: { stage: 'parse_resolve', code: 'SYNTHETIC_TOOL_ERROR' } });
  const result = recorder.snapshot(); assert.equal(result.offline_jobs[0].duration_ms, 9); assert.equal(result.offline_jobs[0].spans[0].status, 'interrupted');
  assert.equal(result.offline_jobs[0].cache_regime, 'cold'); assert.equal(result.operational_counts.registered_attempts, 0);
});
test('native usage retains sparse payload and normalized missing fields remain null', () => {
  const { recorder } = setup(); begin(recorder); usage(recorder, { input_tokens: 0 });
  const actual = recorder.snapshot().attempts[0].usage;
  assert.deepEqual(actual.native_usage_payload, { input_tokens: 0 }); assert.equal(actual.input_tokens, 0);
  assert.equal(actual.output_tokens, null); assert.equal(actual.usage_mapping_version, 'toy-usage/1');
});
test('thinking/cache categories are not added to provider-reported total or input/output', () => {
  const result = telemetryDemo('retry'), native = result.attempts[1].usage;
  assert.equal(native.input_tokens, 100); assert.equal(native.output_tokens, 30); assert.equal(native.thinking_tokens, 20);
  assert.equal(native.cached_input_tokens, 40); assert.equal(native.reported_total_tokens, 130);
  assert.equal(result.usage_totals_by_category_not_sum_of_categories.reported_total_tokens.known_sum, 130);
  assert.equal(result.campaign_usage_total, null);
});
test('failed attempt usage is retained and included in per-category known sums', () => {
  const { recorder } = setup(); begin(recorder); usage(recorder, { reported_total_tokens: 13 }); fail(recorder);
  begin(recorder, 'toy-attempt-2', 'toy-run-1', 'toy-attempt-1'); usage(recorder, { reported_total_tokens: 17 }, 'toy-attempt-2'); finish(recorder, 'toy-attempt-2');
  const result = recorder.snapshot(); assert.equal(result.usage_totals_by_category_not_sum_of_categories.reported_total_tokens.known_sum, 30);
  assert.equal(result.usage_totals_by_category_not_sum_of_categories.reported_total_tokens.sum_for_all_recorded, 30);
  assert.equal(result.campaign_usage_total, null);
});
test('usage overflow is explicit and is never silently rounded to a total', () => {
  const { recorder } = setup(); begin(recorder); usage(recorder, { input_tokens: Number.MAX_SAFE_INTEGER }); fail(recorder);
  begin(recorder, 'toy-attempt-2', 'toy-run-1', 'toy-attempt-1'); usage(recorder, { input_tokens: 2 }, 'toy-attempt-2'); finish(recorder, 'toy-attempt-2');
  const total = recorder.snapshot().usage_totals_by_category_not_sum_of_categories.input_tokens;
  assert.equal(total.overflow, true); assert.equal(total.known_sum, null); assert.equal(total.sum_for_all_recorded, null);
});
test('input bytes are not converted to tokens, and token estimates require separate provenance', () => {
  const { recorder } = setup(); begin(recorder); recorder.recordContext({ attempt_id: 'toy-attempt-1', input_bytes: 1000, estimated_input_tokens: null, estimator_id: null });
  assert.equal(recorder.snapshot().attempts[0].context.estimated_input_tokens, null);
  fail(recorder); begin(recorder, 'toy-attempt-2', 'toy-run-1', 'toy-attempt-1');
  throws(() => recorder.recordContext({ attempt_id: 'toy-attempt-2', input_bytes: 1000, estimated_input_tokens: 200, estimator_id: null }), 'CONTEXT_DETAIL');
  recorder.recordContext({ attempt_id: 'toy-attempt-2', input_bytes: 1000, estimated_input_tokens: 200, estimator_id: 'toy-token-estimator' });
  assert.equal(recorder.snapshot().attempts[1].usage.input_tokens, null);
});
test('attempt transitions and data recording are append-only, even when first context observation is all null', () => {
  const { recorder } = setup(); begin(recorder);
  recorder.recordContext({ attempt_id: 'toy-attempt-1', input_bytes: null, estimated_input_tokens: null, estimator_id: null });
  throws(() => recorder.recordContext({ attempt_id: 'toy-attempt-1', input_bytes: 1, estimated_input_tokens: null, estimator_id: null }), 'CONTEXT_ALREADY_RECORDED');
  usage(recorder, { input_tokens: null }); throws(() => usage(recorder, { input_tokens: 2 }), 'USAGE_ALREADY_RECORDED');
  recorder.recordTransport({ attempt_id: 'toy-attempt-1', simulated_remote_calls: 0, provider_receipt_known: false });
  throws(() => recorder.recordTransport({ attempt_id: 'toy-attempt-1', simulated_remote_calls: 1, provider_receipt_known: true }), 'TRANSPORT_ALREADY_RECORDED');
  finish(recorder); const before = recorder.snapshot(); throws(() => finish(recorder), 'OWNER_NOT_ACTIVE');
  throws(() => usage(recorder, { input_tokens: 1 }), 'OWNER_NOT_ACTIVE'); assert.deepEqual(recorder.snapshot(), before);
});
test('manual retry requires immediate failed predecessor in the same run; completed/active attempts cannot be retried', () => {
  const { recorder } = setup(); begin(recorder); throws(() => begin(recorder, 'toy-attempt-2', 'toy-run-1', 'toy-attempt-1'), 'RETRY_CHAIN');
  fail(recorder); throws(() => begin(recorder, 'toy-attempt-2', 'toy-run-2', 'toy-attempt-1'), 'RETRY_CHAIN');
  throws(() => begin(recorder, 'toy-attempt-2', 'toy-run-1', null), 'RETRY_CHAIN');
  begin(recorder, 'toy-attempt-2', 'toy-run-1', 'toy-attempt-1'); finish(recorder, 'toy-attempt-2', 'invalid');
  throws(() => begin(recorder, 'toy-attempt-3', 'toy-run-1', 'toy-attempt-2'), 'RETRY_CHAIN');
});
test('repetitions and method configurations do not inflate scenario/group/repository counts', () => {
  const result = telemetryDemo('retry'); assert.equal(result.operational_counts.planned_runs, 3);
  assert.equal(result.operational_counts.distinct_scenarios, 1); assert.equal(result.operational_counts.distinct_duplicate_groups, 1);
  assert.equal(result.operational_counts.distinct_repositories, 1); assert.equal(result.operational_counts.repetitions_are_independent_scenarios, false);
});
test('completed/partial/invalid/not_checked validation states are distinct from execution failure and label approval', () => {
  for (const status of ['valid', 'partial', 'invalid', 'not_checked']) {
    const { recorder } = setup(); begin(recorder); finish(recorder, 'toy-attempt-1', status);
    const result = recorder.snapshot(); assert.equal(result.operational_counts.completed_attempts, 1);
    assert.equal(result.operational_counts.planned_runs_with_valid_attempt, Number(status === 'valid')); assert.equal(result.ground_truth_accepted, false);
  }
  const { recorder } = setup(); begin(recorder);
  throws(() => recorder.finishAttempt({ attempt_id: 'toy-attempt-1', status: 'failed', validation_status: 'valid', error: { stage: 'provider', code: 'SYNTHETIC_UNAVAILABLE' } }), 'EXECUTION_VALIDATION');
});
test('snapshots and returned objects cannot mutate internal plan, attempts, usage or spans', () => {
  const { recorder, clock, plan } = setup(); const started = begin(recorder); started.status = 'completed'; plan.runs[0].run_id = 'toy-changed';
  stage(recorder); clock.advance(3); const ended = endStage(recorder); ended.duration_ms = 999;
  const native = { input_tokens: 7 }; usage(recorder, native); native.input_tokens = 999;
  const result = recorder.snapshot(); result.attempts[0].usage.input_tokens = 999; result.planned_runs[0].attempt_ids.push('toy-injected');
  const next = recorder.snapshot(); assert.equal(next.attempts[0].status, 'in_flight'); assert.equal(next.attempts[0].usage.input_tokens, 7);
  assert.equal(next.attempts[0].spans[0].duration_ms, 3); assert.deepEqual(next.planned_runs[0].attempt_ids, ['toy-attempt-1']);
});

const badPlans = [
  ['reject real-run marker', plan => { plan.synthetic_only = false; }, 'SYNTHETIC_ONLY'],
  ['reject real repository names', plan => { plan.runs[0].repository_id = 'petclinic'; }, 'TOY_ID'],
  ['reject empty plan', plan => { plan.runs = []; }, 'PLAN_SIZE'],
  ['reject oversized plan', plan => { plan.runs = Array(1001).fill(plan.runs[0]); }, 'PLAN_SIZE'],
  ['reject duplicate run ID', plan => { plan.runs.push(structuredClone(plan.runs[0])); }, 'DUPLICATE_PLANNED_RUN'],
  ['reject same configuration/repetition under another run name', plan => { plan.runs.push({ ...plan.runs[0], run_id: 'toy-alias-name' }); }, 'DUPLICATE_PLANNED_RUN'],
  ['reject zero repetition', plan => { plan.runs[0].repetition = 0; }, 'RUN_CONFIG'],
  ['reject unknown cache regime', plan => { plan.runs[0].cache_regime = 'free'; }, 'RUN_CONFIG'],
  ['reject changing duplicate group for the same scenario across methods', plan => { plan.runs[1].duplicate_group_id = 'toy-other-group'; }, 'SCENARIO_GROUP_MISMATCH'],
  ['reject label/score injection', plan => { plan.ground_truth = []; }, 'FIELDS'],
];
for (const [name, mutate, code] of badPlans) test(name, () => {
  const plan = syntheticPlan(); mutate(plan); throws(() => createSyntheticTelemetry(plan, { clock: syntheticClock() }), code);
});
const badUsage = [
  ['negative tokens', { input_tokens: -1 }], ['fractional tokens', { input_tokens: 1.5 }],
  ['Boolean tokens', { input_tokens: true }], ['string tokens', { input_tokens: '12' }],
  ['non-finite tokens', { input_tokens: Infinity }], ['unsafe integer tokens', { input_tokens: Number.MAX_SAFE_INTEGER + 1 }],
  ['secret header field', { authorization: 'SYNTHETIC_PRIVATE_MARKER' }], ['credential path', { credential_path: 'SYNTHETIC_PRIVATE_MARKER' }],
  ['nested provider echo', { input_tokens: { message: 'SYNTHETIC_PRIVATE_MARKER' } }], ['empty native payload', {}],
];
for (const [name, native] of badUsage) test(`usage rejects ${name} before retention`, () => {
  const { recorder } = setup(); begin(recorder); const before = recorder.snapshot(); throws(() => usage(recorder, native), 'USAGE_FIELD');
  assert.deepEqual(recorder.snapshot(), before); assert.ok(!JSON.stringify(recorder.snapshot()).includes('PRIVATE_MARKER'));
});
test('unknown provider mapping and free-form errors cannot enter telemetry', () => {
  const { recorder } = setup(); begin(recorder);
  throws(() => recorder.recordUsage({ attempt_id: 'toy-attempt-1', mapping_version: 'unverified-provider-mapping', native_usage: { input_tokens: 2 } }), 'USAGE_MAPPING');
  throws(() => recorder.finishAttempt({ attempt_id: 'toy-attempt-1', status: 'failed', validation_status: 'not_checked', error: { stage: 'provider', code: 'SYNTHETIC_PRIVATE_MARKER' } }), 'ERROR_VOCABULARY');
  throws(() => recorder.finishAttempt({ attempt_id: 'toy-attempt-1', status: 'failed', validation_status: 'not_checked', error: { stage: 'provider', code: 'SYNTHETIC_TIMEOUT', message: 'SYNTHETIC_PRIVATE_MARKER' } }), 'FIELDS');
  assert.ok(!JSON.stringify(recorder.snapshot()).includes('PRIVATE_MARKER'));
});
test('stage scope, ownership, duplication and lifecycle are checked without mutating on errors', () => {
  const { recorder } = setup(); begin(recorder); offline(recorder); const before = recorder.snapshot();
  throws(() => stage(recorder, 'toy-span', 'offline', 'toy-attempt-1', 'parse_resolve'), 'OWNER_NOT_ACTIVE');
  throws(() => stage(recorder, 'toy-span', 'online', 'toy-attempt-1', 'parse_resolve'), 'STAGE_ID');
  throws(() => stage(recorder, 'toy-span', 'unknown'), 'SCOPE'); assert.deepEqual(recorder.snapshot(), before);
  stage(recorder); throws(() => stage(recorder), 'STAGE_ID'); endStage(recorder); throws(() => endStage(recorder), 'SPAN_NOT_ACTIVE');
});
test('unplanned runs, reused IDs and unsafe/free-form IDs are rejected', () => {
  const { recorder } = setup(); throws(() => begin(recorder, 'toy-attempt-1', 'toy-unplanned'), 'UNPLANNED_RUN');
  throws(() => begin(recorder, 'C:/credential/path'), 'ATTEMPT_ID'); begin(recorder);
  throws(() => begin(recorder), 'ATTEMPT_ID');
  throws(() => recorder.beginOffline({ job_id: 'toy-job', repository_id: 'toy-unknown', method_config_id: 'toy-config', cache_regime: 'cold' }), 'OFFLINE_CONFIG_UNPLANNED');
});
test('transport ambiguity is preserved and simulated events are never actual remote calls', () => {
  const { recorder } = setup(); begin(recorder);
  throws(() => recorder.recordTransport({ attempt_id: 'toy-attempt-1', simulated_remote_calls: 0, provider_receipt_known: true }), 'TRANSPORT_DETAIL');
  recorder.recordTransport({ attempt_id: 'toy-attempt-1', simulated_remote_calls: 1, provider_receipt_known: null }); fail(recorder);
  const result = recorder.snapshot(); assert.equal(result.actual_remote_calls, 0); assert.equal(result.attempts[0].provider_receipt_known, null);
  assert.equal(result.operational_counts.simulated_remote_calls.known_sum, 1);
});
test('multiple spans of the same stage retain individual records without treating gaps as stage time', () => {
  const { recorder, clock } = setup(); begin(recorder); stage(recorder); clock.advance(2); endStage(recorder);
  clock.advance(5); stage(recorder, 'toy-stage-2'); clock.advance(3); endStage(recorder, 'toy-stage-2'); finish(recorder);
  const result = recorder.snapshot().attempts[0]; assert.equal(result.duration_ms, 10);
  assert.equal(result.stage_duration_sums_not_wall_time.retrieval.known_sum, 5); assert.equal(result.spans.length, 2);
});
test('core has no automatic clock, I/O, provider or scorer calls and source design remains unadopted', async () => {
  const core = await readFile(new URL('./telemetry.mjs', import.meta.url), 'utf8');
  assert.ok(!/from ['"]node:|\bfetch\s*\(|\bprocess\.|writeFile|child_process|performance\.now|Date\.now/.test(core));
  const design = JSON.parse(await readFile(new URL('../../docs/experiments/experiment-design.v0.1.draft.json', import.meta.url), 'utf8'));
  const originalTemplate = JSON.parse(await readFile(new URL('../../docs/experiments/measurement-template.v0.1.draft.json', import.meta.url), 'utf8'));
  assert.equal(design.applied, false); assert.ok(design.decision_ids_open.includes('E09'));
  assert.equal(originalTemplate.status, 'template_only_not_measured'); assert.equal(originalTemplate.impact_metrics, null);
  assert.equal(originalTemplate.measurements.online_ms.online_total_wall, null);
});
test('fractional monotonic durations are not rounded into zero or derived from coarse UTC strings', () => {
  const { recorder, clock } = setup(); begin(recorder); clock.advance(0.25); finish(recorder);
  const attempt = recorder.snapshot().attempts[0]; assert.equal(attempt.duration_ms, 0.25); assert.equal(attempt.started_at_utc, attempt.finished_at_utc);
});
test('free-tier or price assertions cannot be injected as measured cost', () => {
  const { recorder } = setup(); begin(recorder);
  throws(() => recorder.recordTransport({ attempt_id: 'toy-attempt-1', simulated_remote_calls: 1, provider_receipt_known: true, billing_tier: 'free' }), 'FIELDS');
  throws(() => usage(recorder, { input_tokens: 0, billed_amount: 0 }), 'USAGE_FIELD');
  assert.ok(Object.values(recorder.snapshot().attempts[0].cost).every(value => value === null));
});
