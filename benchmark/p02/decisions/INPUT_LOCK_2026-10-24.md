# P02 — quyết định đầu vào và phạm vi F03

Ngày quyết định: 24/10/2026. Người quyết định: Huy, qua chỉ dẫn trực tiếp trong cuộc trò chuyện. AI ghi lại, không ký thay hoặc suy thời điểm chính xác từ log công cụ.

Huy chốt scenario `0.1.1`, universe `draft.v2`, fixture `v1` theo đúng hash tại [record máy đọc được](INPUT_LOCK_2026-10-24.json). Căn cứ là phiếu kiểm F01/F02 của Phạm Nguyên Phát tại commit `187c4d82fb75c07d6593522dd68bc1dfdd86ceca`. Phiếu và log đã được đọc tại đúng pin, đối chiếu với checker local 31/31. Phiếu chưa khai thời điểm kiểm chính xác; giữ null, không suy từ commit. Review có AI hỗ trợ/exposure được khai, không gọi blinded review.

Được triển khai adapter/runner v2, kiểm offline rồi thu runtime baseline/mutated, POST đối chứng trên DB riêng, hai repetitions/reset và bằng chứng helper/setter/fallback. Ma trận 40 slot và request/support/fault bổ sung phải được phân biệt; targeted helper harness không thay cho consumer E2E thật. Kết quả khác dự kiến vẫn giữ nguyên; không tự gán nhãn từ so sánh body hoặc trạng thái HTTP.

Gói candidate/scenario/universe/fixture, raw cũ và quyết định cũ giữ nguyên byte. Runner đọc thêm record này, không sửa cờ false trong dữ liệu frozen. Chốt đầu vào F03 không cấp quyền lập/duyệt nhãn, khóa final test, chấm điểm, gọi model hoặc push GitHub. P01 vẫn pending_review; P03/P04 không mở thêm.

Đầu ra cần có: identity baseline/mutated và proof consumer/config không đổi; raw HTTP/headers/status/request/log/exit; thứ tự POST cuối, DB mới và reset thật; helper evidence nêu rõ cách quan sát và giới hạn; manifest/checker, lỗi và tài nguyên còn lại nếu cleanup thất bại. Không đóng F03 hoàn tất khi mới có kế hoạch hoặc unit test tổng hợp.
