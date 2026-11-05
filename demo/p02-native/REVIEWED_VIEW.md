# Xem P02 từ bản code đã kiểm ngày 02/11

Mở `handoff-out/p02-native-inspector-reviewed/20261102T155422536Z-619e6cc6/index.html` bằng Chrome/Edge. Trang tự chứa, dùng được offline và khi di chuyển riêng HTML; không cần Docker, server hoặc API key.

Trang này dùng run P02 đã tái kiểm sau sửa parser/importer: chín Method nodes, đủ tám eligible Methods sau loại seed, 18 nodes/18 relationships trong mỗi Neo4j snapshot. Full-property parity đạt; bốn helpers mới có node và mở được source. Đổi Baseline/Mutated và độ sâu 1/2/3 hop để đọc query/path đã lưu, không chạy truy vấn mới. Bấm node để xem đúng file/dòng, tải source/JSON/Cypher byte gốc nếu cần.

Tuyến có witness được tô theo độ sâu đang chọn. Những method không có trong các tuyến đã lưu được xếp riêng; điều đó không phải nhãn negative. Desktop dùng tuyến ngang và bảng node ngoài tuyến, màn hình nhỏ chuyển tuyến dọc. Bố trí thay đổi cách xem, không đổi graph/retrieval data. Unresolved từ parser và giới hạn fresh-DB/snapshot isolation vẫn hiển thị.

Nguồn là `handoff-out/p02-offline-method-reviewed/20261102t140320547z-03c452f7`, manifest `42e48fbf04beb48bf79ff84812d4476c05f5286056a19621fdf86b9d0945b978`. Build manifest `c5d80190c94d580e380f41fda58d275b22b14fb602d1e6bfec7dd5c3c48fd521`, có 20 raw artifacts được nhúng. Thư mục QA `handoff-out/p02-native-inspector-reviewed-qa/20261102T155439471Z-8d9678ea` lưu 11 browser checks, ảnh desktop/mobile và focused graph captures. Có kiểm offline, source/download hashes, helper/overload/source spans, layout và di chuyển HTML. Ảnh thực đã được AI điều phối xem; không gọi đây là thẩm định người thật.

Tạo bản mới từ gốc repo:

```powershell
node scripts/build_p02_reviewed_native_inspector.mjs --run handoff-out/p02-offline-method-reviewed/20261102t140320547z-03c452f7
node scripts/check_p02_reviewed_native_inspector_browser.mjs --build NEW_BUILD_DIRECTORY
```

Đây là bộ xem bằng chứng kỹ thuật đã lưu, chưa dự đoán/chấm điểm tác động hoặc hoàn tất E2E GraphRAG/đầu ra ba cấp. Không gửi sang người lập nhãn hay reviewer đang ghi nhận định source-first. Không có nhãn, raw benchmark outcomes hoặc output P03. [Status hiện hành](../../tasks/P02_REVIEWED_DERIVATIVES_STATUS_2026-11-02.json) và [báo cáo](../../tasks/research/P02_REVIEWED_DERIVATIVES_2026-11-02.md) ghi provenance/giới hạn.

Bản native inspector và assets ngày 01/11 vẫn được giữ nguyên. Build reviewed đầu tiên cũng giữ cùng QA đã pass; ảnh cho thấy khoảng trống lớn nên bản hiện hành cải thiện bố trí riêng, không thay lịch sử hoặc giả lượt trước thất bại.
