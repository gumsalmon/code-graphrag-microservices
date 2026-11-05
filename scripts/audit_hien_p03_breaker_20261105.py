"""P03 breaker-fix intake audit; source/AST/bytes only, no received code import."""
import ast
import json
from pathlib import Path
import zipfile
import audit_hien_p02_20261102 as patch_core
from audit_hien_p03_20261103 import raw,sha,load,lf,verify_manifest,spans
from package_project_transfer import parse_manifest
from transfer_security import Scanner,SecurityError

ROOT=Path(__file__).resolve().parent.parent
INTAKE=ROOT/'handoff-out/hien-p03-breaker-return/20261105T082719Z-86eac2cb'
P=INTAKE/'received'
OLD=ROOT/'handoff-out/hien-p03-return/20261103T135105Z-8dcc02a3/received'
RECEIPT='b73e4dd44a1cbd9ffe05d148d2c0742f4ab685cb4c7a4cac7b949ed4d429ce20'
PARSER='75e5d0fa0b2e958fb8a6604516e95dd24e65905bb6617b3820112d0270438005'
def save(name,value):
    with (INTAKE/name).open('x',encoding='utf-8',newline='\n') as f:
        json.dump(value,f,ensure_ascii=False,indent=2);f.write('\n')


def main():
    counts={b.relative_to(P).as_posix():verify_manifest(b) for b in (P,P/'packet',P/'packet/candidate')}
    packet_zip=ROOT/'handoff-out/hien-p03-receipt/20261102T132541Z-1420aaa4/P03_HIEN_TECHNICAL_2026-11-02.zip'
    assert sha(raw(packet_zip))=='86c1652aa6ded9eac7223b040c5e93b36d375567cf9c3699cd80a93af1f21d91'
    with zipfile.ZipFile(packet_zip) as archive:
        names=[i.filename for i in archive.infolist() if not i.is_dir()]
        for name in names:assert raw(P/'packet'/name)==archive.read(name)
    hashes=load(P/'CODE_HASHES.json')
    for name,h in hashes.items():
        b=raw(P/name);assert sha(b)==h
        if name.endswith('.py'):ast.parse(b.decode('utf-8-sig'))
    assert sha(raw(P/'working/src/parser.py'))==PARSER
    assert raw(P/'reference-before/parser.py')==raw(OLD/'working/src/parser.py')
    for name in ('neo4j_importer.py','response_survey.py','synthetic_adapter.py'):
        assert raw(P/'working/src'/name)==raw(OLD/'working/src'/name)
    for name in hashes:
        if name not in ('working/src/parser.py','working/tests/test_breaker_association.py'):
            assert raw(P/name)==raw(OLD/name)
    patch_core.OLD=OLD/'working'
    rebuilt=patch_core.reconstruct_patch(raw(P/'patches/p03-breaker-association.patch'))
    assert set(rebuilt)=={'src/parser.py','tests/test_breaker_association.py'}
    for name,b in rebuilt.items():assert b==lf(raw(P/'working'/name))
    # Check that executable AST changes stay in the three reviewed parser methods.
    before=ast.parse(raw(P/'reference-before/parser.py').decode());after=ast.parse(raw(P/'working/src/parser.py').decode())
    allowed={'parse_source','_extract_internal_method_calls','_breaker_association'}
    for tree in (before,after):
        parser=next(n for n in tree.body if isinstance(n,ast.ClassDef) and n.name=='JavaASTParser')
        parser.body=[n for n in parser.body if not isinstance(n,ast.FunctionDef) or n.name not in allowed]
    assert ast.dump(before,include_attributes=False)==ast.dump(after,include_attributes=False)
    helper=next(n for n in ast.walk(ast.parse(raw(P/'working/src/parser.py').decode())) if isinstance(n,ast.FunctionDef) and n.name=='_breaker_association')
    helper_text=ast.unparse(helper)
    assert all(x not in helper_text for x in ('CustomersServiceClient','emptyVisitsForPets','api-gateway','/owners'))
    receipt=load(P/'packet/P03_TECHNICAL_RECEIPT_2026-11-02.json')
    assert sha(raw(P/'packet/P03_TECHNICAL_RECEIPT_2026-11-02.json'))==RECEIPT
    assert raw(P/'packet/decisions/D19.json')==raw(ROOT/'benchmark/p03/decisions/INPUT_LOCK_2026-10-31.json')
    assert raw(P/'packet/decisions/D20.json')==raw(ROOT/'benchmark/decisions/PETCLINIC_DRAFT_INTEGRATION_2026-10-31.json')
    for variant in ('source-only','source-only-final'):
        report=load(P/'artifacts'/variant/'report.json')
        assert report['receipt_sha256']==RECEIPT and report['pins']==receipt['case_inputs']
        for name,h in report['code_sha256'].items():
            normalized=name.replace('\\','/')
            f=P/'artifacts/intermediate-parser.py' if variant=='source-only' and normalized=='src/parser.py' else P/'working'/normalized
            assert sha(raw(f))==h,(variant,name)
        for row in report['candidate_file_bindings']:assert sha(raw(P/'packet/candidate'/row['file']))==row['sha256_bytes']
    changes=[];groups=[]
    for snapshot in ('baseline','mutated'):
        base=P/'artifacts/source-only-final'/snapshot
        graph=load(base/'graph.native.json');old=load(OLD/'artifacts/source-only'/snapshot/'graph.native.json')
        assert raw(P/'artifacts/before'/f'{snapshot}.graph.native.json')==raw(OLD/'artifacts/source-only'/snapshot/'graph.native.json')
        assert graph==load(P/'artifacts/source-only'/snapshot/'graph.native.json')
        assert set(graph)==set(old)
        for key in graph:
            if key!='edges':assert graph[key]==old[key],key
        assert len(graph['edges'])==len(old['edges'])==3
        changed=[]
        for previous,current in zip(old['edges'],graph['edges']):
            fields={k for k in set(previous)|set(current) if previous.get(k)!=current.get(k)}
            if not fields:continue
            assert fields=={'has_circuit_breaker','fallback_method','assumptions'}
            assert current['target_id'].endswith('CustomersServiceClient#getOwner(int)')
            assert previous['has_circuit_breaker'] is True and current['has_circuit_breaker'] is False
            assert previous['fallback_method']=='emptyVisitsForPets' and current['fallback_method'] is None
            assert current['assumptions']==[a for a in previous['assumptions'] if not a.startswith('Protected by ReactiveCircuitBreaker')]
            changed.append({'source_id':current['source_id'],'target_id':current['target_id'],'changed_fields':sorted(fields)})
        assert len(changed)==1
        visits=next(e for e in graph['edges'] if e['target_id'].endswith('VisitsServiceClient#getVisitsForPets(List<Integer>)'))
        assert visits['has_circuit_breaker'] is True and visits['fallback_method']=='emptyVisitsForPets'
        report=load(P/'artifacts/source-only-final/report.json')['snapshots'][snapshot]
        assert sha(raw(base/'graph.native.json'))==report['graph_sha256_bytes']
        b=raw(base/'graph.cypher');assert sha(b)==report['cypher_sha256_bytes'] and sha(b.replace(b'\r\n',b'\n'))==report['cypher_sha256_lf_canonical']
        sources={}
        for row in load(base/'bindings.json')['source_map']:
            b=raw(P/'packet'/row['packet_file'].replace('\\','/'));assert sha(b)==row['sha256_bytes'];sources[row['repo_file']]=b
        count=spans(load(base/'inventory-response-audit.json'),sources)+spans(graph['edges'],sources)+spans(graph['unresolved'],sources)
        db=load(P/f'artifacts/neo4j-{snapshot}.json')
        assert all(db[k]==db['direct_first'] for k in ('direct_second','cypher_first','cypher_second'))
        assert db['direct_retrieval']==db['cypher_retrieval']
        assert len(db['direct_first']['nodes'])==48 and len(db['direct_first']['relationships'])==49
        assert db['cypher_statements']==db['cypher_statements_repeat']==101
        for depth in (1,2,3):
            offline=load(base/f'offline-retrieval-{depth}.json')
            assert {n['node_id'] for n in offline['impacted_nodes']}==set(db['direct_retrieval'][str(depth)]['reachable_ids'])
        changes.append({'snapshot':snapshot,'changes':changed})
        groups.append({'snapshot':snapshot,'native_methods':len(graph['nodes']),'top_level_explicit':27,'represented_top_level':26,
            'nested_extras':9,'endpoints':len(graph['endpoints']),'edges':3,'native_unresolved':len(graph['unresolved']),
            'source_expression_spans_verified':count,'saved_full_db_parity':True,'specific_breaker_fix_verified_statically':True})
    scanner=Scanner();rejected=[]
    for name,h in parse_manifest(raw(P/'SHA256SUMS.txt')):
        try:scanner.scan(name,raw(P/name))
        except SecurityError as e:rejected.append({'file':name,'sha256':h,'category':e.category})
    result={'case':'P03','receipt_sha256':RECEIPT,'manifest_listed_files':counts,'canonical_packet_files_byte_equal':len(names),
        'parser_before_identity_verified':True,'candidate_core_preserved':True,'importer_and_old_tools_tests_unchanged':True,
        'parser_after_sha256':PARSER,'code_hashes':hashes,'patch_reconstructed_on_lf_copies':True,
        'parser_ast_changes_confined_to_reviewed_methods':True,'hardcoded_case_identity_in_helper':False,
        'groups':groups,'graph_before_after_changes':changes,'security_scan':scanner.summary(),'scan_rejections':rejected,
        'reviewed_code_eligible_for_sandbox_technical_tests':True,'received_helpers_executed':False,
        'hien_human_final_diff_review_confirmed':False,'labels_read_or_modified':False,'model_calls':0,
        'scope':'Static/byte check of bounded syntactic fix; full Java/reactive dataflow and human review not certified'}
    save('STATIC_AUDIT.json',result)
    print(json.dumps({k:result[k] for k in ['case','manifest_listed_files','canonical_packet_files_byte_equal','groups','scan_rejections']},ensure_ascii=False))


if __name__=='__main__':main()
