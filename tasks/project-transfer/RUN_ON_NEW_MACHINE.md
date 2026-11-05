# Mở và kiểm gói trên máy mới

Đây là hướng dẫn kiểm bàn giao. Các bước đầu chỉ đọc dữ liệu, không chạy ứng dụng, Docker, model hoặc chấm điểm. Không cần tài khoản AI trả phí để kiểm file; muốn AI thao tác workspace thì công cụ AI phải được cấp quyền đọc thư mục đã giải nén.

## 1. Giải nén và xác định thư mục

Giữ ZIP gốc. Nếu có file `.sha256` đi kèm, đối chiếu hash ZIP trước khi giải nén. Giải nén vào thư mục mới, đường dẫn ngắn; tránh thư mục đồng bộ đang tự đổi file hoặc giải nén đè lên dự án khác.

Thư mục gốc đúng có `PROJECT_CONTEXT.md`, `FULL_PROJECT_CONTEXT_2026-10-18.md`, `VERIFY_TRANSFER.mjs`, `SHA256SUMS.txt` và `META/transfer.json`. Mã nguồn nằm ngay ở gốc, không cần chuyển `handoff-out` sang vị trí khác.

Mở terminal tại chính thư mục này. Ví dụ nếu đã giải nén tại `C:\NCKH\transfer-20261018`:

```powershell
Set-Location -LiteralPath 'C:\NCKH\transfer-20261018'
node --version
node VERIFY_TRANSFER.mjs --root .
```

Dùng Node.js 24 trở lên; môi trường nguồn đã dùng Node `v24.19.0`. Trình kiểm dùng thư viện có sẵn của Node, **không cần `npm install`**. Nếu máy chưa có Node, cài riêng từ nhà cung cấp chính thức; ZIP không kèm Node runtime.

Kết quả kiểm cần phân biệt: file thực có trong gói bị thiếu/đổi byte là lỗi chuyển giao; artifact bị chủ động loại theo ledger là giới hạn đã công khai. Không tự sửa manifest hoặc tạo file trống để che thiếu dữ liệu.

## 2. Kiểm smoke offline tùy chọn

Sau khi kiểm gói đạt:

```powershell
node VERIFY_TRANSFER.mjs --root . --smoke
```

Smoke chỉ gọi các phép kiểm đọc artifact đã cho phép: P01 pipeline/retrieval, candidate P02 revision và các packet gốc theo vai trò khi có trong profile. Nó không chạy lại parser, Neo4j, Chroma, app Java, HTTP runtime, Gemini hoặc scorer; không biến checksum thành review nhãn. Đọc báo cáo thực tế để biết phép nào đã chạy, bị bỏ do thiếu dữ liệu hoặc thất bại.

Run retrieval lịch sử có file session/cache `.ses` chủ động không chuyển. Smoke semantic gốc của run đó sẽ **skip**, không báo pass giả; kiểm manifest vẫn đối chiếu 17 file được giữ và ghi thiếu một file. Các run khác cũng chỉ chạy checker gốc khi đủ artifact theo phạm vi cho phép.

Các kiểm gốc không có trong smoke cần lưu ý:

- Checker baseline P02 hiện đọc đường dẫn tuyệt đối `build_directory` và `preparation_directory` trong input lịch sử. Máy mới không có ổ `E:` giống máy cũ là bình thường. Không sửa input/raw/checksum cũ để đổi đường dẫn.
- Audit closeout P01 gốc dùng Git objects tại commit benchmark và HEAD/status. ZIP không chứa `.git`, vì vậy không hứa chạy lại nguyên lệnh audit đó từ snapshot này.
- Một số kiểm contract/đóng gói cũng có ràng buộc đường dẫn hoặc phụ thuộc Git; không đưa vào danh sách “portable” nếu chưa kiểm trên bản giải nén.
- `provider-response.json` có nội dung opaque/signature bị loại, cùng những artifact khác được nêu trong ledger. Manifest cũ có thể còn tham chiếu file đó; đây không phải lý do chỉnh lịch sử hoặc khẳng định original envelope đã đầy đủ.

`SHA256SUMS.txt` của gói chuyển giao kiểm **những file thực sự được bàn giao**. Nó không thay manifest thí nghiệm cũ. Báo cáo kiểm có giới hạn không đồng nghĩa đã chạy lại thí nghiệm hay nghiệm thu kết quả.

Một số manifest cũ dùng đường dẫn tính từ repository gốc, hoặc được sao chép sang thư mục `provenance`. Metadata khai `historical_manifests[].base_directory` để đối chiếu đúng snapshot vẫn giữ trong ZIP. Đây là ánh xạ đọc có công khai; không sửa byte manifest/raw và không tự coi số entry kiểm được là số file duy nhất hay số thí nghiệm.

## 3. Đọc để tiếp tục công việc

Thứ tự đọc:

1. `PROJECT_CONTEXT.md` — quy tắc nghiên cứu, phân công, gate và trạng thái hiện hành.
2. `FULL_PROJECT_CONTEXT_2026-10-18.md` — lịch sử tổng hợp, mục tiêu bài tạp chí, checkpoint và các quyết định.
3. `META/transfer.json`, ledger/kết quả kiểm — profile, snapshot và những gì không có trong gói.
4. `tasks/P01_CLOSEOUT.md`, `tasks/P02_P04_EXECUTION_PLAN.md` và `tasks/research/P02_INPUT_REVISION_2026-10-18.md`.
5. Tài liệu của task được giao sau khi đã thống nhất bước tiếp theo; không mở mọi nhãn/dự đoán nếu đang được giao vai trò source-first.

Không cần có API key để đọc/sửa mã hoặc kiểm artifact offline. Chưa cần chạy lại baseline chỉ vì chuyển máy hoặc vì sửa metadata F01/F02 khi source/fixture/config không đổi.

## 4. Nếu cần Git để phát triển tiếp

Snapshot đã giải nén không có lịch sử Git; đừng diễn giải `git status` chạy ở thư mục cha thành trạng thái của snapshot. HEAD trong metadata là **nền của working tree nguồn**, không phải commit chứa toàn bộ mã mới.

Khi người dùng quyết định cần Git hoặc chạy runner yêu cầu clone sạch:

1. Tạo clone mới của `https://github.com/gumsalmon/code-graphrag-microservices` vào thư mục **khác**. Kiểm remote và checkout đúng HEAD nền trong `META/transfer.json` trước khi áp overlay. Đây là bước có mạng và thay đổi file, không tự thực hiện trong lượt tiếp nhận.
2. So sánh snapshot với clone, kể cả file untracked và khác biệt/xóa đã ghi trong metadata. Áp overlay có chọn lọc từ snapshot, không copy `.git`, không bỏ mất mã chưa commit và không ghi đè dữ liệu ngoài phạm vi. Giữ nguyên bản giải nén để đối chứng; không dùng lệnh đồng bộ kiểu xóa đích.
3. Soát diff và chạy kiểm phù hợp trước khi commit. Không reset/hard checkout đè công việc người dùng, không force push.
4. Dependency cần Git sạch phải ở clone **riêng**, không phải clone đã overlay code phát triển. Các pin cần biết:

| Thành phần | Commit |
|---|---|
| PetClinic source baseline | `3858f9c630cf989bb6809a86edf47c2be78dc9f1` |
| PetClinic config | `323993ce2519c6d02df63e08bf4458d123d3b611` |
| Implementation parser/Neo4j đã kiểm P01 | `e95613795133088621117179c9fb9592dab62b16` |
| Snapshot protocol/benchmark P01 | `5f9204d66253604edf9101c2f888fc7e75aa0be7` |

Archive/source file trong ZIP hỗ trợ xem mã và kiểm byte. Không có Git objects thì không tự coi chúng là một checkout sạch đã được Git xác nhận tại pin.

## 5. Nếu được giao tái chạy kỹ thuật sau này

Đọc riêng `pipeline/p01/README.md`, `pipeline/p02/README.md` và tài liệu task trước. Các lệnh `prepare`, `build`, `baseline` tạo run hoặc chạy container, không phải checker chỉ đọc.

Môi trường nguồn đã kiểm trên Windows x64/Docker Desktop với Linux amd64; các report ghi Python `3.11.16` trong container và Neo4j `5.26.0`. Image digest, dependency/model version, lệnh và flags nằm trong provenance của từng run. Những con số này mô tả lần chạy cũ, không xác nhận môi trường máy mới.

Cần chuẩn bị riêng Docker Linux engine/images, Python/dependency image, Git sạch tại pin và cache phù hợp. P01 cần ONNX all-MiniLM-L6-v2; gói này không mang cache model. Build P02 cần JDK 17, Maven distribution/dependency repository; **năm JAR baseline không được chuyển** do preflight security findings, chi tiết trong ledger. Gói giữ source/config tar, log, hash và runner; không mang Maven cache, image hoặc JDK. Không chạy `verifyBuildRun` rồi báo đủ 21 artifact khi thiếu JAR. Khi được giao thực thi mới, dựng lại vào run directory mới, không tạo file thay vào run cũ hoặc tự tải bù/pull khi chưa thống nhất setup.

Chưa có full transitive dependency lock hoặc bảo đảm hermetic/cross-platform. Native macOS/Linux/ARM và phiên bản dependency khác phải được kiểm riêng. “Có source/cache specification” không đồng nghĩa “đã có Docker images và chạy offline ngay”.

Nếu sau này được phép gọi Gemini, người dùng tự cấu hình key mới trên máy đích theo `reasoning/p01/GEMINI_SETUP.md`; trên Windows có script `scripts/configure_gemini_key.ps1`. Không gửi key qua chat, không chuyển DPAPI credential từ máy cũ, không bật billing hoặc gọi model chỉ để kiểm bàn giao. Chọn cấu hình/model và phạm vi gọi phải được thống nhất trước.

Mỗi lần thực thi mới dùng run directory mới, giữ failure/raw/log/checksum và môi trường thật. Không ghi đè bằng chứng cũ. Muốn mở P02 runtime mutated/POST, thay người review, khóa input/nhãn/test hoặc chấm chính thức cần quyết định đúng gate trong PROJECT_CONTEXT.
