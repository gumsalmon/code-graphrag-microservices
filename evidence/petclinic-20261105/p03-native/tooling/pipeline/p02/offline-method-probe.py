"""Receipt-bound source extraction and private Neo4j checks. No annotations/models/scoring."""
import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path
import sys
import time


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def save(root, name, value):
    with (root / name).open('x', encoding='utf-8') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2); stream.write('\n')


def statements(script):
    text = '\n'.join(line for line in script.splitlines() if not line.lstrip().startswith('//'))
    quote, escaped, start = None, False, 0
    result = []
    for index, char in enumerate(text):
        if quote:
            if escaped: escaped = False
            elif char == '\\': escaped = True
            elif char == quote: quote = None
        elif char in ('"', "'", '`'): quote = char
        elif char == ';':
            if text[start:index].strip(): result.append(text[start:index].strip())
            start = index + 1
    if quote: raise ValueError('Unterminated generated Cypher string')
    if text[start:].strip(): result.append(text[start:].strip())
    return result


def extract(snapshot, output):
    sys.path.insert(0, '/implementation')
    from src.parser import DependencyGraphBuilder
    from src.neo4j_importer import Neo4jGraphImporter
    root = Path('/input'); meta = json.loads((root / 'INPUT.json').read_bytes())
    receipt_raw = (root / 'receipt.json').read_bytes()
    if sha(receipt_raw) != meta['receipt_sha256']: raise ValueError('Changed technical receipt')
    receipt = json.loads(receipt_raw)
    if receipt['case'] != 'P02' or receipt['status'] != 'ready_for_offline_integration': raise ValueError('Wrong case receipt')
    if receipt['model_calls_authorized'] or receipt['labels_or_annotation_notes_included']: raise ValueError('Invalid technical scope')
    files = meta['snapshots'][snapshot]
    paths = []
    for row in files:
        path = root / snapshot / row['file']
        if sha(path.read_bytes()) != row['sha256']: raise ValueError('Changed source input')
        paths.append(path)
    before = {str(p):sha(p.read_bytes()) for p in paths}
    builder = DependencyGraphBuilder(repository='spring-petclinic-microservices', commit_sha=meta['source_commit'])
    graph = builder.build_multi_file_graph([str(p) for p in paths],snapshot_kind=snapshot,
        patch_id=meta['patch_id'] if snapshot=='mutated' else None)
    aliases = {}
    for row,path in zip(files,paths):
        for group in builder.parser.parse_source(path.read_text(encoding='utf-8'),str(path)):
            for item in group:
                key=item.file.replace('\\','/')
                if key in aliases and aliases[key] != row['file']: raise ValueError('Ambiguous source alias')
                aliases[key]=row['file']
    seed_id=meta['seed_ids'][snapshot]
    if sum(n['id']==seed_id for n in graph['nodes']) != 1: raise ValueError('Seed absent/ambiguous')
    save(output,'graph.native.json',graph)
    Neo4jGraphImporter().generate_cypher_script(graph,str(output/'graph.generated.cypher'))
    if before != {str(p):sha(p.read_bytes()) for p in paths}: raise ValueError('Source changed')
    record={'snapshot':snapshot,'case':'P02','receipt_sha256':sha(receipt_raw),'source_commit':meta['source_commit'],
        'patch_id':meta['patch_id'] if snapshot=='mutated' else None,'source_files':files,'native_source_map':aliases,
        'seed_id':seed_id,'nodes':len(graph['nodes']),'endpoints':len(graph['endpoints']),
        'edges':len(graph['edges']),'unresolved':len(graph.get('unresolved',[])),
        'dependencies':{p:importlib.metadata.version(p) for p in ['tree-sitter','tree-sitter-java','neo4j']},
        'code':{n:sha((Path('/implementation/src')/n).read_bytes()) for n in ['parser.py','neo4j_importer.py']},
        'annotation_inputs_read':False,'model_calls':0,'score_computed':False}
    save(output,'extraction.json',record)
    print(json.dumps({k:record[k] for k in ['snapshot','nodes','endpoints','edges','unresolved','model_calls']}))


def dump(session):
    nodes = [dict(r) for r in session.run('MATCH(n) RETURN labels(n) AS labels, properties(n) AS properties')]
    edges = [dict(r) for r in session.run('MATCH(a)-[r]->(b) RETURN labels(a) AS source_labels, properties(a) AS source, type(r) AS type, properties(r) AS properties, labels(b) AS target_labels, properties(b) AS target')]
    key=lambda row:json.dumps(row,sort_keys=True)
    return {'nodes':sorted(nodes,key=key),'edges':sorted(edges,key=key)}


def database_ready(driver):
    driver.verify_connectivity()
    with driver.session(database='neo4j') as session:
        if session.run('RETURN 1 AS ready').single()['ready'] != 1:
            raise ValueError('User database is not query-ready')


def retrieve(session, source_root, output, label):
    meta=json.loads(Path('/input/INPUT.json').read_bytes()); extracted=json.loads((source_root/'extraction.json').read_bytes())
    graph=json.loads((source_root/'graph.native.json').read_bytes()); by_id={n['id']:n for n in graph['nodes']}
    plans=[]
    for depth in [1,2,3]:
        query=f'''MATCH p=(caller:Method)-[:CALLS|INVOKES_API*1..{depth}]->(seed:Method {{id:$seed}})
 WHERE caller.id<>$seed AND all(r IN relationships(p) WHERE r.resolution_status='RESOLVED')
 RETURN caller.id AS id, length(p) AS logical_hop, [n IN nodes(p)|n.id] AS witness_ids, [r IN relationships(p)|type(r)] AS relation_types
 ORDER BY id, logical_hop, witness_ids'''
        seed_id=extracted['seed_id']
        rows=[dict(r) for r in session.run(query,seed=seed_id)]
        chunks=[]
        for identifier in sorted({seed_id}|{r['id'] for r in rows}):
            node=by_id[identifier]; alias=node['file'].replace('\\','/'); name=extracted['native_source_map'].get(alias)
            if name is None: raise ValueError('Retrieval source alias unavailable')
            raw=(Path('/input')/extracted['snapshot']/name).read_bytes(); lines=raw.splitlines(keepends=True)
            first,last=node['line_start'],node['line_end']
            if not 1<=first<=last<=len(lines): raise ValueError('Retrieval span out of bounds')
            excerpt=b''.join(lines[first-1:last])
            chunks.append({'id':identifier,'file':name,'line_start':first,'line_end':last,'source_sha256':sha(raw),
                           'excerpt_sha256':sha(excerpt),'excerpt':excerpt.decode('utf-8')})
        plans.append({'depth_limit':depth,'query':query,'parameters':{'seed':seed_id},'paths':rows,'chunks':chunks,
                      'not_an_impact_label':True})
    save(output,label+'.retrieval.json',{'snapshot':extracted['snapshot'],'plans':plans,'seed_excluded_from_candidate_paths':True,
         'graph_reachability_only':True,'embedding_or_model_inference':False,'score_computed':False})
    return plans


def graph_check(snapshot, output):
    sys.path.insert(0,'/implementation')
    from neo4j import GraphDatabase
    from src.neo4j_importer import Neo4jGraphImporter
    source=Path('/artifacts')/snapshot;graph=json.loads((source/'graph.native.json').read_bytes())
    uri='bolt://database:7687';polls=[]
    with GraphDatabase.driver(uri,auth=None) as driver:
        for attempt in range(90):
            try: database_ready(driver);polls.append({'attempt':attempt+1,'ready':True,'database':'neo4j','actual_query_verified':True});break
            except Exception as error:
                polls.append({'attempt':attempt+1,'ready':False,'error_type':type(error).__name__})
                time.sleep(1)
        else:
            try:
                with driver.session(database='system') as session:
                    save(output,'database-status-on-timeout.json',[dict(r) for r in session.run('SHOW DATABASES YIELD name, currentStatus, statusMessage RETURN name, currentStatus, statusMessage')])
            except Exception: pass
            save(output,'readiness.json',polls);raise RuntimeError('Neo4j readiness timeout')
        save(output,'readiness.json',polls)
        importer=Neo4jGraphImporter(uri=uri,auth=None)
        ok,message=importer.import_to_neo4j(graph)
        if not ok: raise RuntimeError(message)
        with driver.session() as session: first=dump(session)
        ok,message=importer.import_to_neo4j(graph)
        if not ok: raise RuntimeError(message)
        with driver.session() as session:
            second=dump(session);direct_retrieval=retrieve(session,source,output,'direct')
            save(output,'direct.first.json',first);save(output,'direct.second.json',second)
            if first!=second: raise ValueError('Direct same-snapshot import is not idempotent')
            # This is the fresh run-owned sandbox database, never a personal/project DB.
            session.run('MATCH(n) DETACH DELETE n').consume()
            cypher=statements((source/'graph.generated.cypher').read_text(encoding='utf-8'))
            for statement in cypher: session.run(statement).consume()
            exported_first=dump(session)
            for statement in cypher: session.run(statement).consume()
            exported_second=dump(session);export_retrieval=retrieve(session,source,output,'cypher')
            save(output,'cypher.first.json',exported_first);save(output,'cypher.second.json',exported_second)
        if exported_first!=exported_second: raise ValueError('Cypher same-snapshot import is not idempotent')
        pick=lambda data,label: [n for n in data['nodes'] if label in n['labels']]
        dep=lambda data:[e for e in data['edges'] if e['type'] in ['CALLS','INVOKES_API']]
        parity={'methods':pick(first,'Method')==pick(exported_first,'Method'),
                'endpoints_and_query_metadata':pick(first,'Endpoint')==pick(exported_first,'Endpoint'),
                'dependency_edges_and_contract_metadata':dep(first)==dep(exported_first),
                'retrieval_paths_and_source_chunks':direct_retrieval==export_retrieval}
        save(output,'parity.json',{'snapshot':snapshot,'checks':parity,'direct_idempotent':True,'cypher_idempotent':True,
             'full_node_property_parity':first['nodes']==exported_first['nodes'],
             'class_properties_direct':pick(first,'Class'),'class_properties_cypher':pick(exported_first,'Class'),
             'snapshot_isolation':'fresh database container per snapshot; importer keys are not intrinsically snapshot-qualified',
             'nodes':len(first['nodes']),'relationships':len(first['edges']),'labels_or_raw_observations_read':False,'model_calls':0,'score_computed':False})
        if not all(parity.values()): raise ValueError('Required metadata/retrieval parity failed; raw comparisons retained')
        print(json.dumps({'snapshot':snapshot,'checks':parity,'nodes':len(first['nodes']),'relationships':len(first['edges'])}))


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('action',choices=['extract','graph']);p.add_argument('--snapshot',choices=['baseline','mutated'],required=True);p.add_argument('--output',type=Path,required=True)
    args=p.parse_args();args.output.mkdir(parents=True,exist_ok=False)
    try:
        (extract if args.action=='extract' else graph_check)(args.snapshot,args.output)
    except Exception as error:
        save(args.output,'failure.json',{'type':type(error).__name__,'message':str(error),'model_calls':0,'score_computed':False});raise


if __name__=='__main__': main()
