# P01 reasoning — context và adapters

Để chạy từ clone mới, bắt đầu ở [luồng chuẩn bị P01](../../pipeline/p01/README.md). Luồng mới nối parser/Neo4j/Chroma thật và không cần key. Các run và link máy cục bộ bên dưới là hồ sơ lịch sử, không phải dependency bắt buộc cho prepare mới.

Lớp này chuẩn bị đầu vào dự đoán tác động từ source baseline và proposed patch, rồi kiểm cấu trúc phản hồi LLM. **Smoke Gemini 3.8 Flash bước 3 đã đạt ngày 12/10/2026; Chroma retrieval bước 4 đã chạy offline riêng, chưa có toàn bộ pipeline live hoặc ground truth được chấp nhận.** Lượt thật dùng request graph-assisted v1 đã đóng băng, trả JSON qua kiểm ID/quote/path trong 21934 ms, tổng 8863 token theo provider. Đây là kiểm kết nối và contract kỹ thuật, chưa chốt model/cấu hình cho thực nghiệm bài báo. Giữ nguyên các lượt lỗi trước đó. Xem [báo cáo smoke](E:/NCKH/code-graphrag-microservices/tasks/research/P01_GEMINI_SMOKE_SUCCESS_2026-10-12.md) và `reasoning/p01/GEMINI_SETUP.md`.

Cặp Vector/Graph+Vector v2 đã được thử ngày 13/10/2026, một call mỗi cấu hình, cùng request/config đã lưu; cả hai trả 503 do provider báo high demand. Chưa có dự đoán hoặc token usage để so sánh, không tự retry. [Báo cáo cặp v2](E:/NCKH/code-graphrag-microservices/tasks/research/P01_GEMINI_PAIRED_ATTEMPT_2026-10-13.md) giữ bằng chứng và giới hạn; thành công v1 không bị sửa hoặc thay thế.

## Đầu vào, đầu ra và DoD

Đầu vào dùng byte source/patch/parser/query của lượt kiểm chứng bước 1 đã đóng gói trong `demo/p01/data.js`. Seed được biết trước. Revision PetClinic `3858f9c630cf989bb6809a86edf47c2be78dc9f1`, implementation parser/Neo4j `e95613795133088621117179c9fb9592dab62b16`. Mã reasoning còn uncommitted: mỗi run lưu Git HEAD/status và SHA-256 từng file triển khai; không gán HEAD của main thành SHA của phần code mới.

Đầu ra chuẩn bị: `context.json`, `request.json`, `code-provenance.json`, `run.json`, `checksums.sha256`. Mỗi lượt có thư mục mới, không ghi đè. Context và request có hash riêng; prompt version `p01-static-impact/1`, schema request/context/validated prediction version 1.

DoD của **bản offline**:

- Context được chọn từ baseline source + patch dự kiến, chỉ đọc các artifact kỹ thuật cần thiết; kiểm checksum và nguồn/snapshot trước khi đóng gói.
- Không đưa raw runtime, nhãn, score, reviewer decision, summary hoặc output scorer vào prompt. Không đọc acceptance-label fixtures làm đáp án kỳ vọng.
- Hai chế độ cùng source, patch, method universe, prompt và output schema. Source-only không được cấp edge/candidate path; graph-assisted dùng đường Neo4j đã lưu và thông tin cạnh tĩnh. Không gọi source-only là Vector RAG.
- Seed lưu riêng; giữ overload trong ID. Đếm logical hop và service boundary riêng. Không ép model trả tập hai method của technical fixture.
- Phản hồi tách dependency, behavioral impact và need-to-edit, có citation ID và quote; validator xác minh ID, quote/source span và path/count, không chứng minh semantic correctness.
- Lỗi/timeout/refusal/JSON sai không được biến thành dự đoán fallback hoặc kết quả pass.
- Test transport giả lập chỉ là test, không được ghi làm bằng chứng model thật hoặc số liệu bài báo.

## Chuẩn bị request, chưa gọi API

Chạy từ thư mục gốc repository, với Node.js:

```powershell
node scripts/run_p01_reasoning.mjs prepare --mode graph_assisted --depth 2
node scripts/run_p01_reasoning.mjs prepare --mode source_only --depth 2
```

Các run nằm trong `handoff-out/p01-reasoning/`, được Git ignore. `remote_calls=0`, model/provider/usage là null. Request được tải từ trang **Context & LLM** dùng cùng core và được kiểm có hash giống CLI/Node.

`--depth` nhận 1/2/3. Hiện chỉ lọc các đường của query P01 đã lưu: tuyến tối đa trong phạm vi ba file là hai hop. Không coi thao tác này là tái chạy Neo4j hoặc bằng chứng hỗ trợ graph toàn repo/3-hop tổng quát.

`--context-bytes` đặt giới hạn canonical JSON context tính theo UTF-8; mặc định 32768. Không tính system prompt/schema vào con số này. Không có tokenizer/model nên `token_count=null`; chưa khẳng định ngân sách token công bằng cho bài báo. Không tự cắt mất source khi vượt giới hạn: command/UI báo lỗi. Hai cấu hình có cùng ceiling nhưng kích thước thực tế khác nhau; phải ghi input/output tokens thật khi chọn model và chạy so sánh.

Luồng v1 đưa đủ ba file Java vào cả hai chế độ; chưa có retrieval chọn chunk toàn repo. Source-only là đối chứng cấu trúc sơ bộ trong pilot, không thay baseline lexical/vector mạnh cho thực nghiệm chính thức. API/Service prediction và scoring chưa được triển khai trong lớp này; schema hiện chỉ cho Method.

## Bước 4 — Chroma và context v2 offline

```powershell
node scripts/run_p01_retrieval.mjs --top-k 5 --depth 2 --context-bytes 32768
node scripts/check_p01_retrieval_run.mjs --run PATH_TO_RUN
```

Tái sử dụng chunker/store của Hiển tại commit cố định, container không có mạng và model cache chỉ đọc. Hai lượt database/container mới đã cho cùng corpus/ranking/request hashes. Chuẩn bị `vector_retrieved` và `graph_vector`: cùng mã được truy xuất, seed/patch, registry, query/top-k, prompt, output schema và ceiling; cấu hình graph chỉ thêm cạnh/đường đi đã ghi. Đây là ablation context pilot, không phải GraphRAG đầy đủ, chưa có LLM output hoặc điểm benchmark.

Request/context v2 hỗ trợ source excerpts với dòng baseline và hash riêng, vẫn dùng prompt/output schema cũ. Request v1 giữ nguyên hash và tiếp tục dùng được. Shared prediction registry 5 method là phạm vi kỹ thuật, không phải universe benchmark độc lập. Viewer vẫn ở v1; các request retrieval v2 được bàn giao qua CLI/JSON. Xem [hướng dẫn retrieval](E:/NCKH/code-graphrag-microservices/reasoning/p01/RETRIEVAL_SETUP.md) và [báo cáo bước 4](E:/NCKH/code-graphrag-microservices/tasks/research/P01_RETRIEVAL_OFFLINE_2026-10-12.md).

## Schema phản hồi

Schema máy đọc được nằm ở `request.json.output_schema`; provider-independent core trong `demo/p01/reasoning-core.js`. Các trường:

- `summary`: `text` và `citations`.
- `method_predictions`: mỗi method có `method_id`, `dependency_status`, `dependency_path`, `logical_hops`, `service_boundary_crossings`, `behavioral_impact`, `requires_code_change`, `rationale`, `citations`.
- `uncertainties`: danh sách điểm chưa chắc chắn.
- Mỗi citation có đúng `evidence_id`, `quote`. ID/quote phải có trong context; line numbers được chương trình suy ra từ quote và snapshot, không để LLM tự bịa.

Các trạng thái behavior là `likely`, `unlikely`, `unknown`; trạng thái cần sửa là `required`, `optional`, `not_established`, `unknown`. Chúng là **dự đoán**, không phải nhãn approved. `reachable` cần path caller → seed; path graph-assisted phải khớp graph đã cấp và giới hạn hop. Path source-only chỉ là suy luận từ source, được ghi `source_inference_not_graph_verified`, không dùng graph giấu kín để hậu kiểm thành “đúng”. Khi dependency chưa thiết lập, path rỗng và hai count phải null.

Validator chấp nhận tập dự đoán rỗng hoặc khác tập ứng viên; không yêu cầu đủ hai method. Không nhận seed, method/overload ngoài universe, duplicate ID, citation runtime/không có, quote không tồn tại, hop/boundary sai hoặc trường phê duyệt thêm vào.

Quote tồn tại **không đồng nghĩa quote hỗ trợ đúng lập luận**. Kiểm cấu trúc không xác minh nguyên nhân hành vi, phương án sửa hoặc chống được mọi prompt injection. System prompt chỉ đặt ranh giới nội dung source như dữ liệu; cần kiểm chất lượng/robustness bằng model và review sau này.

## Nhập phản hồi để kiểm offline

Trang **Context & LLM** cho nhập JSON cục bộ, không upload. Hoặc:

```powershell
node scripts/run_p01_reasoning.mjs validate --request PATH_TO_REQUEST_JSON --response PATH_TO_RESPONSE_JSON
```

Có thể thêm `--model DECLARED_MODEL_ID` để ghi thông tin người nhập khai báo, nhưng không xác minh provider/model hoặc việc model đã dùng đúng prompt/context. Run ghi `imported_response_not_provider_verified`. `validated.json` ghi rõ semantic correctness/runtime/human review đều false. Citation source hiển thị baseline, không gán dòng baseline sang snapshot mutated đang mở ở viewer.

Không đặt các response test tổng hợp vào run này rồi coi là kết quả LLM. Lượt model thật hiện nằm trong thư mục cục bộ Git ignored `handoff-out/p01-reasoning/20261012T154435050Z-live-c20d99cf/`, không tự đóng gói vào demo hoặc đưa lên GitHub. `response.json` là prediction nguyên nội dung từ JSON provider, `provider-response.json` giữ envelope gốc; `run.json` ghi model/usage/provenance thật. Nhập `response.json` vào viewer chỉ là kiểm offline, không thay bằng chứng gọi API của CLI.

## Adapter Gemini đã chọn cho smoke test

`reasoning/p01/gemini-adapter.mjs` dùng đúng `gemini-3.8-flash`, REST `generateContent`, `responseFormat` JSON Schema theo tài liệu Google hiện hành. Giữ nguyên system prompt/context/schema của core, chỉ inline citation references cho transport. Không gửi tools, dùng search grounding, gọi model khác hoặc tự retry khi lỗi. Model trả khác family đã chọn, finish reason không phải STOP, refusal, quota, malformed JSON hoặc citation/path sai đều không được nhận thành dự đoán hợp lệ.

Mặc định thinking `medium`, không yêu cầu trả thoughts, `maxOutputTokens=8192`, timeout 60 giây. Đây không phải lời cam kết hard cap cho mọi token nội bộ/chi phí; lưu `usageMetadata` thực do provider trả. Free Tier do người dùng xác nhận, không được suy ra từ một response thành công. Không có thao tác bật billing trong code.

Key chỉ ở `x-goog-api-key` header của CLI, không đưa vào URL, prompt, payload, browser hoặc evidence. Hỗ trợ environment `GEMINI_API_KEY`/`GOOGLE_API_KEY`; nếu cả hai khác nhau thì báo lỗi, không âm thầm chọn account. Windows có helper nhập ẩn và lưu DPAPI vào vị trí Git ignored. Node tự đọc file mã hóa chỉ dưới cùng Windows user; không dùng fallback plaintext khi decrypt thất bại. Không gọi flag nội bộ `-ReadForRunner` trực tiếp ở terminal/tool vì đó là pipe secret cho Node.

Run thất bại sau khi có response 200 vẫn giữ raw response/payload an toàn và usage, không sinh `validated.json`. Nếu body có echo của key thì không lưu raw body. Với lỗi HTTP, chỉ giữ code/status/message đã giới hạn và kiểm không chứa key; không lưu raw error body không an toàn.

## Adapter OpenAI tùy chọn, chưa chọn cho lượt Gemini

Adapter OpenAI được tách riêng trong `reasoning/p01/openai-adapter.mjs`, theo [OpenAI Docs — Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses). Request dùng Responses API với JSON Schema strict, mọi field required, và có xử lý refusal/incomplete. Adapter không tự chọn model hoặc đổi sang model khác khi lỗi.

Chưa gọi adapter bằng credential thật trong lượt hoàn thiện offline. Nếu sau này chọn OpenAI, cấu hình `OPENAI_API_KEY` trên máy, không gửi key trong chat hoặc lưu vào request/repository. Chỉ chạy sau khi xác nhận model/cấu hình/ngân sách và đồng ý gửi **context đã lọc** tới provider:

```powershell
node scripts/run_p01_reasoning.mjs live --request PATH_TO_REQUEST_JSON --model APPROVED_MODEL_ID --confirm-send
```

Endpoint cố định `https://api.openai.com/v1/responses`, không tự dùng proxy/base URL; key chỉ ở Authorization header của CLI, không có trong UI/payload/log. `store=false`; không tuyên bố đây là cam kết zero-retention của provider. Mặc định output cap 4096 token và timeout 60 giây, không retry. Model không hỗ trợ schema hoặc chưa có quyền truy cập sẽ báo lỗi, không tự chuyển model.

Run thành công lưu payload, raw response, JSON dự đoán, validation, requested/returned model, prompt/hash/code provenance, usage do provider trả và elapsed time. Chưa có bảng giá đã chốt nên cost vẫn null, không bịa số USD. Run thất bại giữ metadata lỗi và request, không có dự đoán fallback; khi không biết provider đã nhận request chưa thì không đặt số call thành 0 để phủ nhận khả năng đã phát sinh phí.

Gemini bắt buộc gọi qua `--provider gemini` cùng xác nhận Free Tier; key Gemini không dùng được ở adapter OpenAI. Model local/provider khác có thể dùng cùng prepared request và validation, nhưng chưa có adapter được kiểm cho Ollama hoặc provider khác. Không suy đoán tương thích từ tên API.

## Kiểm thử

```powershell
node --test reasoning/p01/retrieval.test.mjs reasoning/p01/gemini.test.mjs reasoning/p01/reasoning.test.mjs demo/p01/demo.test.mjs
node scripts/check_p01_demo_browser.mjs
```

Test Node trên Windows gồm 14 test retrieval/context v2, 21 Gemini/key, 21 reasoning/OpenAI adapter và 11 viewer/data/server (67/67 đạt). Thêm 8 Python input/implementation guard tests trong container không có mạng, tất cả đạt. Fake response/usage/ranking chỉ nằm trong fixture tổng hợp; tất cả transport test dùng fetch thay thế, không liên hệ provider thật. Test Windows DPAPI dùng chuỗi tổng hợp trong memory, không đặt key giả vào credential store. Khi chạy trong sandbox không có Windows profile đầy đủ, test DPAPI có thể lỗi; phải chạy dưới Windows user bình thường (không đổi thành plaintext hoặc bỏ test để báo pass). Trên nền tảng không phải Windows, riêng test DPAPI không áp dụng.

Test browser kiểm tải request, mode/hop/budget, import lỗi, escaping nội dung phản hồi, source citations, trạng thái manual-import và xóa kết quả khi đổi context, ngoài các thao tác viewer cũ.

Không dùng test pass làm thẩm định nhãn hoặc điểm Ragas/F1. P01 vẫn `pending_review`; không sửa protocol/nhãn, không mở P02–P04 và không thay gói source-first reviewer đã đóng băng.
