# Validator đầu ra — prototype offline theo hợp đồng nháp

Ngày 16/10/2026. Validator `impact-output-validator/synthetic-prototype.1` diễn giải thử hợp đồng `microservice-impact-output/0.1.0-draft.1`. **Chỉ dữ liệu tổng hợp, chưa áp dụng vào parser, Neo4j, pipeline, prompt, viewer, benchmark hoặc scorer.** D01–D08 vẫn open; không có phê duyệt thành viên được ghi thay.

## Chạy thử và hiểu kết quả

Cần Node.js 24; không thêm dependency. Chạy từ gốc repository:

```powershell
node prototypes/impact-output-validator/cli.mjs demo mixed
node prototypes/impact-output-validator/cli.mjs demo invalid
node prototypes/impact-output-validator/cli.mjs demo failure
node prototypes/impact-output-validator/cli.mjs demo source-inferred
node --test prototypes/impact-output-validator/validator.test.mjs prototypes/impact-output-validator/cli.test.mjs
```

`mixed`: completed/valid về cấu trúc toy; một Method không trả về, Service abstain. `invalid`: cố tình đổi quote, kết quả partial và bản ghi lỗi còn trong ledger. `failure`: lỗi 503 **tổng hợp**, execution=failed/validation=not_checked, payload null, coverage không được ghi thành 0 hoặc negative. Không có HTTP nào được gửi. `source-inferred`: kiểm cấu trúc path nhưng không nhận là đã đối chiếu graph.

Exit 0 chỉ khi toy completed/valid; exit 1 khi toy partial/invalid/failed/not_run; exit 2 khi lỗi input/CLI. Ví dụ `invalid` và `failure` cố ý exit 1, không phải công cụ gặp sự cố. CLI in JSON ra stdout, không ghi/overwrite file, không tự retry hoặc execute.

## Đầu vào prototype

`fixtures.mjs` đọc **ví dụ tổng hợp có sẵn** trong `docs/contracts/examples/impact-output.synthetic.json`, chuyển thành hai object `request` và `attempt`; không sửa ví dụ hoặc tin trường `validation` tự khai trong ví dụ. Tất cả ID, source text, graph edge, behavior và lỗi là toy, không phải nhãn hay kết quả model.

API thuần:

```javascript
import { syntheticFixture } from './prototypes/impact-output-validator/fixtures.mjs';
import { validateSyntheticAttempt } from './prototypes/impact-output-validator/validator.mjs';
const { request, attempt } = syntheticFixture('mixed');
const report = validateSyntheticAttempt(request, attempt);
```

CLI cũng nhận hai file JSON tổng hợp đã chuẩn bị theo chính cấu trúc này:

```powershell
node prototypes/impact-output-validator/cli.mjs check --request PATH_TO_TOY_REQUEST.json --attempt PATH_TO_TOY_ATTEMPT.json
```

- Request: `synthetic_only`, `contract_id`, `repository_id`, `snapshot_id`, `seed_method_id`, `requested_levels`, `supported_levels`, `registry`, `aliases`, `evidence`, `repair_strategy_ids`, `path_validation`.
- Registry: `(level, entity_id)`, `service`, `seed`, `in_universe`; API có thêm `handler_id`. Registry có thể chứa Method hỗ trợ path nhưng `in_universe=false`; có mặt trong source/registry không tự thành phạm vi đánh giá.
- Alias: `level`, `raw_id`, `canonical_id`, `evidence_id`; chỉ exact mapping đã khai báo, một bước, không đè canonical ID. Đây là binding toy, không xác nhận người thật đã review alias.
- Evidence: `id`, `snapshot_id`, `text`; profile này chỉ hỗ trợ evidence ở cùng toy snapshot. Không đọc file/dòng thật, không kiểm SHA/source tree hay mutated evidence provenance.
- Path validation: `kind=supplied_graph` với `logical_edges` gồm `{caller, callee, type}`; hoặc `source_inferred` và mảng cạnh rỗng. Graph toy không phải graph chuẩn do reviewer thẩm định.
- Attempt có đúng `synthetic_only`, `execution`, `payload`. Execution có `status`, `actual_remote_calls=0`, `usage=null`, `failure`; payload theo hợp đồng nháp, hoặc null nếu failed/not_run. Failure có `stage`, `code`, `http_status`, `message`; report giữ pointer/stage/code/status, không sao chép message tùy ý.

Chỉ nhận repository/snapshot bắt đầu `toy-` và `synthetic_only=true`. Đây là rào tránh dùng nhầm, **không phải cách chứng minh dữ liệu thực sự synthetic**. Không đưa key, credential, nhãn thật hoặc output P01/P02 vào công cụ. Report giữ raw entity IDs và JSON-pointer field names để audit, không phải bộ redaction bí mật. File JSON tối đa 1 MiB, nesting tối đa 64; array tối đa 1.000 item. `parseSyntheticJson` phát hiện duplicate decoded JSON keys trước validation; không chọn giá trị cuối.

## Kiểm gì, không kiểm gì

- ID/level/canonical snapshot/overload, alias đã khai báo, seed Method/API/owning Service và membership universe. API ID HTTP giữ mapping path/wildcard/variable, không query values hay URL request cụ thể; gRPC chưa hỗ trợ.
- Enum, trường thừa/thiếu, rationale, assumptions; repair strategy ràng buộc riêng, không suy sửa mã từ reachable hoặc likely.
- Citation đúng request, quote exact substring, ít nhất 8 ký tự không phải whitespace và tối đa 2.400 ký tự. Không normalize case/LF/CRLF/whitespace. Quote khớp không chứng minh nó hỗ trợ kết luận.
- Pure unknown mới được thiếu citation; summary luôn cần citation. Unknown có citation vẫn bị kiểm. Kiểm cả 36 tổ hợp dependency/behavior/repair.
- Nếu request không có evidence đủ tạo một quote hợp lệ cho summary, báo lỗi chuẩn bị input và không kiểm prediction; không ép phương pháp bịa citation để vượt validator.
- Witness dùng Method IDs, đúng anchor từng level, hướng caller→callee→seed, 1–3 hop, boundary đếm riêng. Supplied-graph mode kiểm cạnh logic; source-inferred mode chỉ kiểm ID/anchor/count, ghi `source_inferred_not_graph_verified`. Không kiểm suy luận ngữ nghĩa, min-hop hoặc tác động của toàn Service.
- Record ledger giữ index/raw ID/canonical ID/alias binding/lỗi và pointer về input. Không sửa raw input, không sinh Boolean prediction, projected record, score hoặc label.
- Coverage phân biệt `unknown`, `not_returned`, `unsupported_level`, `invalid`, `invalid_run`, `execution_failed`, `not_run`; không tự biến omission/unknown thành negative. Coverage dùng registry toy, **không phải coverage gold benchmark**.

## Lựa chọn tạm để thử, không phải quyết định chung

1. Extra/missing fields bị báo lỗi trong profile đóng này. `supported_levels` là subset của `requested_levels`.
2. Required/optional repair cần strategy đã đăng ký; unknown/not_established repair dùng null. Cách biểu diễn strategy còn phải thống nhất trước production.
3. Record trùng canonical ID, kể cả qua alias, bị cách ly **tất cả bản**, giữ phân biệt identical/conflicting. Không chọn bản có lợi. Đây là lựa chọn chẩn đoán bảo thủ, không phải policy FP hoặc dedup scorer đã duyệt.
4. Một số record hợp lệ + một số lỗi → partial; lỗi summary/envelope hoặc tất cả record lỗi → invalid. Không có adapter/export, nên partial không được coi là đã đủ điều kiện chấm điểm.
5. Trong completed/partial, record lỗi có ID đã resolve là invalid, không cộng lại vào not_returned. Với failed/not_run/invalid run, count kết quả chưa dùng được để null, không ghi 0; raw records và issues vẫn còn.
6. Không tự thay snapshot, fuzzy match, projection Method→API→Service, kiểm nhãn, tính FP/FN/F1/Ragas hoặc đóng gate. Chỉ registry binding/quote/path toy, không kiểm lineage thật.

Mọi report luôn để `production_ready`, `applied_to_runtime`, `semantic_correctness_verified`, `lineage_verified`, `ground_truth_accepted`, `official_scoring_authorized`, `score_export_created` bằng false. Input/attempt không thể tự cấp các quyền này. Pass ở đây chỉ là kiểm kỹ thuật đã khai báo, không phải reviewer approval hay kết quả bài báo.

## Điều kiện dùng về sau

Nhận phản hồi thật cho D01–D08 → thống nhất version áp dụng và policy → triển khai schema/registry/lineage/adapter riêng → kiểm migration và ca development đủ gate → mới nối vào runtime theo phạm vi được duyệt. Prototype này không tự thay thứ tự đó; gói Hiển/Phát và hồ sơ P01/P02 giữ nguyên.
