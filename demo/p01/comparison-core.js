/* Local paired-run inspection. Hashes are integrity checks, not provider authentication. */
(() => {
  'use strict';
  const core = globalThis.P01Reasoning ?? (typeof module !== 'undefined' && module.exports ? require('./reasoning-core.js') : null);
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const exact = (object, keys, at) => check(object && typeof object === 'object' && !Array.isArray(object) &&
    Object.keys(object).sort().join('|') === [...keys].sort().join('|'), 'Invalid fields: ' + at);
  const same = (a, b, at) => check(core.canonical(a) === core.canonical(b), 'Unpaired ' + at);
  const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  const RUN_KEYS = ['run_id', 'status', 'request_sha256', 'provider', 'requested_model', 'returned_model',
    'provider_response_id', 'elapsed_ms', 'usage', 'remote_calls', 'retry_count', 'error_code', 'http_status',
    'provider_error', 'generation_config_sha256', 'git_head', 'code_is_uncommitted', 'code_files_sha256'];
  const FILES = ['request.json', 'run.json', 'code-provenance.json', 'provider-request.json',
    'provider-response.json', 'response.json', 'validated.json'];

  async function seal(body) {
    exact(body, ['schema', 'created_utc', 'entries'], 'comparison body');
    return { ...body, bundle_sha256: await core.hash(core.canonical(body)) };
  }

  async function inspectPair(bundle) {
    exact(bundle, ['schema', 'created_utc', 'entries', 'bundle_sha256'], 'comparison');
    const { bundle_sha256, ...body } = bundle;
    check(bundle.schema === 'p01-local-comparison/1' && digest(bundle_sha256) &&
      bundle_sha256 === await core.hash(core.canonical(body)), 'Comparison checksum/schema mismatch');
    check(typeof bundle.created_utc === 'string' && Number.isFinite(Date.parse(bundle.created_utc)), 'Invalid timestamp');
    exact(bundle.entries, ['vector', 'graph_vector'], 'paired entries');
    const vector = bundle.entries.vector; const graph = bundle.entries.graph_vector;
    for (const [key, entry] of Object.entries(bundle.entries)) {
      exact(entry, ['request', 'response', 'run', 'artifact_checksums'], key);
      await core.verifyRequest(entry.request);
      check(entry.request.context.schema === 'p01-reasoning-context/2' &&
        entry.request.context.mode === (key === 'vector' ? 'vector_retrieved' : 'graph_vector'), 'Wrong comparison context mode');
      exact(entry.run, RUN_KEYS, key + '.run');
      const run = entry.run;
      check(typeof run.run_id === 'string' && run.run_id.length <= 160 &&
        ['provider_prediction_not_ground_truth', 'failed_no_prediction'].includes(run.status), 'Invalid run status');
      check(run.request_sha256 === entry.request.request_sha256 && run.provider === 'gemini_generate_content' &&
        run.requested_model === 'gemini-3.8-flash' && digest(run.generation_config_sha256), 'Run/request/config mismatch');
      check(run.returned_model === null || /^(?:models\/)?gemini-3\.8-flash(?:-\d{3,})?$/.test(run.returned_model), 'Unexpected returned model');
      check(run.retry_count === 0 && run.remote_calls === 1 &&
        (run.elapsed_ms === null || Number.isFinite(run.elapsed_ms) && run.elapsed_ms >= 0), 'Invalid attempt/time metadata');
      check(typeof run.git_head === 'string' && /^[a-f0-9]{40}$/.test(run.git_head) &&
        typeof run.code_is_uncommitted === 'boolean' && run.code_files_sha256 &&
        Object.keys(run.code_files_sha256).length === 9 && Object.values(run.code_files_sha256).every(digest), 'Invalid code provenance');
      if (run.usage !== null) {
        exact(run.usage, ['prompt', 'output', 'thoughts', 'total'], 'token usage');
        check(Object.values(run.usage).every(value => value === null || Number.isSafeInteger(value) && value >= 0), 'Invalid token usage');
      }
      check(entry.artifact_checksums && Object.keys(entry.artifact_checksums).length >= 4 &&
        Object.entries(entry.artifact_checksums).every(([name, sha]) => FILES.includes(name) && digest(sha)), 'Invalid artifact checksums');
      if (run.status === 'provider_prediction_not_ground_truth') check(entry.response !== null, 'Successful run has no response');
    }
    const v = vector.request; const g = graph.request;
    same(v.schema, g.schema, 'request version'); same(v.prompt_version, g.prompt_version, 'prompt version');
    for (const key of ['source_commit', 'implementation_commit', 'change', 'limits', 'method_universe', 'source_registry', 'retrieval'])
      same(v.context[key], g.context[key], key);
    same(v.system_prompt, g.system_prompt, 'prompt'); same(v.output_schema, g.output_schema, 'output schema');
    same(v.context.evidence, g.context.evidence.filter(item => ['source', 'proposed_patch'].includes(item.kind)), 'source/patch evidence');
    for (const key of ['provider', 'requested_model', 'returned_model', 'generation_config_sha256', 'git_head', 'code_is_uncommitted', 'code_files_sha256']) {
      // A failed HTTP call can have no returned model, so compare actual models only if both are known.
      if (key !== 'returned_model' || vector.run[key] !== null && graph.run[key] !== null) same(vector.run[key], graph.run[key], key);
    }
    const outcomes = {};
    for (const [key, entry] of Object.entries(bundle.entries)) {
      let validated = null; let diagnostic = null;
      if (entry.response !== null) {
        try { validated = await core.validateResponse(entry.response, entry.request); }
        catch (error) { diagnostic = error.message; }
      }
      // A failed run is never promoted, even if a different validator later accepts its JSON.
      const accepted = entry.run.status === 'provider_prediction_not_ground_truth' && validated !== null;
      outcomes[key] = { accepted, validated: accepted ? validated : null,
        status: accepted ? 'structurally_valid_prediction_not_ground_truth' : entry.response === null ? 'no_prediction' : 'response_rejected',
        diagnostic: diagnostic ?? (accepted ? null : entry.run.http_status !== null ?
          'HTTP ' + entry.run.http_status + (typeof entry.run.provider_error?.message === 'string' ? ': ' + entry.run.provider_error.message : '') :
          'Run was not accepted by the original runner') };
    }
    return { outcomes, provider_identity_verified: false, semantic_correctness_verified: false, scoring_enabled: false,
      quality_comparison_ready: false, both_structurally_valid: Object.values(outcomes).every(item => item.accepted) };
  }

  async function verifyViewerSources(bundle, evidenceBundle) {
    const registry = bundle.entries.vector.request.context.source_registry;
    for (const item of registry) {
      const source = evidenceBundle.snapshots.baseline.sources[item.file];
      const artifact = source && evidenceBundle.artifacts[source.raw_id];
      check(source && artifact && artifact.sha256 === item.raw_sha256 &&
        await core.hash(Uint8Array.from(atob(artifact.base64), char => char.charCodeAt(0))) === item.raw_sha256,
      'Comparison source differs from viewer baseline');
      for (const entry of Object.values(bundle.entries)) for (const excerpt of entry.request.context.evidence.filter(e => e.kind === 'source' && e.file === item.file))
        check(source.text.split('\n').slice(excerpt.line_start - 1, excerpt.line_end).join('\n') === excerpt.text, 'Source excerpt differs from viewer');
    }
    const patch = bundle.entries.vector.request.context.evidence.find(e => e.kind === 'proposed_patch');
    check(patch.text === evidenceBundle.patch.text, 'Comparison patch differs from viewer');
  }

  const api = { seal, inspectPair, verifyViewerSources };
  globalThis.P01Comparison = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
