// Existing synthetic discussion example only. No source repository, output, label or credential reads.
import toy from '../../docs/contracts/examples/impact-output.synthetic.json' with { type: 'json' };

export function syntheticFixture(name = 'mixed') {
  const request = {
    synthetic_only: true, contract_id: toy.contract_id, repository_id: toy.repository_id, snapshot_id: toy.snapshot_id,
    seed_method_id: toy.registry.find(entity => entity.level === 'method' && entity.seed).entity_id,
    requested_levels: ['method', 'api', 'service'], supported_levels: ['method', 'api', 'service'],
    registry: toy.registry.map(entity => ({ ...entity, in_universe: !entity.seed })), aliases: [],
    evidence: toy.synthetic_evidence.map(item => ({ id: item.id, snapshot_id: toy.snapshot_id, text: item.text })),
    repair_strategy_ids: ['toy-request-registered-repair'],
    path_validation: { kind: 'supplied_graph', logical_edges: structuredClone(toy.synthetic_call_edges) },
  };
  const example = toy.examples.find(item => item.execution.status === (name === 'failure' ? 'failed' : 'completed'));
  const attempt = { synthetic_only: true, execution: structuredClone(example.execution), payload: structuredClone(example.payload) };
  if (name === 'invalid') attempt.payload.assessments[0].citations[0].quote = 'invented absent source quote';
  else if (name === 'source-inferred') request.path_validation = { kind: 'source_inferred', logical_edges: [] };
  else if (!['mixed', 'failure'].includes(name)) throw new Error('Unknown synthetic fixture.');
  return { request, attempt };
}
