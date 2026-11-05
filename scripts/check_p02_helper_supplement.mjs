// Read-only verification of newly generated supplemental evidence.
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifestEntries, readSupplementInputs } from './run_p02_helper_supplement.mjs';
import { filesUnder, json } from './run_p02_f03.mjs';
import { helperPlan, validateHelperEvents, LABEL, canonical, hash, requireThat as check } from '../pipeline/p02/helper-supplement.mjs';

export async function verifyHelperSupplement(directory) {
  const root=resolve(directory), rootEntries=await manifestEntries(root);
  const inputs=await json(resolve(root,'inputs.json')),plan=await json(resolve(root,'plan.json')),result=await json(resolve(root,'result.json'));
  const data=await readSupplementInputs({candidate:inputs.candidate_directory,baselineBuild:inputs.baseline_directory,priorF03:inputs.prior_f03_directory});
  check(canonical(inputs.bindings)===canonical(data.bindings),'Reused inputs drifted');
  const runId=plan.groups[0].owner.split(':')[0]; check(canonical(plan)===canonical(helperPlan(runId,data.bindings)),'Supplement plan differs');
  check(canonical(await json(resolve(root,'protected-before.json')))===canonical(await json(resolve(root,'protected-after.json'))) &&
    (await json(resolve(root,'preservation.json'))).protected_inputs_unchanged===true,'Old evidence changed');
  for(const [name,digest] of Object.entries(inputs.code_sha256)) check(hash(await readFile(resolve(root,'code',name)))===digest,'Measurement code snapshot differs');
  const children=inputs.runtime_requested?['compile',...plan.groups.map(group=>'groups/'+group.id)]:[];
  const actualRoot=(await filesUnder(root,['compile','groups'])).filter(name=>name!=='SHA256SUMS.txt');
  check(canonical([...actualRoot,...children.map(part=>part+'/SHA256SUMS.txt')].sort())===canonical([...rootEntries.keys()].sort()),'Unmanifested/missing root evidence');
  if(!inputs.runtime_requested) {
    check(result.status==='offline_plan_ready_runtime_not_started' && result.runtime_executed===false && result.groups_completed===0,'False offline runtime claim');
    return {status:'offline_plan_verified_runtime_not_started',directory:root,root_files:rootEntries.size,planned_groups:4,planned_primary_gets:12,
      planned_targeted_client_gets:4,runtime_executed:false,labels_created:false,production_callback_traced:false};
  }
  const compile=await manifestEntries(resolve(root,'compile'));
  check((await json(resolve(root,'compile/compile.exit.json'))).code===0 && (await json(resolve(root,'compile/cleanup.json'))).complete===true,'Harness compile or cleanup failed');
  check(hash(await readFile(resolve(root,'compile/P02PairedHelperProbe.java')))===inputs.code_sha256['pipeline/p02/P02PairedHelperProbe.java'],'Compiled different measurement source');
  const instances=[],groups=[]; let classIdentity=null;
  for(const group of plan.groups) {
    const groupRoot=resolve(root,'groups',group.id), entries=await manifestEntries(groupRoot);
    check(canonical((await filesUnder(groupRoot)).filter(name=>name!=='SHA256SUMS.txt').sort())===canonical([...entries.keys()].sort()),'Unlisted group evidence');
    const network=JSON.parse(await readFile(resolve(groupRoot,'network-identity.stdout.log'),'utf8'));
    check(network.internal===true && network.labels[LABEL]===group.owner,'Wrong network isolation');
    const identities=await json(resolve(groupRoot,'identities.json'));
    for(const service of ['config-server','discovery-server','customers-service','visits-service','api-gateway']) {
      const identity=identities[service]; check(identity.labels[LABEL]===group.owner && identity.image===inputs.bindings.java_image &&
        !Object.keys(identity.ports??{}).length && identity.mounts.every(m=>m.Type!=='volume' && (m.Type!=='bind'||m.RW===false)), 'Wrong application isolation/identity');
      instances.push(identity.id);
      const stage=await json(resolve(groupRoot,'start-'+service+'.command.json'));
      const expectedJar=service==='visits-service'&&group.snapshot==='mutated'?data.mutatedJar:resolve(data.baseline.directory,data.baseline.build.jars[service].file);
      check(stage.args.includes('type=bind,source='+expectedJar+',target=/p02.jar,readonly'),'Wrong baseline/mutated binary mount');
    }
    const setup=await json(resolve(groupRoot,'setup/setup.json'));
    check(setup.fresh_seed_only===true && setup.real_registry_up===true && setup.seed_visit_tuples.length===4,'Fresh fixture/setup missing');
    const rawInputs={};
    for(const name of ['owner','provider','gateway']) {
      const metadata=await json(resolve(groupRoot,'raw',name+'.json')),body=await readFile(resolve(groupRoot,'raw',name+'.body'));
      check(metadata.method==='GET'&&metadata.status===200&&metadata.error===null&&metadata.body_sha256===hash(body)&&metadata.body_bytes===body.length,'Bad supplemental input HTTP record');
      rawInputs[name]=body;
    }
    const events=(await readFile(resolve(groupRoot,'targeted/events.ndjson'),'utf8')).trimEnd().split('\n').map(line=>JSON.parse(line));
    const verified=validateHelperEvents(events,group,{ownerBytes:rawInputs.owner,visitBytes:rawInputs.provider});
    if(classIdentity===null) classIdentity=verified.application_classes; else check(canonical(classIdentity)===canonical(verified.application_classes),'Consumer class bytes differ across snapshots');
    const byKind=Object.fromEntries(events.map(row=>[row.kind,row.data]));
    const projection=await json(resolve(groupRoot,'targeted/owner-projection.json'));
    check(canonical(projection.raw_owner)===canonical(JSON.parse(rawInputs.owner)) && canonical(projection.projection)===canonical(byKind.raw_input_binding.owner_projection),'Owner projection file does not bind raw or event');
    const expectedProjected=JSON.parse(rawInputs.owner); for(const pet of expectedProjected.pets) delete pet.type.id;
    check(canonical(projection.projected_owner)===canonical(expectedProjected),'Projection silently changed other owner data');
    for(const [file,value] of [['actual-client-decoded.json',byKind.client_subscription_completed.decoded],
      ['merge-input-owner.json',byKind.addVisitsToOwner_function_applied.owner_before],['merge-input-visits.json',byKind.addVisitsToOwner_function_applied.visits_input],
      ['merge-output-owner.json',byKind.addVisitsToOwner_function_applied.owner_after],['direct-fallback-return.json',byKind.emptyVisitsForPets_direct_subscription.returned]])
      check(canonical(await json(resolve(groupRoot,'targeted',file)))===canonical(value),'Helper file differs from recorded event');
    check((await json(resolve(groupRoot,'cleanup.json'))).complete===true && (await json(resolve(groupRoot,'targeted.exit.json'))).code===0,'Supplement group incomplete');
    groups.push({group_id:group.id,files:entries.size,event_count:events.length,production_callback_traced:false});
  }
  check(new Set(instances).size===20 && result.runtime_executed===true&&result.groups_completed===4&&result.post_requests===0 &&
    result.labels_created===false&&result.ground_truth_accepted===false&&result.model_calls===0&&result.production_callback_traced===false,'Invalid runtime/completion claims');
  return {status:'paired_targeted_evidence_verified_not_labels',directory:root,groups,unique_application_instances:20,
    runtime_executed:true,post_requests:0,labels_created:false,production_callback_traced:false,ground_truth_accepted:false,official_scoring:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try { check(process.argv.length===4&&process.argv[2]==='--run','Usage: --run SUPPLEMENT_RUN'); console.log(JSON.stringify(await verifyHelperSupplement(process.argv[3]),null,2)); }
  catch(error) { console.error('P02 helper supplement verification failed: '+error.message); process.exitCode=1; }
}
