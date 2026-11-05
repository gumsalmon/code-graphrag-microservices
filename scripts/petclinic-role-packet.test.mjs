import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRoleState } from './verify_petclinic_role_packet.mjs';
const decision = { decision_id:'D20', decision_maker:'Huy', phat_p03_draft_annotation_authorized:true, phat_p02_checkpoint_completion_authorized:true,
 integration_authority:{mode:'conditional_per_case',checkpoint_already_satisfied_by_this_decision:false},
 model_calls_authorized:false,official_scoring_authorized:false,ground_truth_accepted:false,final_test_locked:false,
 draft_shared_contract_adoption_authorized:false,github_push_authorized:false };
const state = {schema:'petclinic-role-packet/1',role:'phat',input_locked:true,
 candidate_manifest_sha256:'c52f085be74406e542de93db7f6d70b2fc3fe60f215ae47bd45df5b1cc5cec92',
 paired_runtime_manifest_sha256:'65057ce36b3c4235943090079a1fe7384660bafa1f31b5ec3e8d113a764dce56', paired_runtime_included:true,
 labels_created:false,evaluated_system_outputs_included:false,ground_truth_accepted:false,final_test_locked:false,official_scoring_authorized:false,
 model_calls_authorized:false,github_push_performed:false,packet_sent:false,recipient_acknowledged:false,
 case_checkpoint_receipts:{P02:null,P03:null},actual_case_integration_executable_now:false};
test('annotation permission is compatible with absent human checkpoint; cannot execute real cases yet',()=>{
 assert.equal(validateRoleState(state,decision,['candidate/source.java'],[]),true);
 assert.throws(()=>validateRoleState({...state,actual_case_integration_executable_now:true},decision,[],[]));
 assert.throws(()=>validateRoleState({...state,case_checkpoint_receipts:{P02:'AI said done',P03:null}},decision,[],[]));
});
test('new authority cannot include model, shared-contract adoption or label acceptance',()=>{
 for(const flag of ['model_calls_authorized','ground_truth_accepted','draft_shared_contract_adoption_authorized','official_scoring_authorized','github_push_authorized'])
  assert.throws(()=>validateRoleState(state,{...decision,[flag]:true},[],[]));
});
test('annotator cannot be handed implementation, labels, predictions or scores',()=>{
 for(const name of ['implementation/src/parser.py','labels.draft.v4.json','nested/predictions.json','nested/scores/f1.json','PROJECT_CONTEXT.md','artifact.jar'])
  assert.throws(()=>validateRoleState(state,decision,[name],[]));
});
test('raw evidence cannot be hidden by omission, and delivery cannot be invented',()=>{
 for(const path of ['paired/groups/baseline-r1/observations/direct.body','paired/groups/mutated-r1/logs/api.log','paired/groups/'])
  assert.throws(()=>validateRoleState(state,decision,[],[{path}]));
 for(const flag of ['packet_sent','recipient_acknowledged','labels_created'])assert.throws(()=>validateRoleState({...state,[flag]:true},decision,[],[]));
});
test('technical role receives candidate bytes without annotation raw or draft ground truth',()=>{
 const technical={...state,role:'hien',paired_runtime_included:false,
  implementation_parser_sha256:'fb20def957a46c5bf41662326fa5c4e955593cb532cdad476dc9263ae9b6e8d9',
  implementation_importer_sha256:'8e418f34cc4e620cc924b37f23baccd8ad2f150579768cb34fffc97ec55ed08c'};
 assert.equal(validateRoleState(technical,decision,['implementation/src/parser.py'],[]),true);
 assert.throws(()=>validateRoleState(technical,decision,['paired/observations.json'],[]));
});
