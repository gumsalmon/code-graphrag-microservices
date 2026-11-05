# P03 — mốc kỹ thuật sau checkpoint

1. Kiểm `node tooling/scripts/verify_project_transfer.mjs --root .` tại thư mục giải nén.
2. Đọc TASK_HIEN.md, receipt và decisions/D20.json; đối chiếu input hashes với decisions/D19.json.
3. Làm mốc C từng phần, giữ bản sửa P02 và nhánh hiện có. implementation-reference là bản tham chiếu từng bàn giao, không thay code mới.
4. Trả extraction/inventory/unsupported trước nếu DB chưa sẵn sàng; sau đó DB/parity/retrieval cùng log/hash/cleanup.

Gói chỉ có source/input/receipt và code tham chiếu. Không có nhãn, notes annotator,
raw outcome benchmark, prediction hoặc score. Source baseline và mutated có mục
đích diagnostic riêng; không dùng mutated source như primary static prediction input.
Các flags/path máy nguồn trong candidate là provenance frozen, quyền hiện hành nằm
ở receipt/D20. Không sửa candidate để phản ánh tiến độ, không yêu cầu cùng ổ đĩa.

Không có .git, image/cache, full app repository/JAR/DB hoặc full runtime replay.
Chỉ dùng cache/image đã có; không tải mới, gọi model/embedding, scoring, accepted,
test lock, áp contract output nháp, push/merge. Không cần xem ZIP annotation.
