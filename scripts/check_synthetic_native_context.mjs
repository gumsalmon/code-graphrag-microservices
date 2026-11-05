// Replay coordinator-run synthetic Java output through the isolated context adapter.
// Fixed software fixture profile, never a PetClinic or journal experiment entry point.
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { selectNativeSynthetic } from '../prototypes/context-selection/native-bridge.mjs';
import { selectionOptions } from '../prototypes/context-selection/fixtures.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function bounded(file) {
  if ((await stat(file)).size > 1_048_576) throw new Error('SYNTHETIC_FILE_SIZE');
  const bytes = await readFile(file);
  return { bytes, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
}
const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
async function main() {
  if (process.argv.length !== 4 || process.argv[2] !== '--run') throw new Error('Usage: node scripts/check_synthetic_native_context.mjs --run SYNTHETIC_RUN_DIRECTORY');
  const root = path.resolve(process.argv[3]);
  const sourceReport = await bounded(path.join(root, 'REPORT.json')), report = JSON.parse(sourceReport.text);
  if (report.schema !== 'java-parser-synthetic-diagnostics/1' || !Array.isArray(report.cases) ||
    report.cases.length !== 10 || !/^[a-f0-9]{64}$/.test(report.implementation_parser_sha256)) throw new Error('SYNTHETIC_RUN_PROFILE');
  const records = [], visited = new Set();
  for (const row of report.cases) {
    if (!/^S(0[1-9]|10)$/.test(row.id) || visited.has(row.id)) throw new Error('SYNTHETIC_CASE_ID');
    visited.add(row.id);
    for (const variant of row.id === 'S09' ? ['lf', 'crlf'] : ['lf']) {
      const nativeFile = row.id + '/' + variant + '.graph.json', raw = await bounded(path.join(root, nativeFile)), graph = JSON.parse(raw.text);
      if (graph.metadata?.repository !== 'synthetic://java-rest-regression' || !Array.isArray(graph.nodes) || !Array.isArray(graph.endpoints)) throw new Error('SYNTHETIC_GRAPH_REQUIRED');
      const sources = [];
      for (const node of graph.nodes) {
        if (!/^[a-z][a-z0-9-]*$/.test(node.service) || !/^[A-Za-z_$][\w.$]*$/.test(node.class_fqn)) throw new Error('SYNTHETIC_BINDING_ID');
        const folder = path.join(root, row.id, variant, node.service), matches = [];
        for (const entry of await readdir(folder, { withFileTypes: true })) {
          if (!entry.isFile() || !entry.name.endsWith('.java')) continue;
          const file = path.join(folder, entry.name), data = await bounded(file);
          if (new RegExp('\\b(?:class|record)\\s+' + escaped(node.class_fqn.split('.').at(-1)) + '\\b').test(data.text)) matches.push({ file, data });
        }
        if (matches.length !== 1) throw new Error('SYNTHETIC_CLASS_BINDING_NOT_UNIQUE');
        sources.push({ native_method_id: node.id, fixture_file: path.relative(root, matches[0].file).split(path.sep).join('/'), text: matches[0].data.text });
      }
      // Every fixture has one declared endpoint. This software replay uses that endpoint as
      // its explicit anchor; it does not infer a callee missing from the parser's filtered nodes.
      if (graph.endpoints.length !== 1) throw new Error('SYNTHETIC_SEED_NOT_UNIQUE');
      const seed = graph.endpoints[0].handler_id;
      const query = 'WebClient read records query parameter';
      const request = { synthetic_only: true, native_graph: graph, sources, seed_native_id: seed, query };
      const selections = {};
      for (const mode of ['lexical', 'graph', 'combined']) {
        const r = selectNativeSynthetic(request, selectionOptions(mode));
        if (r.selection.status !== 'context_ready') throw new Error('SYNTHETIC_CONTEXT_NOT_READY');
        selections[mode] = r.selection;
      }
      const r = selectNativeSynthetic(request, selectionOptions('graph'));
      const unrepresented = [], boundFiles = new Set(sources.map(source => source.fixture_file));
      for (const folder of await readdir(path.join(root, row.id, variant), { withFileTypes: true })) {
        if (!folder.isDirectory()) continue;
        for (const entry of await readdir(path.join(root, row.id, variant, folder.name), { withFileTypes: true })) {
          if (!entry.isFile() || !entry.name.endsWith('.java')) continue;
          const relative = [row.id, variant, folder.name, entry.name].join('/');
          if (!boundFiles.has(relative)) {
            const data = await bounded(path.join(root, relative));
            unrepresented.push({ fixture_file: relative, source_utf8_sha256: hash(data.bytes), reason: 'no emitted native Method binding; not negative, unsupported or complete inventory proof' });
          }
        }
      }
      records.push({ case_id: row.id, variant, native_file: nativeFile, native_file_sha256: hash(raw.bytes),
        seed_native_id: seed, seed_basis: 'unique synthetic endpoint software anchor, not a validated real seed-finding method',
        bindings: r.bindings, native_endpoint_metadata: r.native_endpoint_metadata, native_edge_metadata: r.native_edge_metadata,
        unresolved: r.unresolved, unrepresented_fixture_sources: unrepresented, selections });
    }
  }
  console.log(JSON.stringify({ document_kind: 'native_parser_to_context_synthetic_replay_not_project_prediction',
    synthetic_only: true, adopted_for_real_runs: false, report_file_sha256: hash(sourceReport.bytes),
    parser_working_bytes_sha256: report.implementation_parser_sha256, source_case_assertion_result_reused_as_truth: false,
    cases: visited.size, graph_variants: records.length, selection_runs: records.length * 3, records,
    neo4j_runtime: false, actual_remote_calls: 0, impact_assessments: null, quality_metrics: null,
    real_git_lineage_verified: false, ground_truth_accepted: false, official_scoring_authorized: false }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
