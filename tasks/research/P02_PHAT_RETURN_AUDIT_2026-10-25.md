# Kiểm gói Phát trả P02 F03 — 25/10/2026

## Kết luận điều phối

Đúng cặp ZIP/checksum trong ảnh và tin nhắn Huy cung cấp. Tiếp nhận được **nhãn nháp có AI hỗ trợ, đủ 12 ID**, vẫn pending_review; cấu trúc, input bindings và các tham chiếu đã kiểm đạt. Chưa đủ căn cứ xác nhận quy trình source-first độc lập của người thật đã hoàn tất, và bốn helper còn unresolved. Không đánh dấu P02 hoàn thành toàn bộ, không accepted/test/scoring hoặc tự mở output development từ lượt kiểm này.

Đây là audit kỹ thuật và chỉ ra giới hạn quy trình; AI không thay annotator hoặc reviewer. Không quyết định lại tám nhãn negative và không đổi bốn unresolved thành false.

## Đúng hai file và toàn vẹn

| File nhận tại E:/Zalo | Kích thước |
|---|---:|
| P02_PHAT_F03_RETURN_2026-10-25.zip | 172.482 byte, tương ứng khoảng 168,44 KiB trong ảnh |
| P02_PHAT_F03_RETURN_2026-10-25.zip.sha256 | 101 byte |

SHA-256 thực tế ZIP khớp sidecar: `dc35015abff8705e5d1ef60c86493fe7d860d9c1f9bc68446fac904271b229de`.

ZIP có 60 file, tổng 1.243.673 byte giải nén; 59 file được root manifest khóa và chính `SHA256SUMS.txt`. CRC đạt, không phát hiện đường dẫn thoát, trùng/case collision, symlink hoặc encryption. Scanner archive/text theo mẫu không có finding; đây không phải bằng chứng tuyệt đối không có dữ liệu riêng tư. Không thực thi script trong ZIP. ZIP nhỏ vì chứa hồ sơ return và tham chiếu tới packet gốc, không lặp toàn bộ raw/source/binary.

Bản nhận nguyên byte, bản giải nén và audit đặt riêng tại:

`handoff-out/p02-phat-return/20261025T092314Z-4ffb0796/`

`RECEIPT.json` ghi việc tiếp nhận. `audit_return.py` là checker do phía điều phối viết, chỉ đọc bản nhận/packet gốc; khác với các script do Phát gửi trong `received/audit/`. Kết quả tại `AUDIT.json`.

## Nội dung kiểm được

- Nhãn `labels.draft.v3.json`, SHA-256 `7d85eb6bb7bee9b7b138766ebd1a8deefd945a2a4bee8dc922f61f0a673e42cb`.
- Evidence manifest v5, SHA-256 `fea5a02e079701f626cebe3431b23d9100a6ac047b791225fbc53285ba22c075`.
- Đúng scenario 0.1.1, universe draft.v2, fixture v1, source/config/patch hashes đã chốt. Không có ID thừa/thiếu/trùng; labels, worksheet, manifest cùng 12 eligible IDs. Ba seed không lẫn vào nhãn; 15 alias tuples giữ nguyên.
- Đối chiếu 235 file được evidence manifest tham chiếu với packet gốc; 42 source spans/excerpt khớp dòng và hash. Label refs, notes/checkpoints/sidecars liên kết đúng.
- 48 primary observation entries trong các card khớp status/hash/full parsed body của raw. Các con số này lặp lại evidence giữa Method/API/Service, **không phải 48 thực nghiệm độc lập**. Tám cặp raw baseline/mutated thuộc POST, overload GET và gateway owner 6/owner 1 ở hai repetition dùng 16 record primary riêng; status và full JSON khớp khi chỉ bỏ khác biệt thứ tự object key. Không bỏ field hoặc sort array để ép khớp.
- Raw helper events được trích có thật trong event stream. Chưa chạy Java, Docker, POST, model hoặc thực nghiệm mới.
- Tám negative: R01/R02/R03/R04/R05/R08/R09/R12. Bốn unresolved: R06/R07/R10/R11. Đây là nhãn do gói khai, không phải AI duyệt chúng thành ground truth.
- `reviewer`, `review_decision` vẫn null; accepted/test/scoring false. Gói tự ghi `technical_evaluated_outputs_gate_opened_by_this_draft=false`, phù hợp việc chưa tự mở quyền bằng checksum.

Checker điều phối có 2.665 điều kiện kiểm đạt, không lỗi cơ học. Số điều kiện kiểm không phải số test khoa học, không đo tính đúng của kết luận annotator hoặc độ độc lập của con người.

## Những gì cần làm rõ hoặc bổ sung

### A. Bằng chứng về phần người thật đã kiểm

`EXPOSURE.v5.json` khai `blinded=false`, `strict_human_source_first_attested=false`, `runtime_independent_raw_read_confirmed=null`; AI đã hướng dẫn đọc và gợi ý polarity/rationale trước annotation. Notes gốc nói rõ người ghi là Codex, `human_notes_confirmed=false` ở checkpoint ban đầu. Trong khi đó labels/RETURN khai Phát là người chốt cuối.

Đây là khai báo giới hạn hữu ích, không chứng minh Phát chưa làm gì hoặc AI đã giả tên. Nhưng hiện chưa thể chứng nhận checkpoint source-first của người thật theo TASK_PHAT/D16 chỉ từ file/checksum. AI gợi ý nhãn trước người thật là nguy cơ neo nhận định cần giữ rõ trong hồ sơ. Mốc lưu file thật không tự chứng minh mốc người đọc đầu tiên.

Đề nghị Phát ghi **một phụ lục mới**, tham chiếu đúng hash draft.v3, ghi phần source/raw đã thực sự tự xem, quyết định giữ/đổi theo từng ID, căn cứ và những gì còn dựa vào AI. Nếu chưa tự đọc, đọc lại ở thời điểm thật và khai đã biết gợi ý AI. Không ghi lùi thời gian, không tự đổi `strict_human_source_first_attested` thành true, không dựng notes trước exposure. Phụ lục này làm rõ việc xác minh của con người sau exposure, không khôi phục một lượt blinded/source-first chưa diễn ra. Reviewer khác annotator vẫn cần bước source-first riêng ở đợt review gộp.

Không cần gửi toàn bộ lịch sử chat hoặc dữ liệu cá nhân để xác nhận. Nếu Phát đổi nhãn sau kiểm, tạo label version mới; giữ draft.v3, raw và notes cũ.

### B. Bốn helper chưa đủ kết luận

| ID | Method | Yêu cầu gói ghi |
|---|---|---|
| R06 | joinIds(List<Integer>) | RQ-H01: paired direct input/return và URI/identity, thay vì chỉ một helper event |
| R07 | setHostname(String) | RQ-H02: field trước/sau, target/request/response ở hai cấu hình, ghi đúng targeted scope |
| R10 | addVisitsToOwner(OwnerDetails) | RQ-H03: dùng Visits raw của mỗi snapshot, cùng owner/pets, thực sự apply Function và giữ full input/output |
| R11 | emptyVisitsForPets() | RQ-H04: paired direct subscription; chỉ cần callback correlation nếu muốn claim production branch |

Giữ unresolved hiện tại. Không mặc định tracing mọi method hoặc chạy lại 40 slots; cần thống nhất mức bằng chứng phù hợp phạm vi, ưu tiên phép đo nhỏ theo ID khi tiếp tục kỹ thuật. Helper unchanged binary/source và E2E là dữ kiện để người thật cân nhắc, không buộc một nhãn từ phía người xây hệ thống.

### C. Repair/confidence và phạm vi Service

`requires_code_change` unresolved cả 12 ID, repair strategy chưa chọn, confidence cả 12 là null. Gói khai đúng, không nên tự bịa để làm đủ cột. Phát cần bổ sung nhận định/lý do tương ứng khi hoàn thiện hồ sơ. Nhãn Service R12 chỉ dựa trên interface/fixture được chọn trong phạm vi; không suy rằng toàn bộ route của api-gateway đã được thử.

### D. Original ZIP và tính di chuyển

RQ-P01 ghi ZIP gốc không có tại đường dẫn máy Phát lúc kiểm. Phía Huy có nguyên ZIP đã gửi và đã rehash đúng `e879fed6cc4e1ab9da5584d3387b14d05512b55f73db00581c4cc4329d127b77`; root manifest cũng khớp `4c493b6d42f96784e9eec71ce46cb73e43f5a4386d277ef1d099a5d18cb5badb`. Có thể ghi bổ sung audit ở máy Huy, không sửa lời khai lịch sử trên máy Phát. Không cần Phát chạy lại annotation vì thiếu ZIP gốc tại đường dẫn đó.

Card Markdown có link tuyệt đối `D:/...` từ máy Phát; JSON refs vẫn tương đối với packet riêng. Khi chuẩn bị review gộp cần index/adapter đường dẫn ngoài gói frozen hoặc gói review mới, kèm packet nguồn đã lọc. Không sửa bản return để làm link trỏ sang máy Huy. Việc Phát chưa push đúng phạm vi task, không phải lỗi bàn giao.

## Bước tiếp theo

1. Tiếp nhận bản return làm checkpoint draft có AI hỗ trợ, bảo toàn hashes; gửi nhận xét bổ sung về phần người thật và các trường còn thiếu.
2. Chuẩn bị phép đo nhỏ cho bốn helper theo yêu cầu cụ thể; chỉ chạy khi phạm vi/quyền phù hợp, không sửa nhãn thay Phát. Phát cập nhật bằng version mới nếu kết luận đổi.
3. Sau khi làm rõ điều kiện nhân sự/source-first/exposure, ghi trạng thái checkpoint đáp ứng tới đâu; chưa tự mở output P02 từ lượt kiểm này. Reviewer nghiệm thu vẫn theo mốc gộp PetClinic.
4. P03 hiện vẫn candidate, chưa được Huy chọn/chốt input hoặc được Phát xác nhận census; bàn giao P02 không tự cấp quyền P03. P04 vẫn lùi sau review PetClinic.

Không commit/push/merge, không thay source/raw/gói frozen hoặc tự ký review. PROJECT_CONTEXT và status mới chỉ ghi nhận kết quả audit, không phải quyết định nghiệm thu.
