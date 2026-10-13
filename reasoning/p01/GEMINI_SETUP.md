# Gemini 3.8 Flash — thiết lập smoke test P01

Model đã chọn cho lượt thử: `gemini-3.8-flash`. Smoke bước 3 đã nhận kết quả thật qua kiểm cấu trúc ngày 12/10/2026; một lượt đạt không chứng minh quota luôn sẵn có hoặc chất lượng dự đoán tổng quát.

Cập nhật 12/10/2026: sau lượt `503 UNAVAILABLE` lịch sử, người dùng yêu cầu một lượt mới với request v1 cũ. Gemini trả model `gemini-3.8-flash`, finish reason `STOP`, 5606 input + 2356 output + 901 thinking = 8863 token, 21934 ms. Không retry, đổi model hoặc bật billing. Chi tiết tại [báo cáo smoke thành công](E:/NCKH/code-graphrag-microservices/tasks/research/P01_GEMINI_SMOKE_SUCCESS_2026-10-12.md); [báo cáo API trước đó](E:/NCKH/code-graphrag-microservices/tasks/research/P01_GEMINI_API_CHECK_2026-10-12.md) vẫn giữ lịch sử key/MIME/503.

Cập nhật 13/10/2026: đã gọi riêng hai request retrieval v2 Vector và Graph+Vector, một lần mỗi cấu hình, đều trả 503 high demand. Chưa có output v2 hợp lệ; không cần nhập lại key hoặc tự bật billing theo thông báo này. Xem [hồ sơ cặp v2](E:/NCKH/code-graphrag-microservices/tasks/research/P01_GEMINI_PAIRED_ATTEMPT_2026-10-13.md). Các lệnh dưới đây không tự retry, và lượt mới cần được xác nhận riêng.

## 1. Tạo key và giữ Free Tier

1. Mở [Google AI Studio — API keys](https://aistudio.google.com/apikey), đăng nhập Google.
2. Chọn **Create API key**, tạo/chọn project riêng cho nghiên cứu nếu được yêu cầu. AI Studio có thể yêu cầu chấp nhận điều khoản hoặc hoàn thiện quyền truy cập account/project.
3. Giữ project ở **Free Tier**. Không chọn **Set up billing**, không nhập thẻ hoặc nâng tier để làm bước này. Nếu giao diện chỉ cho paid access/không có quota, dừng và kiểm lại account/quyền truy cập, không tự bật billing.
4. Không gửi key trong chat, ảnh chụp hoặc repository. Google hướng dẫn tạo/quản lý key trong [tài liệu API key](https://ai.google.dev/gemini-api/docs/api-key).

Free Tier có quota và chính sách sử dụng nội dung để cải thiện sản phẩm; chỉ gửi public source + proposed patch + graph context đã lọc, không nhãn hoặc dữ liệu bí mật. Tài liệu [pricing](https://ai.google.dev/gemini-api/docs/pricing) và [data terms](https://ai.google.dev/gemini-api/terms) là nguồn kiểm lại; không cam kết một key bất kỳ luôn có quota hoặc luôn miễn phí.

## 2. Lưu key trên Windows, không in ra màn hình/history

Mở PowerShell trên máy, dưới tài khoản Windows sẽ chạy CLI. Chạy:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\configure_gemini_key.ps1"
```

Khi thấy **Dan Gemini API key**, dán key rồi Enter. Với cửa sổ Windows PowerShell kiểu cũ, dùng chuột phải trên thanh tiêu đề → **Edit → Paste** ở prompt nhập ẩn; Ctrl+V có thể được nhận thành ký tự điều khiển thay vì dán clipboard. Đã quan sát đúng trường hợp này trên máy chạy pilot. Nội dung được nhập ẩn; không đặt key trực tiếp vào dòng lệnh. `ExecutionPolicy Bypass` chỉ cho process chạy script này, không sửa execution policy toàn máy.

Helper lưu SecureString CLIXML trong `handoff-out/credentials/gemini-api-key.clixml`, Windows DPAPI, Git ignored. Chỉ cùng user trên cùng máy giải mã được. Nếu thay key, helper yêu cầu nhập `REPLACE`; không âm thầm ghi đè. Không gửi file credential hoặc chuyển nó sang máy khác. [Tài liệu Microsoft về CLIXML/DPAPI](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/export-clixml).

Helper nạp module của đúng phiên bản PowerShell, tránh Windows PowerShell 5 kế thừa module PowerShell 7. Sandbox hoặc process impersonation không có user profile đầy đủ có thể không giải mã được; chạy CLI dưới đúng Windows user, không bỏ mã hóa để che lỗi. Khi Codex cần đọc key qua runner, có thể cần quyền thực thi trên Windows user thật.

Không gọi flag nội bộ `-ReadForRunner` ở terminal hoặc tool transcript; nó chỉ dùng để Node nhận secret trong pipe memory. Nếu không muốn lưu key, có thể dùng biến môi trường trong terminal riêng; không dán key vào chat hoặc ghi key trong shell history. Các environment variables là phương án nâng cao, không bắt buộc khi dùng helper.

## 3. Kiểm tra local, không gọi Google

Từ thư mục repository:

```powershell
node scripts/run_p01_reasoning.mjs doctor --provider gemini
```

`key_present_not_api_verified` chỉ xác nhận runner đọc được key cục bộ; không xác minh account/model/quota/billing. Lệnh không in key và không gọi API.

Nếu thấy lỗi `invalid characters or a masked preview`, chuỗi đã nhập không có định dạng header mà adapter chấp nhận. Dấu `*` do PowerShell hiển thị lúc nhập là bình thường, nhưng không sao chép chuỗi che key từ trang web. Dùng nút **Copy key** trong AI Studio, chạy lại helper, nhập `REPLACE` khi được hỏi rồi dán key thật. Có thể chuyển bộ gõ sang tiếng Anh trước khi dán. Không gửi key hoặc ảnh chụp key để nhờ kiểm tra.

Helper kiểm tra ký tự trước khi lưu; nếu nhập sai thì không ghi đè credential cũ. Loader/adapter cũng chặn key có ký tự ngoài ASCII hiển thị, ký tự điều khiển hoặc chỉ gồm dấu `*`, trước khi gọi mạng. Kiểm tra định dạng đạt vẫn chưa chứng minh key được Google chấp nhận.

## 4. Chuẩn bị request và payload không có key

```powershell
node scripts/run_p01_reasoning.mjs prepare --mode graph_assisted --depth 2
node scripts/run_p01_reasoning.mjs provider-plan --provider gemini --request PATH_TO_REQUEST_JSON
```

`prepare` tạo request provider-independent. `provider-plan` tạo payload Gemini offline vào run directory mới, chưa gửi Google. Giữ request/context đã có checksum; không tự sửa để cải thiện dự đoán hoặc lấy runtime/nhãn làm câu trả lời.

Payload hiện dùng `systemInstruction`, một user `contents`, `generationConfig.responseFormat` JSON Schema, thinking `MEDIUM`, `includeThoughts=false`, maxOutputTokens 8192. `responseFormat.text.mimeType` dùng enum **`APPLICATION_JSON`**, được đối chiếu với [REST discovery v1beta của dịch vụ](https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta). Ví dụ structured-output hiện dùng chuỗi `application/json`, khác enum trong discovery; adapter theo schema của dịch vụ. Không thay contract/schema nội dung đầu ra để khắc phục khác biệt transport này. Không gửi sampling/candidate-count parameters cũ. Tham khảo [Google structured outputs](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/latest-model).

## 5. Một lần gọi thật, sau khi key và Free Tier đã sẵn sàng

```powershell
node scripts/run_p01_reasoning.mjs live --provider gemini --model gemini-3.8-flash --request PATH_TO_REQUEST_JSON --confirm-send --confirm-free-tier
```

Hai flag xác nhận đồng ý gửi context đã lọc và đã kiểm project Free Tier. Runner không tự biết billing tier; không suy ra Free Tier chỉ từ key hoặc response. Không tự upgrade billing, tự retry hoặc đổi model nếu không có quota.

Có thể chỉ định `--thinking-level low|medium|high`, `--max-output-tokens 256..16384`; phải ghi và giữ cùng cấu hình khi so sánh source-only/graph-assisted. Không coi output cap là hard cap tổng token suy nghĩ hoặc tiền; lưu token usage thật. Timeout 60 giây.

HTTP 400/401/403/404/429, SAFETY, MAX_TOKENS, model mismatch, JSON/citation/path lỗi sẽ dừng và lưu hồ sơ failed. Không có dự đoán fallback hoặc F1. Response 200 nhưng không qua validator vẫn được giữ làm failure evidence an toàn, không coi là pipeline đạt.

HTTP errors có thể lưu `provider_error` đã giới hạn kích thước và kiểm không chứa key (kể cả JSON-escaped echo), chỉ giữ code/status/message; body không an toàn hoặc không đọc được bị loại. `503 UNAVAILABLE` là lỗi phía dịch vụ, không tự chứng minh thiếu quota hoặc cần nâng billing. Không tự retry; lượt tiếp theo cần xác nhận riêng.

Run hợp lệ lưu request, provider payload/raw response, response JSON, validation, code hashes, requested/returned model, usage, thời gian, manifest. Không lưu key, Authorization/API-key headers hoặc credential file. `estimated_cost=null`, không bịa số USD hay khẳng định model miễn phí cho mọi account.

Thử P01 không thay review độc lập: nhãn vẫn `pending_review`; chưa mở P02–P04 hoặc chấm chính thức. Chroma semantic retrieval đã chạy offline riêng ở bước 4, nhưng smoke này dùng graph-assisted v1, chưa gọi Gemini trên cặp context Vector/Graph+Vector v2. Kết quả đạt schema/path/quote cũng chưa chứng minh dự đoán hành vi/cần sửa đúng.
