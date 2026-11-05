# Cách dùng task packet với thành viên và AI hỗ trợ

Mới nhất05/11: [hai ZIP review đã lắp/kiểm](research/PETCLINIC_REVIEW_PACKAGES_2026-11-05.md), [status](PETCLINIC_REVIEW_PACKAGE_STATUS_2026-11-05.json), [cách gửi R1 trước](petclinic-review-release/COORDINATION_2026-11-05.md). REVIEW-PACKET verified_scoped mức assembly; chưa gửi/nhận việc/notes/accepted. R2 giữ riêng tới sau checkpointR1 thật, không dùng synthetic fixture làm review. ACK Hiển không bắt buộc; không model/scoring/push.

Mới nhất05/11: [context P03 và actual review data previews đã chuẩn bị](research/P03_CONTEXT_REVIEW_PREPARATION_2026-11-05.md), [status](P03_CONTEXT_REVIEW_PREPARATION_STATUS_2026-11-05.json). ACK Hiển không bắt buộc. 14 tests/bảy contexts, R1/R2 data và allowlist/checker đã có; official assembly/release/reviewer/accepted vẫn chưa. [Readiness mới](petclinic-review-draft/readiness.2026-11-05.json) bổ sung snapshot cũ; không model/scoring/push.

Mới nhất05/11: [bản sửa breaker P03 đã kiểm](research/HIEN_P03_BREAKER_FIX_2026-11-05.md), [status](P03_BREAKER_FIX_STATUS_2026-11-05.json). 39 tests/hai DB mới đạt, P03-T01 đóng; P02 extraction compatibility không đổi. Mốc C native verified_scoped, record/dataflow limits giữ nguyên. Coordinator tiếp context P03 và actual allowlist review; không giao Phát làm lại nhãn hoặc bắt Hiển mở thêm schema. [ACK ngắn](hien-next/ACK_P03_BREAKER_FIX_2026-11-05.md) chưa gửi tự động; model/scoring/accepted/contract/push chưa mở.

Mới nhất 03/11: [return P03 đã kiểm độc lập](research/HIEN_P03_TECHNICAL_RETURN_2026-11-03.md), [status](P03_TECHNICAL_RETURN_STATUS_2026-11-03.json), [phản hồi Hiển](hien-next/SEND_AFTER_P03_TECHNICAL_RETURN_2026-11-03.md). 30 units/hai DB mới đạt scoped native flow; còn lỗi P03-T01 gán nhầm fallback Customers và giới hạn record/dataflow. Phản hồi mới chưa báo gửi; không giao Phát làm lại checkpoint hoặc tự accepted/model/scoring/push. Các đoạn ngày cũ giữ lịch sử.

Mới nhất: [đã chuyển Hiển](DELIVERY_REPORTED_2026-11-02.md), [context/viewer P02 reviewed đã kiểm](research/P02_REVIEWED_DERIVATIVES_2026-11-02.md), [status](P02_REVIEWED_DERIVATIVES_STATUS_2026-11-02.json). Hai checkpoint nhãn đủ cho kỹ thuật; chưa ACK/actual P03.

P02 kỹ thuật 02/11: [return Hiển đã tái kiểm](research/HIEN_P02_TECHNICAL_RETURN_2026-11-02.md), [status mới](P02_TECHNICAL_RETURN_STATUS_2026-11-02.json). 24 units/hai Neo4j DB đạt, full parity và 8/8 inventory; còn caveats report hash/self-report, chưa whole GraphRAG hoặc actual P03. Đây là return P02 trước, không là ACK gói P03 Huy dự định gửi.

02/11: [P03 draft.v2 đã tiếp nhận checkpoint](research/P03_ANNOTATION_INTAKE_2026-11-02.md), [status hiện hành](P03_ANNOTATION_STATUS_2026-11-02.json), [receipt kỹ thuật](hien-next/P03_TECHNICAL_RECEIPT_2026-11-02.json). P03 mốc C đã mở theo D20, technical ZIP mới chưa báo gửi/ACK; labels pending_review, chưa actual method run/model/scoring/push. Các trạng thái chờ P03 ngày 01/11 bên dưới là lịch sử.

Tiến độ kỹ thuật mới: [retrieval/context P02 từ baseline source và patch](../pipeline/p02/STATIC_CONTEXT.md), [status](P02_STATIC_CONTEXT_STATUS_2026-11-01.json). 12 tests/checker đạt, bảy previews/một ca; không model/scoring hoặc gửi output sang người lập nhãn. Phần này hoàn tất độc lập trong lúc chờ return mới của Hiển/Phát.

Chuẩn bị mới: [khung review gộp P01–P03](petclinic-review-draft/COORDINATOR.md), [bản Methods có evidence map](../docs/manuscript/README.md) và [status](REVIEW_METHODS_PREPARATION_STATUS_2026-11-01.json). Templates chưa kèm dataset hoặc quyết định; giữ tài liệu điều phối/Methods riêng khỏi người review source-first.

Trong lúc chờ returns: [bộ xem native evidence P02 offline](../demo/p02-native/README.md) đã có, dùng source/output kỹ thuật thật đã lưu; [status và giới hạn](P02_NATIVE_INSPECTOR_STATUS_2026-11-01.json). Không chuyển bộ xem sang annotator hoặc gọi đây là pipeline dự đoán E2E.

Mới nhất 01/11: [kiểm return Phát P02 v4 và Hiển mốc A](research/TEAM_RETURNS_REVIEW_2026-11-01.md), [status hiện hành](TEAM_RETURN_STATUS_2026-11-01.json). P02 đủ checkpoint kỹ thuật theo D20, đã chạy source-only/Neo4j/retrieval có giới hạn; Hiển còn Class.name parity và inventory helpers. Huy đã báo gửi gói Hiển tiếp và phản hồi Phát, chưa ACK lượt mới; [delivery record](DELIVERY_REPORTED_2026-11-01.md). Có [đề xuất thiết kế để Huy xem](research/PETCLINIC_NEXT_DECISIONS_2026-11-01.md), chưa áp dụng. Phát tiếp P03, chưa checkpoint P03. Các trạng thái chờ return dưới đây là lịch sử, không giao lại công việc đã xong hoặc tự accepted/model/scoring/push.

Trạng thái gửi mới nhất: Huy đã báo chuyển hai gói D20 cho Phát/Hiển; [ghi nhận](DELIVERY_REPORTED_2026-10-31.md) và status/board giữ ACK/ETA chưa có. Gói và các dòng “chưa gửi” bên dưới là sự kiện tại lúc đóng gói, không yêu cầu gửi lại. Trong lúc chờ có [prototype intake tổng hợp](../prototypes/checkpoint-intake/README.md), chưa dùng lên return thật hoặc tạo receipt kỹ thuật.

Checkpoint mới nhất D20: [hai gói công việc](research/PETCLINIC_HANDOFF_2026-10-31.md) cho Phát/Hiển đã chuẩn bị và kiểm sau giải nén, chưa gửi/ACK. Phát được lập nhãn nháp P03 và hoàn thiện checkpoint P02. Actual extraction–Neo4j–retrieval offline mở theo từng checkpoint version/hash đã kiểm; xem [status D20](PETCLINIC_D20_STATUS_2026-10-31.json) và [intake](CHECKPOINT_INTAKE_2026-10-31.md). Các giới hạn chưa annotation/quyền integration trong đoạn D19 bên dưới là lịch sử; model/scoring/accepted/test-lock/áp hợp đồng nháp/push vẫn chưa mở.

Ngày cập nhật: 31/10/2026

Điểm bắt đầu điều phối hiện tại: [bảng công việc PetClinic](PETCLINIC_WORKBOARD.md), [sổ owner/dependency/DoD](PETCLINIC_WORKBOARD.json). P03 [D19](../benchmark/p03/decisions/INPUT_LOCK_2026-10-31.json) đã có paired measurement v2 hoàn tất: bốn nhóm/48 slots, source/config/raw/controls/repetition/reset/cleanup đạt; xem [báo cáo](research/P03_PAIRED_RUNTIME_2026-10-31.md) và [status mới](P03_PAIRED_STATUS_2026-10-31.json). Giữ lỗi readiness lượt đầu; không chạy lại khi không có lý do mới. Chưa có quyền annotation P03. P02 bốn helper đã được Phát xác nhận, chưa labels/checkpoint mới hoặc làm rõ thêm reading scope tám ID cũ. Hiển synthetic/native context đã kiểm, chưa actual evaluated P02/P03 output. Các đoạn cũ giữ lịch sử; cuối phiên kiểm board và cập nhật việc còn mở.

`PROJECT_CONTEXT.md` là tài liệu có thẩm quyền cao nhất trong repository. Task packet chỉ cụ thể hóa một công việc đã được Huy giao; không được dùng task packet để âm thầm đổi định nghĩa impact, hop, schema dùng chung hoặc quy tắc ground truth.

## Trình tự bắt buộc

1. Thành viên và AI đọc toàn bộ `PROJECT_CONTEXT.md`.
2. Chỉ đọc task packet được giao và các đầu vào packet cho phép.
3. Trước khi sửa hoặc chạy, gửi lại một bản xác nhận ngắn gồm:
   - mục tiêu kết quả;
   - commit/snapshot đầu vào;
   - đầu ra bắt buộc;
   - nội dung ngoài phạm vi;
   - blocker hoặc dữ liệu còn thiếu.
4. Thực hiện trên branch riêng. Không push thẳng vào `main`, không force push và không merge nếu Huy chưa yêu cầu.
5. Khi bàn giao, dùng đúng mẫu cuối task packet và đính kèm lệnh chạy, exit code, log, artifact, commit SHA cùng giới hạn.

## Quy tắc chống báo hoàn thành giả

- Đọc mã hoặc suy luận không được báo là đã kiểm chứng runtime.
- Test kỹ thuật pass không biến output parser/Neo4j/LLM thành ground truth.
- Không tự viết JSON/Cypher mong đợi rồi dùng chính nó làm bằng chứng pipeline sinh đúng.
- Không bỏ log lỗi hoặc chỉ gửi phần log đẹp. Giữ raw log và tạo summary có dẫn nguồn.
- Không sửa nhãn sau khi xem điểm số hệ thống nếu không tạo version mới, ghi lý do và review độc lập.
- Trường hợp thiếu bằng chứng phải mang trạng thái `unresolved`, `blocked` hoặc `pending_review`, không tự suy đoán.

## Trạng thái hiện tại

| Luồng | Chủ trì | Trạng thái | Điều kiện sang bước kế tiếp |
|---|---|---|---|
| Protocol/evidence/nhãn nháp P01 | Phát | Đã bàn giao snapshot `5f9204d`; nhãn pending_review | Review thật khác người lập nhãn |
| Verifier và E2E Neo4j P01 | Hiển | Đã kiểm độc lập implementation `e956137`, 59/59 test | Duy trì bằng chứng; không đồng nghĩa duyệt nhãn |
| Ground truth P01 | Reviewer khác người lập nhãn | Chưa có quyết định được xác minh | Source-first, đối chiếu, ghi quyết định người thật |
| Chuẩn bị/phát triển P02–P04 | Huy điều phối; Hiển/Phát theo vai trò | P02 draft.v3 8 negative/4 unresolved, return helper AI đã kiểm, phần người thật chưa xác nhận. P03 Huy đã chọn D18, build/baseline hai stack/24 slot đã kiểm; chưa khóa input hoặc mutated. P04 hoãn sau review PetClinic | Phát trực tiếp kiểm/quyết định nhãn P02; kiểm scope/census/alias/fixture độc lập P03 rồi Huy chốt input/quyền mutated |
| Accepted / final test / chấm chính thức | Reviewer + Huy, các quyết định riêng | Chưa mở | Không dùng test kỹ thuật, AI hoặc pending_review thay phê duyệt |

Xem [hồ sơ P01](P01_CLOSEOUT.md), [kế hoạch P02–P04](P02_P04_EXECUTION_PLAN.md) và [packet mới](P02_P04_TASK_PACKETS.md). Các packet P01 giữ lịch sử yêu cầu; mục 8.4 PROJECT_CONTEXT và kế hoạch mới thay gate điều phối cũ “chờ duyệt P01 mới mở ca”. Không sửa gói review/nhãn/raw evidence đã đóng băng.

Checkpoint P02 hiện hành: [F03 24/10](research/P02_F03_RUNTIME_2026-10-24.md), [status overlay](P02_RUNTIME_STATUS_2026-10-24.json) và [hướng dẫn runtime](../pipeline/p02/F03_RUNTIME.md). Register v3 và packet cũ giữ trạng thái tại lúc tạo; chưa push các artifact local mới. Nhãn, reviewer, test và scoring vẫn là các gate riêng.

Lộ trình mới nhất: [hoàn thiện PetClinic trước review gộp](PETCLINIC_PRE_REVIEW_PLAN_2026-10-24.md). P01–P03 được chuẩn bị đến mức code/evidence/draft độc lập sẵn review; reviewer nghiệm thu theo hai bước, sửa theo feedback rồi mới mở P04. Phát được rà F03 và lập draft P02 có điều kiện theo task packet mới; không tự accepted/test/scoring hoặc coi đã nhận/trả task.

Chuẩn bị P03 ngày 25/10: [báo cáo/hash/lệnh kiểm](research/P03_PREPARATION_2026-10-25.md), [status](P03_PREPARATION_STATUS_2026-10-25.json), [candidate](../benchmark/p03/README.md). Chỉ source prep và checker offline; chưa runtime hoặc nhãn, không giao Phát ngừng P02.

Tiếp nhận Phát trả P02 ngày 25/10: [audit](research/P02_PHAT_RETURN_AUDIT_2026-10-25.md), [status mới](P02_PHAT_RETURN_STATUS_2026-10-25.json). Không sửa gói/nhãn frozen hoặc coi kiểm checksum là nghiệm thu độc lập.

Bộ đo helper bổ sung đã chuẩn bị offline: [báo cáo](research/P02_HELPER_PREPARATION_2026-10-25.md), [status](P02_HELPER_SUPPLEMENT_STATUS_2026-10-25.json), [hướng dẫn](../pipeline/p02/HELPER_SUPPLEMENT.md). Đã pass tests và javac compile; đang chờ Docker, chưa có runtime mới. [Mẫu phụ lục Phát](p02-handoff/HUMAN_CHECK_SUPPLEMENT_TEMPLATE.md) và [tin nhắn để chuyển](p02-handoff/SEND_PHAT_SUPPLEMENT_2026-10-25.md) giữ riêng với raw/nhãn frozen.

Checkpoint runtime 25/10: [helper runtime/packet đã kiểm](research/P02_HELPER_RUNTIME_2026-10-25.md), [status runtime](P02_HELPER_RUNTIME_STATUS_2026-10-25.json), [tin gửi cùng ZIP](p02-handoff/SEND_PHAT_HELPER_PACKET_2026-10-25.md). Bốn group đã chạy, giữ lỗi decoder v1 và projection khai rõ ở v2; blocker Docker cũ đã hết. Đây là trạng thái tại lúc đóng packet, trước khi gửi/nhận return.

Checkpoint mới nhất 26/10: Huy đã gửi helper packet và đã nhận return. [Audit return helper](research/P02_HELPER_RETURN_AUDIT_2026-10-26.md), [status hiện hành](P02_HELPER_RETURN_STATUS_2026-10-26.json) và [tin nhắn cần Phát tự kiểm/quyết định](p02-handoff/SEND_PHAT_HUMAN_DECISION_2026-10-26.md). Bốn đề nghị negative là của AI, chưa phải quyết định của Phát; draft.v3 vẫn 8 negative/4 unresolved. Cần phụ lục người thật đúng exposure, chưa mở output/accepted/test/scoring hoặc tự chốt P03.

Checkpoint P03 mới nhất 28/10: Huy đã chọn C03-A, cho runner/build/baseline theo [D18](../benchmark/p03/decisions/SELECTION_BASELINE_2026-10-28.json). Năm service build offline và hai baseline stack đã kiểm 24 slot; source/config/reset/raw/cleanup đạt, không mutation hoặc nhãn mới. [Báo cáo](research/P03_BASELINE_2026-10-28.md), [status](P03_BASELINE_STATUS_2026-10-28.json), [runner/lệnh](../pipeline/p03/BASELINE.md). Cần kiểm phạm vi độc lập trước input lock/quyền mutated. Các đoạn chuẩn bị 25/10 và snapshot cũ giữ lịch sử, không thay checkpoint hiện hành.

Gói scope-check P03 đã đóng/kiểm cùng ngày: [báo cáo ZIP và phạm vi](research/P03_SCOPE_PACKET_2026-10-28.md), [status](P03_SCOPE_PACKET_STATUS_2026-10-28.json), [tin chuyển Phát](p03-handoff/SEND_PHAT_SCOPE_2026-10-28.md). Có source/patch/proposal/raw baseline và template người thật; không labels/output phương pháp. Chưa gửi thay Huy hoặc xác nhận Phát đã nhận việc; chưa có độc lập xác nhận/input lock/mutated. P02 phụ lục con người vẫn là việc riêng.

Cập nhật sau đó: Huy báo đã gửi scope packet P03; chưa có phiếu kiểm trả. [Phân luồng kỹ thuật và Hiển](research/PETCLINIC_PARALLEL_WORK_2026-10-28.md), [task parser regression/importer unit-mock](hien-next/TASK_HIEN.md), [tin để Huy chuyển](hien-next/SEND_HIEN_2026-10-28.md). Đã chạy 10 synthetic cases trên pin, 7 đạt/3 fail có raw để sửa; đây là chẩn đoán kỹ thuật, không CIA score hoặc real P02/P03 output. Gói Hiển đã kiểm nhưng chưa tự gửi/nhận việc; không làm lại baseline cũ hoặc để mọi chuẩn bị kỹ thuật chờ benchmark.
