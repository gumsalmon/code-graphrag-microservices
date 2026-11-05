import copy
import json
import unittest
from response_checks import check_owner_rename, check_unchanged_json, strict_json


def raw(value):
    return json.dumps(value).encode("utf-8")


class ResponseChecksTest(unittest.TestCase):
    def setUp(self):
        self.before = {"id": 6, "firstName": "Fixture", "lastName": "Control", "address": "Test",
                       "city": "Sandbox", "telephone": "0000000000",
                       "pets": [{"id": 7, "name": "Synthetic", "type": {"id": 1, "name": "cat"}}, {"id": 8}]}
        self.after = copy.deepcopy(self.before)
        self.after["animals"] = self.after.pop("pets")

    def test_exact_rename_retains_nested_values(self):
        self.assertFalse(check_owner_rename(raw(self.before), raw(self.after), 200, 200)["is_label_or_score"])

    def test_empty_pets_is_distinct_valid_case(self):
        self.before["pets"] = []
        self.after["animals"] = []
        self.assertEqual(check_owner_rename(raw(self.before), raw(self.after), 200, 200)["pet_count"], 0)

    def test_dropped_scalar_is_rejected(self):
        del self.after["telephone"]
        with self.assertRaises(ValueError):
            check_owner_rename(raw(self.before), raw(self.after), 200, 200)

    def test_nested_data_loss_is_rejected(self):
        del self.after["animals"][0]["type"]["name"]
        with self.assertRaises(ValueError):
            check_owner_rename(raw(self.before), raw(self.after), 200, 200)

    def test_duplicate_old_and_new_keys_rejected(self):
        self.after["pets"] = []
        with self.assertRaises(ValueError):
            check_owner_rename(raw(self.before), raw(self.after), 200, 200)

    def test_array_order_is_not_normalized_away(self):
        self.after["animals"].reverse()
        with self.assertRaises(ValueError):
            check_owner_rename(raw(self.before), raw(self.after), 200, 200)

    def test_unobserved_or_error_http_cannot_pass(self):
        for statuses in [(200, 500), (None, 200), (204, 204)]:
            with self.assertRaises(ValueError):
                check_owner_rename(raw(self.before), raw(self.after), *statuses)

    def test_missing_owner_null_is_diagnostic_not_success(self):
        with self.assertRaises(ValueError):
            check_owner_rename(b"null", b"null", 200, 200)

    def test_unknown_extra_baseline_field_is_not_dropped(self):
        self.before["extra"] = 1
        with self.assertRaises(ValueError):
            check_owner_rename(raw(self.before), raw(self.after), 200, 200)

    def test_strict_json_rejects_duplicate_keys_and_nan(self):
        for value in [b'{"id":1,"id":2}', b'{"x":{"y":1,"y":2}}', b'{"x":NaN}', b'{"x":Infinity}', b'\xff']:
            with self.assertRaises(ValueError):
                strict_json(value)

    def test_control_preserves_every_field_and_numeric_type(self):
        check_unchanged_json(b'{"a":1,"b":2}', b'{"b":2,"a":1}', 200, 200)
        for after in [b'{"a":true,"b":2}', b'{"a":1}', b'{"a":1,"b":3}']:
            with self.assertRaises(ValueError):
                check_unchanged_json(b'{"a":1,"b":2}', after, 200, 200)

    def test_owner_list_control_catches_global_getter_rename(self):
        with self.assertRaises(ValueError):
            check_unchanged_json(raw([self.before]), raw([self.after]), 200, 200)


if __name__ == "__main__":
    unittest.main()
