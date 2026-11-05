// Portable read-only transfer/record checks, never a human scope decision.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { verifyProjectTransfer } from './verify_project_transfer.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (ok, message) => { if (!ok) throw new Error(message); };
const CANDIDATE_HASH = 'c52f085be74406e542de93db7f6d70b2fc3fe60f215ae47bd45df5b1cc5cec92';
const BASELINE_HASH = 'bfe06ea3558f0dbf2aeae9c0b367785d9580428d3e930523b09ea1a666d696e7';
const AUTH_HASH = '1435c444fc0080b018f07e7aa9f9c7f62aee53e122f8a67be57bfd523b1019ce';
const OMITTED = ['config-server', 'discovery-server', 'customers-service', 'visits-service', 'api-gateway']
  .map(service => 'baseline-build/artifacts/' + service + '.jar').concat(['baseline-build/source.tar', 'baseline-build/config.tar']).sort();

export function validateScopeState(state, decision, omissions) {
  check(state.schema === 'p03-scope-check-packet-state/1' && state.candidate_selected_by_huy === true &&
    state.baseline_groups_completed === 2 && state.candidate_manifest_sha256 === CANDIDATE_HASH, 'Different selected baseline/candidate');
  check(decision.decision_id === 'D18' && decision.decision_maker === 'Huy' && decision.candidate_selected === true &&
    decision.candidate_manifest_sha256 === CANDIDATE_HASH && decision.mutated_runtime_authorized === false, 'Different original decision');
  for (const flag of ['independent_scope_confirmation_received', 'input_locked', 'mutated_build_performed',
    'mutated_runtime_executed', 'labels_created', 'ground_truth_accepted', 'final_test_locked', 'official_scoring_authorized',
    'evaluated_system_outputs_included', 'model_calls_authorized', 'github_push_authorized'])
    check(state[flag] === false, 'Packet cannot open research/independence gate: ' + flag);
  check(JSON.stringify(omissions.map(item => item.path).sort()) === JSON.stringify(OMITTED), 'Unexpected omission of evidence');
  return true;
}

export async function verifyScopePacket(directory, records = false) {
  const root = resolve(directory), integrity = await verifyProjectTransfer(root);
  const read = path => readFile(resolve(root, path));
  const json = async path => JSON.parse(await read(path));
  const meta = await json('META/transfer.json');
  check(meta.package_role === 'phat_p03_input_scope_check_only', 'Wrong packet purpose');
  const state = await json('CURRENT_STATE.json'), decision = await json('decisions/SELECTION_BASELINE_2026-10-28.json');
  validateScopeState(state, decision, meta.omissions);
  for (const [path, expected] of [['candidate/SHA256SUMS.txt', CANDIDATE_HASH], ['baseline/SHA256SUMS.txt', BASELINE_HASH],
    ['decisions/SELECTION_BASELINE_2026-10-28.json', AUTH_HASH]])
    check(hash(await read(path)) === expected, 'Frozen input hash differs: ' + path);
  for (const name of meta.files.map(item => item.path)) {
    check(!/\.(?:jar|class|tar|cypher)$/i.test(name) && !/(?:^|\/)labels[.\/]/i.test(name) &&
      !/(?:^|\/)(?:project_context|full_project_context[^/]*)\.md$/i.test(name), 'Forbidden unrelated/evaluated artifact');
  }
  const reports = [];
  if (records) {
    // Optional trusted local code from the frozen candidate. Never prepares a
    // new candidate, calls Git, applies a patch, or opens absolute sender paths.
    const module = await import(pathToFileURL(resolve(root, 'candidate/tooling/scripts/prepare_p03_inputs.mjs')).href);
    const candidate = await module.verifyP03Candidate(resolve(root, 'candidate'));
    check(candidate.manifest_sha256 === CANDIDATE_HASH && candidate.candidate_selected_by_huy === false && candidate.input_locked === false,
      'Frozen candidate history changed');
    const fixture = await json('candidate/spec/fixture.candidate.v1.json');
    const universe = await json('candidate/draft/evaluation_universe.draft.v1.json');
    const build = await json('baseline-build/build.json');
    check(build.source_mutated === false && build.application_tests_executed === false && build.model_calls === 0, 'Wrong build provenance');
    const plan = await json('baseline/plan.json');
    check(plan.groups.length === 2 && plan.groups.every(g => g.snapshot === 'baseline'), 'Unexpected mutated or partial plan');
    const instances = new Set();
    for (const group of plan.groups) {
      const base = 'baseline/groups/' + group.id;
      const observations = await json(base + '/observations/observations.json');
      const identities = await json(base + '/identities.json');
      check(observations.fixture_slots === 12 && observations.all_requests.length === 17 && observations.reset_seed_owners === 10 &&
        observations.reset_seed_pets === 13 && observations.mutated_executed === false, 'Baseline fixture/reset claims differ');
      check(JSON.stringify(observations.slots.map(r => r.id)) === JSON.stringify(fixture.requests.map(r => r.id)), 'Fixture ID/order differs');
      for (const row of observations.all_requests) {
        const metadata = await json(base + '/observations/' + row.id + '.json');
        const body = await read(base + '/observations/' + row.id + '.body');
        check(metadata.body_file === row.id + '.body' && metadata.body_sha256 === hash(body) && metadata.body_bytes === body.length &&
          metadata.status === row.status && metadata.method === row.method && metadata.path === row.path && metadata.error === null, 'Raw HTTP binding differs');
        if (metadata.request_body_file) {
          const request = await read(base + '/observations/' + metadata.request_body_file);
          check(metadata.request_body_sha256 === hash(request) && metadata.request_body_bytes === request.length, 'Request body binding differs');
        }
      }
      for (const [service, identity] of Object.entries(identities)) {
        check(!instances.has(identity.id) && identity.labels['code-graphrag.p03-baseline'] === group.owner &&
          !Object.keys(identity.ports ?? {}).length && identity.mounts.every(m => m.Type !== 'volume'), 'Application instance isolation/reuse');
        instances.add(identity.id);
        const mount = identity.mounts.find(m => m.Destination === '/p02.jar');
        check(mount && mount.RW === false && build.jars[service], 'Missing baseline binary identity record');
      }
      check((await json(base + '/cleanup.json')).complete === true && (await json(base + '/setup/setup.json')).fresh_seed_only === true,
        'Missing cleanup/reset evidence');
      reports.push({ group: group.id, raw_collector_records_verified: observations.all_requests.length,
        fixture_slots: observations.fixture_slots, recorded_reset_seed_owners: 10, recorded_reset_seed_pets: 13 });
    }
    check(instances.size === 10, 'Wrong number of recorded application instances');
    reports.push({ candidate_proposal_only: true, eligible_ids: universe.eligible_entities.length,
      seed_ids: universe.excluded_seeds.length, alias_rows: universe.aliases.length,
      human_scope_confirmation: false, build_binary_bytes_available_for_rehash: false });
  }
  return { ...integrity, package_role: meta.package_role, status: 'scope_packet_verified_not_human_confirmation',
    candidate_selected_by_huy: true, baseline_evidence_included: true, record_checks_requested: records,
    record_checks: reports, independent_scope_confirmation_received: false, input_locked: false,
    mutated_runtime_executed: false, labels_created: false, ground_truth_accepted: false,
    limitations: [...integrity.limitations, 'Five application JARs and two source/config TARs omitted explicitly; no full runtime replay.',
      'Read source and record actual notes/exposure before optional proposal/record checks.',
      'Census/alias regeneration and hash pass do not substitute for a human scope decision.'] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    check((args.length === 2 || args.length === 3 && args[2] === '--records') && args[0] === '--root', 'Usage: --root DIRECTORY [--records]');
    console.log(JSON.stringify(await verifyScopePacket(args[1], args.length === 3), null, 2));
  } catch (error) { console.error('P03 scope packet failed: ' + error.message); process.exitCode = 1; }
}
