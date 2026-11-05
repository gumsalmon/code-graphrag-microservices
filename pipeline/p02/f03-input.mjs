// Read-only adapter: frozen preparation plus a separate, explicit human decision.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { verifyP02Revision, sha256, SCENARIO, UNIVERSE, V1, PINNED_ARTIFACTS } from '../../scripts/verify_p02_revision.mjs';
import { validateRequestMatrix } from './paired-plan.mjs';
const check = (ok, message) => { if (!ok) throw new Error(message); };
export const LOCK_PATH = 'benchmark/p02/decisions/INPUT_LOCK_2026-10-24.json';
export const EXPECTED = Object.freeze({
  decision_id: 'P02-G2-F03-2026-10-24', phat_recheck_commit: '187c4d82fb75c07d6593522dd68bc1dfdd86ceca',
  scenario_sha256: '762d993901f1388584adf066f396acd2ad46a7550f1f6b0b12dd6a8c61663ce9',
  universe_sha256: 'd79c07727d6fb5348503f0e4079a0d18c63e26e6d34a1e332825f1cc7680aeb5',
  candidate_manifest_sha256: '0358bf86bee591254483e50018f8d601932a8821a323176eaa10a80b86229539'
});
export function validateAuthorization(decision, bindings) {
  check(decision.schema === 'p02-input-lock-and-runtime-authorization/1' && decision.authorized_by === 'Huy', 'Missing explicit coordinator decision');
  for (const [key, value] of Object.entries(EXPECTED)) check(decision[key] === value, 'Wrong decision/review/input pin: ' + key);
  for (const [key, value] of Object.entries(bindings)) check(decision[key] === value, 'Decision does not bind input bytes: ' + key);
  check(decision.scenario_version === '0.1.1' && decision.universe_version === 'draft.v2' && decision.fixture_version === 'v1' &&
    decision.split_intent === 'development', 'Wrong authorized scenario/split');
  for (const key of ['input_locked_for_f03', 'adapter_and_offline_tests_authorized', 'runtime_evidence_authorized']) check(decision[key] === true, 'F03 is not authorized: ' + key);
  for (const key of ['label_creation_authorized', 'ground_truth_accepted', 'locked_for_labeling', 'final_test_locked', 'official_scoring_authorized',
    'model_calls_authorized', 'github_push_authorized', 'original_frozen_inputs_may_be_modified']) check(decision[key] === false, 'Out-of-scope gate: ' + key);
  return true;
}
export async function readF03Inputs(candidateDirectory, projectRoot) {
  const candidate = await verifyP02Revision(candidateDirectory), root = resolve(candidate.directory);
  const bytes = async name => readFile(resolve(root, name));
  const decisionBytes = await readFile(resolve(projectRoot, LOCK_PATH)), decision = JSON.parse(decisionBytes);
  const fixtureBytes = await bytes(V1 + 'fixture.json'), scenarioBytes = await bytes(SCENARIO), matrixBytes = await bytes('draft/request-plan.v1.json');
  const fixture = JSON.parse(fixtureBytes), scenario = JSON.parse(scenarioBytes), matrix = JSON.parse(matrixBytes);
  const bindings = { scenario_sha256: sha256(scenarioBytes), universe_sha256: candidate.universe_sha256,
    fixture_sha256: sha256(fixtureBytes), patch_sha256: PINNED_ARTIFACTS[V1 + 'optional-query.patch'],
    inventory_sha256: candidate.inventory_sha256, request_plan_sha256: sha256(matrixBytes), candidate_manifest_sha256: candidate.manifest_sha256,
    source_commit: scenario.baseline_commit, config_commit: '323993ce2519c6d02df63e08bf4458d123d3b611' };
  validateAuthorization(decision, bindings);
  return { candidate, root, decision, decision_sha256: sha256(decisionBytes), bindings, scenario, fixture, matrix,
    counts: validateRequestMatrix(fixture, matrix), fixture_path: resolve(root, V1 + 'fixture.json') };
}
export function groupsForF03(inputs, runId) {
  check(/^[a-z0-9][a-z0-9-]{2,48}$/.test(runId), 'Invalid F03 resource namespace');
  return ['baseline', 'mutated'].flatMap(snapshot => [1, 2].map(repetition => {
    const id = snapshot + '-r' + repetition;
    return { id, snapshot, repetition, owner: runId + ':' + id, prefix: 'p02f03-' + runId + '-' + id,
      requests: inputs.matrix.cases.filter(row => row.snapshot === snapshot && row.repetition === repetition),
      network_internal: true, host_ports: [], fresh_database: true, post_last: true };
  }));
}
