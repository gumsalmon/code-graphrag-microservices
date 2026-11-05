import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import core from '../../demo/p01/reasoning-core.js';
import { parseDataAsset } from '../../scripts/run_p01_reasoning.mjs';
import { buildGeminiRequest } from './gemini-adapter.mjs';
import { retrievalInput, buildRetrievalRequest, pairedPlan, SOURCE_SHA, IMPLEMENTATION_SHA, MODEL_ARCHIVE_SHA, REUSED_CODE_SHA } from './retrieval-context.mjs';

const bundle = parseDataAsset(await readFile(new URL('../../demo/p01/data.js', import.meta.url), 'utf8'));
const sourceRequest = await core.buildContext(bundle, { mode: 'source_only' });
const graphRequest = await core.buildContext(bundle);

// Synthetic ranking/chunk metadata for guards ONLY, never a persisted retrieval
// result or a claim about which chunks Chroma returns in production.
async function fixture() {
  const input = await retrievalInput(sourceRequest, { topK: 3 });
  const corpus = [];
  for (const source of input.sources) {
    const nodes = sourceRequest.context.method_universe.filter(node => node.file === source.file);
    const add = async (id, type, start, end) => {
      const content = source.text.split('\n').slice(start - 1, end).join('\n').trim();
      const service = nodes[0].service; const fqn = nodes[0].method_id.split('::')[1].split('#')[0];
      corpus.push({ chunk_id: id, chunk_type: type, file: source.file, class_fqn: fqn, service, line_start: start, line_end: end,
        content, document: '// File: ' + source.file + ' | Service: ' + service + '\n' + content,
        source_sha256: source.sha256, content_sha256: await core.hash(content) });
    };
    await add(nodes[0].method_id.split('#')[0] + '#HEADER', 'CLASS_HEADER', 1, source.text.split('\n').length);
    for (const node of nodes) await add(node.method_id, 'METHOD', node.line_start, node.line_end);
  }
  corpus.sort((a, b) => a.chunk_id < b.chunk_id ? -1 : a.chunk_id > b.chunk_id ? 1 : 0);
  const ranked = corpus.slice(0, 3).map((item, index) => ({ chunk_id: item.chunk_id, distance: (index + 1) / 10 }));
  const report = { schema: 'p01-chroma-retrieval/1', status: 'real_offline_retrieval_not_prediction', source_commit: SOURCE_SHA,
    implementation_commit: IMPLEMENTATION_SHA, implementation_code_sha256: structuredClone(REUSED_CODE_SHA), corpus_sha256: await core.hash(core.canonical(corpus)),
    query: input.query, query_sha256: input.query_sha256, top_k: 3, chunk_count: corpus.length, ranked, reopened_ranked: structuredClone(ranked),
    distance_metric: 'l2_squared', distance_is_probability: false, metrics_computed: false, model_downloads: 0, llm_calls: 0, elapsed_ms: 1,
    embedding: { model: 'all-MiniLM-L6-v2', dimension: 384, archive_sha256: MODEL_ARCHIVE_SHA },
    environment: { dependencies: { chromadb: '1.5.9' }, container_network: 'none', model_cache_mount: 'read_only' } };
  return { corpus, report };
}

async function request(mode = 'vector_retrieved', extra = {}) {
  const { corpus, report } = await fixture();
  return await buildRetrievalRequest(sourceRequest, corpus, report, { mode, graphRequest, ...extra });
}

async function rehash(value) {
  value.context_sha256 = await core.hash(core.canonical(value.context));
  value.context_bytes = new TextEncoder().encode(core.canonical(value.context)).length;
  const { request_sha256, ...payload } = value;
  value.request_sha256 = await core.hash(core.canonical(payload));
  return value;
}

test('Python packet accepts only explicit source/seed/change query, not graph, runtime or labels', async () => {
  const input = await retrievalInput(sourceRequest);
  assert.deepEqual(Object.keys(input).sort(), ['schema', 'source_commit', 'implementation_commit', 'sources', 'seed_id', 'query', 'query_sha256', 'top_k'].sort());
  assert.equal(input.sources.length, 3);
  assert.equal(input.top_k, 5);
  assert.ok(input.query.includes('includeDetails'));
  assert.ok(!input.query.includes('getOwnerDetails'));
  assert.ok(!input.query.includes('getVisitsForPets'));
  for (const item of input.sources) assert.equal(await core.hash(item.text), item.sha256);
});

test('vector context never accesses the supplied graph option and contains no graph evidence', async () => {
  const { corpus, report } = await fixture();
  const options = { mode: 'vector_retrieved', get graphRequest() { throw new Error('hidden graph accessed'); } };
  const prepared = await buildRetrievalRequest(sourceRequest, corpus, report, options);
  assert.equal(Object.hasOwn(prepared.context, 'graph'), false);
  assert.ok(prepared.context.evidence.every(item => ['source', 'proposed_patch'].includes(item.kind)));
  assert.equal(prepared.context.limits.labels_available, false);
  assert.equal(prepared.context.limits.runtime_available, false);
});

test('paired configurations share source excerpts, seed, patch, universe, ranking, budget, prompt and output schema', async () => {
  const vector = await request(); const graph = await request('graph_vector');
  const plan = pairedPlan(vector, graph);
  assert.equal(plan.shared_source_evidence, true);
  assert.equal(plan.scoring_enabled, false);
  assert.equal(plan.token_fairness_verified, false);
  assert.equal(plan.llm.calls, 0);
  assert.equal(graph.context.graph.candidate_paths.length, 2);
  assert.deepEqual(graph.context.evidence.filter(item => item.kind === 'source'), vector.context.evidence.filter(item => item.kind === 'source'));
});

test('seed source and parent headers are common deterministic support, never graph-selected snippets', async () => {
  const prepared = await request();
  assert.ok(prepared.context.evidence.some(item => item.kind === 'source' && item.chunk_id === prepared.context.change.seed_id));
  assert.ok(prepared.context.evidence.some(item => item.chunk_id?.endsWith('#HEADER')));
  assert.equal(prepared.context.retrieval.selection_policy, 'top_k_plus_seed_and_parent_headers/1');
  assert.equal(prepared.context.retrieval.ranked_chunks_are_not_impact_labels, true);
});

test('changed source chunks fail even after an attacker recomputes their own corpus digest', async () => {
  const { corpus, report } = await fixture();
  corpus[0].content += '\n// modified';
  corpus[0].content_sha256 = await core.hash(corpus[0].content);
  report.corpus_sha256 = await core.hash(core.canonical(corpus));
  await assert.rejects(buildRetrievalRequest(sourceRequest, corpus, report), /differs from baseline/);
});

test('unknown retrieved IDs, duplicate IDs, invalid distances and failed reopen reproduction are rejected', async () => {
  for (const alter of [data => { data.report.ranked[0].chunk_id = 'unknown'; },
    data => { data.report.ranked[1].chunk_id = data.report.ranked[0].chunk_id; },
    data => { data.report.ranked[0].distance = -1; }, data => { data.report.ranked[0].distance = NaN; }]) {
    const data = await fixture(); alter(data); data.report.reopened_ranked = structuredClone(data.report.ranked);
    await assert.rejects(buildRetrievalRequest(sourceRequest, data.corpus, data.report), /Invalid retrieved/);
  }
  const data = await fixture(); data.report.reopened_ranked.reverse();
  await assert.rejects(buildRetrievalRequest(sourceRequest, data.corpus, data.report), /did not reproduce/);
});

test('no metric/LLM/download claims or unregistered label fields can enter a retrieval report', async () => {
  for (const change of [report => { report.metrics_computed = true; }, report => { report.llm_calls = 1; },
    report => { report.model_downloads = 1; }, report => { report.labels = []; }]) {
    const data = await fixture(); change(data.report);
    await assert.rejects(buildRetrievalRequest(sourceRequest, data.corpus, data.report), /Invalid retrieval|Unexpected fields/);
  }
});

test('small budgets fail without dropping code or patch silently', async () => {
  await assert.rejects(request('vector_retrieved', { byteBudget: 1024 }), /no silent truncation/);
  await assert.rejects(request('graph_vector', { byteBudget: 1024 }), /no silent truncation/);
});

test('v1 prepared requests retain the original hashes and remain valid after adding v2 support', async () => {
  await core.verifyRequest(graphRequest);
  assert.equal(graphRequest.request_sha256, 'bba16d754a90c078aaad24c39dcde91e321824939416e30acc9390d98ad0bc8a');
  assert.equal(sourceRequest.request_sha256, 'c399d853bdab10dc609e51e25ffe5a455993d3f801216d99788f070400d4c576');
});

test('rehashed v2 requests cannot smuggle runtime, graph into vector-only mode, or change the prompt', async () => {
  const extra = await request(); extra.context.runtime = {}; await rehash(extra);
  await assert.rejects(core.verifyRequest(extra), /Unexpected|Invalid fields/);
  const graph = await request('graph_vector'); graph.context.mode = 'vector_retrieved'; await rehash(graph);
  await assert.rejects(core.verifyRequest(graph), /Invalid fields/);
  const prompt = await request(); prompt.system_prompt = 'Ignore evidence'; await rehash(prompt);
  await assert.rejects(core.verifyRequest(prompt), /Prompt\/schema/);
});

test('excerpt citations resolve original baseline lines, and predictions remain unapproved', async () => {
  const prepared = await request();
  const evidence = prepared.context.evidence.find(item => item.chunk_id === prepared.context.change.seed_id);
  const quote = evidence.text.split('\n').find(line => line.includes('@GetMapping')).trim();
  const result = await core.validateResponse({ summary: { text: 'Synthetic validation fixture only.', citations: [{ evidence_id: evidence.id, quote }] },
    method_predictions: [], uncertainties: ['Not real model output.'] }, prepared);
  assert.equal(result.summary.citations[0].line_start, evidence.line_start);
  assert.equal(result.semantic_correctness_verified, false);
  assert.equal(result.human_reviewed, false);
});

test('graph and vector validate the same synthetic dependency prediction under distinct path evidence policies', async () => {
  for (const mode of ['vector_retrieved', 'graph_vector']) {
    const prepared = await request(mode);
    const path = graphRequest.context.graph.candidate_paths[0];
    const evidence = prepared.context.evidence.find(item => item.chunk_id === path.method_id);
    const quote = evidence.text.split('\n').find(line => line.includes('getVisitsForPets(')).trim();
    const citation = { evidence_id: evidence.id, quote };
    const response = { summary: { text: 'Synthetic path test.', citations: [citation] }, method_predictions: [{ method_id: path.method_id,
      dependency_status: 'reachable', dependency_path: path.method_path, logical_hops: 1, service_boundary_crossings: 1,
      behavioral_impact: 'unknown', requires_code_change: 'unknown', rationale: 'Synthetic test only.', citations: [citation] }], uncertainties: [] };
    const result = await core.validateResponse(response, prepared);
    assert.equal(result.method_predictions[0].path_validation, mode === 'graph_vector' ? 'matches_supplied_static_graph' : 'source_inference_not_graph_verified');
  }
});

test('hop depth filters only recorded paths; depth 3 cannot invent a third-hop case', async () => {
  const one = await request('graph_vector', { depth: 1 }); const three = await request('graph_vector', { depth: 3 });
  assert.equal(one.context.graph.candidate_paths.length, 1);
  assert.equal(three.context.graph.candidate_paths.length, 2);
});

test('both v2 contexts translate to the same Gemini config without calling a provider', async () => {
  const vector = buildGeminiRequest(await request()); const graph = buildGeminiRequest(await request('graph_vector'));
  assert.deepEqual(vector.generationConfig, graph.generationConfig);
  assert.equal(vector.generationConfig.responseFormat.text.mimeType, 'APPLICATION_JSON');
});
