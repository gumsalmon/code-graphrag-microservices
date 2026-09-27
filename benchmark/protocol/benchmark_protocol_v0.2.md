# Quy trình benchmark ảnh hưởng vi dịch vụ v0.2

Trạng thái: được chấp thuận làm khung chuẩn bị scenario và rà soát pilot; chưa được chấp thuận để khóa test hoặc chấm điểm chính thức P02–P04.

Tác giả/người phụ trách gán nhãn: Phát

AI hỗ trợ: Codex (chỉ tổ chức bằng chứng và kiểm tra tính nhất quán)

Ngày lập: 2026-09-26

Phiên bản trước: `benchmark_protocol_v0.1.md` được giữ nguyên để truy vết.

## 0. Thay đổi so với v0.1

V0.2 giữ nguyên định nghĩa behavioral impact, seed, hop, evidence và review hai người của v0.1, đồng thời bổ sung:

- chuẩn hóa và đối chiếu ID giữa baseline/mutated;
- cách xử lý prediction không có nhãn hoặc không ánh xạ được;
- công thức Precision/Recall/F1 riêng cho Method, API và Service;
- quy tắc micro/macro, zero division và báo cáo support;
- chia development/test theo nhóm gần trùng để tránh leakage;
- quyết định review độc lập với file label đã khóa;
- checksum hai giai đoạn trước và sau review.

## 1. Mục đích và phạm vi

Quy trình này quy định cách xác định, thu thập bằng chứng, gán nhãn, rà soát, khóa và chấm điểm các scenario P01–P04. Phạm vi gồm ảnh hưởng ở cấp Method, API và Service do một thay đổi mã nguồn cố định trong hệ thống vi dịch vụ.

`behavioral_impact` là nhãn tác động chính. `requires_code_change` là nhãn sửa chữa riêng và không được dùng thay thế behavioral impact khi tính Precision/Recall/F1.

Quy trình không quy định chi tiết triển khai parser, Neo4j, RAG hoặc LLM. Output của các hệ thống được đánh giá không được dùng làm bằng chứng nhãn trước khi khóa nhãn.

## 2. Định danh và phiên bản scenario

- `scenario_id` là mã ổn định (`P01`, `P02`, ...).
- `scenario_version` dùng semantic versioning.
- Khi thay đổi repository commit, ngữ nghĩa patch, fixture, evaluation universe, định nghĩa impact hoặc quy tắc hop, phải tạo phiên bản scenario mới.
- Thay đổi làm đổi nhãn được chấm điểm phải tạo phiên bản label mới. Không sửa trực tiếp file đã khóa.
- `scenario_kind` nhận `synthetic_mutation`, `historical_change` hoặc `natural_failure`.
- Mỗi scenario có `duplicate_group_id` và `split` là `development` hoặc `test` trước khi benchmark được chạy.
- P01 là pilot đã lộ tuyến ứng viên và được dùng để xây protocol nên chỉ thuộc `development`, không được dùng làm final test.

## 3. Định danh thực thể

Định danh Method:

```text
repository@snapshot::service::class_fqn#method(parameter_types)
```

Định danh API:

```text
repository@snapshot::service::HTTP_METHOD normalized_path
```

Định danh Service:

```text
repository@snapshot::service
```

Trong đó:

- `snapshot` là baseline commit hoặc định danh mutated được khai báo trong scenario;
- path phải có dấu `/` đầu, không chứa query value;
- query parameter khai báo và query parameter thực gửi được lưu riêng;
- tên Method đơn lẻ không hợp lệ vì có thể tồn tại overload;
- cấp thực thể là một phần của định danh; không được dùng Method để nhận credit trực tiếp cho API hoặc Service nếu chưa áp dụng quy tắc projection đã khai báo.

## 4. Seed, impact và phạm vi sửa chữa

- **Seed** là Method/API contract bị thay đổi. Seed được lưu riêng và loại khỏi mọi tập chấm điểm.
- **Dependency** là quan hệ được source, contract hoặc runtime hỗ trợ. Reachability không tự chứng minh behavioral impact.
- **Behavioral impact** là thay đổi kết quả quan sát được dưới cùng fixture: status, lỗi, response content hoặc dữ liệu thiếu/sai.
- **Requires code change** cho biết thực thể có phải đổi mã theo repair strategy đã chọn hay không. Nhãn này được báo cáo riêng, không tham gia Precision/Recall/F1 tác động.
- Service chứa seed có thể được giữ làm ngữ cảnh nhưng bị loại khỏi điểm lan truyền ở cấp Service, trừ khi protocol xác định rõ một service không phải seed chịu ảnh hưởng.

## 5. Quy tắc hop và ranh giới service

Hướng cạnh là caller đến callee. Phân tích ảnh hưởng từ callee bị thay đổi duyệt dependency theo chiều ngược.

- `INVOKES_API` trực tiếp giữa consumer Method và provider handler là một logical hop.
- `CALLS` trực tiếp giữa hai Method là một logical hop.
- Cạnh bao chứa Service/File/Class không tăng hop.
- Thêm API node trong storage schema không được làm thay đổi logical hop.
- `service_boundary_crossings` được đếm riêng.
- Hop phải được xác lập từ source, contract hoặc runtime evidence, không lấy từ graph đang được đánh giá.

## 6. Giá trị nhãn

Mỗi thực thể ứng viên ghi:

- `level`: `method`, `api` hoặc `service`;
- `polarity`: `positive`, `negative` hoặc `unresolved`;
- `behavioral_impact`: `true`, `false` hoặc `unresolved`;
- `requires_code_change`: `true`, `false`, `conditional` hoặc `unresolved`;
- `logical_hop` và `service_boundary_crossings`;
- evidence reference, rationale, confidence và review status.

### Nhãn dương

Một thực thể là positive khi thay đổi cố định tạo khác biệt quan sát được và tái lập được tại thực thể đó. Kết luận phải có source/contract evidence; kết luận hành vi phải có runtime observation sạch.

### Nhãn âm

Một thực thể chỉ là negative khi được chọn theo tiêu chí ghi trước khi xem evaluated-system output, tồn tại trong repository thật, có tính so sánh hợp lý và có bằng chứng hành vi không đổi giữa baseline/mutated với cùng fixture.

### Chưa giải quyết và chờ review

- `unresolved`: chưa đủ bằng chứng kết luận target, path, behavior hoặc repair requirement.
- `pending_review`: bằng chứng đã có nhưng chưa có quyết định độc lập của con người.
- Candidate negative chưa xác minh bị loại khỏi scored labels cho đến khi hoàn tất baseline/mutated observation.

### 6.1 Evaluation universe trước khi gán nhãn ca mới

Với mỗi scenario mới, lập và khóa một `evaluation_universe.vN.json` **trước khi xem output hệ thống và trước khi gán polarity**. Universe là tập ID canonical có thể được chấm tại từng level, không phải danh sách chỉ gồm các candidate dự kiến positive. Ghi baseline commit, phạm vi service/API/method, quy tắc lấy inventory từ source/contract, hop tối đa, fixture, các loại thực thể được loại trừ và lý do, seed ID, alias baseline/mutated có bằng chứng, người lập, thời điểm và SHA-256. Giữ bản inventory đầu vào để reviewer tái dựng tập ID.

- Lấy inventory theo tiêu chí phạm vi đã định trước; gồm cả thực thể có thể bị ảnh hưởng và đối chứng hợp lý. Không mở rộng/thu hẹp theo prediction hoặc kết quả chấm.
- Mỗi ID trong universe có đúng một level và một kết luận `positive`, `negative` hoặc `unresolved` sau gán nhãn. Seed được ghi riêng và không nằm trong tập chấm. Không gán negative chỉ vì không quan sát được impact; negative cần phép đối chứng baseline/mutated như mục 6.
- Reviewer phải xác nhận độ phủ positive của universe, danh sách unresolved, các trường hợp loại trừ và bằng chứng alias. Nếu còn ID chưa được quyết định hoặc chưa đủ quan sát bắt buộc, chặn điểm chính thức cho scenario.
- Prediction nằm trong universe nhưng chưa có nhãn được ghi `unjudged` và chặn điểm chính thức. Prediction nằm ngoài universe đã khóa là `out_of_scope` theo mục 13; vẫn tính FP ở level dự đoán và báo ID để audit. Chỉ sửa universe bằng phiên bản mới, nêu lý do, review lại và rescore toàn bộ kết quả chịu ảnh hưởng.

## 7. Phân cấp bằng chứng

Bằng chứng được đánh giá theo loại kết luận:

1. **Source và patch bất biến:** chứng minh declaration, call expression và changed lines; không tự chứng minh runtime behavior.
2. **Contract framework/HTTP chính thức:** chứng minh declared semantics; không tự chứng minh configuration/fallback behavior.
3. **Runtime evidence sạch:** chứng minh hành vi cho đúng build, fixture và environment đã ghi.
4. **Runtime evidence lịch sử/nhiễu:** chỉ hỗ trợ thiết kế rerun, không tự đủ cho `accepted`.
5. **Derived summary:** chỉ hợp lệ khi nêu raw inputs và transformation.

Không dùng parser, Cypher, Neo4j, retrieval, GraphRAG, Vector RAG, LLM output hoặc benchmark score làm label evidence.

## 8. Tái hiện runtime

Mỗi scenario phải thực hiện hoặc ghi blocker cho:

1. baseline direct provider request;
2. baseline gateway/consumer request;
3. mutated direct request thiếu contract element mới;
4. mutated direct request hợp lệ;
5. mutated gateway/consumer request;
6. selected negative case trên baseline và mutated.

Run record phải có timestamp, command, exit code, HTTP status, response body, service log liên quan, fixture ID, commit, patch hash, phiên bản tool và image identity riêng cho baseline/mutated.

## 9. Review hai người và quyết định độc lập

- Annotator tạo candidate label từ allowed evidence.
- Reviewer khác annotator kiểm tra provenance, evidence coverage, hop, negative selection và repair labels.
- Reviewer chọn `approve`, `request_changes` hoặc `unable_to_review`.
- AI không được thay thế annotator hoặc reviewer là con người.
- Label file đã khóa không được sửa để ghi kết quả review.
- Quyết định được ghi trong `review_decision.vN.json`, tham chiếu chính xác label path, label version và label SHA-256.
- `approve` chỉ có hiệu lực `accepted` khi checksum artifact trước review và checksum quyết định sau review đều hợp lệ.
- `request_changes` làm đổi nhãn phải tạo label version mới; không sửa file cũ.

## 10. Chia development/test và chống trùng lặp

### 10.0 Chọn scenario trước khi gán nhãn

Trước khi mở nhãn cho P02–P04, lập danh sách ứng viên từ repository/commit và loại thay đổi đã định trước, ghi cả ứng viên bị loại cùng lý do. Chốt tiêu chí đủ điều kiện: commit và patch/incident xác minh được, fixture và đường gọi có thể tái hiện, bằng chứng source/contract khả dụng, có đối chứng hợp lý, và không trùng gần với scenario đã chọn. Ghi thứ tự chọn, người chọn, thời điểm, nguồn ứng viên và mọi thay đổi quyết định. Không chọn, thay thế hoặc loại scenario dựa trên output hay score của hệ thống được đánh giá.

Tạo `duplicate_group_id` và quyết định split ở cấp group từ thông tin chưa gán nhãn. Khóa danh sách scenario, tiêu chí chọn và split manifest trước khi annotator thấy output hệ thống. Nếu một ca không tái hiện được, giữ nó trong sổ chọn với trạng thái/blocker; chỉ thay bằng ca mới theo cùng tiêu chí và lập phiên bản manifest mới. Số positive labels chỉ dùng để mô tả/stratify sau khi gán nhãn, không được dùng để chọn hoặc chuyển ca giữa development/test.

### 10.1 Tạo nhóm gần trùng

Trước khi chia tập, mỗi scenario phải có `duplicate_group_id` được tạo từ tối thiểu:

- repository;
- service và contract/endpoint bị thay đổi;
- normalized call path;
- mutation operator/template;
- framework/language;
- semantic fingerprint của changed declaration.

Scenario có cùng endpoint, cùng call path hoặc mutation chỉ khác fixture/literal phải nằm cùng duplicate group. Không chỉ dựa vào tên scenario.

### 10.2 Quy tắc chia tập

- Chia ở cấp duplicate group, không chia từng scenario độc lập.
- Một duplicate group chỉ được nằm trong một tập.
- Không để cùng endpoint, overload family hoặc mutation template gần trùng xuất hiện ở cả development và test.
- Ưu tiên repository-level holdout khi đủ số repository; nếu không, dùng group-level holdout và ghi limitation.
- Stratify theo scenario kind, framework/language và logical hop dự kiến từ source khi dữ liệu cho phép; số positive labels chỉ được báo sau khi split đã khóa.
- P01 cố định ở development/pilot.
- P02–P04 chỉ được gán split sau khi danh sách scenario, evaluation universe và split manifest được phê duyệt riêng cho bước khóa test.

### 10.3 Khóa split và chống leakage

- Lưu phép chia trong `benchmark/splits/split_manifest.vN.json`.
- Manifest ghi scenario version, duplicate group, split, lý do, checksum universe và checksum label tương ứng khi đã có nhãn; checksum còn thiếu phải được ghi là `null`, không suy diễn trạng thái đã khóa.
- Manifest ở trạng thái `draft` chỉ để chuẩn bị. `approved_for_test` cần quyết định phê duyệt riêng, danh sách test đã chốt, checksum universe/label/review hợp lệ và không có group xuyên tập.
- Khóa checksum split manifest trước khi chạy benchmark trên test.
- Test label, expected path, repair commit và reviewer comments không được đưa vào prompt/retrieval/tuning context.
- Nếu phát hiện near-duplicate xuyên tập sau khi chạy, kết quả test liên quan bị vô hiệu; di chuyển toàn bộ group, tạo split version mới và chạy lại.

## 11. Khóa artifact và checksum

### Trước review

`benchmark/p01/checksums.sha256` khóa label, scenario, evidence manifest, protocol, script, raw evidence và derived result. Không đưa các file reviewer sẽ sửa như `review_log.md` hoặc `review_decision.vN.json` vào manifest này.

### Sau review

`checksums.review.vN.sha256` khóa:

- manifest artifact trước review;
- `review_log.md`;
- `review_decision.vN.json`.

Không sửa raw evidence. Run mới phải tạo thư mục timestamp mới. Chi tiết thao tác nằm trong `benchmark/p01/CHECKSUM_PROCESS.md`.

## 12. Chuẩn hóa và đối chiếu ID baseline/mutated

Chuẩn hóa được thực hiện trước khi so sánh prediction với label.

### 12.1 Canonical ID

- Ground truth dùng baseline snapshot làm canonical snapshot.
- Entity không đổi giữa baseline/mutated được ánh xạ về baseline ID sau khi xác minh service, FQN, signature/path và source identity tương ứng.
- Seed before/after có thể khác signature nhưng phải ánh xạ vào cùng `canonical_seed_id`; seed vẫn bị loại khỏi scoring.
- Rename, move hoặc signature change không phải seed chỉ được ánh xạ bằng alias có bằng chứng và được reviewer phê duyệt.

### 12.2 Thứ tự đối chiếu

1. Exact match với canonical ID.
2. Exact match sau khi áp dụng alias khai báo trong scenario.
3. Exact match sau khi thay mutated snapshot bằng baseline snapshot cho entity được xác minh là không đổi.
4. Nếu vẫn không khớp, ghi `invalid_prediction` hoặc `out_of_scope`; không fuzzy-match theo tên đơn lẻ.

Alias tối thiểu ghi:

```json
{
  "baseline_id": "...",
  "mutated_id": "...",
  "canonical_id": "...",
  "evidence_refs": ["..."],
  "reason": "same logical entity across the mutation"
}
```

Sau chuẩn hóa, prediction trùng canonical ID ở cùng level chỉ được tính một lần. Prediction đúng entity nhưng sai level không nhận credit chéo.

## 13. Chuẩn hóa prediction theo cấp

Mỗi prediction phải có `level`, `entity_id` và trạng thái predicted impacted.

- Method metric chỉ dùng Method predictions/labels.
- API metric chỉ dùng API predictions/labels.
- Service metric chỉ dùng Service predictions/labels.
- Nếu hệ thống không xuất Service trực tiếp, có thể projection từ Method/API sang owning Service, nhưng quy tắc projection phải được khai báo và khóa trước khi xem test output, áp dụng giống nhau cho mọi hệ thống.
- Seed predictions được ghi để chẩn đoán nhưng loại khỏi TP/FP/FN.
- Prediction ngoài repository/snapshot/scope khai báo là `out_of_scope` và được tính là FP ở level mà hệ thống đã xuất.
- Prediction không parse hoặc không ánh xạ được là `invalid_prediction` và được tính là FP.

## 14. Prediction chưa có nhãn

Sau canonicalization, prediction trong scope nhưng không có label positive/negative được ghi `unjudged`; không tự động coi là negative.

- Không công bố score chính thức khi còn `unjudged` ở test set.
- Báo riêng `unjudged_count` và danh sách ID theo từng level.
- Có thể báo hai khoảng chẩn đoán:
  - **optimistic precision:** loại unjudged khỏi mẫu số;
  - **conservative precision:** tạm tính mọi unjudged là FP.
- Recall chỉ được coi là chính thức khi reviewer xác nhận positive ground truth đầy đủ trong evaluation universe.
- Reviewer adjudicate unjudged bằng evidence độc lập. Nếu nhãn thay đổi, tạo label version mới, checksum mới và rescore.
- Không dùng evaluated-system rationale làm bằng chứng duy nhất để adjudicate.

## 15. Precision, Recall và F1

Tính độc lập cho từng level `L ∈ {method, api, service}` sau canonicalization và loại seed.

Ký hiệu:

- `G⁺L`: tập canonical ID có `behavioral_impact=true` và label được chấp nhận ở level L.
- `G⁻L`: tập canonical ID có `behavioral_impact=false` và label được chấp nhận ở level L.
- `PL`: tập canonical ID hệ thống dự đoán bị ảnh hưởng ở level L.
- `UL`: prediction trong scope nhưng chưa có nhãn ở level L.

Đếm:

```text
TP_L = |P_L ∩ G⁺_L|
FP_L = |P_L ∩ G⁻_L| + invalid_L + out_of_scope_L
FN_L = |G⁺_L - P_L|
```

`UL` không nằm trong TP/FP/FN của score chính thức vì score bị chặn cho đến khi adjudicate. Chỉ báo khoảng chẩn đoán:

```text
Precision_optimistic_L   = TP_L / (TP_L + FP_L)
Precision_conservative_L = TP_L / (TP_L + FP_L + |U_L|)
```

Sau khi không còn unjudged:

```text
Precision_L = TP_L / (TP_L + FP_L)
Recall_L    = TP_L / (TP_L + FN_L)
F1_L        = 2 * Precision_L * Recall_L / (Precision_L + Recall_L)
```

Quy ước `zero_division=0`:

- mẫu số Precision bằng 0 thì Precision bằng 0;
- mẫu số Recall bằng 0 thì Recall bằng 0 và phải báo `positive_support=0`;
- mẫu số F1 bằng 0 thì F1 bằng 0.

Mỗi level phải báo ít nhất: TP, FP, FN, positive support, negative support, prediction count, invalid count, out-of-scope count, unjudged count, Precision, Recall và F1.

## 16. Gộp kết quả nhiều scenario

### Micro average — chỉ số chính

Cộng TP/FP/FN của tất cả test scenario tại cùng level rồi tính Precision/Recall/F1. Không cộng lẫn Method, API và Service.

### Macro average — chỉ số bổ trợ

Tính metric từng scenario rồi lấy trung bình theo cùng level. Phải báo số scenario tham gia và số scenario có `positive_support=0`. Không dùng macro để che giấu support nhỏ.

Không tạo một F1 duy nhất bằng cách trộn ID của ba level. Nếu cần headline, báo bộ ba `Method F1 / API F1 / Service F1` và micro là mặc định.

## 17. Quyết định audit

- `accepted`: provenance, runtime bắt buộc, negative case, review hai người, label checksum và post-review checksum đều hoàn tất.
- `pending_review`: evidence đủ nhưng chưa có quyết định reviewer hoặc post-review checksum.
- `reproduce_required`: runtime evidence thiếu/sai hoặc môi trường cản trở quan sát bắt buộc.

Không quyết định nào ngụ ý GraphRAG tốt hơn baseline.

## 18. Cấu trúc gói bắt buộc

```text
benchmark/
  protocol/
    benchmark_protocol_v0.1.md
    benchmark_protocol_v0.2.md
  splits/
    split_manifest.vN.json
  pNN/
    scenario.json
    labels.vN.json
    evidence_manifest.json
    review_log.md
    review_decision.vN.json
    checksums.sha256
    checksums.review.vN.sha256
    raw/
    derived/
```

Raw files và frozen labels là bất biến. Derived material phải nêu raw inputs và transformation. JSON dùng UTF-8, LF, stable key ordering khi có thể và repository-relative path với dấu `/`.
