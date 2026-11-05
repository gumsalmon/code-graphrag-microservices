import test from 'node:test';
import assert from 'node:assert/strict';
import core from '../../demo/p01/reasoning-core.js';
import comparison from '../../demo/p01/comparison-core.js';
import { syntheticComparison, syntheticRetrievalInputs } from './comparison-fixture.mjs';
import { buildGeminiRequest, callGemini } from './gemini-adapter.mjs';
import { pairedPlan } from './retrieval-context.mjs';
import { preparePair } from '../../pipeline/p01/context.mjs';
import { prepareContractPair, verifyContractPreparation } from '../../scripts/prepare_p01_abstention.mjs';

async function fixtures() {
  const old = await syntheticComparison();
  const vector = await core.withAbstentionContract(old.entries.vector.request);
  const graph = await core.withAbstentionContract(old.entries.graph_vector.request);
  return { old, vector, graph, response: structuredClone(old.entries.vector.response) };
}
const responseFor = (response, request) => {
  const copy = structuredClone(response);
  copy.summary.citations = [{ evidence_id: 'P001', quote: request.context.evidence.find(e => e.id === 'P001').text.split('\n').find(line => line.startsWith('+    public')) }];
  return copy;
};

// Focused JSON Schema keyword interpreter for this fixture only; not a production validator.
// Reject unknown keywords so a new constraint cannot silently become untested.
function schemaMatches(schema, value, root) {
  const known = ['type', 'additionalProperties', 'properties', 'required', 'items', 'enum', '$ref', '$defs', 'minItems', 'maxItems', 'anyOf'];
  assert.ok(Object.keys(schema).every(key => known.includes(key)), 'Untested JSON Schema keyword');
  if (schema.$ref) return schemaMatches(root.$defs.citation, value, root);
  const matchesType = type => type === 'null' ? value === null : type === 'array' ? Array.isArray(value) :
    type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value) : type === 'integer' ? Number.isInteger(value) : typeof value === type;
  if (schema.type && !(Array.isArray(schema.type) ? schema.type : [schema.type]).some(matchesType)) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.anyOf && !schema.anyOf.some(branch => schemaMatches(branch, value, root))) return false;
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems || schema.maxItems !== undefined && value.length > schema.maxItems) return false;
    if (schema.items && !value.every(item => schemaMatches(schema.items, item, root))) return false;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (schema.required?.some(key => !Object.hasOwn(value, key))) return false;
    if (schema.additionalProperties === false && Object.keys(value).some(key => !Object.hasOwn(schema.properties, key))) return false;
    if (schema.properties && Object.entries(schema.properties).some(([key, child]) => Object.hasOwn(value, key) && !schemaMatches(child, value[key], root))) return false;
  }
  return true;
}

test('contract fork is versioned, idempotent, non-mutating and changes prompt/schema/hash for both modes only', async () => {
  const { old, vector, graph } = await fixtures();
  for (const [key, request] of [['vector', vector], ['graph_vector', graph]]) {
    const previous = old.entries[key].request;
    assert.equal(previous.schema, 'p01-reasoning-request/2');
    assert.equal(previous.prompt_version, 'p01-static-impact/1');
    assert.equal(request.schema, 'p01-reasoning-request/3');
    assert.equal(request.prompt_version, 'p01-static-impact/2');
    assert.notEqual(previous.request_sha256, request.request_sha256);
    assert.notEqual(previous.system_prompt, request.system_prompt);
    assert.deepEqual(await core.withAbstentionContract(request), request);
    const { prompt_version: ignoredOld, ...oldContext } = previous.context;
    const { prompt_version: ignoredNew, ...newContext } = request.context;
    assert.deepEqual(oldContext, newContext);
  }
  assert.deepEqual(buildGeminiRequest(vector).generationConfig, buildGeminiRequest(graph).generationConfig);
  assert.equal(pairedPlan(vector, graph).response_contract, 'pure_unknown_abstention/2');
  assert.throws(() => pairedPlan(vector, old.entries.graph_vector.request), /Unpaired/);
});

test('both modes accept only pure unknown without citations and label it abstention, never negative', async () => {
  const { vector, graph, response } = await fixtures();
  for (const request of [vector, graph]) {
    const result = await core.validateResponse(responseFor(response, request), request);
    assert.equal(result.schema, 'p01-validated-prediction/2');
    assert.equal(result.abstention_is_negative_label, false);
    assert.equal(result.method_predictions[0].assessment_kind, 'abstention');
    assert.deepEqual(result.method_predictions[0].citations, []);
    assert.equal(result.method_predictions[0].path_validation, 'not_claimed');
    assert.equal(result.semantic_correctness_verified, false);
    assert.equal(result.human_reviewed, false);
    assert.equal(schemaMatches(request.output_schema, responseFor(response, request), request.output_schema), true);
  }
});

test('legacy requests still reject the same unsupported abstention and legacy comparison remains rejected', async () => {
  const { old, response } = await fixtures();
  for (const entry of Object.values(old.entries)) await assert.rejects(core.validateResponse(responseFor(response, entry.request), entry.request), /Citations required/);
  const inspection = await comparison.inspectPair(old);
  assert.equal(inspection.outcomes.vector.accepted, false);
  assert.equal(inspection.outcomes.vector.diagnostic, 'Citations required: method_prediction');
});

test('every non-unknown state requires citations identically for vector and graph; schema agrees', async () => {
  const { vector, graph, response } = await fixtures();
  for (const request of [vector, graph]) for (const dependency_status of ['unknown', 'reachable', 'not_established'])
    for (const behavioral_impact of ['unknown', 'likely', 'unlikely'])
      for (const requires_code_change of ['unknown', 'required', 'optional', 'not_established']) {
        const copy = responseFor(response, request);
        Object.assign(copy.method_predictions[0], { dependency_status, behavioral_impact, requires_code_change });
        const pure = [dependency_status, behavioral_impact, requires_code_change].every(value => value === 'unknown');
        assert.equal(schemaMatches(request.output_schema, copy, request.output_schema), pure);
        if (pure) await core.validateResponse(copy, request);
        else await assert.rejects(core.validateResponse(copy, request), /Citations required/);
      }
});

test('empty citations cannot conceal a path, zero count, false, string, or missing counts', async () => {
  const { vector, graph, response } = await fixtures();
  for (const request of [vector, graph]) for (const alter of [item => { item.dependency_path = [item.method_id]; },
    item => { item.logical_hops = 0; }, item => { item.service_boundary_crossings = 0; }, item => { item.logical_hops = false; },
    item => { item.service_boundary_crossings = 'null'; }, item => { delete item.logical_hops; }]) {
      const copy = responseFor(response, request); alter(copy.method_predictions[0]);
      assert.equal(schemaMatches(request.output_schema, copy, request.output_schema), false);
      await assert.rejects(core.validateResponse(copy, request));
    }
});

test('abstentions with supplied citations must still use exact quotes; summary always needs evidence', async () => {
  const { vector, graph, response } = await fixtures();
  for (const request of [vector, graph]) {
    const copy = responseFor(response, request);
    copy.method_predictions[0].citations = structuredClone(copy.summary.citations);
    assert.equal((await core.validateResponse(copy, request)).method_predictions[0].assessment_kind, 'abstention');
    copy.method_predictions[0].citations[0].quote = 'Invented quote should never pass';
    await assert.rejects(core.validateResponse(copy, request), /Quote is absent/);
    const noSummary = responseFor(response, request); noSummary.summary.citations = [];
    assert.equal(schemaMatches(request.output_schema, noSummary, request.output_schema), false);
    await assert.rejects(core.validateResponse(noSummary, request), /Citations required: summary/);
  }
});

test('abstention does not bypass identity, duplicate, rationale or citation type guards', async () => {
  const { vector, graph, response } = await fixtures();
  for (const request of [vector, graph]) for (const alter of [copy => { copy.method_predictions[0].method_id = request.context.change.seed_id; },
    copy => { copy.method_predictions[0].method_id = 'invented-method'; },
    copy => { copy.method_predictions.push(structuredClone(copy.method_predictions[0])); },
    copy => { copy.method_predictions[0].rationale = ''; }, copy => { copy.method_predictions[0].citations = null; },
    copy => { copy.method_predictions[0].citations = [{ evidence_id: 'invented', quote: 'Invented quote' }]; }]) {
      const copy = responseFor(response, request); alter(copy);
      await assert.rejects(core.validateResponse(copy, request));
    }
});

test('claims with evidence keep distinct behavior/repair states and path policy, not forced to unknown', async () => {
  const { vector, graph, response } = await fixtures();
  for (const request of [vector, graph]) {
    const copy = responseFor(response, request); const path = graph.context.graph.candidate_paths[0];
    Object.assign(copy.method_predictions[0], { method_id: path.method_id, dependency_status: 'reachable', dependency_path: path.method_path,
      logical_hops: path.logical_hops, service_boundary_crossings: path.service_boundary_crossings,
      behavioral_impact: 'likely', requires_code_change: 'not_established', citations: structuredClone(copy.summary.citations) });
    const validated = await core.validateResponse(copy, request);
    assert.equal(validated.method_predictions[0].assessment_kind, 'evidence_backed_assessment');
    assert.equal(validated.method_predictions[0].path_validation, request === graph ? 'matches_supplied_static_graph' : 'source_inference_not_graph_verified');
    assert.equal(schemaMatches(request.output_schema, copy, request.output_schema), true);
  }
});

test('version spoofing or relaxed prompt/schema is rejected even after recalculating hashes', async () => {
  const { vector } = await fixtures();
  for (const alter of [r => { r.context.prompt_version = core.PROMPT_VERSION; }, r => { r.schema = 'p01-reasoning-request/2'; },
    r => { delete r.output_schema.properties.method_predictions.items.anyOf; }, r => { r.system_prompt = core.SYSTEM_PROMPT; }]) {
    const changed = structuredClone(vector); alter(changed);
    changed.context_sha256 = await core.hash(core.canonical(changed.context));
    changed.context_bytes = new TextEncoder().encode(core.canonical(changed.context)).length;
    const { request_sha256: ignored, ...payload } = changed; changed.request_sha256 = await core.hash(core.canonical(payload));
    await assert.rejects(core.verifyRequest(changed));
  }
});

test('synthetic transport accepts pure abstention for both new requests with zero real network calls', async () => {
  const { vector, graph, response } = await fixtures();
  for (const request of [vector, graph]) {
    let calls = 0;
    const result = await callGemini(request, { apiKey: 'SYNTHETIC-TEST-ONLY', confirmSend: true, confirmFreeTier: true,
      fetchImpl: async () => { calls++; return new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(responseFor(response, request)) }] }, finishReason: 'STOP' }], modelVersion: 'gemini-3.8-flash' })); } });
    assert.equal(calls, 1); assert.equal(result.validated.method_predictions[0].assessment_kind, 'abstention');
  }
});

test('comparison handles new-version abstentions but refuses a mixed-version pair', async () => {
  const fixture = await syntheticComparison({ abstentionContract: true });
  const inspection = await comparison.inspectPair(fixture);
  assert.equal(inspection.outcomes.vector.accepted, true);
  assert.equal(inspection.outcomes.vector.validated.method_predictions[0].assessment_kind, 'abstention');
  const old = await syntheticComparison(); fixture.entries.graph_vector = old.entries.graph_vector;
  const { bundle_sha256: ignored, ...body } = fixture;
  await assert.rejects(comparison.inspectPair(await comparison.seal(body)), /Unpaired/);
});

test('fresh pair builder defaults to the new contract while legacy reconstruction stays explicit', async () => {
  const { source, bundle, corpus, report } = await syntheticRetrievalInputs();
  const fresh = { source, graphRequest: await core.buildContext(bundle) };
  const next = await preparePair(fresh, corpus, report);
  assert.equal(next.vector.schema, 'p01-reasoning-request/3');
  assert.equal(next.graph.schema, 'p01-reasoning-request/3');
  assert.deepEqual(next.providerPlans.vector.generationConfig, next.providerPlans.graph.generationConfig);
  const legacy = await preparePair(fresh, corpus, report, { promptVersion: core.PROMPT_VERSION });
  const fixture = await syntheticComparison();
  assert.equal(legacy.vector.request_sha256, fixture.entries.vector.request.request_sha256);
  assert.equal(legacy.graph.request_sha256, fixture.entries.graph_vector.request.request_sha256);
});

test('contract CLI refuses arbitrary input/output paths without loading a credential or response', async () => {
  await assert.rejects(prepareContractPair({ retrievalRun: '.' }), /private P01 retrieval output root/);
  await assert.rejects(verifyContractPreparation('.'), /private output root/);
});
