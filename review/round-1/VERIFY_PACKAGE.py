"""Offline standard-library verifier. Integrity never certifies human reading or labels."""
import argparse
from datetime import datetime,timezone
import hashlib
import json
from pathlib import Path
import re
import sys

def digest(data):return hashlib.sha256(data).hexdigest()
def read_json(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def require(condition,message):
    if not condition:raise ValueError(message)
def safe(name):
    return isinstance(name,str) and re.fullmatch(r'[A-Za-z0-9_.@/-]+',name) and not name.startswith('/') and all(p not in ('','.','..') for p in name.split('/'))

def verify(root):
    root=root.resolve();manifest=(root/'SHA256SUMS.txt').read_bytes();entries={}
    for line in manifest.decode('ascii').splitlines():
        m=re.fullmatch(r'([0-9a-f]{64})  (.+)',line)
        require(m and safe(m[2]) and m[2].casefold() not in entries,'Unsafe, duplicate or invalid manifest member')
        entries[m[2].casefold()]=(m[2],m[1])
    require(0<len(entries)<=10000,'Unexpected manifest size')
    actual=set()
    for p in root.rglob('*'):
        require(not p.is_symlink(),'Linked member is not allowed')
        if not p.is_file():continue
        name=p.relative_to(root).as_posix()
        if name=='SHA256SUMS.txt':continue
        require(safe(name),'Unsafe member name');actual.add(name.casefold())
    require(actual==set(entries),'Missing or unexpected file; keep review work outside the package')
    for name,h in entries.values():require(digest((root/name).read_bytes())==h,'Checksum mismatch: '+name)
    meta=read_json(root/'PACKAGE_METADATA.json');index=read_json(root/'EVIDENCE_INDEX.json')
    require(meta['schema']=='petclinic-review-package/1' and meta['review_round'] in (1,2),'Invalid package metadata')
    require(meta['source_commit']=='3858f9c630cf989bb6809a86edf47c2be78dc9f1','Unexpected source pin')
    require(meta['config_commit']=='323993ce2519c6d02df63e08bf4458d123d3b611','Unexpected config pin')
    require(meta['review_decision'] is None and not meta['ground_truth_accepted'],'No review decision belongs in an input package')
    require(digest((root/'EVIDENCE_INDEX.json').read_bytes())==meta['evidence_index_sha256'],'Index identity differs')
    require(index['review_round']==meta['review_round'],'Wrong index role')
    seen=set()
    for row in index['files']:
        require(row['logical_path'] not in seen,'Duplicate logical evidence path');seen.add(row['logical_path'])
        require(row['case'] in ('P01','P02','P03') and safe(row['stored_path']),'Invalid case/path')
        require(row['stored_path']=='artifacts/'+row['sha256']+'.txt','Unexpected evidence storage binding')
        b=(root/row['stored_path']).read_bytes();require(digest(b)==row['sha256'] and len(b)==row['bytes'],'Evidence identity differs')
        if meta['review_round']==1:
            lower=row['logical_path'].lower()
            require(not any(t in lower for t in ('labels.','annotation','notes_by','exposure','graph.native','neo4j')),'Annotation/method output in R1')
    if meta['review_round']==2:
        expected={'P01/labels.v3.json':'3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce',
          'P02/labels.draft.v4.json':'c22e97a5a3a6994cb0c7961c5a42ed098301b106d36ab57536a486077c456f08',
          'P03/labels.draft.v2.json':'61edca6397a52a5076d3531cecf775d0052e0e7053163165e99110de14222732'}
        lookup={r['logical_path']:r for r in index['files']}
        require(all(lookup.get(n,{}).get('sha256')==h for n,h in expected.items()),'Draft label version/hash differs')
    return {'integrity_verified':True,'review_round':meta['review_round'],'package_id':meta['package_id'],
        'manifest_sha256':digest(manifest),'physical_files_verified':len(entries),'logical_evidence_files':len(index['files']),
        'review_decision_created':False,'human_reading_certified':False,'official_scoring':False}

def checkpoint(root,args,verified):
    meta=read_json(root/'PACKAGE_METADATA.json')
    if args.seal_notes:
        require(meta['review_round']==1,'Seal the notes against the original R1 package')
        require(args.notes and args.exposure and args.out,'--notes, --exposure and --out are required')
        for p in [args.notes,args.exposure,args.out]:require(not p.resolve().is_relative_to(root.resolve()),'Review work must be outside the original package')
        note=args.notes.read_bytes();exposure=args.exposure.read_bytes();require(note.strip() and exposure.strip(),'Empty notes/exposure')
        value={'schema':'petclinic-source-first-file-checkpoint/1','r1_package_id':meta['package_id'],
            'r1_manifest_sha256':verified['manifest_sha256'],'created_utc':datetime.now(timezone.utc).isoformat(),
            'creation_time_meaning':'File checkpoint creation, not certified reading time',
            'notes':{'file_name':args.notes.name,'sha256':digest(note),'bytes':len(note)},
            'exposure':{'file_name':args.exposure.name,'sha256':digest(exposure),'bytes':len(exposure)},
            'reviewer_name_as_provided':args.reviewer,'human_reading_certified':False,'review_decision':None}
        with args.out.open('x',encoding='utf-8',newline='\n') as f:json.dump(value,f,ensure_ascii=False,indent=2);f.write('\n')
        return {'file_checkpoint_created':True,'human_reading_certified':False,'review_decision_created':False}
    if args.checkpoint:
        require(args.notes and args.exposure,'Supply the retained --notes and --exposure files')
        value=read_json(args.checkpoint);require(value['schema']=='petclinic-source-first-file-checkpoint/1','Unexpected checkpoint format')
        expected=verified['manifest_sha256'] if meta['review_round']==1 else meta['required_round1_manifest_sha256']
        package_id=meta['package_id'] if meta['review_round']==1 else meta['required_round1_package_id']
        require(value['r1_manifest_sha256']==expected and value['r1_package_id']==package_id,'Checkpoint belongs to another R1 package')
        require(digest(args.notes.read_bytes())==value['notes']['sha256'],'Retained R1 notes changed')
        require(digest(args.exposure.read_bytes())==value['exposure']['sha256'],'Retained R1 exposure changed')
        return {'retained_R1_file_checkpoint_verified':True,'human_reading_certified':False,'review_decision_created':False}
    return {'file_checkpoint_checked':False,'round2_reading_requires_retained_R1_checkpoint':meta['review_round']==2}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,default=Path(__file__).resolve().parent)
    p.add_argument('--seal-notes',action='store_true');p.add_argument('--checkpoint',type=Path)
    p.add_argument('--notes',type=Path);p.add_argument('--exposure',type=Path);p.add_argument('--out',type=Path);p.add_argument('--reviewer')
    a=p.parse_args()
    try:
        require(not(a.seal_notes and a.checkpoint),'Choose seal-notes or checkpoint verification')
        result=verify(a.root);result.update(checkpoint(a.root,a,result));print(json.dumps(result,ensure_ascii=False,indent=2))
    except (ValueError,OSError,KeyError) as error:
        print('Verification failed: '+str(error),file=sys.stderr);sys.exit(1)
