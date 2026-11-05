// Fixed synthetic responses exercise plumbing, never model reasoning or project labels.
import { selectSyntheticContext } from './selector.mjs';
import { selectionFixture, selectionOptions } from './fixtures.mjs';
import { validateSyntheticAttempt, CONTRACT_ID } from '../impact-output-validator/validator.mjs';
import { createSyntheticTelemetry } from '../experiment-telemetry/telemetry.mjs';
import { syntheticClock } from '../experiment-telemetry/fixtures.mjs';

function requestFor(input, selection) {
  const prefix = input.repository_id + '@' + input.snapshot_id + '::';
  const registry = input.methods.map(method => ({ level: 'method', entity_id: method.id, service: method.service,
    seed: method.id === input.seed_method_id, in_universe: method.id !== input.seed_method_id }));
  // Explicit toy API/Service registry; no projection of Method predictions.
  for (const method of input.methods.filter(row => /#(read|get|handle)\(/.test(row.id))) {
    const seed = method.id === input.seed_method_id;
    registry.push({ level: 'api', entity_id: prefix + method.service + '::GET /toy-items/{id}',
      handler_id: method.id, service: method.service, seed, in_universe: !seed });
  }
  for (const service of [...new Set(input.methods.map(row => row.service))]) {
    const seed = input.methods.find(row => row.id === input.seed_method_id).service === service;
    registry.push({ level: 'service', entity_id: prefix + service, service, seed, in_universe: !seed });
  }
  return { synthetic_only: true, contract_id: CONTRACT_ID, repository_id: input.repository_id, snapshot_id: input.snapshot_id,
    seed_method_id: input.seed_method_id, requested_levels: ['method', 'api', 'service'], supported_levels: ['method', 'api', 'service'],
    registry, aliases: [], repair_strategy_ids: [],
    evidence: selection.selected_documents.map(doc => ({ id: doc.evidence_id, snapshot_id: input.snapshot_id, text: doc.text })),
    path_validation: selection.graph_inspected ? { kind: 'supplied_graph', logical_edges: input.edges
      .filter(edge => edge.resolution_status === 'RESOLVED' && ['CALLS', 'INVOKES_API'].includes(edge.type))
      .map(({ caller, callee, type }) => ({ caller, callee, type })) } : { kind: 'source_inferred', logical_edges: [] } };
}
function fixedAttempt(request, responseCase) {
  if (responseCase === 'failure') return { synthetic_only: true,
    execution: { status: 'failed', actual_remote_calls: 0, usage: null, failure: { stage: 'provider', code: 'SYNTHETIC_UNAVAILABLE',
      http_status: 503, message: 'Fabricated failure; no remote request.' } }, payload: null };
  const citation = { evidence_id: request.evidence[0].id, quote: request.evidence[0].text };
  if (responseCase === 'invented-quote') citation.quote = 'fabricated text absent from source';
  if (responseCase === 'outside-context') { citation.evidence_id = 'TOY-FORMAT'; citation.quote = 'return Integer.toString(id);'; }
  const assessments = request.registry.filter(row => row.in_universe).map(row => ({ level: row.level, entity_id: row.entity_id,
    dependency_status: 'unknown', dependency_path: [], logical_hops: null, service_boundary_crossings: null,
    behavioral_impact: 'unknown', requires_code_change: 'unknown', repair_strategy_id: null, assumptions: [],
    rationale: 'Fixed format fixture; no inference about behavior or repair.', citations: [] }));
  if (responseCase === 'omitted') assessments.pop();
  return { synthetic_only: true, execution: { status: 'completed', actual_remote_calls: 0, usage: null, failure: null },
    payload: { summary: { text: 'Synthetic plumbing demonstration with fixed abstentions.', citations: [citation] },
      assessments, uncertainties: ['No model, behavioral inference, project performance measurement or benchmark scoring.'] } };
}

export function syntheticIntegration({ mode = 'combined', responseCase = 'unknown', contextByteLimit = 8192 } = {}) {
  if (!['unknown', 'failure', 'invented-quote', 'outside-context', 'omitted'].includes(responseCase)) throw new Error('FIXTURE_CASE');
  const input = selectionFixture(), options = { ...selectionOptions(mode), context_byte_limit: contextByteLimit };
  const clock = syntheticClock();
  const telemetry = createSyntheticTelemetry({ synthetic_only: true, plan_id: 'toy-context-plan', runs: [{
    run_id: 'toy-context-run', scenario_id: 'toy-context-scenario', duplicate_group_id: 'toy-context-group',
    repository_id: input.repository_id, method_config_id: 'toy-context-' + mode, repetition: 1, cache_regime: 'unknown' }] }, { clock });
  const selection = selectSyntheticContext(input, options);
  const report = { document_kind: 'synthetic_integration_not_project_output', synthetic_only: true, adopted_for_real_runs: false,
    response_origin: 'fixed_fixture_not_llm', selection, request: null, attempt: null, validation: null, telemetry: null,
    actual_remote_calls: 0, impact_metrics: null, ground_truth_accepted: false, official_scoring_authorized: false };
  if (selection.status !== 'context_ready') return { ...report, status: 'blocked_before_attempt', telemetry: telemetry.snapshot() };
  const request = requestFor(input, selection), attempt = fixedAttempt(request, responseCase);
  telemetry.beginAttempt({ attempt_id: 'toy-context-attempt', run_id: 'toy-context-run', retry_of: null });
  telemetry.recordContext({ attempt_id: 'toy-context-attempt', input_bytes: selection.context_bytes, estimated_input_tokens: null, estimator_id: null });
  telemetry.recordTransport({ attempt_id: 'toy-context-attempt', simulated_remote_calls: 0, provider_receipt_known: false });
  telemetry.beginStage({ scope: 'online', owner_id: 'toy-context-attempt', span_id: 'toy-validation', stage: 'validation_and_normalization' });
  const validation = validateSyntheticAttempt(request, attempt);
  // Clock remains fixed: these durations are fixture values, not timings of the code above.
  telemetry.finishStage({ span_id: 'toy-validation', status: 'completed', error_code: null });
  telemetry.finishAttempt({ attempt_id: 'toy-context-attempt', status: attempt.execution.status,
    validation_status: validation.validation_status,
    error: attempt.execution.status === 'failed' ? { stage: 'provider', code: 'SYNTHETIC_UNAVAILABLE' } : null });
  return { ...report, status: 'fixture_checked', request, attempt, validation, telemetry: telemetry.snapshot() };
}
