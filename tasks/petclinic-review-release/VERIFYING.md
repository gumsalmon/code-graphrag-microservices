# Kiểm gói offline

Giải nén gói vào một thư mục riêng. Mở **INDEX.html** hoặc đọc **START_HERE.md**. Không cần Docker hoặc API key.

Windows PowerShell có sẵn:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\VERIFY_PACKAGE.ps1
```

Hoặc Python 3.10+ với thư viện chuẩn:

```text
python VERIFY_PACKAGE.py
```

Bộ kiểm chỉ đọc gói; không gọi mạng, cài package, chạy ứng dụng, model hoặc chấm điểm. Kết quả `integrity_verified: true` xác nhận đúng manifest/member hashes, không xác nhận người thật đã đọc hoặc nhãn đã được duyệt.

Giữ mọi notes/exposure/phụ lục trong thư mục làm việc **bên ngoài** gói. Nếu thêm hoặc sửa file bên trong, bộ kiểm sẽ báo thiếu/thừa/đổi checksum; giữ bản gốc và ghi nhận thay đổi thay vì sửa manifest để báo đạt.

Nếu được gửi file `.zip.sha256`, có thể kiểm ZIP trước khi giải nén:

```powershell
Get-FileHash -LiteralPath '.\TEN_GOI.zip' -Algorithm SHA256
```

So hash với sidecar nhận kèm. Tên lưu trữ ngắn trong gói giúp tránh giới hạn đường dẫn dài khi giải nén trên Windows; logical paths gốc và SHA ở INDEX.html/EVIDENCE_INDEX.json. Đây là gói đọc evidence, không phải môi trường tái chạy toàn bộ ứng dụng.
