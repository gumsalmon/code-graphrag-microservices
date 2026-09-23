"""Run the complete suite and retain raw process evidence for P01 review."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, required=True)
    args = parser.parse_args()
    run = ROOT / "evidence" / "p01-e2e" / f"suite-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}-{uuid.uuid4().hex[:8]}"
    run.mkdir(parents=True)
    env = os.environ.copy()
    env["P01_SOURCE_ROOT"] = str(args.source_root.resolve(strict=True))
    env["P01_TEST_EVIDENCE_ROOT"] = str(run / "cases")
    command = [sys.executable, "-m", "pytest", "tests", "-ra", f"--junitxml={run / 'pytest.xml'}"]
    started = time.perf_counter()
    print(f"Running full suite; evidence: {run}", flush=True)
    result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True)
    (run / "pytest.log").write_text(result.stdout + result.stderr, encoding="utf-8")
    record = {"command": command, "exit_code": result.returncode,
              "duration_seconds": round(time.perf_counter() - started, 3),
              "source_root": env["P01_SOURCE_ROOT"], "checks": []}
    for argv in ([sys.executable, "-m", "pip", "freeze"], [sys.executable, "-m", "pip", "check"],
                 ["git", "rev-parse", "HEAD"], ["docker", "version"], ["docker", "compose", "version"]):
        check = subprocess.run(argv, cwd=ROOT, capture_output=True, text=True)
        record["checks"].append({"command": argv, "exit_code": check.returncode,
                                 "stdout": check.stdout, "stderr": check.stderr})
    record["implementation_sha256"] = {
        name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
        for name in ("verify_neo4j_live.py", "requirements.txt", ".gitattributes",
                     "tests/test_verify_neo4j_live.py", "tests/p01_fault_process.py", "tools/run_p01_acceptance.py")}
    (run / "process-result.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    (run / "summary.md").write_text(
        f"# Full acceptance suite\n\nExit code: {result.returncode}.\n\n"
        "[Raw pytest output](pytest.log), [JUnit results](pytest.xml), "
        "[command, versions and exit code](process-result.json), [checksums](checksums.sha256).\n\n"
        "Per-case process reports and verifier artifacts are under `cases/`. Fault cases intentionally "
        "fail in subprocesses; the parent test passes only when the expected real error and exit code are observed.\n",
        encoding="utf-8")
    files = sorted(p for p in run.rglob("*") if p.is_file() and p != run / "checksums.sha256")
    (run / "checksums.sha256").write_text("".join(
        f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(run).as_posix()}\n" for p in files), encoding="utf-8")
    print(result.stdout[-7000:])
    print(result.stderr[-2000:])
    print(f"Suite exit code {result.returncode}; artifacts: {run}")
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
