# P03 — kiểm phạm vi đầu vào trước khi khóa

Mục tiêu của lượt này là xác định bộ source, patch, fixture, danh sách Method/API/Service và alias có đủ rõ, đúng và nhất quán để đề nghị chốt đầu vào hay còn cần sửa. Chưa gán nhãn tác động và chưa quyết định phương pháp nào tốt hơn.

Đọc `CONTEXT_FOR_SCOPE_REVIEW.md`, sau đó làm theo `TASK_PHAT.md`. Không cần Docker, Java, API key hoặc tài khoản GitHub để kiểm bộ file. Có thể dùng editor và Node để kiểm toàn vẹn; không bắt buộc chạy lại ứng dụng. Source gồm các file được chọn tại pin, không phải toàn bộ repository.

## Bắt đầu

1. Kiểm SHA-256 của ZIP với sidecar rồi giải nén vào thư mục mới. Chạy kiểm toàn vẹn từ gốc thư mục đã giải nén:

   ```powershell
   node tooling/scripts/verify_p03_scope_packet.mjs --root .
   ```

   Lệnh này chỉ đọc/kiểm các file; không chạy Docker/HTTP/model, không tạo nhãn hoặc xác nhận thay người. Checksum không chứng minh người thật đã đọc hoặc người gửi đã được xác thực độc lập.

2. Đọc source/patch/SQL trong `candidate/input/app/`, `candidate/input/config/`, `candidate/spec/owner-response-rename.patch` và file đề nghị sau áp patch trong `candidate/mutated/app/`. Đây là source đề nghị, **chưa có mutated runtime**. Dùng `templates/INDEPENDENT_NOTES.md` để ghi phần trực tiếp đã xem. Ghi exposure đúng thực tế; không gọi blinded nếu đã xem gợi ý AI hoặc hồ sơ đề nghị.

3. Trước khi dựa vào bộ đếm/kiểm tổng hợp, tự kiểm các explicit method/mapping trong sáu top-level class được nêu ở task. Lưu notes ở thư mục return riêng, ghi hash/ngày thật nếu có thể. Nếu đã xem proposal trước thì khai đúng, không sửa ngược lịch sử đọc. Không cần dựng một mốc thời gian chính xác nếu không biết.

4. Đối chiếu `candidate/spec/scope.candidate.v1.json`, `candidate/draft/inventory.v1.json` và `candidate/draft/evaluation_universe.draft.v1.json`. Đây là đề nghị của phía chuẩn bị, không phải xác nhận phạm vi độc lập. Điền bảng trong `templates/SCOPE_COMPARISON.md`. Kiểm cả mục bị loại và seed; không chỉ đếm tổng.

5. Xem fixture/kế hoạch requests và raw baseline trong `baseline/groups/baseline-r1/` và `baseline/groups/baseline-r2/`. `provenance/BASELINE_INDEX.json` chỉ dẫn tới metadata và raw cụ thể. Ghi mức kiểm: đọc trực tiếp, kiểm tự động hay chỉ xem summary. Khi cần đối chiếu kỹ thuật bổ sung sau notes, có thể chạy:

   ```powershell
   node tooling/scripts/verify_p03_scope_packet.mjs --root . --records
   ```

   Mode này mở proposal/record tổng hợp và kiểm nhất quán. Không dùng nó thay cho nhận định con người hoặc chạy scorer.

6. Gửi một thư mục return mới, dùng `templates/RETURN_PHAT.md`, kèm notes, bảng đối chiếu, exposure và log/hash của những lệnh thực sự đã chạy. Chọn kết luận thực tế: **đủ điều kiện đề nghị chốt**, **cần sửa**, hoặc **chưa đủ căn cứ**, với từng điểm rõ ràng. Template để trống là trạng thái chưa làm, không phải xác nhận pass.

## Trạng thái và cấu trúc

Huy đã chọn C03-A và cho baseline theo D18, lưu tại `decisions/SELECTION_BASELINE_2026-10-28.json`. `CURRENT_STATE.json` ghi trạng thái sau quyết định này. Các flags `selected=false`, `runtime=false` trong **candidate frozen** mô tả lúc tạo ngày 25/10; giữ nguyên để truy vết. Chọn ca và baseline không tự khóa scope/universe.

`candidate/` giữ toàn bộ 52 file của gói chuẩn bị và manifest gốc. `baseline/` giữ hồ sơ hai baseline group, raw/commands/identity/config/cleanup. `baseline-build/` giữ provenance/log build, source hashes và manifest; năm JAR và hai TAR được loại có khai báo trong `META/transfer.json`. `baseline-audit/` là kiểm kỹ thuật từ phía chuẩn bị; không phải nhận định độc lập của Phát. Không có source archive đầy đủ, JAR/image/cache trong ZIP, nên không tự nhận đã replay toàn bộ build/runtime chỉ bằng verifier portable.

Không có labels P01/P02/P03, output parser/Neo4j/retrieval, prediction, score hoặc context điều phối toàn dự án trong gói này. Không cần đọc các kết quả đó để kiểm phạm vi. Những path tuyệt đối của máy nguồn trong log lịch sử được giữ nguyên; verifier không mở chúng trên máy người nhận.

Lượt này không cho build/chạy mutated, lập hoặc duyệt nhãn P03, khóa final test, chấm điểm, gọi model, push hoặc merge. Khi có phiếu kiểm thật, quyết định input lock và quyền mutated vẫn do Huy ghi riêng. Việc gửi packet chưa có nghĩa người nhận đã nhận việc hoặc hoàn thành kiểm.
