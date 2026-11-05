# Bối cảnh kỹ thuật để làm song song

Mục tiêu dự án là bài tạp chí quốc tế về Code GraphRAG cho phân tích tác động mã nguồn microservices ở cấp Method/API/Service. P01–P03 PetClinic là development, không phải final test hoặc ba hệ thống độc lập. Bằng chứng/runtime và nhãn là luồng riêng với output phương pháp.

Hiển đã bàn giao P01 parser/Neo4j và baseline/audit P02. Lượt P02 trước được giới hạn ở baseline GET và rà tích hợp, nên việc dừng trước actual extraction/Neo4j đúng task. Không cần làm lại baseline đã đạt chỉ để báo tiến độ.

P02 hiện đã có runtime paired và helper evidence; phần người thật kiểm/quyết định draft còn thiếu. P03 đã chọn C03-A và baseline đạt, đang gửi kiểm phạm vi độc lập, chưa khóa input hoặc chạy mutated. Gói này không cấp quyền vượt các điều kiện đó.

Phần kỹ thuật làm ngay là sửa và kiểm parser/importer trên **fixture Java tổng hợp**. Kết quả kỳ vọng trong regression là cấu trúc cú pháp/phụ thuộc/contract, không phải nhãn CIA hoặc oracle của benchmark PetClinic. Không đọc labels, raw annotation return, prediction hoặc score của P02/P03 để sửa code. Chưa chạy actual extraction/graph/retrieval/output phương pháp trên hai ca thật ở lượt này.

Implementation tham chiếu đã kiểm: `e95613795133088621117179c9fb9592dab62b16`. Gói chỉ kèm ba Git blobs để tham khảo: parser, importer và requirements. Chúng không phải snapshot full repo. Nếu branch của Hiển có code mới, báo HEAD/diff và kết quả đối chiếu với pin trước khi tích hợp; không ghi đè công việc riêng hoặc coi pin cũ là HEAD mới nhất.

Giữ native JSON hiện hành. Hợp đồng Method/API/Service chung vẫn là nháp; không tự áp vào parser/Neo4j/scorer hoặc đổi hop/ID/snapshot schema. Nếu cần đổi, tách đề nghị có ví dụ/diff để thống nhất trước. Reachable, ảnh hưởng hành vi và cần sửa mã là các khái niệm khác nhau.

AI có thể hỗ trợ viết code/test, nhưng Hiển cần kiểm diff, lệnh, kết luận và khai AI assistance. Không gọi model, tải model, bật billing, push/merge hoặc thay nhãn trong task này. Gói kỹ thuật này không gửi sang Phát làm nguồn gán nhãn.
