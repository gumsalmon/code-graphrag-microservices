# Quyết định review theo ca — mẫu chưa điền

Tạo bản riêng cho từng case/version/hash. Không điền thay reviewer thật.

## Danh tính và linkage

- Reviewer / vai trò / quan hệ với nhóm:
- Khác người lập nhãn và không tự duyệt phần implementation mình xây; phạm vi xác nhận:
- Case / scenario version / universe version/hash:
- Nhãn nháp: file / version / SHA-256 thực tế:
- Manifest artifact trước review / kết quả kiểm checksum:
- Notes R1: file/version/hash và record tiếp nhận:
- Bảng đối chiếu R2: file/version/hash:
- AI assistance, exposure và giới hạn độc lập thực tế:

## Quyết định

- Chọn đúng một sau khi kiểm: `approve` / `request_changes` / `unable_to_review`:
- Nhận định và evidence hỗ trợ quyết định:
- ID/phần được kết luận; những phần chưa quyết định:
- Disagreement hoặc bằng chứng bắt buộc còn thiếu:
- Điều kiện/giới hạn đối với behavior, repair, hop, alias và scope:
- Thay đổi nhãn/evidence/code được đề nghị, nếu có:
- Cần review lại phần nào và trên version nào:

## Nhận xét protocol và bước đánh giá — ghi riêng

- Nhận xét về protocol làm khung chuẩn bị/review development:
- Câu hỏi về split/test/scoring còn cần quyết định riêng:
- Nội dung không thuộc quyết định nhãn của ca:

## Xác nhận thật

- Phần reviewer trực tiếp kiểm / kế thừa / AI hỗ trợ / chưa kiểm:
- Thời điểm hoàn tất/xác nhận biết thật (ISO-8601 + múi giờ):
- Tên và xác nhận/chữ ký reviewer:
- Nếu có bản chép vào JSON: file/hash, người chép và reviewer xác nhận bản chép:

Decision cần tham chiếu đúng label path/version/SHA và checksum artifact/review theo protocol hiện hành trước khi ghi nhận accepted. Giữ labels/raw nguyên byte. Nhãn mới cần review tương ứng; không tái dùng chữ ký cho hash khác. Form này không tự cấp quyền test/scoring/model/push hoặc nghiệm thu toàn bộ nghiên cứu.
