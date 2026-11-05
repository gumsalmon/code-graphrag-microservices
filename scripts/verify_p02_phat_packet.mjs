// Read-only annotation packet integrity + declared human decision scope.
// Does not authenticate a human identity, grant permission, annotate or run code.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {verifyProjectTransfer} from './verify_project_transfer.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const check=(ok,message)=>{if(!ok)throw new Error(message);};
export function validatePacketDecisions(lock,coord,bindings) {
  check(lock.decision_id==='P02-G2-F03-2026-10-24'&&lock.authorized_by==='Huy'&&lock.input_locked_for_f03===true,'Missing human input-lock record');
  check(coord.decision_id==='PETCLINIC-PRE-REVIEW-2026-10-24'&&coord.authorized_by==='Huy'&&coord.p02_annotator==='Phát'&&
    coord.p02_draft_annotation_authorized_after_source_first_notes_and_evidence_assessment===true&&
    coord.p02_draft_annotation_scope_locked_to_referenced_input_hashes===true,'Missing conditional draft task');
  for(const [key,expected]of Object.entries(bindings)) {
    check(lock[key]===expected,'Lock differs from supplied bytes: '+key);
    const field={scenario_sha256:'p02_scenario_sha256',universe_sha256:'p02_universe_sha256',fixture_sha256:'p02_fixture_sha256'}[key];
    if(field)check(coord[field]===expected,'Draft task input drift');
  }
  check(coord.draft_status==='pending_review'&&coord.reviewer_assigned===null&&coord.ground_truth_accepted===false&&coord.final_test_locked===false&&
    coord.official_scoring_authorized===false&&coord.ai_may_decide_label_polarity_instead_of_human===false&&
    coord.annotator_may_use_evaluated_system_outputs_as_evidence===false&&coord.frozen_artifacts_may_be_modified===false,'Out-of-scope label/review/scoring permission');
  return true;
}
export async function verifyPhatPacket(root) {
  const integrity=await verifyProjectTransfer(root),read=path=>readFile(resolve(root,path));
  const metadata=JSON.parse(await read('META/transfer.json'));
  check(metadata.package_role==='phat_source_contract_runtime_evidence_and_draft_annotation','Wrong packet role');
  const lock=JSON.parse(await read('decisions/INPUT_LOCK_2026-10-24.json')),coord=JSON.parse(await read('decisions/PETCLINIC_PRE_REVIEW_2026-10-24.json'));
  const bindings={scenario_sha256:hash(await read('candidate/benchmark/p02/preparation.v2/scenario.json')),
    universe_sha256:hash(await read('candidate/draft/evaluation_universe.draft.v2.json')),
    fixture_sha256:hash(await read('candidate/benchmark/p02/preparation.v1/fixture.json')),
    candidate_manifest_sha256:hash(await read('candidate/SHA256SUMS.txt'))};
  validatePacketDecisions(lock,coord,bindings);
  return {...integrity,schema:'p02-phat-packet-verification/1',status:'packet_bytes_and_declared_decisions_verified_not_label_acceptance',
    input_locked:true,input_lock_record:lock.decision_id,input_lock_granted_by_this_verifier:false,
    draft_annotation_authorized_conditionally_by_coordinator:true,
    condition:'Human Phát first saves source-first notes/exposure and assesses evidence; unresolved stays unresolved; draft pending_review only',
    labels_created_by_verifier:false,ground_truth_accepted:false,official_scoring_authorized:false,model_calls_authorized_by_this_check:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{check(process.argv.length===4&&process.argv[2]==='--root','Usage: node VERIFY_PACKET.mjs --root DIRECTORY');
    console.log(JSON.stringify(await verifyPhatPacket(process.argv[3]),null,2));}
  catch(error){console.error('P02 Phat packet verification failed: '+error.message);process.exitCode=1;}
}
