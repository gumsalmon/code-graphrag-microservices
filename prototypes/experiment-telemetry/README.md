# Telemetry thực nghiệm — prototype tổng hợp, chưa tích hợp

Ngày 16/10/2026. ID `experiment-telemetry/synthetic-prototype.1`, tham chiếu thiết kế nháp `microservice-cia-experiment/0.1.0-draft.1` §9/E09 và measurement template. Đây là công cụ thử riêng sau output-validator prototype, **không phải collector đã áp dụng, phép đo P01/P02 hay quyết định adoption**. Không đổi template/design, parser, Neo4j, prompt, pipeline, viewer, benchmark hoặc scorer.

## Chạy và phân biệt số liệu

Cần Node.js 24, không thêm dependency:

```powershell
node prototypes/experiment-telemetry/cli.mjs demo retry
node prototypes/experiment-telemetry/cli.mjs demo overlap
node prototypes/experiment-telemetry/cli.mjs demo missing
node --test prototypes/experiment-telemetry/telemetry.test.mjs prototypes/experiment-telemetry/cli.test.mjs
```

CLI chỉ có demo/stdout, không đọc file người dùng, env/key, ghi file, tạo subprocess, gọi Docker/HTTP/model, chọn model, lấy bảng giá hoặc tự retry. Exit 0 nghĩa là demo được tạo, **không có nghĩa mọi attempt trong demo thành công**; cú pháp/flag không hỗ trợ exit 2. Không có run/execute/force/approved mode.

Mọi clock, token count, request-size và lỗi trong demo đều do fixture đặt ra. Trường `document_kind`, `synthetic_only` và `measurement_origin` ghi rõ không phải hiệu năng hay chi phí dự án. Timestamps năm 2000 là toy timestamps, không phải thời gian thực thi thí nghiệm. `actual_remote_calls` luôn 0; `simulated_remote_calls` là sự kiện giả riêng.

## Đầu vào và API

Core `telemetry.mjs` là recorder trong bộ nhớ, không I/O. `createSyntheticTelemetry(plan, {clock})` yêu cầu clock được truyền rõ, không tự dùng Date.now làm elapsed time. Fixture cung cấp `syntheticPlan()` và `syntheticClock()`:

```javascript
import { createSyntheticTelemetry } from './prototypes/experiment-telemetry/telemetry.mjs';
import { syntheticPlan, syntheticClock } from './prototypes/experiment-telemetry/fixtures.mjs';
const clock = syntheticClock();
const recorder = createSyntheticTelemetry(syntheticPlan(), { clock });
recorder.beginAttempt({ attempt_id: 'toy-attempt', run_id: 'toy-run-1', retry_of: null });
clock.advance(10); // Giá trị đặt cho test, KHÔNG phải latency đã đo của một phương pháp.
recorder.finishAttempt({ attempt_id: 'toy-attempt', status: 'completed', validation_status: 'not_checked', error: null });
const report = recorder.snapshot();
```

Plan có đúng `synthetic_only=true`, `plan_id` và `runs`. Mỗi row có `run_id`, `scenario_id`, `duplicate_group_id`, `repository_id`, `method_config_id`, `repetition`, `cache_regime`. ID phải bắt đầu `toy-`; plan tối đa 1.000 rows. Không nhận nhãn, score, raw prompt/source/response, credential path hoặc metadata tùy ý. Tag/ID chỉ tránh dùng nhầm, không chứng minh một người cung cấp dữ liệu thật sự synthetic.

Không trùng run ID hoặc tuple repository/scenario/method-config/repetition; group của cùng scenario/repo phải nhất quán qua methods/repetitions. Method config ID do người tạo toy plan khai báo; prototype **chưa kiểm full config hashes hoặc alias ablation**. Cold/warm/cache-ready/unknown ghi riêng; nếu cache regime là contrast khác, dùng config ID riêng đã khai báo, không đổi âm thầm cùng ID.

Các operation:

- `beginAttempt`/`finishAttempt`: thời điểm UTC để liên kết artifact, duration từ hiệu hai monotonic samples; state completed/failed/in_flight tách validation valid/partial/invalid/not_checked.
- `beginOffline`/`finishOffline`: job chuẩn bị/index riêng, gắn repo/config/cache regime; không tự cộng vào online hoặc amortize theo Q chưa biết.
- `beginStage`/`finishStage`: span có ID/scope/owner, stage nằm trong measurement template. Giữ từng span và tổng **stage durations**, không gọi tổng đó là owner wall time. Có thể chồng lấp hoặc lặp cùng stage.
- `recordTransport`: khai báo 0/1 simulated remote call và receipt known true/false/null. Timeout chưa biết provider nhận hay chưa giữ null, không tự kết luận đã nhận hoặc không bị tính phí.
- `recordUsage`: mapping duy nhất `toy-usage/1`, payload đóng chỉ gồm input_tokens/output_tokens/thinking_tokens/cached_input_tokens/reported_total_tokens, mỗi trường là safe integer không âm hoặc null. Giữ payload toy gốc và version; missing field được normalize thành null, không thành 0. **Không phải mapping Gemini/OpenAI thực**.
- `recordContext`: input_bytes, estimated_input_tokens và estimator_id riêng. Estimate khác native usage; bytes không tự đổi thành tokens. Nếu có estimate phải có toy estimator ID.
- `snapshot`: bản sao, không tự đọc clock hoặc đóng attempt; không cho phép sửa nội bộ qua object trả ra.

Các error chỉ nhận stage đã biết và code synthetic trong allowlist; không giữ free-form message, raw transport payload, header, credential path hoặc provider echo. Field lạ bị từ chối **trước khi lưu**, không xóa bí mật bằng regex rồi giả bảo đảm an toàn. Đây là profile đóng cho toy, không phải redactor production hoặc lớp bảo vệ cho input JavaScript có getters/mã tùy ý; caller chỉ truyền dữ liệu đã kiểm và clock do mình kiểm soát.

## Invariants và báo cáo

1. Monotonic sample phải hữu hạn, không âm, không lùi giữa các lần recorder đọc; UTC có thể lùi nhưng không làm duration âm. Độ chính xác fractional milliseconds được giữ. Clock/token fixture không chứng minh đã đo model thật.
2. Chỉ retry bằng đăng ký thủ công sau predecessor failed ngay trước đó trong cùng run; không retry attempt đang chạy/completed, không fork chain, không chọn best-of. Mọi failed attempt/error/usage/latency vẫn còn. Recorder **không thực thi retry** hay duyệt call budget.
3. Operation ghi usage/context/transport là một lần, không overwrite, kể cả value đầu là null/0; không sửa attempt đã kết thúc. Owner failed đóng span đang mở thành interrupted với partial duration. Owner completed mà còn span mở bị từ chối.
4. Stage sum có thể lớn hơn total wall time do overlap hoặc nhỏ hơn do khoảng trống. Offline/online/attempt sums là work đã ghi nhận, không phải campaign wall time, CPU time hay amortized cost.
5. Usage được tổng hợp **riêng từng category qua các attempt**, không cộng input+output+thinking+cache thành total. `reported_total_tokens` chỉ từ field tương ứng. `known_sum` là tổng trên subset có giá trị; `observed`/`missing` kèm theo. `sum_for_all_recorded` chỉ có nếu toàn bộ attempt đã ghi đều có field đó; không nhận là toàn campaign. Sum vượt safe integer được báo overflow và để null.
6. Run chưa bắt đầu và attempt in_flight vẫn trong ledger/counts. Planned runs, attempt counts, scenario/group/repo và repetition khác đơn vị; không lấy attempt/repetition làm số scenario độc lập. `planned_runs_with_valid_attempt` là tình trạng cấu trúc toy, không phải tỷ lệ đúng, nhãn accepted hoặc success-only quality score.
7. Native usage thiếu không phải 0; cost/billed/estimated/rate/pricing/Q/resources chưa đo đều null. Không suy Free Tier = measured zero, không ước giá hoặc chọn model. `campaign_usage_total` và impact metrics vẫn null.
8. Evaluation bindings giữ riêng và toàn null. Không đưa nhãn/reviewer artifacts vào input model, không tính FP/FN/F1/Ragas, CI/p-value hoặc xếp hạng phương pháp.

## Chưa làm và điều kiện áp dụng

Chưa triển khai adapter clock/provider/network thật, usage mapping đã đối chiếu tài liệu nhà cung cấp, redaction/error taxonomy production, artifact persistence/checksums của request thực, resource sampling, pricing/cost estimator, explicit campaign scheduling/sealing hay scorer integration. Không có budget enforcement cho API vì prototype không gọi API. Không được coi state machine/permission-mode demo là kiểm chứng transport hoặc timer hệ điều hành thật.

Template/design gốc giữ nguyên; E06–E10 và D01–D08 chưa đóng. Trước dùng thật cần thống nhất telemetry/schema/identity/error policies, kiểm mapping/secret handling/clock, adapter và budget được phép, rồi tích hợp có version/test riêng. Module này không mở gate P02 mutation/output, accepted labels, final test hay scoring.
