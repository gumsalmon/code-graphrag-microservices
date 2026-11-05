// Portable read-only packet validation; never annotation, acceptance or execution permission.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { verifyProjectTransfer, safeTransferPath } from './verify_project_transfer.mjs';
const check = (ok, message) => { if (!ok) throw new Error(message); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const CANDIDATE = 'c52f085be74406e542de93db7f6d70b2fc3fe60f215ae47bd45df5b1cc5cec92';
const PAIRED = '65057ce36b3c4235943090079a1fe7384660bafa1f31b5ec3e8d113a764dce56';
const D19 = 'dd59272a190ce17f0aff9fee9d1008bd3969945a57152d60a68579e6bc72830c';

export function validateRoleState(state, decision, files, omissions) {
  check(state.schema === 'petclinic-role-packet/1' && ['phat', 'hien'].includes(state.role), 'Wrong role/state');
  check(decision.decision_id === 'D20' && decision.decision_maker === 'Huy' &&
    decision.phat_p03_draft_annotation_authorized === true && decision.phat_p02_checkpoint_completion_authorized === true &&
    decision.integration_authority?.mode === 'conditional_per_case' &&
    decision.integration_authority.checkpoint_already_satisfied_by_this_decision === false, 'Wrong D20 authority');
  for (const flag of ['model_calls_authorized', 'official_scoring_authorized', 'ground_truth_accepted', 'final_test_locked',
    'draft_shared_contract_adoption_authorized', 'github_push_authorized']) check(decision[flag] === false, 'D20 cannot widen: ' + flag);
  for (const flag of ['labels_created', 'evaluated_system_outputs_included', 'ground_truth_accepted', 'final_test_locked',
    'official_scoring_authorized', 'model_calls_authorized', 'github_push_performed', 'packet_sent', 'recipient_acknowledged'])
    check(state[flag] === false, 'Cannot claim gate/action: ' + flag);
  check(state.case_checkpoint_receipts?.P02 === null && state.case_checkpoint_receipts?.P03 === null &&
    state.actual_case_integration_executable_now === false, 'A prepared packet is not a checked human checkpoint');
  check(state.candidate_manifest_sha256 === CANDIDATE && state.input_locked === true, 'Different locked input');
  for (const name of files) check(!/\.(?:jar|class|tar|cypher)$/i.test(name) &&
    !/(?:^|\/)(?:labels(?:[./]|$)|project_context\.md|full_project_context[^/]*\.md)/i.test(name) &&
    !/(?:^|\/)(?:predictions?|scores?|model-responses?)(?:[./]|$)/i.test(name), 'Forbidden evaluated/label/binary artifact: ' + name);
  check(omissions.every(o => !o.path.endsWith('/') && !/\/(?:observations|setup|logs)\//.test(o.path)), 'Raw omission or broad omission forbidden');
  if (state.role === 'phat') check(state.paired_runtime_included === true && state.paired_runtime_manifest_sha256 === PAIRED &&
    !files.some(n => n.startsWith('implementation/')), 'Wrong annotator inputs');
  else check(state.paired_runtime_included === false && !files.some(n => n.startsWith('paired/')) &&
    state.implementation_parser_sha256 === 'fb20def957a46c5bf41662326fa5c4e955593cb532cdad476dc9263ae9b6e8d9' &&
    state.implementation_importer_sha256 === '8e418f34cc4e620cc924b37f23baccd8ad2f150579768cb34fffc97ec55ed08c', 'Wrong technical candidate/isolation');
  return true;
}

export async function verifyRolePacket(directory, records = false) {
  const root = resolve(directory), integrity = await verifyProjectTransfer(root);
  const read = name => { check(safeTransferPath(name), 'Unsafe packet ref'); return readFile(resolve(root, name)); };
  const json = async name => JSON.parse(await read(name));
  const state = await json('CURRENT_STATE.json'), decision = await json('decisions/D20.json'), meta = await json('META/transfer.json');
  validateRoleState(state, decision, meta.files.map(f => f.path), meta.omissions);
  check(meta.package_role === state.role + '_petclinic_next' && sha(await read('decisions/D20.json')) === state.decision_sha256, 'Different purpose/D20 binding');
  check(sha(await read('candidate/SHA256SUMS.txt')) === CANDIDATE && sha(await read('decisions/D19.json')) === D19, 'Input decision/candidate bytes differ');
  const d19 = await json('decisions/D19.json');
  for (const item of d19.artifacts) check(sha(await read('candidate/' + item.path)) === item.sha256, 'Locked input differs: ' + item.path);
  const universe = await json('candidate/draft/evaluation_universe.draft.v1.json');
  check(universe.eligible_entities.length === 31 && universe.excluded_seeds.length === 3 && universe.aliases.length === 34 &&
    new Set(universe.eligible_entities.map(r => r.level + '/' + r.entity_id)).size === 31, 'Universe census differs');
  let verified = 0;
  if (state.role === 'phat') {
    check(sha(await read('paired/SHA256SUMS.txt')) === PAIRED, 'Paired evidence differs');
    const notes = await json('work-templates/ENTITY_NOTES.json');
    check(notes.template_only === true && notes.human_annotator === null && notes.completed === false &&
      notes.entities.length === 31 && notes.entities.every(row => row.independent_assessment === null && row.evidence_actually_read.length === 0), 'Template must not impersonate annotation');
    if (records) {
      const plan = await json('paired/plan.json');
      check(plan.measurement_version === 2 && plan.groups.length === 4, 'Wrong measurement');
      const networks = new Set(), containers = new Set();
      for (const group of plan.groups) {
        const base = 'paired/groups/' + group.id, observations = await json(base + '/observations/paired-observations.json');
        check(observations.snapshot === group.snapshot && observations.slots.length === 12 && observations.all_requests.length === 17 &&
          observations.reset_seed_owners === 10 && observations.reset_seed_pets === 13, 'Wrong raw accounting/reset');
        const supportNames = ['config-visits', 'config-customers', 'config-gateway', 'discovery-registry', 'pet7-before', 'pet8-before'];
        for (const [stage, names] of [['observations', observations.all_requests.map(r => r.id)], ['setup', supportNames]]) {
          for (const name of names) {
            const dir = base + '/' + stage + '/', record = await json(dir + name + '.json');
            check(record.body_file === name + '.body' && record.error === null, 'Bad raw record');
            const raw = await read(dir + record.body_file);
            check(record.body_sha256 === sha(raw) && record.body_bytes === raw.length, 'Changed raw response');
            if (record.request_body_file) {
              check(record.request_body_file === name + '.request.body', 'Unexpected request body ref');
              const request = await read(dir + record.request_body_file);
              check(record.request_body_sha256 === sha(request) && record.request_body_bytes === request.length, 'Changed raw request');
            }
            if (stage === 'observations') {
              const step = observations.all_requests.find(r => r.id === name);
              check(record.method === step.method && record.path === step.path && record.status === step.status, 'Ledger differs');
            } else check(record.status === 200 && record.method === 'GET', 'Support transport differs');
            verified++;
          }
        }
        const network = await json(base + '/network-identity.stdout.log');
        check(network.internal && !networks.has(network.id), 'Network reused'); networks.add(network.id);
        for (const identity of Object.values(await json(base + '/identities.json'))) {
          check(!containers.has(identity.id) && !Object.keys(identity.ports ?? {}).length && identity.mounts.every(m => m.Type !== 'volume'), 'Instance/DB reuse');
          containers.add(identity.id);
        }
        check((await json(base + '/cleanup.json')).complete === true, 'Missing cleanup');
      }
      check(verified === 92 && networks.size === 4 && containers.size === 20, 'Incomplete evidence');
    }
  } else {
    check(!records, '--records is only for the annotator raw packet');
    for (const [name, expected] of [['parser.py', state.implementation_parser_sha256], ['neo4j_importer.py', state.implementation_importer_sha256]])
      check(sha(await read('implementation/src/' + name)) === expected, 'Implementation candidate differs');
  }
  return { ...integrity, package_role: meta.package_role, source_raw_records_verified: verified, labels_created: false,
    actual_case_integration_executable_now: false, human_reading_or_annotation_certified: false,
    checkpoint_receipts: state.case_checkpoint_receipts, model_calls: 0 };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    check((args.length === 2 || args.length === 3 && args[2] === '--records') && args[0] === '--root', 'Usage: --root DIRECTORY [--records]');
    console.log(JSON.stringify(await verifyRolePacket(args[1], args.includes('--records')), null, 2));
  } catch (error) { console.error('Role packet check failed: ' + error.message); process.exitCode = 1; }
}
