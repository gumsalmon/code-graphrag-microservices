# Đóng hồ sơ kỹ thuật P01 và chuẩn bị P02–P04

Ngày kiểm: 15/10/2026. Đây là báo cáo kết quả đã chạy và thay đổi điều phối, không phải quyết định reviewer hoặc kết quả bài báo.

## Kết luận

Hồ sơ P01 qua kiểm toàn vẹn, source candidate cuối chạy 111/111 test không skip, viewer qua 20 nhóm kiểm, và một lượt prepare mới chạy parser/Neo4j/Chroma thật theo contract unknown mới. **Chưa thể nghiệm thu P01 trọn vẹn:** Graph+Vector chưa có phản hồi hợp lệ cùng contract mới, nhãn còn pending_review và code mới chưa commit/push.

Huy đã đồng ý chuẩn bị/phát triển P02–P04 trước một đợt review gộp. Đã cập nhật PROJECT_CONTEXT v0.4, kế hoạch, sổ ứng viên và packet từng vai trò. Mới đề xuất candidate sau kiểm source, chưa tạo patch/universe/nhãn/runtime các ca này và chưa xác nhận thành viên đã nhận task mới.

## 1. Provenance và phạm vi

- Branch: `codex/p01-evidence-demo`; HEAD nền `d1f95eb21c71dd6bfb49d2e450142d1290ceda5f`. Working tree có thay đổi từ các lượt trước và lượt này; không gọi HEAD đó là commit chứa tính năng mới.
- Implementation Hiển: `e95613795133088621117179c9fb9592dab62b16`.
- PetClinic source baseline: `3858f9c630cf989bb6809a86edf47c2be78dc9f1`; prepare dùng byte source trong bundle kỹ thuật đã checksum, đối chiếu fixture implementation, không checkout toàn PetClinic trong container.
- Benchmark Phát được kiểm metadata tại `5f9204d66253604edf9101c2f888fc7e75aa0be7`; labels.v3 SHA-256 giữ `3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce`. Audit hash byte, không đọc nội dung nhãn làm đáp án dự đoán/chấm điểm. Không khẳng định đã fetch trạng thái remote mới nhất hoặc chạy lại toàn bộ checksum benchmark của Phát trong lượt này.
- Không sửa raw evidence, nhãn, output legacy, gói reviewer đã frozen; không stage/commit/push/merge, gửi tin nhắn hoặc mở PR. Không tự thêm tên/decision người review.

## 2. Gemini: một attempt Graph+Vector bổ sung, vẫn lỗi

Đầu vào: request đã chuẩn bị trong `handoff-out/p01-contract/20261015T064526833Z-96bc2152`, không thay model/prompt/schema/config để né lỗi. Preflight 8/8 file; chín code hash reasoning khớp Vector thành công trước khi gọi.

```powershell
node scripts/run_p01_reasoning.mjs live --provider gemini --request handoff-out/p01-contract/20261015T064526833Z-96bc2152/graph-vector-request.json --confirm-send --confirm-free-tier
```

- Run: `handoff-out/p01-reasoning/20261015T075831543Z-failed-82a85f89`.
- HTTP 503 `UNAVAILABLE`, thông báo provider high demand; elapsed 2070 ms, remote_calls 1, retry_count 0, usage/cost null. Không có prediction/validated result. CLI báo thất bại; không đổi lỗi thành pass.
- Đây là attempt thủ công bổ sung, không phải retry tự động trong adapter. Giữ cả attempt Graph 503 trước đó `20261015T070330765Z-failed-1f789489`. Không gọi thêm API sau lỗi mới này.
- Vector hợp lệ trước đó: `20261015T070159953Z-live-f5d5fdd6`; hai record pure abstention không phải nhãn âm. Không ghép response graph legacy để tuyên bố cặp mới đã xong.

Comparison mới: `handoff-out/p01-comparison/20261015T081222218Z-306e382a/comparison.json`, SHA-256 `2ad0fa10163d18e3a6fe7227327f7b40be8808ce0118ce62a41e28627cc8f9db`. Kiểm Vector 7/7 artifact, Graph 4/4; một phía hợp cấu trúc, một phía no_prediction, không score.

## 3. Prepare mới bằng Docker, không model

```powershell
node scripts/run_p01_pipeline.mjs prepare --implementation handoff-out/p01-step1-20261012-02747b5d/implementation --model-cache handoff-out/p01-step1-20261012-02747b5d/model-cache
node scripts/check_p01_pipeline.mjs --run handoff-out/p01-pipeline/20261015T082522708Z-0539ac7d
```

Hai lệnh exit 0. Run mới `20261015T082522708Z-0539ac7d` đạt `prepared_fresh_graph_and_retrieval_no_llm`, checker `verified_fresh_preparation_not_ground_truth`, 46/46 file. Chạy mới baseline/mutated parser → Cypher → Neo4j, database trống trước import, import lặp idempotent; Chroma thật network none/cache read-only. Không dùng graph lịch sử thay lượt Neo4j mới, không gọi model hoặc đọc labels.

- Docker engine 29.8.0; Neo4j 5.26.0 theo digest đã pin.
- Python image ID thực: `sha256:3a89901c72e437213648b05f0176e56fd3c2b6f556523d9e0e75f81cd9e5fb64`, khác image ID lưu ở run 13/10; không mô tả là toàn bộ môi trường byte-identical với lượt đó. Không build/pull image trong lượt này. Dependency chính được kiểm/ghi trong môi trường run.
- Python 3.11.16; tree-sitter 0.25.2, tree-sitter-java 0.23.5, tree-sitter-go 0.25.0, chromadb 1.5.9, neo4j Python driver 5.28.1. Retrieval ghi ONNX runtime 1.31.0, tokenizers 0.23.3 và 13 chunks.
- Vector request `51ee656454835119fa03f3973ecc2e988d2997a29a5842c486596c9e3d93001d`; Graph request `cc26636ced4eae74a8150638fa06d71de0e6c3abd4f03ef0996a764bc0e511e8`. Graph hash khác request đã gọi Gemini vì provenance/run ID mới; không gán response cũ cho request mới.
- Manifest SHA-256 `aa3e8acdb4dce3d89ad19165dfaf8467ad8922126e40c88450ff537aa362fe49`.
- Docker query theo đúng label run sau hoàn tất không còn container/network. Không xóa dữ liệu hay container khác.

Đây không phải chạy lại hành vi HTTP của ứng dụng PetClinic, 59-test suite lịch sử của Hiển hoặc một thí nghiệm có ground truth mới. Bằng chứng runtime/59-test độc lập trước đó giữ nguồn và ngày cũ.

## 4. Audit, tests, browser và gói source

### Audit

```powershell
node scripts/audit_p01_closeout.mjs --comparison-file handoff-out/p01-comparison/20261015T081222218Z-306e382a/comparison.json --contract-run handoff-out/p01-contract/20261015T064526833Z-96bc2152 --pipeline-run handoff-out/p01-pipeline/20261015T082522708Z-0539ac7d
```

Exit 0; audit mới `handoff-out/p01-closeout/20261015T082832078Z-79137577/audit.json`, SHA-256 `6a1b29e637941a860aa3371ec566ece6d3b36c37db30613cae33e7aa4c35978a`. Xác nhận 8 contract / 46 pipeline / 7 Vector / 4 Graph files, frozen label hash và guard sổ chuẩn bị. `pipeline_requests_match_model_requests=false` được ghi thật, không che hai lượt có provenance khác nhau.

`full_research_complete=false`, `ground_truth_accepted_by_this_audit=false`, `official_scoring_authorized=false`. Open items gồm cặp inference, quyết định nhãn độc lập, quyền khóa test/chấm riêng, và công bố remote chưa xác minh. Exit 0 là đạt audit toàn vẹn, **không phải tất cả công việc đã xong**.

### Tests và browser

```powershell
node --test reasoning/p01/abstention.test.mjs reasoning/p01/comparison.test.mjs reasoning/p01/comparison-files.test.mjs reasoning/p01/retrieval.test.mjs reasoning/p01/reasoning.test.mjs reasoning/p01/gemini.test.mjs demo/p01/demo.test.mjs pipeline/p01/pipeline.test.mjs pipeline/p01/closeout.test.mjs
node scripts/check_p01_demo_browser.mjs --comparison-file handoff-out/p01-comparison/20261015T081222218Z-306e382a/comparison.json
```

Node suite: 111/111, 0 fail, 0 skip, exit 0. Chạy cả tại workspace và bản source candidate; lần cuối trên candidate `20261015T083105614Z-ca7aed76/files` sau bổ sung guard file bàn giao cũng 111/111. Test DPAPI dùng chuỗi tổng hợp dưới Windows profile thật, transport dùng fixture, không gọi API.

Browser Chrome 155.0.8059.40: 20 nhóm kiểm đạt, desktop 1440/mobile 390/file://; không browser error hoặc external request. Báo cáo `handoff-out/p01-demo-qa-20261012/20261015T082400811Z-412891e9/browser-report.json`. Đã xem screenshot comparison desktop: trạng thái Vector đạt cấu trúc, Graph lỗi, unknown không phải negative hiển thị riêng; không F1 hoặc approval badge giả. Viewer không xác minh provider/model từ JSON do người dùng nhập.

### Source candidate, chưa công bố

`node scripts/package_p01_candidate.mjs` tạo gói cuối `handoff-out/p01-candidate/20261015T083105614Z-ca7aed76`:

- 55 file, 847356 byte; kiểm lại 55/55 checksum, không mismatch.
- `publication-scope.json` SHA-256 `bb5f337d135fd4970b4da4013274c07921a9d5481e9e783044d51e3dd32c2499`.
- Allowlist gồm code/tests/docs P01 và plan/register/packet hiện hành, không lấy nguyên dirty working tree.
- Loại credentials, cache/database, raw Gemini outputs, reviewer packages và literature work. Các tài liệu reviewer điều phối có chỉnh cục bộ không bị gộp ngầm vào candidate kỹ thuật này.
- Không phải checkout Git sạch hoặc một commit mới; tests trên candidate không được báo như đã kiểm SHA chưa tồn tại. Một số link báo cáo lịch sử trỏ hồ sơ riêng ngoài gói; clone/copy candidate không kèm toàn bộ lịch sử bàn giao.

## 5. Kế hoạch P02–P04 và phân vai

Tài liệu hiện hành:

- [P01 closeout](../P01_CLOSEOUT.md).
- [Kế hoạch P02–P04](../P02_P04_EXECUTION_PLAN.md).
- [Sổ ứng viên](../P02_P04_RESEARCH_REGISTER.json).
- [Task packet](../P02_P04_TASK_PACKETS.md).
- [Review gộp hai bước đọc](../p01-reviewer/NEXT_REVIEW_MILESTONE.md).

P02 đề xuất REST query tùy chọn/default làm paired control, cùng duplicate group P01; P03 đề xuất đổi field response đơn lẻ và quan sát consumer thật, không gán trước status; P04 đề xuất gRPC protobuf tag mismatch ở Online Boutique candidate pin `38e7348eb289eb5b87c0c6e8cb19ced0449dc389`, phải qua baseline local feasibility. Source đã đọc, chưa chạy ca mới. Bốn ca không đủ làm bằng chứng hiệu quả tổng quát hoặc coi là nhiều mẫu độc lập theo số method.

Hiển: extraction/resolver/Neo4j/Chroma và technical evidence, không ground truth. Phát: lựa chọn ca/inventory/universe/raw evidence/draft độc lập, không parser hoặc self-approval. Huy: chốt phạm vi/điều phối/phương pháp, không tự duyệt nhãn. Reviewer khác annotator: source-first notes trước, so nhãn sau; mới accepted nếu có quyết định thật. Repository public nên phải khai báo exposure, không hứa blinding được bảo đảm bằng ZIP.

Thứ tự: G0 chọn ca và xác nhận nhận việc → G1 baseline → G2 patch/fixture/universe/hash → G3 raw evidence/draft → G4 development → G5 review gộp → G6 phê duyệt test/scoring riêng. Mỗi ca đi tuần tự P02 rồi P03 rồi P04 feasibility; không mở cả ba mutation chỉ từ tên scenario. Nhóm tiếp tục việc hợp lệ không cần chờ provider/reviewer; chỉ dừng ở gate cần quyết định người thật.

## 6. Những việc chưa làm

Không có runtime, patch đã khóa, universe, draft labels hoặc test split P02–P04 mới. Chưa có output/scorer contract đủ Method/API/Service cho bài báo, lexical/contract-aware baseline mạnh, token-matched ablation hoặc accepted benchmark. Chưa gửi packet cho thành viên/reviewer và chưa xác nhận họ nhận việc. Không tuyên bố toàn dự án phải dừng hoặc P01 hoàn thành nghiên cứu chỉ vì tài liệu này đã có.
