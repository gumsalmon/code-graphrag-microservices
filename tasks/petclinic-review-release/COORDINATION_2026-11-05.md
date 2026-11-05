# Bàn giao hai gói review PetClinic

Đã đóng gói theo yêu cầu ngày 05/11/2026: “oke tôi đồng ý, hãy làm thật tốt bước tiếp theo”. Quyền này được dùng để lắp và kiểm gói; không tự gửi tin, push GitHub, ghi nhận reviewer đã nhận việc hoặc duyệt nhãn.

Gói hiện hành nằm trong `handoff-out/petclinic-review-packages/20261105T093250Z-45a9dd18/`:

- `PETCLINIC_R1_SOURCE_FIRST_2026-11-05.zip`: source/config/patch/registry/raw và các mẫu nhận định/exposure/checkpoint. Có thể chuyển gói này cùng `.zip.sha256` để bắt đầu lượt 1.
- `PETCLINIC_R2_LABEL_COMPARISON_2026-11-05.zip`: đúng ba nhãn hiện hành, notes/exposure/evidence/history và mẫu đối chiếu/quyết định. Giữ tại điều phối cho tới khi nhận và lưu notes/exposure/checkpoint lượt 1. Không gửi cả thư mục chứa hai gói ngay từ đầu.

Giải nén rồi mở `INDEX.html`. File này tìm case/path/hash và mở payload tại đường dẫn ngắn; `START_HERE.md` và các hướng dẫn giải thích quy trình đầy đủ. File nguồn/labels/notes giữ nguyên byte. Logical paths và origins trong mục lục được giữ để tra trích dẫn; không cần đọc tên hash để đoán file.

Hai bộ kiểm Python/PowerShell đã chạy đạt trước/sau giải nén ở thư mục có dấu/khoảng trắng; đã kiểm thêm checksum lỗi, file thừa và checkpoint sai/notes đổi. Đây là mô phỏng di chuyển thư mục trên máy hiện tại, chưa phải người khác đã chạy trên máy vật lý thứ hai. Python seal/checkpoint chỉ kiểm ràng buộc bytes; không chứng nhận danh tính, giờ đọc hoặc independence. Fixture checkpoint trong audit hoàn toàn tổng hợp, không là notes reviewer đã nhận.

Không cần gửi ACK cho Hiển hoặc chờ Phát làm lại checkpoint để bàn giao lượt 1. Nhãn vẫn pending_review. Tên/lịch reviewer, hồ sơ nhận xét thật, accepted/test/scoring/model/budget và việc công bố code giữ các bước riêng.

## Nội dung có thể chuyển kèm gói lượt 1

> Em gửi gói review PetClinic gồm ba tình huống thay đổi mã nguồn. Anh giải nén rồi mở INDEX.html để xem hướng dẫn và mục lục. Lượt đầu anh xem source, patch và dữ liệu chạy thực tế rồi ghi nhận định; chưa cần xem nhãn nháp. Sau khi lưu nhận định, nhóm sẽ gửi phần đối chiếu nhãn ở lượt 2. Gói đọc offline, không cần cài Docker hoặc có API key.
