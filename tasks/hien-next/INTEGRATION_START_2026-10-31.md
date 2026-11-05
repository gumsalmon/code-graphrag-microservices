# Hiển — chuẩn bị và tích hợp offline P02/P03

Đọc `TASK_HIEN.md`, `REPRODUCE.md`, `CURRENT_STATE.json` và D20 trong `decisions/`. Đây là nhiệm vụ tiếp sau synthetic regression đã bàn giao, không giao lại baseline hoặc yêu cầu tạo nhãn. Xác nhận code/diff đã trực tiếp kiểm và khai AI hỗ trợ thực tế; không cần sửa ZIP/log cũ hoặc dựng thủ tục reviewer nhãn cho một diff code.

Gói chứa bản code candidate đã bàn giao, tests/runner tổng hợp, source/patch/input P02/P03 và quyền tích hợp **có điều kiện từng ca**. Không có labels, notes lập nhãn, output phương pháp ca thật hoặc điểm số. Source input được phép đọc để chuẩn bị; actual extraction/import/query/retrieval chỉ chạy khi coordinator gửi receipt checkpoint version/hash đã kiểm của chính ca đó. File CURRENT_STATE ở gói hiện chưa có receipt. Không phải chờ reviewer nghiệm thu nhãn hoặc cả hai ca cùng xong; receipt P02 đủ thì làm P02 trước.

Không sửa trực tiếp main hoặc thay code mới trên máy bằng bản cũ. Dùng branch hiện có nếu đúng công việc và có diff/provenance; nếu cần branch mới dùng `codex/`. Ghi branch/HEAD thực tế và hash các file, vì local candidate chưa phải commit đã công bố. Không commit/push/merge trong nhiệm vụ này.

## Đường chạy

1. `node tooling/scripts/verify_petclinic_role_packet.mjs --root .` kiểm byte/input/role; không cấp receipt hoặc chạy ca thật.
2. Tái hiện kiểm tổng hợp khi sửa implementation hoặc có regression mới, theo `REPRODUCE.md`. Kết quả đã kiểm là parser 10/10, importer metadata 4/4 và resolution 4/4 unit/mock; không phải Neo4j thật. Giữ native output, commands/exit và failures.
3. Trước receipt: chuẩn bị code riêng cho record/DTO/response-field usage trên source tổng hợp, kiểm spans, snapshot/ID, unresolved và compatibility; ghi rõ phần chưa hỗ trợ. Không áp schema/hop/contract ba cấp đang nháp.
4. Sau receipt từng ca: thực hiện task integration của ca đó và giữ output trong thư mục sandbox mới ngoài input/nhãn. Ghi receipt/version/hash vào provenance output. Không đọc labels để viết cố định kết quả.

Nếu cần image/package/model mà local cache chưa có, báo dependency/blocker và lệnh cần chuẩn bị; không tự tải hoặc gọi model. Không dùng credential cá nhân trong evidence. Không gửi output kỹ thuật vào phiên AI/packet đang giúp Phát lập nhãn.
