import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {validatePacketDecisions} from './verify_p02_phat_packet.mjs';
const lock=JSON.parse(await readFile('benchmark/p02/decisions/INPUT_LOCK_2026-10-24.json'));
const coord=JSON.parse(await readFile('benchmark/p02/decisions/PETCLINIC_PRE_REVIEW_2026-10-24.json'));
const bindings=Object.fromEntries(['scenario_sha256','universe_sha256','fixture_sha256','candidate_manifest_sha256'].map(k=>[k,lock[k]]));
test('separate current draft task preserves frozen runtime authorization and reviewed input',()=>assert.equal(validatePacketDecisions(lock,coord,bindings),true));
test('wrong packet bytes cannot inherit the human decision',()=>{
  for(const k of Object.keys(bindings))assert.throws(()=>validatePacketDecisions(lock,coord,{...bindings,[k]:'0'.repeat(64)}));
});
test('AI polarity, auto acceptance/scoring and raw rewrite rejected',()=>{
  for(const key of ['ai_may_decide_label_polarity_instead_of_human','ground_truth_accepted','final_test_locked','official_scoring_authorized',
    'annotator_may_use_evaluated_system_outputs_as_evidence','frozen_artifacts_may_be_modified'])assert.throws(()=>validatePacketDecisions(lock,{...coord,[key]:true},bindings));
});
test('reviewer assignment or lost conditional draft authority is not silently accepted',()=>{
  assert.throws(()=>validatePacketDecisions(lock,{...coord,reviewer_assigned:'invented'},bindings));
  assert.throws(()=>validatePacketDecisions(lock,{...coord,p02_draft_annotation_authorized_after_source_first_notes_and_evidence_assessment:false},bindings));
  assert.throws(()=>validatePacketDecisions({...lock,input_locked_for_f03:false},coord,bindings));
});
