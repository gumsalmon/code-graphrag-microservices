# Bàn giao rà soát benchmark độc lập P01

**Thứ tự cho reviewer:** mở `benchmark/p01/SOURCE_FIRST_REVIEW.md` và hoàn thành nhận định từ source/patch/raw runtime trước khi đọc tài liệu bàn giao này hoặc `labels.v3.json`. Tài liệu dưới đây chứa kết luận dự thảo để đối chiếu ở vòng hai.

Task: rà soát benchmark độc lập P01

Branch: `Pham_Nguyen_Phat`

Commit runner gần nhất trước khi lập gói review: `69f12fc`. Các thay đổi Việt hóa và gói review cần được commit trước khi gửi branch cho trưởng nhóm.

Phiên bản tạo `labels.v3.json`: `0.1` (giữ nguyên để truy vết)

Phiên bản đề nghị dùng để review/chấm điểm: `0.2`

Baseline commit / config revision / patch hash:

- `3858f9c630cf989bb6809a86edf47c2be78dc9f1`
- `323993ce2519c6d02df63e08bf4458d123d3b611`
- `42394ca361d07db58ba6a73cfc1ddb8bd1d9aeddb59292873552573adfa5cc21`

Kết quả kiểm tra đầu vào: 18/18 entry trong package khớp manifest được cung cấp. Ba snapshot source cũng khớp từng byte với checkout mới từ repository chính thức.

## 1. Tệp bàn giao chính

- `benchmark/protocol/benchmark_protocol_v0.1.md`
- `benchmark/protocol/benchmark_protocol_v0.2.md`
- `benchmark/p01/scenario.json`
- `benchmark/p01/labels.v1.json` — đã bị thay thế, giữ bất biến
- `benchmark/p01/labels.v2.json` — đã bị thay thế, giữ bất biến
- `benchmark/p01/labels.v3.json` — bản khóa tạm thời hiện hành
- `benchmark/p01/evidence_manifest.json`
- `benchmark/p01/review_log.md`
- `benchmark/p01/checksums.sha256`
- `benchmark/p01/review_decision.v1.json`
- `benchmark/p01/CHECKSUM_PROCESS.md`
- `benchmark/p01/raw/`
- `benchmark/p01/derived/`

## 2. Lệnh chạy và bằng chứng runtime

Lệnh chạy thủ công: `scripts/run_p01_runtime.ps1`.

Lệnh chạy trọn quy trình và xuất JSON: `scripts/run_p01_benchmark.ps1`.

Docker 29.5.3 và Compose v5.1.4 đã chạy bằng hai image ID riêng cho baseline và mutated.

- Bản chạy có thẩm quyền dùng để lập `labels.v3.json`: `benchmark/p01/raw/rerun-20260923-152742/`.
- Báo cáo ngắn của bản chạy này: `benchmark/p01/derived/runtime_rerun_report.md`.
- Bản chạy tự động xác nhận khả năng tái lập: `benchmark/p01/raw/rerun-20260923-214211/`.
- JSON xuất tự động và checksum tương ứng: `benchmark/p01/derived/results/rerun-20260923-214211-benchmark-result.json` và file `.sha256` đi kèm.

Bản chạy lúc 21:42 chỉ là bằng chứng bổ sung sau khi nhãn v3 đã khóa. Nó không thay đổi ground truth và không thay thế quyết định của reviewer.

## 3. Quan sát đã tái hiện

- Đúng repository commit và tracked tree sạch.
- Snapshot source đúng định danh.
- Nội dung patch đúng và áp dụng được sau khi chuyển chính xác từ UTF-16LE sang UTF-8.
- Contract provider/client/controller và dependency ứng viên hai hop được xác định từ source.
- Contract chính thức của Spring xác nhận `RequestParam` mới là bắt buộc.
- Baseline hoạt động đúng khi gọi trực tiếp và qua gateway.
- Bản mutated trả `400` khi thiếu parameter và `200` khi truyền parameter hợp lệ.
- Gateway của bản mutated trả `200` nhưng danh sách visit rỗng, sau khi đã chứng minh request đi tới provider mutated.
- Negative overload không đổi giữa baseline và mutated.

Không còn quan sát runtime bắt buộc nào của protocol v0.1/v0.2 chưa tái hiện.

## 4. Trạng thái nhãn

Trạng thái: `pending_review`

Checksum và thời điểm khóa hiện hành:

- `labels.v3.json` SHA-256: `3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce`
- Thời điểm khóa: `2026-09-23T15:32:00+07:00`

Annotator: Phát

Reviewer: chưa được chỉ định. Huy cần chỉ định một người đủ điều kiện và khác Phát; AI không được tính là reviewer.

`checksums.sha256` chỉ khóa artifact kỹ thuật trước review và không chứa `review_log.md`. Sau khi reviewer ghi quyết định, chạy `scripts/update_p01_checksums.ps1 -Mode WriteReview` để tạo `checksums.review.v1.sha256`, khóa manifest artifact, nhật ký và file quyết định thành một gói hoàn chỉnh.

## 5. Điểm cần người rà soát quyết định

Reviewer cần kiểm tra và ghi quyết định cho năm nội dung:

1. Provenance: commit, config revision, patch hash, source snapshot và image identity có nhất quán không.
2. Runtime: ma trận baseline/mutated có đủ và gateway có thật sự đi tới provider mutated không.
3. Nhãn positive: method client, controller, API gateway và service có đúng behavioral impact/repair label không.
4. Nhãn negative: overload và endpoint đối chứng có hợp lệ, được chọn đúng tiêu chí và giữ nguyên hành vi không.
5. Hop: `logical_hop` và `service_boundary_crossings` có đúng theo source/contract, không lấy từ graph đang đánh giá không.
6. Scoring: cách tính Precision/Recall/F1 riêng theo Method/API/Service và xử lý unjudged có đủ rõ không.
7. Split/ID: quy tắc đối chiếu ID baseline/mutated và chống near-duplicate giữa development/test có phù hợp không.

Reviewer ghi một trong ba quyết định vào `review_log.md`: `approve`, `request_changes` hoặc `unable_to_review`.

## 6. Bất đồng và nội dung chưa giải quyết

- Patch gốc dùng UTF-16LE nên `git apply` không đọc trực tiếp; bản chuyển mã UTF-8 chính xác đã được ghi riêng.
- Còn thiếu danh tính và quyết định của reviewer.

## 7. Giới hạn và nguy cơ ảnh hưởng tính hợp lệ

- `PROJECT_CONTEXT.md` đã nêu tuyến ứng viên dự kiến, tạo nguy cơ expectancy bias; P01 không phải blind hoàn toàn.
- Các lần chạy lịch sử và các lần lỗi do timing/discovery được giữ lại nhưng không dùng cho kết luận nhân quả chính.
- P01 chỉ là một pilot dùng mutation tổng hợp, chưa đủ cho kết luận khái quát.
- Không dùng output parser, Neo4j, GraphRAG, Vector RAG, LLM hoặc benchmark score làm bằng chứng nhãn.

## 8. Bước tiếp theo

Huy chỉ định reviewer độc lập. Reviewer thực hiện checklist trong `REVIEW_GUIDE.md`, ghi quyết định vào `review_log.md` và `review_decision.v1.json`, sau đó tạo checksum sau review theo `CHECKSUM_PROCESS.md`. Nếu `approve`, file quyết định ghi trạng thái `accepted` mà không sửa `labels.v3.json`. Nếu yêu cầu sửa nhãn, phải tạo file label phiên bản mới; không sửa trực tiếp `labels.v3.json`.
