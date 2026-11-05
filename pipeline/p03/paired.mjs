import { SOURCE_PIN, CONFIG_PIN, OWNER_RESOURCE, ensure, sha256, canonical } from './preparation.mjs';
import { CANDIDATE_HASH, JAVA_IMAGE, PYTHON_IMAGE } from './baseline.mjs';
export { JAVA_IMAGE, PYTHON_IMAGE };
export const AUTHORIZATION = 'benchmark/p03/decisions/INPUT_LOCK_2026-10-31.json';
export const LABEL = 'code-graphrag.p03-paired';
export const PROPOSAL_HASH = '42890b8d248f053849ca6f611ef4db16b5043d05bd707997a21ab6cb64d46883';
export const ARTIFACT_HASHES = {
  'spec/scenario.candidate.v0.1.0.json': '36fc64997ed04a5fb9782231471bbd2dec5a0177c0ae0e428f2ff48457a1bed8',
  'spec/owner-response-rename.patch': '87b0083ca0b1c9a01badb94f3cf8ecdf1918a24517d91e7b2690810c8080fbc0',
  'spec/fixture.candidate.v1.json': '52172f64187d29461a754a7535bb5ec14f7a9ac0141e9e35e89f99848df1cc21',
  'spec/scope.candidate.v1.json': '8db699e76e1d6c2d340e26f5d82080c4bea08ef574c7b500146da5cc9d3c4c53',
  'draft/inventory.v1.json': '5ab81b134c0d9bed32ab4943c1b35ffc860f34d0204dbfcd825e008cb8c067a4',
  'draft/evaluation_universe.draft.v1.json': '79a3def8a58e62f376d2ff594a71831163bbbf472fa54c29fbf0defd1b7d43d7',
};
export function validatePairedAuthorization(decision, candidate, proposalBytes, artifacts) {
  ensure(decision.decision_id === 'D19' && decision.decision_maker === 'Huy' && decision.input_locked === true &&
    decision.independent_scope_confirmation_received === true && decision.offline_runner_authorized === true &&
    decision.mutated_build_authorized === true && decision.mutated_runtime_authorized === true &&
    decision.paired_sandbox_runtime_authorized === true && decision.writes_limited_to_disposable_customers_fixture === true, 'Missing D19 paired/input rights');
  ensure(decision.proposal_sha256 === PROPOSAL_HASH && sha256(proposalBytes) === PROPOSAL_HASH &&
    decision.source_commit === SOURCE_PIN && decision.config_commit === CONFIG_PIN &&
    decision.candidate_manifest_sha256 === CANDIDATE_HASH && candidate.manifest_sha256 === CANDIDATE_HASH &&
    decision.baseline_repetitions === 2 && decision.mutated_repetitions === 2, 'Changed P03 proposal/input/repetitions');
  ensure(canonical(Object.fromEntries(decision.artifacts.map(r => [r.path, r.sha256]))) === canonical(ARTIFACT_HASHES), 'Lock differs from six reviewed artifacts');
  for (const [name, expected] of Object.entries(ARTIFACT_HASHES)) ensure(artifacts[name] && sha256(artifacts[name]) === expected, 'Changed locked artifact: ' + name);
  for (const flag of ['downloads_authorized', 'draft_annotation_authorized', 'evaluated_method_outputs_authorized', 'model_calls_authorized',
    'ground_truth_accepted', 'final_test_locked', 'official_scoring_authorized', 'github_push_authorized']) ensure(decision[flag] === false, 'Out-of-scope right: ' + flag);
  return true;
}
export function pairedPlan(id) {
  ensure(/^[a-z0-9-]+$/.test(id), 'Unsafe run ID');
  return { schema: 'p03-paired-plan/1', measurement_version: 2, readiness_policy: 'lifecycle_health_and_registry_not_business_response',
    run_id: id, authorization: AUTHORIZATION, candidate_manifest_sha256: CANDIDATE_HASH,
    java_image: JAVA_IMAGE, python_image: PYTHON_IMAGE, logical_scope: 'source/contract/runtime evidence only, no impact annotations',
    groups: [1, 2].flatMap(repetition => ['baseline', 'mutated'].map(snapshot => {
      const group = snapshot + '-r' + repetition;
      return { id: group, snapshot, repetition, owner: id + ':' + group, prefix: 'p03p-' + id + '-' + group };
    })), fixture_slots_per_group: 12, planned_fixture_slots: 48, empty_setup_posts: 4, fixture_posts: 4, fixture_puts: 4,
    additional_write_readbacks: 8, input_locked: true, labels_created: false, model_calls: 0 };
}
export function requirePairedOwned(resource, owner, labels) {
  ensure(resource.name.startsWith('p03p-') && resource.owner === owner && labels?.[LABEL] === owner, 'Refuse foreign resource cleanup');
}
export function pairedArguments(args, owner) {
  ensure(args.includes('--pull') && args[args.indexOf('--pull') + 1] === 'never' && !args.some(a => ['--publish', '-p', '--privileged'].includes(a)), 'Unsafe container options');
  const output = args.map(a => a.startsWith('code-graphrag.p02-runtime=') ? LABEL + '=' + owner : a);
  ensure(output.includes(LABEL + '=' + owner), 'Missing paired ownership'); return output;
}
export function validateSourceDelta(before, after) {
  const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => before[key] !== after[key]).sort();
  ensure(canonical(changed) === canonical([OWNER_RESOURCE]), 'Only registered Customers handler file may change');
  return changed;
}
