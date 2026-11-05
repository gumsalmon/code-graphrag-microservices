// Synthetic-only, injected-clock recorder. No I/O, provider, validator, or scorer bridge.
import template from '../../docs/experiments/measurement-template.v0.1.draft.json' with { type: 'json' };

export const TELEMETRY_ID = 'experiment-telemetry/synthetic-prototype.1';
export const DESIGN_ID = template.design_id;
const STAGES = {
  offline: Object.keys(template.measurements.offline_ms).filter(name => name !== 'offline_total_wall'),
  online: Object.keys(template.measurements.online_ms).filter(name => name !== 'online_total_wall'),
};
const TOKEN_FIELDS = ['input_tokens', 'output_tokens', 'thinking_tokens', 'cached_input_tokens', 'reported_total_tokens'];
const ERROR_CODES = ['SYNTHETIC_TIMEOUT', 'SYNTHETIC_UNAVAILABLE', 'SYNTHETIC_INPUT_ERROR', 'SYNTHETIC_TOOL_ERROR', 'SYNTHETIC_VALIDATION_ERROR'];
const ERROR_STAGES = [...STAGES.offline, ...STAGES.online, 'transport', 'provider', 'timeout', 'tool', 'preparation'];
const CACHE = ['cold', 'warm', 'cache_ready', 'unknown'];
const clone = value => structuredClone(value);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const toyId = value => typeof value === 'string' && /^toy-[A-Za-z0-9._-]{1,100}$/.test(value);
const count = value => value === null || (Number.isSafeInteger(value) && value >= 0);
const nonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export class TelemetryError extends Error {
  constructor(code) { super(`Synthetic telemetry rejected operation: ${code}`); this.code = code; }
}
function ensure(condition, code) { if (!condition) throw new TelemetryError(code); }
function fields(value, names) {
  ensure(isObject(value) && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name)), 'FIELDS');
}
function safeError(value) {
  fields(value, ['stage', 'code']);
  ensure(ERROR_STAGES.includes(value.stage) && ERROR_CODES.includes(value.code), 'ERROR_VOCABULARY');
  return clone(value);
}
function emptyUsage() {
  return { native_usage_payload: null, usage_mapping_version: null, ...Object.fromEntries(TOKEN_FIELDS.map(name => [name, null])) };
}
function elapsed(start, finish) {
  const value = finish - start;
  ensure(nonnegative(value), 'DURATION');
  return value;
}
function numberSummary(values) {
  const observed = values.filter(value => value !== null), sum = observed.reduce((total, value) => total + value, 0);
  const overflow = observed.length > 0 && (!Number.isFinite(sum) || sum > Number.MAX_SAFE_INTEGER);
  return { observed: observed.length, missing: values.length - observed.length,
    known_sum: observed.length && !overflow ? sum : null,
    sum_for_all_recorded: values.length && observed.length === values.length && !overflow ? sum : null, overflow };
}

export function createSyntheticTelemetry(plan, { clock } = {}) {
  fields(plan, ['synthetic_only', 'plan_id', 'runs']);
  ensure(plan.synthetic_only === true && toyId(plan.plan_id), 'SYNTHETIC_ONLY');
  ensure(Array.isArray(plan.runs) && plan.runs.length > 0 && plan.runs.length <= 1000, 'PLAN_SIZE');
  ensure(clock && typeof clock.monotonicMs === 'function' && typeof clock.utcNow === 'function', 'INJECTED_CLOCK_REQUIRED');
  const runs = new Map(), combinations = new Set(), scenarioGroups = new Map();
  for (const row of plan.runs) {
    fields(row, ['run_id', 'scenario_id', 'duplicate_group_id', 'repository_id', 'method_config_id', 'repetition', 'cache_regime']);
    for (const name of ['run_id', 'scenario_id', 'duplicate_group_id', 'repository_id', 'method_config_id']) ensure(toyId(row[name]), 'TOY_ID');
    ensure(Number.isSafeInteger(row.repetition) && row.repetition >= 1 && CACHE.includes(row.cache_regime), 'RUN_CONFIG');
    const combination = JSON.stringify([row.repository_id, row.scenario_id, row.method_config_id, row.repetition]);
    ensure(!runs.has(row.run_id) && !combinations.has(combination), 'DUPLICATE_PLANNED_RUN');
    const scenario = JSON.stringify([row.repository_id, row.scenario_id]);
    ensure(!scenarioGroups.has(scenario) || scenarioGroups.get(scenario) === row.duplicate_group_id, 'SCENARIO_GROUP_MISMATCH');
    scenarioGroups.set(scenario, row.duplicate_group_id);
    combinations.add(combination); runs.set(row.run_id, { ...clone(row), attempt_ids: [] });
  }
  const planId = plan.plan_id, attempts = new Map(), offline = new Map(), spans = new Map(), contextsRecorded = new Set();
  let lastMonotonic = null;
  function sample() {
    const mono = clock.monotonicMs(), utc = clock.utcNow();
    ensure(nonnegative(mono) && (lastMonotonic === null || mono >= lastMonotonic), 'MONOTONIC_CLOCK');
    ensure(typeof utc === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(utc) &&
      Number.isFinite(Date.parse(utc)) && new Date(utc).toISOString() === utc, 'UTC_CLOCK');
    lastMonotonic = mono;
    return { mono, utc };
  }
  function owner(scope, id) {
    ensure(['offline', 'online'].includes(scope), 'SCOPE');
    const result = (scope === 'offline' ? offline : attempts).get(id);
    ensure(result && result.status === 'in_flight', 'OWNER_NOT_ACTIVE');
    return result;
  }
  function finishOwner(result, time, status) {
    result.status = status; result.finished_at_utc = time.utc;
    result.finish_monotonic_ms = time.mono; result.duration_ms = elapsed(result.start_monotonic_ms, time.mono);
    for (const spanId of result.span_ids) {
      const span = spans.get(spanId);
      if (span.status === 'in_flight') {
        span.status = 'interrupted'; span.finished_at_utc = time.utc; span.finish_monotonic_ms = time.mono;
        span.duration_ms = elapsed(span.start_monotonic_ms, time.mono);
      }
    }
  }
  function publicOwner(result, scope) {
    const ownSpans = result.span_ids.map(id => clone(spans.get(id)));
    const stageTotals = {};
    for (const stage of STAGES[scope]) stageTotals[stage] = numberSummary(ownSpans.filter(span => span.stage === stage).map(span => span.duration_ms));
    return { ...clone(result), spans: ownSpans, stage_duration_sums_not_wall_time: stageTotals };
  }
  function beginAttempt(input) {
    fields(input, ['attempt_id', 'run_id', 'retry_of']);
    ensure(toyId(input.attempt_id) && !attempts.has(input.attempt_id), 'ATTEMPT_ID');
    const run = runs.get(input.run_id); ensure(run, 'UNPLANNED_RUN');
    const previous = run.attempt_ids.length ? attempts.get(run.attempt_ids.at(-1)) : null;
    ensure(previous ? previous.status === 'failed' && input.retry_of === previous.attempt_id : input.retry_of === null, 'RETRY_CHAIN');
    const time = sample();
    const record = { attempt_id: input.attempt_id, run_id: input.run_id, retry_of: input.retry_of,
      status: 'in_flight', validation_status: 'not_checked', error: null, provider_receipt_known: null,
      simulated_remote_calls: null, started_at_utc: time.utc, finished_at_utc: null,
      start_monotonic_ms: time.mono, finish_monotonic_ms: null, duration_ms: null, span_ids: [],
      usage: emptyUsage(), context: { input_bytes: null, estimated_input_tokens: null, estimator_id: null },
      cost: clone(template.measurements.cost), resources: clone(template.measurements.resources) };
    attempts.set(record.attempt_id, record); run.attempt_ids.push(record.attempt_id);
    return clone(record);
  }
  function beginOffline(input) {
    fields(input, ['job_id', 'repository_id', 'method_config_id', 'cache_regime']);
    ensure(toyId(input.job_id) && !offline.has(input.job_id), 'OFFLINE_JOB_ID');
    ensure(toyId(input.repository_id) && toyId(input.method_config_id) && CACHE.includes(input.cache_regime), 'OFFLINE_CONFIG');
    ensure([...runs.values()].some(run => run.repository_id === input.repository_id && run.method_config_id === input.method_config_id), 'OFFLINE_CONFIG_UNPLANNED');
    const time = sample();
    const record = { ...clone(input), status: 'in_flight', error: null, started_at_utc: time.utc, finished_at_utc: null,
      start_monotonic_ms: time.mono, finish_monotonic_ms: null, duration_ms: null, span_ids: [] };
    offline.set(input.job_id, record); return clone(record);
  }
  function beginStage(input) {
    fields(input, ['scope', 'owner_id', 'span_id', 'stage']);
    const result = owner(input.scope, input.owner_id);
    ensure(toyId(input.span_id) && !spans.has(input.span_id) && STAGES[input.scope].includes(input.stage), 'STAGE_ID');
    const time = sample(), span = { ...clone(input), status: 'in_flight', error_code: null,
      started_at_utc: time.utc, finished_at_utc: null, start_monotonic_ms: time.mono, finish_monotonic_ms: null, duration_ms: null };
    spans.set(input.span_id, span); result.span_ids.push(input.span_id); return clone(span);
  }
  function finishStage(input) {
    fields(input, ['span_id', 'status', 'error_code']);
    const span = spans.get(input.span_id); ensure(span && span.status === 'in_flight', 'SPAN_NOT_ACTIVE');
    owner(span.scope, span.owner_id);
    ensure(['completed', 'failed'].includes(input.status), 'STAGE_STATUS');
    ensure(input.status === 'failed' ? ERROR_CODES.includes(input.error_code) : input.error_code === null, 'STAGE_ERROR');
    const time = sample();
    Object.assign(span, { status: input.status, error_code: input.error_code, finished_at_utc: time.utc,
      finish_monotonic_ms: time.mono, duration_ms: elapsed(span.start_monotonic_ms, time.mono) });
    return clone(span);
  }
  function recordTransport(input) {
    fields(input, ['attempt_id', 'simulated_remote_calls', 'provider_receipt_known']);
    const result = owner('online', input.attempt_id);
    ensure(result.simulated_remote_calls === null, 'TRANSPORT_ALREADY_RECORDED');
    ensure([0, 1].includes(input.simulated_remote_calls) && [true, false, null].includes(input.provider_receipt_known) &&
      !(input.simulated_remote_calls === 0 && input.provider_receipt_known === true), 'TRANSPORT_DETAIL');
    result.simulated_remote_calls = input.simulated_remote_calls; result.provider_receipt_known = input.provider_receipt_known;
  }
  function recordUsage(input) {
    fields(input, ['attempt_id', 'mapping_version', 'native_usage']);
    const result = owner('online', input.attempt_id);
    ensure(result.usage.native_usage_payload === null, 'USAGE_ALREADY_RECORDED');
    ensure(input.mapping_version === 'toy-usage/1' && isObject(input.native_usage), 'USAGE_MAPPING');
    ensure(Object.keys(input.native_usage).length > 0 && Object.keys(input.native_usage).every(name => TOKEN_FIELDS.includes(name)) &&
      Object.values(input.native_usage).every(count), 'USAGE_FIELD');
    result.usage = { native_usage_payload: clone(input.native_usage), usage_mapping_version: input.mapping_version,
      ...Object.fromEntries(TOKEN_FIELDS.map(name => [name, input.native_usage[name] ?? null])) };
  }
  function recordContext(input) {
    fields(input, ['attempt_id', 'input_bytes', 'estimated_input_tokens', 'estimator_id']);
    const result = owner('online', input.attempt_id); ensure(!contextsRecorded.has(input.attempt_id), 'CONTEXT_ALREADY_RECORDED');
    ensure(count(input.input_bytes) && count(input.estimated_input_tokens) &&
      (input.estimated_input_tokens === null ? input.estimator_id === null : toyId(input.estimator_id)), 'CONTEXT_DETAIL');
    result.context = { input_bytes: input.input_bytes, estimated_input_tokens: input.estimated_input_tokens, estimator_id: input.estimator_id };
    contextsRecorded.add(input.attempt_id);
  }
  function finishAttempt(input) {
    fields(input, ['attempt_id', 'status', 'validation_status', 'error']);
    const result = owner('online', input.attempt_id);
    ensure(['completed', 'failed'].includes(input.status), 'ATTEMPT_STATUS');
    ensure(['not_checked', 'valid', 'partial', 'invalid'].includes(input.validation_status), 'VALIDATION_STATUS');
    ensure(input.status === 'failed' ? input.validation_status === 'not_checked' : input.error === null, 'EXECUTION_VALIDATION');
    const error = input.status === 'failed' ? safeError(input.error) : null;
    ensure(input.status === 'failed' || !result.span_ids.some(id => spans.get(id).status === 'in_flight'), 'OPEN_STAGE');
    const time = sample(); finishOwner(result, time, input.status); result.validation_status = input.validation_status; result.error = error;
    return publicOwner(result, 'online');
  }
  function finishOffline(input) {
    fields(input, ['job_id', 'status', 'error']); const result = owner('offline', input.job_id);
    ensure(['completed', 'failed'].includes(input.status), 'OFFLINE_STATUS');
    const error = input.status === 'failed' ? safeError(input.error) : null;
    ensure(input.status === 'failed' || input.error === null, 'OFFLINE_ERROR');
    ensure(input.status === 'failed' || !result.span_ids.some(id => spans.get(id).status === 'in_flight'), 'OPEN_STAGE');
    const time = sample(); finishOwner(result, time, input.status); result.error = error; return publicOwner(result, 'offline');
  }
  function snapshot() {
    const all = [...attempts.values()], rows = [...runs.values()];
    const statuses = status => all.filter(attempt => attempt.status === status).length;
    const any = predicate => rows.filter(run => run.attempt_ids.some(id => predicate(attempts.get(id)))).length;
    return {
      document_kind: 'synthetic_telemetry_fixture_not_project_measurements', telemetry_id: TELEMETRY_ID, design_id: DESIGN_ID,
      synthetic_only: true, measurement_origin: 'injected_synthetic_clock_and_toy_usage_not_project_performance',
      plan_id: planId, production_ready: false, applied_to_runtime: false, actual_remote_calls: 0,
      semantic_correctness_verified: false, ground_truth_accepted: false, official_scoring_authorized: false,
      impact_metrics: null, cost_estimation_implemented: false, quality_winner: null,
      pending_decisions: ['E06', 'E07', 'E08', 'E09', 'E10'],
      planned_runs: clone(rows), attempts: all.map(result => publicOwner(result, 'online')),
      offline_jobs: [...offline.values()].map(result => publicOwner(result, 'offline')),
      operational_counts: {
        planned_runs: rows.length, distinct_scenarios: new Set(rows.map(row => row.scenario_id)).size,
        distinct_duplicate_groups: new Set(rows.map(row => JSON.stringify([row.repository_id, row.duplicate_group_id]))).size,
        distinct_repositories: new Set(rows.map(row => row.repository_id)).size,
        repetitions_are_independent_scenarios: false, registered_attempts: all.length,
        completed_attempts: statuses('completed'), failed_attempts: statuses('failed'), in_flight_attempts: statuses('in_flight'),
        planned_runs_without_attempt: rows.filter(run => run.attempt_ids.length === 0).length,
        planned_runs_with_completed_attempt: any(attempt => attempt.status === 'completed'),
        planned_runs_with_valid_attempt: any(attempt => attempt.status === 'completed' && attempt.validation_status === 'valid'),
        retry_attempts: all.filter(attempt => attempt.retry_of !== null).length,
        simulated_remote_calls: numberSummary(all.map(attempt => attempt.simulated_remote_calls)),
      },
      duration_totals_for_recorded_owners_only: {
        online: numberSummary(all.map(attempt => attempt.duration_ms)),
        offline: numberSummary([...offline.values()].map(job => job.duration_ms)),
        sum_of_attempts_is_campaign_wall_time: false, sum_of_stages_is_owner_wall_time: false,
      },
      usage_totals_by_category_not_sum_of_categories: Object.fromEntries(TOKEN_FIELDS.map(name => [name, numberSummary(all.map(attempt => attempt.usage[name]))])),
      campaign_usage_total: null, campaign_cost: clone(template.measurements.cost),
      evaluation_bindings_separate_from_model_input: clone(template.evaluation_bindings_separate_from_model_input),
    };
  }
  return Object.freeze({ beginAttempt, finishAttempt, beginOffline, finishOffline, beginStage, finishStage, recordTransport, recordUsage, recordContext, snapshot });
}
