# P01 — smoke Gemini bước 3, 12/10/2026

## Kết luận

**Hoàn tất smoke kỹ thuật bước 3 với Gemini 3.8 Flash thật.** Một lượt gọi, không retry, model trả đúng family đã chọn, hoàn thành `STOP`; prediction qua kiểm schema, method ID, loại seed, quote và đường đi. Đây không phải thẩm định nhãn, đo độ chính xác hoặc chứng minh GraphRAG tốt hơn baseline.

Đã đọc toàn bộ `PROJECT_CONTEXT.md`, kiểm Git status và doctor trước khi gọi. Người dùng yêu cầu hoàn tất smoke; giữ request graph-assisted v1 cũ để không đổi bài toán sau các lỗi trước. Không đọc nhãn dự thảo làm đáp án, không sửa output, raw evidence, protocol hoặc gói source-first của reviewer. Không stage, commit, push hoặc merge.

## Lượt thật và provenance

Lệnh, key chỉ được giải mã trong memory dưới Windows user hiện tại:

```powershell
node scripts/run_p01_reasoning.mjs live --provider gemini --model gemini-3.8-flash --request handoff-out/p01-reasoning/20261012T125005110Z-prepared-a3d7b1b0/request.json --confirm-send --confirm-free-tier
```

- [Thư mục kết quả](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261012T154435050Z-live-c20d99cf/), run ID `20261012T154435050Z-live-c20d99cf`; thời điểm ID là lúc lưu sau API, không phải lúc bắt đầu request.
- [Run metadata](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261012T154435050Z-live-c20d99cf/run.json): `provider_prediction_not_ground_truth`, provider `gemini_generate_content`, requested/returned model `gemini-3.8-flash`, API `v1beta`, finish reason `STOP`, `remote_calls=1`, `retry_count=0`, elapsed **21934 ms**.
- Cấu hình giữ nguyên: thinking `MEDIUM`, `includeThoughts=false`, max output 8192, `responseFormat.text.mimeType=APPLICATION_JSON`. Không tools/search, đổi model hoặc tăng billing.
- Context graph-assisted v1, 2-hop, 17763 byte; baseline ba file Java + patch dự kiến + graph tĩnh đã lưu. Không labels, runtime HTTP, scorer hoặc reviewer decision trong prompt. Không gọi Chroma/Neo4j/PetClinic trong lượt này.
- Request canonical SHA-256 `bba16d754a90c078aaad24c39dcde91e321824939416e30acc9390d98ad0bc8a`; context SHA-256 `3bd9e542b6d2a3a8d5dd83a35dc00c68cfe5d7b46a6f4f4c9a92544fd5dfc0b1`, khớp request cũ và viewer ở cấu hình mặc định. Hash canonical khác hash byte của JSON pretty-printed, không phải sai lệch nội dung.
- [Raw provider response](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261012T154435050Z-live-c20d99cf/provider-response.json) được giữ nguyên nội dung JSON, có model version, response ID và usage; serialization là JSON do runner lưu, không tuyên bố bảo toàn byte HTTP nguyên bản.
- [Prediction](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261012T154435050Z-live-c20d99cf/response.json) là JSON parse từ final text, không repair hoặc thêm câu trả lời. [Validation](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261012T154435050Z-live-c20d99cf/validated.json) chỉ bổ sung kết quả guard/source span; giữ `semantic_correctness_verified=false`, `runtime_verified=false`, `human_reviewed=false`.
- Code provenance ghi HEAD `65e41a2b4fafa0d37fdd2779985d131a3c7dc116`, Git status, Node/platform và hash 9 file triển khai. `code_is_uncommitted=true`: không mạo nhận HEAD đã chứa adapter/retrieval mới. Những cập nhật hướng dẫn/UI sau lượt API không ghi đè provenance này.
- Key không có trong payload, response, report, browser hoặc Git; credential DPAPI vẫn Git ignored. Free Tier do người dùng xác nhận, không được suy ra từ thành công API hoặc `usage.serviceTier=standard`. `estimated_cost=null`, không tuyên bố chi phí đã kiểm bằng 0.

Usage gốc do provider trả:

| Trường | Token |
| --- | ---: |
| promptTokenCount | 5606 |
| candidatesTokenCount | 2356 |
| thoughtsTokenCount | 901 |
| totalTokenCount | 8863 |

## Đối chiếu nội dung với source, không thay review độc lập

Model trả **bốn bản ghi dự đoán**, không phải bốn method chịu tác động. Core không ép model phải trả đúng hai ứng viên kỹ thuật.

| Method | Phụ thuộc model dự đoán | Hop / service boundary | Hành vi / cần sửa model dự đoán |
| --- | --- | --- | --- |
| VisitsServiceClient.getVisitsForPets(List<Integer>) | reachable | 1 / 1 | likely / required |
| ApiGatewayController.getOwnerDetails(int) | reachable | 2 / 1 | likely / not_established |
| VisitResource.create(Visit,int) | not_established | null / null | unlikely / not_established |
| VisitResource.read(int) | not_established | null / null | unlikely / not_established |

Kiểm tra kỹ thuật và đối chiếu sơ bộ trong phạm vi source đã cấp:

- Patch P001 thêm tham số bắt buộc vào overload `read(List<Integer>)`; URL client S001 dòng 45 chỉ có `petId`. Lập luận thiếu tham số có cơ sở trong source/patch. Từ `required` của model là lựa chọn sửa dự đoán dưới giả định giữ contract mới và khôi phục hành vi; chưa chứng minh mọi phương án hợp lệ đều bắt buộc sửa chính method này.
- Controller S002 dòng 58 gọi client; dòng 61 chọn fallback; dòng 80–81 trả `Visits(List.of())`. Model phân biệt tác động hành vi có khả năng với chưa thiết lập việc bắt buộc sửa controller. Output không khẳng định dữ liệu lưu trữ bị xóa.
- Đường client → seed, controller → client → seed khớp graph baseline đã cấp. Graph baseline ghi `contract_status=VALID`; lỗi contract mới là suy luận từ proposed patch, không phải trường graph baseline đã phát hiện mutation.
- Overload `read(int)` khác endpoint; hai method provider còn lại không được ghi reachable. Dù model ghi `unlikely`, việc không có đường đi trong phạm vi ba file không phải bằng chứng negative toàn hệ thống. Không dùng hai dự đoán này để tự tạo ground truth.
- **10 citation occurrences** qua exact-quote guard; source span được tính từ baseline. Quote tồn tại chưa chứng minh hỗ trợ mọi claim. Câu model nói fallback sẽ xảy ra là dự đoán có điều kiện, không phải quan sát runtime mới; không dùng smoke này để khẳng định HTTP/status/data count đã thực thi.
- Seed được biết trước, registry chỉ có 5 method từ ba file. Đích HTTP phụ thuộc hostname mặc định, còn `setHostname` có thể đổi; model nêu điểm bất định này. Chưa kiểm caller khác, service khác, gRPC, prompt robustness hoặc tính tổng quát.

Đây là kiểm soát chất lượng sơ bộ của nhóm xây hệ thống, **không được ghi thành independent reviewer acceptance**. Không tính Precision/Recall/F1/Ragas, sửa nhãn hoặc đếm các guard pass thành độ chính xác khoa học.

## Kiểm tra bằng chứng và bàn giao

- **7/7 file** trong manifest khớp checksum, không thiếu/thừa file ngoài manifest và `checksums.sha256`. Đã parse lại raw final text, đối chiếu prediction, tái chạy core validation và kiểm payload dựng lại khớp payload đã gửi. Usage/model/response ID trong run khớp raw response.
- **9/9 hash code tại thời điểm gọi** khớp file triển khai khi kiểm, trước các cập nhật UI/hướng dẫn. Giữ nguyên thư mục kết quả và lịch sử lỗi key/HTTP400/HTTP503; không ghi đè hoặc loại lỗi khỏi hồ sơ.
- SHA-256 `run.json`: `4156285e681d0843b652a22640c61a38e578f0d25ba236f1578ceaea8bc9029a`.
- SHA-256 `response.json`: `69aa584b5ed967d04946f0d8c9966e5a3ad3345b59a647e841fa7217648fa84a`.
- SHA-256 `provider-response.json`: `f5579e768b65b4613c4c9fa4d75952af5a24594e5a98d2cf07488856afa868b9`.

Viewer vẫn không có API/key hoặc tự nạp kết quả. Mở **Context & LLM**, chọn graph-assisted / 2-hop / 32768 byte và nhập `response.json` của run trên. Banner manual import vẫn ghi provider/model chưa xác minh; provenance API nằm riêng trong hồ sơ CLI. README có hướng dẫn và browser QA nhận tùy chọn file phản hồi để kiểm hiển thị mà không gọi thêm API.

Kiểm chứng sau cập nhật hướng dẫn/UI:

```powershell
node --test reasoning/p01/retrieval.test.mjs reasoning/p01/gemini.test.mjs reasoning/p01/reasoning.test.mjs demo/p01/demo.test.mjs
node scripts/check_p01_demo_browser.mjs --response-file handoff-out/p01-reasoning/20261012T154435050Z-live-c20d99cf/response.json
```

- **67/67 test Node pass, không fail/skip** dưới Windows user thật, gồm DPAPI test với giá trị tổng hợp. [Log gốc](E:/NCKH/code-graphrag-microservices/handoff-out/p01-step3-smoke-qa-20261012-3948918a/node-tests.log), SHA-256 `8b290fe27b76c9fddcfbd7373b1100c7b8faa03cd083b2909259a17083957766`. Không dùng credential thật trong unit test hoặc gọi Google.
- **17 nhóm browser checks pass**, Chrome `154.0.8037.99`, desktop 1440×1000, mobile 390×844 và file://; không external requests/browser errors. [Report gốc](E:/NCKH/code-graphrag-microservices/handoff-out/p01-demo-qa-20261012/20261012T154818654Z-d81f1324/browser-report.json), SHA-256 `188ed56e58d1f2dd431175504972e9dadaaf4f4a2d44b3385584e7496b0b4670`.
- Import đúng file phản hồi thật trên desktop: bốn card có ID/summary khớp JSON, tải validation khớp core, citation mở baseline đúng dòng; browser vẫn không nhận mình đã xác minh model hoặc ý nghĩa. Các fixture UI tổng hợp được giữ là test riêng, không thay kết quả model. Script chỉ đọc response đã lưu, `remote_calls=0`.
- Đã xem [ảnh phản hồi thật trong viewer](E:/NCKH/code-graphrag-microservices/handoff-out/p01-demo-qa-20261012/20261012T154818654Z-d81f1324/reasoning-imported-response-desktop.png). Không tạo fake screenshot hoặc chỉnh prediction để hiển thị tốt hơn.
- `demo/p01/data.js` vẫn SHA-256 `053fe6c2caa4c7b47c8fa40d413ebd3c00ea22828c52f56fb1c902081f041689`, giữ nguyên nguồn/raw artifacts; credential và live output vẫn Git ignored. Tracked diff và staged diff rỗng; triển khai/báo cáo còn untracked trên `codex/p01-evidence-demo`, không tuyên bố working tree sạch.

## Trạng thái tiếp theo

Smoke bước 3 đã hoàn tất; không tiếp tục gọi Gemini trong lượt này. Bước 4 Chroma retrieval/context v2 đã được kiểm offline riêng, **chưa có lượt Gemini trên vector_retrieved/graph_vector** và chưa nối toàn bộ pipeline live. Tiếp theo có thể kiểm hai cấu hình v2 bằng cùng model/config và provenance sau khi xác nhận riêng việc gọi API; đây vẫn chỉ là pilot ablation, không tuyên bố superiority từ một scenario.

P01 vẫn `pending_review`; P02–P04 chưa mở/khóa split/chấm chính thức. Không thay gói reviewer nguồn-first, không coi phản hồi model hoặc báo cáo này là quyết định phê duyệt. Chưa có commit/push mới.
