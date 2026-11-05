# Tin nhắn bàn giao P02 F03 / draft

Nội dung soạn sẵn, chưa gửi hoặc ghi Phát đã nhận. Thay hướng dẫn cũ chỉ rà evidence: theo yêu cầu mới, Phát có thể lập draft sau notes/evidence assessment trên input đã chốt; chưa tự review nhãn.

File gửi: `handoff-out/p02-phat-f03/20261024T111515Z-b98740ff/P02_PHAT_F03_2026-10-24.zip` và file `.zip.sha256` bên cạnh.

ZIP SHA-256: `e879fed6cc4e1ab9da5584d3387b14d05512b55f73db00581c4cc4329d127b77`.

---

Mình gửi gói P02 F03 mới, có source baseline/mutated, config, input đã chốt, raw runtime/log và task riêng cho bạn/AI hỗ trợ. Bạn giải nén vào folder mới, bắt đầu từ START_HERE.md; chạy `node VERIFY_PACKET.mjs --root .` để kiểm gói, không cần Docker/key/cài thêm thư viện.

Nhờ bạn rà bằng chứng từng ID, lưu notes source-first/exposure và hash trước. Sau đó lập nhãn nháp cùng evidence manifest nếu đủ căn cứ; chỗ chưa đủ giữ unresolved và ghi phép đo cần bổ sung, không mặc định negative. Người thật quyết định nhãn, AI hỗ trợ tổ chức/kiểm tra; không dùng output parser/GraphRAG/LLM hoặc score làm bằng chứng.

Kết quả cần bàn giao gồm notes gốc, bảng theo ID, draft labels/evidence manifest có version/hash nếu đã lập, unresolved/yêu cầu bổ sung, RETURN_PHAT và checksum. Làm trong folder return ngoài packet, không sửa raw/gói frozen. Nhãn giữ pending_review, không tự duyệt, khóa test hoặc chấm chính thức.

Kế hoạch hiện nay là hoàn tất các ca PetClinic P01–P03 để review gộp, sửa theo phản hồi rồi mới mở hệ thống khác. Hướng dẫn chi tiết và DoD nằm trong TASK_PHAT.md. Không cần gửi lại toàn bộ packet đầu vào; gửi folder return mới và nêu rõ những gì đã kiểm trực tiếp/có AI hỗ trợ.
