// D20 checked P02 receipt -> source-only native extraction and isolated Neo4j/retrieval.
import { readFile,mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ROOT,write,command,seal,json,filesUnder } from './run_p02_f03.mjs';
import { sha256,canonical,ensure } from '../pipeline/p03/preparation.mjs';
import { PINNED_SOURCE_SHA256 } from './prepare_p02_inputs.mjs';
import { RECEIPT_PATH,RECEIPT_SHA256,PYTHON_IMAGE,NEO4J_IMAGE,LABEL,FILES,SEEDS,validateReceipt,owned } from '../pipeline/p02/offline-method.mjs';

const SOURCE=resolve(ROOT,'handoff-out/p02-phat-f03/20261024T111515Z-b98740ff/ZIP_VERIFIED/source');
const IMPLEMENTATION=resolve(ROOT,'handoff-out/hien-synthetic-return/20261028T150351Z-3ac4bad6/received/code-after');
const CODE=['scripts/run_p02_offline_method.mjs','pipeline/p02/offline-method.mjs','pipeline/p02/offline-method.test.mjs',
 'pipeline/p02/offline-method-probe.py','pipeline/p02/offline_method_probe_test.py'];
async function fingerprint(directory){return Object.fromEntries(await Promise.all((await filesUnder(directory)).map(async name=>[name,sha256(await readFile(resolve(directory,name)))])));}
export async function run(){
 const receiptBytes=await readFile(resolve(ROOT,RECEIPT_PATH));ensure(sha256(receiptBytes)===RECEIPT_SHA256,'Changed coordinator receipt');
 const authorityBytes=await readFile(resolve(ROOT,'benchmark/decisions/PETCLINIC_DRAFT_INTEGRATION_2026-10-31.json'));
 const decisionBytes=await readFile(resolve(ROOT,'benchmark/p02/decisions/INPUT_LOCK_2026-10-24.json'));
 const receipt=JSON.parse(receiptBytes),decision=JSON.parse(decisionBytes);validateReceipt(receipt,JSON.parse(authorityBytes),decision);
 ensure(receipt.authority_sha256===sha256(authorityBytes)&&receipt.input_decision_sha256===sha256(decisionBytes),'Different decision bytes');
 const id=new Date().toISOString().replace(/[-:.]/g,'').toLowerCase()+'-'+randomUUID().slice(0,8);
 const directory=resolve(ROOT,'handoff-out/p02-offline-method',id),resources=[];await mkdir(directory,{recursive:true});
 const before={};
 for(const file of CODE){const bytes=await readFile(resolve(ROOT,file));before[file]=sha256(bytes);await write(directory,'tooling/'+file,bytes);}
 for(const [name,hash]of [['parser.py',receipt.implementation_parser_sha256],['neo4j_importer.py',receipt.implementation_importer_sha256]]){
  const file=resolve(IMPLEMENTATION,'src',name),bytes=await readFile(file);ensure(sha256(bytes)===hash,'Different implementation candidate');
  before[file]=hash;await write(directory,'implementation/src/'+name,bytes);
 }
 const snapshots={};
 for(const snapshot of ['baseline','mutated']){
  snapshots[snapshot]=[];
  for(const file of FILES){const source=resolve(SOURCE,snapshot,file),bytes=await readFile(source),hash=sha256(bytes);
   const expected=snapshot==='mutated'&&file===FILES[0]?'c2253806644e38b298988693b44188ecab23c7fd9b2210e809fa12e728292fd0':PINNED_SOURCE_SHA256[file];
   ensure(hash===expected,'Different pinned source: '+snapshot+'/'+file);before[source]=hash;
   await write(directory,'input/'+snapshot+'/'+file,bytes);snapshots[snapshot].push({file,sha256:hash});
  }
 }
 await write(directory,'input/receipt.json',receiptBytes);await write(directory,'input/D20.json',authorityBytes);
 await write(directory,'input/INPUT.json',{schema:'p02-native-offline/1',case:'P02',source_commit:decision.source_commit,
  patch_id:'P02-0.1.1-'+decision.patch_sha256.slice(0,12),seed_ids:SEEDS,receipt_sha256:RECEIPT_SHA256,snapshots,
  label_or_annotation_notes_paths_included:false,model_calls:0});
 await write(directory,'INPUT_PROVENANCE.json',{case:'P02',receipt_sha256:RECEIPT_SHA256,source_commit:decision.source_commit,
  source_snapshot_files:snapshots,implementation:{parser:receipt.implementation_parser_sha256,importer:receipt.implementation_importer_sha256},
  copied_source_only:true,benchmark_raw_or_labels_mounted:false,shared_draft_contract_adopted:false});
 await mkdir(resolve(directory,'artifacts'),{recursive:true});await mkdir(resolve(directory,'database'),{recursive:true});
 const frozenInput=await fingerprint(resolve(directory,'input')),frozenCode=await fingerprint(resolve(directory,'implementation'));
 await write(directory,'input-hashes-before.json',frozenInput);await write(directory,'implementation-hashes-before.json',frozenCode);
 async function cleanup(resource,stage){
  const args=resource.kind==='network'?['network','inspect',resource.name]:['inspect',resource.name];
  const inspected=await command(directory,stage+'-inspect','docker',args,{allowFailure:true});
  if(inspected.code===1&&/No such (?:object|container|network)/i.test(inspected.stderr))return {name:resource.name,already_absent:true};
  ensure(inspected.code===0,'Could not inspect cleanup target');const data=JSON.parse(inspected.stdout)[0];
  owned(resource.name,resource.kind==='network'?data.Labels:data.Config.Labels,id);
  await command(directory,stage+'-remove','docker',resource.kind==='network'?['network','rm',resource.name]:['rm','--force','--volumes',resource.name]);
  resource.removed=true;return {name:resource.name,removed:true};
 }
 async function probe(stage,action,snapshot,network){
  const name='p02m-'+id+'-'+stage;const resource={kind:'container',name};resources.push(resource);
  const output=action==='extract'?'artifacts':'database';
  const args=['run','--rm','--pull','never','--name',name,'--label',LABEL+'='+id,'--network',network,'--read-only',
   '--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,nosuid,nodev,size=128m',
   '--mount','type=bind,source='+resolve(directory,'input')+',target=/input,readonly',
   '--mount','type=bind,source='+resolve(directory,'implementation')+',target=/implementation,readonly',
   '--mount','type=bind,source='+resolve(directory,'tooling/pipeline/p02/offline-method-probe.py')+',target=/probe.py,readonly',
   '--mount','type=bind,source='+resolve(directory,output)+',target=/output'];
  if(action==='graph')args.push('--mount','type=bind,source='+resolve(directory,'artifacts')+',target=/artifacts,readonly');
  args.push(PYTHON_IMAGE,'python','-B','/probe.py',action,'--snapshot',snapshot,'--output','/output/'+snapshot);
  await command(directory,stage,'docker',args,{timeout:180000});
 }
 let failure=null;const completed=[];const cleanupRecords=[];
 try{
  for(const [stage,image]of [['python-image',PYTHON_IMAGE],['neo4j-image',NEO4J_IMAGE]])await command(directory,stage,'docker',['image','inspect',image,'--format','{{json .Id}}']);
  for(const snapshot of ['baseline','mutated']){console.log('P02 native extraction: '+snapshot);await probe('extract-'+snapshot,'extract',snapshot,'none');}
  const network={kind:'network',name:'p02m-'+id+'-network'};resources.push(network);
  await command(directory,'network-create','docker',['network','create','--internal','--label',LABEL+'='+id,network.name]);
  await command(directory,'network-identity','docker',['network','inspect',network.name]);
  for(const snapshot of ['baseline','mutated']){
   const db={kind:'container',name:'p02m-'+id+'-'+snapshot+'-db'};resources.push(db);console.log('P02 Neo4j metadata/retrieval: '+snapshot);
   await command(directory,'database-'+snapshot+'-start','docker',['run','-d','--pull','never','--name',db.name,'--label',LABEL+'='+id,
    '--network',network.name,'--network-alias','database','--tmpfs','/data:rw,nosuid,nodev,size=2g','--tmpfs','/logs:rw,nosuid,nodev,size=64m',
    '--env','NEO4J_AUTH=none','--env','NEO4J_server_memory_heap_initial__size=128m','--env','NEO4J_server_memory_heap_max__size=512m',
    '--env','NEO4J_server_memory_pagecache_size=64m',NEO4J_IMAGE]);
   await command(directory,'database-'+snapshot+'-identity','docker',['inspect',db.name]);
   const identity=JSON.parse((await readFile(resolve(directory,'database-'+snapshot+'-identity.stdout.log'),'utf8')))[0];
   owned(db.name,identity.Config.Labels,id);ensure(!Object.keys(identity.HostConfig.PortBindings??{}).length&&identity.Mounts.every(m=>m.Type!=='volume'),'Unexpected database ports/volumes');
   try{await probe('graph-'+snapshot,'graph',snapshot,network.name);completed.push(snapshot);}
   finally{
    await command(directory,'database-'+snapshot+'-logs','docker',['logs',db.name],{allowFailure:true});
    await command(directory,'database-'+snapshot+'-debug','docker',['exec',db.name,'sh','-c','tail -n 120 /logs/debug.log'],{allowFailure:true});
    cleanupRecords.push(await cleanup(db,'database-'+snapshot+'-cleanup'));
   }
  }
  await write(directory,'RESULT.json',{status:'native_graph_metadata_and_offline_graph_retrieval_verified',snapshots_completed:completed,
   receipt_sha256:RECEIPT_SHA256,labels_or_runtime_used_as_oracle:false,model_calls:0,embedding_inference:false,scoring_performed:false});
 }catch(error){failure=error;await write(directory,'FAILURE.json',{message:error.message,snapshots_completed:completed});}
 finally{
  for(const [index,resource]of [...resources].reverse().entries()){
   if(resource.removed)continue;
   try{cleanupRecords.push(await cleanup(resource,'final-cleanup-'+index));}catch(error){cleanupRecords.push({name:resource.name,error:error.message});if(!failure)failure=error;}
  }
  const preserved=canonical(frozenInput)===canonical(await fingerprint(resolve(directory,'input')))&&canonical(frozenCode)===canonical(await fingerprint(resolve(directory,'implementation')));
  for(const [path,hash]of Object.entries(before))ensure(sha256(await readFile(path.startsWith(ROOT)?path:resolve(ROOT,path)))===hash,'Source/implementation changed during run');
  await write(directory,'PRESERVATION.json',{input_and_implementation_unchanged:preserved,source_originals_unchanged:true});
  await write(directory,'CLEANUP.json',{complete:cleanupRecords.every(r=>!r.error),resources:cleanupRecords});await seal(directory);
  if(!preserved&&!failure)failure=new Error('Input preservation failed');
 }
 if(failure)throw new Error(failure.message+'; retained: '+directory);
 return {directory,manifest_sha256:sha256(await readFile(resolve(directory,'SHA256SUMS.txt'))),snapshots_completed:completed,model_calls:0,scoring_performed:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{ensure(process.argv.length===2,'No options supported; this runner binds the checked P02 receipt');console.log(JSON.stringify(await run(),null,2));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
