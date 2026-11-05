"""Filtered supplemental source/raw packet; never edits originals or labels."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import stat
import subprocess
import uuid
import zipfile
from package_project_transfer import extended_path, parse_manifest, history_ledger, json_bytes
from transfer_security import Scanner, safe_member, exclusion_reason

ROOT = Path(__file__).resolve().parent.parent
ORIGINAL = ROOT / 'handoff-out/p02-phat-f03/20261024T111515Z-b98740ff/P02_PHAT_F03'
FAILED = ROOT / 'handoff-out/p02-helper-supplement/20261025t121439628z-5d146b16'
CANDIDATE = ROOT / 'handoff-out/p02-input-revision/20261018T065307839Z-719da955'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path, required=True)
    args = parser.parse_args()
    run = args.run.resolve()
    assert run.is_relative_to(ROOT / 'handoff-out/p02-helper-supplement') and run != FAILED
    checked = subprocess.run(['node', 'scripts/check_p02_helper_supplement.mjs', '--run', str(run)], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', check=True)
    report = json.loads(checked.stdout)
    assert report['runtime_executed'] is True and len(report['groups']) == 4
    files, originals, omissions = {}, {}, {}

    def add(name, data):
        assert safe_member(name) and not exclusion_reason(name), 'Unsafe/private member: ' + name
        assert name.casefold() not in {n.casefold() for n in files}, 'Duplicate member'
        assert not name.lower().endswith(('.class', '.jar', '.cypher')) and 'labels.' not in name.lower()
        assert name.lower() not in {'project_context.md', 'full_project_context_2026-10-18.md'}
        files[name] = data

    def copy(name, path):
        path = extended_path(path)
        assert path.is_file() and not path.is_symlink()
        content = path.read_bytes()
        originals[path] = sha(content)
        if name in files:
            assert files[name] == content
        else:
            add(name, content)

    def manifested(directory, prefix):
        directory = extended_path(directory)
        copy(prefix + '/SHA256SUMS.txt', directory / 'SHA256SUMS.txt')
        for name, expected in parse_manifest((directory / 'SHA256SUMS.txt').read_bytes()):
            path = directory / name
            content = path.read_bytes()
            assert sha(content) == expected, 'Original hash mismatch: ' + name
            if name.endswith('.class'):
                omissions[prefix + '/' + name] = {'path': prefix + '/' + name, 'sha256': expected, 'bytes': len(content),
                    'reason': 'compiled_measurement_harness_class_omitted_not_needed_for_reading_raw'}
            else:
                copy(prefix + '/' + name, path)

    def runtime_tree(directory, prefix):
        manifested(directory, prefix)
        for child in ['compile', 'groups/baseline-r1', 'groups/baseline-r2', 'groups/mutated-r1', 'groups/mutated-r2']:
            if (directory / child / 'SHA256SUMS.txt').is_file():
                manifested(directory / child, prefix + '/' + child)

    runtime_tree(run, 'runtime')
    runtime_tree(FAILED, 'history/decoder-failed-run')
    manifested(CANDIDATE, 'candidate')
    source_index = dict(parse_manifest((ORIGINAL / 'SHA256SUMS.txt').read_bytes()))
    assert sha((ORIGINAL / 'SHA256SUMS.txt').read_bytes()) == '4c493b6d42f96784e9eec71ce46cb73e43f5a4386d277ef1d099a5d18cb5badb'
    gateway = 'spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/'
    source_files = [gateway + name for name in ['application/VisitsServiceClient.java', 'boundary/web/ApiGatewayController.java',
        'dto/OwnerDetails.java', 'dto/PetDetails.java', 'dto/PetType.java', 'dto/Visits.java', 'dto/VisitDetails.java']]
    source_files += ['spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java']
    sources = []
    for snapshot in ['baseline', 'mutated']:
        for path in source_files:
            name = 'source/' + snapshot + '/' + path
            content = extended_path(ORIGINAL / name).read_bytes()
            assert sha(content) == source_index[name]
            copy(name, ORIGINAL / name)
            sources.append({'path': name, 'sha256': sha(content), 'original_packet_path': name})
    add('SOURCE_PROVENANCE.json', json_bytes({'source_packet_manifest_sha256': sha((ORIGINAL / 'SHA256SUMS.txt').read_bytes()),
        'source_commit': '3858f9c630cf989bb6809a86edf47c2be78dc9f1', 'selected_files': sources,
        'scope': 'selected source files only, no full-repository or label-completeness claim'}))
    for dest, source in {
        'START_HERE.md': 'tasks/p02-handoff/HELPER_PACKET_START_HERE.md',
        'templates/HUMAN_CHECK_SUPPLEMENT_TEMPLATE.md': 'tasks/p02-handoff/HUMAN_CHECK_SUPPLEMENT_TEMPLATE.md',
        'tooling/scripts/verify_p02_helper_packet.mjs': 'scripts/verify_p02_helper_packet.mjs',
        'tooling/scripts/verify_project_transfer.mjs': 'scripts/verify_project_transfer.mjs',
        'tooling/pipeline/p02/helper-supplement.mjs': 'pipeline/p02/helper-supplement.mjs',
        'decisions/INPUT_LOCK_2026-10-24.json': 'benchmark/p02/decisions/INPUT_LOCK_2026-10-24.json',
        'decisions/PETCLINIC_PRE_REVIEW_2026-10-24.json': 'benchmark/p02/decisions/PETCLINIC_PRE_REVIEW_2026-10-24.json'
    }.items():
        copy(dest, ROOT / source)
    copy('protocol/benchmark_protocol_v0.2.md', ORIGINAL / 'protocol/benchmark_protocol_v0.2.md')
    scanner = Scanner(max_depth=9, max_expanded_bytes=256*1024*1024)
    for name, content in files.items():
        scanner.scan(name, content)
    add('META/security-scan.json', json_bytes(scanner.summary()))
    inventory = {name: {'path': name, 'sha256': sha(content), 'bytes': len(content)} for name, content in files.items()}
    historical = history_ledger(inventory, lambda name: files[name], omissions)
    assert len(omissions) == 2 and all(name.endswith('.class') for name in omissions), 'Unexpected missing evidence'
    head = subprocess.check_output(['git', '-c', 'safe.directory=' + ROOT.as_posix(), '--no-optional-locks', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    branch = subprocess.check_output(['git', '-c', 'safe.directory=' + ROOT.as_posix(), '--no-optional-locks', 'branch', '--show-current'], cwd=ROOT, text=True).strip()
    metadata = {'schema': 'code-graphrag-project-transfer/1', 'profile': 'full', 'status': 'snapshot_not_research_approval',
        'package_role': 'phat_p02_helper_supplement_source_runtime_only', 'source_head': head, 'source_branch': branch,
        'git_directory_included': False, 'api_credentials_included': False, 'research_approval': False, 'official_scoring_authorized': False,
        'files': [inventory[name] for name in sorted(inventory)], 'omissions': [omissions[name] for name in sorted(omissions)],
        'historical_manifests': historical, 'source_packet_manifest_sha256': sha((ORIGINAL / 'SHA256SUMS.txt').read_bytes()),
        'runtime_run_id': run.name, 'runtime_manifest_sha256': sha((run / 'SHA256SUMS.txt').read_bytes()),
        'failed_measurement_run_retained': FAILED.name, 'measurement_version': '2',
        'excluded': ['draft/gold labels', 'CIA parser/graph/retrieval/predictions/scores', 'coordinator behavioral conclusions',
                     'application binaries/images', 'JDK/Maven/model cache', 'compiled harness classes'],
        'limitations': ['Local uncommitted tool snapshots are not represented by source_head alone',
                       'Strict human source-first or annotation acceptance not certified',
                       'Targeted helper invocations, no production callback tracing', 'Raw owner retained; consumer PetType.id projection explicitly logged']}
    add('META/transfer.json', json_bytes(metadata))
    add('SHA256SUMS.txt', ''.join(sha(files[name]) + '  ' + name + '\n' for name in sorted(files)).encode('ascii'))
    final_scan = Scanner(max_depth=9, max_expanded_bytes=256*1024*1024)
    for name, content in files.items():
        final_scan.scan(name, content)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
    output = ROOT / 'handoff-out/p02-helper-packet' / stamp
    packet = extended_path(output / 'P02_HELPER_SUPPLEMENT')
    packet.mkdir(parents=True, exist_ok=False)
    for name, content in files.items():
        target = packet / name
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open('xb') as stream:
            stream.write(content)
    archive = output / 'P02_HELPER_SUPPLEMENT_2026-10-25.zip'
    with zipfile.ZipFile(archive, 'x', zipfile.ZIP_DEFLATED, compresslevel=6) as zip_out:
        for name in sorted(files):
            info = zipfile.ZipInfo(name, (2026, 10, 25, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            zip_out.writestr(info, files[name])
    archive_hash = sha(archive.read_bytes())
    (output / (archive.name + '.sha256')).write_text(archive_hash + '  ' + archive.name + '\n', encoding='ascii', newline='\n')
    relocated = extended_path(output / 'ZIP_VERIFIED')
    relocated.mkdir()
    with zipfile.ZipFile(archive) as zip_in:
        assert zip_in.testzip() is None
        for item in zip_in.infolist():
            assert safe_member(item.filename) and not item.flag_bits & 1
            target = relocated / item.filename
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open('xb') as stream:
                stream.write(zip_in.read(item))
    verification = subprocess.run(['node', str(output / 'ZIP_VERIFIED/tooling/scripts/verify_p02_helper_packet.mjs'), '--root', str(output / 'ZIP_VERIFIED'), '--records'],
        cwd=ROOT, capture_output=True, text=True, encoding='utf-8', check=True)
    for path, expected in originals.items():
        assert sha(path.read_bytes()) == expected, 'Original changed during packaging'
    delivery = {'status': 'packet_ready_not_annotation_or_review', 'archive': str(archive), 'zip_sha256': archive_hash, 'zip_bytes': archive.stat().st_size,
        'root_manifest_sha256': sha(files['SHA256SUMS.txt']), 'packet_files': len(files), 'omitted_compiled_harness_classes': len(omissions),
        'relocated_verification': json.loads(verification.stdout), 'security_scan': final_scan.summary(), 'original_files_unchanged': True,
        'labels_created_or_changed': False, 'sent_to_phat': False}
    (output / 'DELIVERY_REPORT.json').write_bytes(json_bytes(delivery))
    print(json.dumps({k: v for k, v in delivery.items() if k != 'relocated_verification'}, indent=2))


if __name__ == '__main__':
    main()
