"""
Microservice Impact Benchmark Evaluation Runner
Evaluates Code GraphRAG vs Vector RAG Baseline on standardized mutation benchmark scenarios.
Computes Precision, Recall, F1-Score, and Hit Rate at 1-hop and 2-hop depths.
"""

from __future__ import annotations
import json
import os
import time
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple, Any

from src.parser import DependencyGraphBuilder
from src.chroma_baseline import ChromaBaselineStore
from src.proto_parser import ProtoParser


@dataclass
class BenchmarkScenario:
    id: str
    name: str
    system: str  # Spring PetClinic or Google Cloud Online Boutique
    protocol: str  # REST or gRPC
    split: str  # dev or test
    seed_node: str
    query_description: str
    ground_truth_hop1: List[str]
    ground_truth_hop2: List[str]

    @property
    def full_ground_truth(self) -> List[str]:
        return self.ground_truth_hop1 + self.ground_truth_hop2


class BenchmarkRunner:
    def __init__(self, chroma_store: Optional[ChromaBaselineStore] = None):
        self.chroma_store = chroma_store or ChromaBaselineStore(
            collection_name="petclinic_benchmark",
            persist_directory="./chroma_db"
        )
        self.graph_builder = DependencyGraphBuilder()

    def get_standard_scenarios(self) -> List[BenchmarkScenario]:
        return [
            BenchmarkScenario(
                id="P01_VISIT_QUERY_PARAM",
                name="Thêm tham số bắt buộc includeDetails vào GET /pets/visits",
                system="Spring PetClinic",
                protocol="REST",
                split="dev",
                seed_node="visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>)",
                query_description="Modified VisitResource read GET /pets/visits adding required query parameter includeDetails",
                ground_truth_hop1=[
                    "api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#getVisitsForPets(List<Integer>)"
                ],
                ground_truth_hop2=[
                    "api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#getOwnerDetails(int)"
                ]
            ),
            BenchmarkScenario(
                id="P02_OWNER_LOOKUP_CHANGE",
                name="Thay đổi kiểu dữ liệu trả về của handler GET /owners/{ownerId}",
                system="Spring PetClinic",
                protocol="REST",
                split="test",
                seed_node="customers-service::org.springframework.samples.petclinic.customers.web.OwnerResource#findOwner(int)",
                query_description="Changed OwnerResource findOwner return type or path for GET /owners/{ownerId}",
                ground_truth_hop1=[
                    "api-gateway::org.springframework.samples.petclinic.api.application.CustomersServiceClient#getOwner(int)"
                ],
                ground_truth_hop2=[
                    "api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#getOwnerDetails(int)"
                ]
            ),
            BenchmarkScenario(
                id="P03_CART_SERVICE_SCHEMA",
                name="Đổi cấu trúc message GetCartRequest trong gRPC CartService",
                system="Google Cloud Online Boutique",
                protocol="gRPC",
                split="dev",
                seed_node="cartservice::CartService#GetCart(GetCartRequest)",
                query_description="Modified CartService GetCart gRPC method signature or protobuf request message",
                ground_truth_hop1=[
                    "checkoutservice::main.getUserCart()"
                ],
                ground_truth_hop2=[]
            ),
            BenchmarkScenario(
                id="P04_PAYMENT_CHARGE_METHOD",
                name="Thêm trường xác thực thẻ vào ChargeRequest của PaymentService",
                system="Google Cloud Online Boutique",
                protocol="gRPC",
                split="test",
                seed_node="paymentservice::PaymentService#Charge(ChargeRequest)",
                query_description="Added mandatory CVV or auth token to PaymentService Charge RPC method",
                ground_truth_hop1=[
                    "checkoutservice::main.chargeCard()"
                ],
                ground_truth_hop2=[]
            )
        ]

    def _calc_metrics(self, detected: List[str], ground_truth: List[str]) -> Dict[str, Any]:
        hits = [nid for nid in ground_truth if nid in detected]
        recall = len(hits) / len(ground_truth) if ground_truth else 1.0
        precision = len(hits) / len(detected) if detected else (1.0 if not ground_truth else 0.0)
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        return {
            "hits": hits,
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4)
        }

    def evaluate_scenario(
        self, scenario: BenchmarkScenario, full_graph: Dict[str, Any], top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Runs both GraphRAG backward traversal and Vector RAG retrieval on a scenario.
        """
        # 1. GraphRAG Traversal
        t0 = time.perf_counter()
        graph_trace = self.graph_builder.trace_backward_impact(full_graph, seed_id=scenario.seed_node, max_hops=3)
        graph_detected = [item["node_id"] for item in graph_trace["impacted_nodes"]]
        graph_latency_ms = (time.perf_counter() - t0) * 1000

        gt = scenario.full_ground_truth
        graph_overall = self._calc_metrics(graph_detected, gt)
        graph_hop1 = self._calc_metrics(graph_detected, scenario.ground_truth_hop1)
        graph_hop2 = self._calc_metrics(graph_detected, scenario.ground_truth_hop2)

        # 2. Vector RAG Retrieval
        t0 = time.perf_counter()
        vector_res = self.chroma_store.query_impact(scenario.query_description, n_results=top_k + 1)
        # Exclude seed node (CRITICAL FIX)
        vector_detected = [c["chunk_id"] for c in vector_res if c["chunk_id"] != scenario.seed_node][:top_k]
        vector_latency_ms = (time.perf_counter() - t0) * 1000

        vector_overall = self._calc_metrics(vector_detected, gt)
        vector_hop1 = self._calc_metrics(vector_detected, scenario.ground_truth_hop1)
        vector_hop2 = self._calc_metrics(vector_detected, scenario.ground_truth_hop2)

        return {
            "scenario_id": scenario.id,
            "scenario_name": scenario.name,
            "system": scenario.system,
            "protocol": scenario.protocol,
            "split": scenario.split,
            "ground_truth_total": len(gt),
            "graph_rag": {
                "detected_count": len(graph_detected),
                "latency_ms": round(graph_latency_ms, 2),
                "overall": graph_overall,
                "hop1": graph_hop1,
                "hop2": graph_hop2
            },
            "vector_rag": {
                "top_k": top_k,
                "detected_count": len(vector_detected),
                "latency_ms": round(vector_latency_ms, 2),
                "overall": vector_overall,
                "hop1": vector_hop1,
                "hop2": vector_hop2,
                "top_candidate": vector_detected[0] if vector_detected else None
            }
        }

    def run_all(self, output_path: str = "output/full_benchmark_results.json") -> Dict[str, Any]:
        scenarios = self.get_standard_scenarios()

        # Build full PetClinic graph
        files_petclinic = [
            "data/baseline/VisitResource.java",
            "data/baseline/VisitsServiceClient.java",
            "data/baseline/ApiGatewayController.java",
            "data/baseline/CustomersServiceClient.java",
            "data/baseline/OwnerResource.java",
            "data/baseline/PetResource.java",
            "data/baseline/VetResource.java"
        ]
        petclinic_graph = self.graph_builder.build_multi_file_graph(files_petclinic)
        
        # Build Online Boutique graph (gRPC FIX)
        proto_parser = ProtoParser()
        online_boutique_graph = proto_parser.build_online_boutique_graph(
            "data/online_boutique/demo.proto", 
            [("data/online_boutique/checkoutservice_main.go", "checkoutservice")]
        )

        # Index all benchmark files into ChromaDB
        all_files = files_petclinic + [
            "data/online_boutique/demo.proto",
            "data/online_boutique/checkoutservice_main.go"
        ]
        self.chroma_store.index_files(all_files)

        results = []
        for sc in scenarios:
            if sc.system == "Spring PetClinic":
                res = self.evaluate_scenario(sc, petclinic_graph, top_k=5)
                results.append(res)
            elif sc.system == "Google Cloud Online Boutique":
                res = self.evaluate_scenario(sc, online_boutique_graph, top_k=5)
                results.append(res)

        # Average metrics
        avg_graph_f1 = sum(r["graph_rag"]["overall"]["f1_score"] for r in results) / len(results) if results else 0.0
        avg_vector_f1 = sum(r["vector_rag"]["overall"]["f1_score"] for r in results) / len(results) if results else 0.0

        summary = {
            "total_evaluated_scenarios": len(results),
            "graph_rag_average_f1": round(avg_graph_f1, 4),
            "vector_rag_average_f1": round(avg_vector_f1, 4),
            "scenarios_evaluation": results
        }

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)

        return summary
