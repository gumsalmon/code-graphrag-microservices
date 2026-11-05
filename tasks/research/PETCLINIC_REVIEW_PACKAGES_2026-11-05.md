# Hai gói review PetClinic đã đóng và kiểm — 05/11/2026

Đã hoàn tất lắp gói version 1.0.0 từ data previews/allowlist đã kiểm, thêm hướng dẫn trung lập đầy đủ, mục lục offline, metadata và bộ kiểm portable. Gói R1 sẵn để chuyển thủ công; R2 giữ riêng tới sau checkpoint nhận định R1. Chưa có sự kiện gửi/nhận việc, notes reviewer hoặc quyết định nhãn mới.

## Gói hiện hành

| Gói | ZIP SHA-256 | Dung lượng | Evidence logic / payload duy nhất |
|---|---|---:|---:|
| [R1 source-first](../../handoff-out/petclinic-review-packages/20261105T093250Z-45a9dd18/PETCLINIC_R1_SOURCE_FIRST_2026-11-05.zip) | `f0e1876e34a4f56cbf012403276569802396d1ee1956da2dc4fcd584084b3b2d` | 1.056.532 bytes | 911 / 516 |
| [R2 label comparison](../../handoff-out/petclinic-review-packages/20261105T093250Z-45a9dd18/PETCLINIC_R2_LABEL_COMPARISON_2026-11-05.zip) | `adbfc134f25a0f9ba82ac6259a0e05125b07b8a32724c4084aaddeec64a69b8f` | 6.072.010 bytes | 6.392 / 3.083 |

Mỗi ZIP có sidecar `.zip.sha256`. R1 manifest `8e1bb39449f109ce7531f0e51dd293c114851175891ac532879715149d490998`, 529 listed files; R2 manifest `32fbfa1b68f0ebd4c822e21806a1da585bf5528ea2aa4662b9df6cf547d00f12`, 3.097 listed files. Số physical files khác logical evidence vì payload trùng byte được lưu chung theo SHA-256 và bốn wrapper preview mỗi lượt được thay bằng hướng dẫn/metadata mới. Không mất source/raw/labels được chọn.

Source preview manifest `0fa1584d42f89dd2a5b6cc39bb3d1df1d1f5fa942cf0cd8433348dd3fb2bfc97` giữ nguyên. Audit đối chiếu đủ 7.303 logical evidence entries với allowlist, từng payload đúng byte source preview. Mọi logical/original path và hash nằm trong `EVIDENCE_INDEX.json`; lưu trữ `artifacts/<sha256>.txt` giúp mở bằng trình đọc văn bản và tránh path quá dài. Member path dài nhất 78 ký tự. Labels/notes và các trích dẫn bên trong không bị viết lại; tìm path/basename trong INDEX.html để đối chiếu snapshot/hash.

R1 chỉ có input/source/raw đã chọn và forms trống. P02/P03 registry là các trường structural đã lọc; P01 giữ bản chất historical pilot, không tạo universe từ labels hoặc preregistration hồi tố. R2 giữ đúng P01 v3/P02 draft.v4/P03 draft.v2, có `CURRENT_DRAFTS.md` trỏ thẳng tới ba file hiện hành để không nhầm history. Cả ba vẫn pending_review; không prediction/score được đưa vào hai lượt.

## Kiểm đã chạy

- CRC/member/path/type ZIP đạt; không symlink/encrypted/absolute/traversal/case-collision members. Kiểm dữ liệu/origin, label hashes, root manifest và links HTML đạt. Bounded scanner đạt với hai ngoại lệ exact-byte D18/D19 decision paths như preview, không đổi raw/shared scanner.
- Bộ kiểm standalone Python và Windows PowerShell chạy đạt trên cả hai gói ban đầu và hai bản giải nén mới: tám lượt kiểm integrity. Python cần 3.10+ thư viện chuẩn; PowerShell có sẵn trên Windows. Không cần Node/Docker/LLM hoặc dependency tải thêm ở máy reviewer.
- Mô phỏng di chuyển vào thư mục `Máy khác có khoảng trắng` tại workspace mới, member bytes đúng, absolute paths tối đa 182 ký tự trong fixture. Chưa tuyên bố đã thực thi trên máy vật lý/OS khác.
- Hai công cụ đều từ chối payload bị sửa và file thừa ở bản sao cố ý tạo lỗi. ZIP/gói thật giữ nguyên. Checkpoint tổng hợp ràng buộc đúng R1 package/manifest/notes/exposure; sai R1 hoặc notes bị đổi bị từ chối. Đây là test phần mềm, không notes hoặc approval người thật.
- Browser offline trên hai bản đã di chuyển: search theo case/tên file, số dòng logical, mở payload, desktop/mobile trong viewport đạt; zero page/CSP errors và zero HTTP requests. Ảnh desktop R1/mobile R2 đã được AI xem. UI này chỉ là mục lục evidence, không demo dự đoán CIA.

Audit tại `handoff-out/petclinic-review-package-audit/20261105T093415Z-d1bebdf9/`, giữ command/argv/stdout/stderr/exit, source-to-package mapping, scan, screenshots và fixtures lỗi. Các snapshot/source/raw/labels/Methods cũ được bảo toàn.

## Cách dùng và giới hạn

[Hướng dẫn điều phối và tin nhắn ngắn](../petclinic-review-release/COORDINATION_2026-11-05.md) chỉ chuyển R1 trước. Không chuyển nguyên thư mục coordinator chứa cả R2. Gói không mã hóa; hướng dẫn, kiểm bytes và linkage không ngăn người có file R2 tự mở hoặc chứng nhận thứ tự đọc. Independence/exposure là phần reviewer phải khai thật.

`--seal-notes` tạo checkpoint file ngoài gói, timestamp là lúc tạo record, tên reviewer mặc định null nếu không khai. `--checkpoint` kiểm các bytes đã giữ và ràng buộc đúng R1; kết quả không tự mở quyền phát hành R2 hoặc duyệt nhãn. Người chỉ dùng PowerShell có thể trả notes/exposure và hash theo mẫu để được ghi nhận riêng khi tiếp nhận. Không bắt điền giờ đọc không biết hoặc chữ ký giả.

Reviewer khác annotator, ghi nhận định source-first rồi đối chiếu và quyết định từng ca/version/hash. Chưa có reviewer/lịch/notes/accepted được tạo từ task này. Hạn chế bằng chứng helper, P01 historical exposure và unresolved của drafts giữ nguyên cho review; không ép negative hoặc điều chỉnh theo graph. Technical provider/model blocker P01 vẫn giữ trong hồ sơ điều phối, không giả cặp mới đã hoàn tất hoặc đưa output vào review nhãn.

User đã đồng ý lắp gói; không tự gửi tin, push GitHub, gọi model/embedding, chấm điểm, khóa test, áp shared output contract hoặc mở P04. Context v0.36/board/status hiện hành chỉ ghi mốc package assembly và readiness để chuyển R1. Git HEAD `d1f95eb21c71dd6bfb49d2e450142d1290ceda5f`, index rỗng và working tree dirty.
