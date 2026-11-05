// Read-only inspection of saved attempts; the only write is a new private comparison bundle.
import { readFile, readdir, lstat, realpath, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import core from '../demo/p01/reasoning-core.js';
import comparison from '../demo/p01/comparison-core.js';
import { buildGeminiRequest, parseGeminiResponse } from '../reasoning/p01/gemini-adapter.mjs';
import { parseDataAsset } from './run_p01_reasoning.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUN_ROOT = resolve(ROOT, 'handoff-out/p01-reasoning');
const OUTPUT_ROOT = resolve(ROOT, 'handoff-out/p01-comparison');
const check = (ok, message) => { if (!ok) throw new Error(message); };

export async function readRun(path) {
  const directory = resolve(path);
  check(directory.startsWith(RUN_ROOT + sep) && !(await lstat(directory)).isSymbolicLink() &&
    (await realpath(directory)).startsWith(await realpath(RUN_ROOT) + sep), 'Run must resolve inside private reasoning output root');
  const files = new Map(); const hashes = {};
  const allowed = new Set(['request.json', 'provider-request.json', 'provider-response.json', 'response.json', 'validated.json', 'run.json', 'code-provenance.json']);
  const manifest = (await readFile(resolve(directory, 'checksums.sha256'), 'utf8')).trim().split('\n');
  for (const line of manifest) {
    const match = /^([a-f0-9]{64})  ([a-z-]+\.json)$/.exec(line);
    check(match && allowed.has(match[2]) && !files.has(match[2]), 'Unsafe/duplicate manifest entry');
    const name = match[2]; const path = resolve(directory, name);
    check((await lstat(path)).isFile() && !(await lstat(path)).isSymbolicLink(), 'Evidence must be regular files');
    const bytes = await readFile(path);
    check(await core.hash(bytes) === match[1], 'Checksum mismatch: ' + name);
    hashes[name] = match[1]; files.set(name, JSON.parse(bytes.toString('utf8')));
  }
  const names = await readdir(directory);
  check(names.length === files.size + 1 && names.every(name => name === 'checksums.sha256' || files.has(name)), 'Unmanifested evidence');
  for (const name of ['request.json', 'provider-request.json', 'run.json', 'code-provenance.json']) check(files.has(name), 'Missing ' + name);
  const request = files.get('request.json'); await core.verifyRequest(request);
  const run = files.get('run.json'); const code = files.get('code-provenance.json');
  check(run.request_sha256 === request.request_sha256, 'Run request hash differs');
  const payload = buildGeminiRequest(request);
  check(core.canonical(payload) === core.canonical(files.get('provider-request.json')) &&
    core.canonical(payload.generationConfig) === core.canonical(run.generation_config), 'Provider payload/config differs');
  const raw = files.get('provider-response.json');
  let response = null;
  if (raw) {
    check(raw.modelVersion === run.returned_model && raw.responseId === run.provider_response_id &&
      core.canonical(raw.usageMetadata ?? null) === core.canonical(run.usage) &&
      raw.candidates?.[0]?.finishReason === run.finish_reason, 'Provider/run metadata differs');
    // Preserve syntactically readable rejected JSON, without accepting it as a prediction.
    try { response = parseGeminiResponse(raw); } catch { /* Remains null; original evidence is retained. */ }
  }
  if (run.status === 'provider_prediction_not_ground_truth') {
    check(response && core.canonical(response) === core.canonical(files.get('response.json')), 'Accepted response differs from raw provider');
    check(core.canonical(await core.validateResponse(response, request)) === core.canonical(files.get('validated.json')), 'Validation differs from saved run');
  } else check(run.status === 'failed_no_prediction' && !files.has('response.json') && !files.has('validated.json'), 'Failed run must not contain an accepted prediction');
  const usage = run.usage === null ? null : { prompt: run.usage.promptTokenCount ?? null, output: run.usage.candidatesTokenCount ?? null,
    thoughts: run.usage.thoughtsTokenCount ?? null, total: run.usage.totalTokenCount ?? null };
  return { request, response, artifact_checksums: hashes, run: {
    run_id: run.run_id, status: run.status, request_sha256: run.request_sha256, provider: run.provider,
    requested_model: run.requested_model, returned_model: run.returned_model ?? null, provider_response_id: run.provider_response_id ?? null,
    elapsed_ms: run.elapsed_ms ?? null, usage, remote_calls: run.remote_calls, retry_count: run.retry_count,
    error_code: run.error_code ?? null, http_status: run.http_status ?? null, provider_error: run.provider_error ?? null,
    generation_config_sha256: await core.hash(core.canonical(run.generation_config)),
    git_head: code.git_head, code_is_uncommitted: code.code_is_uncommitted, code_files_sha256: code.code_files_sha256,
  } };
}

export async function packagePair({ vectorRun, graphRun }) {
  const vector = await readRun(vectorRun); const graph = await readRun(graphRun);
  const bundle = await comparison.seal({ schema: 'p01-local-comparison/1', created_utc: new Date().toISOString(),
    entries: { vector, graph_vector: graph } });
  const inspection = await comparison.inspectPair(bundle);
  await comparison.verifyViewerSources(bundle, parseDataAsset(await readFile(resolve(ROOT, 'demo/p01/data.js'), 'utf8')));
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const directory = resolve(OUTPUT_ROOT, new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8));
  await mkdir(directory);
  const bytes = JSON.stringify(bundle, null, 2) + '\n';
  await writeFile(resolve(directory, 'comparison.json'), bytes, { flag: 'wx' });
  await writeFile(resolve(directory, 'checksums.sha256'), await core.hash(bytes) + '  comparison.json\n', { flag: 'wx' });
  return { directory, status: 'packaged_local_attempts_not_scored', outcomes: inspection.outcomes,
    manifest_files: { vector: Object.keys(vector.artifact_checksums).length, graph_vector: Object.keys(graph.artifact_checksums).length },
    remote_calls: 0, provider_identity_verified_by_browser: false, both_structurally_valid: inspection.both_structurally_valid };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2); const options = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = { '--vector-run': 'vectorRun', '--graph-run': 'graphRun' }[args[i]];
      check(key && args[i + 1] && !options[key], 'Usage: --vector-run DIRECTORY --graph-run DIRECTORY'); options[key] = args[i + 1];
    }
    check(options.vectorRun && options.graphRun, 'Both saved runs are required');
    const result = await packagePair(options);
    console.log(JSON.stringify({ ...result, outcomes: Object.fromEntries(Object.entries(result.outcomes).map(([key, value]) =>
      [key, { status: value.status, diagnostic: value.diagnostic }])) }, null, 2));
  } catch (error) { console.error('Comparison package failed: ' + error.message); process.exitCode = 1; }
}
