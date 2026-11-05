# Kế hoạch review hiện hành — một đợt gộp, hai bước đọc

Cập nhật 15/10/2026 theo mục 8.4 PROJECT_CONTEXT. Thay kế hoạch điều phối “duyệt pilot trước rồi mới mở P02–P04”; không thay protocol, nhãn, phiếu hoặc ZIP đã đóng băng.

Được làm P02–P04 ở mức preparation/development trong lúc chờ review. Nhóm dự kiến đề nghị một đợt review gộp khi đủ hồ sơ, bao gồm P01 nếu chưa có quyết định nhãn. Đây là kế hoạch, **chưa phải xác nhận reviewer đã nhận review các ca mới**. Nhận xét tổng quan đã nhận không thay quyết định từng bộ nhãn.

## Trong lúc chuẩn bị

- Chọn ca theo tiêu chí đã ghi, lưu cả phương án bị loại và lý do; không chọn vì score đẹp.
- Pin source/config/patch/fixture, lập inventory và evaluation universe độc lập trước polarity hoặc output hệ thống; lưu hash/thời điểm.
- Phát lập nhãn nháp từ source/contract/raw runtime, không dùng parser/Neo4j/context/prediction/score làm đáp án. Người lập nhãn không tự duyệt.
- Huy/Hiển tiếp tục kỹ thuật trên development; ghi exposure. Các ca đã debug không thể đổi thành unseen test.
- Giữ raw baseline/mutated/đối chứng, cả lỗi hạ tầng. Không chờ Gemini để làm các việc không cần API.

Chi tiết: [kế hoạch P02–P04](../P02_P04_EXECUTION_PLAN.md), [packet theo vai trò](../P02_P04_TASK_PACKETS.md), [hồ sơ P01](../P01_CLOSEOUT.md).

## Khi đủ hồ sơ, đề nghị review gộp

Thống nhất trước số ca, phạm vi, thời gian và khả năng reviewer nhận việc. Nếu P04 có blocker thực sự, báo đúng phạm vi sẵn sàng và xin điều chỉnh đợt review; không bỏ ca khó mà không ghi lý do.

**Bước đọc 1 — source-first:** chỉ gửi source pin, patch, contract, fixture/raw runtime, inventory/universe, hướng dẫn và phiếu trống. Chưa gửi draft labels, summary kết luận, output/parser/context/model hay score. Reviewer lưu nhận định có bằng chứng, tên, thời điểm, hash, khai báo đã tiếp xúc tài liệu nào và AI hỗ trợ gì.

**Bước đọc 2 — đối chiếu:** sau khi lưu bản gốc bước 1, mới gửi nhãn nháp/version/hash và hồ sơ so sánh; ghi đồng ý/bất đồng, unresolved, quyết định `approve`, `request_changes` hoặc `unable_to_review`. Không sửa phiếu cũ để khớp nhãn.

Repo đã public nên không thể bảo đảm reviewer chưa nhìn thấy nhãn chỉ bằng cách chia ZIP. Cần đề nghị dùng đúng gói trước và ghi exposure trung thực. Nếu đã xem nhãn, không mô tả đó là blinded review; có thể vẫn rà soát độc lập với khai báo giới hạn hoặc tìm reviewer chưa tiếp xúc nếu cần.

Phiếu P01 cũ, nếu có, giữ nguyên. Gói mới thêm ca phải có version/checksum mới; không thay byte của hai ZIP đã gửi hoặc ghi như đã có phiếu chưa nhận được.

## Các quyết định tách biệt

1. **Nghiệm thu nhãn:** reviewer thật khác người lập nhãn, xác định scenario/SHA nhãn/protocol/universe, bằng chứng và bất đồng. Chưa giải quyết thì giữ pending_review.
2. **Khóa test/split và cho phép chấm chính thức:** phê duyệt riêng. P01–P04 đợt này là development/feasibility; chưa có final-test manifest hợp lệ để khóa bằng kế hoạch này.
3. **Audit kết quả sau đánh giá:** xem khả năng tái lập, raw outputs, cấu hình, cost/token/time, failures và limitations; không dùng prediction để chỉnh ground truth cho hợp hệ thống.

Reviewer không cần chạy Neo4j hoặc model để duyệt nhãn. Có thể yêu cầu tái hiện runtime khi bằng chứng chưa đủ; các việc kỹ thuật đó được ghi riêng. Không mặc định sẽ nhờ reviewer nhiều lần hoặc nhờ duyệt từng commit.

## Definition of Done đợt review

Hồ sơ có danh sách chính xác artifact/SHA được xem, phiếu source-first gốc, khai báo exposure/AI, bảng bất đồng, quyết định người thật có tên/thời điểm và checksum sau review. Nếu nhóm chép quyết định vào JSON, cần người quyết định xác nhận bản chép. Accepted labels không đồng nghĩa test đã khóa hay bài báo đã đủ chất lượng.

Chỉ đứng chờ khi bước còn lại thực sự cần quyết định người thật, ví dụ accepted/unresolved/test lock. Việc chuẩn bị kỹ thuật không cần quyết định đó được tiếp tục; báo rõ blocker khi không còn công việc hợp lệ để làm.

## Tin nhắn đề nghị, chỉ gửi khi đủ gói

> Dạ anh, nhóm đã chuẩn bị một đợt ca phát triển theo protocol, gồm [danh sách/phạm vi] và còn [giới hạn]. Anh có thuận tiện rà soát một đợt gộp không ạ? Nhóm gửi source/patch/log và phiếu độc lập trước; sau khi nhận phiếu mới gửi nhãn nháp để đối chiếu. Nhờ anh ghi riêng nhận xét bằng chứng, quyết định nhãn và điều kiện còn thiếu; chưa cần duyệt F1 hoặc kết luận GraphRAG tốt hơn baseline. Các ca đã dùng phát triển không được tính là test chưa từng thấy. Nhóm sẽ gửi dung lượng và hướng dẫn cụ thể để anh ước lượng thời gian.
