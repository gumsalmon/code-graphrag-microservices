# Review PetClinic — lượt 2

Chỉ mở lượt này sau khi notes, exposure và checkpoint nhận định lượt 1 đã được lưu. Giữ gói lượt 1 và hồ sơ gốc để đối chiếu. Nếu đã xem nhãn sớm, khai exposure thật; không dựng lại notes như thể chưa từng tiếp xúc.

1. Kiểm checksum theo **VERIFYING.md**; đối chiếu linkage tới gói R1 trong `PACKAGE_METADATA.json`. Nếu có file checkpoint JSON, bộ kiểm Python có thể kiểm hash notes/exposure đã lưu.
2. Mở **CURRENT_DRAFTS.md** để chọn đúng nhãn hiện hành P01 v3, P02 draft.v4 và P03 draft.v2. Các bản khác trong history chỉ là lịch sử. Tất cả nhãn hiện hành vẫn `pending_review`.
3. Đọc notes/exposure và nguồn bằng chứng của người lập nhãn. Dùng **INDEX.html** tìm path hoặc tên file; dùng SHA để phân biệt các bản trùng tên. Nội dung labels/notes và trích dẫn gốc được giữ nguyên byte.
4. Sao chép `COMPARISON_TEMPLATE.md` và `DECISION_TEMPLATE.md` ra thư mục làm việc riêng. Đối chiếu từng ID/seed/alias, ghi đồng ý, bất đồng hoặc chưa đủ căn cứ. Nếu thay nhận định so với R1, dẫn evidence/lý do mới và giữ notes trước đó.
5. Ghi quyết định riêng cho mỗi case/version/hash. `approve`, `request_changes` và `unable_to_review` đều là kết quả hợp lệ khi phù hợp bằng chứng. Phần chưa xét giữ chưa quyết định.

Behavior, repair strategy, logical hop và service boundaries cần được đánh giá riêng. Các phép đo helper/direct subscription chỉ hỗ trợ phạm vi trực tiếp đã đo, chưa chứng minh production callback trace. HTTP body giống nhau ở một đường gọi không tự chứng minh mọi helper hoặc cả Service không đổi. Unresolved không bị ép thành negative.

Các RETURN và hướng dẫn cũ trong hồ sơ annotation là records lịch sử, không thay hướng dẫn review hiện hành. Output parser/Neo4j/retrieval/LLM và điểm số vẫn được giữ ngoài gói review nhãn. Không sửa nhãn cho khớp output hệ thống hoặc thu hẹp universe để loại trường hợp khó.

## Hồ sơ hoàn tất

Gửi notes/exposure/checkpoint R1 nguyên byte, bảng đối chiếu, quyết định từng ca và các phụ lục/evidence refs. Ghi phần trực tiếp kiểm, AI hỗ trợ, kế thừa, chưa kiểm, thời điểm biết thật và xác nhận của người review.

AI có thể tìm references và tổ chức khác biệt; người review kiểm evidence và quyết định. Không điền chữ ký, giả giờ đọc hoặc tự approve bằng AI. Nếu quyết định được chép vào JSON bởi người khác, reviewer xác nhận bản chép. Nhãn/evidence sửa sau review phải có version/hash mới và phần review tương ứng.

Kiểm checksum/checkpoint chỉ kiểm bảo toàn file. Nó không xác nhận danh tính, thứ tự đọc hoặc tự cấp quyền mở lượt 2. Quyết định nhãn không tự là phê duyệt protocol, test/split, scoring, model/budget hoặc nghiệm thu toàn bộ nghiên cứu.
