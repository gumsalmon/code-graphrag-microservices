import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import { once } from 'node:events';
import { createDemoServer } from './server.mjs';
import { buildDemo, serializeBundle, sha256, parseManifest, verifyBytes, patchChanges, countVisits, validateSnapshot } from '../../scripts/build_p01_demo.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const asset = readFileSync(resolve(root, 'data.js'), 'utf8');
const context = { window: {} };
vm.runInNewContext(asset, context, { timeout: 2000 });
const bundle = JSON.parse(JSON.stringify(context.window.P01_DEMO_DATA));
const raw = id => Buffer.from(bundle.artifacts[id].base64, 'base64');

function fixture() {
  const directory = mkdtempSync(resolve(tmpdir(), 'p01-demo-test-'));
  const gitFiles = new Map();
  for (const [id, artifact] of Object.entries(bundle.artifacts)) {
    if (artifact.origin === 'runtime') gitFiles.set(artifact.path, raw(id));
    else {
      const path = resolve(directory, artifact.path);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, raw(id));
    }
  }
  return { directory, gitReader: path => {
    assert.ok(gitFiles.has(path), 'Unexpected Git read: ' + path);
    return gitFiles.get(path);
  }, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
}

test('bundle contains recorded pilot evidence, not labels, scores or review approval', () => {
  assert.equal(bundle.mode, 'recorded-evidence');
  assert.equal(bundle.label_status, 'pending_review');
  assert.equal(bundle.llm_integrated, false);
  assert.equal(bundle.provenance.suite.tests, 59);
  assert.equal(bundle.provenance.suite.skipped, 0);
  assert.equal(Object.keys(bundle.artifacts).length, 27);
  const paths = Object.values(bundle.artifacts).map(item => item.path);
  assert.ok(paths.every(path => !/labels|review_decision|scores|summary\.md/i.test(path)));
  assert.ok(!Object.hasOwn(bundle, 'ground_truth'));
});

test('all 27 bundled raw artifacts retain their original byte length and SHA-256', () => {
  for (const [id, artifact] of Object.entries(bundle.artifacts)) {
    assert.equal(raw(id).length, artifact.byte_length, id);
    assert.equal(sha256(raw(id)), artifact.sha256, id);
  }
});

test('both snapshots have valid source spans, query paths and Neo4j inventory', () => {
  for (const kind of ['baseline', 'mutated']) {
    validateSnapshot(bundle.snapshots[kind], kind);
    assert.equal(bundle.snapshots[kind].graph.nodes.length, 5);
    assert.equal(bundle.snapshots[kind].graph.edges.length, 2);
    assert.equal(bundle.snapshots[kind].query.impacted_methods.length, 2);
    assert.deepEqual(bundle.snapshots[kind].query.impacted_methods.map(item => item.hop), [1, 2]);
    assert.ok(bundle.snapshots[kind].query.impacted_methods.every(item => item.service_boundary_crossings === 1));
  }
  const edge = bundle.snapshots.mutated.graph.edges.find(item => item.type === 'INVOKES_API');
  assert.deepEqual(edge.missing_required_parameters, ['includeDetails']);
});

test('query cannot invent a dependency edge, include the seed, or use invalid source spans', () => {
  const snapshot = structuredClone(bundle.snapshots.mutated);
  snapshot.query.impacted_methods[0].edge_path[0] = 'MADE_UP';
  assert.throws(() => validateSnapshot(snapshot, 'mutated'), /absent from graph/);
  const second = structuredClone(bundle.snapshots.baseline);
  second.query.impacted_methods[0].method_id = second.query.seed_id;
  assert.throws(() => validateSnapshot(second, 'baseline'), /Seed must be excluded/);
  const third = structuredClone(bundle.snapshots.baseline);
  third.graph.edges[0].evidence[0].line_end = 99999;
  assert.throws(() => validateSnapshot(third, 'baseline'), /Invalid source evidence span/);
});

test('LF and UTF-16LE patches retain different hashes but equivalent Java edits', () => {
  assert.notEqual(sha256(raw('technical-patch')), sha256(raw('runtime-patch')));
  assert.deepEqual(patchChanges(raw('technical-patch').toString('utf8')), patchChanges(raw('runtime-patch').subarray(2).toString('utf16le')));
  assert.notDeepEqual(patchChanges('+ return 1;\n- return 0;'), patchChanges('+ return 2;\n- return 0;'));
});

test('visits counts come from response bodies; absent/error is not zero', () => {
  assert.equal(countVisits({ status: 400 }), null);
  assert.equal(countVisits({ pets: [{ id: 7 }] }), null);
  assert.equal(countVisits({ items: [] }), 0);
  assert.equal(countVisits({ pets: [{ visits: [] }] }), 0);
  const records = new Map(bundle.runtime.requests.map(item => [item.record.id, item]));
  assert.equal(records.size, 7);
  assert.equal(records.get('baseline_gateway').visit_count, 4);
  assert.equal(records.get('mutated_gateway').visit_count, 0);
  assert.equal(records.get('mutated_direct_valid_parameter').visit_count, 4);
  assert.equal(records.get('mutated_direct_missing_parameter').visit_count, null);
  for (const item of records.values()) assert.equal(item.visit_count, countVisits(JSON.parse(item.record.body)));
});

test('checksum reader rejects unsafe paths, duplicates, missing hashes and modified bytes', () => {
  for (const path of ['../file', 'C:/file', '/file', 'safe/../file', 'safe\\file']) {
    assert.throws(() => parseManifest('a'.repeat(64) + '  ' + path), /Unsafe manifest path/);
  }
  const line = 'a'.repeat(64) + '  safe/file';
  assert.throws(() => parseManifest(line + '\n' + line), /Duplicate/);
  assert.throws(() => verifyBytes(Buffer.from('modified'), sha256(Buffer.from('original')), 'file'), /mismatch/);
  assert.throws(() => verifyBytes(Buffer.from('original'), undefined, 'file'), /missing checksum/);
});

test('builder reconstructs the exact shipped bundle using only selected raw inputs', () => {
  const inputs = fixture();
  try {
    const rebuilt = buildDemo({ evidenceRoot: inputs.directory, gitReader: inputs.gitReader });
    assert.equal(serializeBundle(rebuilt), asset);
  } finally { inputs.cleanup(); }
});

test('builder rejects tampered source before it can create a demo', () => {
  const inputs = fixture();
  try {
    const artifact = bundle.artifacts['mutated-VisitResource.java'];
    writeFileSync(resolve(inputs.directory, artifact.path), 'tampered source');
    assert.throws(() => buildDemo({ evidenceRoot: inputs.directory, gitReader: inputs.gitReader }), /SHA-256 mismatch/);
  } finally { inputs.cleanup(); }
});

test('serialization escapes markup/script terminators and JS line separators', () => {
  const serialized = serializeBundle({ text: '</script><img onerror="bad">\u2028\u2029' });
  assert.ok(!serialized.includes('</script>'));
  assert.ok(serialized.includes('\\u003c'));
  const context = { window: {} };
  vm.runInNewContext(serialized, context);
  assert.equal(context.window.P01_DEMO_DATA.text, '</script><img onerror="bad">\u2028\u2029');
});

test('read-only server serves allowlisted assets, blocks other files and mutations', async () => {
  const server = createDemoServer();
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = 'http://127.0.0.1:' + server.address().port;
  try {
    const home = await fetch(url);
    assert.equal(home.status, 200);
    assert.ok((await home.text()).includes('dependency-graph'));
    assert.ok(home.headers.get('content-security-policy').includes("connect-src 'none'"));
    assert.equal((await fetch(url + '/data.js', { method: 'HEAD' })).status, 200);
    for (const path of ['/PROJECT_CONTEXT.md', '/.git/config', '/%2e%2e/%2e%2e/PROJECT_CONTEXT.md', '/%2e%2e%2fPROJECT_CONTEXT.md']) assert.equal((await fetch(url + path)).status, 404);
    assert.equal((await fetch(url, { method: 'POST' })).status, 405);
  } finally { await new Promise(done => server.close(done)); }
});
