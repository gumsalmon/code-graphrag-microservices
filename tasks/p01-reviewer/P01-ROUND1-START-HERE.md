# P01 — Hướng dẫn rà soát độc lập, lượt 1

Gói tài liệu dành cho việc rà soát một tình huống thay đổi API trên Spring PetClinic. P01 hiện là pilot, nhãn vẫn ở trạng thái `pending_review`; chưa có kết luận về hiệu quả tổng quát của GraphRAG.

## Mục đích và phạm vi

Đề tài nghiên cứu cách dự đoán ảnh hưởng của thay đổi mã nguồn trong hệ thống microservices. Phạm vi xem xét gồm method (hàm trong mã Java), API endpoint (đường dẫn giao tiếp của dịch vụ) và service (dịch vụ trong hệ thống).

Việc rà soát P01 nhằm xác định, từ source, patch và bằng chứng chạy thực tế, những thực thể có thay đổi hành vi, tuyến phụ thuộc liên quan và những điểm chưa đủ bằng chứng. Đây không phải yêu cầu sửa code hoặc nghiệm thu toàn bộ pipeline.

Lượt 1 ghi nhận nhận định độc lập, chưa đối chiếu với nhãn dự thảo. Lượt 2 sử dụng bản nhận định đã lưu để so sánh nhãn và ghi quyết định review. Buổi trao đổi có thể dùng để làm rõ các câu hỏi; quyết định cuối được xác nhận bằng văn bản.

## Tải và mở tài liệu

1. Bấm **[Tải P01-ROUND1-SOURCE-FIRST.zip](https://github.com/gumsalmon/code-graphrag-microservices/releases/download/p01-review-round1-20261005/P01-ROUND1-SOURCE-FIRST.zip)**. File khoảng 2 MB; nên mở trên máy tính để đọc source và log.
2. Nếu tải từ mục **Assets**, chọn đúng `P01-ROUND1-SOURCE-FIRST.zip`. Không chọn `Source code (zip)` hoặc `Source code (tar.gz)`: hai file đó là snapshot repository do GitHub tạo, có thể chứa nhãn và kết luận dự thảo.
3. Trên Windows, nhấp phải ZIP → **Extract All / Giải nén tất cả**. Chọn thư mục có đường dẫn ngắn, chẳng hạn `C:/P01/r1`. Trên macOS hoặc Linux, dùng công cụ giải nén có sẵn.
4. Mở **`ROUND1_READ_FIRST.md` trước** bằng Notepad, VS Code hoặc trình soạn thảo văn bản khác. File `.md` là văn bản; các ký hiệu `#`, dấu gạch và bảng dùng để định dạng nội dung.
5. Sao chép `INDEPENDENT_NOTES_TEMPLATE.md` ra ngoài thư mục gói, đặt tên `P01-independent-notes.md`, rồi điền vào bản sao. Giữ nguyên các file trong gói lưu trữ.

Không cần tài khoản GitHub, Docker hay Neo4j để tải và bắt đầu rà soát. Nếu chỉ đối chiếu log được cung cấp, ghi rõ phạm vi đó; chỉ ghi “tái lập độc lập” khi thực sự đã chạy lại và lưu bằng chứng mới. Khi cần chạy thêm để kết luận, có thể yêu cầu bổ sung hướng dẫn kỹ thuật.

## Nội dung gói

- `petclinic-source/`: source baseline đầy đủ tại commit cố định, không chỉ ba file được chọn sẵn.
- `petclinic-config/`: cấu hình upstream đúng revision.
- `evidence/`: snapshot Java, patch gốc và raw runtime baseline/mutated, gồm request, response, lệnh chạy, service log và các lần thử chẩn đoán.
- `mutation-readable.utf8.patch`: bản đổi encoding để đọc thuận tiện; nội dung patch không đổi và bản gốc vẫn được giữ.
- `ROUND1_READ_FIRST.md`: hướng dẫn chi tiết, vị trí bằng chứng và định nghĩa dùng khi rà soát.
- `INDEPENDENT_NOTES_TEMPLATE.md`: phiếu nhận định.
- `PACKAGE_METADATA.json`, `SHA256SUMS.txt`, `VERIFY_PACKAGE.ps1`: thông tin nguồn và công cụ kiểm tính toàn vẹn file.

Gói không chứa nhãn dự thảo, `summary.json`, báo cáo kết luận hay prediction/score của hệ thống. Fixture, tên request và ba snapshot Java do người chạy chuẩn bị, nên việc rà soát không hoàn toàn blind. Tên request không thay thế bằng chứng; kết luận cần dựa vào nội dung source và runtime. Dữ liệu PetClinic trong gói là dữ liệu mẫu.

## Trình tự rà soát

Đọc source và patch để xác định contract trước/sau và tuyến caller/callee. Tiếp theo, đối chiếu baseline, mutated và trường hợp đối chứng trong raw runtime; kiểm cả HTTP status và response body, cùng timestamp, image và discovery khi cần. Hướng dẫn trong ZIP chỉ rõ bản chạy chính, lần xác nhận và các lần chẩn đoán.

Ghi nhận định cho từng Method/API/Service, phân biệt seed, thay đổi hành vi và nhu cầu sửa mã. Với kết luận chưa đủ bằng chứng, ghi `unresolved` và lý do. Sau khi hoàn thành và bàn giao bản nhận định lượt 1 mới mở nhãn, summary, báo cáo, PR và output của parser/Neo4j/RAG để đối chiếu ở lượt 2.

Repository đã public nên thứ tự đọc dựa trên việc ghi nhận trung thực, không phải giới hạn truy cập. Nếu đã xem nhãn hoặc kết luận trước đó, ghi tài liệu và thời điểm tiếp xúc trong phiếu; không mô tả quá trình này là review blind hoàn toàn.

## Hồ sơ nhận định

Phiếu hoàn thành cần có người rà soát và quan hệ với dự án; phạm vi và tài liệu đã kiểm; nhận định kèm file:dòng hoặc request/timestamp/log; phần chưa đủ bằng chứng; thời điểm hoàn thành; công cụ và AI đã sử dụng. Người rà soát không đồng thời là người lập nhãn hoặc xây phần implementation được đánh giá.

Không đặt trước số lượng thực thể positive/negative và không yêu cầu nhận định phải khớp với dự thảo. Lưu phiếu, tính SHA-256 và bàn giao phiếu cùng hash, thời điểm trước khi nhận tài liệu lượt 2. Giữ bản gốc; bổ sung sau bằng file riêng. Hướng dẫn trong ZIP có lệnh tính hash. Hash kiểm byte file, không tự chứng minh thời điểm hay tính độc lập của nhận định.

AI có thể hỗ trợ tìm và trích bằng chứng, nhưng ở lượt 1 chỉ sử dụng gói này. Nhận định và xác nhận vẫn do người rà soát thực hiện; không dùng prediction/score làm ground truth. Mẫu yêu cầu cho AI nằm trong `ROUND1_READ_FIRST.md`.

## Kiểm tra file tải xuống

Tùy chọn: mở PowerShell tại thư mục tải file và chạy:

```powershell
Get-FileHash -LiteralPath ./P01-ROUND1-SOURCE-FIRST.zip -Algorithm SHA256
```

SHA-256 của ZIP:

```text
8c6edae950b7d36ec401ca25e53a0f83510536c99da507b3498d2a2a4370ada3
```

Sau giải nén, kiểm các file bên trong theo lệnh `VERIFY_PACKAGE.ps1` trong hướng dẫn. Checksum chỉ xác nhận tính toàn vẹn file, không thay thế review khoa học.

Bằng chứng benchmark được chốt tại commit `5f9204d66253604edf9101c2f888fc7e75aa0be7`, PetClinic `3858f9c630cf989bb6809a86edf47c2be78dc9f1`, config `323993ce2519c6d02df63e08bf4458d123d3b611`. Không tự chuyển sang head mới nếu repository có cập nhật. Lần cập nhật này chỉnh cách trình bày hướng dẫn và phiếu; source, patch và raw evidence không thay đổi. Việc đóng gói không chạy lại runtime.
