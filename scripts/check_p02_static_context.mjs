// Independent read-only artifact checks; never prepares context or executes a model.
import { readFile } from 'node:fs/promises';
import { resolve,dirname,relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyManifest } from './run_p03_baseline.mjs';
import { RECEIPT_PATH,RECEIPT_SHA256,FILES,SEEDS } from '../pipeline/p02/offline-method.mjs';
import { createHash } from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PINNED_NATIVE_MANIFEST='ad7fe3ac6536a54315219a44533f73a36a016a1c1f362e4c7026134971c126d4';
const check=(ok,message)=>{if(!ok)throw Error(message);};
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sorted=value=>[...value].sort();
const lineCount=text=>(text.match(/[^\n]*\n|[^\n]+$/g)??[]).length;
export async function inspect(directory){
 directory=resolve(directory);const integrity=await verifyManifest(directory),result=await json(resolve(directory,'RESULT.json')),base=await json(resolve(directory,'input/BASE.json')),authority=await json(resolve(directory,'AUTHORITY.json'));
 check(authority.authority_id==='D20'&&authority.checked_receipt_sha256===RECEIPT_SHA256&&authority.context_only_not_prediction_or_schema_adoption,'Wrong receipt/scope');
 check(base.case_id==='P02'&&base.seed_id===SEEDS.baseline&&base.seed_file===FILES[0]&&equal(sorted(base.sources.map(row=>row.file)),sorted(FILES)),'Different corpus/seed');
 check(sha(await readFile(resolve(directory,'input/proposed.patch')))===base.patch.sha256,'Patch copy differs');
 for(const source of base.sources){const raw=await readFile(resolve(directory,'input/baseline',source.file));check(sha(raw)===source.sha256&&raw.toString('utf8')===source.text,'Baseline source copy differs');}
 const sources=new Map(base.sources.map(row=>[row.file,row])),summary=await json(resolve(directory,'SUMMARY.json'));
 const expected=['lexical','graph-h1','graph-h2','graph-h3','combined-h1','combined-h2','combined-h3'];
 check(equal(summary.plans.map(row=>row.id),expected)&&summary.preview_configurations===7&&summary.experimental_scenarios===1,'Wrong preview plan cardinality');
 check(result.status==='prepared_no_inference'&&result.model_calls===0&&!result.embedding_inference&&!result.impact_assessments_created&&!result.official_scoring&&!result.shared_contract_adopted,'Wrong result scope');
 check((await json(resolve(directory,'PRESERVATION.json'))).read_inputs_and_code_unchanged,'Input preservation failed');
 const reads=await json(resolve(directory,'READ_INPUTS.json'));
 check(!reads.mutated_source_or_runtime_or_label_content_read&&reads.graph_loaded_after_lexical_preparation,'Wrong input read policy');
 check(reads.files.every(row=>!row.path.includes('/input/mutated/')&&!/labels[.\/]|ANNOTATION|notes\/|\/p02-f03\//.test(row.path)),'Annotation/runtime or mutated source in inputs');
 const receiptBytes=await readFile(resolve(ROOT,RECEIPT_PATH));check(sha(receiptBytes)===RECEIPT_SHA256,'Checked receipt changed');const receipt=JSON.parse(receiptBytes);
 const decisionBytes=await readFile(resolve(ROOT,'benchmark/p02/decisions/INPUT_LOCK_2026-10-24.json')),authorityBytes=await readFile(resolve(ROOT,'benchmark/decisions/PETCLINIC_DRAFT_INTEGRATION_2026-10-31.json'));
 check(sha(decisionBytes)===receipt.input_decision_sha256&&sha(authorityBytes)===receipt.authority_sha256&&authority.input_decision_sha256===receipt.input_decision_sha256&&authority.authority_sha256===receipt.authority_sha256,'Unbound authority/decision');
 check(base.source_commit===receipt.case_inputs.source_commit&&base.config_commit===receipt.case_inputs.config_commit&&base.patch.sha256===receipt.case_inputs.patch_sha256,'Baseline/patch not bound to checked input');
 const manifestRow=reads.files.find(row=>/p02-offline-method\/.+\/SHA256SUMS\.txt$/.test(row.path));check(manifestRow,'Missing native manifest provenance');
 const nativeRoot=dirname(resolve(ROOT,manifestRow.path)),nativeRelative=relative(resolve(ROOT,'handoff-out/p02-offline-method'),nativeRoot);check(nativeRelative&&!nativeRelative.startsWith('..')&&!/[/\\:]/.test(nativeRelative),'Native provenance outside expected workspace');
 const manifest=await readFile(resolve(nativeRoot,'SHA256SUMS.txt'));check(sha(manifest)===PINNED_NATIVE_MANIFEST&&manifestRow.sha256===PINNED_NATIVE_MANIFEST,'Different reviewed native run');
 const members=new Map(manifest.toString('utf8').trim().split(/\r?\n/).map(line=>{const parts=line.split('  ');return[parts[1],parts[0]];}));
 for(const source of base.sources){const original=await readFile(resolve(nativeRoot,'input/baseline',source.file));check(sha(original)===members.get('input/baseline/'+source.file)&&original.toString('utf8')===source.text&&sha(original)===source.sha256,'Baseline source differs from pinned native run');}
 const graphRow=reads.files.find(row=>row.path.endsWith('/artifacts/baseline/graph.native.json'));
 const retrievalRow=reads.files.find(row=>row.path.endsWith('/database/baseline/direct.retrieval.json'));
 check(graphRow&&retrievalRow,'Missing baseline graph provenance');
 check(resolve(ROOT,graphRow.path)===resolve(nativeRoot,'artifacts/baseline/graph.native.json')&&resolve(ROOT,retrievalRow.path)===resolve(nativeRoot,'database/baseline/direct.retrieval.json'),'Graph provenance outside reviewed native run');
 const graphRaw=await readFile(resolve(ROOT,graphRow.path)),retrievalRaw=await readFile(resolve(ROOT,retrievalRow.path));
 check(sha(graphRaw)===graphRow.sha256&&sha(retrievalRaw)===retrievalRow.sha256&&sha(graphRaw)===members.get('artifacts/baseline/graph.native.json')&&sha(retrievalRaw)===members.get('database/baseline/direct.retrieval.json'),'Baseline graph provenance changed');
 const graph=JSON.parse(graphRaw),retrieval=JSON.parse(retrievalRaw),nodes=new Map(graph.nodes.map(row=>[row.id,row]));
 const groups=[];
 for(const id of expected){
  const pack=await json(resolve(directory,id,'selection.json')),text=await readFile(resolve(directory,id,'context.txt'),'utf8'),payload=JSON.parse(text),listed=summary.plans.find(row=>row.id===id);
  check(pack.status==='prepared_no_inference'&&pack.context===text&&sha(Buffer.from(text))===pack.context_sha256&&listed.context_sha256===pack.context_sha256,'Changed context text/hash');
  check(Buffer.byteLength(text)===pack.context_bytes&&pack.context_bytes<=pack.budget.byte_limit&&pack.budget.provider_token_count===null&&!pack.budget.full_provider_request&&!pack.budget.official_token_fairness_established,'Wrong preview budget/measurement');
  check(pack.query===base.seed_id+'\n'+base.patch.text&&sha(Buffer.from(pack.query))===pack.query_sha256,'Query not derived from seed and patch');
  check(payload.source_commit===base.source_commit&&payload.known_seed.method_id===base.seed_id&&payload.known_seed.file===base.seed_file&&payload.proposed_patch.text===base.patch.text&&payload.proposed_patch.sha256===base.patch.sha256,'Mandatory source/patch identity differs');
  check(payload.source_evidence.length===pack.selected_source_files.length&&pack.selected_source_files[0]===base.seed_file&&new Set(pack.selected_source_files).size===pack.selected_source_files.length,'Selected/mandatory source mismatch');
  for(const row of payload.source_evidence){const original=sources.get(row.file);check(original&&row.snapshot==='baseline'&&row.text===original.text&&row.source_sha256===original.sha256&&sha(Buffer.from(row.text))===row.source_sha256&&row.line_start===1&&row.line_end===lineCount(row.text),'Bad source evidence/span');}
  check(equal(sorted([...pack.selected_source_files,...pack.dropped_source_files.map(row=>row.file)]),sorted([...sources.keys()])),'Dropped source vanished from ledger');
  if(id==='lexical')check(!Object.hasOwn(payload,'static_graph')&&!pack.graph_used&&pack.depth===null,'Graph data leaked into lexical control');
  else{
   const saved=retrieval.plans.find(row=>row.depth_limit===pack.depth),visible=payload.static_graph.paths;
   check(payload.static_graph.snapshot==='baseline'&&equal(pack.saved_graph_candidates,saved.paths.map(row=>row.id)),'Wrong saved depth/candidates');
   for(const row of visible){
    check(row.id!==base.seed_id&&saved.paths.some(path=>path.id===row.id&&equal(path.witness_ids,row.witness_ids)&&equal(path.relation_types,row.relation_types)&&path.logical_hop===row.logical_hop),'Unbound witness/seed');
    check(row.witness_ids.every(method=>pack.selected_source_files.includes(nodes.get(method)?.file)),'Witness references source omitted from context');
   }
   const expectedEdges=graph.edges.filter(edge=>visible.some(path=>path.witness_ids.some((method,i)=>method===edge.source_id&&path.witness_ids[i+1]===edge.target_id&&path.relation_types[i]===edge.type)));
   check(equal(payload.static_graph.edges,expectedEdges)&&payload.static_graph.resolver_assumptions_retained===true,'Native edge assumptions/evidence lost or altered');
   const visibleIds=new Set(visible.flatMap(row=>row.witness_ids));visibleIds.add(base.seed_id);
   check(equal(payload.static_graph.endpoints,graph.endpoints.filter(row=>visibleIds.has(row.handler_id)))&&equal(payload.static_graph.unresolved,graph.unresolved.filter(row=>pack.selected_source_files.includes(row.file))),'Native endpoint/unresolved metadata lost or altered');
  }
  check(!pack.impact_assessments_created&&!pack.official_metrics_computed&&pack.model_calls===0&&!pack.embedding_inference,'Prediction/model scope widened');
  groups.push({id,context_bytes:pack.context_bytes,source_files:pack.selected_source_files.length,candidate_methods:pack.saved_graph_candidates.length});
 }
 return{...integrity,scope:'Static source-context preparation integrity, not prediction accuracy or token fairness',plans:groups,model_calls:0,official_metrics_computed:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{check(process.argv.length===4&&process.argv[2]==='--run','Usage: --run PREPARED_P02_CONTEXT_DIRECTORY');console.log(JSON.stringify(await inspect(process.argv[3]),null,2));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
