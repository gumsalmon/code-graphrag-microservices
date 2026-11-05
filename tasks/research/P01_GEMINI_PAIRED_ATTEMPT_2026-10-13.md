# P01 — thử cặp Vector / Graph+Vector bằng Gemini, 13/10/2026

## Kết quả

**Đã thực hiện một lượt gọi cho mỗi cấu hình; cả hai trả HTTP 503 `UNAVAILABLE` do provider báo model đang có nhu cầu sử dụng cao. Chưa có cặp dự đoán hợp lệ để đối chiếu.** Không tạo response thay thế, không lấy lượt graph-assisted v1 thành công hôm trước ghép với context Vector v2 để giả làm so sánh có kiểm soát.

Người dùng yêu cầu tiến hành bước tiếp theo sau smoke bước 3. Đã đọc toàn bộ `PROJECT_CONTEXT.md`, kiểm Git status và đọc lại setup/report retrieval. Mục tiêu là dùng đúng hai request v2 đã chuẩn bị, cùng model/config, lưu provenance và đối chiếu dự đoán/token/thời gian nếu provider trả output hợp lệ. DoD so sánh chưa đạt vì không có output, không phải vì nhãn được reviewer chấp thuận hoặc bị từ chối.

Không tự retry, đổi model, bật billing, nhập lại key hoặc thay top-k/prompt/schema sau lỗi. Không sửa `PROJECT_CONTEXT.md`, code parser/Neo4j/Chroma của Hiển, raw evidence/nhãn/protocol của Phát hoặc gói source-first reviewer. Không stage, commit, push hoặc merge.

## Đầu vào kiểm trước khi gửi

- Dùng [run retrieval cố định](E:/NCKH/code-graphrag-microservices/handoff-out/p01-retrieval/20261012T151104176Z-89ba55ec/run.json), không chạy lại Docker/model hoặc query mới. Checker xác minh **18/18 file** và so với run `20261012T145915661Z-5efcabcf`: cùng corpus, ranking/distances và request hashes. Các request/context/provider plan được dựng lại từ baseline và khớp file lưu.
- PetClinic baseline `3858f9c630cf989bb6809a86edf47c2be78dc9f1`, implementation `e95613795133088621117179c9fb9592dab62b16`. Bundle giữ SHA-256 `053fe6c2caa4c7b47c8fa40d413ebd3c00ea22828c52f56fb1c902081f041689`. Corpus SHA-256 `83e83b2b8841b5b6d9c9d30885df275265e0af918896e7a7fd13d6141dd77117`.
- Hai request có cùng seed/change, source excerpts/patch, source registry, method registry, query/top-k/ranking, prompt, output schema và byte ceiling 32768. Vector không được cấp graph hoặc candidate paths; Graph+Vector thêm các cạnh, đường đi và unresolved đã ghi. Đã kiểm payload có `generationConfig` giống nhau.
- Registry 5 method chỉ là phạm vi kỹ thuật, không phải evaluation universe độc lập được reviewer phê duyệt. Top-k 5 giữ nguyên: chỉ có các chunk provider, không client/controller. Không dùng nhãn hay graph làm oracle để đổi thứ hạng hoặc lựa chọn chunk.
- Doctor đọc được key DPAPI cục bộ mà không in giá trị; không gọi `models.list` hoặc API khác trong lượt này. Free Tier vẫn là xác nhận của người dùng, không phải thuộc tính đã xác minh từ provider. Key chỉ trong memory/header của runner, credential vẫn Git ignored.

| Cấu hình | Context byte UTF-8 | Request canonical SHA-256 |
| --- | ---: | --- |
| vector_retrieved | 8860 | `a7278d6656422e333f0d985932430734e7d2a4804b89cb2882e89c64b1e2c4c0` |
| graph_vector | 14424 | `069af7bbb66613d162b5f7ef1b1eb3c6281b55b882f6dfd613ca82cd3ce8b09f` |

Context SHA-256 lần lượt `22b165c3485f54972fba90271a0d406216eb06f4a9c4638b956ba843abfc82e9` và `64612cf49ee8963657e6073cfd1188c0f5be690baf3658dc6b1329b7f236eb02`. Hash canonical khác hash byte JSON pretty-printed; cả hai loại được phân biệt, không sửa byte để làm hash khớp.

## Lượt gọi thật

Chạy tuần tự Vector trước, Graph+Vector sau, một attempt mỗi cấu hình. Cấu hình chung: requested model `gemini-3.8-flash`, API `v1beta`, thinking MEDIUM, max output 8192, `includeThoughts=false`, MIME enum `APPLICATION_JSON`, cùng system prompt/output schema. Không tools/search hoặc model fallback.

```powershell
node scripts/run_p01_reasoning.mjs live --provider gemini --model gemini-3.8-flash --thinking-level medium --max-output-tokens 8192 --request handoff-out/p01-retrieval/20261012T151104176Z-89ba55ec/vector-request.json --confirm-send --confirm-free-tier
node scripts/run_p01_reasoning.mjs live --provider gemini --model gemini-3.8-flash --thinking-level medium --max-output-tokens 8192 --request handoff-out/p01-retrieval/20261012T151104176Z-89ba55ec/graph-vector-request.json --confirm-send --confirm-free-tier
```

| Cấu hình | Trạng thái | HTTP / provider status | Thời gian đến lỗi | Attempt / retry | Usage |
| --- | --- | --- | ---: | --- | --- |
| Vector | failed_no_prediction | 503 / UNAVAILABLE | 2326 ms | 1 / 0 | null |
| Graph+Vector | failed_no_prediction | 503 / UNAVAILABLE | 1290 ms | 1 / 0 | null |

- [Vector run](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261013T133513321Z-failed-7fbd2ce4/run.json).
- [Graph+Vector run](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261013T133535532Z-failed-364fae7d/run.json).
- Provider của cả hai ghi `code=503`, `status=UNAVAILABLE`, message mô tả high demand tạm thời và đề nghị thử sau. Đây là error metadata đã qua giới hạn/kiểm an toàn, không lưu error body HTTP nguyên bản. Không suy ra thiếu key, cần nâng billing hoặc thời điểm provider chắc chắn hoạt động lại.
- Cả hai CLI exit 1; tổng **2 fetch attempts, 0 retries**. `remote_receipt_known=true` trong telemetry vì đã nhận response HTTP. Dòng `note` generic trong runner nói receipt chưa biết trên failure không chính xác cho trường hợp có HTTP response này; dùng trường telemetry cụ thể, không sửa lại evidence gốc.
- Không returned model version/response ID/final text/prediction/token usage. Requested model không được trình bày như model version đã xác nhận từ output. Không đặt null thành 0 hoặc khẳng định các request lỗi không thể tiêu thụ quota/chi phí; `estimated_cost=null`.
- Các thời gian trên là độ trễ của response lỗi, **không phải latency suy luận hợp lệ**. Không kết luận Graph+Vector nhanh hơn Vector dựa trên 1290/2326 ms, hoặc so với 21934 ms của smoke v1 hôm trước.

## Kiểm bằng chứng sau lượt gọi

- **4/4 file mỗi failure run** khớp manifest: `request.json`, `provider-request.json`, `code-provenance.json`, `run.json`; không thiếu/thừa hoặc prediction/validation giả. Manifest path/duplicate/symlink được kiểm trước checksum.
- Request lưu sau failure khớp hoàn toàn request v2 gốc đã gửi; core verify request và payload dựng lại cùng config đều khớp. Metadata request SHA, endpoint, generation config, attempt/retry và error status được đối chiếu.
- **9/9 code hashes mỗi run** khớp implementation hiện tại; toàn bộ code provenance hai run giống nhau, HEAD `65e41a2b4fafa0d37fdd2779985d131a3c7dc116`, Node `v24.19.0`, Windows. Code triển khai còn uncommitted; HEAD không phải commit chứa phần code mới.
- SHA-256 `run.json` Vector: `a3e15b439a94d31a536086c88100b1587b7edd784a8f9826f6382893a896ee61`.
- SHA-256 `run.json` Graph+Vector: `4833f62835746e71a48035c59358e90b6a6bde73531f81820447f4a2abdfd790`.
- [Hồ sơ kiểm cặp, máy đọc được](E:/NCKH/code-graphrag-microservices/handoff-out/p01-paired-qa-20261013-aecdbf76/pair-integrity.json) ghi `integrity_verified_both_provider_calls_failed`; prediction/token comparison và quality metrics đều null. `plan` lồng bên trong vẫn là plan offline ban đầu, có `calls=0`; hai call thực tế nằm ở `runs` và `total_remote_calls=2`, không viết lại plan cũ.
- **67/67 test Node pass, không fail/skip** sau lượt gọi: retrieval/context v2, Gemini/key, reasoning/OpenAI và viewer/data/server. [Log gốc](E:/NCKH/code-graphrag-microservices/handoff-out/p01-paired-qa-20261013-aecdbf76/node-tests.log). Các response/ranking/usage fixture tổng hợp chỉ là test, không phải thay thế output hai lượt lỗi.
- SHA-256 `pair-integrity.json`: `cc316810ba642df98b74e78c7221d81392413f71c24a20671f765b3ef5f9b16d`; `node-tests.log`: `f76b9f49fdc4f1798c5afb71c452f19f25dee8bb738c8f21e139f1cc22f2478f`.
- Không sửa giao diện để hiện prediction không tồn tại. Viewer v1 vẫn có thể nhập phản hồi thật của smoke bước 3 ngày 12/10; thành công đó được giữ nguyên, không nâng thành thành công của cặp v2. Không chạy thêm browser QA vì không sửa code/asset giao diện.

## Giới hạn và bước tiếp theo

1. **Đang chờ provider cho phần inference của cặp v2**, không phải toàn bộ dự án phải dừng vì reviewer. Hai request đã sẵn sàng; lượt thử tiếp theo cần xác nhận riêng, mỗi run mới giữ cùng input/config và bảo toàn các run lỗi. Không tự lên lịch hoặc retry ngầm.
2. Khi có hai output hợp lệ, hậu kiểm exact quotes/path/ID với đúng request tương ứng rồi đối chiếu prediction, uncertainty và usage thật. Không lấy graph làm nhãn chuẩn hoặc yêu cầu prediction phải khớp hai method của technical fixture.
3. Đây là pilot thêm **graph kèm metadata/bằng chứng cạnh** vào cùng vector source excerpts. Graph có biểu thức call site và ghi chú fallback mà Vector không có, không chỉ thêm adjacency trần. Context Graph+Vector dài hơn; không được coi cùng ceiling byte là bằng chứng ngang token/cost, hoặc quy lợi ích riêng cho traversal mà chưa có ablation phù hợp.
4. Một scenario, một attempt/config, thứ tự chạy cố định không đủ đo độ biến thiên, chất lượng hoặc latency tổng quát. Chưa có token-budget matched comparison, lexical baseline, live graph traversal từ semantic seed, retrieval toàn repo, API/Service prediction hoặc Ragas/F1 chính thức.
5. P01 vẫn `pending_review`, P02–P04 chưa mở/khóa split/chấm chính thức; nhóm xây hệ thống không tự chuyển prediction thành ground truth. Gói source-first/review độc lập vẫn giữ nguyên.

Trong lúc provider chưa trả output, công việc kỹ thuật offline còn làm được gồm hợp nhất các lệnh chuẩn bị/kiểm context thành một luồng tái lập rõ ràng và hoàn thiện baseline/giới hạn; việc đó không đòi hỏi sửa nhãn hoặc coi reviewer đã nghiệm thu. Chưa triển khai mở rộng đó trong lượt này.
