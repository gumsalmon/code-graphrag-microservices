import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import core from '../../demo/p01/reasoning-core.js';
import { parseDataAsset } from '../../scripts/run_p01_reasoning.mjs';
import { parseOptions } from '../../scripts/run_p01_pipeline.mjs';
import { verifyPipeline } from '../../scripts/check_p01_pipeline.mjs';
import { retrievalInput } from '../../reasoning/p01/retrieval-context.mjs';
import { contextFromFreshGraph } from './context.mjs';
import { candidateFiles } from '../../scripts/package_p01_candidate.mjs';
const bundle = parseDataAsset(await readFile(new URL('../../demo/p01/data.js', import.meta.url), 'utf8'));
const source = await core.buildContext(bundle, { mode: 'source_only' });
function raw(id) { return Buffer.from(bundle.artifacts[id].base64, 'base64').toString('utf8'); }
async function fixture() {
  // Synthetic graph-query provenance for guard tests ONLY. Never persisted as a run.
  const input = await retrievalInput(source);
  const graphText = raw(bundle.snapshots.baseline.raw_graph);
  const graph = JSON.parse(graphText);
  const query = JSON.parse(raw(bundle.snapshots.baseline.raw_query));
  query.source = 'fresh Neo4j Bolt query; not impact labels'; query.run_id = 'synthetic-guard-fixture-not-a-run';
  const environment = { labels_read: false, remote_llm_calls: 0, repeat_import_idempotent: true, neo4j_version: '5.26.0',
    provenance: { baseline_commit: source.context.source_commit, snapshot_files: Object.fromEntries(input.sources.map(item => [item.file.split('/').at(-1), item.sha256])) } };
  return { input, graph, query, environment, graphText, queryText: JSON.stringify(query), environmentText: JSON.stringify(environment),
    patch: source.context.evidence.find(e => e.kind === 'proposed_patch').text, sources: Object.fromEntries(input.sources.map(item => [item.file, item.text])) };
}
test('prepare CLI has no implicit inference/setup, no key flag and rejects duplicate/unknown options', () => {
  assert.deepEqual(parseOptions([]), {});
  assert.deepEqual(parseOptions(['prepare', '--top-k', '5', '--depth', '2']), { topK: 5, depth: 2 });
  for (const args of [['live'], ['prepare', '--api-key', 'synthetic'], ['prepare', '--confirm-send'], ['prepare', '--top-k', '5', '--top-k', '6'], ['prepare', '--implementation']]) assert.throws(() => parseOptions(args));
});
test('fresh-context construction retains exact parser/query artifact hashes, not invented raw bytes', async () => {
  const data = await fixture(); const result = await contextFromFreshGraph(data);
  await core.verifyRequest(result.source); await core.verifyRequest(result.graphRequest);
  assert.equal(result.graphRequest.context.graph.parser_artifact_sha256, await core.hash(data.graphText));
  assert.equal(result.graphRequest.context.graph.query_artifact_sha256, await core.hash(data.queryText));
  assert.equal(result.graphRequest.context.graph.run_id, data.query.run_id);
  assert.equal(Object.hasOwn(result.source.context, 'graph'), false);
});
test('fresh-context helper never reads labels/runtime/summary from the supplied object', async () => {
  const data = await fixture();
  for (const key of ['labels', 'runtime', 'summary']) Object.defineProperty(data, key, { get() { throw new Error('Forbidden evidence read'); } });
  const prepared = await contextFromFreshGraph(data);
  assert.equal(prepared.graphRequest.context.limits.runtime_available, false);
  assert.equal(prepared.graphRequest.context.limits.labels_available, false);
});
test('stored query marker, mutated snapshot, labels or non-idempotent environment cannot pass fresh guard', async () => {
  for (const change of [x => { x.query.source = 'stored query'; }, x => { x.query.snapshot_kind = 'mutated'; }, x => { x.environment.labels_read = true; }, x => { x.environment.repeat_import_idempotent = false; }, x => { x.environment.neo4j_version = 'other'; }]) {
    const data = await fixture(); change(data); await assert.rejects(contextFromFreshGraph(data));
  }
});
test('mismatched query seed, source text and reserialized artifact contents are rejected', async () => {
  for (const change of [x => { x.query.seed_id = 'unregistered'; }, x => { x.sources[x.input.sources[0].file] += '// modified'; }, x => { x.graphText = '{}'; }]) {
    const data = await fixture(); change(data); await assert.rejects(contextFromFreshGraph(data));
  }
});
test('new technical run identity is preserved instead of rewriting it to a historical run', async () => {
  const first = await fixture(); const second = await fixture(); second.query.run_id = 'another-synthetic-fixture'; second.queryText = JSON.stringify(second.query);
  const a = await contextFromFreshGraph(first), b = await contextFromFreshGraph(second);
  assert.equal(a.source.request_sha256, b.source.request_sha256);
  assert.notEqual(a.graphRequest.request_sha256, b.graphRequest.request_sha256);
});
test('fresh context budget fails closed rather than silently discarding evidence', async () => {
  await assert.rejects(contextFromFreshGraph(await fixture(), { byteBudget: 1024 }), /exceeds byte budget/);
});
test('pipeline checker rejects paths outside private run root before reading them', async () => {
  await assert.rejects(verifyPipeline('.'), /inside private/);
});
test('publication allowlist excludes private evidence, credentials and unrelated reviewer/literature work', async () => {
  const files = await candidateFiles();
  assert.ok(files.includes('.gitattributes'));
  assert.ok(files.includes('pipeline/p01/graph-probe.py'));
  assert.ok(files.every(path => !/handoff-out|credentials|tasks\/p01-reviewer|literature|prepare_phat/.test(path)));
});
test('Git attributes preserve LF for the frozen data asset on Windows checkout', async () => {
  const text = await readFile(new URL('../../.gitattributes', import.meta.url), 'utf8');
  assert.match(text, /^\/demo\/p01\/data\.js text eol=lf$/m);
  assert.equal(await core.hash(await readFile(new URL('../../demo/p01/data.js', import.meta.url))), '053fe6c2caa4c7b47c8fa40d413ebd3c00ea22828c52f56fb1c902081f041689');
});
