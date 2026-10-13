# P01 — truy xuất Chroma và đối chứng context offline

Với clone mới, dùng [pipeline prepare portable](../../pipeline/p01/README.md). Tài liệu này mô tả adapter và runner bước 4 lịch sử; `run_p01_retrieval.mjs` mặc định trỏ tới clone/cache của lượt 12/10, không tự có những thư mục đó trên máy khác. Luồng mới không phụ thuộc các đường dẫn lịch sử này và không ghi đè evidence cũ.

Phạm vi bước 4: chạy retrieval thật và chuẩn bị request/context, **không chạy LLM, chấm benchmark, mở P02–P04 hoặc duyệt nhãn**. Không cần Gemini key cho các lệnh trong phần chuẩn bị này.

Cập nhật 13/10/2026: đã thử một lượt Gemini cho từng request v2 dưới cùng model/config; cả hai trả `503 UNAVAILABLE`, chưa có cặp prediction hoặc usage để đối chiếu. Đây là các lượt API riêng sau phần chuẩn bị offline, không phải kết quả của lệnh retrieval. Không tự retry hoặc đổi input/model; xem [báo cáo hai lượt gọi](E:/NCKH/code-graphrag-microservices/tasks/research/P01_GEMINI_PAIRED_ATTEMPT_2026-10-13.md). Smoke graph-assisted v1 bước 3 đã đạt ngày 12/10, không được dùng thay một nhánh của cặp v2.

## Đầu vào và cách tái sử dụng

- PetClinic baseline `3858f9c630cf989bb6809a86edf47c2be78dc9f1`; chỉ ba file Java đã đóng gói trong demo bước 2.
- Code của Hiển tại `e95613795133088621117179c9fb9592dab62b16`, clone riêng trong `handoff-out/p01-step1-20261012-02747b5d/implementation`.
- Tái sử dụng nguyên `ASTCodeChunker`, `ChromaBaselineStore`, `query_impact`. Adapter upsert cùng representation của `index_files` nhưng nguồn text lấy từ packet có checksum/allowlist, không glob repo hoặc đọc nhãn. Hàm scorer smoke `compare_with_graph_hops` bị chặn, không dùng graph làm oracle.
- Cache model riêng của bước 1, archive SHA-256 `913d7300ceae3b2dbc2c50d1de4baacab4be7b9380491c27fab7418616a16ec3`.
- Python image đã có `sha256:63c6e72e510d658265cf956b0e589ec7b55c6049b766b6b68120253f7ee06281`; chromadb 1.5.9 và Tree-sitter đã pin. Không tự pull image hoặc tải model.

Corpus, query và top-k dùng cho cả hai cấu hình. Query được tạo tất định từ seed và các dòng thay đổi trong proposed patch, không thêm tên các caller mong đợi hoặc log runtime. Top-k mặc định 5, depth 2, ceiling 32768 byte; đây là cấu hình pilot, không phải kết quả tuning/test chính thức.

## Chạy một lượt offline

Bật Docker Desktop và đợi Linux engine sẵn sàng. Từ thư mục repository:

```powershell
node scripts/run_p01_retrieval.mjs --top-k 5 --depth 2 --context-bytes 32768
```

Container mới dùng `--network none`, root filesystem chỉ đọc, không Docker socket/port, không truyền environment credential. Code và model cache chỉ đọc; database mới riêng cho từng run. Model cache được kiểm archive và sáu file giải nén khớp archive, hash trước/sau. Thiếu cache hoặc code/dependency lệch thì dừng, không tải hoặc sửa implementation của Hiển.

Kết quả trong `handoff-out/p01-retrieval/<run-id>/`, Git ignored. Giữ các run cũ, không ghi đè. Container tự dọn; database/evidence giữ lại. `chroma-db` là cache runtime, không phải file evidence immutable. Thư viện có thể tạo session file tên khác thường ở run root; file được giữ và ghi checksum, không stage vào Git.

## Hai request được chuẩn bị

| Cấu hình | Source trong context | Graph trong context |
| --- | --- | --- |
| `vector_retrieved` | Top-k AST chunk, seed method và class header của các chunk được chọn | Không có cạnh, path, query Neo4j hoặc graph-selected source |
| `graph_vector` | Đúng cùng source excerpt/patch/query/ranking/universe như hàng trên | Thêm cạnh/đường Neo4j đã lưu, theo depth 1/2/3 |

Đây là đối chứng **thêm graph vào cùng vector context**. Chưa phải phương pháp đầy đủ gồm contract-aware filtering hoặc traversal từ vector seeds. Không thay nhãn benchmark hay bắt Vector RAG trả những method graph đã tìm được.

Context/request v2 dùng chung prompt `p01-static-impact/1` và output schema Method với v1. `raw_sha256` của source excerpt là hash file baseline gốc; `text_sha256` kiểm chính đoạn source được cấp. Citation trả dòng baseline thật. Các request v1 cũ giữ nguyên hash và vẫn được hỗ trợ; `source_only` v1 không bị đổi tên thành Vector RAG.

Các file chính:

- `input.json`, `corpus.json`, `retrieval.json`: corpus/query/ranking thật, model/code/dependency identity, distance và token audit embedding.
- `vector-request.json`, `graph-vector-request.json`: prompt/context/output schema/checksum, chưa có response.
- Hai `*-provider-request.json`: payload Gemini offline; không key hoặc lượt gọi.
- `experiment-plan.json`: điều kiện chung và các gate chưa khóa; không score.
- `code-provenance-before/after.json`, `docker-command.json`, stdout/stderr, `run.json`, `checksums.sha256`.

## Kiểm chứng artifact

```powershell
node scripts/check_p01_retrieval_run.mjs --run PATH_TO_RUN
node scripts/check_p01_retrieval_run.mjs --run NEW_RUN --compare PREVIOUS_RUN
```

Checker chỉ đọc: kiểm path/checksum, full corpus đối chiếu baseline, dựng lại context/request/provider plan, xác nhận điều kiện chung, và so hai run khi được yêu cầu. Thất bại không được đổi artifact thành pass. Checksum/provenance không tự biến dữ liệu thành ground truth hoặc chứng minh ý nghĩa của prediction.

Tests offline:

```powershell
node --test reasoning/p01/retrieval.test.mjs reasoning/p01/gemini.test.mjs reasoning/p01/reasoning.test.mjs demo/p01/demo.test.mjs
node scripts/check_p01_demo_browser.mjs
```

Test Python guards: chạy `reasoning/p01/retrieval-probe.test.py` trong image Python đã pin, mount thư mục `reasoning/p01` tại `/adapter` chỉ đọc, network none và tmpfs `/tmp`. Các test dùng input/ranking tổng hợp trong memory, không lưu chúng thành model/retrieval evidence.

## Giới hạn quan trọng

- Đây là seed-known pilot ba file; AST corpus có 13 chunk, trong khi shared prediction registry chỉ có 5 method kỹ thuật của parser. **Registry này không phải evaluation universe độc lập đã được reviewer phê duyệt.** Các helper khác có thể có trong source/chunks nhưng không nằm trong schema prediction hiện tại.
- Distance là squared L2, nhỏ hơn nghĩa gần hơn trong không gian embedding, không phải xác suất tác động. Không dùng phép `similarity` tùy ý trong legacy smoke code để kết luận độ tin cậy.
- ONNX MiniLM của Chroma có cap embedding 256 token ([source 1.5.9](https://github.com/chroma-core/chroma/blob/1.5.9/chromadb/utils/embedding_functions/onnx_mini_lm_l6_v2.py)). Report đo query/doc trước truncation; context LLM vẫn giữ nguyên toàn AST excerpt được chọn. Không nhầm token embedding với token Gemini.
- Cùng ceiling byte **không có nghĩa cùng số token/context cost**. Context graph dài hơn; chờ token usage thật và thiết kế budget trước thực nghiệm chính thức. Giá trị thời gian/usage LLM/cost chưa có vẫn null.
- Graph dùng query đã ghi của P01, không live Neo4j; depth 3 không có đường 3-hop mới trong corpus này.
- Viewer hiện vẫn chuẩn bị context v1; luồng retrieval v2 là CLI và JSON bàn giao, chưa thêm menu retrieval vào browser. Không sửa bundle evidence cũ.
- Top-5 hiện đều ở provider Visits; không tự coi các chunk này là behavioral-impact labels, và chưa dùng điểm số để chọn lại top-k/prompt.
- Chưa có LLM response, so sánh chất lượng, F1/Ragas, split khóa hoặc đóng góp khoa học được chứng minh. P01 vẫn `pending_review`.

Khi Gemini sẵn sàng, cần xác nhận riêng các lượt gọi và giữ cùng model/config cho hai request. API smoke thành công cũng không mở quyền chấm benchmark trước review hoặc dùng prediction để sửa nhãn.
