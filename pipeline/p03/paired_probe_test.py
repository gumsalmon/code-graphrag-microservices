import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from response_checks import canonical

def load(name, file):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(file))
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module); return module

probe = load('paired_probe_test_subject', 'paired-probe.py')
baseline_tests = load('baseline_fixture_data', 'baseline_probe_test.py')
FIXTURE, BODY = baseline_tests.FIXTURE, baseline_tests.BODY

class PairedProbeTests(unittest.TestCase):
    def test_lifecycle_readiness_uses_health_not_pets_animals_or_gateway_prediction(self):
        for target in ['customers', 'visits', 'gateway']:
            self.assertEqual(probe.readiness_spec(target), (target, '/actuator/health'))
            self.assertTrue(probe.lifecycle_ready(target, {'status': 'UP'}))
            self.assertFalse(probe.lifecycle_ready(target, {'status': 'DOWN'}))
            for key in ['pets', 'animals']:
                self.assertFalse(probe.lifecycle_ready(target, {'id': 6, key: [{'id': 7}, {'id': 8}]}))

    def test_registry_wait_requires_all_selected_apps_up(self):
        body = {'applications': {'application': [{'name': name, 'instance': {'status': 'UP'}} for name in ['CUSTOMERS-SERVICE', 'VISITS-SERVICE', 'API-GATEWAY']]}}
        self.assertEqual(probe.readiness_spec('registered'), ('discovery', '/eureka/apps'))
        self.assertTrue(probe.lifecycle_ready('registered', body))
        body['applications']['application'].pop()
        self.assertFalse(probe.lifecycle_ready('registered', body))

    def test_health_poll_records_readiness_without_calling_business_endpoint(self):
        calls = []
        def capture(directory, name, target, path):
            calls.append((target, path))
            return {'error': None, 'status': 200}, {'status': 'UP'}
        with tempfile.TemporaryDirectory() as temp, patch.object(probe.base.shared, 'capture', side_effect=capture):
            result = probe.wait(Path(temp), 'gateway')
            self.assertEqual(calls, [('gateway', '/actuator/health')])
            self.assertFalse(result['business_response_shape_used_as_readiness'])
            self.assertEqual(result['measurement_version'], 2)

    def test_readback_allows_only_explicit_collection_key_alternative_without_modifying_raw(self):
        expected = {'id': 73, 'pets': [], **BODY}
        for key in ['pets', 'animals']:
            raw = json.dumps({('animals' if k == 'pets' and key == 'animals' else k): v for k, v in expected.items()}).encode()
            original = raw[:]; result = probe.readback_owner(raw, expected)
            self.assertEqual(result['collection_key_observed'], key); self.assertEqual(raw, original)
        for invalid in [{**expected, 'animals': []}, {**expected, 'telephone': 'changed'}, {'id': 73, 'animals': []}]:
            with self.assertRaises(ValueError): probe.readback_owner(json.dumps(invalid).encode(), expected)

    def fake(self, broken_reset=False, transport_failure=False):
        owners = [{'id': i, **BODY, 'pets': [{'id': p['id']} for p in FIXTURE['seed_pets'] if p['owner_id'] == i]} for i in range(1, 11)]
        if broken_reset: owners.pop()
        generated = iter([73, 82]); self.writes = []
        def capture(directory, request, fixture, bindings):
            probe.base.validate_request(request, fixture, bindings)
            if transport_failure and request['id'] == 'gateway_populated': raise RuntimeError('synthetic transport failure')
            status = 200; name = request['id']; method = request['method']; path = request['path']
            if method == 'POST':
                body = {'id': next(generated), 'pets': [], **request['body']}; owners.append(copy.deepcopy(body)); status = 201; self.writes.append(request)
            elif method == 'PUT':
                next(o for o in owners if o['id'] == int(path.rsplit('/', 1)[1])).update(request['body']); body = None; status = 204; self.writes.append(request)
            elif name.startswith('gateway_'): body = {'error': 'Synthetic unknown outcome'}; status = 500
            elif name.startswith('missing_'): body = None
            elif path == '/owners': body = copy.deepcopy(owners)
            elif request['target'] == 'visits': body = {'items': []}
            else:
                owner = next(o for o in owners if o['id'] == int(path.rsplit('/', 1)[1]))
                body = {('animals' if k == 'pets' else k): copy.deepcopy(v) for k, v in owner.items()}
            return {'status': status}, b'' if status == 204 else json.dumps(body).encode()
        return capture

    def test_mutated_collect_keeps_500_and_all_controls_uses_observed_generated_ids(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(probe.base, 'capture', side_effect=self.fake()):
            result = probe.collect(Path(temp), FIXTURE, 'mutated')
            self.assertEqual(result['bindings'], {'empty_owner_id': 73, 'write_owner_id': 82})
            self.assertEqual(len(result['all_requests']), 17); self.assertEqual(len(result['slots']), 12)
            self.assertEqual(next(r['status'] for r in result['slots'] if r['id'] == 'gateway_populated'), 500)
            self.assertEqual(self.writes[-1]['path'], '/owners/82'); self.assertFalse(result['labels_created'])
            self.assertTrue(all(r['collection_key_observed'] == 'animals' for r in result['fixture_identity_readbacks']))

    def test_invalid_reset_aborts_before_any_write(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(probe.base, 'capture', side_effect=self.fake(broken_reset=True)):
            with self.assertRaises(ValueError): probe.collect(Path(temp), FIXTURE, 'mutated')
            self.assertEqual(self.writes, [])

    def test_transport_failure_has_no_retry_and_keeps_partial_ledger(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(probe.base, 'capture', side_effect=self.fake(transport_failure=True)):
            with self.assertRaises(RuntimeError): probe.collect(Path(temp), FIXTURE, 'mutated')
            self.assertTrue(list(Path(temp).glob('ledger-*.json')))
            self.assertFalse((Path(temp) / 'paired-observations.json').exists())

    def test_unknown_snapshot_and_wrong_write_are_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaises(ValueError): probe.collect(Path(temp), FIXTURE, 'other')
        with self.assertRaises(ValueError):
            probe.base.validate_request({'id': 'update_control', 'method': 'PUT', 'target': 'customers', 'path': '/owners/6', 'body': {**BODY, 'firstName': 'Updated'}}, FIXTURE, {'write_owner_id': 6})

if __name__ == '__main__':
    unittest.main()
