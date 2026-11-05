# Phản hồi P03 để chuyển Hiển

Đã soạn, chưa gửi tự động. Chỉ chuyển phần kỹ thuật cho Hiển; không gửi output/nhận định này sang người lập nhãn.

---

Mình đã kiểm ZIP/sidecar, receipt và source; chạy độc lập 30 unittest tests và hai Neo4j DB mới. Extraction, full-property parity/idempotence và retrieval 1/2/3 hop khớp kết quả bạn gửi. Phụ lục raw/LF hashes P02 cũng đã đối chiếu đạt. Giữ nguyên các gói cũ.

Còn một lỗi metadata cần bạn sửa tập trung:

- Cạnh `ApiGatewayController.getOwnerDetails(int) → CustomersServiceClient.getOwner(int)` đang có `has_circuit_breaker=true`, fallback `emptyVisitsForPets` và assumption “Protected”.
- Source `ApiGatewayController.java:54–65` cho thấy Customers GET ở trước `flatMap`; circuit breaker chỉ bọc Visits publisher trong nhánh sau. Parser hiện lấy `cb.run`/fallback từ toàn method (`parser.py:637–639`) rồi áp vào mỗi call (`:964–978`).
- Hãy xác định association theo call expression. Nếu chưa phân giải được thì ghi rõ unsupported và không tạo assertion “Protected” cho call đó. Giữ schema/ID/hop; không hardcode tên method hay ID PetClinic.
- Thêm regression tổng quát: một call ngoài breaker và một call khác trong breaker cùng method; call ngoài không được nhận fallback của call trong. Ghi trước–sau, diff/code hashes. Sau sửa kiểm lại P03 source → graph → DB parity/retrieval trên hai snapshot, bảo toàn mọi run cũ. Không cần chạy lại HTTP/build ứng dụng hoặc nhãn.

Kết quả cần đạt: metadata breaker/fallback không còn gán nhầm, node/edge/endpoint và inventory thay đổi nếu có đều được giải thích; source/raw/log/checksum tái kiểm được. Gửi patch và evidence mới, không ghi đè gói cũ.

Các giới hạn record (`OwnerDetails.getPetIds()` thiếu), nested IDs và serialization/dataflow đã được ghi nhận. Chưa cần tự mở rộng schema hoặc tạo field edges để khớp universe. 35 native nodes không là 35 methods trong census: chỉ 26/27 top-level explicit, gồm seed; chín builder methods nằm riêng.

Bạn cũng xác nhận ngắn phần diff/evidence đã trực tiếp xem; phần AI làm/chưa xem cứ khai đúng, không cần ký hồi tố hoặc ghi giờ đọc giả. `COMMANDS.md` có password sandbox tạm; giữ raw riêng, hướng dẫn dành cho bản công bố nên dùng biến môi trường.

Vẫn theo D20/receipt P03: bản sao riêng, image/cache cũ, không model/embedding/scoring, không đổi nhãn hoặc shared output contract, chưa commit/push/merge. Chưa cần nhờ Phát sửa nhãn theo graph.
