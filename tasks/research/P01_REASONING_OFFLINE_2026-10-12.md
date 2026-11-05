# P01 — bước 3, lớp reasoning offline, 12/10/2026

## Trạng thái

Hoàn thành **phần chuẩn bị/tích hợp offline**, theo lựa chọn “Hoàn thiện offline trước, chọn model sau”. Không gọi provider thật, chưa có phản hồi LLM thật và chưa chọn model. Không coi đây là nghiệm thu pipeline GraphRAG E2E, behavioral-impact ground truth hoặc kết quả bài báo.

Đã đọc toàn bộ `PROJECT_CONTEXT.md` trước khi triển khai. Trạng thái kỹ thuật mới hơn được lấy từ báo cáo bước 1 đã pin; không âm thầm sửa tài liệu bối cảnh, protocol hoặc nhãn.

## Đã triển khai

- Core dùng chung Node/browser: chuẩn bị baseline source + proposed patch, prompt `p01-static-impact/1`, request/context/output schema version 1 và SHA-256.
- Chế độ `graph_assisted` dùng cạnh tĩnh và query Neo4j đã lưu; `source_only` dùng cùng source/patch/symbol universe, không cấp edge/candidate paths. Không gọi source-only là Vector RAG.
- Có giới hạn 1/2/3-hop, byte budget và ghi token_count null. Vượt budget báo lỗi, không âm thầm cắt source. Seed-known, phạm vi ba file Java.
- Chỉ chiếu các artifact kỹ thuật cần thiết vào context, không đọc nhãn, runtime, benchmark provenance, suite/acceptance-label fixtures hoặc score để đưa vào prompt. Test có getter chặn các nguồn này để kiểm việc không truy cập.
- Schema Method tách structural dependency / predicted behavioral impact / need-to-edit; citations phải chỉ ra evidence ID và quote có trong input. Program suy ra dòng source từ quote, không nhận dòng LLM tự khai.
- Validator loại seed/unknown ID/wrong overload/duplicate, quote sai, cạnh bịa, hop/boundary sai hoặc trường approval thêm vào. Không ép predicted set bằng tập hai method của fixture; cho phép trả tập rỗng. Source-only paths được ghi chưa graph-verified.
- Adapter OpenAI Responses API tách riêng, theo OpenAI Docs về Structured Outputs; yêu cầu model/key/confirm-send rõ ràng, schema strict, không tự chọn model, retry hoặc sinh fallback. Test adapter dùng synthetic fetch/response, không liên hệ provider.
- CLI `prepare`, `validate` và đường `live` để dùng sau. Mỗi run có thư mục mới, manifest, request/context hashes, Git HEAD/status và file hashes của code reasoning còn uncommitted. Không gán HEAD main thành SHA của code chưa commit.
- Trang **Context & LLM**: chọn mode/depth/budget, xem/tải request, import JSON cục bộ và xem citations. Không có key hoặc API call trong browser. Import thủ công không xác minh provider/model hoặc việc đã dùng đúng prompt; UI ghi rõ. Đổi context xóa kết quả hiển thị cũ.

## Nguồn cố định và đầu ra thực tế

PetClinic baseline `3858f9c630cf989bb6809a86edf47c2be78dc9f1`, implementation parser/Neo4j `e95613795133088621117179c9fb9592dab62b16`. `demo/p01/data.js` giữ nguyên SHA-256 `053fe6c2caa4c7b47c8fa40d413ebd3c00ea22828c52f56fb1c902081f041689` so với bước 2; không sửa raw artifacts đã đóng gói.

| Cấu hình, depth 2 | Byte context canonical UTF-8 | Context SHA-256 |
| --- | --- | --- |
| graph_assisted | 17763 | `3bd9e542b6d2a3a8d5dd83a35dc00c68cfe5d7b46a6f4f4c9a92544fd5dfc0b1` |
| source_only | 12192 | `4223bceb3ecebbdfd58b82ec79ab4f642aa247db92e6756339918fa260faef21` |

Run bàn giao:

- [Graph-assisted request](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261012T125005110Z-prepared-a3d7b1b0/request.json).
- [Source-only request](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261012T125006420Z-prepared-36437242/request.json).
- Hai run đều `prepared_offline_no_model_output`, `remote_calls=0`; model/provider/usage null. Kiểm lại **4/4 file mỗi run** theo manifest và xác minh request/context hashes, đều khớp.
- Code provenance ghi Node `v24.19.0`, Windows, Git HEAD `65e41a2b4fafa0d37fdd2779985d131a3c7dc116`, `code_is_uncommitted=true`, kèm SHA-256 ba file triển khai. Trạng thái dirty/untracked được ghi thật, không tuyên bố checkout code reasoning sạch.

## Kiểm chứng đã chạy

```powershell
node --test reasoning/p01/reasoning.test.mjs demo/p01/demo.test.mjs
node scripts/check_p01_demo_browser.mjs
```

- **32/32 test Node pass**, 0 fail/skip: 21 test reasoning/adapter và 11 test dữ liệu/viewer/server trước đó. Không phải 32 lần chạy LLM, không phải suite 59 test của Hiển.
- **16 nhóm browser checks pass** trên Chrome `154.0.8037.99`. Bao gồm các thao tác viewer cũ và context download/hash như Node, modes/depth/budget, invalid import, escaped markup, baseline citations, manual-import notice, context-change invalidation, file://.
- Desktop 1440×1000, mobile 390×844: năm trang không làm tràn ngang toàn trang; đã xem screenshot trang reasoning ở cả hai kích thước.
- Không external requests/browser errors ở các test thành công. Thiếu data bundle được thử riêng và hiện lỗi đúng dự kiến. Fake response/usage chỉ nằm trong unit/UI test, không có model result hoặc fake prediction được bàn giao.
- Một lượt browser test ban đầu thất bại do harness đọc `innerText` của JSON trong `details` đang đóng. Đã đổi harness sang `textContent`, chạy lại đạt; không đổi dữ liệu/thuật toán để khớp nhãn. Các lượt browser mới dùng run directory riêng để không ghi đè evidence lượt trước.
- [Browser report của lượt bàn giao](E:/NCKH/code-graphrag-microservices/handoff-out/p01-demo-qa-20261012/20261012T125009236Z-7d03cb9a/browser-report.json) và 10 screenshot trong cùng thư mục.

Server demo đã khởi động ẩn trên loopback `127.0.0.1:8787`; kiểm `/` và `/reasoning-core.js` trả 200. Không mở ra LAN/Internet. Mở [Context & LLM](http://127.0.0.1:8787/#reasoning) hoặc `demo/p01/index.html` trực tiếp.

## Giới hạn còn lại

1. Chưa chọn model/provider, chưa có API/LLM smoke run thật. JSON đúng schema/quote/path không chứng minh đúng lập luận, dự đoán behavioral impact hoặc need-to-edit. Citation có thể tồn tại nhưng không hỗ trợ claim; vẫn cần đánh giá chất lượng riêng.
2. Chưa nối Chroma semantic retrieval, lexical/vector baselines, pipeline source→parser→Neo4j live cho mỗi prediction hoặc API/Service prediction. Lớp mới là recorded graph/source → prepared LLM request → response guard ở cấp Method.
3. Seed được biết trước; method universe chỉ gồm 5 Method trong ba file. Cùng byte ceiling không có nghĩa cùng số token/cost. Chưa dùng source-only pilot control để tuyên bố GraphRAG tốt hơn Vector RAG.
4. Prompt xử lý source như untrusted data nhưng chưa kiểm robustness/prompt-injection bằng LLM thật. Escaping UI được kiểm kỹ thuật, không suy thành bảo đảm reasoning an toàn tuyệt đối.
5. Nhãn P01 vẫn `pending_review`; không mở P02–P04, không khóa split hoặc chấm F1/Ragas. Demo/context system outputs không thay gói source-first reviewer đã đóng băng.

## Git và bước tiếp theo

Giữ nhánh cục bộ `codex/p01-evidence-demo`. Không stage, commit, push hoặc merge; các tracked file hiện có không thay đổi. Giữ các file untracked của công việc trước, source clone, benchmark/raw evidence, labels và gói reviewer.

Tiếp theo, khi quyết định chuyển sang chạy thật: chốt provider/model/cấu hình/ngân sách, cấu hình credential cục bộ nếu cần, xem context đã lọc rồi thực hiện một smoke run với provenance thật. Sau đó nối semantic retrieval và baseline công bằng theo protocol; không lấy output mới này làm ground truth. Chưa cần gửi API key trong chat hoặc thay đổi công việc reviewer.
