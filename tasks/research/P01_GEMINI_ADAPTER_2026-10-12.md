# P01 — adapter Gemini 3.8 Flash, 12/10/2026

## Quyết định và trạng thái

Theo chỉ dẫn chọn Gemini 3.8 Flash, đã triển khai adapter `gemini-3.8-flash` cho smoke test P01. Đây là lựa chọn pilot, chưa chốt model/cấu hình dùng cho toàn bộ thực nghiệm bài báo.

**Adapter, CLI, key setup và test offline đã hoàn thành. Chưa có key cục bộ; chưa gọi Gemini thật, chưa xác minh model access/quota và chưa có dự đoán LLM thật.** Không coi transport fixtures là bằng chứng API thật hoặc nghiệm thu GraphRAG E2E.

Đoạn trạng thái trên ghi thời điểm bàn giao adapter. Cập nhật tiếp theo cùng ngày: đã đọc được credential người dùng lưu, một lượt gọi thất bại trước khi có phản hồi provider; phát hiện chuỗi credential có ký tự bất thường và bổ sung kiểm tra trước mạng. Chưa có dự đoán thật. Chi tiết tại [báo cáo lượt thử](E:/NCKH/code-graphrag-microservices/tasks/research/P01_GEMINI_SMOKE_ATTEMPT_2026-10-12.md).

Cập nhật sau khi nhập lại bằng Paste: Google đã chấp nhận key ở `models.list`. Đã sửa enum MIME theo discovery của dịch vụ; 53/53 test offline đạt. Một lượt được xác nhận riêng sau sửa trả `503 UNAVAILABLE` do high demand, chưa có dự đoán. Xem [kiểm tra API và lần thử sau sửa](E:/NCKH/code-graphrag-microservices/tasks/research/P01_GEMINI_API_CHECK_2026-10-12.md). Các kết quả 50/52 test và run cũ bên dưới/trong báo cáo trước vẫn là lịch sử, không bị thay thành kết quả mới.

Đã đọc toàn bộ `PROJECT_CONTEXT.md` trước khi sửa. Giữ nguyên protocol, labels, source/runtime artifacts, gói reviewer và bundle dữ liệu của bước 2.

## Phạm vi triển khai

- `reasoning/p01/gemini-adapter.mjs`: endpoint cố định REST v1beta `gemini-3.8-flash:generateContent`, `x-goog-api-key` ở header, không key trong URL/prompt/payload/evidence.
- Theo Google Docs hiện hành: `systemInstruction`, `contents`, `generationConfig.responseFormat` JSON Schema; inline citation definition nhưng không thay contract output/core prompt/context.
- Default thinking MEDIUM, includeThoughts false, maxOutputTokens 8192, timeout 60 giây. Không sampling parameters cũ, tool/search, cache chỉ định, candidate count cũ, auto-retry hoặc tự đổi model.
- Ghi requested/returned model, response ID, `usageMetadata`, elapsed time, config, request/code hashes. Cost vẫn null; Free Tier là xác nhận của người dùng, không phải điều đã kiểm được từ API.
- HTTP errors, blocked/SAFETY, MAX_TOKENS, model mismatch, tool part, JSON/ID/citation/path sai không thành kết quả hợp lệ. Response 200 nhưng fail giữ raw/payload an toàn và usage cho phân tích lỗi; không sinh validated prediction. Body echo key bị loại, không được lưu.
- CLI thêm `provider-plan --provider gemini`, `doctor --provider gemini` và `live --provider gemini ... --confirm-send --confirm-free-tier`. Không thay default OpenAI cũ một cách âm thầm; key/provider không dùng lẫn.
- `scripts/configure_gemini_key.ps1`: nhập ẩn, lưu Windows SecureString CLIXML/DPAPI ở `handoff-out/credentials/gemini-api-key.clixml`, đã kiểm Git ignore. Không tự tạo key hoặc bật billing. Reader nội bộ chỉ đưa key vào pipe của Node, không in vào transcript.
- Key loader ưu tiên environment rõ ràng hoặc DPAPI; hai environment keys khác nhau báo lỗi. Không giải mã được thì fail, không hạ xuống plaintext. Cần cùng Windows user và máy đã lưu key.
- UI **Context & LLM** ghi model đã chọn cho smoke test nhưng vẫn offline/chưa có lượt thật, không thêm key input hoặc browser API calls. Request core vẫn provider-independent; chưa thay label/scoring/schema benchmark.

## Kiểm chứng

Lệnh test:

```powershell
node --test reasoning/p01/gemini.test.mjs reasoning/p01/reasoning.test.mjs demo/p01/demo.test.mjs
node scripts/check_p01_demo_browser.mjs
node scripts/run_p01_reasoning.mjs doctor --provider gemini
```

- **50/50 test Node pass, 0 skip/fail** trong Windows user thật: 18 Gemini/key, 21 reasoning/OpenAI, 11 viewer/data/server. Không provider thật trong test; mọi transport dùng fetch/response tổng hợp.
- Test CLIXML/DPAPI trong memory dùng chuỗi tổng hợp, không key/API thật và không ghi credential giả vào store của người dùng. Cipher XML không chứa plaintext; decrypt round trip đúng trong cùng Windows user.
- Phát hiện hai vấn đề môi trường trước lượt đạt: Windows PowerShell 5 kế thừa module path PowerShell 7, rồi DPAPI không có profile đầy đủ trong sandbox. Helper/test đã nạp native modules rõ ràng; test DPAPI chạy lại ngoài sandbox dưới Windows user thật và đạt. Không bỏ test/không đổi sang plaintext để báo pass. Environment/API-key mode vẫn hỗ trợ riêng.
- PowerShell helper đã kiểm syntax và `-Check`; credential file chưa tồn tại. `doctor` ghi `key_missing`, `remote_calls=0`; không in key hoặc gọi Google.
- **16 nhóm browser checks pass**, 5 trang ở desktop/mobile/file://. Không browser error hoặc external request ở các case thành công. [Browser report](E:/NCKH/code-graphrag-microservices/handoff-out/p01-demo-qa-20261012/20261012T133312245Z-5dbb70af/browser-report.json).
- Demo loopback `/` trả 200, có thông báo Gemini mới. Server không có API chạy model hoặc credential route.

## Provider plan bàn giao

[Provider-plan run](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261012T133932551Z-gemini-plan-0d40dc49/run.json), [payload không key](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261012T133932551Z-gemini-plan-0d40dc49/provider-request.json).

Status `prepared_gemini_no_remote_call`, model `gemini-3.8-flash`, `remote_calls=0`. Dùng request graph-assisted depth 2 đã có, context hash `3bd9e542b6d2a3a8d5dd83a35dc00c68cfe5d7b46a6f4f4c9a92544fd5dfc0b1`. Run mới ghi code hashes cho core/adapters/key loader/helper/CLI; không giả định HEAD main là SHA của phần code chưa commit. Các plan/run cũ được giữ, không ghi đè.

## Phần cần người dùng làm

Tạo key trong [Google AI Studio](https://aistudio.google.com/apikey), giữ project Free Tier, không bật billing. Sau đó chạy helper nhập ẩn theo [hướng dẫn cục bộ](E:/NCKH/code-graphrag-microservices/reasoning/p01/GEMINI_SETUP.md). Không gửi key/credential file trong chat.

Sau khi key sẵn sàng và đọc được dưới đúng user, thực hiện **một** smoke run với consent gửi filtered context và xác nhận Free Tier. Nếu quota/model/key lỗi, dừng và giữ kết quả thật; không tự nâng tier hoặc đổi model. Token/response/provenance thật là phần chưa có, không lấy giá trị fixture thay thế.

Nhãn P01 vẫn `pending_review`; chưa chấm F1/Ragas, chưa mở P02–P04 hoặc nối semantic retrieval/Vector RAG/full live pipeline. Schema/path/quote pass không chứng minh behavioral prediction đúng và không thay reviewer.

Không stage, commit, push hoặc merge. Không sửa tracked file hiện có/`PROJECT_CONTEXT.md`, code của Hiển/Phát hoặc bằng chứng đóng băng. Các thay đổi nằm trong những file triển khai/demo mới của luồng đang làm và báo cáo này.

## Nguồn chính thức đã đối chiếu

- [Google structured outputs](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).
- [Google REST generateContent](https://ai.google.dev/api/generate-content).
- [Gemini 3.8 Flash API changes](https://ai.google.dev/gemini-api/docs/latest-model).
- [Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key).
- [Microsoft CLIXML và Windows DPAPI](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/export-clixml).
