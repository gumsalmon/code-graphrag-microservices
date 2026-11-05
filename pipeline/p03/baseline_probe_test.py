import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('baseline_probe', Path(__file__).with_name('baseline-probe.py'))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)

BODY = {'firstName': 'Fixture', 'lastName': 'Control', 'address': '1 Fixture Lane', 'city': 'Sandbox', 'telephone': '0000000000'}
FIXTURE = {'seed_owner_ids': list(range(1, 11)), 'seed_pets': [{'id': 1, 'owner_id': 1}, {'id': 7, 'owner_id': 6}, {'id': 8, 'owner_id': 6}],
           'seed_visits': [{'id': i, 'pet_id': pet, 'date': '2026-01-01', 'description': 'synthetic'} for i, pet in [(1, 7), (2, 8), (3, 8), (4, 7)]],
           'empty_pets_setup': {'target': 'customers', 'method': 'POST', 'path': '/owners', 'body': BODY},
           'requests': [dict(id=n, target=t, method='GET', path=p) for n, t, p in [
               ('direct_populated', 'customers', '/owners/6'), ('gateway_populated', 'gateway', '/api/gateway/owners/6'),
               ('direct_no_visits', 'customers', '/owners/1'), ('gateway_no_visits', 'gateway', '/api/gateway/owners/1'),
               ('direct_empty_pets', 'customers', '/owners/{empty_owner_id}'), ('gateway_empty_pets', 'gateway', '/api/gateway/owners/{empty_owner_id}'),
               ('owner_list_control', 'customers', '/owners'), ('missing_direct', 'customers', '/owners/2147483647'),
               ('missing_gateway', 'gateway', '/api/gateway/owners/2147483647'), ('visits_control', 'visits', '/pets/visits?petId=7,8')]] + [
               {'id': 'create_control', 'target': 'customers', 'method': 'POST', 'path': '/owners', 'body': BODY},
               {'id': 'update_control', 'target': 'customers', 'method': 'PUT', 'path': '/owners/{write_owner_id}', 'body': {**BODY, 'firstName': 'Updated'}}]}


class ProbeTests(unittest.TestCase):
    def test_dynamic_binding_uses_observed_id_and_rejects_missing_or_bool(self):
        self.assertEqual(probe.bind_path('/owners/{empty_owner_id}', {'empty_owner_id': 73}), '/owners/73')
        for bindings in [{}, {'empty_owner_id': True}, {'empty_owner_id': -1}]:
            with self.assertRaises(ValueError): probe.bind_path('/owners/{empty_owner_id}', bindings)

    def test_write_allowlist_rejects_seed_put_external_target_and_wrong_payload(self):
        valid = {'id': 'update_control', 'target': 'customers', 'method': 'PUT', 'path': '/owners/82', 'body': {**BODY, 'firstName': 'Updated'}}
        probe.validate_request(valid, FIXTURE, {'write_owner_id': 82})
        for changed, bindings in [({'path': '/owners/6'}, {'write_owner_id': 6}), ({'target': 'gateway'}, {'write_owner_id': 82}),
                                  ({'body': BODY}, {'write_owner_id': 82}), ({'path': '//external'}, {'write_owner_id': 82})]:
            with self.assertRaises(ValueError): probe.validate_request({**valid, **changed}, FIXTURE, bindings)

    def test_owner_shape_cannot_hide_renamed_key_or_missing_field(self):
        baseline = {'id': 73, 'pets': [], **BODY}
        probe.owner(baseline, 73)
        for bad in [{**BODY, 'id': 73, 'animals': []}, {k: v for k, v in baseline.items() if k != 'telephone'}]:
            with self.assertRaises(ValueError): probe.owner(bad)

    def test_created_owner_must_be_new_and_not_reuse_setup_id(self):
        raw = json.dumps({'id': 82, 'pets': [], **BODY}).encode()
        self.assertEqual(probe.created_owner({'status': 201}, raw, BODY, list(range(1, 11)), [73])['id'], 82)
        for seed, bound in [([82], []), ([], [82])]:
            with self.assertRaises(ValueError): probe.created_owner({'status': 201}, raw, BODY, seed, bound)

    def test_full_baseline_flow_preserves_diagnostics_and_never_assumes_id_11(self):
        owners = [{'id': i, **BODY, 'pets': [{'id': p['id']} for p in FIXTURE['seed_pets'] if p['owner_id'] == i]} for i in range(1, 11)]
        visits = [{'id': v['id'], 'petId': v['pet_id'], 'date': v['date'], 'description': v['description']} for v in FIXTURE['seed_visits']]
        new_ids, writes = iter([73, 82]), []

        def fake_capture(directory, request, fixture, bindings):
            probe.validate_request(request, fixture, bindings)
            path, status, result = request['path'], 200, None
            if request['method'] == 'POST':
                result = {'id': next(new_ids), 'pets': [], **request['body']}; owners.append(result); writes.append(request); status = 201
            elif request['method'] == 'PUT':
                found = next(o for o in owners if o['id'] == int(path.rsplit('/', 1)[1])); found.update(request['body']); writes.append(request); status = 204
            elif request['id'].startswith('missing_'):
                status, result = 404, {'diagnostic': 'synthetic missing owner'}
            elif request['target'] == 'visits': result = {'items': visits}
            elif path == '/owners': result = owners
            else:
                result = json.loads(json.dumps(next(o for o in owners if o['id'] == int(path.rsplit('/', 1)[1]))))
                if request['target'] == 'gateway':
                    for pet in result['pets']: pet['visits'] = [v for v in visits if v['petId'] == pet['id']]
            return {'status': status}, b'' if status == 204 else json.dumps(result).encode()

        with tempfile.TemporaryDirectory() as tmp, patch.object(probe, 'capture', side_effect=fake_capture):
            result = probe.collect(Path(tmp), FIXTURE)
            self.assertEqual(result['bindings'], {'empty_owner_id': 73, 'write_owner_id': 82})
            self.assertEqual(result['fixture_slots'], 12)
            self.assertEqual(len(result['all_requests']), 17)
            self.assertEqual(result['missing_owner_observations']['missing_direct']['status'], 404)
            self.assertEqual([r['method'] for r in writes], ['POST', 'POST', 'PUT'])
            self.assertEqual(writes[-1]['path'], '/owners/82')
            self.assertFalse(result['mutated_executed'])


if __name__ == '__main__':
    unittest.main()
