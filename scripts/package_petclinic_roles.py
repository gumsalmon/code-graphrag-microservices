"""Prepare role-separated source/raw and conditional technical packets, no annotation/execution."""
import argparse
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
from package_p03_scope_check import ScopePacketScanner
from transfer_security import safe_member, exclusion_reason

ROOT = Path(__file__).resolve().parent.parent
CANDIDATE = ROOT / 'handoff-out/p03-preparation/20261024T190227112Z-a8e852db'
PAIRED = ROOT / 'handoff-out/p03-paired/20261031t052939742z-be07ff6d'
BUILD = ROOT / 'handoff-out/p03-build/20261028t094427082z-687c052b'
REVISION = ROOT / 'handoff-out/p02-input-revision/20261018T065307839Z-719da955'
HIEN = ROOT / 'handoff-out/hien-synthetic-return/20261028T150351Z-3ac4bad6/received'
HIEN_BASE = ROOT / 'handoff-out/hien-synthetic-preparation/20261028T131851Z-9d11fc97/implementation'
D20 = 'benchmark/decisions/PETCLINIC_DRAFT_INTEGRATION_2026-10-31.json'
ENV = {k: v for k, v in os.environ.items() if k.upper() in {'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC'}}
LAST_OUTPUT = None


class RolePacketScanner(ScopePacketScanner):
    """One additional exact-byte public research-decision path, not HTTP auth."""
    def _text(self, name, data):
        if name.split('!')[-1] == 'paired/plan.json' and sha(data) == '2928977bdc0501c346f41bcdbda20acb726fdda3c97b284cfaddfccb9bb5a5c1':
            value = json.loads(data)
            assert value['authorization'] == 'benchmark/p03/decisions/INPUT_LOCK_2026-10-31.json'
            self.plan_exception_uses = getattr(self, 'plan_exception_uses', 0) + 1
            view = {('research_decision_path' if key == 'authorization' else key): item for key, item in value.items()}
            return super()._text(name, json_bytes(view))
        return super()._text(name, data)

    def summary(self):
        return {**super().summary(), 'paired_plan_exact_byte_exception': {
            'path': 'paired/plan.json', 'sha256': '2928977bdc0501c346f41bcdbda20acb726fdda3c97b284cfaddfccb9bb5a5c1',
            'original_bytes_modified': False, 'field': 'authorization', 'meaning': 'public D19 research-decision path',
            'scan_view_key': 'research_decision_path', 'uses': getattr(self, 'plan_exception_uses', 0)}}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def package(role):
    global LAST_OUTPUT
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
    out = ROOT / 'handoff-out/petclinic-role-packets' / stamp / role
    out.mkdir(parents=True, exist_ok=False)
    LAST_OUTPUT = out
    files, originals, omissions = {}, {}, {}

    def add(name, data):
        assert safe_member(name) and exclusion_reason(name) is None, 'Unsafe/private packet path: ' + name
        if name in files:
            assert files[name] == data, 'Conflicting duplicate path'
            return
        assert name.casefold() not in {n.casefold() for n in files}, 'Case collision'
        assert not name.lower().endswith(('.jar', '.class', '.tar', '.cypher'))
        files[name] = data

    def copy(name, source):
        source = extended_path(source)
        assert source.is_file() and not source.is_symlink(), 'Missing/linked selected source'
        data = source.read_bytes(); originals[source] = sha(data); add(name, data)

    def manifested(directory, prefix, omit_coordination_code=False):
        copy(prefix + '/SHA256SUMS.txt', directory / 'SHA256SUMS.txt')
        for name, expected in parse_manifest((directory / 'SHA256SUMS.txt').read_bytes()):
            source = extended_path(directory / name)
            assert source.is_file() and not source.is_symlink()
            data = source.read_bytes(); assert sha(data) == expected, 'Frozen bytes differ: ' + name
            originals[source] = expected; dest = prefix + '/' + name
            reason = None
            if name.endswith(('.jar', '.tar')):
                reason = 'application_binary_or_full_archive_omitted_no_full_runtime_replay_claim'
            elif omit_coordination_code and (name.startswith('code/') or name in ['protected-before.json', 'protected-after.json']):
                reason = 'coordinator_implementation_or_cross_case_hash_inventory_omitted_from_annotator_view'
            if reason:
                omissions[dest] = {'path': dest, 'sha256': expected, 'bytes': len(data), 'reason': reason}
            else:
                add(dest, data)

    manifested(CANDIDATE, 'candidate')
    common = {
        'decisions/D20.json': D20,
        'decisions/D19.json': 'benchmark/p03/decisions/INPUT_LOCK_2026-10-31.json',
        'decisions/D18.json': 'benchmark/p03/decisions/SELECTION_BASELINE_2026-10-28.json',
        'decisions/D15.json': 'benchmark/p02/decisions/INPUT_LOCK_2026-10-24.json',
        'tooling/scripts/verify_petclinic_role_packet.mjs': 'scripts/verify_petclinic_role_packet.mjs',
        'tooling/scripts/verify_project_transfer.mjs': 'scripts/verify_project_transfer.mjs',
    }
    for name, source in common.items(): copy(name, ROOT / source)
    state = {'schema': 'petclinic-role-packet/1', 'record_date': '2026-10-31', 'role': role,
             'decision_sha256': sha(files['decisions/D20.json']), 'input_locked': True,
             'candidate_manifest_sha256': sha((CANDIDATE / 'SHA256SUMS.txt').read_bytes()),
             'paired_runtime_included': role == 'phat', 'case_checkpoint_receipts': {'P02': None, 'P03': None},
             'actual_case_integration_executable_now': False, 'labels_created': False,
             'evaluated_system_outputs_included': False, 'ground_truth_accepted': False, 'final_test_locked': False,
             'official_scoring_authorized': False, 'model_calls_authorized': False, 'github_push_performed': False,
             'packet_sent': False, 'recipient_acknowledged': False}
    if role == 'phat':
        manifested(PAIRED, 'paired', True)
        for group in ['baseline-r1', 'mutated-r1', 'baseline-r2', 'mutated-r2']:
            manifested(PAIRED / 'groups' / group, 'paired/groups/' + group)
        manifested(PAIRED / 'mutated-build', 'paired/mutated-build')
        manifested(BUILD, 'baseline-build', True)
        state['paired_runtime_manifest_sha256'] = sha((PAIRED / 'SHA256SUMS.txt').read_bytes())
        for dest, source in {
            'START_HERE.md': 'ANNOTATION_START_HERE.md', 'TASK_PHAT.md': 'TASK_PHAT_ANNOTATION.md',
            'CONTEXT_FOR_ANNOTATION.md': 'CONTEXT_FOR_ANNOTATION.md',
            'P02_CHECKPOINT.md': 'P02_CHECKPOINT_2026-10-31.md',
            'work-templates/INDEPENDENT_NOTES.md': 'INDEPENDENT_ANNOTATION_NOTES_TEMPLATE.md',
        }.items(): copy(dest, ROOT / 'tasks/p03-handoff' / source)
        universe = json.loads((CANDIDATE / 'draft/evaluation_universe.draft.v1.json').read_bytes())
        add('work-templates/ENTITY_NOTES.json', json_bytes({'schema': 'p03-human-entity-notes-template/1',
            'template_only': True, 'completed': False, 'human_annotator': None, 'actual_date': None, 'exposure': None,
            'entities': [{**row, 'independent_assessment': None, 'evidence_actually_read': [], 'unknowns_and_limits': None} for row in universe['eligible_entities']],
            'excluded_seeds': universe['excluded_seeds'], 'notes': 'Checklist only, no polarity or label values have been assigned'}))
        index = []
        for group in ['baseline-r1', 'mutated-r1', 'baseline-r2', 'mutated-r2']:
            directory = PAIRED / 'groups' / group
            rows = json.loads((directory / 'observations/paired-observations.json').read_bytes())['all_requests']
            for stage, names in [('observations', [r['id'] for r in rows]), ('setup', ['config-visits', 'config-customers', 'config-gateway', 'discovery-registry', 'pet7-before', 'pet8-before'])]:
                for name in names:
                    meta = json.loads((directory / stage / (name + '.json')).read_bytes())
                    base = 'paired/groups/' + group + '/' + stage + '/'
                    index.append({'group': group, 'id': name, 'record': base + name + '.json', 'body': base + meta['body_file'],
                                  'request_body': base + meta['request_body_file'] if meta.get('request_body_file') else None,
                                  'body_sha256': meta['body_sha256'], 'body_bytes': meta['body_bytes']})
        add('provenance/RAW_INDEX.json', json_bytes({'scope': 'file navigation only, no impact interpretation', 'records': index}))
        add('provenance/READINESS_FAILURE_HISTORY.json', json_bytes({'retained_at_coordinator': 'handoff-out/p03-paired/20261031t052007284z-15efe1e2',
            'manifest_sha256': 'ffeee8ec69421627dbe271830122785fc9a4abf5ff92d1cc0344ceea91a01d0e',
            'counted_in_completed_repetitions': False, 'failed_run_raw_included_in_this_packet': False,
            'reason': 'Coordinator readiness v1 used baseline business response shape; v2 uses health and registry. No patch or input change.'}))
    else:
        manifested(REVISION, 'p02-input')
        for source in (HIEN / 'code-after').rglob('*'):
            if source.is_file(): copy('implementation/' + source.relative_to(HIEN / 'code-after').as_posix(), source)
        copy('implementation/requirements.txt', HIEN_BASE / 'requirements.txt')
        copy('implementation/changes.original.patch', HIEN / 'changes.patch')
        copy('implementation/CODE_HASHES.original.json', HIEN / 'CODE_HASHES.json')
        copy('tooling/scripts/run_java_synthetic_regression.py', ROOT / 'scripts/run_java_synthetic_regression.py')
        for dest, source in {'START_HERE.md': 'INTEGRATION_START_2026-10-31.md',
                             'TASK_HIEN.md': 'TASK_INTEGRATION_2026-10-31.md', 'REPRODUCE.md': 'REPRODUCE_INTEGRATION_2026-10-31.md'}.items():
            copy(dest, ROOT / 'tasks/hien-next' / source)
        state['implementation_parser_sha256'] = sha(files['implementation/src/parser.py'])
        state['implementation_importer_sha256'] = sha(files['implementation/src/neo4j_importer.py'])
    add('CURRENT_STATE.json', json_bytes(state))
    add('provenance/PACKET_LIMITS.json', json_bytes({'packet_role': role, 'not_a_full_project_context': True,
        'coordinator_summary_predictions_scores_and_labels_excluded': True, 'full_runtime_replay_from_zip_alone': False,
        'absolute_paths_in_historical_records_are_not_executed': True,
        'human_reading_annotation_acceptance_and_checkpoint_not_certified_by_hash_checks': True,
        'live_scope_and_conditional_permissions_are_in_D20_old_snapshots_unchanged': True}))
    scan = RolePacketScanner(max_depth=9, max_expanded_bytes=192*1024*1024)
    for name, data in files.items(): scan.scan(name, data)
    add('META/security-scan.json', json_bytes(scan.summary()))
    inventory = {name: {'path': name, 'sha256': sha(data), 'bytes': len(data)} for name, data in files.items()}
    history = history_ledger(inventory, lambda name: files[name], omissions)
    assert all(not '/observations/' in name and not '/setup/' in name and not '/logs/' in name for name in omissions), 'Raw evidence omission'
    git = ['git', '-c', 'safe.directory=' + ROOT.as_posix(), '-c', 'core.fsmonitor=false', '--no-optional-locks']
    head = subprocess.check_output([*git, 'rev-parse', 'HEAD'], cwd=ROOT, env=ENV, text=True).strip()
    branch = subprocess.check_output([*git, 'branch', '--show-current'], cwd=ROOT, env=ENV, text=True).strip()
    add('META/transfer.json', json_bytes({'schema': 'code-graphrag-project-transfer/1', 'profile': 'full', 'status': 'snapshot_not_research_approval',
        'package_role': role + '_petclinic_next', 'source_head': head, 'source_branch': branch,
        'git_directory_included': False, 'api_credentials_included': False, 'research_approval': False, 'official_scoring_authorized': False,
        'files': [inventory[n] for n in sorted(inventory)], 'omissions': [omissions[n] for n in sorted(omissions)],
        'historical_manifests': history, 'sent': False, 'recipient_acknowledged': False,
        'limitations': ['Local code represented by file hashes, not HEAD alone', 'No human checkpoint, label acceptance or full runtime replay claimed']}))
    add('SHA256SUMS.txt', ''.join(sha(files[n]) + '  ' + n + '\n' for n in sorted(files)).encode('ascii'))
    archive = out / ('PETCLINIC_' + role.upper() + '_2026-10-31.zip')
    with zipfile.ZipFile(archive, 'x', zipfile.ZIP_DEFLATED, compresslevel=6) as zip_out:
        for name in sorted(files):
            info = zipfile.ZipInfo(name, (2026, 10, 31, 0, 0, 0)); info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (stat.S_IFREG | 0o644) << 16; zip_out.writestr(info, files[name])
    archive_hash = sha(archive.read_bytes())
    (out / (archive.name + '.sha256')).write_text(archive_hash + '  ' + archive.name + '\n', encoding='ascii', newline='\n')
    final_scan = RolePacketScanner(max_depth=9, max_expanded_bytes=192*1024*1024); final_scan.scan(archive.name, archive.read_bytes())
    (out / 'ZIP_SECURITY_SCAN.json').write_bytes(json_bytes(final_scan.summary()))
    relocated = extended_path(out / 'ZIP_VERIFIED'); relocated.mkdir()
    with zipfile.ZipFile(archive) as zip_in:
        assert zip_in.testzip() is None and len(zip_in.infolist()) == len(files)
        for item in zip_in.infolist():
            assert safe_member(item.filename) and not item.flag_bits & 1 and stat.S_IFMT(item.external_attr >> 16) == stat.S_IFREG
            target = relocated / item.filename; target.parent.mkdir(parents=True, exist_ok=True)
            with target.open('xb') as stream: stream.write(zip_in.read(item))
    checks = []
    for extra in [[], ['--records']] if role == 'phat' else [[]]:
        # Node resolves file URLs without Python's Windows extended-path prefix.
        # Use normal absolute argv; Python still uses extended paths for writes.
        normal_root = out / 'ZIP_VERIFIED'
        args = [str(normal_root / 'tooling/scripts/verify_petclinic_role_packet.mjs'), '--root', str(normal_root), *extra]
        result = subprocess.run(['node', *args], cwd=ROOT, env=ENV, capture_output=True)
        stage = 'relocated-records' if extra else 'relocated-default'
        (out / (stage + '.stdout.log')).write_bytes(result.stdout); (out / (stage + '.stderr.log')).write_bytes(result.stderr)
        (out / (stage + '.command.json')).write_bytes(json_bytes({'program': 'node', 'args': args, 'exit_code': result.returncode,
            'docker_model_or_annotation_executed': False}))
        assert result.returncode == 0, 'Relocated packet check failed; inspect logs at ' + str(out)
        assert result.stdout.strip(), 'Checker produced no report; do not treat empty exit 0 as verification'
        check = json.loads(result.stdout)
        assert check['package_role'] == role + '_petclinic_next' and check['actual_case_integration_executable_now'] is False
        if extra: assert check['source_raw_records_verified'] == 92
        checks.append(check)
    for path, expected in originals.items(): assert sha(path.read_bytes()) == expected, 'Original bytes changed while packaging'
    report = {'schema': 'petclinic-role-delivery/1', 'role': role, 'record_date': '2026-10-31',
        'archive': str(archive), 'zip_sha256': archive_hash, 'zip_bytes': archive.stat().st_size, 'packet_files': len(files),
        'manifest_sha256': sha(files['SHA256SUMS.txt']), 'historical_manifests': len(history), 'explicit_omissions': len(omissions),
        'relocated_checks': checks, 'security_scan': final_scan.summary(), 'originals_rehashed_unchanged': len(originals),
        'sent': False, 'recipient_acknowledged': False, 'labels_created': False, 'actual_case_integration_executed': False,
        'model_calls': 0, 'github_push_performed': False}
    (out / 'DELIVERY_REPORT.json').write_bytes(json_bytes(report))
    print(json.dumps({k:v for k,v in report.items() if k not in ['relocated_checks', 'security_scan']}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--role', choices=['phat', 'hien'], required=True)
    try:
        package(parser.parse_args().role)
    except Exception as error:
        if LAST_OUTPUT is not None:
            (LAST_OUTPUT / 'FAILURE.json').write_bytes(json_bytes({'error_type': type(error).__name__, 'message': str(error),
                'delivery_verified': False, 'failed_at_utc': datetime.now(timezone.utc).isoformat()}))
        raise
