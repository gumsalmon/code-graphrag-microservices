"""Fresh technical source -> parser -> Cypher -> isolated Neo4j, never labels."""
import argparse
import difflib
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform
import re
import sys
import time

CODE = {
    "src/parser.py": "349be1e5694505e2d14d0cceed0bc3d22411406bd7708286bc15d534edbf68fb",
    "src/neo4j_importer.py": "266d956189cf8aaf73df90969a56ebda9604b20769d9f6e9df5a413baf083bfb",
    "verify_neo4j_live.py": "a04cb346f57d09c0eedb99ec8a368d10f68943f4df800833adc96de1e366b0c3",
}


def write(directory, name, value):
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, indent=2) + "\n"
    with (directory / name).open("x", encoding="utf-8", newline="\n") as stream:
        stream.write(text)


def run(packet, implementation, output, snapshot, uri, run_id):
    from retrieval_probe import validate_input, digest, SOURCE_SHA
    validate_input(packet)
    if snapshot not in ("baseline", "mutated") or not re.fullmatch(r"bolt://p01-pipeline-[a-z0-9-]+:7687", uri):
        raise ValueError("Only a dedicated pipeline Neo4j address is permitted")
    for name, sha in CODE.items():
        if hashlib.sha256((implementation / name).read_bytes()).hexdigest() != sha:
            raise ValueError("Pinned graph implementation changed: " + name)
    versions = {name: importlib.metadata.version(name) for name in ("tree-sitter", "tree-sitter-java", "tree-sitter-go", "chromadb", "neo4j", "pytest")}
    if versions != {"tree-sitter": "0.25.2", "tree-sitter-java": "0.23.5", "tree-sitter-go": "0.25.0", "chromadb": "1.5.9", "neo4j": "5.28.1", "pytest": "9.1.1"}:
        raise ValueError("Pinned primary dependencies differ")
    sys.path.insert(0, str(implementation))
    # Reuse Hien's functions unchanged. Do not load an acceptance-label fixture.
    from src.parser import DependencyGraphBuilder
    from src.neo4j_importer import Neo4jGraphImporter
    from verify_neo4j_live import execute_cypher, inventory, empty_counts, query_impact
    from neo4j import GraphDatabase
    source_dir = output / "source"
    source_dir.mkdir()
    hashes = {}
    files = []
    patch_id = None
    for source in packet["sources"]:
        basename = Path(source["file"]).name
        baseline = (implementation / "data/baseline" / basename).read_bytes().replace(b"\r\n", b"\n")
        if digest(baseline) != source["sha256"] or baseline.decode("utf-8") != source["text"]:
            raise ValueError("Source packet differs from pinned fixture")
        text = source["text"]
        if snapshot == "mutated" and basename == "VisitResource.java":
            text = (implementation / "data/mutated" / basename).read_bytes().replace(b"\r\n", b"\n").decode("utf-8")
            patch = "".join(difflib.unified_diff(source["text"].splitlines(keepends=True), text.splitlines(keepends=True), fromfile=source["file"], tofile=source["file"]))
            if patch.count("@@") != 2 or "includeDetails" not in patch:
                raise ValueError("Unexpected mutation fixture")
            write(output, "mutation.patch", patch)
            patch_id = digest(patch)
        target = source_dir / basename
        write(source_dir, basename, text)
        hashes[basename] = digest(text)
        files.append(str(target))
    graph = DependencyGraphBuilder(commit_sha=SOURCE_SHA).build_multi_file_graph(files, snapshot_kind=snapshot,
        patch_id=patch_id, override_commit_sha="MUTATED_LOCAL_UNCOMMITTED" if snapshot == "mutated" else None)
    seed = packet["seed_id"]
    if snapshot == "mutated":
        ids = [node["id"] for node in graph["nodes"] if node["file"].endswith("/VisitResource.java") and node["method_name"] == "read" and node["parameter_types"] == ["List<Integer>", "boolean"]]
        if len(ids) != 1:
            raise ValueError("Mutated seed is not unique")
        seed = ids[0]
    if not graph["nodes"] or not graph["edges"]:
        raise ValueError("Fresh parser returned no graph")
    write(output, "parser-output.json", graph)
    Neo4jGraphImporter().generate_cypher_script(graph, str(output / "import.cypher"))
    deadline = time.monotonic() + 120
    driver = None
    while time.monotonic() < deadline:
        driver = GraphDatabase.driver(uri, auth=None, connection_timeout=3)
        try:
            driver.verify_connectivity()
            break
        except Exception:
            driver.close()
            driver = None
            time.sleep(1)
    if driver is None:
        raise ValueError("Dedicated Neo4j did not become ready")
    imports = []
    try:
        empty = empty_counts(driver)
        if empty != {"node_count": 0, "relationship_count": 0}:
            raise ValueError("Neo4j must be new and empty")
        content = (output / "import.cypher").read_text(encoding="utf-8")
        execute_cypher(driver, content, imports)
        first = inventory(driver)
        execute_cypher(driver, content, imports)
        observed = inventory(driver)
        if first != observed or observed["methods"] != sorted(node["id"] for node in graph["nodes"]):
            raise ValueError("Inventory/idempotence check failed")
        if sorted((e["source_id"], e["type"], e["target_id"]) for e in graph["edges"]) != sorted((e["source"], e["type"], e["target"]) for e in observed["edges"]):
            raise ValueError("Neo4j edges differ from fresh parser")
        result = query_impact(driver, seed)
        if not result["seed_excluded"]:
            raise ValueError("Seed leaked into dependency candidates")
        result.update(snapshot_kind=snapshot, run_id=run_id + "-" + snapshot, inventory_before=empty,
            inventory_after=observed, source="fresh Neo4j Bolt query; not impact labels")
        write(output, "query-result.json", result)
        with driver.session() as session:
            version = session.run("CALL dbms.components() YIELD versions RETURN versions[0] AS version").single()["version"]
        if version != "5.26.0":
            raise ValueError("Unexpected Neo4j server version")
        write(output, "environment.json", {"schema": "p01-pipeline-graph/1", "snapshot": snapshot,
            "python": platform.python_version(), "dependencies": versions, "neo4j_version": version,
            "provenance": {"baseline_commit": SOURCE_SHA, "snapshot_files": hashes,
                "source_origin": "checksummed technical bundle, compared with pinned implementation fixtures; not a PetClinic Git checkout"},
            "implementation_code_sha256": CODE, "labels_read": False, "runtime_app_tested": False,
            "remote_llm_calls": 0, "seed_excluded": True, "repeat_import_idempotent": True})
    finally:
        write(output, "import-log.json", imports)
        driver.close()


if __name__ == "__main__":
    cli = argparse.ArgumentParser()
    for name in ("input", "implementation", "output"):
        cli.add_argument("--" + name, type=Path, required=True)
    cli.add_argument("--snapshot", choices=("baseline", "mutated"), required=True)
    cli.add_argument("--uri", required=True)
    cli.add_argument("--run-id", required=True)
    args = cli.parse_args()
    sys.path.insert(0, "/retrieval-adapter")
    import importlib.util
    spec = importlib.util.spec_from_file_location("retrieval_probe", "/retrieval-adapter/retrieval-probe.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    sys.modules["retrieval_probe"] = module
    try:
        run(json.loads(args.input.read_text(encoding="utf-8")), args.implementation, args.output, args.snapshot, args.uri, args.run_id)
        print(json.dumps({"status": "fresh_graph_technical_check_passed", "snapshot": args.snapshot, "labels_read": False}))
    except Exception as error:
        print("Graph stage failed: " + str(error), file=sys.stderr)
        sys.exit(1)
