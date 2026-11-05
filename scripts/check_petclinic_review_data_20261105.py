"""Independent review-preview integrity/role/schema check; no reviewer decision."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
from package_project_transfer import extended_path,parse_manifest

ROOT=Path(__file__).resolve().parent.parent
def raw(p):return extended_path(p).read_bytes()
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(raw(p).decode('utf-8-sig'))
def check_round1_content(name,b):
    assert not any(t in name.lower() for t in ('labels.','annotation','notes_by','exposure','graph.native','neo4j'))
    if not name.endswith(('.json','.jsonl','.ndjson')):return
    values=[json.loads(line) for line in b.decode('utf-8-sig').splitlines() if line.strip()] if name.endswith(('.jsonl','.ndjson')) else [json.loads(b)]
    forbidden={'behavioral_impact','requires_code_change','gold_hops','polarity','impact_assessments','expected_impacted_nodes'}
    def visit(value):
        if isinstance(value,dict):
            assert not set(value)&forbidden,'Annotation content in R1'
            for child in value.values():visit(child)
        elif isinstance(value,list):
            for child in value:visit(child)
    for value in values:visit(value)
def check(root):
    result=load(root/'RESULT.json');rows=load(root/'ALLOWLIST.json');originals=load(root/'ORIGINAL_IDENTITIES.json')
    assert result['release_decision'] is None and result['reviewer'] is None and not result['packet_sent']
    assert not result['ground_truth_accepted'] and not result['official_scoring'] and not result['model_calls']
    assert not result['security_flags_requiring_review']
    for name,h in originals.items():assert sha(raw(ROOT/name))==h,name
    lookup={(r['round'],r['path']):r for r in rows};assert len(lookup)==len(rows)
    count=Counter();http_records=0
    for round_ in ['R1-source-first','R2-label-comparison']:
        entries=parse_manifest(raw(root/round_/'SHA256SUMS.txt'))
        assert set(n for n,h in entries)=={r['path'] for r in rows if r['round']==round_}
        for name,h in entries:
            b=raw(root/round_/name);r=lookup[round_,name]
            assert sha(b)==h==r['sha256'] and len(b)==r['bytes']
            if r['origin'] and not r['derived']:assert b==raw(ROOT/r['origin'])
            assert not any(p in name.lower().split('/') for p in ('reasoning','predictions','chroma_db','demo'))
            assert not name.endswith(('.cypher','.jar','.class','.tar'))
            if round_=='R1-source-first':
                check_round1_content(name,b)
                if name.endswith('.json'):
                    obj=json.loads(b)
                    if isinstance(obj,dict) and 'body_file' in obj:
                        for key,hash_key in [('body_file','body_sha256'),('request_body_file','request_body_sha256')]:
                            if not obj.get(key):continue
                            dest=(root/round_/name).parent/obj[key]
                            if not extended_path(dest).is_file():
                                # Raw collectors may store a path relative to group root.
                                path=Path(name);parts=path.parts;group_index=next((i for i,p in enumerate(parts) if p in ('baseline-r1','baseline-r2','mutated-r1','mutated-r2')),None)
                                assert group_index is not None
                                dest=root/round_/Path(*parts[:group_index+1])/obj[key]
                            assert extended_path(dest).is_file(),(name,key)
                            if hash_key in obj:assert sha(raw(dest))==obj[hash_key],(name,key)
                        http_records+=1
            count[round_]+=1
    for case,path,h in [('P01','labels.v3.json','3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce'),
      ('P02','labels.draft.v4.json','c22e97a5a3a6994cb0c7961c5a42ed098301b106d36ab57536a486077c456f08'),
      ('P03','labels.draft.v2.json','61edca6397a52a5076d3531cecf775d0052e0e7053163165e99110de14222732')]:
        assert sha(raw(root/'R2-label-comparison'/case/path))==h
    for case,total in [('P02',12),('P03',31)]:
        registry=load(root/'R1-source-first'/case/'REGISTRY.json')
        assert len(registry['eligible_entities'])==total and len(registry['excluded_seeds'])==3
        assert all(set(r)=={'level','entity_id'} for r in registry['eligible_entities'])
        assert all(set(r)<={'level','baseline_id','canonical_id','mutated_id'} for r in registry['aliases'])
    assert 'no retrospective preregistration' in load(root/'R1-source-first/P01/INPUT.json')['universe_note']
    for round_ in count:
        meta=load(root/round_/'PREVIEW_METADATA.json');assert meta['reviewer'] is None and meta['review_decision'] is None and not meta['released']
    screening=load(root/'CONTENT_SCREENING.json');assert not screening['review_flags']
    return {'success':True,'round1_files':count['R1-source-first'],'round2_files':count['R2-label-comparison'],
        'original_files_unchanged':len(originals),'http_records_with_body_references_verified':http_records,
        'label_versions_and_hashes_verified':3,'r1_label_and_method_output_path_barrier_verified':True,
        'scope':'Coordinator integrity/schema/role-boundary check, not human semantic review, blinding proof or official packet release',
        'reviewer':None,'ground_truth_accepted':False,'model_calls':0,'official_scoring':False}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--run',type=Path,required=True);a=p.parse_args()
    print(json.dumps(check(a.run.resolve()),ensure_ascii=False,indent=2))
