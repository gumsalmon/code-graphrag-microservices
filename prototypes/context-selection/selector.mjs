// In-memory synthetic context selection; no parser, DB, provider, labels or score.
import { createHash } from 'node:crypto';
export const SELECTOR_ID = 'context-selection/synthetic-prototype.1';
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item);
const hash = text => createHash('sha256').update(text).digest('hex');
const bytes = text => Buffer.byteLength(text, 'utf8');
const check = (ok, code) => { if (!ok) throw new Error(code); };
const toy = value => typeof value === 'string' && /^toy-[A-Za-z0-9._-]+$/.test(value);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
function fields(value, names) {
  check(object(value) && Object.keys(value).length === names.length && names.every(k => Object.hasOwn(value, k)), 'FIELDS');
}
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function tokenize(text) {
  check(typeof text === 'string', 'TEXT');
  return text.replace(/([a-z\d])([A-Z])/g, '$1 $2').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function readInput(input) {
  fields(input, ['synthetic_only', 'repository_id', 'snapshot_id', 'seed_method_id', 'query', 'methods', 'documents', 'edges']);
  check(input.synthetic_only === true && toy(input.repository_id) && toy(input.snapshot_id), 'SYNTHETIC_ONLY');
  check(typeof input.query === 'string' && input.query.length <= 4096, 'QUERY');
  check(Array.isArray(input.methods) && input.methods.length > 0 && input.methods.length <= 1000, 'METHODS');
  const methods = new Map();
  for (const method of input.methods) {
    fields(method, ['id', 'service']);
    check(toy(method.service) && typeof method.id === 'string' && method.id.startsWith(input.repository_id + '@' + input.snapshot_id + '::' + method.service + '::') &&
      /^[^\s#()]+#[^\s#()]+\([^\r\n]*\)$/.test(method.id.split('::').slice(2).join('::')) && !methods.has(method.id), 'METHOD_ID');
    methods.set(method.id, method);
  }
  check(methods.has(input.seed_method_id), 'SEED');
  check(Array.isArray(input.documents) && input.documents.length > 0 && input.documents.length <= 1000 && Array.isArray(input.edges), 'CORPUS');
  const documents = new Map(), evidence = new Set();
  for (const doc of input.documents) {
    fields(doc, ['id', 'evidence_id', 'method_id', 'text']);
    check(toy(doc.id) && /^TOY-[A-Z0-9_-]+$/.test(doc.evidence_id) && methods.has(doc.method_id) && typeof doc.text === 'string' &&
      doc.text.trim().length > 0 && doc.text.length <= 16384 && !documents.has(doc.id) && !evidence.has(doc.evidence_id), 'DOCUMENT');
    documents.set(doc.id, doc); evidence.add(doc.evidence_id);
  }
  check([...documents.values()].some(doc => doc.method_id === input.seed_method_id), 'SEED_SOURCE_REQUIRED');
  return { methods, documents };
}

export function rankLexical(documents, query) {
  const terms = [...new Set(tokenize(query))];
  const rows = documents.map(doc => {
    const tokens = tokenize(doc.text), counts = new Map();
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    return { doc, counts, length: tokens.length };
  });
  const avg = rows.reduce((sum, row) => sum + row.length, 0) / rows.length || 1;
  // BM25 lexical ranking only. Fixed prototype settings, not a tuned benchmark.
  const k1 = 1.2, b = 0.75;
  const df = new Map(terms.map(term => [term, rows.filter(row => row.counts.has(term)).length]));
  return rows.map(row => ({ document_id: row.doc.id, score: terms.reduce((score, term) => {
    const tf = row.counts.get(term) ?? 0;
    return score + (tf ? Math.log(1 + (rows.length - df.get(term) + 0.5) / (df.get(term) + 0.5)) *
      tf * (k1 + 1) / (tf + k1 * (1 - b + b * row.length / avg)) : 0);
  }, 0) })).filter(row => row.score > 0).sort((a, b) => b.score - a.score || compare(a.document_id, b.document_id));
}

export function reverseWitnesses(methods, edges, seed, depth) {
  const reverse = new Map(), ignored = [], seen = new Set();
  for (const edge of edges) {
    fields(edge, ['caller', 'callee', 'type', 'resolution_status']);
    check(methods.has(edge.caller) && methods.has(edge.callee), 'EDGE_ENDPOINT');
    check(['CALLS', 'INVOKES_API', 'CONTAINS', 'EXPOSES'].includes(edge.type) && ['RESOLVED', 'UNRESOLVED'].includes(edge.resolution_status), 'EDGE_VOCABULARY');
    const identity = canonical(edge);
    if (seen.has(identity)) { ignored.push({ edge, reason: 'duplicate' }); continue; }
    seen.add(identity);
    if (!['CALLS', 'INVOKES_API'].includes(edge.type)) { ignored.push({ edge, reason: 'non_logical_edge' }); continue; }
    if (edge.resolution_status !== 'RESOLVED') { ignored.push({ edge, reason: 'unresolved_edge' }); continue; }
    if (!reverse.has(edge.callee)) reverse.set(edge.callee, []);
    reverse.get(edge.callee).push(edge);
  }
  for (const rows of reverse.values()) rows.sort((a, b) => compare(a.caller, b.caller) || compare(a.type, b.type));
  const witnesses = new Map([[seed, { method_id: seed, path: [seed], logical_hops: 0, service_boundary_crossings: 0 }]]);
  const queue = [seed];
  for (let i = 0; i < queue.length; i++) {
    const callee = queue[i], current = witnesses.get(callee);
    if (current.logical_hops === depth) continue;
    for (const edge of reverse.get(callee) ?? []) {
      if (witnesses.has(edge.caller)) continue;
      witnesses.set(edge.caller, { method_id: edge.caller, path: [edge.caller, ...current.path], logical_hops: current.logical_hops + 1,
        service_boundary_crossings: current.service_boundary_crossings + Number(methods.get(edge.caller).service !== methods.get(callee).service) });
      queue.push(edge.caller);
    }
  }
  return { witnesses: [...witnesses.values()].sort((a, b) => a.logical_hops - b.logical_hops || compare(a.method_id, b.method_id)), ignored_edges: ignored };
}

export function selectSyntheticContext(input, options) {
  const { methods, documents } = readInput(input);
  fields(options, ['mode', 'top_k_per_route', 'max_depth', 'context_byte_limit', 'mandatory_document_ids']);
  check(['lexical', 'graph', 'combined'].includes(options.mode), 'MODE');
  check(Number.isInteger(options.top_k_per_route) && options.top_k_per_route > 0 && options.top_k_per_route <= 100 &&
    Number.isInteger(options.max_depth) && options.max_depth >= 1 && options.max_depth <= 3 &&
    Number.isSafeInteger(options.context_byte_limit) && options.context_byte_limit >= 0, 'BOUNDS');
  check(Array.isArray(options.mandatory_document_ids) && new Set(options.mandatory_document_ids).size === options.mandatory_document_ids.length &&
    options.mandatory_document_ids.every(id => documents.has(id)), 'MANDATORY_IDS');
  const mandatory = [...new Set([...input.documents.filter(doc => doc.method_id === input.seed_method_id).map(doc => doc.id), ...options.mandatory_document_ids])].sort(compare);
  const lexical = options.mode === 'graph' ? [] : rankLexical(input.documents, input.query);
  const graph = options.mode === 'lexical' ? { witnesses: [], ignored_edges: [] } : reverseWitnesses(methods, input.edges, input.seed_method_id, options.max_depth);
  const pathByMethod = new Map(graph.witnesses.map(row => [row.method_id, row]));
  const graphDocs = input.documents.filter(doc => doc.method_id !== input.seed_method_id && pathByMethod.has(doc.method_id))
    .sort((a, b) => pathByMethod.get(a.method_id).logical_hops - pathByMethod.get(b.method_id).logical_hops || compare(a.id, b.id));
  const candidates = [...new Set([...graphDocs.slice(0, options.top_k_per_route).map(doc => doc.id),
    ...lexical.slice(0, options.top_k_per_route).map(row => row.document_id)])].filter(id => !mandatory.includes(id));
  const prefix = 'Synthetic context only\nQuery: ' + input.query + '\n';
  const block = id => { const doc = documents.get(id); return '\n[' + doc.evidence_id + ']\n' + doc.text + '\n'; };
  let context = prefix + mandatory.map(block).join('');
  const common = { selector_id: SELECTOR_ID, synthetic_only: true, adopted_for_real_runs: false, mode: options.mode,
    graph_inspected: options.mode !== 'lexical', lexical_settings: { algorithm: 'BM25', k1: 1.2, b: 0.75, tokenizer: 'unicode-camel-words/1' },
    input_sha256: hash(canonical(input)), options_sha256: hash(canonical(options)), context_byte_limit: options.context_byte_limit,
    lexical_ranking: lexical, dependency_witnesses: graph.witnesses, ignored_edges: graph.ignored_edges,
    impact_assessments: null, model_calls: 0, tokenizer_identity: null, provider_token_budget_checked: false,
    route_policy: 'graph-first_then_lexical_union_top-k-per-route; not semantic retrieval or a fair ablation claim' };
  if (bytes(context) > options.context_byte_limit) return { ...common, status: 'input_not_packable', context: null, context_bytes: null,
    context_sha256: null, selected_documents: [], dropped_documents: input.documents.map(doc => ({ document_id: doc.id, reason: 'mandatory_context_overflow' })),
    overflow_mandatory_bytes: bytes(context), mandatory_documents_truncated: false };
  const selected = [...mandatory], disposition = new Map();
  for (const id of candidates) {
    const next = block(id);
    if (bytes(context + next) <= options.context_byte_limit) { context += next; selected.push(id); }
    else disposition.set(id, 'context_byte_limit');
  }
  for (const doc of input.documents) if (!selected.includes(doc.id) && !disposition.has(doc.id)) disposition.set(doc.id, 'not_selected_by_route');
  return { ...common, status: 'context_ready', context, context_bytes: bytes(context), context_sha256: hash(context),
    selected_documents: selected.map(id => ({ ...documents.get(id), source_sha256: hash(documents.get(id).text), mandatory: mandatory.includes(id) })),
    dropped_documents: [...disposition].map(([document_id, reason]) => ({ document_id, reason })).sort((a, b) => compare(a.document_id, b.document_id)),
    mandatory_documents_truncated: false };
}
