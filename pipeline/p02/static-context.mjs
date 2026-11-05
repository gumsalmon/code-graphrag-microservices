// Context preparation only: no provider request, impact assessments, labels or scoring.
import { createHash } from 'node:crypto';
export const PREPARER_ID='p02-static-source-context/1';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>compare(a,b))):item);
const compare=(a,b)=>a<b?-1:a>b?1:0;
const check=(ok,code)=>{if(!ok)throw new Error(code);};
const bytes=text=>Buffer.byteLength(text,'utf8');
const lines=text=>text.match(/[^\n]*\n|[^\n]+$/g)??[];
const safeFile=name=>typeof name==='string'&&name&&!name.startsWith('/')&&!name.includes('\\')&&!name.includes(':')&&name.split('/').every(p=>p&&p!=='.'&&p!=='..');
export const tokenize=text=>text.replace(/([a-z\d])([A-Z])/g,'$1 $2').toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];

export function rankBm25(documents,query){
 check(documents.length>0&&documents.length<=1000,'CORPUS_BOUNDS');
 const terms=[...new Set(tokenize(query))],rows=documents.map(doc=>{const tokens=tokenize(doc.text),counts=new Map();for(const token of tokens)counts.set(token,(counts.get(token)??0)+1);return{doc,counts,length:tokens.length};});
 const average=rows.reduce((sum,row)=>sum+row.length,0)/rows.length||1,k1=1.2,b=0.75;
 const df=new Map(terms.map(term=>[term,rows.filter(row=>row.counts.has(term)).length]));
 return rows.map(row=>({file:row.doc.file,bm25_score:terms.reduce((score,term)=>{const tf=row.counts.get(term)??0;return score+(tf?Math.log(1+(rows.length-df.get(term)+0.5)/(df.get(term)+0.5))*tf*(k1+1)/(tf+k1*(1-b+b*row.length/average)):0);},0)}))
  .filter(row=>row.bm25_score>0).sort((a,b)=>b.bm25_score-a.bm25_score||compare(a.file,b.file));
}

function validateBase(base){
 const allowed=['case_id','repository','source_commit','config_commit','seed_id','seed_file','sources','patch'];
 check(base&&Object.keys(base).length===allowed.length&&allowed.every(key=>Object.hasOwn(base,key)),'BASE_FIELDS');
 check(base.case_id==='P02'&&typeof base.repository==='string'&&typeof base.seed_id==='string'&&/^[0-9a-f]{40}$/.test(base.source_commit)&&/^[0-9a-f]{40}$/.test(base.config_commit),'INPUT_IDENTITY');
 check(Array.isArray(base.sources)&&base.sources.length>0&&base.sources.length<=1000,'SOURCES');
 const sourceByFile=new Map();
 for(const source of base.sources){
  check(Object.keys(source).sort().join('|')==='file|sha256|text'&&safeFile(source.file)&&!sourceByFile.has(source.file),'SOURCE_FILE');
  check(typeof source.text==='string'&&source.text.length>0&&source.text.length<=1024*1024&&digest(Buffer.from(source.text))===source.sha256,'SOURCE_HASH');
  sourceByFile.set(source.file,source);
 }
 check(sourceByFile.has(base.seed_file),'SEED_SOURCE');
 check(base.patch&&Object.keys(base.patch).sort().join('|')==='sha256|text'&&typeof base.patch.text==='string'&&base.patch.text.length>0&&digest(Buffer.from(base.patch.text))===base.patch.sha256,'PATCH_HASH');
 return sourceByFile;
}

function graphPlan(base,data,depth,sourceByFile){
 const {graph,retrieval}=data;
 check(graph.metadata.snapshot_kind==='baseline'&&graph.metadata.commit_sha===base.source_commit&&graph.metadata.repository===base.repository&&retrieval.snapshot==='baseline','BASELINE_GRAPH_ONLY');
 check(retrieval.graph_reachability_only===true&&retrieval.embedding_or_model_inference===false&&retrieval.score_computed===false,'SAVED_RETRIEVAL_SCOPE');
 const nodes=new Map();
 for(const node of graph.nodes){
  check(!nodes.has(node.id)&&sourceByFile.has(node.file),'NATIVE_NODE_BINDING');
  check(Number.isInteger(node.line_start)&&Number.isInteger(node.line_end)&&node.line_start>=1&&node.line_end>=node.line_start&&node.line_end<=lines(sourceByFile.get(node.file).text).length,'NATIVE_SOURCE_SPAN');
  nodes.set(node.id,node);
 }
 check(nodes.get(base.seed_id)?.file===base.seed_file,'GRAPH_SEED_BINDING');
 const matches=retrieval.plans.filter(plan=>plan.depth_limit===depth);check(matches.length===1,'SAVED_DEPTH_PLAN');const plan=matches[0];
 check(plan.parameters.seed===base.seed_id&&plan.not_an_impact_label===true,'PLAN_SEED_SCOPE');
 for(const row of plan.paths){
  check(row.id!==base.seed_id&&row.witness_ids[0]===row.id&&row.witness_ids.at(-1)===base.seed_id&&row.logical_hop===row.witness_ids.length-1&&row.logical_hop<=depth&&row.logical_hop>=1&&row.relation_types.length===row.logical_hop&&new Set(row.witness_ids).size===row.witness_ids.length,'WITNESS');
  check(row.witness_ids.every(id=>nodes.has(id)),'WITNESS_NODE');
  for(let i=0;i<row.logical_hop;i++)check(graph.edges.some(edge=>edge.source_id===row.witness_ids[i]&&edge.target_id===row.witness_ids[i+1]&&edge.type===row.relation_types[i]&&['CALLS','INVOKES_API'].includes(edge.type)&&edge.resolution_status==='RESOLVED'),'WITNESS_EDGE');
 }
 for(const chunk of plan.chunks){
  const source=sourceByFile.get(chunk.file);check(source&&chunk.source_sha256===source.sha256&&Number.isInteger(chunk.line_start)&&Number.isInteger(chunk.line_end)&&chunk.line_start>=1&&chunk.line_end>=chunk.line_start&&chunk.line_end<=lines(source.text).length,'SAVED_CHUNK_BINDING');
  const excerpt=lines(source.text).slice(chunk.line_start-1,chunk.line_end).join('');check(excerpt===chunk.excerpt&&digest(Buffer.from(excerpt))===chunk.excerpt_sha256,'SAVED_CHUNK_BYTES');
 }
 const byFile=new Map();
 for(const path of plan.paths){const file=nodes.get(path.id).file;if(file===base.seed_file)continue;const current=byFile.get(file);if(!current||path.logical_hop<current.logical_hop)byFile.set(file,{file,logical_hop:path.logical_hop});}
 return{graph,plan,nodes,candidates:[...byFile.values()].sort((a,b)=>a.logical_hop-b.logical_hop||compare(a.file,b.file))};
}

// Whole source files are common units for both routes in this small, scoped preview.
// No graph-selected chunk pool is used to index/rank the lexical control.
export function prepareContext(base,options,graphData){
 const sourceByFile=validateBase(base);
 check(options&&Object.keys(options).sort().join('|')==='byte_limit|depth|mode|top_k','OPTION_FIELDS');
 check(['lexical','graph','combined'].includes(options.mode)&&Number.isSafeInteger(options.byte_limit)&&options.byte_limit>=0&&Number.isInteger(options.top_k)&&options.top_k>0&&options.top_k<=100,'OPTION_BOUNDS');
 check(options.mode==='lexical'?options.depth===null:Number.isInteger(options.depth)&&options.depth>=1&&options.depth<=3,'DEPTH');
 const query=base.seed_id+'\n'+base.patch.text;
 const lexical=options.mode==='graph'?[]:rankBm25(base.sources,query);
 // Keep graphData completely unread in lexical mode (including getters/proxies).
 const graph=options.mode==='lexical'?null:graphPlan(base,graphData,options.depth,sourceByFile);
 const lexicalFiles=lexical.filter(row=>row.file!==base.seed_file).slice(0,options.top_k).map(row=>row.file);
 const graphFiles=(graph?.candidates??[]).slice(0,options.top_k).map(row=>row.file);
 const ordered=[...new Set([...graphFiles,...lexicalFiles])];
 const evidenceId=file=>'SOURCE-'+(base.sources.map(s=>s.file).sort(compare).indexOf(file)+1);
 function payload(selected){
  const data={purpose:'static_context_preparation_only_no_inference_or_impact_assessment',repository:base.repository,source_commit:base.source_commit,config_commit:base.config_commit,
   known_seed:{method_id:base.seed_id,file:base.seed_file},proposed_patch:{evidence_id:'PROPOSED-PATCH',sha256:base.patch.sha256,text:base.patch.text},
   source_evidence:selected.map(file=>{const source=sourceByFile.get(file);return{evidence_id:evidenceId(file),snapshot:'baseline',file,line_start:1,line_end:lines(source.text).length,source_sha256:source.sha256,text:source.text};})};
  if(graph){
   const included=new Set(selected),paths=graph.plan.paths.filter(row=>row.witness_ids.every(id=>included.has(graph.nodes.get(id).file))),witnessIds=new Set(paths.flatMap(row=>row.witness_ids));witnessIds.add(base.seed_id);
   const endpoints=graph.graph.endpoints.filter(row=>witnessIds.has(row.handler_id));
   const edges=graph.graph.edges.filter(edge=>paths.some(path=>path.witness_ids.some((id,i)=>id===edge.source_id&&path.witness_ids[i+1]===edge.target_id&&path.relation_types[i]===edge.type)));
   data.static_graph={meaning:'saved_native_reachability_and_metadata_not_behavioral_impact',snapshot:'baseline',depth_limit:options.depth,
    paths:paths.map(row=>({...row,service_boundary_crossings:row.witness_ids.slice(0,-1).reduce((n,id,i)=>n+Number(graph.nodes.get(id).service!==graph.nodes.get(row.witness_ids[i+1]).service),0)})),
    edges,endpoints,unresolved:graph.graph.unresolved.filter(row=>included.has(row.file)),resolver_assumptions_retained:true};
  }
  return data;
 }
 const render=selected=>JSON.stringify(payload(selected),null,2)+'\n';
 const selected=[base.seed_file],dropped=[];let text=render(selected);
 const policy={scope:'entire_serialized_preview_including_seed_patch_sources_and_route_metadata',byte_limit:options.byte_limit,full_provider_request:false,provider_token_count:null,official_token_fairness_established:false};
 const common={schema:'p02-static-source-context/1',preparer_id:PREPARER_ID,case_id:'P02',mode:options.mode,depth:options.depth,
  corpus:base.sources.map(source=>({file:source.file,sha256:source.sha256})).sort((a,b)=>compare(a.file,b.file)),query,query_sha256:digest(Buffer.from(query)),
  patch_sha256:base.patch.sha256,known_seed:base.seed_id,chunk_policy:'whole-baseline-source-file/preview.1',top_k_per_route:options.top_k,
  budget:policy,lexical_ranking:lexical,lexical_settings:options.mode==='graph'?null:{algorithm:'BM25',k1:1.2,b:0.75,tokenizer:'unicode-camel-words/1'},
  lexical_ranker_reads_graph:false,graph_used:options.mode!=='lexical',impact_assessments_created:false,official_metrics_computed:false,model_calls:0,embedding_inference:false};
 if(bytes(text)>options.byte_limit)return{...common,status:'input_not_packable',required_mandatory_bytes:bytes(text),selected_source_files:[],dropped_source_files:[],context:null,context_sha256:null,mandatory_inputs_silently_removed:false};
 for(const file of ordered){const next=render([...selected,file]);if(bytes(next)<=options.byte_limit){selected.push(file);text=next;}else dropped.push({file,reason:'preview_byte_limit'});}
 for(const source of base.sources)if(!selected.includes(source.file)&&!dropped.some(row=>row.file===source.file))dropped.push({file:source.file,reason:'not_selected_by_route_or_top_k'});
 const retainedGraph=payload(selected).static_graph;
 return{...common,status:'prepared_no_inference',selected_source_files:selected,dropped_source_files:dropped,
  context_bytes:bytes(text),context:text,context_sha256:digest(Buffer.from(text)),
  saved_graph_candidates:graph?.plan.paths.map(row=>row.id)??[],retained_graph_candidates:retainedGraph?.paths.map(row=>row.id)??[],
  graph_paths_omitted_for_missing_context_source:(graph?.plan.paths??[]).filter(row=>!retainedGraph.paths.some(path=>canonical(path.witness_ids)===canonical(row.witness_ids))).map(row=>({id:row.id,reason:'one_or_more_witness_source_files_not_packed'})),
  mandatory_seed_source_and_patch_retained:true};
}
