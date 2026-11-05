# P02 sau checkpoint — sửa parity và kiểm inventory

Receipt P02 đã được coordinator ghi theo D20 ngày 01/11/2026: `P02_TECHNICAL_RECEIPT_2026-11-01.json`. Nó chỉ mở kỹ thuật offline P02, không là nhãn accepted hoặc quyền P03/model/scoring. Gói này chỉ chuyển Hiển; chứa output kỹ thuật P02 nên không chuyển sang Phát đang lập nhãn.

## Đã kiểm, không cần làm lại toàn bộ

Mốc A được nhận, external RETURN khớp ZIP; 85/85 file manifest và chín code hashes khớp. Candidate parser/importer và hai tests cũ nguyên byte. Đã tái hiện độc lập 13/13 tests mới và ba CLI: success, missing seed exit 1, actual-kind refusal exit 1. Chưa có xác nhận cuối phần Hiển đã tự xem trong RETURN; bổ sung ngắn theo sự thật, không yêu cầu làm lại baseline hoặc thủ tục reviewer nhãn.

Coordinator đã kiểm P02 source-only baseline/mutated với candidate hiện tại trên Neo4j 5.26.0 thật, hai DB/container độc lập, import trực tiếp và Cypher lặp cùng snapshot, reverse traversal 1–3 hop. Method/Endpoint/query/edge contract metadata và retrieval parity đạt. Các evidence trong gói là output kỹ thuật, không phải nhãn hoặc score.

## Hai việc cần xử lý trong contract kỹ thuật hiện hành

1. **Class.name parity:** Cypher export đặt `Class.name`, direct importer chỉ đặt `fqn/file`, nên full node-property parity chưa đạt. Đề nghị giữ `Class.name` nhất quán giữa hai đường, có kiểm cùng input trên DB thật. Không đổi ID/schema/hop hoặc che khác biệt bằng xóa field khỏi phép so full-property.
2. **Inventory explicit methods:** native graph hiện có năm Method nodes gồm seed, chỉ biểu diễn bốn trong tám Method eligible ở ba file. Các helper `joinIds`, `setHostname`, `addVisitsToOwner`, `emptyVisitsForPets` chưa có node. Kiểm nguyên nhân filtering của builder; sửa theo quy tắc tổng quát để giữ inventory của explicit methods trong phạm vi source, hoặc bàn giao ledger unsupported rõ nếu chưa thể. Không viết cứng bốn tên/ID, không tự sinh implicit record/synthetic IDs, không gán missing-node là negative. Việc có node không tự chứng minh có dependency hoặc impact.

Đây là kiểm độ đầy đủ dữ liệu kỹ thuật với scope đã khóa, không được xem nhãn để tối ưu kết quả. Chưa áp shared output contract D01–D08/projection Method→API→Service hoặc tạo response-field edges mới. Mốc A response survey vẫn syntax-only, chưa chứng minh producer-consumer serialization/dataflow P03.

## Kết quả và Definition of Done

- Diff/file hashes/code version, AI assistance và phần Hiển trực tiếp kiểm; giữ implementation cũ và artifacts gốc. Không nhập đè main/branch khác hoặc commit/push/merge trong lượt này.
- Unit tổng hợp cho inventory trên nhiều tên/overload/visibility và những trường hợp chưa hỗ trợ; không dùng IDs ca thật làm đáp án hardcode. Giữ source spans/provenance, không sửa fixtures để làm đẹp kết quả.
- Kiểm actual P02 baseline/mutated theo receipt: metadata và full-property parity hoặc blocker cụ thể, idempotence cùng snapshot, không trộn snapshot. Importer hiện dùng keys chưa bao gồm snapshot nên dùng DB riêng; không tuyên bố đã sửa native snapshot isolation.
- Regression phù hợp phần code thay đổi: giữ các kỳ vọng semantic cũ, phân biệt thay đổi cardinality hợp lý do inventory rộng hơn với lỗi ghép cạnh. Không sửa tests chỉ để hết fail; raw logs/lỗi/limits phải có.
- Bàn giao mỗi mốc khi xong. Không cần chạy lại app HTTP runtime/POST hoặc gọi model/embedding, scoring, reviewer approval hoặc P03 thật.

Lưu ý seed native: baseline `read(List<Integer>)`, mutated `read(List<Integer>,boolean)`; HTTP path vẫn GET /pets/visits. Lấy signature theo snapshot/input, không reuse baseline ID rồi bỏ qua guard. Source input/receipt không cho phép chạy ca P03.

## Cách dùng gói

Giải nén mới, chạy `node tooling/scripts/verify_project_transfer.mjs --root .` để kiểm byte; không dùng `--smoke` cho gói chọn lọc này. `implementation/` là candidate nguyên byte đã nhận, `source/` chỉ ba file mỗi snapshot; `evidence/` là các báo cáo native/DB/retrieval được chọn để đối chiếu. `provenance/` ghi hashes/origin; Docker images/dependency cache/DB/JAR không kèm. Đây không phải ZIP full-replay ứng dụng.

Sử dụng môi trường sẵn có đúng dependencies trong extraction evidence và `implementation/tests/`; thiếu image/cache thì báo, không tự tải. Các file native có source path máy nguồn; resolve qua `native_source_map` và `source/<snapshot>/`, không giả đường dẫn máy nguồn tồn tại trên máy nhận. Receipt checker và runner actual cần riêng với runner synthetic-only; không thay marker synthetic để lách gate.
