"""Receipt guard tests on copied package and syntax reporting boundaries."""
import hashlib
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from tools.run_p03_technical import verify, inspect, safe, run

PACKET = Path(__file__).resolve().parents[2]/'packet'
RECEIPT = 'b73e4dd44a1cbd9ffe05d148d2c0742f4ab685cb4c7a4cac7b949ed4d429ce20'


class P03Guards(unittest.TestCase):
    def test_wrong_receipt_hash_refused(self):
        with self.assertRaisesRegex(ValueError, 'Receipt hash mismatch'):
            verify(PACKET, '0'*64)

    def test_source_and_decision_tampering_refused(self):
        for rel in ('candidate/input/config/customers-service.yml', 'decisions/D20.json'):
            with self.subTest(rel=rel), tempfile.TemporaryDirectory() as tmp:
                copy = Path(tmp)/'packet'
                shutil.copytree(PACKET, copy)
                with (copy/rel).open('ab') as f:
                    f.write(b'\nchanged')
                with self.assertRaisesRegex(ValueError, 'hash mismatch|byte mismatch'):
                    verify(copy, RECEIPT)

    def test_path_escape_refused(self):
        with self.assertRaisesRegex(ValueError, 'outside allowed root'):
            safe(PACKET, '../elsewhere')

    def test_wrong_case_even_with_recomputed_receipt_hash_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            copy = Path(tmp)/'packet'
            shutil.copytree(PACKET, copy)
            p = copy/'P03_TECHNICAL_RECEIPT_2026-11-02.json'
            data = json.loads(p.read_text())
            data['case'] = 'P02'
            p.write_text(json.dumps(data), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'P03 gate closed'):
                verify(copy, hashlib.sha256(p.read_bytes()).hexdigest())

    def test_missing_seed_refused_and_output_not_reused(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)/'output'
            with patch('tools.run_p03_technical.DependencyGraphBuilder') as builder:
                builder.return_value.build_multi_file_graph.return_value = {'nodes': []}
                with self.assertRaisesRegex(ValueError, 'Missing snapshot seed'):
                    run(PACKET, RECEIPT, out)
            with self.assertRaisesRegex(ValueError, 'Refuse overwrite'):
                run(PACKET, RECEIPT, out)

    def test_record_and_map_evidence_stays_unresolved(self):
        raw = b'''record Example(String label) {
 public String title() { return label; }
 class Builder { public void extra() {} }
}'''
        audit = inspect(raw, 'Example.java', 'Example', {'nodes': []})
        self.assertEqual(len(audit['explicit_methods']), 1)
        self.assertEqual(audit['explicit_methods'][0]['status'], 'unsupported')
        self.assertTrue(any(x['kind']=='implicit_record_methods' for x in audit['unsupported_excluded']))
        raw_map = b'''class Reply { Object answer() {
 java.util.Map<String,Object> result = new java.util.LinkedHashMap<>();
 result.put("label", item.getTitle()); return result;
} }'''
        audit = inspect(raw_map, 'Reply.java', 'Reply', {'nodes': []})
        self.assertTrue(any('result.put("label"' in x['expression'] for x in audit['raw_syntax']))
        self.assertTrue(all(x['serialization_dataflow']=='unresolved' for x in audit['raw_syntax']))


if __name__ == '__main__':
    unittest.main()
