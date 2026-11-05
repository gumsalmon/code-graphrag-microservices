// Read-only F03 evidence audit, never a label/scoring or runtime command.
import { readFile, realpath, lstat } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readF03Inputs, groupsForF03 } from '../pipeline/p02/f03-input.mjs';
import { sha256, jsonText } from './verify_p02_revision.mjs';
import { ROOT, PRIVATE, LABEL, json, filesUnder, changedFiles } from './run_p02_f03.mjs';
import { verifyBuildRun, SERVICES } from './run_p02_baseline.mjs';
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const safe=name=>typeof name==='string'&&/^[A-Za-z0-9_.@/-]+$/.test(name)&&!name.startsWith('/')&&!name.split('/').some(p=>!p||p==='.'||p==='..');
export async function verifyManifest(directory,{excluded=[],extra=[]}={}) {
  const bytes=await readFile(resolve(directory,'SHA256SUMS.txt')),seen=new Set();
  for(const line of bytes.toString('utf8').trim().split(/\r?\n/)) {
    const m=/^([a-f0-9]{64})  (.+)$/.exec(line);check(m&&safe(m[2])&&m[2]!=='SHA256SUMS.txt'&&!seen.has(m[2].toLowerCase()),'Unsafe/duplicate manifest');
    seen.add(m[2].toLowerCase()); const path=resolve(directory,m[2]);
    check(!(await lstat(path)).isSymbolicLink()&&(await realpath(path)).startsWith(await realpath(directory)+sep),'Linked/escaped evidence');
    check(sha256(await readFile(path))===m[1],'Evidence checksum mismatch: '+m[2]);
  }
  const actual=[...(await filesUnder(directory,excluded)).filter(p=>p!=='SHA256SUMS.txt'),...extra].map(p=>p.toLowerCase()).sort();
  check(same([...seen].sort(),actual),'Missing/unmanifested evidence files');
  check(!seen.has('failure.json'),'Incomplete/failed evidence directory');
  return {files:seen.size,sha256:sha256(bytes)};
}
export function validateObservedRequest(request,record,body) {
  const targets={visits:['visits-service',8082],gateway:['api-gateway',8080],config:['config-server',8888],discovery:['discovery-server',8761]};
  check(record.id===request.id&&record.method===request.method&&record.path===request.path&&record.host===targets[request.target][0]&&record.port===targets[request.target][1]&&
    record.error===null&&record.redirects_followed===false&&Number.isInteger(record.status)&&record.status>=100&&record.status<=599,'Wrong/incomplete HTTP observation');
  check(record.body_file===request.id+'.body'&&record.body_sha256===sha256(body)&&record.body_bytes===body.length,'Response body mismatch');
  if(request.method==='POST')check(record.request_body_file===request.id+'.request.body','POST request bytes absent');
  return true;
}
const tuples=rows=>rows.map(v=>[v.id,v.petId,v.date,v.description]).sort((a,b)=>a[0]-b[0]);
export function validateResetAndWrite(fixture,before,after) {
  const expected=fixture.seed_visits.map(v=>[v.id,v.pet_id,v.date,v.description]).sort((a,b)=>a[0]-b[0]);
  check(same(tuples(before),expected),'DB reset/source fixture differs');
  const actual=tuples(after),added=actual.filter(v=>!expected.some(e=>same(e,v)));
  check(actual.length===5&&expected.every(e=>actual.some(v=>same(e,v)))&&added.length===1&&same(added[0].slice(1),[7,'2026-10-01','P02 isolated write control']), 'POST readback differs from single authorized write');
  return true;
}
export function validateCleanup(cleanup,prefix,owner) {
  check(cleanup.complete===true&&Array.isArray(cleanup.resources)&&cleanup.resources.length>=1&&cleanup.resources.every(r=>
    r.name.startsWith(prefix+'-')&&r.owner===owner&&['container','network'].includes(r.kind)&&!r.error&&(r.removed===true||r.already_absent===true)), 'Cleanup incomplete/foreign');
  const names=cleanup.resources.map(r=>r.name);check(new Set(names).size===names.length,'Duplicate cleanup resource');return true;
}
export async function verifyF03(runDirectory) {
  const directory=resolve(runDirectory);check(directory.startsWith(PRIVATE+sep)&&!(await lstat(directory)).isSymbolicLink()&&
    (await realpath(directory)).startsWith(await realpath(PRIVATE)+sep),'Use a private F03 run');
  const input=await json(resolve(directory,'inputs.json')),result=await json(resolve(directory,'result.json'));
  const inputs=await readF03Inputs(input.candidate_directory,ROOT),groups=groupsForF03(inputs,input.run_id);
  const nested=['mutated-build/SHA256SUMS.txt','helpers/SHA256SUMS.txt',...groups.map(g=>'groups/'+g.id+'/SHA256SUMS.txt')];
  const manifest=await verifyManifest(directory,{excluded:['mutated-build','helpers','groups'],extra:nested});
  check(input.decision_sha256===inputs.decision_sha256&&same(input.bindings,inputs.bindings)&&sha256(await readFile(resolve(directory,'authorization.json')))===inputs.decision_sha256,'Wrong authorization/bindings');
  check(same((await json(resolve(directory,'plan.json'))).groups,groups),'Runtime plan drift');
  for(const [name,hash]of Object.entries(input.code_sha256)) {
    check(safe(name)&&sha256(await readFile(resolve(directory,'code',name)))===hash,'Code snapshot differs');
    check(sha256(await readFile(resolve(ROOT,name)))===hash,'Current auditor/tool version differs; use recorded version for this run');
  }
  check(input.labels_created===false&&input.model_calls===0&&input.official_scoring_authorized===false,'Out-of-scope run');
  const baseline=await verifyBuildRun(input.baseline_directory),baselineIdentity=await json(resolve(directory,'baseline-identity.json'));
  check(baselineIdentity.build_metadata_sha256===sha256(await readFile(resolve(baseline.directory,'build.json')))&&same(baselineIdentity.build,baseline.build),'Baseline identity drift');
  const mutatedDir=resolve(directory,'mutated-build'),mutated=await json(resolve(mutatedDir,'build.json'));
  await verifyManifest(mutatedDir,{excluded:['source','patch-git']});
  check(mutated.baseline_build_sha256===baselineIdentity.build_metadata_sha256&&mutated.patch_sha256===inputs.bindings.patch_sha256&&mutated.consumers_unchanged&&mutated.config_unchanged&&
    mutated.source_commit===inputs.bindings.source_commit&&mutated.config_commit===inputs.bindings.config_commit&&mutated.java_tests_executed===false&&mutated.network==='none'&&mutated.cache_read_only===true,'Mutated build provenance wrong');
  const before=await json(resolve(mutatedDir,'source-before.json')),after=await json(resolve(mutatedDir,'source-after-patch.json'));
  check(same(changedFiles(before,after),[inputs.scenario.mutation.file])&&same(mutated.source_changes,[inputs.scenario.mutation.file]),'Extra changed source');
  for(const service of SERVICES) {
    const jar=service==='visits-service'?resolve(mutatedDir,mutated.jars[service].file):resolve(baseline.directory,baseline.build.jars[service].file);
    check(sha256(await readFile(jar))===mutated.jars[service].sha256,'JAR byte mismatch');
    if(service!=='visits-service')check(same(mutated.jars[service],baseline.build.jars[service]),'Consumer/config JAR changed');
  }
  await verifyManifest(resolve(directory,'helpers'),{excluded:['classes','extracted']});
  const helpers=(await readFile(resolve(directory,'helpers/events.ndjson'),'utf8')).trim().split('\n').map(JSON.parse);
  for(const kind of ['default_hostname','joinIds_direct_invocation','setHostname_direct_invocation','actual_webclient_request','getVisitsForPets_subscription','addVisitsToOwner_function_applied','emptyVisitsForPets_direct_subscription'])
    check(helpers.filter(r=>r.kind===kind).length===1,'Missing/duplicate targeted helper observation: '+kind);
  const clientUri=new URL(helpers.find(r=>r.kind==='actual_webclient_request').raw_uri,'http://local-fixture');
  check(clientUri.pathname==='/pets/visits'&&clientUri.searchParams.get('petId')==='7,8'&&[...clientUri.searchParams].length===1,'Actual client URI differs');
  const instanceIds=[],groupReports=[];
  for(const group of groups) {
    const dir=resolve(directory,'groups',group.id);await verifyManifest(dir,{excluded:['config']});
    const identities=await json(resolve(dir,'identities.json')),network=JSON.parse(await readFile(resolve(dir,'network-inspect.stdout.log'),'utf8'));
    check(network.internal===true&&network.labels[LABEL]===group.owner,'Not a private network');
    for(const service of SERVICES) {
      const identity=identities[service];instanceIds.push(identity.id);
      check(identity.labels[LABEL]===group.owner&&identity.name==='/'+group.prefix+'-'+service&&identity.image===baseline.build.java_image&&
        Object.keys(identity.ports??{}).length===0&&identity.mounts.every(m=>m.Type!=='volume'),'Incorrect service ownership/isolation');
      const expectedRoot=group.snapshot==='mutated'&&service==='visits-service'?mutatedDir:baseline.directory;
      check(identity.mounts.some(m=>m.Destination==='/p02.jar'&&m.RW===false&&resolve(m.Source)===resolve(expectedRoot,(service==='visits-service'&&group.snapshot==='mutated'?mutated:baseline.build).jars[service].file)),'Wrong mounted JAR');
    }
    const obsDir=resolve(dir,'observations'),summary=await json(resolve(obsDir,'observations.json'));
    check(summary.fixture_slots===10&&summary.post_requests===1&&summary.post_last&&summary.slots.length===10&&summary.labels_created===false,'Wrong slot summary');
    const statuses={};
    for(const [index,request]of group.requests.entries()) {
      const record=await json(resolve(obsDir,request.id+'.json')),body=await readFile(resolve(obsDir,request.id+'.body'));
      validateObservedRequest(request,record,body);statuses[request.id]=record.status;
      check(summary.slots[index].order===index+1&&summary.slots[index].id===request.id&&summary.slots[index].method===request.method&&summary.slots[index].status===record.status,'Missing/reordered slot');
      if(request.method==='POST') {
        const sent=await readFile(resolve(obsDir,record.request_body_file));check(sha256(sent)===record.request_body_sha256&&sent.length===record.request_body_bytes&&same(JSON.parse(sent),request.body),'POST body drift');
        check(record.status===200||record.status===201,'POST control not successful');
      }
    }
    const support=async(folder,name,target,path)=> {
      const record=await json(resolve(dir,folder,name+'.json')),body=await readFile(resolve(dir,folder,name+'.body'));
      validateObservedRequest({id:name,method:'GET',target,path},record,body);check(record.status===200,'Support request not 200');return JSON.parse(body);
    };
    const pet7=await support('setup','pet7-before','visits','/owners/6/pets/7/visits'),pet8=await support('setup','pet8-before','visits','/owners/6/pets/8/visits');
    const readback=await support('observations','post-readback','visits','/pets/visits?petId=7,8');
    validateResetAndWrite(inputs.fixture,[...pet7,...pet8],readback.items);
    const fault=await support('fault','gateway-provider-fault','gateway','/api/gateway/owners/6');
    check(fault.id===6&&same(fault.pets.map(p=>p.id).sort(),[7,8])&&fault.pets.every(p=>p.visits.length===0),'Controlled-fault body does not show empty visits');
    for(const phase of ['pause-provider','unpause-provider'])check((await json(resolve(dir,phase+'.exit.json'))).code===0,'Fault intervention not established/restored');
    const cleanup=await json(resolve(dir,'cleanup.json'));validateCleanup(cleanup,group.prefix,group.owner);
    check(cleanup.resources.filter(r=>r.kind==='network').length===1&&SERVICES.every(s=>cleanup.resources.some(r=>r.name===group.prefix+'-'+s)),'Missing service/network cleanup');
    check((await json(resolve(dir,'log-capture.json'))).errors.length===0,'Service logs incomplete');
    const gr=await json(resolve(dir,'result.json'));check(gr.group_id===group.id&&gr.fixture_slots===10&&gr.post_slots===1&&gr.labels_created===false,'Wrong group result');
    groupReports.push({id:group.id,statuses,fresh_seed_visits:4,after_post_visits:5,cleanup_complete:true,fault_extra:true});
  }
  check(new Set(instanceIds).size===20,'Reused service/DB instances');
  check(same(await json(resolve(directory,'protected-before.json')),await json(resolve(directory,'protected-after.json')))&&
    (await json(resolve(directory,'preservation.json'))).protected_inputs_unchanged===true,'Original protected inputs changed');
  check(result.status==='runtime_evidence_collected_pending_readonly_audit'&&result.fixture_slots===40&&result.post_slots===4&&result.groups_completed===4&&
    result.labels_created===false&&result.ground_truth_accepted===false&&result.final_test_locked===false&&result.official_scoring_authorized===false&&result.model_calls===0,'Invalid claims');
  return {schema:'p02-f03-verification/1',directory,status:'technical_runtime_evidence_verified_not_labels',manifest,
    fixture_slots:40,post_slots:4,groups:groupReports,unique_service_instances:20,helpers:'targeted_actual_classes_with_local_fixture_not_microservice_e2e',
    f03_scope:'runtime_and_targeted_helper_evidence_only_human_sufficiency_review_still_required',labels_created:false,ground_truth_accepted:false,final_test_locked:false,
    official_scoring_authorized:false,model_calls:0,limitations:['No impact polarity assigned','Targeted setter/private helper invocations are not proof those methods run on every production request',
      'Paused-provider fault is additional evidence, not part of the 40 fixture slots','Maven application tests skipped; build success is not a Java test suite result']};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{check(process.argv.length===4&&process.argv[2]==='--run','Usage: --run PRIVATE_F03_RUN');console.log(jsonText(await verifyF03(process.argv[3])));}
  catch(error){console.error('F03 audit failed: '+error.message);process.exitCode=1;}
}
