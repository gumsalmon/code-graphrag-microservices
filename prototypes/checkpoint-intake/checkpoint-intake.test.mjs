import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCheckpoint, digest } from './checkpoint-intake.mjs';

function fixture() {
  const expected = Object.fromEntries(['scenario_id','scenario_version','source_commit','config_commit','patch_sha256',
    'scenario_sha256','universe_version','universe_sha256','fixture_version','fixture_sha256'].map(name => [name, 'synthetic-' + name]));
  const universe = { eligible_entities: [{level:'method',entity_id:'toy::caller()'},{level:'api',entity_id:'toy::GET /items'}],
    excluded_seeds:[{level:'method',entity_id:'toy::seed()'}] };
  const labels = {...expected,label_version:'synthetic-draft.v1',status:'pending_review',ground_truth_accepted:false,final_test_locked:false,
    official_scoring_authorized:false,review_decision:null,labels:universe.eligible_entities.map((row,index)=>({...row,polarity:index?'unresolved':'positive',
      behavioral_impact:index?null:true,requires_code_change:null,confidence:null,logical_hop:null,rationale:'Synthetic fixture reason',evidence_refs:['synthetic/source.java']}))};
  return bind({expected,universe,labels,humanStatement:null});
}
function bind(input) {
  const files={'return/draft.json':Buffer.from(JSON.stringify(input.labels)), 'return/evidence.json':Buffer.from('{}'),
    'return/notes.md':Buffer.from('Synthetic notes, no real person'), 'return/exposure.json':Buffer.from('{"fixture":true}')};
  const artifacts=Object.fromEntries(['labels','evidence_manifest','notes','exposure'].map((role,index)=>{
    const path=Object.keys(files)[index]; return [role,{path,sha256:digest(files[path])}];
  }));
  return {...input,files,artifacts};
}
test('complete synthetic draft passes mechanical subset without certifying human reading or granting execution',()=>{
  const input=fixture(), before=JSON.stringify(input);const result=auditCheckpoint(input);
  assert.equal(result.mechanical_ok,true);assert.equal(result.human_confirmation_declared,false);
  assert.equal(result.human_reading_certified,false);assert.equal(result.real_case_execution_authorized,false);
  assert.equal(JSON.stringify(input),before);
});
test('missing ID is reported and never silently becomes negative',()=>{
  const input=fixture(); input.labels.labels.pop();const result=auditCheckpoint(bind(input));
  assert.ok(result.errors.some(e=>e.code==='missing_id_not_negative'));assert.equal(result.mechanical_ok,false);
});
test('duplicate rows and excluded seed are rejected',()=>{
  const input=fixture();input.labels.labels.push({...input.labels.labels[0]}, {...input.labels.labels[0],...input.universe.excluded_seeds[0]});
  const result=auditCheckpoint(bind(input));assert.ok(result.errors.some(e=>e.code==='duplicate_label'));
  assert.ok(result.errors.some(e=>e.code==='out_of_universe_or_seed'));
});
test('input/version changes and claiming accepted labels cannot pass the subset',()=>{
  const input=fixture();input.labels.patch_sha256='different';input.labels.ground_truth_accepted=true;
  const result=auditCheckpoint(bind(input));assert.ok(result.errors.some(e=>e.code==='input_binding_differs'));
  assert.ok(result.errors.some(e=>e.code==='draft_must_not_claim_acceptance_or_scoring'));
});
test('changed notes or absent exposure bytes are reported',()=>{
  const input=fixture();input.files['return/notes.md']=Buffer.from('Changed');delete input.files['return/exposure.json'];
  const result=auditCheckpoint(input);assert.ok(result.errors.some(e=>e.code==='artifact_hash_differs'));
  assert.ok(result.errors.some(e=>e.code==='artifact_bytes_missing'));
});
test('unsafe artifact path cannot be read or approved',()=>{
  const input=fixture();input.artifacts.notes.path='../private.md';
  assert.ok(auditCheckpoint(input).errors.some(e=>e.code==='missing_or_unsafe_artifact'));
});
test('AI-only proposal remains distinct from a declared human confirmation',()=>{
  const input=fixture();input.humanStatement={confirmed:true,kind:'ai_only',person:'Synthetic fixture',actual_scope:'AI summaries',ai_assistance:'all'};
  const result=auditCheckpoint(input);assert.equal(result.mechanical_ok,true);assert.equal(result.human_confirmation_declared,false);
  assert.equal(result.real_case_execution_authorized,false);
});
test('even a claimed human confirmation is not proof of reading or permission',()=>{
  const input=fixture();input.humanStatement={confirmed:true,kind:'human_reviewed',person:'Synthetic fixture only',actual_scope:'Synthetic case',ai_assistance:'Synthetic statement'};
  const result=auditCheckpoint(input);assert.equal(result.human_confirmation_declared,true);
  assert.equal(result.human_reading_certified,false);assert.equal(result.real_case_execution_authorized,false);
});
test('unresolved with null repair/confidence/hop stays null',()=>{
  const input=fixture();const result=auditCheckpoint(input);
  assert.equal(result.mechanical_ok,true);assert.equal(input.labels.labels[1].behavioral_impact,null);
  for(const field of ['requires_code_change','confidence','logical_hop'])assert.equal(input.labels.labels[1][field],null);
});
test('malformed entity arrays or rows produce findings instead of a successful empty audit',()=>{
  const input=fixture(); input.universe.eligible_entities='wrong';input.labels.labels=[null];
  const result=auditCheckpoint(bind(input));assert.equal(result.mechanical_ok,false);
  assert.ok(result.errors.some(e=>e.code==='eligible_universe_missing'));
  assert.ok(result.errors.some(e=>e.code==='invalid_label_record'));
});
