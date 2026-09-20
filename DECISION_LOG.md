# Nhật ký Quyết định Kỹ thuật (Decision Log)

| ID | Quyết định đề xuất | Trạng thái thực tế | Bằng chứng kiểm tra |
|---|---|---|---|
| D01 | Chốt commit trước khi gán bằng chứng | **Đã áp dụng** | Parser có lưu trường `commit_sha` trong `evidence` và metadata cho mọi output. |
| D02 | Tách ảnh hưởng hành vi và phạm vi sửa chữa | **Đã áp dụng** | Không mặc định gán Caller (ApiGateway) phải đổi code. Giữ trạng thái `CONTRACT_MISMATCH` để đánh dấu lỗi hành vi do thiếu `includeDetails`. |
| D03 | Kiểm tra cả dữ liệu phản hồi | **Đã áp dụng** | Circuit Breaker fallback trả về danh sách rỗng (lỗi ẩn). Benchmark ghi nhận hop này. |
| D04 | Parser hai file và JSON trước | **Đã áp dụng** | Task 1 đã sinh `baseline_graph.json` với 2 file trước khi mở rộng. |
| D05 | Thêm lớp phân giải sau Tree-sitter | **Đã áp dụng** | Code Python tự xử lý rule nội bộ (`declared_required` -> `effective_required`), path normalization mà không cần PyCG. |
| D06 | Lưu cạnh chưa phân giải cùng bằng chứng | **Đã áp dụng** | Các setter có nguy cơ đổi host (như `setHostname`) và chuỗi URI động được đẩy vào mảng `unresolved`. |
| D07 | Định nghĩa hop logic độc lập | **Đã áp dụng** | `trace_backward_impact()` tính chính xác 1 hop cho `CALLS` và `INVOKES_API`, tách biệt với ranh giới service (`service_crossings`). |
