"""Portable source/raw scope-check packet; no labels, runtime or research approval."""
import hashlib
import json
import os
import stat
import subprocess
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from package_project_transfer import extended_path, parse_manifest, history_ledger, json_bytes
from transfer_security import Scanner, safe_member, exclusion_reason

ROOT = Path(__file__).resolve().parent.parent
CANDIDATE = ROOT / 'handoff-out/p03-preparation/20261024T190227112Z-a8e852db'
BASELINE = ROOT / 'handoff-out/p03-baseline/20261028t094723529z-5e53547e'
BUILD = ROOT / 'handoff-out/p03-build/20261028t094427082z-687c052b'
AUDIT = ROOT / 'handoff-out/p03-baseline-audit/20261028-final-checks'
DECISION = 'benchmark/p03/decisions/SELECTION_BASELINE_2026-10-28.json'
VETTED_BUILD_INPUT_HASH = 'd56cbfe0f4473195a9880600c0760e79b413a9a81c7cc0ee67b5f6afbb4d994b'


def sha(data):
    return hashlib.sha256(data).hexdigest()


class ScopePacketScanner(Scanner):
    """One exact-byte semantic exception, without weakening shared scanning.

    The original JSON's `authorization` value is the public local D18 decision
    path, not an HTTP auth value. Inspect an otherwise identical JSON view with
    only that key disambiguated; preserve the original bytes in the packet.
    Every value and all other secret checks still run. Any byte change or other
    file uses the unmodified fail-closed scanner.
    """
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.semantic_exception_uses = 0

    def _text(self, name, data):
        if name.split('!')[-1] == 'baseline-build/inputs.json' and sha(data) == VETTED_BUILD_INPUT_HASH:
            parsed = json.loads(data)
            assert parsed['authorization'] == DECISION
            view = {('research_decision_path' if key == 'authorization' else key): value for key, value in parsed.items()}
            self.semantic_exception_uses += 1
            return super()._text(name, json_bytes(view))
        return super()._text(name, data)

    def summary(self):
        return {**super().summary(), 'exact_byte_semantic_exceptions': [{
            'path': 'baseline-build/inputs.json', 'sha256': VETTED_BUILD_INPUT_HASH,
            'field': 'authorization', 'actual_value_type': 'D18 research-decision file path',
            'scan_view_key': 'research_decision_path', 'original_packet_bytes_changed': False,
            'uses': self.semantic_exception_uses}]}


def main():
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
    out = ROOT / 'handoff-out/p03-scope-packet' / stamp
    out.mkdir(parents=True, exist_ok=False)
    env = {k: v for k, v in os.environ.items() if k.upper() in {'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC'}}

    def run_node(stage, args):
        result = subprocess.run(['node', *args], cwd=ROOT, env=env, capture_output=True)
        (out / (stage + '.stdout.log')).write_bytes(result.stdout)
        (out / (stage + '.stderr.log')).write_bytes(result.stderr)
        (out / (stage + '.command.json')).write_bytes(json_bytes({'program': 'node', 'args': args, 'exit_code': result.returncode,
                                                                'runtime_or_model_executed': False}))
        if result.returncode:
            raise ValueError('Packet verification failed; inspect preserved logs: ' + stage)
        return json.loads(result.stdout)

    checked = run_node('source-baseline-check', ['scripts/check_p03_baseline.mjs', '--run', str(BASELINE)])
    assert checked['status'] == 'baseline_records_verified_not_paired_impact' and len(checked['groups']) == 2
    files, originals, omissions = {}, {}, {}

    def add(name, data):
        assert safe_member(name) and exclusion_reason(name) is None, 'Unsafe/private selected name: ' + name
        assert name.casefold() not in {n.casefold() for n in files}, 'Case-colliding packet path'
        assert not name.lower().endswith(('.jar', '.class', '.tar', '.cypher')) and 'labels.' not in name.lower()
        files[name] = data

    def copy(name, source):
        source = extended_path(source)
        assert source.is_file() and not source.is_symlink()
        data = source.read_bytes(); originals[source] = sha(data)
        if name in files:
            assert files[name] == data
        else:
            add(name, data)

    def manifested(directory, prefix):
        copy(prefix + '/SHA256SUMS.txt', directory / 'SHA256SUMS.txt')
        for path, expected in parse_manifest((directory / 'SHA256SUMS.txt').read_bytes()):
            source = extended_path(directory / path); data = source.read_bytes()
            assert sha(data) == expected, 'Original byte hash differs: ' + path
            name = prefix + '/' + path
            if name.endswith(('.jar', '.tar')):
                assert prefix == 'baseline-build', 'Unexpected binary in source/raw packet'
                omissions[name] = {'path': name, 'sha256': expected, 'bytes': len(data),
                                   'reason': 'application_binary_or_full_source_config_archive_not_needed_for_scope_reading_no_full_replay_claim'}
                originals[source] = expected
            else:
                copy(name, source)

    manifested(CANDIDATE, 'candidate')
    manifested(BASELINE, 'baseline')
    for group in ['baseline-r1', 'baseline-r2']:
        manifested(BASELINE / 'groups' / group, 'baseline/groups/' + group)
    manifested(BUILD, 'baseline-build')
    manifested(AUDIT, 'baseline-audit')
    assert len(omissions) == 7
    for dest, source in {
        'START_HERE.md': 'tasks/p03-handoff/SCOPE_START_HERE.md',
        'CONTEXT_FOR_SCOPE_REVIEW.md': 'tasks/p03-handoff/CONTEXT_FOR_SCOPE_REVIEW.md',
        'TASK_PHAT.md': 'tasks/p03-handoff/TASK_PHAT_SCOPE.md',
        'templates/INDEPENDENT_NOTES.md': 'tasks/p03-handoff/INDEPENDENT_NOTES_TEMPLATE.md',
        'templates/SCOPE_COMPARISON.md': 'tasks/p03-handoff/SCOPE_COMPARISON_TEMPLATE.md',
        'templates/RETURN_PHAT.md': 'tasks/p03-handoff/RETURN_PHAT_TEMPLATE.md',
        'decisions/SELECTION_BASELINE_2026-10-28.json': DECISION,
        'tooling/scripts/verify_p03_scope_packet.mjs': 'scripts/verify_p03_scope_packet.mjs',
        'tooling/scripts/verify_project_transfer.mjs': 'scripts/verify_project_transfer.mjs',
        'tooling/scripts/p03-scope-packet.test.mjs': 'scripts/p03-scope-packet.test.mjs',
    }.items():
        copy(dest, ROOT / source)
    state = {'schema': 'p03-scope-check-packet-state/1', 'record_date': '2026-10-28', 'candidate_selected_by_huy': True,
             'candidate_manifest_sha256': sha((CANDIDATE / 'SHA256SUMS.txt').read_bytes()), 'baseline_groups_completed': 2,
             'baseline_runtime_manifest_sha256': sha((BASELINE / 'SHA256SUMS.txt').read_bytes()),
             'candidate_flags_are_historical_not_current_authority': True,
             'independent_scope_confirmation_received': False, 'input_locked': False, 'mutated_build_performed': False,
             'mutated_runtime_executed': False, 'labels_created': False, 'ground_truth_accepted': False, 'final_test_locked': False,
             'official_scoring_authorized': False, 'evaluated_system_outputs_included': False, 'model_calls_authorized': False,
             'github_push_authorized': False, 'packet_sent_to_phat': False, 'phat_acknowledged_task': False,
             'intended_work': 'Independent input-scope recommendation only; no impact polarity decisions or self-review',
             'human_scope_checker': None, 'human_scope_conclusion': None}
    add('CURRENT_STATE.json', json_bytes(state))
    decision = json.loads((ROOT / DECISION).read_bytes())
    add('provenance/INPUTS.json', json_bytes({'candidate_directory_at_source': str(CANDIDATE), 'candidate_manifest_sha256': state['candidate_manifest_sha256'],
                                           'source_commit': decision['source_commit'], 'config_commit': decision['config_commit'],
                                           'scenario_version': '0.1.0', 'fixture_version': 'v1', 'scope_version': 'v1', 'universe_version': 'draft.v1',
                                           'selected_bindings': {k: v for k, v in decision.items() if k.endswith('_sha256')},
                                           'all_candidate_refs_resolve_from': 'candidate/',
                                           'baseline_run_at_source': str(BASELINE), 'baseline_build_at_source': str(BUILD),
                                           'application_binaries_and_archives_omitted': True, 'full_replay_available_from_this_zip_alone': False}))
    index = []
    for group in ['baseline-r1', 'baseline-r2']:
        group_root = BASELINE / 'groups' / group
        observations = json.loads((group_root / 'observations/observations.json').read_bytes())
        for stage, ids in [('observations', [row['id'] for row in observations['all_requests']]),
                           ('setup', ['config-visits', 'config-customers', 'config-gateway', 'discovery-registry', 'pet7-before', 'pet8-before'])]:
            for observation in ids:
                base = 'baseline/groups/' + group + '/' + stage + '/'
                record = json.loads((group_root / stage / (observation + '.json')).read_bytes())
                index.append({'group': group, 'id': observation, 'record': base + observation + '.json',
                              'body': base + record['body_file'], 'body_sha256': record['body_sha256'], 'body_bytes': record['body_bytes'],
                              'request_body': base + record['request_body_file'] if record.get('request_body_file') else None})
    add('provenance/BASELINE_INDEX.json', json_bytes({'schema': 'p03-baseline-raw-index/1', 'records': index,
                                                   'readiness_and_service_logs': 'All retained per group; not counted as independent scenarios',
                                                   'scope': 'Navigation only, no impact-label or input-scope conclusion'}))
    universe = json.loads((CANDIDATE / 'draft/evaluation_universe.draft.v1.json').read_bytes())
    add('templates/ID_ALIAS_COMPARISON.json', json_bytes({'schema': 'p03-input-scope-comparison-template/1', 'human_checker': None,
        'actual_check_date': None, 'exposure': None, 'conclusion': None,
        'eligible_ids': [{**row, 'human_check': None, 'source_evidence_actually_read': [], 'notes': None} for row in universe['eligible_entities']],
        'excluded_seeds': [{**row, 'human_check': None, 'notes': None} for row in universe['excluded_seeds']],
        'aliases': [{**row, 'human_check': None, 'notes': None} for row in universe['aliases']],
        'template_is_completed_review': False, 'no_polarity_fields_should_be_added_in_this_task': True}))
    scanner = ScopePacketScanner(max_depth=9, max_expanded_bytes=128*1024*1024)
    for name, data in files.items(): scanner.scan(name, data)
    add('META/security-scan.json', json_bytes(scanner.summary()))
    inventory = {name: {'path': name, 'sha256': sha(data), 'bytes': len(data)} for name, data in files.items()}
    history = history_ledger(inventory, lambda name: files[name], omissions)
    expected = {'baseline-build/artifacts/' + service + '.jar' for service in ['config-server', 'discovery-server', 'customers-service', 'visits-service', 'api-gateway']}
    expected |= {'baseline-build/source.tar', 'baseline-build/config.tar'}
    assert set(omissions) == expected, 'Unexpected missing evidence in historical manifests'
    git = ['git', '-c', 'safe.directory=' + ROOT.as_posix(), '-c', 'core.fsmonitor=false', '--no-optional-locks']
    head = subprocess.check_output([*git, 'rev-parse', 'HEAD'], cwd=ROOT, env=env, text=True).strip()
    branch = subprocess.check_output([*git, 'branch', '--show-current'], cwd=ROOT, env=env, text=True).strip()
    add('META/transfer.json', json_bytes({'schema': 'code-graphrag-project-transfer/1', 'profile': 'full', 'status': 'snapshot_not_research_approval',
        'package_role': 'phat_p03_input_scope_check_only', 'source_head': head, 'source_branch': branch,
        'git_directory_included': False, 'api_credentials_included': False, 'research_approval': False, 'official_scoring_authorized': False,
        'files': [inventory[name] for name in sorted(inventory)], 'omissions': [omissions[name] for name in sorted(omissions)],
        'historical_manifests': history, 'scope_check_already_completed': False, 'sent_to_phat': False,
        'exclusions': ['P01/P02/P03 labels', 'CIA parser/graph/retrieval/prediction/score outputs', 'full coordinator PROJECT_CONTEXT/history',
                       'application JARs, full source/config TARs, images and dependency/model caches', 'credentials and personal chat history'],
        'limitations': ['Local uncommitted code is represented by file hashes, not source_head alone.',
                       'This packet is baseline-only and contains no mutated runtime.',
                       'Hash checks and generated census do not attest a human has independently read or decided scope.']}))
    add('SHA256SUMS.txt', ''.join(sha(files[name]) + '  ' + name + '\n' for name in sorted(files)).encode('ascii'))
    packet = extended_path(out / 'P03_INPUT_SCOPE_CHECK'); packet.mkdir()
    for name, data in files.items():
        target = packet / name; target.parent.mkdir(parents=True, exist_ok=True)
        with target.open('xb') as stream: stream.write(data)
    zip_path = out / 'P03_INPUT_SCOPE_CHECK_2026-10-28.zip'
    with zipfile.ZipFile(zip_path, 'x', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name in sorted(files):
            info = zipfile.ZipInfo(name, (2026, 10, 28, 0, 0, 0)); info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (stat.S_IFREG | 0o644) << 16; archive.writestr(info, files[name])
    zip_bytes = zip_path.read_bytes(); zip_hash = sha(zip_bytes)
    (out / (zip_path.name + '.sha256')).write_text(zip_hash + '  ' + zip_path.name + '\n', encoding='ascii', newline='\n')
    final_scan = ScopePacketScanner(max_depth=9, max_expanded_bytes=128*1024*1024); final_scan.scan(zip_path.name, zip_bytes)
    (out / 'ZIP_SECURITY_SCAN.json').write_bytes(json_bytes(final_scan.summary()))
    relocated = extended_path(out / 'ZIP_VERIFIED'); relocated.mkdir()
    with zipfile.ZipFile(zip_path) as archive:
        assert archive.testzip() is None and len({i.filename.casefold() for i in archive.infolist()}) == len(files)
        for item in archive.infolist():
            assert safe_member(item.filename) and not item.flag_bits & 1 and stat.S_IFMT(item.external_attr >> 16) == stat.S_IFREG
            target = relocated / item.filename; target.parent.mkdir(parents=True, exist_ok=True)
            with target.open('xb') as stream: stream.write(archive.read(item))
    verified = run_node('relocated-default', [str(out / 'ZIP_VERIFIED/tooling/scripts/verify_p03_scope_packet.mjs'), '--root', str(out / 'ZIP_VERIFIED')])
    records = run_node('relocated-records', [str(out / 'ZIP_VERIFIED/tooling/scripts/verify_p03_scope_packet.mjs'), '--root', str(out / 'ZIP_VERIFIED'), '--records'])
    for path, expected_hash in originals.items(): assert sha(path.read_bytes()) == expected_hash, 'Original changed during packaging'
    delivery = {'schema': 'p03-scope-packet-delivery/1', 'record_date': '2026-10-28', 'status': 'packet_ready_not_human_scope_confirmation',
                'archive': str(zip_path), 'zip_sha256': zip_hash, 'zip_bytes': len(zip_bytes), 'packet_files': len(files),
                'root_manifest_sha256': sha(files['SHA256SUMS.txt']), 'historical_manifests': len(history), 'explicit_omissions': len(omissions),
                'relocated_default_check': verified, 'relocated_record_check': records, 'security_scan': final_scan.summary(),
                'original_files_unchanged': True, 'sent_to_phat': False, 'input_locked': False, 'labels_created': False, 'github_push_performed': False}
    (out / 'DELIVERY_REPORT.json').write_bytes(json_bytes(delivery))
    print(json.dumps({k: v for k, v in delivery.items() if k not in {'relocated_default_check', 'relocated_record_check'}}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
