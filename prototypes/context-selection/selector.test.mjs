import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, selectSyntheticContext } from './selector.mjs';
import { IDS, selectionFixture, selectionOptions } from './fixtures.mjs';
test('tokenizer splits camelCase, punctuation, unicode and case without changing source', () => {
  assert.deepEqual(tokenize('getOwnerDetails /api/v1 Ánh_xạ'), ['get', 'owner', 'details', 'api', 'v1', 'ánh', 'xạ']);
});
test('real repo IDs, labels or unsupported fields cannot enter the synthetic profile', () => {
  for (const changed of [{ synthetic_only: false }, { repository_id: 'spring-petclinic' }, { labels: [] }])
    assert.throws(() => selectSyntheticContext({ ...selectionFixture(), ...changed }, selectionOptions()));
});
test('lexical ranking is positive, stable on ties and independent of graph content', () => {
  const input = selectionFixture(), options = selectionOptions('lexical');
  const a = selectSyntheticContext(input, options);
  input.edges = [{ invalid: 'Graph deliberately inaccessible to lexical route' }];
  const b = selectSyntheticContext(input, options);
  assert.deepEqual(a.lexical_ranking, b.lexical_ranking);
  assert.deepEqual(a.selected_documents, b.selected_documents);
  assert.equal(b.graph_inspected, false);
  assert.ok(a.lexical_ranking.every(r => r.score > 0));
});
test('no lexical match retains only mandatory seed without inventing matches', () => {
  const input = selectionFixture(); input.query = 'quuxunmatched';
  const out = selectSyntheticContext(input, selectionOptions('lexical'));
  assert.equal(out.lexical_ranking.length, 0);
  assert.deepEqual(out.selected_documents.map(d => d.id), ['toy-doc-seed']);
});
test('reverse caller-to-callee traversal records exact 1/2/3 hops and boundaries', () => {
  for (const depth of [1, 2, 3]) {
    const out = selectSyntheticContext(selectionFixture(), { ...selectionOptions('graph'), max_depth: depth });
    assert.equal(out.dependency_witnesses.length, depth + 1);
    const last = out.dependency_witnesses.at(-1);
    assert.equal(last.logical_hops, depth);
    assert.equal(last.path.at(-1), IDS.seed);
    assert.equal(last.service_boundary_crossings, depth === 3 ? 2 : 1);
  }
});
test('containment, unresolved edges and duplicate edges never add logical routes', () => {
  const input = selectionFixture();
  input.edges.push({ caller: IDS.unrelated, callee: IDS.seed, type: 'CONTAINS', resolution_status: 'RESOLVED' },
    { caller: IDS.unrelated, callee: IDS.seed, type: 'CALLS', resolution_status: 'UNRESOLVED' }, structuredClone(input.edges[0]));
  const out = selectSyntheticContext(input, selectionOptions('graph'));
  assert.ok(!out.dependency_witnesses.some(w => w.method_id === IDS.unrelated));
  assert.deepEqual(out.ignored_edges.map(e => e.reason), ['non_logical_edge', 'unresolved_edge', 'duplicate']);
});
test('cycles terminate and keep shortest logical witness', () => {
  const input = selectionFixture(); input.edges.push({ caller: IDS.seed, callee: IDS.entry, type: 'CALLS', resolution_status: 'RESOLVED' });
  const out = selectSyntheticContext(input, selectionOptions('graph'));
  assert.equal(out.dependency_witnesses.length, 4);
  assert.equal(out.dependency_witnesses.find(w => w.method_id === IDS.seed).logical_hops, 0);
});
test('graph mode ignores lexical query for candidate selection', () => {
  const input = selectionFixture();
  const a = selectSyntheticContext(input, selectionOptions('graph')); input.query = 'Integer toString';
  assert.deepEqual(a.selected_documents, selectSyntheticContext(input, selectionOptions('graph')).selected_documents);
});
test('missing source seed, duplicate IDs and cross-snapshot methods fail closed', () => {
  const a = selectionFixture(); a.documents = a.documents.filter(d => d.method_id !== IDS.seed);
  assert.throws(() => selectSyntheticContext(a, selectionOptions()));
  const b = selectionFixture(); b.documents.push(structuredClone(b.documents[0]));
  assert.throws(() => selectSyntheticContext(b, selectionOptions()));
  const c = selectionFixture(); c.methods[0].id = c.methods[0].id.replace('toy-snapshot', 'toy-other');
  assert.throws(() => selectSyntheticContext(c, selectionOptions()));
});
test('context byte ceiling counts query, markers and unicode, with no silent truncation', () => {
  const input = selectionFixture(); input.query = 'Tiếng Việt';
  const full = selectSyntheticContext(input, selectionOptions());
  const tight = selectSyntheticContext(input, { ...selectionOptions(), context_byte_limit: 150 });
  assert.equal(full.context_bytes, Buffer.byteLength(full.context, 'utf8'));
  assert.ok(tight.status === 'input_not_packable' || tight.context_bytes <= 150);
  if (tight.status === 'context_ready') assert.equal(tight.selected_documents[0].text, input.documents[0].text);
  assert.equal(full.mandatory_documents_truncated, false);
  assert.equal(full.provider_token_budget_checked, false);
});
test('mandatory overflow stays explicit and cannot become successful empty context', () => {
  const out = selectSyntheticContext(selectionFixture(), { ...selectionOptions(), context_byte_limit: 1 });
  assert.equal(out.status, 'input_not_packable'); assert.equal(out.context, null);
  assert.equal(out.context_bytes, null); assert.equal(out.selected_documents.length, 0);
});
test('selected/dropped ledger accounts for every document once and input stays unchanged', () => {
  const input = selectionFixture(), before = structuredClone(input);
  const out = selectSyntheticContext(input, { ...selectionOptions(), top_k_per_route: 1, context_byte_limit: 240 });
  const ids = [...out.selected_documents.map(d => d.id), ...out.dropped_documents.map(d => d.document_id)];
  assert.equal(new Set(ids).size, input.documents.length); assert.equal(ids.length, input.documents.length);
  assert.deepEqual(input, before); assert.equal(out.impact_assessments, null); assert.equal(out.model_calls, 0);
});
