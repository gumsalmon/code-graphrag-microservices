# P02 — bằng chứng F03 và lập nhãn nháp

Gói này dành cho Phát và AI hỗ trợ luồng benchmark, không phải gói điều phối toàn dự án hoặc quyết định reviewer. Đầu vào là scenario `0.1.1`, universe `draft.v2`, fixture `v1` đã được chốt sau recheck commit `187c4d82fb75c07d6593522dd68bc1dfdd86ceca`. Nhãn được lập từ source/contract/runtime, không từ hệ thống đang được đánh giá.

## Bắt đầu

1. Giải nén vào thư mục mới, không chép đè packet cũ. Giữ nguyên ZIP và file checksum đi kèm.
2. Mở terminal tại gốc gói và chạy `node VERIFY_PACKET.mjs --root .`. Cần Node 24+, không cần Docker, key, npm install hoặc mạng. Đây là kiểm bytes/omission, không thay nhận định của người thật.
3. Đọc `TASK_PHAT.md`, `LIMITATIONS.md`, `coordination/PETCLINIC_PRE_REVIEW_PLAN_2026-10-24.md`, `decisions/INPUT_LOCK_2026-10-24.json` và protocol trong `protocol/`.
4. Dùng thứ tự đọc ở TASK_PHAT. Giữ packet bất biến; tạo thư mục làm việc/return **bên ngoài** packet để lưu notes/labels mới. Không thêm output vào packet rồi sửa manifest để checksum đạt.

## Bản đồ

- `candidate/`: nguyên bộ recheck 31 file + manifest. Các refs bên trong được giải quyết từ **gốc candidate/**. Cờ pending/false trong bytes frozen là trạng thái lúc tạo, quyết định mới ở `decisions/`/`coordination/` không sửa những bytes đó.
- `source/baseline/`, `source/mutated/`: source đầy đủ từ source archive build P02 và file source mutated của run mới; không chứa Git internals, target hoặc JAR build.
- `config/`: config snapshot đúng pin.
- `runtime/groups/{baseline,mutated}-r{1,2}/`: raw request/response, body, header pairs, status/time, command/exit, service logs, setup/reset/readback, fault và cleanup.
- `runtime/helpers/`: targeted Java probe, code và event log. Có fixture HTTP local, không phải PetClinic E2E hoặc production method tracing.
- `runtime/mutated-build/`, `baseline-build/`: identity/source hashes/lệnh/log/manifest; compiled JARs không chuyển, omission khai hash rõ.
- `runtime/code/`: snapshot tooling thu evidence. Đây không phải parser/GraphRAG/scorer output; chỉ đọc nếu cần audit phép đo, không tự chạy stack.
- `prior-review/`: phiếu và log Phát recheck F01/F02.
- `templates/`: biểu mẫu trống, không phải nhãn đã lập. `NOTES_BY_ENTITY.json` không điền polarity; AI không tự biến thành labels chính thức.
- `META/transfer.json`: inventory, mapping base của manifest và omission ledger; `SHA256SUMS.txt` khóa đúng file thực có trong gói.

Không có nhãn P01/P02, prediction/parser/Cypher/Neo4j/retrieval/model response, score, derived body-comparison hoặc báo cáo kết luận của điều phối. Không gửi/gọi AI đọc toàn bộ workspace điều phối để bổ sung “đáp án”. Gói có design/census và exposure đã biết nên **không gọi blinded**.

Mọi giới hạn thiếu artifact phải đọc cùng checksum. Có code/source/log không có nghĩa có môi trường zero-install. Không chạy Docker, POST, model hoặc tái hiện bằng tài khoản/dữ liệu thật chỉ vì README cũ liệt kê lệnh.
