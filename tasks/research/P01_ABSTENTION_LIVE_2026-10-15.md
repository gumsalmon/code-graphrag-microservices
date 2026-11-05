# P01 — chạy Gemini thật bằng contract abstention mới, 15/10/2026

## Kết quả

Đã thực hiện đúng hai attempt được Huy phê duyệt, Vector trước rồi Graph+Vector, mỗi cấu hình một lần, không retry. **Vector qua kiểm tra contract mới với hai record abstention; Graph+Vector trả HTTP 503 UNAVAILABLE do provider báo high demand.** Chưa có cặp prediction mới hợp lệ để đối chiếu chất lượng; không lấy Graph+Vector legacy thay cho lượt lỗi này.

Đã đọc toàn bộ `PROJECT_CONTEXT.md`, kiểm Git status/diff/staged diff, đọc contract hiện hành và kiểm đầu vào trước hành động. Không commit/push/merge hoặc mở P02–P04; không sửa nhãn/protocol/split hoặc hồ sơ reviewer. Các diễn đạt kỹ thuật cũ trong context không thay trạng thái mới đã có bằng chứng, nhưng các ranh giới độc lập nghiên cứu tiếp tục được giữ.

## Đầu vào và cấu hình

- Cặp chuẩn bị mới: `handoff-out/p01-contract/20261015T064526833Z-96bc2152`, kiểm **8/8 artifact** trước và sau chạy; source retrieval gốc qua checker 18/18 artifact. Không thay source, proposed patch, graph, top-k, registry hoặc ngân sách.
- Request `/3`, context retrieval `/2`, prompt `p01-static-impact/2`, validated prediction `/2`.
- Vector request SHA-256: `51ee656454835119fa03f3973ecc2e988d2997a29a5842c486596c9e3d93001d`.
- Graph+Vector request SHA-256: `8f53c0484537f4740e4d695f9603b37d5034716bbe210b0e4b8838bd04c3c251`.
- Cùng Gemini `gemini-3.8-flash`, thinking MEDIUM, maxOutputTokens 8192, APPLICATION_JSON, system prompt, output schema và context ceiling. Giữ adapter/endpoint đã được duyệt, không model substitution hoặc thay một phía.
- Doctor chỉ đọc key DPAPI dưới cùng Windows user; không in giá trị. Free Tier là xác nhận của người dùng, không billing được API xác minh. Không bật billing hoặc sửa key để xử lý 503; cost vẫn null.
- Hai run ghi cùng code provenance, HEAD `d1f95eb21c71dd6bfb49d2e450142d1290ceda5f`, **code_is_uncommitted=true**. Contract mới còn trong working tree, không phải nội dung đã nằm trong commit HEAD này. Đã đối chiếu **9/9 hash code** hai run với file hiện tại, không chỉnh source giữa hai call.

## Hai attempt

| Cấu hình | Run | Kết quả | Thời gian đến phản hồi/lỗi | Prompt / output / thoughts / tổng token |
| --- | --- | --- | ---: | --- |
| Vector | `20261015T070159953Z-live-f5d5fdd6` | `provider_prediction_not_ground_truth`, returned model Gemini 3.8 Flash, STOP | 27693 ms | 3808 / 976 / 3141 / 7925 |
| Graph+Vector | `20261015T070330765Z-failed-1f789489` | HTTP 503, UNAVAILABLE, không prediction | 5411 ms | null / null / null / null |

- [Vector run](../../handoff-out/p01-reasoning/20261015T070159953Z-live-f5d5fdd6/run.json), [response nguyên nội dung](../../handoff-out/p01-reasoning/20261015T070159953Z-live-f5d5fdd6/response.json), [validation](../../handoff-out/p01-reasoning/20261015T070159953Z-live-f5d5fdd6/validated.json).
- [Graph+Vector failure](../../handoff-out/p01-reasoning/20261015T070330765Z-failed-1f789489/run.json), giữ request, provider payload, code provenance và metadata lỗi; không có response/validation giả.

Vector có 7/7 artifact, Graph+Vector có 4/4 artifact qua manifest. Packer dựng lại payload/config từ request, đối chiếu Vector response/usage/model/response ID/validation và kiểm cặp cùng điều kiện. Tổng API mới **2 attempts, 0 retries**. Run HTTP lỗi vẫn được tính một attempt; usage thiếu không quy thành 0, không suy đoán chi phí hoặc returned model. 5411 ms là thời gian tới lỗi, không phải latency suy luận để so tốc độ.

Provider thông báo nhu cầu cao và đề nghị thử sau. Không suy ra do key sai, Docker chưa bật hoặc bắt buộc mua gói/bật billing; cũng không có bằng chứng schema mới bị từ chối ở lượt này. Không tự thử lại.

## Vector đã trả gì?

Bốn record được phân tích, **không phải bốn method bị tác động**:

- `VisitsServiceClient.getVisitsForPets(List<Integer>)`: dependency/behavior/repair đều unknown, path rỗng, hop/boundary null, citations rỗng; validator ghi `assessment_kind=abstention`.
- `ApiGatewayController.getOwnerDetails(int)`: cùng trạng thái abstention. Rationale cả hai nêu không có source hoặc static dependency của gateway trong context được cấp.
- Provider `create(Visit,int)` và overload `read(int)`: dependency not established, behavior unlikely, repair not established, mỗi record có một citation. Không dùng hai dự đoán này làm negative labels được duyệt.
- Summary có một citation proposed patch. Tổng cộng **3 citation occurrences** có quote nguyên văn, đúng ID; hai abstention không bắt model bịa dẫn chứng cho việc thiếu dữ liệu.

Context Vector thực tế chỉ truy xuất top-5 thuộc provider, không có thân method gateway/client; registry vẫn ghi ID các method kỹ thuật. Việc model nêu thiếu bằng chứng phù hợp với phần dữ liệu đã cấp, không phải sự xác nhận nhãn tác động. Summary/rationale nói các endpoint provider độc lập; citation annotation hỗ trợ nhận diện endpoint nhưng chưa đủ tự chứng minh hoàn toàn không phụ thuộc hoặc không có ảnh hưởng toàn hệ thống. Quote tồn tại không đồng nghĩa lập luận ngữ nghĩa đã được nghiệm thu.

Lượt này chứng minh contract mới và transport nhận được một phản hồi Vector thật, không có lỗi ép citation cho pure unknown. Không chứng minh độ chính xác CIA, recall/F1 hoặc ưu thế của phương pháp. Graph+Vector cùng contract chưa có output; không trộn với response legacy đã đạt trước đó.

## Gói xem trong demo

Mở [demo/p01/index.html](../../demo/p01/index.html), chọn **Vector / Graph+Vector → Nhập comparison.json**, chọn:

`E:\NCKH\code-graphrag-microservices\handoff-out\p01-comparison\20261015T070456690Z-d3d4338f\comparison.json`

[Gói mới](../../handoff-out/p01-comparison/20261015T070456690Z-d3d4338f/comparison.json), SHA-256 `e4e2746a19ad61ef3176fb9f597d40b8284dbc28183b95584aab89ec02beef17`. Gói giữ cả kết quả Vector và metadata lỗi Graph+Vector; không chứa key, nhãn, score hoặc raw provider thought signature. Browser ghi provider/model chưa xác minh, không gọi API hoặc tự tải kết quả.

## Kiểm chứng sau chạy

- **105/105 Node tests pass, 0 fail/skip**, gồm kiểm phiên bản legacy/mới, tổ hợp abstention, manifest và transport giả lập. Test DPAPI dùng chuỗi tổng hợp; không cộng các fixture calls vào số API thật.
- **20 nhóm browser checks pass** với chính gói mới, Chrome `155.0.8059.40`, desktop/mobile/file://. Hai record abstention hiển thị nhãn riêng, lượt Graph+Vector hiện lỗi thay vì prediction giả, request downloads/status/counts đúng; không browser error hoặc external request.
- [Browser report](../../handoff-out/p01-demo-qa-20261012/20261015T070621492Z-a262c6c5/browser-report.json); browser/server QA đã đóng.
- Gói contract nguồn vẫn 8/8 artifact, request hashes giữ nguyên. Gói comparison legacy vẫn SHA-256 `e286605faa5f76e5e7d0156b6f1250737139195b91ee3a9c41515852d44b6f86`, Vector legacy vẫn rejected, Graph+Vector legacy vẫn structurally valid. Không hồi tố sửa output/provenance/manifest hoặc đổi phiên bản cho response cũ.
- Lượt này không tái chạy Docker/Neo4j/Chroma/PetClinic HTTP; không tạo ground truth mới. `PROJECT_CONTEXT.md`, raw runtime, nhãn và gói source-first giữ nguyên.

## Bàn giao và bước tiếp theo

Đã hoàn tất hai attempt trong phạm vi phê duyệt, đóng gói, kiểm dữ liệu và viewer. **So sánh chất lượng cùng contract vẫn thiếu output Graph+Vector** do provider 503. Chưa commit/push/merge; working tree vẫn có source thay đổi từ các lượt trước cùng file reviewer/research untracked, không tuyên bố sạch.

Không lập lịch hoặc tự retry. Có thể tiếp tục review và chuẩn bị công bố các thay đổi code offline; lần chạy API tiếp theo cần quyết định rõ phạm vi, giữ toàn bộ attempt kể cả lỗi, không chọn bỏ kết quả để làm đẹp so sánh. Nếu đổi contract/model cần một cấu hình thí nghiệm mới cho cả hai phía. P01 vẫn pending_review, P02–P04 chưa mở, split chưa khóa; technical smoke không thay quyết định reviewer hoặc tạo bằng chứng chất lượng bài báo.
