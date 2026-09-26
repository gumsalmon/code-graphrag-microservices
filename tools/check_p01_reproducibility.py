"""Targeted LF/CRLF and Chroma model-cache probes; no benchmark scoring or Neo4j."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import verify_neo4j_live as verifier


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, required=True)
    args = parser.parse_args()
    run = ROOT / "evidence/p01-e2e" / f"repro-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}-{uuid.uuid4().hex[:8]}"
    run.mkdir(parents=True)
    commands, report = [], {"purpose": "reproducibility probes only; no F1 or paper results", "checks": []}
    started = time.perf_counter()
    code = 0
    print(f"Evidence: {run}", flush=True)
    try:
        verifier.command([sys.executable, "-m", "pytest", "tests/test_p01_reproducibility.py",
                          "tests/test_output_integrity.py", "-v", f"--junitxml={run / 'targeted-tests.xml'}"], commands)
        report["checks"].append({"check": "focused source-normalization, smoke-label and output-integrity tests", "passed": True})
        with tempfile.TemporaryDirectory(prefix="p01-repro-") as temporary:
            scratch = Path(temporary)
            artifacts = {}
            for mode in ("lf", "crlf"):
                checkout = scratch / mode
                verifier.command(["git", "clone", "--shared", "--no-checkout", str(args.source_root.resolve()), str(checkout)], commands)
                verifier.command(["git", "-C", str(checkout), "config", "core.autocrlf", "true" if mode == "crlf" else "false"], commands)
                verifier.command(["git", "-C", str(checkout), "sparse-checkout", "init", "--no-cone"], commands)
                verifier.command(["git", "-C", str(checkout), "sparse-checkout", "set", *verifier.SOURCE.values()], commands)
                verifier.command(["git", "-C", str(checkout), "checkout", "--detach", verifier.COMMIT], commands)
                raw = (checkout / verifier.SOURCE["provider"]).read_bytes()
                assert (b"\r\n" in raw) == (mode == "crlf"), "Checkout did not have expected line endings"
                for snapshot in ("baseline", "mutated"):
                    output = run / f"{mode}-{snapshot}"
                    output.mkdir()
                    files, provenance = verifier.prepare_source(checkout, snapshot, output, commands)
                    graph = verifier.build_artifacts(files, snapshot, provenance, output)
                    verifier.write_json(output / "provenance.json", provenance)
                    artifacts[mode, snapshot] = (graph, (output / "import.cypher").read_bytes(), provenance)
                # Dirty, semantic source change must still be rejected.
                source = checkout / verifier.SOURCE["provider"]
                with source.open("ab") as stream:
                    stream.write(b"\n// deliberate non-EOL change\n")
                rejected = run / f"{mode}-dirty-rejection"
                rejected.mkdir()
                try:
                    verifier.prepare_source(checkout, "baseline", rejected, commands)
                    raise AssertionError("Dirty source was accepted")
                except verifier.VerificationError as exc:
                    assert "dirty" in str(exc)
                    report["checks"].append({"check": f"{mode} dirty checkout rejected", "error": str(exc)})
            for snapshot in ("baseline", "mutated"):
                a, b = artifacts["lf", snapshot], artifacts["crlf", snapshot]
                assert a[0] == b[0], "Parser JSON differs between LF and CRLF"
                assert a[1] == b[1], "Cypher differs between LF and CRLF"
                assert a[2]["snapshot_files"] == b[2]["snapshot_files"]
                assert a[2]["original_files"]["provider"]["sha256"] != b[2]["original_files"]["provider"]["sha256"]
                if snapshot == "mutated":
                    assert a[2]["mutation"]["patch_sha256"] == b[2]["mutation"]["patch_sha256"]
                report["checks"].append({"check": f"{snapshot}: LF/CRLF canonical source, JSON, Cypher and patch identical", "passed": True})

            import httpx
            from chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2 import ONNXMiniLM_L6_V2
            from src.chroma_baseline import ChromaBaselineStore
            cache = ONNXMiniLM_L6_V2.DOWNLOAD_PATH
            archive = cache / ONNXMiniLM_L6_V2.ARCHIVE_FILENAME
            model_files = sorted((cache / ONNXMiniLM_L6_V2.EXTRACTED_FOLDER_NAME).rglob("*"))
            assert archive.is_file(), "Warm-cache probe requires the existing model archive"
            assert verifier.digest(archive) == ONNXMiniLM_L6_V2._MODEL_SHA256, "Archive hash mismatch"
            report["chroma"] = {
                "model": ONNXMiniLM_L6_V2.MODEL_NAME, "embedding_function": "Chroma DefaultEmbeddingFunction -> ONNXMiniLM_L6_V2",
                "cache_path": str(cache), "download_url": ONNXMiniLM_L6_V2.MODEL_DOWNLOAD_URL,
                "archive_sha256": verifier.digest(archive), "expected_archive_sha256": ONNXMiniLM_L6_V2._MODEL_SHA256,
                "files": {str(p.relative_to(cache)): {"sha256": verifier.digest(p), "bytes": p.stat().st_size}
                          for p in model_files if p.is_file()},
                "versions": {p: importlib.metadata.version(p) for p in ("chromadb", "onnxruntime", "tokenizers", "numpy", "httpx")},
            }
            real_stream = httpx.stream
            attempts = []
            def deny_model_download(method, url, *args, **kwargs):
                attempts.append(str(url))
                raise RuntimeError("Model download blocked by reproducibility probe")
            httpx.stream = deny_model_download
            try:
                encoder = ONNXMiniLM_L6_V2(preferred_providers=["CPUExecutionProvider"])
                embeddings = encoder(["P01 reproducibility probe"])
                report["chroma"]["embedding_dimension"] = len(embeddings[0])
                report["chroma"]["providers"] = encoder.model.get_providers()
                os.environ["ANONYMIZED_TELEMETRY"] = "False"
                store = ChromaBaselineStore(collection_name="p01_repro_probe", persist_directory=str(scratch / "isolated-chroma"))
                count = store.index_files([str(ROOT / "data/baseline" / name) for name in verifier.NAMES.values()])
                results = store.query_impact("GET /pets/visits petId", n_results=3)
                assert count > 0 and results and not attempts
                report["chroma"]["isolated_store"] = {"indexed_chunks": count, "result_ids": [r["chunk_id"] for r in results], "reused_existing_db": False}
                report["checks"].append({"check": "warm cache: real embeddings and fresh Chroma index/query without model download", "passed": True})
                ONNXMiniLM_L6_V2.DOWNLOAD_PATH = scratch / "empty-model-cache"
                try:
                    ONNXMiniLM_L6_V2()(["cold cache probe"])
                    raise AssertionError("Empty cache succeeded with model downloads disabled")
                except RuntimeError as exc:
                    assert "Model download blocked" in str(exc)
                    report["checks"].append({"check": "cold cache requires download: expected failure when download disabled", "error": str(exc), "passed": True})
                assert attempts == [ONNXMiniLM_L6_V2.MODEL_DOWNLOAD_URL]
                report["chroma"]["cold_cache_download_attempts"] = attempts
            finally:
                httpx.stream = real_stream
                ONNXMiniLM_L6_V2.DOWNLOAD_PATH = cache
                # Release the temporary database before Windows removes its files.
                if "store" in locals():
                    store.client._system.stop()
    except Exception as exc:
        code = 1
        report["error"] = f"{type(exc).__name__}: {exc}"
    report.update({"command": [sys.executable, *sys.argv], "exit_code": code,
                   "duration_seconds": round(time.perf_counter() - started, 3)})
    report["implementation_sha256"] = {name: verifier.digest(ROOT / name) for name in (
        "verify_neo4j_live.py", "tools/check_p01_reproducibility.py", "tests/test_p01_reproducibility.py",
        "src/benchmark_runner.py", "run_baseline_benchmark.py")}
    verifier.write_json(run / "report.json", report)
    verifier.write_json(run / "commands.log", commands)
    paths = sorted(p for p in run.rglob("*") if p.is_file())
    (run / "checksums.sha256").write_text("".join(f"{verifier.digest(p)}  {p.relative_to(run).as_posix()}\n" for p in paths), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return code


if __name__ == "__main__":
    raise SystemExit(main())
