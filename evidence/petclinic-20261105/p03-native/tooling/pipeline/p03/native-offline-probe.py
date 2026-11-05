"""Independent P03 extraction/census; reuse reviewed local DB checks only."""
import argparse
import hashlib
import importlib.metadata
import importlib.util
import json
from pathlib import Path
import sys
import time

spec=importlib.util.spec_from_file_location('checked_db_core','/probe-core.py')
core=importlib.util.module_from_spec(spec);spec.loader.exec_module(core)
sha=core.sha
save=core.save


def extract(snapshot,output):
    sys.path.insert(0,'/implementation')
    from src.parser import DependencyGraphBuilder
    from src.neo4j_importer import Neo4jGraphImporter
    from tree_sitter import Language,Parser
    import tree_sitter_java
    root=Path('/input');meta=json.loads((root/'INPUT.json').read_bytes())
    receipt_raw=(root/'receipt.json').read_bytes();receipt=json.loads(receipt_raw)
    assert sha(receipt_raw)==meta['receipt_sha256'] and receipt['case']=='P03'
    assert receipt['status']=='ready_for_offline_integration' and not receipt['model_calls_authorized']
    assert not receipt['labels_or_annotation_notes_included'] and not receipt['official_scoring_authorized']
    assert sha((root/'D20.json').read_bytes())==receipt['authority_sha256']
    assert sha((root/'D19.json').read_bytes())==receipt['input_decision_sha256']
    files=meta['snapshots'][snapshot];paths=[]
    for row in files:
        path=root/snapshot/row['file'];assert sha(path.read_bytes())==row['sha256'];paths.append(path)
    before={str(p):sha(p.read_bytes()) for p in paths}
    builder=DependencyGraphBuilder(repository='spring-petclinic-microservices',commit_sha=meta['source_commit'])
    graph=builder.build_multi_file_graph([str(p) for p in paths],snapshot_kind=snapshot,
        patch_id=meta['patch_sha256'] if snapshot=='mutated' else None)
    byid={n['id']:n for n in graph['nodes']};assert len(byid)==len(graph['nodes'])
    aliases={};declarations=[];ast_parser=Parser(Language(tree_sitter_java.language()))
    for row,path in zip(files,paths):
        raw=path.read_bytes();tree=ast_parser.parse(raw);assert not tree.root_node.has_error
        for group in builder.parser.parse_source(raw.decode('utf-8'),str(path)):
            for item in group:
                alias=item.file.replace('\\','/')
                assert alias not in aliases or aliases[alias]==row['file'];aliases[alias]=row['file']
        for typ in tree.root_node.named_children:
            if typ.type not in ('class_declaration','record_declaration'):continue
            body=typ.child_by_field_name('body')
            for method in body.named_children if body else []:
                if method.type!='method_declaration':continue
                name=method.child_by_field_name('name');name=raw[name.start_byte:name.end_byte].decode()
                candidates=[n for n in graph['nodes'] if n['class_fqn']==row['class_fqn'] and n['method_name']==name
                            and n['line_end']==method.end_point[0]+1 and n['line_start']==method.start_point[0]+1]
                declarations.append({'file':row['file'],'class_fqn':row['class_fqn'],'method_name':name,
                    'line_start':method.start_point[0]+1,'line_end':method.end_point[0]+1,
                    'represented_ids':[n['id'] for n in candidates],
                    'expression_sha256':sha(raw[method.start_byte:method.end_byte]),'implicit_methods_synthesized':False})
    represented={i for d in declarations for i in d['represented_ids']}
    save(output,'inventory.json',{'top_level_declarations':declarations,
         'native_extras':[n['id'] for n in graph['nodes'] if n['id'] not in represented],
         'missing_is_negative':False,'serialization_dataflow_supported':False})
    seed=meta['seed_ids'][snapshot];assert seed in byid
    save(output,'graph.native.json',graph)
    Neo4jGraphImporter().generate_cypher_script(graph,str(output/'graph.generated.cypher'))
    assert before=={str(p):sha(p.read_bytes()) for p in paths}
    record={'case':'P03','snapshot':snapshot,'receipt_sha256':sha(receipt_raw),'source_commit':meta['source_commit'],
        'patch_id':meta['patch_sha256'] if snapshot=='mutated' else None,'source_files':files,'native_source_map':aliases,
        'seed_id':seed,'nodes':len(graph['nodes']),'endpoints':len(graph['endpoints']),'edges':len(graph['edges']),
        'unresolved':len(graph['unresolved']),'dependencies':{p:importlib.metadata.version(p) for p in ['tree-sitter','tree-sitter-java','neo4j']},
        'code':{n:sha((Path('/implementation/src')/n).read_bytes()) for n in ['parser.py','neo4j_importer.py']},
        'annotation_inputs_read':False,'model_calls':0,'score_computed':False}
    save(output,'extraction.json',record)
    print(json.dumps({k:record[k] for k in ['case','snapshot','nodes','endpoints','edges','unresolved']}))


def graph_check(snapshot,output):
    # Assert a query-ready, empty user DB before the unchanged P02 graph core runs.
    from neo4j import GraphDatabase
    with GraphDatabase.driver('bolt://database:7687',auth=None) as driver:
        for attempt in range(90):
            try: core.database_ready(driver);break
            except Exception:
                if attempt==89:raise
                time.sleep(1)
        with driver.session(database='neo4j') as session:
            assert session.run('MATCH(n) RETURN count(n) AS count').single()['count']==0
    save(output,'fresh-database.json',{'empty_before_first_import':True,'database':'neo4j'})
    core.graph_check(snapshot,output)


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['extract','graph']);p.add_argument('--snapshot',choices=['baseline','mutated'],required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();a.output.mkdir(parents=True,exist_ok=False)
    try:(extract if a.action=='extract' else graph_check)(a.snapshot,a.output)
    except Exception as error:
        save(a.output,'failure.json',{'type':type(error).__name__,'message':str(error)});raise
