"""Verify the P01 parser -> Cypher -> Neo4j graph path on an isolated container.

This is a technical path check, not behavioral impact ground truth.
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import re
import secrets
import shutil
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone

from src.neo4j_importer import Neo4jGraphImporter
from src.parser import DependencyGraphBuilder


ROOT = Path(__file__).resolve().parent
COMMIT = "3858f9c630cf989bb6809a86edf47c2be78dc9f1"
IMAGE = "neo4j:5.26.0"
LABEL = "code-graphrag.p01-e2e.run-id"
SOURCE = {
    "provider": "spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java",
    "client": "spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/application/VisitsServiceClient.java",
    "controller": "spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java",
}
NAMES = {role: Path(path).name for role, path in SOURCE.items()}


class VerificationError(RuntimeError):
    pass


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def command(argv: list[str], log: list[dict], *, env: dict | None = None, timeout: int = 300) -> str:
    start = time.perf_counter()
    result = subprocess.run(argv, capture_output=True, text=True, encoding="utf-8", errors="replace", env=env, timeout=timeout)
    log.append({"command": argv, "exit_code": result.returncode,
                "duration_seconds": round(time.perf_counter() - start, 3),
                "stdout": result.stdout.strip(), "stderr": result.stderr.strip()})
    if result.returncode:
        raise VerificationError(f"Command failed ({result.returncode}): {' '.join(argv)}: {result.stderr.strip()}")
    return result.stdout.strip()


def split_cypher(content: str) -> list[str]:
    """Remove // comments and split semicolons outside quoted text."""
    statements, chars = [], []
    quote = None
    escaped = False
    pos = 0
    while pos < len(content):
        char = content[pos]
        next_char = content[pos + 1] if pos + 1 < len(content) else ""
        if quote:
            chars.append(char)
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif char in ("'", '"', "`"):
            quote = char
            chars.append(char)
        elif char == "/" and next_char == "/":
            while pos < len(content) and content[pos] not in "\r\n":
                pos += 1
            continue
        elif char == ";":
            statement = "".join(chars).strip()
            if statement:
                statements.append(statement)
            chars = []
        else:
            chars.append(char)
        pos += 1
    if quote or "".join(chars).strip():
        raise VerificationError("Cypher has an unterminated string or statement")
    if not statements:
        raise VerificationError("Cypher input has no statements")
    return statements


def prepare_source(root: Path, snapshot: str, run_dir: Path, commands: list[dict]) -> tuple[list[Path], dict]:
    root = root.resolve(strict=True)
    actual_commit = command(["git", "-C", str(root), "rev-parse", "HEAD"], commands)
    if actual_commit != COMMIT:
        raise VerificationError(f"PetClinic commit mismatch: {actual_commit}")
    if command(["git", "-C", str(root), "status", "--porcelain", "--untracked-files=no"], commands):
        raise VerificationError("PetClinic tracked source is dirty")
    original = {role: root / path for role, path in SOURCE.items()}
    for role, path in original.items():
        fixture = ROOT / "data" / "baseline" / NAMES[role]
        if not path.is_file() or path.read_bytes() != fixture.read_bytes():
            raise VerificationError(f"Fixed source differs from baseline fixture: {path}")
    source_dir = run_dir / "snapshot-source"
    source_dir.mkdir()
    for role, path in original.items():
        shutil.copyfile(path, source_dir / NAMES[role])
    mutation = None
    if snapshot == "mutated":
        for role in ("client", "controller"):
            if (ROOT / "data" / "mutated" / NAMES[role]).read_bytes() != original[role].read_bytes():
                raise VerificationError(f"Mutation unexpectedly changes {role}")
        altered = ROOT / "data" / "mutated" / NAMES["provider"]
        before = original["provider"].read_text(encoding="utf-8").splitlines(keepends=True)
        after = altered.read_text(encoding="utf-8").splitlines(keepends=True)
        patch = "".join(difflib.unified_diff(before, after, fromfile=SOURCE["provider"], tofile=SOURCE["provider"]))
        if patch.count("@@") != 2 or "includeDetails" not in patch:
            raise VerificationError("Tracked mutation is not a single includeDetails provider hunk")
        (run_dir / "mutation.patch").write_text(patch, encoding="utf-8")
        shutil.copyfile(altered, source_dir / NAMES["provider"])
        mutation = {"kind": "tracked fixture; not the independent runtime patch",
                    "patch_sha256": digest(run_dir / "mutation.patch"), "provider_sha256": digest(altered)}
    files = [source_dir / NAMES[role] for role in ("provider", "client", "controller")]
    provenance = {"repository": "https://github.com/spring-petclinic/spring-petclinic-microservices",
                  "baseline_commit": actual_commit, "source_root": str(root),
                  "original_files": {role: {"path": str(path), "sha256": digest(path)} for role, path in original.items()},
                  "snapshot_files": {path.name: digest(path) for path in files}, "mutation": mutation}
    return files, provenance


def build_artifacts(files: list[Path], snapshot: str, provenance: dict, run_dir: Path) -> dict:
    patch_id = provenance["mutation"]["patch_sha256"] if snapshot == "mutated" else None
    graph = DependencyGraphBuilder(commit_sha=COMMIT).build_multi_file_graph(
        [str(path) for path in files], snapshot_kind=snapshot, patch_id=patch_id,
        override_commit_sha="MUTATED_LOCAL_UNCOMMITTED" if snapshot == "mutated" else None)
    metadata = graph.get("metadata", {})
    if metadata.get("snapshot_kind") != snapshot or metadata.get("patch_id") != patch_id:
        raise VerificationError("Parser snapshot metadata mismatch")
    if not graph.get("nodes") or not graph.get("edges"):
        raise VerificationError("Fresh parser output is empty")
    write_json(run_dir / "parser-output.json", graph)
    Neo4jGraphImporter().generate_cypher_script(graph, str(run_dir / "import.cypher"))
    if not (run_dir / "import.cypher").stat().st_size:
        raise VerificationError("Generated Cypher is empty")
    return graph


def execute_cypher(driver, content: str, log: list[dict]) -> None:
    with driver.session(database="neo4j") as session:
        for index, statement in enumerate(split_cypher(content), 1):
            start = time.perf_counter()
            sha = hashlib.sha256(statement.encode("utf-8")).hexdigest()
            try:
                session.run(statement).consume()
            except Exception as exc:
                log.append({"statement": index, "sha256": sha, "status": "failed", "error": str(exc)})
                raise VerificationError(f"Cypher statement {index} failed: {exc}") from exc
            log.append({"statement": index, "sha256": sha, "status": "ok",
                        "duration_seconds": round(time.perf_counter() - start, 3)})


def inventory(driver) -> dict:
    with driver.session(database="neo4j") as session:
        methods = [row["id"] for row in session.run("MATCH (m:Method) RETURN m.id AS id ORDER BY id")]
        edges = [dict(row) for row in session.run(
            "MATCH (a:Method)-[r:CALLS|INVOKES_API]->(b:Method) "
            "RETURN a.id AS source, type(r) AS type, b.id AS target ORDER BY source, type, target")]
        nodes = session.run("MATCH (n) RETURN count(n) AS n").single()["n"]
        relationships = session.run("MATCH ()-[r]->() RETURN count(r) AS n").single()["n"]
    return {"methods": methods, "edges": edges, "node_count": nodes, "relationship_count": relationships}


def empty_counts(driver) -> dict:
    """Check a new database without querying labels that do not exist yet."""
    with driver.session(database="neo4j") as session:
        nodes = session.run("MATCH (n) RETURN count(n) AS n").single()["n"]
        relationships = session.run("MATCH ()-[r]->() RETURN count(r) AS n").single()["n"]
    return {"node_count": nodes, "relationship_count": relationships}


def query_impact(driver, seed: str) -> dict:
    with driver.session(database="neo4j") as session:
        if session.run("MATCH (m:Method {id:$seed}) RETURN count(m) AS n", seed=seed).single()["n"] != 1:
            raise VerificationError(f"Full seed method ID is not unique/present: {seed}")
        rows = list(session.run(
            "MATCH p=(caller:Method)-[:CALLS|INVOKES_API*1..2]->(seed:Method {id:$seed}) "
            "WHERE caller.id <> $seed "
            "RETURN caller.id AS impacted_id, [n IN nodes(p) | n.id] AS node_path, "
            "[r IN relationships(p) | type(r)] AS edge_path "
            "ORDER BY size(relationships(p)), impacted_id", seed=seed))
    impacts, seen = [], set()
    for row in rows:
        method_id = row["impacted_id"]
        if method_id in seen:
            continue
        seen.add(method_id)
        path = row["node_path"]
        services = [node_id.split("::", 1)[0] for node_id in path]
        impacts.append({"method_id": method_id, "hop": len(row["edge_path"]),
                        "method_path": path, "edge_path": row["edge_path"],
                        "service_boundary_crossings": sum(a != b for a, b in zip(services, services[1:]))})
    return {"seed_id": seed, "impacted_methods": impacts, "seed_excluded": seed not in seen}


def assert_acceptance(graph: dict, observed: dict, result: dict, expected: dict, snapshot: str) -> list[str]:
    checks = []
    graph_edges = sorted((e["source_id"], e["type"], e["target_id"]) for e in graph["edges"] if e["type"] in ("CALLS", "INVOKES_API"))
    db_edges = sorted((e["source"], e["type"], e["target"]) for e in observed["edges"])
    if graph_edges != db_edges:
        raise VerificationError("Neo4j dependency edges differ from fresh parser output")
    checks.append("Neo4j edges equal fresh parser output")
    if sorted(n["id"] for n in graph["nodes"]) != observed["methods"]:
        raise VerificationError("Neo4j methods differ from fresh parser output")
    checks.append("Neo4j methods equal fresh parser output")
    if not result["seed_excluded"]:
        raise VerificationError("Seed appears in impact set")
    checks.append("Seed excluded")
    found = {item["method_id"]: item for item in result["impacted_methods"]}
    for hop in (1, 2):
        method_id = expected[f"hop{hop}"]
        if method_id not in found or found[method_id]["hop"] != hop:
            raise VerificationError(f"Expected technical path missing at hop {hop}: {method_id}")
        checks.append(f"Hop {hop}: {method_id}")
    endpoint = next((ep for ep in graph["endpoints"] if ep["handler_id"] == expected["seed_id"]), None)
    if endpoint is None:
        raise VerificationError("Seed endpoint missing")
    has_required_param = any(p["name"] == "includeDetails" and p["effective_required"] for p in endpoint["query_parameters"])
    if has_required_param != (snapshot == "mutated"):
        raise VerificationError(f"Snapshot does not match required includeDetails state: {snapshot}")
    checks.append(f"Snapshot parameter state: {snapshot}")
    return checks


def start_container(run_id: str, commands: list[dict]) -> tuple[str, str, str, str]:
    name = f"p01-e2e-{run_id}"
    password = secrets.token_hex(18)
    env = os.environ.copy()
    env["NEO4J_AUTH"] = f"neo4j/{password}"
    container_id = command(["docker", "run", "--rm", "--detach", "--name", name,
                            "--label", f"{LABEL}={run_id}", "--publish", "127.0.0.1::7687",
                            "--env", "NEO4J_AUTH", IMAGE], commands, env=env)
    if not re.fullmatch(r"[a-f0-9]{64}", container_id):
        raise VerificationError("Docker did not return a 64-character container ID")
    try:
        port = command(["docker", "port", name, "7687/tcp"], commands)
        match = re.search(r"127\.0\.0\.1:(\d+)", port)
        if not match:
            raise VerificationError(f"Docker did not bind a loopback Bolt port: {port}")
        return name, container_id, f"bolt://127.0.0.1:{match.group(1)}", password
    except Exception:
        command(["docker", "stop", name], commands, timeout=90)
        raise


def connect(uri: str, password: str, timeout: int = 150):
    try:
        from neo4j import GraphDatabase
    except ImportError as exc:
        raise VerificationError("Neo4j Python driver is missing") from exc
    deadline, last = time.monotonic() + timeout, None
    while time.monotonic() < deadline:
        driver = GraphDatabase.driver(uri, auth=("neo4j", password), connection_timeout=4)
        try:
            driver.verify_connectivity()
            return driver
        except Exception as exc:
            last = exc
            driver.close()
            time.sleep(2)
    raise VerificationError(f"Neo4j connection failed at {uri}: {last}")


def checksums(run_dir: Path) -> None:
    files = sorted(p for p in run_dir.iterdir() if p.is_file() and p.name != "checksums.sha256")
    (run_dir / "checksums.sha256").write_text(
        "".join(f"{digest(path)}  {path.name}\n" for path in files), encoding="utf-8")


def verify(args: argparse.Namespace) -> Path:
    run_id = f"{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}-{args.snapshot}-{uuid.uuid4().hex[:8]}"
    run_dir = (args.output_root / run_id).resolve()
    run_dir.mkdir(parents=True, exist_ok=False)
    commands, imports = [], []
    commands.append({"command": args.invocation, "exit_code": None, "duration_seconds": None,
                     "purpose": "P01 source-to-Neo4j verifier"})
    container_name = None
    failure = None
    started = time.perf_counter()
    try:
        acceptance = json.loads(args.acceptance_file.read_text(encoding="utf-8"))
        if acceptance.get("baseline_commit") != COMMIT:
            raise VerificationError("Acceptance fixture commit mismatch")
        expected = acceptance["expectations"][args.snapshot]
        files, provenance = prepare_source(args.source_root, args.snapshot, run_dir, commands)
        graph = build_artifacts(files, args.snapshot, provenance, run_dir)
        if graph["metadata"]["repository"] != provenance["repository"]:
            raise VerificationError("Parser repository metadata mismatch")
        cypher = run_dir / "import.cypher"
        if args.cypher_file:
            selected = args.cypher_file.resolve(strict=True)
            if not selected.is_file() or digest(selected) != digest(cypher):
                raise VerificationError("Explicit Cypher must equal the freshly generated Cypher")
        content = cypher.read_text(encoding="utf-8")
        statement_count = len(split_cypher(content))
        container_name, container_id, uri, password = start_container(run_id, commands)
        driver = connect(uri, password)
        try:
            with driver.session(database="neo4j") as session:
                version = session.run("CALL dbms.components() YIELD versions RETURN versions[0] AS version").single()["version"]
            empty = empty_counts(driver)
            if empty["node_count"] or empty["relationship_count"]:
                raise VerificationError("Dedicated container was not empty before import")
            execute_cypher(driver, content, imports)
            first = inventory(driver)
            execute_cypher(driver, content, imports)
            second = inventory(driver)
            if first != second:
                raise VerificationError("Repeat import changed graph inventory")
            result = query_impact(driver, expected["seed_id"])
            checks = ["Dedicated container empty before import", "Repeat import idempotent"]
            checks += assert_acceptance(graph, second, result, expected, args.snapshot)
            result.update({"snapshot_kind": args.snapshot, "run_id": run_id,
                           "container_id": container_id, "inventory_before": empty,
                           "inventory_after": second, "source": "Neo4j Bolt query"})
            write_json(run_dir / "query-result.json", result)
            write_json(run_dir / "environment.json", {
                "run_id": run_id, "created_utc": datetime.now(timezone.utc).isoformat(),
                "python": platform.python_version(),
                "dependencies": {name: importlib.metadata.version(name) for name in ("tree-sitter", "tree-sitter-java", "neo4j", "pytest")},
                "docker_client": command(["docker", "version", "--format", "{{.Client.Version}}"], commands),
                "docker_server": command(["docker", "version", "--format", "{{.Server.Version}}"], commands),
                "neo4j_image": IMAGE,
                "neo4j_image_id": command(["docker", "image", "inspect", "--format", "{{.Id}}", IMAGE], commands),
                "neo4j_version": version, "container_id": container_id,
                "container_name": container_name, "container_label": f"{LABEL}={run_id}",
                "bolt_uri": uri, "provenance": provenance, "parser_metadata": graph["metadata"],
                "acceptance_fixture": {"path": str(args.acceptance_file.resolve()), "sha256": digest(args.acceptance_file)},
                "cypher_statement_count": statement_count,
                "duration_seconds": round(time.perf_counter() - started, 3),
            })
        finally:
            driver.close()
        (run_dir / "test-results.log").write_text("\n".join(f"PASS {item}" for item in checks) + "\n", encoding="utf-8")
        (run_dir / "summary.md").write_text(
            f"# P01 graph E2E: {args.snapshot}\n\nStatus: pass. Technical graph-path check only; not ground truth.\n\n"
            f"Run ID: `{run_id}`. Source commit: `{COMMIT}`.\n\n"
            "Raw artifacts: [environment](environment.json), [commands](commands.log), "
            "[parser JSON](parser-output.json), [Cypher](import.cypher), [import log](import.log), "
            "[query result](query-result.json), [checks](test-results.log), [checksums](checksums.sha256).\n",
            encoding="utf-8")
    except Exception as exc:
        failure = exc
        (run_dir / "test-results.log").write_text(f"FAIL {type(exc).__name__}: {exc}\n", encoding="utf-8")
    finally:
        if container_name:
            try:
                label = command(["docker", "inspect", "--format", f"{{{{index .Config.Labels \"{LABEL}\"}}}}", container_name], commands)
                if label != run_id:
                    raise VerificationError("Refusing cleanup: container ownership label mismatch")
                command(["docker", "stop", container_name], commands, timeout=90)
            except Exception as exc:
                commands.append({"cleanup_error": str(exc)})
                if failure is None:
                    failure = exc
                    (run_dir / "test-results.log").write_text(f"FAIL cleanup: {exc}\n", encoding="utf-8")
        commands[0]["exit_code"] = 1 if failure else 0
        commands[0]["duration_seconds"] = round(time.perf_counter() - started, 3)
        if failure and not (run_dir / "environment.json").exists():
            write_json(run_dir / "environment.json", {
                "run_id": run_id, "snapshot_kind": args.snapshot,
                "source_root": str(args.source_root), "status": "failed",
                "error_type": type(failure).__name__, "error": str(failure),
            })
        if failure:
            (run_dir / "summary.md").write_text(
                f"# P01 graph E2E: {args.snapshot}\n\nStatus: failed. {type(failure).__name__}: {failure}\n\n"
                "Raw artifacts: [environment](environment.json), [commands](commands.log), "
                "[import log](import.log), [checks](test-results.log), [checksums](checksums.sha256).\n",
                encoding="utf-8",
            )
        write_json(run_dir / "commands.log", commands)
        write_json(run_dir / "import.log", imports)
        checksums(run_dir)
    if failure:
        raise failure
    return run_dir


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", choices=("baseline", "mutated"), required=True)
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--acceptance-file", type=Path, default=ROOT / "tests" / "fixtures" / "p01_graph_path_expectation.json")
    parser.add_argument("--cypher-file", type=Path, help="Optional exact input; must match newly generated Cypher")
    parser.add_argument("--output-root", type=Path, default=ROOT / "evidence" / "p01-e2e")
    args = parser.parse_args(argv)
    args.invocation = [sys.executable, str(Path(__file__).resolve()), *(argv if argv is not None else sys.argv[1:])]
    try:
        result = verify(args)
        print(f"PASS {args.snapshot}: {result}")
        return 0
    except Exception as exc:
        print(f"FAIL {args.snapshot}: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
