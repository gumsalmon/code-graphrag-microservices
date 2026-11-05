# Bối cảnh cho lượt kiểm phạm vi P03

Đề tài nghiên cứu Code GraphRAG dự đoán tác động của thay đổi mã nguồn giữa các microservice, ở ba cấp Method, API và Service. Đích công bố là bài tạp chí quốc tế có phản biện; chưa có kết luận GraphRAG tốt hơn baseline hoặc số liệu chính thức.

P01–P03 là các ca development trên PetClinic để kiểm kỹ thuật và chuẩn bị benchmark; cùng họ repository/owner-details, không phải ba hệ thống độc lập hoặc final test chưa từng thấy. Kế hoạch hiện hành là hoàn thiện các ca này tới mức sẵn review gộp, sửa theo phản hồi rồi mới quyết định mở Online Boutique/P04.

Phía triển khai chuẩn bị scenario và thu raw. Phát phụ trách kiểm bằng chứng/phạm vi độc lập và công việc nhãn theo từng task. Người xây hệ thống không tự tạo rồi tự nghiệm thu ground truth. Nếu sau này Phát lập nhãn thì reviewer nghiệm thu là người khác. Lượt hiện tại chỉ kiểm đầu vào, không cần reviewer nghiệm thu nhãn hoặc chờ phương pháp dự đoán.

P03 C03-A đề nghị đổi response key `pets` thành `animals` chỉ ở Customers `GET /owners/{ownerId}`. Patch đổi một handler sang boundary Map, giữ scalar fields và list nguồn; không sửa shared Owner getter/entity, consumer, cấu hình hoặc DB schema. Đây là mutation tổng hợp. Source isolation chưa chứng minh nested serialization/Optional/control behavior của mutated; cần phép đo sau quyền phù hợp.

Source pin PetClinic: `3858f9c630cf989bb6809a86edf47c2be78dc9f1`. Config pin: `323993ce2519c6d02df63e08bf4458d123d3b611`. Protocol v0.2 nguyên byte tại `candidate/protocol/benchmark_protocol_v0.2.md`. Phiên bản đang đề nghị: scenario 0.1.0, fixture v1, scope v1, universe draft.v1. Hash cụ thể ở `provenance/INPUTS.json` và manifest candidate.

Huy đã chọn ca và cho build/kiểm baseline sandbox ngày 28/10. Baseline có hai group DB mới; mutated chưa build/chạy. Scope/universe chưa được kiểm độc lập hoặc khóa. Không tự biến kết quả baseline, checksum hoặc sự đồng ý của AI thành xác nhận kiểm phạm vi của con người.

Các quy tắc cần giữ khi kiểm:

- Seed method/API/service được lưu riêng khỏi impact credit; ID cần đủ repository/snapshot/service/class/signature hoặc HTTP method/path, phân biệt overload.
- Phụ thuộc cấu trúc, ảnh hưởng hành vi và cần sửa mã là ba vấn đề khác nhau. Đường đi không tự chứng minh tác động; unchanged HTTP response không chứng minh mọi helper/getter được thực thi.
- Phạm vi phải được xác định trước nhãn, không cắt bớt ID khó để có điểm đẹp; không tự mở rộng thành full-repo coverage. Support source có thể chỉ là evidence, không mặc định thành scored entities.
- Các loại trừ constructor/nested builder/synthetic/lambda/implicit record methods phải rõ và hợp lý. Nếu cần đổi để phù hợp mục tiêu thì ghi đề nghị/version mới trước khóa; không sửa bản frozen.
- Kiểm alias baseline/mutated từ source/patch; không dùng đồ thị đang đánh giá. Evidence refs của candidate resolve tương đối với **gốc candidate/**.
- Thiếu bằng chứng ghi chưa xác định. Không gán polarity, confidence hoặc nhãn repair ở lượt này. Nhận xét của AI phải được phân biệt với phần người thật trực tiếp đọc và quyết định.
- Ghi ngày thực tế, exposure/gợi ý AI đã biết, phần chỉ kiểm tự động và giới hạn. Không ký thay con người, dựng notes source-first hồi tố hoặc giả blinded.
- Không xem output parser/Neo4j/retrieval/model/predictions/scores để quyết định phạm vi; không sửa protocol/schema/scorer dùng chung trong lượt kiểm.

Tài liệu này là bản bối cảnh đã lọc cho đúng vai trò, thay việc chuyển toàn bộ `PROJECT_CONTEXT.md` có thông tin nhãn/kết quả các ca khác. Các ranh giới được rút từ PROJECT_CONTEXT v0.16 và D18; không phải quyền mới hoặc thay đổi protocol. Mâu thuẫn cần được nêu trong phiếu kiểm, không tự giải quyết bằng sửa input.
