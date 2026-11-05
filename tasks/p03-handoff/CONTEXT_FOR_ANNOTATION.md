# Bối cảnh cho nhiệm vụ benchmark

Đề tài nghiên cứu Code GraphRAG dự đoán tác động thay đổi trong microservices ở cấp Method/API/Service, hướng tới bài tạp chí quốc tế có phản biện. Chưa có kết luận GraphRAG tốt hơn baseline. P01–P03 là các ca development trên PetClinic; phạm vi chọn lọc không tương đương full-repo coverage hoặc tập test chưa từng thấy.

Huy/Hiển phát triển hệ thống. Phát lập nhãn nháp từ source, hợp đồng và runtime. Reviewer nghiệm thu sau này phải khác người lập nhãn; người xây phương pháp không tự tạo rồi tự duyệt ground truth. AI có thể tổ chức evidence và kiểm file/hash, không quyết định nhãn hoặc ký thay người thật.

P03/C03-A là mutation tổng hợp: chỉ handler Customers GET owner đổi response key top-level `pets` thành `animals` bằng boundary Map, cùng danh sách nguồn; không sửa shared entity/getter, consumer, cấu hình hoặc DB schema. Đó là mô tả patch, không phải kết luận tác động. Đọc source/raw để tự đánh giá hậu quả trong điều kiện fixture.

Input đã chốt: scenario 0.1.0, universe draft.v1, fixture v1, scope v1. PetClinic `3858f9c630cf989bb6809a86edf47c2be78dc9f1`; config `323993ce2519c6d02df63e08bf4458d123d3b611`. Universe có 27 Method/5 API/2 Service trước tách seed; eligible là 26 Method/4 API/1 Service, ba seed riêng, 34 aliases. Các cờ false trong candidate là lịch sử lúc chuẩn bị; D19/D20 là quyết định hiện hành, không được sửa cờ frozen để cập nhật tiến độ.

Đã có paired raw baseline/mutated × hai repetitions, bốn stack/DB riêng. 48 fixture slots, 68 collector requests và 24 support GET; polls health/registry không phải repetitions. Mỗi stack xuất phát từ fixture SQL pin, setup owner không pet và write-control owner bằng POST rồi lấy ID từ response/readback. Không giả ID mới luôn bằng 11/12. Lượt readiness cũ bị lỗi điều kiện của probe và được giữ trong hồ sơ kỹ thuật; paired v2 thay bằng health/registry, không sửa patch. ZIP này cung cấp raw lượt v2 đầy đủ, không cộng lượt lỗi vào repetitions.

Quy tắc khi lập nhãn:

- Có dependency không tự là ảnh hưởng hành vi; cần sửa mã phụ thuộc chiến lược sửa và phải ghi riêng. Không gán dương/âm cho toàn bộ methods chỉ từ một response endpoint.
- HTTP status cần đi cùng body/log và điều kiện gọi. Unchanged response không chứng minh helper/getter đã được chạy hoặc là negative trong mọi điều kiện.
- Hop và số lần vượt service dựa source/contract/evidence, không lấy từ graph đang đánh giá; seed không nhận impact credit.
- Thiếu bằng chứng có thể unresolved, có lý do và yêu cầu bổ sung cụ thể. Không đổi phạm vi để loại ID khó, không biến null/missing/confidence chưa biết thành negative hoặc 0.
- Đọc source/raw trước khi chốt nhận định; ghi AI assistance, nhận định đã thấy và phần chỉ kiểm tự động đúng sự thật. Không hồi tố giờ đọc hoặc tuyên bố blinded nếu đã biết gợi ý.
- Runtime benchmark được phép dùng làm bằng chứng; output phương pháp/parser/graph/retrieval/model/score không được dùng làm oracle. Sau checkpoint, output kỹ thuật được lưu ở luồng khác, không gửi cho annotator để chỉnh nhãn cho khớp.
- Giữ tất cả nhãn pending_review. Nhãn nháp version/hash mở checkpoint kỹ thuật có điều kiện, không tự là accepted, final-test lock hoặc quyền scoring.

Đây là bối cảnh lọc cho annotator theo PROJECT_CONTEXT và D20. Không chuyển toàn bộ coordinator context có kết quả các phương pháp vào phiên AI hỗ trợ lập nhãn. Nếu có exposure từ trước, khai rõ; bản bối cảnh lọc không xóa exposure đó.
