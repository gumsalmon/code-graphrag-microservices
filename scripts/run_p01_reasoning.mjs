import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import core from '../demo/p01/reasoning-core.js';
import { callOpenAI } from '../reasoning/p01/openai-adapter.mjs';
import { buildGeminiRequest, callGemini, GEMINI_MODEL, GEMINI_ENDPOINT } from '../reasoning/p01/gemini-adapter.mjs';
import { loadGeminiKey } from '../reasoning/p01/gemini-key.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_ROOT = resolve(REPO, 'handoff-out/p01-reasoning');

async function codeProvenance() {
  const git = args => execFileSync('git', ['-c', 'safe.directory=' + REPO.replaceAll('\\', '/'), ...args], { cwd: REPO, encoding: 'utf8' }).trim();
  const files = {};
  for (const path of ['demo/p01/reasoning-core.js', 'reasoning/p01/openai-adapter.mjs', 'reasoning/p01/gemini-adapter.mjs',
    'reasoning/p01/gemini-key.mjs', 'scripts/configure_gemini_key.ps1', 'scripts/run_p01_reasoning.mjs',
    'reasoning/p01/retrieval-context.mjs', 'reasoning/p01/retrieval-probe.py', 'scripts/run_p01_retrieval.mjs']) files[path] = await core.hash(await readFile(resolve(REPO, path)));
  return { git_head: git(['rev-parse', 'HEAD']), git_status: git(['status', '--porcelain=v1']),
    code_is_uncommitted: git(['status', '--porcelain=v1', '--', ...Object.keys(files)]) !== '',
    code_files_sha256: files, node: process.version, platform: process.platform, architecture: process.arch };
}

export function parseDataAsset(text) {
  const marker = '\nwindow.P01_DEMO_DATA = ';
  const index = text.indexOf(marker);
  if (index < 0 || !text.endsWith(';\n')) throw new Error('Unsupported data.js format');
  // JSON-only parsing: never execute arbitrary JavaScript from a data asset.
  return JSON.parse(text.slice(index + marker.length, -2));
}

async function saveRun(kind, files, metadata) {
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const id = new Date().toISOString().replace(/[-:.]/g, '') + '-' + kind + '-' + randomUUID().slice(0, 8);
  const directory = resolve(OUTPUT_ROOT, id);
  await mkdir(directory); // Refuse overwrites, including runs from the same second.
  files['code-provenance.json'] = JSON.stringify(await codeProvenance(), null, 2) + '\n';
  files['run.json'] = JSON.stringify({ schema: 'p01-reasoning-run/1', run_id: id, created_utc: new Date().toISOString(), ...metadata }, null, 2) + '\n';
  const entries = [];
  for (const [name, text] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    await writeFile(resolve(directory, name), text, { encoding: 'utf8', flag: 'wx' });
    entries.push(await core.hash(text) + '  ' + name);
  }
  await writeFile(resolve(directory, 'checksums.sha256'), entries.join('\n') + '\n', { flag: 'wx' });
  return directory;
}

export async function prepare({ mode = 'graph_assisted', depth = 2, byteBudget = 32768 } = {}) {
  const bytes = await readFile(resolve(REPO, 'demo/p01/data.js'));
  const bundle = parseDataAsset(bytes.toString('utf8'));
  const request = await core.buildContext(bundle, { mode, depth, byteBudget });
  const directory = await saveRun('prepared', {
    'context.json': JSON.stringify(request.context, null, 2) + '\n',
    'request.json': JSON.stringify(request, null, 2) + '\n',
  }, { status: 'prepared_offline_no_model_output', provider: null, model: null, remote_calls: 0, usage: null,
    request_sha256: request.request_sha256, context_sha256: request.context_sha256, context_bytes: request.context_bytes,
    input_data_sha256: await core.hash(bytes), mode, depth, output_scope: request.output_scope,
    runtime_in_model_context: false, labels_in_model_context: false, semantic_retrieval: 'not_integrated' });
  return { directory, request };
}

async function readRequest(path) {
  const request = JSON.parse(await readFile(resolve(path), 'utf8'));
  await core.verifyRequest(request);
  return request;
}

export async function validate({ requestFile, responseFile, model = null } = {}) {
  const request = await readRequest(requestFile);
  const bytes = await readFile(resolve(responseFile));
  const response = JSON.parse(bytes.toString('utf8'));
  const validated = await core.validateResponse(response, request);
  const directory = await saveRun('imported', {
    'request.json': JSON.stringify(request, null, 2) + '\n',
    'response.json': bytes.toString('utf8'),
    'validated.json': JSON.stringify(validated, null, 2) + '\n',
  }, { status: 'imported_response_not_provider_verified', provider: 'manual_import', declared_model: model,
    provider_identity_verified: false, remote_calls: 0, usage: null, request_sha256: request.request_sha256,
    response_sha256: await core.hash(bytes), semantic_correctness_verified: false, human_reviewed: false });
  return { directory, validated };
}

export async function providerPlan(options) {
  if (options.provider !== 'gemini') throw new Error('provider-plan currently requires --provider gemini');
  const request = await readRequest(options.requestFile);
  const model = options.model ?? GEMINI_MODEL;
  const payload = buildGeminiRequest(request, { model, maxOutputTokens: options.maxOutputTokens, thinkingLevel: options.thinkingLevel });
  const directory = await saveRun('gemini-plan', {
    'request.json': JSON.stringify(request, null, 2) + '\n',
    'provider-request.json': JSON.stringify(payload, null, 2) + '\n',
  }, { status: 'prepared_gemini_no_remote_call', provider: 'gemini_generate_content', requested_model: model,
    endpoint: GEMINI_ENDPOINT, generation_config: payload.generationConfig, request_sha256: request.request_sha256,
    provider_payload_sha256: await core.hash(core.canonical(payload)), remote_calls: 0, usage: null, estimated_cost: null });
  return { directory, status: 'prepared_gemini_no_remote_call', model, remote_calls: 0 };
}

export async function doctor(options = {}) {
  if (options.provider !== 'gemini') throw new Error('doctor currently requires --provider gemini');
  const credential = await loadGeminiKey();
  return { status: credential.key ? 'key_present_not_api_verified' : 'key_missing', provider: 'gemini_generate_content',
    model: GEMINI_MODEL, key_configured: Boolean(credential.key), credential_source: credential.source,
    endpoint: GEMINI_ENDPOINT, remote_calls: 0, note: 'No credential value, provider request, billing change or model call in this check' };
}

async function live(options) {
  const request = await readRequest(options.requestFile);
  const provider = options.provider ?? 'openai'; // Preserve old OpenAI CLI behavior; Gemini is explicit.
  if (!['openai', 'gemini'].includes(provider)) throw new Error('Unsupported provider');
  if (provider === 'openai' && (options.thinkingLevel !== undefined || options.confirmFreeTier)) throw new Error('Gemini-only options cannot be applied to OpenAI');
  const model = options.model ?? (provider === 'gemini' ? GEMINI_MODEL : undefined);
  let result;
  try {
    if (provider === 'gemini') {
      const credential = await loadGeminiKey();
      result = await callGemini(request, { model, apiKey: credential.key, confirmSend: options.confirmSend,
        confirmFreeTier: options.confirmFreeTier, maxOutputTokens: options.maxOutputTokens, thinkingLevel: options.thinkingLevel });
      result.provenance.credential_source = credential.source; // Never the credential value.
    } else {
      result = await callOpenAI(request, { model, apiKey: process.env.OPENAI_API_KEY,
        confirmSend: options.confirmSend, maxOutputTokens: options.maxOutputTokens });
    }
  } catch (error) {
    const { payload, raw, ...telemetry } = error.details ?? {};
    const files = { 'request.json': JSON.stringify(request, null, 2) + '\n' };
    if (payload) files['provider-request.json'] = JSON.stringify(payload, null, 2) + '\n';
    if (raw) files['provider-response.json'] = JSON.stringify(raw, null, 2) + '\n';
    const directory = await saveRun('failed', files,
      { status: 'failed_no_prediction', provider: provider === 'gemini' ? 'gemini_generate_content' : 'openai_responses', requested_model: model ?? null,
        request_sha256: request.request_sha256, error: error.message, error_code: error.code ?? null, remote_calls: null, usage: null, ...telemetry,
        retry_count: 0, note: 'Remote receipt is not known on failure; no response or fallback prediction accepted' });
    throw new Error(error.message + '; failure evidence: ' + directory);
  }
  const directory = await saveRun('live', {
    'request.json': JSON.stringify(request, null, 2) + '\n',
    'provider-request.json': JSON.stringify(result.payload, null, 2) + '\n',
    'provider-response.json': JSON.stringify(result.raw, null, 2) + '\n',
    'response.json': JSON.stringify(result.prediction, null, 2) + '\n',
    'validated.json': JSON.stringify(result.validated, null, 2) + '\n',
  }, { status: 'provider_prediction_not_ground_truth', ...result.provenance, request_sha256: request.request_sha256,
    semantic_correctness_verified: false, human_reviewed: false });
  return { directory, provenance: result.provenance };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command = 'prepare', ...args] = process.argv.slice(2);
    const options = {};
    const names = { '--mode': 'mode', '--depth': 'depth', '--context-bytes': 'byteBudget', '--request': 'requestFile',
      '--response': 'responseFile', '--model': 'model', '--max-output-tokens': 'maxOutputTokens', '--provider': 'provider', '--thinking-level': 'thinkingLevel' };
    for (let index = 0; index < args.length; index++) {
      if (args[index] === '--confirm-send') { options.confirmSend = true; continue; }
      if (args[index] === '--confirm-free-tier') { options.confirmFreeTier = true; continue; }
      const name = names[args[index]];
      if (!name || args[index + 1] === undefined || args[index + 1].startsWith('--')) throw new Error('Unknown/incomplete option');
      if (Object.hasOwn(options, name)) throw new Error('Duplicate option');
      const value = args[++index];
      options[name] = ['depth', 'byteBudget', 'maxOutputTokens'].includes(name) ? Number(value) : value;
    }
    const allowed = { prepare: ['mode', 'depth', 'byteBudget'], validate: ['requestFile', 'responseFile', 'model'],
      live: ['requestFile', 'model', 'confirmSend', 'maxOutputTokens', 'provider', 'thinkingLevel', 'confirmFreeTier'],
      'provider-plan': ['requestFile', 'provider', 'model', 'maxOutputTokens', 'thinkingLevel'], doctor: ['provider'] };
    if (!allowed[command] || Object.keys(options).some(key => !allowed[command].includes(key))) throw new Error('Usage: prepare | validate --request FILE --response FILE | provider-plan --provider gemini --request FILE | doctor --provider gemini | live --provider gemini --request FILE --confirm-send --confirm-free-tier');
    if (!['prepare', 'doctor'].includes(command) && !options.requestFile) throw new Error('--request is required');
    if (command === 'validate' && !options.responseFile) throw new Error('--response is required');
    const result = command === 'prepare' ? await prepare(options) : command === 'validate' ? await validate(options) :
      command === 'provider-plan' ? await providerPlan(options) : command === 'doctor' ? await doctor(options) : await live(options);
    console.log(JSON.stringify({ ...(command === 'doctor' ? result : {}), directory: result.directory, status: result.status ?? (command === 'prepare' ? 'prepared_offline_no_model_output' :
      command === 'validate' ? 'imported_response_not_provider_verified' : 'provider_prediction_not_ground_truth'
      ), context_sha256: result.request?.context_sha256, context_bytes: result.request?.context_bytes, provenance: result.provenance }, null, 2));
  } catch (error) {
    console.error('P01 reasoning failed: ' + error.message); process.exitCode = 1;
  }
}
