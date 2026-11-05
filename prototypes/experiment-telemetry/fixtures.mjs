import { createSyntheticTelemetry } from './telemetry.mjs';

export function syntheticClock() {
  let monotonic = 0, utcOffset = 0;
  return { monotonicMs: () => monotonic, utcNow: () => new Date(Date.UTC(2000, 0, 1) + monotonic + utcOffset).toISOString(),
    advance: value => { monotonic += value; }, shiftUtc: value => { utcOffset += value; } };
}
export function syntheticPlan() {
  return { synthetic_only: true, plan_id: 'toy-telemetry-plan', runs: [
    { run_id: 'toy-run-1', scenario_id: 'toy-scenario', duplicate_group_id: 'toy-group', repository_id: 'toy-repository',
      method_config_id: 'toy-vector-config', repetition: 1, cache_regime: 'cache_ready' },
    { run_id: 'toy-run-2', scenario_id: 'toy-scenario', duplicate_group_id: 'toy-group', repository_id: 'toy-repository',
      method_config_id: 'toy-graph-config', repetition: 1, cache_regime: 'cold' },
    { run_id: 'toy-run-3', scenario_id: 'toy-scenario', duplicate_group_id: 'toy-group', repository_id: 'toy-repository',
      method_config_id: 'toy-vector-config', repetition: 2, cache_regime: 'cache_ready' },
  ] };
}
export function telemetryDemo(kind = 'retry') {
  if (!['retry', 'overlap', 'missing'].includes(kind)) throw new Error('Unknown toy demo.');
  const clock = syntheticClock(), recorder = createSyntheticTelemetry(syntheticPlan(), { clock });
  if (kind === 'missing') return recorder.snapshot();
  recorder.beginOffline({ job_id: 'toy-index', repository_id: 'toy-repository', method_config_id: 'toy-graph-config', cache_regime: 'cold' });
  recorder.beginStage({ scope: 'offline', owner_id: 'toy-index', span_id: 'toy-index-span', stage: 'graph_import_index' });
  clock.advance(25); recorder.finishStage({ span_id: 'toy-index-span', status: 'completed', error_code: null });
  recorder.finishOffline({ job_id: 'toy-index', status: 'completed', error: null });
  recorder.beginAttempt({ attempt_id: 'toy-attempt-1', run_id: 'toy-run-1', retry_of: null });
  recorder.beginStage({ scope: 'online', owner_id: 'toy-attempt-1', span_id: 'toy-retrieve', stage: 'retrieval' });
  if (kind === 'overlap') {
    clock.advance(2); recorder.beginStage({ scope: 'online', owner_id: 'toy-attempt-1', span_id: 'toy-traverse', stage: 'traversal' });
    clock.advance(6); recorder.finishStage({ span_id: 'toy-retrieve', status: 'completed', error_code: null });
    clock.advance(2); recorder.finishStage({ span_id: 'toy-traverse', status: 'completed', error_code: null });
    recorder.finishAttempt({ attempt_id: 'toy-attempt-1', status: 'completed', validation_status: 'not_checked', error: null });
    return recorder.snapshot();
  }
  clock.advance(5); recorder.finishStage({ span_id: 'toy-retrieve', status: 'completed', error_code: null });
  recorder.recordTransport({ attempt_id: 'toy-attempt-1', simulated_remote_calls: 1, provider_receipt_known: null });
  clock.advance(10); recorder.finishAttempt({ attempt_id: 'toy-attempt-1', status: 'failed', validation_status: 'not_checked',
    error: { stage: 'transport', code: 'SYNTHETIC_TIMEOUT' } });
  recorder.beginAttempt({ attempt_id: 'toy-attempt-2', run_id: 'toy-run-1', retry_of: 'toy-attempt-1' });
  recorder.recordTransport({ attempt_id: 'toy-attempt-2', simulated_remote_calls: 1, provider_receipt_known: true });
  recorder.recordUsage({ attempt_id: 'toy-attempt-2', mapping_version: 'toy-usage/1',
    native_usage: { input_tokens: 100, output_tokens: 30, thinking_tokens: 20, cached_input_tokens: 40, reported_total_tokens: 130 } });
  recorder.recordContext({ attempt_id: 'toy-attempt-2', input_bytes: 900, estimated_input_tokens: null, estimator_id: null });
  clock.advance(12); recorder.finishAttempt({ attempt_id: 'toy-attempt-2', status: 'completed', validation_status: 'valid', error: null });
  return recorder.snapshot();
}
