# P01 — triển khai unknown/abstention phiên bản mới, 15/10/2026

## Kết luận

Đã triển khai cùng quy tắc cho Vector và Graph+Vector: chỉ record có dependency/behavior/repair đều `unknown`, path rỗng, hop/boundary null mới được để citations rỗng. Mọi record khác, kể cả `not_established` hoặc `unlikely`, vẫn cần ít nhất một citation; summary luôn cần citation. ID, seed exclusion, overload, duplicate, rationale, exact quote và path guards giữ nguyên.

Đã đọc toàn bộ `PROJECT_CONTEXT.md` và kiểm status/diff trước hành động. Thực hiện theo phê duyệt của Huy, không tự duyệt nhãn hoặc mở P02. [Quyết định và contract chi tiết](../../reasoning/p01/ABSTENTION_CONTRACT.md) ghi trước/sau, version, ranh giới áp dụng và limitations. Các thay đổi viewer/reviewer/research đã có được giữ nguyên.

## Version và triển khai

- Request mới: `p01-reasoning-request/3`, prompt `p01-static-impact/2`, context retrieval giữ schema `/2` với prompt version mới, validation `/2`.
- Prompt, schema `anyOf` và validator đồng bộ; không dùng flag nới kiểm tra trên request cũ. Cần nhiều trường đồng thời unknown, không chỉ dependency unknown.
- `withAbstentionContract` tạo bản sao có hash mới; không sửa original request/source/patch/ranking/graph/registry hoặc đọc response/nhãn.
- `preparePair` của pipeline mới mặc định dùng version mới cho cả hai phía; checker đọc version đã lưu để dựng lại legacy. Low-level legacy builder và hằng cũ giữ nguyên nhằm tái lập lịch sử.
- Record unknown mới ghi `assessment_kind=abstention`, `abstention_is_negative_label=false`; viewer hiển thị “CHƯA ĐỦ BẰNG CHỨNG · KHÔNG PHẢI NHÃN ÂM”. Không cho phép ghép hai version thành một cặp.
- Công cụ `scripts/prepare_p01_abstention.mjs` chuẩn bị/kiểm gói request offline, không import credential loader trực tiếp, không gọi inference hoặc tái phân loại response cũ. Source parser và adapter/model không bị thay để tối ưu theo kết quả.
- Sửa khởi tạo dependency Node của comparison core để import độc lập không phụ thuộc thứ tự import global; browser vẫn dùng core đã tải trước theo script order.

## Cặp request mới chỉ chuẩn bị offline

Thư mục: `handoff-out/p01-contract/20261015T064526833Z-96bc2152`.

- [Vector request](../../handoff-out/p01-contract/20261015T064526833Z-96bc2152/vector-request.json), request SHA-256 `51ee656454835119fa03f3973ecc2e988d2997a29a5842c486596c9e3d93001d`.
- [Graph+Vector request](../../handoff-out/p01-contract/20261015T064526833Z-96bc2152/graph-vector-request.json), request SHA-256 `8f53c0484537f4740e4d695f9603b37d5034716bbe210b0e4b8838bd04c3c251`.
- **8/8 artifact** qua manifest/reconstruction. Hai provider payload có cùng generation config, model và output schema; cùng source/patch/retrieval/top-k/registry/byte ceiling, chỉ khác phần graph như cặp nguồn.
- Manifest SHA-256 `8e985736f34382bd67175c404cf8812024d2cb2cfac8f469894a8399268bc6d0`.
- Run status `prepared_abstention_contract_no_llm_no_rescoring`, remote_calls=0, usage=null, scoring=false, labels=pending_review. Code mới chưa commit; provenance ghi HEAD/status và hash code thực tế, không gán HEAD cũ thành commit chứa tính năng mới.
- Không có response hoặc validation của model thật cho contract này. Hai call transport giả trong test là fixture tổng hợp, không phải lượt API hoặc số liệu nghiên cứu.

## Bảo toàn kết quả cũ đã kiểm

- Gói retrieval cũ đạt 18/18 artifact; nguồn không bị ghi đè.
- Vector ngày 15/10: 5/5 artifact, vẫn `response_rejected`, lỗi `Citations required: method_prediction`.
- Graph+Vector ngày 15/10: 7/7 artifact, vẫn chỉ `structurally_valid_prediction_not_ground_truth`.
- [Gói comparison lịch sử](../../handoff-out/p01-comparison/20261015T060823929Z-9904ae18/comparison.json) vẫn SHA-256 `e286605faa5f76e5e7d0156b6f1250737139195b91ee3a9c41515852d44b6f86`, 57984 byte; browser nhập và kiểm lại trạng thái cũ.
- Pipeline ngày 13/10 `20261013T135849833Z-69eebc44` dựng lại đạt 46/46 artifact theo prompt cũ. Đây là kiểm read-only, không chạy lại Docker/Neo4j/Chroma.
- `demo/p01/data.js` vẫn SHA-256 `053fe6c2caa4c7b47c8fa40d413ebd3c00ea22828c52f56fb1c902081f041689`; `PROJECT_CONTEXT.md` vẫn `f2749bcba2e65f3339ef0c0ffcc1917d04ee0013e9776b506600c4f5edad679c`.
- Không sửa run.json/response/validated/provenance/checksum hoặc nhãn lịch sử. Không đưa response Vector cũ dưới request mới để đổi kết quả thành pass.

## Kiểm thử thực tế

- **105/105 Node tests pass, 0 fail/skip**: 92 test đã có + 13 nhóm test contract mới. Test DPAPI chỉ dùng chuỗi tổng hợp dưới Windows user thật; không đọc key Gemini thật trong lượt này.
- Kiểm 36 tổ hợp dependency/behavior/repair trên mỗi cấu hình với citations rỗng. Schema constraints và validator chỉ nhận tổ hợp thuần unknown. Test còn kiểm path/count sai, seed/ID/duplicate/rationale, citations sai kiểu/quote giả, summary không citation, spoof version và không thay input.
- Kiểm builder mặc định mới/explicit legacy bằng chạy hàm thật, không chỉ đọc source. Fake transport kiểm cả hai request mới; không network/provider thật.
- **20 nhóm browser checks pass**, Chrome `155.0.8059.40`, desktop/mobile/file://. Fixture unknown phiên bản mới được nhận và gắn nhãn riêng; ngay sau đó gói kết quả API lịch sử vẫn hiện 1/2 phản hồi qua kiểm cấu trúc. Test không lưu fixture mới làm prediction API.
- [Browser report](../../handoff-out/p01-demo-qa-20261012/20261015T065305483Z-423b92dc/browser-report.json): không browser error hoặc external request. Server/browser QA đã đóng.
- `git diff --check` đạt; staged diff rỗng. Chưa commit/push/merge. Working tree có thay đổi source của hai lượt kỹ thuật cùng các file untracked reviewer/research được giữ lại, không tuyên bố sạch.

## Giới hạn và bước tiếp theo

Hợp đồng mới đã qua kiểm thử offline, **chưa được Gemini thật xác nhận chấp nhận schema hoặc trả prediction hợp lệ**. Tài liệu [structured outputs chính thức](https://ai.google.dev/gemini-api/docs/structured-output?hl=en) mô tả các keyword đã dùng; đó không thay thế một lượt API thật. Không tự đổi endpoint, model hoặc bật billing nếu provider từ chối schema.

Validator chỉ kiểm trạng thái/cấu trúc/quote/path; không chứng minh rationale không chứa một khẳng định vô căn cứ bằng văn bản. Mọi nhận định tác động/repair vẫn cần kiểm ngữ nghĩa và reviewer thật. Abstention không trở thành negative; chưa sửa scorer/metric để quy đổi unknown.

Bước kỹ thuật tiếp theo, nếu được duyệt riêng: chạy đúng một attempt mỗi cấu hình bằng **cặp request mới**, giữ nguyên mọi thành công/lỗi và provenance. Không dùng output cũ thay inference mới. Nhãn P01 vẫn pending_review, P02–P04 chưa mở, split chưa khóa; việc triển khai contract không thay quyết định reviewer hoặc điều kiện protocol.
