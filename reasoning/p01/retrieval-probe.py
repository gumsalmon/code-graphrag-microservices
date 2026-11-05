"""Run the pinned Hien chunker/store on an explicit baseline-only packet, offline.

This is retrieval evidence, never a label, prediction, metric or benchmark approval.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import math
from pathlib import Path
import platform
import sys
import tarfile
import time

SOURCE_SHA = "3858f9c630cf989bb6809a86edf47c2be78dc9f1"
IMPL_SHA = "e95613795133088621117179c9fb9592dab62b16"
ARCHIVE_SHA = "913d7300ceae3b2dbc2c50d1de4baacab4be7b9380491c27fab7418616a16ec3"
CODE_HASHES = {
    "src/chroma_baseline.py": "b124d9516ec3b15d6cf70deed7933a077a19562486ae664c019e6253f9fb02d5",
    "src/parser.py": "349be1e5694505e2d14d0cceed0bc3d22411406bd7708286bc15d534edbf68fb",
}
ALLOWED_FILES = {
    "spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java",
    "spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/application/VisitsServiceClient.java",
    "spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java",
}


def digest(value: str | bytes) -> str:
    return hashlib.sha256(value.encode("utf-8") if isinstance(value, str) else value).hexdigest()


def canonical(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def validate_input(packet: dict) -> None:
    if set(packet) != {"schema", "source_commit", "implementation_commit", "sources", "seed_id", "query", "query_sha256", "top_k"}:
        raise ValueError("Unexpected input fields; no graphs, labels, runtime or scores accepted")
    if packet["schema"] != "p01-retrieval-input/1" or packet["source_commit"] != SOURCE_SHA or packet["implementation_commit"] != IMPL_SHA:
        raise ValueError("Unpinned input revisions")
    if type(packet["top_k"]) is not int or not 1 <= packet["top_k"] <= 50:
        raise ValueError("Invalid fixed top-k")
    sources = packet["sources"]
    if not isinstance(sources, list) or len(sources) != 3 or {item["file"] for item in sources} != ALLOWED_FILES:
        raise ValueError("Input must be the same three baseline Java files")
    for source in sources:
        if set(source) != {"file", "sha256", "text"} or "\r" in source["text"] or digest(source["text"]) != source["sha256"]:
            raise ValueError("Source checksum/normalization mismatch")
    if digest(packet["query"]) != packet["query_sha256"]:
        raise ValueError("Query checksum mismatch")


def run(packet: dict, implementation: Path, output: Path) -> dict:
    validate_input(packet)
    for filename, expected in CODE_HASHES.items():
        if digest((implementation / filename).read_bytes()) != expected:
            raise ValueError("Pinned implementation code mismatch: " + filename)
    if importlib.metadata.version("chromadb") != "1.5.9":
        raise ValueError("Expected chromadb 1.5.9")
    for name, version in {"tree-sitter": "0.25.2", "tree-sitter-java": "0.23.5", "tree-sitter-go": "0.25.0"}.items():
        if importlib.metadata.version(name) != version:
            raise ValueError("Dependency revision mismatch: " + name)
    sys.path.insert(0, str(implementation))
    from src.chroma_baseline import ChromaBaselineStore
    from chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2 import ONNXMiniLM_L6_V2
    from tokenizers import Tokenizer

    cache = Path(ONNXMiniLM_L6_V2.DOWNLOAD_PATH)
    if digest((cache / "onnx.tar.gz").read_bytes()) != ARCHIVE_SHA:
        raise ValueError("Expected pinned model archive in existing cache")
    model_files = ["config.json", "model.onnx", "special_tokens_map.json", "tokenizer_config.json", "tokenizer.json", "vocab.txt"]
    model_root = cache / ONNXMiniLM_L6_V2.EXTRACTED_FOLDER_NAME
    hashes_before = {name: digest((model_root / name).read_bytes()) for name in model_files}
    # Existing extracted files must match the pinned archive, not merely exist.
    # Read members without extracting or writing to the shared read-only cache.
    with tarfile.open(cache / "onnx.tar.gz", "r:gz") as archive:
        for name in model_files:
            member = archive.getmember(ONNXMiniLM_L6_V2.EXTRACTED_FOLDER_NAME + "/" + name)
            if not member.isfile():
                raise ValueError("Unexpected model archive member")
            member_hash = hashlib.sha256()
            with archive.extractfile(member) as stream:
                for block in iter(lambda: stream.read(1024 * 1024), b""):
                    member_hash.update(block)
            if member_hash.hexdigest() != hashes_before[name]:
                raise ValueError("Extracted cache differs from pinned model archive: " + name)
    def blocked_download(*_args, **_kwargs):
        raise RuntimeError("Model download forbidden in offline retrieval")
    ONNXMiniLM_L6_V2._download = blocked_download
    database = output / "chroma-db"
    if database.exists():
        raise ValueError("Refusing an existing database; each run must be isolated")
    started = time.perf_counter()
    store = ChromaBaselineStore(collection_name="p01_baseline_only", persist_directory=str(database))
    # The implementation's smoke scorer is deliberately disabled, not an oracle.
    store.compare_with_graph_hops = blocked_download
    sources = {item["file"]: item for item in packet["sources"]}
    corpus = []
    metadatas = []
    for source in sorted(packet["sources"], key=lambda item: item["file"]):
        for chunk in store.chunker.chunk_file(source["file"], source_code=source["text"]):
            if chunk.file != source["file"]:
                raise ValueError("Chunk file differs from allowed source")
            excerpt = "\n".join(source["text"].split("\n")[chunk.line_start - 1:chunk.line_end])
            if excerpt.strip() != chunk.content:
                raise ValueError("AST chunk differs from its source span")
            document = f"// File: {chunk.file} | Service: {chunk.service}\n{chunk.content}"
            corpus.append({"chunk_id": chunk.chunk_id, "chunk_type": chunk.chunk_type, "file": chunk.file,
                           "class_fqn": chunk.class_fqn, "service": chunk.service, "line_start": chunk.line_start,
                           "line_end": chunk.line_end, "content": chunk.content, "document": document,
                           "source_sha256": source["sha256"], "content_sha256": digest(chunk.content)})
            metadatas.append(chunk.to_metadata())
    if len({item["chunk_id"] for item in corpus}) != len(corpus) or packet["top_k"] > len(corpus):
        raise ValueError("Duplicate chunk IDs or top-k exceeds corpus; no silent reduction")
    if packet["seed_id"] not in {item["chunk_id"] for item in corpus}:
        raise ValueError("Known seed is absent from source chunks")
    # Same representation/upsert as Hien's index_files, but text is supplied from
    # the checksum-verified packet instead of an unrestricted filesystem glob.
    store.collection.upsert(ids=[item["chunk_id"] for item in corpus], documents=[item["document"] for item in corpus], metadatas=metadatas)
    configuration = store.collection.configuration
    if configuration["hnsw"]["space"] != "l2":
        raise ValueError("Unexpected distance space")
    def query_once():
        records = store.query_impact(packet["query"], n_results=packet["top_k"])
        ranked = [{"chunk_id": item["chunk_id"], "distance": float(item["distance"])} for item in records]
        if len(ranked) != packet["top_k"] or any(not math.isfinite(item["distance"]) or item["distance"] < 0 for item in ranked):
            raise ValueError("Invalid real retrieval result")
        return sorted(ranked, key=lambda item: (item["distance"], item["chunk_id"]))
    ranked = query_once()
    first_embedding = store.collection.get(ids=[corpus[0]["chunk_id"]], include=["embeddings"])["embeddings"][0]
    # Reopen the persistent store, not just a repeated call on the same object.
    store = ChromaBaselineStore(collection_name="p01_baseline_only", persist_directory=str(database))
    store.compare_with_graph_hops = blocked_download
    repeated = query_once()
    if ranked != repeated or store.collection.count() != len(corpus):
        raise ValueError("Retrieval does not reproduce after reopening the store")
    documents = store.collection.get(include=["documents"])
    recovered = dict(zip(documents["ids"], documents["documents"]))
    if recovered != {item["chunk_id"]: item["document"] for item in corpus}:
        raise ValueError("Persisted documents differ from the baseline corpus")
    tokenizer = Tokenizer.from_file(str(model_root / "tokenizer.json"))
    tokenizer.no_truncation(); tokenizer.no_padding()
    token_audit = [{"chunk_id": item["chunk_id"], "untruncated_embedding_tokens": len(tokenizer.encode(item["document"]).ids)} for item in corpus]
    hashes_after = {name: digest((model_root / name).read_bytes()) for name in model_files}
    if hashes_before != hashes_after or len(first_embedding) != 384:
        raise ValueError("Model cache changed or embedding dimension mismatch")
    corpus.sort(key=lambda item: item["chunk_id"])
    report = {"schema": "p01-chroma-retrieval/1", "status": "real_offline_retrieval_not_prediction",
              "source_commit": SOURCE_SHA, "implementation_commit": IMPL_SHA, "implementation_code_sha256": CODE_HASHES,
              "corpus_sha256": digest(canonical(corpus)), "query": packet["query"], "query_sha256": packet["query_sha256"],
              "top_k": packet["top_k"], "chunk_count": len(corpus), "ranked": ranked, "reopened_ranked": repeated,
              "distance_metric": "l2_squared", "distance_is_probability": False, "metrics_computed": False,
              "model_downloads": 0, "llm_calls": 0, "elapsed_ms": round((time.perf_counter() - started) * 1000),
              "embedding": {"model": "all-MiniLM-L6-v2", "dimension": len(first_embedding), "archive_sha256": ARCHIVE_SHA,
                            "model_files_sha256": hashes_before, "token_cap": 256,
                            "query_untruncated_tokens": len(tokenizer.encode(packet["query"]).ids), "documents": token_audit,
                            "long_documents": [item["chunk_id"] for item in token_audit if item["untruncated_embedding_tokens"] > 256],
                            "policy": "Chroma ONNX tokenizer truncates embedding inputs at 256; source context keeps complete selected AST chunks"},
              "environment": {"python": platform.python_version(), "platform": platform.platform(),
                              "dependencies": {name: importlib.metadata.version(name) for name in ["chromadb", "tree-sitter", "tree-sitter-java", "tree-sitter-go", "onnxruntime", "tokenizers"]},
                              "container_network": "none", "model_cache_mount": "read_only"}}
    for name, data in {"corpus.json": corpus, "retrieval.json": report}.items():
        with (output / name).open("x", encoding="utf-8", newline="\n") as stream:
            stream.write(json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False) + "\n")
    return report


if __name__ == "__main__":
    cli = argparse.ArgumentParser()
    cli.add_argument("--input", type=Path, required=True)
    cli.add_argument("--implementation", type=Path, required=True)
    cli.add_argument("--output", type=Path, required=True)
    args = cli.parse_args()
    try:
        result = run(json.loads(args.input.read_text(encoding="utf-8")), args.implementation.resolve(), args.output.resolve())
        print(json.dumps({"status": result["status"], "chunk_count": result["chunk_count"], "top_k": result["top_k"], "llm_calls": 0}))
    except Exception as error:
        print("Offline retrieval failed: " + str(error), file=sys.stderr)
        sys.exit(1)
