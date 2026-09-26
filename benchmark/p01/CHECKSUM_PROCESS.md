# Quy trình checksum trước và sau review P01

## 1. Mục tiêu

Quy trình dùng hai manifest độc lập để tránh vòng lặp khi `review_log.md` thay đổi:

- `checksums.sha256` khóa artifact kỹ thuật trước review.
- `checksums.review.v1.sha256` khóa quyết định và nhật ký sau review.

`review_log.md`, `review_decision.v1.json`, `HANDOFF.md`, `REVIEW_GUIDE.md` và tài liệu quy trình này không nằm trong manifest trước review vì chúng có thể thay đổi trong quá trình rà soát.

## 2. Manifest artifact trước review

Manifest `benchmark/p01/checksums.sha256` bao phủ:

- tất cả phiên bản `labels.v*.json`;
- `scenario.json` và `evidence_manifest.json`;
- tất cả phiên bản protocol;
- ba script chạy/xuất benchmark và script checksum;
- toàn bộ raw evidence;
- báo cáo dẫn xuất, Compose file và kết quả máy đọc được.

Tạo hoặc cập nhật manifest trước khi gửi reviewer:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_p01_checksums.ps1 -Mode WriteArtifacts
```

Kiểm tra mà không sửa file:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_p01_checksums.ps1 -Mode VerifyArtifacts
```

Script kiểm tra cả hash và độ phủ: file artifact mới nhưng chưa có trong manifest cũng làm kiểm tra thất bại.

## 3. Quyết định sau review

Reviewer điền `benchmark/p01/review_log.md` và `benchmark/p01/review_decision.v1.json`.

Các trường bắt buộc trong file quyết định:

- `reviewer`;
- `reviewed_at` theo ISO-8601 có UTC offset;
- `decision`: `approve`, `request_changes` hoặc `unable_to_review`;
- `audit_decision`: chỉ được là `accepted` khi `decision` bằng `approve`;
- `comments`.

File quyết định phải tiếp tục tham chiếu đúng `labels.v3.json` và SHA-256 đã khóa. Không sửa `labels.v3.json` hoặc raw evidence để ghi quyết định.

File quyết định tách `label_protocol_version=0.1`, là protocol đã dùng khi khóa `labels.v3.json`, và `review_protocol_version=0.2`, là protocol dùng cho review/chấm điểm chính thức. Cách tách này giữ nguyên lịch sử mà không cần sửa file nhãn.

### Cách ghi quyết định `accepted`

`labels.v3.json` là snapshot nhãn bất biến tại thời điểm khóa tạm thời. Các trường `reviewer`, `review_status`, `audit_decision` và `ground_truth_status` bên trong file đó không được sửa sau khi khóa.

Trạng thái được chấp nhận được ghi bằng một decision envelope độc lập là `review_decision.v1.json`. Reviewer điền:

```json
{
  "decision_id": "P01-review-v1",
  "scenario_id": "P01",
  "label_file": "benchmark/p01/labels.v3.json",
  "label_version": "1.2.0",
  "label_sha256": "3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce",
  "label_protocol_version": "0.1",
  "review_protocol_version": "0.2",
  "reviewer": "Tên người rà soát",
  "reviewed_at": "2026-09-26T10:00:00+07:00",
  "decision": "approve",
  "audit_decision": "accepted",
  "comments": "Đã kiểm tra provenance, runtime, hop, negative case và repair label."
}
```

P01 chỉ có hiệu lực `accepted` khi đồng thời thỏa tất cả điều kiện:

1. `decision` bằng `approve` và `audit_decision` bằng `accepted`.
2. Reviewer là người thật, có tên và khác annotator Phát.
3. `scenario_id`, `label_version`, đường dẫn và SHA-256 khớp chính xác `labels.v3.json`.
4. Có thời điểm ISO-8601 và nhận xét review.
5. `checksums.sha256` vẫn hợp lệ.
6. `checksums.review.v1.sha256` được tạo và kiểm tra thành công.

Nếu thiếu bất kỳ điều kiện nào, trạng thái hiệu lực vẫn là `pending_review`, dù một tài liệu mô tả khác có ghi chữ “accepted”.

Nếu reviewer chọn `request_changes` hoặc `unable_to_review`, giữ `audit_decision` là `pending_review`. Nếu yêu cầu làm thay đổi nhãn, tạo `labels.v4.json`, khóa hash mới và review phiên bản đó; tuyệt đối không sửa `labels.v3.json`.

Raw evidence luôn bất biến. Nếu cần chạy thêm, tạo thư mục `raw/rerun-<timestamp>/` mới thay vì thay thế file hoặc thư mục cũ.

Sau khi reviewer hoàn tất, tạo manifest sau review:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_p01_checksums.ps1 -Mode WriteReview
```

Manifest `checksums.review.v1.sha256` sẽ khóa ba file:

- `checksums.sha256`;
- `review_log.md`;
- `review_decision.v1.json`.

Kiểm tra toàn bộ gói sau review:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_p01_checksums.ps1 -Mode VerifyReview
```

## 4. Quy tắc thay đổi sau khi đã review

- Nếu reviewer yêu cầu sửa nhãn, tạo `labels.v4.json`; không sửa đè `labels.v3.json`.
- Nếu artifact trước review thay đổi, tạo lại `checksums.sha256` rồi thực hiện review lại.
- Nếu quyết định review thay đổi, tạo phiên bản mới như `review_decision.v2.json` và `checksums.review.v2.sha256`; không ghi đè quyết định đã ký.
- Không dùng `-Force` sau review trừ khi chủ động tạo một phiên bản review mới và ghi rõ lý do trong `review_log.md`.
