// D19 source/build/runtime evidence only; never parser/Neo4j/model/labels/scoring.
import { readFile, mkdir, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { verifyP03Candidate } from './prepare_p03_inputs.mjs';
import { verifyBuild, verifyManifest } from './run_p03_baseline.mjs';
import { ROOT, write, command, seal, filesUnder, json, treeHashes } from './run_p02_f03.mjs';
import { buildArguments, serviceArguments, SERVICES } from './run_p02_baseline.mjs';
import { snapshotProtected } from './audit_p02_input_revision.mjs';
import { SOURCE_PIN, CONFIG_PIN, OWNER_RESOURCE, SOURCE_FILES, CONFIG_FILES, ensure, sha256, canonical } from '../pipeline/p03/preparation.mjs';
import { AUTHORIZATION, LABEL, JAVA_IMAGE, PYTHON_IMAGE, ARTIFACT_HASHES, validatePairedAuthorization, pairedPlan, requirePairedOwned, pairedArguments, validateSourceDelta } from '../pipeline/p03/paired.mjs';

export const PRIVATE = resolve(ROOT, 'handoff-out/p03-paired');
const CODE = ['scripts/run_p03_paired.mjs', 'scripts/check_p03_paired.mjs', 'pipeline/p03/paired.mjs', 'pipeline/p03/paired.test.mjs',
  'pipeline/p03/paired-probe.py', 'pipeline/p03/paired_probe_test.py', 'pipeline/p03/paired_checks.py', 'pipeline/p03/paired_checks_test.py',
  'scripts/run_p03_baseline.mjs', 'pipeline/p03/baseline.mjs', 'pipeline/p03/baseline-probe.py', 'pipeline/p03/response_checks.py',
  'scripts/prepare_p03_inputs.mjs', 'pipeline/p03/preparation.mjs', 'scripts/run_p02_baseline.mjs', 'scripts/run_p02_f03.mjs',
  'scripts/audit_p02_input_revision.mjs', 'scripts/prepare_p02_inputs.mjs', 'scripts/verify_p02_revision.mjs',
  'pipeline/p02/f03-input.mjs', 'pipeline/p02/f03-supplemental-audit.mjs', 'pipeline/p02/http-probe.py', 'pipeline/p02/f03-probe.py',
  'pipeline/p02/maven-settings.xml', 'pipeline/p02/docker-client/config.json', AUTHORIZATION];
const newId = () => new Date().toISOString().replace(/[-:.]/g, '').toLowerCase() + '-' + randomUUID().slice(0, 8);

export async function readPairedInputs(candidateDirectory) {
  const candidate = await verifyP03Candidate(candidateDirectory), decisionBytes = await readFile(resolve(ROOT, AUTHORIZATION));
  const decision = JSON.parse(decisionBytes), proposalBytes = await readFile(resolve(ROOT, decision.proposal));
  const artifacts = Object.fromEntries(await Promise.all(Object.keys(ARTIFACT_HASHES).map(async name => [name, await readFile(resolve(candidate.directory, name))])));
  validatePairedAuthorization(decision, candidate, proposalBytes, artifacts);
  ensure(await readFile(resolve(ROOT, 'pipeline/p02/docker-client/config.json'), 'utf8') === '{}\n', 'Neutral Docker config changed');
  return { candidate, decision, decisionBytes, decision_sha256: sha256(decisionBytes), fixture: JSON.parse(artifacts['spec/fixture.candidate.v1.json']) };
}
async function preservation(candidateDirectory) {
  const extra = {};
  for (const directory of [candidateDirectory, resolve(ROOT, 'handoff-out/phat-returns-20261031/20261031T045938Z-2610a833'),
    resolve(ROOT, 'handoff-out/hien-synthetic-return/20261028T150351Z-3ac4bad6/received'),
    resolve(ROOT, 'handoff-out/p02-phat-return/20261025T092314Z-4ffb0796/received')])
    for (const name of await filesUnder(directory)) extra[resolve(directory, name).slice(ROOT.length + 1).replaceAll('\\', '/')] = sha256(await readFile(resolve(directory, name)));
  return { legacy: await snapshotProtected(), extra };
}
async function snapshotCode(directory) {
  const hashes = {};
  for (const file of CODE) { const bytes = await readFile(resolve(ROOT, file)); hashes[file] = sha256(bytes); await write(directory, 'code/' + file, bytes); }
  await write(directory, 'code-identity.json', hashes); return hashes;
}
async function verifyCode(hashes) {
  for (const [file, expected] of Object.entries(hashes)) ensure(sha256(await readFile(resolve(ROOT, file))) === expected, 'Implementation changed during run: ' + file);
}
async function absent(directory, stage, resource) {
  const result = await command(directory, stage, 'docker', [resource.kind, 'ls', ...(resource.kind === 'container' ? ['-a'] : []),
    '--filter', 'name=^' + (resource.kind === 'container' ? '/' : '') + resource.name + '$', '--format', resource.kind === 'container' ? '{{.Names}}' : '{{.Name}}']);
  ensure(!result.stdout.trim(), 'Existing resource cannot be adopted');
}
async function cleanup(directory, resources, owner) {
  const records = [];
  for (const [i, resource] of [...resources].reverse().entries()) {
    try {
      const state = await command(directory, 'cleanup/' + i + '-inspect', 'docker', [resource.kind, 'inspect', resource.name, '--format',
        resource.kind === 'container' ? '{{json .Config.Labels}}' : '{{json .Labels}}'], { allowFailure: true });
      if (state.code !== 0) { await absent(directory, 'cleanup/' + i + '-absence', resource); records.push({ ...resource, already_absent: true }); continue; }
      requirePairedOwned(resource, owner, JSON.parse(state.stdout));
      await command(directory, 'cleanup/' + i + '-remove', 'docker', [resource.kind, 'rm', ...(resource.kind === 'container' ? ['--force'] : []), resource.name]);
      await absent(directory, 'cleanup/' + i + '-confirmed', resource); records.push({ ...resource, removed: true });
    } catch (error) { records.push({ ...resource, error: error.message }); }
  }
  const result = { complete: records.every(row => row.removed || row.already_absent), resources: records };
  await write(directory, 'cleanup.json', result); return result;
}
async function preflight(directory) {
  const result = await command(directory, 'docker-engine', 'docker', ['info', '--format', '{{.ServerVersion}}|{{.OSType}}']);
  ensure(result.stdout.trim().endsWith('|linux'), 'Linux Docker Engine required');
  for (const [name, image] of [['java', JAVA_IMAGE], ['python', PYTHON_IMAGE]]) {
    const found = await command(directory, 'image-' + name, 'docker', ['image', 'inspect', image, '--format', '{{.Id}}']);
    ensure(found.stdout.trim() === image, 'Local pinned image missing; no pulls authorized');
  }
}
async function matchCandidate(baseline, candidate) {
  for (const file of SOURCE_FILES) ensure((await readFile(resolve(baseline.directory, 'source', file))).equals(await readFile(resolve(candidate.directory, 'input/app', file))), 'Source differs from reviewed candidate: ' + file);
  for (const file of CONFIG_FILES) ensure((await readFile(resolve(baseline.directory, 'config', file))).equals(await readFile(resolve(candidate.directory, 'input/config', file))), 'Config differs from reviewed candidate: ' + file);
}
async function buildMutation(directory, data, baseline, options, id) {
  await mkdir(directory); const source = resolve(directory, 'source'); await mkdir(source);
  const owner = id + ':build', resources = []; let failure = null;
  try {
    await command(directory, 'extract-source', 'tar', ['-xf', resolve(baseline.directory, 'source.tar'), '-C', source]);
    const before = await treeHashes(source); await write(directory, 'source-before.json', before);
    const privateGit = resolve(directory, 'patch-git');
    await command(directory, 'git-init-private', 'git', ['-c', 'init.defaultBranch=p03-sandbox', 'init', '--bare', privateGit]);
    const patch = resolve(data.candidate.directory, 'spec/owner-response-rename.patch');
    for (const checkOnly of [true, false]) await command(directory, 'patch-' + (checkOnly ? 'check' : 'apply'), 'git',
      ['--git-dir=' + privateGit, '--work-tree=' + source, '-C', source, 'apply', ...(checkOnly ? ['--check'] : []), '--whitespace=error', patch]);
    const patched = await treeHashes(source); validateSourceDelta(before, patched);
    ensure((await readFile(resolve(source, OWNER_RESOURCE))).equals(await readFile(resolve(data.candidate.directory, 'mutated/app', OWNER_RESOURCE))), 'Applied mutation differs from locked candidate bytes');
    await write(directory, 'source-after-patch.json', patched);
    const mavenHome = await realpath(resolve(options.mavenHome)), repository = await realpath(resolve(options.repository));
    ensure([source, mavenHome, repository].every(p => !/[\r\n,]/.test(p)), 'Unsafe Maven mount');
    const resource = { kind: 'container', name: 'p03p-' + id + '-build', owner }; await absent(directory, 'build-absence', resource); resources.push(resource);
    const args = pairedArguments(buildArguments({ name: resource.name, runId: owner, source, mavenHome, repository, javaImage: JAVA_IMAGE }), owner);
    args[args.indexOf('-pl') + 1] = 'spring-petclinic-customers-service';
    console.error('P03: offline build Customers mutation only; application tests skipped and declared');
    await command(directory, 'maven-mutated', 'docker', args, { timeout: 300000 });
    const after = await treeHashes(source); await write(directory, 'source-after-build.json', after);
    ensure(canonical(patched) === canonical(after), 'Maven changed source beyond locked mutation');
    const bytes = await readFile(resolve(source, 'spring-petclinic-customers-service/target/spring-petclinic-customers-service-4.0.1.jar'));
    await write(directory, 'artifacts/customers-service.jar', bytes);
    await write(directory, 'build.json', { schema: 'p03-mutated-build/1', source_commit: SOURCE_PIN, config_commit: CONFIG_PIN,
      baseline_directory: baseline.directory, baseline_build_sha256: sha256(await readFile(resolve(baseline.directory, 'build.json'))),
      authorization_sha256: data.decision_sha256, patch_sha256: ARTIFACT_HASHES['spec/owner-response-rename.patch'],
      source_changes: validateSourceDelta(before, after), java_image: JAVA_IMAGE, network: 'none', cache: 'read_only',
      customers_jar: { file: 'artifacts/customers-service.jar', sha256: sha256(bytes), bytes: bytes.length },
      reused_baseline_services: SERVICES.filter(s => s !== 'customers-service'), application_tests_executed: false,
      consumer_source_unchanged: true, labels_created: false, model_calls: 0 });
  } catch (error) { failure = error; await write(directory, 'failure.json', { message: error.message }); }
  const clean = await cleanup(directory, resources, owner); await seal(directory, ['source', 'patch-git']);
  if (failure || !clean.complete) throw new Error(failure?.message ?? 'Mutated build cleanup failed');
  return { directory, build: await json(resolve(directory, 'build.json')) };
}
async function groupRun(directory, group, data, baseline, mutated) {
  await mkdir(directory, { recursive: true }); const resources = [], identities = {};
  const network = { kind: 'network', name: group.prefix + '-net', owner: group.owner }; let failure = null;
  const probe = async (stage, action, target = null) => {
    const resource = { kind: 'container', name: group.prefix + '-probe-' + stage, owner: group.owner };
    await absent(directory, stage + '-absence', resource); resources.push(resource);
    await command(directory, stage, 'docker', ['run', '--rm', '--pull', 'never', '--name', resource.name, '--label', LABEL + '=' + group.owner,
      '--network', network.name, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--cpus', '0.5', '--memory', '128m',
      '--env', 'PYTHONDONTWRITEBYTECODE=1', '--mount', 'type=bind,source=' + resolve(ROOT, 'pipeline/p02') + ',target=/probe/p02,readonly',
      '--mount', 'type=bind,source=' + resolve(ROOT, 'pipeline/p03') + ',target=/probe/p03,readonly', '--mount', 'type=bind,source=' + directory + ',target=/run',
      '--mount', 'type=bind,source=' + data.candidate.directory + ',target=/input,readonly', '--entrypoint', 'python', PYTHON_IMAGE,
      '/probe/p03/paired-probe.py', action, '--output', '/run/' + stage, '--snapshot', group.snapshot,
      ...(target ? ['--target', target] : ['--fixture', '/input/spec/fixture.candidate.v1.json'])], { timeout: 210000 });
  };
  try {
    await mkdir(resolve(directory, 'config')); await command(directory, 'config-extract', 'tar', ['-xf', resolve(baseline.directory, 'config.tar'), '-C', resolve(directory, 'config')]);
    await absent(directory, 'network-absence', network); resources.push(network);
    await command(directory, 'network-create', 'docker', ['network', 'create', '--internal', '--label', LABEL + '=' + group.owner, network.name]);
    await command(directory, 'network-identity', 'docker', ['network', 'inspect', network.name, '--format', '{"id":{{json .Id}},"internal":{{json .Internal}},"labels":{{json .Labels}}}']);
    for (const service of SERVICES) {
      console.error('P03 ' + group.id + ': start/wait ' + service);
      const resource = { kind: 'container', name: group.prefix + '-' + service, owner: group.owner }; await absent(directory, 'absence-' + service, resource); resources.push(resource);
      const jar = group.snapshot === 'mutated' && service === 'customers-service' ? resolve(mutated.directory, mutated.build.customers_jar.file) : resolve(baseline.directory, baseline.build.jars[service].file);
      await command(directory, 'start-' + service, 'docker', pairedArguments(serviceArguments({ name: resource.name, runId: group.owner,
        network: network.name, service, javaImage: JAVA_IMAGE, jar, config: resolve(directory, 'config') }), group.owner));
      const result = await command(directory, 'identity-' + service, 'docker', ['container', 'inspect', resource.name, '--format',
        '{"id":{{json .Id}},"image":{{json .Image}},"labels":{{json .Config.Labels}},"ports":{{json .HostConfig.PortBindings}},"mounts":{{json .Mounts}}}']);
      identities[service] = JSON.parse(result.stdout);
      ensure(identities[service].labels[LABEL] === group.owner && identities[service].image === JAVA_IMAGE && !Object.keys(identities[service].ports ?? {}).length &&
        identities[service].mounts.every(m => m.Type !== 'volume'), 'Unsafe application identity');
      await probe('ready-' + service, 'wait', { 'config-server': 'config', 'discovery-server': 'discovery', 'customers-service': 'customers',
        'visits-service': 'visits', 'api-gateway': 'gateway' }[service]);
    }
    await write(directory, 'identities.json', identities); await probe('ready-registry', 'wait', 'registered');
    await probe('setup', 'setup'); await probe('observations', 'collect');
    await write(directory, 'result.json', { status: 'runtime_observations_collected', snapshot: group.snapshot, repetition: group.repetition,
      fixture_slots: 12, labels_created: false, model_calls: 0 });
  } catch (error) { failure = error; await write(directory, 'failure.json', { message: error.message }); }
  finally {
    for (const service of SERVICES) if (resources.some(r => r.name === group.prefix + '-' + service)) {
      const log = await command(directory, 'logs/' + service, 'docker', ['logs', group.prefix + '-' + service], { allowFailure: true });
      if (log.code !== 0 && !failure) failure = new Error('Application log missing: ' + service);
    }
    const clean = await cleanup(directory, resources, group.owner); await seal(directory);
    if (!clean.complete && !failure) failure = new Error('Group cleanup incomplete; next group forbidden');
  }
  if (failure) throw failure;
  return { id: group.id, identities };
}
export async function runPaired(options, runtime = false) {
  const data = await readPairedInputs(options.candidate), baseline = runtime ? await verifyBuild(options.buildRun) : null;
  if (baseline) await matchCandidate(baseline, data.candidate);
  const id = newId(), directory = resolve(PRIVATE, id); await mkdir(directory, { recursive: true });
  const before = await preservation(data.candidate.directory); await write(directory, 'protected-before.json', before);
  const code = await snapshotCode(directory), plan = pairedPlan(id), groups = []; let failure = null, mutated = null;
  await write(directory, 'plan.json', plan); await write(directory, 'authorization.json', data.decisionBytes);
  await write(directory, 'inputs.json', { candidate_directory: data.candidate.directory, authorization_sha256: data.decision_sha256,
    baseline_directory: baseline?.directory ?? null, baseline_build_sha256: baseline ? sha256(await readFile(resolve(baseline.directory, 'build.json'))) : null,
    runtime_requested: runtime, input_locked: true });
  try {
    if (runtime) {
      await preflight(directory); mutated = await buildMutation(resolve(directory, 'mutated-build'), data, baseline, options, id);
      for (const group of plan.groups) groups.push(await groupRun(resolve(directory, 'groups', group.id), group, data, baseline, mutated));
    }
    await write(directory, 'result.json', { status: runtime ? 'paired_evidence_collected_pending_audit' : 'offline_paired_plan_ready',
      runtime_executed: runtime, groups_completed: groups.length, fixture_slots: groups.length * 12, labels_created: false, model_calls: 0 });
  } catch (error) { failure = error; await write(directory, 'failure.json', { message: error.message, groups_completed: groups.length }); }
  await verifyCode(code); const after = await preservation(data.candidate.directory); await write(directory, 'protected-after.json', after);
  const unchanged = canonical(before) === canonical(after); await write(directory, 'preservation.json', { protected_inputs_unchanged: unchanged });
  const nested = [];
  for (const path of ['mutated-build', ...plan.groups.map(g => 'groups/' + g.id)]) {
    try { await readFile(resolve(directory, path, 'SHA256SUMS.txt')); nested.push(path + '/SHA256SUMS.txt'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await seal(directory, ['groups', 'mutated-build'], nested);
  if (failure || !unchanged) throw new Error((failure?.message ?? 'Preservation failed') + '; retained: ' + directory);
  return { directory, manifest_sha256: sha256(await readFile(resolve(directory, 'SHA256SUMS.txt'))), groups_completed: groups.length,
    runtime_executed: runtime, input_locked: true, labels_created: false };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [action, ...args] = process.argv.slice(2), options = {}, names = { '--candidate': 'candidate', '--build-run': 'buildRun', '--maven-home': 'mavenHome', '--maven-repository': 'repository' };
    ensure(['plan', 'run'].includes(action) && args.length % 2 === 0, 'Only plan/run supported');
    for (let i = 0; i < args.length; i += 2) { ensure(names[args[i]] && args[i + 1] && !options[names[args[i]]], 'Unknown/duplicate option'); options[names[args[i]]] = args[i + 1]; }
    ensure(options.candidate && (action === 'plan' || (options.buildRun && options.mavenHome && options.repository)), 'Explicit locked inputs/build/cache paths required');
    console.log(JSON.stringify(await runPaired(options, action === 'run'), null, 2));
  } catch (error) { console.error('P03 paired failed: ' + error.message); process.exitCode = 1; }
}
