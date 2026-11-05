"""Selected technical P02 evidence + receipt for Hien. No draft labels or annotator notes."""
import hashlib
import json
from pathlib import Path
import os
import stat
import subprocess
import uuid
import zipfile
from datetime import datetime, timezone
from transfer_security import Scanner, safe_member, exclusion_reason
from package_project_transfer import extended_path, json_bytes

ROOT=Path(__file__).resolve().parent.parent
RUN=ROOT/'handoff-out/p02-offline-method/20261101t061314799z-a263deac'
RECEIVED=ROOT/'handoff-out/team-returns-20261101/20261101T054957Z-a801d6ca/hien/received/code'


def sha(data): return hashlib.sha256(data).hexdigest()


def main():
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8]
    out=ROOT/'handoff-out/hien-p02-next'/stamp;out.mkdir(parents=True,exist_ok=False)
    files={};origins=[]
    def add(name,data):
        assert safe_member(name) and exclusion_reason(name) is None and name.casefold() not in {x.casefold() for x in files}
        assert not name.lower().startswith(('labels.','notes/','phat/')) and not name.lower().endswith(('.jar','.tar','.clixml'))
        files[name]=data
    def copy(name,path):
        raw=path.read_bytes();add(name,raw);origins.append({'packet_path':name,'source_path':path.relative_to(ROOT).as_posix(),'sha256':sha(raw),'bytes':len(raw)})
    copy('TASK_HIEN.md',ROOT/'tasks/hien-next/TASK_P02_METADATA_INVENTORY_2026-11-01.md')
    copy('P02_TECHNICAL_RECEIPT_2026-11-01.json',ROOT/'tasks/hien-next/P02_TECHNICAL_RECEIPT_2026-11-01.json')
    copy('D20.json',ROOT/'benchmark/decisions/PETCLINIC_DRAFT_INTEGRATION_2026-10-31.json')
    copy('provenance/METHOD_INPUT.json',RUN/'input/INPUT.json')
    copy('provenance/INPUT_PROVENANCE.json',RUN/'INPUT_PROVENANCE.json')
    for snapshot in ['baseline','mutated']:
        for path in (RUN/'input'/snapshot).rglob('*.java'):
            copy('source/'+snapshot+'/'+path.relative_to(RUN/'input'/snapshot).as_posix(),path)
        for name in ['graph.native.json','extraction.json']:
            copy('evidence/'+snapshot+'/'+name,RUN/'artifacts'/snapshot/name)
        for name in ['parity.json','direct.first.json','cypher.first.json','direct.retrieval.json','cypher.retrieval.json']:
            copy('evidence/'+snapshot+'/'+name,RUN/'database'/snapshot/name)
    for path in RECEIVED.rglob('*'):
        if path.is_file(): copy('implementation/'+path.relative_to(RECEIVED).as_posix(),path)
    copy('implementation/requirements.txt',ROOT/'handoff-out/hien-synthetic-preparation/20261028T131851Z-9d11fc97/implementation/requirements.txt')
    copy('source/LICENSE.petclinic',(ROOT/'handoff-out/p02-phat-f03/20261024T111515Z-b98740ff/ZIP_VERIFIED/source/baseline/LICENSE'))
    copy('tooling/scripts/verify_project_transfer.mjs',ROOT/'scripts/verify_project_transfer.mjs')
    add('START_HERE.md',('''# P02 kỹ thuật — gói tiếp theo cho Hiển

Mở TASK_HIEN.md rồi kiểm `node tooling/scripts/verify_project_transfer.mjs --root .`.
Gói chứa receipt P02 đã được kiểm theo D20, candidate implementation nguyên byte,
source ba file mỗi snapshot và evidence kỹ thuật để sửa Class.name parity cùng
inventory explicit methods. Chưa có quyền P03/model/scoring hoặc áp shared contract draft.

Không gửi gói này sang Phát hoặc phiên AI lập nhãn. Không có nhãn/notes/gold path/score;
retrieval witness là đường đồ thị tự động của phương pháp, không là ground truth.
Không đưa evidence kỹ thuật vào context dự đoán hoặc xem thiếu node là negative.

Implementation là bản đã bàn giao, hãy sửa trong bản sao mới và giữ diff/hash.
Node verifier chỉ đọc, không chạy implementation/DB hoặc tự duyệt receipt.
Không có image/dependency/model cache, full app source/DB/JAR hoặc full replay runner.
Các đường dẫn máy nguồn trong JSON là provenance; map source bằng
extraction.native_source_map và source/<snapshot>/ thay vì yêu cầu cùng ổ đĩa.
Đã có kết quả kiểm ứng dụng cũ, không cần chạy lại HTTP/POST để sửa parser/importer.
''').encode('utf-8'))
    add('provenance/SELECTED_FILES.json',json_bytes({'original_runtime_manifest_sha256':sha((RUN/'SHA256SUMS.txt').read_bytes()),
        'scope':'Selected source/native/DB/retrieval evidence, no complete runtime bundle claim',
        'files':origins,'labels_and_annotation_notes_included':False,'full_runtime_replay_available':False}))
    scan=Scanner(max_expanded_bytes=32*1024*1024)
    for name,raw in files.items():scan.scan(name,raw)
    add('META/security-scan.json',json_bytes(scan.summary()))
    inventory=[{'path':n,'sha256':sha(files[n]),'bytes':len(files[n])}for n in sorted(files)]
    env={k:v for k,v in os.environ.items() if k.upper() in {'PATH','PATHEXT','SYSTEMROOT','WINDIR','TEMP','TMP','COMSPEC'}}
    git=['git','-c','safe.directory='+ROOT.as_posix(),'-c','core.fsmonitor=false','--no-optional-locks']
    head=subprocess.check_output([*git,'rev-parse','HEAD'],cwd=ROOT,env=env,text=True).strip()
    branch=subprocess.check_output([*git,'branch','--show-current'],cwd=ROOT,env=env,text=True).strip()
    add('META/transfer.json',json_bytes({'schema':'code-graphrag-project-transfer/1','profile':'full','status':'snapshot_not_research_approval',
        'package_role':'hien_p02_receipt_and_metadata_inventory_fix','source_head':head,'source_branch':branch,
        'git_directory_included':False,'api_credentials_included':False,'research_approval':False,'official_scoring_authorized':False,
        'files':inventory,'historical_manifests':[],'omissions':[],
        'limitations':['Selected technical materials only; not the complete research workspace or full app replay','Method witness paths are not gold impact paths; no labels included'],
        'packet_sent':False,'recipient_acknowledged':False}))
    add('SHA256SUMS.txt',''.join(sha(files[n])+'  '+n+'\n'for n in sorted(files)).encode('ascii'))
    archive=out/'P02_HIEN_TECHNICAL_2026-11-01.zip'
    with zipfile.ZipFile(archive,'x',zipfile.ZIP_DEFLATED)as z:
        for name,raw in sorted(files.items()):
            info=zipfile.ZipInfo(name,(2026,11,1,0,0,0));info.external_attr=(stat.S_IFREG|0o644)<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,raw)
    digest=sha(archive.read_bytes());(out/(archive.name+'.sha256')).write_text(digest+'  '+archive.name+'\n',encoding='ascii',newline='\n')
    zscan=Scanner(max_expanded_bytes=32*1024*1024);zscan.scan(archive.name,archive.read_bytes())
    (out/'ZIP_SECURITY_SCAN.json').write_bytes(json_bytes(zscan.summary()))
    extracted=extended_path(out/'ZIP_VERIFIED');extracted.mkdir()
    with zipfile.ZipFile(archive)as z:
        assert z.testzip()is None
        for item in z.infolist():
            assert safe_member(item.filename)and stat.S_IFMT(item.external_attr>>16)==stat.S_IFREG
            target=extracted/item.filename;target.parent.mkdir(parents=True,exist_ok=True)
            with target.open('xb')as stream:stream.write(z.read(item))
    args=[str(out/'ZIP_VERIFIED/tooling/scripts/verify_project_transfer.mjs'),'--root',str(out/'ZIP_VERIFIED')]
    r=subprocess.run(['node',*args],cwd=ROOT,env=env,capture_output=True)
    (out/'relocated.stdout.log').write_bytes(r.stdout);(out/'relocated.stderr.log').write_bytes(r.stderr)
    (out/'relocated.command.json').write_bytes(json_bytes({'program':'node','args':args,'exit_code':r.returncode}))
    assert r.returncode==0 and json.loads(r.stdout)['total_regular_files']==len(files),'Relocated verifier failed'
    for origin in origins:assert sha((ROOT/origin['source_path']).read_bytes())==origin['sha256'],'Original changed'
    report={'archive':str(archive),'sha256':digest,'bytes':archive.stat().st_size,'files':len(files),'manifest_sha256':sha(files['SHA256SUMS.txt']),
        'relocated_verified':True,'security_scan':zscan.summary(),'sent':False,'acknowledged':False,'model_calls':0,'labels_included':False}
    (out/'DELIVERY_REPORT.json').write_bytes(json_bytes(report));print(json.dumps({k:v for k,v in report.items()if k!='security_scan'},ensure_ascii=False,indent=2))


if __name__=='__main__':main()
