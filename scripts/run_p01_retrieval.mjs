import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import core from '../demo/p01/reasoning-core.js';
import { parseDataAsset } from './run_p01_reasoning.mjs';
import { retrievalInput, buildRetrievalRequest, pairedPlan, IMPLEMENTATION_SHA } from '../reasoning/p01/retrieval-context.mjs';
import { buildGeminiRequest } from '../reasoning/p01/gemini-adapter.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PREVIOUS = resolve(ROOT, 'handoff-out/p01-step1-20261012-02747b5d');
const IMAGE = 'sha256:63c6e72e510d658265cf956b0e589ec7b55c6049b766b6b68120253f7ee06281';
const BUNDLE_SHA = '053fe6c2caa4c7b47c8fa40d413ebd3c00ea22828c52f56fb1c902081f041689';
const CODE_FILES = ['demo/p01/reasoning-core.js', 'reasoning/p01/retrieval-context.mjs', 'reasoning/p01/retrieval-probe.py',
  'scripts/run_p01_retrieval.mjs', 'reasoning/p01/gemini-adapter.mjs'];
const command = (program, args) => execFileSync(program, args, { cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const git = (directory, args) => command('git', ['-c', 'safe.directory=' + directory.replaceAll('\\', '/'), '-C', directory, ...args]);

async function provenance(implementation) {
  return { git_head: git(ROOT, ['rev-parse', 'HEAD']), git_status: git(ROOT, ['status', '--porcelain=v1']),
    code_is_uncommitted: git(ROOT, ['status', '--porcelain=v1', '--', ...CODE_FILES]) !== '',
    code_sha256: Object.fromEntries(await Promise.all(CODE_FILES.map(async path => [path, await core.hash(await readFile(resolve(ROOT, path)))]))),
    implementation: { head: git(implementation, ['rev-parse', 'HEAD']), status: git(implementation, ['status', '--porcelain=v1']) },
    image_id: IMAGE, node: process.version, platform: process.platform };
}

async function runContainer(args) {
  return await new Promise((done, reject) => {
    const process = spawn('docker', args, { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    const timeout = setTimeout(() => { process.kill(); }, 180000);
    process.stdout.on('data', data => { stdout += data.toString(); });
    process.stderr.on('data', data => { stderr += data.toString(); });
    process.on('error', error => { clearTimeout(timeout); reject(error); });
    process.on('close', code => { clearTimeout(timeout); done({ exit_code: code, stdout, stderr }); });
  });
}

async function writeJson(directory, name, data) {
  await writeFile(resolve(directory, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
}

async function manifest(directory) {
  const entries = [];
  for (const name of (await readdir(directory, { withFileTypes: true })).filter(item => item.isFile()).map(item => item.name).sort()) {
    if (name === 'checksums.sha256') continue;
    entries.push(await core.hash(await readFile(resolve(directory, name))) + '  ' + name);
  }
  await writeFile(resolve(directory, 'checksums.sha256'), entries.join('\n') + '\n', { flag: 'wx' });
}

export async function runRetrieval({ topK = 5, depth = 2, byteBudget = 32768 } = {}) {
  if (!Number.isInteger(depth) || depth < 1 || depth > 3 || !Number.isInteger(byteBudget) || byteBudget < 1024 || byteBudget > 131072) throw new Error('Invalid depth/context budget');
  const bundleBytes = await readFile(resolve(ROOT, 'demo/p01/data.js'));
  if (await core.hash(bundleBytes) !== BUNDLE_SHA) throw new Error('Frozen demo input differs from recorded step 2');
  const bundle = parseDataAsset(bundleBytes.toString('utf8'));
  const sourceRequest = await core.buildContext(bundle, { mode: 'source_only', depth });
  const graphRequest = await core.buildContext(bundle, { mode: 'graph_assisted', depth });
  const input = await retrievalInput(sourceRequest, { topK });
  const implementation = resolve(PREVIOUS, 'implementation');
  if (git(implementation, ['rev-parse', 'HEAD']) !== IMPLEMENTATION_SHA || git(implementation, ['status', '--porcelain=v1']) !== '') throw new Error('Pinned implementation clone must remain clean');
  if (command('docker', ['image', 'inspect', IMAGE, '--format', '{{.Id}}']) !== IMAGE) throw new Error('Pinned local Python image unavailable; no automatic pull');
  const runId = new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8);
  const directory = resolve(ROOT, 'handoff-out/p01-retrieval', runId);
  await mkdir(directory, { recursive: true });
  const name = 'p01-retrieval-' + runId.toLowerCase();
  const args = ['run', '--rm', '--pull', 'never', '--name', name, '--label', 'code-graphrag.p01-retrieval=' + runId,
    '--cidfile', resolve(directory, 'container.id'), '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    '--cpus', '2', '--memory', '2g', '--tmpfs', '/tmp:rw,nosuid,nodev,size=256m',
    '--mount', 'type=bind,source=' + implementation + ',target=/implementation,readonly',
    '--mount', 'type=bind,source=' + resolve(ROOT, 'reasoning/p01') + ',target=/adapter,readonly',
    '--mount', 'type=bind,source=' + resolve(PREVIOUS, 'model-cache') + ',target=/root/.cache,readonly',
    '--mount', 'type=bind,source=' + directory + ',target=/run', '--workdir', '/run',
    '--env', 'PYTHONDONTWRITEBYTECODE=1', '--env', 'PYTHONUNBUFFERED=1', '--env', 'ANONYMIZED_TELEMETRY=False', '--env', 'OMP_NUM_THREADS=2',
    IMAGE, 'python', '/adapter/retrieval-probe.py', '--input', '/run/input.json', '--implementation', '/implementation', '--output', '/run'];
  await writeJson(directory, 'input.json', input);
  const before = await provenance(implementation);
  await writeJson(directory, 'code-provenance-before.json', before);
  await writeJson(directory, 'docker-command.json', { executable: 'docker', arguments: args, credential_environment_passed: false });
  let success = false;
  try {
    const result = await runContainer(args);
    await writeFile(resolve(directory, 'stdout.log'), result.stdout, { flag: 'wx' });
    await writeFile(resolve(directory, 'stderr.log'), result.stderr, { flag: 'wx' });
    if (result.exit_code !== 0) throw new Error('Chroma probe exit ' + result.exit_code + '; inspect preserved stderr.log');
    const corpus = JSON.parse(await readFile(resolve(directory, 'corpus.json'), 'utf8'));
    const report = JSON.parse(await readFile(resolve(directory, 'retrieval.json'), 'utf8'));
    const vector = await buildRetrievalRequest(sourceRequest, corpus, report, { mode: 'vector_retrieved', depth, byteBudget });
    const graph = await buildRetrievalRequest(sourceRequest, corpus, report, { mode: 'graph_vector', depth, byteBudget, graphRequest });
    const plan = pairedPlan(vector, graph);
    for (const [prefix, request] of [['vector', vector], ['graph-vector', graph]]) {
      await writeJson(directory, prefix + '-context.json', request.context);
      await writeJson(directory, prefix + '-request.json', request);
      await writeJson(directory, prefix + '-provider-request.json', buildGeminiRequest(request));
    }
    await writeJson(directory, 'experiment-plan.json', plan);
    await writeJson(directory, 'run.json', { run_id: runId, created_utc: new Date().toISOString(), status: 'prepared_real_retrieval_no_llm_no_score',
      depth, top_k: topK, byte_budget: byteBudget, remote_llm_calls: 0, model_downloads: 0, labels_read: false,
      corpus_sha256: report.corpus_sha256, chunk_count: report.chunk_count, source_input_sha256: sourceRequest.request_sha256,
      context_bytes: { vector: vector.context_bytes, graph_vector: graph.context_bytes }, database: 'private_runtime_cache_not_an_immutable_evidence_file',
      reviewer_approval: false, semantic_prediction_quality_verified: false });
    success = true;
    return { directory, status: 'prepared_real_retrieval_no_llm_no_score', chunk_count: report.chunk_count,
      selected_source_chunks: vector.context.evidence.filter(item => item.kind === 'source').length,
      context_bytes: { vector: vector.context_bytes, graph_vector: graph.context_bytes }, remote_llm_calls: 0 };
  } catch (error) {
    await writeJson(directory, 'failure.json', { status: 'failed_no_prediction', error: error.message, remote_llm_calls: 0, retry_count: 0 });
    throw new Error(error.message + '; evidence: ' + directory);
  } finally {
    // Only our exact named and labelled disposable container may be stopped.
    try {
      const label = command('docker', ['inspect', name, '--format', '{{index .Config.Labels "code-graphrag.p01-retrieval"}}']);
      if (label === runId) command('docker', ['stop', '--time', '5', name]);
    } catch { /* --rm normally removed the container already. */ }
    const after = await provenance(implementation);
    await writeJson(directory, 'code-provenance-after.json', after);
    if (after.implementation.head !== IMPLEMENTATION_SHA || after.implementation.status !== '' ||
      core.canonical(after.code_sha256) !== core.canonical(before.code_sha256)) {
      await writeJson(directory, 'final-integrity-failure.json', { status: 'invalidated_run_do_not_accept', reason: 'Code/implementation changed during execution' });
      await manifest(directory);
      throw new Error('Code/implementation changed; do not accept this run: ' + directory);
    }
    await manifest(directory);
    if (!success) console.error('Failed run retained without retry or generated predictions.');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const names = { '--top-k': 'topK', '--depth': 'depth', '--context-bytes': 'byteBudget' }; const options = {};
    for (let index = 2; index < process.argv.length; index += 2) {
      const name = names[process.argv[index]];
      if (!name || Object.hasOwn(options, name) || process.argv[index + 1] === undefined) throw new Error('Usage: --top-k N --depth 1|2|3 --context-bytes N');
      options[name] = Number(process.argv[index + 1]);
    }
    console.log(JSON.stringify(await runRetrieval(options), null, 2));
  } catch (error) { console.error('P01 retrieval failed: ' + error.message); process.exitCode = 1; }
}
