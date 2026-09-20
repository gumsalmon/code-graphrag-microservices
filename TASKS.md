# SỔ TAY THEO DÕI NHIỆM VỤ CỦA HIỂN — DỰ ÁN CODE GRAPHRAG

> **Đề tài:** Nghiên cứu ứng dụng GraphRAG trong phân tích tác động mã nguồn đa dịch vụ cho kiến trúc Microservices  
> **Chủ nhiệm:** Ngô Đức Huy | **Thành viên cốt lõi:** Giảng Văn Hiển  
> **Thời gian thực hiện:** 10/2026 – 04/2027  
> **Tài liệu căn cứ:** `PROJECT_CONTEXT.md` (Chỉ dẫn kỹ thuật của Huy) & `DT_5.docx` (Thuyết minh đề tài cấp trường)

---

## 1. Ranh giới Trách nhiệm & Quyền hạn của Hiển

* **Hiển toàn quyền quyết định:**
  * Cấu trúc module code, đặt tên biến/hàm, viết script kiểm thử.
  * Lựa chọn giải thuật duyệt cây cú pháp (Tree-sitter Query hoặc duyệt đệ quy AST).
  * Cách viết Dockerfile, Docker Compose cho Neo4j & ChromaDB.
  * Chiến lược chia đoạn (Chunking) mã nguồn cho Baseline Vector RAG.
* **Hiển cần thống nhất với Huy:**
  * Schema JSON chuẩn đầu ra dùng chung.
  * Cấu trúc đồ thị và nhãn Node/Edge trên Neo4j.
  * Định nghĩa hop logic và quy tắc tính tác động liên dịch vụ.
  * Bộ nhãn Ground Truth benchmark và kết quả kiểm chứng hành vi runtime.
  * Mở rộng sang ngôn ngữ/framework mới ngoài phạm vi.

---

## 2. Bảng Tiến Độ Nhiệm Vụ (Task Checklist)

### GIAI ĐOẠN 0 & 1: Bóc tách Cú pháp, Đồ thị 2-hop & Hạ tầng Neo4j

- [x] **TASK 1: Bóc tách quan hệ REST 2 tập tin đầu tiên (VisitResource & VisitsServiceClient)**
  - [x] Soạn thảo file hợp đồng mẫu `contracts/sample_contract.json` theo đúng Mục 7.2.
  - [x] Bóc tách Annotation Spring MVC (`@GetMapping`, `@PostMapping`, `@RequestParam`).
  - [x] Phân giải Spring Semantics (`declared_required` vs `effective_required`).
  - [x] Bóc tách chuỗi gọi `WebClient.get().uri(...)`, phân giải hostname tĩnh và URL path.
  - [x] Ghép nối chính xác cạnh `INVOKES_API` đến đúng overload handler.
  - [x] Ghi nhận biểu thức ngoài phạm vi vào mảng `unresolved` (như `setHostname`).
  - [x] Viết unit tests và fixture âm (POST vs GET, khác Service, dynamic URI).
  - [x] Kiểm tra tính tất định của JSON đầu ra.

- [x] **TASK 2: Mở rộng Tuyến 2-hop & Bóc tách Lời gọi Nội bộ (`CALLS`)**
  - [x] Thêm file `ApiGatewayController.java`.
  - [x] Bóc tách cạnh nội bộ `CALLS` từ `getOwnerDetails()` sang `VisitsServiceClient.getVisitsForPets()`.
  - [x] Phát hiện cơ chế phòng thủ `ReactiveCircuitBreaker` và hàm fallback `emptyVisitsForPets()`.
  - [x] Xây dựng thuật toán duyệt ngược tác động (`trace_backward_impact`):
    - Tuyến 2-hop: `ApiGatewayController` $\xrightarrow{\text{CALLS}}$ `VisitsServiceClient` $\xrightarrow{\text{INVOKES\_API}}$ `VisitResource`.
    - Tính đúng hop logic: 2 hops, 1 lần vượt ranh giới dịch vụ.
  - [x] Xuất `output/baseline_2hop_graph.json` và `output/mutated_2hop_graph.json`.

- [x] **TASK 3: Hạ tầng CSDL Đồ thị Neo4j (Docker & Script Cypher)**
  - [x] Viết `docker-compose.yml` chạy Neo4j 5.26.0 Community kèm APOC, ports 7474 & 7687.
  - [x] Viết module `src/neo4j_importer.py` sinh kịch bản Cypher chuẩn hóa:
    - Ràng buộc duy nhất: `Service.name`, `Class.fqn`, `Method.id`, `Endpoint.handler_id`.
    - Phân cấp: `(Service)-[:CONTAINS]->(Class)-[:CONTAINS]->(Method)-[:EXPOSES]->(Endpoint)`.
    - Phụ thuộc: `(Method)-[:INVOKES_API]->(Method)` và `(Method)-[:CALLS]->(Method)`.
  - [x] Xuất `output/import_baseline_2hop.cypher` và `output/import_mutated_2hop.cypher`.
  - [x] Tích hợp kết nối Python Bolt driver vào Neo4j.

---

### GIAI ĐOẠN 2: Xây dựng Baseline Vector RAG (ChromaDB) & Tích hợp Đối chứng

- [x] **TASK 4: Xây dựng Hệ thống Đối chứng Baseline Vector RAG (ChromaDB)**
  - [x] Cài đặt thư viện `chromadb` (v1.5.9).
  - [x] Thiết kế module chia đoạn mã nguồn công bằng theo Class/Method/Record AST (`src/chroma_baseline.py`).
  - [x] Lập chỉ mục 13 code chunks vào ChromaDB với metadata đầy đủ.
  - [x] Xây dựng hàm truy vấn tương đồng và so sánh đối chứng (`run_baseline_benchmark.py`).
  - [x] Chạy thực nghiệm khoa học: Chứng minh Vector RAG đạt Recall@5 = 0.00 do bị kẹt trong textual similarity cục bộ ở `VisitResource`, trong khi GraphRAG đạt 100% độ phủ cả tuyến 2-hop (`VisitsServiceClient` và `ApiGatewayController`).
  - [x] Xuất báo cáo đối chứng khoa học: `output/benchmark_comparison.json`.

---

### GIAI ĐOẠN 3: Mở rộng Quy mô Đồ thị & Kho Mã Nguồn Mẫu

- [x] **TASK 5: Mở rộng Parser sang các Service còn lại của Spring PetClinic**
  - [x] Thu thập và bóc tách `customers-service` (`OwnerResource.java`, `PetResource.java`).
  - [x] Thu thập và bóc tách `vets-service` (`VetResource.java`).
  - [x] Thu thập và bóc tách `CustomersServiceClient.java` trong `api-gateway`.
  - [x] Trích xuất toàn diện Call Graph liên dịch vụ của 4 microservices PetClinic (15 nodes, 13 endpoints, 4 edges).
  - [x] Xuất `output/petclinic_full_graph.json` và sinh script `output/import_petclinic_full.cypher`.

- [x] **TASK 6: Khảo sát và Bóc tách Hệ thống Mẫu thứ 2 (Google Cloud Online Boutique)**
  - [x] Thu thập `protos/demo.proto` từ Google Cloud Online Boutique.
  - [x] Xây dựng `src/proto_parser.py` bóc tách 9 gRPC services và toàn bộ RPC methods.
  - [x] Bóc tách các lời gọi gRPC client trong `checkoutservice` (Go): `GetCart`, `EmptyCart`, `Convert`, `Charge`, `SendOrderConfirmation`, `ShipOrder`.
  - [x] Xuất `output/online_boutique_graph.json` (21 nodes, 6 edges gRPC) và `output/import_online_boutique.cypher`.

---

### GIAI ĐOẠN 4: Thực nghiệm Đo lường, Benchmark & Đóng gói Sản phẩm

- [x] **TASK 7: Phối hợp Xây dựng Benchmark & Thực nghiệm Đo lường**
  - [x] Xây dựng module `src/benchmark_runner.py` quản lý 4 kịch bản kiểm thử chuẩn hóa (REST và gRPC).
  - [x] Thực hiện đo lường định lượng trên kịch bản kiểm thử:
    * GraphRAG: Precision = 1.0, Recall = 1.0, **F1-Score = 1.0000**
    * Vector RAG: Precision = 0.2, Recall = 0.5, **F1-Score = 0.2857**
  - [x] Xuất báo cáo kết quả hoàn chỉnh: `output/full_benchmark_results.json`.

- [x] **TASK 8: Đóng gói Sản phẩm & Tài liệu Hướng dẫn**
  - [x] Viết file hướng dẫn chi tiết `README.md` bao gồm kiến trúc, cách cài đặt, chạy 18 unit tests, dựng Neo4j Docker và tái lập thực nghiệm.
  - [x] Chuẩn hóa toàn bộ cấu trúc dự án, mã nguồn sạch, 18/18 unit tests pass 100%.

---

## 3. Nhật ký Công việc đã Thực hiện

| Ngày | Task | Chi tiết đã làm | Commit Git |
|---|---|---|---|
| 20/09/2026 | Task 1 | Hoàn thành Parser REST 2 file (`VisitResource` & `VisitsServiceClient`), hợp đồng JSON `sample_contract.json`, 7 unit tests. | `1e2bbc3` |
| 20/09/2026 | Task 2 & 3 | Bóc tách 2-hop (`ApiGatewayController`), phát hiện Circuit Breaker, thuật toán duyệt ngược tác động, tạo `docker-compose.yml` và module `neo4j_importer.py`. Đạt 10/10 unit tests. | `869438e` |
| 20/09/2026 | Task 4 | Hoàn thành ChromaDB Baseline Vector RAG, module AST Code Chunker, 13/13 tests passed, chạy thực nghiệm chứng minh hạn chế multi-hop của Vector RAG so với GraphRAG (`output/benchmark_comparison.json`). | `cfa76d6` |
| 20/09/2026 | Task 5 | Mở rộng bóc tách toàn diện 4 microservices của PetClinic (`customers-service`, `vets-service`, `visits-service`, `api-gateway`) với 15 nodes, 13 endpoints, 4 edges (`output/petclinic_full_graph.json`). | *Đang commit* |
| 20/09/2026 | Task 6 | Bóc tách giao thức gRPC Google Cloud Online Boutique từ `demo.proto` và `checkoutservice` Go với 21 nodes, 6 cạnh gRPC (`output/online_boutique_graph.json`). | *Đang commit* |
| 20/09/2026 | Task 7 | Xây dựng `src/benchmark_runner.py`, đo đạc định lượng F1-Score: GraphRAG (1.0000) vs Vector RAG (0.2857), lưu `output/full_benchmark_results.json`. | *Đang commit* |
| 20/09/2026 | Task 8 | Đóng gói tài liệu `README.md`, hoàn thiện bộ kiểm thử đạt 18/18 tests passed (100%), chuẩn bị bàn giao cho Huy. | *Đang commit* |
