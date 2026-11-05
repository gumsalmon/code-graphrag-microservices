# Nhiệm vụ Phát — checkpoint P02 và nhãn nháp P03

## Đầu vào

D20 ở `decisions/`, protocol v0.2 và source/patch/fixture/universe P03 đã khóa trong `candidate/`, paired raw bốn group trong `paired/`, provenance build và RAW_INDEX. Đường dẫn evidence trong candidate resolve từ gốc `candidate/`; đường dẫn mới của packet resolve từ gốc ZIP. Giữ hai root này rõ trong manifest bàn giao.

P02 dùng hồ sơ đã bàn giao trước đây và hướng dẫn `P02_CHECKPOINT.md`; gói mới không chứa kết quả parser hoặc đáp án P03. Xác nhận ngắn bộ input, đầu ra và phần không thuộc nhiệm vụ trước khi làm; có thể dùng AI hỗ trợ tổ chức nhưng người thật quyết định nhận định.

## Kết quả cần đạt

1. **P02 trước:** bổ sung phạm vi trực tiếp xem/kế thừa/chưa xem của tám ID cũ và exposure. Nếu áp bốn đề nghị helper đã xác nhận, tạo version nhãn mới với evidence/giới hạn và changelog; giữ v3/raw nguyên byte. Gửi checkpoint riêng ngay khi xong.
2. **P03:** lưu notes source-first và exposure thật; xét đủ 31 ID eligible, giữ ba seed riêng. Với từng ID, nêu phần source/raw đã đọc, nhận định behavior, repair riêng theo strategy nếu đủ bằng chứng, hop/boundary nếu xác định được, căn cứ và giới hạn. Có thể unresolved, không cần mọi ID đều dương/âm hoặc repair/confidence đầy đủ.
3. Tạo nhãn nháp P03 version riêng theo protocol benchmark hiện hành, `pending_review`; ghi scenario/universe/fixture/patch/source/config hashes, người lập nhãn, AI assistance và review fields chưa có là null. Không sao chép graph/path hoặc prediction làm nhãn.
4. Bàn giao evidence manifest/hash, notes/checkpoint trước annotation, exposure, bảng từng ID và `RETURN_PHAT.md`. SHA-256 phải tính từ bytes thực, không tự viết giá trị tưởng tượng. Dùng file mới; manifests input cũ không cập nhật để hợp thức hóa thay đổi.

## Definition of Done

Đúng input hashes; đủ 31 eligible ID không trùng/không lẫn seed; mỗi nhận định hoặc unresolved có lý do và evidence kiểm được; source/runtime reference đúng root, file/dòng hoặc request ID; unknown/null không bị ép negative/0. Notes và exposure do Phát thực sự xác nhận, phân biệt hỗ trợ AI. Nhãn/version/evidence/checkpoint có hash và trạng thái pending_review, reviewer chưa có giữ null. Không phải có reviewer ký hoặc toàn bộ uncertainty biến mất mới bàn giao được.

Không yêu cầu chạy lại toàn runtime, ghi giờ từng file, xem output phương pháp, sửa parser/Neo4j, tự commit/push/merge hoặc mở scoring. Nếu cần thêm bằng chứng, nêu câu hỏi, ID và phép đo tối thiểu thay vì giữ toàn bộ công việc chờ không rõ lý do.

## Nội dung bàn giao

```text
Scenario / version / input hashes:
Label version / file / SHA-256:
Evidence manifest / SHA-256:
Notes source-first / hash và exposure thật:
Phần trực tiếp xem / AI hỗ trợ / kế thừa / chưa xem:
Các ID còn unresolved và lý do:
Giới hạn scope / repair / hop / confidence:
Reviewer / decision: chưa có thì null; pending_review
File mới và phần cũ giữ nguyên:
```
