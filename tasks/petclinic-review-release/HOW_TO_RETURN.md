# Lưu hồ sơ trả lại

Tạo thư mục làm việc cạnh gói, ví dụ `review-work`. Sao chép các mẫu cần dùng vào đó, ghi notes/exposure và các phần đã/chưa kiểm theo thực tế. Không thay file trong gói gốc.

Lượt 1 trả notes, exposure và checkpoint/checksum. Có thể điền `CHECKPOINT_TEMPLATE.md` bằng hash PowerShell; hoặc dùng Python để tạo file checkpoint bảo toàn notes/exposure:

```text
python VERIFY_PACKAGE.py --seal-notes --notes ../review-work/NOTES.md --exposure ../review-work/EXPOSURE.md --out ../review-work/CHECKPOINT.json
```

Có thể thêm `--reviewer "Ten nguoi review"` nếu người thực hiện muốn khai tên trong record này. Nếu không truyền, tên để null; tên/xác nhận thực tế vẫn được ghi trong notes. Lệnh không điền nhận định hoặc chữ ký và không tự duyệt nhãn. Timestamp trong JSON là lúc tạo checkpoint file, không phải giờ đọc được chứng nhận. `--out` phải là file mới; bản bổ sung dùng version mới.

Lượt 2 có thể kiểm linkage tới notes/exposure R1 đã lưu:

```text
python VERIFY_PACKAGE.py --checkpoint ../review-work/CHECKPOINT.json --notes ../review-work/NOTES.md --exposure ../review-work/EXPOSURE.md
```

Kiểm này ràng buộc đúng R1 package/manifest và bytes của hai file. Nó không tự xác nhận thứ tự đọc, independence, người thật hoặc quyền phát hành lượt 2. Nếu không dùng Python, gửi notes/exposure và hash thực tế theo mẫu; record được giữ và đối chiếu khi tiếp nhận.

Lượt 2 trả thêm bảng đối chiếu, quyết định cho từng case/version/hash và các phụ lục. Giữ notes/checkpoint R1 gốc. Mọi thời điểm chưa biết ghi chưa rõ; mọi bất đồng hoặc evidence thiếu vẫn được ghi lại.
