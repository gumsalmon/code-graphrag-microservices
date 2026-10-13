import core from '../../demo/p01/reasoning-core.js';

export const SOURCE_SHA = '3858f9c630cf989bb6809a86edf47c2be78dc9f1';
export const IMPLEMENTATION_SHA = 'e95613795133088621117179c9fb9592dab62b16';
export const MODEL_ARCHIVE_SHA = '913d7300ceae3b2dbc2c50d1de4baacab4be7b9380491c27fab7418616a16ec3';
export const REUSED_CODE_SHA = {
  'src/chroma_baseline.py': 'b124d9516ec3b15d6cf70deed7933a077a19562486ae664c019e6253f9fb02d5',
  'src/parser.py': '349be1e5694505e2d14d0cceed0bc3d22411406bd7708286bc15d534edbf68fb',
};
export const ALLOWED_FILES = [
  'spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/application/VisitsServiceClient.java',
  'spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java',
  'spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java',
];
const check = (condition, message) => { if (!condition) throw new Error(message); };
const exact = (object, keys, name) => check(object && typeof object === 'object' &&
  Object.keys(object).sort().join('|') === [...keys].sort().join('|'), 'Unexpected fields: ' + name);

async function baseline(request) {
  await core.verifyRequest(request);
  check(request.schema === 'p01-reasoning-request/1' && request.context.mode === 'source_only', 'Input must be the existing source-only request');
  const ctx = request.context;
  const sources = ctx.evidence.filter(item => item.kind === 'source');
  check(core.canonical(sources.map(item => item.file).sort()) === core.canonical(ALLOWED_FILES), 'Unapproved source corpus');
  const patch = ctx.evidence.find(item => item.kind === 'proposed_patch');
  return { ctx, sources, patch };
}

export async function retrievalInput(sourceRequest, { topK = 5 } = {}) {
  const { ctx, sources, patch } = await baseline(sourceRequest);
  check(Number.isInteger(topK) && topK >= 1 && topK <= 50, 'Invalid fixed top-k');
  const query = core.retrievalQuery(ctx.change.seed_id, patch.text);
  return { schema: 'p01-retrieval-input/1', source_commit: SOURCE_SHA, implementation_commit: IMPLEMENTATION_SHA,
    sources: sources.map(item => ({ file: item.file, sha256: item.raw_sha256, text: item.text })),
    seed_id: ctx.change.seed_id, query, query_sha256: await core.hash(query), top_k: topK };
}

export async function buildRetrievalRequest(sourceRequest, corpus, report, options = {}) {
  const { ctx: base, sources, patch } = await baseline(sourceRequest);
  const mode = options.mode ?? 'vector_retrieved';
  const depth = options.depth ?? 2;
  const byteBudget = options.byteBudget ?? 32768;
  check(['vector_retrieved', 'graph_vector'].includes(mode), 'Unsupported retrieval mode');
  check(Number.isInteger(depth) && depth >= 1 && depth <= 3, 'Invalid retrieval depth');
  exact(report, ['schema', 'status', 'source_commit', 'implementation_commit', 'implementation_code_sha256', 'corpus_sha256',
    'query', 'query_sha256', 'top_k', 'chunk_count', 'ranked', 'reopened_ranked', 'distance_metric', 'distance_is_probability',
    'metrics_computed', 'model_downloads', 'llm_calls', 'elapsed_ms', 'embedding', 'environment'], 'retrieval report');
  check(report.schema === 'p01-chroma-retrieval/1' && report.status === 'real_offline_retrieval_not_prediction' &&
    report.source_commit === SOURCE_SHA && report.implementation_commit === IMPLEMENTATION_SHA &&
    report.metrics_computed === false && report.llm_calls === 0 && report.model_downloads === 0 &&
    report.distance_metric === 'l2_squared' && report.distance_is_probability === false, 'Invalid retrieval provenance/policy');
  check(core.canonical(report.implementation_code_sha256) === core.canonical(REUSED_CODE_SHA), 'Pinned retrieval code hashes differ');
  check(report.embedding.model === 'all-MiniLM-L6-v2' && report.embedding.dimension === 384 &&
    report.embedding.archive_sha256 === MODEL_ARCHIVE_SHA && report.environment.dependencies.chromadb === '1.5.9' &&
    report.environment.container_network === 'none' && report.environment.model_cache_mount === 'read_only', 'Unverified model/environment');
  const query = core.retrievalQuery(base.change.seed_id, patch.text);
  check(report.query === query && report.query_sha256 === await core.hash(query), 'Retrieval query differs from proposed change');
  check(Array.isArray(corpus) && corpus.length === report.chunk_count && await core.hash(core.canonical(corpus)) === report.corpus_sha256, 'Corpus checksum mismatch');
  const sourceByFile = new Map(sources.map(item => [item.file, item]));
  const byChunk = new Map();
  for (const chunk of corpus) {
    exact(chunk, ['chunk_id', 'chunk_type', 'file', 'class_fqn', 'service', 'line_start', 'line_end', 'content', 'document', 'source_sha256', 'content_sha256'], 'corpus chunk');
    const source = sourceByFile.get(chunk.file);
    check(source && source.raw_sha256 === chunk.source_sha256 && !byChunk.has(chunk.chunk_id) &&
      ['CLASS_HEADER', 'METHOD', 'RECORD'].includes(chunk.chunk_type) && Number.isInteger(chunk.line_start) && Number.isInteger(chunk.line_end) &&
      chunk.line_start >= 1 && chunk.line_end >= chunk.line_start && chunk.line_end <= source.line_end, 'Invalid source chunk metadata');
    const text = source.text.split('\n').slice(chunk.line_start - 1, chunk.line_end).join('\n');
    check(text.trim() === chunk.content && await core.hash(chunk.content) === chunk.content_sha256 &&
      chunk.document === '// File: ' + chunk.file + ' | Service: ' + chunk.service + '\n' + chunk.content, 'Retrieved chunk/document differs from baseline source');
    byChunk.set(chunk.chunk_id, { ...chunk, text });
  }
  check(Number.isInteger(report.top_k) && report.top_k >= 1 && report.top_k <= 50 && report.ranked.length === report.top_k &&
    core.canonical(report.ranked) === core.canonical(report.reopened_ranked), 'Retrieval did not reproduce after reopen');
  const selected = new Set();
  for (const entry of report.ranked) {
    exact(entry, ['chunk_id', 'distance'], 'retrieval rank');
    check(byChunk.has(entry.chunk_id) && !selected.has(entry.chunk_id) && Number.isFinite(entry.distance) && entry.distance >= 0, 'Invalid retrieved ID/distance');
    selected.add(entry.chunk_id);
  }
  const seed = byChunk.get(base.change.seed_id);
  check(seed && seed.chunk_type === 'METHOD', 'Missing known-seed method chunk');
  selected.add(seed.chunk_id);
  // Enrichment depends ONLY on selected AST chunks, not labels or graph paths.
  for (const id of [...selected]) {
    const chunk = byChunk.get(id);
    for (const header of byChunk.values()) if (header.chunk_type === 'CLASS_HEADER' && header.file === chunk.file && header.class_fqn === chunk.class_fqn) selected.add(header.chunk_id);
  }
  const ids = [...selected].sort();
  const evidence = [];
  const evidenceIds = new Map();
  for (const [index, id] of ids.entries()) {
    const chunk = byChunk.get(id); const evidenceId = 'C' + String(index + 1).padStart(3, '0');
    evidenceIds.set(id, evidenceId);
    evidence.push({ id: evidenceId, kind: 'source', snapshot: 'baseline', file: chunk.file,
      line_start: chunk.line_start, line_end: chunk.line_end, raw_sha256: chunk.source_sha256,
      text: chunk.text, chunk_id: id, text_sha256: await core.hash(chunk.text) });
  }
  evidence.push(structuredClone(patch));
  const context = {
    schema: 'p01-reasoning-context/2', prompt_version: core.PROMPT_VERSION, purpose: 'pilot_prediction_not_ground_truth',
    mode, semantic_retrieval: 'chromadb_cached_onnx', source_commit: SOURCE_SHA, implementation_commit: IMPLEMENTATION_SHA,
    change: structuredClone(base.change), limits: { max_logical_hops: depth, byte_budget: byteBudget, token_count: null, runtime_available: false, labels_available: false },
    method_universe: structuredClone(base.method_universe),
    source_registry: sources.map(item => ({ file: item.file, raw_sha256: item.raw_sha256, line_count: item.line_end })).sort((a, b) => a.file.localeCompare(b.file)),
    retrieval: { query, query_sha256: report.query_sha256, top_k: report.top_k, corpus_sha256: report.corpus_sha256,
      distance_metric: 'l2_squared', selection_policy: 'top_k_plus_seed_and_parent_headers/1',
      ranked: report.ranked.map(item => ({ ...item, evidence_id: evidenceIds.get(item.chunk_id) })),
      support_ids: ids.filter(id => !report.ranked.some(item => item.chunk_id === id)).map(id => evidenceIds.get(id)),
      ranked_chunks_are_not_impact_labels: true }, evidence,
  };
  if (mode === 'graph_vector') {
    // Do not even access this option while preparing the vector-only control.
    const graphRequest = options.graphRequest;
    await core.verifyRequest(graphRequest);
    const graph = graphRequest.context;
    check(graph.mode === 'graph_assisted' && core.canonical(graph.change) === core.canonical(base.change) &&
      core.canonical(graph.method_universe) === core.canonical(base.method_universe) &&
      core.canonical(graph.evidence.filter(item => item.kind === 'source')) === core.canonical(sources), 'Graph and vector source inputs differ');
    context.graph = structuredClone(graph.graph);
    context.graph.candidate_paths = context.graph.candidate_paths.filter(item => item.logical_hops <= depth);
    context.evidence.push(...graph.evidence.filter(item => ['static_edge', 'static_unresolved'].includes(item.kind)).map(item => structuredClone(item)));
  }
  const contextBytes = new TextEncoder().encode(core.canonical(context)).length;
  check(contextBytes <= byteBudget, 'Context exceeds byte budget; no silent truncation (' + contextBytes + ' > ' + byteBudget + ')');
  const request = { schema: 'p01-reasoning-request/2', context_sha256: await core.hash(core.canonical(context)), context_bytes: contextBytes,
    prompt_version: core.PROMPT_VERSION, system_prompt: core.SYSTEM_PROMPT, context, output_schema: structuredClone(core.SCHEMA),
    output_scope: 'method_predictions_only', model: null, provider: null };
  request.request_sha256 = await core.hash(core.canonical(request));
  await core.verifyRequest(request);
  return request;
}

export function pairedPlan(vectorRequest, graphRequest) {
  const vector = vectorRequest.context; const graph = graphRequest.context;
  for (const key of ['change', 'limits', 'method_universe', 'source_registry', 'retrieval']) check(core.canonical(vector[key]) === core.canonical(graph[key]), 'Unpaired input: ' + key);
  check(core.canonical(vector.evidence) === core.canonical(graph.evidence.filter(item => ['source', 'proposed_patch'].includes(item.kind))), 'Unpaired source/patch evidence');
  check(vectorRequest.system_prompt === graphRequest.system_prompt && core.canonical(vectorRequest.output_schema) === core.canonical(graphRequest.output_schema), 'Unpaired prompt/schema');
  return { schema: 'p01-offline-experiment-plan/1', status: 'prepared_not_scored_not_locked',
    configurations: ['vector_retrieved', 'graph_vector'], request_sha256: { vector: vectorRequest.request_sha256, graph: graphRequest.request_sha256 },
    shared_source_evidence: true, shared_query_and_top_k: true, shared_prompt_and_output_schema: true, shared_byte_ceiling: true,
    llm: { provider: 'gemini_generate_content', requested_model: 'gemini-3.8-flash', thinking_level: 'MEDIUM', max_output_tokens: 8192,
      calls: 0, measured_tokens: null, cost: null, model_is_pilot_choice: true },
    graph_contrast: 'add recorded edges/paths; no graph-selected source enrichment',
    scope: 'known_seed_three_java_files_method_only', token_fairness_verified: false, scoring_enabled: false,
    labels_status: 'pending_review', split_status: 'not_locked', paper_result: false };
}
