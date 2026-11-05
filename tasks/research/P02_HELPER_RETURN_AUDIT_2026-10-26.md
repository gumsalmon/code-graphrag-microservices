# Tiếp nhận và kiểm gói rà helper P02 — 26/10/2026

Gói toàn vẹn, các tham chiếu và quan sát helper khớp bằng chứng đã gửi. Tiếp nhận làm **phụ lục rà bằng chứng do AI thực hiện**, chưa phải quyết định nhãn mới của Phát hoặc nghiệm thu của reviewer. Không có cơ sở báo P02 đã đủ 12 negative hay hoàn tất toàn bộ.

## Bản nhận và kiểm độc lập

Hai file Huy gửi đúng tên trong ảnh: `P02_HELPER_REVIEW_RETURN_2026-10-25.zip` (264.915 byte, khoảng 258,71 KiB) và `.zip.sha256` (106 byte). SHA-256 thực tế ZIP khớp sidecar:

`0f58dcdcaa90ef9d431cfb47eb661fae2b0caa5313ac9cdc3be8ff0d1319faf0`

Bản nhận nguyên byte, giải nén an toàn và audit đặt tại:

`handoff-out/p02-helper-review-return/20261026T051209Z-0b0f805b/`

Đọc `received/RETURN_PHAT.md` trước. ZIP có 49 file, tổng 1.507.763 byte giải nén; 48 file được root manifest khóa và chính manifest. CRC, tên/đường dẫn, trùng tên kể cả khác hoa thường, loại file và encryption đã kiểm. Scanner theo mẫu không có finding; không coi đó là bảo đảm tuyệt đối không có dữ liệu riêng tư. Không chạy code/script Phát gửi.

`audit_return.py` ở ngoài `received/` là checker phía điều phối. `AUDIT.json` ghi 7.766 điều kiện cơ học đạt, 0 lỗi; đây không phải số thực nghiệm hay số quyết định nhãn:

- Kiểm manifest của return mới 48 file, helper packet gốc 2.121 file, F03 gốc 2.203 file và return trước 59 file. Tập file thực tế khớp, không có file không được khai.
- Đối chiếu 636 cặp root/path khác nhau và 34 span source/event; đường dẫn máy Phát được ánh xạ sang các root đã định sẵn trên máy Huy, không mở đường dẫn tùy ý do tài liệu cung cấp.
- Scenario/universe/fixture/patch, source/config, build/JAR/image bindings khớp plan runtime đã khóa. ZIP helper gốc và root manifest cũng khớp hash đã gửi.
- Checkpoint khóa đúng năm file phase1. 55 receipt đọc trực tiếp và 604 receipt kiểm máy phase2 có hash/size khớp và thứ tự thời gian khai báo nhất quán với checkpoint AI. Việc này **không chứng nhận độc lập rằng người thật đã đọc**, hoặc xác thực thời gian thực tế ngoài hồ sơ.
- Bốn nhóm baseline/mutated × hai lần lặp: mỗi nhóm đúng 10 event; metadata/hash/size/status của 12 raw GET, input/return helper, URI/decoded response, projection, Function input/output và direct fallback return đều khớp. So sánh full JSON giữ nguyên thứ tự array; không dùng equality thay quyết định nhãn.
- Toàn bộ byte ở bốn root đầu vào không đổi sau audit. Không chạy Docker/Java/HTTP/POST, gọi model, scoring hoặc Git mutation.

## Gói mới chứng minh được tới đâu

| ID | Bằng chứng kiểm được | Giới hạn cần giữ |
|---|---|---|
| R06 `joinIds` | Bốn group ghi input `[7,8]`, return String `7,8`, URI kế tiếp dùng `petId=7%2C8` | Không bao phủ mọi list/null/empty hoặc tự xác định hop |
| R07 `setHostname` | Field trước/sau, GET tới provider thật, status 200 và DTO bốn visits khớp raw provider | Harness gọi setter; không có production setter caller trace. Raw provider GET riêng, không phải wire capture của chính WebClient |
| R10 `addVisitsToOwner` | Function được apply thật; full input từ raw từng group; pet 8 nhận visits 2/3, pet 7 nhận 1/4; full output bằng gateway parsed body | Projection chỉ bỏ `pets[].type.id`, đã khai/lưu raw; constructor thêm visits rỗng. Không coi decoder harness là production, không suy idempotence/mọi input |
| R11 `emptyVisitsForPets` | Gọi rồi subscribe trực tiếp trả `{"items":[]}` ở bốn group | Chưa có production callback trace hoặc chứng cứ mutation kích hoạt fallback |

Các đề nghị negative có căn cứ quan sát **trong phạm vi phép đo đã khai**. Đây không tự chuyển thành nhãn của evaluation universe. Người lập nhãn cần quyết định mức bằng chứng có đáp ứng định nghĩa tác động P02 đã chốt hay không; nếu chỉ đủ cho claim hẹp thì ghi giới hạn hoặc giữ unresolved. Không đổi universe/định nghĩa tác động để hợp thức hóa một đề nghị.

Không thấy lý do phải chạy lại full matrix hoặc buộc thêm trace production để xét riêng các phép gọi trực tiếp mà RQ-H01–H04 đã yêu cầu. Nếu muốn khẳng định production setter/callback đã chạy hoặc thay đổi cách kích hoạt, phải có bằng chứng tương ứng. Lượt decoder lỗi và projection v2 được giữ/khai, không được tính lỗi harness thành tác động mutation.

## Nhãn và phần người thật còn thiếu

`prior/labels.draft.v3.json` và `prior/evidence_manifest.v5.json` giống nguyên byte với return trước:

- Draft.v3 SHA-256: `7d85eb6bb7bee9b7b138766ebd1a8deefd945a2a4bee8dc922f61f0a673e42cb`.
- Manifest v5 SHA-256: `fea5a02e079701f626cebe3431b23d9100a6ac047b791225fbc53285ba22c075`.
- Manifest supplement.v1 mới: `cbede0be480d6246851a9efadb545f3db49ec41a29231c4d7d29fd97a1456122`.
- Assessment đề nghị v1 mới: `0b89b265a66610e36481b7fe655df48649356455cbfe3335463b4dffc7cc6e8c`.

Nhãn hiện hành vẫn **8 negative / 4 unresolved**, đủ 12 ID, `pending_review`; không có draft.v4. `RETURN_PHAT.md`, phụ lục, exposure và assessment đều nói rõ người đọc/soạn lượt bổ sung là **Codex AI**; Phát chưa được xác nhận đã đọc gói mới hoặc chấp nhận đề nghị. Template người thật chưa điền. Đây là khai báo đúng giới hạn, không phải bằng chứng Phát chưa từng làm phần việc trước.

Tám ID còn lại không được rà lại ở supplement. Giới hạn về xác nhận phần source/raw Phát trực tiếp đọc của hồ sơ trước vẫn còn. Repair giữ unresolved và confidence null với lý do; không ép điền số hoặc suy từ behavioral negative.

Không thể dùng checkpoint AI này để vượt điều kiện người lập nhãn/source-first của D16. Phát cần ghi một phụ lục mới về việc **thực sự tự đọc/đối chiếu/quyết định**, nhận biết đã có exposure/gợi ý AI; không ghi lùi giờ hoặc sửa lịch sử thành blinded/source-first. Reviewer khác annotator vẫn thực hiện review gộp sau, chưa có quyết định accepted.

## Bước tiếp theo

Gửi [tin nhắn làm rõ phần cần Phát tự thực hiện](../p02-handoff/SEND_PHAT_HUMAN_DECISION_2026-10-26.md). Không yêu cầu một vòng lập báo cáo AI mới thay phần con người. Có thể dùng template đã có; chỉ ghi dữ kiện đã làm, phần chưa đọc để chưa xác nhận. Nếu thay nhãn, tạo version mới cùng evidence/hash, giữ draft.v3/raw/notes cũ. Quyết định vẫn của annotator; không yêu cầu Phát phải chọn negative theo AI.

Đầu ra phương pháp P02 development chưa mở từ lượt này. P03 vẫn candidate, chưa được Huy chọn/chốt input hoặc được xác nhận census độc lập; được tiếp tục chuẩn bị theo D17. P04 sau review PetClinic. Accepted/final test/scoring/model/push vẫn giữ điều kiện cũ.

Chi tiết trạng thái mới ở [P02_HELPER_RETURN_STATUS_2026-10-26.json](../P02_HELPER_RETURN_STATUS_2026-10-26.json). Hồ sơ runtime/packet 25/10 giữ sự kiện lịch sử; thông tin Huy đã gửi và Phát đã trả được ghi tại overlay mới này.
