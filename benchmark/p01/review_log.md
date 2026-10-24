# Nhật ký rà soát P01

Scenario: P01 v1.0.0

Protocol tạo nhãn: v0.1

Protocol đề nghị dùng để review/chấm điểm: v0.2

File nhãn hiện hành: `labels.v3.json`

Quyết định hiện tại: `pending_review`

## Lịch sử phiên bản nhãn

| File | Phiên bản | SHA-256 | Trạng thái |
|---|---|---|---|
| `labels.v1.json` | 1.0.0 | `32270aed44b91f3436d7ad606f2276430e6ec9f76ea00a84d1f5bce2b21bd807` | Đã bị thay thế; giữ bất biến |
| `labels.v2.json` | 1.1.0 | `910d15049e580bdd193c3ee5b35740e0c164a1a7f9d90640506cd10893408bde` | Đã bị thay thế; giữ bất biến |
| `labels.v3.json` | 1.2.0 | `3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce` | Bản khóa tạm thời hiện hành; chờ review độc lập |

## Vai trò

| Vai trò | Người thực hiện | Trạng thái |
|---|---|---|
| Annotator | Phát | Đã chuẩn bị nhãn ứng viên |
| Reviewer | Chưa chỉ định | Bắt buộc là một người khác |
| AI hỗ trợ | Codex | Chỉ hỗ trợ tổ chức bằng chứng, schema và checksum; không phải vai trò review của con người |

Điều kiện chấp nhận theo quy trình hai người chưa đạt. Phát không được tự phê duyệt phiên bản nhãn này và AI không được thay thế reviewer còn thiếu.

## Sự kiện

| Thời gian (Asia/Bangkok) | Người thực hiện | Sự kiện | Kết quả |
|---|---|---|---|
| 2026-09-23T14:20:00+07:00 | Codex hỗ trợ Phát | Tính lại SHA-256 của toàn bộ 18 entry trong package | Tất cả khớp `input_checksums.sha256` |
| 2026-09-23T14:28:00+07:00 | Codex hỗ trợ Phát | Fetch `origin/main` và kiểm tra quan hệ ancestry | Branch chưa có commit riêng, chậm hơn một commit và không divergence |
| 2026-09-23T14:29:00+07:00 | Codex hỗ trợ Phát | Fast-forward `Pham_Nguyen_Phat` tới `65e41a2` bằng `--ff-only` | Thành công; không force push |
| 2026-09-23T14:34:00+07:00 | Codex hỗ trợ Phát | Tạo checkout PetClinic chính thức tại `3858f9c...` | Xác nhận detached HEAD và tracked tree sạch |
| 2026-09-23T14:36:00+07:00 | Codex hỗ trợ Phát | So sánh ba snapshot source trong package với commit chính thức | Tất cả SHA-256 khớp |
| 2026-09-23T14:37:00+07:00 | Codex hỗ trợ Phát | Kiểm tra mutation patch | File UTF-16LE gốc không được `git apply` chấp nhận trực tiếp; bản chuyển chính xác sang UTF-8 qua `git apply --check` |
| 2026-09-23T14:40:00+07:00 | Codex hỗ trợ Phát | Thử khởi động môi trường runtime | Có Docker CLI nhưng daemon chưa sẵn sàng; lần khởi động nền chưa tạo được daemon |
| 2026-09-23T14:42:17+07:00 | Phát với Codex hỗ trợ | Tạo nhãn ứng viên mà không mở output hệ thống được đánh giá | Đặt quyết định `reproduce_required`; vẫn cần reviewer |
| 2026-09-23T14:48:34+07:00 | Phát với Codex hỗ trợ | Khóa tạm thời `labels.v1.json` trước khi truy cập output hệ thống được đánh giá | Ghi SHA-256 vào `checksums.sha256`; không được sửa file tại chỗ |
| 2026-09-23T14:52:00+07:00 | Phát với Codex hỗ trợ | Kiểm tra schema phát hiện diễn đạt ngoài enum ở `requires_code_change` trong v1 | Giữ nguyên v1 và tạo v2 với giá trị boolean cùng giả định sửa chữa riêng |
| 2026-09-23T14:52:00+07:00 | Phát với Codex hỗ trợ | Khóa tạm thời `labels.v2.json` | SHA-256 `910d15049e580bdd193c3ee5b35740e0c164a1a7f9d90640506cd10893408bde`; chưa mở output hệ thống được đánh giá |
| 2026-09-23T15:17:19+07:00 | Phát với Codex hỗ trợ | Chạy ma trận Docker lần đầu | Hoàn tất request trực tiếp và response phía gateway, nhưng chưa chứng minh routing sau khi tái tạo service; chỉ giữ làm chẩn đoán |
| 2026-09-23T15:23:49+07:00 | Phát với Codex hỗ trợ | Chạy lại sau khi chờ đăng ký Eureka | Gateway vẫn ghi lỗi cache discovery cục bộ cũ; giữ làm chẩn đoán |
| 2026-09-23T15:27:42+07:00 | Phát với Codex hỗ trợ | Chạy ma trận với bước kiểm tra trước routing end-to-end của gateway | Hoàn tất; lần thử preflight thứ 5 đi tới visits-service mutated, toàn bộ quan sát bắt buộc và negative case đều đạt |
| 2026-09-23T15:32:00+07:00 | Phát với Codex hỗ trợ | Tạo và khóa tạm thời `labels.v3.json` trước khi mở output hệ thống được đánh giá | Bổ sung bằng chứng sạch; đổi quyết định thành `pending_review`; SHA-256 `3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce` |
| 2026-09-23T21:05:24+07:00 | Phát với Codex hỗ trợ | Chạy thử quy trình tự động sau khi bổ sung script | Config server chưa sẵn sàng trong ngưỡng chờ; giữ raw diagnostics tại `rerun-20260923-210524` |
| 2026-09-23T21:13:41+07:00 | Phát với Codex hỗ trợ | Chạy lại sau điều chỉnh thời gian chờ | Config server vẫn khởi động chậm; giữ raw diagnostics tại `rerun-20260923-211341` |
| 2026-09-23T21:27:38+07:00 | Phát với Codex hỗ trợ | Kiểm tra xử lý lỗi và thu thập log của runner | Runner dừng, thu log/chẩn đoán và dọn môi trường; giữ tại `rerun-20260923-212738` |
| 2026-09-23T21:42:11+07:00 | Phát với Codex hỗ trợ | Chạy trọn quy trình benchmark tự động sau khi sửa tương thích PowerShell 5.1 và startup chậm | Thành công; bốn comparison đều `passed=true`, xuất JSON có checksum tại `derived/results/` |
| 2026-09-26T00:06:41+07:00 | Phát với Codex hỗ trợ | Tạo protocol v0.2, giữ nguyên v0.1 để truy vết | Bổ sung scoring theo ba level, xử lý unjudged, canonical ID baseline/mutated và split theo duplicate group; P01 được cố định là development/pilot |

## Bất đồng về bằng chứng và nội dung chưa giải quyết

- Không phát hiện hash đầu vào nào không khớp.
- Encoding của patch gốc là một lỗi về khả năng tái lập, không phải khác biệt ngữ nghĩa. Giữ hash file gốc và ghi riêng bản chuyển mã UTF-8 chuẩn hóa.
- Các file baseline/mutated lịch sử được giữ nhưng không đủ tư cách là lần chạy lại sạch độc lập.
- Hai lần chạy Docker đầu tiên lúc 15 giờ bộc lộ vấn đề timing/cache đăng ký service; chúng chỉ là chẩn đoán và không được dùng cho kết luận nhân quả phía gateway.
- Negative overload được đề xuất cùng endpoint tương ứng trả cùng response ở baseline và mutated nên được ghi nhãn negative.
- `PROJECT_CONTEXT.md` đã nêu tuyến ứng viên dự kiến, tạo expectancy bias; quy trình P01 không blind hoàn toàn.
- Danh tính reviewer và quyết định review vẫn chưa có.

## Lý do của quyết định hiện tại

Dùng `pending_review` vì ma trận runtime sạch, bằng chứng routing gateway và quan sát negative về hành vi đã hoàn tất, nhưng chưa có reviewer là một người khác. Không được chuyển sang `accepted` trước khi reviewer được chỉ định và ghi quyết định phê duyệt.

## Phần dành cho reviewer

Tên reviewer: **Huy điền**

Thời gian review: **chưa thực hiện**

Quyết định (`approve` | `request_changes` | `unable_to_review`): **chưa thực hiện**

Nhận xét và bằng chứng đã kiểm tra: **chưa thực hiện**

Chữ ký/xác nhận: **chưa thực hiện**
