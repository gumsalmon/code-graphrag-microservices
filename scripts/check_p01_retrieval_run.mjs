// Read-only verification of immutable retrieval evidence, not prediction scoring.
import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import core from '../demo/p01/reasoning-core.js';
import { parseDataAsset } from './run_p01_reasoning.mjs';
import { buildRetrievalRequest, pairedPlan, retrievalInput } from '../reasoning/p01/retrieval-context.mjs';
import { buildGeminiRequest } from '../reasoning/p01/gemini-adapter.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUN_ROOT = resolve(ROOT, 'handoff-out/p01-retrieval');
const BUNDLE_SHA = '053fe6c2caa4c7b47c8fa40d413ebd3c00ea22828c52f56fb1c902081f041689';
const check = (value, message) => { if (!value) throw new Error(message); };
const json = async path => JSON.parse(await readFile(path, 'utf8'));

export async function verifyRun(path) {
  const directory = resolve(path);
  check(directory.startsWith(RUN_ROOT + sep), 'Run must be inside the private P01 retrieval output root');
  check((await realpath(directory)).startsWith(await realpath(RUN_ROOT) + sep), 'Run resolves outside the private output root');
  const names = new Set((await readdir(directory, { withFileTypes: true })).filter(item => item.isFile()).map(item => item.name));
  const seen = new Set();
  const manifest = (await readFile(resolve(directory, 'checksums.sha256'), 'utf8')).trim().split('\n');
  for (const line of manifest) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    check(match && names.has(match[2]) && dirname(resolve(directory, match[2])) === directory && !seen.has(match[2]), 'Unsafe/duplicate/missing manifest path');
    check(!(await lstat(resolve(directory, match[2]))).isSymbolicLink(), 'Symlinks are not accepted as evidence');
    check(await core.hash(await readFile(resolve(directory, match[2]))) === match[1], 'Checksum mismatch: ' + match[2]);
    seen.add(match[2]);
  }
  check(names.size === seen.size + 1 && names.has('checksums.sha256'), 'Unmanifested evidence file');
  check(!names.has('failure.json') && !names.has('final-integrity-failure.json'), 'Run contains a failure record');
  const run = await json(resolve(directory, 'run.json'));
  check(run.status === 'prepared_real_retrieval_no_llm_no_score' && run.remote_llm_calls === 0 && run.labels_read === false, 'Run is not an offline prepared retrieval');
  const before = await json(resolve(directory, 'code-provenance-before.json'));
  const after = await json(resolve(directory, 'code-provenance-after.json'));
  check(core.canonical(before.code_sha256) === core.canonical(after.code_sha256) && before.implementation.status === '' && after.implementation.status === '', 'Code/clone changed during the run');
  const bytes = await readFile(resolve(ROOT, 'demo/p01/data.js'));
  check(await core.hash(bytes) === BUNDLE_SHA, 'Frozen input bundle changed');
  const bundle = parseDataAsset(bytes.toString('utf8'));
  const source = await core.buildContext(bundle, { mode: 'source_only', depth: run.depth });
  const graphSource = await core.buildContext(bundle, { mode: 'graph_assisted', depth: run.depth });
  const input = await json(resolve(directory, 'input.json'));
  check(core.canonical(input) === core.canonical(await retrievalInput(source, { topK: run.top_k })), 'Input differs from baseline-only source projection');
  const corpus = await json(resolve(directory, 'corpus.json'));
  const report = await json(resolve(directory, 'retrieval.json'));
  const vector = await buildRetrievalRequest(source, corpus, report, { mode: 'vector_retrieved', depth: run.depth, byteBudget: run.byte_budget });
  const graph = await buildRetrievalRequest(source, corpus, report, { mode: 'graph_vector', depth: run.depth, byteBudget: run.byte_budget, graphRequest: graphSource });
  for (const [prefix, prepared] of [['vector', vector], ['graph-vector', graph]]) {
    check(core.canonical(prepared) === core.canonical(await json(resolve(directory, prefix + '-request.json'))), 'Prepared request cannot be reconstructed');
    check(core.canonical(prepared.context) === core.canonical(await json(resolve(directory, prefix + '-context.json'))), 'Context differs from request');
    check(core.canonical(buildGeminiRequest(prepared)) === core.canonical(await json(resolve(directory, prefix + '-provider-request.json'))), 'Provider plan differs from context/config');
  }
  check(core.canonical(pairedPlan(vector, graph)) === core.canonical(await json(resolve(directory, 'experiment-plan.json'))), 'Experiment plan differs from paired requests');
  return { directory, status: 'verified_retrieval_evidence_not_ground_truth', manifest_files: seen.size, chunk_count: corpus.length,
    corpus_sha256: report.corpus_sha256, ranked: report.ranked,
    requests_sha256: { vector: vector.request_sha256, graph_vector: graph.request_sha256 },
    remote_llm_calls: 0, prediction_scoring: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2); const paths = {};
    for (let index = 0; index < args.length; index += 2) {
      check(['--run', '--compare'].includes(args[index]) && args[index + 1] && !paths[args[index]], 'Usage: --run PATH [--compare PATH]');
      paths[args[index]] = args[index + 1];
    }
    check(paths['--run'], '--run required');
    const run = await verifyRun(paths['--run']);
    if (!paths['--compare']) console.log(JSON.stringify(run, null, 2));
    else {
      const compared = await verifyRun(paths['--compare']);
      const same = { corpus: run.corpus_sha256 === compared.corpus_sha256, rankings: core.canonical(run.ranked) === core.canonical(compared.ranked),
        prepared_requests: core.canonical(run.requests_sha256) === core.canonical(compared.requests_sha256) };
      check(Object.values(same).every(Boolean), 'Runs differ; inspect actual artifacts, do not overwrite them');
      console.log(JSON.stringify({ run, compared_run: compared.directory, matched: same }, null, 2));
    }
  } catch (error) { console.error('Retrieval evidence check failed: ' + error.message); process.exitCode = 1; }
}
