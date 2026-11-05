# Integration tổng hợp và bảng điều phối — 28/10/2026

Theo yêu cầu tiếp tục phần Huy/AI sau khi Huy báo đã gửi gói Hiển, đã làm selector/harness offline riêng và tạo sổ công việc có owner/dependency/DoD/evidence. Không sửa parser/importer thuộc task Hiển hoặc thay phần người thật của Phát.

## Kết quả kỹ thuật

[Prototype và hướng dẫn chạy](../../prototypes/context-selection/README.md) có BM25 lexical, reverse Method graph 1–3 hop, UTF-8 context packing bắt buộc giữ seed source, selected/dropped ledger và input/options/source/context hashes. Graph witness là dữ kiện cấu trúc, không tự chuyển thành behavioral/repair label. Route lexical không đọc graph hoặc dùng graph để kiểm path của output.

Harness nối selector với validator Method/API/Service và telemetry đã có. Phản hồi cố định chỉ thử unknown/omitted/invalid/failure; không có model suy luận. Citation chỉ được trỏ nguồn đã chọn, không lấy nguồn ngoài context dù có trong corpus. Context mandatory overflow dừng trước attempt. Telemetry dùng clock fixture, không báo timing thật của code hoặc token/cost đo được.

Phạm vi mới có **19/19 kiểm thử** selector/integration đạt và 5/5 kiểm bảng công việc. Lượt hồi quy chọn lọc cuối đạt **183/183**, không fail/skip/cancel: 24 kiểm mới và 159 kiểm validator/telemetry hiện có. Đây không phải full project suite hoặc chạy PetClinic/Neo4j/model. Không ghi điểm Precision/Recall/F1/Ragas.

[Status cuối phiên](../OFFLINE_INTEGRATION_STATUS_2026-10-28.json); thư mục raw `handoff-out/offline-integration/20261028T142522Z-831a4640/`. [SUMMARY](../../handoff-out/offline-integration/20261028T142522Z-831a4640/SUMMARY.json) giữ argv/cwd/UTC/exit và quan sát; mỗi command có stdout/stderr/command JSON riêng. [Code identity](../../handoff-out/offline-integration/20261028T142522Z-831a4640/CODE_IDENTITY.json) ghi byte/hash module, test và board tại lượt kiểm; chưa có implementation commit mới. Manifest SHA-256 `466af3fa3eb33d86a8381a9d9a1e36fdbfd772723409fa219769cb311ff60c44`. Artifact là local Git ignored, không có sẵn từ clone GitHub.

Sáu demo thực sự chạy với Node permission mode chỉ cho đọc thư mục prototypes/docs: lexical/unknown và combined/unknown hợp lệ; graph/failure giữ failed/not_checked/payload null; invented-quote và outside-context bị invalid; omitted giữ not_returned. Exit 0 demo là xuất được hồ sơ, không biến hai fixture invalid thành valid. Overflow được kiểm trong test trước attempt. Đây đều là source/response/clock tổng hợp; không phải kết quả thực nghiệm PetClinic hoặc lời gọi model.

Checker sổ đạt 23 task, 30 file bằng chứng và hai ZIP đúng hash, không lỗi. Đối chiếu trước/sau 199 file candidate frozen, Phát returns, ZIP bàn giao, manifest contract/design và D18 không thay byte; phạm vi chọn lọc này không được gọi là audit toàn workspace. Các tests chỉ đọc/fixture, không chạy script trong gói return.

Giới hạn: BM25 không phải vector search; combined graph-first + lexical union không phải phương pháp Graph+semantic đầy đủ hoặc ablation cân bằng thông tin. Byte ceiling chỉ của context, chưa phải token/full-request budget. Source/graph/API/service registry đều toy. D01–D08 và E01–E10 vẫn mở; prototype chưa được áp vào pipeline/scorer thật.

## Điều phối

[Bảng công việc hiện hành](../PETCLINIC_WORKBOARD.md) và [JSON](../PETCLINIC_WORKBOARD.json) giữ các luồng P01/model/review, Hiển regression/importer, Phát P02/P03, input/mutated P03, method integration, contract/design, viewer, packet/reviewer/revisions, code release và campaign/P04. Mỗi việc có đầu vào, đầu ra, DoD, owner, dependency, bằng chứng và next action.

Ghi nhận mới: Huy báo đã gửi gói Hiển trong cuộc trò chuyện ngày 28/10; thời gian chính xác/ACK/ETA của Hiển chưa có, không tự điền. Packet gốc và DELIVERY_REPORT không đổi; snapshot lúc đóng gói không bị sửa hồi tố. P03 packet cũng mới chỉ có lời Huy báo gửi, chưa có phiếu kiểm scope trả. Không tự gửi tin nhắn cho thành viên.

Checker phát hiện owner/track đã biết bị rơi, dependency lỗi/vòng lặp, thiếu đường dẫn bằng chứng, sai SHA gói được gửi hoặc ACK không có hồ sơ. Nó không chứng minh tuyệt đối đủ mọi công việc nghiên cứu hoặc xác minh người thật đã đọc; không cấp quyền hành động. Bảng được rà đầu/cuối mỗi phiên, không có background monitoring.

## Các điều kiện vẫn còn

- P02: raw/helper đã có; còn phụ lục quyết định/reading/exposure thật của Phát. Draft.v3 giữ 8 negative/4 unresolved, pending_review. Chưa actual method output.
- P03: baseline đủ phạm vi D18; còn scope check độc lập → Huy input lock/quyền mutated → paired evidence → human draft → method integration. Không chạy mutation hoặc nhãn P03 từ baseline hiện tại.
- Hiển: nhận phản hồi branch/HEAD/phạm vi, rồi kiểm return/diff/regression/parity; sau đó nối task integration tiếp theo theo checkpoint, không quên giao vòng sau.
- P01: cặp model thiếu Graph+Vector hợp lệ, 503 giữ nguyên; chưa được cấp retry mới. Contract, experiment design, reviewer acceptance, final split/scoring và code release vẫn là các việc riêng.

Code mới còn local; HEAD nền không đại diện byte mới. Không stage/commit/push/model/scoring hoặc sửa source/nhãn/raw frozen trong lượt này.
