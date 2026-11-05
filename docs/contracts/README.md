# Hợp đồng đầu ra đang thảo luận

[Bản nháp Method/API/Service v0.1](IMPACT_OUTPUT_CONTRACT.v0.1.DRAFT.md) đề xuất cách tách kết quả dự đoán, provenance, validation và dữ liệu đưa sang scorer. **Chưa áp dụng** vào parser, Neo4j, prompt, pipeline, viewer, benchmark hoặc scorer.

- [Đặc tả đọc chính](IMPACT_OUTPUT_CONTRACT.v0.1.DRAFT.md).
- [Bảng quy tắc máy đọc được](impact-output.v0.1.draft.json): đây là design manifest, **không phải JSON Schema hoặc validator production**.
- [Ví dụ tổng hợp](examples/impact-output.synthetic.json): chỉ dùng toy repository, không phải output P01/P02 hoặc nhãn benchmark.
- [Các câu hỏi cần Hiển/Phát thống nhất](REVIEW_CHECKLIST.v0.1.DRAFT.md): chưa có quyết định hoặc chữ ký điền sẵn.

Có thể gửi các tài liệu này như một đề nghị thiết kế sau khi thành viên xử lý task hiện tại; không thay gói đã giao, không yêu cầu họ tự chuyển sang schema mới. Không gửi kèm output hệ thống thật cho người lập nhãn trước bước độc lập.

Ngày 16/10/2026 có thêm [validator prototype offline](../../prototypes/impact-output-validator/README.md) theo yêu cầu của Huy, chỉ kiểm dữ liệu tổng hợp. Prototype chưa nối runtime/scorer, không phải schema production và không đóng D01–D08 hoặc phê duyệt áp dụng bản nháp này.
