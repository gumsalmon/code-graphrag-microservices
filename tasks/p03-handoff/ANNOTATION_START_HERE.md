# P03: lập nhãn nháp từ source và bằng chứng runtime

Đọc file này trước, rồi `TASK_PHAT.md` và `CONTEXT_FOR_ANNOTATION.md`. Gói này thay nhiệm vụ kiểm phạm vi trước đây bằng bước lập nhãn nháp được cho phép theo D20 ngày 31/10/2026. Scope/input đã chốt theo D19; không kiểm lại toàn bộ census hoặc chạy lại baseline chỉ vì đổi task.

## Bắt đầu

1. Giải nén ZIP vào thư mục mới, đường dẫn ngắn. Node.js cần có để kiểm gói; đọc source/raw không cần Docker, Java, Neo4j hoặc API key.
2. Chạy `node tooling/scripts/verify_petclinic_role_packet.mjs --root .`. Checker chỉ đọc, không tải dependency, gọi mạng hoặc chạy app; pass không chứng minh người thật đã đọc hoặc nhãn đúng.
3. Đọc source baseline, patch và source mutated trong `candidate/`. Lưu nhận định đầu tiên và exposure thực tế vào **bản sao** của `work-templates/INDEPENDENT_NOTES.md`. Chưa xem kết luận AI/coordinator hoặc output phương pháp để lấy đáp án. Nếu đã xem, ghi đúng điều đã biết; không dựng lại trạng thái đọc mù.
4. Đọc request/body/log thực trong `paired/groups/`, lần lượt baseline/mutated và hai repetitions. `provenance/RAW_INDEX.json` chỉ trỏ file, không đề nghị polarity. Readiness tách khỏi requests đo. Khi cần, dùng `--records` với checker để đối chiếu metadata/hash/reset; kết quả là kiểm cơ học.
5. Dùng `work-templates/ENTITY_NOTES.json` để bảo đảm xét đủ 31 ID eligible và giữ ba seed riêng. Đây là danh sách kiểm trống, không phải nhãn dự thảo đã tạo. Ghi bằng chứng và suy luận của người lập nhãn trước khi tạo label file.

Tạo `work/` hoặc thư mục khác ngoài bản input đã seal. Giữ các bản notes gốc/hash; không sửa `candidate/`, `paired/`, manifests, raw hoặc templates gốc. Các đường dẫn tuyệt đối cũ trong command/provenance là ghi chép máy nguồn, không phải đường dẫn cần tồn tại hoặc lệnh phải chạy trên máy nhận.

## Bàn giao theo hai mốc

Ưu tiên gửi checkpoint P02 theo `P02_CHECKPOINT.md` để phần kỹ thuật P02 có thể tiếp tục trước. Sau đó gửi P03: notes/exposure thật, bảng từng ID, nhãn nháp version/hash, evidence manifest và RETURN. Không phải chờ làm xong cả hai ca mới gửi.

P03 dùng protocol v0.2 ở `candidate/protocol/`; có thể theo cấu trúc nhãn benchmark hiện hành của P02 với version P03 riêng, không áp hợp đồng output phương pháp D01–D08 còn nháp. Nếu format không diễn đạt được giới hạn, ghi vấn đề/schema proposal cụ thể; không ép unknown thành số 0 hoặc negative.

Người lập nhãn giữ `pending_review`; reviewer/decision chưa có thì null. Gói không chứa nhãn P03 có sẵn, output parser/Neo4j/retrieval/model, score hoặc báo cáo kết luận paired của coordinator. Binaries/cache không kèm; xem omission ledger, không tuyên bố ZIP tự chạy lại toàn bộ stack.
