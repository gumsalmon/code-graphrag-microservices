# Code GraphRAG: Phân tích Tác động Mã nguồn Đa dịch vụ cho Kiến trúc Microservices

> **Đề tài NCKH:** Nghiên cứu ứng dụng GraphRAG trong phân tích tác động mã nguồn đa dịch vụ cho kiến trúc Microservices  
> **Tác giả / Nhóm thực hiện:** Ngô Đức Huy (Chủ nhiệm) & Giảng Văn Hiển (Thành viên kỹ thuật cốt lõi)  
> **Trường Đại học Sài Gòn — Khoa Công nghệ Thông tin**

---

## 1. Giới thiệu Tổng quan

Dự án nghiên cứu và phát triển giải pháp **Code GraphRAG** nhằm giải quyết triệt để bài toán phân tích tác động thay đổi mã nguồn (Change Impact Analysis - CIA) trong các hệ thống kiến trúc Microservices phân tán.

Hệ thống kết hợp:
1. **Phân tích cú pháp tĩnh trừu tượng (Tree-sitter AST & Protobuf):** Bóc tách các quan hệ phụ thuộc liên dịch vụ (REST qua `WebClient` và gRPC qua `.proto`) cùng các lời gọi nội bộ (`CALLS`) có giám sát cơ chế phòng thủ Circuit Breaker.
2. **Cơ sở dữ liệu đồ thị (Neo4j):** Mô hình hóa mạng lưới phụ thuộc thành Đồ thị tri thức mã nguồn (Code Knowledge Graph), hỗ trợ duyệt ngược đa bước (*Multi-hop Backward Traversal*).
3. **Mô hình đối chứng Vector RAG (ChromaDB):** Phân đoạn ngữ nghĩa công bằng theo cấp độ hàm/lớp (AST Code Chunking) để đo lường định lượng sự vượt trội của GraphRAG so với tìm kiếm vector truyền thống.

---

## 2. Cấu trúc Thư mục

```text
d:\Projects\Bao\
├── contracts/
│   └── sample_contract.json          # Hợp đồng chuẩn dữ liệu đồ thị v0.1.0
├── data/
│   ├── baseline/                     # Mã nguồn Spring PetClinic (4 microservices)
│   │   ├── VisitResource.java
│   │   ├── VisitsServiceClient.java
│   │   ├── ApiGatewayController.java
│   │   ├── CustomersServiceClient.java
│   │   ├── OwnerResource.java
│   │   ├── PetResource.java
│   │   └── VetResource.java
│   ├── mutated/                      # Bản đột biến kiểm soát (P01 includeDetails)
│   ├── fixtures/                     # Test fixtures âm (POST, different service, dynamic URI)
│   └── online_boutique/              # Mã nguồn Google Cloud Online Boutique (gRPC)
│       ├── demo.proto
│       └── checkoutservice_main.go
├── src/
│   ├── parser.py                     # Parser Java Spring MVC & WebClient (AST Tree-sitter)
│   ├── proto_parser.py               # Parser Protocol Buffers & gRPC Call Graph
│   ├── neo4j_importer.py             # Module sinh Cypher và nạp dữ liệu vào Neo4j
│   ├── chroma_baseline.py            # Baseline Vector RAG (AST Code Chunking + ChromaDB)
│   └── benchmark_runner.py           # Bộ thực nghiệm đo Precision, Recall, F1
├── tests/
│   ├── test_parser.py                # 11 unit tests cho Java REST & 2-hop
│   ├── test_chroma_baseline.py       # 3 unit tests cho Vector Chunker & ChromaDB
│   ├── test_proto_parser.py          # 2 unit tests cho gRPC & Protobuf
│   └── test_benchmark_runner.py      # 2 unit tests cho Benchmark Runner
├── output/
│   ├── baseline_graph.json           # Đồ thị REST 2 tập tin ban đầu
│   ├── baseline_2hop_graph.json      # Đồ thị 2-hop đầy đủ (ApiGatewayController)
│   ├── petclinic_full_graph.json     # Đồ thị toàn diện 4 microservices PetClinic
│   ├── online_boutique_graph.json    # Đồ thị gRPC Google Cloud Online Boutique
│   ├── import_baseline_2hop.cypher   # Kịch bản Cypher nạp Neo4j (2-hop)
│   ├── import_petclinic_full.cypher  # Kịch bản Cypher nạp Neo4j toàn diện
│   ├── import_online_boutique.cypher # Kịch bản Cypher gRPC Neo4j
│   ├── benchmark_comparison.json     # Báo cáo so sánh đối chứng khoa học
│   └── full_benchmark_results.json   # Kết quả đo đạc định lượng F1-Score
├── docker-compose.yml                # Hạ tầng Neo4j 5.26 Community + APOC
├── TASKS.md                          # Sổ tay theo dõi tiến độ công việc của Hiển
├── run_parser.py                     # Script thực thi toàn bộ pipeline trích xuất đồ thị
└── run_baseline_benchmark.py         # Script chạy thực nghiệm đối chứng Vector vs Graph
```

---

## 3. Hướng dẫn Cài đặt & Sử dụng

### Yêu cầu Môi trường
* Python 3.10+ (đã kiểm thử trên Python 3.11.9)
* Docker & Docker Compose (cho CSDL đồ thị Neo4j)

### Cài đặt Thư viện Python
```bash
python -m pip install -r requirements.txt
```

### Chạy Toàn bộ 24 Bài Kiểm thử (Unit Tests & Toàn vẹn Hệ thống)
```bash
python -m pytest tests/ -v
```

### Thực thi Pipeline Trích xuất Đồ thị (PetClinic & Online Boutique)
```bash
python run_parser.py
```
Lệnh trên sẽ tự động:
1. Trích xuất quan hệ REST giữa provider và client.
2. Trích xuất chuỗi 2-hop và nhận diện Circuit Breaker / Fallback.
3. Quét toàn bộ 4 microservices của Spring PetClinic (15 nodes, 13 endpoints, 4 edges).
4. Bóc tách giao thức gRPC từ `demo.proto` của Google Cloud Online Boutique (21 nodes, 6 edges).
5. Sinh các file kịch bản Cypher `.cypher` tương ứng trong thư mục `output/`.

### Khởi động CSDL Neo4j & Nạp Đồ thị
```bash
# Khởi động Neo4j container
docker compose up -d

# Nạp dữ liệu đồ thị:
# Truy cập Neo4j Browser tại http://localhost:7474 (Tài khoản: neo4j / graphrag2026)
# Sao chép và chạy nội dung file output/import_petclinic_full.cypher hoặc output/import_online_boutique.cypher
```

### Chạy Thực nghiệm Đối chứng Khoa học (GraphRAG vs Vector RAG)
```bash
python run_baseline_benchmark.py
```

---

## 4. Kết quả Thực nghiệm Khoa học

| Hệ thống | Độ sâu | Precision | Recall | F1-Score | Ghi chú |
|---|---|---|---|---|---|
| **Code GraphRAG** | 1-hop & 2-hop | **1.0000** | **1.0000** | **1.0000** | Truy vết chính xác mọi đường phụ thuộc đa bước và phát hiện fallback. |
| **Vector RAG Baseline (ChromaDB)** | 1-hop & 2-hop | 0.2000 | 0.5000 | **0.2857** | Kẹt trong tương đồng văn bản cục bộ, bỏ sót các thành phần 2-hop liên dịch vụ. |

Kết quả chi tiết được lưu trữ tại [output/full_benchmark_results.json](output/full_benchmark_results.json).
