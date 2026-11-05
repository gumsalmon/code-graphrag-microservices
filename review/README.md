# Review PetClinic P01–P03

Mục tiêu của lượt này là kiểm tra bằng chứng và nhận định tác động của ba thay đổi mã nguồn trên PetClinic. Đây là các ca phát triển/pilot; chưa phải kết quả so sánh hiệu quả của bài báo. Chưa có quyết định nghiệm thu nhãn.

## Bắt đầu trên GitHub

1. Đọc [phạm vi ba ca](round-1/CASES.md) và [hướng dẫn lượt 1](round-1/START_HERE.md).
2. Tạo bản riêng từ [mẫu nhận định](round-1/NOTES_TEMPLATE.md), [khai báo exposure/AI](round-1/EXPOSURE_TEMPLATE.md) và [checkpoint](round-1/CHECKPOINT_TEMPLATE.md). Ghi phần thực sự đã kiểm; không cần đọc mọi log hoặc tự chạy ứng dụng.
3. Đọc source và patch để ghi nhận định ban đầu; sau đó đối chiếu raw requests, responses và logs. Các mục lục sau mở từng bằng chứng ngay trên GitHub:

| Ca | Mục lục đọc trực tiếp | Thay đổi được xét |
|---|---|---|
| P01 | [Source, patch và runtime](catalog/P01.md) | Thêm query parameter `includeDetails` bắt buộc ở Visits |
| P02 | [Source, registry, patch và runtime](catalog/P02.md) | `includeDetails` tùy chọn, mặc định `false` |
| P03 | [Source, registry, patch và runtime](catalog/P03.md) | Đổi khóa response `pets` thành `animals` ở Customers |

4. Với từng thực thể được xét, ghi căn cứ, điều kiện thử và giới hạn. Phân biệt thay đổi hành vi, nhu cầu sửa mã và hop. Thiếu bằng chứng thì ghi chưa thể kết luận; có đường gọi hoặc HTTP 200 chưa đủ kết luận.
5. Lưu nhận định, exposure và checkpoint trước khi nhận phần đối chiếu nhãn lượt 2. [Cách lưu và trả hồ sơ](round-1/HOW_TO_RETURN.md) giải thích chi tiết. Có thể trả bằng file hoặc PR riêng chứa hồ sơ, không sửa bộ bằng chứng gốc. Không cần approve PR code để hoàn thành lượt này.

Các liên kết trong mục lục dùng đường dẫn gốc để tra trích dẫn; payload lưu dưới tên hash trong `round-1/artifacts/`. Byte nguồn giữ nguyên. Khi raw JSON trỏ tới `body_file`, tìm tên đó trong mục lục cùng ca/snapshot. [EVIDENCE_INDEX.json](round-1/EVIDENCE_INDEX.json) là bảng ánh xạ đầy đủ.

## Nếu muốn tải về

- [Tải ZIP lượt 1](https://github.com/gumsalmon/code-graphrag-microservices/raw/refs/heads/main/review/downloads/PETCLINIC_R1_SOURCE_FIRST_2026-11-05.zip)
- [Checksum SHA-256](downloads/PETCLINIC_R1_SOURCE_FIRST_2026-11-05.zip.sha256)
- [Hướng dẫn kiểm toàn vẹn](round-1/VERIFYING.md)

SHA-256 của ZIP: `f0e1876e34a4f56cbf012403276569802396d1ee1956da2dc4fcd584084b3b2d`.

Giải nén rồi mở `INDEX.html` để tìm kiếm và đọc offline. GitHub hiển thị HTML dưới dạng mã, nên khi đọc ngay trên GitHub dùng các mục lục Markdown phía trên. Gói đọc bằng chứng không chứa cache/binaries để tái chạy toàn bộ ứng dụng.

## Ranh giới hai lượt

Lượt 1 chỉ có source, patch, fixture, phạm vi và raw evidence. Lượt 2 đối chiếu các nhãn nháp, notes của người lập nhãn và bất đồng; gói này giữ riêng tới sau khi nhận và lưu nhận định/exposure/checkpoint lượt 1 thật. Việc lưu hash không chứng nhận ai đã đọc, đọc lúc nào hoặc nhãn đã đúng.

Repository và các nhánh/PR khác có tài liệu phát triển, nhận định hoặc nhãn lịch sử. Chỉ đọc các đường dẫn trong mục này trước khi lưu lượt 1. Nếu đã xem phần khác, khai đúng exposure; không cần giả định reviewer chưa từng thấy kết quả. Quy trình đọc riêng không phải cơ chế hạn chế truy cập vào repo public.

Nếu dùng AI, chỉ cung cấp gói lượt 1 hoặc các đường dẫn thuộc mục này. AI hỗ trợ tra bằng chứng và tổ chức hồ sơ; người review kiểm và chịu trách nhiệm với nhận định của mình, không dùng output parser/Neo4j/LLM làm ground truth.
