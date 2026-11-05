import json
import unittest
from pathlib import Path
from package_p03_scope_check import ScopePacketScanner
from transfer_security import SecurityError


class ScannerExceptionTests(unittest.TestCase):
    def setUp(self):
        self.raw = (Path(__file__).resolve().parent.parent / 'handoff-out/p03-build/20261028t094427082z-687c052b/inputs.json').read_bytes()

    def test_exact_public_research_decision_path_is_scanned_with_all_values_retained(self):
        scanner = ScopePacketScanner()
        scanner.scan('baseline-build/inputs.json', self.raw)
        self.assertEqual(scanner.summary()['exact_byte_semantic_exceptions'][0]['uses'], 1)
        self.assertFalse(scanner.summary()['failures'])

    def test_changed_authorization_value_is_not_exempt_even_at_the_same_path(self):
        document = json.loads(self.raw)
        document['authorization'] = 'Bearer invented-audit-test-value'
        with self.assertRaises(SecurityError):
            ScopePacketScanner().scan('baseline-build/inputs.json', json.dumps(document).encode())

    def test_other_path_does_not_inherit_the_exception(self):
        with self.assertRaises(SecurityError):
            ScopePacketScanner().scan('unrelated/inputs.json', self.raw)

    def test_any_added_field_invalidates_the_pinned_byte_exception(self):
        document = json.loads(self.raw)
        document['extra'] = 'unreviewed-field'
        with self.assertRaises(SecurityError):
            ScopePacketScanner().scan('baseline-build/inputs.json', json.dumps(document).encode())


if __name__ == '__main__':
    unittest.main()
