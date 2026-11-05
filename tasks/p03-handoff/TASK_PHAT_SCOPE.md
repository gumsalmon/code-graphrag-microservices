# P03 — kiểm nguồn, fixture, census và alias

Đầu ra cần đạt là một phiếu kiểm do người thật quyết định: bộ đầu vào đang đề nghị có đủ rõ/nhất quán để đề nghị chốt hay cần sửa điểm nào. Không yêu cầu code parser, Neo4j, lập nhãn hoặc chạy model.

## Đầu vào

`candidate/` là gói frozen đầy đủ, gồm source/config, patch, fixture, scope, inventory, universe, alias và protocol. D18 ghi lựa chọn của Huy riêng trong `decisions/`. `provenance/INPUTS.json` và `provenance/BASELINE_INDEX.json` liên kết đúng phiên bản/hash và raw baseline. Không coi các báo cáo/checker của phía chuẩn bị là oracle cho nhận định độc lập.

## Các việc cần kiểm

1. **Operator và tính cô lập source.** Đọc `OwnerResource.java`, patch và bản đề nghị sau áp. Kiểm đúng GET owner bị đổi, nguyên consumer/shared entity/config/SQL. Không kết luận mutation runtime thành công từ patch/source hoặc baseline.
2. **Census trực tiếp từ sáu top-level class/record.** `OwnerResource`, `Owner`, `CustomersServiceClient`, `OwnerDetails`, `ApiGatewayController`, `VisitsServiceClient`. Tự liệt kê các explicit method/mapping trước khi dựa vào đếm tổng của proposal; ghi tên file/dòng. Rà constructor, record component/accessor, nested builder và package-private setter để không bỏ hoặc tính nhầm. Các source support khác phải có vai trò/exclusion rõ.
3. **Đối chiếu ID/seed/scope.** So với `candidate/draft/inventory.v1.json` và `candidate/draft/evaluation_universe.draft.v1.json`: tất cả ID đề nghị, ba seed và tất cả alias, không chỉ phần dự kiến bị ảnh hưởng. Kiểm uniqueness, service/FQN/signature/HTTP path, loại seed đúng và không thiếu API/Service trong phạm vi đã chọn. Đánh giá giới hạn coverage có hợp lý với câu hỏi nghiên cứu development hay cần version mới.
4. **Fixture và control.** Từ SQL/source, kiểm primary owner/pets/visits và phân biệt owner có pet nhưng không visits với owner không pet. Rà setup POST tạo owner rỗng, ID lấy từ actual response/readback, request order, POST/PUT đối chứng cuối lượt, reset DB và readbacks. Baseline raw ở cả hai group cho biết những trường hợp nào khả thi; chưa là bằng chứng mutation hoặc nhãn âm.
5. **Ref/hash/provenance.** Kiểm source/config pin, patch/fixture byte hashes, alias/evidence refs resolve tại candidate root, metadata/raw/body hash và bindings baseline. Nếu chỉ dùng verifier hoặc summary thì khai mức kiểm đó. Các JAR/TAR bị loại có khai là giới hạn replay trên máy nhận, không phải bằng chứng đã rebuild/replay.

## Bàn giao và Definition of Done

- Notes ghi source/raw thực sự người kiểm đã mở, kết luận theo phần việc và exposure/AI hỗ trợ; phần chưa xem giữ chưa xác nhận. Không có chữ ký/giờ đọc do AI tự điền.
- Bảng đối chiếu đủ eligible ID, seed, alias và exclusions; mismatch ghi file/dòng/ref cùng đề nghị sửa cụ thể. Có thể xuất bảng máy đọc được, nhưng mọi tick/check tự động cần phân biệt với nhận định người kiểm.
- Kết luận chọn một: **đủ điều kiện đề nghị chốt**, **cần sửa**, **chưa đủ căn cứ**. Ghi danh sách file/version/hash áp dụng; phần chưa xác định và giới hạn không bị che.
- Return ngoài packet, giữ input/raw/notes đã lưu nguyên byte; kèm logs/exit của lệnh thực sự chạy và SHA-256 các file return. Có thể gửi phụ lục ngắn trước, không cần lặp nhiều vòng ZIP chỉ để hoàn thành format.
- Không có nhãn P03, polarity, score hoặc lời xác nhận input đã khóa/reviewer đã duyệt. Phiếu kiểm này chỉ là đề nghị cho Huy quyết định tiếp.

Có sẵn ba mẫu ở `templates/`. Người thực hiện có thể dùng format khác nếu vẫn đáp ứng đầu ra trên. AI được hỗ trợ tổ chức file, giải thích code, kiểm hash/ref; người phụ trách phải trực tiếp kiểm và quyết định phần được khai là của con người. Chưa hoàn tất phần này thì ghi chưa đủ căn cứ, không tạo một xác nhận độc lập bằng việc cho AI chạy hết checklist.
