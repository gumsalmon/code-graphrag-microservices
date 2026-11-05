"""Assemble two short-path, offline review ZIPs from the checked private allowlist."""
from datetime import datetime,timezone
import base64
import hashlib
import html
import json
from pathlib import Path
import stat
import uuid
import zipfile
from package_project_transfer import extended_path,parse_manifest
from transfer_security import safe_member
from prepare_petclinic_review_data_20261105 import ReviewScanner

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'handoff-out/petclinic-review-data-preparation/20261105T090449Z-73003c34'
SOURCE_MANIFEST='0fa1584d42f89dd2a5b6cc39bb3d1df1d1f5fa942cf0cd8433348dd3fb2bfc97'
TEMPLATES=ROOT/'tasks/petclinic-review-release'
PINS={'source_commit':'3858f9c630cf989bb6809a86edf47c2be78dc9f1','config_commit':'323993ce2519c6d02df63e08bf4458d123d3b611'}
LABELS={'P01':('labels.v3.json','v3','3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce'),
 'P02':('labels.draft.v4.json','draft.v4','c22e97a5a3a6994cb0c7961c5a42ed098301b106d36ab57536a486077c456f08'),
 'P03':('labels.draft.v2.json','draft.v2','61edca6397a52a5076d3531cecf775d0052e0e7053163165e99110de14222732')}
def raw(p):return extended_path(p).read_bytes()
def sha(b):return hashlib.sha256(b).hexdigest()
def js(x):return (json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode()
def load(p):return json.loads(raw(p).decode('utf-8-sig'))

def index_html(rows,round_):
    script="""const rows=[...document.querySelectorAll('tbody tr')];const input=document.getElementById('search');function filter(){const terms=input.value.toLocaleLowerCase().trim().split(/\\s+/).filter(Boolean);let count=0;for(const row of rows){const show=terms.every(t=>row.dataset.search.includes(t));row.hidden=!show;count+=show;}document.getElementById('count').textContent=count+' file';}input.addEventListener('input',filter);filter();"""
    style="""*{box-sizing:border-box}body{font:16px/1.55 system-ui,sans-serif;margin:0;color:#182b42;background:#f6f8fb}main{max-width:1150px;margin:auto;padding:24px}h1{line-height:1.2}a{color:#125abc}nav{display:flex;gap:16px;flex-wrap:wrap}input{font:inherit;width:100%;padding:12px;border:1px solid #8596a8;border-radius:6px;background:white}table{width:100%;border-collapse:collapse;margin-top:16px;background:white;table-layout:fixed}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #dce3eb;padding:10px;overflow-wrap:anywhere}th:first-child{width:70px}th:last-child{width:80px}small{color:#52677e}code{font-size:12px}summary{cursor:pointer}@media(max-width:600px){main{padding:14px}th,td{padding:7px;font-size:14px}}"""
    hs=base64.b64encode(hashlib.sha256(script.encode()).digest()).decode();hc=base64.b64encode(hashlib.sha256(style.encode()).digest()).decode()
    body=[]
    for row in rows:
        search=' '.join([row['case'],row['logical_path'],row['origin'] or '',row['sha256']]).lower()
        detail=html.escape(row['logical_path'])+'<br><small>SHA-256: <code>'+row['sha256']+'</code></small>'
        if row['origin']:detail+='<details><summary>Đường dẫn gốc</summary><small>'+html.escape(row['origin'])+'</small></details>'
        body.append('<tr data-search="'+html.escape(search,quote=True)+'"><td>'+row['case']+'</td><td>'+detail+'</td><td><a href="'+row['stored_path']+'">Mở</a></td></tr>')
    title='PetClinic · lượt '+str(round_)
    condition='Lưu notes/exposure/checkpoint trước khi nhận lượt 2.' if round_==1 else 'Chỉ đọc sau khi đã lưu notes/exposure/checkpoint lượt 1. Nhãn hiện hành vẫn pending_review.'
    return (f'<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'sha256-{hs}\'; style-src \'sha256-{hc}\'; connect-src \'none\'; base-uri \'none\'; form-action \'none\'"><title>{title}</title><style>{style}</style><main><h1>{title}</h1><p>{condition}</p><p>Mở START_HERE.md để đọc đầy đủ. Mọi file đều dùng offline; không cần Docker hoặc API key.</p><nav><a href="START_HERE.md">Hướng dẫn</a><a href="CASES.md">Phạm vi ba ca</a><a href="VERIFYING.md">Kiểm checksum</a><a href="HOW_TO_RETURN.md">Hồ sơ trả lại</a>'+('<a href="CURRENT_DRAFTS.md">Ba nhãn hiện hành</a>' if round_==2 else '')+'</nav><p><label for="search">Tìm case, tên file, đoạn đường dẫn hoặc SHA-256</label><input id="search" type="search" placeholder="Ví dụ: P03 OwnerDetails" autocomplete="off"></p><p id="count" aria-live="polite"></p><table><thead><tr><th>Ca</th><th>Logical path / hash</th><th>File</th></tr></thead><tbody>'+''.join(body)+'</tbody></table><p>Tên lưu trữ ngắn để tránh giới hạn đường dẫn. Các trích dẫn trong file giữ đường dẫn gốc; tìm ở bảng này và đối chiếu snapshot/hash.</p></main><script>'+script+'</script></html>').encode()

def main():
    manifest=raw(SOURCE/'SHA256SUMS.txt');assert sha(manifest)==SOURCE_MANIFEST
    members=dict(parse_manifest(manifest));catalog=load(SOURCE/'ALLOWLIST.json');omissions=load(SOURCE/'OMISSIONS.json')
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8]
    out=ROOT/'handoff-out/petclinic-review-packages'/stamp;out.mkdir(parents=True,exist_ok=False)
    scanner=ReviewScanner();inputs={};results=[];r1=None
    def selected(path):
        name=path.relative_to(SOURCE).as_posix();assert name in members
        b=raw(path);assert sha(b)==members[name];inputs[name]=sha(b);return b
    def write(root,name,b):
        assert safe_member(name)
        p=root/name;p.parent.mkdir(parents=True,exist_ok=True)
        with p.open('xb') as f:f.write(b)
    for round_,source_name in [(1,'R1-source-first'),(2,'R2-label-comparison')]:
        name='PETCLINIC_R'+str(round_)+('_SOURCE_FIRST' if round_==1 else '_LABEL_COMPARISON')
        package=out/name;package.mkdir();files=[];payloads={}
        for row in catalog:
            if row['round']!=source_name or not row['path'].split('/')[0].startswith('P0'):continue
            b=selected(SOURCE/source_name/row['path']);assert sha(b)==row['sha256']
            # Preserve logical/original paths in the index; flatten physical paths.
            case=row['path'].split('/')[0].split('-')[0];assert case in ('P01','P02','P03')
            scanner.scan(source_name+'/'+row['path'],b)
            stored='artifacts/'+row['sha256']+'.txt'
            if stored not in payloads:write(package,stored,b);payloads[stored]=row['sha256']
            files.append({'case':case,'logical_path':row['path'],'origin':row['origin'],'stored_path':stored,
                'sha256':row['sha256'],'bytes':len(b),'derived_from_origin':row['derived']})
        index={'schema':'petclinic-review-evidence-index/1','review_round':round_,'storage':'content-addressed-short-path-text; original bytes preserved','files':files}
        index_bytes=js(index);write(package,'EVIDENCE_INDEX.json',index_bytes)
        for doc in ['CASES.md','VERIFYING.md','HOW_TO_RETURN.md','EXPOSURE_TEMPLATE.md','VERIFY_PACKAGE.py','VERIFY_PACKAGE.ps1']:
            b=raw(TEMPLATES/doc);inputs['templates/'+doc]=sha(b);write(package,doc,b)
        start='START_R1.md' if round_==1 else 'START_R2.md';b=raw(TEMPLATES/start);inputs['templates/'+start]=sha(b);write(package,'START_HERE.md',b)
        forms=['NOTES_TEMPLATE.md','CHECKPOINT_TEMPLATE.md'] if round_==1 else ['COMPARISON_TEMPLATE.md','DECISION_TEMPLATE.md']
        for doc in forms:
            p=ROOT/'tasks/petclinic-review-draft'/('round-1' if round_==1 else 'round-2')/doc
            b=raw(p);inputs['templates/'+doc]=sha(b);write(package,doc,b)
        package_id='PETCLINIC-R'+str(round_)+'-20261105-'+stamp[-8:]
        meta={'schema':'petclinic-review-package/1','package_version':'1.0.0','package_id':package_id,'review_round':round_,
            'prepared_date':'2026-11-05','prepared_utc':datetime.now(timezone.utc).isoformat(),**PINS,
            'purpose':'Independent source-first benchmark evidence review, then draft comparison',
            'distribution_state':'assembled_not_sent','reviewer':None,'review_decision':None,'ground_truth_accepted':False,
            'model_calls':0,'official_scoring':False,'final_test_locked':False,'shared_draft_contract_adopted':False,
            'evidence_index_sha256':sha(index_bytes),'logical_evidence_files':len(files),'unique_payload_files':len(payloads),
            'case_ids':['P01','P02','P03'],'physical_storage_note':'Payload bytes unchanged; logical paths/refs retained in index; identical bytes deduplicated',
            'scope_note':'Development pilot cases; no claim of unseen-test status, complete runtime replay or certified blinding'}
        if round_==2:
            meta.update({'required_round1_package_id':r1['package_id'],'required_round1_manifest_sha256':r1['manifest_sha256'],
                         'reading_condition':'Retained R1 notes/exposure/checkpoint before receiving or reading R2'})
            current=[];lines=['# Nhãn nháp hiện hành','', 'Chỉ đối chiếu các version/hash dưới đây. Các file khác trong history là records cũ; nhãn hiện hành vẫn pending_review.','']
            lookup={r['logical_path']:r for r in files}
            for case,(label,version,h) in LABELS.items():
                row=lookup[case+'/'+label];assert row['sha256']==h
                current.append({'case':case,'version':version,'sha256':h,'logical_path':row['logical_path'],'stored_path':row['stored_path'],'status':'pending_review'})
                lines.append('- ['+case+' '+version+']('+row['stored_path']+'): `'+h+'`.')
            meta['current_drafts']=current;write(package,'CURRENT_DRAFTS.md',('\n'.join(lines)+'\n').encode())
        write(package,'PACKAGE_METADATA.json',js(meta));write(package,'INDEX.html',index_html(files,round_))
        own_omissions=[r for r in omissions if r['round']==source_name]
        write(package,'OMISSIONS.json',js({'scope':'Selected input evidence only; historical manifests may refer to omitted executable/audit/binary members','entries':own_omissions}))
        paths=sorted(p.relative_to(package).as_posix() for p in package.rglob('*') if p.is_file())
        checksum=''.join(sha(raw(package/p))+'  '+p+'\n' for p in paths).encode('ascii');write(package,'SHA256SUMS.txt',checksum)
        zip_path=out/(name+'_2026-11-05.zip')
        with zipfile.ZipFile(zip_path,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
            for p in sorted(package.rglob('*')):
                if not p.is_file():continue
                member=p.relative_to(package).as_posix();assert safe_member(member) and len(member)<=100
                info=zipfile.ZipInfo(member,(2026,11,5,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=(stat.S_IFREG|0o600)<<16
                archive.writestr(info,raw(p))
        zip_hash=sha(raw(zip_path));(out/(zip_path.name+'.sha256')).write_text(zip_hash+'  '+zip_path.name+'\n',encoding='ascii')
        record={'review_round':round_,'package_id':package_id,'directory':package.relative_to(ROOT).as_posix(),
            'archive':zip_path.relative_to(ROOT).as_posix(),'archive_sha256':zip_hash,'archive_bytes':zip_path.stat().st_size,
            'manifest_sha256':sha(checksum),'manifest_listed_files':len(paths),'logical_evidence_files':len(files),
            'unique_payload_files':len(payloads),'max_member_path_length':max(len(p) for p in paths+['SHA256SUMS.txt']),
            'sent':False,'review_decision':None}
        if round_==1:r1=record
        results.append(record)
    assert sha(raw(SOURCE/'SHA256SUMS.txt'))==SOURCE_MANIFEST
    for name,h in inputs.items():
        if not name.startswith('templates/'):assert sha(raw(SOURCE/name))==h
    (out/'INPUT_IDENTITIES.json').write_bytes(js(inputs));(out/'SECURITY_SCAN.json').write_bytes(js(scanner.summary()))
    result={'record_date':'2026-11-05','status':'two_review_packages_assembled_not_sent','directory':out.relative_to(ROOT).as_posix(),
        'packages':results,'reviewer':None,'round1_notes_received':False,'round2_delivery_allowed_by_this_file':False,
        'labels_accepted':False,'model_calls':0,'official_scoring':False,'github_push':False}
    (out/'RESULT.json').write_bytes(js(result));print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':main()
