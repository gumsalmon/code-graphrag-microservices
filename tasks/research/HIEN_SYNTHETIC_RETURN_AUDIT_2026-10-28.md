# Kiểm bàn giao synthetic parser/importer — 28/10/2026

## Kết luận trong phạm vi

Gói hợp lệ và phần sửa đạt kiểm lại kỹ thuật độc lập trên source tổng hợp/unit/mock. Chưa nghiệm thu actual P02/P03, Neo4j thật, full parser coverage hoặc chất lượng CIA. Code mới chưa commit/push; dùng identity byte, không gán sửa đổi cho HEAD nền e956137.

ZIP SHA-256 `ae1c13700956d234ad5f1567fb8f2015ceb87bb72c895b282dab7a1bb7b44e71`, 175.774 byte; 248 files gồm 247 file manifest. Đã kiểm tên/checksum, CRC, đường dẫn/symlink/duplicate và toàn bộ manifest trước giải nén vào thư mục mới. Không chạy `record.py` hoặc `finalize.py` gửi kèm. Manifest SHA-256 `db4b16325e3950385f6a291420322097451c6c99e89c90498a6e9323bc5b72d2`.

Raw intake/audit/repro: `handoff-out/hien-synthetic-return/20261028T150351Z-3ac4bad6/`. [INTAKE](../../handoff-out/hien-synthetic-return/20261028T150351Z-3ac4bad6/INTAKE.json), [identity/patch audit](../../handoff-out/hien-synthetic-return/20261028T150351Z-3ac4bad6/IDENTITY_PATCH_AUDIT.json), [repro summary](../../handoff-out/hien-synthetic-return/20261028T150351Z-3ac4bad6/independent-repro/SUMMARY.json). Artifact local/Git ignored, chưa có trên GitHub.

## Identity và diff

38 kiểm identity/log/patch đều đạt: code-before khớp reference đã pin; runner nguyên byte như runner Huy; bốn after hashes khớp; log hashes đúng COMMAND_INDEX; REPORT cuối đúng hash parser. Áp diff vào bản sao code-before riêng, `git apply --no-index --check` và apply đều exit 0; nội dung tái dựng khớp after khi chuẩn hóa LF/CRLF công khai. Không áp diff vào code triển khai chính hoặc đụng Git index.

| Source sau sửa | SHA-256 raw working bytes |
|---|---|
| parser.py | `fb20def957a46c5bf41662326fa5c4e955593cb532cdad476dc9263ae9b6e8d9` |
| neo4j_importer.py | `8e418f34cc4e620cc924b37f23baccd8ad2f150579768cb34fffc97ec55ed08c` |

Đã đọc diff và cả hai test mới. S05/S06 thêm diagnostic sau khi kiểm hết endpoint, không báo mismatch giả khi có exact match khác. Reason giới hạn đúng “within supplied endpoints”. S08 deduplicate/sort ID và dừng trước tạo CALLS nếu nhiều candidate cùng điểm; known String vẫn được kiểm. Importer truyền query contract JSON và sent/missing lists theo representation export hiện có, fallback null thành chuỗi rỗng; không đổi ID/hop/schema hoặc migration policy.

## Kiểm lại độc lập

Dùng cached image `sha256:63c6e72e510d658265cf956b0e589ec7b55c6049b766b6b68120253f7ee06281`, Docker Linux 29.8.0; network none, root read-only, cap-drop ALL, no-new-privileges. Chỉ mount inputs/runner/harness read-only và output riêng; không mount credentials, PetClinic, labels hoặc annotation return. Không tải image/package/model.

Kiểm lại bằng Python 3.11.16 Linux; Hiển khai Python 3.11.9 Windows. Cùng tree-sitter 0.25.2/tree-sitter-java 0.23.5, không gọi hai môi trường là byte-identical. Test importer được rà trước khi chạy với MagicMock; không execute Cypher trên DB. Default sandbox không truy cập Docker pipe được, sau escalation cho hành động kiểm đã được yêu cầu thì truy cập được; không phải Docker chưa bật.

| Kiểm thực chạy | Trước sửa | Sau sửa |
|---|---|---|
| Runner gốc 10 case | 7 đạt, fail S05/S06/S08, exit 1 | 10 đạt, exit 0 |
| Metadata unit/mock | 4 test fail, exit 1 | 4/4 đạt, exit 0 |
| Resolution bổ sung | Không suy kết quả chưa chạy | 4/4 đạt, exit 0 |

Giữ raw source/native JSON/stdout/stderr/command/exit từng lượt. Exit 1 trước sửa là kết quả tái hiện mong đợi, không báo thành test pass. Gói Hiển giữ lỗi fixture resolution đầu (store-service ngoài mẫu inference hỗ trợ), rồi chỉ sửa test phụ về service đã hỗ trợ; runner/expectation gốc Huy không đổi. Chưa chạy suite P01 59 test hoặc ứng dụng Java. S08 chưa Java-compiled, không là runtime regression PetClinic.

## Giới hạn và điều phối

- Parity chỉ unit/mock. Chưa kiểm cú pháp/constraints/idempotence Neo4j runtime cho importer mới. ON CREATE không backfill, relationship MERGE chứa metadata có thể tạo cạnh song song khi dùng DB cũ; dùng DB sandbox mới khi mở integration thật. Chưa parity mọi provenance/assumptions hoặc hỗ trợ record/DTO/gRPC.
- Native nodes là tập đã lọc, không phải census toàn source. S05–S08 có file fixture chưa có Method binding; diagnostic còn giữ. Không dùng tập node làm evaluation universe, gán negative cho Method bị bỏ hoặc xác nhận coverage.
- RETURN_HIEN còn ghi chưa có xác nhận cuối của Hiển, thực hiện AI được khai. Huy chuyển tin và ZIP xác nhận có return, không tự chứng nhận Hiển đã tự review diff. [Receipt](../hien-next/RETURN_RECEIVED_2026-10-28.md) và [tin trả lời](../hien-next/SEND_AFTER_REVIEW_2026-10-28.md) ghi rõ. Technical AI review không thay annotator/reviewer ground truth.
- P02 chờ human decisions/exposure Phát; P03 chờ scope check và input lock/quyền mutated. Không mở method output ca thật/model/scoring/GitHub từ gói này. Code Hiển giữ riêng, chưa nhập đè production.

## Phần Huy/AI đã làm tiếp

Thêm [native bridge](../../prototypes/context-selection/native-bridge.mjs) và [replay driver](../../scripts/check_synthetic_native_context.mjs), nối native JSON từ lượt kiểm lại với source excerpts/alias toy/context selector. Hash source raw UTF-8 và excerpt chuẩn LF tách riêng; source binding thực tách native virtual file path, không giả native path là locator file thật. Contract metadata và unresolved được giữ để truy vết, chưa biến thành model prediction.

Bridge có 9 unit tests cho binding/ID/span/CRLF, unresolved, từ chối real metadata/label injection. Replay v2 qua 10 case/11 graph variants/ba route, **33 lượt selection**. S08/S10 dùng endpoint duy nhất làm software anchor, không phải known-seed CIA. Lượt replay driver đầu fail vì yêu cầu overload seed không có trong native nodes; giữ script/error/command đầu, sửa driver chọn endpoint duy nhất cho toàn profile; không sửa parser/native/runner hoặc kỳ vọng cũ.

Đây là parser → source binding/context selection tổng hợp, chưa Neo4j thật/LLM/scorer. Byte budget chưa là full request/token budget; marker synthetic không xác thực provenance thật. Không gọi là hoàn thành PetClinic.

## Kiểm cuối và hướng tiếp

**192/192 Node tests** trong tập hồi quy chọn lọc đạt, 0 fail/skip/cancel: 183 kiểm selector/harness/validator/telemetry/workboard hiện có và 9 kiểm native bridge mới. Đây là tập chọn lọc, không phải full suite của toàn dự án. [Lệnh/counts](../../handoff-out/hien-synthetic-return/20261028T150351Z-3ac4bad6/selected-regression.command.json) và stdout/stderr giữ nguyên. Test ACK của workboard được cập nhật để vẫn kiểm trường hợp thiếu acknowledgement record sau khi board thật đã có return, không nới điều kiện.

473 kiểm semantic/protection đạt: các REPORT đúng số case, 22 native JSON trước/sau khớp nội dung parsed JSON Hiển gửi; log unit thực chạy bốn test; 199 file frozen chọn lọc từ phiên trước và 247 file received không đổi byte. Phạm vi này không chứng minh toàn workspace bất biến. [Chi tiết](../../handoff-out/hien-synthetic-return/20261028T150351Z-3ac4bad6/SEMANTIC_PROTECTION_AUDIT.json). Docker query đúng label exit 0, không còn container; không tạo app network/volume. [Cleanup](../../handoff-out/hien-synthetic-return/20261028T150351Z-3ac4bad6/CLEANUP_CHECK.json).

Raw/code identity/host container invocation và manifest audit được giữ cùng thư mục intake; `received/CHECKSUMS.sha256` thuộc Hiển còn `AUDIT_SHA256SUMS.txt` thuộc lượt kiểm điều phối, không trộn hai nguồn. Bảng việc hiện hành thay trạng thái awaiting ACK cũ; hồ sơ/ZIP đóng băng không bị sửa.

Việc tiếp theo của Huy: nhận xác nhận báo cáo cuối từ Hiển, giữ candidate byte identity; tiếp nhận P02 human decisions và P03 scope của Phát. Khi checkpoint P02 đủ, giao rõ candidate/source/input/run/schema và phạm vi extraction → sandbox Neo4j mới → retrieval/output development cho Hiển, không tự mở toàn bộ model/test/scoring. P03 vẫn cần Huy input lock/quyền mutated riêng sau scope check. Trong lúc chờ chỉ chuẩn bị adapter/design theo quyền; không lấy test kỹ thuật này thay người lập/duyệt ground truth.
