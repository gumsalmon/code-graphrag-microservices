// Portable read-only integrity/record verifier; never accepts impact labels.
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyProjectTransfer } from './verify_project_transfer.mjs';
import { validateHelperEvents, hash, requireThat as check } from '../pipeline/p02/helper-supplement.mjs';
export async function verifyHelperPacket(directory, records=false) {
  const root=resolve(directory), integrity=await verifyProjectTransfer(root);
  const read=name=>readFile(resolve(root,name));
  const json=async name=>JSON.parse(await read(name));
  const meta=await json('META/transfer.json');
  check(meta.package_role==='phat_p02_helper_supplement_source_runtime_only','Wrong role packet');
  const lock=await json('decisions/INPUT_LOCK_2026-10-24.json'), plan=await json('runtime/plan.json');
  for(const key of ['scenario_sha256','universe_sha256','fixture_sha256','patch_sha256']) check(lock[key]===plan.bindings[key],'Original lock binding differs');
  for(const [name,path] of [['scenario','candidate/benchmark/p02/preparation.v2/scenario.json'],
    ['universe','candidate/draft/evaluation_universe.draft.v2.json'],['fixture','candidate/benchmark/p02/preparation.v1/fixture.json'],
    ['patch','candidate/benchmark/p02/preparation.v1/optional-query.patch']]) check(hash(await read(path))===lock[name+'_sha256'],'Copied input differs from original lock');
  check(lock.input_locked_for_f03===true && meta.source_packet_manifest_sha256==='4c493b6d42f96784e9eec71ce46cb73e43f5a4386d277ef1d099a5d18cb5badb','Missing original input decision/source reference');
  const recordChecks=[];
  if(records) for(const group of plan.groups) {
    const base='runtime/groups/'+group.id;
    const ownerBytes=await read(base+'/raw/owner.body'), visitBytes=await read(base+'/raw/provider.body');
    for(const name of ['owner','provider','gateway']) {
      const metadata=await json(base+'/raw/'+name+'.json'),body=await read(base+'/raw/'+name+'.body');
      check(metadata.error===null&&metadata.status===200&&metadata.body_sha256===hash(body)&&metadata.body_bytes===body.length,'Raw HTTP binding differs');
    }
    const events=(await read(base+'/targeted/events.ndjson')).toString('utf8').trimEnd().split('\n').map(line=>JSON.parse(line));
    recordChecks.push(validateHelperEvents(events,group,{ownerBytes,visitBytes}));
  }
  return {...integrity,package_role:meta.package_role,status:'helper_packet_verified_not_annotation_or_review',
    original_input_lock_declared:true,input_lock_granted_by_this_verifier:false,input_locked:true,
    record_checks_requested:records,record_checks:recordChecks,production_callback_traced:false,
    labels_created_or_changed:false,ground_truth_accepted:false,official_scoring_authorized:false,
    limitations:['Read source and raw before optional --records derived checks','DTO projection is explicit; raw owner retains type.id',
      'Targeted private helper invocation is not production callback tracing','Human annotation and exposure are not certified by this verifier']};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2); check((args.length===2||args.length===3&&args[2]==='--records')&&args[0]==='--root','Usage: --root DIRECTORY [--records]');
    console.log(JSON.stringify(await verifyHelperPacket(args[1],args.length===3),null,2));
  } catch(error) { console.error('Helper packet failed: '+error.message); process.exitCode=1; }
}
