import json
import os
import pytest
from src.parser import DependencyGraphBuilder, JavaASTParser, normalize_path
from src.neo4j_importer import Neo4jGraphImporter


def test_path_normalization():
    assert normalize_path("pets/visits") == "/pets/visits"
    assert normalize_path("/pets/visits/") == "/pets/visits"
    assert normalize_path("/pets/visits") == "/pets/visits"
    assert normalize_path("/") == "/"


def test_baseline_graph_generation():
    builder = DependencyGraphBuilder()
    graph = builder.build_graph(
        provider_file_path="data/baseline/VisitResource.java",
        client_file_path="data/baseline/VisitsServiceClient.java",
        snapshot_kind="baseline"
    )

    # Check metadata
    assert graph["metadata"]["snapshot_kind"] == "baseline"
    assert graph["metadata"]["commit_sha"] == "3858f9c630cf989bb6809a86edf47c2be78dc9f1"

    # Check nodes
    node_ids = [n["id"] for n in graph["nodes"]]
    assert any("VisitResource#read(List<Integer>)" in nid for nid in node_ids)
    assert any("VisitsServiceClient#getVisitsForPets(List<Integer>)" in nid for nid in node_ids)

    # Check endpoints
    endpoints = graph["endpoints"]
    get_visits_ep = next((ep for ep in endpoints if ep["normalized_path"] == "/pets/visits" and ep["http_method"] == "GET"), None)
    assert get_visits_ep is not None
    assert len(get_visits_ep["query_parameters"]) == 1
    assert get_visits_ep["query_parameters"][0]["name"] == "petId"
    assert get_visits_ep["query_parameters"][0]["effective_required"] is True

    # Check REST edges
    assert len(graph["edges"]) == 1
    edge = graph["edges"][0]
    assert edge["type"] == "INVOKES_API"
    assert "VisitsServiceClient#getVisitsForPets" in edge["source_id"]
    assert "VisitResource#read(List<Integer>)" in edge["target_id"]
    assert edge["target_service"] == "visits-service"
    assert edge["http_method"] == "GET"
    assert edge["normalized_path"] == "/pets/visits"
    assert edge["sent_query_parameters"] == ["petId"]
    assert edge["resolution_status"] == "RESOLVED"
    assert edge["contract_status"] == "VALID"
    assert edge["missing_required_parameters"] == []

    # Check evidence
    assert len(edge["evidence"]) == 2
    assert edge["evidence"][0]["evidence_type"] == "WEBCLIENT_CALL"
    assert edge["evidence"][1]["evidence_type"] == "ENDPOINT_HANDLER"
    assert edge["evidence"][0]["line_start"] > 0
    assert edge["evidence"][1]["line_start"] > 0

    # Check unresolved items (setter for hostname)
    assert any("setHostname" in u["expression"] for u in graph["unresolved"])


def test_mutated_graph_detects_missing_parameter():
    builder = DependencyGraphBuilder()
    graph = builder.build_graph(
        provider_file_path="data/mutated/VisitResource.java",
        client_file_path="data/mutated/VisitsServiceClient.java",
        snapshot_kind="mutated",
        patch_id="P01_includeDetails"
    )

    endpoints = graph["endpoints"]
    get_visits_ep = next((ep for ep in endpoints if ep["normalized_path"] == "/pets/visits" and ep["http_method"] == "GET"), None)
    assert get_visits_ep is not None
    param_names = [p["name"] for p in get_visits_ep["query_parameters"]]
    assert "includeDetails" in param_names
    assert "petId" in param_names

    inc_param = next(p for p in get_visits_ep["query_parameters"] if p["name"] == "includeDetails")
    assert inc_param["type"] == "boolean"
    assert inc_param["effective_required"] is True

    assert len(graph["edges"]) == 1
    edge = graph["edges"][0]
    assert edge["contract_status"] == "CONTRACT_MISMATCH_MISSING_REQUIRED_PARAMS"
    assert "includeDetails" in edge["missing_required_parameters"]


def test_2hop_chain_and_calls_edge():
    builder = DependencyGraphBuilder()
    files = [
        "data/baseline/VisitResource.java",
        "data/baseline/VisitsServiceClient.java",
        "data/baseline/ApiGatewayController.java"
    ]
    graph = builder.build_multi_file_graph(files, snapshot_kind="baseline")

    # Check that 2 edges are detected: INVOKES_API and CALLS
    edge_types = [e["type"] for e in graph["edges"]]
    assert "INVOKES_API" in edge_types
    assert "CALLS" in edge_types

    # Find CALLS edge
    calls_edge = next(e for e in graph["edges"] if e["type"] == "CALLS")
    assert "ApiGatewayController#getOwnerDetails" in calls_edge["source_id"]
    assert "VisitsServiceClient#getVisitsForPets" in calls_edge["target_id"]
    assert calls_edge["has_circuit_breaker"] is True
    assert calls_edge["fallback_method"] == "emptyVisitsForPets"
    assert calls_edge["cross_service"] is False

    # Find INVOKES_API edge
    rest_edge = next(e for e in graph["edges"] if e["type"] == "INVOKES_API")
    assert "VisitsServiceClient#getVisitsForPets" in rest_edge["source_id"]
    assert "VisitResource#read(List<Integer>)" in rest_edge["target_id"]
    assert rest_edge["cross_service"] is True


def test_backward_impact_trace_2hop():
    builder = DependencyGraphBuilder()
    files = [
        "data/baseline/VisitResource.java",
        "data/baseline/VisitsServiceClient.java",
        "data/baseline/ApiGatewayController.java"
    ]
    graph = builder.build_multi_file_graph(files, snapshot_kind="baseline")

    seed = "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>)"
    impact = builder.trace_backward_impact(graph, seed_id=seed, max_hops=3)

    assert impact["impacted_count"] == 2
    nodes = {item["node_id"]: item for item in impact["impacted_nodes"]}

    # Hop 1: VisitsServiceClient.getVisitsForPets (via INVOKES_API, 1 service crossing)
    client_id = next(nid for nid in nodes if "VisitsServiceClient#getVisitsForPets" in nid)
    assert nodes[client_id]["logic_hops"] == 1
    assert nodes[client_id]["service_crossings"] == 1
    assert nodes[client_id]["via_edge_type"] == "INVOKES_API"

    # Hop 2: ApiGatewayController.getOwnerDetails (via CALLS, crossings remain 1)
    controller_id = next(nid for nid in nodes if "ApiGatewayController#getOwnerDetails" in nid)
    assert nodes[controller_id]["logic_hops"] == 2
    assert nodes[controller_id]["service_crossings"] == 1
    assert nodes[controller_id]["via_edge_type"] == "CALLS"
    assert nodes[controller_id]["has_circuit_breaker"] is True
    assert nodes[controller_id]["fallback_method"] == "emptyVisitsForPets"


def test_cypher_generation():
    builder = DependencyGraphBuilder()
    files = [
        "data/baseline/VisitResource.java",
        "data/baseline/VisitsServiceClient.java",
        "data/baseline/ApiGatewayController.java"
    ]
    graph = builder.build_multi_file_graph(files, snapshot_kind="baseline")

    importer = Neo4jGraphImporter()
    cypher_path = "output/test_graph.cypher"
    cypher_code = importer.generate_cypher_script(graph, cypher_path)

    assert os.path.exists(cypher_path)
    assert "CREATE CONSTRAINT" in cypher_code
    assert "MERGE (s:Service" in cypher_code
    assert "INVOKES_API" in cypher_code
    assert "CALLS" in cypher_code

    if os.path.exists(cypher_path):
        os.remove(cypher_path)


def test_negative_fixture_different_http_method():
    builder = DependencyGraphBuilder()
    graph = builder.build_graph(
        provider_file_path="data/fixtures/NegativeProviderPOST.java",
        client_file_path="data/baseline/VisitsServiceClient.java",
        snapshot_kind="fixture_neg_method"
    )
    assert len(graph["edges"]) == 0


def test_negative_fixture_different_service():
    builder = DependencyGraphBuilder()
    graph = builder.build_graph(
        provider_file_path="data/fixtures/NegativeProviderOtherService.java",
        client_file_path="data/baseline/VisitsServiceClient.java",
        snapshot_kind="fixture_neg_service"
    )
    assert len(graph["edges"]) == 0


def test_negative_fixture_dynamic_uri_unresolved():
    builder = DependencyGraphBuilder()
    graph = builder.build_graph(
        provider_file_path="data/baseline/VisitResource.java",
        client_file_path="data/fixtures/NegativeClientDynamicUri.java",
        snapshot_kind="fixture_neg_dynamic"
    )
    assert len(graph["edges"]) == 0
    assert any("customUri" in u["expression"] for u in graph["unresolved"])


def test_deterministic_output():
    builder = DependencyGraphBuilder()
    run1 = builder.build_graph("data/baseline/VisitResource.java", "data/baseline/VisitsServiceClient.java")
    run2 = builder.build_graph("data/baseline/VisitResource.java", "data/baseline/VisitsServiceClient.java")

    assert json.dumps(run1, sort_keys=True) == json.dumps(run2, sort_keys=True)


def test_full_petclinic_multi_service_graph():
    builder = DependencyGraphBuilder()
    files = [
        "data/baseline/VisitResource.java",
        "data/baseline/VisitsServiceClient.java",
        "data/baseline/ApiGatewayController.java",
        "data/baseline/CustomersServiceClient.java",
        "data/baseline/OwnerResource.java",
        "data/baseline/PetResource.java",
        "data/baseline/VetResource.java"
    ]
    graph = builder.build_multi_file_graph(files, snapshot_kind="petclinic_full")

    services = {n["service"] for n in graph["nodes"]}
    assert services == {"visits-service", "customers-service", "vets-service", "api-gateway"}

    assert len(graph["edges"]) == 4
    edge_types = [e["type"] for e in graph["edges"]]
    assert edge_types.count("INVOKES_API") == 2
    assert edge_types.count("CALLS") == 2

    # Backward impact trace from OwnerResource.findOwner(int)
    seed = "customers-service::org.springframework.samples.petclinic.customers.web.OwnerResource#findOwner(int)"
    trace = builder.trace_backward_impact(graph, seed_id=seed, max_hops=3)

    assert trace["impacted_count"] == 2
    node_ids = [item["node_id"] for item in trace["impacted_nodes"]]
    assert any("CustomersServiceClient#getOwner" in nid for nid in node_ids)
    assert any("ApiGatewayController#getOwnerDetails" in nid for nid in node_ids)

