# Giới hạn cần đọc cùng raw

- Đây là một scenario development trên PetClinic, không phải kết quả bài báo hoặc final test. Request matrix có 40 slot do lặp snapshot/repetition, không phải 40 scenario độc lập.
- Cùng fixture/config, consumer JAR không đổi; baseline binary là build đã kiểm ngày 15/10, provider mutated được build ngày 24/10. Java application tests bị skip trong Maven; không gọi build pass là Java suite pass.
- Setup dùng network nội bộ, DB in-memory theo nhóm, không publish port. POST cuối nhóm; readback và fault requests là hỗ trợ riêng, không trộn vào 40 slot.
- Targeted helper harness chạy class thật với HTTP fixture local, có gọi setter và áp dụng Function trả về. Không chứng minh setter được production flow gọi hoặc mọi helper được exercise ở mọi request; production E2E nằm ở group raw.
- Pause-provider fault là intervention bổ sung, không phải tác động của optional-query patch hoặc một nhãn tự xác nhận. Status/body và wiring/source cần được phân biệt với method-level tracing.
- Source/metadata hoặc URI equality không tự là behavioral label. Negative cần bằng chứng phù hợp miền/fixture/phạm vi và unresolved không được đổi thành negative.
- Header pairs là dữ liệu đã parse, không phải transcript wire byte-exact. Body files giữ bytes, thời gian/provenance có thể có đường dẫn máy cũ; không sửa raw để chuyển máy hoặc ép equality.
- Compiled JARs, target/cache/Git internals không nằm trong packet; giữ hash và omission. Manifest lịch sử vẫn nguyên byte; checker của packet xác minh phần có thật, không báo đã nhận đủ binary hoặc chạy lại runtime.
- Không kèm derived body-comparison, score, labels hay evaluated-system outputs. Packet vẫn có thiết kế/census/exposure đã biết; không bảo đảm blinding. Nhận định thật của người kiểm không thể được chứng minh chỉ bằng checksum.
- Bằng chứng gốc và các lần lỗi được giữ tại máy nguồn; packet chọn evidence run đạt cho annotation, không giả mọi lần triển khai đều thành công. Nếu cần log failure hay artifact bị loại, yêu cầu đúng file/hash thay vì tự dựng.
