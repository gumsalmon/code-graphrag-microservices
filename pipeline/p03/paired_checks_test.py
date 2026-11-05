import copy
import json
import unittest
from paired_checks import compare_pair


class PairedChecksTests(unittest.TestCase):
    def fixture(self):
        owner = {'id': 6, 'firstName': 'Synthetic', 'lastName': 'Owner', 'address': 'Test', 'city': 'Test', 'telephone': '0', 'pets': []}
        before, after, a, b = {}, {}, {}, {}
        for name in ['direct_populated', 'direct_no_visits', 'direct_empty_pets', 'setup_empty_readback', 'create_readback', 'update_readback']:
            before[name] = json.dumps(owner).encode()
            after[name] = json.dumps({('animals' if k == 'pets' else k): v for k, v in owner.items()}).encode()
        for name in ['seed_owner_list', 'owner_list_control', 'visits_control', 'setup_empty_owner', 'create_control']:
            before[name] = after[name] = b'{"same":true}'
        for name in ['gateway_populated', 'gateway_no_visits', 'gateway_empty_pets', 'missing_direct', 'missing_gateway']:
            before[name], after[name] = b'{"timestamp":"one"}', b'{"timestamp":"two"}'
        for name in before:
            a[name] = {'status': 200}; b[name] = {'status': 500 if name.startswith('gateway_') else 200}
        return before, after, a, b

    def test_gateway_failure_kept_without_error_timestamp_normalization_or_labels(self):
        inputs = self.fixture(); saved = copy.deepcopy(inputs); result = compare_pair(*inputs)
        self.assertEqual(inputs, saved)
        diagnostic = next(r for r in result['unconstrained_response_observations'] if r['request_id'] == 'gateway_populated')
        self.assertEqual(diagnostic['mutated_status'], 500); self.assertFalse(diagnostic['raw_bytes_equal'])
        self.assertFalse(result['errors_normalized_for_equality']); self.assertFalse(result['impact_labels_created'])

    def test_missing_owner_body_is_not_treated_as_rename_success(self):
        inputs = self.fixture(); inputs[1]['direct_empty_pets'] = b'null'
        with self.assertRaises(ValueError): compare_pair(*inputs)

    def test_changed_control_or_nested_value_is_not_hidden(self):
        for name in ['owner_list_control', 'direct_populated']:
            inputs = self.fixture(); inputs[1][name] = b'{"changed":true}'
            with self.assertRaises(ValueError): compare_pair(*inputs)

    def test_http_error_on_required_direct_contract_check_fails(self):
        inputs = self.fixture(); inputs[3]['direct_populated']['status'] = 500
        with self.assertRaises(ValueError): compare_pair(*inputs)


if __name__ == '__main__':
    unittest.main()
