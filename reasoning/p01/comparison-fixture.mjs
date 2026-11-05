// Synthetic fixtures ONLY for Node/browser guards. Not API or retrieval evidence.
import { readFile } from 'node:fs/promises';
import core from '../../demo/p01/reasoning-core.js';
import comparison from '../../demo/p01/comparison-core.js';
import { parseDataAsset } from '../../scripts/run_p01_reasoning.mjs';
import { buildRetrievalRequest, retrievalInput, SOURCE_SHA, IMPLEMENTATION_SHA, MODEL_ARCHIVE_SHA, REUSED_CODE_SHA } from './retrieval-context.mjs';
import { buildGeminiRequest } from './gemini-adapter.mjs';

export async function syntheticRetrievalInputs() {
  const bundle = parseDataAsset(await readFile(new URL('../../demo/p01/data.js', import.meta.url), 'utf8'));
  const source = await core.buildContext(bundle, { mode: 'source_only' });
  const input = await retrievalInput(source, { topK: 1 });
  const corpus = [];
  for (const node of source.context.method_universe) {
    const file = input.sources.find(item => item.file === node.file);
    const content = file.text.split('\n').slice(node.line_start - 1, node.line_end).join('\n').trim();
    corpus.push({ chunk_id: node.method_id, chunk_type: 'METHOD', file: node.file, class_fqn: node.method_id.split('::')[1].split('#')[0],
      service: node.service, line_start: node.line_start, line_end: node.line_end, content,
      document: '// File: ' + node.file + ' | Service: ' + node.service + '\n' + content,
      source_sha256: file.sha256, content_sha256: await core.hash(content) });
  }
  const ranked = [{ chunk_id: input.seed_id, distance: 0.1 }];
  const report = { schema: 'p01-chroma-retrieval/1', status: 'real_offline_retrieval_not_prediction', source_commit: SOURCE_SHA,
    implementation_commit: IMPLEMENTATION_SHA, implementation_code_sha256: REUSED_CODE_SHA,
    corpus_sha256: await core.hash(core.canonical(corpus)), query: input.query, query_sha256: input.query_sha256,
    top_k: 1, chunk_count: corpus.length, ranked, reopened_ranked: ranked, distance_metric: 'l2_squared', distance_is_probability: false,
    metrics_computed: false, model_downloads: 0, llm_calls: 0, elapsed_ms: 1,
    embedding: { model: 'all-MiniLM-L6-v2', dimension: 384, archive_sha256: MODEL_ARCHIVE_SHA },
    environment: { dependencies: { chromadb: '1.5.9' }, container_network: 'none', model_cache_mount: 'read_only' } };
  return { bundle, source, input, corpus, report };
}

export async function syntheticComparison({ abstentionContract = false } = {}) {
  const { bundle, source, input, corpus, report } = await syntheticRetrievalInputs();
  const entries = {};
  for (const [key, mode] of [['vector', 'vector_retrieved'], ['graph_vector', 'graph_vector']]) {
    const request = await buildRetrievalRequest(source, corpus, report, { mode, graphRequest: await core.buildContext(bundle),
      promptVersion: abstentionContract ? core.ABSTENTION_PROMPT_VERSION : core.PROMPT_VERSION });
    const citation = { evidence_id: 'P001', quote: request.context.evidence.find(e => e.id === 'P001').text.split('\n').find(line => line.startsWith('+    public')) };
    const response = { summary: { text: 'SYNTHETIC UI TEST ONLY; not a provider prediction.', citations: [citation] },
      method_predictions: [], uncertainties: ['Synthetic fixture, no quality result.'] };
    if (key === 'vector') response.method_predictions.push({ method_id: request.context.method_universe.find(n => n.method_id !== input.seed_id).method_id,
      dependency_status: 'unknown', dependency_path: [], logical_hops: null, service_boundary_crossings: null,
      behavioral_impact: 'unknown', requires_code_change: 'unknown', rationale: 'Synthetic abstention without evidence.', citations: [] });
    entries[key] = { request, response, artifact_checksums: Object.fromEntries(['request.json', 'run.json', 'provider-request.json', 'code-provenance.json'].map(name => [name, 'a'.repeat(64)])),
      run: { run_id: 'SYNTHETIC-TEST-' + key, status: key === 'vector' && !abstentionContract ? 'failed_no_prediction' : 'provider_prediction_not_ground_truth',
        request_sha256: request.request_sha256, provider: 'gemini_generate_content', requested_model: 'gemini-3.8-flash', returned_model: 'gemini-3.8-flash',
        provider_response_id: 'SYNTHETIC-NOT-A-RECEIPT', elapsed_ms: 1, usage: { prompt: 1, output: 1, thoughts: 1, total: 3 },
        remote_calls: 1, retry_count: 0, error_code: key === 'vector' && !abstentionContract ? 'validation' : null, http_status: null, provider_error: null,
        generation_config_sha256: await core.hash(core.canonical(buildGeminiRequest(request).generationConfig)),
        git_head: 'a'.repeat(40), code_is_uncommitted: false, code_files_sha256: Object.fromEntries(Array.from({ length: 9 }, (_, i) => ['synthetic-' + i, 'a'.repeat(64)])) } };
  }
  return comparison.seal({ schema: 'p01-local-comparison/1', created_utc: new Date(0).toISOString(), entries });
}
