# P01 — nhận định độc lập, hoàn thành trước lượt 2

Sao chép phiếu ra ngoài thư mục gói trước khi điền. Nội dung ghi nhận nhận định của người rà soát từ source, patch và raw runtime, trước khi đối chiếu nhãn dự thảo.

- Người rà soát / thông tin liên hệ:
- Vai trò, quan hệ với dự án; có tham gia xây implementation hoặc lập nhãn P01 không:
- Commit gói:
- Kết quả VERIFY_PACKAGE (ngày giờ, số file hoặc lỗi):
- Bắt đầu (ISO-8601 + múi giờ):
- Đã xem PR/context/nhãn/summary/prediction trước lượt này? File/tài liệu, thời điểm, mức tiếp xúc:
- Công cụ/AI sử dụng và phần đã tự kiểm tra:
- Loại kiểm chứng: audit log được cung cấp / có chạy lại (ghi môi trường, lệnh, raw log mới):

## 1. Phạm vi và provenance

Source/config/patch đã đối chiếu; phạm vi đủ điều kiện xem xét và lý do; các module/file/thực thể đã đọc; phần chưa kiểm. Không lấy phạm vi từ output hệ thống.

## 2. Contract và tuyến phụ thuộc

Handler/API trước/sau, consumer thực gửi gì, caller/callee, fallback, endpoint/overload dễ nhầm. Dẫn file:dòng; ghi hướng cạnh và cách đếm logical hop/service boundary.

## 3. Quan sát runtime

| Fixture/request và baseline/mutated | Status + body/khác biệt | File/request/timestamp/log | Tin cậy, giới hạn |
|---|---|---|---|
| Tự thêm từng trường hợp đã kiểm | | | |

Kiểm cả trường hợp gọi trực tiếp, qua gateway, có/thiếu tham số và đối chứng. Phân biệt lỗi hạ tầng với lỗi do patch; không chỉ nhìn HTTP 200. Đối chiếu discovery và image/timestamp.

## 4. Nhận định độc lập

Ghi ID đầy đủ, chữ ký method để phân biệt overload. Nếu một thực thể có nhiều loại nhãn, dùng nhiều dòng. Không ấn định số lượng positive/negative.

| Thực thể + loại Method/API/Service | Seed? | Positive/negative/unresolved về hành vi + lý do | Requires code change + repair strategy | Hop / boundary + tuyến | Bằng chứng source + runtime |
|---|---|---|---|---|---|
| Tự thêm từng thực thể | | | | | |

## 5. Vấn đề, giới hạn và yêu cầu bổ sung

Bao phủ fixture/source, độ tin cậy provenance, thiên lệch chọn ca/đối chứng, suy luận chưa được runtime hỗ trợ. Kết luận chỉ trong phạm vi đã kiểm.

## 6. Hoàn thành lượt 1

- Hoàn thành (ISO-8601 + múi giờ):
- Xác nhận đã kiểm các nhận định trên và ghi đầy đủ tài liệu đã tiếp xúc:
- Tên/xác nhận của người rà soát:

Lưu file, tính SHA-256 rồi bàn giao phiếu cùng hash và thời điểm hoàn thành trước khi nhận hoặc mở tài liệu lượt 2. Không điền hash vào chính file sau khi tính vì sẽ làm hash đổi. Giữ bản đã bàn giao; mọi bổ sung sau đó lưu riêng.
