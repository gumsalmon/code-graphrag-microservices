"""Independent static P02 return/patch/evidence audit; executes no received helper."""
import ast
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
from package_project_transfer import extended_path, parse_manifest
from transfer_security import safe_member, Scanner

ROOT = Path(__file__).resolve().parent.parent
INTAKE = ROOT / 'handoff-out/hien-p02-return/20261102T135352Z-54131bc0'
P = INTAKE / 'received'
OLD = ROOT / 'handoff-out/team-returns-20261101/20261101T054957Z-a801d6ca/hien/received/code'
NATIVE = ROOT / 'handoff-out/p02-offline-method/20261101t061314799z-a263deac'
HASHES = {'src/parser.py':'f46fdf123ab156b7d3f3a03ced679dd581e10fbbb6ca28d64140147a1d6eeeb0',
          'src/neo4j_importer.py':'93c20bd93e6dd5997043b4e4806aa5df7523426b4a82e6607b694934e5d4d7d3',
          'tests/test_p02_technical_fixes.py':'d12608cf82d9241231f63d86718234381daa37e992f6c3ee296be614b7d8c319'}


def sha(raw): return hashlib.sha256(raw).hexdigest()
def read(path): return extended_path(path).read_bytes()
def load(path): return json.loads(read(path).decode('utf-8-sig'))
def lf(raw): return raw.replace(b'\r\r\n',b'\n').replace(b'\r\n',b'\n').replace(b'\r',b'\n')


def reconstruct_patch(raw):
    """Apply unified hunks to byte-normalized base copies, checking every old line/count."""
    lines = lf(raw).splitlines(keepends=True)
    i, result = 0, {}
    while i < len(lines):
        assert lines[i].startswith(b'--- ')
        before = lines[i][4:].strip().decode(); after = lines[i+1][4:].strip().decode()
        assert after.startswith('b/') and safe_member(after[2:]) and after[2:] not in result
        name = after[2:]
        assert before == '/dev/null' or before == 'a/' + name
        original = [] if before == '/dev/null' else lf(read(OLD/name)).splitlines(keepends=True)
        cursor, output = 0, []
        i += 2
        while i < len(lines) and not lines[i].startswith(b'--- '):
            hit = re.fullmatch(rb'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@[^\n]*\n', lines[i])
            assert hit, 'Invalid hunk header'
            start = int(hit[1]); start = start-1 if start else 0
            old_count = int(hit[2] or b'1'); new_count = int(hit[4] or b'1')
            assert cursor <= start <= len(original)
            output += original[cursor:start]; cursor = start
            i += 1; consumed = produced = 0
            while i < len(lines) and not lines[i].startswith((b'@@ ',b'--- ')):
                marker, content = lines[i][:1], lines[i][1:]
                assert marker in [b' ',b'-',b'+']
                if marker in [b' ',b'-']:
                    assert cursor < len(original) and original[cursor] == content, 'Patch old line differs'
                    cursor += 1; consumed += 1
                if marker in [b' ',b'+']:
                    output.append(content); produced += 1
                i += 1
            assert consumed == old_count and produced == new_count, 'Hunk counts differ'
        result[name] = b''.join(output + original[cursor:])
    return result


def main():
    entries = parse_manifest(read(P/'SHA256SUMS.txt')); names = set()
    for name, expected in entries:
        assert safe_member(name) and name.casefold() not in names
        names.add(name.casefold()); assert sha(read(P/name)) == expected
    assert names == {x.relative_to(P).as_posix().casefold() for x in P.rglob('*') if x.is_file() and x.name != 'SHA256SUMS.txt'}
    for name, h in HASHES.items():
        assert sha(read(P/name)) == h
        ast.parse(read(P/name).decode('utf-8-sig'))
    # Exact permitted edits, on normalized copies only; received/raw bytes are never rewritten.
    old_parser = lf(read(OLD/'src/parser.py'))
    start = old_parser.index(b'        # Only retain nodes that are relevant (have edges or are endpoints)\n')
    end = old_parser.index(b'        return {\n',start)
    expected_parser = (old_parser[:start]+old_parser[end:]).replace(b'"nodes": filtered_nodes,',b'"nodes": list(nodes_dict.values()),')
    assert expected_parser == lf(read(P/'src/parser.py')), 'Parser changed beyond inventory filter'
    old_importer = lf(read(OLD/'src/neo4j_importer.py'))
    expected_importer = old_importer.replace(b'ON CREATE SET c.file = $file',b'ON CREATE SET c.name = $class_name, c.file = $file').replace(b'""", **node)',b'""", **{**node, "class_name": node["class_fqn"].split(".")[-1]})')
    assert expected_importer == lf(read(P/'src/neo4j_importer.py')), 'Importer changed beyond Class.name'
    rebuilt = reconstruct_patch(read(P/'patches/p02-parser-importer-regression.patch'))
    assert set(rebuilt) == set(HASHES)
    for name, value in rebuilt.items():
        assert value == lf(read(P/name)), 'Patch reconstruction differs: '+name
    receipt = load(ROOT/'tasks/hien-next/P02_TECHNICAL_RECEIPT_2026-11-01.json')
    report = load(P/'artifacts/source-only/source_only_report.json')
    assert report['receipt_sha256'] == sha(read(ROOT/'tasks/hien-next/P02_TECHNICAL_RECEIPT_2026-11-01.json'))
    assert report['parser_sha256'] == HASHES['src/parser.py'] and report['importer_sha256'] == HASHES['src/neo4j_importer.py']
    method_input = ROOT/'handoff-out/hien-p02-next/20261101T062259Z-fbac2a60/ZIP_VERIFIED/provenance/METHOD_INPUT.json'
    assert report['method_input_sha256'] == sha(read(method_input))
    meta = load(NATIVE/'input/INPUT.json')
    universe = load(ROOT/'handoff-out/p02-input-revision/20261018T065307839Z-719da955/draft/evaluation_universe.draft.v2.json')
    prefix = 'spring-petclinic-microservices@'+meta['source_commit']+'::'
    eligible = {r['entity_id'].removeprefix(prefix) for r in universe['eligible_entities'] if r['level']=='method'}
    groups, cypher_hash_exceptions = [], []
    for snapshot in ['baseline','mutated']:
        base = P/'artifacts/source-only'/snapshot
        graph = load(base/'graph.native.json'); old = load(NATIVE/'artifacts'/snapshot/'graph.native.json')
        current = {r['id']:r for r in graph['nodes']}; prior = {r['id']:r for r in old['nodes']}
        assert len(current)==len(graph['nodes'])==9 and set(current)==eligible|{meta['seed_ids'][snapshot]}
        assert all(current[k]==v for k,v in prior.items())
        assert all(graph[k]==old[k] for k in ['edges','endpoints','unresolved'])
        assert graph['metadata']['commit_sha']==meta['source_commit'] and graph['metadata']['snapshot_kind']==snapshot
        assert graph['metadata']['repository']=='https://github.com/spring-petclinic/spring-petclinic-microservices'
        assert report['snapshots'][snapshot]['source_files']==meta['snapshots'][snapshot]
        assert report['snapshots'][snapshot]['seed_id']==meta['seed_ids'][snapshot]
        assert report['snapshots'][snapshot]['graph_sha256']==sha(read(base/'graph.native.json'))
        cypher_raw = read(base/'graph.cypher')
        raw_hash, report_hash = sha(cypher_raw), report['snapshots'][snapshot]['cypher_sha256']
        if report_hash != raw_hash:
            assert b'\r\n' in cypher_raw and report_hash == sha(cypher_raw.replace(b'\r\n',b'\n')), 'Unexplained Cypher report mismatch'
            cypher_hash_exceptions.append({'snapshot':snapshot,'path':f'artifacts/source-only/{snapshot}/graph.cypher',
                'raw_file_sha256':raw_hash,'reported_sha256':report_hash,'reported_hash_scope':'UTF-8 generated string with LF, not stored CRLF file bytes',
                'raw_manifest_hash_verified':True,'received_bytes_modified':False,'sender_report_clarification_needed':True})
        for node in graph['nodes']:
            raw=read(NATIVE/'input'/snapshot/node['file']); lines=raw.decode('utf-8').splitlines()
            assert 1<=node['line_start']<=node['line_end']<=len(lines)
            assert node['method_name'] in '\n'.join(lines[node['line_start']-1:node['line_end']])
        db=load(P/f'artifacts/neo4j-{snapshot}-result.json')
        assert db['direct_first']==db['direct_second']==db['cypher_first']==db['cypher_second']
        assert db['direct_retrieval']==db['cypher_retrieval'] and db['server_version']=='5.26.0'
        assert db['seed']==meta['seed_ids'][snapshot] and db['status']=='passed_full_properties_idempotence_retrieval'
        dump=db['direct_first'];assert len(dump['nodes'])==len(dump['relationships'])==18
        assert {r['properties']['id'] for r in dump['nodes'] if 'Method' in r['labels']}==set(current)
        for row in dump['nodes']:
            if 'Class' in row['labels']:assert row['properties']['name']==row['properties']['fqn'].split('.')[-1]
        for depth in [1,2,3]:
            plan=db['direct_retrieval'][str(depth)];assert len(plan['reachable_ids'])==[1,2,2][depth-1]
            for path in plan['paths']:
                ids=path['nodes'];types=path['edge_types'];assert ids[0]!=db['seed'] and ids[-1]==db['seed'] and len(types)==len(ids)-1<=depth
                for a,b,kind in zip(ids,ids[1:],types):assert any(e['source_id']==a and e['target_id']==b and e['type']==kind and e['resolution_status']=='RESOLVED' for e in graph['edges'])
        groups.append({'snapshot':snapshot,'methods':9,'eligible_methods_represented':8,'native_edges':2,'endpoints':4,'unresolved':1,'reported_database_nodes':18,'reported_database_relationships':18,'reported_full_dump_parity':True,'reported_retrieval_counts':[1,2,2]})
    scanner=Scanner(max_expanded_bytes=8*1024*1024)
    for path in P.rglob('*'):
        if path.is_file():scanner.scan(path.relative_to(P).as_posix(),read(path))
    assert not scanner.summary()['failures']
    result={'scope':'Independent static byte/diff/source/received-dump consistency, not runtime re-execution or human sign-off',
            'case':'P02','manifest_files':len(entries),'code_hashes':HASHES,'permitted_edits_only':True,'patch_reconstructed_on_LF_copies':True,
            'raw_patch_has_double_CRLF':b'\r\r\n' in read(P/'patches/p02-parser-importer-regression.patch'),
            'metadata_repository_alias_difference':'Sender builder default URL; coordinator earlier explicit short name. Source commit/IDs match; no graph byte equality claimed.',
            'cypher_report_hash_exceptions':cypher_hash_exceptions,
            'groups':groups,'human_final_diff_confirmation_received':False,'received_helpers_executed':False,
            'security_scan':scanner.summary(),'model_calls':0,'labels_or_old_evidence_modified':False,'p03_executed':False}
    with (INTAKE/'STATIC_AUDIT.json').open('x',encoding='utf-8',newline='\n') as stream:
        json.dump(result,stream,ensure_ascii=False,indent=2);stream.write('\n')
    print(json.dumps({k:result[k] for k in ['case','manifest_files','permitted_edits_only','groups','human_final_diff_confirmation_received']},ensure_ascii=False))


if __name__=='__main__':main()
