# Phần việc song song và trạng thái Hiển — 28/10/2026

Huy xác nhận đã chuyển gói kiểm scope P03 cho Phát và hỏi vì sao không thấy phần Hiển gần đây. Dự án còn việc kỹ thuật chuẩn bị làm được trong lúc chờ phần con người; không cần chờ reviewer để chạy fixture tổng hợp. Chưa mở actual P02/P03 method output hoặc mutated P03 trái điều kiện hiện hành.

## Hiển đã làm tới đâu theo hồ sơ đã nhận

Bàn giao gần nhất được kiểm là `E:/Bài báo NCKH/RETURN_HIEN.md` và ZIP `P02_HIEN_RETURN_20261015T123448Z.zip`, SHA `dd9a8ff6f10098f4bca25d9c9a866ed6a8655975880922f90aa565e23ca6832c`. Hồi tháng 10 đã kiểm gói/log/source/raw, như snapshot FULL_PROJECT_CONTEXT mục 9.2; lượt này đọc lại báo cáo, không tái chạy toàn bộ bàn giao cũ.

Hiển đã tái lập build offline năm service và baseline 9 GET + 4 config/registry trên máy khác, kiểm fixture bốn visits, 24 Node/5 Python tool tests và audit parser/Neo4j có file/dòng. Task lúc đó yêu cầu dừng trước actual extraction/import/query/output và chưa giao triển khai P03/P04. Không lấy việc chưa thấy commit/parser output mới làm bằng chứng Hiển không làm việc. Chưa kiểm remote hiện tại hoặc nhận báo cáo mới hơn nên không suy branch hôm nay không đổi.

Điểm điều phối còn thiếu là chưa nối lại gói việc kỹ thuật cụ thể cho Hiển sau baseline/audit. Chờ xác nhận benchmark chỉ chặn các bước phụ thuộc nó; không chặn mọi software regression hoặc chuẩn bị integration. Không giao Hiển làm lại baseline đã đạt chỉ để có thêm một lượt báo cáo.

## Công việc kỹ thuật đã bắt đầu trong lượt này

Đã tạo `scripts/run_java_synthetic_regression.py` và chạy trên ba Git blobs của implementation pin `e95613795133088621117179c9fb9592dab62b16`. Blobs lấy bằng `git show` tại pin, không lấy byte working tree đang ở HEAD khác. Parser SHA `349be1e5694505e2d14d0cceed0bc3d22411406bd7708286bc15d534edbf68fb`; importer SHA `266d956189cf8aaf73df90969a56ebda9604b20769d9f6e9df5a413baf083bfb`.

Run: `handoff-out/hien-synthetic-preparation/20261028T131851Z-9d11fc97/`. Dùng image Python local từ P01 `sha256:63c6e72e510d658265cf956b0e589ec7b55c6049b766b6b68120253f7ee06281`, network none, code tham chiếu read-only, không tải package/image/model. Dependencies thật tree-sitter 0.25.2/tree-sitter-java 0.23.5. Không chạy Neo4j hoặc PetClinic, không đọc labels.

Kết quả **7/10 case đạt, 3 fail**, exit 1 có chủ đích để lộ vấn đề; mọi source Java, native graph JSON, assertion/exception và stdout/stderr/exit được giữ. Không sửa parser hoặc test expectation để làm đẹp kết quả:

| Case | Quan sát kỹ thuật |
|---|---|
| S01 | Prefix class + method và literal URI đạt |
| S02 | Explicit optional/default đạt |
| S03 | Required query thiếu được phát hiện |
| S04 | Default không khai required, tách declared/effective đạt |
| S05 | Sai service: không ghép cạnh sai, nhưng invocation unmatched mất diagnostic theo yêu cầu regression mới |
| S06 | Sai HTTP method: không ghép cạnh sai, nhưng invocation unmatched mất diagnostic theo yêu cầu regression mới |
| S07 | Hostname động giữ unresolved |
| S08 | Overload String/Integer với null: sinh hai CALLS RESOLVED, chưa có unresolved về ambiguity |
| S09 | LF/CRLF semantic projection đạt; source/raw paths giữ riêng |
| S10 | String đã biết chọn đúng một overload |

S08 là fixture cú pháp cố ý không chọn được overload duy nhất, **không được Java-compiled** và không là regression runtime của PetClinic. S05/S06 là thiếu diagnostic theo đặc tả regression mới, không phải false REST matches. Các kỳ vọng là kiểm phần mềm/cấu trúc; không phải ground truth CIA, số mẫu nghiên cứu hoặc tỷ lệ hỗ trợ toàn hệ thống. Nếu Hiển thấy expectation cần sửa, phải nêu căn cứ trước khi thay.

Container dùng `--rm`, label riêng `code-graphrag.hien-synthetic-preparation`; truy vấn cuối đúng label không còn container. Không tạo network app hoặc volume. Không thay source/candidate/raw/labels P01/P02/P03, không Git mutation/model/scoring.

## Gói việc Hiển có thể nhận

ZIP: `handoff-out/hien-synthetic-preparation/20261028T131851Z-9d11fc97/HIEN_SYNTHETIC_PREPARATION_2026-10-28.zip`, 66.936 byte, SHA `bb69c40464f037c450932cf154aeb3170dac6e69fd139a5cea52dda97d7ebffe`. Có sidecar cùng tên thêm `.sha256`. Root manifest `9c8c9ba0a43f9a8db421eae0c48cb8ffa478afd46fee055c6f932f38e151801f`, 73 files. Thực sự giải nén và chạy verifier portable đạt; scanner archive/content không finding theo mẫu, không chứng minh tuyệt đối riêng tư. Reference inputs giữ nguyên byte.

Gói có task/context đã lọc, code tham chiếu, runner, source/output tổng hợp và return template. Chưa chứa toàn repo/dependency cache hoặc source/nhãn thực tế P02/P03. Ba source blobs là pin tham chiếu, không tuyên bố latest remote branch. Chỉ cần hai parser packages và Python stdlib để bắt đầu; không cài lại toàn Chroma/Neo4j hoặc chạy lại PetClinic.

Đề nghị Hiển ưu tiên sửa 3 case và giữ các case đúng; tiếp đó kiểm metadata parity JSON/Cypher/direct-import bằng unit/mock trên data tổng hợp, giữ schema hiện hành. Thiết kế DTO/response-field support có thể chuẩn bị riêng, chưa áp contract nháp vào pipeline thật. Không tự mở actual P02/P03 output/mutation/labels/model/scoring/push. [Tin gửi](../hien-next/SEND_HIEN_2026-10-28.md) và task trong ZIP đã nêu input/output/DoD/giới hạn. Chưa tự gửi hoặc ghi Hiển đã nhận task mới.

## Phân luồng tiếp

- Phát: task hiện tại P02 human decisions và P03 input scope check; Huy đã báo gửi gói P03, chưa có phiếu kiểm trả hoặc ACK mới được xác minh.
- Hiển: đề nghị nhận software regression và importer unit/mock như trên; cần phản hồi branch/HEAD/phạm vi đang làm để tránh trùng.
- Huy/AI điều phối: đã tạo/chạy diagnostics và chuẩn bị gói kỹ thuật; tiếp tục các phần chuẩn bị/integration offline không phụ thuộc nhãn. Không tự sửa parser song song với Hiển khi chưa thống nhất quyền sở hữu phần code.
- Mở actual P02 output sau checkpoint draft/human condition, hoặc P03 input lock/mutated, vẫn cần đúng điều kiện. Khi chỉ còn việc phụ thuộc con người mới báo điểm chờ thật; không tuyên bố cả dự án đang đứng im lúc này.
