Phát ơi, mình gửi gói PETCLINIC_PHAT_2026-10-31.zip và file .sha256. Bạn giải nén rồi mở START_HERE.md; gói có source/patch/input P03 đã chốt, raw baseline–mutated hai lần lặp, protocol và biểu mẫu trống. Không cần Docker hoặc API key để đọc và kiểm gói.

Nhờ bạn làm hai mốc, xong mốc nào gửi riêng mốc đó:

1. Chốt checkpoint P02 trước theo P02_CHECKPOINT.md: bổ sung phần tự xem/kế thừa/AI hỗ trợ/chưa xem của tám ID cũ; nếu áp bốn đề nghị helper đã xác nhận thì tạo draft version mới, giữ v3 nguyên byte. Không cần chạy lại matrix hoặc nhớ giờ từng file.
2. Lập nhãn nháp P03 từ source/raw: lưu notes và exposure thật, xét đủ 31 ID eligible, giữ seed riêng. Mỗi nhận định có bằng chứng; thiếu bằng chứng giữ unresolved có lý do. Không cần chờ mọi repair/hop/confidence đều xác định mới bàn giao.

Kết quả cần gửi: label file/version/SHA-256, evidence manifest/hash, notes/exposure và RETURN_PHAT. Giữ pending_review, reviewer/decision chưa có để null. Không xem output parser/Neo4j/retrieval/model/score để lấy đáp án, không tự push hoặc duyệt nhãn.

D20 đã cho phép bước này. Sau khi checkpoint từng ca được kiểm, bên kỹ thuật có thể làm ca đó trước; không cần chờ cả P02 và P03 cùng xong. Bạn hoặc AI hỗ trợ đọc TASK_PHAT.md để giữ đúng phạm vi và Definition of Done.
