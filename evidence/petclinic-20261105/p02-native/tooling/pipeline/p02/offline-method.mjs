// D20 technical receipt guard; no labels, annotation notes, model calls or scoring.
export const RECEIPT_PATH = 'tasks/hien-next/P02_TECHNICAL_RECEIPT_2026-11-01.json';
export const RECEIPT_SHA256 = 'a62b36183102023fd9d6f51228e782c5e41375493cfba5acba69bcb44cda7e58';
export const PYTHON_IMAGE = 'sha256:63c6e72e510d658265cf956b0e589ec7b55c6049b766b6b68120253f7ee06281';
export const NEO4J_IMAGE = 'sha256:5a015e53de1895e7eee1574ae0325cf8c4b89587222778108c594bdd45a474b5';
export const LABEL = 'code-graphrag.p02-method';
export const FILES = [
 'spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java',
 'spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/application/VisitsServiceClient.java',
 'spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java'
];
export const SEEDS = Object.freeze({
 baseline:'visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>)',
 mutated:'visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>,boolean)'
});
export function validateReceipt(receipt, authority, inputs) {
 const ensure=(ok,msg)=>{if(!ok)throw new Error(msg);};
 ensure(receipt.schema==='petclinic-offline-integration-receipt/1'&&receipt.case==='P02'&&receipt.status==='ready_for_offline_integration','No checked P02 receipt');
 ensure(receipt.authority_id==='D20'&&authority.decision_id==='D20'&&authority.decision_maker==='Huy'&&
  authority.integration_authority?.mode==='conditional_per_case','Wrong authority');
 const keys=['source_commit','config_commit','scenario_version','scenario_sha256','universe_version','universe_sha256','fixture_version','fixture_sha256','patch_sha256','candidate_manifest_sha256'];
 ensure(receipt.case_inputs&&Object.keys(receipt.case_inputs).length===keys.length,'Incomplete input binding');
 for(const key of keys)ensure(typeof inputs[key]==='string'&&receipt.case_inputs[key]===inputs[key],'Wrong locked input: '+key);
 ensure(receipt.checkpoint_version==='draft.v4'&&receipt.checkpoint_sha256==='de951041b200074f43171b2b5c9211b9b8a492fce6baf711d414402996f7a024'&&
  receipt.label_sha256==='c22e97a5a3a6994cb0c7961c5a42ed098301b106d36ab57536a486077c456f08','Different checked checkpoint');
 for(const key of ['model_calls_authorized','official_scoring_authorized','ground_truth_accepted','final_test_locked','shared_draft_contract_adoption_authorized','github_push_authorized','new_downloads_authorized'])
  ensure(receipt[key]===false,'Unauthorized scope: '+key);
 ensure(receipt.labels_or_annotation_notes_included===false,'Annotation data must stay outside method inputs');
 return true;
}
export function owned(name,labels,owner) {
 if(!name.startsWith('p02m-'+owner+'-')||labels?.[LABEL]!==owner)throw new Error('Refuse foreign resource');
 return true;
}
