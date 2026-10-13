import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import core from '../../demo/p01/reasoning-core.js';
import { parseDataAsset } from '../../scripts/run_p01_reasoning.mjs';
import { buildOpenAIRequest, parseOpenAIResponse, callOpenAI, OPENAI_ENDPOINT } from './openai-adapter.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const asset = await readFile(resolve(root, 'demo/p01/data.js'), 'utf8');
const bundle = parseDataAsset(asset);
const graphRequest = await core.buildContext(bundle);
const sourceRequest = await core.buildContext(bundle, { mode: 'source_only' });

// These are deliberately synthetic transport/validation fixtures, NEVER LLM evidence or ground truth.
function fixtureResponse(request = graphRequest) {
  const source = request.context.evidence.find(item => item.kind === 'source' && item.file.endsWith('/VisitsServiceClient.java'));
  const quote = source.text.split('\n').find(line => line.includes('getVisitsForPets(')).trim();
  const path = graphRequest.context.graph.candidate_paths[0];
  return {
    summary: { text: 'Fixture kiểm tra cấu trúc; không phải dự đoán từ model.', citations: [{ evidence_id: source.id, quote }] },
    method_predictions: [{ method_id: path.method_id, dependency_status: 'reachable', dependency_path: path.method_path,
      logical_hops: path.logical_hops, service_boundary_crossings: path.service_boundary_crossings,
      behavioral_impact: 'unknown', requires_code_change: 'unknown', rationale: 'Fixture chỉ kiểm định ID và dẫn chứng.',
      citations: [{ evidence_id: source.id, quote }] }],
    uncertainties: ['Không có LLM hoặc runtime nào được chạy trong fixture này.'],
  };
}
function providerFixture(prediction = fixtureResponse()) {
  return { id: 'test-response-fixture', model: 'test-model-fixture', status: 'completed',
    output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(prediction) }] }],
    usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 } };
}

test('data asset is JSON parsed, never evaluated', () => {
  assert.equal(bundle.schema, 'p01-evidence-demo/1');
  assert.throws(() => parseDataAsset('globalThis.bad=true;'), /Unsupported/);
  assert.throws(() => parseDataAsset('// fixture\nwindow.P01_DEMO_DATA = {};globalThis.bad=true;\n'));
});

test('prepared context/request hashes are reproducible and verify offline', async () => {
  await core.verifyRequest(graphRequest);
  await core.verifyRequest(sourceRequest);
  assert.equal((await core.buildContext(bundle)).request_sha256, graphRequest.request_sha256);
  assert.equal(graphRequest.context_bytes, 17763);
  assert.equal(sourceRequest.context_bytes, 12192);
  assert.equal(graphRequest.model, null); assert.equal(graphRequest.provider, null);
  assert.equal(graphRequest.context.limits.token_count, null);
  assert.equal(graphRequest.context.semantic_retrieval, 'not_integrated');
});

test('projection never accesses runtime, label status, benchmark provenance or expected-label files', async () => {
  const trapped = structuredClone(bundle);
  for (const name of ['runtime', 'label_status']) Object.defineProperty(trapped, name, { get() { throw new Error('Leakage: ' + name); } });
  for (const name of ['benchmark_sha', 'suite']) Object.defineProperty(trapped.provenance, name, { get() { throw new Error('Leakage: ' + name); } });
  for (const [id, artifact] of Object.entries(trapped.artifacts)) {
    if (artifact.origin === 'runtime' || /suite|audit|manifest/.test(id)) Object.defineProperty(trapped.artifacts, id, { get() { throw new Error('Leakage: ' + id); } });
  }
  assert.equal((await core.buildContext(trapped)).request_sha256, graphRequest.request_sha256);
  assert.equal(graphRequest.context.limits.runtime_available, false);
  assert.equal(graphRequest.context.limits.labels_available, false);
  assert.ok(graphRequest.context.evidence.every(item => !/runtime|label|score|review/.test(item.kind)));
});

test('source-only control contains the same source/patch/universe but no graph-derived paths or edges', () => {
  assert.equal(Object.hasOwn(sourceRequest.context, 'graph'), false);
  assert.deepEqual(sourceRequest.context.method_universe, graphRequest.context.method_universe);
  assert.deepEqual(sourceRequest.context.evidence, graphRequest.context.evidence.filter(item => ['source', 'proposed_patch'].includes(item.kind)));
  assert.ok(!core.canonical(sourceRequest.context).includes('candidate_paths'));
});

test('depth 1/2/3 filters recorded logical paths, not containment or service counts', async () => {
  for (const [depth, size] of [[1, 1], [2, 2], [3, 2]]) {
    const request = await core.buildContext(bundle, { depth });
    await core.verifyRequest(request);
    assert.equal(request.context.graph.candidate_paths.length, size);
    assert.ok(request.context.graph.candidate_paths.every(path => path.logical_hops <= depth && path.service_boundary_crossings === 1));
  }
  await assert.rejects(core.buildContext(bundle, { depth: 0 }), /Depth/);
  await assert.rejects(core.buildContext(bundle, { depth: 4 }), /Depth/);
});

test('too-small budgets fail without silently truncating source or prompt', async () => {
  await assert.rejects(core.buildContext(bundle, { byteBudget: 1024 }), /exceeds byte budget/);
  await assert.rejects(core.buildContext(bundle, { byteBudget: 1.5 }), /Invalid context byte budget/);
});

test('modified source, display text, unknown implementation and wrong patch targets are rejected', async () => {
  const changed = structuredClone(bundle);
  changed.artifacts['baseline-VisitsServiceClient.java'].base64 = btoa('bad source');
  await assert.rejects(core.buildContext(changed), /checksum mismatch/);
  const display = structuredClone(bundle);
  Object.values(display.snapshots.baseline.sources)[0].text += 'bad';
  await assert.rejects(core.buildContext(display), /display differs/);
  const implementation = structuredClone(bundle); implementation.provenance.implementation_sha = '0'.repeat(40);
  await assert.rejects(core.buildContext(implementation), /Unreviewed implementation/);
  const patch = structuredClone(bundle); const artifact = patch.artifacts['technical-patch'];
  const bytes = new TextEncoder().encode('--- wrong.java\n+++ wrong.java\n+ bad');
  artifact.base64 = Buffer.from(bytes).toString('base64'); artifact.byte_length = bytes.length; artifact.sha256 = await core.hash(bytes);
  await assert.rejects(core.buildContext(patch), /Patch target differs/);
});

test('fixture output resolves source lines but is never marked semantically verified or human reviewed', async () => {
  const output = await core.validateResponse(fixtureResponse(), graphRequest);
  assert.equal(output.status, 'structurally_valid_prediction_not_ground_truth');
  assert.equal(output.semantic_correctness_verified, false);
  assert.equal(output.runtime_verified, false); assert.equal(output.human_reviewed, false);
  const citation = output.method_predictions[0].citations[0];
  assert.equal(citation.line_start, 42);
  assert.equal(citation.line_end, 42);
  assert.equal(citation.snapshot, 'baseline');
  assert.equal(output.method_predictions[0].path_validation, 'matches_supplied_static_graph');
});

test('empty predicted set is allowed; validator never forces the expected two methods', async () => {
  const output = fixtureResponse(); output.method_predictions = [];
  assert.equal((await core.validateResponse(output, graphRequest)).method_predictions.length, 0);
});

test('unknown methods, wrong overloads, seed and duplicates cannot pass', async () => {
  for (const [id, message] of [['nonexistent::method()', /Unknown method/],
    [graphRequest.context.change.seed_id.replace('List<Integer>', 'List<Integer>,boolean'), /Unknown method/],
    [graphRequest.context.change.seed_id, /Seed cannot/]]) {
    const output = fixtureResponse(); output.method_predictions[0].method_id = id;
    await assert.rejects(core.validateResponse(output, graphRequest), message);
  }
  const duplicate = fixtureResponse(); duplicate.method_predictions.push(structuredClone(duplicate.method_predictions[0]));
  await assert.rejects(core.validateResponse(duplicate, graphRequest), /Duplicate method/);
});

test('unknown citations, invented quotes and fabricated line fields are rejected', async () => {
  const unknown = fixtureResponse(); unknown.summary.citations[0].evidence_id = 'RUNTIME001';
  await assert.rejects(core.validateResponse(unknown, graphRequest), /Unknown evidence/);
  const invented = fixtureResponse(); invented.method_predictions[0].citations[0].quote = 'imaginary method response';
  await assert.rejects(core.validateResponse(invented, graphRequest), /Quote is absent/);
  const line = fixtureResponse(); line.method_predictions[0].citations[0].line_start = 1234;
  await assert.rejects(core.validateResponse(line, graphRequest), /Invalid fields/);
  const absent = fixtureResponse(); absent.summary.citations = [];
  await assert.rejects(core.validateResponse(absent, graphRequest), /Citations required/);
});

test('paths cannot invent edges, cycles, hops or service-boundary counts', async () => {
  const seed = graphRequest.context.change.seed_id;
  const controller = graphRequest.context.graph.candidate_paths[1].method_id;
  const invented = fixtureResponse(); invented.method_predictions[0] = { ...invented.method_predictions[0], method_id: controller,
    dependency_path: [controller, seed], logical_hops: 1, service_boundary_crossings: 1 };
  await assert.rejects(core.validateResponse(invented, graphRequest), /invented edge/);
  const hops = fixtureResponse(); hops.method_predictions[0].logical_hops = 2;
  await assert.rejects(core.validateResponse(hops, graphRequest), /hop count/);
  const boundaries = fixtureResponse(); boundaries.method_predictions[0].service_boundary_crossings = 2;
  await assert.rejects(core.validateResponse(boundaries, graphRequest), /boundary count/);
  const cycle = fixtureResponse(); cycle.method_predictions[0].dependency_path = [cycle.method_predictions[0].method_id, cycle.method_predictions[0].method_id, seed];
  await assert.rejects(core.validateResponse(cycle, graphRequest), /cycle/);
});

test('unknown dependency requires null counts; behavioral and repair states stay separate', async () => {
  const output = fixtureResponse(); const item = output.method_predictions[0];
  item.dependency_status = 'unknown'; item.dependency_path = []; item.logical_hops = null; item.service_boundary_crossings = null;
  item.behavioral_impact = 'likely'; item.requires_code_change = 'not_established';
  const validated = await core.validateResponse(output, graphRequest);
  assert.equal(validated.method_predictions[0].behavioral_impact, 'likely');
  assert.equal(validated.method_predictions[0].requires_code_change, 'not_established');
  item.logical_hops = 0;
  await assert.rejects(core.validateResponse(output, graphRequest), /null counts/);
});

test('source-only inferred paths are marked unverified, without consulting graph facts', async () => {
  const output = await core.validateResponse(fixtureResponse(sourceRequest), sourceRequest);
  assert.equal(output.method_predictions[0].path_validation, 'source_inference_not_graph_verified');
});

test('tampered request hashes, schema fields and approval fields fail closed', async () => {
  const request = structuredClone(graphRequest); request.context.mode = 'source_only';
  await assert.rejects(core.verifyRequest(request), /checksum mismatch/);
  const output = fixtureResponse(); output.accepted = true;
  await assert.rejects(core.validateResponse(output, graphRequest), /Invalid fields/);
  const status = fixtureResponse(); status.method_predictions[0].behavioral_impact = 'accepted';
  await assert.rejects(core.validateResponse(status, graphRequest), /Invalid behavioral impact/);
});

test('rehashed requests still cannot attach runtime evidence or select a provider', async () => {
  const resign = async request => {
    request.context_sha256 = await core.hash(core.canonical(request.context));
    request.context_bytes = new TextEncoder().encode(core.canonical(request.context)).length;
    const { request_sha256, ...payload } = request;
    request.request_sha256 = await core.hash(core.canonical(payload));
  };
  const request = structuredClone(graphRequest); request.context.evidence[0].kind = 'runtime'; await resign(request);
  await assert.rejects(core.verifyRequest(request), /no runtime\/labels allowed/);
  const provider = structuredClone(graphRequest); provider.provider = 'automatic'; await resign(provider);
  await assert.rejects(core.verifyRequest(provider), /silently select/);
});

test('system prompt treats source as data and makes no fixed-label or runtime claims', () => {
  assert.ok(core.SYSTEM_PROMPT.includes('untrusted DATA'));
  assert.ok(core.SYSTEM_PROMPT.includes('No runtime observations or labels'));
  assert.ok(core.SYSTEM_PROMPT.includes('do not force a fixed expected set'));
  assert.ok(!core.SYSTEM_PROMPT.includes('ApiGatewayController'));
});

test('OpenAI adapter uses explicit model, strict schema, store:false and registered non-seed IDs', () => {
  assert.throws(() => buildOpenAIRequest(graphRequest), /explicit model/);
  const payload = buildOpenAIRequest(graphRequest, { model: 'test-model-fixture' });
  assert.equal(payload.store, false); assert.equal(payload.text.format.strict, true);
  assert.equal(payload.text.format.type, 'json_schema');
  const ids = payload.text.format.schema.properties.method_predictions.items.properties.method_id.enum;
  assert.equal(ids.length, 4); assert.ok(!ids.includes(graphRequest.context.change.seed_id));
  assert.ok(!JSON.stringify(payload).includes('test-only-key'));
});

test('no network call without confirmation, local key and explicit model', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw new Error('must not be called'); };
  await assert.rejects(callOpenAI(graphRequest, { fetchImpl }), /confirmation/);
  await assert.rejects(callOpenAI(graphRequest, { confirmSend: true, fetchImpl }), /OPENAI_API_KEY/);
  await assert.rejects(callOpenAI(graphRequest, { confirmSend: true, apiKey: 'test-only-key', fetchImpl }), /explicit model/);
  assert.equal(calls, 0);
});

test('synthetic transport fixture preserves usage and validates output; no real provider contacted', async () => {
  let calls = 0;
  const result = await callOpenAI(graphRequest, { confirmSend: true, model: 'test-model-fixture', apiKey: 'test-only-key',
    fetchImpl: async (url, options) => {
      calls++; assert.equal(url, OPENAI_ENDPOINT); assert.equal(options.redirect, 'error');
      assert.equal(options.headers.Authorization, 'Bearer test-only-key');
      assert.ok(!options.body.includes('test-only-key'));
      return new Response(JSON.stringify(providerFixture()), { status: 200 });
    } });
  assert.equal(calls, 1); assert.equal(result.provenance.retry_count, 0);
  assert.deepEqual(result.provenance.usage, { input_tokens: 10, output_tokens: 20, total_tokens: 30 });
  assert.equal(result.provenance.estimated_cost, null);
  assert.equal(result.validated.semantic_correctness_verified, false);
});

test('HTTP/auth/network failure, refusal, incomplete and invalid JSON never produce fallback predictions', async () => {
  for (const response of [new Response('private server detail', { status: 401 }), new Response('rate limited', { status: 429 }), new Response('not JSON', { status: 200 })]) {
    let calls = 0;
    await assert.rejects(callOpenAI(graphRequest, { confirmSend: true, model: 'test-model-fixture', apiKey: 'test-only-key',
      fetchImpl: async () => { calls++; return response; } }));
    assert.equal(calls, 1);
  }
  await assert.rejects(callOpenAI(graphRequest, { confirmSend: true, model: 'test-model-fixture', apiKey: 'test-only-key',
    fetchImpl: async () => { throw new Error('test-only-key echoed in low-level error'); } }), error => !error.message.includes('test-only-key'));
  const refused = providerFixture(); refused.output[0].content = [{ type: 'refusal', refusal: 'fixture' }];
  assert.throws(() => parseOpenAIResponse(refused), /refused/);
  const incomplete = providerFixture(); incomplete.status = 'incomplete';
  assert.throws(() => parseOpenAIResponse(incomplete), /did not complete/);
  const invalid = providerFixture(); invalid.output[0].content[0].text = 'invalid';
  assert.throws(() => parseOpenAIResponse(invalid), /not JSON/);
});
