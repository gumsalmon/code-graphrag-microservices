"""Independent read-only audit of Phat's P02 v4 return. Never executes received tooling."""
import hashlib
import json
from pathlib import Path
import re
from collections import Counter
from transfer_security import safe_member
from package_project_transfer import extended_path, parse_manifest

ROOT = Path(__file__).resolve().parent.parent
INTAKE = ROOT / 'handoff-out/team-returns-20261101/20261101T054957Z-a801d6ca'
P = extended_path(INTAKE / 'phat/received/P02_CHECKPOINT_2026-10-31')
PRIOR = extended_path(ROOT / 'handoff-out/p02-phat-return/20261025T092314Z-4ffb0796/received')
OLD_HELPER = extended_path(ROOT / 'handoff-out/p02-helper-review-return/20261026T051209Z-0b0f805b/received')
checks = Counter()
cache = {}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def check(ok, message):
    if not ok: raise ValueError(message)
    checks[message.split(':')[0]] += 1


def read(path):
    path = extended_path(path)
    if path not in cache:
        check(path.is_file() and not path.is_symlink(), 'regular file: ' + str(path))
        cache[path] = path.read_bytes()
    return cache[path]


def load(path):
    def unique(rows):
        result = {}
        for key, value in rows:
            if key in result: raise ValueError('Duplicate JSON key')
            result[key] = value
        return result
    return json.loads(read(path).decode('utf-8-sig'), object_pairs_hook=unique,
                      parse_constant=lambda s: (_ for _ in ()).throw(ValueError('Nonfinite JSON constant')))


def manifest(directory, filename):
    rows = parse_manifest(read(directory / filename)); names = set()
    for name, expected in rows:
        check(safe_member(name) and name.casefold() not in names, 'safe manifest member: ' + name)
        names.add(name.casefold()); check(sha(read(directory / name)) == expected, 'manifest hash: ' + name)
    actual = {p.relative_to(directory).as_posix().casefold() for p in directory.rglob('*') if p.is_file() and p.name != filename}
    check(names == actual, 'complete manifest inventory: ' + filename)
    return len(rows)


def ref(item, roots, default='checkpoint'):
    name = item['path']; root = item.get('root', default)
    check(root in roots and safe_member(name), 'safe current evidence ref: ' + name)
    raw = read(roots[root] / name)
    if 'sha256' in item: check(sha(raw) == item['sha256'], 'evidence ref hash: ' + name)
    if 'bytes' in item: check(len(raw) == item['bytes'], 'evidence ref bytes: ' + name)
    if 'line_start' in item:
        lines = raw.decode('utf-8-sig').splitlines(); start, end = item['line_start'], item.get('line_end', item['line_start'])
        check(type(start) is int and type(end) is int and 1 <= start <= end <= len(lines), 'source span: ' + name)
    return raw


def refs(value, roots):
    if isinstance(value, dict):
        if 'path' in value and 'sha256' in value: ref(value, roots)
        for item in value.values(): refs(item, roots)
    elif isinstance(value, list):
        for item in value: refs(item, roots)


def main():
    manifest_count = manifest(P, 'SHA256SUMS.checkpoint.txt')
    labels = load(P / 'labels.draft.v4.json'); prior = load(PRIOR / 'labels.draft.v3.json')
    check(sha(read(PRIOR / 'labels.draft.v3.json')) == '7d85eb6bb7bee9b7b138766ebd1a8deefd945a2a4bee8dc922f61f0a673e42cb', 'canonical prior labels')
    check(sha(read(P / 'labels.draft.v4.json')) == 'c22e97a5a3a6994cb0c7961c5a42ed098301b106d36ab57536a486077c456f08', 'received label v4 identity')
    roots = {}
    for key, path in labels['reference_roots'].items():
        check(path == '.' or safe_member(path), 'reference root path: ' + key)
        roots[key] = P if path == '.' else P / path
    check(roots['checkpoint'] == P, 'checkpoint root identity')
    for name in ['scenario_id','scenario_version','protocol_version','scenario_sha256','universe_version','universe_sha256',
                 'fixture_version','fixture_sha256','patch_sha256','source_commit','config_commit']:
        check(labels[name] == prior[name], 'locked input binding: ' + name)
    check(labels['label_version'] == 'draft.v4' and labels['status'] == 'pending_review', 'version and status')
    for flag in ['ground_truth_accepted','final_test_locked','official_scoring_authorized','technical_evaluated_outputs_gate_opened_by_this_draft']:
        check(labels[flag] is False, 'closed research gate: ' + flag)
    check(labels['reviewer'] is None and labels['review_decision'] is None, 'no invented reviewer decision')
    checkpoint = load(P / 'ANNOTATION_CHECKPOINT.v4.json')
    for item in checkpoint['files']: ref(item, roots)
    for filename in ['labels.draft.v4.json','evidence_manifest.checkpoint.v1.json','ANNOTATION_CHECKPOINT.v4.json']:
        m = re.fullmatch(r'([a-f0-9]{64})\s+\*?(.+)', read(P / (filename + '.sha256')).decode().strip())
        check(m is not None and m[2] == filename and m[1] == sha(read(P / filename)), 'internal sidecar: ' + filename)
    evidence = load(P / 'evidence_manifest.checkpoint.v1.json')
    check(evidence['reference_roots'] == labels['reference_roots'], 'evidence root consistency')
    for item in evidence['files']: ref(item, roots)
    refs(labels, roots)
    notes = load(P / 'notes/NOTES_BY_ID.checkpoint.v1.json'); refs(notes, roots)
    exposure = load(P / 'notes/EXPOSURE.checkpoint.v1.json'); refs(exposure, roots)
    before = load(P / 'notes/NOTES_CHECKPOINT.before_labels.v1.json'); refs(before, roots)
    input_root = roots[evidence['input_paths_root']]
    for prefix in ['scenario','universe','fixture','patch']:
        check(sha(read(input_root / evidence['inputs'][prefix+'_path'])) == labels[prefix+'_sha256'], 'input bytes: ' + prefix)
    universe = load(roots['f03_candidate'] / 'draft/evaluation_universe.draft.v2.json')
    canonical = lambda row: (row['level'], row['entity_id'])
    check({canonical(r) for r in labels['labels']} == {canonical(r) for r in universe['eligible_entities']} and len(labels['labels']) == 12, '12 exact eligible IDs')
    check(labels['excluded_seeds'] == prior['excluded_seeds'] and len(labels['excluded_seeds']) == 3, 'three seeds preserved')
    check({r['row_id'] for r in notes['rows']} == {r['row_id'] for r in labels['labels']}, 'notes cover all IDs')
    old = {r['row_id']:r for r in prior['labels']}; new = {r['row_id']:r for r in labels['labels']}
    old_eight = ['R01','R02','R03','R04','R05','R08','R09','R12']; helpers = ['R06','R07','R10','R11']
    for name in old_eight:
        for field in ['level','entity_id','polarity','behavioral_impact','rationale','scope','logical_hop','service_boundary_crossings','confidence','requires_code_change','repair_strategy']:
            check(new[name][field] == old[name][field], 'eight old decisions preserved: ' + name + '/' + field)
    for name, row in new.items():
        aliases = []
        for alias in row['aliases']:
            check(alias.get('evidence_root') == 'f03_candidate', 'explicit portable alias root: ' + name)
            aliases.append({key:value for key,value in alias.items() if key != 'evidence_root'})
        check(row['level'] == old[name]['level'] and row['entity_id'] == old[name]['entity_id'] and aliases == old[name]['aliases'], 'canonical IDs and alias content preserved: ' + name)
        check(row['requires_code_change'] == 'unresolved' and row['repair_strategy'] is None and row['confidence'] is None, 'uncertainty preserved: ' + name)
        check(row['polarity'] == 'negative' and row['behavioral_impact'] is False and row['review_status'] == 'pending_review', 'bounded draft decision: ' + name)
        for alias in row.get('aliases', []):
            if isinstance(alias, dict):
                for name_ref in alias.get('evidence_refs', []):
                    check(safe_member(name_ref) and (roots['f03_candidate'] / name_ref).is_file(), 'alias source ref')
    for name in helpers:
        check(old[name]['polarity'] == 'unresolved' and new[name]['logical_hop'] is None and new[name]['service_boundary_crossings'] is None, 'four helper changes only: ' + name)
    confirmation = load(P / 'notes/HUMAN_CONFIRMATION.v1.json')
    check(set(confirmation['scope']) == set(old_eight) and confirmation['source_and_raw_reading_confirmed'] is True, 'declared human reading scope received')
    check(confirmation['statement'] == 'tôi đã đọc tất cả rồi' and confirmation['per_file_first_read_times'] is None and confirmation['historical_read_date'] is None, 'group self-report without invented times')
    check(exposure['blinded'] is False and exposure['strict_human_source_first_attested'] is False and exposure['evaluated_system_outputs_used_as_evidence'] is False, 'actual exposure disclosed')
    origins = {}
    for root_key, pattern in [('f03_packet','handoff-out/p02-phat-f03/*/ZIP_VERIFIED'),('helper_packet','handoff-out/p02-helper-packet/*/ZIP_VERIFIED')]:
        candidates = list(ROOT.glob(pattern)); expected = read(roots[root_key] / 'SHA256SUMS.txt')
        matches = [p for p in candidates if (p / 'SHA256SUMS.txt').is_file() and (p / 'SHA256SUMS.txt').read_bytes() == expected]
        check(len(matches) >= 1, 'canonical original packet manifest: ' + root_key); origins[root_key] = extended_path(matches[-1])
        for path in roots[root_key].rglob('*'):
            if path.is_file():
                relative = path.relative_to(roots[root_key]); check(read(path) == read(origins[root_key] / relative), 'original packet bytes preserved: ' + root_key)
    prior_copy_exceptions = []
    for local, received in [(PRIOR,roots['prior_f03_return']),(OLD_HELPER,roots['prior_helper_return'])]:
        for path in local.rglob('*'):
            if path.is_file():
                original, copied = read(path), read(received / path.relative_to(local))
                relative = path.relative_to(local).as_posix()
                if local == OLD_HELPER and relative == 'templates/HUMAN_CHECK_SUPPLEMENT_TEMPLATE.md' and original != copied:
                    check(sha(original) == '72bd9feb4b771895a0531789c5ef950314284d1d7deb739478550dec447a25c0' and
                          sha(copied) == 'ac79587207eab0af4937283aeaddba750aba8acfd04f5baf590627f7f20e0bd6' and
                          original.replace(b'| R01 | Ch\xc6\xb0a \xc4\x91i\xe1\xbb\x81n | Ch\xc6\xb0a \xc4\x91i\xe1\xbb\x81n | Ch\xc6\xb0a \xc4\x91i\xe1\xbb\x81n |',
                                           b'| R01 | Ch\xc6\xb0a \xc4\x91i\xe1\xbb\x81n | Ch\xc6\xb0a \xc4\x91i\xe1\xbb\x81n | Ch\xc6\xb0a \xc4\x91i |',1) == copied,
                          'exact blank template copy exception')
                    prior_copy_exceptions.append({'path':'provenance/prior_helper_return/'+relative,
                        'canonical_sha256':sha(original),'received_sha256':sha(copied),
                        'difference':'Four UTF-8 bytes removed from an unfilled R01 placeholder; not source/raw/labels or a human decision',
                        'historical_checksum_matches_received_copy':False,'canonical_original_retained':True,
                        'received_bytes_modified_by_coordinator':False})
                else:
                    check(original == copied, 'prior return bytes preserved: ' + relative)
    appendix = ROOT / 'handoff-out/phat-returns-20261031/20261031T045938Z-2610a833/P02_PHAT_PHU_LUC_NHAN_DINH_2026-10-30.md'
    check(read(appendix) == read(P / 'provenance/P02_PHAT_PHU_LUC_NHAN_DINH_2026-10-30.md'), 'human helper appendix preserved')
    report = {'scope':'technical draft-checkpoint intake, not label acceptance or authentication of physical human reading',
        'received_root':str(P), 'manifest_files_verified':manifest_count,'evidence_manifest_files_verified':len(evidence['files']),
        'checks':dict(checks),'label_version':'draft.v4','label_sha256':sha(read(P/'labels.draft.v4.json')),
        'checkpoint_sha256':sha(read(P/'ANNOTATION_CHECKPOINT.v4.json')),'eligible_ids':12,'excluded_seeds':3,
        'draft_coverage':labels['coverage'],'human_reading_confirmation':'received grouped self-report, historical times unknown; not independently authenticated',
        'blinded':False,'strict_human_source_first_attested':False,'prior_copy_exceptions':prior_copy_exceptions,
        'coordinator_received_code_executed':False,
        'receipt_issued_by_this_script':False,'ground_truth_accepted':False,'labels_modified':False,'model_calls':0}
    output = INTAKE / 'P02_INDEPENDENT_AUDIT.json'
    with output.open('x',encoding='utf-8') as stream: json.dump(report,stream,ensure_ascii=False,indent=2);stream.write('\n')
    print(json.dumps({k:v for k,v in report.items() if k not in ['checks','draft_coverage']},ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
