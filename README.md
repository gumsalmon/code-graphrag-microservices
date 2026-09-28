# Code GraphRAG for Microservice Change Impact Analysis

Tài liệu bắt buộc đọc trước khi làm việc: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

## Hồ sơ giao việc hiện tại

- [Bảng điều phối của Huy](tasks/HUY_COORDINATION_CHECKLIST.md)
- [Audit đầu vào P01](tasks/P01_INPUT_AUDIT.md)
- [Task packet cho Phát](tasks/PHAT_P01_INDEPENDENT_BENCHMARK.md)
- [Task packet cho Hiển](tasks/HIEN_P01_NEO4J_E2E.md)
- [Quy tắc sử dụng task packet với AI](tasks/README.md)
- [Script tạo ZIP đầu vào đã lọc cho Phát](scripts/prepare_phat_p01_handoff.ps1)

Không coi một task là hoàn thành chỉ vì AI tạo được code, JSON, ảnh Neo4j hoặc báo test pass. Kết quả phải thỏa Definition of Done và có bằng chứng tái lập được ghi trong task packet tương ứng.

## Phạm vi hiện tại

Dự án nghiên cứu phân tích tác động thay đổi mã nguồn trong microservices bằng phân tích tĩnh, đồ thị phụ thuộc và truy xuất ngữ nghĩa. P01 hiện là pilot kiểm tra pipeline; chưa chứng minh hiệu quả tổng quát hoặc sự vượt trội so với Vector RAG.

Phần kiểm chứng Neo4j chạy theo đường: source tại commit cố định → parser chạy lại → JSON mới → Cypher mới → Neo4j cách ly cho từng baseline/mutated → truy vấn ngược 1-hop/2-hop. Acceptance kiểm tra đúng tập method, loại seed và từ chối method thừa, bao gồm overload `VisitResource.read(int)`.

Mọi Precision/Recall/F1 hiện có chỉ là **smoke test trên fixture/nhãn nháp**, không phải kết quả bài báo hay ground truth độc lập. Đường phụ thuộc không tự chứng minh tác động hành vi runtime. Các fixture P02–P04 trong lịch sử không có nghĩa đã được giao mở rộng P02; công việc hiện tại vẫn là review P01.

## Cài đặt và kiểm thử

Môi trường đã dùng: Python 3.11.9, dependencies trong [requirements.txt](requirements.txt), Docker và image Neo4j `5.26.0`. Cần Docker daemon hoạt động để chạy test live; xem tài liệu tái lập về model/cache Chroma.

```powershell
python -m pip install -r requirements.txt
python -m pytest tests/ -ra
```

Lệnh bàn giao đầy đủ, chạy từ checkout sạch; output phải nằm ngoài repository:

```powershell
python tools/run_p01_acceptance.py --source-root <PetClinic-checkout> --output-root <thu-muc-ngoai-repo>
```

PetClinic source phải ở commit `3858f9c630cf989bb6809a86edf47c2be78dc9f1`. Runner lưu command, exit code, log, JUnit, HEAD/trạng thái Git trước và sau, phiên bản và checksum. Số test và kết quả phải đọc từ JUnit của đúng SHA được review, không dùng số đếm cố định trong README. Không coi lượt chạy thiếu Docker hoặc có test skip là nghiệm thu live E2E đầy đủ.

## Tài liệu và bằng chứng P01

- [Cách chạy và giới hạn kiểm chứng E2E](P01_E2E_VERIFICATION.md)
- [Tái lập LF/CRLF và model/cache Chroma](P01_REPRODUCIBILITY.md)
- [Phân biệt hash Git blob với byte working tree](P01_HASH_PROVENANCE.md)
- [Bằng chứng lịch sử theo từng run](evidence/p01-e2e/README.md)
- [PR #1: SHA và log/JUnit/provenance bàn giao hiện hành](https://github.com/gumsalmon/code-graphrag-microservices/pull/1)

Log của lượt kiểm tra SHA cuối được đính kèm ở PR để tránh tạo commit mới làm thay đổi SHA vừa kiểm chứng. Chỉ kết luận trong phạm vi fixture, dependency và môi trường đã ghi; kiểm chứng runtime ứng dụng và đánh giá benchmark độc lập là các phần riêng.
