// Authorized development evidence only. No parser/graph/model/label/scoring execution.
import { readFile, writeFile, mkdir, readdir, lstat, realpath, copyFile } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readF03Inputs, groupsForF03, LOCK_PATH } from '../pipeline/p02/f03-input.mjs';
import { verifyBuildRun, buildArguments, serviceArguments, SERVICES } from './run_p02_baseline.mjs';
import { sha256, jsonText, V1 } from './verify_p02_revision.mjs';
import { snapshotProtected } from './audit_p02_input_revision.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PRIVATE = resolve(ROOT, 'handoff-out/p02-f03');
export const LABEL = 'code-graphrag.p02-f03';
const DOCKER_CONFIG = resolve(ROOT, 'pipeline/p02/docker-client');
const PYTHON_IMAGE = 'sha256:da047cb8f9d1d98e5c070f5300ba9f7274e33b8fc0e5be5ed88740aed1b95ba9';
const CODE = ['scripts/run_p02_f03.mjs', 'scripts/check_p02_f03.mjs', 'pipeline/p02/f03-input.mjs',
  'pipeline/p02/f03-probe.py', 'pipeline/p02/P02HelperProbe.java', 'pipeline/p02/http-probe.py',
  'scripts/run_p02_baseline.mjs', 'scripts/verify_p02_revision.mjs', 'pipeline/p02/paired-plan.mjs',
  'pipeline/p02/maven-settings.xml', 'pipeline/p02/docker-client/config.json'];
export const check = (ok, message) => { if (!ok) throw new Error(message); };
export const json = async path => JSON.parse(await readFile(path, 'utf8'));
const safePath = path => typeof path === 'string' && /^[A-Za-z0-9_.@/-]+$/.test(path) && !path.startsWith('/') && !path.split('/').some(p => !p || p === '.' || p === '..');
export async function write(directory, name, value) {
  check(safePath(name), 'Unsafe evidence name'); const path = resolve(directory, name);
  await mkdir(dirname(path), { recursive: true }); await writeFile(path, typeof value === 'string' || Buffer.isBuffer(value) ? value : jsonText(value), { flag: 'wx' });
}
export function childEnv() {
  const env = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'LANG']) if (process.env[key]) env[key] = process.env[key];
  return { ...env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', NODE_DISABLE_COLORS: '1' };
}
export async function command(directory, stage, program, args, { timeout = 30000, allowFailure = false, cwd = ROOT } = {}) {
  const realArgs = program === 'docker' ? ['--config', DOCKER_CONFIG, ...args] : args;
  await write(directory, stage + '.command.json', { program, args: realArgs, cwd, started_utc: new Date().toISOString(), credentials_passed: false });
  const result = await new Promise(done => {
    let stdout = '', stderr = '', timedOut = false, spawnError = null;
    const child = spawn(program, realArgs, { cwd, env: childEnv(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeout);
    child.stdout?.on('data', chunk => { stdout += chunk; }); child.stderr?.on('data', chunk => { stderr += chunk; });
    child.on('error', error => { spawnError = error.message; });
    child.on('close', code => { clearTimeout(timer); done({ code, timed_out: timedOut, spawn_error: spawnError, stdout, stderr }); });
  });
  await write(directory, stage + '.stdout.log', result.stdout); await write(directory, stage + '.stderr.log', result.stderr);
  await write(directory, stage + '.exit.json', { code: result.code, timed_out: result.timed_out, spawn_error: result.spawn_error });
  if (!allowFailure) check(result.code === 0 && !result.timed_out && !result.spawn_error, stage + ' failed; evidence retained');
  return result;
}
export async function filesUnder(directory, excluded = []) {
  const result = [];
  async function visit(prefix = '') {
    for (const entry of (await readdir(resolve(directory, prefix), { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name, 'en'))) {
      if (!prefix && excluded.includes(entry.name)) continue;
      const name = prefix + entry.name;
      check(!entry.isSymbolicLink() && safePath(name), 'Unsafe evidence member: '+name);
      check(!(await lstat(resolve(directory, name))).isSymbolicLink(), 'Linked member');
      if (entry.isDirectory()) await visit(name + '/'); else { check(entry.isFile(), 'Special member'); result.push(name); }
    }
  }
  await visit(); return result;
}
export async function seal(directory, excluded = [], extra = []) {
  const files = [...(await filesUnder(directory, excluded)).filter(n => n !== 'SHA256SUMS.txt'), ...extra].sort();
  await write(directory, 'SHA256SUMS.txt', (await Promise.all(files.map(async name => sha256(await readFile(resolve(directory, name))) + '  ' + name))).join('\n') + '\n');
}
export async function treeHashes(directory) {
  const files=[];
  async function visit(prefix='') {
    for(const entry of await readdir(resolve(directory,prefix),{withFileTypes:true})) {
      if(entry.name==='target'||entry.name==='.git')continue;
      const name=prefix+entry.name;check(!entry.isSymbolicLink()&&safePath(name),'Unsafe source member: '+name);
      if(entry.isDirectory())await visit(name+'/');else{check(entry.isFile(),'Special source member');files.push(name);}
    }
  }
  await visit();files.sort();
  return Object.fromEntries(await Promise.all(files.map(async n => [n,sha256(await readFile(resolve(directory,n)))])));
}
export function changedFiles(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(n => before[n] !== after[n]).sort();
}
export function ownedResource(resource, owner, labels) {
  check(resource.name.startsWith('p02f03-') && resource.owner === owner && labels?.[LABEL] === owner, 'Refuse operation on foreign resource'); return true;
}
async function ensureAbsent(directory, stage, kind, name) {
  const result = await command(directory, stage, 'docker', [kind, 'ls', ...(kind === 'container' ? ['-a'] : []), '--filter', 'name=^' + (kind === 'container' ? '/' : '') + name + '$', '--format', kind === 'container' ? '{{.Names}}' : '{{.Name}}']);
  check(result.stdout.trim() === '', 'Resource name already exists; will not adopt it');
}
async function cleanupResources(directory, owned, owner) {
  const results = [];
  for (const [index, resource] of [...owned].reverse().entries()) {
    const stage = 'cleanup/' + index + '-' + resource.kind;
    try {
      const inspect = await command(directory, stage + '-inspect', 'docker', [resource.kind, 'inspect', resource.name, '--format', resource.kind === 'container' ? '{{json .Config.Labels}}' : '{{json .Labels}}'], { allowFailure: true });
      if (inspect.code !== 0) {
        await ensureAbsent(directory, stage + '-absence', resource.kind, resource.name);
        results.push({ ...resource, already_absent: true }); continue;
      }
      ownedResource(resource, owner, JSON.parse(inspect.stdout));
      await command(directory, stage + '-remove', 'docker', [resource.kind, 'rm', ...(resource.kind === 'container' ? ['--force'] : []), resource.name]);
      await ensureAbsent(directory, stage + '-absence', resource.kind, resource.name);
      results.push({ ...resource, removed: true });
    } catch (error) { results.push({ ...resource, removed: false, error: error.message }); }
  }
  const result = { complete: results.every(r => r.removed || r.already_absent), resources: results };
  await write(directory, 'cleanup.json', result); return result;
}
async function makeMutated(directory, baseline, inputs, options, runId) {
  await mkdir(directory); const source = resolve(directory, 'source'); await mkdir(source);
  const owned = [], owner = runId + ':build'; let failure = null;
  try {
    await command(directory, 'extract-source', 'tar', ['-xf', resolve(baseline.directory, 'source.tar'), '-C', source]);
    const before = await treeHashes(source); await write(directory, 'source-before.json', before);
    // A separate disposable repository prevents git apply from discovering or
    // touching the user's parent working tree. No commit/index is created.
    const patchGit=resolve(directory,'patch-git');
    await command(directory, 'git-init-private', 'git', ['-c', 'init.defaultBranch=f03-sandbox', 'init', '--bare', patchGit]);
    const patch = resolve(inputs.root, V1 + 'optional-query.patch');
    for (const action of ['check', 'apply']) await command(directory, 'patch-' + action, 'git', ['--git-dir='+patchGit,'--work-tree='+source,
      '-C',source,'apply', ...(action === 'check' ? ['--check'] : []), '--whitespace=error', patch]);
    const afterPatch = await treeHashes(source);
    check(JSON.stringify(changedFiles(before, afterPatch)) === JSON.stringify([inputs.scenario.mutation.file]), 'Patch changed extra files');
    const original = await readFile(resolve(inputs.root, 'input/app', inputs.scenario.mutation.file), 'utf8');
    check(await readFile(resolve(source, inputs.scenario.mutation.file), 'utf8') === original.replace(inputs.scenario.mutation.old_declaration, inputs.scenario.mutation.new_declaration), 'Applied patch differs from registered mutation');
    await write(directory, 'source-after-patch.json', afterPatch);
    const name = 'p02f03-' + runId + '-build'; await ensureAbsent(directory, 'build-absence', 'container', name);
    owned.push({ kind: 'container', name, owner });
    const args = buildArguments({ name, runId: owner, source, mavenHome: options.mavenHome, repository: options.repository, javaImage: baseline.build.java_image })
      .map(v => v.startsWith('code-graphrag.p02-runtime=') ? LABEL + '=' + owner : v);
    args[args.indexOf('-pl') + 1] = 'spring-petclinic-visits-service';
    await command(directory, 'maven-mutated', 'docker', args, { timeout: 300000 });
    const afterBuild = await treeHashes(source); check(changedFiles(afterPatch, afterBuild).length === 0, 'Maven changed input source');
    const jars = structuredClone(baseline.build.jars), nameJar = 'artifacts/visits-service.jar';
    const jar = await readFile(resolve(source, 'spring-petclinic-visits-service/target/spring-petclinic-visits-service-4.0.1.jar'));
    await write(directory, nameJar, jar); jars['visits-service'] = { file: nameJar, sha256: sha256(jar), bytes: jar.length };
    await write(directory, 'build.json', { schema: 'p02-f03-mutated-build/1', baseline_directory: baseline.directory,
      baseline_build_sha256: sha256(await readFile(resolve(baseline.directory, 'build.json'))), source_commit: inputs.bindings.source_commit,
      config_commit: inputs.bindings.config_commit, patch_sha256: inputs.bindings.patch_sha256, source_changes: changedFiles(before, afterBuild),
      source_after_sha256: sha256(jsonText(afterBuild)), consumers_unchanged: true, config_unchanged: true,
      reused_baseline_services: SERVICES.filter(s => s !== 'visits-service'), jars, java_tests_executed: false,
      offline_maven: true, network: 'none', cache_read_only: true, labels_created: false });
  } catch (error) { failure = error; await write(directory, 'failure.json', { message: error.message }); }
  const cleanup = await cleanupResources(directory, owned, owner); await seal(directory, ['source','patch-git']);
  if (failure || !cleanup.complete) throw new Error(failure?.message ?? 'Build cleanup incomplete');
  return { directory, build: await json(resolve(directory, 'build.json')) };
}
async function helperProbe(directory, baseline, runId) {
  await mkdir(directory); const owner = runId + ':helpers', name = 'p02f03-' + runId + '-helpers', owned = [];
  let failure = null;
  try {
    await copyFile(resolve(ROOT, 'pipeline/p02/P02HelperProbe.java'), resolve(directory, 'P02HelperProbe.java'));
    await ensureAbsent(directory, 'helper-absence', 'container', name); owned.push({ kind: 'container', name, owner });
    const script = 'mkdir classes extracted && cd extracted && jar xf /gateway.jar BOOT-INF && cd .. && javac --add-modules jdk.httpserver -cp "extracted/BOOT-INF/classes:extracted/BOOT-INF/lib/*" -d classes P02HelperProbe.java && java --add-modules jdk.httpserver -cp "classes:extracted/BOOT-INF/classes:extracted/BOOT-INF/lib/*" P02HelperProbe /work/events.ndjson';
    await command(directory, 'targeted-helpers', 'docker', ['run','--rm','--pull','never','--name',name,'--label',LABEL+'='+owner,
      '--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','768m','--cpus','1',
      '--tmpfs','/tmp:rw,nosuid,nodev,size=128m','--mount','type=bind,source='+directory+',target=/work',
      '--mount','type=bind,source='+resolve(baseline.directory,baseline.build.jars['api-gateway'].file)+',target=/gateway.jar,readonly',
      '--workdir','/work','--entrypoint','/bin/sh',baseline.build.java_image,'-c',script], { timeout: 120000 });
    await write(directory, 'result.json', { status: 'targeted_helpers_observed_not_microservice_e2e', gateway_jar_sha256: baseline.build.jars['api-gateway'].sha256,
      actual_compiled_application_classes: true, provider: 'local_JDK_HTTP_fixture_server', setter_invoked_only_in_targeted_harness: true,
      circuit_breaker_wiring_proven_by_this_harness: false, labels_created: false });
  } catch (error) { failure = error; await write(directory, 'failure.json', { message: error.message }); }
  const cleanup = await cleanupResources(directory, owned, owner); await seal(directory, ['classes', 'extracted']);
  if (failure || !cleanup.complete) throw new Error(failure?.message ?? 'Helper cleanup incomplete');
}
async function inspectContainer(directory, stage, name) {
  const format = '{"id":{{json .Id}},"name":{{json .Name}},"labels":{{json .Config.Labels}},"image":{{json .Image}},"started_at":{{json .State.StartedAt}},"ports":{{json .HostConfig.PortBindings}},"mounts":{{json .Mounts}},"networks":{{json .NetworkSettings.Networks}}}';
  const result = await command(directory, stage, 'docker', ['container','inspect',name,'--format',format]); return JSON.parse(result.stdout);
}
async function runGroup(directory, group, inputs, baseline, mutated, runId) {
  await mkdir(dirname(directory), { recursive:true }); await mkdir(directory); const owned = [], logErrors = [], identities = {};
  const network = group.prefix + '-net'; let failure = null;
  const probe = async (stage, action, extra = []) => {
    const name = group.prefix + '-probe-' + stage; await ensureAbsent(directory, stage + '-absence', 'container', name);
    owned.push({ kind:'container',name,owner:group.owner });
    return command(directory, stage, 'docker', ['run','--rm','--pull','never','--name',name,'--label',LABEL+'='+group.owner,
      '--network',network,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','0.5',
      '--env','PYTHONDONTWRITEBYTECODE=1','--mount','type=bind,source='+resolve(ROOT,'pipeline/p02')+',target=/probe,readonly',
      '--mount','type=bind,source='+directory+',target=/run','--mount','type=bind,source='+inputs.root+',target=/input,readonly',
      '--entrypoint','python',PYTHON_IMAGE,'/probe/f03-probe.py',action,...extra,'--output','/run/'+stage], { timeout:210000 });
  };
  try {
    await mkdir(resolve(directory,'config')); await command(directory,'config-extract','tar',['-xf',resolve(baseline.directory,'config.tar'),'-C',resolve(directory,'config')]);
    await ensureAbsent(directory,'network-absence','network',network); owned.push({kind:'network',name:network,owner:group.owner});
    await command(directory,'network-create','docker',['network','create','--internal','--label',LABEL+'='+group.owner,network]);
    const networkState=await command(directory,'network-inspect','docker',['network','inspect',network,'--format','{"id":{{json .Id}},"internal":{{json .Internal}},"labels":{{json .Labels}}}']);
    const networkInfo=JSON.parse(networkState.stdout);check(networkInfo.internal===true&&networkInfo.labels[LABEL]===group.owner,'Network is not owned/internal');
    for (const service of SERVICES) {
      console.error('F03 '+group.id+': start/wait '+service);
      const name = group.prefix+'-'+service; await ensureAbsent(directory,'absence-'+service,'container',name); owned.push({kind:'container',name,owner:group.owner});
      const jarRoot = service === 'visits-service' && group.snapshot === 'mutated' ? mutated : baseline;
      const args = serviceArguments({name,runId:group.owner,network,service,javaImage:baseline.build.java_image,
        jar:resolve(jarRoot.directory,jarRoot.build.jars[service].file),config:resolve(directory,'config')})
        .map(v=>v.startsWith('code-graphrag.p02-runtime=')?LABEL+'='+group.owner:v);
      await command(directory,'start-'+service,'docker',args);
      identities[service] = await inspectContainer(directory,'identity-'+service,name);
      check(identities[service].labels[LABEL]===group.owner && !Object.keys(identities[service].ports??{}).length &&
        identities[service].mounts.every(m=>m.Type!=='volume'), 'Unsafe service isolation');
      await probe('ready-'+service,'wait',['--target',{'config-server':'config','discovery-server':'discovery','customers-service':'customers','visits-service':'visits','api-gateway':'gateway'}[service]]);
    }
    await write(directory,'identities.json',identities);
    await probe('setup','setup',['--fixture','/input/'+V1+'fixture.json']);
    await probe('observations','collect',['--fixture','/input/'+V1+'fixture.json']);
    // Additional owned-resource fault after the POST/readback; not a fixture slot.
    const visits = owned.find(r=>r.name===group.prefix+'-visits-service');
    const labelResult = await command(directory,'fault-owner-check','docker',['container','inspect',visits.name,'--format','{{json .Config.Labels}}']);
    ownedResource(visits,group.owner,JSON.parse(labelResult.stdout));
    await command(directory,'pause-provider','docker',['container','pause',visits.name]);
    try { await probe('fault','fault'); }
    finally { await command(directory,'unpause-provider','docker',['container','unpause',visits.name],{allowFailure:true}); }
    await write(directory,'result.json',{schema:'p02-f03-group-result/1',group_id:group.id,snapshot:group.snapshot,repetition:group.repetition,
      fixture_slots:10,post_slots:1,fresh_db_setup_verified:true,fault_probe_extra:true,labels_created:false,model_calls:0});
  } catch (error) { failure=error; await write(directory,'failure.json',{message:error.message}); }
  finally {
    for (const service of SERVICES) if (owned.some(r=>r.name===group.prefix+'-'+service)) {
      const result=await command(directory,'logs/'+service,'docker',['logs',group.prefix+'-'+service],{allowFailure:true});
      if(result.code!==0)logErrors.push({service,code:result.code});
    }
    const cleanup=await cleanupResources(directory,owned,group.owner); await write(directory,'log-capture.json',{errors:logErrors});
    await seal(directory,['config']);
    if(!cleanup.complete && !failure)failure=new Error('Group cleanup incomplete; next group forbidden');
    if(logErrors.length && !failure)failure=new Error('Service logs incomplete; next group forbidden');
  }
  if(failure)throw new Error(group.id+': '+failure.message);
  return {group_id:group.id,identities};
}
export function parseOptions(args) {
  const action=args[0], result={action}; check(['check-input','run'].includes(action),'Only check-input or run');
  const options={'--candidate':'candidate','--baseline-build':'baselineBuild','--maven-home':'mavenHome','--maven-repository':'repository'};
  for(let i=1;i<args.length;i+=2){const key=options[args[i]];check(key&&args[i+1]&&!args[i+1].startsWith('--')&&!result[key],'Unknown/duplicate/incomplete option');result[key]=args[i+1];}
  for(const key of action==='run'?['candidate','baselineBuild','mavenHome','repository']:['candidate'])check(result[key],'Missing explicit '+key);
  return result;
}
export async function runF03(options) {
  const inputs=await readF03Inputs(options.candidate,ROOT);
  const runId=new Date().toISOString().replace(/[-:.]/g,'').toLowerCase()+'-'+randomUUID().slice(0,8);
  const directory=resolve(PRIVATE,runId); await mkdir(directory,{recursive:true});
  const protectedBefore=await snapshotProtected(); await write(directory,'protected-before.json',protectedBefore);
  const code=Object.fromEntries(await Promise.all(CODE.map(async name=>[name,sha256(await readFile(resolve(ROOT,name)))])));
  await write(directory,'inputs.json',{schema:'p02-f03-inputs/1',run_id:runId,candidate_directory:inputs.root,decision_path:LOCK_PATH,
    decision_sha256:inputs.decision_sha256,bindings:inputs.bindings,baseline_directory:resolve(options.baselineBuild),code_sha256:code,
    runtime_scope:'development_evidence_only',labels_created:false,model_calls:0,official_scoring_authorized:false});
  await write(directory,'authorization.json',await readFile(resolve(ROOT,LOCK_PATH)));
  for(const file of CODE)await write(directory,'code/'+file,await readFile(resolve(ROOT,file)));
  const groups=groupsForF03(inputs,runId); await write(directory,'plan.json',{schema:'p02-f03-plan/1',groups,counts:inputs.counts});
  let failure=null;
  try {
    const baseline=await verifyBuildRun(options.baselineBuild);
    for(const image of [baseline.build.java_image,PYTHON_IMAGE]) {
      const result=await command(directory,'preflight-image-'+(image===PYTHON_IMAGE?'python':'java'),'docker',['image','inspect',image,'--format','{{.Id}}']);
      check(result.stdout.trim()===image,'Image ID changed; no implicit pull');
    }
    for(const key of ['mavenHome','repository']) {options[key]=await realpath(resolve(options[key]));check(!/[\r\n,]/.test(options[key]),'Unsafe cache path');}
    await write(directory,'baseline-identity.json',{directory:baseline.directory,build_metadata_sha256:sha256(await readFile(resolve(baseline.directory,'build.json'))),build:baseline.build});
    const mutated=await makeMutated(resolve(directory,'mutated-build'),baseline,inputs,options,runId);
    await helperProbe(resolve(directory,'helpers'),baseline,runId);
    const completed=[];
    for(const group of groups)completed.push(await runGroup(resolve(directory,'groups',group.id),group,inputs,baseline,mutated,runId));
    const ids=completed.flatMap(g=>Object.values(g.identities).map(v=>v.id)); check(new Set(ids).size===20,'Service/database instance reuse across groups');
    await write(directory,'result.json',{schema:'p02-f03-result/1',status:'runtime_evidence_collected_pending_readonly_audit',
      groups_completed:4,fixture_slots:40,post_slots:4,extra_post_readbacks:4,extra_fault_probes:4,
      source_commit:inputs.bindings.source_commit,config_commit:inputs.bindings.config_commit,
      consumers_unchanged:true,labels_created:false,ground_truth_accepted:false,final_test_locked:false,official_scoring_authorized:false,model_calls:0});
  } catch(error){failure=error;await write(directory,'failure.json',{message:error.message,status:'incomplete_f03_evidence_do_not_label',model_calls:0});}
  finally {
    const after=await snapshotProtected();await write(directory,'protected-after.json',after);
    const unchanged=JSON.stringify(after)===JSON.stringify(protectedBefore);
    await write(directory,'preservation.json',{protected_inputs_unchanged:unchanged});
    if(!unchanged&&!failure)failure=new Error('Protected original inputs changed');
    for(const [name,before]of Object.entries(code))if(sha256(await readFile(resolve(ROOT,name)))!==before&&!failure)failure=new Error('Runner changed mid-run: '+name);
    const nested=[];
    for(const name of ['mutated-build/SHA256SUMS.txt','helpers/SHA256SUMS.txt',...groups.map(g=>'groups/'+g.id+'/SHA256SUMS.txt')]) {
      try{await lstat(resolve(directory,name));nested.push(name);}catch(error){if(error.code!=='ENOENT')throw error;}
    }
    await seal(directory,['mutated-build','helpers','groups'],nested);
  }
  if(failure)throw new Error(failure.message+'; evidence: '+directory);
  return {directory,...await json(resolve(directory,'result.json'))};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try{const options=parseOptions(process.argv.slice(2));console.log(jsonText(options.action==='check-input'?
    {status:'input_lock_verified_not_runtime_evidence',...(await readF03Inputs(options.candidate,ROOT)).bindings,labels_created:false}:await runF03(options)));}
  catch(error){console.error('P02 F03 failed: '+error.message);process.exitCode=1;}
}
