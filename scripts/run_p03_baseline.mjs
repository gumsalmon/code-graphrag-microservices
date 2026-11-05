// D18 baseline only. No patch application, mutated build, evaluated output or model.
import { readFile, mkdir, realpath, lstat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { verifyP03Candidate } from './prepare_p03_inputs.mjs';
import { verifyBuildRun, SERVICES, buildArguments, serviceArguments } from './run_p02_baseline.mjs';
import { ROOT, write, command, seal, filesUnder, json, treeHashes } from './run_p02_f03.mjs';
import { snapshotProtected } from './audit_p02_input_revision.mjs';
import { SOURCE_PIN, CONFIG_PIN, OWNER_RESOURCE, SOURCE_FILES, CONFIG_FILES, ensure, sha256, canonical } from '../pipeline/p03/preparation.mjs';
import { AUTHORIZATION, LABEL, JAVA_IMAGE, PYTHON_IMAGE, baselinePlan, validateAuthorization, requireOwned, relabelArguments } from '../pipeline/p03/baseline.mjs';

export const BUILD_ROOT = resolve(ROOT, 'handoff-out/p03-build');
export const BASELINE_ROOT = resolve(ROOT, 'handoff-out/p03-baseline');
const CODE = ['scripts/run_p03_baseline.mjs', 'scripts/check_p03_baseline.mjs', 'pipeline/p03/baseline.mjs',
  'pipeline/p03/baseline.test.mjs', 'pipeline/p03/baseline-probe.py', 'pipeline/p03/baseline_probe_test.py',
  'pipeline/p03/response_checks.py', 'pipeline/p03/preparation.mjs', 'scripts/prepare_p03_inputs.mjs',
  'scripts/run_p02_baseline.mjs', 'scripts/run_p02_f03.mjs', 'scripts/audit_p02_input_revision.mjs',
  'scripts/prepare_p02_inputs.mjs', 'scripts/verify_p02_revision.mjs', 'pipeline/p02/f03-input.mjs',
  'pipeline/p02/f03-supplemental-audit.mjs', 'pipeline/p02/http-probe.py', 'pipeline/p02/f03-probe.py',
  'pipeline/p02/maven-settings.xml', 'pipeline/p02/docker-client/config.json', AUTHORIZATION];
const runId = () => new Date().toISOString().replace(/[-:.]/g, '').toLowerCase() + '-' + randomUUID().slice(0, 8);

export async function verifyManifest(directory, excluded = []) {
  const manifest = await readFile(resolve(directory, 'SHA256SUMS.txt')), entries = new Map();
  for (const line of manifest.toString('utf8').trimEnd().split('\n')) {
    const match = /^([a-f0-9]{64})  ([A-Za-z0-9_.@/-]+)$/.exec(line);
    ensure(match && !match[2].startsWith('/') && !match[2].split('/').some(p => !p || p === '.' || p === '..') && !entries.has(match[2]), 'Invalid manifest');
    const file = resolve(directory, match[2]);
    ensure(!(await lstat(file)).isSymbolicLink() && await realpath(file) === file && sha256(await readFile(file)) === match[1], 'Manifest bytes differ: ' + match[2]);
    entries.set(match[2], match[1]);
  }
  const actual = (await filesUnder(directory, excluded)).filter(p => p !== 'SHA256SUMS.txt').sort();
  const expected = [...entries.keys()].filter(p => !excluded.includes(p.split('/')[0])).sort();
  ensure(canonical(actual) === canonical(expected), 'Unlisted or missing run evidence');
  return { manifest_sha256: sha256(manifest), files: entries.size };
}

async function inputs(candidateDirectory) {
  const candidate = await verifyP03Candidate(candidateDirectory);
  const fixtureBytes = await readFile(resolve(candidate.directory, 'spec/fixture.candidate.v1.json'));
  const decision = await json(resolve(ROOT, AUTHORIZATION));
  validateAuthorization(decision, candidate, fixtureBytes);
  ensure(await readFile(resolve(ROOT, 'pipeline/p02/docker-client/config.json'), 'utf8') === '{}\n', 'Neutral Docker client config changed');
  return { candidate, fixture: JSON.parse(fixtureBytes), decision, decision_sha256: sha256(await readFile(resolve(ROOT, AUTHORIZATION))) };
}

async function protectedState(candidateDirectory) {
  const extra = {};
  const roots = [candidateDirectory,
    resolve(ROOT, 'handoff-out/p02-helper-review-return/20261026T051209Z-0b0f805b/received'),
    resolve(ROOT, 'handoff-out/p02-phat-return/20261025T092314Z-4ffb0796/received')];
  for (const directory of roots) for (const file of await filesUnder(directory))
    extra[resolve(directory, file).slice(ROOT.length + 1).replaceAll('\\', '/')] = sha256(await readFile(resolve(directory, file)));
  for (const file of ['handoff-out/p02-f03/20261024t103954400z-989f2a57/SHA256SUMS.txt',
    'handoff-out/p02-helper-supplement/20261025t121836544z-0997bbbe/SHA256SUMS.txt',
    'handoff-out/p02-helper-packet/20261025T122642Z-a78a8e8c/P02_HELPER_SUPPLEMENT_2026-10-25.zip'])
    extra[file] = sha256(await readFile(resolve(ROOT, file)));
  return { legacy: await snapshotProtected(), extra };
}

async function codeSnapshot(directory) {
  const hashes = {};
  for (const file of CODE) { const bytes = await readFile(resolve(ROOT, file)); await write(directory, 'code/' + file, bytes); hashes[file] = sha256(bytes); }
  await write(directory, 'code-identity.json', hashes);
  return hashes;
}

async function verifyCode(hashes) {
  for (const [file, hash] of Object.entries(hashes)) ensure(sha256(await readFile(resolve(ROOT, file))) === hash, 'Code changed during run: ' + file);
}

async function absent(directory, stage, resource) {
  const result = await command(directory, stage, 'docker', [resource.kind, 'ls', ...(resource.kind === 'container' ? ['-a'] : []),
    '--filter', 'name=^' + (resource.kind === 'container' ? '/' : '') + resource.name + '$', '--format', resource.kind === 'container' ? '{{.Names}}' : '{{.Name}}']);
  ensure(result.stdout.trim() === '', 'Existing resource must not be adopted');
}

async function cleanup(directory, resources, owner) {
  const records = [];
  for (const [i, resource] of [...resources].reverse().entries()) {
    try {
      const inspected = await command(directory, 'cleanup/' + i + '-inspect', 'docker', [resource.kind, 'inspect', resource.name,
        '--format', resource.kind === 'container' ? '{{json .Config.Labels}}' : '{{json .Labels}}'], { allowFailure: true });
      if (inspected.code !== 0) {
        await absent(directory, 'cleanup/' + i + '-absence', resource); records.push({ ...resource, already_absent: true }); continue;
      }
      requireOwned(resource, owner, JSON.parse(inspected.stdout));
      await command(directory, 'cleanup/' + i + '-remove', 'docker', [resource.kind, 'rm', ...(resource.kind === 'container' ? ['--force'] : []), resource.name]);
      await absent(directory, 'cleanup/' + i + '-confirmed', resource); records.push({ ...resource, removed: true });
    } catch (error) { records.push({ ...resource, error: error.message }); }
  }
  const result = { complete: records.every(row => row.removed || row.already_absent), resources: records };
  await write(directory, 'cleanup.json', result); return result;
}

async function preflight(directory) {
  const engine = await command(directory, 'docker-engine', 'docker', ['info', '--format', '{{.ServerVersion}}|{{.OSType}}']);
  ensure(engine.stdout.trim().endsWith('|linux'), 'Linux Docker engine required');
  for (const [kind, image] of [['java', JAVA_IMAGE], ['python', PYTHON_IMAGE]]) {
    const result = await command(directory, 'image-' + kind, 'docker', ['image', 'inspect', image, '--format', '{{.Id}}']);
    ensure(result.stdout.trim() === image, 'Pinned local image absent; no pull');
  }
}

async function sourceMatchesCandidate(source, config, candidate) {
  for (const file of SOURCE_FILES) ensure((await readFile(resolve(source, file))).equals(await readFile(resolve(candidate, 'input/app', file))), 'Baseline source differs from candidate Git blob: ' + file);
  for (const file of CONFIG_FILES) ensure((await readFile(resolve(config, file))).equals(await readFile(resolve(candidate, 'input/config', file))), 'Config differs from candidate Git blob: ' + file);
  ensure(!(await readFile(resolve(source, OWNER_RESOURCE), 'utf8')).includes('response.put("animals"'), 'Mutation entered baseline source');
}

export async function buildBaseline(options) {
  const data = await inputs(options.candidate), reference = await verifyBuildRun(options.referenceBuild);
  ensure(reference.build.java_image === JAVA_IMAGE, 'Different reference build image');
  const id = runId(), directory = resolve(BUILD_ROOT, id), owner = id + ':build';
  await mkdir(directory, { recursive: true });
  const before = await protectedState(data.candidate.directory); await write(directory, 'protected-before.json', before);
  const code = await codeSnapshot(directory), resources = []; let failure = null;
  try {
    await write(directory, 'inputs.json', { candidate: data.candidate.directory, authorization: AUTHORIZATION, authorization_sha256: data.decision_sha256,
      reference_build: reference.directory, reference_build_metadata_sha256: sha256(await readFile(resolve(reference.directory, 'build.json'))),
      source_commit: SOURCE_PIN, config_commit: CONFIG_PIN, source_mutated: false, model_calls: 0 });
    await preflight(directory);
    for (const kind of ['source', 'config']) {
      await write(directory, kind + '.tar', await readFile(resolve(reference.directory, kind + '.tar')));
      await mkdir(resolve(directory, kind));
      await command(directory, 'extract-' + kind, 'tar', ['-xf', resolve(directory, kind + '.tar'), '-C', resolve(directory, kind)]);
    }
    const source = resolve(directory, 'source'), config = resolve(directory, 'config');
    await sourceMatchesCandidate(source, config, data.candidate.directory);
    const sourceBefore = await treeHashes(source); await write(directory, 'source-before.json', sourceBefore);
    const mavenHome = await realpath(resolve(options.mavenHome)), repository = await realpath(resolve(options.repository));
    ensure([mavenHome, repository, source].every(path => !/[\r\n,]/.test(path)), 'Unsafe mount path');
    const resource = { kind: 'container', name: 'p03b-' + id + '-build', owner };
    await absent(directory, 'build-absence', resource); resources.push(resource);
    console.error('P03: build five unmodified services offline; Maven application tests skipped and declared');
    await command(directory, 'maven-build', 'docker', relabelArguments(buildArguments({ name: resource.name, runId: owner,
      source, mavenHome, repository, javaImage: JAVA_IMAGE }), owner), { timeout: 300000 });
    const sourceAfter = await treeHashes(source); await write(directory, 'source-after.json', sourceAfter);
    ensure(canonical(sourceBefore) === canonical(sourceAfter), 'Build changed application source/config');
    await sourceMatchesCandidate(source, config, data.candidate.directory);
    const jars = {};
    for (const service of SERVICES) {
      const bytes = await readFile(resolve(source, 'spring-petclinic-' + service, 'target/spring-petclinic-' + service + '-4.0.1.jar'));
      const file = 'artifacts/' + service + '.jar'; await write(directory, file, bytes); jars[service] = { file, sha256: sha256(bytes), bytes: bytes.length };
    }
    await write(directory, 'build.json', { schema: 'p03-baseline-build/1', status: 'five_services_built_offline_baseline_only',
      source_commit: SOURCE_PIN, config_commit: CONFIG_PIN, java_image: JAVA_IMAGE, source_mutated: false,
      candidate_manifest_sha256: data.candidate.manifest_sha256, authorization_sha256: data.decision_sha256,
      source_archive_sha256: sha256(await readFile(resolve(directory, 'source.tar'))),
      config_archive_sha256: sha256(await readFile(resolve(directory, 'config.tar'))), jars,
      network: 'none', cache: 'read_only', application_tests_executed: false, model_calls: 0, labels_created: false });
  } catch (error) { failure = error; await write(directory, 'failure.json', { message: error.message, source_mutated: false }); }
  const cleaned = await cleanup(directory, resources, owner);
  await verifyCode(code);
  const after = await protectedState(data.candidate.directory); await write(directory, 'protected-after.json', after);
  await write(directory, 'preservation.json', { protected_inputs_unchanged: canonical(before) === canonical(after) });
  await seal(directory, ['source', 'config']);
  if (failure || !cleaned.complete || canonical(before) !== canonical(after)) throw new Error((failure?.message ?? 'Cleanup/preservation failed') + '; retained: ' + directory);
  return { directory, ...await json(resolve(directory, 'build.json')) };
}

export async function verifyBuild(directory) {
  directory = await realpath(resolve(directory));
  ensure(directory.startsWith(BUILD_ROOT + sep), 'Not a private P03 build');
  await verifyManifest(directory, ['source', 'config']);
  const build = await json(resolve(directory, 'build.json'));
  ensure(build.status === 'five_services_built_offline_baseline_only' && build.source_mutated === false && build.java_image === JAVA_IMAGE &&
    build.source_commit === SOURCE_PIN && build.config_commit === CONFIG_PIN && build.network === 'none' && build.cache === 'read_only', 'Ineligible P03 baseline build');
  ensure(canonical(await json(resolve(directory, 'source-before.json'))) === canonical(await treeHashes(resolve(directory, 'source'))), 'Built source changed after build');
  for (const kind of ['source', 'config']) ensure(sha256(await readFile(resolve(directory, kind + '.tar'))) === build[kind + '_archive_sha256'], 'Changed archive');
  for (const service of SERVICES) ensure(build.jars[service].file === 'artifacts/' + service + '.jar' &&
    sha256(await readFile(resolve(directory, build.jars[service].file))) === build.jars[service].sha256, 'Changed baseline JAR');
  ensure((await json(resolve(directory, 'cleanup.json'))).complete && (await json(resolve(directory, 'preservation.json'))).protected_inputs_unchanged, 'Incomplete build cleanup/preservation');
  return { directory, build };
}

async function groupRun(directory, group, data, baseline) {
  await mkdir(directory, { recursive: true }); const resources = [], identities = {}; let failure = null;
  const network = { kind: 'network', name: group.prefix + '-net', owner: group.owner };
  const probe = async (stage, action, target = null) => {
    const resource = { kind: 'container', name: group.prefix + '-probe-' + stage, owner: group.owner };
    await absent(directory, stage + '-absence', resource); resources.push(resource);
    const args = ['run', '--rm', '--pull', 'never', '--name', resource.name, '--label', LABEL + '=' + group.owner, '--network', network.name,
      '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--cpus', '0.5', '--memory', '128m', '--env', 'PYTHONDONTWRITEBYTECODE=1',
      '--mount', 'type=bind,source=' + resolve(ROOT, 'pipeline/p02') + ',target=/probe/p02,readonly',
      '--mount', 'type=bind,source=' + resolve(ROOT, 'pipeline/p03') + ',target=/probe/p03,readonly',
      '--mount', 'type=bind,source=' + directory + ',target=/run',
      '--mount', 'type=bind,source=' + data.candidate.directory + ',target=/input,readonly',
      '--entrypoint', 'python', PYTHON_IMAGE, '/probe/p03/baseline-probe.py', action, '--output', '/run/' + stage,
      ...(target ? ['--target', target] : ['--fixture', '/input/spec/fixture.candidate.v1.json'])];
    await command(directory, stage, 'docker', args, { timeout: 210000 });
  };
  try {
    await mkdir(resolve(directory, 'config')); await command(directory, 'config-extract', 'tar', ['-xf', resolve(baseline.directory, 'config.tar'), '-C', resolve(directory, 'config')]);
    await absent(directory, 'network-absence', network); resources.push(network);
    await command(directory, 'network-create', 'docker', ['network', 'create', '--internal', '--label', LABEL + '=' + group.owner, network.name]);
    await command(directory, 'network-identity', 'docker', ['network', 'inspect', network.name, '--format', '{"id":{{json .Id}},"internal":{{json .Internal}},"labels":{{json .Labels}}}']);
    for (const service of SERVICES) {
      console.error('P03 ' + group.id + ': start/wait ' + service);
      const resource = { kind: 'container', name: group.prefix + '-' + service, owner: group.owner };
      await absent(directory, 'absence-' + service, resource); resources.push(resource);
      const args = relabelArguments(serviceArguments({ name: resource.name, runId: group.owner, network: network.name, service, javaImage: JAVA_IMAGE,
        jar: resolve(baseline.directory, baseline.build.jars[service].file), config: resolve(directory, 'config') }), group.owner);
      await command(directory, 'start-' + service, 'docker', args);
      const identity = await command(directory, 'identity-' + service, 'docker', ['container', 'inspect', resource.name, '--format',
        '{"id":{{json .Id}},"image":{{json .Image}},"labels":{{json .Config.Labels}},"ports":{{json .HostConfig.PortBindings}},"mounts":{{json .Mounts}}}']);
      identities[service] = JSON.parse(identity.stdout);
      ensure(identities[service].labels[LABEL] === group.owner && identities[service].image === JAVA_IMAGE &&
        !Object.keys(identities[service].ports ?? {}).length && identities[service].mounts.every(row => row.Type !== 'volume'), 'Unsafe application identity/isolation');
      await probe('ready-' + service, 'wait', { 'config-server': 'config', 'discovery-server': 'discovery',
        'customers-service': 'customers', 'visits-service': 'visits', 'api-gateway': 'gateway' }[service]);
    }
    await write(directory, 'identities.json', identities);
    await probe('setup', 'setup');
    await probe('observations', 'collect');
    await write(directory, 'result.json', { status: 'baseline_group_fixture_verified', snapshot: 'baseline', repetition: group.repetition,
      fixture_slots: 12, mutated_executed: false, labels_created: false, model_calls: 0 });
  } catch (error) { failure = error; await write(directory, 'failure.json', { message: error.message }); }
  finally {
    for (const service of SERVICES) if (resources.some(row => row.name === group.prefix + '-' + service)) {
      const log = await command(directory, 'logs/' + service, 'docker', ['logs', group.prefix + '-' + service], { allowFailure: true });
      if (log.code !== 0 && !failure) failure = new Error('Missing application log: ' + service);
    }
    const cleaned = await cleanup(directory, resources, group.owner); await seal(directory);
    if (!cleaned.complete && !failure) failure = new Error('Cleanup incomplete; next group forbidden');
  }
  if (failure) throw failure;
  return { group: group.id, identities };
}

export async function executeBaseline(options, runtime = false) {
  const data = await inputs(options.candidate), baseline = runtime ? await verifyBuild(options.buildRun) : null;
  if (baseline) await sourceMatchesCandidate(resolve(baseline.directory, 'source'), resolve(baseline.directory, 'config'), data.candidate.directory);
  const id = runId(), directory = resolve(BASELINE_ROOT, id); await mkdir(directory, { recursive: true });
  const before = await protectedState(data.candidate.directory); await write(directory, 'protected-before.json', before);
  const code = await codeSnapshot(directory), plan = baselinePlan(id, data.candidate), groups = []; let failure = null;
  await write(directory, 'plan.json', plan);
  await write(directory, 'authorization.json', data.decision);
  await write(directory, 'inputs.json', { candidate_directory: data.candidate.directory, authorization_sha256: data.decision_sha256,
    build_directory: baseline?.directory ?? null, build_metadata_sha256: baseline ? sha256(await readFile(resolve(baseline.directory, 'build.json'))) : null,
    jars: baseline?.build.jars ?? null, runtime_requested: runtime, candidate_manifest_sha256: data.candidate.manifest_sha256 });
  try {
    if (runtime) {
      await preflight(directory);
      for (const group of plan.groups) groups.push(await groupRun(resolve(directory, 'groups', group.id), group, data, baseline));
    }
    await write(directory, 'result.json', { status: runtime ? 'baseline_evidence_collected_pending_audit' : 'offline_plan_ready',
      runtime_executed: runtime, groups_completed: groups.length, group_identities: groups,
      fixture_slots: runtime ? 24 : 0, source_mutated: false, input_locked: false, labels_created: false, model_calls: 0 });
  } catch (error) { failure = error; await write(directory, 'failure.json', { message: error.message, groups_completed: groups.length }); }
  await verifyCode(code);
  const after = await protectedState(data.candidate.directory); await write(directory, 'protected-after.json', after);
  const unchanged = canonical(before) === canonical(after); await write(directory, 'preservation.json', { protected_inputs_unchanged: unchanged });
  const nested = [];
  for (const group of plan.groups) {
    try { await readFile(resolve(directory, 'groups', group.id, 'SHA256SUMS.txt')); nested.push('groups/' + group.id + '/SHA256SUMS.txt'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await seal(directory, ['groups'], nested);
  if (failure || !unchanged) throw new Error((failure?.message ?? 'Preservation failed') + '; retained: ' + directory);
  return { directory, manifest_sha256: sha256(await readFile(resolve(directory, 'SHA256SUMS.txt'))),
    runtime_executed: runtime, groups_completed: groups.length, input_locked: false, labels_created: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [action, ...rest] = process.argv.slice(2), options = {};
    const names = { '--candidate': 'candidate', '--reference-build': 'referenceBuild', '--maven-home': 'mavenHome', '--maven-repository': 'repository', '--build-run': 'buildRun' };
    ensure(['plan', 'build', 'baseline'].includes(action) && rest.length % 2 === 0, 'Only plan/build/baseline supported');
    for (let i = 0; i < rest.length; i += 2) { ensure(names[rest[i]] && rest[i + 1] && !options[names[rest[i]]], 'Unknown/duplicate option'); options[names[rest[i]]] = rest[i + 1]; }
    ensure(options.candidate && (action !== 'build' || (options.referenceBuild && options.mavenHome && options.repository)) &&
      (action !== 'baseline' || options.buildRun), 'Explicit candidate and build paths required');
    console.log(JSON.stringify(action === 'build' ? await buildBaseline(options) : await executeBaseline(options, action === 'baseline'), null, 2));
  } catch (error) { console.error('P03 baseline failed: ' + error.message); process.exitCode = 1; }
}
