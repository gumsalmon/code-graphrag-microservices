# P02 — đề nghị rà độ đầy đủ bằng chứng F03, chưa lập nhãn

**Đã được thay thế về phạm vi giao việc:** sau yêu cầu hoàn tất PetClinic trước review gộp (D16), dùng [tin nhắn/gói mới](SEND_PHAT_F03_DRAFT_2026-10-24.md). Phát được lập draft có điều kiện sau notes/evidence assessment; nội dung dưới giữ lịch sử của lượt chỉ thu/rà F03, không gửi thay task mới.

Đây là tin nhắn soạn sẵn, **chưa gửi**. Các đường dẫn bên dưới đang local/Git ignored; không chỉ gửi URL repo rồi nói Phát đã có raw. Cần cung cấp bundle được lọc/kiểm đủ trước khi gửi thật. Không gửi dự đoán/parser/Neo4j/model/score làm oracle; lượt F03 này không sinh những output đó.

---

Mình đã chốt đầu vào P02 đúng scenario 0.1.1/universe draft.v2/fixture v1 sau phiếu kiểm của bạn tại 187c4d8, và thu xong lượt runtime F03 có AI hỗ trợ. Nhờ bạn rà **độ đầy đủ và giới hạn bằng chứng**, chưa lập/gán polarity hoặc duyệt nhãn.

Run `20261024t103954400z-989f2a57`: 40 fixture slots thật, bốn nhóm DB mới, POST cuối và readback; kiểm reset, config/registry/consumer unchanged và cleanup. Thêm bốn fault probes ngoài matrix và targeted Java helper harness chạy class từ JAR gateway gốc. Harness có fixture HTTP local, không phải microservice E2E hay chứng minh setter được production flow gọi. Raw request/body/status/headers/log/hash và code snapshots đã giữ; các lỗi phát triển trước run đạt vẫn được lưu.

Đọc input lock, source/patch tại pin và raw trước; đối chiếu từng ID/alias trong universe. Với helper/setter/fallback, nêu bằng chứng nào là targeted, bằng chứng nào là consumer thật, phần nào chưa đủ hoặc ngoài phạm vi. Không tự gọi F03 resolved cho mọi ID từ một câu “40/40”. Nếu cần bổ sung, chỉ rõ ID, bằng chứng thiếu, phép đo và tiêu chí đạt; không lấy prediction hoặc body equality làm ground truth.

Kết quả cần bàn giao: file ghi chú riêng có tên/ngày thực tế, version/hash đã đọc, exposure và phần AI hỗ trợ; bảng ID/evidence đủ/chưa đủ/unresolved, bất đồng và giới hạn. Chỉ kết luận về evidence readiness. Chưa lập nhãn, chưa accepted/test lock/scoring. Không sửa raw hoặc phiếu cũ; không dựng source-first checkpoint hồi tố.

---

Nguồn local cần đóng gói/lọc khi được giao gửi: run đạt và audit `handoff-out/p02-f03-audit/20261024t103954400z-989f2a57/`, input candidate frozen, quyết định riêng, source/config/patch tương ứng và báo cáo `tasks/research/P02_F03_RUNTIME_2026-10-24.md`. Không cần gửi JAR/cache/build tree để đọc evidence; nếu bỏ file đang có trong manifest phải khai rõ omission và giữ checksum gốc. ZIP điều phối ngày 18/10 không có kết quả F03 mới.
