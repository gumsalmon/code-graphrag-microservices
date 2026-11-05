import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareContext,rankBm25,digest,canonical } from './static-context.mjs';

const options=(mode='lexical',depth=null,byte_limit=32768)=>({mode,depth,top_k:2,byte_limit});
function fixture(){
 const sources=[
  {file:'provider/Provider.java',text:'class Provider {\n void read() {}\n}\n'},
  {file:'gateway/Client.java',text:'class Client {\n void load() { provider.read(); }\n}\n'},
  {file:'gateway/Gateway.java',text:'class Gateway {\n void owner() { client.load(); }\n}\n'},
  {file:'misc/Other.java',text:'class Other { String cobalt; }\n'}
 ].map(source=>({...source,sha256:digest(Buffer.from(source.text))}));
 const seed='provider::Provider#read()',client='gateway::Client#load()',gateway='gateway::Gateway#owner()';
 const patchText='@@ proposed provider declaration @@\n+ optional cobalt parameter\n';
 const base={case_id:'P02',repository:'toy-context-fixture',source_commit:'a'.repeat(40),config_commit:'b'.repeat(40),seed_id:seed,seed_file:sources[0].file,sources,patch:{text:patchText,sha256:digest(Buffer.from(patchText))}};
 const graph={metadata:{snapshot_kind:'baseline',commit_sha:base.source_commit,repository:base.repository},nodes:[
  {id:seed,file:sources[0].file,line_start:2,line_end:2,service:'provider'},
  {id:client,file:sources[1].file,line_start:2,line_end:2,service:'gateway'},
  {id:gateway,file:sources[2].file,line_start:2,line_end:2,service:'gateway'}],
 edges:[{source_id:client,target_id:seed,type:'INVOKES_API',resolution_status:'RESOLVED'},{source_id:gateway,target_id:client,type:'CALLS',resolution_status:'RESOLVED'}],
 endpoints:[{handler_id:seed,http_method:'GET',normalized_path:'/items',query_parameters:[]}],
 unresolved:[{file:sources[1].file,line_start:2,line_end:2,expression:'configuration override',reason:'outside resolved scope'}]};
 const one={id:client,logical_hop:1,witness_ids:[client,seed],relation_types:['INVOKES_API']},two={id:gateway,logical_hop:2,witness_ids:[gateway,client,seed],relation_types:['CALLS','INVOKES_API']};
 const retrieval={snapshot:'baseline',graph_reachability_only:true,embedding_or_model_inference:false,score_computed:false,
  plans:[1,2,3].map(depth_limit=>({depth_limit,parameters:{seed},not_an_impact_label:true,paths:depth_limit===1?[one]:[one,two],chunks:graph.nodes.map(node=>{const source=sources.find(row=>row.file===node.file),excerpt=source.text.split('\n')[1]+'\n';return{file:node.file,line_start:2,line_end:2,source_sha256:source.sha256,excerpt,excerpt_sha256:digest(Buffer.from(excerpt))};})}))};
 return{base,data:{graph,retrieval}};
}

test('BM25 handles camelCase/Unicode, omits zero matches and breaks ties by stable file identity',()=>{
 const docs=[{file:'b.java',text:'điều kiện readOwner'},{file:'a.java',text:'điều kiện readOwner'},{file:'none.java',text:'unrelated'}];
 const ranked=rankBm25(docs,'Điều readOwner');assert.deepEqual(ranked.map(row=>row.file),['a.java','b.java']);assert.ok(ranked.every(row=>Number.isFinite(row.bm25_score)&&row.bm25_score>0));assert.deepEqual(rankBm25([...docs].reverse(),'Điều readOwner'),ranked);
});
test('lexical route never touches a supplied graph and uses the entire common source corpus',()=>{
 const {base}=fixture(),unreadable=new Proxy({},{get(){throw Error('Graph was inspected');}});
 const pack=prepareContext(base,options(),unreadable);assert.equal(pack.graph_used,false);assert.equal(pack.lexical_ranker_reads_graph,false);assert.equal(pack.corpus.length,4);assert.equal(Object.hasOwn(JSON.parse(pack.context),'static_graph'),false);
 assert.ok(pack.lexical_ranking.some(row=>row.file==='misc/Other.java'),'Source outside graph remains eligible for lexical retrieval');
});
test('graph depth uses saved native witnesses, preserves boundary counts and never returns seed as a candidate',()=>{
 const {base,data}=fixture(),one=prepareContext(base,options('graph',1),data),two=prepareContext(base,options('graph',2),data);
 assert.equal(one.saved_graph_candidates.length,1);assert.equal(two.saved_graph_candidates.length,2);assert.ok(!two.saved_graph_candidates.includes(base.seed_id));
 assert.deepEqual(JSON.parse(two.context).static_graph.paths.map(row=>row.service_boundary_crossings),[1,1]);assert.equal(two.lexical_ranking.length,0);
});
test('graph context retains the edge assumptions and evidence, rather than presenting resolution as an unconditional fact',()=>{
 const {base,data}=fixture();data.graph.edges[0].assumptions=['Default hostname only; a setter may override the target'];data.graph.edges[0].evidence=[{file:'gateway/Client.java',line_start:2,line_end:2,expression:'provider.read()'}];
 const graph=JSON.parse(prepareContext(base,options('graph',1),data).context).static_graph;
 assert.ok(Array.isArray(graph.edges));assert.deepEqual(graph.edges[0].assumptions,data.graph.edges[0].assumptions);assert.deepEqual(graph.edges[0].evidence,data.graph.edges[0].evidence);
});
test('mandatory seed/patch overflow produces a failure record instead of silently dropping either',()=>{
 const {base}=fixture(),pack=prepareContext(base,options('lexical',null,0));assert.equal(pack.status,'input_not_packable');assert.equal(pack.context,null);assert.equal(pack.context_sha256,null);assert.ok(pack.required_mandatory_bytes>0);assert.equal(pack.mandatory_inputs_silently_removed,false);assert.equal(pack.model_calls,0);
});
test('packing accounts for all serialized preview metadata and omits paths with dropped witness source',()=>{
 const {base,data}=fixture(),required=prepareContext(base,options('graph',2,0),data).required_mandatory_bytes;
 const pack=prepareContext(base,options('graph',2,required),data);assert.equal(pack.status,'prepared_no_inference');assert.equal(pack.context_bytes,Buffer.byteLength(pack.context));assert.equal(pack.context_bytes,required);
 assert.deepEqual(pack.selected_source_files,[base.seed_file]);assert.equal(JSON.parse(pack.context).static_graph.paths.length,0);assert.equal(pack.graph_paths_omitted_for_missing_context_source.length,2);assert.ok(pack.dropped_source_files.some(row=>row.reason==='preview_byte_limit'));
});
test('source and patch changes without matching identities are refused',()=>{
 let {base}=fixture();base.sources[0].text+='changed';assert.throws(()=>prepareContext(base,options()),/SOURCE_HASH/);
 ({base}=fixture());base.patch.text+='changed';assert.throws(()=>prepareContext(base,options()),/PATCH_HASH/);
});
test('mutated graph, wrong seed and invented native edge cannot enter baseline context',()=>{
 let {base,data}=fixture();data.graph.metadata.snapshot_kind='mutated';assert.throws(()=>prepareContext(base,options('graph',1),data),/BASELINE_GRAPH_ONLY/);
 ({base,data}=fixture());data.retrieval.plans[0].parameters.seed='other';assert.throws(()=>prepareContext(base,options('graph',1),data),/PLAN_SEED/);
 ({base,data}=fixture());data.graph.edges=[];assert.throws(()=>prepareContext(base,options('graph',1),data),/WITNESS_EDGE/);
});
test('retrieved source is checked by byte span/hash and unresolved metadata remains visible only with selected source',()=>{
 let {base,data}=fixture();let pack=prepareContext(base,options('graph',1),data);assert.equal(JSON.parse(pack.context).static_graph.unresolved.length,1);
 data.retrieval.plans[0].chunks[0].excerpt='invented';assert.throws(()=>prepareContext(base,options('graph',1),data),/SAVED_CHUNK_BYTES/);
});
test('source Unicode/CRLF round trips as data, while token counts and provider requests remain explicitly unmeasured',()=>{
 const {base}=fixture();base.sources[0].text=base.sources[0].text.replaceAll('\n','\r\n')+'// điều kiện\r\n';base.sources[0].sha256=digest(Buffer.from(base.sources[0].text));
 const pack=prepareContext(base,options()),payload=JSON.parse(pack.context);assert.equal(payload.source_evidence.find(row=>row.file===base.seed_file).text,base.sources[0].text);
 assert.equal(pack.budget.provider_token_count,null);assert.equal(pack.budget.full_provider_request,false);assert.equal(pack.budget.official_token_fairness_established,false);assert.equal(pack.embedding_inference,false);
});
test('repeat preparation is deterministic and does not mutate source, patch or native artifacts',()=>{
 const {base,data}=fixture(),before=canonical({base,data});
 for(const mode of ['lexical','graph','combined']){const opts=options(mode,mode==='lexical'?null:2);assert.equal(canonical(prepareContext(base,opts,data)),canonical(prepareContext(base,opts,data)));}
 assert.equal(canonical({base,data}),before);
});
test('unexpected label fields, duplicate source paths and invalid depth fail closed',()=>{
 let {base}=fixture();base.labels=[];assert.throws(()=>prepareContext(base,options()),/BASE_FIELDS/);
 ({base}=fixture());base.sources.push({...base.sources[0]});assert.throws(()=>prepareContext(base,options()),/SOURCE_FILE/);
 ({base}=fixture());assert.throws(()=>prepareContext(base,options('lexical',1)),/DEPTH/);
});
