"""Synthetic transfer packaging checks; no provider, Docker or evidence writes."""
import tempfile
import unittest
from pathlib import Path

from package_project_transfer import (
    Selection, digest, historical, history_ledger, parse_manifest, safe_reference,
    scan_selected, write_new,
)


class TransferPackagingTests(unittest.TestCase):
    def test_parse_manifest_preserves_multiple_trailing_blank_lines(self):
        data = ("a" * 64 + "  a.txt\r\n\r\n").encode()
        self.assertEqual(parse_manifest(data), [("a.txt", "a" * 64)])

    def test_invalid_manifest_rejected(self):
        cases = ["A" * 64 + "  a", "a" * 64 + "  ../escape", "a" * 64 + " a",
                 "a" * 64 + "  A\n" + "a" * 64 + "  a", "a" * 64 + "  a\n\n" + "b" * 64 + "  b"]
        for data in cases:
            with self.subTest(data=data), self.assertRaises(ValueError):
                parse_manifest(data.encode())

    def test_historical_reference_not_exported_filename(self):
        name = "\uf03amemory\uf03a.ses"
        self.assertTrue(safe_reference(name))
        self.assertFalse(safe_reference("../" + name))
        self.assertEqual(parse_manifest(("c" * 64 + "  " + name).encode()), [(name, "c" * 64)])

    def test_historical_recognition(self):
        self.assertFalse(historical("SHA256SUMS.txt"))
        self.assertTrue(historical("run/SHA256SUMS.txt"))
        self.assertTrue(historical("run/SUPPLEMENTAL_CHECKSUMS.sha256"))
        self.assertTrue(historical("run/ARCHIVES.sha256"))

    def test_tree_skips_private_files_and_cache_without_opening_content(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            write_new(root, "code/.git/config", b"never read")
            write_new(root, "code/credentials/key.clixml", b"never read")
            write_new(root, "code/.env", b"never read")
            write_new(root, "code/chroma_db/cache", b"never read")
            write_new(root, "code/main.py", b"pass\n")
            selected = Selection(root)
            selected.tree("code")
            self.assertEqual(list(selected.files), ["code/main.py"])
            self.assertEqual(len(selected.omissions), 4)
            self.assertTrue(all("sha256" not in v for v in selected.omissions.values()))

    def test_provider_envelope_omitted_hash_not_content(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            data = b'{"thoughtSignature":"synthetic-opaque"}'
            write_new(root, "run/provider-response.json", data)
            selected = Selection(root)
            selected.tree("run")
            self.assertFalse(selected.files)
            self.assertEqual(selected.omissions["run/provider-response.json"]["sha256"], digest(data))

    def test_duplicate_case_selection_rejected(self):
        selected = Selection(Path("."))
        selected.add("Main.md", b"hello")
        with self.assertRaises(ValueError):
            selected.add("main.md", b"hello")

    def test_present_historical_corruption_never_waived(self):
        content = b"expected"
        manifest = (digest(content) + "  x\n").encode()
        files = {"run/checksums.sha256": {}, "run/x": {"sha256": digest(b"changed")}}
        with self.assertRaises(ValueError):
            history_ledger(files, lambda _: manifest, {"run/x": {"path": "run/x", "reason": "cannot hide corruption"}})

    def test_missing_history_explicitly_counted_not_claimed_verified(self):
        content = b"original"
        manifest = (digest(content) + "  x\n").encode()
        omissions = {}
        report = history_ledger({"run/checksums.sha256": {}}, lambda _: manifest, omissions)
        self.assertEqual(report, [{"path": "run/checksums.sha256", "verified": 0, "omitted": 1}])
        self.assertEqual(omissions["run/x"]["sha256"], digest(content))
        self.assertIn("not_verified", omissions["run/x"]["reason"])

    def test_historical_prefix_omission_and_present_file(self):
        a, b = digest(b"a"), digest(b"b")
        manifest = (a + "  kept\n" + b + "  cache/missing\n").encode()
        omissions = {"run/cache/": {"path": "run/cache/", "reason": "not selected"}}
        report = history_ledger({"run/checksums.sha256": {}, "run/kept": {"sha256": a}}, lambda _: manifest, omissions)
        self.assertEqual(report[0]["verified"], 1)
        self.assertEqual(report[0]["omitted"], 1)

    def test_wrong_expected_omission_hash_rejected(self):
        manifest = (digest(b"original") + "  x\n").encode()
        with self.assertRaises(ValueError):
            history_ledger({"run/checksums.sha256": {}}, lambda _: manifest,
                {"run/x": {"path": "run/x", "sha256": digest(b"wrong"), "reason": "missing"}})

    def test_copied_original_manifest_scope_is_explicit(self):
        manifest = (digest(b"old") + "  old\n").encode()
        omissions = {}
        history_ledger({"run/provenance/build-original-checksums.sha256": {}}, lambda _: manifest, omissions)
        self.assertIn("original_base", omissions["run/provenance/old"]["reason"])

    def test_copied_different_origins_can_share_missing_basename(self):
        a = "run/provenance/build-original-checksums.sha256"
        b = "run/provenance/baseline-original-checksums.sha256"
        manifests = {a: (digest(b"build") + "  cleanup.json\n").encode(),
                     b: (digest(b"runtime") + "  cleanup.json\n").encode()}
        omissions = {}
        history_ledger({a: {}, b: {}}, lambda n: manifests[n], omissions)
        entry = omissions["run/provenance/cleanup.json"]
        self.assertNotIn("sha256", entry)
        self.assertEqual({r["manifest"] for r in entry["original_references"]}, {a, b})

    def test_source_scan_fail_closed_never_prints_values(self):
        selected = Selection(Path("."))
        # Constructed fake only; matching pattern verifies fail-closed selection.
        selected.add("main.json", b'{"api_key":"' + b"AI" + b"za" + b"Q" * 35 + b'"}')
        from contextlib import redirect_stdout
        from io import StringIO
        output = StringIO()
        with redirect_stdout(output), self.assertRaises(ValueError):
            scan_selected(selected)
        self.assertIn("secret_token_pattern", output.getvalue())
        self.assertNotIn("Q" * 35, output.getvalue())

    def test_writes_refuse_overwrite_and_path_escape(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            write_new(root, "a.txt", b"first")
            with self.assertRaises(FileExistsError):
                write_new(root, "a.txt", b"second")
            with self.assertRaises(ValueError):
                write_new(root, "../outside", b"no")
            self.assertEqual((root / "a.txt").read_bytes(), b"first")


if __name__ == "__main__":
    unittest.main()
