# Huy — gửi hồ sơ cho reviewer theo hai lượt

Cập nhật điều phối 15/10/2026: được chuẩn bị/phát triển P02–P04 trước review gộp theo mục 8.4 PROJECT_CONTEXT. Tài liệu này hướng dẫn **hai bước đọc trong một đợt review**, không đặt lại gate chờ P01 trước khi làm ca mới. Giữ nguyên các gói đã phát hành; không mô tả phiếu/decision chưa nhận như đã có. Xem [kế hoạch review hiện hành](NEXT_REVIEW_MILESTONE.md).

Gói benchmark được chốt tại `{{BENCHMARK_SHA}}`, PR #2 của Phát. Hai ZIP đã chuẩn bị nhưng **không gửi cả hai ngay**, không gửi thư mục chứa toàn bộ gói hoặc link PR #1/#2/context trước lượt 1. Toàn bộ PR benchmark chỉ gửi ở lượt 2. Anh review nhãn từ source/runtime; kiểm chứng Neo4j của Hiển là công việc riêng, không cần giao anh chạy cả pipeline.

Gói P01 bên dưới vẫn dùng được nếu reviewer đang xem pilot. Nếu chưa có quyết định nhãn P01, dự kiến đưa P01 vào đợt review gộp sau P04; cần xác nhận phạm vi với reviewer, không mặc định đã nhận việc. Gói các ca mới chưa được tạo. Split/test lock là quyết định riêng, không bắt buộc giả khóa test để gửi các ca development đi review.

## Gửi ngay — lượt 1

Đính kèm duy nhất `P01-ROUND1-SOURCE-FIRST.zip` và SHA-256 ZIP lấy từ `ARCHIVES.sha256` (gửi dòng tương ứng thôi, không cần gửi dòng lượt 2). Nhắn:

> Dạ anh, tụi em đang nghiên cứu cách phân tích ảnh hưởng thay đổi API trong hệ thống microservices. Hiện mới có một tình huống pilot P01 trên Spring PetClinic, chưa phải kết quả bài báo. Nhờ anh rà soát độc lập xem từ source, patch và log chạy thật có thể kết luận những phần nào thay đổi hành vi, và còn thiếu bằng chứng gì.
>
> Em gửi gói lượt 1; anh giải nén và mở ROUND1_READ_FIRST.md trước. Gói có source đầy đủ đúng phiên bản, patch, log gốc, hướng dẫn và phiếu trống; chưa có nhãn/kết luận của nhóm. Anh chưa cần Docker/Neo4j và nhờ anh chưa mở PR/context/nhãn trước khi ghi nhận định. Nếu dùng AI, trong hướng dẫn có prompt giới hạn đúng gói này; kết luận vẫn do anh kiểm tra.
>
> Kết quả em cần là phiếu nhận định của anh có dẫn bằng chứng, tên, thời điểm và hash file, kể cả điểm chưa chắc hoặc không đồng ý. Sau khi nhận phiếu em gửi lượt 2 và toàn bộ PR để anh đối chiếu dự thảo rồi quyết định. Nếu thấy thiếu bằng chứng, anh báo em; không cần cố duyệt. Anh cho em biết có mở được gói không và thời gian anh thuận tiện nhé.

Nếu repo/PR private, **chỉ cấp quyền read cần thiết khi chuẩn bị lượt 2** hoặc cung cấp snapshot ZIP offline. Không cần cấp quyền write/admin. Không đưa token/mật khẩu GitHub vào gói. Cấp read bằng cách phù hợp với loại repo/account; đừng giả định repo cá nhân có mọi mức quyền.

## Điều kiện chuyển lượt 2

Nhận phiếu lượt 1; kiểm tên người thật, timestamp, phạm vi/evidence và khai báo tiếp xúc/AI. Tính lại hash và so với hash anh gửi. Lưu phiếu cùng thông điệp nhận trước khi gửi lượt 2. Nếu thiếu, xin bổ sung ngay từ bằng chứng lượt 1. Không yêu cầu anh sửa nhận định cho khớp nhãn. Hash không chứng minh tính độc lập; ghi cả chuỗi bàn giao/thời điểm.

## Gửi sau — lượt 2

Đính kèm `P01-ROUND2-COMPARE-AND-DECIDE.zip`, SHA ZIP tương ứng và link https://github.com/gumsalmon/code-graphrag-microservices/pull/2 . Nhắn:

> Dạ em đã nhận và lưu phiếu độc lập của anh, hash [điền hash], lúc [điền thời điểm nhận]. Em gửi lượt 2 cùng toàn bộ snapshot PR #2, chốt commit `{{BENCHMARK_SHA}}`; nếu PR có cập nhật thì phiên này vẫn review đúng snapshot đã gửi.
>
> Nhờ anh mở ROUND2_READ_FIRST.md, đối chiếu từng nhãn dự thảo với phiếu đã ghi, nêu đồng ý/bất đồng và chọn approve, request_changes hoặc unable_to_review. Anh cũng giúp nhận xét riêng protocol v0.2 có đủ làm khung chuẩn bị P02–P04 không và cần điều kiện gì trước khóa split/test. Không cần phê duyệt số F1 hiện tại hay ưu thế GraphRAG; chúng vẫn là smoke test.
>
> Anh gửi lại hồ sơ theo REVIEW_RETURN_TEMPLATE.md, tên và thời điểm xác nhận. Nếu anh muốn nhóm chép vào JSON thì tụi em gửi bản chép lại để anh kiểm, không tự quyết định thay anh. Cảm ơn anh ạ.

## Khi nào đứng lại chờ người review?

Hai gói chuẩn bị xong là **sẵn sàng bàn giao**, không phải P01 đã accepted. Sau khi gửi lượt 1, chờ nhận định trước khi mở lượt 2. Sau lượt 2, không đánh dấu accepted/merge vì chưa có quyết định thật. Có thể tiếp tục chuẩn bị/phát triển P02–P04 và trả lời câu hỏi trong lúc chờ; chưa nghiệm thu nhãn, khóa final test hoặc chấm chính thức. Chỉ dừng ở bước cần quyết định người thật, không dừng mọi việc kỹ thuật. Nếu request_changes, sửa phần được yêu cầu, giữ bản cũ và review lại phần bị ảnh hưởng.

Phát: giữ nhãn/raw gốc, giải đáp provenance; chưa sửa theo ý AI hoặc tự approve. Hiển: giữ technical evidence/PR riêng, hỗ trợ kỹ thuật khi có yêu cầu; không tạo và duyệt ground truth từ output hệ thống. Huy: điều phối bàn giao, bảo toàn phiếu gốc và chỉ ghi nhận quyết định đúng xác nhận của reviewer.

## Tái tạo gói

Từ repo nhóm, chạy `powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/prepare_p01_reviewer_handoff.ps1`. Script dùng Git object ở commit cố định, không checkout/merge/commit/push; tạo thư mục mới trong `handoff-out/`, không ghi đè gói cũ. Manifest kiểm byte không đồng nghĩa kết luận khoa học đã được chứng minh. Xem `BUILD_VERIFICATION.json` cho kiểm chứng đóng gói.
