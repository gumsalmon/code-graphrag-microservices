"""Verify real Neo4j parity in an isolated, disposable P02 database.

Run once per snapshot in a newly started Neo4j sandbox. No label, model,
score, P03 data, or cloud interaction is involved.
"""

import argparse
import json
import sys
import time
from pathlib import Path

from neo4j import GraphDatabase, __version__ as driver_version

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from src.neo4j_importer import Neo4jGraphImporter
from src.parser import DependencyGraphBuilder


def snapshot(session):
    nodes = [
        {'labels': sorted(row['labels']), 'properties': row['properties']}
        for row in session.run('MATCH (n) RETURN labels(n) AS labels, properties(n) AS properties')
    ]
    relationships = [
        {'start_labels': sorted(row['start_labels']), 'start_props': row['start_props'],
         'type': row['type'], 'properties': row['properties'],
         'end_labels': sorted(row['end_labels']), 'end_props': row['end_props']}
        for row in session.run('''MATCH (a)-[r]->(b)
            RETURN labels(a) AS start_labels, properties(a) AS start_props,
            type(r) AS type, properties(r) AS properties,
            labels(b) AS end_labels, properties(b) AS end_props''')
    ]
    sort = lambda values: sorted(values, key=lambda value: json.dumps(value, sort_keys=True))
    return {'nodes': sort(nodes), 'relationships': sort(relationships)}


def reachability(session, seed, graph):
    # A reachable caller is a technical graph witness, never a gold impact label.
    result = {}
    local = DependencyGraphBuilder()
    nodes_by_id = {n['id']: n for n in graph['nodes']}
    for hops in (1, 2, 3):
        query = f'''MATCH (seed:Method {{id: $seed}})
            MATCH p = (caller:Method)-[:CALLS|INVOKES_API*1..{hops}]->(seed)
            RETURN [node IN nodes(p) | node.id] AS nodes,
                [rel IN relationships(p) | type(rel)] AS edge_types,
                [rel IN relationships(p) | properties(rel)] AS edge_properties'''
        paths = session.run(query, seed=seed)
        witnesses = []
        for row in paths:
            ids = row['nodes']
            # Native graph holds source spans/evidence absent in DB schema.
            evidence = [[e for e in graph['edges'] if e['source_id']==a and e['target_id']==b and e['type']==t] for a,b,t in zip(ids,ids[1:],row['edge_types'])]
            witnesses.append({'nodes': ids, 'edge_types': row['edge_types'], 'edge_properties': row['edge_properties'], 'logical_hops': len(row['edge_types']), 'service_boundaries': sum(nodes_by_id[a]['service'] != nodes_by_id[b]['service'] for a,b in zip(ids,ids[1:])), 'source_nodes': [nodes_by_id[i] for i in ids], 'native_edge_evidence': evidence})
        witnesses.sort(key=lambda value: json.dumps(value,sort_keys=True))
        from_neo4j = sorted({row['nodes'][0] for row in witnesses})
        offline = sorted(n['node_id'] for n in local.trace_backward_impact(graph, seed, max_hops=hops)['impacted_nodes'])
        assert from_neo4j == offline, f'reachability mismatch at {hops} hops'
        result[str(hops)] = {'query': query, 'parameters': {'seed': seed}, 'seed_excluded_from_callers': True, 'reachable_ids': from_neo4j, 'paths': witnesses, 'offline_result': local.trace_backward_impact(graph, seed, max_hops=hops), 'unresolved': graph['unresolved']}
    return result


def execute_cypher_script(session, script):
    # P02 exporter emits semicolon-terminated statements; no embedded semicolons
    # in this source-only candidate, and a separate file stores the raw Cypher.
    # Drop full-line comments before splitting so a commented-out statement
    # ending with ';' is never executed as an empty Cypher query.
    content = '\n'.join(line for line in script.splitlines()
                        if not line.lstrip().startswith('//'))
    statements = [s.strip() for s in content.split(';') if s.strip()]
    for statement in statements:
        session.run(statement).consume()
    return len(statements)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--uri', required=True)
    p.add_argument('--user', default='neo4j')
    p.add_argument('--password', required=True)
    p.add_argument('--graph', type=Path, required=True)
    p.add_argument('--cypher', type=Path, required=True)
    p.add_argument('--seed', required=True)
    p.add_argument('--out', type=Path, required=True)
    args = p.parse_args()

    assert not args.out.exists(), 'Never overwrite an existing result'
    graph = json.loads(args.graph.read_text(encoding='utf-8'))
    assert graph['metadata']['snapshot_kind'] in ('baseline', 'mutated')
    assert args.seed in {n['id'] for n in graph['nodes']}
    script = args.cypher.read_text(encoding='utf-8')
    driver = GraphDatabase.driver(args.uri, auth=(args.user, args.password))
    for attempt in range(60):
        try:
            driver.verify_connectivity()
            break
        except Exception:
            if attempt == 59:
                raise
            time.sleep(2)

    importer = Neo4jGraphImporter(uri=args.uri, auth=(args.user, args.password))
    result = {'snapshot': graph['metadata']['snapshot_kind'], 'driver_version': driver_version,
              'uri': args.uri, 'node_count_expected_from_graph': len(graph['nodes']),
              'seed': args.seed}
    with driver:
        with driver.session() as session:
            initial = snapshot(session)
            assert not initial['nodes'] and not initial['relationships'], 'Database is not fresh'
            result['server_version'] = session.run('CALL dbms.components() YIELD versions RETURN versions[0] AS version').single()['version']
        ok, msg = importer.import_to_neo4j(graph)
        assert ok, msg
        with driver.session() as session:
            result['direct_first'] = snapshot(session)
            result['direct_retrieval'] = reachability(session, args.seed, graph)
        ok, msg = importer.import_to_neo4j(graph)
        assert ok, msg
        with driver.session() as session:
            result['direct_second'] = snapshot(session)
            assert result['direct_first'] == result['direct_second'], 'Direct import is not idempotent'
            # Same snapshot, fresh empty graph; constraints are retained.
            session.run('MATCH (n) DETACH DELETE n').consume()
            assert not snapshot(session)['nodes']
            result['cypher_statements'] = execute_cypher_script(session, script)
            result['cypher_first'] = snapshot(session)
            result['cypher_retrieval'] = reachability(session, args.seed, graph)
            result['cypher_statements_repeat'] = execute_cypher_script(session, script)
            result['cypher_second'] = snapshot(session)
            assert result['cypher_first'] == result['cypher_second'], 'Cypher import is not idempotent'
            assert result['direct_first'] == result['cypher_first'], 'Full property/relationship parity mismatch'
            assert result['direct_retrieval'] == result['cypher_retrieval'], 'Retrieval witness parity mismatch'
    result['status'] = 'passed_full_properties_idempotence_retrieval'
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'status': result['status'], 'snapshot': result['snapshot'],
                      'server_version': result['server_version'],
                      'driver_version': result['driver_version'],
                      'nodes': len(result['direct_first']['nodes']),
                      'relationships': len(result['direct_first']['relationships']),
                      'cypher_statements': result['cypher_statements'],
                      'reachable_1_2_3': {k: len(v['reachable_ids']) for k, v in result['direct_retrieval'].items()}}, indent=2))


if __name__ == '__main__':
    main()
