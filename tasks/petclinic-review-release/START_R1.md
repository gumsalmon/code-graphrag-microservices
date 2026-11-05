# Review PetClinic — lượt 1

Gói này dùng để thẩm định bằng chứng và nhận định tác động thay đổi trong ba tình huống PetClinic. Bắt đầu bằng **INDEX.html**: tìm theo case, tên file hoặc một đoạn đường dẫn được trích trong tài liệu, rồi chọn **Mở**. Có thể đọc toàn bộ gói offline; không cần Docker, Neo4j, API key hoặc dịch vụ AI.

## Cần thực hiện

1. Kiểm checksum theo **VERIFYING.md**. Đọc **CASES.md** để biết thay đổi, source/config pin và phạm vi mỗi ca.
2. Tạo thư mục làm việc riêng bên cạnh gói. Sao chép `NOTES_TEMPLATE.md`, `EXPOSURE_TEMPLATE.md` và `CHECKPOINT_TEMPLATE.md` vào đó. Giữ các file trong gói nguyên byte.
3. Ghi exposure đã có và công cụ/AI sử dụng. Đọc source/patch trước, lưu nhận định ban đầu; sau đó đối chiếu raw requests, responses và logs. Phân biệt quan sát, suy luận và điều chưa biết.
4. Với mỗi thực thể được xét, ghi nhận định có căn cứ về behavior; xét repair, hop và số lần qua dịch vụ riêng. Thiếu căn cứ thì ghi chưa thể kết luận và yêu cầu bổ sung cụ thể.
5. Lưu notes/exposure/checkpoint trước khi nhận lượt 2. Gửi lại các file đã lưu cùng phạm vi đã kiểm và những phần còn thiếu. Lượt này chưa yêu cầu approve nhãn nháp.

P02 và P03 có registry các ID/seed/alias trong mục lục. P01 là pilot lịch sử; không tạo một universe mới từ nhãn hoặc mô tả lại thành preregistered. Ghi các thực thể được nhận diện từ source và phạm vi đã xét để đối chiếu ở lượt 2.

## Các khái niệm dùng khi đọc

- **Seed:** thực thể trực tiếp bị thay đổi, tách khỏi impact lan truyền; Service chứa seed giữ riêng theo phạm vi của ca.
- **Behavioral impact:** khác biệt quan sát được trong cùng điều kiện thử, gồm lỗi, status hoặc nội dung phản hồi. Có đường phụ thuộc chưa đủ kết luận behavior thay đổi.
- **Repair:** cần sửa mã theo chiến lược cụ thể; chưa có chiến lược/căn cứ thì ghi chưa xác định.
- **Hop:** lời gọi Method→Method hoặc consumer Method→provider handler là một hop logic. Tuyến ghi caller→callee; cạnh chứa không tăng hop. Số lần qua ranh giới dịch vụ ghi riêng.
- **Negative:** cần đối chứng và giới hạn rõ; không suy từ thiếu quan sát, tên request, thiếu node hoặc HTTP 200 đơn thuần.
- **Unresolved:** chưa đủ bằng chứng để kết luận; không ép thành negative hoặc hop 0.

Người review khác người lập nhãn và không tự duyệt ground truth của implementation mình xây. Nếu đã xem nhãn, summaries, output hoặc repo công khai, khai exposure thực tế; không ghi như thể chưa từng tiếp xúc. Không cần tự thao tác mọi hash hoặc đọc mọi log, nhưng chỉ xác nhận phần đã kiểm.

## Cách tìm bằng chứng

`EVIDENCE_INDEX.json` và INDEX.html giữ logical path, origin, SHA-256 và tên lưu trữ ngắn. File trong `artifacts/` dùng tên hash và đuôi `.txt` để mở như văn bản; byte của source/JSON/body/patch gốc không đổi. Các payload trùng byte có thể dùng chung một file lưu trữ.

Trong raw JSON, `body_file` và các đường dẫn trích dẫn vẫn là tên gốc. Tìm tên đó trong INDEX.html, đối chiếu case/snapshot và hash. Không tự chọn một bản khác snapshot chỉ vì trùng basename. Các manifests lịch sử có thể liệt kê thành viên đã omit; `SHA256SUMS.txt` ở gốc mô tả đúng gói hiện có. Xem **OMISSIONS.json**.

Gói phục vụ đọc bằng chứng, không chứa đầy đủ binaries/cache để khẳng định tái chạy ứng dụng chỉ từ ZIP. Raw logs/fixtures đương nhiên bộc lộ quan sát và mục đích phép đo; checksum hoặc đổi cách lưu file không chứng minh blindness.

## Nếu dùng AI hỗ trợ

> Chỉ dùng gói lượt 1 này. Tìm source/patch/registry/raw qua mục lục; trích logical path, snapshot, dòng nguồn hoặc request/log/hash. Tách quan sát, suy luận, behavior, repair và hop. Không tìm nhãn hay output của các phương pháp từ repo hoặc nguồn khác. Giữ phần thiếu căn cứ là unresolved. Hỗ trợ tổ chức hồ sơ, không ký hoặc quyết định thay người review.

Notes và exposure có thể dùng bảng hoặc nhóm ID chung evidence. Ghi thời điểm chỉ khi biết thật; không lấy thời gian tạo checkpoint làm giờ đọc. **HOW_TO_RETURN.md** hướng dẫn lưu/checksum các file trả lại.
