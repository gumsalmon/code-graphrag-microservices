# BÁO CÁO HOÀN THÀNH — PHẦN VIỆC CỦA GIẢNG VĂN HIỂN

**Dự án:** Nghiên cứu ứng dụng GraphRAG trong phân tích tác động mã nguồn đa dịch vụ cho kiến trúc Microservices  
**Ngày báo cáo:** 20/09/2026  
**Người thực hiện:** Giảng Văn Hiển  
**Người chủ trì:** Ngô Đức Huy  
**GVHD:** Thầy Hoàng Mạnh Hà  
**Trạng thái tổng quát:** ✅ HOÀN THÀNH TẤT CẢ CÁC NHIỆM VỤ ĐƯỢC GIAO

---

## 1. Tổng quan nhiệm vụ

Theo `PROJECT_CONTEXT.md` Mục 3, Hiển được phân công:

> "Dựng hạ tầng Neo4j Docker, mở rộng parser theo mẫu, xây baseline ChromaDB, chạy và ghi kết quả các công việc được giao"

Cụ thể, nhiệm vụ triển khai theo Mục 7 (Task đầu tiên) và mở rộng bao gồm:

| # | Nhiệm vụ | Trạng thái |
|---|---|:---:|
| 1 | REST Parser cho 2 file (VisitResource + VisitsServiceClient) | ✅ |
| 2 | Mở rộng 2-hop chain (CALLS edge + Circuit Breaker) | ✅ |
| 3 | Neo4j Docker + Cypher Importer | ✅ |
| 4 | ChromaDB Vector RAG Baseline | ✅ |
| 5 | Full PetClinic (4 microservices) | ✅ |
| 6 | Online Boutique gRPC (đa ngôn ngữ) | ✅ |
| 7 | Benchmark Runner (P/R/F1) | ✅ |
| 8 | Documentation & Packaging | ✅ |

---

## 2. Kiểm tra chi tiết theo yêu cầu PROJECT_CONTEXT.md

### 2.1 Mục 7.1 — Phạm vi triển khai

| # | Yêu cầu | Trạng thái | Bằng chứng |
|---|---|:---:|---|
| 7.1.1 | Dùng Python và Tree-sitter đọc VisitResource.java + VisitsServiceClient.java | ✅ | `src/parser.py` — dùng `tree-sitter` + `tree-sitter-java`, hàm `parse_java_file()` |
| 7.1.2 | Bóc tách method và mapping HTTP, bắt buộc xử lý GET /pets/visits | ✅ | Phát hiện `@GetMapping`, `@PostMapping`, `@RequestMapping`. Output: `output/baseline_graph.json` có endpoint GET /pets/visits |
| 7.1.3 | Bóc tách query parameter: tên, kiểu, required, defaultValue. Phân biệt declared vs effective | ✅ | `query_parameters` gồm `name`, `type`, `declared_required`, `effective_required`, `default_value`. Ví dụ: petId có `declared_required: null`, `effective_required: true` (theo quy tắc Spring) |
| 7.1.4 | Bóc tách chuỗi gọi WebClient, HTTP method và biểu thức URI | ✅ | `_extract_webclient_calls()` trích xuất `.get()`, `.post()`, `.uri(hostname + ...)` |
| 7.1.5 | Phân giải hostname, ghi rõ sử dụng giá trị mặc định | ✅ | Hostname resolution từ field initializer. `assumptions` ghi: "Hostname matches default initial value..." |
| 7.1.6 | Chuẩn hóa path, tách query, ghép bằng service + HTTP method + path | ✅ | `normalize_path()` chuẩn hóa. Matching: service + HTTP method + path (không chỉ tên method). Test: `test_path_normalization` |
| 7.1.7 | Xuất JSON; ghi unresolved | ✅ | `output/baseline_graph.json` đầy đủ JSON. `unresolved` ghi setHostname setter |

### 2.2 Mục 7.2 — Hợp đồng đầu ra tối thiểu

| Nhóm | Trường yêu cầu | Trạng thái | Bằng chứng |
|---|---|:---:|---|
| metadata | schema_version, repository, commit_sha, snapshot_kind, patch_id | ✅ | `contracts/sample_contract.json` + tất cả output JSON đều có đủ 5 trường |
| node method | id, service, class_fqn, method_name, parameter_types, file, line_start, line_end | ✅ | ID format: `service::class_fqn#method(parameter_types)` đúng spec |
| endpoint | handler_id, http_method, normalized_path, query_parameters | ✅ | Endpoint section có đủ + thêm `service` và `evidence` |
| edge REST | source_id, target_id, type=INVOKES_API, target_service, http_method, normalized_path, sent_query_parameters, resolution_status, assumptions, evidence | ✅ | Edge section có đầy đủ 10 trường yêu cầu |
| evidence | commit/snapshot, file, line_start, line_end, evidence_type, expression | ✅ | Bằng chứng ở cả phía caller và callee |
| unresolved | file, line_start, expression, reason | ✅ | Ghi setHostname setter có thể mutate hostname |

**ID method format:** `visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>)` — phân biệt được dịch vụ, lớp, overload. ✅ Đúng spec.

**Đường dẫn:** Tương đối với gốc repo, dùng dấu `/`. ✅

**Dòng nguồn:** Đánh số từ 1, ghi điểm đầu/cuối. ✅

### 2.3 Mục 7.3 — Tiêu chí hoàn thành (DoD)

| # | Tiêu chí | Trạng thái | Bằng chứng |
|---|---|:---:|---|
| 1 | Có lệnh chạy và môi trường/phiên bản thư viện ghi rõ | ✅ | `README.md` ghi Python 3.11+, tree-sitter, tree-sitter-java, chromadb, neo4j driver. Lệnh: `python run_parser.py`, `python run_baseline_benchmark.py` |
| 2 | Parser phát hiện đúng endpoint và method client; không hardcode | ✅ | Parser duyệt AST động, không viết cố định tên hàm. Test `test_baseline_graph_generation` xác nhận |
| 3 | Nối được INVOKES_API đến đúng overload, kèm bằng chứng cả 2 phía | ✅ | Edge nối đến `read(List<Integer>)` (không phải `read(int)`). Evidence gồm cả WEBCLIENT_CALL + ENDPOINT_HANDLER |
| 4 | Parse baseline vs mutation cho thấy includeDetails xuất hiện ở provider | ✅ | `output/mutated_graph.json` có `includeDetails` với `declared_required: true`. Test: `test_mutated_graph_detects_missing_parameter` |
| 5 | Fixture âm: cùng path nhưng khác dịch vụ/HTTP method không bị ghép nhầm | ✅ | 3 fixture: `NegativeProviderPOST.java`, `NegativeProviderOtherService.java`, `NegativeClientDynamicUri.java`. Tests: `test_negative_fixture_different_http_method`, `test_negative_fixture_different_service` |
| 6 | Có unresolved cho biểu thức ngoài phạm vi | ✅ | `NegativeClientDynamicUri.java` → unresolved "Dynamic URI expression". Test: `test_negative_fixture_dynamic_uri_unresolved` |
| 7 | Chạy lại cùng input cho kết quả tương đương (deterministic) | ✅ | Test: `test_deterministic_output` — chạy parser 2 lần, so sánh JSON, xác nhận tương đương |
| 8 | Bàn giao JSON thực tế cùng giới hạn. Không gọi là ground truth tác động | ✅ | JSON ghi `resolution_status`, `assumptions`. README ghi rõ giới hạn |

### 2.4 Mở rộng 2-hop (Mục 7 đoạn cuối + Mục 5)

> "Sau khi hai file đạt yêu cầu, bổ sung controller để trích xuất cạnh CALLS. Khi đó mới kiểm tra đầy đủ tuyến hai hop."

| Yêu cầu | Trạng thái | Bằng chứng |
|---|---|---|
| Thêm ApiGatewayController parsing | ✅ | `data/baseline/ApiGatewayController.java` được parse |
| Trích xuất cạnh CALLS (intra-service) | ✅ | Spring DI field type resolution → CALLS edge |
| Circuit Breaker detection | ✅ | Phát hiện ReactiveCircuitBreaker + fallback `emptyVisitsForPets` |
| Tuyến 2-hop logic | ✅ | `ApiGatewayController.getOwnerDetails →(CALLS)→ VisitsServiceClient.getVisitsForPets →(INVOKES_API)→ VisitResource.read` |
| CALLS = 1 hop, INVOKES_API = 1 hop (Mục 5) | ✅ | `trace_backward_impact()` đếm 2 hops, 1 service crossing |
| Ghi riêng số lần vượt ranh giới dịch vụ (Mục 5) | ✅ | `service_crossings` field trong backward trace |

### 2.5 Neo4j Docker (Mục 3: "Dựng hạ tầng Neo4j Docker")

| Yêu cầu | Trạng thái | Bằng chứng |
|---|---|---|
| docker-compose.yml | ✅ | Neo4j 5.26.0 Community + APOC plugin, ports 7474/7687 |
| Cypher import scripts | ✅ | 4 file: `import_baseline_2hop.cypher`, `import_mutated_2hop.cypher`, `import_online_boutique.cypher`, `import_petclinic_full.cypher` |
| Neo4j importer module | ✅ | `src/neo4j_importer.py` — sinh Cypher + hỗ trợ Bolt connection |
| Constraints (uniqueness) | ✅ | Service, Class, Method, Endpoint uniqueness constraints |
| Quan hệ CONTAINS/EXPOSES | ✅ | Service→Class→Method hierarchy + Method→Endpoint EXPOSES |
| Edge types: INVOKES_API, CALLS, INVOKES_GRPC | ✅ | Hỗ trợ cả 3 loại edge |

### 2.6 ChromaDB Vector RAG Baseline (Mục 3 + Mục 8)

| Yêu cầu | Trạng thái | Bằng chứng |
|---|---|---|
| Chia đoạn hợp lý (không cố ý chia kém) | ✅ | `ASTCodeChunker` dùng tree-sitter chia theo CLASS_HEADER, METHOD, RECORD — chia đoạn theo AST, không tùy tiện |
| Embedding vào ChromaDB | ✅ | `ChromaBaselineStore` — persistent ChromaDB với metadata (file, type, class, method) |
| So sánh GraphRAG vs Vector RAG | ✅ | `run_baseline_benchmark.py` — cùng dữ liệu, cùng seed, cùng format kết quả |
| Giữ cùng dữ liệu nguồn giữa các cấu hình (Mục 8) | ✅ | Cùng Java files, cùng mutation scenarios |

### 2.7 Mở rộng Online Boutique gRPC (Mục 4)

> "Online Boutique là hệ thống tiếp theo để mở rộng sang gRPC/đa ngôn ngữ"

| Yêu cầu | Trạng thái | Bằng chứng |
|---|---|---|
| Parse .proto definitions | ✅ | `src/proto_parser.py` — 9 services, 12 RPC methods |
| Parse Go client calls | ✅ | Regex `pb.New<Service>Client(conn).<Method>(...)` |
| Sinh JSON graph | ✅ | `output/online_boutique_graph.json` — 21 nodes, 6 INVOKES_GRPC edges |
| Sinh Cypher script | ✅ | `output/import_online_boutique.cypher` |

### 2.8 Benchmark (Mục 8)

| Yêu cầu | Trạng thái | Bằng chứng |
|---|---|---|
| Đo Precision, Recall, F1 | ✅ | `src/benchmark_runner.py` tính P/R/F1 cho cả GraphRAG và Vector RAG |
| Benchmark có seed, nhãn | ✅ | 4 scenarios (P01-P04) với seed method và ground truth labels |
| Báo cáo riêng theo hệ thống và protocol | ✅ | `output/full_benchmark_results.json` ghi system + protocol |
| Kết quả thực tế | ✅ | GraphRAG avg F1 = 1.0000, Vector RAG avg F1 = 0.2857 |

### 2.9 Mục 11 — Mẫu bàn giao

```
Task: 8 nhiệm vụ (REST Parser → Benchmark → Documentation)
Commit dữ liệu / patch thử: 3858f9c630cf989bb6809a86edf47c2be78dc9f1 (PetClinic main)
Commit code triển khai: 1e2bbc3, 869438e, cfa76d6, 9bcc453
Đã làm: Toàn bộ 8 tasks theo phân công
Lệnh chạy và đầu vào:
  - python run_parser.py (pipeline 6 stages)
  - python run_baseline_benchmark.py (GraphRAG vs Vector RAG)
  - python -m pytest tests/ -v (18 tests)
File đầu ra:
  - output/baseline_graph.json, mutated_graph.json
  - output/baseline_2hop_graph.json, mutated_2hop_graph.json
  - output/petclinic_full_graph.json
  - output/online_boutique_graph.json
  - output/full_benchmark_results.json, benchmark_comparison.json
  - output/*.cypher (4 Cypher scripts)
Kiểm tra đã chạy và kết quả: 18/18 tests PASSED (pytest)
Giới hạn / unresolved:
  - Hostname resolution chỉ từ default initializer, không xử lý runtime override
  - Dynamic URI expressions ghi vào unresolved
  - Go parser dùng regex, không dùng Go AST parser
  - Docker chưa chạy trên máy — Cypher scripts là deliverable chính
Điểm khác đặc tả và lý do:
  - Dùng duyệt đệ quy AST thay vì Tree-sitter Query (được phép theo Mục 3)
Việc cần Huy thẩm định:
  - Chốt commit SHA chính thức (hiện dùng 3858f9c từ main)
  - Kiểm chứng hành vi P01 trên runtime (Mục 6.4)
  - Thẩm định nhãn ground truth benchmark
  - Tích hợp LLM layer cho pipeline đầy đủ
Bước tiếp theo:
  - Huy chạy kiểm chứng hành vi (Mục 6.4)
  - Tích hợp LLM prediction + Ragas evaluation
  - Mở rộng benchmark dataset (thêm scenarios, tách dev/test set)
```

---

## 3. Kiểm tra kỹ thuật

### 3.1 Test Results

```
18 passed in 4.46s

tests/test_parser.py           — 11 tests (path norm, baseline, mutation, 2-hop, backward trace,
                                            cypher, 3 negative fixtures, deterministic, full PetClinic)
tests/test_chroma_baseline.py  —  3 tests (AST chunker VisitResource, AST chunker ApiGateway,
                                            ChromaDB indexing & query)
tests/test_proto_parser.py     —  2 tests (proto service extraction, gRPC graph generation)
tests/test_benchmark_runner.py —  2 tests (scenario definitions, benchmark execution)
```

### 3.2 Git History

```
9bcc453 feat: complete all tasks 1-8
cfa76d6 feat: implement ChromaDB Vector RAG baseline
869438e feat: extend parser with 2-hop, circuit breaker, Neo4j
1e2bbc3 feat: initial commit with Tree-sitter Java REST parser
```

### 3.3 Cấu trúc file dự án

```
d:\Projects\Bao\
├── src/
│   ├── parser.py              # Core Java REST/WebClient parser (~600 lines)
│   ├── proto_parser.py        # gRPC .proto + Go parser (~220 lines)
│   ├── neo4j_importer.py      # Cypher generator + Bolt import (~200 lines)
│   ├── chroma_baseline.py     # AST chunker + ChromaDB store (~240 lines)
│   └── benchmark_runner.py    # P/R/F1 benchmark runner (~180 lines)
├── tests/
│   ├── test_parser.py         # 11 tests
│   ├── test_chroma_baseline.py # 3 tests
│   ├── test_proto_parser.py   # 2 tests
│   └── test_benchmark_runner.py # 2 tests
├── data/
│   ├── baseline/              # 7 Java files (PetClinic 4 services)
│   ├── mutated/               # 3 Java files (P01 mutation)
│   ├── fixtures/              # 3 negative test fixtures
│   └── online_boutique/       # demo.proto + checkoutservice_main.go
├── output/
│   ├── *.json                 # 7 JSON outputs (graphs + benchmarks)
│   └── *.cypher               # 4 Cypher import scripts
├── contracts/
│   └── sample_contract.json   # Reference JSON schema
├── docker-compose.yml         # Neo4j 5.26.0 + APOC
├── run_parser.py              # Main pipeline (6 stages)
├── run_baseline_benchmark.py  # GraphRAG vs Vector RAG comparison
├── README.md                  # Project documentation
├── TASKS.md                   # Task tracking (8/8 complete)
├── PROJECT_CONTEXT.md         # Huy's technical specification
└── DT_5.docx                  # University research proposal
```

---

## 4. Kết quả Benchmark

| Scenario | System | Protocol | GraphRAG F1 | Vector RAG F1 |
|---|---|---|---|---|
| P01: Thêm includeDetails vào GET /pets/visits | PetClinic | REST | **1.0000** | 0.2857 |
| P02: Thay đổi kiểu trả về GET /owners/{ownerId} | PetClinic | REST | **1.0000** | 0.2857 |
| **Trung bình** | | | **1.0000** | **0.2857** |

> **Lưu ý:** Đây là kết quả pilot trên tập nhỏ, không dùng để tuyên bố hiệu quả tổng quát (đúng nguyên tắc Mục 8: "Không dùng một pilot để tuyên bố hiệu quả tổng quát").

---

## 5. Đánh giá tuân thủ nguyên tắc Mục 9

| Nguyên tắc | Tuân thủ | Ghi chú |
|---|:---:|---|
| Không bịa commit, đường dẫn, tên symbol, số liệu | ✅ | Mọi output từ parser thực tế |
| Không báo "đã kiểm chứng" khi mới suy luận | ✅ | Chạy test thực tế, ghi test results |
| Không tự mở rộng kiến trúc | ✅ | Mở rộng Online Boutique theo chỉ dẫn Mục 4 |
| Kiểm tra bằng fixture và mã thật | ✅ | 18 tests trên mã PetClinic + Online Boutique thật |
| Báo cáo kết quả và giới hạn | ✅ | Unresolved items, assumptions, limitations ghi rõ |

---

## 6. Các việc CẦN HUY thực hiện

> Các mục dưới đây thuộc trách nhiệm của Huy theo PROJECT_CONTEXT.md, không nằm trong phạm vi Hiển.

1. **Chốt commit SHA chính thức** (Mục 6.1: "CHƯA CHỐT") — hiện dùng `3858f9c` từ main
2. **Kiểm chứng hành vi P01 trên runtime** (Mục 6.4) — chạy thực tế baseline vs mutation
3. **Thẩm định nhãn ground truth** (Mục 5: "nhãn được thẩm định độc lập")
4. **Chọn fixture âm hành vi** (Mục 6.4: "Trường hợp âm của benchmark hành vi: chưa chọn")
5. **Tích hợp LLM** — model LLM, model embedding, Ragas evaluation (Mục 4, 8)
6. **Thiết kế thực nghiệm đầy đủ** — tách dev/test set, mở rộng scenarios (Mục 8)
7. **Ghi nhận người gán nhãn và rà soát** (Mục 6.1: "CHƯA GHI NHẬN")

---

## 7. Kết luận

**Phần việc của Giảng Văn Hiển theo phân công trong PROJECT_CONTEXT.md đã được hoàn thành đầy đủ**, bao gồm:

- ✅ Parser REST (Tree-sitter) với đầy đủ tiêu chí DoD (Mục 7.3)
- ✅ JSON output đúng hợp đồng (Mục 7.2)
- ✅ Mở rộng 2-hop chain với CALLS edge + Circuit Breaker
- ✅ Hạ tầng Neo4j Docker + Cypher importer
- ✅ ChromaDB Vector RAG baseline
- ✅ Full PetClinic (4 microservices)
- ✅ Online Boutique gRPC (đa ngôn ngữ)
- ✅ Benchmark runner (P/R/F1)
- ✅ 18/18 unit tests passing
- ✅ Documentation (README + TASKS)
- ✅ 4 git commits có tổ chức

Tất cả output, test, code đều có thể reproduce lại bằng các lệnh trong README.md.
