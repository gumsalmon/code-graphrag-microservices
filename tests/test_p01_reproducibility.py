"""Focused regressions for source EOL handling and smoke-result labeling."""
import json
from pathlib import Path

import pytest
import verify_neo4j_live as verifier


@pytest.mark.parametrize("raw,expected", [
    (b"class A {}\r\n", b"class A {}\n"),
    (b"class A {}  \n", b"class A {}  \n"),
    (b"a\rb\r\n", b"a\rb\n"),
])
def test_source_normalization_changes_only_crlf(tmp_path, raw, expected):
    source = tmp_path / "source.java"
    source.write_bytes(raw)
    assert verifier.source_bytes(source) == expected
    assert source.read_bytes() == raw  # never rewrite the user's checkout


@pytest.mark.parametrize("name", ["full_benchmark_results.json", "benchmark_comparison.json"])
def test_published_smoke_artifacts_are_explicitly_labeled(name):
    result = json.loads((verifier.ROOT / "output" / name).read_text(encoding="utf-8"))
    assert result["result_status"] == "smoke_test"
    assert result["publication_ready"] is False
