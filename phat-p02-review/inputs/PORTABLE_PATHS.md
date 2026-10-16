# Đường dẫn và cách dùng gói

Giải nén vào đường dẫn ngắn, giữ bản gốc để kiểm checksum. File làm việc/notes/log mới đặt ở bản sao riêng. Không chạy command lịch sử nguyên xi.

| Nội dung | Trong gói |
|---|---|
| PetClinic baseline đầy đủ, không .git | input/app/ |
| Config đầy đủ, không .git | input/config/ |
| Scenario/fixture/scope/patch | benchmark/p02/preparation.v1/ |
| Inventory/universe/request plan dự thảo | draft/ |
| Raw baseline đã chọn | evidence/baseline/ |
| Protocol đã pin | benchmark/protocol/benchmark_protocol_v0.2.md |
| Mẫu ghi nhận source-first | SOURCE_NOTES_TEMPLATE.md |

Các đường dẫn E:/NCKH hoặc C:/ trong raw command/inputs và các báo cáo cũ là provenance lịch sử của máy gửi, không phải file cần có trên máy nhận. Không sửa raw để đổi đường dẫn.

Các liên kết P01/closeout/model/output lịch sử trong context và tài liệu chung không được đóng gói. Chúng không phải đầu vào nhiệm vụ này; không tự tải về để lấy đáp án. Gói chỉ tự chứa phần đọc/kiểm P02 được nêu trong START_HERE; dependency build/runtime cần setup riêng.
