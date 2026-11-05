"""Independent read-only check of P03 replay, source binding and sender comparison."""
import argparse
import hashlib
import json
from pathlib import Path
from package_project_transfer import extended_path,parse_manifest

ROOT=Path(__file__).resolve().parent.parent
RECEIVED=ROOT/'handoff-out/hien-p03-breaker-return/20261105T082719Z-86eac2cb/received'
RECEIPT='b73e4dd44a1cbd9ffe05d148d2c0742f4ab685cb4c7a4cac7b949ed4d429ce20'
def raw(p):return extended_path(p).read_bytes()
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(raw(p).decode('utf-8-sig'))
def canon(x):return json.dumps(x,sort_keys=True,ensure_ascii=False)
def sorted_rows(rows):return sorted(rows,key=canon)
def db_view(data):
    return {'nodes':sorted_rows([{'labels':sorted(n['labels']),'properties':n['properties']} for n in data['nodes']]),
            'edges':sorted_rows([{'source_labels':sorted(e['source_labels']),'source':e['source'],'type':e['type'],
                'properties':e['properties'],'target_labels':sorted(e['target_labels']),'target':e['target']} for e in data['edges']])}
def sender_db_view(data):
    return db_view({'nodes':data['nodes'],'edges':[{'source_labels':e['start_labels'],'source':e['start_props'],
        'type':e['type'],'properties':e['properties'],'target_labels':e['end_labels'],'target':e['end_props']} for e in data['relationships']]})


def audit(directory):
    entries=parse_manifest(raw(directory/'SHA256SUMS.txt'))
    for name,h in entries:assert sha(raw(directory/name))==h,name
    assert load(directory/'CLEANUP.json')['complete'] and load(directory/'PRESERVATION.json')['input_implementation_test_packet_and_received_unchanged']
    for name in ('final-owner-containers.stdout.log','final-owner-networks.stdout.log'):assert not raw(directory/name).strip()
    result=load(directory/'RESULT.json');meta=load(directory/'input/INPUT.json')
    assert result['case']=='P03' and result['snapshots_completed']==['baseline','mutated']
    assert result['unit_tests_passed']==39 and not result['model_calls'] and not result['scoring_performed']
    assert sha(raw(directory/'input/receipt.json'))==RECEIPT==meta['receipt_sha256']
    receipt=load(directory/'input/receipt.json')
    assert sha(raw(directory/'input/D20.json'))==receipt['authority_sha256'] and sha(raw(directory/'input/D19.json'))==receipt['input_decision_sha256']
    assert sha(raw(directory/'input/proposed.patch'))==receipt['case_inputs']['patch_sha256']
    assert result['old_parser_regressions_failed_as_expected']==7
    hashes=load(directory/'HASHES_BEFORE.json')
    for group,subdir in [('input','input'),('implementation','implementation'),('test_packet','test-packet')]:
        for name,h in hashes[group].items():assert sha(raw(directory/subdir/name))==h
    network=load(directory/'network-identity.stdout.log')[0];owner=directory.name
    assert network['Internal'] and network['Labels']['code-graphrag.p03-native']==owner
    groups=[];database_ids=set()
    for snapshot in ('baseline','mutated'):
        base=directory/'artifacts'/snapshot;db=directory/'database'/snapshot
        graph=load(base/'graph.native.json');extracted=load(base/'extraction.json');inventory=load(base/'inventory.json')
        original=load(RECEIVED/'artifacts/source-only-final'/snapshot/'graph.native.json')
        # Only repository metadata alias differs. Every substantive graph field is compared.
        own_meta=dict(graph['metadata']);sent_meta=dict(original['metadata'])
        own_repo=own_meta.pop('repository');sent_repo=sent_meta.pop('repository')
        assert own_meta==sent_meta
        assert {k:v for k,v in graph.items() if k!='metadata'}=={k:v for k,v in original.items() if k!='metadata'}
        assert own_repo=='spring-petclinic-microservices' and sent_repo==receipt['case_inputs'].get('repository','https://github.com/spring-petclinic/spring-petclinic-microservices')
        assert extracted['receipt_sha256']==RECEIPT and extracted['seed_id']==meta['seed_ids'][snapshot]
        expected_sources={r['file']:r['sha256'] for r in meta['snapshots'][snapshot]}
        for f,h in expected_sources.items():assert sha(raw(directory/'input'/snapshot/f))==h
        declarations=inventory['top_level_declarations'];represented={i for d in declarations for i in d['represented_ids']}
        missing=[d for d in declarations if not d['represented_ids']]
        assert len(declarations)==27 and len(represented)==26 and len(missing)==1
        assert missing[0]['class_fqn'].endswith('.OwnerDetails') and missing[0]['method_name']=='getPetIds'
        assert len(inventory['native_extras'])==9 and not inventory['missing_is_negative']
        sender_audit=load(RECEIVED/'artifacts/source-only-final'/snapshot/'inventory-response-audit.json')
        sent_declarations=[d for a in sender_audit['audit'] for d in a['explicit_methods']]
        assert [(d['file'],d['method_name'],d['line_start'],d['line_end'],d['represented_ids']) for d in declarations]==[(d['file'],d['name'],d['line_start'],d['line_end'],d['represented_ids']) for d in sent_declarations]
        identity=load(directory/f'database-{snapshot}-identity.stdout.log')[0]
        assert identity['Id'] not in database_ids;database_ids.add(identity['Id'])
        assert identity['Image']=='sha256:5a015e53de1895e7eee1574ae0325cf8c4b89587222778108c594bdd45a474b5'
        assert not identity['HostConfig']['PortBindings'] and all(m['Type']!='volume' for m in identity['Mounts'])
        assert identity['Config']['Labels']['code-graphrag.p03-native']==owner
        assert load(db/'fresh-database.json')['empty_before_first_import']
        ready=load(db/'readiness.json')[-1];assert ready['ready'] and ready['actual_query_verified']
        direct=load(db/'direct.first.json');cypher=load(db/'cypher.first.json')
        assert direct==load(db/'direct.second.json') and cypher==load(db/'cypher.second.json')
        assert direct==cypher
        parity=load(db/'parity.json');assert parity['full_node_property_parity'] and all(parity['checks'].values())
        sent_db=load(RECEIVED/f'artifacts/neo4j-{snapshot}.json')
        assert db_view(direct)==sender_db_view(sent_db['direct_first'])
        own_retrieval=load(db/'direct.retrieval.json');assert own_retrieval==load(db/'cypher.retrieval.json')
        customer=next(e for e in graph['edges'] if e['target_id'].endswith('CustomersServiceClient#getOwner(int)'))
        visits=next(e for e in graph['edges'] if e['target_id'].endswith('VisitsServiceClient#getVisitsForPets(List<Integer>)'))
        assert customer['has_circuit_breaker'] is False and customer['fallback_method'] is None
        assert not any(a.startswith('Protected by ReactiveCircuitBreaker') for a in customer['assumptions'])
        assert visits['has_circuit_breaker'] is True and visits['fallback_method']=='emptyVisitsForPets'
        byid={n['id']:n for n in graph['nodes']};reaches=[]
        for plan in own_retrieval['plans']:
            depth=plan['depth_limit'];seed=meta['seed_ids'][snapshot];candidates=set();frontier={seed}
            for _ in range(depth):
                frontier={e['source_id'] for e in graph['edges'] if e['target_id'] in frontier and e['type'] in ('CALLS','INVOKES_API') and e['resolution_status']=='RESOLVED'};candidates|=frontier
            candidates.discard(seed)
            assert {r['id'] for r in plan['paths']}==candidates==set(sent_db['direct_retrieval'][str(depth)]['reachable_ids'])
            for path in plan['paths']:
                ids=path['witness_ids'];assert ids[0]!=seed and ids[-1]==seed and len(ids)-1==path['logical_hop']<=depth
                assert all(any(e['source_id']==a and e['target_id']==b and e['type']==t for e in graph['edges']) for a,b,t in zip(ids,ids[1:],path['relation_types']))
            for chunk in plan['chunks']:
                b=raw(directory/'input'/snapshot/chunk['file']);first,last=chunk['line_start'],chunk['line_end']
                assert sha(b)==chunk['source_sha256'] and sha(b''.join(b.splitlines(keepends=True)[first-1:last]))==chunk['excerpt_sha256']
            reaches.append({'depth':depth,'candidate_methods':len(candidates),'not_behavioral_labels':True})
        groups.append({'snapshot':snapshot,'native_methods':len(graph['nodes']),'top_level_methods':27,'represented_top_level':26,
            'unsupported_explicit':['OwnerDetails.getPetIds()'],'native_nested_extras':9,
            'endpoints':len(graph['endpoints']),'dependency_edges':len(graph['edges']),'unresolved':len(graph['unresolved']),
            'db_nodes':len(direct['nodes']),'db_relationships':len(direct['edges']),'full_property_parity':True,
            'source_path_retrieval_verified':True,'sender_semantic_graph_and_db_comparison':True,'retrieval':reaches,'dependencies':extracted['dependencies']})
    return {'case':'P03','manifest_listed_files':len(entries),'success':True,'specific_P03_T01_fixed':True,'old_parser_regressions_failed_as_expected':7,'groups':groups,
        'independent_fresh_db_instances':len(database_ids),'unit_tests_passed':39,'labels_read_or_modified':False,
        'model_calls':0,'scoring_performed':False,'snapshot_keys_intrinsically_isolated':False,
        'scope':'Independent native extraction, AST inventory, fresh DB parity/idempotence/source retrieval. Not serialization/dataflow/behavior/accuracy/ground-truth approval.'}


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--run',type=Path,required=True);a=p.parse_args()
    print(json.dumps(audit(a.run.resolve()),ensure_ascii=False,indent=2))
