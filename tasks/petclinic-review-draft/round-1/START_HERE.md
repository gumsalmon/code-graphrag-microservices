# Lượt 1 — nhận định từ source, patch và raw runtime

**Mẫu hướng dẫn đang chuẩn bị. Chưa kèm dataset và chưa phải lời mời review chính thức.** Khi phát hành, thông tin phiên, các case được giao và checksum sẽ có trong PACKAGE_METADATA của gói.

Mục tiêu của lượt này là đánh giá tác động hành vi của thay đổi trên từng thực thể trong phạm vi đã khai. Kết quả cần là nhận định có bằng chứng và giới hạn, kể cả những phần chưa thể kết luận.

## Bắt đầu

1. Kiểm metadata/checksum và danh sách case thực tế. Làm việc trên bản sao; giữ source, patch và raw gốc.
2. Tạo bản riêng từ [NOTES_TEMPLATE.md](NOTES_TEMPLATE.md). Khai vai trò, exposure đã có, AI/công cụ sử dụng và phạm vi trực tiếp kiểm. Người review khác người lập nhãn và không tự duyệt nhãn của phần implementation mình xây.
3. Đọc source, patch, fixture, phạm vi và alias; ghi nhận định ban đầu rồi đối chiếu raw requests/responses/logs. Phân biệt điều thấy trong dữ liệu với suy luận và giả định.
4. Với mỗi Method/API/Service đủ điều kiện, dẫn file:dòng hoặc request/log/timestamp/hash. Ghi phần đã xem, chưa xem và yêu cầu bằng chứng bổ sung.
5. Lưu notes và [CHECKPOINT_TEMPLATE.md](CHECKPOINT_TEMPLATE.md) trước khi nhận hồ sơ đối chiếu nhãn. Không cần đưa ra quyết định approve ở lượt này.

Các gói có thể chứa source mẫu của ứng dụng, không đồng nghĩa toàn bộ test ứng dụng đã chạy. Scope và raw chỉ bao phủ điều kiện/fixture đã ghi. Đọc offline không đòi hỏi Docker, model hoặc Neo4j; phần tái chạy thêm nếu có được ghi riêng với môi trường/lệnh/log.

## Các khái niệm dùng khi đọc

- **Seed:** thực thể trực tiếp bị thay đổi, lưu riêng khỏi impact lan truyền. Service chứa seed được giữ riêng theo universe/protocol của ca.
- **Behavioral impact:** khác biệt quan sát được dưới cùng điều kiện thử, gồm status, lỗi hoặc nội dung/dữ liệu khác nhau. Có dependency chưa đủ kết luận behavior thay đổi.
- **Repair:** nhu cầu sửa mã theo chiến lược cụ thể, được xét riêng; thiếu căn cứ thì giữ chưa xác định.
- **Hop:** CALLS Method→Method hoặc consumer Method→provider handler INVOKES_API là một hop. Tuyến ghi caller→callee; khi xét callee bị thay đổi, xem ngược về caller. Cạnh chứa không tăng hop; số lần qua service boundary ghi riêng.
- **Positive/negative/unresolved:** kết luận dựa trên evidence theo scope. Negative cần đối chứng baseline/mutated phù hợp, không tự suy từ thiếu quan sát, thiếu node hoặc tên request. Chưa đủ dữ kiện dùng unresolved và nêu phần còn thiếu.
- **Universe:** tập ID đủ điều kiện theo phạm vi đầu vào, không phải tập dự đoán của phương pháp. Overload và level khác nhau cần ID riêng. Nếu thấy thiếu ID/alias hoặc scope chưa hợp lý, ghi vấn đề để review; không sửa input frozen ngay.

Nhãn nháp, annotator conclusions, summaries, score, output parser/Neo4j/RAG/LLM và giao diện phương pháp được giữ ở luồng riêng trong giai đoạn này. Chỉ sử dụng các file được liệt kê trong gói R1 đã phát hành. Nếu đã đọc các nguồn đó hoặc nội dung trên repo công khai, ghi rõ; không gọi việc đọc sau đó là blind hoàn toàn.

## Ghi nhận AI hỗ trợ

AI có thể giúp tìm file, trích source/raw và tổ chức bảng. Người review kiểm lại bằng chứng đủ để chịu trách nhiệm nhận định, khai phần đã tự kiểm/kế thừa/chưa kiểm. Không cần tự thao tác mọi hash hoặc đọc mọi log, cũng không được ghi đã đọc phần chưa xem hoặc tạo timestamp hồi tố.

Yêu cầu hỗ trợ có thể dùng:

> Chỉ dùng gói R1 đã giao và hướng dẫn này. Tìm source, patch, fixture và raw; trích file:dòng hoặc request/log cụ thể. Tách quan sát, suy luận, behavior, repair, seed và hop. Không tìm thêm nhãn, summaries, prediction hoặc score của dự án. Giữ các phần thiếu bằng chứng là unresolved và nêu câu hỏi kiểm tra. Không quyết định hoặc ký thay người review.

Hash và template hoàn chỉnh chỉ giúp bảo toàn hồ sơ; chúng không chứng minh người thật đã đọc, tính độc lập hoặc nhận định đúng.
