# P01 — hai attempt Gemini v2 và demo đối chiếu, 15/10/2026

## Kết quả và phạm vi

Đã chạy đúng một attempt Vector và một attempt Graph+Vector, không retry hoặc đổi model/config. Cả hai nhận phản hồi provider với returned model `gemini-3.8-flash`, finish reason `STOP`. **Graph+Vector qua kiểm cấu trúc; Vector có JSON nhưng bị validator từ chối. Chưa có cặp dự đoán hợp lệ để so sánh chất lượng.**

Đã bổ sung trang đối chiếu cục bộ cho cả lượt lỗi và lượt đạt, công cụ kiểm/đóng gói hai run, kiểm thử và hướng dẫn sử dụng. Không sửa kết quả cũ, input đã đóng băng, prompt/schema/validator, nhãn, protocol, gói reviewer hoặc `PROJECT_CONTEXT.md`. Không mở P02–P04, commit, push hoặc merge trong lượt này.

Đã đọc toàn bộ `PROJECT_CONTEXT.md` và kiểm Git trước hành động. Nội dung kỹ thuật tháng 9 trong context là lịch sử, không phủ nhận kiểm chứng parser/Neo4j và pipeline mới đã có. Quy tắc độc lập ground truth tiếp tục có hiệu lực.

## Cặp chạy thật

Đầu vào giữ nguyên ở `handoff-out/p01-retrieval/20261012T151104176Z-89ba55ec`. Checker xác minh **18/18 file**, dựng lại request/payload và so với run độc lập `20261012T145915661Z-5efcabcf`: corpus, ranking và request hashes khớp. Không tái truy xuất để chọn lại top-k cho hợp kết quả.

- Vector request SHA-256: `a7278d6656422e333f0d985932430734e7d2a4804b89cb2882e89c64b1e2c4c0`.
- Graph+Vector request SHA-256: `069af7bbb66613d162b5f7ef1b1eb3c6281b55b882f6dfd613ca82cd3ce8b09f`.
- Model/config: Gemini 3.8 Flash, thinking MEDIUM, output cap 8192, APPLICATION_JSON, cùng prompt/schema/seed/source excerpts/patch/registry/query/top-k/ceiling 32768 byte.
- Cả hai run ghi HEAD `d1f95eb21c71dd6bfb49d2e450142d1290ceda5f`, `code_is_uncommitted=false`, cùng 9 hash file code reasoning. Các thay đổi viewer/packer lần này được làm **sau** hai attempt, chưa có commit mới. Root có untracked reviewer/research, được ghi thật trong provenance, không gọi toàn bộ working tree là sạch.
- Key đọc qua Windows DPAPI, không in key. Free Tier là xác nhận của người dùng, không phải billing được API xác minh; không đổi billing. Usage metadata có `serviceTier=standard`, không được diễn giải riêng trường này thành tài khoản trả phí hoặc miễn phí đã xác thực. Không có bảng giá/chi phí đã chốt; cost vẫn null.

| Cấu hình | Run | Kết quả | Thời gian đến phản hồi | Prompt / output / thoughts / tổng token |
| --- | --- | --- | ---: | --- |
| Vector | `20261015T060100684Z-failed-9cc76ba2` | JSON nhận được, không nhận prediction hợp lệ | 40049 ms | 3655 / 1166 / 2124 / 6945 |
| Graph+Vector | `20261015T060348327Z-live-8cd62a51` | `provider_prediction_not_ground_truth` | 21981 ms | 5444 / 1481 / 1136 / 8061 |

Nguồn:

- [Vector run](../../handoff-out/p01-reasoning/20261015T060100684Z-failed-9cc76ba2/run.json), [raw provider](../../handoff-out/p01-reasoning/20261015T060100684Z-failed-9cc76ba2/provider-response.json).
- [Graph+Vector run](../../handoff-out/p01-reasoning/20261015T060348327Z-live-8cd62a51/run.json), [prediction nguyên nội dung](../../handoff-out/p01-reasoning/20261015T060348327Z-live-8cd62a51/response.json), [validation](../../handoff-out/p01-reasoning/20261015T060348327Z-live-8cd62a51/validated.json).

Packer kiểm **5/5 artifact** của Vector và **7/7 artifact** của Graph+Vector, không tính file manifest vào số artifact. Dựng lại provider payload/config; kiểm raw response, usage/returned model/response ID và JSON/validation lưu trong run. Tổng lượt API mới: **2 attempts, 0 retries**. Không gọi lại model trong khi xây/test demo.

Trường `note` của runner cũ dùng câu chung “Remote receipt is not known on failure”, kể cả lỗi validation sau khi đã nhận raw response. Không sửa metadata lịch sử; ở lượt Vector này raw provider response, response ID, usage và STOP cho thấy đã nhận phản hồi. Không dùng câu note chung để phủ nhận response hoặc usage có thật.

## Vector bị từ chối vì điều gì?

Trong top-5 của Chroma, các đoạn được chọn đều thuộc provider. Context Vector không chứa thân method gateway/client. Vector trả `unknown` cho hai method này, path rỗng, hop/boundary null, behavior/repair unknown, rationale nêu thiếu bằng chứng và citations rỗng. Hai provider method còn lại được ghi `not_established`, không đồng nghĩa đã có nhãn negative.

Validator dừng ở lỗi `Citations required: method_prediction`. Kiểm riêng toàn bộ citation có mặt trong JSON Vector cho thấy **4/4 quote occurrences đều tồn tại đúng nguyên văn** trong evidence được cấp. Không phải lỗi API key hoặc provider 503 ở lượt này; không phải quote đã bị sửa thành đúng. Không thêm citation hộ model hoặc bỏ hai bản ghi để tạo một prediction được chấp nhận.

Đây là bất nhất contract cần xử lý công khai:

- System prompt cho phép bỏ qua ứng viên hoặc trả unknown khi chưa đủ dữ kiện.
- Output schema cho citations là array, chưa đặt `minItems`.
- Validator bắt buộc ít nhất một citation cho mọi prediction record, kể cả abstention thuần túy.

**Không dùng lỗi này để tuyên bố Vector sai về tác động, cho F1=0 hoặc kết luận GraphRAG tốt hơn.** Giữ nguyên kết quả theo contract hiện tại. Đề xuất cần Huy chốt trước khi đổi hợp đồng dùng chung: một phiên bản mới cho abstention rõ ràng, chỉ cho citation rỗng khi dependency/behavior/repair đều unknown và không có path/count; mọi khẳng định tác động/không tác động/cần sửa vẫn phải có bằng chứng. Cập nhật đồng bộ prompt/schema/validator và test cho cả hai cấu hình; không hồi tố đổi lượt cũ thành pass. Chạy phiên bản mới là thí nghiệm mới, cần phê duyệt lượt API riêng.

## Đọc kết quả Graph+Vector, chưa phải duyệt nhãn

Bốn record được model phân tích, không phải bốn method tác động:

- Client `getVisitsForPets(List<Integer>)`: reachable 1 hop, 1 boundary, behavior likely, repair required theo dự đoán.
- Controller `getOwnerDetails(int)`: reachable 2 hop, 1 boundary, behavior likely, repair not established; model nêu có thể xử lý ở client mà không bắt controller đổi.
- Provider `create(Visit,int)` và overload `read(int)`: dependency not established, behavior unlikely, repair not established. Đây không phải negative labels được reviewer duyệt.

Tám citation occurrences qua kiểm exact quote; path khớp graph được cấp. Lập luận từ patch thêm query bắt buộc và metadata client chỉ gửi petId; nhận định fallback có điều kiện. Chưa có semantic acceptance của người thật. Graph context có cả callsite/annotation/fallback metadata, không chỉ adjacency; không nhận là graph-only ablation hoặc full GraphRAG. Cùng ceiling byte không đồng nghĩa cùng token; một attempt mỗi cấu hình không cho phép kết luận tốc độ hay chất lượng tổng quát. Không ghép thành công v1 ngày 12/10 vào cặp v2.

## Demo và cách xem

Mở [demo/p01/index.html](../../demo/p01/index.html) bằng Chrome/Edge, chọn **Vector / Graph+Vector**, bấm **Nhập comparison.json**, chọn:

`E:\NCKH\code-graphrag-microservices\handoff-out\p01-comparison\20261015T060823929Z-9904ae18\comparison.json`

[Gói cục bộ](../../handoff-out/p01-comparison/20261015T060823929Z-9904ae18/comparison.json), SHA-256 toàn file `e286605faa5f76e5e7d0156b6f1250737139195b91ee3a9c41515852d44b6f86`. Có manifest riêng. Đây là gói **output hệ thống**, không phải ZIP source-first hoặc ground truth, không gửi cho reviewer trước khi hoàn thành lượt ghi nhận định độc lập.

Gói chứa request hai cấu hình, JSON trả về, metadata token/thời gian/code và hash artifact gốc. Không chứa key, cache, DB, raw provider envelope/thought signature, nhãn hoặc score. JSON Vector bị từ chối hiển thị riêng và giữ nguyên nội dung; không thành thẻ prediction hợp lệ. Import browser luôn ghi provider/model chưa xác minh; hash chỉ kiểm toàn vẹn, không là chữ ký xác thực API.

Hai cấu hình phải cùng source/patch/registry/query/top-k/prompt/schema/ceiling/model/config/code; không nhận trộn v1/v2. Viewer kiểm excerpt về đúng baseline trước khi mở source citation. Gói sai hoặc thay thế thất bại xóa kết quả cũ; không xuất hiện response mẫu khi chưa import. Không tự đọc thư mục output, gọi API hoặc mở quyền truy cập key qua server. [Hướng dẫn đầy đủ](../../demo/p01/README.md).

## Kiểm thử thực tế

- **92/92 Node tests pass, 0 fail/skip**. Gồm 77 test cũ và 15 test mới (9 comparison guards + 6 saved-run/filesystem guards). Test DPAPI dùng chuỗi tổng hợp dưới tài khoản Windows thật, không dùng key thật. Không cộng với 59 test implementation để trình bày thành cùng một suite hoặc số inference.
- Kiểm checksum/payload/usage, duplicate/path traversal/unmanifested artifacts, metadata thành công giả, rejected JSON, null usage, sai model/config/code/mode, quote giả, approval field và source excerpt khác baseline. Fixture tổng hợp chỉ dùng kiểm kỹ thuật, không phải research receipt.
- **19 nhóm browser checks pass**, Chrome `155.0.8059.40`, desktop 1440px, mobile 390px và file://. Import đúng gói chạy thật; đúng trạng thái, số record, request download và baseline citation; escaping/XSS, import lỗi xóa kết quả cũ, layout không tràn trang. Không browser errors hoặc external requests. Server và browser kiểm thử đã đóng.
- [Browser report cuối](../../handoff-out/p01-demo-qa-20261012/20261015T062154039Z-17359ecb/browser-report.json); screenshots desktop/mobile trong cùng thư mục. Tên thư mục cha giữ lịch sử 20261012; timestamp report/run là 15/10.
- Lượt này không tái chạy ứng dụng PetClinic HTTP, parser/Neo4j/Chroma hoặc tạo runtime evidence mới. Kiểm lại byte/request của retrieval đã đóng băng, không tráo với graph mới của pipeline.

Lệnh test:

```powershell
node --test reasoning/p01/comparison.test.mjs reasoning/p01/comparison-files.test.mjs reasoning/p01/retrieval.test.mjs reasoning/p01/reasoning.test.mjs reasoning/p01/gemini.test.mjs demo/p01/demo.test.mjs pipeline/p01/pipeline.test.mjs
node scripts/check_p01_demo_browser.mjs --comparison-file handoff-out/p01-comparison/20261015T060823929Z-9904ae18/comparison.json
```

## Điều kiện tiếp theo và P02

1. Huy chốt hợp đồng abstention phiên bản mới; triển khai/test đồng nhất hai cấu hình trước khi dùng cặp này so chất lượng. Đây là sửa thiết kế đánh giá response, không sửa GT theo prediction.
2. Cần hồ sơ review P01/protocol từ người thật độc lập, chỉ rõ người, version/SHA, quyết định và bất đồng. Phản hồi tổng quan về đề tài không tự thay hồ sơ này; AI không ký thay hoặc tự chuyển pending_review.
3. Trước mở ca mới, chốt protocol chọn scenario và evaluation universe **độc lập với output hệ thống**, source/config/patch, kế hoạch bằng chứng và phân công annotator/reviewer khác nhau. P02–P04 hiện chưa được chọn/mở.
4. Khóa split/test và cho phép chấm chính thức là bước phê duyệt riêng, không mặc định đi kèm mở scenario hoặc test kỹ thuật đạt. Theo [mốc review nghiên cứu](../p01-reviewer/NEXT_REVIEW_MILESTONE.md), review các ca mới có thể gom thành một đợt khi đủ evidence; không nhất thiết review mọi commit kỹ thuật.

Đã hoàn tất phần chạy giới hạn và màn hình đối chiếu; **so sánh chất lượng đầy đủ chưa hoàn tất**. Không đứng im toàn bộ dự án, nhưng không mở P02 hoặc sửa hợp đồng/nhãn/split một cách ngầm định. Thay đổi source lần này còn cục bộ; chưa đưa lên GitHub. Các file reviewer/research untracked sẵn có được giữ nguyên.
