# Hợp đồng đầu ra Method/API/Service — v0.1 nháp

Ngày: 15/10/2026. ID đề nghị: `microservice-impact-output/0.1.0-draft.1`.

**Trạng thái: chờ thảo luận với Hiển/Phát, chưa áp dụng.** Không thay định nghĩa impact/hop, protocol, output P01, prompt/schema/validator, benchmark/scorer hoặc gói đã gửi. Không có xác nhận hay phê duyệt của thành viên được suy diễn từ bản nháp này.

## 1. Mục tiêu và các lớp dữ liệu

Mục tiêu là để các phương pháp xuất kết quả cùng nghĩa ở ba cấp, phân biệt dự đoán với bằng chứng, và không làm mất unknown hoặc lỗi khi chuyển sang chấm điểm. Phạm vi là **đầu ra phương pháp đang được đánh giá**, không phải schema nhãn của người thẩm định hoặc schema lưu Neo4j.

| Lớp | Bên tạo | Nội dung / ranh giới |
|---|---|---|
| Registry và input contract | Chuẩn bị trước inference từ nguồn/phạm vi đã chốt | ID, level, seed, handler/owning service, alias có chứng cứ, fixture/domain, evidence được phép; không có polarity hoặc reviewer notes |
| Candidate payload | Phương pháp: LLM, rule hoặc graph baseline | Các assessment có điều kiện và citations; không tự điền provenance, trạng thái accepted hay điểm |
| Run envelope và validation ledger | Runner/validator đáng tin cậy | Pin/hash thật, execution/validation status, lỗi, usage, record hợp lệ hoặc bị cách ly, coverage; không chứng minh ngữ nghĩa dự đoán |
| Score adapter và report | Scorer sau các gate độc lập | Chuẩn hóa ID, chọn impacted set, đếm unknown/invalid/out-of-scope/failure và metric riêng từng cấp; chưa triển khai trong bản này |

Nhãn chuẩn và quyết định reviewer là luồng riêng. Method output không được đưa lại cho Phát làm bằng chứng gán nhãn trước khóa nhãn tương ứng.

## 2. Định danh và phạm vi

Giữ cách định danh protocol v0.2:

```text
Method: repository@snapshot::service::class_fqn#method(parameter_types)
API:    repository@snapshot::service::HTTP_METHOD normalized_path
Service:repository@snapshot::service
```

`snapshot` canonical là baseline được khai báo; không tự thay bằng HEAD mới nhất. Key đối chiếu là `(level, canonical_id)`, không chỉ tên method. API dùng đường dẫn mapping, không chứa query values; giữ wildcard/prefix/path variable theo source đã xác minh, không đổi thành URL request cụ thể. Một handler có nhiều mapping phải có nhiều API ID, không dùng handler_id làm API ID duy nhất. gRPC cần quy ước ID riêng có version trước khi áp dụng P04, chưa tự coi cú pháp HTTP là đủ.

Chuẩn hóa theo protocol §12: exact canonical → alias đã khai báo/có chứng cứ → snapshot substitution chỉ cho entity được xác minh không đổi. Không fuzzy match tên, tự gộp overload hoặc tự tạo alias theo output. Non-seed rename/signature alias dùng cho chấm chính thức cần review phù hợp. Tất cả raw IDs được giữ trong ledger; canonicalization không sửa raw response.

Seed Method/API/owning Service ghi riêng theo universe, loại khỏi điểm lan truyền. `support source` hoặc một method nằm ngoài census không tự được đưa vào scored universe. Registry không thay thế việc Phát kiểm độc lập inventory và khóa universe.

## 3. Candidate payload đề nghị

Payload gồm đúng ba trường: `summary`, `assessments`, `uncertainties`. `summary` gồm `text`, `citations`; `uncertainties` là mảng chuỗi. Assessment gồm các trường sau, không tự thêm `accepted`, `reviewer`, `score`, `ground_truth` hoặc provenance runner:

| Trường | Kiểu / ý nghĩa đề nghị |
|---|---|
| `level` | `method`, `api`, `service` |
| `entity_id` | ID khai báo của đúng level; khi không hợp lệ phải giữ raw để audit, không đoán sửa |
| `dependency_status` | `reachable`, `not_established`, `unknown` |
| `dependency_path` | Một witness path theo **Method IDs**, caller → callee → seed; không dùng node chứa để cộng hop |
| `logical_hops` | Integer 1–3 cho path đã claim; ngoài trường hợp đó là null |
| `service_boundary_crossings` | Integer 0–logical_hops cho witness; còn lại null |
| `behavioral_impact` | `likely`, `unlikely`, `unknown`: dự đoán có điều kiện, không phải nhãn true/false đã quan sát |
| `requires_code_change` | `required`, `optional`, `not_established`, `unknown`; độc lập với behavior |
| `repair_strategy_id` | ID chiến lược đã được phép trong request, hoặc null; required/optional cần chiến lược rõ ràng |
| `assumptions` | Mảng điều kiện fixture/input/config/repair liên quan; không bịa phép thử đã chạy |
| `rationale` | Giải thích ngắn, phân biệt source fact và suy luận; không báo runtime đã diễn ra khi không được cung cấp |
| `citations` | Mảng `{evidence_id, quote}` từ evidence được phép của đúng request |

Giữ vocabulary `likely/unlikely/unknown` và repair của P01 để giảm chuyển nghĩa; thêm level/entity_id không đồng nghĩa retroactively migrate P01. Numeric confidence chưa đề xuất bắt buộc vì chưa có calibration; không đổi likely thành một xác suất tự đặt.

### Ba nghĩa của dependency

- `reachable`: có claim witness path; dù path đúng cũng chưa chứng minh behavior đổi.
- `not_established`: chưa thiết lập được đường theo evidence được cung cấp; không phải chứng minh không có phụ thuộc trong toàn repo.
- `unknown`: phương pháp không đủ bằng chứng kết luận dependency.

Hai trạng thái sau dùng `dependency_path=[]`, hop/boundary null. Không dùng 0 thay null hoặc tự gán negative vì chưa tìm thấy path.

### Witness ở từng level

- Method: path bắt đầu chính Method đó, kết thúc canonical seed Method.
- API: path bắt đầu handler Method của API đã đăng ký; metadata handler phải được kiểm từ source/contract. Mapping API → handler không cộng hop.
- Service: path bắt đầu một Method thuộc Service đích. Nó chỉ là witness được trình bày, **không phải độ sâu nhỏ nhất hoặc bằng chứng cả service bị ảnh hưởng**.
- Chỉ `CALLS`/`INVOKES_API` logic tính hop; một REST invocation qua API node trong storage vẫn một hop. Boundary đếm riêng theo chuỗi owning services. Không lấy path dài hơn 3 rồi rút ngắn để qua giới hạn.
- Vector/lexical có thể suy luận path từ source được cung cấp; validator phải ghi `source_inferred_not_graph_verified`, không giả rằng nó khớp graph đã trích. Graph method có thể được kiểm `matches_supplied_graph`; cả hai đều chưa là kiểm chứng nhãn/path ground truth.

## 4. Citations, unknown và phần không trả về

Đề nghị kế thừa quy tắc pure abstention P01 ở mọi level. Chỉ được `citations=[]` khi đồng thời:

```text
dependency_status=unknown; dependency_path=[];
logical_hops=null; service_boundary_crossings=null;
behavioral_impact=unknown; requires_code_change=unknown;
repair_strategy_id=null; rationale giải thích thiếu bằng chứng.
```

Pure unknown vẫn có thể có citation; citation có mặt luôn phải kiểm ID/quote. `reachable` với behavior unknown không phải pure abstention và cần dẫn chứng. `unlikely`, `not_established`, `required`, `optional` cũng không được né citation. Summary cần ít nhất một citation; nếu request không có evidence đủ trích thì ghi lỗi chuẩn bị input, không bịa quote cho summary.

Giới hạn đề nghị giữ tương thích P01: 1–30 citation cho summary/assessment không abstain, 0–30 cho pure abstention; quote nguyên văn 8–2400 ký tự sau kiểm giới hạn. File, snapshot, artifact SHA và source spans do validator resolve từ evidence registry đã pin; model không tự viết chúng như provenance đáng tin cậy. Trích dẫn đúng byte/quote không chứng minh quote hỗ trợ kết luận đúng về ngữ nghĩa.

Danh sách assessment có thể thưa. Entity không được trả về được ghi **not_returned**, không tự sinh bản ghi unlikely. Tách riêng:

- `unknown`: có record nhưng không kết luận behavior;
- `not_returned`: không có record;
- `unsupported_level`: cấu hình không hỗ trợ cấp đó;
- `invalid`: output có lỗi định dạng/ID/quote/path;
- `execution_failed`: không có kết quả phương pháp hợp lệ vì lỗi chạy.

Không ép model trả đủ mọi ID chỉ để lấp coverage. Cùng giới hạn output/token cho mọi cấu hình; scope và output cap phải đăng ký trước, không tùy chỉnh theo nhãn. Nếu đo sparse-output, recall vẫn dùng toàn bộ gold positives trong universe, không chỉ ID được hệ thống trả về.

Không đồng nhất các trạng thái ở những luồng khác nhau:

| Nơi xuất hiện | Trạng thái | Không được tự chuyển thành |
|---|---|---|
| Parser/resolver | `unresolved` | Không có dependency hoặc behavioral negative |
| Assessment của phương pháp | `unknown` | Nhãn chuẩn `unresolved` hoặc negative; đây chỉ là phương pháp abstain |
| Bằng chứng/nhãn benchmark | `unresolved` | Gold negative để lấp universe; còn thiếu căn cứ/quan sát |
| Quyết định review | `pending_review` | Accepted vì code/tests/checksum pass |

Model có thể abstain dù reviewer đã có nhãn; reviewer cũng có thể chưa quyết định dù model rất tự tin. Metadata của hai luồng phải độc lập và không dùng nhãn chưa được phép để điền coverage phía model.

## 5. Method/API/Service không nhận điểm thay nhau

**Phương án đề nghị để thảo luận:** assessment trực tiếp theo từng level, chưa tự projection. Method likely không tự tạo API likely hoặc Service likely; handler được gọi cũng không đồng nghĩa response API đổi.

Không thấy method positive không đủ để kết luận API/Service negative: inventory có thể thiếu, một số helper không được quan sát, hoặc nhánh chưa chạy. Service negative cần bằng chứng/độ phủ được protocol và reviewer chấp nhận; không dùng quy tắc “mọi method trả về đều negative” khi còn omitted/unknown/out-of-scope.

Nếu nhóm chọn projection về sau, phải có policy version/hash, mapping registry và điều kiện đủ theo level; áp dụng giống nhau cho tất cả phương pháp, giữ direct và projected records tách biệt, loại seed và không cộng điểm hai lần. Quy tắc ANY method positive, ALL method negative, chọn min hop hay projection qua API **đều chưa được duyệt**. Khi chưa hỗ trợ level nào, báo unsupported thay vì mảng rỗng rồi quảng bá F1 cấp đó.

## 6. Run envelope và hai trục trạng thái

Envelope do runner tạo riêng, không yêu cầu LLM tự điền. Các nhóm trường bắt buộc khi triển khai thật cần được thống nhất:

| Nhóm | Dữ liệu |
|---|---|
| Identity | run/attempt ID, scenario/version, repository/source/config/patch/fixture/scope/universe/alias identities; alias/fixture/domain đúng bản đã chốt |
| Method config | method/config ID, code revision hoặc byte hashes, projection policy, requested/supported levels, seed mode, hop, context/output caps, prompt version |
| Request lineage | request/context/evidence registry/config SHA; input policy; không kèm test labels, expected impacts, reviewer notes hoặc repair-after-change commit vào prompt |
| Execution | status, attempt timestamps/duration, provider/model thực tế khi có, error stage/code, safe HTTP diagnostics; usage/token/cost chỉ từ nguồn đo được |
| Validation | status và scope kiểm; accepted record pointers, issue ledger, raw/canonical IDs, duplicate/seed/invalid/out-of-scope diagnostics, path validation kind |
| Artifacts | raw response/input/log references + SHA/byte length, normalized output mới với transformation/version; không overwrite raw |
| Coverage | theo level: eligible/supported, returned distinct valid IDs, behavior-unknown, not_returned, invalid và seed diagnostics; không dùng số graph nodes làm gold universe |

Trạng thái là hai trục độc lập:

| Execution | Validation | Diễn giải |
|---|---|---|
| `not_run` | `not_checked` | Chưa chạy, payload null; không phải kết quả âm |
| `failed` | `not_checked` hoặc `invalid` | Lỗi transport/provider/tool; giữ lỗi/attempt, không thay bằng assessments=[] để chấm như trả lời thành công |
| `completed` | `valid` | Payload qua kiểm đã khai báo, không chứng minh ngữ nghĩa/ground truth |
| `completed` | `partial` | Một số record dùng được, record lỗi giữ trong ledger; official policy cần chốt, không âm thầm bỏ record lỗi |
| `completed` | `invalid` | Có response nhưng không parse/validate được; không biến thành impacted set rỗng đúng |

`payload=null` nếu không có payload parse được; raw response có thể vẫn tồn tại theo cơ chế redaction an toàn. `usage=null` khi không đo được, không ghi 0 để giả miễn phí. Pure abstention vẫn có thể tốn token/chi phí. Failed attempt không bị xóa khi retry; chưa có retry policy tự động hoặc thay model một phía trong bản nháp.

Validation chỉ claim kiểm schema/registry/quote/path/lineage. Các trường `semantic_correctness_verified`, `ground_truth_accepted`, `official_scoring_authorized` không do method cấp; mặc định không xác nhận. Envelope không được chứa key, bearer token, credential path hay echo lỗi có secret. Không cần API key để thảo luận hoặc kiểm ví dụ này.

## 7. Ranh giới scorer — đề nghị, chưa triển khai

Protocol v0.2 là nền; bản này không sửa scorer Phát. Mapping dự kiến cần Phát thống nhất:

| Giá trị prediction | Đầu vào adapter dự kiến | Ý nghĩa |
|---|---|---|
| likely | predicted_impacted=true | Vào impacted set tại đúng level sau canonicalization |
| unlikely | predicted_impacted=false | Assessment âm dự đoán, không phải nhãn âm chuẩn |
| unknown | null + abstention ledger | Không ép false; không đưa null vào scorer Boolean hiện tại |
| omitted/unsupported | Không tạo Boolean record, lưu coverage | Không tự tạo negative |
| failed/invalid run | Failure/validation ledger | Không giả một successful empty prediction |

Scorer hiện có nhận Boolean `predicted_impacted`; nó không trực tiếp nhận payload này. Mọi adapter về sau phải giữ raw và loss ledger: những gì bị lược khi xuất Boolean, unknown/omission/failure, invalid và OOS. Không chỉ lọc bản ghi xấu rồi báo score đẹp.

Có hai lớp kiểm khác nhau: raw method output có thể không parse/validate được; normalized export thì phải đúng schema scorer. Validator từ chối không được làm biến mất raw attempt. Scorer hiện có có thể chặn cả case khi level hoặc Boolean malformed, thay vì luôn gán FP từng record. Phát cần thống nhất policy cho các trường hợp này trước khi adapter được viết; bản nháp không tuyên bố pipeline hiện đã hỗ trợ đầy đủ invalid/OOS/partial semantics.

Giữ yêu cầu protocol: seed loại khỏi TP/FP/FN; trùng canonical `(level,id)` không nhân điểm; prediction positive ngoài scope hoặc invalid được tính FP theo level đã khai báo và báo audit; trong universe chưa có nhãn quyết định thì unjudged, chặn điểm chính thức. ID duplicate có assessment mâu thuẫn không chọn bản thuận lợi: giữ conflict, chặn normalized export cho ID đó tới khi policy xử lý đã chốt.

Đối với abstention/omission trên gold positive, ID đó không vào predicted-positive set nên không được loại khỏi mẫu số recall: vẫn FN theo định nghĩa tập của protocol. Không xem missing prediction là gold negative. Scoring phải đợi accepted labels/universe đầy đủ, review và phê duyệt split/test/scoring riêng; P01–P04 development không tự thành test.

Các mục **chưa có quy tắc cuối**: failure penalty/all-planned-run denominator; cách xử lý partial/invalid chưa định được level; conflicting duplicates; direct vs projected tracks; cách báo selective coverage/risk bên cạnh full-universe recall. Không tự áp score cho chúng trong lượt này. Báo failure rate và execution coverage trên toàn bộ run dự kiến; nếu có success-only metric phải ghi rõ subset, không lấy subset đó làm kết quả toàn hệ thống.

P/R/F1 báo riêng từng level, micro/macro và support theo protocol; không gộp ba level thành một F1. Ragas không thay CIA ground truth. Không đưa F1/Ragas hoặc nhãn thật vào ví dụ schema.

## 8. So với hệ thống hiện tại / điều kiện áp dụng

| Hiện có | Chênh lệch cần xử lý sau thống nhất |
|---|---|
| P01 method_predictions, registry năm Method và seed đã biết | Không tự đổi thành universe ba cấp; cần registry/source inventory độc lập và adapter có version |
| P01 request/3 và pure-unknown contract | Giữ lịch sử nguyên vẹn; request/output version mới nếu thêm fields/levels, không dùng validator mới hồi tố output cũ |
| Parser Method + endpoint metadata, Neo4j Endpoint gắn handler | Không lấy storage key làm API canonical ID; cần alias/mapping đủ nhiều mapping/một handler và snapshot isolation |
| Phát scorer tại pin 5f9204d, Boolean records | Chưa nhận candidate enums, unknown, execution/validation status; cần proposal adapter và test riêng trước áp dụng |
| P02 scope: no automatic Method→API→Service credit | Bản nháp không override; direct-only là đề nghị, chưa phải decision mới |

Các tham chiếu soạn thảo: PROJECT_CONTEXT.md v0.6 §§5,7,8.3–8.5,9; protocol v0.2 tại `5f9204d66253604edf9101c2f888fc7e75aa0be7` §§3–7,12–16; `reasoning/p01/ABSTENTION_CONTRACT.md`; core P01 hiện hành; scope P02 preparation.v1. Chỉ kiểm cấu trúc/tool code, không đọc labels.v3 hoặc output model thật để đặt hợp đồng.

Thứ tự áp dụng về sau: Hiển rà khả thi registry/parser/path → Phát rà nghĩa label/universe/alias/projection/scorer và independence → điều phối ghi các quyết định/bất đồng thật → version contract/schema/request → triển khai adapter/validator và kiểm tổng hợp + ca development đủ gate → xin phép inference hoặc scoring theo phạm vi tương ứng. Đồng ý format không đồng nghĩa duyệt ground truth hoặc final test.

Xem [checklist thảo luận](REVIEW_CHECKLIST.v0.1.DRAFT.md) và [ví dụ toy](examples/impact-output.synthetic.json). Ví dụ có likely/unlikely/unknown chỉ để kiểm định dạng; không có code chạy model, scorer hoặc quyết định reviewer. Mọi hash chưa có giữ null và ghi synthetic, không tạo SHA/commit giả để nhìn như run thật.
