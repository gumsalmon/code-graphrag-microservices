# Hoàn thiện checkpoint P02

P02 đã có raw F03, helper supplement và phụ lục nhận định ngày 30/10. Không cần kiểm lại toàn bộ runtime để trả lời yêu cầu này. Bộ input đã khóa vẫn scenario 0.1.1/universe draft.v2/fixture v1 theo D15.

Nhãn hiện có `labels.draft.v3.json`, SHA-256 `7d85eb6bb7bee9b7b138766ebd1a8deefd945a2a4bee8dc922f61f0a673e42cb`: 12 ID, tám negative và bốn unresolved. Phụ lục của Phát ngày 30/10 SHA `5bb5bfbf14275e89caa3537c1eeb73ea3eab44ced556d02e0d9a41857b66aadc` đã xác nhận bốn đề nghị helper trong phạm vi đo trực tiếp, chưa áp vào labels mới.

Việc cần gửi:

1. Một phụ lục ngắn cho tám ID cũ: phần đã trực tiếp xem source/raw, phần kế thừa/AI hỗ trợ, phần chưa xem và kết luận hiện giữ/sửa/unresolved. Không bắt buộc nhớ giờ từng file, đọc lại từ đầu hoặc dựng source-first hồi tố. Nếu chưa đủ để chịu trách nhiệm nhận định thì giữ unresolved và ghi phần thiếu.
2. Nếu tiếp nhận bốn đề nghị R06/R07/R10/R11 vào labels: tạo draft version mới, changelog và evidence/hash mới, giữ v3 nguyên byte. R06/R07/R10/R11 không tự thành negative production toàn cục: ghi giới hạn direct helper/setter/subscription, R11 chưa production callback trace. Repair/hop/confidence chưa biết giữ đúng tình trạng có lý do; không tự điền 0.
3. Nhãn nháp, notes/exposure, evidence manifest và checkpoint version/hash; mỗi ID có căn cứ và hạn chế. Đánh dấu pending_review, reviewer/decision chưa có là null, không accepted/test/scoring.

Có thể giữ v3 như bản nháp hiện hành nếu người lập nhãn quyết định chưa đổi, nhưng cần checkpoint mới trỏ đúng hash và notes/exposure thực tế, nêu rõ bốn unresolved còn tồn tại. Không bắt buộc đổi version nhãn chỉ để tiến độ trông hoàn tất. Gửi P02 riêng ngay khi đủ, không cần đợi P03; coordinator kiểm checkpoint rồi được tiếp tục kỹ thuật P02 theo D20, không cần hỏi quyền lại từng bước đã cho phép.

Đầu vào tham chiếu đã có trên máy Phát: gói F03 ban đầu, gói helper và phụ lục đã gửi. Nếu thiếu file, báo đúng tên; không dùng kết quả P03 hoặc output phương pháp bù vào bằng chứng P02. Gói P03 mới không chứa các nhãn P02 để giữ luồng làm việc riêng.
