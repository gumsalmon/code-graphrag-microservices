import test from 'node:test';
import assert from 'node:assert/strict';
import { bridgeSyntheticNative, selectNativeSynthetic } from './native-bridge.mjs';
import { selectionOptions } from './fixtures.mjs';

function fixture() {
  const a = 'api-gateway::demo.Client#load()', b = 'visits-service::demo.Provider#read()';
  const method = (id, service, cls, name) => ({ id, service, class_fqn: cls, method_name: name, parameter_types: [],
    file: 'virtual/' + cls + '.java', line_start: 2, line_end: 2 });
  return { synthetic_only: true, native_graph: {
    metadata: { schema_version: '0.2.0', repository: 'synthetic://java-rest-regression', commit_sha: 'not-a-git-commit:synthetic-dev-fixtures-v1', snapshot_kind: 'synthetic_dev', patch_id: null },
    nodes: [method(a, 'api-gateway', 'demo.Client', 'load'), method(b, 'visits-service', 'demo.Provider', 'read')],
    endpoints: [{ handler_id: b, query_parameters: [{ declared_required: false, effective_required: false, default_value: 'false' }] }],
    edges: [{ source_id: a, target_id: b, type: 'INVOKES_API', resolution_status: 'RESOLVED', sent_query_parameters: ['ids'], contract_status: 'VALID' }],
    unresolved: [{ file: 'virtual/Other.java', line_start: 1, line_end: 1, expression: 'dynamic()', reason: 'Synthetic unknown' }] },
    sources: [{ native_method_id: a, fixture_file: 'fixture/Client.java', text: 'class Client {\nObject load() { return remote.read(); }\n}' },
      { native_method_id: b, fixture_file: 'fixture/Provider.java', text: 'class Provider {\nObject read() { return null; }\n}' }],
    seed_native_id: b, query: 'remote read' };
}
test('native source/IDs/edges feed selector with explicit toy aliases and checked excerpts', () => {
  const request = fixture(), original = structuredClone(request), r = selectNativeSynthetic(request, selectionOptions('graph'));
  assert.equal(r.selection.status, 'context_ready');
  assert.equal(r.selection.dependency_witnesses.length, 2);
  assert.equal(r.selection.dependency_witnesses.at(-1).logical_hops, 1);
  assert.equal(r.selection.dependency_witnesses.at(-1).service_boundary_crossings, 1);
  assert.ok(r.bindings.every(row => row.native_method_id !== row.toy_method_id && row.source_utf8_sha256.length === 64));
  assert.equal(r.input.documents[0].text, 'Object load() { return remote.read(); }');
  assert.deepEqual(request, original);
});
test('native optional/default/sent metadata and unresolved survive without impact labels', () => {
  const request = fixture(), r = bridgeSyntheticNative(request);
  assert.deepEqual(r.native_endpoint_metadata, request.native_graph.endpoints);
  assert.deepEqual(r.native_edge_metadata, request.native_graph.edges);
  assert.deepEqual(r.unresolved, request.native_graph.unresolved);
  assert.equal(r.impact_assessments, null); assert.equal(r.real_git_lineage_verified, false);
  assert.equal(r.adopted_for_real_runs, false); assert.equal(r.actual_remote_calls, 0);
  assert.equal(r.native_registry_is_complete_source_inventory, false);
  assert.equal(r.unreturned_native_entities_are_negative, false);
});
test('real repository metadata, non-synthetic mode and label injection fail closed', () => {
  for (const edit of [r => { r.native_graph.metadata.repository = 'petclinic'; }, r => { r.synthetic_only = false; }, r => { r.labels = []; }]) {
    const r = fixture(); edit(r); assert.throws(() => bridgeSyntheticNative(r));
  }
});
test('missing/duplicate/extra source binding and paths outside fixture are rejected', () => {
  for (const edit of [r => { r.sources.pop(); }, r => { r.sources[1] = r.sources[0]; },
    r => { r.sources[0].native_method_id = 'not-in-native'; }, r => { r.sources[0].fixture_file = '../private'; }]) {
    const r = fixture(); edit(r); assert.throws(() => bridgeSyntheticNative(r));
  }
});
test('bad span, wrong method, wrong class and forged native ID are rejected', () => {
  for (const edit of [r => { r.native_graph.nodes[0].line_end = 999; }, r => { r.sources[0].text = 'class Client {\nObject other() {}\n}'; },
    r => { r.sources[0].text = 'class Wrong {\nObject load() {}\n}'; }, r => { r.native_graph.nodes[0].id = 'wrong'; }]) {
    const r = fixture(); edit(r); assert.throws(() => bridgeSyntheticNative(r));
  }
});
test('unresolved edge cannot become a resolved graph witness', () => {
  const request = fixture(); request.native_graph.edges[0].resolution_status = 'UNRESOLVED';
  const r = selectNativeSynthetic(request, selectionOptions('graph'));
  assert.equal(r.selection.dependency_witnesses.length, 1);
  assert.equal(r.selection.ignored_edges[0].reason, 'unresolved_edge');
  assert.equal(r.unresolved.length, 1);
});
test('unknown endpoint/type and duplicate native methods fail rather than guess', () => {
  for (const edit of [r => { r.native_graph.edges[0].target_id = 'missing'; }, r => { r.native_graph.edges[0].type = 'GUESSED'; },
    r => { r.native_graph.nodes[1] = r.native_graph.nodes[0]; }]) {
    const r = fixture(); edit(r); assert.throws(() => bridgeSyntheticNative(r));
  }
});
test('CRLF source hash is raw UTF-8 while excerpts explicitly normalize line endings', () => {
  const lf = fixture(), crlf = fixture(); crlf.sources[0].text = crlf.sources[0].text.replaceAll('\n', '\r\n');
  const a = bridgeSyntheticNative(lf), b = bridgeSyntheticNative(crlf);
  assert.notEqual(a.bindings[0].source_utf8_sha256, b.bindings[0].source_utf8_sha256);
  assert.equal(a.bindings[0].excerpt_lf_sha256, b.bindings[0].excerpt_lf_sha256);
});
test('lexical selection has no graph witness and mandatory overflow blocks explicitly', () => {
  const lexical = selectNativeSynthetic(fixture(), selectionOptions('lexical'));
  assert.equal(lexical.adapter_validated_native_graph, true);
  assert.equal(lexical.selection.graph_inspected, false);
  assert.deepEqual(lexical.selection.dependency_witnesses, []);
  assert.equal(selectNativeSynthetic(fixture(), { ...selectionOptions('graph'), context_byte_limit: 1 }).selection.status, 'input_not_packable');
});
