# P02 static context — tiến độ kỹ thuật trong lúc chờ thành viên

Huy yêu cầu đẩy nhanh tiến độ khi Hiển/Phát chưa xong. Đã chọn phần retrieval/context thuộc luồng tích hợp, chạy được trong D20 sau checkpoint P02; không sửa code Hiển hoặc làm nhãn thay Phát. Không gửi thêm task/ZIP cho thành viên, không mở P03 actual integration hoặc gọi provider.

Thành phần mới gồm BM25/file selection, baseline graph context, packing toàn JSON preview, script chuẩn bị và checker artifact độc lập. Truy xuất dùng cùng ba baseline files, seed file/patch mandatory; không dùng graph pool để giới hạn lexical. Source/patch byte bound từ native run và input lock đã kiểm, không raw benchmark/labels/notes. Whole-file units/cap byte chỉ là preview development; chưa là final chunk/token policy hoặc full LLM request.

Đã chạy bảy cấu hình trên source thật, một ca P02. Lexical chọn cả ba file, graph h1 chọn hai, graph h2/h3 và combined chọn ba. Witness candidates một/hai/hai từ saved Neo4j baseline; không prediction impact hoặc score. Kết quả cho thấy nguồn trùng nhiều ở corpus nhỏ, không suy ưu thế retrieval. Assumptions/evidence/contract metadata gốc giữ trong graph context; source ngoài packing không bị dẫn path như thể đã cung cấp.

Giữ bản đầu `handoff-out/p02-static-context/20261101T162939420Z-df0eb1f0`: qua structural checks ban đầu nhưng thiếu native edge assumptions/evidence dù flag nói retained. Rà nội dung phát hiện, thêm regression test trước sửa và quan sát exit 1; sửa packer/checker giữ edges nguyên metadata, cuối **12/12 unit tests** đạt. Không sửa native input, source/patch hoặc bỏ giả định khỏi oracle để làm pass. Bản đầu superseded, chưa được dùng inference/scoring.

Run hoàn tất: `handoff-out/p02-static-context/20261101T163443406Z-ec587653`, manifest SHA `522ff7cf930884a6be8d317b7b0b1a16ecf4f463fb2f6560407bec5fa22fb435`, 26 files. Checker độc lập đạt. Thêm lượt negative `20261101T163517180Z-99cbf0e0` với byte limit 0: cả bảy previews input_not_packable, exit 1 và failure/raw/code/input preservation giữ; đây là test guard, không model failure hoặc scenario mới.

Audit/lệnh/log trước–sau tại `handoff-out/p02-static-context-audit/20261101T163425528Z-bda056f1`. [Hướng dẫn](../../pipeline/p02/STATIC_CONTEXT.md), [status](../P02_STATIC_CONTEXT_STATUS_2026-11-01.json). Không quảng bá B3+LLM/B5 đã hoàn chỉnh, không áp contract output nháp hoặc gọi BM25 là vector/semantic retrieval. Các giới hạn Method inventory/Class.name/P03 serialization, independent label review và campaign tạp chí vẫn mở.
