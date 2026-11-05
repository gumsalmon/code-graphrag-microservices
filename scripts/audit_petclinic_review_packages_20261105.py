"""Check source-to-package mapping and safely relocate the ZIPs for independent tests."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import re
import shutil
import stat
import zipfile
from package_project_transfer import extended_path,parse_manifest
from transfer_security import safe_member
from prepare_petclinic_review_data_20261105 import ReviewScanner

ROOT=Path(__file__).resolve().parent.parent
BUILD=ROOT/'handoff-out/petclinic-review-packages/20261105T093250Z-45a9dd18'
AUDIT=ROOT/'handoff-out/petclinic-review-package-audit/20261105T093415Z-d1bebdf9'
DATA=ROOT/'handoff-out/petclinic-review-data-preparation/20261105T090449Z-73003c34'
def raw(p):return extended_path(p).read_bytes()
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(raw(p).decode('utf-8-sig'))
def save(name,obj):
    with (AUDIT/name).open('x',encoding='utf-8',newline='\n') as f:json.dump(obj,f,ensure_ascii=False,indent=2);f.write('\n')

def main():
    build=load(BUILD/'RESULT.json');catalog=load(DATA/'ALLOWLIST.json');scanner=ReviewScanner();groups=[]
    catalog={(r['round'],r['path']):r for r in catalog}
    assert sha(raw(DATA/'SHA256SUMS.txt'))=='0fa1584d42f89dd2a5b6cc39bb3d1df1d1f5fa942cf0cd8433348dd3fb2bfc97'
    for package in build['packages']:
        root=ROOT/package['directory'];round_=package['review_round'];role='R1-source-first' if round_==1 else 'R2-label-comparison'
        manifest=parse_manifest(raw(root/'SHA256SUMS.txt'));assert sha(raw(root/'SHA256SUMS.txt'))==package['manifest_sha256']
        for name,h in manifest:assert sha(raw(root/name))==h
        index=load(root/'EVIDENCE_INDEX.json');expected={path for r,path in catalog if r==role and path.split('/')[0].startswith('P0')}
        assert {r['logical_path'] for r in index['files']}==expected
        for row in index['files']:
            source=catalog[role,row['logical_path']];b=raw(root/row['stored_path'])
            assert row['sha256']==source['sha256']==sha(b) and b==raw(DATA/role/row['logical_path'])
        for name,h in manifest:
            # Raw artifact scan uses the already vetted logical identity and exact bytes.
            if name.startswith('artifacts/'):continue
            scanner.scan(name,raw(root/name))
        for row in index['files']:scanner.scan(role+'/'+row['logical_path'],raw(root/row['stored_path']))
        text=raw(root/'INDEX.html').decode('utf-8')
        for href in re.findall(r'href="([^"]+)"',text):
            href=html.unescape(href);assert safe_member(href) and (root/href).is_file()
        archive=ROOT/package['archive'];assert sha(raw(archive))==package['archive_sha256']
        # The simulated other machine has spaces and non-ASCII characters in its path.
        relocated=ROOT/'handoff-out/review-portability-45a9dd18'/'Máy khác có khoảng trắng'/('R'+str(round_))
        relocated.mkdir(parents=True,exist_ok=False)
        with zipfile.ZipFile(archive) as z:
            members=z.infolist();names=set()
            for item in members:
                name=item.filename
                assert safe_member(name) and name.casefold() not in names and len(name)<=100
                assert stat.S_IFMT(item.external_attr>>16)==stat.S_IFREG and not item.flag_bits&1
                names.add(name.casefold());dest=relocated/name;dest.parent.mkdir(parents=True,exist_ok=True)
                with dest.open('xb') as f:f.write(z.read(item))
            assert z.testzip() is None
        assert names=={name.casefold() for name,h in manifest}|{'sha256sums.txt'}
        max_path=max(len(str(p)) for p in relocated.rglob('*') if p.is_file());assert max_path<240
        groups.append({'review_round':round_,'logical_files_verified':len(index['files']),'physical_files':len(manifest),
            'archive_crc_and_members_verified':True,'relocated_root':relocated.relative_to(ROOT).as_posix(),
            'max_relocated_absolute_path_chars':max_path,'static_html_links_verified':True})
    save('PACKAGE_MAPPING_AND_PORTABILITY.json',{'groups':groups,'source_bytes_unchanged':True,'security_scan':scanner.summary(),
        'scope':'Integrity and bounded content/role checks, not certified human review, blindness or label acceptance'})
    # Separate intentional failure fixtures, never modifying a real package or archive.
    r1=ROOT/build['packages'][0]['directory']
    for name in ['tampered-r1','unexpected-r1']:
        shutil.copytree(r1,AUDIT/name)
    victim=next((AUDIT/'tampered-r1/artifacts').iterdir())
    with victim.open('ab') as f:f.write(b'\nintentional tamper probe\n')
    (AUDIT/'unexpected-r1/unexpected.txt').write_text('intentional extra-file probe\n',encoding='ascii')
    (AUDIT/'synthetic-notes.md').write_text('Synthetic verifier fixture only; no real reviewer or assessment.\n',encoding='utf-8')
    (AUDIT/'synthetic-exposure.md').write_text('Synthetic test fixture; not a human review record.\n',encoding='utf-8')
    print(json.dumps({'packages_verified':2,'logical_files_verified':sum(g['logical_files_verified'] for g in groups),
        'relocated_groups':groups,'security_failures':scanner.summary()['failures']},ensure_ascii=False))

if __name__=='__main__':main()
