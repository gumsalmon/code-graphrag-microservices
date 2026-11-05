# Hoàn thiện PetClinic trước review gộp

## Quyết định điều phối

Ngày 24/10/2026, Huy yêu cầu hoàn thiện P02 và các ca PetClinic còn lại, để bước reviewer nghiệm thu sau; review gộp PetClinic, xử lý phản hồi rồi mới mở hệ thống mới. Phạm vi PetClinic đã chọn/dự kiến là **P01, P02, P03**, không phải toàn bộ mọi endpoint hoặc mọi kiểu thay đổi trong repository. P04 là ứng viên Online Boutique và được lùi sau mốc PetClinic. Không đổi số scenario/hệ thống hoặc tuyên bố tổng quát hóa.

Điều chỉnh này thay mốc cũ “review sau P04”, không bỏ độc lập người lập nhãn/người review, nguồn bằng chứng, version/hash, hoặc các gate input/test/scoring. Không có lịch hoặc xác nhận reviewer mới được tự điền. Một đợt review gộp có thể cần nhiều vòng sửa, không hứa chỉ nhờ reviewer đúng một lần.

## Định nghĩa “sẵn sàng review”

Mỗi ca cần source/config/patch/fixture/universe có version và quyết định đầu vào; baseline/mutated/control và các giới hạn có raw/hash/lệnh/log; nhãn nháp do người thật lập độc lập, kèm evidence/alias/hop và unresolved; checksum khóa trước review. Nhãn vẫn `pending_review`, reviewer chưa ký và chưa có score chính thức. Hồ sơ kỹ thuật của phương pháp được giữ riêng khỏi packet annotator/reviewer source-first.

Phần triển khai cần có extraction/import/query/retrieval và output development theo task/contract đã thống nhất, test và giới hạn rõ; không coi 40 HTTP slots là toàn bộ pipeline GraphRAG đã xong. Chỉ mở output phương pháp cho development sau checkpoint version/hash của nhãn nháp theo protocol, không để annotator dùng prediction điều chỉnh nhãn. Model/cấu hình/ngân sách chưa chốt phải báo blocker cụ thể; yêu cầu này không cho phép tự gọi API, bật billing, chọn model thay hoặc chấm điểm.

## Việc được giao trước mắt cho Phát — P02

1. Tiếp nhận packet đã lọc, kiểm checksum. Đọc source/patch/input lock/protocol và raw; ghi exposure thực tế, không gọi blinded hoặc dựng checkpoint hồi tố.
2. Rà F03 từng ID/alias: bằng chứng nào là consumer E2E thật, targeted helper, fault intervention, hoặc còn thiếu. Lưu notes source-first thật và hash trước phần đối chiếu/tổng hợp. Không xem derived comparison, score hoặc evaluated-system outputs.
3. Nếu đủ để lập nhãn trong phạm vi đầu vào đã chốt, Phát được tạo **draft labels mới**, evidence manifest, unresolved và checksum; Huy/AI không điền polarity thay. Trường hợp thiếu bằng chứng vẫn unresolved, ghi yêu cầu bổ sung cụ thể, không ép negative hoặc sửa universe để bỏ ca khó.
4. Toàn bộ nhãn `pending_review`, annotator thật được khai; reviewer/decision chưa có giữ null. Không tự accepted, test lock hoặc official score. Không sửa file frozen để ghi nhận trạng thái mới.

Đây là mở phạm vi lập nhãn nháp cho Phát sau kiểm evidence, thay giới hạn “chưa lập nhãn” của lượt thu F03 trước, **không phải nhãn đã được lập hoặc đã đủ bằng chứng**. Nếu protocol/schema chưa đủ diễn đạt dữ kiện, đề nghị thay đổi có version trước áp dụng; không tự áp output-contract nháp hoặc sửa scorer chung.

## Trình tự PetClinic

- **P01:** bổ sung các phần kỹ thuật còn thiếu có bằng chứng, giữ nhãn pending_review và lỗi provider thật; không ghép response legacy vào request mới.
- **P02:** Phát rà F03/lập draft như trên; bên kỹ thuật tiếp tục task riêng phù hợp checkpoint, cách ly output với annotator.
- **P03:** còn ứng viên response-field rename; phải chốt operator, source/patch/fixture/universe riêng trước mutated/annotation. Không tự coi yêu cầu “hoàn tất PetClinic” là đã chấp thuận một patch hoặc census chưa được xem. Có thể chuẩn bị source audit/đặc tả, không mở mọi gate cùng lúc.
- **Review gộp P01–P03:** reviewer khác annotator đọc source-first notes rồi mới đối chiếu draft theo hai bước; chấp thuận/cần sửa/unable theo từng ca; giữ mọi bản cũ. Nhãn accepted, final test/split và scoring là các quyết định khác nhau. Các ca đã debug vẫn development.
- **Sau review:** xử lý phản hồi, ghi version/decision; chỉ khi Huy thống nhất checkpoint mới mở P04/Online Boutique. Không tự triển khai cloud hoặc thêm số ca không được chọn.

Không chặn mọi việc chỉ để đợi reviewer, nhưng không lờ blocker input/evidence/human attribution hoặc biến thiếu ngân sách thành fake output. Tiến độ phải báo từng ca và từng luồng, không gộp “PetClinic hoàn thành” khi chỉ xong HTTP runtime.
