# Code GraphRAG — phân tích tác động thay đổi trong microservices

**[Bắt đầu review PetClinic P01–P03 tại đây](review/README.md).**

Hướng dẫn có đầy đủ source, patch, raw requests/responses/logs, mục lục đọc trực tiếp trên GitHub, ZIP tải về, checksum và mẫu hồ sơ review. Không cần cài Docker, Neo4j hoặc có API key để đọc bằng chứng.

Dự án nghiên cứu cách kết hợp cấu trúc mã nguồn, đồ thị phụ thuộc và truy xuất ngữ cảnh để phân tích tác động thay đổi giữa các dịch vụ. PetClinic là bước kiểm khả thi trước khi mở rộng hệ thống và thực nghiệm; chưa có kết quả so sánh chính thức cho bài báo.

Reviewer bắt đầu bằng lượt 1: đọc source/patch, ghi nhận định, đối chiếu runtime và lưu notes/exposure/checkpoint. Phần đối chiếu nhãn lượt 2 được cung cấp sau bước này. Nhãn hiện chưa được nghiệm thu. [Quy trình đầy đủ](review/README.md).

## Phần dành cho phát triển và điều phối

[Mã nguồn, tài liệu và bằng chứng kỹ thuật hiện hành](https://github.com/gumsalmon/code-graphrag-microservices/tree/codex/petclinic-review-20261105) được công bố ở nhánh review riêng. PR code cần được xem xét; việc cập nhật trang này không phải quyết định merge hoặc nghiệm thu nhãn.

Nhánh phát triển có PROJECT_CONTEXT, kế hoạch bài báo, implementation parser/importer đã kiểm, bộ chuẩn bị context, các prototype và hướng dẫn chạy/kiểm bằng chứng. Các runner runtime còn cần source/cache/image đúng pin; clone repo không tự cung cấp mọi binary hoặc tạo kết quả mới.

Tài liệu phát triển và các nhánh/PR lịch sử có nhận định, output hoặc nhãn đã biết. Trước khi lưu lượt 1, chỉ đọc phần review; nếu đã xem nội dung khác thì khai exposure thực tế. Repository public không bảo đảm blindness.
