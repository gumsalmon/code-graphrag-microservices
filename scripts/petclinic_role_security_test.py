import json
import unittest
from package_petclinic_roles import RolePacketScanner, PAIRED
from transfer_security import SecurityError


class RoleScannerTests(unittest.TestCase):
    def test_frozen_public_decision_path_is_scanned_without_rewriting_raw(self):
        raw = (PAIRED / 'plan.json').read_bytes()
        scanner = RolePacketScanner(); scanner.scan('paired/plan.json', raw)
        self.assertEqual(scanner.summary()['paired_plan_exact_byte_exception']['uses'], 1)
        self.assertEqual(raw, (PAIRED / 'plan.json').read_bytes())

    def test_exception_cannot_hide_other_auth_fields_or_changed_values(self):
        raw = (PAIRED / 'plan.json').read_bytes()
        for change in [{'authorization': 'private-value'}, {'client_secret': 'private-value'}]:
            body = json.loads(raw); body.update(change)
            with self.assertRaises(SecurityError): RolePacketScanner().scan('paired/plan.json', json.dumps(body).encode())
        with self.assertRaises(SecurityError): RolePacketScanner().scan('other/plan.json', raw)

    def test_credentials_outside_the_exact_path_still_fail_closed(self):
        with self.assertRaises(SecurityError): RolePacketScanner().scan('meta.json', b'{"authorization":"private-value"}')


if __name__ == '__main__':
    unittest.main()
