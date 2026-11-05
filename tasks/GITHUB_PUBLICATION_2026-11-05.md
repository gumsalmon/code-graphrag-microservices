# Công bố code và gói review PetClinic

Quyền mới của Huy ngày 05/11/2026: “vậy hãy push lên github đầy đủ vì thầy và anh chỉ review bằng github thôi”. Đây là quyền commit/push trong lượt này, thay giới hạn chưa push của các quyết định trước trong đúng phạm vi công bố; không sửa các record frozen hoặc quyền khoa học khác.

- Trang chính: hướng dẫn đọc bằng chứng source-first và gói R1 nguyên byte, mục lục GitHub cho P01/P02/P03, ZIP/checksum/verifiers và mẫu hồ sơ trống.
- Nhánh/PR phát triển: code/tài liệu hiện hành, parser/importer đã kiểm với source/packet/tests, bốn run native/context được chọn, mapping provenance/hash và bộ kiểm từ clone mới. Chưa tự merge PR code.
- Giữ local: R2 và các nhãn/notes gốc trong handoff, credential/DPAPI/provider envelope/cache/JAR, toàn bộ ZIP bàn giao và lịch sử run không thuộc allowlist. Không force push.

Các báo cáo/checkpoints điều phối có summaries đã biết; repo/nhánh cũ có thể có labels/output lịch sử. Reviewer đi theo `review/README.md` và chỉ đọc route R1 trước; khai mọi exposure thật, không coi public routing là access control hoặc blindness. Giữ R2 tới nhận định/exposure/checkpoint thật. Công bố không là đã gửi tin/nhận review hoặc nhãn accepted.

Snapshot kỹ thuật có manifest gốc và binding bytes. Một key `authorization` trong `tasks/P03_PAIRED_STATUS_2026-10-31.json` là đường dẫn quyết định nghiên cứu D19, không phải credential; scanner dùng scan view cho đúng path/hash, không sửa record gốc hoặc nới scanner chung. Quét mẫu có giới hạn, không chứng minh tuyệt đối không có dữ liệu riêng tư.

Kiểm trước công bố gồm hashes/ZIP/R1 verifier, unit tests phù hợp, staged diff, snapshot Git mới và liên kết hướng dẫn. Bộ workboard test có fixture cũ còn giữ `human_decision_record` sau checkpoint mới; đã sửa fixture xóa record khi kiểm trường hợp thiếu quyết định, giữ nguyên guard và dữ liệu thật.

Các runner runtime dùng đường dẫn `handoff-out`/cache máy gốc. Gói GitHub cho phép đọc/kiểm evidence và source; không tuyên bố fresh clone tự tái chạy Docker/LLM hoặc đã hoàn thành toàn bộ nghiên cứu. Nhãn pending_review; chưa model, scoring, accepted, final-test lock hoặc áp hợp đồng nháp.
