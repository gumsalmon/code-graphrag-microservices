// Adapter for the coordinator's synthetic Java runner profile only; no I/O or real-run activation.
import { createHash } from 'node:crypto';
import { selectSyntheticContext } from './selector.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const requireValue = (ok, code) => { if (!ok) throw new Error(code); };
const text = value => typeof value === 'string' && value.length > 0;
const safePath = value => text(value) && !value.includes('\\') && !value.includes(':') && !value.startsWith('/') &&
  value.split('/').every(part => part && part !== '..' && part !== '.');
const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const closed = (value, keys) => requireValue(value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), 'NATIVE_FIELDS');

export function bridgeSyntheticNative(request) {
  closed(request, ['synthetic_only', 'native_graph', 'sources', 'seed_native_id', 'query']);
  requireValue(request.synthetic_only === true && typeof request.query === 'string', 'SYNTHETIC_ONLY');
  const graph = request.native_graph;
  closed(graph, ['metadata', 'nodes', 'endpoints', 'edges', 'unresolved']);
  closed(graph.metadata, ['schema_version', 'repository', 'commit_sha', 'snapshot_kind', 'patch_id']);
  requireValue(graph.metadata.schema_version === '0.2.0' && graph.metadata.repository === 'synthetic://java-rest-regression' &&
    graph.metadata.commit_sha === 'not-a-git-commit:synthetic-dev-fixtures-v1' && graph.metadata.snapshot_kind === 'synthetic_dev' &&
    graph.metadata.patch_id === null, 'SYNTHETIC_NATIVE_PROFILE_REQUIRED');
  for (const key of ['nodes', 'endpoints', 'edges', 'unresolved']) requireValue(Array.isArray(graph[key]) && graph[key].length <= 1000, 'NATIVE_ARRAY');
  requireValue(graph.nodes.length > 0 && Array.isArray(request.sources) && request.sources.length === graph.nodes.length, 'SOURCE_BINDINGS_REQUIRED');
  const sources = new Map();
  for (const row of request.sources) {
    closed(row, ['native_method_id', 'fixture_file', 'text']);
    requireValue(text(row.native_method_id) && safePath(row.fixture_file) && text(row.text) && row.text.length <= 262144 &&
      !sources.has(row.native_method_id), 'SOURCE_BINDING');
    sources.set(row.native_method_id, row);
  }
  const repository_id = 'toy-native-repo', snapshot_id = 'toy-native-snapshot', ids = new Map(), methods = [], documents = [], bindings = [];
  for (const node of graph.nodes) {
    closed(node, ['id', 'service', 'class_fqn', 'method_name', 'parameter_types', 'file', 'line_start', 'line_end']);
    requireValue(/^[a-z][a-z0-9-]*$/.test(node.service) && /^[A-Za-z_$][\w.$]*$/.test(node.class_fqn) &&
      /^[A-Za-z_$][\w$]*$/.test(node.method_name) && Array.isArray(node.parameter_types) && node.parameter_types.every(text), 'NATIVE_NODE');
    requireValue(node.id === node.service + '::' + node.class_fqn + '#' + node.method_name + '(' + node.parameter_types.join(',') + ')' &&
      !ids.has(node.id) && safePath(node.file), 'NATIVE_ID');
    const source = sources.get(node.id);
    requireValue(source, 'SOURCE_BINDING_MISSING');
    const lines = source.text.split(/\r\n|\n/);
    requireValue(Number.isInteger(node.line_start) && Number.isInteger(node.line_end) && node.line_start >= 1 &&
      node.line_end >= node.line_start && node.line_end <= lines.length, 'SOURCE_SPAN');
    const excerpt = lines.slice(node.line_start - 1, node.line_end).join('\n');
    const simpleClass = node.class_fqn.split('.').at(-1);
    requireValue(new RegExp('\\b(?:class|record)\\s+' + escaped(simpleClass) + '\\b').test(source.text) &&
      new RegExp('\\b' + escaped(node.method_name) + '\\s*\\(').test(excerpt), 'SOURCE_DECLARATION');
    const service = 'toy-' + node.service;
    const id = repository_id + '@' + snapshot_id + '::' + service + '::' + node.class_fqn + '#' + node.method_name + '(' + node.parameter_types.join(',') + ')';
    const token = hash(node.id).slice(0, 24), document_id = 'toy-native-doc-' + token, evidence_id = 'TOY-NATIVE-' + token.toUpperCase();
    ids.set(node.id, id); methods.push({ id, service });
    documents.push({ id: document_id, evidence_id, method_id: id, text: excerpt });
    bindings.push({ native_method_id: node.id, toy_method_id: id, document_id, evidence_id,
      native_virtual_file: node.file, fixture_file: source.fixture_file, line_start: node.line_start, line_end: node.line_end,
      source_utf8_sha256: hash(source.text), excerpt_lf_sha256: hash(excerpt),
      file_binding_basis: 'caller-supplied synthetic fixture binding, declaration and line bounds checked; virtual path is not a filesystem locator' });
  }
  requireValue(ids.has(request.seed_native_id) && [...sources.keys()].every(id => ids.has(id)), 'NATIVE_SEED_OR_EXTRA_SOURCE');
  const edges = graph.edges.map(edge => {
    requireValue(edge && ids.has(edge.source_id) && ids.has(edge.target_id) && ['CALLS', 'INVOKES_API'].includes(edge.type) &&
      ['RESOLVED', 'UNRESOLVED'].includes(edge.resolution_status), 'NATIVE_EDGE');
    return { caller: ids.get(edge.source_id), callee: ids.get(edge.target_id), type: edge.type, resolution_status: edge.resolution_status };
  });
  return { adapter_id: 'native-context-bridge/synthetic-prototype.1', synthetic_only: true, adopted_for_real_runs: false,
    metadata_is_authentication: false, real_git_lineage_verified: false, native_registry_is_complete_source_inventory: false,
    unreturned_native_entities_are_negative: false,
    identity_policy: 'explicit toy aliases; not cross-revision symbol resolution or real repository IDs',
    input: { synthetic_only: true, repository_id, snapshot_id, seed_method_id: ids.get(request.seed_native_id), query: request.query, methods, documents, edges },
    bindings, native_metadata: structuredClone(graph.metadata), native_endpoint_metadata: structuredClone(graph.endpoints),
    native_edge_metadata: structuredClone(graph.edges), unresolved: structuredClone(graph.unresolved),
    impact_assessments: null, actual_remote_calls: 0, ground_truth_accepted: false, official_scoring_authorized: false };
}

export function selectNativeSynthetic(request, options) {
  const bridge = bridgeSyntheticNative(request);
  return { ...bridge, adapter_validated_native_graph: true, selection: selectSyntheticContext(bridge.input, options) };
}
