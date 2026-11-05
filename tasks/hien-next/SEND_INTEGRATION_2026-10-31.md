Hiển ơi, mình gửi gói PETCLINIC_HIEN_2026-10-31.zip và file .sha256 cho phần tiếp theo. Mở START_HERE.md rồi TASK_HIEN.md; gói có code candidate đúng hash bạn bàn giao, tests/runner tổng hợp và input source/patch P02/P03, không có nhãn hoặc điểm số.

Bạn có thể làm mốc A ngay: xác nhận diff đã tự kiểm, chuẩn bị adapter/runner tách input–output và khảo sát response-field/DTO trên dữ liệu tổng hợp; giữ native output, tests, diff/hash và giới hạn. Không cần làm lại baseline P02 hay bộ regression đã kiểm nếu chưa đổi code.

Actual extraction–Neo4j–retrieval có điều kiện theo từng ca: khi nhận receipt checkpoint nhãn nháp đã được kiểm của P02 thì làm P02; P03 tương tự. Không cần đợi reviewer duyệt hoặc cả hai ca cùng xong. Gói hiện chưa có receipt, nên chưa chạy ca thật. Mỗi mốc xong gửi riêng, không giữ tới khi toàn bộ PetClinic hoàn tất.

Kết quả kỹ thuật cần có source/code/input/receipt hashes, commands/exit/raw logs, native JSON/Cypher theo contract hiện hành, import/query Neo4j thật hoặc blocker đúng mức, retrieval offline và cleanup. Chỗ chưa hỗ trợ ghi unresolved/unsupported; graph reachability chưa phải nhãn tác động. Giữ output riêng, không gửi sang luồng Phát lập nhãn.

Chưa gọi model, chấm điểm, áp hợp đồng nháp, commit/push/merge hoặc làm P04. Dependencies/image cần có sẵn; thiếu thì báo cụ thể, không tự tải. REPRODUCE.md có lệnh kiểm gói và runner tổng hợp.
