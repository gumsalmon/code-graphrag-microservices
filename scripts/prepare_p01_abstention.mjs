// Fork only the request contract. No credential loader, inference, response replay or scoring.
import { readFile, readdir, lstat, realpath, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import core from '../demo/p01/reasoning-core.js';
import { buildGeminiRequest } from '../reasoning/p01/gemini-adapter.mjs';
import { pairedPlan } from '../reasoning/p01/retrieval-context.mjs';
import { verifyRun } from './check_p01_retrieval_run.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'handoff-out/p01-contract');
const check = (ok, message) => { if (!ok) throw new Error(message); };
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const FILES = ['vector-request.json', 'graph-vector-request.json', 'vector-provider-request.json', 'graph-vector-provider-request.json',
  'experiment-plan.json', 'origin.json', 'code-provenance.json', 'run.json'];

export async function prepareContractPair({ retrievalRun }) {
  const verified = await verifyRun(retrievalRun);
  const source = verified.directory;
  const manifestBefore = await core.hash(await readFile(resolve(source, 'checksums.sha256')));
  const requests = {};
  for (const prefix of ['vector', 'graph-vector']) requests[prefix] = await core.withAbstentionContract(await json(resolve(source, prefix + '-request.json')));
  const plan = pairedPlan(requests.vector, requests['graph-vector']);
  const git = args => execFileSync('git', ['-c', 'safe.directory=' + ROOT.replaceAll('\\', '/'), ...args], { cwd: ROOT, encoding: 'utf8' }).trim();
  const code = {};
  for (const file of ['demo/p01/reasoning-core.js', 'reasoning/p01/retrieval-context.mjs', 'reasoning/p01/gemini-adapter.mjs', 'scripts/prepare_p01_abstention.mjs'])
    code[file] = await core.hash(await readFile(resolve(ROOT, file)));
  const created = new Date().toISOString();
  const files = {
    'vector-request.json': requests.vector, 'graph-vector-request.json': requests['graph-vector'],
    'vector-provider-request.json': buildGeminiRequest(requests.vector),
    'graph-vector-provider-request.json': buildGeminiRequest(requests['graph-vector']),
    'experiment-plan.json': plan,
    'origin.json': { retrieval_directory: source, manifest_sha256: manifestBefore, original_request_sha256: verified.requests_sha256,
      historical_predictions_read: false, historical_runs_modified: false },
    'code-provenance.json': { git_head: git(['rev-parse', 'HEAD']), git_status: git(['status', '--porcelain=v1']),
      code_sha256: code, node: process.version, new_code_is_uncommitted: git(['status', '--porcelain=v1', '--', ...Object.keys(code)]) !== '' },
    'run.json': { schema: 'p01-contract-preparation/1', created_utc: created, status: 'prepared_abstention_contract_no_llm_no_rescoring',
      prompt_version: core.ABSTENTION_PROMPT_VERSION, response_contract: 'pure_unknown_abstention/2',
      request_sha256: { vector: requests.vector.request_sha256, graph_vector: requests['graph-vector'].request_sha256 },
      remote_calls: 0, usage: null, scoring_enabled: false, human_reviewed: false, labels_status: 'pending_review' },
  };
  await verifyRun(source);
  check(await core.hash(await readFile(resolve(source, 'checksums.sha256'))) === manifestBefore, 'Original retrieval manifest changed');
  await mkdir(OUTPUT, { recursive: true });
  const directory = resolve(OUTPUT, created.replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8)); await mkdir(directory);
  const manifest = [];
  for (const [name, value] of Object.entries(files)) {
    const bytes = JSON.stringify(value, null, 2) + '\n';
    await writeFile(resolve(directory, name), bytes, { flag: 'wx' }); manifest.push(await core.hash(bytes) + '  ' + name);
  }
  await writeFile(resolve(directory, 'checksums.sha256'), manifest.join('\n') + '\n', { flag: 'wx' });
  return verifyContractPreparation(directory);
}

export async function verifyContractPreparation(path) {
  const directory = resolve(path);
  check(directory.startsWith(OUTPUT + sep) && (await realpath(directory)).startsWith(await realpath(OUTPUT) + sep), 'Contract run must be inside private output root');
  const seen = new Set();
  for (const line of (await readFile(resolve(directory, 'checksums.sha256'), 'utf8')).trim().split('\n')) {
    const match = /^([a-f0-9]{64})  ([a-z-]+\.json)$/.exec(line);
    check(match && FILES.includes(match[2]) && !seen.has(match[2]), 'Unsafe/duplicate contract manifest entry');
    const file = resolve(directory, match[2]); const stat = await lstat(file);
    check(stat.isFile() && !stat.isSymbolicLink() && await core.hash(await readFile(file)) === match[1], 'Contract artifact mismatch');
    seen.add(match[2]);
  }
  check(seen.size === FILES.length && (await readdir(directory)).length === FILES.length + 1, 'Missing/unmanifested contract artifact');
  const origin = await json(resolve(directory, 'origin.json'));
  check(origin.historical_predictions_read === false && origin.historical_runs_modified === false, 'Contract preparation must not reclassify historical predictions');
  const previous = await verifyRun(origin.retrieval_directory);
  check(await core.hash(await readFile(resolve(previous.directory, 'checksums.sha256'))) === origin.manifest_sha256 &&
    core.canonical(origin.original_request_sha256) === core.canonical(previous.requests_sha256), 'Original input changed');
  const requests = {};
  for (const prefix of ['vector', 'graph-vector']) {
    const expected = await core.withAbstentionContract(await json(resolve(previous.directory, prefix + '-request.json')));
    requests[prefix] = await json(resolve(directory, prefix + '-request.json'));
    await core.verifyRequest(requests[prefix]);
    check(core.canonical(expected) === core.canonical(requests[prefix]), 'Contract fork differs from original inputs');
    check(core.canonical(buildGeminiRequest(expected)) === core.canonical(await json(resolve(directory, prefix + '-provider-request.json'))), 'Contract provider payload differs');
  }
  check(core.canonical(pairedPlan(requests.vector, requests['graph-vector'])) === core.canonical(await json(resolve(directory, 'experiment-plan.json'))), 'Contract pair plan differs');
  const run = await json(resolve(directory, 'run.json'));
  check(run.status === 'prepared_abstention_contract_no_llm_no_rescoring' && run.prompt_version === core.ABSTENTION_PROMPT_VERSION &&
    run.response_contract === 'pure_unknown_abstention/2' &&
    run.remote_calls === 0 && run.usage === null && run.scoring_enabled === false && run.human_reviewed === false && run.labels_status === 'pending_review', 'Invalid contract run status');
  check(core.canonical(run.request_sha256) === core.canonical({ vector: requests.vector.request_sha256, graph_vector: requests['graph-vector'].request_sha256 }), 'Contract run request hashes differ');
  return { directory, status: run.status, prompt_version: run.prompt_version, manifest_files: seen.size,
    request_sha256: run.request_sha256, remote_calls: 0, historical_predictions_reclassified: false, scoring_enabled: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    check(args.length === 2 && ['--retrieval-run', '--check'].includes(args[0]), 'Usage: --retrieval-run DIRECTORY | --check DIRECTORY');
    console.log(JSON.stringify(args[0] === '--check' ? await verifyContractPreparation(args[1]) : await prepareContractPair({ retrievalRun: args[1] }), null, 2));
  } catch (error) { console.error('Abstention contract preparation failed: ' + error.message); process.exitCode = 1; }
}
