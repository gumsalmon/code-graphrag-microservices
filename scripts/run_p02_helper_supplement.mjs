// Small paired helper measurements on frozen P02 input; no CIA/model/label output.
import { readFile, mkdir, lstat, realpath } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { readF03Inputs, LOCK_PATH } from '../pipeline/p02/f03-input.mjs';
import { verifyBuildRun, serviceArguments, SERVICES } from './run_p02_baseline.mjs';
import { ROOT, write, command, seal, filesUnder, json } from './run_p02_f03.mjs';
import { snapshotProtected } from './audit_p02_input_revision.mjs';
import { V1 } from './verify_p02_revision.mjs';
import { LABEL, PYTHON_IMAGE, PRIOR_F03_MANIFEST, MUTATED_JAR, requireThat as check, hash, canonical,
  helperPlan, requireOwned } from '../pipeline/p02/helper-supplement.mjs';

const PRIVATE = resolve(ROOT, 'handoff-out/p02-helper-supplement');
const CODE = ['scripts/run_p02_helper_supplement.mjs', 'scripts/check_p02_helper_supplement.mjs',
  'pipeline/p02/helper-supplement.mjs', 'pipeline/p02/helper-supplement.test.mjs', 'pipeline/p02/P02PairedHelperProbe.java',
  'pipeline/p02/helper-http-probe.py', 'pipeline/p02/helper_http_probe_test.py', 'pipeline/p02/f03-probe.py', 'pipeline/p02/http-probe.py',
  'pipeline/p02/f03-input.mjs', 'scripts/run_p02_f03.mjs', 'scripts/run_p02_baseline.mjs', 'pipeline/p02/docker-client/config.json'];
export async function manifestEntries(directory, expectedHash = null) {
  const bytes = await readFile(resolve(directory, 'SHA256SUMS.txt'));
  check(!expectedHash || hash(bytes) === expectedHash, 'Frozen manifest hash differs');
  const entries = new Map();
  for (const line of bytes.toString('utf8').trimEnd().split('\n')) {
    const match = /^([a-f0-9]{64})  ([A-Za-z0-9_.@/-]+)$/.exec(line);
    check(match && !match[2].startsWith('/') && !match[2].split('/').some(part => !part || part === '.' || part === '..') && !entries.has(match[2]), 'Unsafe manifest');
    const path = resolve(directory, match[2]);
    check(path.startsWith(resolve(directory) + sep) && !(await lstat(path)).isSymbolicLink() && hash(await readFile(path)) === match[1], 'Manifest member differs: '+match[2]);
    entries.set(match[2], match[1]);
  }
  return entries;
}
export async function readSupplementInputs(options) {
  const inputs = await readF03Inputs(options.candidate, ROOT), baseline = await verifyBuildRun(options.baselineBuild);
  const prior = await realpath(resolve(options.priorF03));
  check(prior.startsWith(resolve(ROOT, 'handoff-out/p02-f03') + sep), 'Not a private P02 F03 run');
  await manifestEntries(prior, PRIOR_F03_MANIFEST);
  const mutatedDirectory = resolve(prior, 'mutated-build'); await manifestEntries(mutatedDirectory);
  const mutatedBuild = await json(resolve(mutatedDirectory, 'build.json'));
  check(mutatedBuild.patch_sha256 === inputs.bindings.patch_sha256 && mutatedBuild.source_commit === inputs.bindings.source_commit &&
    mutatedBuild.config_commit === inputs.bindings.config_commit && mutatedBuild.consumers_unchanged === true && mutatedBuild.config_unchanged === true &&
    mutatedBuild.jars['visits-service'].sha256 === MUTATED_JAR, 'Wrong actual mutated provider build');
  for (const service of SERVICES.filter(service => service !== 'visits-service'))
    check(mutatedBuild.jars[service].sha256 === baseline.build.jars[service].sha256, 'Non-provider JAR drift');
  const mutatedJar = resolve(mutatedDirectory, mutatedBuild.jars['visits-service'].file);
  check(hash(await readFile(mutatedJar)) === MUTATED_JAR, 'Mutated provider binary differs');
  check(mutatedBuild.baseline_build_sha256 === hash(await readFile(resolve(baseline.directory, 'build.json'))), 'Wrong parent baseline build');
  return { inputs, baseline, prior, mutatedDirectory, mutatedBuild, mutatedJar,
    bindings: { ...inputs.bindings, baseline_build_sha256: mutatedBuild.baseline_build_sha256, prior_f03_manifest_sha256: PRIOR_F03_MANIFEST,
      gateway_jar_sha256: baseline.build.jars['api-gateway'].sha256, baseline_provider_sha256: baseline.build.jars['visits-service'].sha256,
      mutated_provider_sha256: MUTATED_JAR, java_image: baseline.build.java_image, python_image: PYTHON_IMAGE } };
}
async function preserved() {
  const extra = [
    'handoff-out/p02-phat-return/20261025T092314Z-4ffb0796/P02_PHAT_F03_RETURN_2026-10-25.zip',
    'handoff-out/p02-phat-return/20261025T092314Z-4ffb0796/received/labels.draft.v3.json',
    'handoff-out/p02-phat-return/20261025T092314Z-4ffb0796/received/SHA256SUMS.txt',
    'handoff-out/p03-preparation/20261024T190227112Z-a8e852db/SHA256SUMS.txt',
    'handoff-out/p02-f03/20261024t103954400z-989f2a57/SHA256SUMS.txt'
  ];
  return { trees: await snapshotProtected(), extra: Object.fromEntries(await Promise.all(extra.map(async path => [path, hash(await readFile(resolve(ROOT, path)))]))) };
}
async function absent(directory, stage, resource) {
  const result = await command(directory, stage, 'docker', [resource.kind, 'ls', ...(resource.kind === 'container' ? ['-a'] : []),
    '--filter', 'name=^'+(resource.kind === 'container' ? '/' : '')+resource.name+'$', '--format', resource.kind === 'container' ? '{{.Names}}' : '{{.Name}}']);
  check(result.stdout.trim() === '', 'Resource already exists; will not adopt it');
}
async function cleanup(directory, resources, owner) {
  const records=[];
  for (const [index, resource] of [...resources].reverse().entries()) {
    const stage='cleanup/'+index;
    try {
      const result=await command(directory,stage+'-inspect','docker',[resource.kind,'inspect',resource.name,'--format',resource.kind==='container'?'{{json .Config.Labels}}':'{{json .Labels}}'],{allowFailure:true});
      if(result.code!==0) { await absent(directory,stage+'-absent',resource); records.push({...resource,already_absent:true}); continue; }
      requireOwned(resource,owner,JSON.parse(result.stdout));
      await command(directory,stage+'-remove','docker',[resource.kind,'rm',...(resource.kind==='container'?['--force']:[]),resource.name]);
      await absent(directory,stage+'-confirmed',resource); records.push({...resource,removed:true});
    } catch(error) { records.push({...resource,error:error.message}); }
  }
  const result={complete:records.every(row=>row.removed||row.already_absent),resources:records};
  await write(directory,'cleanup.json',result); return result;
}
const lockedContainerArgs = (name, owner, network, image, mounts) => ['run','--rm','--pull','never','--name',name,'--label',LABEL+'='+owner,
  '--network',network,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','768m','--cpus','1',
  '--tmpfs','/tmp:rw,nosuid,nodev,size=128m',...mounts.flatMap(value=>['--mount',value]),'--entrypoint','/bin/sh',image];

async function compileProbe(directory, data, runId) {
  await mkdir(directory); const owner=runId+':compile', resource={kind:'container',name:'p02hs-'+runId+'-compile',owner}; let failure=null;
  await write(directory,'P02PairedHelperProbe.java',await readFile(resolve(ROOT,'pipeline/p02/P02PairedHelperProbe.java')));
  const resources=[];
  try {
    await absent(directory,'absence',resource); resources.push(resource);
    const args=lockedContainerArgs(resource.name,owner,'none',data.bindings.java_image,[
      'type=bind,source='+directory+',target=/harness',
      'type=bind,source='+resolve(data.baseline.directory,data.baseline.build.jars['api-gateway'].file)+',target=/gateway.jar,readonly']);
    await command(directory,'compile','docker',[...args,'-c','cd /harness && mkdir classes extracted && cd extracted && jar xf /gateway.jar BOOT-INF && cd .. && javac -cp "extracted/BOOT-INF/classes:extracted/BOOT-INF/lib/*" -d classes P02PairedHelperProbe.java'],{timeout:120000});
    await write(directory,'compiled.json',{status:'harness_compiled_only',gateway_jar_sha256:data.bindings.gateway_jar_sha256,
      application_source_changed:false,application_rebuilt:false,labels_created:false});
  } catch(error) { failure=error; await write(directory,'failure.json',{message:error.message}); }
  const cleaned=await cleanup(directory,resources,owner); await seal(directory,['extracted']);
  if(failure||!cleaned.complete) throw failure??new Error('Compile cleanup failed');
}

async function runGroup(directory, group, data, compileDirectory) {
  await mkdir(directory,{recursive:true}); const resources=[],identities={}; let failure=null;
  const network={kind:'network',name:group.prefix+'-net',owner:group.owner};
  const probe=async(stage,script,args)=>{
    const resource={kind:'container',name:group.prefix+'-probe-'+stage,owner:group.owner}; await absent(directory,stage+'-absence',resource); resources.push(resource);
    const commandArgs=['run','--rm','--pull','never','--name',resource.name,'--label',LABEL+'='+group.owner,'--network',network.name,
      '--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','0.5','--env','PYTHONDONTWRITEBYTECODE=1',
      '--mount','type=bind,source='+resolve(ROOT,'pipeline/p02')+',target=/probe,readonly',
      '--mount','type=bind,source='+directory+',target=/run','--mount','type=bind,source='+data.inputs.root+',target=/input,readonly',
      '--entrypoint','python',PYTHON_IMAGE,'/probe/'+script,...args,'--output','/run/'+stage];
    await command(directory,stage,'docker',commandArgs,{timeout:210000});
  };
  try {
    await mkdir(resolve(directory,'config')); await command(directory,'config-extract','tar',['-xf',resolve(data.baseline.directory,'config.tar'),'-C',resolve(directory,'config')]);
    await absent(directory,'network-absence',network); resources.push(network);
    await command(directory,'network-create','docker',['network','create','--internal','--label',LABEL+'='+group.owner,network.name]);
    await command(directory,'network-identity','docker',['network','inspect',network.name,'--format','{"id":{{json .Id}},"internal":{{json .Internal}},"labels":{{json .Labels}}}']);
    for(const service of SERVICES) {
      console.error('P02 helper supplement '+group.id+': start/wait '+service);
      const resource={kind:'container',name:group.prefix+'-'+service,owner:group.owner}; await absent(directory,'absence-'+service,resource); resources.push(resource);
      const jar=service==='visits-service'&&group.snapshot==='mutated'?data.mutatedJar:resolve(data.baseline.directory,data.baseline.build.jars[service].file);
      const args=serviceArguments({name:resource.name,runId:group.owner,network:network.name,service,javaImage:data.bindings.java_image,jar,config:resolve(directory,'config')})
        .map(value=>value.startsWith('code-graphrag.p02-runtime=')?LABEL+'='+group.owner:value);
      await command(directory,'start-'+service,'docker',args);
      const identity=await command(directory,'identity-'+service,'docker',['container','inspect',resource.name,'--format',
        '{"id":{{json .Id}},"image":{{json .Image}},"labels":{{json .Config.Labels}},"ports":{{json .HostConfig.PortBindings}},"mounts":{{json .Mounts}}}']);
      identities[service]=JSON.parse(identity.stdout);
      check(identities[service].labels[LABEL]===group.owner && !Object.keys(identities[service].ports??{}).length && identities[service].mounts.every(row=>row.Type!=='volume'), 'Unsafe application isolation');
      await probe('ready-'+service,'f03-probe.py',['wait','--target',{'config-server':'config','discovery-server':'discovery','customers-service':'customers','visits-service':'visits','api-gateway':'gateway'}[service]]);
    }
    await write(directory,'identities.json',identities);
    await probe('setup','f03-probe.py',['setup','--fixture','/input/'+V1+'fixture.json']);
    await probe('raw','helper-http-probe.py',[]);
    const output=resolve(directory,'targeted'); await mkdir(output);
    const resource={kind:'container',name:group.prefix+'-targeted',owner:group.owner}; await absent(directory,'targeted-absence',resource); resources.push(resource);
    const args=lockedContainerArgs(resource.name,group.owner,network.name,data.bindings.java_image,[
      'type=bind,source='+compileDirectory+',target=/harness,readonly',
      'type=bind,source='+resolve(directory,'raw')+',target=/input,readonly',
      'type=bind,source='+output+',target=/output']);
    await command(directory,'targeted','docker',[...args,'-c','exec java -cp "/harness/classes:/harness/extracted/BOOT-INF/classes:/harness/extracted/BOOT-INF/lib/*" P02PairedHelperProbe /input /output '+group.id+' '+group.snapshot+' '+group.repetition+' '+group.provider_origin],{timeout:90000});
    await write(directory,'result.json',{status:'paired_targeted_helper_records_collected',group_id:group.id,snapshot:group.snapshot,repetition:group.repetition,
      primary_gets:3,targeted_client_gets:1,post_requests:0,production_callback_traced:false,labels_created:false});
  } catch(error) { failure=error; await write(directory,'failure.json',{message:error.message}); }
  finally {
    for(const service of SERVICES) if(resources.some(row=>row.name===group.prefix+'-'+service)) {
      const log=await command(directory,'logs/'+service,'docker',['logs',group.prefix+'-'+service],{allowFailure:true});
      if(log.code!==0&&!failure) failure=new Error('Incomplete service log: '+service);
    }
    const cleaned=await cleanup(directory,resources,group.owner); await seal(directory);
    if(!cleaned.complete&&!failure) failure=new Error('Group cleanup failed; next group forbidden');
  }
  if(failure) throw failure;
  return {group_id:group.id,identities};
}

export async function executeSupplement(options, runtime=false) {
  const data=await readSupplementInputs(options);
  const runId=new Date().toISOString().replace(/[-:.]/g,'').toLowerCase()+'-'+randomUUID().slice(0,8);
  const directory=resolve(PRIVATE,runId); await mkdir(directory,{recursive:true}); const before=await preserved();
  await write(directory,'protected-before.json',before);
  const plan=helperPlan(runId,data.bindings); await write(directory,'plan.json',plan);
  await write(directory,'authorization.json',{source:'D15 helper_setter_fallback_evidence plus user continuation after Phát return audit',
    user_message:'oke hãy tiếp tục công việc tiếp theo',record_date:'2026-10-25',exact_user_decision_time:null,
    input_lock:LOCK_PATH,input_lock_sha256:data.inputs.decision_sha256,scope:plan.measurements,
    model_calls_authorized:false,labels_may_be_changed_by_measurement:false,github_push_authorized:false});
  await write(directory,'inputs.json',{candidate_directory:data.inputs.root,baseline_directory:data.baseline.directory,prior_f03_directory:data.prior,
    runtime_requested:runtime,bindings:data.bindings,code_sha256:Object.fromEntries(await Promise.all(CODE.map(async name=>[name,hash(await readFile(resolve(ROOT,name)))])))});
  for(const name of CODE) await write(directory,'code/'+name,await readFile(resolve(ROOT,name)));
  let failure=null; const groups=[];
  try {
    if(runtime) {
      await command(directory,'docker-engine','docker',['info','--format','{{.ServerVersion}}|{{.OSType}}']);
      for(const [kind,image] of [['java',data.bindings.java_image],['python',PYTHON_IMAGE]]) {
        const result=await command(directory,'image-'+kind,'docker',['image','inspect',image,'--format','{{.Id}}']); check(result.stdout.trim()===image,'Pinned local image missing');
      }
      await compileProbe(resolve(directory,'compile'),data,runId);
      for(const group of plan.groups) groups.push(await runGroup(resolve(directory,'groups',group.id),group,data,resolve(directory,'compile')));
    }
    await write(directory,'result.json',{status:runtime?'paired_helper_evidence_collected_pending_readonly_audit':'offline_plan_ready_runtime_not_started',
      runtime_executed:runtime,groups_completed:groups.length,group_identities:groups,post_requests:0,labels_created:false,ground_truth_accepted:false,official_scoring:false,model_calls:0,
      production_callback_traced:false});
  } catch(error) { failure=error; await write(directory,'failure.json',{message:error.message,partial_groups:groups.length}); }
  const after=await preserved(); await write(directory,'protected-after.json',after);
  const unchanged=canonical(before)===canonical(after); await write(directory,'preservation.json',{protected_inputs_unchanged:unchanged});
  const nested=[];
  for(const part of ['compile',...plan.groups.map(group=>'groups/'+group.id)]) {
    try { const manifest=await readFile(resolve(directory,part,'SHA256SUMS.txt')); await write(directory,'nested-'+part.replaceAll('/','-')+'.json',{path:part+'/SHA256SUMS.txt',sha256:hash(manifest)}); nested.push(part+'/SHA256SUMS.txt'); }
    catch(error) { if(error.code!=='ENOENT') throw error; }
  }
  await seal(directory,['compile','groups'],nested);
  if(failure||!unchanged) throw new Error((failure?.message??'Protected inputs changed')+'; evidence retained at '+directory);
  return {directory,status:runtime?'evidence_collected_needs_audit':'offline_plan_ready',manifest_sha256:hash(await readFile(resolve(directory,'SHA256SUMS.txt'))),
    runtime_executed:runtime,groups_completed:groups.length,labels_created:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const [action,...args]=process.argv.slice(2); check(['plan','run'].includes(action)&&args.length===6&&args[0]==='--candidate'&&args[2]==='--baseline-build'&&args[4]==='--prior-f03',
      'Usage: plan|run --candidate FROZEN_CANDIDATE --baseline-build PINNED_BUILD --prior-f03 ORIGINAL_F03');
    console.log(JSON.stringify(await executeSupplement({candidate:args[1],baselineBuild:args[3],priorF03:args[5]},action==='run'),null,2));
  } catch(error) { console.error('P02 helper supplement failed: '+error.message); process.exitCode=1; }
}
