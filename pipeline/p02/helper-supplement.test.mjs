import test from 'node:test';
import assert from 'node:assert/strict';
import { helperGroups, helperPlan, requireOwned, LABEL, validateHelperEvents, hash } from './helper-supplement.mjs';

// Synthetic records only: these tests do not execute Java or PetClinic.
function fixture() {
  const group=helperGroups('synthetic-run-123')[0];
  const owner={id:6,firstName:'Synthetic',lastName:'Control',address:'Fixture',city:'Sandbox',telephone:'0000000000',
    pets:[{id:7,name:'PetA',birthDate:'2012-09-04',type:{id:1,name:'cat'}},{id:8,name:'PetB',birthDate:'2012-09-04',type:{id:1,name:'cat'}}]};
  const visits={items:[{id:1,petId:8,date:'2013-01-01',description:'synthetic B'},{id:2,petId:7,date:'2013-01-02',description:'synthetic A'}]};
  const before={...owner,pets:owner.pets.map(p=>({...p,type:{name:p.type.name},visits:[]}))},after={...owner,pets:owner.pets.map(p=>({...p,type:{name:p.type.name},visits:visits.items.filter(v=>v.petId===p.id)}))};
  const inputs={ownerBytes:Buffer.from(JSON.stringify(owner)),visitBytes:Buffer.from(JSON.stringify(visits))};
  const classes=Object.fromEntries(['Client','Controller','Owner','Pet','Type','Visits','Visit'].map(name=>[name,{resource:name+'.class',sha256:'a'.repeat(64),code_source:'file:/harness/extracted/BOOT-INF/classes/'}]));
  const projection={policy:'remove_pets_type_id_only_for_declared_consumer_record',removed_fields:owner.pets.map((pet,index)=>({json_pointer:'/pets/'+index+'/type/id',value:pet.type.id}))};
  const rows=[['application_identity',{classes,consumer_source_modified:false}],['raw_input_binding',{owner_sha256:hash(inputs.ownerBytes),provider_visits_sha256:hash(inputs.visitBytes),owner_projection:projection}],
    ['joinIds_direct_return',{input:[7,8],returned:'7,8',returned_type:'java.lang.String'}],
    ['setHostname_direct_assignment',{input:group.provider_origin,field_before:'http://visits-service/',field_after:group.provider_origin}],
    ['actual_client_request',{method:'GET',url:group.provider_origin+'pets/visits?petId=7%2C8'}],['actual_client_response',{status:200}],
    ['client_subscription_completed',{decoded:visits}],['addVisitsToOwner_function_applied',{function_applied:true,same_owner_reference:true,visits_input:visits,owner_before:before,owner_after:after}],
    ['emptyVisitsForPets_direct_subscription',{returned:{items:[]},subscribed:true,production_callback_traced:false}],
    ['measurement_completed',{impact_labels_created:false,evaluated_method_output:false,production_method_tracing_claimed:false}]];
  return {group,inputs,events:rows.map(([kind,data])=>({kind,data,group_id:group.id,snapshot:group.snapshot,repetition:group.repetition,timestamp_utc:'2026-10-25T00:00:00Z'}))};
}
test('four groups bind snapshot/repetition; plan does not rerun matrix or create labels',()=>{
  const plan=helperPlan('synthetic-run-123',{}); assert.equal(plan.groups.length,4); assert.equal(new Set(plan.groups.map(g=>g.owner)).size,4);
  assert.equal(plan.new_label_polarity,false); assert.equal(plan.model_calls,0); assert.equal(plan.production_callback_tracing,false);
  assert.equal(plan.full_forty_slot_matrix_rerun,false); assert.ok(plan.groups.every(g=>g.fresh_database&&g.post_requests===0));
});
test('unsafe namespace and foreign resource cleanup are refused',()=>{
  assert.throws(()=>helperGroups('../other')); const group=helperGroups('synthetic-run-123')[0];
  assert.equal(requireOwned({name:group.prefix+'-probe',owner:group.owner},group.owner,{[LABEL]:group.owner}),true);
  assert.throws(()=>requireOwned({name:group.prefix+'-probe',owner:group.owner},group.owner,{[LABEL]:'someone-else'}));
  assert.throws(()=>requireOwned({name:'foreign',owner:group.owner},group.owner,{[LABEL]:group.owner}));
});
test('complete synthetic evidence is verified without certifying impact labels',()=>{
  const f=fixture(),result=validateHelperEvents(f.events,f.group,f.inputs); assert.equal(result.labels_accepted,false); assert.equal(result.production_callback_traced,false);
});
test('wrong snapshot, missing event or fabricated production trace fails',()=>{
  for(const change of [f=>f.events[0].snapshot='mutated',f=>f.events.pop(),f=>f.events[8].data.production_callback_traced=true]) {
    const f=fixture(); change(f); assert.throws(()=>validateHelperEvents(f.events,f.group,f.inputs));
  }
});
test('input drift and actual HTTP failure cannot be hidden by helper summaries',()=>{
  for(const change of [f=>f.inputs.visitBytes=Buffer.from('{}'),f=>f.events[5].data.status=503,
    f=>f.events[4].data.url='http://127.0.0.1:1234/pets/visits?petId=7%2C8']) {
    const f=fixture(); change(f); assert.throws(()=>validateHelperEvents(f.events,f.group,f.inputs));
  }
});
test('Function object without application, dropped visits or changed pet data fails',()=>{
  for(const change of [f=>f.events[7].data.function_applied=false,f=>f.events[7].data.owner_after.pets[0].visits=[],f=>f.events[7].data.owner_after.pets[0].name='changed']) {
    const f=fixture(); change(f); assert.throws(()=>validateHelperEvents(f.events,f.group,f.inputs));
  }
});
test('raw owner scalar differences and class source substitution fail',()=>{
  for(const change of [f=>f.events[7].data.owner_after.city='changed',f=>f.events[0].data.classes.Client.code_source='file:/replacement/']) {
    const f=fixture(); change(f); assert.throws(()=>validateHelperEvents(f.events,f.group,f.inputs));
  }
});
test('DTO projection must be declared exactly and cannot hide a changed type name',()=>{
  for(const change of [f=>delete f.events[1].data.owner_projection,f=>f.events[1].data.owner_projection.removed_fields.pop(),
    f=>f.events[7].data.owner_after.pets[0].type.name='changed']) {
    const f=fixture(); change(f); assert.throws(()=>validateHelperEvents(f.events,f.group,f.inputs));
  }
});
