# Báo cáo chạy lại runtime sạch P01

Đầu vào cho quyết định: `runtime_complete_pending_human_review`

Bản chạy bằng chứng có thẩm quyền: `benchmark/p01/raw/rerun-20260923-152742/`

Runner: `scripts/run_p01_runtime.ps1`

Định nghĩa Compose: `benchmark/p01/derived/docker-compose-rerun.yml`

## Định danh cố định

- Repository commit: `3858f9c630cf989bb6809a86edf47c2be78dc9f1`
- Configuration revision: `323993ce2519c6d02df63e08bf4458d123d3b611`
- SHA-256 của patch gốc: `42394ca361d07db58ba6a73cfc1ddb8bd1d9aeddb59292873552573adfa5cc21`
- Fixture: owner `6`; pets `7,8`; negative pet `7`
- Image baseline và mutated có tag riêng; image ID bất biến của từng bản được ghi trong `environment.json`.

## Quan sát hợp lệ

| Quan sát | Baseline | Mutated | Diễn giải |
|---|---|---|---|
| Gọi trực tiếp `GET /pets/visits?petId=7,8` | `200`, bốn visit | `400` khi thiếu `includeDetails` | Parameter bắt buộc làm thay đổi contract của provider |
| Gọi trực tiếp với `includeDetails=true` | Không cần | `200`, vẫn đủ bốn visit | Service vẫn hoạt động khi đáp ứng contract mới |
| Gọi gateway `GET /api/gateway/owners/6` | `200`, pets 7 và 8 có visit | `200`, cả hai pet có danh sách visit rỗng | Hành vi quan sát được ở gateway thay đổi qua fallback |
| Negative `GET /owners/6/pets/7/visits` | `200`, hai visit | `200`, hai visit giống hệt | Overload cùng class nhưng mapping khác không bị ảnh hưởng |

Quan sát gateway mutated chỉ được ghi nhận sau khi bước discovery preflight chứng minh request gateway đã đi tới visits-service được tái tạo. Preflight thành công ở lần thử thứ 5 và visits-service ghi `MissingServletRequestParameterException`. Kiểm tra này ngăn việc nhầm lỗi cache Eureka tạm thời với hành vi do mutation.

## Các lần thử chẩn đoán đã bị thay thế

- `rerun-20260923-151719` cho response bên ngoài đúng dự kiến nhưng chưa chờ visits-service mutated đăng ký; chỉ giữ làm raw diagnostic, không dùng cho kết luận nhân quả phía gateway.
- `rerun-20260923-152349` đã chờ đăng ký Eureka nhưng cache discovery cục bộ của gateway chưa cập nhật và ghi `No servers available for service: visits-service`; giữ lại và loại khỏi kết luận nhân quả phía gateway.
- `rerun-20260923-152332` lỗi trước khi khởi chạy vì sandbox không truy cập được Docker named pipe; giữ làm chẩn đoán môi trường.

## Lần chạy tự động xác nhận khả năng tái lập

Sau khi hoàn thiện runner, bản chạy `benchmark/p01/raw/rerun-20260923-214211/` đã tái hiện cùng ma trận và xuất:

- `summary.json` với `decision_input=runtime_complete_pending_human_review`;
- `benchmark/p01/derived/results/rerun-20260923-214211-benchmark-result.json`;
- checksum SHA-256 `7af09bc32b565d75af13fc4f96647c4b142d7f53f308e70d321029c627a96320`.

Bốn kiểm tra tự động `runtime.direct_contract`, `runtime.gateway_behavior`, `runtime.gateway_routing` và `runtime.negative_control` đều đạt. Đây là bằng chứng bổ sung sau khi `labels.v3.json` đã khóa, không thay thế review độc lập.

## Kết quả

Đã hoàn thành toàn bộ sáu nhóm quan sát runtime bắt buộc của protocol v0.1, gồm cả negative case trên repository thật. Quyết định audit đúng vẫn là `pending_review`, chưa phải `accepted`, vì chưa chỉ định reviewer độc lập là con người.
