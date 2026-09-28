"""
Neo4j Graph Importer for Code GraphRAG
Converts JSON dependency graphs into Cypher commands and directly executes them on Neo4j if available.
Supports:
- Schema constraints (Service, Class, Method, Endpoint)
- Hierarchical structure (Service -> Class -> Method -> Endpoint)
- Dependency edges (INVOKES_API with contract metadata, CALLS with circuit breaker metadata)
"""

from __future__ import annotations
import json
import os
from typing import Dict, Any, List, Optional

try:
    from neo4j import GraphDatabase, Driver
except ImportError:
    GraphDatabase = None
    Driver = None


class Neo4jGraphImporter:
    def __init__(self, uri: str = "bolt://localhost:7687", auth: tuple = ("neo4j", "graphrag2026")):
        self.uri = uri
        self.auth = auth

    def generate_cypher_script(self, graph_data: Dict[str, Any], output_cypher_file: str) -> str:
        """
        Tạo file kịch bản Cypher (.cypher) độc lập, có thể thực thi trực tiếp qua Neo4j Browser hoặc cypher-shell.
        """
        lines = [
            "// ============================================================================",
            f"// Code GraphRAG Cypher Import Script",
            f"// Snapshot: {graph_data.get('metadata', {}).get('snapshot_kind')} | Commit: {graph_data.get('metadata', {}).get('commit_sha')}",
            "// ============================================================================\n",
            "// 1. Schema Constraints",
            "CREATE CONSTRAINT service_name_unique IF NOT EXISTS FOR (s:Service) REQUIRE s.name IS UNIQUE;",
            "CREATE CONSTRAINT class_fqn_unique IF NOT EXISTS FOR (c:Class) REQUIRE c.fqn IS UNIQUE;",
            "CREATE CONSTRAINT method_id_unique IF NOT EXISTS FOR (m:Method) REQUIRE m.id IS UNIQUE;",
            "CREATE CONSTRAINT endpoint_id_unique IF NOT EXISTS FOR (e:Endpoint) REQUIRE e.handler_id IS UNIQUE;\n",
            "// 2. Clear previous snapshot nodes if needed (Optional: comment out if appending)",
            "// MATCH (n) DETACH DELETE n;\n",
            "// 3. Import Nodes (Service, Class, Method)"
        ]

        # Extract unique services, classes, and methods
        services = set()
        classes = {}
        methods = []

        for node in graph_data.get("nodes", []):
            s_name = node["service"]
            c_fqn = node["class_fqn"]
            m_id = node["id"]

            services.add(s_name)
            classes[c_fqn] = {
                "fqn": c_fqn,
                "name": c_fqn.split(".")[-1],
                "service": s_name,
                "file": node.get("file", "")
            }
            methods.append(node)

        # Merge services
        for s in sorted(services):
            lines.append(f'MERGE (s:Service {{name: "{s}"}});')

        # Merge classes and link to service
        lines.append("\n// Link Classes to Services")
        for c_fqn, c_info in sorted(classes.items()):
            lines.append(
                f'MERGE (c:Class {{fqn: "{c_fqn}"}}) '
                f'ON CREATE SET c.name = "{c_info["name"]}", c.file = "{c_info["file"]}";'
            )
            lines.append(
                f'MATCH (s:Service {{name: "{c_info["service"]}"}}), (c:Class {{fqn: "{c_fqn}"}}) '
                f'MERGE (s)-[:CONTAINS]->(c);'
            )

        # Merge methods and link to class
        lines.append("\n// Link Methods to Classes")
        for m in methods:
            params_str = json.dumps(m.get("parameter_types", []))
            lines.append(
                f'MERGE (m:Method {{id: "{m["id"]}"}}) '
                f'ON CREATE SET m.name = "{m["method_name"]}", '
                f'm.parameter_types = {params_str}, '
                f'm.file = "{m.get("file", "")}", '
                f'm.line_start = {m.get("line_start", 0)}, '
                f'm.line_end = {m.get("line_end", 0)};'
            )
            lines.append(
                f'MATCH (c:Class {{fqn: "{m["class_fqn"]}"}}), (m:Method {{id: "{m["id"]}"}}) '
                f'MERGE (c)-[:CONTAINS]->(m);'
            )

        # Merge endpoints and link to method
        lines.append("\n// 4. Import Endpoints and Link (Method)-[:EXPOSES]->(Endpoint)")
        for ep in graph_data.get("endpoints", []):
            qp_json = json.dumps(ep.get("query_parameters", []))
            lines.append(
                f'MERGE (e:Endpoint {{handler_id: "{ep["handler_id"]}"}}) '
                f'ON CREATE SET e.http_method = "{ep["http_method"]}", '
                f'e.normalized_path = "{ep["normalized_path"]}", '
                f'e.query_parameters = {json.dumps(qp_json)};'
            )
            lines.append(
                f'MATCH (m:Method {{id: "{ep["handler_id"]}"}}), (e:Endpoint {{handler_id: "{ep["handler_id"]}"}}) '
                f'MERGE (m)-[:EXPOSES]->(e);'
            )

        # Merge edges
        lines.append("\n// 5. Import Dependency Edges")
        for edge in graph_data.get("edges", []):
            src_id = edge["source_id"]
            tgt_id = edge["target_id"]
            edge_type = edge["type"]

            if edge_type == "INVOKES_API":
                sent_qp = json.dumps(edge.get("sent_query_parameters", []))
                missing_qp = json.dumps(edge.get("missing_required_parameters", []))
                lines.append(
                    f'MATCH (src:Method {{id: "{src_id}"}}), (tgt:Method {{id: "{tgt_id}"}}) '
                    f'MERGE (src)-[r:INVOKES_API {{'
                    f'target_service: "{edge.get("target_service", "")}", '
                    f'http_method: "{edge.get("http_method", "")}", '
                    f'normalized_path: "{edge.get("normalized_path", "")}", '
                    f'sent_query_parameters: {sent_qp}, '
                    f'resolution_status: "{edge.get("resolution_status", "")}", '
                    f'contract_status: "{edge.get("contract_status", "")}", '
                    f'missing_required_parameters: {missing_qp}'
                    f'}}]->(tgt);'
                )
            elif edge_type == "CALLS":
                has_cb = str(edge.get("has_circuit_breaker", False)).lower()
                fb = edge.get("fallback_method") or ""
                lines.append(
                    f'MATCH (src:Method {{id: "{src_id}"}}), (tgt:Method {{id: "{tgt_id}"}}) '
                    f'MERGE (src)-[r:CALLS {{'
                    f'has_circuit_breaker: {has_cb}, '
                    f'fallback_method: "{fb}", '
                    f'resolution_status: "{edge.get("resolution_status", "")}"'
                    f'}}]->(tgt);'
                )
            elif edge_type == "INVOKES_GRPC":
                lines.append(
                    f'MATCH (src:Method {{id: "{src_id}"}}), (tgt:Method {{id: "{tgt_id}"}}) '
                    f'MERGE (src)-[r:INVOKES_GRPC {{'
                    f'protocol: "gRPC", '
                    f'target_service: "{edge.get("target_service", "")}", '
                    f'target_method: "{edge.get("target_method", "")}", '
                    f'resolution_status: "{edge.get("resolution_status", "")}"'
                    f'}}]->(tgt);'
                )

        content = "\n".join(lines) + "\n"
        os.makedirs(os.path.dirname(output_cypher_file) or ".", exist_ok=True)
        with open(output_cypher_file, "w", encoding="utf-8") as f:
            f.write(content)

        return content

    def import_to_neo4j(self, graph_data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Thực thi trực tiếp vào CSDL Neo4j qua Bolt connection nếu Neo4j đang chạy.
        """
        if GraphDatabase is None:
            return False, "Thư viện neo4j chưa được cài đặt (pip install neo4j)."

        try:
            with GraphDatabase.driver(self.uri, auth=self.auth) as driver:
                with driver.session() as session:
                    # Create constraints
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (s:Service) REQUIRE s.name IS UNIQUE")
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (c:Class) REQUIRE c.fqn IS UNIQUE")
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (m:Method) REQUIRE m.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (e:Endpoint) REQUIRE e.handler_id IS UNIQUE")

                    # Load nodes
                    for node in graph_data.get("nodes", []):
                        session.run("""
                            MERGE (s:Service {name: $service})
                            MERGE (c:Class {fqn: $class_fqn})
                            ON CREATE SET c.file = $file
                            MERGE (s)-[:CONTAINS]->(c)
                            MERGE (m:Method {id: $id})
                            ON CREATE SET m.name = $method_name, m.parameter_types = $parameter_types,
                                          m.file = $file, m.line_start = $line_start, m.line_end = $line_end
                            MERGE (c)-[:CONTAINS]->(m)
                        """, **node)

                    # Load endpoints
                    for ep in graph_data.get("endpoints", []):
                        session.run("""
                            MATCH (m:Method {id: $handler_id})
                            MERGE (e:Endpoint {handler_id: $handler_id})
                            ON CREATE SET e.http_method = $http_method, e.normalized_path = $normalized_path
                            MERGE (m)-[:EXPOSES]->(e)
                        """, handler_id=ep["handler_id"], http_method=ep["http_method"], normalized_path=ep["normalized_path"])

                    # Load edges
                    for edge in graph_data.get("edges", []):
                        if edge["type"] == "INVOKES_API":
                            session.run("""
                                MATCH (src:Method {id: $src}), (tgt:Method {id: $tgt})
                                MERGE (src)-[r:INVOKES_API {
                                    target_service: $svc, http_method: $method, normalized_path: $path,
                                    contract_status: $contract, resolution_status: $res
                                }]->(tgt)
                            """, src=edge["source_id"], tgt=edge["target_id"], svc=edge.get("target_service"),
                                 method=edge.get("http_method"), path=edge.get("normalized_path"),
                                 contract=edge.get("contract_status"), res=edge.get("resolution_status"))
                        elif edge["type"] == "CALLS":
                            session.run("""
                                MATCH (src:Method {id: $src}), (tgt:Method {id: $tgt})
                                MERGE (src)-[r:CALLS {
                                    has_circuit_breaker: $has_cb, fallback_method: $fb,
                                    resolution_status: $res
                                }]->(tgt)
                            """, src=edge["source_id"], tgt=edge["target_id"],
                                 has_cb=edge.get("has_circuit_breaker", False),
                                 fb=edge.get("fallback_method", ""), res=edge.get("resolution_status"))

            return True, "Nạp dữ liệu vào Neo4j thành công!"
        except Exception as ex:
            return False, f"Không thể kết nối tới Neo4j tại {self.uri}: {str(ex)}"
