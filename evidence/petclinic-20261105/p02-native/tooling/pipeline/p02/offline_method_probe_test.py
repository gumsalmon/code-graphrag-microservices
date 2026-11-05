import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('offline_probe',Path(__file__).with_name('offline-method-probe.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


class CypherSplitterTests(unittest.TestCase):
    def test_comments_and_multiple_statements(self):
        self.assertEqual(module.statements('// comment;\nRETURN 1;\nRETURN 2;'),['RETURN 1','RETURN 2'])

    def test_semicolon_inside_generated_json_string_is_not_separator(self):
        text='RETURN "a;b", "[\\"x\\",\\"y\\"]"; RETURN \'c;d\';'
        self.assertEqual(len(module.statements(text)),2)
        self.assertIn('a;b',module.statements(text)[0])

    def test_unterminated_string_is_refused(self):
        with self.assertRaises(ValueError): module.statements('RETURN "bad;')

    def test_bolt_connectivity_without_query_ready_database_is_not_ready(self):
        class Driver:
            def verify_connectivity(self): pass
            def session(self, **kwargs):
                if kwargs != {'database':'neo4j'}: raise AssertionError('Wrong readiness database')
                raise RuntimeError('User database unavailable')
        with self.assertRaises(RuntimeError): module.database_ready(Driver())

    def test_readiness_runs_a_real_query_on_the_explicit_user_database(self):
        class Session:
            def __enter__(self): return self
            def __exit__(self,*args): pass
            def run(self,query):
                if query != 'RETURN 1 AS ready': raise AssertionError('Missing readiness query')
                return self
            def single(self): return {'ready':1}
        class Driver:
            def verify_connectivity(self): pass
            def session(self,**kwargs):
                if kwargs != {'database':'neo4j'}: raise AssertionError('Wrong database')
                return Session()
        module.database_ready(Driver())


if __name__=='__main__':unittest.main()
