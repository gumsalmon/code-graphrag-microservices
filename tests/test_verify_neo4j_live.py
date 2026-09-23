"""Regression tests for the P01 live verifier. No benchmark labels are used."""

from __future__ import annotations

import builtins
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid

import pytest

import verify_neo4j_live as verifier


SOURCE_ROOT = os.environ.get("P01_SOURCE_ROOT")


def test_comment_before_statement_is_preserved():
    script = '// snapshot header\n// annotation\nMERGE (n:Probe {url:"http://example/a;b"});\n// next\nRETURN 1 AS n;'
    statements = verifier.split_cypher(script)
    assert len(statements) == 2
    assert statements[0].startswith("MERGE (n:Probe")
    assert 'http://example/a;b' in statements[0]
    assert statements[1] == "RETURN 1 AS n"


@pytest.mark.parametrize("script", ["", "// only comment\n", "RETURN 1", "RETURN 'unclosed;"])
def test_empty_or_incomplete_cypher_fails(script):
    with pytest.raises(verifier.VerificationError):
        verifier.split_cypher(script)


def test_statement_error_fails_import():
    class BrokenSession:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

        def run(self, _statement):
            raise ValueError("malformed Cypher")

    class BrokenDriver:
        def session(self, **_):
            return BrokenSession()

    log = []
    with pytest.raises(verifier.VerificationError, match="Cypher statement 1 failed"):
        verifier.execute_cypher(BrokenDriver(), "RETURN INVALID;", log)
    assert log[0]["status"] == "failed"


def test_missing_driver_fails(monkeypatch):
    real_import = builtins.__import__

    def without_driver(name, *args, **kwargs):
        if name == "neo4j":
            raise ImportError("missing driver")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", without_driver)
    with pytest.raises(verifier.VerificationError, match="driver is missing"):
        verifier.connect("bolt://127.0.0.1:1", "invalid", timeout=0)


def test_missing_source_returns_nonzero(tmp_path):
    result = subprocess.run(
        [sys.executable, str(verifier.ROOT / "verify_neo4j_live.py"), "--snapshot", "baseline",
         "--source-root", str(tmp_path / "missing"), "--output-root", str(tmp_path / "runs")],
        capture_output=True, text=True)
    assert result.returncode != 0
    assert "FAIL baseline" in result.stderr
    assert list((tmp_path / "runs").glob("*/test-results.log"))


def test_bad_uri_fails_connectivity():
    with pytest.raises(verifier.VerificationError, match="connection failed"):
        verifier.connect("bolt://127.0.0.1:1", "invalid", timeout=1)


@pytest.mark.parametrize("stage", ["connection", "import", "Cypher"])
def test_stage_failure_maps_to_nonzero_exit(monkeypatch, tmp_path, capsys, stage):
    def fail(_args):
        raise verifier.VerificationError(f"{stage} failed")

    monkeypatch.setattr(verifier, "verify", fail)
    code = verifier.main(["--snapshot", "baseline", "--source-root", str(tmp_path)])
    assert code != 0
    assert f"{stage} failed" in capsys.readouterr().err


@pytest.mark.skipif(not SOURCE_ROOT, reason="Set P01_SOURCE_ROOT to the clean PetClinic checkout for live E2E")
def test_baseline_and_mutated_live_paths_are_isolated(tmp_path):
    results = {}
    for snapshot in ("baseline", "mutated"):
        process = subprocess.run(
            [sys.executable, str(verifier.ROOT / "verify_neo4j_live.py"),
             "--snapshot", snapshot, "--source-root", SOURCE_ROOT,
             "--output-root", str(tmp_path / "runs")], capture_output=True, text=True,
            timeout=240)
        assert process.returncode == 0, process.stderr
        run_dir = next((tmp_path / "runs").glob(f"*-{snapshot}-*"))
        results[snapshot] = {
            "query": json.loads((run_dir / "query-result.json").read_text(encoding="utf-8")),
            "graph": json.loads((run_dir / "parser-output.json").read_text(encoding="utf-8")),
            "environment": json.loads((run_dir / "environment.json").read_text(encoding="utf-8")),
        }
        for name in ("commands.log", "import.log", "checksums.sha256", "test-results.log"):
            assert (run_dir / name).stat().st_size > 0
        query = results[snapshot]["query"]
        assert query["seed_excluded"]
        assert query["inventory_before"] == {"node_count": 0, "relationship_count": 0}
        impacts = {row["hop"]: row for row in query["impacted_methods"]}
        assert impacts[1]["method_id"].endswith("VisitsServiceClient#getVisitsForPets(List<Integer>)")
        assert impacts[2]["method_id"].endswith("ApiGatewayController#getOwnerDetails(int)")
        assert impacts[1]["service_boundary_crossings"] == 1
        assert impacts[2]["service_boundary_crossings"] == 1
    assert results["baseline"]["environment"]["container_id"] != results["mutated"]["environment"]["container_id"]
    assert results["baseline"]["query"]["seed_id"] != results["mutated"]["query"]["seed_id"]
    assert results["baseline"]["graph"]["metadata"]["patch_id"] is None
    assert results["mutated"]["graph"]["metadata"]["patch_id"]


@pytest.mark.skipif(not SOURCE_ROOT, reason="Set P01_SOURCE_ROOT to test live Neo4j failure paths")
def test_bad_credentials_and_malformed_cypher_live():
    run_id = f"test-{uuid.uuid4().hex[:12]}"
    commands = []
    name, _container_id, uri, password = verifier.start_container(run_id, commands)
    try:
        with pytest.raises(verifier.VerificationError, match="connection failed"):
            verifier.connect(uri, "wrong-password", timeout=1)
        driver = verifier.connect(uri, password)
        try:
            with pytest.raises(verifier.VerificationError, match="Cypher statement 1 failed"):
                verifier.execute_cypher(driver, "THIS IS MALFORMED CYPHER;", [])
        finally:
            driver.close()
    finally:
        verifier.command(["docker", "stop", name], commands, timeout=90)


@pytest.mark.skipif(not SOURCE_ROOT, reason="Set P01_SOURCE_ROOT to test explicit Cypher selection")
def test_explicit_stale_cypher_returns_nonzero(tmp_path):
    selected = tmp_path / "stale.cypher"
    selected.write_text("// wrong snapshot\nRETURN 1;\n", encoding="utf-8")
    process = subprocess.run(
        [sys.executable, str(verifier.ROOT / "verify_neo4j_live.py"),
         "--snapshot", "baseline", "--source-root", SOURCE_ROOT,
         "--cypher-file", str(selected), "--output-root", str(tmp_path / "runs")],
        capture_output=True, text=True)
    assert process.returncode != 0
    assert "Explicit Cypher must equal" in process.stderr
