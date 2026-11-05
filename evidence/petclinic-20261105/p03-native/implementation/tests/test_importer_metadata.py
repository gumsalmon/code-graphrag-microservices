"""Synthetic unit/mock parity only. Never starts Neo4j or reads benchmark data."""
import importlib.util
import json
import os
from pathlib import Path
import re
import tempfile
import unittest
from unittest.mock import MagicMock, patch

REPO = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('metadata_importer', REPO / 'src/neo4j_importer.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def synthetic_graph(required, default):
    nodes = [dict(id=identifier, service=service, class_fqn=cls, method_name='fetch',
                  parameter_types=[], file='synthetic.java', line_start=1, line_end=2)
             for identifier, service, cls in [('caller', 'gateway', 'demo.Client'), ('handler', 'records', 'demo.Provider')]]
    return dict(nodes=nodes, endpoints=[dict(handler_id='handler', http_method='GET', normalized_path='/records',
        query_parameters=[dict(name='expand', type='boolean', declared_required=required,
                               effective_required=required is True and default is None, default_value=default)])],
        edges=[dict(source_id='caller', target_id='handler', type='INVOKES_API', target_service='records',
                    http_method='GET', normalized_path='/records', sent_query_parameters=['ids'],
                    missing_required_parameters=['expand'] if required and default is None else [],
                    contract_status='MISSING' if required and default is None else 'VALID', resolution_status='RESOLVED'),
               dict(source_id='caller', target_id='handler', type='CALLS', resolution_status='RESOLVED',
                    has_circuit_breaker=False, fallback_method=None)])


class MetadataParityTests(unittest.TestCase):
    def capture(self, graph, name):
        database = MagicMock()
        session = database.driver.return_value.__enter__.return_value.session.return_value.__enter__.return_value
        with tempfile.TemporaryDirectory() as temp, patch.object(module, 'GraphDatabase', database):
            importer = module.Neo4jGraphImporter()
            cypher = importer.generate_cypher_script(graph, str(Path(temp) / 'export.cypher'))
            success, message = importer.import_to_neo4j(graph)
        self.assertTrue(success, message)
        queries = [{'query': args[0], 'parameters': kwargs} for args, kwargs in session.run.call_args_list]
        if os.environ.get('SYNTHETIC_ARTIFACTS'):
            folder = Path(os.environ['SYNTHETIC_ARTIFACTS'])
            folder.mkdir(parents=True, exist_ok=True)
            (folder / (name + '.json')).write_text(json.dumps({'input': graph, 'captured_queries': queries}, indent=2), encoding='utf-8')
            (folder / (name + '.cypher')).write_text(cypher, encoding='utf-8')
        return cypher, queries

    def check_parity(self, required, default, name):
        graph = synthetic_graph(required, default)
        cypher, queries = self.capture(graph, name)
        endpoint = next(row for row in queries if 'MERGE (e:Endpoint' in row['query'])
        self.assertRegex(endpoint['query'], r'e\.query_parameters\s*=\s*\$query_parameters')
        exported = re.search(r'e\.query_parameters = ("(?:[^"\\]|\\.)*")', cypher).group(1)
        self.assertEqual(json.loads(json.loads(exported)), graph['endpoints'][0]['query_parameters'])
        self.assertEqual(json.loads(endpoint['parameters']['query_parameters']), graph['endpoints'][0]['query_parameters'])
        edge = next(row for row in queries if 'r:INVOKES_API' in row['query'])
        for field in ('sent_query_parameters', 'missing_required_parameters'):
            self.assertRegex(edge['query'], field + r':\s*\$' + field)
            self.assertEqual(edge['parameters'][field], graph['edges'][0][field])
            exported_list = re.search(field + r': (\[[^\]]*\])', cypher).group(1)
            self.assertEqual(json.loads(exported_list), edge['parameters'][field])

    def test_optional_default_parity(self):
        self.check_parity(False, 'false', 'optional')

    def test_required_and_missing_query_parity(self):
        self.check_parity(True, None, 'required')

    def test_default_without_declared_flag_parity(self):
        self.check_parity(None, 'false', 'implicit-default')

    def test_null_fallback_is_same_empty_string_on_both_paths(self):
        cypher, queries = self.capture(synthetic_graph(False, None), 'fallback')
        row = next(row for row in queries if 'r:CALLS' in row['query'])
        self.assertEqual(row['parameters']['fb'], '')
        self.assertIn('fallback_method: ""', cypher)


if __name__ == '__main__':
    unittest.main()
