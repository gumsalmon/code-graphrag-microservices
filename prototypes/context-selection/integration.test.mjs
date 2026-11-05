import test from 'node:test';
import assert from 'node:assert/strict';
import { syntheticIntegration } from './integration.mjs';

test('all routes connect selected evidence, three-level registry, validator and telemetry', () => {
  for (const mode of ['lexical', 'graph', 'combined']) {
    const r = syntheticIntegration({ mode });
    assert.equal(r.validation.input_status, 'valid', JSON.stringify(r.validation.issues));
    assert.equal(r.validation.validation_status, 'valid', JSON.stringify(r.validation.issues));
    assert.deepEqual(r.request.evidence.map(e => e.id), r.selection.selected_documents.map(d => d.evidence_id));
    assert.deepEqual(Object.keys(r.validation.coverage).sort(), ['api', 'method', 'service']);
    for (const level of Object.values(r.validation.coverage)) {
      assert.ok(level.eligible > 0);
      assert.equal(level.behavioral_unknown, level.eligible);
      assert.ok(level.entities.every(row => row.status === 'unknown'));
    }
    assert.ok(r.attempt.payload.assessments.every(row => row.dependency_status === 'unknown' && row.requires_code_change === 'unknown'));
    assert.equal(r.telemetry.attempts[0].context.input_bytes, r.selection.context_bytes);
    assert.equal(r.telemetry.actual_remote_calls, 0);
    assert.equal(r.telemetry.attempts[0].usage.input_tokens, null);
    assert.equal(r.telemetry.measurement_origin, 'injected_synthetic_clock_and_toy_usage_not_project_performance');
    assert.equal(r.impact_metrics, null);
    assert.equal(r.ground_truth_accepted, false);
    assert.equal(r.adopted_for_real_runs, false);
  }
});
test('lexical control receives no graph witnesses or graph validation edges', () => {
  const r = syntheticIntegration({ mode: 'lexical' });
  assert.equal(r.selection.graph_inspected, false);
  assert.deepEqual(r.selection.dependency_witnesses, []);
  assert.deepEqual(r.request.path_validation, { kind: 'source_inferred', logical_edges: [] });
});
test('provider failure is retained separately from predictions and unknown assessments', () => {
  const r = syntheticIntegration({ responseCase: 'failure' });
  assert.equal(r.attempt.payload, null);
  assert.equal(r.validation.execution_status, 'failed');
  assert.equal(r.validation.validation_status, 'not_checked');
  assert.equal(r.validation.coverage.method.state, 'execution_failed');
  assert.equal(r.validation.coverage.method.behavioral_unknown, null);
  assert.equal(r.telemetry.operational_counts.failed_attempts, 1);
  assert.equal(r.telemetry.operational_counts.planned_runs_with_valid_attempt, 0);
});
test('invented quote and citation to a non-selected source are rejected', () => {
  for (const responseCase of ['invented-quote', 'outside-context']) {
    const r = syntheticIntegration({ responseCase });
    assert.equal(r.validation.validation_status, 'invalid');
    assert.ok(r.validation.issues.length > 0);
    assert.equal(r.telemetry.attempts[0].status, 'completed');
    assert.equal(r.telemetry.attempts[0].validation_status, 'invalid');
    assert.equal(r.telemetry.operational_counts.planned_runs_with_valid_attempt, 0);
  }
});
test('omitted assessment stays not_returned, not negative or silent abstention', () => {
  const r = syntheticIntegration({ responseCase: 'omitted' });
  assert.equal(r.validation.validation_status, 'valid');
  const entities = Object.values(r.validation.coverage).flatMap(level => level.entities);
  assert.equal(entities.filter(row => row.status === 'not_returned').length, 1);
  assert.ok(entities.every(row => ['unknown', 'not_returned'].includes(row.status)));
});
test('mandatory context overflow blocks before an attempt, with no fabricated response', () => {
  const r = syntheticIntegration({ contextByteLimit: 1 });
  assert.equal(r.status, 'blocked_before_attempt');
  assert.equal(r.attempt, null); assert.equal(r.validation, null);
  assert.equal(r.telemetry.operational_counts.registered_attempts, 0);
  assert.equal(r.telemetry.operational_counts.planned_runs_without_attempt, 1);
});
test('unsupported demo options never silently select another route or fixture', () => {
  assert.throws(() => syntheticIntegration({ mode: 'vector' }));
  assert.throws(() => syntheticIntegration({ responseCase: 'perfect-results' }));
});
