"""Generated, synthetic regression tests; no benchmark labels or network calls."""

import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from src.neo4j_importer import Neo4jGraphImporter
from src import neo4j_importer
from src.parser import DependencyGraphBuilder


class ExplicitMethodInventoryTests(unittest.TestCase):
    def test_all_explicit_class_methods_survive_without_dependency_edges(self):
        java = '''package sample.inventory;
class Gadget {
  Gadget() {}
  private void alpha() {}
  protected int beta(int value) { return value; }
  void gamma(String input) {}
  public static void delta() {}
  public void overload(int x) {}
  public void overload(String x) {}
  @GetMapping("/status") public String status() { return "ok"; }
}
record Info(int x) { public int twice() { return x * 2; } }
interface Unrelated { void abstracted(); }
'''
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / 'synthetic-service' / 'Gadget.java'
            source.parent.mkdir()
            source.write_text(java, encoding='utf-8')
            graph = DependencyGraphBuilder().build_multi_file_graph([str(source)])

        nodes = graph['nodes']
        by_name = {}
        for item in nodes:
            by_name.setdefault(item['method_name'], []).append(item)
        self.assertEqual(set(by_name), {'alpha', 'beta', 'gamma', 'delta', 'overload', 'status'})
        self.assertEqual(len(nodes), 7)
        self.assertEqual(len(by_name['overload']), 2)
        self.assertEqual({tuple(x['parameter_types']) for x in by_name['overload']},
                         {('int',), ('String',)})
        self.assertEqual(len({item['id'] for item in nodes}), 7)
        self.assertFalse(graph['edges'])
        self.assertEqual(len(graph['endpoints']), 1)
        for item in nodes:
            self.assertEqual(item['class_fqn'], 'sample.inventory.Gadget')
            self.assertLessEqual(item['line_start'], item['line_end'])
            self.assertIn('Gadget.java', item['file'])
        self.assertEqual(graph['endpoints'][0]['handler_id'], by_name['status'][0]['id'])

    def test_edge_free_methods_do_not_change_existing_edge_semantics(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / 'synthetic-service' / 'Gadget.java'
            source.parent.mkdir()
            source.write_text('''package sample.inventory;
class Gadget {
 @GetMapping("/items") public String fetch() { return "ok"; }
 private void unrelated() {}
}
''', encoding='utf-8')
            graph = DependencyGraphBuilder().build_multi_file_graph([str(source)])
        self.assertEqual(len(graph['nodes']), 2)
        self.assertEqual(graph['edges'], [])
        self.assertEqual(len(graph['endpoints']), 1)
        self.assertEqual(graph['endpoints'][0]['handler_id'],
                         next(n['id'] for n in graph['nodes'] if n['method_name'] == 'fetch'))


class ClassNameImportParityTests(unittest.TestCase):
    def test_direct_class_name_matches_cypher_export_for_multiple_classes(self):
        graph = {'nodes': [
            {'id': 'A#one()', 'service': 'synthetic', 'class_fqn': 'example.deep.Alpha',
             'method_name': 'one', 'parameter_types': [], 'file': 'Alpha.java',
             'line_start': 1, 'line_end': 2},
            {'id': 'B#two()', 'service': 'synthetic', 'class_fqn': 'Solo',
             'method_name': 'two', 'parameter_types': [], 'file': 'Solo.java',
             'line_start': 3, 'line_end': 4},
        ], 'endpoints': [], 'edges': []}
        db = MagicMock()
        session = db.driver.return_value.__enter__.return_value.session.return_value.__enter__.return_value
        with tempfile.TemporaryDirectory() as tmp, patch.object(neo4j_importer, 'GraphDatabase', db):
            importer = Neo4jGraphImporter()
            script = importer.generate_cypher_script(graph, str(Path(tmp) / 'graph.cypher'))
            ok, msg = importer.import_to_neo4j(graph)
        self.assertTrue(ok, msg)
        class_calls = [(args[0], kwargs) for args, kwargs in session.run.call_args_list
                       if 'MERGE (c:Class' in args[0]]
        self.assertEqual(len(class_calls), 2)
        for query, params in class_calls:
            self.assertRegex(query, r'ON CREATE SET c\.name = \$class_name, c\.file = \$file')
            name = params['class_fqn'].split('.')[-1]
            self.assertEqual(params['class_name'], name)
            self.assertIn(f'c.name = "{name}"', script)
            self.assertIn(f'c.file = "{params["file"]}"', script)


if __name__ == '__main__':
    unittest.main()
