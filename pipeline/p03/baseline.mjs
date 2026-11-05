// Baseline-only feasibility; never changes candidate flags or opens mutation gates.
import { SOURCE_PIN, CONFIG_PIN, ensure, sha256 } from './preparation.mjs';
export const LABEL = 'code-graphrag.p03-baseline';
export const JAVA_IMAGE = 'sha256:afed130922b1df5f31b8711f47caa7fa853273f40bc8ba03e72c12f82ede7779';
export const PYTHON_IMAGE = 'sha256:da047cb8f9d1d98e5c070f5300ba9f7274e33b8fc0e5be5ed88740aed1b95ba9';
export const CANDIDATE_HASH = 'c52f085be74406e542de93db7f6d70b2fc3fe60f215ae47bd45df5b1cc5cec92';
export const FIXTURE_HASH = '52172f64187d29461a754a7535bb5ec14f7a9ac0141e9e35e89f99848df1cc21';
export const AUTHORIZATION = 'benchmark/p03/decisions/SELECTION_BASELINE_2026-10-28.json';

export function validateAuthorization(decision, candidate, fixtureBytes) {
  ensure(decision.decision_id === 'D18' && decision.decision_maker === 'Huy' && decision.candidate_selected === true &&
    decision.baseline_sandbox_authorized === true && decision.baseline_build_authorized === true && decision.offline_runner_authorized === true,
    'Missing actual selection/baseline authorization');
  ensure(decision.candidate_manifest_sha256 === CANDIDATE_HASH && candidate.manifest_sha256 === CANDIDATE_HASH &&
    decision.fixture_sha256 === FIXTURE_HASH && sha256(fixtureBytes) === FIXTURE_HASH, 'Different selected candidate or fixture bytes');
  ensure(decision.source_commit === SOURCE_PIN && decision.config_commit === CONFIG_PIN && decision.baseline_repetitions === 2,
    'Unexpected source/config/repetitions');
  for (const flag of ['mutated_build_authorized', 'mutated_runtime_authorized', 'input_locked',
    'draft_annotation_authorized', 'model_calls_authorized', 'official_scoring_authorized', 'github_push_authorized'])
    ensure(decision[flag] === false, 'This baseline runner cannot apply wider rights: ' + flag);
  return true;
}

export function baselinePlan(runId, candidate) {
  ensure(/^[a-z0-9-]+$/.test(runId), 'Unsafe run ID');
  return { schema: 'p03-baseline-plan/1', run_id: runId, source_commit: SOURCE_PIN, config_commit: CONFIG_PIN,
    candidate_manifest_sha256: candidate.manifest_sha256, fixture_sha256: FIXTURE_HASH,
    java_image: JAVA_IMAGE, python_image: PYTHON_IMAGE,
    groups: [1, 2].map(repetition => ({ id: 'baseline-r' + repetition, snapshot: 'baseline', repetition,
      owner: runId + ':baseline-r' + repetition, prefix: 'p03b-' + runId + '-r' + repetition })),
    fixture_slots_per_group: 12, planned_fixture_slots: 24, fixture_post_requests: 2, fixture_put_requests: 2,
    additional_empty_owner_setup_posts: 2, additional_write_readbacks: 4, additional_setup_readbacks: 2,
    scope: 'Unmodified source only; two fresh stacks/DBs; no baseline/mutated comparison',
    input_locked: false, independently_confirmed: false, labels_created: false, model_calls: 0 };
}

export function requireOwned(resource, owner, labels) {
  ensure(resource.name.startsWith('p03b-') && resource.owner === owner && labels?.[LABEL] === owner,
    'Refuse cleanup of resource outside this P03 baseline run');
  return true;
}

export function relabelArguments(args, owner) {
  ensure(args.includes('--pull') && args[args.indexOf('--pull') + 1] === 'never' &&
    !args.some(arg => ['--publish', '-p', '--privileged'].includes(arg)), 'Unsafe shared container options');
  const result = args.map(arg => arg.startsWith('code-graphrag.p02-runtime=') ? LABEL + '=' + owner : arg);
  ensure(result.includes(LABEL + '=' + owner) && !result.some(arg => arg.startsWith('code-graphrag.p02-runtime=')), 'Missing P03 ownership');
  return result;
}
