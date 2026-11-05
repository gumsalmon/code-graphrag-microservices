import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const IMPLEMENTATION_SHA = 'e95613795133088621117179c9fb9592dab62b16';
export const SOURCE_SHA = '3858f9c630cf989bb6809a86edf47c2be78dc9f1';
export const BENCHMARK_SHA = '5f9204d66253604edf9101c2f888fc7e75aa0be7';
export const DEFAULT_EVIDENCE = resolve(REPO, 'handoff-out/p01-step1-20261012-02747b5d/evidence-bridge');
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const lf = text => text.replace(/\r\n/g, '\n');

export function parseManifest(text) {
  const entries = new Map();
  for (const line of text.trim().split(/\r?\n/)) {
    const match = /^([a-f0-9]{64}) {2}(.+)$/.exec(line);
    if (!match) throw new Error('Invalid checksum manifest line');
    const path = match[2];
    if (isAbsolute(path) || /^[a-z]:/i.test(path) || path.includes('\\') || path.split('/').some(p => p === '..' || p === '.')) {
      throw new Error('Unsafe manifest path: ' + path);
    }
    if (entries.has(path)) throw new Error('Duplicate manifest path: ' + path);
    entries.set(path, match[1]);
  }
  return entries;
}

export function verifyBytes(bytes, expected, name) {
  if (!expected || sha256(bytes) !== expected) throw new Error('SHA-256 mismatch or missing checksum: ' + name);
  return bytes;
}

export function patchChanges(text) {
  // Ignore file headers and blank-line-only hunks, not Java content changes.
  return lf(text).split('\n').filter(line => /^[+-]/.test(line) && !/^(---|\+\+\+)/.test(line) && line.slice(1).trim())
    .map(line => line[0] + line.slice(1).trim().replace(/\s+/g, ' '));
}

export function countVisits(body) {
  if (Array.isArray(body)) return body.length;
  if (body && Array.isArray(body.items)) return body.items.length;
  if (body && Array.isArray(body.pets) && body.pets.every(pet => Array.isArray(pet.visits))) {
    return body.pets.reduce((total, pet) => total + pet.visits.length, 0);
  }
  return null; // A missing field or an error body is NOT an empty visits list.
}

export function validateSnapshot(snapshot, kind) {
  const { graph, query, sources, environment } = snapshot;
  if (graph.metadata.snapshot_kind !== kind || query.snapshot_kind !== kind) throw new Error('Snapshot kind mismatch');
  if (graph.metadata.commit_sha !== (kind === 'baseline' ? SOURCE_SHA : 'MUTATED_LOCAL_UNCOMMITTED')) throw new Error('Wrong source revision');
  if (environment.provenance.baseline_commit !== SOURCE_SHA) throw new Error('Wrong baseline provenance');
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  if (nodes.size !== graph.nodes.length || !nodes.has(query.seed_id)) throw new Error('Invalid graph IDs or seed');
  const span = evidence => {
    const source = sources[evidence.file];
    if (!source || !Number.isInteger(evidence.line_start) || !Number.isInteger(evidence.line_end) ||
        evidence.line_start < 1 || evidence.line_end < evidence.line_start || evidence.line_end > source.text.split('\n').length) {
      throw new Error('Invalid source evidence span');
    }
  };
  graph.nodes.forEach(span);
  graph.endpoints.forEach(endpoint => {
    if (!nodes.has(endpoint.handler_id)) throw new Error('Unknown endpoint handler');
    span(endpoint.evidence);
  });
  for (const edge of graph.edges) {
    if (!nodes.has(edge.source_id) || !nodes.has(edge.target_id)) throw new Error('Dangling graph edge');
    edge.evidence.forEach(span);
  }
  graph.unresolved.forEach(span);
  if (query.seed_excluded !== true || query.impacted_methods.some(method => method.method_id === query.seed_id)) throw new Error('Seed must be excluded');
  const methods = new Set();
  for (const method of query.impacted_methods) {
    if (!nodes.has(method.method_id) || methods.has(method.method_id)) throw new Error('Invalid query candidate');
    methods.add(method.method_id);
    if (method.method_path[0] !== method.method_id || method.method_path.at(-1) !== query.seed_id ||
        method.hop !== method.edge_path.length || method.method_path.length !== method.hop + 1) throw new Error('Invalid query path');
    let boundaries = 0;
    method.edge_path.forEach((type, index) => {
      const edge = graph.edges.find(edge => edge.source_id === method.method_path[index] && edge.target_id === method.method_path[index + 1] && edge.type === type);
      if (!edge) throw new Error('Query path is absent from graph');
      if (edge.cross_service) boundaries++;
    });
    if (boundaries !== method.service_boundary_crossings) throw new Error('Boundary count mismatch');
  }
  const inventory = query.inventory_after;
  if (JSON.stringify([...inventory.methods].sort()) !== JSON.stringify([...nodes.keys()].sort()) || inventory.edges.length !== graph.edges.length) {
    throw new Error('Neo4j inventory differs from parser graph');
  }
  for (const edge of inventory.edges) {
    if (!graph.edges.some(item => item.source_id === edge.source && item.target_id === edge.target && item.type === edge.type)) throw new Error('Neo4j edge differs from parser graph');
  }
}

export function buildDemo({ evidenceRoot = DEFAULT_EVIDENCE, gitReader } = {}) {
  const root = resolve(evidenceRoot);
  const manifestBytes = readFileSync(resolve(root, 'independent-checksums.sha256'));
  const manifest = parseManifest(manifestBytes.toString('utf8'));
  const artifacts = {};
  const register = (id, bytes, path, origin, downloadName = basename(path)) => {
    if (artifacts[id]) throw new Error('Duplicate artifact ID');
    artifacts[id] = { path, origin, download_name: downloadName, sha256: sha256(bytes), byte_length: bytes.length, base64: bytes.toString('base64') };
    return id;
  };
  const local = path => {
    const full = resolve(root, path);
    if (isAbsolute(relative(root, full)) || relative(root, full).startsWith('..')) throw new Error('Path escapes evidence root');
    return verifyBytes(readFileSync(full), manifest.get(path), path);
  };
  register('technical-manifest', manifestBytes, 'independent-checksums.sha256', 'technical');
  const auditBytes = local('independent-audit.json');
  register('technical-audit', auditBytes, 'independent-audit.json', 'technical');
  const audit = JSON.parse(auditBytes);
  if (audit.status !== 'pass' || audit.errors.length || audit.implementation_sha !== IMPLEMENTATION_SHA || audit.source_sha !== SOURCE_SHA) throw new Error('Technical audit not accepted for this bundle');
  for (const key of ['implementation_before', 'implementation_after', 'source_before', 'source_after']) {
    if (audit[key].status || audit[key].head !== (key.startsWith('source') ? SOURCE_SHA : IMPLEMENTATION_SHA)) throw new Error('Audit checkout not clean or wrong revision');
  }
  const stripEvidence = path => {
    if (!path.startsWith('evidence-bridge/')) throw new Error('Unexpected audit evidence prefix');
    return path.slice('evidence-bridge/'.length);
  };
  for (const name of ['pytest.xml', 'pytest.log', 'process-result.json']) {
    const path = stripEvidence(audit.suite.directory) + '/' + name;
    register('suite-' + name, local(path), path, 'technical');
  }
  const junit = Buffer.from(artifacts['suite-pytest.xml'].base64, 'base64').toString('utf8');
  const suiteTag = /<testsuite\b[^>]*>/.exec(junit)?.[0];
  const attributes = Object.fromEntries([...suiteTag?.matchAll(/(tests|failures|errors|skipped)="(\d+)"/g) ?? []].map(match => [match[1], Number(match[2])]));
  for (const key of ['tests', 'failures', 'errors', 'skipped']) {
    if (attributes[key] !== audit.suite[key]) throw new Error('JUnit totals differ from audit');
  }
  if (attributes.failures || attributes.errors || attributes.skipped) throw new Error('Suite is not all-pass');

  const snapshots = {};
  for (const kind of ['baseline', 'mutated']) {
    const live = audit.live_queries.find(item => item.snapshot === kind);
    if (!live) throw new Error('Missing live query snapshot');
    const prefix = stripEvidence(live.query_file).replace(/\/query-result\.json$/, '');
    const jsonArtifact = name => {
      const bytes = local(prefix + '/' + name);
      const id = register(kind + '-' + name, bytes, prefix + '/' + name, 'technical', kind + '-' + name);
      return { id, value: JSON.parse(bytes) };
    };
    const graph = jsonArtifact('parser-output.json');
    const query = jsonArtifact('query-result.json');
    const environment = jsonArtifact('environment.json');
    register(kind + '-import.cypher', local(prefix + '/import.cypher'), prefix + '/import.cypher', 'technical', kind + '-import.cypher');
    const sources = {};
    for (const path of [...new Set(graph.value.nodes.map(node => node.file))].sort()) {
      const bytes = local(prefix + '/snapshot-source/' + basename(path));
      const id = register(kind + '-' + basename(path), bytes, prefix + '/snapshot-source/' + basename(path), 'technical', kind + '-' + basename(path));
      if (environment.value.provenance.snapshot_files[basename(path)] !== sha256(bytes)) throw new Error('Snapshot source hash differs from environment');
      sources[path] = { text: lf(bytes.toString('utf8')), raw_id: id };
    }
    snapshots[kind] = { graph: graph.value, query: query.value, environment: environment.value, sources,
      raw_graph: graph.id, raw_query: query.id, raw_environment: environment.id };
    validateSnapshot(snapshots[kind], kind);
    if (kind === 'mutated') {
      const bytes = local(prefix + '/mutation.patch');
      register('technical-patch', bytes, prefix + '/mutation.patch', 'technical');
      if (sha256(bytes) !== graph.value.metadata.patch_id) throw new Error('Mutation patch hash differs from graph');
    }
  }

  const readGit = gitReader ?? (path => execFileSync('git', ['-c', 'safe.directory=' + REPO.replaceAll('\\', '/'), 'show', BENCHMARK_SHA + ':' + path], { cwd: REPO, maxBuffer: 8 * 1024 * 1024 }));
  const benchmarkManifest = readGit('benchmark/p01/checksums.sha256');
  const benchmarkEntries = parseManifest(benchmarkManifest.toString('utf8'));
  register('runtime-manifest', benchmarkManifest, 'benchmark/p01/checksums.sha256', 'runtime');
  const runtime = path => verifyBytes(readGit(path), benchmarkEntries.get(path), path);
  const runtimePrefix = 'benchmark/p01/raw/rerun-20260923-152742/';
  const runtimeBytes = runtime(runtimePrefix + 'requests.jsonl');
  register('runtime-requests', runtimeBytes, runtimePrefix + 'requests.jsonl', 'runtime');
  const requests = runtimeBytes.toString('utf8').trim().split(/\r?\n/).map(line => {
    const record = JSON.parse(line);
    if (record.exit_code !== 0 || !['baseline', 'mutated'].includes(record.snapshot) || record.method !== 'GET' || !Number.isInteger(record.http_status) || !Number.isFinite(Date.parse(record.timestamp))) throw new Error('Malformed runtime record');
    const body = JSON.parse(record.body);
    return { record, body, visit_count: countVisits(body) };
  });
  if (new Set(requests.map(item => item.record.id)).size !== requests.length || requests.length !== 7) throw new Error('Unexpected runtime record set');
  const runtimeEnvironmentBytes = runtime(runtimePrefix + 'environment.json');
  register('runtime-environment', runtimeEnvironmentBytes, runtimePrefix + 'environment.json', 'runtime');
  const runtimeEnvironment = JSON.parse(runtimeEnvironmentBytes);
  if (runtimeEnvironment.baseline_commit !== SOURCE_SHA) throw new Error('Runtime baseline differs from graph baseline');
  const runtimePatch = runtime('benchmark/p01/raw/historical/mutation.patch');
  register('runtime-patch', runtimePatch, 'benchmark/p01/raw/historical/mutation.patch', 'runtime', 'runtime-mutation-UTF16LE.patch');
  if (sha256(runtimePatch) !== runtimeEnvironment.patch_sha256 || runtimePatch[0] !== 0xff || runtimePatch[1] !== 0xfe) throw new Error('Wrong runtime patch or encoding');
  const technicalPatchText = Buffer.from(artifacts['technical-patch'].base64, 'base64').toString('utf8');
  const canonicalChanges = patchChanges(technicalPatchText);
  if (canonicalChanges.length !== 2 || JSON.stringify(canonicalChanges) !== JSON.stringify(patchChanges(runtimePatch.subarray(2).toString('utf16le')))) throw new Error('Runtime and technical patches are not equivalent Java changes');
  for (const [path, source] of Object.entries(snapshots.baseline.sources)) {
    const bytes = runtime('benchmark/p01/raw/source_baseline/' + basename(path));
    if (lf(bytes.toString('utf8')) !== source.text) throw new Error('Runtime source differs from technical baseline');
    register('runtime-source-' + basename(path), bytes, 'benchmark/p01/raw/source_baseline/' + basename(path), 'runtime', 'runtime-baseline-' + basename(path));
  }
  return {
    schema: 'p01-evidence-demo/1', mode: 'recorded-evidence', label_status: 'pending_review', llm_integrated: false,
    provenance: { implementation_sha: IMPLEMENTATION_SHA, source_sha: SOURCE_SHA, benchmark_sha: BENCHMARK_SHA,
      technical_started_utc: audit.started_at_utc, technical_finished_utc: audit.finished_at_utc,
      runtime_started: runtimeEnvironment.started_at, suite: audit.suite, python: audit.python,
      platform: audit.platform, network_mode: audit.network_mode, dependencies: audit.dependencies,
      model_archive: audit.chroma_model_archive.sha256, independent_manifest_sha256: sha256(manifestBytes),
      benchmark_manifest_sha256: sha256(benchmarkManifest), selected_runtime_checksums: [...Object.values(artifacts)].filter(item => item.origin === 'runtime' && item.path !== 'benchmark/p01/checksums.sha256').length,
      patch_comparison: 'Same nonblank Java added/deleted lines after whitespace normalization; raw bytes and hashes differ',
      source_comparison: 'Three runtime baseline files equal the technical baseline after CRLF-to-LF normalization only' },
    snapshots, patch: { text: technicalPatchText, raw_id: 'technical-patch', runtime_raw_id: 'runtime-patch' },
    runtime: { requests, environment: runtimeEnvironment, raw_id: 'runtime-requests' }, artifacts,
  };
}

export function serializeBundle(bundle) {
  const json = JSON.stringify(bundle).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return '// Generated by scripts/build_p01_demo.mjs. Recorded evidence, not approved ground truth.\nwindow.P01_DEMO_DATA = ' + json + ';\n';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let evidenceRoot = DEFAULT_EVIDENCE;
  let out = resolve(REPO, 'demo/p01/data.js');
  for (let index = 0; index < args.length; index += 2) {
    if (!args[index + 1]) throw new Error('Option requires a value');
    if (args[index] === '--evidence-root') evidenceRoot = args[index + 1];
    else if (args[index] === '--out') out = resolve(args[index + 1]);
    else throw new Error('Unknown option: ' + args[index]);
  }
  const bundle = buildDemo({ evidenceRoot });
  writeFileSync(out, serializeBundle(bundle), 'utf8');
  console.log(JSON.stringify({ output: out, artifacts: Object.keys(bundle.artifacts).length, requests: bundle.runtime.requests.length,
    snapshots: Object.keys(bundle.snapshots), sha256: sha256(readFileSync(out)) }, null, 2));
}
