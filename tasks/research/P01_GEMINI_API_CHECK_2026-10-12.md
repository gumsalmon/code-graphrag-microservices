# P01 — xác minh key, schema API và lượt thử Gemini, 12/10/2026

> Hồ sơ lịch sử của lượt 503. Lượt smoke sau đó, được người dùng yêu cầu riêng, đã nhận phản hồi hợp lệ; xem [báo cáo mới](E:/NCKH/code-graphrag-microservices/tasks/research/P01_GEMINI_SMOKE_SUCCESS_2026-10-12.md). Các kết quả và bằng chứng bên dưới được giữ nguyên.

## Kết luận

**Key đã dùng được với Google; chưa có dự đoán LLM hợp lệ.** Lượt generateContent mới nhất trả `503 UNAVAILABLE`: provider báo model đang có nhu cầu sử dụng cao và đề nghị thử lại sau. Không sửa key vì lỗi này, không bật billing, tự đổi model hoặc tự retry.

Đã đọc toàn bộ `PROJECT_CONTEXT.md` và kiểm Git status trước khi chạy. Giữ nguyên request/prompt/context/output contract, nhãn, bằng chứng nguồn/runtime, gói reviewer và protocol. Không stage, commit, push hoặc merge.

## Key và kiểm tra chỉ đọc

- Doctor sau khi người dùng lưu lại bằng menu Paste: `key_present_not_api_verified`, nguồn DPAPI cục bộ. Không in key.
- Kiểm trước đó xác nhận giá trị credential cũ chỉ là ký tự Ctrl+V, không phải key. Giá trị này không được đưa vào báo cáo; không sửa credential bằng chương trình tự động. Người dùng tự thay key bằng helper nhập ẩn.
- `GET /v1beta/models?pageSize=1000`, header key chỉ trong memory: HTTP 200, 62 model, không trang tiếp theo. Có `models/gemini-3.8-flash` với `generateContent` trong supported methods. Đây là kiểm key/model metadata, không phải inference hoặc kiểm quota/billing tier.
- Free Tier vẫn là xác nhận của người dùng, không phải một thuộc tính đã kiểm từ response API. Không suy ra quyền inference đầy đủ hoặc chi phí bằng 0 chỉ từ `models.list`.

## Lượt thử trước sửa MIME

[Run HTTP 400](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261012T142440122Z-failed-f84bdb2b/run.json): exit 1, một fetch attempt, retry 0, không prediction/usage. Runner phiên bản này không lưu error body; không bịa thông báo lỗi gốc hoặc coi đã chứng minh lỗi key/quota. Ba file trong manifest đã kiểm checksum đạt.

## Mâu thuẫn tài liệu và sửa transport

Ví dụ REST của [Google structured outputs](https://ai.google.dev/gemini-api/docs/generate-content/structured-output) dùng `responseFormat.text.mimeType = "application/json"`. [Discovery REST v1beta của chính dịch vụ](https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta) trả `TextResponseFormat.mimeType` là enum với `MIME_TYPE_UNSPECIFIED`, `APPLICATION_JSON`, `TEXT_PLAIN`; `schema` là kiểu `any`.

Payload cũ không khớp enum. Đã sửa thành `APPLICATION_JSON`, không đổi schema nội dung dự đoán, model, context, depth, thinking hoặc ngân sách. Đây là một lỗi transport được xác định từ schema dịch vụ; do error body cũ không còn, không khẳng định đã đọc được nguyên nhân chính xác của response 400 đó.

Bổ sung HTTP diagnostics an toàn: body tối đa 64 KiB, parse JSON và kiểm key literal/JSON-decoded trước khi lưu; chỉ giữ code/status/message, message tối đa 2048 ký tự. Không lưu body không an toàn/không đọc được; không in header hoặc key. Failure mới giữ payload không có key và elapsed time. Không tạo fallback prediction.

**53/53 test offline đạt, 0 fail/skip** dưới Windows user thật: 21 Gemini/key, 21 reasoning/OpenAI và 11 viewer/data/server. Lệnh `node --test reasoning/p01/gemini.test.mjs reasoning/p01/reasoning.test.mjs demo/p01/demo.test.mjs`. Test dùng response/usage tổng hợp, không liên hệ provider hoặc dùng credential thật.

## Lượt sau sửa, được xác nhận riêng

Người dùng xác nhận chạy thêm đúng một lượt sau sửa và test offline đạt. Lệnh:

```powershell
node scripts/run_p01_reasoning.mjs live --provider gemini --model gemini-3.8-flash --request handoff-out/p01-reasoning/20261012T125005110Z-prepared-a3d7b1b0/request.json --confirm-send --confirm-free-tier
```

- [Run gốc sau sửa](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261012T143057780Z-failed-e10ea812/run.json), không ghi đè run 400 hoặc các run cũ.
- Model yêu cầu `gemini-3.8-flash`, thinking MEDIUM, max output 8192.
- Request SHA-256 `bba16d754a90c078aaad24c39dcde91e321824939416e30acc9390d98ad0bc8a`; context `3bd9e542b6d2a3a8d5dd83a35dc00c68cfe5d7b46a6f4f4c9a92544fd5dfc0b1`, 17763 byte, graph-assisted 2-hop. Hash đã kiểm trước lượt gọi; không runtime/labels trong context.
- Exit 1, status `failed_no_prediction`, HTTP 503, provider status `UNAVAILABLE`; elapsed 13641 ms, một fetch attempt, retry 0.
- Provider message ghi high demand tạm thời, đề nghị thử sau; không phải một thông báo yêu cầu nâng billing.
- Không provider prediction/response model version/token usage; giữ null, không lấy fixture làm kết quả thật hoặc suy ra đã sinh bao nhiêu token.
- Bốn file của failure manifest kiểm checksum đạt: request, provider-request, code-provenance, run. Code là triển khai chưa commit, được ghi hash riêng; không mạo nhận HEAD là SHA chứa adapter.
- Không gửi thêm inference sau lỗi 503. Một lượt tiếp theo cần xác nhận mới. Theo [Google troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting), 503 là nhóm lỗi tạm thời; không bảo đảm thời điểm dịch vụ sẽ hoạt động lại.

## Trạng thái bàn giao

Hướng dẫn setup và viewer ghi đúng trạng thái: đã thử API nhưng chưa có phản hồi hợp lệ; không hiện dự đoán tổng hợp để che thất bại. Trang demo vẫn offline, không chứa key hoặc tự gọi Google. Chưa hoàn thành smoke inference, semantic retrieval/Vector RAG và toàn bộ pipeline live. P01 vẫn `pending_review`, không chấm F1/Ragas chính thức, không mở P02–P04 và không thay reviewer.

Kiểm giao diện sau cập nhật: **16 nhóm kiểm tra đạt**, 5 trang desktop/mobile và file://, không browser error hoặc external request. [Browser report gốc](E:/NCKH/code-graphrag-microservices/handoff-out/p01-demo-qa-20261012/20261012T143519113Z-c364dbcf/browser-report.json). Git staged diff rỗng, credential vẫn ignored; các file triển khai/báo cáo mới còn untracked trên `codex/p01-evidence-demo`.
