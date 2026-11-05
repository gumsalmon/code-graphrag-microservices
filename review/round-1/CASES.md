# Phạm vi ba tình huống

Đề tài nghiên cứu phân tích tác động thay đổi mã nguồn giữa các microservices. Phần review này xem bằng chứng và nhận định ở ba cấp Method/API/Service trên các ca development PetClinic. Chưa dùng các ca này để khẳng định hiệu quả tổng quát hoặc GraphRAG tốt hơn baseline.

Source pin: `3858f9c630cf989bb6809a86edf47c2be78dc9f1`.
Config pin: `323993ce2519c6d02df63e08bf4458d123d3b611`.

| Ca | Thay đổi được xem xét | Phạm vi đọc |
|---|---|---|
| P01 | Thêm query parameter `includeDetails` boolean bắt buộc tại GET `/pets/visits`, giữ thân handler và consumer | Pilot lịch sử; source ba file Visits provider/client/Gateway, raw các attempts. Không tạo universe mới từ labels hoặc preregistration hồi tố. |
| P02 | Thêm `includeDetails`, `required=false`, `defaultValue="false"`; giữ thân handler và consumer | Scenario 0.1.1/universe draft.v2/fixture v1. Registry có 12 eligible IDs và ba seed/excluded. Paired runtime và helper measurements tách riêng. |
| P03 | Đổi tên trường response `pets` thành `animals` trong boundary handler `OwnerResource.findOwner(int)`, consumer giữ nguyên | Scenario 0.1.0/universe draft.v1/fixture v1. Registry có 31 eligible IDs và ba seed/excluded. Đây là response boundary change, không database migration. |

Trong INDEX.html, tìm `P02 REGISTRY.json` hoặc `P03 REGISTRY.json` để xem IDs/aliases; tìm `baseline-r1`, `baseline-r2`, `mutated-r1`, `mutated-r2` để xem repetitions. Tên snapshot/repetition và fixture được giữ, không đổi tên để tuyên bố blind. P01 source/seed/fixture nằm trong `P01/INPUT.json`.

Raw observations có requests/responses, controls, setup/reset và logs. Evidence helper P02 chỉ là phép gọi trực tiếp/subscription trong điều kiện đã khai; không phải production callback tracing. Nếu cần bằng chứng khác hoặc ID thiếu, ghi câu hỏi và phép đo cần bổ sung.

Không có kết luận tác động, đánh giá chất lượng phương pháp hoặc điểm F1/Ragas được đặt trước cho reviewer trong lượt 1. Mục tiêu là nhận định có căn cứ trong phạm vi đã xem, giữ unresolved khi thiếu bằng chứng.
