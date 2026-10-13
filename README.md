# Code GraphRAG for Microservice Change Impact Analysis

Tài liệu bắt buộc đọc trước khi làm việc: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

## Chạy pilot kỹ thuật P01

[Hướng dẫn P01 bằng một lệnh](pipeline/p01/README.md) ghi setup, lệnh chạy, đầu ra và giới hạn. Sau khi dependency/cache đã sẵn sàng:

```powershell
node scripts/run_p01_pipeline.mjs prepare
```

Luồng chạy mới parser → Neo4j và Chroma, chuẩn bị hai request Vector / Graph+Vector; không cần Gemini key, không gọi AI hoặc tự duyệt nhãn. [Demo bằng chứng](demo/p01/README.md) là viewer offline riêng; không phải toàn bộ pipeline live.

P01 vẫn `pending_review`. Kiểm chứng kỹ thuật hoặc API smoke không thay review độc lập, không mở P02–P04 hoặc chứng minh hiệu quả cho bài báo.

[Kiểm chứng kỹ thuật hiện tại](pipeline/p01/VERIFICATION_2026-10-13.md) bổ sung trạng thái triển khai mới. `PROJECT_CONTEXT.md` vẫn là nguồn định nghĩa/gate nghiên cứu; các mô tả kỹ thuật lịch sử trong đó không được dùng thay báo cáo chạy tại revision đã pin.

## Hồ sơ giao việc hiện tại

- [Bảng điều phối của Huy](tasks/HUY_COORDINATION_CHECKLIST.md)
- [Audit đầu vào P01](tasks/P01_INPUT_AUDIT.md)
- [Task packet cho Phát](tasks/PHAT_P01_INDEPENDENT_BENCHMARK.md)
- [Task packet cho Hiển](tasks/HIEN_P01_NEO4J_E2E.md)
- [Quy tắc sử dụng task packet với AI](tasks/README.md)
- [Script tạo ZIP đầu vào đã lọc cho Phát](scripts/prepare_phat_p01_handoff.ps1)

Không coi một task là hoàn thành chỉ vì AI tạo được code, JSON, ảnh Neo4j hoặc báo test pass. Kết quả phải thỏa Definition of Done và có bằng chứng tái lập được ghi trong task packet tương ứng.
