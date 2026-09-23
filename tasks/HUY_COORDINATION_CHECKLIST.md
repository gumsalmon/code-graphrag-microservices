# Checklist điều phối P01 cho Huy

Ngày cập nhật: 23/09/2026

Trạng thái: sẵn sàng giao việc; chưa có task nào được nghiệm thu.

## 1. Giao cho Phát

Gửi:

- `PROJECT_CONTEXT.md`.
- `tasks/PHAT_P01_INDEPENDENT_BENCHMARK.md`.
- `tasks/P01_INPUT_AUDIT.md`.
- Branch đã có: `Pham_Nguyen_Phat`, hiện trỏ tới commit gốc `7008cba6fa1d3f6ee5235774be7e1f5679b06b3d`.
- Checkout PetClinic đúng commit `3858f9c630cf989bb6809a86edf47c2be78dc9f1` hoặc link commit cố định.
- Gói bằng chứng được phép ở bảng dưới.

| Được gửi trước khi khóa nhãn | Trạng thái sử dụng |
|---|---|
| `mutation.patch` | Đầu vào thay đổi; phải kiểm tra áp dụng trên đúng commit |
| `test_baseline.ps1`, `test_mutated.ps1` | Script lịch sử; phải audit và sửa cách chạy nếu cần, không mặc định là đúng |
| `build_baseline.log`, `build_mutated.log` | Bằng chứng build/provenance hỗ trợ |
| `api_gateway_mutated.log` | Raw runtime log; Phát tự tìm bằng chứng liên quan |
| `baseline_results.log`, `run_mutated_results.log` | Evidence hỗ trợ; phải đối chiếu bằng rerun sạch |
| `run_baseline_results.txt`, `run_mutated_results.txt` | Giữ làm raw failure history, không dùng một mình để xác nhận hành vi |
| `docker-compose-test.yml` | Cấu hình tái hiện lịch sử; phải kiểm tra image/cache/isolation |

Chưa gửi cho Phát trước khi Phát ghi nhận định độc lập và checksum nhãn:

- `p01_label.md`.
- `report.md`.
- JSON parser, Cypher, kết quả Neo4j, output GraphRAG/Vector RAG/LLM hoặc benchmark score.
- `PROJECT_CONTEXT.md` đã chứa giả thuyết/tuyến ứng viên nên không thể coi P01 là blind tuyệt đối; Phát phải ghi đây là limitation.

Yêu cầu Phát trả lời xác nhận theo mục 2 của task packet trước khi bắt đầu. Không chấp nhận câu trả lời chỉ nói “đã hiểu”.

Để tránh gửi nhầm file bị cách ly, tạo ZIP bằng:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/prepare_phat_p01_handoff.ps1
```

Script kiểm tra commit/source sạch, đóng gói input được phép, tạo `PACKAGE_METADATA.json` và `checksums.sha256`, đồng thời loại draft label/report và output hệ thống. Output nằm trong `handoff-out/` và không được Git track.

## 2. Giao cho Hiển

Gửi:

- `PROJECT_CONTEXT.md`.
- `tasks/HIEN_P01_NEO4J_E2E.md`.
- Link repository và branch `hien/graphrag-parser-benchmark`.
- Commit đầu vào đã kiểm tra: `3e28fe5b3ddc6d605de68db7f87b0808bad65917`.

Không gửi label draft của P01 cho Hiển. Hiển chỉ cần biết seed/change input và tiêu chí kỹ thuật của pipeline; output của Hiển không quyết định ground truth.

Yêu cầu Hiển tạo branch mới từ commit/branch trên, gửi lại tên branch, commit gốc, phiên bản Python/Docker/Neo4j và kế hoạch test trước khi sửa.

## 3. Hai quyết định Huy phải ghi bằng tên thật

- [ ] Ai là người đã lập `p01_label.md` bản nháp? Không suy đoán từ metadata file.
- [ ] Ai là reviewer thứ hai nếu Phát trực tiếp lập hoặc sửa nhãn thay vì chỉ review bản nháp?

Nếu chưa có reviewer thứ hai, bộ nhãn phải giữ `pending_review`; không gọi là ground truth chính thức.

## 4. Điểm kiểm soát tiến độ

### Checkpoint A — xác nhận nhận việc

- [ ] Phát trả đúng mục tiêu, input được phép, output, ranh giới blind và blocker.
- [ ] Hiển trả đúng branch/commit, lỗi cần sửa, test thất bại cần bổ sung và artifact dự kiến.

### Checkpoint B — review thiết kế trước khi chạy dài

- [ ] Protocol draft của Phát phân biệt behavioral impact với requires-code-change.
- [ ] Protocol có versioning, checksum, reviewer và leakage control.
- [ ] Thiết kế của Hiển chọn được đúng một snapshot, fail-fast và trả non-zero khi lỗi.
- [ ] E2E của Hiển bắt đầu từ source/parser mới chạy, không dùng Cypher cũ làm điểm bắt đầu.

### Checkpoint C — bàn giao kỹ thuật

- [ ] Hiển nộp test, log, JSON, Cypher, Neo4j query result và exit code.
- [ ] Chạy baseline và mutated cách ly; không trộn graph giữa hai snapshot.
- [ ] Seed bị loại khỏi impact set trong kết quả truy vết.

### Checkpoint D — bàn giao benchmark

- [ ] Phát nộp protocol, scenario manifest, evidence manifest, label file và review log.
- [ ] Label được checksum trước khi xem output hệ thống.
- [ ] Có hai người khác nhau ở vai trò annotator/reviewer.
- [ ] Bất đồng và thiếu evidence được giữ nguyên, không ép nhãn.

## 5. Tin nhắn ngắn để gửi kèm

### Cho Phát

> Đọc toàn bộ `PROJECT_CONTEXT.md`, sau đó làm đúng `tasks/PHAT_P01_INDEPENDENT_BENCHMARK.md`. Kết quả cần đạt không phải là xác nhận giả thuyết hiện có, mà là một protocol tái sử dụng và kết luận P01 có provenance, evidence, checksum, review log. Nếu evidence chưa đủ, kết quả đúng là `pending_review`, kèm danh sách cần tái chạy. Trước khi làm, gửi lại bản xác nhận 5 mục theo task packet.

### Cho Hiển

> Đọc toàn bộ `PROJECT_CONTEXT.md`, sau đó làm đúng `tasks/HIEN_P01_NEO4J_E2E.md` từ branch `hien/graphrag-parser-benchmark`, commit gốc `3e28fe5`. Kết quả cần đạt là pipeline source → parser → Cypher mới → Neo4j cách ly → query 1/2-hop có test và exit code đáng tin cậy; không phải chỉ mở Neo4j thấy graph. Trước khi sửa, gửi lại branch mới, môi trường, lỗi đã hiểu và kế hoạch test.
