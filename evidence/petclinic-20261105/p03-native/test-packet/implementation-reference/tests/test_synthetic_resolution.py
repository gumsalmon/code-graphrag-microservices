"""Additional synthetic coverage; no PetClinic inputs or impact labels."""
from pathlib import Path
import tempfile
import unittest
from src.parser import DependencyGraphBuilder


class ResolutionTests(unittest.TestCase):
    def graph(self, files):
        with tempfile.TemporaryDirectory() as folder:
            paths = []
            for name, code in files:
                path = Path(folder) / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(code, encoding='utf-8')
                paths.append(str(path))
            return DependencyGraphBuilder(repository='synthetic://resolution', commit_sha='synthetic').build_multi_file_graph(paths)

    def rest(self, endpoints):
        provider = 'package demo.customers; class Provider {' + endpoints + '}'
        client = ('package demo.api; class Client { public Object fetch() {'
                  'return web.get().uri("http://customers-service/items").retrieve(); }}')
        return self.graph([('customers-service/Provider.java', provider), ('api-gateway/Client.java', client)])

    def test_no_diagnostic_for_other_endpoint_when_exact_match_exists(self):
        graph = self.rest('@PostMapping("/items") public Object write() {return null;} '
                          '@GetMapping("/items") public Object read() {return null;}')
        self.assertEqual(len(graph['edges']), 1)
        self.assertEqual(graph['unresolved'], [])

    def test_path_mismatch_preserves_invocation_span_and_requested_target(self):
        graph = self.rest('@GetMapping("/elsewhere") public Object read() {return null;}')
        self.assertEqual(graph['edges'], [])
        self.assertEqual(len(graph['unresolved']), 1)
        item = graph['unresolved'][0]
        self.assertIn('.uri(', item['expression'])
        self.assertIn('within supplied endpoints', item['reason'])
        self.assertIn('customers-service', item['reason'])
        self.assertIn('/items', item['reason'])
        self.assertTrue(item['file'].endswith('Client.java'))
        self.assertGreater(item['line_start'], 0)
        self.assertGreaterEqual(item['line_end'], item['line_start'])

    def overload(self, argument, reversed_order=False):
        methods = ['public Object choose(String x) {return null;}', 'public Object choose(Integer x) {return null;}']
        if reversed_order:
            methods.reverse()
        receiver = 'package demo.api; class Store {' + ''.join(methods) + '}'
        caller = ('package demo.api; class Entry { private Store store; '
                  'public Object call() {return store.choose(' + argument + ');}}')
        return self.graph([('api-gateway/Store.java', receiver), ('api-gateway/Entry.java', caller)])

    def test_ambiguous_candidates_reported_in_stable_order_without_edges(self):
        first, second = self.overload('null'), self.overload('null', True)
        for graph in (first, second):
            self.assertEqual(graph['edges'], [])
            self.assertEqual(len(graph['unresolved']), 1)
            item = graph['unresolved'][0]
            self.assertIn('store.choose(null)', item['expression'])
            self.assertIn('#choose(String)', item['reason'])
            self.assertIn('#choose(Integer)', item['reason'])
        self.assertEqual(first['unresolved'][0]['reason'], second['unresolved'][0]['reason'])

    def test_known_overload_still_resolves_in_either_declaration_order(self):
        for order in (False, True):
            graph = self.overload('"x"', order)
            self.assertEqual(len(graph['edges']), 1)
            self.assertTrue(graph['edges'][0]['target_id'].endswith('#choose(String)'))
            self.assertEqual(graph['unresolved'], [])


if __name__ == '__main__':
    unittest.main()
