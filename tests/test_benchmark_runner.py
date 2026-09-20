import os
import pytest
from src.benchmark_runner import BenchmarkRunner


def test_benchmark_runner_scenarios():
    runner = BenchmarkRunner()
    scenarios = runner.get_standard_scenarios()
    assert len(scenarios) == 4

    p01 = next(s for s in scenarios if s.id == "P01_VISIT_QUERY_PARAM")
    assert len(p01.full_ground_truth) == 2
    assert p01.protocol == "REST"

    p03 = next(s for s in scenarios if s.id == "P03_CART_SERVICE_SCHEMA")
    assert p03.protocol == "gRPC"
    assert p03.system == "Google Cloud Online Boutique"


def test_benchmark_runner_execution():
    runner = BenchmarkRunner()
    summary = runner.run_all(output_path="output/test_benchmark_results.json")

    assert summary["total_evaluated_scenarios"] == 4
    assert summary["graph_rag_average_f1"] >= 0.0
    assert summary["vector_rag_average_f1"] < 1.0

    if os.path.exists("output/test_benchmark_results.json"):
        os.remove("output/test_benchmark_results.json")
