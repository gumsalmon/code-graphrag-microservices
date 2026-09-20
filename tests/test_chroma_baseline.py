import os
import pytest
from src.chroma_baseline import ASTCodeChunker, ChromaBaselineStore


def test_ast_code_chunker_visit_resource():
    chunker = ASTCodeChunker()
    chunks = chunker.chunk_file("data/baseline/VisitResource.java")

    assert len(chunks) >= 4  # Class header, 3 methods, 1 record
    chunk_types = [c.chunk_type for c in chunks]
    assert "CLASS_HEADER" in chunk_types
    assert "METHOD" in chunk_types
    assert "RECORD" in chunk_types

    # Find read(List<Integer>) method chunk
    read_chunk = next(c for c in chunks if c.method_name == "read" and "List<Integer>" in c.chunk_id)
    assert read_chunk.is_endpoint is True
    assert read_chunk.http_method == "GET"
    assert "@GetMapping(\"pets/visits\")" in read_chunk.content
    assert read_chunk.service == "visits-service"


def test_ast_code_chunker_api_gateway():
    chunker = ASTCodeChunker()
    chunks = chunker.chunk_file("data/baseline/ApiGatewayController.java")

    # Find getOwnerDetails
    owner_chunk = next(c for c in chunks if c.method_name == "getOwnerDetails")
    assert owner_chunk.is_endpoint is True
    assert "visitsServiceClient.getVisitsForPets" in owner_chunk.content
    assert owner_chunk.service == "api-gateway"


def test_chroma_indexing_and_query():
    try:
        import chromadb
    except ImportError:
        pytest.skip("ChromaDB not yet installed")

    store = ChromaBaselineStore(
        collection_name="test_petclinic_baseline",
        persist_directory="./test_chroma_db"
    )

    files = [
        "data/baseline/VisitResource.java",
        "data/baseline/VisitsServiceClient.java",
        "data/baseline/ApiGatewayController.java"
    ]
    indexed_count = store.index_files(files)
    assert indexed_count > 0

    # Query for visits endpoint
    results = store.query_impact("GET /pets/visits with petId parameter", n_results=3)
    assert len(results) > 0
    # Top result should be related to visits
    top_chunk_id = results[0]["chunk_id"]
    assert "visits" in top_chunk_id.lower() or "read" in top_chunk_id.lower()

    # Compare with 2-hop ground truth
    ground_truth = [
        "api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#getVisitsForPets(List<Integer>)",
        "api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#getOwnerDetails(int)"
    ]
    eval_res = store.compare_with_graph_hops(
        query_text="mutation in VisitResource read GET /pets/visits add includeDetails",
        graph_impacted_ids=ground_truth,
        top_k=5
    )
    assert eval_res["ground_truth_target_count"] == 2
    assert "precision_at_k" in eval_res
    assert "recall_at_k" in eval_res

    # Clean up test database directory
    try:
        import shutil
        shutil.rmtree("./test_chroma_db", ignore_errors=True)
    except Exception:
        pass


def test_ast_code_chunker_go_and_proto():
    chunker = ASTCodeChunker()

    # Test Go chunking
    go_chunks = chunker.chunk_file("data/online_boutique/checkoutservice_main.go")
    assert len(go_chunks) >= 15
    chunk_ids = [c.chunk_id for c in go_chunks]
    assert "checkoutservice::main.getUserCart()" in chunk_ids
    assert "checkoutservice::main.chargeCard()" in chunk_ids

    # Test Proto chunking
    proto_chunks = chunker.chunk_file("data/online_boutique/demo.proto")
    assert len(proto_chunks) >= 10
    proto_chunk_ids = [c.chunk_id for c in proto_chunks]
    assert any("cartservice::CartService#GetCart" in cid for cid in proto_chunk_ids)
    assert any("paymentservice::PaymentService#Charge" in cid for cid in proto_chunk_ids)

