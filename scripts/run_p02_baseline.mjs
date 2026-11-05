// Offline build + isolated baseline feasibility. No mutated execution, labels or evaluated-system output.
import { readFile, writeFile, mkdir, readdir, realpath, lstat } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { verifyP02Preparation, PINNED_SOURCE_SHA256, validatePinnedSources } from './prepare_p02_inputs.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_ROOT = resolve(ROOT, 'handoff-out/p02-build');
const BASELINE_ROOT = resolve(ROOT, 'handoff-out/p02-baseline');
const SOURCE_PIN = '3858f9c630cf989bb6809a86edf47c2be78dc9f1';
const CONFIG_PIN = '323993ce2519c6d02df63e08bf4458d123d3b611';
const LABEL = 'code-graphrag.p02-runtime';
export const SERVICES = ['config-server', 'discovery-server', 'customers-service', 'visits-service', 'api-gateway'];
const check = (ok, message) => { if (!ok) throw new Error(message); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const encoded = value => JSON.stringify(value, null, 2) + '\n';
const git = (directory, args) => execFileSync('git', ['-c', 'safe.directory=' + directory.replaceAll('\\', '/'), '-c', 'core.fsmonitor=false', '-C', directory, ...args],
  { windowsHide: true, timeout: 30000, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const id = () => new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8);
async function write(directory, name, value) {
  const path = resolve(directory, name); await mkdir(dirname(path), { recursive: true });
  await writeFile(path, typeof value === 'string' || Buffer.isBuffer(value) ? value : encoded(value), { flag: 'wx' });
}
async function command(directory, stage, program, args, timeout = 30000) {
  await write(directory, stage + '.command.json', { program, args, timestamp: new Date().toISOString(), credentials_passed: false });
  const result = await new Promise((done, reject) => {
    const child = spawn(program, args, { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeout);
    child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); done({ code, timed_out: timedOut, stdout, stderr }); });
  });
  await write(directory, stage + '.stdout.log', result.stdout); await write(directory, stage + '.stderr.log', result.stderr);
  await write(directory, stage + '.exit.json', { code: result.code, timed_out: result.timed_out });
  check(result.code === 0 && !result.timed_out, stage + ' failed; inspect preserved logs; no automatic download/retry');
  return result.stdout.trim();
}
function localDocker(args) {
  return execFileSync('docker', args, { cwd: ROOT, windowsHide: true, timeout: 20000, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
const imageId = reference => {
  check(typeof reference === 'string' && /^[A-Za-z0-9][A-Za-z0-9_./:@-]{0,250}$/.test(reference), 'Invalid image reference');
  const result = localDocker(['image', 'inspect', reference, '--format', '{{.Id}}']);
  check(/^sha256:[a-f0-9]{64}$/.test(result), 'Missing local image; setup/pull must be explicit'); return result;
};
async function cleanPin(directory, pin) {
  const path = await realpath(resolve(directory));
  check(git(path, ['rev-parse', 'HEAD']).toString().trim() === pin, 'Wrong pinned checkout');
  check(git(path, ['status', '--porcelain=v1', '--untracked-files=all']).toString() === '', 'Input checkout must be clean; never reset it');
  const tree = git(path, ['ls-tree', '-r', '--name-only', pin]).toString('utf8').trim().split('\n');
  check(tree.every(name => !name.startsWith('/') && !name.split('/').includes('..')), 'Unsafe archive path');
  check(!git(path, ['ls-tree', '-r', pin]).toString().includes('120000 '), 'Symlink source not supported');
  return path;
}
async function archive(directory, stage, source, pin) {
  const target = resolve(directory, stage), tar = resolve(directory, stage + '.tar'); await mkdir(target);
  // Archive honors core.autocrlf on Windows: force blob-compatible LF for this command only.
  git(source, ['-c', 'core.autocrlf=false', 'archive', '--format=tar', '--output=' + tar, pin]);
  await command(directory, stage + '-extract', 'tar', ['-xf', tar, '-C', target]);
  return target;
}
export function buildArguments({ name, runId, source, mavenHome, repository, javaImage }) {
  return ['run', '--rm', '--pull', 'never', '--name', name, '--label', LABEL + '=' + runId,
    '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--cpus', '2', '--memory', '2g',
    '--tmpfs', '/tmp:rw,nosuid,nodev,size=256m', '--mount', 'type=bind,source=' + source + ',target=/workspace',
    '--mount', 'type=bind,source=' + mavenHome + ',target=/opt/maven,readonly',
    '--mount', 'type=bind,source=' + repository + ',target=/maven-repository,readonly',
    '--mount', 'type=bind,source=' + resolve(ROOT, 'pipeline/p02/maven-settings.xml') + ',target=/settings.xml,readonly',
    '--workdir', '/workspace', '--env', 'MAVEN_OPTS=-Xms64m -Xmx768m', '--entrypoint', '/bin/sh', javaImage,
    '/opt/maven/bin/mvn', '-B', '-o', '-ntp', '--settings', '/settings.xml', '--global-settings', '/settings.xml',
    '-Dmaven.repo.local=/maven-repository', '-Dmaven.test.skip=true', '-pl', SERVICES.map(service => 'spring-petclinic-' + service).join(','), '-am', 'package'];
}
async function cleanupOwned(name, runId) {
  try {
    const owner = localDocker(['container', 'inspect', name, '--format', '{{ index .Config.Labels "' + LABEL + '" }}']);
    check(owner === runId && name.startsWith('p02-'), 'Refuse cleanup of non-owned container');
    localDocker(['container', 'rm', '--force', name]); return { name, removed: true };
  } catch (error) {
    const exists = localDocker(['container', 'ls', '-a', '--filter', 'name=^/' + name + '$', '--format', '{{.Names}}']);
    check(exists === '', 'Owned-container cleanup failed; do not remove anything else'); return { name, already_absent: true };
  }
}
async function manifest(directory, paths) {
  await write(directory, 'checksums.sha256', (await Promise.all([...new Set(paths)].sort().map(async name => hash(await readFile(resolve(directory, name))) + '  ' + name))).join('\n') + '\n');
}
async function evidenceFiles(directory, excluded) {
  const paths = [];
  async function visit(prefix = '') { for (const entry of await readdir(resolve(directory, prefix), { withFileTypes: true })) {
    if (!prefix && excluded.includes(entry.name)) continue;
    check(!entry.isSymbolicLink(), 'Symlink evidence'); const path = prefix + entry.name;
    if (entry.isDirectory()) await visit(path + '/'); else if (entry.name !== 'checksums.sha256') paths.push(path);
  } } await visit(); return paths;
}
export async function verifyBuildRun(runDirectory) {
  const directory = resolve(runDirectory);
  check(directory.startsWith(BUILD_ROOT + sep) && (await realpath(directory)).startsWith(await realpath(BUILD_ROOT) + sep), 'Build must be inside private P02 build root');
  const lines = (await readFile(resolve(directory, 'checksums.sha256'), 'utf8')).trim().split('\n'), seen = new Set();
  for (const line of lines) {
    const match = /^([a-f0-9]{64})  ([A-Za-z0-9_./-]+)$/.exec(line);
    check(match && !match[2].split('/').includes('..') && !match[2].startsWith('/') && !seen.has(match[2]), 'Unsafe/duplicate build checksum path');
    seen.add(match[2]); const file = resolve(directory, match[2]);
    check(!(await lstat(file)).isSymbolicLink() && await realpath(file) === file && hash(await readFile(file)) === match[1], 'Build artifact changed');
  }
  const build = await json(resolve(directory, 'build.json'));
  check(!seen.has('failure.json') && build.status === 'built_offline_not_runtime_verified' && build.source_commit === SOURCE_PIN && build.config_commit === CONFIG_PIN &&
    build.source_mutated === false && build.build_network === 'none' && build.cache_mount === 'read_only' && build.remote_model_calls === 0, 'Not an eligible pinned baseline build');
  check(hash(await readFile(resolve(directory, 'source.tar'))) === build.source_archive_sha256 &&
    hash(await readFile(resolve(directory, 'config.tar'))) === build.config_archive_sha256, 'Build archive mismatch');
  for (const service of SERVICES) check(build.jars[service]?.file === 'artifacts/' + service + '.jar' &&
    hash(await readFile(resolve(directory, build.jars[service].file))) === build.jars[service].sha256, 'JAR identity mismatch');
  return { directory, build, manifest_files: seen.size };
}
export function serviceArguments({ name, runId, network, service, javaImage, jar, config }) {
  check(SERVICES.includes(service), 'Unknown service; do not start GenAI/other stacks');
  const args = ['run', '--detach', '--rm', '--pull', 'never', '--name', name, '--label', LABEL + '=' + runId,
    '--network', network, '--network-alias', service, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    '--cpus', '1', '--memory', '768m', '--tmpfs', '/tmp:rw,nosuid,nodev,size=128m',
    '--mount', 'type=bind,source=' + jar + ',target=/p02.jar,readonly'];
  if (service === 'config-server') args.push('--mount', 'type=bind,source=' + config + ',target=/config,readonly');
  args.push('--entrypoint', 'java', javaImage, '-Xms64m', '-Xmx256m', '-jar', '/p02.jar');
  if (service === 'config-server') args.push('--spring.profiles.active=native', '--server.port=8888', '--spring.cloud.config.server.native.search-locations=file:/config');
  else args.push('--spring.profiles.active=docker', '--spring.config.import=configserver:http://config-server:8888',
    '--eureka.client.service-url.defaultZone=http://discovery-server:8761/eureka/',
    '--eureka.client.initial-instance-info-replication-interval-seconds=1', '--eureka.client.registry-fetch-interval-seconds=1', '--eureka.instance.lease-renewal-interval-in-seconds=1');
  if (service === 'discovery-server') args.push('--eureka.server.response-cache-update-interval-ms=1000');
  args.push('--management.tracing.enabled=false', '--management.endpoints.web.exposure.include=health,info');
  return args;
}
export async function runBaseline(options) {
  const verified = await verifyBuildRun(options.buildRun), preparation = await verifyP02Preparation(options.preparation);
  const javaImage = imageId(verified.build.java_image), pythonImage = imageId('python:3.11-slim');
  const runId = id(), directory = resolve(BASELINE_ROOT, runId), network = 'p02-net-' + runId.toLowerCase();
  await mkdir(directory, { recursive: true }); const owned = []; let networkCreated = false, error = null;
  const code = Object.fromEntries(await Promise.all(['scripts/run_p02_baseline.mjs', 'pipeline/p02/http-probe.py'].map(async file => [file, hash(await readFile(resolve(ROOT, file)))])));
  await write(directory, 'inputs.json', { schema: 'p02-baseline-inputs/1', run_id: runId, source_commit: SOURCE_PIN, config_commit: CONFIG_PIN,
    build_directory: verified.directory, build_metadata_sha256: hash(await readFile(resolve(verified.directory, 'build.json'))), jars: verified.build.jars,
    preparation_directory: preparation.directory, fixture_sha256: preparation.fixture_sha256, java_image: javaImage, python_image: pythonImage, code_sha256: code,
    full_matrix_authorized_or_executed: false, independent_universe_confirmation_received: false, mutated_execution: false, model_calls: 0 });
  const probe = async (stage, arguments_) => {
    const name = 'p02-' + runId.toLowerCase() + '-' + stage;
    owned.push(name);
    return command(directory, stage, 'docker', ['run', '--rm', '--pull', 'never', '--name', name, '--label', LABEL + '=' + runId,
      '--network', network, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--cpus', '0.5', '--memory', '128m',
      '--env', 'PYTHONDONTWRITEBYTECODE=1', '--mount', 'type=bind,source=' + resolve(ROOT, 'pipeline/p02') + ',target=/probe,readonly',
      '--mount', 'type=bind,source=' + directory + ',target=/run', '--mount', 'type=bind,source=' + preparation.directory + ',target=/input,readonly',
      '--entrypoint', 'python', pythonImage, '/probe/http-probe.py', ...arguments_, '--output', '/run/' + stage], 180000);
  };
  try {
    await mkdir(resolve(directory, 'config'));
    await command(directory, 'config-extract', 'tar', ['-xf', resolve(verified.directory, 'config.tar'), '-C', resolve(directory, 'config')]);
    await command(directory, 'network-create', 'docker', ['network', 'create', '--internal', '--label', LABEL + '=' + runId, network]); networkCreated = true;
    for (const service of SERVICES) {
      console.error('P02 baseline: start and wait ' + service);
      const name = 'p02-' + runId.toLowerCase() + '-' + service; owned.push(name);
      await command(directory, 'start-' + service, 'docker', serviceArguments({ name, runId, network, service, javaImage,
        jar: resolve(verified.directory, verified.build.jars[service].file), config: resolve(directory, 'config') }));
      await probe('ready-' + service, ['wait', '--target', { 'config-server': 'config', 'discovery-server': 'discovery',
        'customers-service': 'customers', 'visits-service': 'visits', 'api-gateway': 'gateway' }[service]]);
    }
    console.error('P02 baseline: capture nine read-only fixture requests + config/registry; no POST/mutation');
    await probe('observations', ['collect', '--fixture', '/input/spec/fixture.json']);
    for (const [file, before] of Object.entries(code)) check(hash(await readFile(resolve(ROOT, file))) === before, 'Runtime runner source changed mid-run');
    const observations = await json(resolve(directory, 'observations/observations.json'));
    check(observations.status === 'baseline_fixture_ready', 'Baseline setup not verified');
    await write(directory, 'result.json', { schema: 'p02-baseline-result/1', status: 'baseline_feasibility_verified_not_paired_runtime',
      run_id: runId, setup_assertions: observations.setup_assertions, fixture_http_observations: observations.fixture_requests_observed,
      full_matrix_executed: false, post_executed: false, mutated_executed: false, universe_locked: false, labels_created: false, model_calls: 0,
      note: 'Baseline-only setup evidence; not gold labels or a baseline/mutated comparison' });
  } catch (failure) { error = failure; await write(directory, 'failure.json', { status: 'baseline_failed_no_mutation_or_labels', message: failure.message, model_calls: 0 }); }
  finally {
    const cleanup = [];
    for (const service of SERVICES) {
      const name = 'p02-' + runId.toLowerCase() + '-' + service;
      if (!owned.includes(name)) continue;
      try { await write(directory, 'logs/' + service + '.log', localDocker(['logs', name])); }
      catch { await write(directory, 'logs/' + service + '-unavailable.json', { name, log_capture_failed: true }); }
    }
    for (const name of [...owned].reverse()) cleanup.push(await cleanupOwned(name, runId));
    if (networkCreated) {
      check(localDocker(['network', 'inspect', network, '--format', '{{ index .Labels "' + LABEL + '" }}']) === runId, 'Refuse cleanup of non-owned network');
      localDocker(['network', 'rm', network]);
    }
    await write(directory, 'cleanup.json', { containers: cleanup, network_removed: networkCreated });
    await manifest(directory, await evidenceFiles(directory, []));
  }
  if (error) throw new Error(error.message + '; evidence: ' + directory);
  return { directory, ...await json(resolve(directory, 'result.json')) };
}
export async function buildBaseline(options) {
  const source = await cleanPin(options.source, SOURCE_PIN), config = await cleanPin(options.config, CONFIG_PIN);
  const mavenHome = await realpath(resolve(options.mavenHome)), repository = await realpath(resolve(options.repository));
  for (const path of [source, config, mavenHome, repository]) check(!/[\r\n,]/.test(path), 'Unsafe mount path');
  const javaImage = imageId(options.javaImage ?? 'springcommunity/spring-petclinic-visits-service:latest');
  const runId = id(), directory = resolve(BUILD_ROOT, runId), name = 'p02-' + runId.toLowerCase() + '-build';
  await mkdir(directory, { recursive: true }); let error = null;
  try {
    console.error('P02: archive pinned baseline/config; no source mutation');
    const buildSource = await archive(directory, 'source', source, SOURCE_PIN);
    await archive(directory, 'config', config, CONFIG_PIN);
    const pinned = Object.fromEntries(await Promise.all(Object.keys(PINNED_SOURCE_SHA256).map(async file => [file, await readFile(resolve(buildSource, file), 'utf8')])));
    validatePinnedSources(pinned);
    console.error('P02: Maven offline build in network-none container; cache read-only');
    await command(directory, 'maven-build', 'docker', buildArguments({ name, runId, source: buildSource, mavenHome, repository, javaImage }), 300000);
    const jars = {};
    for (const service of SERVICES) {
      const file = 'artifacts/' + service + '.jar', original = resolve(buildSource, 'spring-petclinic-' + service, 'target/spring-petclinic-' + service + '-4.0.1.jar');
      const bytes = await readFile(original); await write(directory, file, bytes); jars[service] = { file, sha256: hash(bytes), bytes: bytes.length };
    }
    for (const [file, text] of Object.entries(pinned)) check(await readFile(resolve(buildSource, file), 'utf8') === text, 'Build modified pinned source');
    await cleanPin(source, SOURCE_PIN); await cleanPin(config, CONFIG_PIN);
    await write(directory, 'build.json', { schema: 'p02-baseline-build/1', status: 'built_offline_not_runtime_verified', run_id: runId,
      source_commit: SOURCE_PIN, config_commit: CONFIG_PIN, source_archive_sha256: hash(await readFile(resolve(directory, 'source.tar'))),
      config_archive_sha256: hash(await readFile(resolve(directory, 'config.tar'))), java_image: javaImage, jars, tests_executed: false,
      cache_mount: 'read_only', build_network: 'none', source_mutated: false, remote_model_calls: 0, labels_created: false });
  } catch (failure) { error = failure; await write(directory, 'failure.json', { message: failure.message, status: 'build_failed_not_runtime_verified', remote_model_calls: 0 }); }
  finally {
    await write(directory, 'cleanup.json', await cleanupOwned(name, runId));
    await manifest(directory, await evidenceFiles(directory, ['source', 'config']));
  }
  if (error) throw new Error(error.message + '; evidence: ' + directory);
  return { directory, status: 'built_offline_not_runtime_verified', services: SERVICES, remote_model_calls: 0 };
}

export function parseOptions(args) {
  const [action, ...rest] = args, result = { action };
  const names = action === 'build' ? { '--source': 'source', '--config': 'config', '--maven-home': 'mavenHome', '--maven-repository': 'repository', '--java-image': 'javaImage' } :
    action === 'baseline' ? { '--build-run': 'buildRun', '--preparation': 'preparation' } : null;
  check(names, 'Only build/baseline supported; mutated execution requires later input gates');
  for (let i = 0; i < rest.length; i += 2) {
    const name = names[rest[i]]; check(name && rest[i + 1] && !rest[i + 1].startsWith('--') && !Object.hasOwn(result, name), 'Unknown/duplicate/incomplete option'); result[name] = rest[i + 1];
  }
  const required = action === 'build' ? ['source', 'config', 'mavenHome', 'repository'] : ['buildRun', 'preparation'];
  check(required.every(key => result[key]), 'Explicit input paths required'); return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseOptions(process.argv.slice(2));
    console.log(encoded(options.action === 'build' ? await buildBaseline(options) : await runBaseline(options)));
  } catch (error) { console.error('P02 baseline failed: ' + error.message); process.exitCode = 1; }
}
