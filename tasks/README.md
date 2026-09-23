# Cách dùng task packet với thành viên và AI hỗ trợ

Ngày cập nhật: 23/09/2026

`PROJECT_CONTEXT.md` là tài liệu có thẩm quyền cao nhất trong repository. Task packet chỉ cụ thể hóa một công việc đã được Huy giao; không được dùng task packet để âm thầm đổi định nghĩa impact, hop, schema dùng chung hoặc quy tắc ground truth.

## Trình tự bắt buộc

1. Thành viên và AI đọc toàn bộ `PROJECT_CONTEXT.md`.
2. Chỉ đọc task packet được giao và các đầu vào packet cho phép.
3. Trước khi sửa hoặc chạy, gửi lại một bản xác nhận ngắn gồm:
   - mục tiêu kết quả;
   - commit/snapshot đầu vào;
   - đầu ra bắt buộc;
   - nội dung ngoài phạm vi;
   - blocker hoặc dữ liệu còn thiếu.
4. Thực hiện trên branch riêng. Không push thẳng vào `main`, không force push và không merge nếu Huy chưa yêu cầu.
5. Khi bàn giao, dùng đúng mẫu cuối task packet và đính kèm lệnh chạy, exit code, log, artifact, commit SHA cùng giới hạn.

## Quy tắc chống báo hoàn thành giả

- Đọc mã hoặc suy luận không được báo là đã kiểm chứng runtime.
- Test kỹ thuật pass không biến output parser/Neo4j/LLM thành ground truth.
- Không tự viết JSON/Cypher mong đợi rồi dùng chính nó làm bằng chứng pipeline sinh đúng.
- Không bỏ log lỗi hoặc chỉ gửi phần log đẹp. Giữ raw log và tạo summary có dẫn nguồn.
- Không sửa nhãn sau khi xem điểm số hệ thống nếu không tạo version mới, ghi lý do và review độc lập.
- Trường hợp thiếu bằng chứng phải mang trạng thái `unresolved`, `blocked` hoặc `pending_review`, không tự suy đoán.

## Trạng thái hiện tại

| Luồng | Chủ trì | Trạng thái | Điều kiện sang bước kế tiếp |
|---|---|---|---|
| Protocol và review độc lập P01 | Phát | Chờ xác nhận nhận việc | Phát xác nhận input/ràng buộc và nộp protocol draft |
| Sửa verifier và E2E Neo4j P01 | Hiển | Chờ xác nhận nhận việc | Hiển xác nhận branch/commit và kế hoạch test lỗi |
| Khóa ground truth P01 | Phát + reviewer khác | Chưa được phép | Protocol được chốt, evidence đủ, có hai vai trò khác nhau |
| Mở rộng P02–P04 | Huy | Chưa được phép | P01 protocol và quy trình evidence được nghiệm thu |
