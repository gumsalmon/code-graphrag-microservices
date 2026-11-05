# Hiển — parser regression và chuẩn bị tích hợp

Gói này cho phép bắt đầu phần kỹ thuật trong lúc Phát xử lý benchmark. Đọc `TECHNICAL_CONTEXT.md` rồi `TASK_HIEN.md`. Không cần chạy lại PetClinic hoặc mở Neo4j để bắt đầu.

1. Kiểm ZIP/sidecar, giải nén vào thư mục mới. Chạy `node verify_packet.mjs --root .` để kiểm toàn vẹn. Đây không phải kiểm đúng/sai của parser hoặc nghiệm thu nghiên cứu.
2. Xem `INPUTS.json` và `reference-implementation/`. Ba file là Git blobs của pin tham chiếu, không chứa `.git` hoặc cả repository. Giữ input nguyên byte; sửa code trong checkout/working copy riêng, không sửa gói frozen.
3. Báo branch/HEAD hiện tại, phần đang làm và diff so với pin. Có thể dùng branch riêng đang có nếu phù hợp; không bắt buộc tạo lại branch, không sửa main/force push hoặc tự merge. Chưa ghi nhận bạn đã nhận task này.
4. Đọc source và kỳ vọng của 10 fixture trong `run_java_synthetic_regression.py`. Mọi source Java và native JSON của lượt chẩn đoán tham chiếu nằm trong `reference-run/diagnostics/`. Chúng là synthetic development data, không phải source/nhãn PetClinic.
5. Dùng Python environment riêng có `tree-sitter==0.25.2` và `tree-sitter-java==0.23.5`. Runner chỉ dùng stdlib và hai package này; không cần cài Chroma/Neo4j để chạy các fixture. Nếu dùng version khác thì khai rõ, không báo tương đương mà chưa đối chiếu.

```powershell
python -B run_java_synthetic_regression.py --implementation YOUR_WORKING_COPY --output ../hien-return/NEW_RUN
```

Output phải là thư mục **chưa tồn tại**, đặt ngoài packet. Exit 1 nghĩa có case fail; vẫn giữ REPORT/native JSON/source/exception. Không xóa hoặc đổi expected để biến fail thành pass. Nếu cho rằng một kỳ vọng chưa hợp lý, ghi lý do và đề nghị sửa test riêng trước.

Lượt tham chiếu đã chạy offline trên image Python cục bộ, implementation chỉ đọc, không network, Neo4j hoặc model. Kết quả là 7 case đạt, 3 case fail; đây là chẩn đoán để sửa, không phải gói hỏng. S05/S06 không nối cạnh sai nhưng làm rơi diagnostic; S08 sinh hai CALLS `RESOLVED` cho lời gọi overload còn mơ hồ. S08 cố ý là fixture cú pháp với `null` không xác định được overload duy nhất; không được quảng bá thành một chương trình Java đã compile hoặc regression PetClinic.

Khi trả kết quả dùng `RETURN_HIEN.md`, kèm diff/commit nếu được quản lý ở branch riêng, code hashes, lệnh/exit/env, raw và checksum. Task này chưa cho push GitHub. Nếu chưa nhận hoặc đang có task khác thì phản hồi phạm vi/khả năng trước, không tự coi đã được điều phối hoặc đã hoàn tất.
