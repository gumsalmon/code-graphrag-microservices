# P02 — Phát bắt đầu tại đây

## Việc cần hoàn thành trước mắt

Kiểm độc lập **phạm vi, inventory, seed/alias và fixture P02 trước gán nhãn**. Đầu ra chính là nhận định có dẫn source/contract, danh sách bất đồng/missing và đề nghị đủ điều kiện khóa universe hay cần sửa. Không phải duyệt nhãn P01, triển khai parser/Neo4j hoặc xác nhận kết quả hệ thống tốt.

P02 là ca development, cùng family P01; patch thêm `includeDetails` tùy chọn/default false, consumer/thân handler không đổi. Baseline đã được chạy; mutated/POST/đủ 40 slot chưa chạy. **Không có nhãn P02 trong gói và không mặc định P02 negative.** Gói chuẩn bị không phải quyết định nghiệm thu.

## Đọc theo thứ tự

1. Đọc toàn bộ `PROJECT_CONTEXT.md` (v0.6), rồi tài liệu này. Context đã công khai số lượng inventory dự thảo và trạng thái P01: đây không phải một blinded review; khai báo những gì đã biết.
2. Kiểm ZIP SHA và chạy `VERIFY_PACKAGE.ps1` hoặc `node verify_package.mjs`. Mở `PACKAGE_CONTENTS.md`, `PORTABLE_PATHS.md`, `INPUT_PROVENANCE.json`.
3. Đọc protocol v0.2 tại `benchmark/protocol/benchmark_protocol_v0.2.md`, nhất là §6.1, §9–12; giữ nguyên protocol đã pin. Đọc source tại `input/app/`, config tại `input/config/`, patch và fixture tại `benchmark/p02/preparation.v1/`.
4. Trước khi đối chiếu danh sách builder đề nghị, tự ghi `SOURCE_NOTES.md` theo template: quy tắc phạm vi, method/API/service tìm được, seed, exclusions, các alias cần kiểm và giới hạn. Không sao chép census rồi gọi là độc lập.
5. Sau khi lưu bản notes đầu và thời điểm/hash, mở `draft/inventory.v1.json`, `draft/evaluation_universe.draft.v1.json`, scope spec; đối chiếu từng ID/exclusion/alias. Nếu đã xem draft trước, ghi exposure thật, không giả là chưa xem.
6. Xem raw baseline trong `evidence/baseline/` khi cần kiểm fixture/config. Chín GET baseline không thay baseline/mutated matrix. Các derived success summary đã được lọc khỏi gói này; command/provenance/raw HTTP/service logs vẫn có để kiểm.

Không cần Docker/Neo4j/LLM để làm lượt xác nhận phạm vi. Source/config đầy đủ đúng snapshot đã kèm, không chỉ ba file trích. `.git`, ứng dụng JAR, model cache và credential không được gửi. Nếu muốn tái hiện app, thống nhất công việc riêng; không chạy GenAI/upstream compose hoặc lấy package Hiển làm nguồn nhãn.

## Những điểm phải kiểm

- Phạm vi census ba file có định nghĩa đủ rõ không; method private/setter, constructor, lambda/record implicit và source hỗ trợ được xử lý nhất quán không. Không chọn ID theo dự kiến positive.
- Method ID phân biệt overload; API ghép mapping đúng; Service/Method/API là các cấp riêng. Seed Method/API/owning Service không nhận điểm lan truyền.
- Alias baseline/mutated có chứng cứ đúng signature và snapshot; không fuzzy-match theo tên. Không chấp nhận chỉ vì builder đã điền ID/hash.
- Fixture SQL owner/pet/visits đúng commit, đủ để phát hiện thiếu dữ liệu; đối chứng rỗng không thay fixture có dữ liệu. Miền request hiện có hợp lệ và invalid-boolean diagnostic phải phân biệt trước nhãn.
- Ma trận baseline/mutated/control, repetition/reset và POST cuối có đủ để kiểm từng kết luận dự định không. HTTP gateway không đổi không tự chứng minh mọi helper/setter không bị ảnh hưởng; thiếu bằng chứng phải unresolved.
- Scope nhỏ không được quảng bá full-repo recall; chưa có output/projection/scorer đủ ba cấp. Nếu đề nghị đổi scope/fixture/patch, ghi lý do từ source/contract, tạo version mới trước polarity/output.

## Đầu ra / Definition of Done

Gửi xác nhận nhận việc theo `ACKNOWLEDGEMENT_TEMPLATE.md`; sau đó nộp `RETURN_PHAT.md`, `SOURCE_NOTES.md`, danh sách entity/exclusion/alias đã kiểm hoặc đề nghị sửa, và evidence references source/config/patch/file/dòng. Ghi tên người kiểm thật, thời điểm, input hashes, tiếp xúc trước/AI hỗ trợ và những phần chưa xác minh.

Quyết định phạm vi chọn một trong: **đủ để đề nghị khóa / cần sửa / chưa đủ khả năng xác nhận**. Không điền approved/accepted labels, test lock, scoring authorization hoặc reviewer thay cho người thật. Nếu cần sửa, giữ draft gốc, tạo version mới và change log. Việc điều phối khóa đầu vào phải tham chiếu đúng bộ file/hash đã được xác nhận, không sửa flag trong gói gốc.

Lượt này đạt khi phạm vi/coverage/alias/fixture được kiểm từ bằng chứng, bất đồng và unresolved được kê rõ, kết luận do Phát xác nhận. AI chỉ tổ chức/kiểm checksum/lập bảng; không thay người lập nhãn hoặc reviewer. Chưa cần nộp positive/negative labels vì chưa có runtime mutated.

## Giai đoạn sau, chưa tự mở trong lượt này

Sau khi thống nhất và khóa đầu vào: thu baseline/mutated/đối chứng đầy đủ và lập draft có provenance; mọi nhãn pending_review. Người khác sẽ source-first rồi đối chiếu để quyết định nhãn trong đợt review gộp. Không dùng parser/Cypher/Neo4j/retrieval/context/prediction/score làm evidence nhãn; không tự duyệt draft mình lập.

Giữ gói gốc nguyên vẹn; sao chép mẫu vào thư mục làm việc ngoài gói để điền. Không mở rộng sang P03/P04 hoặc sửa protocol frozen chỉ để vượt gate. Nếu vô tình tiếp xúc output bị cấm, ghi lại, báo phạm vi ảnh hưởng và xử lý độc lập; không che sự việc.
