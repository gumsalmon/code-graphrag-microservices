# P01 · Evidence Lab

Demo trực quan cho một mutation trong Spring PetClinic: endpoint `GET /pets/visits` yêu cầu thêm `includeDetails`, còn client và gateway giữ nguyên.

Đây là trình xem bằng chứng đã lưu kèm lớp chuẩn bị context/kiểm tra phản hồi offline, **không phải pipeline GraphRAG chạy live**. Không cần Docker, Python, model cache hay API key để xem. Demo chưa gọi semantic retrieval hoặc LLM, không tính F1 và không phê duyệt nhãn.

## Mở demo

Mở `index.html` bằng Chrome hoặc Edge. Giữ `index.html`, `app.css`, `app.js`, `data.js` và `reasoning-core.js` trong cùng thư mục. Khi chuyển bản demo cho người khác, giữ README và license đi kèm.

Hoặc chạy từ thư mục gốc repository, nếu đã có Node.js:

```powershell
node demo/p01/server.mjs
```

Sau đó mở [http://127.0.0.1:8787](http://127.0.0.1:8787). Server chỉ lắng nghe loopback và chỉ phục vụ năm asset của viewer; không có API chạy parser, truy vấn database, gọi LLM hoặc sửa dữ liệu. Dừng bằng `Ctrl+C`. Nếu port đang được dùng:

```powershell
node demo/p01/server.mjs --port 8788
```

## Xem trong khoảng 5 phút

1. Ở **Đồ thị phụ thuộc**, chuyển Baseline / Mutated. Bấm method hoặc cạnh; bên phải hiện bằng chứng, bên dưới hiện mã nguồn đúng snapshot. Có thể dùng Tab và Enter để chọn các thành phần. Trên điện thoại, cuộn ngang trong vùng graph.
2. Bấm **Theo dấu từ seed**. Hoạt ảnh minh họa kết quả Neo4j đã lưu, không chạy truy vấn mới. Tuyến đi ngược từ `VisitResource.read(List<Integer>, boolean)` đến client rồi gateway. Mũi tên trên graph vẫn biểu diễn caller → callee.
3. Ở **Patch & contract**, so sánh tham số provider với tham số client gửi. `read(int)` là overload khác, không được ghép vào endpoint `/pets/visits` chỉ vì cùng tên method.
4. Ở **Quan sát HTTP**, đối chiếu bảy request. Gateway trả HTTP 200 ở cả hai snapshot nhưng tổng visits trong body chuyển từ 4 xuống 0. Provider mutated thiếu tham số trả 400; có `includeDetails=true` trả 4 visits. Bấm **Xem code fallback** để đối chiếu đường xử lý. Visits rỗng trong response không chứng minh dữ liệu bị xóa khỏi database.
5. Ở **Nguồn & giới hạn**, xem SHA, thời điểm, môi trường và tải artifact gốc. JSON, JSONL, Java và patch được tải bằng byte gốc; bundle JSON là bản đóng gói của viewer, không phải raw evidence mới.

Trang **Context & LLM** bổ sung ở bước 3:

- Chuẩn bị source baseline + patch dự kiến, có/không có graph tĩnh; chọn giới hạn 1/2/3-hop và ngân sách UTF-8 byte. Không đưa runtime/nhãn vào context, dù các trang khác của viewer hiển thị log HTTP. Toggle snapshot của viewer không thay source baseline của context dự đoán.
- Tải gói request gồm prompt version, context, output schema và checksum. Không tự chọn model, không đếm token ước đoán, không gọi API.
- Có thể nhập phản hồi JSON để kiểm ID, overload, seed exclusion, quotes và đường đi. Phản hồi nhập thủ công không chứng minh đã chạy model nào hoặc đã dùng đúng prompt; ghi rõ provider/model chưa xác minh.
- Dẫn chứng source mở baseline đúng dòng. Kiểm tra quote/schema/path đạt không xác nhận dự đoán behavioral impact hoặc cần sửa mã đúng; không chuyển thành ground truth. Đổi cấu hình context sẽ xóa kết quả hiển thị cũ.

Chi tiết CLI, schema, adapter và ranh giới nghiên cứu nằm trong `reasoning/p01/README.md` ở repository. Source-only là cấu hình đối chứng sơ bộ, không phải Vector RAG. Lớp hiện tại dự đoán Method; chưa dự đoán/đánh giá riêng API và Service hoặc tái chạy pipeline live. Chroma semantic retrieval đã được kiểm riêng trong CLI bước 4; viewer này vẫn dùng context v1, không gọi Chroma.

## Xem phản hồi Gemini thật của smoke bước 3

Ngày 12/10/2026, CLI nhận phản hồi `gemini-3.8-flash` qua kiểm cấu trúc trong khoảng 22 giây. Hồ sơ nằm cục bộ, Git ignored, chưa được push hoặc tự đóng gói vào viewer.

1. Mở trang **Context & LLM**, giữ **Source + graph tĩnh**, **2 hop**, **32768 byte**.
2. Bấm **Nhập phản hồi JSON**, chọn `E:\NCKH\code-graphrag-microservices\handoff-out\p01-reasoning\20261012T154435050Z-live-c20d99cf\response.json` — không chọn envelope `provider-response.json` hoặc `validated.json`.
3. Xem bốn method được model phân tích. Hai method có đường phụ thuộc là client (1 hop) và controller (2 hop); `read(int)` và `create(Visit,int)` được model ghi chưa thiết lập phụ thuộc, không phải method tác động thêm.
4. Bấm các dẫn chứng để mở source baseline đúng dòng. Prediction và câu chữ gốc không được sửa để làm đẹp kết quả.

Banner **không xác minh provider/model** của thao tác import vẫn được giữ: viewer chỉ kiểm JSON cục bộ, không thể xác nhận file được sinh bởi API nào. Bằng chứng provider nằm riêng trong `run.json`, `provider-response.json`, code provenance và manifest của CLI. Xem [báo cáo smoke](E:/NCKH/code-graphrag-microservices/tasks/research/P01_GEMINI_SMOKE_SUCCESS_2026-10-12.md). Không coi dự đoán này là ground truth hoặc kết quả đánh giá chính thức.

Các method ngoài tuyến query chỉ có nghĩa “không xuất hiện trong kết quả truy vấn này”, không tự trở thành nhãn negative. Mỗi cạnh CALLS / INVOKES_API tính một hop; ranh giới service được đếm riêng; seed bị loại khỏi tập ứng viên.

## Nguồn dữ liệu

| Lớp bằng chứng | Revision / thời điểm | Phạm vi |
| --- | --- | --- |
| PetClinic baseline | `3858f9c630cf989bb6809a86edf47c2be78dc9f1` | Ba file Java, giữ header nguồn |
| Implementation của Hiển | `e95613795133088621117179c9fb9592dab62b16` | Parser → import → Neo4j → query; kiểm chứng riêng ngày 12/10/2026 |
| Gói benchmark của Phát | `5f9204d66253604edf9101c2f888fc7e75aa0be7` | Raw runtime ngày 23/09/2026; sáu artifact runtime được dùng và kiểm checksum ở bước build demo |

Suite kỹ thuật có **59 test pass, không skip**. Đây là suite của implementation đã pin, không phải 59 test cho UI, không phải điểm benchmark và không phải quyết định reviewer. UI có bộ test riêng bên dưới.

Neo4j chạy thật trên container riêng. Python 3.11.16 chạy trong Linux container; Docker Desktop bridge cần TCP relay để chuyển tiếp đến port Neo4j của lượt chạy, không thay Bolt payload. Không suy rộng thành bằng chứng chạy Python native trên Windows.

Runtime PetClinic là log lịch sử, **không chạy lại ứng dụng trong bước tạo demo**. Ba file baseline runtime khớp file nguồn của lượt kỹ thuật sau chuẩn hóa CRLF → LF. Patch kỹ thuật LF và patch runtime UTF-16LE có hash khác nhau; builder xác minh các dòng Java thêm/xóa tương đương sau chuẩn hóa khoảng trắng, không tuyên bố hai patch giống từng byte.

Parser nhận diện đích HTTP theo hostname mặc định và ghi rõ `setHostname` có thể thay đổi đích ở runtime. Demo không chứng minh khả năng phân giải tổng quát mọi microservice, config động, gRPC hoặc ngôn ngữ khác.

**Nhãn P01 vẫn `pending_review`; P02–P04 chưa được mở hoặc khóa split.** Demo không chứa `labels.v3.json`, output scorer hoặc hồ sơ phê duyệt.

## Dùng trong review

Demo tiết lộ output hệ thống và quan sát runtime. Không thay thế gói source-first lượt 1 đã đóng băng. Reviewer cần ghi nhận định độc lập từ source, patch và raw runtime theo protocol trước khi xem output hệ thống, summary hoặc nhãn dự thảo. Việc xem demo hoặc test kỹ thuật đạt không tự tạo quyết định chấp nhận ground truth.

## Kiểm thử và tái đóng gói

Test offline chỉ cần Node.js; dữ liệu fixture lấy từ các artifact gốc đã đóng gói, không cần các thư mục evidence cục bộ:

```powershell
node --test demo/p01/demo.test.mjs
```

Kiểm tra thêm lớp reasoning/adapter bằng fixture offline, không liên hệ provider thật:

```powershell
node --test reasoning/p01/reasoning.test.mjs demo/p01/demo.test.mjs
```

Kiểm tra tương tác trình duyệt, file://, download checksum và layout desktop / điện thoại:

```powershell
node scripts/check_p01_demo_browser.mjs
```

Kiểm thêm thao tác import với file phản hồi đã lưu, không gọi lại Gemini:

```powershell
node scripts/check_p01_demo_browser.mjs --response-file handoff-out/p01-reasoning/20261012T154435050Z-live-c20d99cf/response.json
```

Tùy chọn này kiểm ID/summary hiển thị, tải validation khớp core và mở citation baseline; report ghi hash file nhập nhưng không tự xác minh provider hoặc semantic correctness. Không thay fixture tổng hợp bằng kết quả model để biến UI test thành điểm benchmark.

Script trình duyệt cần Playwright và Chrome đã cài. Mặc định thử module Playwright của project, rồi runtime Codex cục bộ trên Windows. Có thể chỉ định `P01_PLAYWRIGHT_MODULE` và `P01_CHROME_PATH`; không có thao tác tự cài hoặc tải dependency. Screenshot/report sinh vào run directory mới bên trong `handoff-out/p01-demo-qa-20261012/`, được Git ignore, không ghi đè lượt trước. Script chỉ mở server loopback tạm thời và đóng lại khi kết thúc. Phản hồi tổng hợp trong test UI chỉ kiểm thao tác/escaping, không được lưu làm kết quả LLM.

`data.js` được tạo bằng builder, không gõ số liệu hay chỉnh source bằng tay. Builder kiểm SHA-256 trước khi đọc JSON/source và đối chiếu query paths, inventory, JUnit, patch và nguồn runtime:

```powershell
node scripts/build_p01_demo.mjs --evidence-root handoff-out/p01-step1-20261012-02747b5d/evidence-bridge --out demo/p01/data.js
```

Lệnh build cần đúng thư mục evidence của bước 1, `independent-checksums.sha256` và Git object của commit benchmark đã pin. Clone chỉ có thư mục demo vẫn xem và chạy test offline được, nhưng không mặc định có các bằng chứng bước 1 để build lại. Nếu dùng lượt kỹ thuật mới, cần review lại revision/schema và nguồn bằng chứng; không tự thay SHA hoặc nâng trạng thái pilot.

## Mã nguồn bên thứ ba

Các file Java đóng gói đến từ [Spring PetClinic Microservices](https://github.com/spring-petclinic/spring-petclinic-microservices/tree/3858f9c630cf989bb6809a86edf47c2be78dc9f1), theo Apache License 2.0; bản license đi kèm trong `LICENSE.petclinic.txt`. Header copyright được giữ trong source.

Snapshot `mutated` của `VisitResource.java` đã được nhóm nghiên cứu sửa: thêm tham số boolean `includeDetails` bắt buộc cho handler `/pets/visits`. Đây là mutation nghiên cứu cục bộ, không phải commit upstream. Patch đi kèm ghi thay đổi; hai file consumer giữ nguyên. Không sửa raw source để chèn thêm nội dung vào bằng chứng đã hash.
