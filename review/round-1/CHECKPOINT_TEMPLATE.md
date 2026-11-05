# Checkpoint nhận định lượt 1 — mẫu chưa điền

Ghi sau khi notes đã lưu. Không đưa checksum của file vào chính file đó sau khi đã băm.

| File đã bàn giao | Version | SHA-256 byte thực | Nội dung/phạm vi |
|---|---|---|---|
| Tên notes thực tế | | | |
| Exposure/công cụ nếu là file riêng | | | |
| Phụ lục nếu có | | | |

- Gói R1 / manifest SHA đã dùng:
- Case đã xét / chưa xét / scope còn thiếu:
- Nội dung nhãn hoặc output đã tiếp xúc trước checkpoint, nếu có:
- Người hoàn tất notes và phần tự kiểm:
- Thời điểm hoàn thành / gửi / nhận, chỉ ghi mốc biết thật và múi giờ:
- Mốc không biết giữ chưa rõ/null; không dùng thời gian tạo file để khẳng định giờ đọc:
- Hạn chế independence hoặc evidence cần xử lý:
- Xác nhận của người review về phạm vi ghi trong notes:

Có thể tính hash trong PowerShell bằng:

```powershell
Get-FileHash -LiteralPath 'DUONG_DAN_THUC_TE/independent-notes.md' -Algorithm SHA256
```

Điều phối giữ file nhận nguyên byte cùng record tiếp nhận; không sửa notes để khớp nhãn. Nếu có bản bổ sung, ghi file/hash trước, file/hash mới, lý do và exposure mới. Hash không tự chứng minh thứ tự đọc hoặc tính đúng của nhận định. Checkpoint này không là quyết định nghiệm thu nhãn.
