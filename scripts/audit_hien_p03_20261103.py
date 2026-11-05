"""Independent byte/source/path audit of P03 return; never import received code."""
import ast
from collections import Counter
import hashlib
import json
from pathlib import Path
import zipfile
from package_project_transfer import extended_path, parse_manifest
from transfer_security import Scanner, SecurityError, safe_member
from audit_hien_p02_20261102 import reconstruct_patch, lf

ROOT = Path(__file__).resolve().parent.parent
INTAKE = ROOT/'handoff-out/hien-p03-return/20261103T135105Z-8dcc02a3'
P = INTAKE/'received'
RECEIPT = 'b73e4dd44a1cbd9ffe05d148d2c0742f4ab685cb4c7a4cac7b949ed4d429ce20'
SOURCE = ROOT/'handoff-out/hien-p03-receipt/20261102T132541Z-1420aaa4/P03_HIEN_TECHNICAL_2026-11-02.zip'
OLD = ROOT/'handoff-out/hien-p02-return/20261102T135352Z-54131bc0/received'
def raw(p): return extended_path(p).read_bytes()
def sha(b): return hashlib.sha256(b).hexdigest()
def load(p): return json.loads(raw(p).decode('utf-8-sig'))
def canon(x): return json.dumps(x,sort_keys=True,ensure_ascii=False)
def save(name,value):
    with (INTAKE/name).open('x',encoding='utf-8',newline='\n') as f:
        json.dump(value,f,ensure_ascii=False,indent=2);f.write('\n')


def verify_manifest(base):
    entries=parse_manifest(raw(base/'SHA256SUMS.txt'))
    for name,h in entries:
        assert safe_member(name) and sha(raw(base/name))==h, name
    actual={x.relative_to(extended_path(base)).as_posix() for x in extended_path(base).rglob('*') if x.is_file()}
    assert actual=={n for n,h in entries}|{'SHA256SUMS.txt'}
    return len(entries)


def spans(value,sources):
    count=0
    if isinstance(value,dict):
        if all(k in value for k in ('file','line_start','line_end','expression')):
            path=value['file'].replace('\\','/')
            assert path in sources, path
            lines=sources[path].decode('utf-8').splitlines()
            first,last=value['line_start'],value['line_end']
            assert 1<=first<=last<=len(lines)
            assert lf(value['expression'].encode()).decode().strip() in '\n'.join(lines[first-1:last]), (path,first,last)
            count+=1
        for v in value.values(): count+=spans(v,sources)
    elif isinstance(value,list):
        for v in value: count+=spans(v,sources)
    return count


def main():
    counts={str(b.relative_to(P)) or '.':verify_manifest(b) for b in (P,P/'packet',P/'packet/candidate')}
    assert sha(raw(SOURCE))=='86c1652aa6ded9eac7223b040c5e93b36d375567cf9c3699cd80a93af1f21d91'
    with zipfile.ZipFile(SOURCE) as z:
        names=[n for n in z.namelist() if not n.endswith('/')]
        for name in names: assert raw(P/'packet'/name)==z.read(name),name
    hashes=load(P/'CODE_HASHES.json')
    for name,h in hashes.items():
        assert sha(raw(P/name))==h
        if name.endswith('.py'): ast.parse(raw(P/name).decode('utf-8-sig'))
    for name in ('parser.py','neo4j_importer.py'):
        assert raw(P/'working/src'/name)==raw(OLD/'src'/name)
    for name in ('response_survey.py','synthetic_adapter.py'):
        assert raw(P/'working/src'/name)==raw(P/'packet/implementation-reference/src'/name)
    rebuilt=reconstruct_patch(raw(P/'patches/p03-technical-tools.patch'))
    assert set(rebuilt)=={'tools/run_p03_technical.py','tools/verify_p03_neo4j.py','tests/test_p03_technical.py'}
    for name,b in rebuilt.items(): assert b==lf(raw(P/'working'/name))
    r=load(P/'packet/P03_TECHNICAL_RECEIPT_2026-11-02.json')
    assert sha(raw(P/'packet/P03_TECHNICAL_RECEIPT_2026-11-02.json'))==RECEIPT
    assert raw(P/'packet/decisions/D19.json')==raw(ROOT/'benchmark/p03/decisions/INPUT_LOCK_2026-10-31.json')
    assert raw(P/'packet/decisions/D20.json')==raw(ROOT/'benchmark/decisions/PETCLINIC_DRAFT_INTEGRATION_2026-10-31.json')
    report=load(P/'artifacts/source-only/report.json')
    assert report['pins']==r['case_inputs'] and report['receipt_sha256']==RECEIPT
    for name,h in report['code_sha256'].items(): assert sha(raw(P/'working'/name.replace('\\','/')))==h
    for item in report['candidate_file_bindings']: assert sha(raw(P/'packet/candidate'/item['file']))==item['sha256_bytes']
    scope=load(P/'packet/candidate/spec/scope.candidate.v1.json')
    groups=[]
    for snapshot in ('baseline','mutated'):
        base=P/'artifacts/source-only'/snapshot
        g=load(base/'graph.native.json'); binding=load(base/'bindings.json'); audit=load(base/'inventory-response-audit.json')
        info=report['snapshots'][snapshot]
        assert info['graph_sha256_bytes']==sha(raw(base/'graph.native.json'))
        cypher=raw(base/'graph.cypher')
        assert info['cypher_sha256_bytes']==sha(cypher) and info['cypher_sha256_lf_canonical']==sha(cypher.replace(b'\r\n',b'\n'))
        sources={}
        for row in binding['source_map']:
            b=raw(P/'packet'/row['packet_file'].replace('\\','/'))
            assert sha(b)==row['sha256_bytes'];sources[row['repo_file']]=b
        assert len(sources)==6 and binding['receipt_sha256']==RECEIPT
        assert g['metadata']['commit_sha']==r['case_inputs']['source_commit'] and g['metadata']['snapshot_kind']==snapshot
        assert audit['missing_is_negative'] is False
        span_count=spans(audit,sources)+spans(g['edges'],sources)+spans(g['unresolved'],sources)
        byid={n['id']:n for n in g['nodes']}; assert len(byid)==len(g['nodes'])
        expected={f['service']+'::'+f['class_fqn']+'#'+m['signature'] for f in scope['files'] for m in f['methods']}
        declared=[m for a in audit['audit'] for m in a['explicit_methods']]
        assert len(expected)==len(declared)==27
        actual={n['id'] for n in g['nodes']}&expected
        missing=sorted(expected-actual)
        assert len(actual)==26 and len(missing)==1 and missing[0].endswith('OwnerDetails#getPetIds()')
        extra=sorted(set(byid)-expected)
        assert len(extra)==9 and all('OwnerDetailsBuilder#' in i for i in extra)
        assert {n['id'] for n in audit['out_of_scope_native_nodes']}==set(extra)
        seed=binding['seed_id']; assert seed in byid and seed==info['seed_id']
        db=load(P/f'artifacts/neo4j-{snapshot}.json')
        assert all(db[k]==db['direct_first'] for k in ('direct_second','cypher_first','cypher_second'))
        assert db['direct_retrieval']==db['cypher_retrieval'] and db['seed']==seed
        assert db['cypher_statements']==db['cypher_statements_repeat']==101
        assert len(db['direct_first']['nodes'])==48 and len(db['direct_first']['relationships'])==49
        reaches=[]
        for depth in (1,2,3):
            candidates=set(); frontier={seed}
            for _ in range(depth):
                frontier={e['source_id'] for e in g['edges'] if e['target_id'] in frontier and e['type'] in ('CALLS','INVOKES_API') and e['resolution_status']=='RESOLVED'}
                candidates |= frontier
            candidates.discard(seed)
            got=db['direct_retrieval'][str(depth)]
            assert sorted(candidates)==got['reachable_ids']
            offline=load(base/f'offline-retrieval-{depth}.json')
            assert {n['node_id'] for n in offline['impacted_nodes']}==candidates
            assert got['parameters']=={'seed':seed} and ':CALLS|INVOKES_API' in got['query']
            for path in got['paths']:
                ids,types=path['nodes'],path['edge_types']
                assert ids[-1]==seed and ids[0]!=seed and path['logical_hops']==len(types)==len(ids)-1<=depth
                assert path['service_boundaries']==sum(byid[a]['service']!=byid[b]['service'] for a,b in zip(ids,ids[1:]))
                assert path['source_nodes']==[byid[n] for n in ids]
                for j,(a,b,t) in enumerate(zip(ids,ids[1:],types)):
                    edges=[e for e in g['edges'] if e['source_id']==a and e['target_id']==b and e['type']==t]
                    assert edges and path['native_edge_evidence'][j]==edges
            reaches.append(len(candidates))
        groups.append({'snapshot':snapshot,'native_methods':len(g['nodes']),'top_level_explicit':len(expected),
                       'represented_top_level':len(actual),'missing_top_level':missing,'nested_extras':len(extra),
                       'source_expression_spans_verified':span_count,'endpoints':len(g['endpoints']),
                       'edges':len(g['edges']),'unresolved':len(g['unresolved']),
                       'saved_db_full_parity':True,'saved_db_nodes':48,'saved_db_relationships':49,'reachability_1_2_3':reaches})
    p02=load(P/'artifacts/P02_HASH_CLARIFICATION.json')
    for row in p02:
        b=raw(OLD/'artifacts/source-only'/row['snapshot']/'graph.cypher')
        assert sha(b)==row['sha256_bytes'] and sha(b.replace(b'\r\n',b'\n'))==row['sha256_lf_canonical']
    scanner=Scanner()
    rejected=[]
    for name,h in parse_manifest(raw(P/'SHA256SUMS.txt')):
        try: scanner.scan(name,raw(P/name))
        except SecurityError as error: rejected.append({'file':name,'sha256':h,'category':error.category})
    result={'case':'P03','manifest_listed_files':counts,'canonical_packet_files_byte_equal':len(names),
            'receipt_sha256':RECEIPT,'candidate_core_preserved':True,'p02_candidate_preserved':True,
            'new_code_patch_reconstructed_on_lf_copies':True,'code_hashes':hashes,'groups':groups,
            'p02_hash_clarification_verified':True,'security_scan':scanner.summary(),
            'scan_rejections':rejected,'raw_package_cleared_for_publication':False,
            'reviewed_code_eligible_for_sandbox_technical_tests':True,
            'saved_evidence_checked_not_independent_db_replay':True,
            'hien_human_diff_review_confirmed':False,'labels_read_or_modified':False,'model_calls':0,
            'limitations':['record explicit method unsupported','nested IDs lack enclosing record identity',
                           'syntax evidence is not serialization/dataflow','native keys not snapshot qualified',
                           'CALLS circuit-breaker metadata method-wide; not proof each invocation has that fallback',
                           'received replay commands contain disposable DB password; raw retained privately, screen before publication']}
    save('STATIC_AUDIT.json',result)
    print(json.dumps({k:result[k] for k in ('case','manifest_listed_files','canonical_packet_files_byte_equal','groups','security_scan')},ensure_ascii=False))


if __name__=='__main__': main()
