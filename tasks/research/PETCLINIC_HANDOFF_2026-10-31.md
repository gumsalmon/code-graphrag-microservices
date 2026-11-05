# D20 — gói công việc song song PetClinic

Đã ghi nguyên văn xác nhận Huy ngày 31/10 trong [D20](../../benchmark/decisions/PETCLINIC_DRAFT_INTEGRATION_2026-10-31.json), giờ chính xác không suy đoán. D20 mở nhiệm vụ Phát lập nhãn nháp P03 và hoàn thiện checkpoint P02; extraction–Neo4j–retrieval offline có điều kiện **từng ca** sau checkpoint nhãn nháp version/hash được kiểm. Không cần hỏi quyền lại cho các bước đã cho khi điều kiện đủ, đợi ca còn lại hoặc đợi reviewer nghiệm thu. Chưa model/scoring/accepted/test-lock/shared-contract adoption/push.

## Hai gói để chuyển

| Người nhận | ZIP và sidecar cùng thư mục | SHA-256 / kích thước |
|---|---|---|
| Phát | [PETCLINIC_PHAT_2026-10-31.zip](../../handoff-out/petclinic-role-packets/20261031T071551Z-64bff5b9/phat/PETCLINIC_PHAT_2026-10-31.zip), [.sha256](../../handoff-out/petclinic-role-packets/20261031T071551Z-64bff5b9/phat/PETCLINIC_PHAT_2026-10-31.zip.sha256) | `f3d6fc5baf3e9688e839860de7aa45c5c6198c1965028da2b78582c59e40b5b9`; 1.128.722 bytes / 1.937 regular files |
| Hiển | [PETCLINIC_HIEN_2026-10-31.zip](../../handoff-out/petclinic-role-packets/20261031T071706Z-7bfb5292/hien/PETCLINIC_HIEN_2026-10-31.zip), [.sha256](../../handoff-out/petclinic-role-packets/20261031T071706Z-7bfb5292/hien/PETCLINIC_HIEN_2026-10-31.zip.sha256) | `ad6fc03e774a67aea9797e81e92b8ec72298aa25af64edfe66ab25b89c4f6106`; 207.615 bytes / 107 regular files |

[Tin gửi Phát](../p03-handoff/SEND_PHAT_ANNOTATION_2026-10-31.md) và [tin gửi Hiển](../hien-next/SEND_INTEGRATION_2026-10-31.md) để chuyển thủ công. Hai ZIP mở từ START_HERE.md, có task/input/output/DoD, role-filtered context, D20 cùng quyết định input, provenance, checksums và checker chỉ đọc chạy sau giải nén. Chưa gửi/ACK/ETA; không tự nhắn bên ngoài hoặc ghi người nhận đã nhận việc.

## Nội dung và cách ly

Gói Phát có candidate P03 frozen, source baseline/mutated, patch/fixture/scope/universe/protocol, paired raw v2 bốn nhóm và build provenance. RAW_INDEX trỏ đủ 68 collector + 24 support records. Có mẫu notes/exposure và bảng đủ 31 eligible ID chưa có assessment, ba seed riêng. Không chứa nhãn P03, nhãn P02, actual parser/graph/retrieval/model/predictions/scores, full coordinator context hoặc báo cáo kết luận paired. Hướng dẫn P02 trỏ bộ hồ sơ Phát đã giữ; nếu thiếu file phải báo cụ thể, không giả ZIP mới chứa toàn bộ hồ sơ P02.

Gói Phát giữ tám historical manifests, kiểm 1.915 file references hiện diện; 59 omissions tường minh gồm tám binary/TAR và 51 coordinator-code/hash-inventory files. Không mất raw observations/setup/logs. ZIP này phục vụ đọc/kiểm bằng chứng, không tự replay ứng dụng vì thiếu binaries/cache. Raw/manifest giữ nguyên byte, đường dẫn máy nguồn chỉ là provenance. Lượt readiness v1 lỗi giữ ở coordinator với manifest trỏ trong gói, không cộng vào completed repetitions.

Gói Hiển có code candidate parser/importer và tests đúng hashes từ return, requirements/runner tổng hợp, source/input P02/P03. Hai manifests lịch sử kiểm đủ, không omissions; không labels hoặc paired raw. Mốc A chuẩn bị tổng hợp được làm ngay theo phạm vi có sẵn. Actual integration của mỗi ca cần receipt riêng; bản packet hiện chứa hai receipt null và không cho chạy ca thật chỉ nhờ checksum pass. Không đưa nhãn hoặc annotation notes vào sandbox/context của phương pháp.

## Kiểm đã thực hiện

Hai archive được kiểm CRC, đường dẫn, loại regular file, case collisions; giải nén sang thư mục mới rồi chạy verifier portable. Phát default và --records đạt, đối chiếu đủ 92 metadata/body/request records, ledger/reset, bốn internal networks và 20 app identities; Hiển default đạt và hai implementation hashes khớp. Không gọi Docker, parser ca thật, Neo4j, model hoặc scoring để kiểm gói.

Quét patterns/JSON/private paths trên allowlisted bytes và toàn ZIP đạt, không đưa key/credential/cache vào. Scanner chung không sửa. Hai ngoại lệ scanner là giá trị public research-decision path trong đúng file/hash `baseline-build/inputs.json` (D18, ngoại lệ có từ gói scope) và `paired/plan.json` (D19); chỉ đổi tên key trong scan view, raw giữ nguyên. Security tests kiểm file/value thay đổi hoặc auth thật vẫn bị từ chối. Quét pattern có giới hạn, không chứng minh dữ liệu tùy ý chắc chắn không nhạy cảm.

Năm Node tests về tách vai trò/quyền có điều kiện/chặn raw omission/không bịa delivery và ba Python tests ngoại lệ scanner đạt. Không gọi các kiểm này là reviewer người thật hoặc Java app suite. Kiểm bảng điều phối và logs cuối nằm trong audit lượt này, đường dẫn ghi ở status D20 khi đóng phiên.

Audit cuối tại `handoff-out/petclinic-d20-audit/20261031T072325571Z-c7490882`, manifest 45 files SHA `0c3eb6f681f904c66538c3018cabbb53afaf7b4577b826c2170da200a390536a`. Lượt cuối chạy 10 Node tests (năm role + năm workboard) và ba Python tests, 0 fail/skip; board 23 tasks/42 evidence files/bốn delivery records đạt. Kiểm lại sealed P03 runtime, rehash nhãn P02 v3, phụ lục Phát, code candidate Hiển và input D19/candidate đều khớp; không rerun runtime. Hai ZIP/sidecar khớp. HEAD giữ `d1f95eb21c71dd6bfb49d2e450142d1290ceda5f`, index rỗng, working tree còn thay đổi local; CRLF-aware diff check exit 0, không stage/commit/push.

Hai lỗi đóng gói đã giữ dấu vết: scanner ban đầu coi field authorization chứa public D19 path là secret, sau đó thêm ngoại lệ exact-byte với tests; lần giải nén đầu dùng Python extended Windows path làm guard CLI Node không chạy, exit 0 nhưng không JSON report, pipeline dừng. Đã dùng argv đường dẫn bình thường và bắt buộc report đúng role + --records đủ 92 trước khi nhận delivery. Các attempts cũ không phải bản bàn giao. Gói Hiển đầu hợp lệ đã được thay bằng gói mới có thêm lệnh tái hiện cụ thể; giữ cả bản cũ.

## Checkpoint còn thiếu

Chưa có notes/exposure/label checkpoint P02 mới hoặc nhãn P03 do người thật bàn giao; không tạo labels thay Phát hoặc lấy D20 làm checkpoint đã đạt. [Checklist intake](../CHECKPOINT_INTAKE_2026-10-31.md) nêu cách kiểm và tạo receipt kỹ thuật lọc nhãn theo ca. Unresolved có lý do được phép, không yêu cầu reviewer ký hoặc mọi repair/confidence đều biết mới mở phát triển.

Tiến độ hiện hành ở [status D20](../PETCLINIC_D20_STATUS_2026-10-31.json) và [bảng việc](../PETCLINIC_WORKBOARD.md). Các status/runtime/packets D18/D19 cũ giữ quyền và sự kiện lúc tạo, không thay D20 mới nhất. Khi Phát trả checkpoint, kiểm ngay và tiếp tục ca đủ điều kiện trước; Hiển vẫn giữ ownership parser/importer. Nếu chỉ còn quyết định người thật thực sự cần thiết thì báo đúng task bị chặn, không tạo thêm kiểm máy để thay người đọc.
