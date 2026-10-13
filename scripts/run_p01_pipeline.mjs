import { readFile, writeFile, mkdir, readdir, lstat, realpath } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import core from '../demo/p01/reasoning-core.js';
import { parseDataAsset } from './run_p01_reasoning.mjs';
import { retrievalInput, IMPLEMENTATION_SHA } from '../reasoning/p01/retrieval-context.mjs';
import { contextFromFreshGraph, preparePair } from '../pipeline/p01/context.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE_SHA = '053fe6c2caa4c7b47c8fa40d413ebd3c00ea22828c52f56fb1c902081f041689';
const NEO4J_IMAGE = 'neo4j@sha256:5a015e53de1895e7eee1574ae0325cf8c4b89587222778108c594bdd45a474b5';
const LABEL = 'code-graphrag.p01-pipeline';
const CODE = ['scripts/run_p01_pipeline.mjs', 'pipeline/p01/context.mjs', 'pipeline/p01/graph-probe.py',
  'demo/p01/reasoning-core.js', 'reasoning/p01/retrieval-probe.py', 'reasoning/p01/retrieval-context.mjs', 'reasoning/p01/gemini-adapter.mjs'];
const check = (ok, message) => { if (!ok) throw new Error(message); };
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const write = async (dir, name, value) => writeFile(resolve(dir, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function command(program, args) {
  try { return execFileSync(program, args, { cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 20000, maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
  catch { throw new Error(program + ' command failed: ' + args.slice(0, 4).join(' ') + '; check local prerequisites (no automatic setup/retry)'); }
}
const git = (dir, args) => command('git', ['-c', 'safe.directory=' + dir.replaceAll('\\', '/'), '-C', dir, ...args]);
async function provenance(implementation) {
  return { head: git(ROOT, ['rev-parse', 'HEAD']), status: git(ROOT, ['status', '--porcelain=v1']),
    code_sha256: Object.fromEntries(await Promise.all(CODE.map(async file => [file, await core.hash(await readFile(resolve(ROOT, file)))]))),
    implementation: { head: git(implementation, ['rev-parse', 'HEAD']), status: git(implementation, ['status', '--porcelain=v1', '--untracked-files=all']) },
    node: process.version, platform: process.platform };
}
async function manifest(directory) {
  const records = [];
  async function visit(dir) {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      check(!item.isSymbolicLink(), 'Symlink in evidence');
      if (item.name === 'chroma-db' && item.isDirectory()) continue;
      const path = resolve(dir, item.name);
      if (item.isDirectory()) await visit(path);
      else if (item.name !== 'checksums.sha256') records.push(await core.hash(await readFile(path)) + '  ' + path.slice(directory.length + 1).replaceAll('\\', '/'));
    }
  }
  await visit(directory);
  await write(directory, 'checksums.sha256', records.sort().join('\n') + '\n');
}
async function container(args, directory, stage) {
  await write(directory, stage + '-command.json', { executable: 'docker', args, credentials_passed: false, docker_socket_mounted: false });
  const result = await new Promise((done, reject) => {
    const child = spawn('docker', args, { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = ''; let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, 180000);
    child.stdout.on('data', bytes => { stdout += bytes; }); child.stderr.on('data', bytes => { stderr += bytes; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); done({ exit_code: code, timed_out: timedOut, stdout, stderr }); });
  });
  await write(directory, stage + '-stdout.log', result.stdout); await write(directory, stage + '-stderr.log', result.stderr);
  await write(directory, stage + '-exit.json', { exit_code: result.exit_code, timed_out: result.timed_out });
  check(result.exit_code === 0 && !result.timed_out, stage + ' failed; inspect preserved log, no retry/fallback');
}
export function parseOptions(args) {
  const [commandName = 'prepare', ...rest] = args;
  check(commandName === 'prepare', 'Usage: prepare [--implementation PATH] [--model-cache PATH] [--python-image NAME] [--top-k N] [--depth N] [--context-bytes N]');
  const names = { '--implementation': 'implementation', '--model-cache': 'modelCache', '--python-image': 'pythonImage', '--top-k': 'topK', '--depth': 'depth', '--context-bytes': 'byteBudget' };
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    const name = names[rest[i]];
    check(name && !Object.hasOwn(options, name) && rest[i + 1] && !rest[i + 1].startsWith('--'), 'Unknown/duplicate/incomplete option');
    options[name] = ['topK', 'depth', 'byteBudget'].includes(name) ? Number(rest[i + 1]) : rest[i + 1];
  }
  return options;
}
export async function preparePipeline(options = {}) {
  const topK = options.topK ?? 5, depth = options.depth ?? 2, byteBudget = options.byteBudget ?? 32768;
  check(Number.isInteger(topK) && topK >= 1 && topK <= 50 && Number.isInteger(depth) && depth >= 1 && depth <= 3 && Number.isInteger(byteBudget) && byteBudget >= 1024 && byteBudget <= 131072, 'Invalid top-k/depth/budget');
  const implementation = await realpath(resolve(ROOT, options.implementation ?? 'handoff-out/p01-deps/implementation'));
  const cache = await realpath(resolve(ROOT, options.modelCache ?? 'handoff-out/p01-deps/model-cache'));
  for (const path of [implementation, cache]) check(!(await lstat(path)).isSymbolicLink() && !/[\r\n,]/.test(path), 'Unsafe dependency mount path');
  check(git(implementation, ['rev-parse', 'HEAD']) === IMPLEMENTATION_SHA && git(implementation, ['status', '--porcelain=v1', '--untracked-files=all']) === '', 'Pinned implementation must be clean');
  check(await core.hash(await readFile(resolve(cache, 'chroma/onnx_models/all-MiniLM-L6-v2/onnx.tar.gz'))) === '913d7300ceae3b2dbc2c50d1de4baacab4be7b9380491c27fab7418616a16ec3', 'Model archive missing/changed; run explicit cache setup, no download during prepare');
  const pythonImage = options.pythonImage ?? 'code-graphrag-p01:py311';
  check(typeof pythonImage === 'string' && /^[A-Za-z0-9][A-Za-z0-9_./:@-]{0,250}$/.test(pythonImage), 'Invalid image reference');
  const imageId = command('docker', ['image', 'inspect', pythonImage, '--format', '{{.Id}}']);
  check(/^sha256:[a-f0-9]{64}$/.test(imageId), 'Missing Python image; setup is explicit');
  command('docker', ['image', 'inspect', NEO4J_IMAGE, '--format', '{{.Id}}']);
  const bytes = await readFile(resolve(ROOT, 'demo/p01/data.js'));
  check(await core.hash(bytes) === BUNDLE_SHA, 'Frozen source input changed');
  const sourceRequest = await core.buildContext(parseDataAsset(bytes.toString('utf8')), { mode: 'source_only', depth, byteBudget });
  const input = await retrievalInput(sourceRequest, { topK });
  const patch = sourceRequest.context.evidence.find(e => e.kind === 'proposed_patch').text;
  const runId = new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8);
  const directory = resolve(ROOT, 'handoff-out/p01-pipeline', runId);
  await mkdir(directory, { recursive: true });
  const before = await provenance(implementation);
  await write(directory, 'input.json', input); await write(directory, 'code-before.json', before);
  const network = 'p01-pipeline-' + runId.toLowerCase(); const owned = [];
  const common = ['--rm', '--pull', 'never', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--cpus', '2', '--memory', '2g', '--tmpfs', '/tmp:rw,nosuid,nodev,size=256m',
    '--mount', 'type=bind,source=' + implementation + ',target=/implementation,readonly',
    '--mount', 'type=bind,source=' + resolve(ROOT, 'pipeline/p01') + ',target=/adapter,readonly',
    '--mount', 'type=bind,source=' + resolve(ROOT, 'reasoning/p01') + ',target=/retrieval-adapter,readonly',
    '--mount', 'type=bind,source=' + directory + ',target=/run', '--workdir', '/run',
    '--env', 'PYTHONDONTWRITEBYTECODE=1', '--env', 'PYTHONUNBUFFERED=1', '--env', 'ANONYMIZED_TELEMETRY=False', '--env', 'OMP_NUM_THREADS=2'];
  let failure = null;
  try {
    command('docker', ['network', 'create', '--internal', '--label', LABEL + '=' + runId, network]);
    for (const snapshot of ['baseline', 'mutated']) {
      console.error('P01 stage: fresh graph ' + snapshot);
      await mkdir(resolve(directory, snapshot));
      const name = network + '-' + snapshot;
      const neoArgs = ['run', '--rm', '--pull', 'never', '--detach', '--name', name, '--label', LABEL + '=' + runId, '--network', network,
        '--memory', '1g', '--env', 'NEO4J_AUTH=none', '--env', 'NEO4J_server_memory_heap_initial__size=256m', '--env', 'NEO4J_server_memory_heap_max__size=256m', '--env', 'NEO4J_server_memory_pagecache_size=128m', NEO4J_IMAGE];
      await write(directory, snapshot + '-neo4j-command.json', { executable: 'docker', args: neoArgs, published_ports: [], auth_disabled_on_private_internal_network_only: true });
      const cid = command('docker', neoArgs); owned.push({ name, cid });
      check(/^[a-f0-9]{64}$/.test(cid), 'Unexpected container ID');
      await container(['run', '--name', name + '-probe', '--label', LABEL + '=' + runId, '--network', network, ...common,
        imageId, 'python', '/adapter/graph-probe.py', '--input', '/run/input.json', '--implementation', '/implementation', '--output', '/run/' + snapshot,
        '--snapshot', snapshot, '--uri', 'bolt://' + name + ':7687', '--run-id', runId], directory, snapshot);
      check(command('docker', ['inspect', name, '--format', '{{index .Config.Labels "' + LABEL + '"}}']) === runId, 'Cleanup ownership mismatch');
      await write(directory, snapshot + '-neo4j.log', command('docker', ['logs', name]));
      command('docker', ['stop', '--time', '5', name]);
    }
    console.error('P01 stage: real Chroma retrieval, network none');
    await mkdir(resolve(directory, 'retrieval'));
    await container(['run', '--name', network + '-retrieval', '--label', LABEL + '=' + runId, '--network', 'none', ...common,
      '--mount', 'type=bind,source=' + cache + ',target=/root/.cache,readonly', imageId, 'python', '/retrieval-adapter/retrieval-probe.py',
      '--input', '/run/input.json', '--implementation', '/implementation', '--output', '/run/retrieval'], directory, 'retrieval');
    const graph = await json(resolve(directory, 'baseline/parser-output.json'));
    const query = await json(resolve(directory, 'baseline/query-result.json'));
    const environment = await json(resolve(directory, 'baseline/environment.json'));
    check(await readFile(resolve(directory, 'mutated/mutation.patch'), 'utf8') === patch, 'Fresh mutation patch differs from original approved patch');
    const sources = {};
    for (const item of input.sources) sources[item.file] = await readFile(resolve(directory, 'baseline/source', item.file.split('/').at(-1)), 'utf8');
    const fresh = await contextFromFreshGraph({ input, patch, graph, query, environment, sources,
      graphText: await readFile(resolve(directory, 'baseline/parser-output.json'), 'utf8'),
      queryText: await readFile(resolve(directory, 'baseline/query-result.json'), 'utf8'),
      environmentText: await readFile(resolve(directory, 'baseline/environment.json'), 'utf8') }, { depth, byteBudget });
    const corpus = await json(resolve(directory, 'retrieval/corpus.json'));
    const retrieval = await json(resolve(directory, 'retrieval/retrieval.json'));
    const pair = await preparePair(fresh, corpus, retrieval, { depth, byteBudget });
    for (const [prefix, request, payload] of [['vector', pair.vector, pair.providerPlans.vector], ['graph-vector', pair.graph, pair.providerPlans.graph]]) {
      await write(directory, prefix + '-request.json', request); await write(directory, prefix + '-provider-request.json', payload);
    }
    await write(directory, 'experiment-plan.json', pair.plan);
    await write(directory, 'prepared.json', { schema: 'p01-pipeline-prepared/1', status: 'prepared_fresh_graph_and_retrieval_no_llm',
      run_id: runId, python_image_id: imageId, neo4j_image: NEO4J_IMAGE, depth, top_k: topK, byte_budget: byteBudget,
      request_sha256: { vector: pair.vector.request_sha256, graph_vector: pair.graph.request_sha256 },
      context_bytes: { vector: pair.vector.context_bytes, graph_vector: pair.graph.context_bytes },
      graph_source: 'this run fresh parser/Cypher/Neo4j; no stored graph substitution',
      remote_llm_calls: 0, labels_read: false, scoring_enabled: false, reviewer_approval: false, paper_result: false });
  } catch (error) { failure = error; await write(directory, 'failure.json', { status: 'failed_no_prediction', error: error.message, remote_llm_calls: 0 }); }
  finally {
    for (const name of [...owned.map(x => x.name), network + '-baseline-probe', network + '-mutated-probe', network + '-retrieval']) {
      try { if (command('docker', ['inspect', name, '--format', '{{index .Config.Labels "' + LABEL + '"}}']) === runId) command('docker', ['stop', '--time', '5', name]); } catch { /* --rm normally removes these. */ }
    }
    try { if (command('docker', ['network', 'inspect', network, '--format', '{{index .Labels "' + LABEL + '"}}']) === runId) command('docker', ['network', 'rm', network]); } catch (error) { failure ??= error; }
    try {
      const residualContainers = command('docker', ['ps', '-a', '--filter', 'label=' + LABEL + '=' + runId, '--format', '{{.Names}}']);
      const residualNetworks = command('docker', ['network', 'ls', '--filter', 'label=' + LABEL + '=' + runId, '--format', '{{.Name}}']);
      await write(directory, 'cleanup.json', { owned_label: LABEL + '=' + runId, residual_containers: residualContainers, residual_networks: residualNetworks });
      check(residualContainers === '' && residualNetworks === '', 'Owned resources remain; run cannot pass cleanup');
    } catch (error) { failure ??= error; }
    const after = await provenance(implementation); await write(directory, 'code-after.json', after);
    if (core.canonical(before) !== core.canonical(after)) {
      failure ??= new Error('Code/provenance changed during execution');
      await write(directory, 'integrity-failure.json', { status: 'invalidated', reason: 'Code/provenance changed' });
    }
    await write(directory, 'result.json', { status: failure ? 'failed_no_prediction' : 'prepared_fresh_graph_and_retrieval_no_llm',
      run_id: runId, error: failure?.message ?? null, remote_llm_calls: 0, labels_read: false, scoring_enabled: false });
    await manifest(directory);
  }
  if (failure) throw new Error(failure.message + '; evidence: ' + directory);
  return { directory, status: 'prepared_fresh_graph_and_retrieval_no_llm', remote_llm_calls: 0, labels_read: false };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await preparePipeline(parseOptions(process.argv.slice(2))), null, 2)); }
  catch (error) { console.error('P01 pipeline failed: ' + error.message); process.exitCode = 1; }
}
