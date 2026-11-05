# Nhận định độc lập — mẫu chưa điền

Sao chép ra thư mục làm việc riêng. Mọi kết luận và xác nhận do người review kiểm tra và ghi theo thực tế.

## Phiên review và exposure

- Reviewer / vai trò / quan hệ với nhóm:
- Có tham gia lập nhãn hoặc xây implementation đang được đánh giá không? Phạm vi:
- Gói R1 / metadata version / manifest SHA-256:
- Các case được giao:
- Tài liệu dự án/nhãn/summaries/output/score đã tiếp xúc trước đây; thời điểm nếu biết:
- Nếu không biết thời điểm hoặc nguồn tiếp xúc, ghi chưa rõ:
- AI/model/công cụ đã dùng và nội dung được cung cấp:
- Phần trực tiếp kiểm / AI hỗ trợ / kế thừa / chưa kiểm:
- Thời điểm bắt đầu/kết thúc nếu biết (ISO-8601 + múi giờ; không suy diễn):

## Một phần riêng cho mỗi case

- Case / scenario version / source/config pin / patch hash:
- Fixture và scope/universe/alias version/hash:
- Source/contract đọc trước raw: nhận định ban đầu, điều kiện và câu hỏi:
- Raw requests/logs đã đối chiếu; phần không tái hiện hoặc chưa xem:
- Seed Method/API/Service theo input; nhận xét seed exclusion:
- Scope/ID/alias thiếu hoặc chưa đủ bằng chứng, nếu có:

### Từng thực thể

Lặp phần này cho từng ID được xem xét; ghi danh sách còn chưa xem ở cuối. Không lấy số node hệ thống hoặc danh sách request làm universe.

Có thể dùng bảng hoặc nhóm ID dùng chung evidence thay cho lặp văn bản; mỗi ID vẫn có nhận định và scope rõ. Khai phạm vi đọc theo thực tế, không cần điền giờ từng file, đọc mọi log hoặc lặp lại cùng một mô tả fixture cho từng dòng.

- Canonical ID và level (method/api/service):
- Có phải seed không? Căn cứ:
- Nhận định về behavioral impact / chưa thể kết luận:
- Điều kiện quan sát và giới hạn áp dụng của nhận định:
- Quan sát baseline / mutated / control liên quan:
- Source/contract refs (snapshot, file, dòng, hash nếu có):
- Raw refs (file/request/log/timestamp, hash nếu có):
- Tuyến phụ thuộc tự xác lập từ source/contract/raw, nếu đủ:
- Logical hop / service boundaries; chưa biết ghi chưa xác định, không ép 0:
- Repair theo strategy cụ thể / chưa xác định; không suy từ behavior:
- Phần nhận định trực tiếp tự kiểm và phần AI hỗ trợ:
- Bằng chứng còn thiếu hoặc phép đo tối thiểu cần bổ sung:

### Tổng kết phạm vi case

- ID đã xét / chưa xét / bị loại và lý do:
- Negative observations được chọn và đối chứng trong scope nào:
- Unresolved về ID, path, behavior, repair hoặc coverage:
- Khả năng raw chỉ hỗ trợ direct helper mà chưa production call/callback:
- Giới hạn nhận định và câu hỏi cần phản hồi:

## Xác nhận và lưu bản

- Phần nội dung tôi đã kiểm và chịu trách nhiệm:
- Phần chưa kiểm hoặc cần người khác hỗ trợ:
- Thời điểm hoàn thành thực tế nếu biết:
- Tên/xác nhận người review:

Lưu file trước khi tính checksum ở checkpoint riêng. Chưa ghi quyết định approve hoặc sửa nhãn của người lập nhãn ở lượt này. Bổ sung sau khi lưu checkpoint dùng file/version mới, giữ bản gốc và lý do.
