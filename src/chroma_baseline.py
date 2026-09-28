"""
ChromaDB Vector RAG Baseline for Code GraphRAG
Implements semantic AST-based chunking for Java source files (Method & Class level)
and indexes code chunks into ChromaDB to serve as the baseline comparison system
against GraphRAG multi-hop dependency traversal.
"""

from __future__ import annotations
import os
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any

import tree_sitter_java as tsjava
import tree_sitter_go as tsgo
from tree_sitter import Language, Parser, Node

from src.parser import infer_service_name, map_to_repo_relative_path

JAVA_LANGUAGE = Language(tsjava.language())
GO_LANGUAGE = Language(tsgo.language())


@dataclass
class CodeChunk:
    chunk_id: str
    content: str
    service: str
    file: str
    class_fqn: str
    chunk_type: str  # METHOD, CLASS_HEADER, RECORD, GO_FUNCTION, GRPC_METHOD
    method_name: Optional[str]
    line_start: int
    line_end: int
    is_endpoint: bool = False
    http_method: Optional[str] = None
    endpoint_path: Optional[str] = None

    def to_metadata(self) -> Dict[str, Any]:
        """ChromaDB requires flat metadata with string, int, float, or bool values."""
        return {
            "chunk_id": self.chunk_id,
            "service": self.service,
            "file": self.file.replace('\\', '/'),
            "class_fqn": self.class_fqn,
            "chunk_type": self.chunk_type,
            "method_name": self.method_name or "",
            "line_start": self.line_start,
            "line_end": self.line_end,
            "is_endpoint": self.is_endpoint,
            "http_method": self.http_method or "",
            "endpoint_path": self.endpoint_path or ""
        }


class ASTCodeChunker:
    """
    Slices Java, Go, and Proto code into fair, semantically complete chunks using Tree-sitter AST.
    Avoids arbitrary character splitting or token cutting that breaks syntax.
    """
    def __init__(self):
        self.java_parser = Parser(JAVA_LANGUAGE)
        self.go_parser = Parser(GO_LANGUAGE)
        self.parser = self.java_parser

    def chunk_file(self, file_path: str, source_code: Optional[str] = None) -> List[CodeChunk]:
        norm_path = file_path.replace('\\', '/')
        if norm_path.endswith('.go'):
            return self._chunk_go_file(norm_path, source_code)
        elif norm_path.endswith('.proto'):
            return self._chunk_proto_file(norm_path, source_code)
        return self._chunk_java_file(norm_path, source_code)

    def _chunk_go_file(self, file_path: str, source_code: Optional[str] = None) -> List[CodeChunk]:
        if source_code is None:
            with open(file_path, "r", encoding="utf-8") as f:
                source_code = f.read()

        source_bytes = source_code.encode("utf-8")
        tree = self.go_parser.parse(source_bytes)
        root = tree.root_node

        norm_path = file_path.replace('\\', '/')
        svc_name = "checkoutservice" if "checkoutservice" in norm_path else "online_boutique"
        chunks: List[CodeChunk] = []

        def visit(node: Node):
            if node.type in ("function_declaration", "method_declaration"):
                name_node = node.child_by_field_name("name")
                if name_node:
                    fn_name = name_node.text.decode("utf-8", errors="replace")
                    chunk_id = f"{svc_name}::main.{fn_name}()"
                    chunk_text = source_bytes[node.start_byte:node.end_byte].decode("utf-8", errors="replace").strip()
                    chunks.append(CodeChunk(
                        chunk_id=chunk_id,
                        content=chunk_text,
                        service=svc_name,
                        file=norm_path,
                        class_fqn=f"{svc_name}.main",
                        chunk_type="GO_FUNCTION",
                        method_name=fn_name,
                        line_start=node.start_point[0] + 1,
                        line_end=node.end_point[0] + 1
                    ))
            for child in node.named_children:
                visit(child)

        visit(root)
        return chunks

    def _chunk_proto_file(self, file_path: str, source_code: Optional[str] = None) -> List[CodeChunk]:
        from src.proto_parser import ProtoParser
        parser = ProtoParser()
        services = parser.parse_proto(file_path)
        norm_path = file_path.replace('\\', '/')

        chunks: List[CodeChunk] = []
        for s_name, svc in services.items():
            svc_id_name = s_name.lower()
            for m_name, method in svc.methods.items():
                chunk_id = f"{svc_id_name}::{s_name}#{m_name}({method.request_type})"
                content = f"service {s_name} {{\n  rpc {m_name}({method.request_type}) returns ({method.response_type});\n}}"
                chunks.append(CodeChunk(
                    chunk_id=chunk_id,
                    content=content,
                    service=svc_id_name,
                    file=norm_path,
                    class_fqn=f"hipstershop.{s_name}",
                    chunk_type="GRPC_METHOD",
                    method_name=m_name,
                    line_start=method.line_number,
                    line_end=method.line_number
                ))
        return chunks

    def _chunk_java_file(self, file_path: str, source_code: Optional[str] = None) -> List[CodeChunk]:
        if source_code is None:
            with open(file_path, "r", encoding="utf-8") as f:
                source_code = f.read()

        source_bytes = source_code.encode("utf-8")
        tree = self.java_parser.parse(source_bytes)
        root = tree.root_node

        package_name = self._extract_package(root, source_bytes)
        service_name = infer_service_name(file_path, package_name)

        chunks: List[CodeChunk] = []

        # Process each class
        for class_node in self._find_nodes(root, ["class_declaration"]):
            class_name = self._get_node_name(class_node, source_bytes)
            class_fqn = f"{package_name}.{class_name}" if package_name else class_name
            repo_file_path = map_to_repo_relative_path(file_path, class_fqn)

            # 1. Class Header Chunk (Annotations, Class declaration, fields)
            class_body = class_node.child_by_field_name("body")
            if class_body:
                # Find the first method or constructor to delimit the header
                first_member = None
                for c in class_body.children:
                    if c.type in ("method_declaration", "constructor_declaration"):
                        first_member = c
                        break

                header_end_byte = first_member.start_byte if first_member else class_body.end_byte
                header_text = source_bytes[class_node.start_byte:header_end_byte].decode("utf-8", errors="ignore").strip()
                chunks.append(CodeChunk(
                    chunk_id=f"{service_name}::{class_fqn}#HEADER",
                    content=header_text,
                    service=service_name,
                    file=repo_file_path,
                    class_fqn=class_fqn,
                    chunk_type="CLASS_HEADER",
                    method_name=None,
                    line_start=class_node.start_point[0] + 1,
                    line_end=(first_member.start_point[0] if first_member else class_node.end_point[0] + 1)
                ))

                # 2. Method-level Chunks
                for method_node in [c for c in class_body.children if c.type == "method_declaration"]:
                    m_name = self._get_node_name(method_node, source_bytes)
                    param_types = self._extract_param_types(method_node, source_bytes)
                    param_sig = ",".join(param_types)
                    chunk_id = f"{service_name}::{class_fqn}#{m_name}({param_sig})"

                    # Check if this method has Spring HTTP mapping annotations
                    is_endpoint, http_method, endpoint_path = self._detect_endpoint_info(method_node, source_bytes)

                    method_text = source_bytes[method_node.start_byte:method_node.end_byte].decode("utf-8", errors="ignore").strip()

                    chunks.append(CodeChunk(
                        chunk_id=chunk_id,
                        content=method_text,
                        service=service_name,
                        file=repo_file_path,
                        class_fqn=class_fqn,
                        chunk_type="METHOD",
                        method_name=m_name,
                        line_start=method_node.start_point[0] + 1,
                        line_end=method_node.end_point[0] + 1,
                        is_endpoint=is_endpoint,
                        http_method=http_method,
                        endpoint_path=endpoint_path
                    ))

            # 3. Records / Inner Classes (e.g. record Visits(List<Visit> items))
            for rec_node in self._find_nodes(class_node, ["record_declaration"]):
                rec_name = self._get_node_name(rec_node, source_bytes)
                rec_text = source_bytes[rec_node.start_byte:rec_node.end_byte].decode("utf-8", errors="ignore").strip()
                chunks.append(CodeChunk(
                    chunk_id=f"{service_name}::{class_fqn}${rec_name}",
                    content=rec_text,
                    service=service_name,
                    file=repo_file_path,
                    class_fqn=class_fqn,
                    chunk_type="RECORD",
                    method_name=None,
                    line_start=rec_node.start_point[0] + 1,
                    line_end=rec_node.end_point[0] + 1
                ))

        return chunks

    def _extract_package(self, root: Node, source: bytes) -> str:
        for node in root.children:
            if node.type == "package_declaration":
                for child in node.children:
                    if child.type in ("scoped_identifier", "identifier"):
                        return source[child.start_byte:child.end_byte].decode("utf-8", errors="ignore")
        return ""

    def _get_node_name(self, node: Node, source: bytes) -> str:
        name_node = node.child_by_field_name("name")
        if name_node:
            return source[name_node.start_byte:name_node.end_byte].decode("utf-8", errors="ignore")
        return ""

    def _find_nodes(self, node: Node, types: List[str]) -> List[Node]:
        res = []
        if node.type in types:
            res.append(node)
        for child in node.children:
            res.extend(self._find_nodes(child, types))
        return res

    def _extract_param_types(self, method_node: Node, source: bytes) -> List[str]:
        params_node = method_node.child_by_field_name("parameters")
        if not params_node:
            return []
        types = []
        for p in params_node.named_children:
            if p.type in ("formal_parameter", "spread_parameter"):
                t = p.child_by_field_name("type")
                types.append(source[t.start_byte:t.end_byte].decode("utf-8", errors="ignore") if t else "Object")
        return types

    def _detect_endpoint_info(self, method_node: Node, source: bytes) -> Tuple[bool, Optional[str], Optional[str]]:
        method_text = source[method_node.start_byte:method_node.end_byte].decode("utf-8", errors="ignore")
        for m in ("@GetMapping", "@PostMapping", "@PutMapping", "@DeleteMapping", "@RequestMapping"):
            if m in method_text:
                http_method = "GET" if "@GetMapping" in method_text else ("POST" if "@PostMapping" in method_text else "HTTP")
                path_match = re.search(r'@(?:GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping)\s*\(\s*(?:value\s*=\s*)?"([^"]+)"', method_text)
                path = path_match.group(1) if path_match else None
                return True, http_method, path
        return False, None, None


class ChromaBaselineStore:
    """
    Manages vector storage and retrieval in ChromaDB.
    """
    def __init__(self, collection_name: str = "petclinic_baseline", persist_directory: str = "./chroma_db"):
        import chromadb
        from chromadb.config import Settings

        self.persist_directory = persist_directory
        os.makedirs(persist_directory, exist_ok=True)
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"description": "Code GraphRAG Baseline Vector Store"}
        )
        self.chunker = ASTCodeChunker()

    def index_files(self, file_paths: List[str]) -> int:
        all_chunks: List[CodeChunk] = []
        for fp in file_paths:
            chunks = self.chunker.chunk_file(fp)
            all_chunks.extend(chunks)

        if not all_chunks:
            return 0

        ids = [c.chunk_id for c in all_chunks]
        documents = [f"// File: {c.file} | Service: {c.service}\n{c.content}" for c in all_chunks]
        metadatas = [c.to_metadata() for c in all_chunks]

        # Upsert into ChromaDB
        self.collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )
        return len(all_chunks)

    def query_impact(self, query_text: str, n_results: int = 5) -> List[Dict[str, Any]]:
        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results
        )

        candidates = []
        if results and results["ids"] and results["ids"][0]:
            for i, chunk_id in enumerate(results["ids"][0]):
                doc = results["documents"][0][i] if results["documents"] else ""
                meta = results["metadatas"][0][i] if results["metadatas"] else {}
                dist = results["distances"][0][i] if results.get("distances") else 0.0
                candidates.append({
                    "chunk_id": chunk_id,
                    "distance": dist,
                    "similarity": round(1.0 - dist if dist <= 1.0 else 1.0 / (1.0 + dist), 4),
                    "metadata": meta,
                    "snippet": doc.splitlines()[:5]
                })
        return candidates

    def compare_with_graph_hops(
        self, query_text: str, graph_impacted_ids: List[str], top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Đối chứng kết quả truy xuất Vector RAG với tập các nút chịu tác động đa hop do GraphRAG tìm ra.
        Đo Hit Rate@K, Recall@K, và xếp hạng của các thành phần đa hop trong kết quả Vector.
        """
        vector_results = self.query_impact(query_text, n_results=top_k)
        retrieved_ids = [c["chunk_id"] for c in vector_results]

        hits = [gid for gid in graph_impacted_ids if gid in retrieved_ids]
        misses = [gid for gid in graph_impacted_ids if gid not in retrieved_ids]

        recall = len(hits) / len(graph_impacted_ids) if graph_impacted_ids else 0.0
        precision = len(hits) / len(retrieved_ids) if retrieved_ids else 0.0

        return {
            "query": query_text,
            "top_k": top_k,
            "ground_truth_target_count": len(graph_impacted_ids),
            "retrieved_count": len(retrieved_ids),
            "hits": hits,
            "misses": misses,
            "precision_at_k": round(precision, 4),
            "recall_at_k": round(recall, 4),
            "ranked_candidates": vector_results
        }
