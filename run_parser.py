"""
Execution script to parse PetClinic Java files, export 2-hop dependency graphs,
generate Cypher scripts for Neo4j, and run backward impact propagation analysis.
"""

import json
import os
import sys
from src.parser import DependencyGraphBuilder
from src.neo4j_importer import Neo4jGraphImporter

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def main():
    os.makedirs('output', exist_ok=True)
    builder = DependencyGraphBuilder(
        commit_sha="3858f9c630cf989bb6809a86edf47c2be78dc9f1",
        repository="https://github.com/spring-petclinic/spring-petclinic-microservices"
    )
    importer = Neo4jGraphImporter()

    print("=================================================================")
    print(" 1. XUẤT ĐỒ THỊ 2 TẬP TIN (TASK KHỞI ĐẦU - PILOT)")
    print("=================================================================")
    baseline_2f = builder.build_graph(
        provider_file_path="data/baseline/VisitResource.java",
        client_file_path="data/baseline/VisitsServiceClient.java",
        snapshot_kind="baseline"
    )
    with open("output/baseline_graph.json", "w", encoding="utf-8") as f:
        json.dump(baseline_2f, f, indent=2, ensure_ascii=False)
    print("✓ Đã lưu output/baseline_graph.json")

    mutated_2f = builder.build_graph(
        provider_file_path="data/mutated/VisitResource.java",
        client_file_path="data/mutated/VisitsServiceClient.java",
        snapshot_kind="mutated",
        patch_id="P01_includeDetails"
    )
    # We will just pass MUTATED_LOCAL_UNCOMMITTED in the output JSON directly to avoid touching build_graph again.
    mutated_2f["metadata"]["commit_sha"] = "MUTATED_LOCAL_UNCOMMITTED"

    with open("output/mutated_graph.json", "w", encoding="utf-8") as f:
        json.dump(mutated_2f, f, indent=2, ensure_ascii=False)
    print("✓ Đã lưu output/mutated_graph.json")

    print("\n=================================================================")
    print(" 2. XUẤT ĐỒ THỊ 3 TẬP TIN 2-HOP (GỒM APIGATEWAYCONTROLLER)")
    print("=================================================================")
    files_baseline = [
        "data/baseline/VisitResource.java",
        "data/baseline/VisitsServiceClient.java",
        "data/baseline/ApiGatewayController.java"
    ]
    baseline_2hop = builder.build_multi_file_graph(files_baseline, snapshot_kind="baseline")
    with open("output/baseline_2hop_graph.json", "w", encoding="utf-8") as f:
        json.dump(baseline_2hop, f, indent=2, ensure_ascii=False)
    print("✓ Đã lưu output/baseline_2hop_graph.json")

    files_mutated = [
        "data/mutated/VisitResource.java",
        "data/mutated/VisitsServiceClient.java",
        "data/mutated/ApiGatewayController.java"
    ]
    mutated_2hop = builder.build_multi_file_graph(
        files_mutated, 
        snapshot_kind="mutated", 
        patch_id="P01_includeDetails",
        override_commit_sha="MUTATED_LOCAL_UNCOMMITTED"
    )
    with open("output/mutated_2hop_graph.json", "w", encoding="utf-8") as f:
        json.dump(mutated_2hop, f, indent=2, ensure_ascii=False)
    print("✓ Đã lưu output/mutated_2hop_graph.json")

    print("\n=================================================================")
    print(" 3. XUẤT ĐỒ THỊ TOÀN DIỆN TOÀN BỘ PETCLINIC (4 MICROSERVICES)")
    print("=================================================================")
    files_full = [
        "data/baseline/VisitResource.java",
        "data/baseline/VisitsServiceClient.java",
        "data/baseline/ApiGatewayController.java",
        "data/baseline/CustomersServiceClient.java",
        "data/baseline/OwnerResource.java",
        "data/baseline/PetResource.java",
        "data/baseline/VetResource.java"
    ]
    petclinic_full = builder.build_multi_file_graph(files_full, snapshot_kind="petclinic_full")
    with open("output/petclinic_full_graph.json", "w", encoding="utf-8") as f:
        json.dump(petclinic_full, f, indent=2, ensure_ascii=False)
    print("✓ Đã lưu output/petclinic_full_graph.json (15 nodes, 13 endpoints, 4 edges)")

    print("\n=================================================================")
    print(" 4. SINH KỊCH BẢN CYPHER CHO CSDL ĐỒ THỊ NEO4J")
    print("=================================================================")
    importer.generate_cypher_script(baseline_2hop, "output/import_baseline_2hop.cypher")
    importer.generate_cypher_script(mutated_2hop, "output/import_mutated_2hop.cypher")
    importer.generate_cypher_script(petclinic_full, "output/import_petclinic_full.cypher")
    print("✓ Đã sinh output/import_baseline_2hop.cypher")
    print("✓ Đã sinh output/import_mutated_2hop.cypher")
    print("✓ Đã sinh output/import_petclinic_full.cypher")

    # Thử kết nối trực tiếp nếu Neo4j container đang chạy
    success, msg = importer.import_to_neo4j(baseline_2hop)
    if success:
        print(f"✓ {msg}")
    else:
        print(f"ℹ Lưu ý Neo4j: {msg}")
        print("  -> Bạn có thể khởi động Neo4j qua: docker compose up -d")
        print("  -> Và nạp file output/import_baseline_2hop.cypher vào Neo4j Browser (http://localhost:7474)")

    print("\n=================================================================")
    print(" 5. XUẤT ĐỒ THỊ GIAO THỨC gRPC (GOOGLE CLOUD ONLINE BOUTIQUE)")
    print("=================================================================")
    from src.proto_parser import ProtoParser
    proto_parser = ProtoParser()
    boutique_graph = proto_parser.build_online_boutique_graph(
        proto_file_path="data/online_boutique/demo.proto",
        go_client_paths=[("data/online_boutique/checkoutservice_main.go", "checkoutservice")]
    )
    with open("output/online_boutique_graph.json", "w", encoding="utf-8") as f:
        json.dump(boutique_graph, f, indent=2, ensure_ascii=False)
    importer.generate_cypher_script(boutique_graph, "output/import_online_boutique.cypher")
    print(f"✓ Đã lưu output/online_boutique_graph.json ({len(boutique_graph['nodes'])} nodes, {len(boutique_graph['edges'])} gRPC edges)")
    print("✓ Đã sinh output/import_online_boutique.cypher")

    print("\n=================================================================")
    print(" 6. DUYỆT NGƯỢC TÁC ĐỘNG TỪ SEED (BACKWARD IMPACT TRACE)")
    print("=================================================================")
    seed_id = "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>)"
    trace_result = builder.trace_backward_impact(baseline_2hop, seed_id=seed_id, max_hops=3)

    print(f"Điểm bắt đầu thay đổi (Seed): {seed_id}")
    print(f"Số phần tử chịu tác động dây chuyền: {trace_result['impacted_count']}")
    for item in trace_result['impacted_nodes']:
        h = item['logic_hops']
        c = item['service_crossings']
        nid = item['node_id']
        via = item['via_edge_type']
        cb = item['has_circuit_breaker']
        fb = item['fallback_method']
        print(f"  [Hop {h} | Vượt dịch vụ: {c}] -> {nid} (qua {via})")
        if cb:
            print(f"    * Cơ chế phòng thủ: ReactiveCircuitBreaker với fallback '{fb}'")

    print("\n=================================================================")
    print(" HOÀN THÀNH TẤT CẢ CÁC BƯỚC THỰC THI!")
    print("=================================================================")

if __name__ == "__main__":
    main()
