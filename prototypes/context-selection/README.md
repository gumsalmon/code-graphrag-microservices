# Chọn ngữ cảnh và nối thử offline

Chỉ dùng source/ID/đồ thị tổng hợp trong `fixtures.mjs` hoặc profile của runner Java tổng hợp qua native bridge bên dưới. Không đọc PetClinic, nhãn, packet Phát, credentials hoặc kết nối Neo4j/Chroma/provider/scorer. Đây là phần chuẩn bị của Huy/AI, tách khỏi việc sửa parser/importer của Hiển.

```powershell
node --test prototypes/context-selection/selector.test.mjs prototypes/context-selection/integration.test.mjs
node prototypes/context-selection/demo.mjs lexical unknown
node prototypes/context-selection/demo.mjs graph failure
node prototypes/context-selection/demo.mjs combined outside-context
```

`demo` in JSON ra stdout, không mở server hoặc tạo file. Tham số thứ nhất là `lexical`, `graph`, `combined`; tham số thứ hai là `unknown`, `failure`, `invented-quote`, `outside-context`, `omitted`. Các phản hồi đều là fixture cố định để kiểm plumbing, không phải suy luận AI hay kết quả mô hình. Exit 0 của demo có nghĩa đã xuất hồ sơ kiểm; đọc `validation_status` bên trong để biết fixture hợp lệ hay lỗi. Test runner mới là kiểm regression có exit theo assertion.

## Phần đã triển khai

- BM25 theo từ/camelCase/Unicode, k1=1.2, b=0.75, tie theo document ID; không embedding hoặc fallback vector. Corpus là toàn bộ document toy được cung cấp, không chọn theo gold.
- Duyệt ngược cạnh Method `CALLS`/`INVOKES_API` đã `RESOLVED`, tối đa 1–3 hop; giữ một witness ngắn nhất, số lần qua service riêng. Không tính containment/exposure thành hop, không dùng cạnh unresolved. Chưa chứng minh đây là đường ít boundary nhất hoặc mọi đường có thể có.
- Context UTF-8 có query, marker citation và nguyên source block. Seed source bắt buộc; có thể thêm mandatory IDs. Ghi selected/dropped, hash input/options/source/context. Vượt trần mandatory báo `input_not_packable`; không cắt source hoặc bỏ seed ngầm.
- Route lexical không đọc nội dung graph; request kiểm tương ứng không có graph edges. Route graph không dùng lexical ranking. Route combined lấy graph trước rồi union lexical, top-k riêng mỗi route. Đây chưa là cấu hình B5 Graph+semantic hoặc ablation cân bằng thông tin.
- Harness nối selection → registry/citation context → phản hồi cố định → validator ba cấp → telemetry. Registry API/Service là toy khai tường minh, không suy impact từ Method. Nguồn ngoài selected context không được trích dù có trong corpus ban đầu.
- Unknown, omitted, invalid và provider failure được giữ khác nhau. Context overflow dừng trước attempt. Clock telemetry cố định năm 2000, usage/token/cost không đo, actual remote calls = 0. Số ms fixture không phải phép đo hiệu năng code; không ghi stage retrieval/traversal như thể đã đo thật.

## Giới hạn trước áp dụng thật

Trần hiện tại chỉ tính **byte của phần context**, chưa tính toàn request/schema/registry hoặc token provider. Không được gọi là đáp ứng token budget. Chưa có chunking source thực tế, patch packing, contract/consumer metadata extraction, embeddings, Neo4j adapter, model transport hoặc provenance của real run.

Truy cập được một Method chỉ chứng minh witness đồ thị trong input toy; không tự tạo behavioral/repair assessment. Fixture trả unknown cho mọi cấp để thử định dạng, không đánh giá chất lượng phương pháp. API/Service eligibility và ID vẫn phải chốt bằng scope/contract được kiểm độc lập.

Hợp đồng D01–D08 và thiết kế E01–E10 vẫn nháp. Trước nối real pipeline cần quyết định version/contract, checkpoint draft/human theo từng ca, implementation Hiển đã kiểm, ngân sách/model nếu có và telemetry thật. Không tự sửa contract hoặc mở input/mutated P03, label acceptance, test lock, scoring hay push từ prototype này.

## Nối native JSON của runner tổng hợp

Ngày 28/10 thêm `native-bridge.mjs`: chỉ nhận metadata profile `synthetic://java-rest-regression` / `not-a-git-commit:synthetic-dev-fixtures-v1` / `synthetic_dev`, không phải metadata của P01/P02/P03. Marker này là kiểm profile, **không xác thực provenance**; chỉ dùng cùng artifact/hash của lượt kiểm đã biết. Không bật quyền real run từ việc đổi marker.

Bridge nhận source binding tường minh cho từng native Method, kiểm declaration và giới hạn dòng, lấy excerpt chuẩn LF; giữ hash toàn source UTF-8 gốc riêng. Native virtual file path không tự dùng làm locator file. Aliases sang `toy-native-repo@toy-native-snapshot` được kê khai; chưa là cross-revision identity hoặc contract production. Cạnh được ánh xạ theo endpoint đã có, không tự phát minh Method/edge khi unresolved. Endpoint/edge contract metadata và unresolved giữ để audit, chưa pack thành annotation hoặc model prediction.

```powershell
node --test prototypes/context-selection/native-bridge.test.mjs
node scripts/check_synthetic_native_context.mjs --run YOUR_NEW_SYNTHETIC_RUN_DIRECTORY
```

Replay driver đọc REPORT, native JSON và source do runner gốc sinh, chỉ xuất JSON ra stdout. Profile có 10 case, S09 thêm CRLF; mỗi variant chạy lexical/graph/combined. Dùng endpoint duy nhất làm software anchor cho từng ca, kể cả Entry endpoint của S08/S10, không giả có callee seed đã bị inventory lọc. Đây chưa là known-seed benchmark, provider inference hoặc pipeline E2E PetClinic.

Native nodes đã bị parser lọc theo logic hiện hành; không dùng chúng làm evaluation universe hoặc chứng minh tất cả source đã được xét. Driver liệt kê file fixture chưa có native Method binding, giữ diagnostic và không gán âm cho phần thiếu. Route lexical không dựa graph để chọn doc, nhưng adapter đã đọc graph để kiểm/ánh xạ schema; chưa có thiết kế ablation chính thức. Xem [audit Hiển và replay](../../tasks/research/HIEN_SYNTHETIC_RETURN_AUDIT_2026-10-28.md), gồm lỗi driver đầu được giữ và phạm vi sửa driver v2.
