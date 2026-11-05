# Telemetry thực nghiệm — prototype offline, bàn giao 16/10/2026

## Phạm vi

Tiếp bước output-validator theo đề xuất đã trao đổi: chuẩn bị module ghi thời gian/token/lỗi bằng dữ liệu tổng hợp, chưa tích hợp hoặc đo phương pháp thật. Đã đọc toàn bộ PROJECT_CONTEXT v0.6, experiment design, manifest, measurement template và checklist. Không đọc labels hoặc model output để thiết kế module.

## Đầu ra

- [Hướng dẫn prototype](../../prototypes/experiment-telemetry/README.md).
- `telemetry.mjs`: recorder trong bộ nhớ, clock do caller truyền, plan/attempt/offline-job/span/usage/context ledger.
- `fixtures.mjs`: toy plan và clock điều khiển, ba demo retry/overlap/missing.
- `cli.mjs`: chỉ demo và stdout; không file input/output, credential/env, network/subprocess hay provider.
- Hai file test riêng và [mục lục prototype](../../prototypes/README.md).
- ID `experiment-telemetry/synthetic-prototype.1`; nguồn thiết kế `microservice-cia-experiment/0.1.0-draft.1`. Code mới chưa commit/push, không gán HEAD nền thành phiên bản đã có code mới.

## Những gì đã kiểm kỹ thuật

1. Duration lấy hiệu monotonic samples; UTC chỉ để liên kết artifact. UTC lùi không làm duration âm; monotonic lùi/NaN/Infinity hoặc UTC malformed bị từ chối. Giữ fractional milliseconds.
2. Offline/index và online riêng; span có owner/scope, có thể overlap hoặc lặp. Không gọi stage sum là wall time, không cộng work sum thành campaign wall time hoặc tự amortize.
3. Mọi planned run và attempt vẫn hiện, gồm chưa chạy/in_flight/failed/completed. Retry chỉ đăng ký thủ công sau failed predecessor của cùng run, không tự gọi lại và không chọn best-of. Failed latency/usage/errors không bị thay bằng successful attempt.
4. Payload usage toy gốc + mapping version được giữ; normalize missing thành null. Input/output/thinking/cache/reported total là các category riêng, không cộng chồng thành total. Known-subset sums có observed/missing; tổng toàn campaign luôn null. Safe-integer overflow được báo rõ.
5. Input bytes không tự biến thành tokens; estimate có estimator ID riêng. Missing usage/cost/resources vẫn null, không suy Free Tier = measured zero.
6. Profile đóng chỉ cho toy IDs/fields/counts/error codes; không giữ raw response, header, credential path hoặc free-form provider error. Unknown mapping/field bị từ chối trước lưu, không nhận là redactor production.
7. Không nhận score/label input, không tính impact metric hoặc chọn phương pháp thắng. Evaluation bindings vẫn null, riêng khỏi model input. Attempts/repetitions không được đếm thành scenario/group độc lập.
8. Snapshot và object trả ra là bản sao; không sửa state qua chúng. Usage/context/transport ghi một lần, không overwrite dù lần đầu null/0. Open spans bị giữ in_flight hoặc interrupted khi owner failed, không bị giấu để giả completed.

Mọi clock, token count, input bytes và lỗi trong demo đều được đặt bởi fixture, đánh dấu synthetic. Đây **không phải latency/token/cost đã đo của P01/P02**.

## Kiểm thử và bằng chứng

- Node v24.19.0.
- 54/54 test telemetry mới pass, 0 fail, 0 skip: timing/UTC/overlap, interrupted stage, retry/denominator, native usage/missing/overflow, bytes vs tokens, mutation/secret-field guards, state transitions và CLI.
- 249/249 test trong tập hồi quy offline chọn lọc pass, 0 fail, 0 skip: 54 mới + 105 validator + 90 draft/P02/P01-abstention/handoff tests. Không phải full project suite, Java tests, actual Docker/Neo4j/parser extraction hay benchmark.
- Lượt đầu có 49/51 pass: hai test retry gọi helper usage với default attempt cũ đã failed thay vì attempt mới; lifecycle guard từ chối đúng. Đã sửa hai fixture call để chỉ rõ attempt-2, giữ log lỗi, không nới guard hoặc đổi lỗi cũ thành pass. Sau đó thêm ba test cho group consistency, fractional timing và cost injection. Log pre-fix không đại diện code/test identity cuối.
- Ba demo CLI retry/overlap/missing thực sự chạy bằng Node permission mode chỉ cấp đọc thư mục module và docs/experiments, không cấp fs-write/child-process. Không coi đây là sandbox network toàn diện hoặc thử transport thật.
- 101 file được bảo vệ đối chiếu trước/sau không đổi; danh sách gồm PROJECT_CONTEXT, draft/template/checklist, các file pipeline/reasoning/benchmark/demo/scripts/handoff và toàn bộ output-validator cũ. Không thêm file trong tập bảo vệ.
- Không tìm thấy import/tên telemetry mới trong các thư mục runtime/handoff hoặc validator cũ. Không sửa README/design/template đã có; chỉ tạo thư mục prototype, mục lục mới và báo cáo/bằng chứng mới.
- `git diff --check` exit 0, không trailing whitespace ở prototype mới. Các cảnh báo LF/CRLF của working tree cũ giữ nguyên.

Bằng chứng tại `handoff-out/experiment-telemetry/20261016-verification-3f05513d`:

- [Verification tổng hợp](../../handoff-out/experiment-telemetry/20261016-verification-3f05513d/verification.json).
- [54 test cuối](../../handoff-out/experiment-telemetry/20261016-verification-3f05513d/prototype-final.log).
- [249 test hồi quy](../../handoff-out/experiment-telemetry/20261016-verification-3f05513d/regression-final.log).
- [Log hai lỗi fixture trước sửa](../../handoff-out/experiment-telemetry/20261016-verification-3f05513d/pre-fix-tests.log).
- `demo-retry.json`, `demo-overlap.json`, `demo-missing.json`: report tổng hợp, không phải provider result.
- `protected-before-after.json`: danh sách/hash và kết quả so sánh.
- `SHA256SUMS.txt`: byte identities của code/docs/nguồn thiết kế và evidence; checksum không xác nhận tác giả/ground truth.

## Giới hạn / chưa thực hiện

Chưa nối clock/provider adapter thật, provider-specific usage mapping có tài liệu chính thức, production secret handling/error taxonomy, artifact persistence, CPU/RAM sampler, pricing/cost estimator, budget enforcement hoặc campaign scheduler/sealing. Snapshot operational counts không thay failure policy hoặc primary quality denominator được phê duyệt. Chưa kiểm config hash/alias ablation hay lineage nguồn thực.

Không có Docker/HTTP/model/POST/mutation/extraction/graph thật, không áp dụng parser/Neo4j/prompt/pipeline/viewer/benchmark/scorer, không tạo hoặc duyệt nhãn, khóa test hoặc chấm điểm. Không đổi model/budget/calls, không ghi thành viên đã góp ý E09. E06–E10 và D01–D08 vẫn mở.

Không sửa PROJECT_CONTEXT, draft/template, output-validator hoặc hai gói đã giao. Không stage, commit, push hoặc merge.

## Bước tiếp theo

Khi có ZIP Hiển, kiểm raw evidence và checksum theo đúng bàn giao; nhận phản hồi độc lập inventory/alias/fixture/universe của Phát, giải quyết bất đồng/version trước phần P02 phụ thuộc. Telemetry prototype này có thể hỗ trợ thảo luận E09 về sau, nhưng muốn đo thật cần adapter/version/test/budget phù hợp; không dùng test pass để bỏ các gate đó.
