// Read-only independent reconstruction. No API, labels, Docker or source edits.
import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import core from '../demo/p01/reasoning-core.js';
import { parseDataAsset } from './run_p01_reasoning.mjs';
import { retrievalInput } from '../reasoning/p01/retrieval-context.mjs';
import { contextFromFreshGraph, preparePair } from '../pipeline/p01/context.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'handoff-out/p01-pipeline');
const check = (ok, message) => { if (!ok) throw new Error(message); };
export async function verifyPipeline(path) {
  const directory = resolve(path);
  check(directory.startsWith(OUTPUT + sep), 'Run must be inside private pipeline output root');
  check((await realpath(directory)).startsWith(await realpath(OUTPUT) + sep), 'Run resolves outside pipeline root');
  const json = async name => JSON.parse(await readFile(resolve(directory, name), 'utf8'));
  const seen = new Set();
  const records = (await readFile(resolve(directory, 'checksums.sha256'), 'utf8')).trim().split(/\r?\n/);
  for (const line of records) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    check(match && !seen.has(match[2]) && !match[2].includes('\\') && !match[2].split('/').some(part => !part || part === '.' || part === '..'), 'Unsafe/duplicate manifest path');
    const file = resolve(directory, match[2]);
    check(file.startsWith(directory + sep) && (await lstat(file)).isFile() && !(await lstat(file)).isSymbolicLink() && (await realpath(file)).startsWith(await realpath(directory) + sep), 'Unsafe evidence file');
    check(await core.hash(await readFile(file)) === match[1], 'Checksum mismatch: ' + match[2]);
    seen.add(match[2]);
  }
  async function inventory(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      check(!entry.isSymbolicLink(), 'Symlink evidence');
      if (entry.name === 'chroma-db' && entry.isDirectory()) continue;
      const file = resolve(dir, entry.name);
      if (entry.isDirectory()) await inventory(file);
      else if (entry.name !== 'checksums.sha256') check(seen.has(file.slice(directory.length + 1).replaceAll('\\', '/')), 'Unmanifested file');
    }
  }
  await inventory(directory);
  check(!seen.has('failure.json') && !seen.has('integrity-failure.json'), 'Failed/invalidated run retained, cannot accept');
  const result = await json('result.json'), prepared = await json('prepared.json');
  check(result.status === 'prepared_fresh_graph_and_retrieval_no_llm' && prepared.status === result.status && result.remote_llm_calls === 0 && result.labels_read === false && !result.scoring_enabled, 'Not a prepared unscored run');
  check(core.canonical(await json('code-before.json')) === core.canonical(await json('code-after.json')), 'Code/provenance changed');
  if (seen.has('cleanup.json')) {
    const cleanup = await json('cleanup.json'); check(cleanup.residual_containers === '' && cleanup.residual_networks === '', 'Owned resources remain');
  }
  const bundleBytes = await readFile(resolve(ROOT, 'demo/p01/data.js'));
  check(await core.hash(bundleBytes) === '053fe6c2caa4c7b47c8fa40d413ebd3c00ea22828c52f56fb1c902081f041689', 'Frozen input changed');
  const source = await core.buildContext(parseDataAsset(bundleBytes.toString('utf8')), { mode: 'source_only', depth: prepared.depth, byteBudget: prepared.byte_budget });
  const input = await json('input.json');
  check(core.canonical(input) === core.canonical(await retrievalInput(source, { topK: prepared.top_k })), 'Source packet differs from approved baseline');
  const patch = source.context.evidence.find(e => e.kind === 'proposed_patch').text;
  check(await readFile(resolve(directory, 'mutated/mutation.patch'), 'utf8') === patch, 'Mutation differs');
  for (const snapshot of ['baseline', 'mutated']) {
    const query = await json(snapshot + '/query-result.json');
    const environment = await json(snapshot + '/environment.json');
    const graph = await json(snapshot + '/parser-output.json');
    check(environment.labels_read === false && environment.repeat_import_idempotent === true && environment.neo4j_version === '5.26.0' && query.seed_excluded === true && query.source === 'fresh Neo4j Bolt query; not impact labels', 'Invalid graph provenance');
    check(core.canonical(query.inventory_after.methods) === core.canonical(graph.nodes.map(n => n.id).sort()), 'Graph method inventory mismatch');
    check(query.inventory_before.node_count === 0 && query.inventory_before.relationship_count === 0, 'Database was not empty');
    const neoCommand = await json(snapshot + '-neo4j-command.json');
    check(neoCommand.published_ports.length === 0 && !neoCommand.args.includes('--publish'), 'Unexpected published Neo4j ports');
    for (const item of input.sources) {
      const bytes = await readFile(resolve(directory, snapshot + '/source/' + item.file.split('/').at(-1)));
      check(await core.hash(bytes) === environment.provenance.snapshot_files[item.file.split('/').at(-1)], 'Source/hash mismatch');
      if (snapshot === 'baseline' || !item.file.endsWith('/VisitResource.java')) check(bytes.toString('utf8') === item.text, 'Baseline/consumer source changed');
    }
    const exit = await json(snapshot + '-exit.json'); check(exit.exit_code === 0 && !exit.timed_out, 'Graph process did not pass');
  }
  const sources = {};
  for (const item of input.sources) sources[item.file] = await readFile(resolve(directory, 'baseline/source/' + item.file.split('/').at(-1)), 'utf8');
  const graphText = await readFile(resolve(directory, 'baseline/parser-output.json'), 'utf8');
  const queryText = await readFile(resolve(directory, 'baseline/query-result.json'), 'utf8');
  const environmentText = await readFile(resolve(directory, 'baseline/environment.json'), 'utf8');
  const fresh = await contextFromFreshGraph({ input, patch, sources, graph: JSON.parse(graphText), query: JSON.parse(queryText), environment: JSON.parse(environmentText), graphText, queryText, environmentText }, { depth: prepared.depth, byteBudget: prepared.byte_budget });
  const pair = await preparePair(fresh, await json('retrieval/corpus.json'), await json('retrieval/retrieval.json'), { depth: prepared.depth, byteBudget: prepared.byte_budget });
  for (const [prefix, request, payload] of [['vector', pair.vector, pair.providerPlans.vector], ['graph-vector', pair.graph, pair.providerPlans.graph]]) {
    check(core.canonical(request) === core.canonical(await json(prefix + '-request.json')), 'Request cannot be reconstructed');
    check(core.canonical(payload) === core.canonical(await json(prefix + '-provider-request.json')), 'Payload differs');
  }
  check(core.canonical(pair.plan) === core.canonical(await json('experiment-plan.json')), 'Plan differs');
  const retrievalExit = await json('retrieval-exit.json'); check(retrievalExit.exit_code === 0 && !retrievalExit.timed_out, 'Retrieval failed');
  const retrievalCommand = await json('retrieval-command.json');
  check(retrievalCommand.args.includes('none') && retrievalCommand.credentials_passed === false && retrievalCommand.docker_socket_mounted === false, 'Unexpected retrieval network/credentials');
  return { directory, status: 'verified_fresh_preparation_not_ground_truth', manifest_files: seen.size,
    requests_sha256: prepared.request_sha256, context_bytes: prepared.context_bytes, remote_llm_calls: 0, scoring_enabled: false };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2); check(args.length === 2 && args[0] === '--run', 'Usage: --run PATH');
    console.log(JSON.stringify(await verifyPipeline(args[1]), null, 2));
  } catch (error) { console.error('P01 pipeline check failed: ' + error.message); process.exitCode = 1; }
}
