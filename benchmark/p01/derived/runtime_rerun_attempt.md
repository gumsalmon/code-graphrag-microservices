# Bản ghi lần thử chạy lại runtime độc lập P01

> **Trạng thái lịch sử:** tài liệu này ghi lần thử ban đầu khi Docker daemon chưa sẵn sàng. Kết luận `reproduce_required` ở cuối file đã được thay thế bởi lần chạy sạch thành công trong `runtime_rerun_report.md`. Không dùng file này làm trạng thái hiện hành.

Thời gian: 23/09/2026, múi giờ Asia/Bangkok

PetClinic commit: `3858f9c630cf989bb6809a86edf47c2be78dc9f1`

Patch SHA-256: `42394ca361d07db58ba6a73cfc1ddb8bd1d9aeddb59292873552573adfa5cc21`

## Nội dung đã xác minh trước khi chạy runtime

- Clone mới từ repository PetClinic chính thức.
- Detached `HEAD` đúng commit bắt buộc.
- `git diff --quiet --exit-code` trả 0.
- Ba snapshot source trong package khớp từng byte với commit chính thức.
- Maven Wrapper tồn tại trong checkout.
- Dự án khai báo Java 17; Java trên host báo phiên bản 23.
- Patch gốc là UTF-16LE. `git apply --check` từ chối biểu diễn này với lỗi “No valid patches in input”. Bản chuyển nội dung chính xác sang UTF-8, SHA-256 `901b19f5dab72c65d3bb424a24e53ea4c3a83cfc5bd72332bdbaf297031441f5`, qua được bước apply check.

## Chẩn đoán môi trường tại thời điểm đó

```text
Docker CLI: 29.5.3
Docker Compose: v5.1.4
Docker daemon: không khả dụng
Lỗi Docker API: npipe:////./pipe/docker_engine — hệ thống không tìm thấy file được chỉ định
Maven trong PATH: không có
Maven Wrapper: có trong source checkout
```

Docker Desktop đã được khởi động nền nhưng daemon chưa sẵn sàng. Không container baseline/mutated nào được chạy, không request HTTP nào được gửi và không tạo kết quả runtime giả.

## Kế hoạch chạy lại được lập tại thời điểm đó

1. Ghi commit/status và phiên bản Java/Maven/Docker/Compose.
2. Build visits-service và api-gateway baseline bằng tag bất biến dành riêng cho P01.
3. Khởi động dependency bằng Compose project cách ly và ghi fixture owner 6, pets 7/8 cùng visits.
4. Ghi status/body của baseline khi gọi trực tiếp và qua gateway.
5. Áp dụng bản chuyển UTF-8 đã ghi của patch gốc vào một checkout sạch riêng.
6. Build visits-service mutated với tag bất biến khác; không dùng lại tag baseline.
7. Ghi request mutated thiếu parameter, request mutated hợp lệ và request mutated qua gateway, kèm status/body và log service.
8. Ghi hành vi baseline/mutated của negative endpoint đã chọn trước: `GET /owners/*/pets/{petId}/visits`.
9. Lưu command, exit code và log nguyên trạng dưới `raw/rerun-<timestamp>/`.

Kết luận tại thời điểm lần thử này: `reproduce_required`.

Kết luận hiện hành sau khi chạy lại thành công: `pending_review`; xem `runtime_rerun_report.md`.
