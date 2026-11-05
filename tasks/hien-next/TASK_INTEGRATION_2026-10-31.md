# Kết quả cần bàn giao — extraction / Neo4j / retrieval

## Mốc A: làm ngay, chỉ tổng hợp và chuẩn bị

Xác nhận phần diff parser/importer đã tự kiểm. Giữ candidate parser SHA `fb20def957a46c5bf41662326fa5c4e955593cb532cdad476dc9263ae9b6e8d9`, importer SHA `8e418f34cc4e620cc924b37f23baccd8ad2f150579768cb34fffc97ec55ed08c`; nếu có code mới hơn, bàn giao diff/hash thay vì ghi đè để khớp bản này.

Chuẩn bị adapter nhận input/snapshot/seed/provenance và runner tách source-input khỏi output. Trên source Java tổng hợp, khảo sát response-field/record/DTO và consumer access phục vụ P03. Nêu metadata nào hỗ trợ, expression nào unresolved, thay đổi nào cần contract decision. Không cần thêm gRPC, model hoặc giao diện ở mốc này.

DoD: lệnh chạy/phiên bản, synthetic native JSON/Cypher nếu thuộc kiểm tổng hợp hiện hành, tests và failure logs, diff/hash, compatibility/limitations rõ. Không dùng toy case làm kết quả CIA, không tự áp hợp đồng output Method/API/Service mới.

## Mốc B: P02 sau receipt checkpoint P02

Input scenario 0.1.1/universe draft.v2/fixture v1, source/config theo D15/D20. Chỉ mutation optional query `includeDetails`, required=false/default=false; không đổi consumer/thân handler hoặc chồng P01/P03.

1. Extraction baseline/mutated từ source bytes đã khóa, snapshot và seed đúng overload, output native cùng metadata declared/effective/default/sent-query trong contract kỹ thuật hiện hành; log unresolved kèm expression/file/dòng.
2. Xuất Cypher và import trực tiếp vào Neo4j sandbox riêng, xác minh parity metadata giữa hai đường, idempotence và snapshot isolation bằng DB thật. Giữ query/result/exit/log; ghi unit/mock riêng nếu DB chưa chạy.
3. Retrieval offline với seed và reverse-hop 1–3 trong phạm vi đã thống nhất, lưu cấu hình, IDs/chunks/spans, provenance và lỗi. Graph reachability không tự là behavior/repair prediction. Bước cần model/embedding inference giữ chưa chạy theo D20; không chế dữ liệu để thay vector retrieval thật.
4. Kiểm hồi quy P01 phù hợp phần code đã đổi, không sửa output/log lịch sử. Không cần build/chạy lại runtime benchmark nếu code app/input không đổi và không có yêu cầu bằng chứng mới.

DoD: tất cả artifacts mới có receipt/hash/code version/argv/env giới hạn/exit; đúng input, seed, ID, source spans; import/query thật hoặc blocker đúng mức; output không lẫn nhãn/runtime làm oracle; thiếu hỗ trợ được ghi rõ. Chưa gọi model/scoring hoặc tuyên bố GraphRAG hơn baseline.

## Mốc C: P03 sau receipt checkpoint P03

P03 input scenario 0.1.0/universe draft.v1/fixture v1 đúng D19. Tiếp cận tương tự P02 trên snapshot P03 độc lập, chỉ response-boundary rename. Kiểm khả năng xử lý Map/Optional/record/DTO/consumer-field; nếu native implementation chưa biểu đạt được quan hệ cần thiết, ghi unsupported/unresolved và đề nghị kỹ thuật cụ thể. Không tạo cạnh hoặc API/Service impact chỉ vì đã biết runtime hay để khớp nhãn.

Phần sửa mở rộng cần schema/hop/output contract mới phải được đề nghị trước, chưa áp D01–D08 đang nháp. Có thể bàn giao extraction/limitations đúng contract hiện hành trước, không phải đợi một schema mới hoàn hảo. Các kết luận ảnh hưởng và score để bước thực nghiệm sau.

## Mẫu bàn giao mỗi mốc

```text
Mốc / case / receipt checkpoint (nếu ca thật):
Branch / HEAD / diff / implementation hashes / AI assistance:
Source/config/scenario/patch và input hashes:
Lệnh và dependencies/images/cache đã dùng:
Artifacts / manifest SHA-256 / raw logs / mọi lượt lỗi:
Kiểm đã chạy, pass/fail/skip; unit/mock hay DB thật:
Phần chưa hỗ trợ / unresolved / incompatibility:
Isolation / cleanup / input cũ giữ nguyên:
Phần chưa chạy: model / scoring / acceptance / push:
```
