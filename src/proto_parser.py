"""
gRPC & Protocol Buffers Parser for Google Cloud Online Boutique
Extracts gRPC service contracts from .proto files and matches gRPC client invocations
from multi-language microservices to build deterministic cross-service gRPC Call Graphs.
"""

from __future__ import annotations
import os
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any


@dataclass
class RpcMethod:
    name: str
    service_name: str
    request_type: str
    response_type: str
    line_number: int


@dataclass
class GrpcService:
    name: str
    file: str
    methods: Dict[str, RpcMethod] = field(default_factory=dict)


@dataclass
class GrpcClientCall:
    caller_service: str
    caller_func: str
    target_service: str
    target_method: str
    file: str
    line_number: int
    raw_expression: str


class ProtoParser:
    """
    Parses Protocol Buffers (.proto) definitions to extract gRPC service declarations and RPC methods.
    """
    def parse_proto(self, proto_file_path: str) -> Dict[str, GrpcService]:
        with open(proto_file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        services: Dict[str, GrpcService] = {}
        current_service: Optional[GrpcService] = None

        service_regex = re.compile(r'^\s*service\s+([A-Za-z0-9_]+)\s*\{')
        rpc_regex = re.compile(r'^\s*rpc\s+([A-Za-z0-9_]+)\s*\(\s*([A-Za-z0-9_\.]+)\s*\)\s*returns\s*\(\s*([A-Za-z0-9_\.]+)\s*\)')

        for line_no, line in enumerate(lines, 1):
            s_match = service_regex.search(line)
            if s_match:
                s_name = s_match.group(1)
                current_service = GrpcService(name=s_name, file=proto_file_path.replace('\\', '/'))
                services[s_name] = current_service
                continue

            if current_service:
                if '}' in line and not line.strip().startswith('//'):
                    if line.strip() == '}':
                        current_service = None
                        continue

                r_match = rpc_regex.search(line)
                if r_match:
                    rpc_name = r_match.group(1)
                    req_type = r_match.group(2)
                    resp_type = r_match.group(3)
                    current_service.methods[rpc_name] = RpcMethod(
                        name=rpc_name,
                        service_name=current_service.name,
                        request_type=req_type,
                        response_type=resp_type,
                        line_number=line_no
                    )

        return services

    def extract_go_grpc_calls(self, go_file_path: str, caller_service: str = "checkoutservice") -> List[GrpcClientCall]:
        """
        Parses Go source code to extract calls of form:
        pb.New<Service>Client(...).<Method>(...)
        """
        with open(go_file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        calls: List[GrpcClientCall] = []
        call_regex = re.compile(r'pb\.New([A-Za-z0-9_]+Client)\s*\([^)]*\)\.([A-Za-z0-9_]+)\s*\(')

        current_func = "main"
        func_regex = re.compile(r'^func\s+(?:\([^)]+\)\s+)?([A-Za-z0-9_]+)\s*\(')

        for line_no, line in enumerate(lines, 1):
            f_match = func_regex.search(line)
            if f_match:
                current_func = f_match.group(1)

            c_match = call_regex.search(line)
            if c_match:
                client_type = c_match.group(1)
                method_name = c_match.group(2)

                # e.g. ShippingServiceClient -> ShippingService -> shippingservice
                target_service = client_type.replace('Client', '')
                normalized_target_service = target_service.lower()

                calls.append(GrpcClientCall(
                    caller_service=caller_service,
                    caller_func=current_func,
                    target_service=normalized_target_service,
                    target_method=method_name,
                    file=go_file_path.replace('\\', '/'),
                    line_number=line_no,
                    raw_expression=line.strip()
                ))

        return calls

    def build_online_boutique_graph(
        self, proto_file_path: str, go_client_paths: List[Tuple[str, str]]
    ) -> Dict[str, Any]:
        """
        Builds a unified dependency graph linking gRPC client callers to provider RPC endpoints.
        """
        proto_services = self.parse_proto(proto_file_path)

        all_calls: List[GrpcClientCall] = []
        for path, svc_name in go_client_paths:
            calls = self.extract_go_grpc_calls(path, caller_service=svc_name)
            all_calls.extend(calls)

        nodes = []
        seen_node_ids = set()

        # Add provider RPC methods as nodes
        for s_name, service in proto_services.items():
            svc_id_name = s_name.lower()
            for m_name, method in service.methods.items():
                node_id = f"{svc_id_name}::{s_name}#{m_name}({method.request_type})"
                seen_node_ids.add(node_id)
                nodes.append({
                    "id": node_id,
                    "service": svc_id_name,
                    "class_fqn": f"hipstershop.{s_name}",
                    "method_name": m_name,
                    "parameter_types": [method.request_type],
                    "return_type": method.response_type,
                    "file": service.file,
                    "line_start": method.line_number,
                    "line_end": method.line_number,
                    "node_type": "GRPC_SERVICE_METHOD"
                })

        # Add client caller functions as nodes
        for call in all_calls:
            caller_id = f"{call.caller_service}::main.{call.caller_func}()"
            if caller_id not in seen_node_ids:
                seen_node_ids.add(caller_id)
                nodes.append({
                    "id": caller_id,
                    "service": call.caller_service,
                    "class_fqn": f"{call.caller_service}.main",
                    "method_name": call.caller_func,
                    "parameter_types": [],
                    "file": call.file,
                    "line_start": call.line_number,
                    "line_end": call.line_number,
                    "node_type": "GO_FUNCTION"
                })

        edges = []
        for call in all_calls:
            caller_id = f"{call.caller_service}::main.{call.caller_func}()"
            # Match target proto method
            target_node_id = None
            for s_name, service in proto_services.items():
                if s_name.lower() == call.target_service or s_name.lower().startswith(call.target_service):
                    if call.target_method in service.methods:
                        method = service.methods[call.target_method]
                        target_node_id = f"{s_name.lower()}::{s_name}#{call.target_method}({method.request_type})"
                        break

            if target_node_id:
                edges.append({
                    "source_id": caller_id,
                    "target_id": target_node_id,
                    "type": "INVOKES_GRPC",
                    "protocol": "gRPC",
                    "target_service": call.target_service,
                    "target_method": call.target_method,
                    "cross_service": True,
                    "resolution_status": "RESOLVED",
                    "evidence": [
                        {
                            "file": call.file,
                            "line_start": call.line_number,
                            "line_end": call.line_number,
                            "evidence_type": "GRPC_CLIENT_INVOCATION",
                            "expression": call.raw_expression
                        }
                    ]
                })

        return {
            "metadata": {
                "schema_version": "0.3.0",
                "repository": "https://github.com/GoogleCloudPlatform/microservices-demo",
                "system": "Google Cloud Online Boutique",
                "communication_protocol": "gRPC / Protobuf"
            },
            "nodes": nodes,
            "edges": edges
        }
