# P02 — lựa chọn và chuẩn bị đầu vào

Ngày: 15/10/2026. Phạm vi được yêu cầu: chọn C02-A, chuẩn bị patch, dữ liệu thử và phạm vi đánh giá. Không phải nghiệm thu nhãn hoặc chạy benchmark.

## Đã làm

- Huy chọn P02/C02-A. PROJECT_CONTEXT lên v0.5, research register lên schema/version 2; version 1 và các artifact P01 trước đó không bị ghi đè. Hash register v1 được lưu trong `supersedes_sha256`; bản source v1 vẫn có trong các candidate cục bộ cũ.
- Thêm spec P02 `0.1.0` tại [benchmark/p02](../../benchmark/p02/README.md). Source baseline `3858f9c630cf989bb6809a86edf47c2be78dc9f1`.
- Patch chỉ thêm tham số boolean includeDetails tùy chọn/default false vào handler GET pets/visits; body, consumer, DB và config không đổi. `git apply --check --whitespace=error-all` exit 0 trên clone baseline sạch; không áp patch vào clone.
- Fixture từ SQL nguồn: owner 6/pets 7–8/bốn visits và owner 1/pet 1/không visits. Chuẩn bị 10 request × 2 snapshot × 2 lần lặp = 40 slot, actual status/body vẫn null. POST kiểm soát chạy cuối, chỉ được thực hiện trên DB riêng có reset.
- Inventory census từ declaration trong ba file, không đọc parser/graph/context/prediction hoặc nhãn để xây scope. Toàn bộ 9 Method/4 API/2 Service được ghi, loại seed còn 8/3/1; có helper/setter và ba constructor bị loại theo quy tắc. Alias seed đổi signature được đề nghị, chưa được Phát/reviewer xác nhận. Đây là universe **dự thảo**, không full-repo coverage.
- Script [prepare_p02_inputs.mjs](../../scripts/prepare_p02_inputs.mjs) tạo gói timestamp mới, pin bốn spec và 12 Git source/support blobs, hash/checksum; không gọi API, Docker, parser hoặc ứng dụng. Manifest không thể tự xác thực source/spec bị sửa chỉ bằng việc tính lại checksum: checker còn đối chiếu pin trong code.

Lựa chọn “control tương thích” không phải kết luận negative. Miền chính là request hiện có hợp lệ; malformed boolean/missing petId là diagnostic riêng và mọi khác biệt vẫn phải ghi. Gateway trả giống nhau không tự chứng minh mọi helper/setter không đổi hành vi; thiếu evidence thì unresolved.

## Kết quả chạy

```powershell
node scripts/prepare_p02_inputs.mjs prepare --source handoff-out/p01-step1-20261012-02747b5d/source
node scripts/prepare_p02_inputs.mjs check --run handoff-out/p02-preparation/20261015T095309937Z-d20ef94a
```

Prepare cuối exit 0 và đã gọi checker; thư mục `handoff-out/p02-preparation/20261015T095309937Z-d20ef94a` có 22 file manifest + checksums, status `inputs_prepared_not_locked_not_run`. Source clone giữ sạch trước/sau. Bản đầu `20261015T094513750Z-601c985e` giữ nguyên và cũng đã được kiểm bằng checker có pin mạnh hơn.

| Artifact | SHA-256 |
|---|---|
| Patch | `091b04de4a504512cbda4e0c5c0759b747b056b4c7028923d8b7808b43303c4f` |
| Fixture spec | `2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191` |
| Universe draft | `8c04bbca98318c3d358ec9135516d889f3b7c017793dbc4aa5319771ed8d7424` |
| Preparation manifest | `f7d9d2a098c1f022c8f28d91dd7d1578fd85c3fb23b6e804ceee821536e2e251` |
| Research register v2 | `ba4936fbded6f19cfcc3fa008aa264919b729b80e9e23e57b407fd66701c0e24` |

Các run dưới handoff-out là file cục bộ Git ignored, không có sẵn khi clone GitHub.

## Kiểm thử và hồi quy

- 13 test P02: census/seed/alias, mutation reversible, 40 slot không thành observation, SQL/owner/pet mismatch, oracle input/path rejection, byte pins, thêm hunk/default khác, fake approval, manifest tamper/duplicate/traversal/unmanifested files. Synthetic source chỉ kiểm code builder, không làm runtime/label evidence; wrapper thực đối chiếu source thật với Git/SHA.
- Thêm test phân biệt register legacy v1 và P02-selected v2; chưa có runtime/human confirmation/test lock được bịa vào trạng thái.
- Toàn bộ 125/125 test Node, 0 fail/skip, exit 0 trên workspace và source candidate 62 file. DPAPI dùng dữ liệu tổng hợp dưới Windows profile thật; không gọi provider. Lệnh gồm toàn bộ test P01 như báo cáo trước, thêm `pipeline/p02/preparation.test.mjs`.
- P01 closeout audit chạy lại exit 0: `handoff-out/p01-closeout/20261015T095310513Z-4eb056d3`; vẫn ghi cặp inference/review/test authorization/publication còn mở, không đổi nhãn hoặc output cũ thành đạt.
- `git check-attr` xác nhận spec/patch P02 LF, tránh lệch byte ở checkout Windows. `git diff --check` exit 0; cảnh báo chuyển LF/CRLF ở các file cũ không phải lỗi whitespace. Không chạy lại browser vì không đổi code viewer ở lượt này.

Source candidate cuối: `handoff-out/p01-candidate/20261015T095357596Z-636f9061`, 62 file/904749 byte, 62/62 checksum khớp; `publication-scope.json` SHA-256 `4f36791940e10b5bbece1013bcb8cdc392a2ca5848070c824a4e5b81e8c32eb7`. Chỉ allowlist kỹ thuật và P02 preparation, không credentials/cache/raw model/reviewer packages. Đây không phải commit hoặc checkout Git sạch; chưa stage/commit/push/merge.

## Chưa làm và gate kế tiếp

Chưa có Phát xác nhận inventory/universe/fixture, chưa khóa universe để gán polarity, chưa có label/annotator/reviewer P02. Chưa build hoặc chạy baseline/mutated P02; config reference từ P01 chưa được xác minh cho P02; image identities chưa có. Chuẩn bị patch không đồng nghĩa vượt gate baseline. Không tạo scorer, output Method/API/Service đầy đủ hoặc điểm chính thức từ universe này.

Tiếp theo: Phát kiểm độc lập các ID/exclusions/alias/fixture và nêu bất đồng; nhóm có thể chuẩn bị runner/kiểm baseline trong lúc chờ nhưng không tạo nhãn hoặc output đánh giá trước các gate đầu vào. Sau xác nhận và baseline khả thi mới khóa đầu vào, thu runtime và lập nhãn nháp. Mọi điều chỉnh scope/fixture/patch cần version mới trước nhãn/output.

Về nhân sự: Huy/AI có thể làm code/runner, nhưng chưa tự thay phân công chính thức. Đề nghị Hiển tái lập/integration ở môi trường khác để tránh trùng việc; Phát giữ phần xác nhận phạm vi, bằng chứng và lập nhãn độc lập; reviewer khác người lập nhãn quyết định sau. Không gửi cả candidate có source/tests/demo P01 cho người cần luồng evidence độc lập; chỉ gửi packet và allowed-input P02 phù hợp.
