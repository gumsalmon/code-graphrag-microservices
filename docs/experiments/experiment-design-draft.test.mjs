// Draft document consistency checks only; not an experiment runner, metrics calculator or telemetry collector.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const json = async name => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
const design = await json('experiment-design.v0.1.draft.json');
const measurement = await json('measurement-template.v0.1.draft.json');
const contract = await json('../contracts/impact-output.v0.1.draft.json');
const methodIds = new Set(design.methods.map(method => method.id));

test('research plan remains draft/unapplied with no model/runtime/test/scoring authorization or results', () => {
  assert.equal(design.status, 'draft_for_team_discussion'); assert.equal(design.applied, false); assert.equal(design.results, null);
  assert.ok(Object.values(design.adoption_approvals).every(value => value === null));
  assert.equal(design.authorization.planning_only, true); assert.equal(design.authorization.new_model_calls_allowed, 0);
  for (const field of ['new_runtime_enabled', 'official_inference_enabled', 'test_locked', 'official_scoring_authorized']) assert.equal(design.authorization[field], false);
});
test('baseline IDs retain B0-B5 and do not falsely claim rule/lexical/full-method implementation', () => {
  assert.deepEqual([...methodIds], ['B0', 'B1', 'B2', 'B3', 'B4', 'B5']); assert.equal(methodIds.size, design.methods.length);
  assert.deepEqual(design.methods.filter(method => method.uses_llm).map(method => method.id), ['B3', 'B4', 'B5']);
  assert.ok(design.methods.every(method => !['implemented', 'accepted', 'officially_scored'].includes(method.current_readiness)));
  assert.match(design.methods.find(method => method.id === 'B2').current_readiness, /not_implemented/);
  assert.match(design.methods.find(method => method.id === 'B3').current_readiness, /not_implemented/);
});
test('B0 contract violation is not mixed into behavioral impact head-to-head comparisons', () => {
  const b0 = design.methods.find(method => method.id === 'B0'); assert.equal(b0.same_task_as_cia, false); assert.equal(b0.prediction_target, 'contract_violation');
  for (const rq of design.research_questions) for (const pair of rq.comparisons ?? []) {
    assert.ok(pair.every(id => methodIds.has(id))); assert.ok(!pair.includes('B0'));
  }
  assert.deepEqual(design.primary_endpoint_proposal.comparison, ['B5', 'B4']); assert.equal(design.primary_endpoint_proposal.status, 'not_adopted');
  assert.equal(design.primary_endpoint_proposal.direction_of_effect_assumed, false);
});
test('RQ and ablation references resolve without treating aliases as independent configurations', () => {
  assert.deepEqual(design.research_questions.map(rq => rq.id), ['RQ1', 'RQ2', 'RQ3', 'RQ4']);
  const ids = new Set(design.ablations.map(item => item.id)); assert.equal(ids.size, design.ablations.length);
  for (const rq of design.research_questions) for (const id of rq.ablation_ids ?? []) assert.ok(ids.has(id));
  for (const ablation of design.ablations) {
    assert.ok(methodIds.has(ablation.base));
    if (ablation.equivalent_baseline_if_config_identical) assert.ok(methodIds.has(ablation.equivalent_baseline_if_config_identical));
  }
  assert.equal(design.fairness.deduplicate_alias_methods_by_full_config_hash, true);
});
test('contract/topology representation ablations hold source/pool fixed and admit raw contract semantics remain', () => {
  for (const id of ['A-C', 'A-T']) {
    const ablation = design.ablations.find(item => item.id === id);
    assert.equal(ablation.fixed_candidate_pool, true); assert.equal(ablation.fixed_source_chunk_ids, true);
    assert.equal(ablation.raw_contract_source_still_available, true); assert.equal(ablation.contrast_kind, 'representation_mechanism');
  }
  assert.equal(design.ablations.find(item => item.id === 'A-C').contract_filter_may_change_pool, false);
  assert.equal(design.ablations.find(item => item.id === 'LLM-C').clean_single_factor_ablation_claimed, false);
});
test('depth 1/2/3 cannot silently shrink the gold universe or import graph context into the no-graph control', () => {
  const depth = design.ablations.find(item => item.id === 'H'); assert.deepEqual(depth.values_proposed, [1, 2, 3]);
  assert.equal(depth.gold_universe_changes_with_traversal_depth, false);
  assert.equal(design.ablations.find(item => item.id === 'A-G').graph_derived_leakage_into_control_allowed, false);
  assert.equal(design.fairness.graph_controls_may_read_graph_selected_hidden_context, false);
  assert.equal(design.fairness.same_bytes_proves_same_tokens, false); assert.equal(design.fairness.silent_truncation_allowed, false);
});
test('model/call/money/sample/statistics choices remain null and unknown measurements never become fake zeroes', () => {
  assert.ok(Object.values(design.parameters_pending).every(value => value === null));
  assert.equal(measurement.design_id, design.design_id); assert.equal(measurement.usable_for_scoring, false);
  assert.equal(measurement.status, 'template_only_not_measured'); assert.equal(measurement.execution.status, 'not_run');
  assert.equal(measurement.execution.validation_status, 'not_checked'); assert.equal(measurement.impact_metrics, null);
  function unmeasured(value) {
    if (value && typeof value === 'object') for (const nested of Object.values(value)) unmeasured(nested); else assert.equal(value, null);
  }
  unmeasured(measurement.measurements); unmeasured(measurement.run_identity); unmeasured(measurement.bindings); unmeasured(measurement.configuration); unmeasured(measurement.artifacts);
  unmeasured(measurement.evaluation_bindings_separate_from_model_input);
  assert.equal(design.telemetry.free_tier_implies_measured_zero_cost, false); assert.equal(design.telemetry.provider_usage_fields_may_overlap, true);
  assert.equal(design.telemetry.total_wall_time_assumed_sum_of_overlapping_stages, false);
});
test('draft output contract dependency does not silently adopt schema, projection or scorer adapter', () => {
  assert.equal(design.dependencies.output_contract_id, contract.contract_id); assert.equal(contract.applied, false);
  assert.equal(design.dependencies.output_contract_adopted, false); assert.equal(design.dependencies.scorer_adapter_implemented_for_draft, false);
  assert.equal(design.metric_policy.failed_partial_primary_quality_policy, null); assert.equal(design.metric_policy.protocol_base_unchanged, true);
});
test('P01/P02 remain development and no candidate P03/P04 or unseen test is opened by the plan', () => {
  const cases = design.data_and_split.current_cases, p01 = cases.find(item => item.id === 'P01'), p02 = cases.find(item => item.id === 'P02');
  assert.equal(p01.role, 'development'); assert.equal(p01.unseen_test_eligible_in_this_campaign, false);
  assert.equal(p02.same_duplicate_group_as, 'P01'); assert.equal(p02.unseen_test_eligible_in_this_campaign, false); assert.equal(p02.paired_runtime_complete, false);
  for (const id of ['P03', 'P04']) assert.equal(cases.find(item => item.id === id).opened_by_this_design, false);
  assert.deepEqual(design.data_and_split.held_out_campaign.scenario_ids, []); assert.equal(design.data_and_split.same_duplicate_group_may_cross_split, false);
  assert.equal(design.data_and_split.runtime_label_evidence_allowed_in_primary_model_context, false);
});
test('abstention/omission/failure and unsupported levels cannot be scored as negatives or hidden from coverage', () => {
  assert.equal(design.metric_policy.unknown_or_omitted_gold_positive_removed_from_recall_denominator, false);
  assert.equal(design.metric_policy.failed_run_becomes_successful_empty_prediction, false);
  assert.equal(design.metric_policy.all_planned_attempts_in_operational_denominator, true);
  assert.equal(design.metric_policy.success_only_quality_is_conditional_diagnostic, true);
  assert.equal(design.metric_policy.unjudged_universe_blocks_official_score, true);
  assert.equal(design.metric_policy.empty_gold_and_prediction_implies_perfect_f1, false);
  assert.equal(design.metric_policy.levels_scored_separately, true);
});
test('statistical design keeps scenario/cluster/repetition distinct and does not promise significance', () => {
  assert.equal(design.units.experimental, 'change_scenario'); assert.equal(design.units.entities_are_nested, true);
  assert.equal(design.units.repetitions_are_independent_scenarios, false); assert.equal(design.statistics.four_pilots_prove_generalization_or_significance, false);
  assert.equal(design.statistics.micro_f1_recomputed_from_counts_per_resample, true);
  assert.equal(design.statistics.mean_scenario_f1_may_replace_micro_f1_silently, false);
  assert.equal(design.statistics.best_of_repetitions_without_separate_method_registration, false);
  assert.equal(design.telemetry.runtime_http_repetitions_are_llm_repetitions, false);
});
test('only planning phase enabled, all ten discussion decisions still open in checklist', async () => {
  assert.deepEqual(design.rollout.filter(item => item.enabled_by_this_document).map(item => item.phase), ['T0']);
  assert.equal(design.rollout[0].model_calls_allowed, 0);
  assert.deepEqual(design.decision_ids_open, Array.from({ length: 10 }, (_value, index) => 'E' + String(index + 1).padStart(2, '0')));
  const checklist = await readFile(new URL('REVIEW_CHECKLIST.v0.1.DRAFT.md', import.meta.url), 'utf8');
  assert.ok(design.decision_ids_open.every(id => checklist.includes('| ' + id + ' |')));
});
