# P01 — lượt thử Gemini, 12/10/2026

## Kết luận

**Chưa có phản hồi hoặc dự đoán Gemini thật. Cần nhập lại key cục bộ trước khi tiếp tục.** Người dùng đã xác nhận project Free Tier. Không bật billing, tự đổi model hoặc tự retry lượt gọi model.

Đã đọc toàn bộ `PROJECT_CONTEXT.md`, kiểm Git status và mã runner trước khi chạy. Nhãn, protocol, gói reviewer và bằng chứng đóng băng giữ nguyên. Không stage, commit, push hoặc merge.

## Request và lần gọi đã thực hiện

- Model yêu cầu: `gemini-3.8-flash`; thinking MEDIUM, output cap 8192, timeout 60 giây.
- Request graph-assisted depth 2 đã chuẩn bị, không có runtime/labels trong context.
- Request SHA-256: `bba16d754a90c078aaad24c39dcde91e321824939416e30acc9390d98ad0bc8a`.
- Context SHA-256: `3bd9e542b6d2a3a8d5dd83a35dc00c68cfe5d7b46a6f4f4c9a92544fd5dfc0b1`, 17763 byte; đã kiểm checksum trước khi gửi.
- Doctor đầu tiên: `key_present_not_api_verified`, nguồn `windows_dpapi_local_file`, không in key hoặc gọi Google. Đây chỉ là kiểm khả năng đọc local, không kiểm tính hợp lệ của key phía Google.
- Chạy `live --provider gemini --model gemini-3.8-flash --request handoff-out/p01-reasoning/20261012T125005110Z-prepared-a3d7b1b0/request.json --confirm-send --confirm-free-tier`.
- Runner exit 1 với `Gemini network error/timeout`; một fetch attempt, retry 0, không có response/usage. `remote_receipt_known=false`: không suy đoán Google đã nhận prompt hoặc đã dùng token.
- [Hồ sơ thất bại gốc](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261012T140529864Z-failed-a0e39948/run.json) được giữ nguyên cùng request, code provenance và checksum. Code hashes trong hồ sơ này là mã lúc attempt, trước guard bổ sung bên dưới.

## Chẩn đoán không gọi model thêm

- GET không xác thực tới gốc `generativelanguage.googleapis.com`: HTTP 404.
- POST body `{}` không có API key tới endpoint generateContent: HTTP 403. Không gửi prompt hoặc dữ liệu dự án; không phải một lần inference được xác thực.
- Kiểm trong bộ nhớ chỉ trả boolean, không trả key: giá trị runner đọc được không chỉ gồm ASCII hiển thị; không có whitespace.
- Giải mã trực tiếp dưới Windows user cũng cho cùng kết quả định dạng bất thường. Do đó không phải chỉ do pipe Node/PowerShell đổi một key ASCII thành ký tự khác.
- Không có response của lần gọi thật nên không quy lỗi transport duy nhất cho định dạng key, và chưa thể kết luận về model access/quota. Định dạng key hiện tại là vấn đề phải xử lý trước lượt thử sau.

## Guard và kiểm chứng tiếp theo

- Key loader và adapter chặn ký tự ngoài ASCII hiển thị, ký tự điều khiển hoặc chuỗi chỉ gồm dấu `*`, không in giá trị và không gọi mạng. Không ép prefix của một loại key Google cụ thể.
- Helper kiểm tra trong memory trước khi Export-Clixml; nhập sai không ghi đè credential cũ. Không sửa, xóa hoặc giải mã ra file plaintext credential thật đã có.
- Bổ sung hai test hồi quy với dữ liệu tổng hợp; toàn bộ **52/52 test pass, 0 skip/fail** dưới Windows user thật. Lệnh: `node --test reasoning/p01/gemini.test.mjs reasoning/p01/reasoning.test.mjs demo/p01/demo.test.mjs`. Các transport test dùng mock, không dùng credential thật hoặc gọi provider.
- PowerShell helper syntax check đạt. Credential path tiếp tục được Git ignore.
- Doctor sau guard dừng với `invalid characters or a masked preview`, không có remote call. Giữ nguyên các run cũ; không sửa bằng chứng thất bại thành pass.

## Bước tiếp theo

Trong AI Studio dùng **Copy key** để lấy giá trị key thật; không sao chép chuỗi bị che trên giao diện. Chạy lại `scripts/configure_gemini_key.ps1`, nhập `REPLACE`, rồi dán key ở prompt ẩn. Dấu `*` xuất hiện khi nhập ở PowerShell là bình thường. Sau khi lưu và kiểm định dạng đạt, xác nhận tiếp tục một lượt smoke test mới; không tạo kết quả fallback.

P01 vẫn `pending_review`, không F1/Ragas chính thức, không mở P02–P04. Một output hợp lệ về schema/path/quote về sau vẫn không thay thẩm định nội dung bởi người review.
