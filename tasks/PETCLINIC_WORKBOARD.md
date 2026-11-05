# Theo dõi PetClinic

Mới nhất05/11: [hai ZIP review đã lắp/kiểm](research/PETCLINIC_REVIEW_PACKAGES_2026-11-05.md), [status](PETCLINIC_REVIEW_PACKAGE_STATUS_2026-11-05.json), [cách gửi R1 trước](petclinic-review-release/COORDINATION_2026-11-05.md). REVIEW-PACKET verified_scoped mức assembly; chưa gửi/nhận việc/notes/accepted. R2 giữ riêng tới sau checkpointR1 thật, không dùng synthetic fixture làm review. ACK Hiển không bắt buộc; không model/scoring/push.

Mới nhất05/11: [context P03 và actual review data previews đã chuẩn bị](research/P03_CONTEXT_REVIEW_PREPARATION_2026-11-05.md), [status](P03_CONTEXT_REVIEW_PREPARATION_STATUS_2026-11-05.json). ACK Hiển không bắt buộc. 14 tests/bảy contexts, R1/R2 data và allowlist/checker đã có; official assembly/release/reviewer/accepted vẫn chưa. [Readiness mới](petclinic-review-draft/readiness.2026-11-05.json) bổ sung snapshot cũ; không model/scoring/push.

Cập nhật hiện hành05/11: [P03-T01 đã sửa và kiểm độc lập](research/HIEN_P03_BREAKER_FIX_2026-11-05.md), [status](P03_BREAKER_FIX_STATUS_2026-11-05.json). 39 tests/hai Neo4j DB mới đạt; bảy regression RED trên parser cũ đúng dự kiến. P03-METHOD verified_scoped mốc C, record/dataflow limits vẫn khai; Phát checkpoints không đổi. Coordinator tiếp context P03/actual data allowlist hai lượt review, REVIEW-PACKET đang chuẩn bị chứ chưa release. [ACK Hiển](hien-next/ACK_P03_BREAKER_FIX_2026-11-05.md) đã soạn/chưa tự gửi; các dòng03/11 dưới đây là lịch sử trước sửa.

Cập nhật hiện hành 03/11: [P03 native đã chạy lại độc lập](research/HIEN_P03_TECHNICAL_RETURN_2026-11-03.md), [status](P03_TECHNICAL_RETURN_STATUS_2026-11-03.json). 30 units/hai DB mới đạt extraction/inventory/parity/idempotence/source retrieval; P03-T01 gán nhầm breaker/fallback cho Customers GET cần sửa. Record getPetIds thiếu/serialization-dataflow/nested IDs còn limits. P02/P03 drafts đã có checkpoint, không chờ Phát làm lại. [Phản hồi mới cho Hiển](hien-next/SEND_AFTER_P03_TECHNICAL_RETURN_2026-11-03.md) đã soạn, chưa báo gửi. Các trạng thái 01–02/11 dưới đây là lịch sử; không suy toàn PetClinic/GraphRAG hoàn tất, model/scoring/accepted/contract/push vẫn riêng.

Cập nhật 02/11/2026. Đây là bảng điều phối hiện hành; dữ kiện chi tiết, input/output/DoD, bằng chứng và điều kiện phụ thuộc nằm trong [sổ máy đọc được](PETCLINIC_WORKBOARD.json). Chỉ dẫn mới nhất của Huy và PROJECT_CONTEXT.md có ưu tiên cao hơn. Không sửa packet hoặc raw frozen để cập nhật tiến độ.

Checkpoint mới: [Phát P02 v4 và Hiển mốc A đã kiểm](research/TEAM_RETURNS_REVIEW_2026-11-01.md), [status](TEAM_RETURN_STATUS_2026-11-01.json). P02 đã có receipt theo D20 và kiểm tích hợp source/Neo4j/retrieval; còn Class.name full-property parity và inventory bốn helpers cần Hiển sửa. Phát tiếp P03, chưa draft/receipt P03. Huy đã báo gửi gói Hiển tiếp và phản hồi Phát; chưa ACK lượt mới, nhãn vẫn pending_review. [Delivery record](DELIVERY_REPORTED_2026-11-01.md).

Phần điều phối mới trong lúc chờ: [bộ xem native evidence P02](../demo/p02-native/README.md) đã kiểm 8 unit/10 browser checks, [status](P02_NATIVE_INSPECTOR_STATUS_2026-11-01.json). Chỉ hiển thị output kỹ thuật đã lưu, không hoàn tất VIEWER-E2E hoặc sửa hai lỗi của Hiển.

Đã chuẩn bị thêm [khung review hai lượt](petclinic-review-draft/COORDINATOR.md) và [Methods working draft](../docs/manuscript/README.md), [status](REVIEW_METHODS_PREPARATION_STATUS_2026-11-01.json). Chỉ hoàn tất authoring: actual packet/reviewer/decision và campaign vẫn chưa có; không áp contract nháp hoặc coi đã review PetClinic.

Đã hoàn tất thêm [retrieval/context P02 trên baseline thật](../pipeline/p02/STATIC_CONTEXT.md): 12 tests/checker đạt, bảy preview lexical/graph/combined của một ca, có packing/drop/hash và kiểm từ chối overflow/tamper. [Status](P02_STATIC_CONTEXT_STATUS_2026-11-01.json). Đây là phần tích hợp coordinator, không thay Hiển sửa parser hoặc Phát lập nhãn; chưa inference/scoring hoặc hoàn tất VIEWER-E2E.

Mới nhất 02/11: [P03 draft.v2 đã kiểm](research/P03_ANNOTATION_INTAKE_2026-11-02.md), [status](P03_ANNOTATION_STATUS_2026-11-02.json), [receipt kỹ thuật](hien-next/P03_TECHNICAL_RECEIPT_2026-11-02.json). Phát hoàn tất checkpoint phạm vi nhãn nháp: 31 ID/ba seed, 5 positive/6 negative/20 unresolved, vẫn pending_review. Mốc C đã mở theo D20; gói Hiển riêng đã chuẩn bị/kiểm, chưa báo gửi/ACK hoặc actual P03 method run. Các đoạn 01/11 bên trên giữ sự kiện lúc đó.

P02 kỹ thuật cập nhật tiếp 02/11: [return Hiển đã kiểm độc lập](research/HIEN_P02_TECHNICAL_RETURN_2026-11-02.md), [status](P02_TECHNICAL_RETURN_STATUS_2026-11-02.json). 24 units và hai DB thật đạt: full-property parity, 9 Method nodes/8 eligible có đủ. Đây là return P02 trước, không phải P03. Huy dự định gửi gói P03, chưa báo gửi xong/ACK. Giữ hai caveats hash report LF/CRLF và phần Hiển chưa xác nhận tự xem diff.

Tiếp theo cùng ngày: Huy đã báo gửi P03 và phản hồi P02, [delivery record](DELIVERY_REPORTED_2026-11-02.md), chưa ACK/ETA mới. Coordinator đã hoàn tất [context và viewer P02 reviewed](research/P02_REVIEWED_DERIVATIVES_2026-11-02.md), [status](P02_REVIEWED_DERIVATIVES_STATUS_2026-11-02.json): 4 profile guard tests/7 previews checked/11 browser checks, viewer cập nhật 9 Methods và full parity. 7 context texts giống byte bản cũ, không suy hiệu quả tăng từ inventory. Hai checkpoint nhãn đã đủ, không yêu cầu Phát làm lại.

## Việc hiện tại theo người

| Phụ trách | Việc đang chờ/làm | Kết quả cần nhận để đi tiếp |
|---|---|---|
| Hiển | P03 technical packet và phản hồi P02 đã chuyển theo lời Huy | Chưa ACK/ETA/return mới. Giữ reviewed candidate và receipt P03, trả extraction/inventory/unsupported trước rồi DB/parity/retrieval; không model/scoring/nhãn. |
| Phát | P02 draft.v4 và P03 draft.v2 đều đủ checkpoint kỹ thuật | Giữ nhãn pending_review, history/source/raw/exposure; 20 unresolved và R22 inference limit ở P03 để reviewer/bằng chứng bổ sung xử lý, không tự sửa theo output hệ thống. |
| Huy/AI | Context/viewer P02 từ reviewed run đã hoàn tất kiểm kỹ thuật | [Mở bộ xem mới](../demo/p02-native/REVIEWED_VIEW.md), current source/assumptions/provenance rõ. Tiếp nhận từng phần P03 khi Hiển trả, không làm trùng parser hoặc tự lập/duyệt nhãn. |
| Huy | Đã báo gửi P03 và phản hồi P02 cho Hiển | Chưa cần gửi lại ZIP/việc cũ. Tham khảo viewer hiện hành; model/contract/scoring/reviewer decisions vẫn riêng, chưa mở từ lời báo gửi. |
| Reviewer khác annotator | Review gộp P01–P03 sau khi packet sẵn | Hai lượt source-first/so nhãn và quyết định từng ca thật. Nhận xét tổng quan trước đây chưa phải nghiệm thu nhãn. |

## Đường tới mốc review

- P01: kỹ thuật đã kiểm; cặp model mới còn thiếu Graph+Vector hợp lệ, lỗi 503 giữ nguyên; nhãn vẫn pending_review. Blocker phải được nêu trong hồ sơ, không giả output để đóng việc.
- P02: draft.v4/receipt giữ nguyên; bản sửa Hiển 02/11 đã độc lập đạt 24 units và Neo4j full-property parity, 8/8 eligible Method inventory. Các caveats báo cáo/hash và self-report người thực hiện vẫn ghi đúng. Đây là scoped native technical completion; chưa ba cấp prediction/model/scoring/accepted hoặc full GraphRAG.
- P03: input D19 và paired evidence đã kiểm; draft.v2/notes/exposure/human grouped confirmation đủ checkpoint D20 ngày 02/11, receipt đã tạo. 20 unresolved/R22 inference limit vẫn mở cho bằng chứng/review. Mốc C kỹ thuật được phép, technical packet mới chưa báo gửi/ACK và chưa actual method run. [Status mới](P03_ANNOTATION_STATUS_2026-11-02.json) thay trạng thái chờ checkpoint; runtime D19 và readiness 01/11 giữ snapshot lịch sử.
- Kỹ thuật từng ca: D20 cho extraction–Neo4j–retrieval offline sau [intake checkpoint](CHECKPOINT_INTAKE_2026-10-31.md) và receipt lọc nhãn. Ca nào đủ trước làm trước, P03-METHOD không còn hard dependency vào P02-METHOD. Không cần xin lại quyền đã cho hoặc reviewer ký trước bước kỹ thuật; không gửi output sang annotator để sửa nhãn cho khớp.
- Phần dùng chung: contract/thiết kế, viewer dùng output thật, hai lượt packet review, người review/lịch, sửa sau review và bản code được công bố. P04/Online Boutique chỉ sau mốc PetClinic; campaign tạp chí rộng hơn là việc sau, không tự đủ bằng ba ca development.

## Cách giữ việc không bị rơi

Trong lúc chờ: coordinator đã tổng hợp [đề xuất quyết định](research/PETCLINIC_NEXT_DECISIONS_2026-11-01.md) để Huy xem xét. [Intake prototype](../prototypes/checkpoint-intake/README.md) đã có, không cần làm lại hoặc tự áp gate; không đụng code Hiển/nhãn Phát. Phần human reading và evidence ngữ nghĩa không thể hoàn tất bằng việc tăng số tests máy.

Mỗi phiên làm việc đọc PROJECT_CONTEXT và sổ này; đối chiếu tin mới/return với status overlay. Trước kết phiên cập nhật owner, trạng thái, bằng chứng, blocker, next action và chạy:

```powershell
node scripts/check_petclinic_workboard.mjs
```

Checker phát hiện thiếu các luồng đã biết, thiếu owner/DoD/next action, dependency không tồn tại hoặc vòng lặp, link bằng chứng hỏng, ZIP sai hash và ACK không có hồ sơ. Việc đổi người/nhận thêm việc phải cập nhật sổ và task tương ứng. Khi Hiển trả regression phải nối tiếp P02-METHOD theo gate, không quên giao tiếp vòng sau.

Checker chỉ kiểm cơ học, không chứng minh danh sách đã bao quát mọi vấn đề nghiên cứu, người thật đã đọc hay kết luận đúng. Nó không cấp quyền chạy, khóa input/test, duyệt nhãn hoặc mở model/push. Huy báo đã gửi chỉ là provenance gửi; không ghi người nhận đã nhận việc hoặc cam kết deadline nếu họ chưa phản hồi. Không có theo dõi nền hoặc nhắc tự động; bảng được đối chiếu trong các phiên làm việc.

Nếu chỉ còn dependency con người và không còn phần kỹ thuật độc lập có ích, báo rõ task nào đang chặn mốc; không gọi toàn dự án đứng im khi vẫn có việc hợp lệ làm được.
