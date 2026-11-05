import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceSpan, digest, validateSnapshot, embeddedScript, assertAuditedRun } from './view-model.mjs';

function fixture(){
 const text='class Example {\n  void seed() {}\n  void caller() { seed(); }\n}\n',file='Example.java';
 const source={file,text,sha256:digest(Buffer.from(text))};
 const chunk={file,line_start:3,line_end:3,source_sha256:source.sha256,excerpt:text.split('\n')[2]+'\n'};chunk.excerpt_sha256=digest(Buffer.from(chunk.excerpt));
 const path={id:'caller',logical_hop:1,witness_ids:['caller','seed'],relation_types:['CALLS']};
 return{seed:'seed',sources:[source],graph:{metadata:{snapshot_kind:'baseline'},nodes:[{id:'seed',file,line_start:2,line_end:2},{id:'caller',file,line_start:3,line_end:3}],edges:[{source_id:'caller',target_id:'seed',type:'CALLS',resolution_status:'RESOLVED'}],unresolved:[]},
 retrieval:{snapshot:'baseline',graph_reachability_only:true,embedding_or_model_inference:false,score_computed:false,plans:[1,2,3].map(depth_limit=>({depth_limit,parameters:{seed:'seed'},not_an_impact_label:true,paths:[structuredClone(path)],chunks:[structuredClone(chunk)]}))},parity:{snapshot:'baseline',full_node_property_parity:false}};
}
test('source span preserves UTF-8 and CRLF; unbound file/range cannot be shown as evidence',()=>{
 const text='// dấu\r\nvoid x() {}\r\n',sources=[{file:'x.java',text}];
 assert.equal(sourceSpan(sources,'x.java',1,2).excerpt,text);
 for(const args of [['../x.java',1,1],['x.java',0,1],['x.java',1,9],['x.java',2,1]])assert.throws(()=>sourceSpan(sources,...args));
});
test('saved graph witness and source excerpt validate without turning incomplete full-property parity into a pass',()=>{
 const data=fixture();assert.equal(validateSnapshot(data,'baseline'),true);assert.equal(data.parity.full_node_property_parity,false);
});
test('mixed snapshots and baseline seed reused for a changed signature are refused',()=>{
 let data=fixture();data.retrieval.snapshot='mutated';assert.throws(()=>validateSnapshot(data,'baseline'),/Mixed/);
 data=fixture();data.seed='seed(boolean)';assert.throws(()=>validateSnapshot(data,'baseline'),/seed/);
});
test('source mutation or retrieved excerpt mutation fails even when readable source exists',()=>{
 let data=fixture();data.sources[0].text=data.sources[0].text.replace('seed();','other();');assert.throws(()=>validateSnapshot(data,'baseline'),/bytes/);
 data=fixture();data.retrieval.plans[0].chunks[0].excerpt='invented';assert.throws(()=>validateSnapshot(data,'baseline'),/differs/);
});
test('a witness cannot manufacture an edge, include the seed as a candidate, or duplicate a Method ID',()=>{
 let data=fixture();data.graph.edges=[];assert.throws(()=>validateSnapshot(data,'baseline'),/edge/);
 data=fixture();data.retrieval.plans[0].paths[0].id='seed';assert.throws(()=>validateSnapshot(data,'baseline'),/witness/);
 data=fixture();data.graph.nodes.push({...data.graph.nodes[0]});assert.throws(()=>validateSnapshot(data,'baseline'),/duplicate seed/);
});
test('model/scoring results cannot be relabeled as graph-only saved retrieval',()=>{
 for(const field of ['embedding_or_model_inference','score_computed']){const data=fixture();data.retrieval[field]=true;assert.throws(()=>validateSnapshot(data,'baseline'),/graph-only/);}
});
test('source script/HTML injection stays encoded, including replacement tokens and Unicode',()=>{
 const payload={source:'</script><img src=x onerror=alert(1)> $& $` ${secret} \u2028 tiếng Việt'};
 const output=embeddedScript(payload,'window.ready=true;');assert.ok(!output.includes(payload.source));
 const encoded=output.match(/atob\('([^']+)'\)/)[1];assert.deepEqual(JSON.parse(Buffer.from(encoded,'base64').toString('utf8')),payload);
 assert.ok(!output.includes('</script>'));
});
test('a new run manifest cannot silently inherit the previously reviewed run identity',()=>{
 assert.throws(()=>assertAuditedRun(Buffer.from('different manifest'),{}),/review a new run/);
});
