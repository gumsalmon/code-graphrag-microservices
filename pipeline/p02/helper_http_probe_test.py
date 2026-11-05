import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('helper_probe_under_test', Path(__file__).with_name('helper-http-probe.py'))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class HelperHttpProbeTests(unittest.TestCase):
    def test_only_three_fixed_private_gets_are_collected(self):
        called = []
        def capture(directory, request):
            called.append(request)
            return {'id': request['id'], 'error': None, 'status': 200}, {'fixture': 'synthetic'}
        with tempfile.TemporaryDirectory() as root, patch.object(probe.f03, 'capture', side_effect=capture):
            directory = Path(root)
            probe.collect(directory)
            result = json.loads((directory / 'result.json').read_text(encoding='utf-8'))
        self.assertEqual([(r['id'], r['target'], r['method'], r['path']) for r in called], [
            ('owner', 'customers', 'GET', '/owners/6'),
            ('provider', 'visits', 'GET', '/pets/visits?petId=7,8'),
            ('gateway', 'gateway', 'GET', '/api/gateway/owners/6')])
        self.assertFalse(result['labels_created'])
        self.assertEqual(result['post_requests'], 0)

    def test_missing_or_error_input_does_not_become_empty_success(self):
        for record, body in [({'id': 'owner', 'error': 'connection failure', 'status': None}, None),
                             ({'id': 'owner', 'error': None, 'status': 503}, {}),
                             ({'id': 'owner', 'error': None, 'status': 200}, None)]:
            with tempfile.TemporaryDirectory() as root, patch.object(probe.f03, 'capture', return_value=(record, body)):
                with self.assertRaises(RuntimeError):
                    probe.collect(Path(root))
                self.assertFalse((Path(root) / 'result.json').exists())


if __name__ == '__main__':
    unittest.main()
