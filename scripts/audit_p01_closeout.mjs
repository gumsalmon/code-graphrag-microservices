// Read-only technical checks + new private audit artifact. Never approves labels or calls a model.
import { readFile, mkdir, writeFile, lstat, realpath } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import core from '../demo/p01/reasoning-core.js';
import comparison from '../demo/p01/comparison-core.js';
import { readRun } from './package_p01_comparison.mjs';
import { verifyContractPreparation } from './prepare_p01_abstention.mjs';
import { verifyPipeline } from './check_p01_pipeline.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BENCHMARK = '5f9204d66253604edf9101c2f888fc7e75aa0be7';
const LABEL_HASH = '3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce';
const check = (ok, message) => { if (!ok) throw new Error(message); };

export function validatePreparationRegister(plan) {
  const legacy = plan?.schema === 'p02-p04-preparation-register/1';
  const baseline = plan?.schema === 'p02-p04-preparation-register/3';
  check(legacy && plan.status === 'preparation_authorized_candidates_not_selected' ||
    plan?.schema === 'p02-p04-preparation-register/2' && plan.status === 'p02_selected_inputs_prepared_independent_confirmation_pending' ||
    baseline && plan.status === 'p02_baseline_verified_universe_confirmation_pending', 'Not a preparation register');
  check(plan.gates?.batch_review_allowed === true && plan.gates.independent_human_review_required === true &&
    plan.gates.official_scoring_authorized === false && plan.gates.final_test_locked === false &&
    plan.gates.labels_may_be_derived_from_system_outputs === false, 'Preparation cannot approve labels/test/scoring');
  check(plan.roles?.independent_reviewer === null && plan.roles.new_task_acknowledgements_received === false, 'Do not invent reviewer or task acceptance');
  check(plan.batch_review?.reviewer_confirmation_received === false && plan.batch_review.accepted_scenarios.length === 0 &&
    plan.batch_review.review_decisions.length === 0, 'Batch review has not occurred');
  const primaries = plan.candidates.filter(item => ['proposed_primary', 'selected_for_preparation'].includes(item.selection_decision));
  check(core.canonical(primaries.map(item => item.planned_scenario_id).sort()) === core.canonical(['P02', 'P03', 'P04']), 'Need one proposed primary per planned case');
  check(new Set(plan.candidates.map(item => item.candidate_id)).size === plan.candidates.length, 'Duplicate candidate ID');
  for (const item of plan.candidates) check(/^[a-f0-9]{40}$/.test(item.candidate_commit) && typeof item.selection_reason === 'string' && item.selection_reason.length > 10, 'Missing source pin/reason');
  for (const item of primaries) {
    check(item.source_inspected === true && item.split_intent === 'development' && item.runtime_status === (baseline && item.planned_scenario_id === 'P02' ? 'baseline_verified' : 'not_started') &&
      item.evaluation_universe_sha256 === null && item.label_sha256 === null && item.review_status === 'pending_review', 'Do not promote a candidate into runtime/labels/test');
    if (!legacy && item.planned_scenario_id === 'P02') {
      check(item.selection_decision === 'selected_for_preparation' && item.selected_by === 'Huy' && /^\d{4}-\d{2}-\d{2}$/.test(item.selected_at) &&
        [item.patch_sha256, item.fixture_sha256, item.evaluation_universe_draft_sha256].every(sha => /^[a-f0-9]{64}$/.test(sha)) &&
        item.independent_inventory_confirmation_received === false && item.baseline_feasibility_verified_for_p02 === baseline, 'P02 preparation cannot fabricate independent confirmation or baseline runtime');
      if (baseline) check(item.baseline_evidence?.source_commit === item.candidate_commit && item.baseline_evidence.config_commit === '323993ce2519c6d02df63e08bf4458d123d3b611' &&
        [item.baseline_evidence.result_sha256, item.baseline_evidence.manifest_sha256].every(sha => /^[a-f0-9]{64}$/.test(sha)) &&
        item.baseline_evidence.fixture_get_observations === 9 && item.baseline_evidence.full_matrix_executed === false &&
        item.baseline_evidence.mutated_executed === false && item.baseline_evidence.post_executed === false, 'Baseline-only metadata cannot approve mutation or full matrix');
    } else check(item.selection_decision === 'proposed_primary' && item.patch_sha256 === null && item.selected_at === null, 'Unselected candidate cannot acquire patch or approval');
    check(typeof item.duplicate_group === 'string' && item.duplicate_group.length > 10, 'Missing duplicate group');
  }
  check(primaries.find(item => item.planned_scenario_id === 'P02').related_scenarios.includes('P01'), 'P02 must disclose overlap with P01');
  check(plan.held_out_test?.status === 'not_selected_not_locked' && plan.held_out_test.must_not_reuse_debugged_scenarios_as_unseen === true,
    'Development must not become unseen test');
  return { status: 'valid_preparation_plan_not_approved_benchmark',
    proposed_scenarios: primaries.filter(item => item.selection_decision === 'proposed_primary').map(item => item.planned_scenario_id),
    selected_for_preparation: primaries.filter(item => item.selection_decision === 'selected_for_preparation').map(item => item.planned_scenario_id), official_scoring: false };
}

export function closureStatus(inspection) {
  const paired = inspection.both_structurally_valid === true;
  return { technical_handoff_integrity_verified: true, paired_inference_complete: paired,
    status: paired ? 'technical_handoff_ready_independent_review_pending' : 'technical_handoff_ready_provider_or_prediction_item_open',
    full_research_complete: false, ground_truth_accepted_by_this_audit: false, official_scoring_authorized: false,
    open_items: [...(paired ? [] : ['paired_inference_not_complete']), 'independent_label_review', 'final_test_and_scoring_separate_approval', 'remote_publication_not_verified'] };
}

export async function auditCloseout({ comparisonFile, contractRun, pipelineRun }) {
  const path = resolve(comparisonFile);
  const privateRoot = resolve(ROOT, 'handoff-out/p01-comparison');
  check(path.startsWith(privateRoot + sep) && (await realpath(path)).startsWith(await realpath(privateRoot) + sep) &&
    (await lstat(path)).isFile() && !(await lstat(path)).isSymbolicLink(), 'Comparison must be a regular file in private comparison root');
  const bytes = await readFile(path); const bundle = JSON.parse(bytes.toString('utf8'));
  const inspection = await comparison.inspectPair(bundle);
  const runDetails = {};
  for (const [key, entry] of Object.entries(bundle.entries)) {
    check(/^[a-zA-Z0-9-]+$/.test(entry.run.run_id), 'Unsafe run ID');
    const original = await readRun(resolve(ROOT, 'handoff-out/p01-reasoning', entry.run.run_id));
    check(core.canonical(original) === core.canonical(entry), 'Comparison differs from original run');
    runDetails[key] = { run_id: entry.run.run_id, status: inspection.outcomes[key].status,
      artifact_files: Object.keys(original.artifact_checksums).length, request_sha256: entry.request.request_sha256 };
  }
  const contract = await verifyContractPreparation(contractRun);
  check(bundle.entries.vector.request.request_sha256 === contract.request_sha256.vector &&
    bundle.entries.graph_vector.request.request_sha256 === contract.request_sha256.graph_vector, 'Comparison is not the specified contract pair');
  const pipeline = await verifyPipeline(pipelineRun);
  const register = JSON.parse(await readFile(resolve(ROOT, 'tasks/P02_P04_RESEARCH_REGISTER.json'), 'utf8'));
  const preparation = validatePreparationRegister(register);
  const git = args => execFileSync('git', ['-c', 'safe.directory=' + ROOT.replaceAll('\\', '/'), ...args], { cwd: ROOT });
  // Hash bytes only; never parse/derive labels or use labels to score output.
  const labelHash = await core.hash(git(['show', BENCHMARK + ':benchmark/p01/labels.v3.json']));
  check(labelHash === LABEL_HASH, 'Frozen P01 label bytes differ');
  const review = JSON.parse(git(['show', BENCHMARK + ':benchmark/p01/review_decision.v1.json']).toString('utf8'));
  const created = new Date().toISOString();
  const result = { schema: 'p01-technical-closeout-audit/1', created_utc: created, ...closureStatus(inspection),
    comparison: { file: path, sha256: await core.hash(bytes), outcomes: runDetails }, contract, pipeline,
    pipeline_requests_match_model_requests: pipeline.requests_sha256.vector === bundle.entries.vector.request.request_sha256 &&
      pipeline.requests_sha256.graph_vector === bundle.entries.graph_vector.request.request_sha256,
    preparation,
    benchmark_snapshot: { commit: BENCHMARK, label_sha256: labelHash, decision_record: review.audit_decision,
      decision: review.decision, reviewer: review.reviewer, independent_review_verified: false },
    provenance: { git_head: git(['rev-parse', 'HEAD']).toString('utf8').trim(), git_status: git(['status', '--porcelain=v1']).toString('utf8').trim(),
      audit_script_sha256: await core.hash(await readFile(fileURLToPath(import.meta.url))), remote_publication_verified: false },
    remote_calls: 0, labels_read_for_prediction_or_scoring: false, note: 'Integrity audit; not a reviewer decision, inference, runtime rerun or official score' };
  const directory = resolve(ROOT, 'handoff-out/p01-closeout', created.replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8));
  await mkdir(directory, { recursive: true });
  const output = JSON.stringify(result, null, 2) + '\n';
  await writeFile(resolve(directory, 'audit.json'), output, { flag: 'wx' });
  await writeFile(resolve(directory, 'checksums.sha256'), await core.hash(output) + '  audit.json\n', { flag: 'wx' });
  return { directory, ...closureStatus(inspection), checks: { contract_files: contract.manifest_files,
    pipeline_files: pipeline.manifest_files, model_run_files: Object.fromEntries(Object.entries(runDetails).map(([key, value]) => [key, value.artifact_files])) }, remote_calls: 0 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2); const options = {};
    for (let i = 0; i < args.length; i += 2) {
      const name = { '--comparison-file': 'comparisonFile', '--contract-run': 'contractRun', '--pipeline-run': 'pipelineRun' }[args[i]];
      check(name && args[i + 1] && !options[name], 'Usage: --comparison-file FILE --contract-run DIR --pipeline-run DIR'); options[name] = args[i + 1];
    }
    check(options.comparisonFile && options.contractRun && options.pipelineRun, 'Three explicit inputs required');
    console.log(JSON.stringify(await auditCloseout(options), null, 2));
  } catch (error) { console.error('P01 closeout audit failed: ' + error.message); process.exitCode = 1; }
}
