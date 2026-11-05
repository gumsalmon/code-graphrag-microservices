# D18 — chọn P03 C03-A, cho build và baseline

Ngày 28/10/2026, Huy xác nhận trực tiếp chọn C03-A theo candidate hiện hành và cho triển khai/kiểm thử runner offline, build và baseline trong sandbox riêng. Nội dung nguyên văn, hash và phạm vi ở [quyết định JSON](SELECTION_BASELINE_2026-10-28.json). Chưa biết giờ chính xác của quyết định; giữ null.

Candidate được chọn là `handoff-out/p03-preparation/20261024T190227112Z-a8e852db`, root manifest `c52f085be74406e542de93db7f6d70b2fc3fe60f215ae47bd45df5b1cc5cec92`. Chọn phương án đổi response key `pets` → `animals` của Customers GET owner không cấp quyền áp patch/build hoặc chạy mutated ở lượt này.

Baseline chỉ dùng source gốc tại pin PetClinic/config đã ghi. Fixture setup POST và POST/PUT đối chứng của candidate chạy trong DB disposable thuộc từng group; không dùng DB chung. Mọi ID owner mới phải lấy từ response/readback; không PUT vào owner seed. Không sửa byte spec hoặc gói candidate frozen để cập nhật trạng thái.

Phạm vi/universe và alias vẫn cần kiểm độc lập. Quyết định này không thay phiếu kiểm của Phát, không phải input lock hoặc nhãn dự thảo, không mở model/scoring/push hoặc reviewer acceptance. Nhãn P01/P02 và notes/exposure cũ giữ nguyên.

Hướng dẫn triển khai: [BASELINE.md](../../../pipeline/p03/BASELINE.md).
