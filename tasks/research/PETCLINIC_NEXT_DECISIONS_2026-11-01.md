# Đề xuất bước tiếp theo trong lúc chờ P02/P03

Ngày 01/11/2026. Người soạn: AI điều phối hỗ trợ Huy. **Đây là đề xuất để Huy xem xét, chưa có quyết định áp dụng hoặc phản hồi thiết kế của Hiển/Phát.** Không cấp quyền triển khai contract, inference, scoring hoặc final test. Các quyết định D15/D18/D19/D20, source, nhãn, raw và bản nháp 15/10 giữ nguyên.

## Việc cần đạt ở mốc gần nhất

Mục tiêu là đưa P01–P03 tới mức sẵn review gộp: input có provenance; runtime có controls/repetitions/reset; nhãn nháp có người chịu trách nhiệm, notes/exposure và version/hash; output kỹ thuật có giới hạn rõ. Đây là mốc PetClinic development, chưa phải hoàn tất thực nghiệm hoặc bài báo tạp chí.

| Luồng | Đang có | Điều kiện để tiến tiếp |
|---|---|---|
| P01 | Kiểm kỹ thuật và viewer đã có; nhãn pending_review | Giữ blocker Graph+Vector provider 503 trong hồ sơ; chưa có cặp model mới hoàn chỉnh |
| P02 | Checkpoint draft.v4 đã kiểm; source-only extraction, hai DB Neo4j và graph retrieval đã chạy | Hiển sửa parity Class.name và inventory explicit methods, gửi diff/hash/log và giới hạn. Không rerun HTTP matrix khi chỉ sửa parser/importer |
| P03 | Input D19 và paired runtime đã kiểm; Phát đang được giao nhãn nháp | Kiểm checkpoint người lập nhãn khi nhận được; đủ thì cấp receipt kỹ thuật riêng và chạy theo D20. Không cần chờ P02 xong |
| Định dạng/đánh giá | Có hai bản nháp và prototype tổng hợp | Thống nhất các lựa chọn bên dưới trước khi áp dụng adapter/schema hoặc so sánh chính thức |
| Review | Có hướng review gộp, chưa quyết định nhãn | Chuẩn bị hai lượt riêng; source/raw trước, đối chiếu nhãn sau. Xác nhận reviewer/lịch thật khi gần sẵn |

Sau tin đã gửi ngày 01/11, chưa cần giao thêm việc hoặc yêu cầu hai bạn đọc toàn bộ context điều phối. Hiển giữ code; Phát giữ annotation. Không chuyển output kỹ thuật sang annotator để chỉnh nhãn.

## Ba nhóm đề nghị Huy xem trước

1. **Cùng một nghĩa đầu ra:** dự đoán riêng Method/API/Service; dependency, behavioral impact và repair tách biệt; unknown/omitted/unsupported giữ riêng. Chưa tự suy tác động API/Service từ một Method có đường đi.
2. **So sánh công bằng:** known seed và static pre-deployment; cùng source/patch, model/prompt, trần tổng token và output format ở các cấu hình có LLM. Đối chiếu chính dự kiến GraphRAG–Vector; thêm lexical và rules để xem đóng góp đến từ đâu. Đây là hướng thiết kế, chưa phải các baseline đều đã xây xong.
3. **Làm theo khả năng hiện có:** hoàn thiện offline theo D20 và kiểm những gì có thật; giữ model, budget, test/split, scoring và thống kê ở bước quyết định riêng. Không trì hoãn checkpoint/tích hợp vì chưa chọn model, cũng không dùng test pass để tự mở các bước còn lại.

Huy đồng ý hướng này sẽ là chủ trương chuẩn bị, không được ghi thành cả 18 mục đã adopted hoặc Hiển/Phát đã phê duyệt. Các chi tiết ảnh hưởng hợp đồng chung và scorer vẫn cần phản hồi đúng vai trò rồi ghi version áp dụng. Không cần nhờ reviewer nhãn phê duyệt từng lựa chọn code.

## Khuyến nghị cho tám mục output

Các mã `OUT.D01–OUT.D08` dưới đây trỏ tới D01–D08 của [checklist output](../../docs/contracts/REVIEW_CHECKLIST.v0.1.DRAFT.md), **khác** D01–D08 lịch sử ở PROJECT_CONTEXT. Mọi mục vẫn là khuyến nghị, không phải decision record.

| Mã | Khuyến nghị | Điều cần làm rõ trước áp dụng |
|---|---|---|
| OUT.D01 | Giữ payload ba level, assessment thưa, likely/unlikely/unknown; runner giữ execution/validation/coverage riêng | Khai supported levels theo cấu hình. Không tạo assessment âm để lấp ID thiếu |
| OUT.D02 | Canonical ID gắn repository/baseline, service, overload hoặc HTTP method/path; alias có evidence, giữ raw ID | Kiểm registry từ source, nhiều API mapping/handler và alias đổi signature. Không fuzzy match hoặc áp ID HTTP cho gRPC |
| OUT.D03 | Witness là chuỗi Method caller→callee→seed, 1–3 hop; chứa/gắn handler không cộng hop | Graph-match và source-inferred là hai scope validation khác nhau; cả hai không tự thành gold path hoặc impact |
| OUT.D04 | Behavior độc lập repair; required/optional chỉ khi có strategy được request cho phép | Chưa biết để unknown/null; không bắt caller/controller đổi chữ ký chỉ vì seed đổi |
| OUT.D05 | Bắt đầu bằng direct assessments; chưa tự projection Method→API→Service | Level chưa có cách dự đoán hợp lệ báo unsupported. Witness Service không chứng minh cả Service bị ảnh hưởng |
| OUT.D06 | Giữ pure-abstention như P01; unknown có thể thiếu citation đúng điều kiện, citation có mặt vẫn phải kiểm | Omitted, unknown, unresolved parser, unresolved gold và pending_review không hoán đổi; seed để riêng |
| OUT.D07 | Adapter đánh giá tương lai giữ likely→true, unlikely→false, unknown→null cùng loss ledger; không sửa scorer hiện có | Invalid/OOS, conflict duplicate, partial và failed-run denominator cần thống nhất. Chưa chọn quy đổi failure vào F1; báo mọi attempts/failure, không chỉ subset đẹp |
| OUT.D08 | Tạo version mới và kiểm migration sau phản hồi; output P01/raw/validator lịch sử giữ nguyên | Không hồi tố dùng contract mới để biến output cũ thành pass. Đồng ý format không là accepted labels hoặc quyền chấm điểm |

OUT.D07 là điểm còn phải giải quyết thực chất trước scorer adapter: với output không xác định được level hoặc conflict, không được tự bỏ record rồi tính điểm như không có lỗi. Giữ nguyên raw, báo lỗi và giữ official scoring đóng cho đến khi có policy được thống nhất. Unknown/omitted trên gold positive vẫn không được loại khỏi mẫu số recall theo protocol; đó không phải cách biến missing thành gold negative.

## Khuyến nghị cho mười mục thiết kế

Các mã `EXP.E01–EXP.E10` trỏ tới [checklist thực nghiệm](../../docs/experiments/REVIEW_CHECKLIST.v0.1.DRAFT.md). Không tạo runner/grid thực nghiệm từ bảng này.

| Mã | Khuyến nghị | Phần còn để mở |
|---|---|---|
| EXP.E01 | Primary track dự kiến static/known seed; Method micro F1 của B5–B4 làm primary contrast, API/Service báo riêng | Chưa đo quality; chỉ chốt endpoint cuối cùng sau khi xác nhận khả năng hỗ trợ và thiết kế campaign |
| EXP.E02 | Giữ B0–B5 theo bản nháp: B0 khác target; B1 topology, B2 rules, B3 lexical+LLM, B4 vector+LLM, B5 graph-assisted+LLM | B1 traversal kỹ thuật chưa là predictor; B2 chưa có engine; B3 mới tổng hợp. Không đổi tên prototype thành baseline hoàn chỉnh hoặc gán F1=0 cho level unsupported |
| EXP.E03 | Giữ đối chiếu bỏ graph/semantic/metadata và depth 1/2/3; dedup các config alias | A-C/A-T giữ source pool cố định, chỉ bỏ derived metadata; source vẫn có annotation. Không claim đã loại toàn bộ contract knowledge |
| EXP.E04 | Cùng trần **toàn request**; seed/patch bắt buộc, selected/dropped có ledger và tie-break ổn định | Tokenizer, chunking/top-k và token caps chọn sau trên dev. Byte ceiling prototype chưa chứng minh token fairness; không bịa số cho đủ bảng |
| EXP.E05 | P01–P03 giữ development; P01/P02 cùng duplicate group, không đổi thành unseen test | Quy mô, scenario selection, hệ thống mới và holdout chọn riêng trước campaign. Không bỏ ca toàn âm vì F1 không đẹp |
| EXP.E06 | Giữ 0 model calls trong phạm vi hiện tại, không retry tự động hoặc đổi model một phía | Provider/model/revision, usage/quota, số calls/repetitions và budget được chốt riêng; không tra key hoặc suy Free Tier là chi phí đo được bằng 0 |
| EXP.E07 | Đồng bộ với OUT.D05–D07; report coverage/failure trên toàn kế hoạch, score từng level | Failure/partial policy và adapter còn mở; success-only chỉ là diagnostic có điều kiện, không kết luận hơn/kém từ subset này |
| EXP.E08 | Unit là scenario và nhóm gần trùng theo repository; repetitions không tạo scenario độc lập | Chưa chọn CI/test/resampling count hoặc tuyên bố power/significance từ PetClinic; entity/test count không là cỡ mẫu nghiên cứu |
| EXP.E09 | Ghi offline indexing và online stages riêng, failed attempts và native usage có provenance; thiếu số đo để null | Prototype clock/token fixture chưa đo performance thật. Không cộng token fields chồng lấp hoặc coi null là 0 |
| EXP.E10 | Theo D20 từng ca: kiểm checkpoint→receipt→offline integration; rồi contract/implementation checks, budget, review và quyết định đánh giá tương ứng | P04 sau review/sửa PetClinic; không mở schema, model, test hoặc score chỉ vì Huy báo đã gửi gói |

## Một khác biệt kỹ thuật phải giữ rõ

Lượt P02 ngày 01/11 tạo graph baseline và mutated để kiểm extraction, query metadata, import/idempotence và traversal. Đây là **diagnostic kỹ thuật trên source snapshots**, chưa triển khai primary static prediction experiment.

Trong thiết kế dự kiến, model/retriever nhận baseline source/config đã pin và proposed provider diff được cho phép; không nhận paired runtime outcomes, nhãn, notes, gold hops hoặc future consumer repair. Graph của mutated snapshot không tự được dùng như lợi thế thêm cho một phía. Cần ghi input policy cụ thể và dùng chung trước khi triển khai thí nghiệm. Receipt có hash nhãn để xác định checkpoint không có nghĩa nội dung nhãn được vào context.

Candidate pool cũng không là universe. Lượt P02 native mới biểu diễn 4/8 Method eligible; không coi bốn missing helpers là negative hoặc co universe xuống bốn để làm đủ coverage. Khi Hiển sửa, kiểm lại tổng quát source inventory, bindings, metadata và path; không giao người lập nhãn điều chỉnh đáp án cho khớp graph.

## Cách đi tiếp mà không phát sinh vòng chờ mới

1. Huy xem ba nhóm khuyến nghị; chưa cần gửi thêm packet ngay cho hai bạn. Khi có return, tiếp nhận đúng phần đã giao trước.
2. Có checkpoint P03 thì kiểm notes/exposure/hash và lập receipt lọc nhãn; actual integration P03 tiếp trong quyền D20, kể cả Hiển đang sửa P02. Chưa checkpoint thì chỉ chuẩn bị tổng hợp/thiết kế.
3. Có code Hiển mới thì đối chiếu diff/hash, chạy kiểm độc lập phù hợp; giữ candidate và failure cũ. Node inventory đúng không tự chứng minh dependency hoặc behavioral impact đúng.
4. Rà output contract theo phần với Hiển/Phát khi xong mốc hiện tại, chỉ gửi tài liệu thiết kế lọc vai trò, không kèm evaluated outputs/nhãn làm đáp án. Ghi góp ý thật rồi Huy quyết định version áp dụng; chưa áp trong lượt này.
5. Chốt readiness từng ca và hai lượt reviewer, ghi rõ blocker model/code còn tồn. Xác nhận reviewer/lịch thật; không hứa PetClinic đủ làm bài tạp chí hoặc review chắc chắn chỉ một vòng.

Nguồn hiện hành: [PROJECT_CONTEXT v0.25 tại lúc soạn](../../PROJECT_CONTEXT.md), [status return 01/11](../TEAM_RETURN_STATUS_2026-11-01.json), [board](../PETCLINIC_WORKBOARD.json), [D20](../../benchmark/decisions/PETCLINIC_DRAFT_INTEGRATION_2026-10-31.json), [hợp đồng nháp 15/10](../../docs/contracts/IMPACT_OUTPUT_CONTRACT.v0.1.DRAFT.md) và [thiết kế nháp 15/10](../../docs/experiments/EXPERIMENT_DESIGN.v0.1.DRAFT.md). Trạng thái P02/P03 trong tài liệu 15/10 là lịch sử; bảng hiện tại ở đầu đề xuất này không tự sửa hoặc chấp thuận các bản nháp đó. Không đọc output model/score mới để lựa chọn policy; không gọi API hoặc tạo kết quả minh họa như số đo thật.
