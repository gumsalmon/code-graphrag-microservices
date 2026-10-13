"""Input/implementation guards only: no embedding, database or provider calls."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("retrieval_probe", Path(__file__).with_name("retrieval-probe.py"))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


def packet():
    # Synthetic source is NEVER indexed or persisted as research evidence.
    text = "class SyntheticFixture {}\n"
    query = "Synthetic query for input validation only."
    return {"schema": "p01-retrieval-input/1", "source_commit": probe.SOURCE_SHA, "implementation_commit": probe.IMPL_SHA,
            "sources": [{"file": name, "sha256": probe.digest(text), "text": text} for name in sorted(probe.ALLOWED_FILES)],
            "seed_id": "synthetic-test-seed", "query": query, "query_sha256": probe.digest(query), "top_k": 5}


class InputGuards(unittest.TestCase):
    def test_baseline_only_packet(self):
        probe.validate_input(packet())

    def test_no_graph_labels_runtime_or_scores(self):
        for name in ["graph", "labels", "raw_runtime", "ground_truth", "score"]:
            data = packet(); data[name] = {}
            with self.assertRaisesRegex(ValueError, "Unexpected input fields"):
                probe.validate_input(data)

    def test_fixed_revisions(self):
        for name in ["source_commit", "implementation_commit"]:
            data = packet(); data[name] = "0" * 40
            with self.assertRaisesRegex(ValueError, "Unpinned"):
                probe.validate_input(data)

    def test_source_checksum_and_lf(self):
        data = packet(); data["sources"][0]["text"] += "// changed"
        with self.assertRaisesRegex(ValueError, "Source checksum"):
            probe.validate_input(data)
        data = packet(); data["sources"][0]["text"] = "class Synthetic {}\r\n"
        data["sources"][0]["sha256"] = probe.digest(data["sources"][0]["text"])
        with self.assertRaisesRegex(ValueError, "normalization"):
            probe.validate_input(data)

    def test_source_allowlist_and_duplicates(self):
        for replacement in ["../benchmark/labels.json", packet()["sources"][1]["file"]]:
            data = packet(); data["sources"][0]["file"] = replacement
            with self.assertRaisesRegex(ValueError, "same three"):
                probe.validate_input(data)

    def test_query_checksum(self):
        data = packet(); data["query"] += " altered"
        with self.assertRaisesRegex(ValueError, "Query checksum"):
            probe.validate_input(data)

    def test_top_k_type_and_bounds(self):
        for value in [0, 51, -1, 1.5, "5", True]:
            data = packet(); data["top_k"] = value
            with self.assertRaisesRegex(ValueError, "top-k"):
                probe.validate_input(data)

    def test_changed_implementation_fails_before_import_or_model_access(self):
        with tempfile.TemporaryDirectory(prefix="p01-retrieval-guard-") as directory:
            root = Path(directory); (root / "src").mkdir()
            (root / "src/chroma_baseline.py").write_text("# synthetic modified implementation\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Pinned implementation code mismatch"):
                probe.run(packet(), root, root)


if __name__ == "__main__":
    unittest.main(verbosity=2)
