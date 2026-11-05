# Bộ kiểm tiếp nhận checkpoint — prototype tổng hợp

Hỗ trợ coordinator phát hiện sớm lỗi input binding/version/hash, thiếu/trùng ID, seed lẫn eligible, polarity/behavior mâu thuẫn, thiếu file notes/exposure/evidence và tuyên bố acceptance sai trạng thái. Chỉ nhận dữ liệu được caller cấp trong bộ nhớ; không đọc filesystem, gọi Git/Docker/model, tạo nhãn hoặc chạy phương pháp trên P02/P03.

```powershell
node --test prototypes/checkpoint-intake/checkpoint-intake.test.mjs
```

Tất cả fixture là tổng hợp, không trỏ nhãn hoặc evidence ca thật. API `auditCheckpoint` kiểm một tập trường trong benchmark draft hiện hành; đây không phải schema nhãn mới hoặc áp shared output contract D01–D08. Format Phát bàn giao khác thì cần adapter được rà đúng format, không sửa nhãn để qua prototype. Caller vẫn phải xác minh corpus bytes/paths, source/raw refs và hợp đồng thực tế trong intake riêng.

Output phân biệt `mechanical_ok`, `human_confirmation_declared` và `human_reading_certified` (luôn false). `real_case_execution_authorized` luôn false: prototype không tạo receipt, đổi bảng việc hoặc mở gate D20. AI-only proposal có thể có file/hash đúng mà vẫn thiếu checkpoint người thật. Một checkbox hoặc tên con người do AI điền cũng không chứng minh đã đọc.

Chưa kiểm toàn schema/evidence file-dòng/ngữ nghĩa/chronology, duplicate JSON keys hoặc độ đúng khoa học; limitations được ghi ở output. Chưa áp prototype lên return thật, production parser/Neo4j/retrieval/scorer hoặc nhãn P02/P03. Sau return vẫn cần coordinator kiểm bản nhận và lời xác nhận/notes/exposure thực tế theo `tasks/CHECKPOINT_INTAKE_2026-10-31.md`.
