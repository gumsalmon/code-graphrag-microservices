import test from 'node:test';
import assert from 'node:assert/strict';
import { validateScopeState } from './verify_p03_scope_packet.mjs';
const candidate = 'c52f085be74406e542de93db7f6d70b2fc3fe60f215ae47bd45df5b1cc5cec92';
const state = { schema: 'p03-scope-check-packet-state/1', candidate_selected_by_huy: true, baseline_groups_completed: 2,
  candidate_manifest_sha256: candidate, independent_scope_confirmation_received: false, input_locked: false,
  mutated_build_performed: false, mutated_runtime_executed: false, labels_created: false, ground_truth_accepted: false,
  final_test_locked: false, official_scoring_authorized: false, evaluated_system_outputs_included: false,
  model_calls_authorized: false, github_push_authorized: false };
const decision = { decision_id: 'D18', decision_maker: 'Huy', candidate_selected: true, candidate_manifest_sha256: candidate, mutated_runtime_authorized: false };
const omissions = ['config-server', 'discovery-server', 'customers-service', 'visits-service', 'api-gateway']
  .map(service => ({ path: 'baseline-build/artifacts/' + service + '.jar' }))
  .concat([{ path: 'baseline-build/source.tar' }, { path: 'baseline-build/config.tar' }]);
test('scope packet preserves actual selection and baseline but no human confirmation or lock', () => {
  assert.equal(validateScopeState(state, decision, omissions), true);
});
test('AI confirmation, accepted, mutated rights and scoring cannot be smuggled into state', () => {
  for (const flag of ['independent_scope_confirmation_received', 'input_locked', 'mutated_runtime_executed', 'ground_truth_accepted', 'official_scoring_authorized'])
    assert.throws(() => validateScopeState({ ...state, [flag]: true }, decision, omissions));
});
test('different candidate, annotator impersonation or incomplete baseline is rejected', () => {
  assert.throws(() => validateScopeState({ ...state, baseline_groups_completed: 1 }, decision, omissions));
  assert.throws(() => validateScopeState(state, { ...decision, decision_maker: 'AI' }, omissions));
  assert.throws(() => validateScopeState({ ...state, candidate_manifest_sha256: '0'.repeat(64) }, decision, omissions));
});
test('raw evidence cannot disappear under broad or additional omissions', () => {
  assert.throws(() => validateScopeState(state, decision, [...omissions, { path: 'baseline/groups/' }]));
  assert.throws(() => validateScopeState(state, decision, omissions.slice(1)));
});
