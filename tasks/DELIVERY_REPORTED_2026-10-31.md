# Ghi nhận đã chuyển gói Phát và Hiển

Ngày 31/10/2026, Huy báo trong cuộc trò chuyện: “tôi đã gửi 2 người họ rồi”. Ghi nhận đã chuyển hai gói D20 đúng vai trò theo lời Huy; không suy giờ gửi, kênh gửi, ACK, ETA, phần đã đọc hoặc kết quả làm việc của người nhận.

- Phát: ZIP SHA `f3d6fc5baf3e9688e839860de7aa45c5c6198c1965028da2b78582c59e40b5b9`, nhiệm vụ checkpoint P02 và nhãn nháp P03.
- Hiển: ZIP SHA `ad6fc03e774a67aea9797e81e92b8ec72298aa25af64edfe66ab25b89c4f6106`, nhiệm vụ chuẩn bị kỹ thuật tổng hợp, rồi actual integration theo receipt từng ca.

Archive/decision/DELIVERY_REPORT/CURRENT_STATE trong các gói giữ nguyên trạng thái tại lúc đóng. [Status D20](PETCLINIC_D20_STATUS_2026-10-31.json) và [bảng việc](PETCLINIC_WORKBOARD.json) cập nhật đã gửi, ACK chưa có, checkpoint P02/P03 vẫn null. Không gửi thêm tin qua công cụ hoặc tự ghi người nhận đã nhận việc.

Huy hỏi giả định nếu Phát dùng AI thay vì tự đọc. Đây **không phải xác nhận** Phát chưa đọc. Chưa sửa annotator/exposure của hồ sơ đã nhận hoặc kết luận Phát làm sai. Theo protocol/D20, AI được hỗ trợ tổ chức/kiểm tra; người thật phải kiểm bằng chứng đủ để quyết định nhận định và khai exposure. Nếu chỉ AI làm, giữ nhãn/gợi ý là AI-generated, chưa tính là checkpoint con người. Không cần Phát tự tính hash, đọc mọi file/log hoặc giả source-first hồi tố.

Có thể tiếp tục phần điều phối độc lập: chuẩn bị intake automation và thiết kế thí nghiệm còn nháp, không trùng parser/importer của Hiển. Prototype mới ở [checkpoint-intake](../prototypes/checkpoint-intake/README.md) chỉ dùng dữ liệu tổng hợp, không áp vào labels/scorer/actual P02/P03. Pass chỉ là kết quả kiểm cơ học; không chứng thực người thật đọc hoặc tự tạo receipt. Chờ checkpoint thật riêng cho actual integration từng ca, chưa cần dừng toàn bộ dự án.

Kiểm cuối prototype đạt 10/10 Node tests, 0 fail/skip; có ca thiếu/trùng ID, seed, version/hash sai, bytes notes/exposure thiếu hoặc đổi, AI-only và lời khai con người không tự thành chứng nhận, null/unresolved giữ nguyên và cấu trúc sai không được coi pass. Log/argv/exit ở `handoff-out/checkpoint-intake-audit/20261031T081651222Z-715812b3`; board check đạt, không chạy Docker/model/Neo4j hoặc actual extraction. HEAD không đổi, index rỗng, không commit/push.

Để giải thích chính sách công bố, đã tra [Elsevier — Generative AI policies for journals](https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals) ngày 31/10/2026. Chính sách cho phép AI trong phương pháp nghiên cứu khi mô tả tái lập trong Methods, đồng thời yêu cầu trách nhiệm và kiểm soát của con người. Đây không phải tạp chí đã chọn hoặc quy định mọi nhãn phải hoàn toàn thủ công. Điều kiện checkpoint người thật cụ thể của dự án xuất phát từ protocol/D20; không lấy việc khai AI thay cho kiểm chứng chất lượng nhãn.
