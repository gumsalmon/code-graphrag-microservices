// In-memory coordinator prototype. No file/network/model/graph access or gate mutation.
import { createHash } from 'node:crypto';
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const key = row => JSON.stringify([row.level, row.entity_id]);
const text = value => typeof value === 'string' && value.trim().length > 0;
const safe = value => text(value) && !/[\\:\x00-\x1f\x7f]/u.test(value) &&
  !value.startsWith('/') && value.split('/').every(p => p && p !== '.' && p !== '..' && !/[. ]$/u.test(p));

export function auditCheckpoint({ expected, universe, labels, artifacts, files, humanStatement = null }) {
  const errors = [], warnings = [], humanFollowup = [];
  const check = (ok, code, detail) => { if (!ok) errors.push({ code, detail }); };
  for (const field of ['scenario_id', 'scenario_version', 'source_commit', 'config_commit', 'patch_sha256',
    'scenario_sha256', 'universe_version', 'universe_sha256', 'fixture_version', 'fixture_sha256']) {
    check(text(expected?.[field]) && labels?.[field] === expected[field], 'input_binding_differs', field);
  }
  check(text(labels?.label_version), 'label_version_missing');
  check(labels?.status === 'pending_review' && labels?.ground_truth_accepted === false &&
    labels?.final_test_locked === false && labels?.official_scoring_authorized === false && labels?.review_decision === null,
    'draft_must_not_claim_acceptance_or_scoring');
  check(Array.isArray(universe?.eligible_entities), 'eligible_universe_missing');
  check(Array.isArray(universe?.excluded_seeds), 'seed_list_missing');
  const entity = row => row && typeof row === 'object' && text(row.level) && text(row.entity_id);
  const originalEligible = Array.isArray(universe?.eligible_entities) ? universe.eligible_entities : [];
  const originalSeeds = Array.isArray(universe?.excluded_seeds) ? universe.excluded_seeds : [];
  check(originalEligible.every(entity) && originalSeeds.every(entity), 'invalid_entity_record');
  const eligible = originalEligible.filter(entity), seeds = originalSeeds.filter(entity);
  check(eligible.length > 0, 'eligible_universe_missing');
  const eligibleKeys = new Set(eligible.map(key)), seedKeys = new Set(seeds.map(key));
  check(eligibleKeys.size === eligible.length && seeds.every(row => !eligibleKeys.has(key(row))), 'invalid_universe');
  const rows = Array.isArray(labels?.labels) ? labels.labels : [], seen = new Set();
  check(Array.isArray(labels?.labels), 'label_rows_missing');
  for (const row of rows) {
    if (!entity(row)) { errors.push({ code: 'invalid_label_record' }); continue; }
    const id = key(row);
    check(!seen.has(id), 'duplicate_label', id); seen.add(id);
    check(eligibleKeys.has(id) && !seedKeys.has(id), 'out_of_universe_or_seed', id);
    check(['positive', 'negative', 'unresolved'].includes(row.polarity), 'unsupported_polarity', id);
    const wanted = { positive: true, negative: false, unresolved: null }[row.polarity];
    check(row.behavioral_impact === wanted, 'behavior_and_polarity_conflict', id);
    check(text(row.rationale), 'reason_missing', id);
    check(Array.isArray(row.evidence_refs), 'evidence_ref_list_missing', id);
    if (Array.isArray(row.evidence_refs) && row.evidence_refs.length === 0) warnings.push({ code: 'evidence_refs_need_manual_attention', id });
    // Repair/hop/confidence and the input rows are never filled, projected or normalized here.
  }
  for (const id of eligibleKeys) check(seen.has(id), 'missing_id_not_negative', id);
  const checkedArtifacts = [];
  for (const role of ['labels', 'evidence_manifest', 'notes', 'exposure']) {
    const ref = artifacts?.[role];
    if (!ref || !safe(ref.path) || !/^[a-f0-9]{64}$/u.test(ref.sha256 ?? '')) {
      errors.push({ code: 'missing_or_unsafe_artifact', detail: role }); continue;
    }
    const bytes = files?.[ref.path];
    if (!(bytes instanceof Uint8Array)) { errors.push({ code: 'artifact_bytes_missing', detail: role }); continue; }
    check(digest(bytes) === ref.sha256, 'artifact_hash_differs', role);
    check(bytes.byteLength > 0, 'empty_artifact', role);
    if (role === 'labels') {
      try { check(JSON.stringify(JSON.parse(Buffer.from(bytes).toString('utf8'))) === JSON.stringify(labels), 'label_object_differs_from_artifact'); }
      catch { errors.push({ code: 'label_artifact_not_json' }); }
    }
    checkedArtifacts.push({ role, path: ref.path, sha256: digest(bytes), bytes: bytes.byteLength });
  }
  const declared = humanStatement?.confirmed === true && humanStatement?.kind === 'human_reviewed' &&
    text(humanStatement?.person) && text(humanStatement?.actual_scope) && text(humanStatement?.ai_assistance);
  if (!declared) humanFollowup.push('Actual human confirmation and reading/exposure scope are not declared; AI-only proposals do not satisfy the human checkpoint.');
  humanFollowup.push('Coordinator must inspect the real human statement, notes/exposure and evidence adequacy; this program cannot attest reading or scientific correctness.');
  warnings.push({ code: 'limited_profile', detail: 'Existing benchmark draft field subset only; no schema adoption, duplicate JSON-key detection, evidence file/line semantics, chronology or scientific correctness certification.' });
  return { prototype: 'checkpoint-intake/0.1', scope: 'mechanical subset on caller-supplied data only', mechanical_ok: errors.length === 0,
    eligible_ids: eligible.length, label_rows: rows.length, checked_artifacts: checkedArtifacts, errors, warnings,
    human_confirmation_declared: Boolean(declared), human_reading_certified: false, human_followup: humanFollowup,
    annotation_decisions_made: false, real_case_execution_authorized: false, labels_modified: false, score_computed: false };
}
