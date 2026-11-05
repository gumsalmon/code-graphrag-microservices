# Kiểm bản sửa circuit breaker P03 — 05/11/2026

**Đã kiểm độc lập và đóng P03-T01 trong phạm vi đã giao.** Customers GET không còn nhận breaker/fallback của Visits; Visits vẫn giữ association tương ứng với source. Mốc C extraction–Neo4j–retrieval P03 đạt kỹ thuật có phạm vi, với các giới hạn record/serialization/dataflow đã khai. Chưa hoàn tất hệ thống dự đoán ba cấp hoặc nghiệm thu nhãn.

## Gói nhận và code

- ZIP `HIEN_P03_BREAKER_FIX_RETURN_2026-11-05.zip`: 352.325 bytes, SHA-256 `5746714b5a4d65f1bb4365074abb1df1d1b599967c44a4195194c6872fe67731`, khớp sidecar.
- [Intake](../../handoff-out/hien-p03-breaker-return/20261105T082719Z-86eac2cb/INTAKE.json): 164 regular files gồm manifest. CRC/path/size checks đạt. Root manifest 163 listed files, packet 72, candidate 52; toàn bộ 73 file input packet khớp ZIP đã gửi 02/11.
- Receipt P03 SHA `b73e4dd44a1cbd9ffe05d148d2c0742f4ab685cb4c7a4cac7b949ed4d429ce20`, source/config/scenario/universe/fixture/scope/patch và D19/D20 nguyên byte. Không đọc nhãn hoặc outcome benchmark làm đầu vào phương pháp.
- Parser trước `f46fdf123ab156b7d3f3a03ced679dd581e10fbbb6ca28d64140147a1d6eeeb0`; parser sau `75e5d0fa0b2e958fb8a6604516e95dd24e65905bb6617b3820112d0270438005`.
- Importer, survey, adapter, tools và các tests cũ nguyên byte. Patch chỉ sửa parser/thêm regression; tái dựng LF copies đạt. Executable AST ngoài `parse_source`, `_extract_internal_method_calls`, `_breaker_association` không đổi. Helper mới không hardcode identity PetClinic.
- Hiển khai branch `codex/synthetic-parser-metadata`, HEAD nền `e95613795133088621117179c9fb9592dab62b16`, working tree đã dirty và code mới ở bản sao riêng. Không tự suy đó là commit chứa patch mới hoặc đã push.

## Nội dung sửa đã xác minh

| Cạnh | Trước | Sau |
|---|---|---|
| Controller → CustomersServiceClient.getOwner | breaker=true, fallback Visits, assumption Protected | breaker=false, fallback=null, bỏ Protected |
| Controller → VisitsServiceClient.getVisitsForPets | breaker=true, fallback emptyVisitsForPets | Giữ nguyên |

Mỗi snapshot chỉ đổi đúng ba trường trên một cạnh: `has_circuit_breaker`, `fallback_method`, `assumptions`. Metadata snapshot, nodes, endpoint, unresolved, cạnh khác và source/seed/hop giữ nguyên. Before graphs trong ZIP khớp byte gói 03/11. Source-only trung gian và final có cùng graph content; code hash trung gian/final được đối chiếu riêng, không ghép report với parser khác phiên bản.

Parser mới chỉ xác nhận các mẫu AST hẹp: typed `ReactiveCircuitBreaker.run` hoặc receiver chain đi qua identity `transform` phù hợp. Alias/branch/reassignment/shadowing/complex fallback chưa chứng minh được được giữ false/null và unresolved khi nhận diện được typed flow. **False không chứng minh runtime không có breaker.** Chưa có phân giải type/dataflow/Java scope/reactive semantics tổng quát. Syntax supplier fixtures chưa được compile thành ứng dụng Java.

## Kiểm độc lập đã thực hiện

[Run P03 mới](../../handoff-out/p03-breaker-offline/20261105t083103189z-c2daafaf/RESULT.json), manifest `baf4cccca80ca14586cc13141feabb6bd24bdde72a13cd3a9905e87f25c5b636`, 267 listed files. [Checker độc lập](../../handoff-out/hien-p03-breaker-return/20261105T082719Z-86eac2cb/independent-audit/INDEPENDENT_REPLAY_AUDIT.json) kiểm byte/source/code/receipt, AST inventory, DB identity/property parity/idempotence và source/path retrieval.

- Bảy regression ban đầu chạy trên parser cũ: **7 assertion failures/7 tests**, không import/runtime errors. Đây là RED đúng dự kiến, không cộng vào số tests pass hoặc samples nghiên cứu.
- Parser mới: **39/39 unittest tests đạt**, không fail/skip. Không cộng hai pytest subtests của Hiển thành hai test độc lập. Các regression dùng tên tổng hợp khác PetClinic, kiểm cả call ngoài/trong breaker và các mẫu unsupported.
- Extraction độc lập hai snapshot: mỗi bên 35 native Method nodes; trong 27 top-level explicit methods gồm seed có 26 được biểu diễn, thiếu `OwnerDetails.getPetIds()`. Tương ứng 25/26 eligible Methods sau seed. Chín nested builder methods nằm ngoài census top-level, không bù cho method thiếu. Vẫn 5 endpoints/3 dependency edges/2 native unresolved.
- Hai Neo4j DB mới riêng, mỗi bên 48 nodes/49 relationships. Graph rỗng được kiểm trước import; direct và Cypher lặp hai lần idempotent và full node/relationship properties khớp. Metadata Customers false/null và Visits true/fallback đã được kiểm riêng, không chỉ dựa vào parity.
- Reverse 1/2/3 hop giữ 1/2/2 candidate Methods, seed riêng; chunks/source hashes/paths khớp. Graph/DB content so được với gói Hiển sau repository alias và dump-view normalization đã khai; không bỏ qua field metadata mới để làm khớp.
- Container/network dùng image pin cũ, internal network, không host ports/project volumes; cleanup và owner queries cuối rỗng. Không chạy tool extraction/DB nhận vào; chỉ src/tests đã rà, probe coordinator và DB core P02 cũ giữ byte.
- Coordinator: Docker 29.8.0, tree-sitter 0.25.2/Java grammar 0.23.5/Neo4j driver 5.28.1; image Python `sha256:63c6e72e510d658265cf956b0e589ec7b55c6049b766b6b68120253f7ee06281`, Neo4j `sha256:5a015e53de1895e7eee1574ae0325cf8c4b89587222778108c594bdd45a474b5`. Hiển dùng tree-sitter 0.26.0/driver 6.3.1; không gọi đây là exact environment replay.

Do parser dùng chung, coordinator kiểm thêm [tương thích extraction P02](../../handoff-out/hien-p03-breaker-return/20261105T082719Z-86eac2cb/independent-audit/p02-compatibility-v2/RESULT.json): baseline/mutated đều 9 Method nodes và toàn bộ graph content giống bản P02 reviewed 02/11. Chỉ source-only compatibility, không rerun DB P02 hoặc thay profile/context/evidence cũ. Lượt compatibility đầu extraction baseline exit 0 nhưng checker cleanup phân biệt hoa/thường không nhận Docker “no such object”; giữ driver/log/error cũ, dùng driver/thư mục mới sửa guard và hoàn tất cả hai snapshots. Không sửa parser để vượt lỗi checker coordinator.

## Giới hạn và lưu trữ

Record `getPetIds()`, nested IDs thiếu enclosing record, native ID chưa snapshot-qualified và response serialization/dataflow/producer–consumer field binding vẫn chưa hỗ trợ đầy đủ. HTTP `contract_status=VALID` không xác nhận response tương thích. Reachability không là nhãn behavior/repair. Mutated graph vẫn diagnostic riêng.

P02/P03 label checkpoints, R22 inference limit và 20 unresolved P03 giữ nguyên, pending_review. Không gửi output phương pháp sang annotator để chỉnh nhãn; không yêu cầu Phát lập lại checkpoint. Hiển vẫn chưa khai đã trực tiếp xem diff/evidence; đây là kiểm kỹ thuật AI/coordinator, không chứng nhận phần người thật hoặc ký thay reviewer.

Scanner chung bắt chuỗi credential-shaped trong `COMMANDS.md`. Kiểm raw đúng hash xác định cả hai vị trí là PowerShell environment-variable references, không literal password như gói cũ. Giữ rejection của scanner và raw, có [classification/scan view](../../handoff-out/hien-p03-breaker-return/20261105T082719Z-86eac2cb/COMMANDS_SECURITY_CLASSIFICATION.json) thay đúng hai tham chiếu bằng placeholder để scan; không sửa scanner hoặc nói raw đã pass nguyên byte. Bản scan view đầu chỉ thay inline auth còn bị password-argument check, được ghi đúng trong classification. Chưa có quyền publish gói.

## Bước tiếp theo

Hiển đã hoàn tất yêu cầu sửa P03-T01 trong scope. [Tin xác nhận ngắn](../hien-next/ACK_P03_BREAKER_FIX_2026-11-05.md) để chuyển thủ công; không giao thêm vòng record/schema từ return này. Không cần đợi xác nhận con người về code để làm tiếp phần kỹ thuật đã được D20 cho phép.

Coordinator tiếp context/source retrieval P03 và chuẩn bị actual data allowlist cho hai lượt review PetClinic. Shared output contract/model/budget/scoring và quyết định nhãn còn riêng. P01 còn blocker Graph+Vector provider 503; phải khai khi tổng hợp, không giả cặp model đã hoàn tất. P04 chỉ sau review/sửa PetClinic theo D16. Chưa có reviewer mới hoặc decision/lịch được xác nhận từ lượt này.

Đã cập nhật context v0.34 và board, bảo toàn gói/source/raw/nhãn cũ. Không model/embedding inference, application HTTP/build mới, official scoring, accepted/test lock/shared contract adoption hoặc stage/commit/push/merge. Git HEAD `d1f95eb21c71dd6bfb49d2e450142d1290ceda5f`, index rỗng, working tree dirty.
