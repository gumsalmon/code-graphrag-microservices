// Consistency checks for draft documents/toy examples only. Not imported by a runtime, validator or scorer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const readJson = async name => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
const design = await readJson('impact-output.v0.1.draft.json');
const examples = await readJson('examples/impact-output.synthetic.json');
const completed = examples.examples.find(item => item.execution.status === 'completed');
const registry = new Map(examples.registry.map(item => [item.level + ':' + item.entity_id, item]));
const methods = new Map(examples.registry.filter(item => item.level === 'method').map(item => [item.entity_id, item]));
const evidence = new Map(examples.synthetic_evidence.map(item => [item.id, item]));
const clone = value => structuredClone(value);
function citations(items, allowEmpty = false) {
  assert.ok(Array.isArray(items) && items.length >= (allowEmpty ? 0 : 1) && items.length <= design.proposed_citation_policy.max_per_record, 'citation count');
  for (const item of items) {
    assert.deepEqual(Object.keys(item).sort(), ['evidence_id', 'quote']);
    assert.ok(typeof item.quote === 'string' && item.quote.trim().length >= design.proposed_citation_policy.quote_min_non_whitespace_length &&
      item.quote.length <= design.proposed_citation_policy.quote_max_length, 'quote length');
    assert.ok(evidence.has(item.evidence_id) && evidence.get(item.evidence_id).text.includes(item.quote), 'exact toy evidence/quote');
  }
}
function record(item) {
  assert.deepEqual(Object.keys(item).sort(), [...design.proposed_payload.assessment_fields].sort());
  assert.ok(design.proposed_payload.levels.includes(item.level), 'level');
  const entity = registry.get(item.level + ':' + item.entity_id); assert.ok(entity && !entity.seed, 'registered level/ID, non-seed');
  for (const field of ['dependency_status', 'behavioral_impact', 'requires_code_change']) assert.ok(design.proposed_payload[field].includes(item[field]), field);
  assert.ok(Array.isArray(item.assumptions) && item.assumptions.every(value => typeof value === 'string' && value.trim().length > 0));
  assert.ok(typeof item.rationale === 'string' && item.rationale.trim().length > 0);
  if (['required', 'optional'].includes(item.requires_code_change)) assert.equal(item.repair_strategy_id, 'toy-request-registered-repair');
  if (item.requires_code_change === 'unknown') assert.equal(item.repair_strategy_id, null);
  if (item.dependency_status === 'reachable') {
    assert.ok(Array.isArray(item.dependency_path) && item.dependency_path.length >= 2 && item.dependency_path.length <= 4, 'method witness length');
    assert.equal(new Set(item.dependency_path).size, item.dependency_path.length, 'unique path methods');
    assert.ok(item.dependency_path.every(id => methods.has(id)), 'path uses Method IDs only');
    assert.equal(methods.get(item.dependency_path.at(-1)).seed, true, 'path ends at seed method');
    if (item.level === 'method') assert.equal(item.dependency_path[0], item.entity_id, 'Method anchor');
    if (item.level === 'api') assert.equal(item.dependency_path[0], entity.handler_id, 'registered API handler anchor');
    if (item.level === 'service') assert.equal(methods.get(item.dependency_path[0]).service, entity.service, 'owning service anchor');
    let boundaries = 0;
    for (let index = 0; index < item.dependency_path.length - 1; index++) {
      const caller = item.dependency_path[index], callee = item.dependency_path[index + 1];
      assert.ok(examples.synthetic_call_edges.some(edge => edge.caller === caller && edge.callee === callee && ['CALLS', 'INVOKES_API'].includes(edge.type)), 'toy logical edge');
      boundaries += Number(methods.get(caller).service !== methods.get(callee).service);
    }
    assert.equal(item.logical_hops, item.dependency_path.length - 1); assert.equal(item.service_boundary_crossings, boundaries);
  } else {
    assert.deepEqual(item.dependency_path, []); assert.equal(item.logical_hops, null); assert.equal(item.service_boundary_crossings, null);
  }
  const pure = item.dependency_status === 'unknown' && item.behavioral_impact === 'unknown' && item.requires_code_change === 'unknown' && item.repair_strategy_id === null;
  citations(item.citations, pure);
}
function payload(value) {
  assert.deepEqual(Object.keys(value).sort(), [...design.proposed_payload.fields].sort());
  assert.ok(value.summary.text.trim()); citations(value.summary.citations);
  const seen = new Set();
  for (const item of value.assessments) { record(item); const key = item.level + ':' + item.entity_id; assert.ok(!seen.has(key), 'duplicate canonical record'); seen.add(key); }
  assert.ok(Array.isArray(value.uncertainties) && value.uncertainties.every(item => typeof item === 'string' && item.trim()));
}

test('contract remains draft/unapplied with no synthetic adoption, scorer authorization or automatic projection', () => {
  assert.equal(design.status, 'draft_for_team_discussion'); assert.equal(design.applied, false); assert.equal(design.official_scoring_authorized, false);
  assert.ok(Object.values(design.adoption_approvals).every(value => value === null));
  assert.ok(design.open_decisions.length === 8 && design.open_decisions.every(item => item.status === 'open'));
  assert.equal(design.proposed_score_boundary.current_scorer_accepts_candidate_payload, false);
  for (const name of ['automatic_method_to_api', 'automatic_method_to_service', 'automatic_api_to_service']) assert.equal(design.proposed_projection_policy[name], false);
});
test('all example identities/evidence are explicitly synthetic, non-P01/P02 and unusable as a real run', () => {
  assert.equal(examples.contract_id, design.contract_id); assert.equal(examples.synthetic_only, true); assert.equal(examples.usable_for_runtime_or_scoring, false);
  assert.equal(examples.scenario_id, 'TOY-FORMAT-ONLY');
  assert.ok(examples.registry.every(item => item.entity_id.startsWith('toy-repository@toy-baseline::')));
  assert.ok(Object.values(examples.bindings).every(value => value === null));
  assert.ok(examples.synthetic_evidence.every(item => item.source_sha256 === null && item.kind.startsWith('synthetic_')));
  for (const example of examples.examples) {
    assert.equal(example.synthetic_only, true); assert.equal(example.execution.actual_remote_calls, 0);
    assert.equal(example.validation.semantic_correctness_verified, false); assert.equal(example.validation.ground_truth_accepted, false);
    assert.equal(example.validation.official_scoring_authorized, false);
  }
});
test('mixed toy payload is internally consistent across all three levels and exact supplied quotes', () => {
  payload(completed.payload);
  assert.deepEqual([...new Set(completed.payload.assessments.map(item => item.level))].sort(), ['api', 'method', 'service']);
  assert.deepEqual([...new Set(completed.payload.assessments.map(item => item.behavioral_impact))].sort(), ['likely', 'unknown', 'unlikely']);
});
test('API witness is Method-based and does not count containment/API binding as another hop', () => {
  const api = clone(completed.payload.assessments.find(item => item.level === 'api')); record(api); assert.equal(api.logical_hops, 2);
  api.logical_hops = 3; assert.throws(() => record(api));
  api.logical_hops = 2; api.dependency_path[0] = api.entity_id; assert.throws(() => record(api), /Method IDs/);
});
test('pure abstention alone may omit citations in all 36 dependency/behavior/repair combinations', () => {
  const original = completed.payload.assessments.find(item => item.level === 'method' && item.dependency_status === 'reachable');
  for (const dependency of design.proposed_payload.dependency_status) for (const behavior of design.proposed_payload.behavioral_impact)
    for (const repair of design.proposed_payload.requires_code_change) {
      const item = clone(original); item.dependency_status = dependency; item.behavioral_impact = behavior; item.requires_code_change = repair; item.citations = [];
      item.repair_strategy_id = ['required', 'optional'].includes(repair) ? 'toy-request-registered-repair' : null;
      if (dependency !== 'reachable') { item.dependency_path = []; item.logical_hops = null; item.service_boundary_crossings = null; }
      const pure = dependency === 'unknown' && behavior === 'unknown' && repair === 'unknown';
      if (pure) assert.doesNotThrow(() => record(item)); else assert.throws(() => record(item), /citation count/);
    }
});
test('unknown does not bypass bad evidence, zero-for-null counts, wrong overload, seed or duplicate IDs', () => {
  const pure = completed.payload.assessments.find(item => item.level === 'service');
  for (const mutate of [value => { value.citations = [{ evidence_id: 'TOY-MISSING', quote: 'unknown quote text' }]; },
    value => { value.citations = [{ evidence_id: 'TOY-E01', quote: 'invented absent text' }]; }, value => { value.logical_hops = 0; },
    value => { value.entity_id = 'toy-repository@toy-baseline::provider'; }, value => { value.rationale = ' '; }]) {
    const item = clone(pure); mutate(item); assert.throws(() => record(item));
  }
  const changed = clone(completed.payload); changed.assessments[0].entity_id = changed.assessments[0].entity_id.replace('(int)', '(String)');
  assert.throws(() => payload(changed), /registered/);
  const repeated = clone(completed.payload); repeated.assessments.push(clone(repeated.assessments[0])); assert.throws(() => payload(repeated), /duplicate/);
});
test('failure has no payload and unknown usage is null, never a successful empty assessment set', () => {
  const failed = examples.examples.find(item => item.execution.status === 'failed');
  assert.equal(failed.payload, null); assert.equal(failed.execution.usage, null); assert.equal(failed.validation.status, 'not_checked');
  assert.ok(failed.execution.failure.code.startsWith('SYNTHETIC_'));
  assert.equal(design.proposed_run_envelope.failed_run_is_successful_empty_prediction, false);
});
test('candidate score mapping retains unknown=null, omitted IDs and unsupported levels without negative projection', () => {
  assert.deepEqual(design.proposed_score_boundary.behavior_to_boolean_candidate, { likely: true, unlikely: false, unknown: null });
  assert.equal(design.proposed_payload.unknown_is_negative, false); assert.equal(design.proposed_payload.not_returned_is_negative, false);
  assert.equal(design.proposed_score_boundary.abstained_gold_positive_excluded_from_recall_denominator, false);
  const returned = new Set(completed.payload.assessments.map(item => item.level + ':' + item.entity_id));
  const omitted = examples.registry.filter(item => !item.seed && !returned.has(item.level + ':' + item.entity_id));
  assert.equal(omitted.length, 1); assert.equal(omitted[0].level, 'method');
  assert.equal(design.proposed_score_boundary.status, 'proposal_not_implemented_or_approved');
});
