// Read-only presentation helpers. This is not an impact prediction/output contract.
import { createHash } from 'node:crypto';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const PINNED_MANIFEST = 'ad7fe3ac6536a54315219a44533f73a36a016a1c1f362e4c7026134971c126d4';

export function assertAuditedRun(manifest, report) {
  if (digest(manifest) !== PINNED_MANIFEST) throw new Error('This viewer build requires the reviewed P02 run; review a new run before changing its pin');
  if (report.model_calls !== 0 || report.score_computed !== false || report.labels_or_annotation_notes_read !== false ||
      report.groups?.length !== 2 || report.fresh_database_instances !== 2) throw new Error('Wrong audit scope');
}

export function sourceSpan(sources, file, first, last) {
  const source = sources.find(row => row.file === file);
  if (!source || !Number.isInteger(first) || !Number.isInteger(last)) throw new Error('Unbound source span');
  const lines = source.text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  if (first < 1 || last < first || last > lines.length) throw new Error('Source span outside file');
  return { source, excerpt: lines.slice(first - 1, last).join('') };
}

export function validateSnapshot({ graph, retrieval, seed, sources, parity }, snapshot) {
  if (graph.metadata.snapshot_kind !== snapshot || retrieval.snapshot !== snapshot || parity.snapshot !== snapshot) throw new Error('Mixed snapshot evidence');
  if (graph.nodes.filter(node => node.id === seed).length !== 1) throw new Error('Missing/duplicate seed');
  if (retrieval.graph_reachability_only !== true || retrieval.embedding_or_model_inference !== false || retrieval.score_computed !== false) throw new Error('Not a graph-only saved result');
  const ids = new Set();
  for (const node of graph.nodes) {
    if (ids.has(node.id)) throw new Error('Duplicate Method ID');
    ids.add(node.id); sourceSpan(sources, node.file, node.line_start, node.line_end);
  }
  for (const source of sources) if (digest(Buffer.from(source.text, 'utf8')) !== source.sha256) throw new Error('Source text differs from raw bytes');
  if (JSON.stringify(retrieval.plans.map(plan => plan.depth_limit)) !== '[1,2,3]') throw new Error('Missing saved hop plans');
  for (const plan of retrieval.plans) {
    if (plan.parameters.seed !== seed || plan.not_an_impact_label !== true) throw new Error('Wrong plan seed/scope');
    for (const path of plan.paths) {
      if (!ids.has(path.id) || path.id === seed || path.witness_ids[0] !== path.id || path.witness_ids.at(-1) !== seed ||
          path.logical_hop !== path.witness_ids.length - 1 || path.logical_hop > plan.depth_limit ||
          path.relation_types.length !== path.logical_hop) throw new Error('Invalid saved witness');
      for (let i = 0; i < path.logical_hop; i++) if (!graph.edges.some(edge => edge.source_id === path.witness_ids[i] &&
          edge.target_id === path.witness_ids[i + 1] && edge.type === path.relation_types[i] && edge.resolution_status === 'RESOLVED')) throw new Error('Witness lacks native edge');
    }
    for (const chunk of plan.chunks) {
      const { source, excerpt } = sourceSpan(sources, chunk.file, chunk.line_start, chunk.line_end);
      if (source.sha256 !== chunk.source_sha256 || excerpt !== chunk.excerpt || digest(Buffer.from(excerpt)) !== chunk.excerpt_sha256) throw new Error('Retrieved source chunk differs');
    }
  }
  for (const row of graph.unresolved) sourceSpan(sources, row.file, row.line_start, row.line_end);
  return true;
}

export function embeddedScript(bundle, browserCode) {
  // Untrusted source/JSON stays in base64, never in HTML/script syntax.
  const encoded = Buffer.from(JSON.stringify(bundle), 'utf8').toString('base64');
  return "'use strict';\nconst bundle = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob('" + encoded + "'), c => c.charCodeAt(0))));\n" + browserCode;
}
