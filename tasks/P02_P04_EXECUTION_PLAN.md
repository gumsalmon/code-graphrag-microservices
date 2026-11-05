# P02–P04 — kế hoạch triển khai và review gộp

Cập nhật 25/10/2026: [P03 đã có candidate source/patch/fixture/scope và kiểm offline](research/P03_PREPARATION_2026-10-25.md); chưa được chọn/chốt input, compile app hoặc chạy runtime. Huy báo Phát đang làm P02; chưa nhận draft/hash để mở output development. [Status P03](P03_PREPARATION_STATUS_2026-10-25.json) bổ sung tiến độ, không sửa register/gói frozen cũ.

Điều phối hiện hành 24/10/2026: [PetClinic pre-review plan](PETCLINIC_PRE_REVIEW_PLAN_2026-10-24.md) thay mốc “review sau P04” bằng review gộp P01–P03, xử lý phản hồi rồi mới mở Online Boutique/P04. P02 đã chốt input/thu F03; xem [báo cáo F03](research/P02_F03_RUNTIME_2026-10-24.md). Nội dung ngày 15/10 bên dưới giữ nguồn quyết định/đặc tả cũ; không dùng trạng thái G0–G2/chưa mutated hoặc mốc P04 cũ để phủ nhận checkpoint mới. Input, independence, draft checkpoint, accepted/test/scoring vẫn giữ gate riêng.

Ngày: 15/10/2026. Huy đã chọn C02-A/P02 và cho làm runner/baseline. **P02 đã chuẩn bị input, build offline và kiểm baseline thật; chưa mutated/POST/đủ matrix, universe chưa được xác nhận độc lập/khóa. P03–P04 còn ứng viên; không có nhãn hoặc test manifest mới.** Xem [gói P02](../benchmark/p02/README.md), [runner baseline](../pipeline/p02/README.md), [sổ v3](P02_P04_RESEARCH_REGISTER.json) và [task packet](P02_P04_TASK_PACKETS.md).

## 1. Mục tiêu và giới hạn

Đợt này xây một bộ **development/feasibility** đủ đa dạng để kiểm quy trình trước khi mở benchmark bài báo: từ REST thêm tham số sang response schema rồi gRPC wire contract. Không dùng bốn ca P01–P04 làm bằng chứng đủ về tổng quát hóa hoặc thống kê. P01 đã lộ nhiều lần, không thể trở thành unseen test; P02–P04 nếu dùng debug/tuning cũng giữ development vĩnh viễn ở phiên thí nghiệm tương ứng.

Đích nghiên cứu vẫn là behavioral impact ở Method/API/Service dưới fixture xác định, không phải mọi node reachable. Repair là mục riêng. Tốt nhất không phải ca nào cũng gây lỗi: cần ca tương thích có đường phụ thuộc, ca đổi nội dung thay vì chỉ status, và ca khác giao thức. Nhãn thật do người lập nhãn và reviewer khác nhau quyết định từ bằng chứng, không từ kỳ vọng trong kế hoạch này.

Nền tảng: protocol Phát v0.2 tại `5f9204d66253604edf9101c2f888fc7e75aa0be7`, đặc biệt §6.1, §9–11. Giữ nguyên bản protocol và gói P01 đã frozen. Mục 8.4 của PROJECT_CONTEXT.md là addendum điều phối được Huy duyệt: **review gộp được lùi, các gate universe/evidence/independence/test/scoring không bị bỏ.** Chưa tuyên bố Phát hoặc reviewer đã đồng ý một schema mới.

## 2. Bằng chứng chọn hướng, chưa chạy ca mới

| Ca dự kiến | Nguồn đã đọc | Thay đổi ứng viên chính | Giá trị cần kiểm chứng | Trạng thái |
| --- | --- | --- | --- | --- |
| P02 | PetClinic `3858f9c630cf989bb6809a86edf47c2be78dc9f1`, VisitResource/VisitsServiceClient/ApiGatewayController | Thêm query tùy chọn/default false, giữ nguyên logic response | Reachable không tự là behavioral impact; đối chứng tương thích với P01 | Input chuẩn bị và baseline feasibility đạt; universe draft chưa xác nhận, chưa mutated/nhãn |
| P03 | Cùng PetClinic SHA, OwnerResource/Owner/OwnerDetails/CustomersServiceClient/ApiGatewayController | Đổi tên trường JSON `pets` thành `animals` chỉ ở response GET owner đơn lẻ, giữ consumer nguyên | Response shape và việc consumer dùng dữ liệu; HTTP status không đủ kết luận | Source audited; chưa patch/runtime/universe/nhãn |
| P04 | Online Boutique candidate SHA `38e7348eb289eb5b87c0c6e8cb19ced0449dc389`, protos/demo.proto và productcatalog/checkout/frontend | Provider-only thay số field `GetProductRequest.id` từ 1 sang số mới chưa dùng, regenerate provider; consumer dùng binary/proto cũ | Wire compatibility khác tên method/path; lỗi lan qua gRPC và nhánh gọi | Source/API metadata audited; chưa clone/build/runtime hoặc chốt toolchain |

PetClinic: source checkout riêng đã sạch tại baseline pin được dùng để đọc, không sửa source pilot. [VisitResource](https://github.com/spring-petclinic/spring-petclinic-microservices/blob/3858f9c630cf989bb6809a86edf47c2be78dc9f1/spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java) có handler nhận danh sách petId và overload theo một pet; [OwnerResource](https://github.com/spring-petclinic/spring-petclinic-microservices/blob/3858f9c630cf989bb6809a86edf47c2be78dc9f1/spring-petclinic-customers-service/src/main/java/org/springframework/samples/petclinic/customers/web/OwnerResource.java) có GET owner trả Optional<Owner>. Đây là kiểm source, không phải runtime mới.

Online Boutique: đã đọc SHA HEAD qua `git ls-remote` ngày 15/10, chỉ dùng làm **candidate revision**; không tự cập nhật theo main. [Proto](https://github.com/GoogleCloudPlatform/microservices-demo/blob/38e7348eb289eb5b87c0c6e8cb19ced0449dc389/protos/demo.proto) khai báo ProductCatalogService.GetProduct và id field 1. [Provider](https://github.com/GoogleCloudPlatform/microservices-demo/blob/38e7348eb289eb5b87c0c6e8cb19ced0449dc389/src/productcatalogservice/product_catalog.go) đọc req.Id, tìm catalog, trả NotFound nếu không tìm được. [Checkout](https://github.com/GoogleCloudPlatform/microservices-demo/blob/38e7348eb289eb5b87c0c6e8cb19ced0449dc389/src/checkoutservice/main.go) gọi GetProduct khi chuẩn bị order items và có thêm các bước nội bộ; [frontend client](https://github.com/GoogleCloudPlatform/microservices-demo/blob/38e7348eb289eb5b87c0c6e8cb19ced0449dc389/src/frontend/rpc.go) là một đầu vào rà soát. Chưa gán số hop từ topology hoặc bỏ bước nội bộ để ép dưới 3 hop.

[Protobuf guide, Assigning Field Numbers/Updating](https://protobuf.dev/programming-guides/proto3/) giải thích field number định danh field trên wire; đổi số là thay đổi không an toàn. P04 cố tình là mutation nghiên cứu phá tương thích, **không phải khuyến nghị sửa production**. Chọn số mới không xung đột; không tái dùng số cho field khác. Kết quả hành vi vẫn phải chạy để xác nhận, không lấy quy tắc này làm nhãn sẵn.

## 3. Trình tự bắt buộc cho từng ca

1. **G0 — chọn ca:** sổ ứng viên ghi source/config revision, operator, phạm vi, lý do giữ/loại, duplicate group, exposure và mục đích development. Huy xác nhận lựa chọn; Phát xác nhận khả năng lập nhãn độc lập. Không xem score/prediction để chọn. P02 đã selected_for_preparation bởi Huy; chưa có xác nhận Phát. P03/P04 còn proposed_primary.
2. **G1 — khả thi baseline:** checkout riêng, pin dependency/images/config, build được và request baseline có raw body/status/log. Hỏng hạ tầng thì ghi blocker và giữ log; không chạy mutated để lờ baseline hỏng. Được soạn/kiểm áp dụng patch chuẩn bị nhưng không coi đó là đã qua gate baseline. P04 chỉ dùng local sandbox; không tự tạo GCP/Kubernetes/billing.
3. **G2 — khóa đầu vào ca:** tạo patch có hash trên checkout riêng; giữ consumer/config đúng phạm vi. Phát/Huy chốt fixture, canonical seed before/after, inventory độc lập từ source/contract, scope và evaluation universe trước gán polarity hoặc xem output phương pháp. Không lấy graph 5 node P01 làm universe ca mới. Chưa đủ ID/alias thì để missing, chưa khóa.
4. **G3 — thu bằng chứng và nhãn nháp:** baseline, mutated, request tương thích/không tương thích phù hợp operator, consumer/gateway và đối chứng; giữ cả lỗi hạ tầng. Phát kiểm bằng chứng và lập nhãn; AI hỗ trợ sắp xếp, không tự gán polarity thay Phát. Mỗi ID trong universe có bằng chứng hoặc unresolved; không biến chưa quan sát thành negative.
5. **G4 — kỹ thuật development:** Hiển kiểm extraction/import/query/idempotence/error cases, Huy nối context/baseline. Chỉ sau universe/draft được version/hash mới xem output development; cách ly Phát khỏi output trước khi khóa nhãn tương ứng. Mọi tuning/exposure được ghi lại; không đổi universe/nhãn theo prediction. Không gọi API nếu chưa duyệt ngân sách/cặp cấu hình.
6. **G5 — review gộp sau P04:** kiểm inventory, provenance, runtime, draft hashes; gửi source-first cho tất cả ca đủ đầu vào, chưa gửi output hệ thống/nhãn. Lưu notes/tên/thời gian/hash/khai báo tiếp xúc rồi mới gửi gói đối chiếu. Reviewer chọn approve/request_changes/unable_to_review từng ca; cho phép duyệt một phần, phần còn lại pending. Không cần chờ mọi ca hoàn hảo mới báo thiếu bằng chứng.
7. **G6 — nghiên cứu chính thức:** accepted labels cần quyết định người thật và checksum hai giai đoạn. Final test/split/scoring cần phê duyệt riêng trước inference chính thức. Đợt development này không tự thành final test dù reviewer duyệt nhãn. Cần chiến dịch ca/hệ thống mới chưa dùng tuning cho đánh giá cuối.

## 4. Đặc tả thực hiện từng ca

### P02 — kiểm soát tương thích trên REST

- Chỉ candidate mới từ baseline, không sửa folder P01 hoặc patch required đã frozen. Ứng viên: thêm `includeDetails` tùy chọn với default có kiểu boolean hợp lệ, không đổi thân logic handler. Byte patch/default cụ thể phải được đăng ký trước chạy; không tự lấy patch P01 rồi sửa overwrite.
- Cùng fixture owner/pet/visits có dữ liệu. Thu direct provider và gateway khi không truyền tham số, khi truyền giá trị hợp lệ; malformed boolean là đối chứng lỗi đầu vào riêng, không dùng để gọi cả mutation là breaking. Giữ request bodies/headers/log, không chỉ visits count.
- Là đối chứng cùng family với P01: **cùng duplicate group**, tuyệt đối không chia P01 dev/P02 test. Không đặt trước nhãn negative; nếu hành vi khác dự kiến, giữ kết quả và điều tra theo source/config.
- DoD: baseline/mutated build identities, patch hash, consumer unchanged proof, dữ liệu response chuẩn hóa có phép biến đổi ghi rõ, runtime matrix, universe/alias và draft pending_review. Parser phân biệt declared/effective required/default; không biến đường phụ thuộc thành nhãn impact.

### P03 — response field được consumer sử dụng

- GET `/owners/{ownerId}` được nhắm riêng. Ưu tiên đổi representation trong handler boundary để rename key ở một response; không annotate getter Owner dùng chung rồi giả vờ chỉ một endpoint đổi. Không rename DB column hoặc sửa gateway để che lỗi.
- Source đã cho thấy gateway DTO OwnerDetails có `pets`, `getPetIds()` duyệt pets và controller gọi CustomersServiceClient trước Visits. Đây chỉ là cơ sở đặt phép thử; Jackson/config/null/default và status downstream phải được quan sát.
- Thu GET owner direct, GET gateway cùng owner có pets, owner không có pets làm fixture phụ, owner list hoặc endpoint không chịu mutation làm đối chứng sau kiểm scope. Ghi body pets/animals, decoder error hoặc behavior thật; không điền trước HTTP 500/visits=0.
- Universe xét cả DTO/serialization usage và các endpoint thuộc phạm vi thử, theo quy tắc ID và projection khai báo. Nếu mutation getter làm nhiều API đổi, sửa phạm vi/patch **trước khóa**; sau khóa phải version mới, không bỏ những API gây bất lợi.
- DoD: chứng minh mutation cô lập, mapping class-level RequestMapping được ghép đúng, literal WebClient URL được resolve hoặc báo unresolved, response-schema delta có source spans, runtime/provenance đầy đủ. Parser/contract handling mới là task của Hiển, nhãn không do Hiển tự duyệt.

### P04 — gRPC đầu tiên, hạn chế độ phức tạp có chủ đích

- Source pin là candidate nói trên, chưa được xem là baseline build đã kiểm. Bước đầu chỉ Go/protobuf trên tuyến ProductCatalog–Checkout/Frontend; không hứa hỗ trợ đa ngôn ngữ toàn bộ Online Boutique. Mở rộng polyglot là giai đoạn sau, không nhồi vào P04 nếu chưa có runner.
- Build baseline và pin protoc/plugin/generated-code policy trước. Provider giữ proto/source được thay riêng, consumer giữ binary/image cũ; **không regenerate toàn bộ repo**, vì như vậy xóa mismatch cần đo. Không edit tay file generated để giả source mutation.
- Thu raw protobuf request/response và gRPC status cho client cũ -> provider baseline/mutated, client tương thích -> provider mutated, và ListProducts hoặc RPC đối chứng đã xác minh không đổi. Thử consumer thật; stub/mock chỉ là unit test, không thay benchmark runtime liên dịch vụ.
- Với flow checkout, pin fixture cart/product/currency và dependency cần thiết; full PlaceOrder có nhiều hop và side effects giả lập. Nếu chỉ chạy subset thật, ghi scope đó; không coi một call mock hoặc chỉ GetProduct trực tiếp là E2E checkout. Không dùng thanh toán/email thật hoặc cloud billing.
- Resolver cần nối service/receiver/config -> fully-qualified proto RPC -> handler; unknown/dynamic target phải unresolved. Hỗ trợ Go cú pháp không đồng nghĩa đã hỗ trợ gRPC resolution. Hop đếm từng CALLS/INVOKES_API logic; path dài hơn 3 được báo ngoài phạm vi, không rút ngắn vì muốn đạt 3-hop.
- DoD: baseline/local integration khả thi, toolchain/images/patch/generated hashes, client-version separation, direct và consumer runtime, negative control, universe và draft pending_review; nếu không đạt baseline, giữ P04 feasibility_blocked và đăng ký phương án thay thế từ trước, không bịa labels.

## 5. Baseline, metric và phần cần phát triển thêm

- P01 hiện chỉ Method, known seed và ba file; không nhận là full-repo GraphRAG hoặc Method/API/Service benchmark đã xong. Trước score nhiều cấp phải có output contract/projection + alias + scorer adapter tương ứng, cùng quy tắc cho mọi phương pháp.
- Baseline ưu tiên khả thi: reverse reachability không LLM; graph + contract/consumer-usage rules không LLM; lexical retrieval + cùng LLM; vector + cùng LLM; graph/contract + cùng LLM. Pure contract-diff chỉ đo breaking contract, không so F1 endpoint với F1 method như cùng bài toán. Các cấu hình ngoài P01 là kế hoạch phát triển, chưa báo đã triển khai.
- Khóa query/chunking/top-k/hop/output cap trên dev; cùng nguồn được phép, seed, prompt, model và giới hạn context. Đếm token thực; ghi rõ khi graph thêm metadata/expression khiến context lớn hơn. Thêm ablation topology-only/contract-metadata nếu muốn tách đóng góp, không gọi context hiện tại là adjacency-only.
- Thí nghiệm official sau này báo P/R/F1 theo level/system/change/hop, support, invalid/out-of-scope/unjudged, abstention, failure và coverage. Pure unknown không thành negative; không loại gold positive bị abstain khỏi recall để làm đẹp điểm. API lỗi không thành prediction rỗng đúng. Quy tắc chuyển output sang score phải được chốt riêng, không âm thầm sửa scorer của Phát.
- Bốn scenario không cho phép coi method là hàng trăm mẫu độc lập; không hứa significance hoặc journal readiness. Mutation và historical change phân loại riêng. Sau development cần chọn thêm ca lịch sử/nhóm/hệ thống theo ngân sách và mục tiêu RQ, không hứa số ca chưa có căn cứ.

## 6. Phân công, mốc bàn giao và rủi ro

Huy: chốt operator/scope và technical contracts, điều phối input pins; thực hiện reasoning/baseline và chuẩn bị bài. Hiển: parser/resolver/Neo4j/Chroma và integration runner kỹ thuật, không label/scorer oracle. Phát: universe/selection/evidence/protocol/draft labels và cô lập review, không parser/Neo4j/tuning. Reviewer khác annotator: quyết định từ notes/evidence, không ký vì test pass. [Task packet](P02_P04_TASK_PACKETS.md) ghi input/output/bằng chứng/DoD riêng, chưa giả định thành viên đã xác nhận nhận task mới.

Mốc tiếp theo là **P02 G0–G2**, không chạy cả P02–P04 đồng loạt trước khi P02 kiểm quy trình. Sau P02 audit các bước, rồi P03; chỉ mở runtime P04 khi baseline local khả thi. Các sửa quy trình sau P02 phải version và áp dụng nhất quán, không sửa nhãn đã frozen hoặc để ca bị ảnh hưởng khác version không được khai báo.

Rủi ro: scope 3 file quá nhỏ; method/API/service chưa nối đầy đủ; P03 có Jackson effects chưa biết; P04 Go/proto build có thể tốn tài nguyên; review gộp có thể phát hiện lỗi lặp nhiều ca. Giảm rủi ro bằng G0–G2 trước, checklist kiểm chéo nội bộ không thay reviewer, giữ raw lỗi/version, và không đợi tới cuối mới phát hiện thiếu log. Không cần kết quả Gemini đẹp để qua bước kỹ thuật không phụ thuộc LLM.

Khi đứng lại: cần người thật chọn/duyệt universe hoặc giải quyết bất đồng, thiếu quyền/tài nguyên mới ngoài scope, hoặc tới accepted/test/scoring gate. Provider 503 chỉ chặn inference tương ứng; không chặn chuẩn bị evidence/runner/plan. Không tự bật paid service, gửi tin nhắn, mở/merge PR hoặc công bố code chưa duyệt phạm vi.
