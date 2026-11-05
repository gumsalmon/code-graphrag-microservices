import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,mkdtemp,rm,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { validateAuthorization,readF03Inputs,groupsForF03,LOCK_PATH } from './f03-input.mjs';
import { ROOT,LABEL,parseOptions,changedFiles,ownedResource,seal,write,childEnv,treeHashes } from '../../scripts/run_p02_f03.mjs';
import { validateObservedRequest,validateResetAndWrite,validateCleanup,verifyManifest } from '../../scripts/check_p02_f03.mjs';
import { sha256 } from '../../scripts/verify_p02_revision.mjs';
const decision=JSON.parse(await readFile(resolve(ROOT,LOCK_PATH)));
const bindings=Object.fromEntries(['scenario_sha256','universe_sha256','fixture_sha256','patch_sha256','inventory_sha256','request_plan_sha256',
  'candidate_manifest_sha256','source_commit','config_commit'].map(k=>[k,decision[k]]));
test('explicit separate decision binds bytes; frozen pending flags are not rewritten',()=>assert.equal(validateAuthorization(decision,bindings),true));
for(const key of ['input_locked_for_f03','runtime_evidence_authorized','adapter_and_offline_tests_authorized'])test('missing authorization '+key,()=>assert.throws(()=>validateAuthorization({...decision,[key]:false},bindings)));
for(const key of ['model_calls_authorized','label_creation_authorized','ground_truth_accepted','locked_for_labeling','final_test_locked','official_scoring_authorized','github_push_authorized','original_frozen_inputs_may_be_modified'])
  test('forbidden gate '+key,()=>assert.throws(()=>validateAuthorization({...decision,[key]:true},bindings)));
test('wrong reviewed bundle/source/hash rejected',()=>{
  for(const k of ['scenario_sha256','universe_sha256','fixture_sha256','patch_sha256','candidate_manifest_sha256','source_commit'])
    assert.throws(()=>validateAuthorization(decision,{...bindings,[k]:'0'.repeat(k.endsWith('commit')?40:64)}));
});
test('CLI refuses score/provider/force/external base URLs and ambiguous options',()=>{
  assert.equal(parseOptions(['check-input','--candidate','x']).action,'check-input');
  assert.equal(parseOptions(['run','--candidate','x','--baseline-build','b','--maven-home','m','--maven-repository','r']).action,'run');
  for(const args of [['score'],['run'],['check-input','--candidate','x','--force','yes'],['run','--base-url','http://production'],['check-input','--candidate','x','--candidate','y']])assert.throws(()=>parseOptions(args));
});
test('all four groups have unique namespace and exact POST-last fixture copies',async()=>{
  const input=await readF03Inputs(resolve(ROOT,'handoff-out/p02-input-revision/20261018T065307839Z-719da955'),ROOT);
  const groups=groupsForF03(input,'synthetic-test-123');
  assert.equal(groups.length,4);assert.equal(new Set(groups.map(g=>g.prefix)).size,4);
  for(const g of groups){assert.equal(g.requests.length,10);assert.equal(g.requests.at(-1).method,'POST');assert.equal(g.fresh_database,true);assert.deepEqual(g.host_ports,[]);}
  assert.throws(()=>groupsForF03(input,'../unsafe'));
});
test('source diff detects additions/deletions/unexpected mutations',()=>assert.deepEqual(changedFiles({a:'one',b:'same',c:'deleted'},{a:'two',b:'same',d:'new'}),['a','c','d']));
test('ownership checked by exact label value, not prefix alone',()=>{
  const r={name:'p02f03-test-visits',owner:'test:g'};
  assert.equal(ownedResource(r,'test:g',{[LABEL]:'test:g'}),true);
  for(const labels of [{},{[LABEL]:'foreign'}])assert.throws(()=>ownedResource(r,'test:g',labels));
  assert.throws(()=>ownedResource({...r,name:'production'},'test:g',{[LABEL]:'test:g'}));
});
test('HTTP checker verifies body bytes/path/host and never assumes impact polarity',()=>{
  const request={id:'direct_invalid',method:'GET',target:'visits',path:'/pets/visits?petId=7,8&includeDetails=not-a-boolean'};
  const body=Buffer.from('{}'),record={...request,host:'visits-service',port:8082,status:400,error:null,redirects_followed:false,
    body_file:'direct_invalid.body',body_sha256:sha256(body),body_bytes:body.length};
  assert.equal(validateObservedRequest(request,record,body),true);
  for(const patch of [{status:null},{error:'timeout'},{host:'production'},{body_sha256:'0'.repeat(64)},{path:'/different'}])assert.throws(()=>validateObservedRequest(request,{...record,...patch},body));
});
test('reset verifies actual seed tuples and POST exactly once, no residual write',async()=>{
  const f=JSON.parse(await readFile(resolve(ROOT,'benchmark/p02/preparation.v1/fixture.json')));
  const seed=f.seed_visits.map(v=>({id:v.id,petId:v.pet_id,date:v.date,description:v.description}));
  const added={id:5,petId:7,date:'2026-10-01',description:'P02 isolated write control'};
  assert.equal(validateResetAndWrite(f,seed,[...seed,added]),true);
  assert.throws(()=>validateResetAndWrite(f,[...seed,added],[...seed,added]));
  assert.throws(()=>validateResetAndWrite(f,seed,seed));
  assert.throws(()=>validateResetAndWrite(f,seed,[...seed,added,{...added,id:6}]));
});
test('cleanup refuses partial, foreign and duplicate resource claims',()=>{
  const r={name:'p02f03-test-g-visits',owner:'test:g',kind:'container',removed:true};
  const c={complete:true,resources:[r]};assert.equal(validateCleanup(c,'p02f03-test-g','test:g'),true);
  for(const v of [{...c,complete:false},{complete:true,resources:[{...r,owner:'other'}]},{complete:true,resources:[{...r,error:'failed'}]},
    {complete:true,resources:[r,r]}])assert.throws(()=>validateCleanup(v,'p02f03-test-g','test:g'));
});
test('manifest detects tamper/unlisted files and refuses overwrite',async()=>{
  const dir=await mkdtemp(resolve(tmpdir(),'p02f03-test-'));
  try {await write(dir,'a.json',{});await seal(dir);assert.equal((await verifyManifest(dir)).files,1);
    await assert.rejects(write(dir,'a.json',{}));await writeFile(resolve(dir,'a.json'),'changed');await assert.rejects(verifyManifest(dir),/checksum/);
  } finally{await rm(dir,{recursive:true,force:true});}
});
test('subprocess environment does not carry provider or Docker credential settings',()=>{
  const env=childEnv();for(const k of Object.keys(env))assert.ok(!/API_KEY|TOKEN|PASSWORD|DOCKER_CONFIG|NODE_OPTIONS/.test(k));
});
test('source preservation ignores generated target classes before path validation',async()=>{
  const dir=await mkdtemp(resolve(tmpdir(),'p02f03-source-test-'));
  try{await write(dir,'src/Example.java','source');
    const {mkdir}=await import('node:fs/promises');await mkdir(resolve(dir,'module/target'),{recursive:true});
    await writeFile(resolve(dir,'module/target/Example$Inner.class'),'generated');
    assert.deepEqual(await treeHashes(dir),{'src/Example.java':sha256('source')});
  }finally{await rm(dir,{recursive:true,force:true});}
});
