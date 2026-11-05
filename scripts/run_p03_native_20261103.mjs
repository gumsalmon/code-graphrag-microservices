// D20 P03 replay: independently prepared source input, reviewed code, cached containers.
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ROOT,write,command,seal,json,filesUnder} from './run_p02_f03.mjs';
import {sha256,canonical,ensure} from '../pipeline/p03/preparation.mjs';
import {PYTHON_IMAGE,NEO4J_IMAGE} from '../pipeline/p02/offline-method.mjs';
const RETURN='handoff-out/hien-p03-return/20261103T135105Z-8dcc02a3';
const RECEIVED=resolve(ROOT,RETURN,'received'),LABEL='code-graphrag.p03-native';
const RECEIPT='b73e4dd44a1cbd9ffe05d148d2c0742f4ab685cb4c7a4cac7b949ed4d429ce20';
const receiptFile='tasks/hien-next/P03_TECHNICAL_RECEIPT_2026-11-02.json';
const fingerprint=async root=>Object.fromEntries(await Promise.all((await filesUnder(root)).map(async f=>[f,sha256(await readFile(resolve(root,f)))])));
async function main(){
 ensure(process.argv.length===2,'No options: this replay binds a checked P03 receipt');
 const audit=await json(resolve(ROOT,RETURN,'STATIC_AUDIT.json'));
 ensure(audit.case==='P03'&&audit.reviewed_code_eligible_for_sandbox_technical_tests&&audit.p02_candidate_preserved,'Static review required');
 const receiptRaw=await readFile(resolve(ROOT,receiptFile)),receipt=JSON.parse(receiptRaw);
 ensure(sha256(receiptRaw)===RECEIPT&&receipt.case==='P03'&&!receipt.model_calls_authorized&&!receipt.official_scoring_authorized,'Receipt/scope differs');
 const id=new Date().toISOString().replace(/[-:.]/g,'').toLowerCase()+'-'+randomUUID().slice(0,8);
 const directory=resolve(ROOT,'handoff-out/p03-native-offline',id);await mkdir(directory,{recursive:true});
 const resources=[],cleanupRecords=[],originals={},completed=[];
 for(const f of ['scripts/run_p03_native_20261103.mjs','scripts/check_p03_native_20261103.py','pipeline/p03/native-offline-probe.py','pipeline/p02/offline-method-probe.py']){
  const b=await readFile(resolve(ROOT,f));originals[f]=sha256(b);await write(directory,'tooling/'+f,b);
 }
 await write(directory,'static-review.json',await readFile(resolve(ROOT,RETURN,'STATIC_AUDIT.json')));
 const beforeReceived=await fingerprint(RECEIVED);await write(directory,'received-hashes-before.json',beforeReceived);
 for(const f of await filesUnder(resolve(RECEIVED,'working'))){
  const b=await readFile(resolve(RECEIVED,'working',f));ensure(audit.code_hashes['working/'+f]===sha256(b),'Code not in reviewed hash map');
  await write(directory,'implementation/'+f,b);
 }
 // The reviewed tests use a source-only packet adjacent to their working copy.
 for(const f of await filesUnder(resolve(RECEIVED,'packet')))await write(directory,'test-packet/'+f,await readFile(resolve(RECEIVED,'packet',f)));
 await write(directory,'input/receipt.json',receiptRaw);
 for(const [file,expected] of [['D20.json',receipt.authority_sha256],['D19.json',receipt.input_decision_sha256]]){
  const b=await readFile(resolve(RECEIVED,'packet/decisions',file));ensure(sha256(b)===expected,'Decision differs');await write(directory,'input/'+file,b);
 }
 const c=resolve(RECEIVED,'packet/candidate'),scope=await json(resolve(c,'spec/scope.candidate.v1.json'));
 const inventory=await json(resolve(c,'draft/inventory.v1.json')),prov=await json(resolve(c,'PROVENANCE.json'));
 const scenario=await json(resolve(c,'spec/scenario.candidate.v0.1.0.json')),snapshots={};
 for(const [key,file] of [['scope','spec/scope.candidate.v1.json'],['inventory','draft/inventory.v1.json'],['scenario','spec/scenario.candidate.v0.1.0.json'],['patch','spec/owner-response-rename.patch']])
  ensure(sha256(await readFile(resolve(c,file)))===receipt.case_inputs[key+'_sha256'],'Pinned artifact differs');
 const seedDecl=scope.files.flatMap(f=>f.methods.filter(m=>m.seed).map(m=>f.service+'::'+f.class_fqn+'#'+m.signature));ensure(seedDecl.length===1,'Ambiguous seed');
 for(const snapshot of ['baseline','mutated']){
  snapshots[snapshot]=[];
  for(const f of scope.files){
   const changed=snapshot==='mutated'&&f.file===scenario.mutation.file;
   const b=await readFile(resolve(c,changed?'mutated/app':'input/app',f.file));
   ensure(sha256(b)===(changed?prov.patch_result_sha256:inventory.source_files_sha256[f.file]),'Source differs');
   await write(directory,'input/'+snapshot+'/'+f.file,b);snapshots[snapshot].push({file:f.file,class_fqn:f.class_fqn,sha256:sha256(b)});
  }
 }
 await write(directory,'input/proposed.patch',await readFile(resolve(c,'spec/owner-response-rename.patch')));
 await write(directory,'input/INPUT.json',{case:'P03',receipt_sha256:RECEIPT,source_commit:receipt.case_inputs.source_commit,
  patch_sha256:receipt.case_inputs.patch_sha256,seed_ids:{baseline:seedDecl[0],mutated:seedDecl[0]},snapshots,
  label_or_annotation_notes_paths_included:false,model_calls:0,mutated_graph_diagnostic_only:true});
 const frozen={input:await fingerprint(resolve(directory,'input')),implementation:await fingerprint(resolve(directory,'implementation')),test_packet:await fingerprint(resolve(directory,'test-packet'))};
 await write(directory,'HASHES_BEFORE.json',frozen);
 await mkdir(resolve(directory,'artifacts'));await mkdir(resolve(directory,'database'));
 async function cleanup(r,stage){
  const inspected=await command(directory,stage+'-inspect','docker',r.kind==='network'?['network','inspect',r.name]:['inspect',r.name],{allowFailure:true});
  if(inspected.code===1&&/No such (?:object|container|network)/i.test(inspected.stderr))return {name:r.name,already_absent:true};
  ensure(inspected.code===0,'Cleanup target inspect failed');const data=JSON.parse(inspected.stdout)[0];
  ensure(r.name.startsWith('p03n-'+id+'-')&&(r.kind==='network'?data.Labels:data.Config.Labels)?.[LABEL]===id,'Refuse foreign resource');
  await command(directory,stage+'-remove','docker',r.kind==='network'?['network','rm',r.name]:['rm','--force','--volumes',r.name]);r.removed=true;return {name:r.name,removed:true};
 }
 async function python(stage,network,extra,args){
  const r={kind:'container',name:'p03n-'+id+'-'+stage};resources.push(r);
  return command(directory,stage,'docker',['run','--rm','--pull','never','--name',r.name,'--label',LABEL+'='+id,'--network',network,
   '--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,nosuid,nodev,size=128m',...extra,PYTHON_IMAGE,...args],{timeout:180000});
 }
 const mount=(source,target,ro=true)=>['--mount','type=bind,source='+resolve(directory,source)+',target='+target+(ro?',readonly':'')];
 async function probe(action,snapshot,network){
  const output=action==='extract'?'artifacts':'database';
  await python(action+'-'+snapshot,network,[...mount('input','/input'),...mount('implementation','/implementation'),
   ...mount('tooling/pipeline/p03/native-offline-probe.py','/probe.py'),...mount('tooling/pipeline/p02/offline-method-probe.py','/probe-core.py'),
   ...mount(output,'/output',false),...(action==='graph'?mount('artifacts','/artifacts'):[])],
   ['python','-B','/probe.py',action,'--snapshot',snapshot,'--output','/output/'+snapshot]);
 }
 let failure;
 try{
  await command(directory,'docker-version','docker',['version','--format','{{.Server.Version}}']);
  for(const [stage,image] of [['python-image',PYTHON_IMAGE],['neo4j-image',NEO4J_IMAGE]])await command(directory,stage,'docker',['image','inspect',image,'--format','{{json .Id}}']);
  console.log('P03 reviewed units (unittest, cached dependencies)');
  const units=await python('units','none',[...mount('implementation','/suite/working'),...mount('test-packet','/suite/packet'),'--workdir','/suite/working'],
   ['python','-B','-m','unittest','discover','-s','tests','-p','test_*.py','-v']);
  ensure(/Ran 30 tests/.test(units.stderr)&&units.stderr.trim().endsWith('OK')&&!/skipped=/.test(units.stderr),'Expected 30 units, no skip');
  for(const snapshot of ['baseline','mutated']){console.log('P03 extraction: '+snapshot);await probe('extract',snapshot,'none');}
  const network={kind:'network',name:'p03n-'+id+'-network'};resources.push(network);
  await command(directory,'network-create','docker',['network','create','--internal','--label',LABEL+'='+id,network.name]);
  await command(directory,'network-identity','docker',['network','inspect',network.name]);
  for(const snapshot of ['baseline','mutated']){
   console.log('P03 fresh Neo4j: '+snapshot);const db={kind:'container',name:'p03n-'+id+'-'+snapshot+'-db'};resources.push(db);
   await command(directory,'database-'+snapshot+'-start','docker',['run','-d','--pull','never','--name',db.name,'--label',LABEL+'='+id,
    '--network',network.name,'--network-alias','database','--tmpfs','/data:rw,nosuid,nodev,size=2g','--tmpfs','/logs:rw,nosuid,nodev,size=64m',
    '--env','NEO4J_AUTH=none','--env','NEO4J_server_memory_heap_initial__size=128m','--env','NEO4J_server_memory_heap_max__size=512m','--env','NEO4J_server_memory_pagecache_size=64m',NEO4J_IMAGE]);
   await command(directory,'database-'+snapshot+'-identity','docker',['inspect',db.name]);
   const identity=JSON.parse((await readFile(resolve(directory,'database-'+snapshot+'-identity.stdout.log'),'utf8')))[0];
   ensure(!Object.keys(identity.HostConfig.PortBindings??{}).length&&identity.Mounts.every(m=>m.Type!=='volume'),'Unexpected ports/volumes');
   try{await probe('graph',snapshot,network.name);
    ensure(canonical(await json(resolve(directory,'database',snapshot,'direct.first.json')))===canonical(await json(resolve(directory,'database',snapshot,'cypher.first.json'))),'Full property parity differs');completed.push(snapshot);
   }finally{await command(directory,'database-'+snapshot+'-logs','docker',['logs',db.name],{allowFailure:true});cleanupRecords.push(await cleanup(db,'database-'+snapshot+'-cleanup'));}
  }
  await write(directory,'RESULT.json',{case:'P03',status:'native_technical_replay_completed_with_declared_unsupported',receipt_sha256:RECEIPT,snapshots_completed:completed,
   unit_tests_passed:30,unit_tests_skipped:0,model_calls:0,embedding_inference:false,scoring_performed:false,labels_read:false,shared_contract_adopted:false,
   received_execution_scope:'Reviewed src/tests only; received extraction/DB tools not executed; coordinator probe/DB core used'});
 }catch(error){failure=error;await write(directory,'FAILURE.json',{message:error.message,snapshots_completed:completed});}
 finally{
  for(const [i,r]of [...resources].reverse().entries())if(!r.removed){try{cleanupRecords.push(await cleanup(r,'cleanup-'+i));}catch(error){cleanupRecords.push({name:r.name,error:error.message});failure??=error;}}
  for(const [f,h]of Object.entries(originals))ensure(sha256(await readFile(resolve(ROOT,f)))===h,'Coordinator code changed during replay');
  const unchanged=canonical(frozen.input)===canonical(await fingerprint(resolve(directory,'input')))&&canonical(frozen.implementation)===canonical(await fingerprint(resolve(directory,'implementation')))&&canonical(frozen.test_packet)===canonical(await fingerprint(resolve(directory,'test-packet')))&&canonical(beforeReceived)===canonical(await fingerprint(RECEIVED));
  await write(directory,'PRESERVATION.json',{input_implementation_test_packet_and_received_unchanged:unchanged});
  await write(directory,'CLEANUP.json',{complete:cleanupRecords.every(r=>!r.error),resources:cleanupRecords});
  await command(directory,'final-owner-containers','docker',['ps','-a','--filter','label='+LABEL+'='+id,'--format','{{.Names}}']);
  await command(directory,'final-owner-networks','docker',['network','ls','--filter','label='+LABEL+'='+id,'--format','{{.Name}}']);
  ensure(unchanged,'Input/code changed');await seal(directory);
 }
 if(failure)throw Error(failure.message+'; retained '+directory);
 console.log(JSON.stringify({directory,manifest_sha256:sha256(await readFile(resolve(directory,'SHA256SUMS.txt'))),completed},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
