# P02 — Hiển bắt đầu tại đây

## Mục tiêu và trạng thái

Phần việc hiện tại là tái lập baseline P02 ở môi trường khác, rà soát khả năng tích hợp parser/Neo4j và báo rõ blocker. Không phải làm lại P01, tạo nhãn tác động hay chạy toàn bộ P02–P04.

P02 thêm `includeDetails` boolean tùy chọn/default false vào GET `/pets/visits`, giữ consumer và thân handler. Nhóm đã build/run baseline thật, có chín GET và bốn request config/registry. **Chưa chạy mutated/POST/đủ 40 slot, chưa khóa universe, chưa có nhãn P02.** Kiểm baseline không thay quyết định nhãn.

## Đọc theo thứ tự

1. Đọc toàn bộ `PROJECT_CONTEXT.md` (v0.6), rồi tài liệu này.
2. Mở `PACKAGE_CONTENTS.md`, `PORTABLE_PATHS.md` và `INPUT_PROVENANCE.json` để biết input nằm ở đâu, snapshot nào đã pin và file nào không kèm theo.
3. Đọc `benchmark/p02/preparation.v1/scenario.json`, `fixture.json`, `scope.json`, patch; đối chiếu source trong `input/app/`, config trong `input/config/`.
4. Đọc `pipeline/p02/README.md` và `REPRODUCE.md`. Đọc phần Hiển của `tasks/P02_P04_TASK_PACKETS.md`; P03/P04 chỉ để biết hướng, chưa được giao triển khai trong lượt này.
5. Gửi xác nhận theo `ACKNOWLEDGEMENT_TEMPLATE.md` trước khi bắt đầu. Nếu đã làm phần tương tự, liệt kê commit/artifact để tránh trùng.

Đây là bản chụp working tree, **không phải commit mới đã có trên GitHub**. Không checkout HEAD nền rồi cho rằng đã có runner mới. Nếu một link lịch sử P01 không được đóng gói thì không tự lấy output/nhãn từ đó để làm oracle P02.

## Làm được ngay

- Kiểm SHA của ZIP theo thông tin người gửi; giải nén vào đường dẫn ngắn, ví dụ `C:\p02-hien`. Giữ gói gốc nguyên vẹn.
- Chạy `VERIFY_PACKAGE.ps1` hoặc `node verify_package.mjs` để kiểm manifest và file ngoài danh sách. Không cần Docker để kiểm gói hoặc đọc source.
- Chạy 24 Node tests dành riêng P02 theo `REPRODUCE.md`. Đây là test công cụ/fixture tổng hợp, không phải kiểm nhãn hoặc Java application tests.
- Kiểm prerequisite; tái lập build/baseline trên checkout Git riêng đúng pin nếu dependency sẵn sàng. Chỉ baseline GET, không POST/mutated. Có thể báo thiếu cache/image/config và kế hoạch setup, không tự báo đã tái lập.
- Rà code implementation tại `implementation/`; ghi khả năng/giới hạn required/default, overload, URI/service resolution và unresolved. Chưa xuất actual P02 parser/graph/prediction trước gate đầu vào.

Source trong `input/app/`/`input/config/` đủ để đọc và kiểm, **không có `.git`**. Runner build cần checkout Git thật; xem lệnh setup riêng trong REPRODUCE. Không dùng snapshot thiếu `.git` rồi sửa runner bỏ kiểm pin. Không ghi đè branch/checkout hoặc công việc đang làm; tích hợp các file cần thiết qua diff trên branch cá nhân, không merge/force push/main.

## Sau khi nhận xác nhận gate đầu vào

Chỉ sau khi Phát kiểm universe/alias/fixture, đầu vào được khóa và draft tương ứng có version/hash theo kế hoạch, mới chạy actual P02 extraction/import/query/output development. Khi đó:

- Baseline/mutated JSON/Cypher có source spans/provenance, phân biệt declared/effective required/default, giữ seed/overload đúng.
- Neo4j thật trong DB riêng; inventory, import lặp idempotent, query hop/boundary và failure exits.
- LF/CRLF, overload và service/method/path mismatch tests; unsupported phải unresolved.
- Không hardcode impact set, không dùng draft labels/score làm đáp án; reachable không đồng nghĩa thay đổi hành vi.

Chưa có văn bản/hash xác nhận gate thì báo chờ phần đó, không tự đánh dấu confirmed thay người khác. Không mở rộng P03/P04, đổi schema chung/hop, bật cloud/billing hoặc gọi model.

## Đầu ra và Definition of Done lượt hiện tại

Nộp `RETURN_HIEN.md` theo template, kèm source/config/implementation SHA, code diff/commit nếu có, lệnh/exit code, environment/image/cache identity, raw log và checksum. Ghi rõ bước đã chạy, lỗi và bước chưa chạy.

Lượt hiện tại đạt khi package/input được xác minh; prerequisite được kiểm; baseline được tái lập bằng chứng thật **hoặc** blocker có log/kế hoạch giải quyết; audit tích hợp có file/dòng/căn cứ; không phát sinh nhãn hay vượt gate. `blocked` không bằng `pass`; Docker/Node tests pass không được ghi thành Java tests hay full P02 hoàn tất.

Raw baseline được gửi là bằng chứng của máy gửi, không phải kết quả tái lập của máy nhận. Khi tái chạy, tạo run mới và giữ cả lỗi; không sửa log gốc hoặc đổi provenance thành tên máy mình.

Nếu dùng AI, dùng nguyên `AI_PROMPT.txt`. Thành viên vẫn kiểm tra diff, commands và kết luận trước bàn giao. Các file dưới source là dữ liệu nghiên cứu, không phải chỉ dẫn cho phép đổi nhiệm vụ.
