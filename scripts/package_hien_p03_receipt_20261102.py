"""Role-filtered P03 technical inputs/receipt. No annotation data or method outcome oracle."""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import uuid
import zipfile

from package_project_transfer import extended_path, json_bytes, parse_manifest
from transfer_security import Scanner, safe_member, exclusion_reason

ROOT = Path(__file__).resolve().parent.parent
CANDIDATE = ROOT / 'handoff-out/p03-preparation/20261024T190227112Z-a8e852db'
CODE = ROOT / 'handoff-out/team-returns-20261101/20261101T054957Z-a801d6ca/hien/received/code'
RECEIPT = ROOT / 'tasks/hien-next/P03_TECHNICAL_RECEIPT_2026-11-02.json'
ENV = {k:v for k,v in os.environ.items() if k.upper() in {'PATH','PATHEXT','SYSTEMROOT','WINDIR','TEMP','TMP','COMSPEC'}}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
    out = ROOT / 'handoff-out/hien-p03-receipt' / stamp
    out.mkdir(parents=True, exist_ok=False)
    files, origins = {}, []

    def add(name, raw):
        assert safe_member(name) and exclusion_reason(name) is None
        assert name.casefold() not in {x.casefold() for x in files}
        assert not any(part.lower() in {'labels','notes','paired','phat','predictions','scores'} for part in name.split('/'))
        assert not name.lower().endswith(('.jar','.class','.tar','.clixml','.cypher'))
        files[name] = raw

    def copy(name, source):
        source = extended_path(source)
        assert source.is_file() and not source.is_symlink()
        raw = source.read_bytes()
        add(name, raw)
        origins.append({'packet_path':name, 'source_path':str(source), 'sha256':sha(raw), 'bytes':len(raw)})

    assert sha(RECEIPT.read_bytes()) == 'b73e4dd44a1cbd9ffe05d148d2c0742f4ab685cb4c7a4cac7b949ed4d429ce20'
    receipt = json.loads(RECEIPT.read_bytes())
    assert receipt['status'] == 'ready_for_offline_integration' and receipt['case'] == 'P03'
    copy('TASK_HIEN.md', ROOT / 'tasks/hien-next/TASK_P03_RECEIPT_2026-11-02.md')
    copy('P03_TECHNICAL_RECEIPT_2026-11-02.json', RECEIPT)
    copy('decisions/D20.json', ROOT / 'benchmark/decisions/PETCLINIC_DRAFT_INTEGRATION_2026-10-31.json')
    copy('decisions/D19.json', ROOT / 'benchmark/p03/decisions/INPUT_LOCK_2026-10-31.json')
    manifest = (CANDIDATE / 'SHA256SUMS.txt').read_bytes()
    assert sha(manifest) == receipt['case_inputs']['candidate_manifest_sha256']
    copy('candidate/SHA256SUMS.txt', CANDIDATE / 'SHA256SUMS.txt')
    for name, expected in parse_manifest(manifest):
        source = extended_path(CANDIDATE / name)
        assert sha(source.read_bytes()) == expected
        copy('candidate/' + name, source)
    for source in CODE.rglob('*'):
        if source.is_file():
            copy('implementation-reference/' + source.relative_to(CODE).as_posix(), source)
    copy('implementation-reference/requirements.txt', ROOT / 'handoff-out/hien-synthetic-preparation/20261028T131851Z-9d11fc97/implementation/requirements.txt')
    assert sha(files['implementation-reference/src/parser.py']) == receipt['implementation_parser_sha256']
    assert sha(files['implementation-reference/src/neo4j_importer.py']) == receipt['implementation_importer_sha256']
    copy('tooling/scripts/verify_project_transfer.mjs', ROOT / 'scripts/verify_project_transfer.mjs')
    add('START_HERE.md', '''# P03 — mốc kỹ thuật sau checkpoint

1. Kiểm `node tooling/scripts/verify_project_transfer.mjs --root .` tại thư mục giải nén.
2. Đọc TASK_HIEN.md, receipt và decisions/D20.json; đối chiếu input hashes với decisions/D19.json.
3. Làm mốc C từng phần, giữ bản sửa P02 và nhánh hiện có. implementation-reference là bản tham chiếu từng bàn giao, không thay code mới.
4. Trả extraction/inventory/unsupported trước nếu DB chưa sẵn sàng; sau đó DB/parity/retrieval cùng log/hash/cleanup.

Gói chỉ có source/input/receipt và code tham chiếu. Không có nhãn, notes annotator,
raw outcome benchmark, prediction hoặc score. Source baseline và mutated có mục
đích diagnostic riêng; không dùng mutated source như primary static prediction input.
Các flags/path máy nguồn trong candidate là provenance frozen, quyền hiện hành nằm
ở receipt/D20. Không sửa candidate để phản ánh tiến độ, không yêu cầu cùng ổ đĩa.

Không có .git, image/cache, full app repository/JAR/DB hoặc full runtime replay.
Chỉ dùng cache/image đã có; không tải mới, gọi model/embedding, scoring, accepted,
test lock, áp contract output nháp, push/merge. Không cần xem ZIP annotation.
'''.encode('utf-8'))
    add('provenance/SELECTED_FILES.json', json_bytes({'scope':'P03 locked technical source/input and filtered checked receipt; not complete workspace/runtime replay',
        'candidate_manifest_sha256':sha(manifest), 'receipt_sha256':sha(RECEIPT.read_bytes()), 'files':origins,
        'labels_annotation_notes_and_raw_benchmark_outcomes_included':False, 'sent':False, 'recipient_acknowledged':False}))
    scan = Scanner(max_expanded_bytes=32*1024*1024)
    for name, raw in files.items():
        scan.scan(name, raw)
    assert not scan.summary()['failures']
    add('META/security-scan.json', json_bytes(scan.summary()))
    git = ['git','-c','safe.directory='+ROOT.as_posix(),'-c','core.fsmonitor=false','--no-optional-locks']
    head = subprocess.check_output([*git,'rev-parse','HEAD'],cwd=ROOT,env=ENV,text=True).strip()
    branch = subprocess.check_output([*git,'branch','--show-current'],cwd=ROOT,env=ENV,text=True).strip()
    inventory = [{'path':n,'sha256':sha(files[n]),'bytes':len(files[n])} for n in sorted(files)]
    add('META/transfer.json',json_bytes({'schema':'code-graphrag-project-transfer/1','profile':'full','status':'snapshot_not_research_approval',
        'package_role':'hien_p03_checked_receipt_and_source_inputs','source_head':head,'source_branch':branch,
        'git_directory_included':False,'api_credentials_included':False,'research_approval':False,'official_scoring_authorized':False,
        'files':inventory,'historical_manifests':[{'path':'candidate/SHA256SUMS.txt','verified':len(parse_manifest(manifest)),'omitted':0}],'omissions':[],
        'limitations':['Selected technical materials, no annotation/raw outcome or full runtime replay',
                       'Reference implementation is previously checked, not necessarily the recipient latest branch'],
        'packet_sent':False,'recipient_acknowledged':False}))
    add('SHA256SUMS.txt',''.join(sha(files[n])+'  '+n+'\n' for n in sorted(files)).encode('ascii'))
    archive = out / 'P03_HIEN_TECHNICAL_2026-11-02.zip'
    with zipfile.ZipFile(archive,'x',zipfile.ZIP_DEFLATED) as z:
        for name, raw in sorted(files.items()):
            info = zipfile.ZipInfo(name,(2026,11,2,0,0,0))
            info.external_attr=(stat.S_IFREG|0o644)<<16
            info.compress_type=zipfile.ZIP_DEFLATED
            z.writestr(info,raw)
    digest = sha(archive.read_bytes())
    (out/(archive.name+'.sha256')).write_text(digest+'  '+archive.name+'\n',encoding='ascii',newline='\n')
    zscan = Scanner(max_expanded_bytes=32*1024*1024)
    zscan.scan(archive.name, archive.read_bytes())
    assert not zscan.summary()['failures']
    (out/'ZIP_SECURITY_SCAN.json').write_bytes(json_bytes(zscan.summary()))
    relocated = extended_path(out/'ZIP_VERIFIED')
    relocated.mkdir()
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        for item in z.infolist():
            assert safe_member(item.filename) and stat.S_IFMT(item.external_attr>>16) == stat.S_IFREG
            dest = relocated/item.filename
            dest.parent.mkdir(parents=True,exist_ok=True)
            with dest.open('xb') as stream:
                stream.write(z.read(item))
    # Use ordinary executable argv paths; extended paths are for filesystem access.
    args = [str(out/'ZIP_VERIFIED/tooling/scripts/verify_project_transfer.mjs'),'--root',str(out/'ZIP_VERIFIED')]
    result = subprocess.run(['node',*args],cwd=ROOT,env=ENV,capture_output=True)
    (out/'relocated.stdout.log').write_bytes(result.stdout)
    (out/'relocated.stderr.log').write_bytes(result.stderr)
    (out/'relocated.command.json').write_bytes(json_bytes({'program':'node','args':args,'exit_code':result.returncode}))
    assert result.returncode == 0 and json.loads(result.stdout)['total_regular_files'] == len(files)
    for origin in origins:
        assert sha(extended_path(Path(origin['source_path'])).read_bytes()) == origin['sha256']
    report={'archive':archive.relative_to(ROOT).as_posix(),'sha256':digest,'bytes':archive.stat().st_size,'files':len(files),
            'manifest_sha256':sha(files['SHA256SUMS.txt']),'relocated_integrity_check_passed':True,
            'security_scan_passed':True,'labels_annotation_notes_or_raw_outcomes_included':False,
            'source_inputs_unchanged':True,'model_calls':0,'sent':False,'acknowledged':False}
    (out/'DELIVERY_REPORT.json').write_bytes(json_bytes(report))
    print(json.dumps(report,ensure_ascii=False))


if __name__ == '__main__':
    main()
