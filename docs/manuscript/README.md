# Bản thảo phương pháp và căn cứ

Ngày 01/11/2026. Đây là tài liệu làm việc của nhóm viết bài, chưa phải manuscript hoàn chỉnh hoặc nội dung gửi reviewer nhãn.

- [Methods working draft bằng tiếng Anh](METHODS_WORKING_DRAFT_2026-11-01.md): phần đã triển khai/kiểm có giới hạn và phần evaluation còn đề xuất được tách rõ.
- [Bảng nối phát biểu với bằng chứng](EVIDENCE_MAP_2026-11-01.md): phạm vi chứng minh, giới hạn và việc cần làm trước công bố.
- [Snapshot identity của nguồn](sources.snapshot.json): path/hash byte thực hoặc Git object đã pin; không là quyết định nghiệm thu.

Có thể phát triển phần mô tả bài toán, scenario, nguồn bằng chứng, quy tắc graph và ranh giới đánh giá từ bản này. Cần cập nhật khi nhận return hoặc quyết định mới. Những đoạn evaluation mang thì tương lai không được đổi sang quá khứ trước khi thí nghiệm thật đã hoàn tất. Giữ các nguồn/hash cũ khi tạo version mới.

Phần còn phải xác nhận: contract/scorer/failure policy, triển khai các baseline còn thiếu, model/token/call budget, campaign/split đủ rộng, review nhãn thật, phép phân tích thống kê và artifact công bố. Không có F1/Ragas/CI/p-value hoặc kết luận GraphRAG tốt hơn baseline để đưa vào Results hiện tại.

Tài liệu chứa nhận định điều phối, tình trạng nhãn và output kỹ thuật nên giữ riêng khỏi các lượt source-first/label-comparison. [Khung review gộp](../../tasks/petclinic-review-draft/COORDINATOR.md) có tài liệu riêng theo vai trò. Không gửi cả workspace hoặc bản Methods cho reviewer trước khi khóa nhận định/nhãn tương ứng.

Trong lượt soạn: chỉ đối chiếu hồ sơ/code/raw identity hiện có; không rerun application/model hoặc đọc nhãn làm đáp án dự đoán. Các trích dẫn E01–E12 là references nội bộ có scope, chưa thay bộ tài liệu tham khảo học thuật hoặc artifact phát hành của bài tạp chí. Venue/chỉ tiêu phân hạng vẫn chưa chọn.
