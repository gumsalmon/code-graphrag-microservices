# Code GraphRAG for Microservice Change Impact Analysis

**Review PetClinic P01–P03: bắt đầu tại [hướng dẫn lượt 1](review/README.md).** Có thể đọc source, patch và raw evidence trực tiếp trên GitHub hoặc tải ZIP. Không cần Docker hay API key để review.

Các phần bên dưới dành cho điều phối/phát triển, có nhận định đã biết và kết quả kỹ thuật. Reviewer chưa lưu nhận định lượt 1 nên dùng riêng đường dẫn review ở trên; nếu đã xem tài liệu khác, ghi exposure thực tế. Repo public không bảo đảm blindness.

Tài liệu bắt buộc đọc trước khi làm việc: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

[Bàn giao toàn dự án ngày 18/10/2026](FULL_PROJECT_CONTEXT_2026-10-18.md) dành cho AI điều phối tiếp nhận mục tiêu bài tạp chí, lịch sử quyết định, bằng chứng, checkpoint và phần chưa hoàn tất. Đây là snapshot ngữ cảnh, không phải nghiệm thu nghiên cứu hoặc gói source-first cho reviewer.

## Chạy pilot kỹ thuật P01

[Hướng dẫn P01 bằng một lệnh](pipeline/p01/README.md) ghi setup, lệnh chạy, đầu ra và giới hạn. Sau khi dependency/cache đã sẵn sàng:

```powershell
node scripts/run_p01_pipeline.mjs prepare
```

Luồng chạy mới parser → Neo4j và Chroma, chuẩn bị hai request Vector / Graph+Vector; không cần Gemini key, không gọi AI hoặc tự duyệt nhãn. [Demo bằng chứng](demo/p01/README.md) là viewer offline riêng; không phải toàn bộ pipeline live.

P01 vẫn `pending_review`. Kiểm chứng kỹ thuật hoặc API smoke không thay review độc lập hoặc chứng minh hiệu quả cho bài báo. Theo quyết định ngày 15/10/2026, được chuẩn bị/phát triển P02–P04 trước một đợt review gộp; chưa cho phép nghiệm thu nhãn, khóa final test hoặc chấm chính thức.

[Kiểm chứng kỹ thuật hiện tại](pipeline/p01/VERIFICATION_2026-10-13.md) bổ sung trạng thái triển khai mới. `PROJECT_CONTEXT.md` vẫn là nguồn định nghĩa/gate nghiên cứu; các mô tả kỹ thuật lịch sử trong đó không được dùng thay báo cáo chạy tại revision đã pin.

## Hồ sơ giao việc hiện tại

- [Hồ sơ P01: đã kiểm gì và còn thiếu gì](tasks/P01_CLOSEOUT.md)
- [Kế hoạch P02–P04 và các checkpoint](tasks/P02_P04_EXECUTION_PLAN.md)
- [Task packet P02–P04 cho Hiển, Phát và Huy](tasks/P02_P04_TASK_PACKETS.md)
- [Sổ P02 đã chọn để chuẩn bị; P03–P04 còn ứng viên, chưa khóa test](tasks/P02_P04_RESEARCH_REGISTER.json)
- [P02 đã chọn: patch, fixture và phạm vi dự thảo](benchmark/p02/README.md)
- [P02: build offline và baseline thật, chưa mutated/nhãn](pipeline/p02/README.md)

Các packet dưới đây giữ đặc tả bàn giao P01 ban đầu; trạng thái hiện tại theo hồ sơ P01 và PROJECT_CONTEXT, không giao lại như chưa làm:

- [Bảng điều phối của Huy](tasks/HUY_COORDINATION_CHECKLIST.md)
- [Audit đầu vào P01](tasks/P01_INPUT_AUDIT.md)
- [Task packet cho Phát](tasks/PHAT_P01_INDEPENDENT_BENCHMARK.md)
- [Task packet cho Hiển](tasks/HIEN_P01_NEO4J_E2E.md)
- [Quy tắc sử dụng task packet với AI](tasks/README.md)
- [Script tạo ZIP đầu vào đã lọc cho Phát](scripts/prepare_phat_p01_handoff.ps1)

Không coi một task là hoàn thành chỉ vì AI tạo được code, JSON, ảnh Neo4j hoặc báo test pass. Kết quả phải thỏa Definition of Done và có bằng chứng tái lập được ghi trong task packet tương ứng.
