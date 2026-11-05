// D20 P03 source/patch context preparation. No model/provider/Docker/scorer.
import { readFile,mkdir,lstat,realpath } from 'node:fs/promises';
import { resolve,relative,isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { ROOT,write,seal } from './run_p02_f03.mjs';
import { RECEIPT_PATH,RECEIPT_SHA256,NATIVE_MANIFEST,PARSER_SHA256,SEED,nativeMembers,assertP03Input } from '../pipeline/p03/native-context.mjs';
import { prepareContext,digest } from '../pipeline/p03/static-context.mjs';
const PINNED_NATIVE_MANIFEST=NATIVE_MANIFEST;
const LICENSE_PATH='handoff-out/hien-p03-breaker-return/20261105T082719Z-86eac2cb/received/packet/candidate/input/app/LICENSE';
const CODE=['pipeline/p03/static-context.mjs','scripts/prepare_p03_static_context.mjs','pipeline/p03/native-context.mjs'];
const decoder=new TextDecoder('utf-8',{fatal:true});
const check=(ok,message)=>{if(!ok)throw Error(message);};
const json=bytes=>JSON.parse(decoder.decode(bytes));

export async function prepare(run,byteLimit=32768){
 run=resolve(run);const rel=relative(resolve(ROOT,'handoff-out/p03-breaker-offline'),run);
 check(rel&&!rel.startsWith('..')&&!isAbsolute(rel)&&!rel.includes('/')&&!rel.includes('\\'),'Expected one local P03 native run');
 check(Number.isSafeInteger(byteLimit)&&byteLimit>=0,'Invalid preview byte limit');
 const before={},readLog=[];
 async function read(path){
  path=resolve(path);const real=await realpath(path),inside=relative(await realpath(ROOT),real);
  check(inside&&!inside.startsWith('..')&&!isAbsolute(inside)&&(await lstat(path)).isFile()&&!(await lstat(path)).isSymbolicLink(),'Unsafe input path');
  const bytes=await readFile(path);before[path]=digest(bytes);readLog.push({path:relative(ROOT,path).replaceAll('\\','/'),sha256:digest(bytes)});return bytes;
 }
 const receiptBytes=await read(resolve(ROOT,RECEIPT_PATH));check(digest(receiptBytes)===RECEIPT_SHA256,'Different checked receipt');const receipt=json(receiptBytes);
 const authorityBytes=await read(resolve(ROOT,'benchmark/decisions/PETCLINIC_DRAFT_INTEGRATION_2026-10-31.json'));
 const decisionBytes=await read(resolve(ROOT,'benchmark/p03/decisions/INPUT_LOCK_2026-10-31.json'));
 const decision=json(decisionBytes);check(receipt.case==='P03'&&receipt.authority_id==='D20','Wrong case authority');
 check(receipt.authority_sha256===digest(authorityBytes)&&receipt.input_decision_sha256===digest(decisionBytes),'Changed decision bytes');
 const manifest=await read(resolve(run,'SHA256SUMS.txt'));check(digest(manifest)===PINNED_NATIVE_MANIFEST,'New native run needs its own review and explicit pin update');
 const members=new Map();
 for(const line of decoder.decode(manifest).trim().split(/\r?\n/)){const match=/^([0-9a-f]{64})  ([A-Za-z0-9_.@/-]+)$/.exec(line);check(match&&!members.has(match[2]),'Invalid native manifest');members.set(match[2],match[1]);}
 async function native(name){check(members.has(name),'Input not in pinned native manifest');const bytes=await read(resolve(run,name));check(digest(bytes)===members.get(name),'Changed selected native file: '+name);return bytes;}
 const input=json(await native('input/INPUT.json'));nativeMembers(manifest);assertP03Input(input,receipt);
 const FILES=input.snapshots.baseline.map(row=>row.file),seedFile=FILES.find(file=>file.endsWith('/customers/web/OwnerResource.java'));
 check(seedFile,'P03 seed source absent');
 const base={case_id:'P03',repository:'spring-petclinic-microservices',source_commit:input.source_commit,config_commit:receipt.case_inputs.config_commit,seed_id:SEED,seed_file:seedFile,sources:[],patch:null};
 const copiedInputs=[];
 for(const file of FILES){const bytes=await native('input/baseline/'+file);const expected=input.snapshots.baseline.find(row=>row.file===file);check(expected.sha256===digest(bytes),'Baseline source identity differs');base.sources.push({file,text:decoder.decode(bytes),sha256:digest(bytes)});copiedInputs.push({name:'input/baseline/'+file,bytes});}
 const patch=await native('input/proposed.patch');check(digest(patch)===receipt.case_inputs.patch_sha256,'Different proposed patch');base.patch={sha256:digest(patch),text:decoder.decode(patch)};
 const codeIdentity={};for(const file of CODE)codeIdentity[file]=digest(await read(resolve(ROOT,file)));
 const directory=resolve(ROOT,'handoff-out/p03-static-context',new Date().toISOString().replace(/[-:.]/g,'')+'-'+randomUUID().slice(0,8));await mkdir(directory,{recursive:true});
 const packs=[];let failure=null;
 try{
  await write(directory,'AUTHORITY.json',{authority_id:'D20',authority_sha256:digest(authorityBytes),input_decision_sha256:digest(decisionBytes),checked_receipt_sha256:RECEIPT_SHA256,context_only_not_prediction_or_schema_adoption:true,reviewed_native_manifest_sha256:NATIVE_MANIFEST,parser_sha256:PARSER_SHA256});
  for(const item of copiedInputs)await write(directory,item.name,item.bytes);
  await write(directory,'input/proposed.patch',patch);await write(directory,'LICENSE.petclinic',await read(resolve(ROOT,LICENSE_PATH)));
  await write(directory,'input/BASE.json',base);await write(directory,'CODE_IDENTITIES.json',codeIdentity);
  // Prepare the lexical control before any graph artifact is loaded. Its corpus is
  // all six pinned baseline files; the seed file is common mandatory information.
  const lexical=prepareContext(base,{mode:'lexical',depth:null,top_k:2,byte_limit:byteLimit});
  await write(directory,'lexical/selection.json',lexical);if(lexical.context!==null)await write(directory,'lexical/context.txt',lexical.context);packs.push({id:'lexical',pack:lexical});
  const extraction=json(await native('artifacts/baseline/extraction.json'));
  const graphData={graph:json(await native('artifacts/baseline/graph.native.json')),retrieval:json(await native('database/baseline/direct.retrieval.json')),source_map:extraction.native_source_map};
  for(const mode of ['graph','combined'])for(const depth of [1,2,3]){const id=mode+'-h'+depth,pack=prepareContext(base,{mode,depth,top_k:2,byte_limit:byteLimit},graphData);await write(directory,id+'/selection.json',pack);if(pack.context!==null)await write(directory,id+'/context.txt',pack.context);packs.push({id,pack});}
  const left=new Set(lexical.selected_source_files);
  const summary={case_id:'P03',preparation_only:true,experimental_scenarios:1,preview_configurations:packs.length,model_calls:0,embedding_inference:false,official_metrics_computed:false,
   source_commit:base.source_commit,patch_sha256:base.patch.sha256,source_corpus_files:base.sources.length,source_units:'whole baseline files, common corpus; development preview, not adopted final chunking',
   budget:{scope:'whole serialized context preview, not provider/system/schema/output request',byte_limit:byteLimit,token_count:null,official_token_fairness_established:false},
   plans:packs.map(({id,pack})=>({id,status:pack.status,context_bytes:pack.context_bytes??null,context_sha256:pack.context_sha256,selected_source_files:pack.selected_source_files,dropped:pack.dropped_source_files,saved_graph_candidates:pack.saved_graph_candidates??[],retained_graph_candidates:pack.retained_graph_candidates??[],same_source_set_as_lexical:pack.selected_source_files.length===left.size&&pack.selected_source_files.every(file=>left.has(file))})),
   limitations:['BM25 is lexical, not dense/vector retrieval or semantic GraphRAG','No model request, response, impact assessment or scorer output created','Small six-file corpus can yield identical source sets; this is not evidence of retrieval superiority','This checked P03 run has full fresh-DB parity; explicit record getPetIds is missing and nested builder extras do not compensate; no serialization/dataflow or field binding guarantee; breaker false can mean unestablished, not absence','Only baseline code and the proposed provider patch enter the preview; no mutated source, benchmark runtime or labels','Output/experiment contracts and final model/token budget remain unadopted']};
  await write(directory,'SUMMARY.json',summary);if(packs.some(({pack})=>pack.status!=='prepared_no_inference'))throw Error('One or more previews are input_not_packable; artifacts retained');
 }catch(error){failure=error.message;await write(directory,'FAILURE.json',{error:failure,model_calls:0,official_metrics_computed:false});}
 let preserved=true;
 for(const[path,hash]of Object.entries(before))if(digest(await readFile(path))!==hash)preserved=false;
 await write(directory,'READ_INPUTS.json',{files:readLog,integrity_scope:'Selected baseline files/metadata/patch and pinned manifest identity, not a new full native graph audit',mutated_source_or_runtime_or_label_content_read:false,graph_loaded_after_lexical_preparation:true});
 await write(directory,'PRESERVATION.json',{read_inputs_and_code_unchanged:preserved});
 await write(directory,'RESULT.json',{status:failure?'failed':'prepared_no_inference',error:failure,preview_configurations:packs.length,model_calls:0,embedding_inference:false,impact_assessments_created:false,official_scoring:false,shared_contract_adopted:false});
 await seal(directory);check(preserved,'Inputs/code changed during preparation');return{directory,status:failure?'failed':'prepared_no_inference',error:failure,preview_configurations:packs.length,manifest_sha256:digest(await readFile(resolve(directory,'SHA256SUMS.txt')))};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{check((process.argv.length===4||process.argv.length===6)&&process.argv[2]==='--run'&&(process.argv.length===4||process.argv[4]==='--byte-limit'),'Usage: --run P03_NATIVE_RUN [--byte-limit INTEGER]');const result=await prepare(process.argv[3],process.argv.length===6?Number(process.argv[5]):32768);console.log(JSON.stringify(result,null,2));if(result.status==='failed')process.exitCode=1;}
 catch(error){console.error(error.message);process.exitCode=1;}
}
