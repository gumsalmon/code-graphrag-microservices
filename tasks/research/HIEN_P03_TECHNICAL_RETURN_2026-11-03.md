# Kiểm bàn giao kỹ thuật P03 — 03/11/2026

Đã tiếp nhận và tái kiểm được extraction, inventory, Neo4j và retrieval offline theo D20/receipt P03. Có một lỗi metadata circuit breaker cần sửa trước khi sử dụng metadata này để giải thích tác động. Record/serialization/dataflow vẫn là giới hạn đã khai, không tự biến thành hỗ trợ đầy đủ P03.

Đây là kiểm kỹ thuật của coordinator có AI hỗ trợ, không phải reviewer duyệt ground truth hoặc xác nhận Hiển đã tự đọc diff. Không sửa code triển khai chính, nhãn hay bằng chứng cũ.

## Gói nhận và đầu vào

- ZIP: `HIEN_P03_TECHNICAL_RETURN_2026-11-03.zip`, 280.508 bytes; SHA-256 `75123b5ac595fc9408647566c0e19363af85336b5a30cc29b9bce0b81a76ca2d`, khớp sidecar nhận kèm.
- [Intake](../../handoff-out/hien-p03-return/20261103T135105Z-8dcc02a3/INTAKE.json): 136 regular files gồm manifest; CRC/path/size checks đạt. Không chạy code khi giải nén.
- Root manifest: 135 listed files; packet manifest: 72; candidate manifest: 52. Cả 73 file của packet nhận lại khớp byte ZIP đã gửi ngày 02/11.
- Receipt `P03-D20-20261102-4475b75e`, SHA `b73e4dd44a1cbd9ffe05d148d2c0742f4ab685cb4c7a4cac7b949ed4d429ce20`; D19/D20 và sáu artifact pins khớp, source/config không đổi.
- Parser `f46fdf123ab156b7d3f3a03ced679dd581e10fbbb6ca28d64140147a1d6eeeb0` và importer `93c20bd93e6dd5997043b4e4806aa5df7523426b4a82e6607b694934e5d4d7d3` giữ byte bản sửa P02. Survey/adapter cũng không đổi.
- Patch ba file tools/tests mới tái dựng được trên LF copies; raw patch và working files giữ nguyên. Tools nhận được đã đọc tĩnh; không chạy hai extraction/DB tools nhận vào. Chỉ chạy src/tests đã rà trong sandbox; extraction/DB dùng probe coordinator riêng và DB core P02 cũ, không sửa core cũ.

## Kiểm độc lập đã chạy

[Run mới](../../handoff-out/p03-native-offline/20261103t135753753z-890ce85b/RESULT.json), manifest `0c59e9aa99d131d93bdc79c3c6bda1a17d518916fed704df1af04dc6b1ffd402`, 253 listed files. [Checker độc lập](../../handoff-out/hien-p03-return/20261103T135105Z-8dcc02a3/independent-audit/INDEPENDENT_REPLAY_AUDIT.json) kiểm manifest, source/span, inventory, input/receipt/code, DB identity/parity/idempotence/retrieval và so content với gói Hiển.

| Phần | Baseline | Mutated diagnostic |
|---|---:|---:|
| Native Method nodes | 35 | 35 |
| Explicit methods trong sáu top-level types | 27 | 27 |
| Explicit methods được biểu diễn | 26 | 26 |
| Explicit methods chưa hỗ trợ | 1 | 1 |
| Nested builder methods ngoài census top-level | 9 | 9 |
| Endpoints / dependency edges / native unresolved | 5 / 3 / 2 | 5 / 3 / 2 |
| Neo4j nodes / relationships | 48 / 49 | 48 / 49 |
| Reverse 1 / 2 / 3 hop: distinct candidate Methods | 1 / 2 / 2 | 1 / 2 / 2 |

- 30/30 unittest tests đạt, không fail/skip. Hai subtests trong pytest của Hiển không được cộng thành hai test độc lập ở báo cáo này. Không chạy lại full legacy 59-test/Chroma suite hoặc application build/runtime.
- Hai DB mới riêng, internal network, không host ports/project volumes; kiểm graph rỗng trước import. Direct/Cypher đều import hai lần, full node/relationship properties và source/path retrieval khớp. Run-owned containers/networks đã được dọn, truy vấn owner cuối rỗng.
- Đối chiếu source expression: 413 baseline + 451 mutated occurrences trong syntax/audit/native evidence. Đây là số kiểm cơ học, không số samples hoặc thước đo accuracy.
- Content graph và DB khớp Hiển sau normalization view được khai: repository metadata URL/short alias, thứ tự dump và tên key dump. Không sửa raw hoặc nói byte-equal toàn output. `patch_id`, source spans, nodes/edges/endpoints/unresolved không bị bỏ qua khi so.
- Môi trường coordinator: Docker 29.8.0; Python cache image `sha256:63c6e72e510d658265cf956b0e589ec7b55c6049b766b6b68120253f7ee06281`, tree-sitter 0.25.2, Java grammar 0.23.5, Neo4j driver 5.28.1. Neo4j image `sha256:5a015e53de1895e7eee1574ae0325cf8c4b89587222778108c594bdd45a474b5`, server 5.26.0. Hiển dùng tree-sitter 0.26.0/driver 6.3.1; không claim exact environment replay.

## Điểm cần sửa và giới hạn

**P03-T01 — fallback gán sai cho một cạnh CALLS.** `ApiGatewayController.getOwnerDetails(int) → CustomersServiceClient.getOwner(int)` bị gán `has_circuit_breaker=true`, `fallback_method=emptyVisitsForPets` và assumption “Protected”. Trong source `ApiGatewayController.java:54–65`, Customers GET nằm trước `flatMap`; `cb.run(it, ...)` chỉ bọc publisher của Visits bên trong. Parser lấy cờ/fallback từ toàn method (`parser.py:637–639`) rồi gán vào từng call (`:964–978`). [Finding và evidence](../../handoff-out/hien-p03-return/20261103T135105Z-8dcc02a3/independent-audit/P03_T01_CIRCUIT_BREAKER_FINDING.json).

Hai đường import cùng lưu metadata sai vẫn có thể parity pass. Vì vậy technical content equality không chứng minh metadata đúng về ngữ nghĩa. Yêu cầu sửa theo call expression hoặc ghi association chưa hỗ trợ; không khẳng định “Protected” khi chưa có căn cứ. Cần regression tổng quát có một call ngoài breaker và một call riêng trong breaker, không hardcode PetClinic. Giữ schema/ID/hop; nhận patch/version mới rồi kiểm lại. Chưa tự sửa code Hiển hoặc artifacts đã seal.

**Giới hạn đã khai, không là checksum failure:**

- Thiếu `OwnerDetails.getPetIds()` explicit trong record. 26/27 gồm seed; đối với 26 eligible Methods sau seed, có 25 được biểu diễn. Chín builder methods không bù cho method thiếu.
- Nested IDs chưa chứa enclosing record đầy đủ; native keys chưa gắn repository/snapshot. Isolation đang ở DB/sidecar, không phải native identity đã hoàn thiện.
- Map/Optional/lambda, record components/accessors và consumer usage chỉ có syntax evidence; chưa producer–consumer field binding hoặc serialization/dataflow edges. `contract_status=VALID` trên HTTP edge không xác nhận response contract tương thích.
- Native unresolved gồm setter hostname Visits và Visits GET không có provider trong scope sáu file. Không coi là lỗi runtime hoặc negative benchmark.
- Reachable caller không là behavioral impact/repair. Mutated graph là diagnostic; không ghép vào baseline prediction context.
- P03 draft.v2 vẫn pending_review; 20 unresolved và giới hạn R22 từ checkpoint trước không đổi. Không đưa output này cho annotator để chỉnh nhãn.

## Provenance, lưu trữ và việc tiếp theo

Phụ lục `P02_HASH_CLARIFICATION.json` đã đối chiếu được raw CRLF và canonical LF hashes của hai Cypher P02 cũ. Phần thiếu khai hash scope đã được bổ sung đúng; raw/report/profile cũ không sửa. RETURN P03 vẫn yêu cầu Hiển tự xem diff/evidence; nhận ZIP qua Huy chưa chứng thực phần này.

Scanner chung phát hiện một credential DB thử tạm trong `COMMANDS.md`. RETURN giải thích thuộc container local đã xóa; không phải bằng chứng có API key. Raw giữ riêng, gói nhận chưa được cleared để public nguyên byte; khi xuất bản cần bản dẫn xuất dùng biến môi trường và lưu omission/redaction ledger. Không sửa scanner hoặc âm thầm xóa raw. Lượt scanner exit 1 đầu được giữ trong intake; bản audit sau ghi finding, không đổi thành scan sạch.

[Phản hồi soạn cho Hiển](../hien-next/SEND_AFTER_P03_TECHNICAL_RETURN_2026-11-03.md) tập trung P03-T01 và phần tự xem code; chưa được gửi tự động. Không cần Phát làm lại checkpoint hoặc đổi nhãn theo graph. Có thể tiếp tục chuẩn bị source/raw review packet riêng; chưa coi toàn PetClinic/GraphRAG hoàn tất hoặc ready review toàn bộ chỉ từ DB pass.

Không gọi model/embedding, chấm điểm, accepted/test lock/áp shared contract, mở P04 hoặc stage/commit/push/merge. Git HEAD vẫn `d1f95eb21c71dd6bfb49d2e450142d1290ceda5f`, index rỗng và working tree dirty.
