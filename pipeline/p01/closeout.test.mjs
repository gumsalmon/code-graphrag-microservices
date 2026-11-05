import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { closureStatus, validatePreparationRegister, auditCloseout } from '../../scripts/audit_p01_closeout.mjs';

const plan = JSON.parse(await readFile(new URL('../../tasks/P02_P04_RESEARCH_REGISTER.json', import.meta.url), 'utf8'));
test('P02 can be selected for preparation without fabricating runtime, human review or test lock', () => {
  const result = validatePreparationRegister(plan);
  assert.deepEqual(result.proposed_scenarios, ['P03', 'P04']);
  assert.deepEqual(result.selected_for_preparation, ['P02']);
  assert.equal(result.official_scoring, false);
});
test('legacy unselected preparation registers retain their original interpretation', () => {
  const legacy = structuredClone(plan);
  legacy.schema = 'p02-p04-preparation-register/1'; legacy.status = 'preparation_authorized_candidates_not_selected';
  Object.assign(legacy.candidates[0], { selection_decision: 'proposed_primary', patch_sha256: null, selected_at: null, runtime_status: 'not_started', baseline_feasibility_verified_for_p02: false });
  const result = validatePreparationRegister(legacy);
  assert.deepEqual(result.proposed_scenarios, ['P02', 'P03', 'P04']);
  assert.deepEqual(result.selected_for_preparation, []);
});
test('preparation register v2 does not retroactively claim baseline has run', () => {
  const old = structuredClone(plan); old.schema = 'p02-p04-preparation-register/2'; old.status = 'p02_selected_inputs_prepared_independent_confirmation_pending';
  Object.assign(old.candidates[0], { runtime_status: 'not_started', baseline_feasibility_verified_for_p02: false });
  delete old.candidates[0].baseline_evidence;
  assert.deepEqual(validatePreparationRegister(old).selected_for_preparation, ['P02']);
});
test('no paired response cannot become full P01 completion', () => {
  const result = closureStatus({ both_structurally_valid: false });
  assert.equal(result.paired_inference_complete, false);
  assert.equal(result.full_research_complete, false);
  assert.ok(result.open_items.includes('paired_inference_not_complete'));
});
test('two valid predictions still do not approve ground truth, final test or research completion', () => {
  const result = closureStatus({ both_structurally_valid: true });
  assert.equal(result.paired_inference_complete, true);
  assert.equal(result.ground_truth_accepted_by_this_audit, false);
  assert.equal(result.official_scoring_authorized, false);
  assert.equal(result.full_research_complete, false);
});
test('changing metadata cannot silently claim scoring, reviewer acceptance or held-out test', () => {
  for (const alter of [p => { p.gates.official_scoring_authorized = true; }, p => { p.gates.final_test_locked = true; },
    p => { p.roles.independent_reviewer = 'Invented reviewer'; }, p => { p.batch_review.accepted_scenarios = ['P02']; },
    p => { p.candidates[0].split_intent = 'test'; }, p => { p.candidates[0].runtime_status = 'passed'; },
    p => { p.candidates[0].label_sha256 = 'a'.repeat(64); }, p => { p.candidates[0].related_scenarios = []; },
    p => { p.candidates[0].independent_inventory_confirmation_received = true; }, p => { p.candidates[0].baseline_evidence.mutated_executed = true; },
    p => { p.candidates[0].baseline_evidence.full_matrix_executed = true; }, p => { p.candidates[0].baseline_evidence.result_sha256 = null; },
    p => { p.candidates[0].patch_sha256 = null; }]) {
      const changed = structuredClone(plan); alter(changed); assert.throws(() => validatePreparationRegister(changed));
    }
});
test('unversioned source, repeated candidate ID and missing planned case fail preparation guards', () => {
  for (const alter of [p => { p.candidates[0].candidate_commit = 'main'; },
    p => { p.candidates[1].candidate_id = p.candidates[0].candidate_id; }, p => { p.candidates.splice(0, 1); }]) {
      const changed = structuredClone(plan); alter(changed); assert.throws(() => validatePreparationRegister(changed));
    }
});
test('closeout refuses arbitrary comparison paths before reading a key or model output', async () => {
  await assert.rejects(auditCloseout({ comparisonFile: '.', contractRun: '.', pipelineRun: '.' }), /private comparison root/);
});
