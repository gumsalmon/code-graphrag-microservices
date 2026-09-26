# Hướng dẫn trưởng nhóm rà soát P01

## Bắt đầu bằng đánh giá độc lập

Reviewer mở **`benchmark/p01/SOURCE_FIRST_REVIEW.md` trước** và hoàn thành phiếu từ source, patch, contract và raw runtime. Ghi thời điểm cùng nhận định độc lập trước khi đọc phần còn lại của hướng dẫn này, `HANDOFF.md`, `evidence_manifest.json` hoặc bất kỳ `labels.v*.json` nào. Phần dưới là vòng đối chiếu và quyết định sau khi phiếu đã hoàn thành. Tài liệu `PROJECT_CONTEXT.md` từng nêu tuyến ứng viên, nên không gọi quy trình này là blind hoàn toàn.

## 1. Mục tiêu của lần rà soát này

Đề nghị trưởng nhóm xác nhận protocol v0.2 trước khi mở P02–P04 và chỉ định một reviewer độc lập để quyết định bộ nhãn P01. V0.1 được giữ để truy vết quá trình tạo `labels.v3.json`. P01 hiện có đủ bằng chứng kỹ thuật nhưng vẫn ở trạng thái `pending_review`; chưa phải ground truth `accepted`.

Review này không nhằm kết luận GraphRAG tốt hơn Vector RAG và không rà soát chất lượng output parser/Neo4j/RAG/LLM.

## 2. Nên gửi gì

Cách tốt nhất là gửi branch `Pham_Nguyen_Phat` kèm commit mới chứa toàn bộ tài liệu và bằng chứng. Không nên chỉ gửi ảnh chụp hoặc riêng file kết quả JSON vì reviewer cần kiểm tra provenance và truy ngược về raw evidence.

Bộ file reviewer đọc **sau khi hoàn thành phiếu độc lập** theo thứ tự:

1. `benchmark/p01/HANDOFF.md` — tóm tắt trạng thái, kết quả và nội dung cần quyết định.
2. `benchmark/protocol/benchmark_protocol_v0.2.md` — protocol đề nghị phê duyệt, gồm impact, hop, evidence, scoring, ID mapping và split.
3. `benchmark/protocol/benchmark_protocol_v0.1.md` — phiên bản lịch sử đã dùng khi tạo nhãn v3.
4. `benchmark/p01/scenario.json` — định danh scenario, commit, patch, fixture và seed.
5. `benchmark/p01/evidence_manifest.json` — ánh xạ từng kết luận tới bằng chứng.
6. `benchmark/p01/derived/runtime_rerun_report.md` — tóm tắt ma trận runtime sạch.
7. `benchmark/p01/labels.v3.json` — đối chiếu nhãn dự thảo với nhận định độc lập đã ghi.
8. `benchmark/p01/review_log.md` — lịch sử và nơi reviewer ghi quyết định.
9. `benchmark/p01/checksums.sha256` — kiểm tra tính toàn vẹn của artifact trước review.
10. `benchmark/p01/CHECKSUM_PROCESS.md` — cách khóa quyết định sau review mà không sửa file nhãn.

Bằng chứng chi tiết để đối chiếu khi cần:

- `benchmark/p01/raw/rerun-20260923-152742/` — bản chạy có thẩm quyền cho `labels.v3.json`.
- `benchmark/p01/raw/rerun-20260923-214211/` — lần chạy tự động xác nhận khả năng tái lập.
- `benchmark/p01/derived/results/rerun-20260923-214211-benchmark-result.json` và file `.sha256` — kết quả máy đọc được của lần xác nhận.
- `scripts/run_p01_runtime.ps1`, `scripts/run_p01_benchmark.ps1`, `scripts/export_p01_benchmark_json.ps1` — runner và bước xuất kết quả.

Các file `labels.v1.json` và `labels.v2.json` chỉ phục vụ lịch sử phiên bản. Các thư mục chạy lỗi/timing được giữ để audit nhưng không phải bằng chứng chính.

## 3. Danh sách kiểm tra cho người rà soát độc lập

### A. Nguồn gốc và định danh

- [ ] Baseline commit là `3858f9c630cf989bb6809a86edf47c2be78dc9f1`.
- [ ] Config revision là `323993ce2519c6d02df63e08bf4458d123d3b611`.
- [ ] Patch SHA-256 là `42394ca361d07db58ba6a73cfc1ddb8bd1d9aeddb59292873552573adfa5cc21`.
- [ ] Ba source snapshot khớp checkout chính thức.
- [ ] Baseline và mutated có image identity riêng

### B. Quy trình benchmark

- [ ] Seed bị loại khỏi impact score.
- [ ] `behavioral_impact` được tách khỏi `requires_code_change`.
- [ ] Logical hop được tính từ source/contract, không lấy từ graph đang được đánh giá.
- [ ] Quy tắc negative, freeze/versioning và kiểm soát leakage đủ rõ để dùng cho P02–P04.
- [ ] Precision/Recall/F1 được tính riêng cho Method/API/Service, dùng behavioral impact làm nhãn chính.
- [ ] Prediction chưa có nhãn bị ghi `unjudged` và chặn score chính thức cho đến khi adjudicate.
- [ ] ID baseline/mutated chỉ được đối chiếu bằng canonicalization/alias có bằng chứng, không fuzzy-match theo tên.
- [ ] P01 thuộc development/pilot và duplicate group không được tách sang cả development lẫn test.

### C. Thực thi runtime

- [ ] Baseline direct trả `200` và bốn visit.
- [ ] Baseline gateway trả `200` và bốn visit.
- [ ] Mutated direct thiếu `includeDetails` trả `400`.
- [ ] Mutated direct có `includeDetails=true` trả `200` và bốn visit.
- [ ] Mutated gateway trả `200` nhưng tổng visit bằng 0.
- [ ] Có bằng chứng gateway đã đi tới visits-service mutated, không phải lỗi cache/discovery.
- [ ] Negative endpoint trả cùng status/body ở baseline và mutated.

### D. Nhãn

- [ ] `P01-METHOD-001` đúng là positive, behavioral impact `true`, cần sửa mã và hop 1.
- [ ] `P01-METHOD-002` đúng là positive, behavioral impact `true`, không bắt buộc sửa mã theo repair strategy hiện tại và hop 2.
- [ ] `P01-API-001` đúng là positive và hop 2.
- [ ] `P01-SERVICE-001` đúng là positive ở cấp service.
- [ ] Hai nhãn negative đúng tiêu chí và không bị ảnh hưởng.
- [ ] Mỗi nhãn có evidence reference kiểm tra được.

### E. Tính toàn vẹn và giới hạn

- [ ] SHA-256 của `labels.v3.json` khớp `3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce`.
- [ ] Không dùng output parser/Neo4j/RAG/LLM làm bằng chứng nhãn.
- [ ] Ghi nhận expectancy bias và giới hạn của một pilot tổng hợp duy nhất.

## 4. Người rà soát cần trả lại gì

Reviewer điền phần cuối `benchmark/p01/review_log.md` gồm:

- họ tên;
- thời điểm review;
- quyết định `approve`, `request_changes` hoặc `unable_to_review`;
- các file/bằng chứng đã kiểm tra;
- đường dẫn và thời điểm khóa phiếu nhận định độc lập, cùng các điểm khác biệt so với nhãn dự thảo;
- nhận xét hoặc danh sách sửa cụ thể;
- chữ ký/xác nhận.

Reviewer đồng thời điền `benchmark/p01/review_decision.v1.json`. Nếu `approve`, đặt `audit_decision` thành `accepted`; các quyết định khác không được dùng trạng thái này. Sau đó chạy:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_p01_checksums.ps1 -Mode WriteReview
```

Lệnh tạo `checksums.review.v1.sha256` để khóa manifest artifact, nhật ký và file quyết định. Nếu `request_changes` làm thay đổi nhãn, phải tạo `labels.v4.json` cùng checksum mới; không sửa trực tiếp `labels.v3.json`.

## 5. Nội dung tin nhắn có thể gửi trưởng nhóm

> Em gửi anh bộ hồ sơ P01 trên branch `Pham_Nguyen_Phat`. V0.1 được giữ để truy vết; protocol v0.2 đã bổ sung scoring theo Method/API/Service, xử lý unjudged, đối chiếu ID baseline/mutated và chia development/test chống trùng lặp. Phần provenance, ma trận runtime sạch, negative case và checksum nhãn đã hoàn tất; trạng thái hiện là `pending_review`. Nhờ anh duyệt protocol v0.2 và chỉ định một người khác em rà soát `labels.v3.json` theo `benchmark/p01/REVIEW_GUIDE.md`. P01 vẫn là pilot, chưa dùng để kết luận GraphRAG tốt hơn baseline và chưa mở P02–P04.
