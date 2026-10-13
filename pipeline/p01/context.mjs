import core from '../../demo/p01/reasoning-core.js';
import { buildRetrievalRequest, pairedPlan } from '../../reasoning/p01/retrieval-context.mjs';
import { buildGeminiRequest } from '../../reasoning/p01/gemini-adapter.mjs';

export async function contextFromFreshGraph({ input, patch, graph, query, environment, sources, graphText, queryText, environmentText }, options = {}) {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  check(query.source === 'fresh Neo4j Bolt query; not impact labels' && query.snapshot_kind === 'baseline' && query.seed_excluded === true, 'Not a fresh baseline graph query');
  check(environment.labels_read === false && environment.remote_llm_calls === 0 && environment.repeat_import_idempotent === true && environment.neo4j_version === '5.26.0', 'Unverified graph environment');
  check(query.seed_id === input.seed_id, 'Fresh query seed differs from proposed change');
  const artifacts = {};
  const add = async (id, text) => {
    const bytes = Buffer.from(text, 'utf8');
    artifacts[id] = { origin: 'technical', base64: bytes.toString('base64'), byte_length: bytes.length, sha256: await core.hash(bytes) };
  };
  for (const [id, value, text] of [['fresh-graph', graph, graphText], ['fresh-query', query, queryText], ['fresh-environment', environment, environmentText]]) {
    if (text !== undefined) check(core.canonical(JSON.parse(text)) === core.canonical(value), 'Artifact text differs from parsed graph evidence');
    await add(id, text ?? JSON.stringify(value));
  }
  await add('proposed-patch', patch);
  const capture = { raw_graph: 'fresh-graph', raw_query: 'fresh-query', raw_environment: 'fresh-environment', sources: {} };
  for (const [index, item] of input.sources.entries()) {
    check(sources[item.file] === item.text && await core.hash(item.text) === item.sha256, 'Fresh source differs from approved baseline packet');
    const id = 'fresh-source-' + index;
    await add(id, item.text);
    capture.sources[item.file] = { raw_id: id, text: item.text };
  }
  // Minimal technical-only bundle: do not clone/read runtime, labels or summaries.
  const bundle = { schema: 'p01-evidence-demo/1', provenance: { implementation_sha: input.implementation_commit },
    snapshots: { baseline: capture }, patch: { raw_id: 'proposed-patch' }, artifacts };
  const source = await core.buildContext(bundle, { ...options, mode: 'source_only' });
  const graphRequest = await core.buildContext(bundle, { ...options, mode: 'graph_assisted' });
  await core.verifyRequest(source); await core.verifyRequest(graphRequest);
  return { source, graphRequest };
}

export async function preparePair(fresh, corpus, retrieval, options = {}) {
  const vector = await buildRetrievalRequest(fresh.source, corpus, retrieval, { ...options, mode: 'vector_retrieved' });
  const graph = await buildRetrievalRequest(fresh.source, corpus, retrieval, { ...options, mode: 'graph_vector', graphRequest: fresh.graphRequest });
  return { vector, graph, plan: pairedPlan(vector, graph), providerPlans: { vector: buildGeminiRequest(vector), graph: buildGeminiRequest(graph) } };
}
