"""
Comprehensive test suite verifying full project integrity:
- Validates all generated JSON files in output/
- Checks metadata compliance, provenance separation, schema cleanliness
- Checks Cypher script validity
- Verifies benchmark results completeness across all 4 scenarios
"""

import glob
import json
import os
import pytest

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "output")


def test_json_files_syntax_and_schema_cleanliness():
    json_files = glob.glob(os.path.join(OUTPUT_DIR, "*.json"))
    assert len(json_files) >= 6, f"Expected at least 6 output JSON files, found {len(json_files)}"

    for fpath in json_files:
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert "$schema" not in data, f"File {os.path.basename(fpath)} should not contain '$schema' key"


def test_mutated_graphs_provenance_separation():
    mutated_files = [
        os.path.join(OUTPUT_DIR, "mutated_graph.json"),
        os.path.join(OUTPUT_DIR, "mutated_2hop_graph.json")
    ]
    baseline_commit = "3858f9c630cf989bb6809a86edf47c2be78dc9f1"

    for mf in mutated_files:
        if os.path.exists(mf):
            with open(mf, "r", encoding="utf-8") as f:
                data = json.load(f)
            commit = data.get("metadata", {}).get("commit_sha")
            assert commit != baseline_commit, f"Mutated file {os.path.basename(mf)} must not have baseline commit SHA"
            assert "MUTATED" in commit


def test_full_benchmark_results_structure():
    benchmark_file = os.path.join(OUTPUT_DIR, "full_benchmark_results.json")
    assert os.path.exists(benchmark_file), "full_benchmark_results.json must exist"

    with open(benchmark_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["total_evaluated_scenarios"] == 4, "Must evaluate all 4 scenarios"
    assert "graph_rag_average_f1" in data
    assert "vector_rag_average_f1" in data

    scenarios = data["scenarios_evaluation"]
    assert len(scenarios) == 4

    for sc in scenarios:
        assert sc["split"] in ["dev", "test"], f"Scenario {sc['scenario_id']} must specify split"
        # Check GraphRAG metrics
        gr = sc["graph_rag"]
        assert "latency_ms" in gr
        assert "hop1" in gr and "hop2" in gr
        assert "f1_score" in gr["overall"]

        # Check Vector RAG metrics
        vr = sc["vector_rag"]
        assert "latency_ms" in vr
        assert "hop1" in vr and "hop2" in vr
        assert "f1_score" in vr["overall"]


def test_graph_referential_integrity():
    graph_files = [
        os.path.join(OUTPUT_DIR, "baseline_graph.json"),
        os.path.join(OUTPUT_DIR, "baseline_2hop_graph.json"),
        os.path.join(OUTPUT_DIR, "mutated_2hop_graph.json"),
        os.path.join(OUTPUT_DIR, "petclinic_full_graph.json"),
        os.path.join(OUTPUT_DIR, "online_boutique_graph.json")
    ]

    for gf in graph_files:
        if os.path.exists(gf):
            with open(gf, "r", encoding="utf-8") as f:
                data = json.load(f)
            node_ids = {n["id"] for n in data["nodes"]}
            for edge in data.get("edges", []):
                assert edge["source_id"] in node_ids, f"In {os.path.basename(gf)}, edge source {edge['source_id']} missing from nodes"
                assert edge["target_id"] in node_ids, f"In {os.path.basename(gf)}, edge target {edge['target_id']} missing from nodes"


def test_cypher_files_validity():
    cypher_files = glob.glob(os.path.join(OUTPUT_DIR, "*.cypher"))
    assert len(cypher_files) >= 3, f"Expected at least 3 Cypher output files, found {len(cypher_files)}"

    for cf in cypher_files:
        assert os.path.getsize(cf) > 0, f"Cypher file {os.path.basename(cf)} is empty"
        with open(cf, "r", encoding="utf-8") as f:
            content = f.read()
        assert "MERGE" in content or "CREATE" in content, f"Cypher file {os.path.basename(cf)} has no MERGE or CREATE statements"


def test_decision_log_and_requirements():
    root_dir = os.path.join(os.path.dirname(__file__), "..")
    req_file = os.path.join(root_dir, "requirements.txt")
    dec_file = os.path.join(root_dir, "DECISION_LOG.md")

    assert os.path.exists(req_file), "requirements.txt must exist"
    assert os.path.exists(dec_file), "DECISION_LOG.md must exist"

    with open(req_file, "r", encoding="utf-8") as f:
        req_content = f.read()
    for package in ["tree-sitter", "chromadb", "neo4j", "pytest"]:
        assert package in req_content, f"requirements.txt missing {package}"

    with open(dec_file, "r", encoding="utf-8") as f:
        dec_content = f.read()
    for decision_id in ["D01", "D02", "D03", "D04", "D05", "D06", "D07"]:
        assert decision_id in dec_content, f"DECISION_LOG.md missing {decision_id}"
