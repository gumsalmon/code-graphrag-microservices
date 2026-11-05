// Read-only structural/provenance audit; no label reading, graph execution or scoring.
import { readFile } from 'node:fs/promises';
import { resolve,basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyManifest } from './run_p03_baseline.mjs';
import { json } from './run_p02_f03.mjs';
import { sha256,canonical,ensure } from '../pipeline/p03/preparation.mjs';
import { RECEIPT_SHA256,SEEDS,LABEL,NEO4J_IMAGE } from '../pipeline/p02/offline-method.mjs';

export async function audit(directory){
 directory=resolve(directory);const integrity=await verifyManifest(directory),owner=basename(directory);
 ensure((await json(resolve(directory,'CLEANUP.json'))).complete&&(await json(resolve(directory,'PRESERVATION.json'))).input_and_implementation_unchanged,'Incomplete cleanup/preservation');
 const result=await json(resolve(directory,'RESULT.json'));
 ensure(canonical(result.snapshots_completed)===canonical(['baseline','mutated'])&&result.receipt_sha256===RECEIPT_SHA256&&!result.model_calls&&!result.scoring_performed,'Wrong completion state');
 const profile=await json(resolve(directory,'tooling/tasks/hien-next/P02_REVIEWED_IMPLEMENTATION_2026-11-02.json'));
 ensure(sha256(await readFile(resolve(directory,'tooling/tasks/hien-next/P02_REVIEWED_IMPLEMENTATION_2026-11-02.json')))==='c1f8aed32565e50512f4cdea32742892b0ae2ea3db4a2177846c69fef88051a0','Reviewed profile differs');
 const provenance=await json(resolve(directory,'INPUT_PROVENANCE.json'));ensure(canonical(provenance.implementation)===canonical(profile.candidate_implementation),'Different reviewed candidate');
 for(const [name,expected]of [['parser.py',profile.candidate_implementation.parser],['neo4j_importer.py',profile.candidate_implementation.importer]])ensure(sha256(await readFile(resolve(directory,'implementation/src',name)))===expected,'Candidate code changed');
 const input=await json(resolve(directory,'input/INPUT.json'));ensure(input.receipt_sha256===RECEIPT_SHA256&&!input.label_or_annotation_notes_paths_included,'Wrong input policy');
 ensure(sha256(await readFile(resolve(directory,'input/receipt.json')))===RECEIPT_SHA256,'Changed receipt');
 for(const [name,hash]of Object.entries(await json(resolve(directory,'input-hashes-before.json'))))ensure(sha256(await readFile(resolve(directory,'input',name)))===hash,'Copied source/metadata changed');
 for(const [name,hash]of Object.entries(await json(resolve(directory,'implementation-hashes-before.json'))))ensure(sha256(await readFile(resolve(directory,'implementation',name)))===hash,'Implementation changed');
 const network=(await json(resolve(directory,'network-identity.stdout.log')))[0];
 ensure(network.Internal&&network.Labels[LABEL]===owner,'Wrong internal network');
 const universePath=resolve('handoff-out/p02-input-revision/20261018T065307839Z-719da955/draft/evaluation_universe.draft.v2.json');
 const universeBytes=await readFile(universePath),receipt=await json(resolve(directory,'input/receipt.json'));
 ensure(sha256(universeBytes)===receipt.case_inputs.universe_sha256,'Different structural census');
 const universe=JSON.parse(universeBytes),eligible=universe.eligible_entities.filter(r=>r.level==='method').map(r=>r.entity_id);
 const dbIds=new Set(),groups=[];
 for(const snapshot of ['baseline','mutated']){
  const base=resolve(directory,'artifacts',snapshot),db=resolve(directory,'database',snapshot);
  const extracted=await json(resolve(base,'extraction.json')),graph=await json(resolve(base,'graph.native.json'));
  ensure(extracted.seed_id===SEEDS[snapshot]&&graph.nodes.filter(n=>n.id===SEEDS[snapshot]).length===1,'Wrong snapshot seed');
  const endpoint=graph.endpoints.filter(e=>e.handler_id===SEEDS[snapshot]);
  ensure(endpoint.length===1&&endpoint[0].http_method==='GET'&&endpoint[0].normalized_path==='/pets/visits','Wrong seed endpoint');
  const optional=endpoint[0].query_parameters.filter(p=>p.name==='includeDetails');
  if(snapshot==='baseline')ensure(optional.length===0,'Unexpected baseline declaration');
  else ensure(optional.length===1&&optional[0].declared_required===false&&optional[0].effective_required===false&&optional[0].default_value==='false','Lost optional/default metadata');
  const identity=(await json(resolve(directory,'database-'+snapshot+'-identity.stdout.log')))[0];
  ensure(!dbIds.has(identity.Id)&&identity.Image===NEO4J_IMAGE&&identity.Config.Labels[LABEL]===owner&&!Object.keys(identity.HostConfig.PortBindings??{}).length&&identity.Mounts.every(m=>m.Type!=='volume'),'Database isolation/reuse differs');dbIds.add(identity.Id);
  const ready=(await json(resolve(db,'readiness.json'))).at(-1);ensure(ready.ready&&ready.actual_query_verified&&ready.database==='neo4j','No actual user database readiness');
  const direct=await json(resolve(db,'direct.first.json')),direct2=await json(resolve(db,'direct.second.json'));
  const cypher=await json(resolve(db,'cypher.first.json')),cypher2=await json(resolve(db,'cypher.second.json'));
  ensure(canonical(direct)===canonical(direct2)&&canonical(cypher)===canonical(cypher2),'Repeated import changes graph');
  const parity=await json(resolve(db,'parity.json'));ensure(Object.values(parity.checks).every(v=>v===true),'Required metadata/retrieval parity failed');
  ensure(parity.full_node_property_parity===true&&canonical(direct)===canonical(cypher),'Full node/relationship property parity required');
  const selections=[];
  for(const route of ['direct','cypher']){
   const retrieved=await json(resolve(db,route+'.retrieval.json'));ensure(retrieved.graph_reachability_only&&!retrieved.embedding_or_model_inference&&!retrieved.score_computed,'Retrieval scope widened');
   for(const plan of retrieved.plans){
    ensure([1,2,3].includes(plan.depth_limit)&&plan.parameters.seed===SEEDS[snapshot],'Wrong retrieval configuration');
    for(const row of plan.paths){
     ensure(row.id!==SEEDS[snapshot]&&row.witness_ids[0]===row.id&&row.witness_ids.at(-1)===SEEDS[snapshot]&&row.logical_hop===row.witness_ids.length-1&&row.logical_hop<=plan.depth_limit,'Wrong witness/seed/hop');
     for(let index=0;index<row.relation_types.length;index++)ensure(graph.edges.some(e=>e.source_id===row.witness_ids[index]&&e.target_id===row.witness_ids[index+1]&&e.type===row.relation_types[index]&&e.resolution_status==='RESOLVED'),'Witness not bound to native edges');
    }
    for(const chunk of plan.chunks){
     const raw=await readFile(resolve(directory,'input',snapshot,chunk.file));const lines=raw.toString('utf8').match(/[^\n]*\n|[^\n]+$/g)??[];
     ensure(sha256(raw)===chunk.source_sha256&&sha256(Buffer.from(lines.slice(chunk.line_start-1,chunk.line_end).join('')))==chunk.excerpt_sha256,'Source chunk bytes differ');
    }
    if(route==='direct')selections.push({depth:plan.depth_limit,distinct_candidate_methods:new Set(plan.paths.map(r=>r.id)).size});
   }
  }
  const prefix='spring-petclinic-microservices@'+input.source_commit+'::';
  const represented=new Set(graph.nodes.map(n=>prefix+n.id));
  ensure(eligible.every(id=>represented.has(id)),'Incomplete explicit structural inventory');
  groups.push({snapshot,native_methods:graph.nodes.length,native_endpoints:graph.endpoints.length,native_dependency_edges:graph.edges.length,
   native_unresolved_records:graph.unresolved.length,database_nodes:direct.nodes.length,database_relationships:direct.edges.length,
   structural_method_inventory:{eligible:eligible.length,represented:eligible.filter(id=>represented.has(id)).length,
    unrepresented:eligible.filter(id=>!represented.has(id)),not_an_impact_or_accuracy_measure:true},
   metadata_parity:parity.checks,full_node_property_parity:parity.full_node_property_parity,
   node_property_difference:null,retrieval:selections});
 }
 return {...integrity,scope:'technical source/native/database/retrieval checks only; no annotation/scoring',groups,
  fresh_database_instances:dbIds.size,private_internal_networks:1,labels_or_annotation_notes_read:false,model_calls:0,score_computed:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{ensure(process.argv.length===4&&process.argv[2]==='--run','Usage: --run P02_OFFLINE_RUN');console.log(JSON.stringify(await audit(process.argv[3]),null,2));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
