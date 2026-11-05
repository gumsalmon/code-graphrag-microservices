# Lượt 2 — đối chiếu dự thảo và ghi quyết định của người thật

Chỉ mở sau khi reviewer đã gửi Huy phiếu lượt 1, SHA-256 và thời điểm. Giữ phiếu gốc, ghi bổ sung/bất đồng ở hồ sơ riêng. Nếu đã mở sớm, ghi tiếp xúc đúng thực tế; không dựng lại nhận định “độc lập”.

Snapshot đầy đủ của branch benchmark nằm trong `repository/`, lấy từ commit `{{BENCHMARK_SHA}}`, không có thư mục `.git` hay file chưa được track. PR để xem/trao đổi: https://github.com/gumsalmon/code-graphrag-microservices/pull/2 . Head PR có thể thay đổi; **phiên review này chốt snapshot trên**, không tự chuyển sang head mới. Đây là PR của Phát về benchmark, không phải PR #1 của Hiển về implementation.

## Trình tự

1. Từ thư mục gói, chạy `powershell -NoProfile -ExecutionPolicy Bypass -File ./VERIFY_PACKAGE.ps1`. Từ `repository/`, chạy `powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/update_p01_checksums.ps1 -Mode VerifyArtifacts`. Gói hiện có 117 artifact P01 theo manifest gốc. Hash nhãn v3 phải là `3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce`.
2. Mở `repository/benchmark/p01/SOURCE_FIRST_REVIEW.md`, `REVIEW_GUIDE.md`, `CHECKSUM_PROCESS.md`, protocol v0.1/v0.2, `scenario.json`, `evidence_manifest.json`, `labels.v3.json`, derived report và summaries. Các tài liệu khác/PR nay được mở; kết quả hệ thống không được thay thế source/runtime làm căn cứ nhãn.
3. So sánh **từng nhãn**, tuyến, hop, seed exclusion, behavioral impact và requires-code-change với phiếu độc lập. Ghi đồng ý/bất đồng/unresolved và bằng chứng. Không đếm “test pass” thành “nhãn đúng”.
4. Điền bản sao `REVIEW_RETURN_TEMPLATE.md` ngoài gói. Reviewer chọn `approve`, `request_changes` hoặc `unable_to_review`; Huy/AI không chọn thay. Đánh giá điều kiện protocol cho P02–P04 riêng với độ đúng nhãn P01. P01 chỉ là pilot, không nghiệm thu benchmark chính thức.

## Trả lại gì — Definition of Done lượt 2

Hồ sơ có tên người review, thời điểm, SHA snapshot + SHA nhãn, tên/hash/thời điểm nhận phiếu lượt 1, phạm vi/bằng chứng đã kiểm, đối chiếu từng nhãn và mọi bất đồng, quyết định rõ ràng và điều kiện/giới hạn. `approve` chỉ phù hợp khi không còn bất đồng/chỗ thiếu bằng chứng ảnh hưởng nhãn được chấp nhận; nếu có hãy request changes hoặc nêu không thể review, không ép kết luận thuận lợi.

Reviewer gửi hồ sơ cùng phiếu lượt 1. Anh có thể ghi quyết định trực tiếp vào bản làm việc `review_decision.v1.json` và `review_log.md`, hoặc để Huy/Phát chép lại **đúng quyết định đã ký/xác nhận** rồi anh xác nhận bản chép. Không sửa `labels.v3.json` hay raw evidence để chuyển trạng thái. Nếu cần sửa nhãn, tạo phiên bản mới, ghi lý do và review lại phần ảnh hưởng; quyết định cũ không tự áp dụng cho hash mới.

Chỉ sau quyết định thật, trong **bản làm việc riêng** (không phải gói lưu trữ), cập nhật reviewer/reviewed_at/decision/comments và audit_decision theo CHECKSUM_PROCESS, dẫn phiếu và hồ sơ xác nhận trong review_log/comments, rồi chạy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/update_p01_checksums.ps1 -Mode WriteReview
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/update_p01_checksums.ps1 -Mode VerifyReview
```

Không chạy `WriteArtifacts`/`-Force` để che thay đổi, không tự đánh dấu accepted. Hai lệnh trên chỉ niêm phong và kiểm tra cấu trúc/hash; không chứng nhận năng lực reviewer hay chất lượng khoa học. Gói lưu trữ và manifest bàn giao giữ nguyên; VERIFY_PACKAGE sẽ báo khác biệt nếu sửa bản lưu trữ.

## Protocol và bước sau

Đề nghị anh đánh giá protocol v0.2: chọn scenario, universe độc lập với prediction, đối chứng, tiêu chí nhãn, hop/seed, mức bằng chứng, reviewer độc lập, xử lý bất đồng và split/scoring. Có thể đồng ý khung nhưng yêu cầu sửa nhãn P01, hoặc ngược lại; ghi riêng. Manifest split hiện là nháp, P02–P04 chưa khóa. Việc approve P01 **không tự phê duyệt split/test/chấm điểm**, không tự merge PR #1/#2 và không chứng minh ưu thế GraphRAG.

Nếu tiếp tục, nhóm chốt ca/universe và xin phê duyệt riêng bước khóa split/test trước chấm chính thức. Đây có thể là lần nhờ reviewer tiếp theo, với phạm vi rõ ràng; không mặc định anh đã đồng ý review mọi ca sau.

## Nếu dùng AI

> Đọc ROUND2_READ_FIRST.md. So sánh dự thảo trong repository với phiếu lượt 1 đã khóa; không sửa phiếu gốc. Lập bảng khác biệt, dẫn source/runtime và nêu giới hạn. Không lấy prediction/score làm ground truth, không ký hoặc chọn approve thay người thật, không tự sửa labels/raw hay accepted. Tách quyết định nhãn P01 khỏi đề xuất protocol/split. Tôi là reviewer sẽ kiểm bằng chứng và xác nhận quyết định.
