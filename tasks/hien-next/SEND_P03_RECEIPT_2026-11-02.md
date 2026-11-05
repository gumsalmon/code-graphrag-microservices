P03 đã có checkpoint draft.v2 được kiểm theo D20; receipt kỹ thuật nằm trong gói kèm theo. Mốc C extraction–Neo4j–retrieval offline được mở riêng, không cần đợi P02 hoàn tất hoặc reviewer duyệt nhãn.

Đọc START_HERE.md và TASK_HIEN.md trong ZIP. Giữ bản sửa P02/branch đang làm; implementation-reference chỉ để đối chiếu, không chép đè code mới. Ưu tiên trả từng phần có thể kiểm: extraction + inventory/unsupported trước, DB/parity/retrieval sau, kèm lệnh/log/diff/hashes và phần chưa làm. Không cần chạy lại runtime HTTP.

Chưa gọi model, chấm điểm, áp contract nháp hoặc push/merge. Gói chỉ có input và receipt kỹ thuật, không cần xem ZIP annotation của Phát. Output giữ riêng khỏi người lập nhãn.
