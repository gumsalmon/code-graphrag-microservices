"""Subprocess harness for real faults; never used by the production CLI.

Alter inputs/environment at a narrow boundary, then execute the real main,
connection, import and error-reporting code. No synthesized success/failure.
"""
import builtins
from pathlib import Path
import socket
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import verify_neo4j_live as verifier

mode = sys.argv.pop(1)
real_connect = verifier.connect
real_build = verifier.build_artifacts
real_import = builtins.__import__
reserved = None

if mode == "bad-uri":
    reserved = socket.socket()
    reserved.bind(("127.0.0.1", 0))  # bound but not listening: connection refused
    def connect(uri, password, timeout=150):
        return real_connect(f"bolt://127.0.0.1:{reserved.getsockname()[1]}", password, timeout=1)
    verifier.connect = connect
elif mode == "bad-credentials":
    def connect(uri, password, timeout=150):
        ready = real_connect(uri, password)
        ready.close()  # prove the server is ready before trying wrong credentials
        return real_connect(uri, "deliberately-invalid", timeout=1)
    verifier.connect = connect
elif mode == "missing-driver":
    def without_driver(name, *args, **kwargs):
        if name == "neo4j":
            raise ModuleNotFoundError("neo4j deliberately hidden by test import hook")
        return real_import(name, *args, **kwargs)
    builtins.__import__ = without_driver
elif mode in ("malformed-cypher", "import-error"):
    def build(files, snapshot, provenance, run_dir):
        graph = real_build(files, snapshot, provenance, run_dir)
        # Append after valid generated statements: earlier import success must
        # not hide this real server-side syntax/runtime failure.
        fault = "THIS IS MALFORMED CYPHER;" if mode == "malformed-cypher" else "RETURN 1 / 0;"
        with (run_dir / "import.cypher").open("a", encoding="utf-8") as stream:
            stream.write("\n// Deliberate fault from test harness\n" + fault + "\n")
        return graph
    verifier.build_artifacts = build
else:
    raise ValueError(mode)

try:
    raise SystemExit(verifier.main(sys.argv[1:]))
finally:
    if reserved:
        reserved.close()
