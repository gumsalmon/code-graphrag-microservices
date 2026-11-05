# P02 input revision 2 — 18/10/2026

Trạng thái: candidate pending Phát recheck. Huy cho thực hiện sửa kỹ thuật; chưa nhận xác nhận bộ mới từ Phát. Không có quyết định nhãn, khóa test hoặc scoring.

## Trước → sau

| Thành phần | Bản lịch sử | Bản đề nghị kiểm lại |
|---|---|---|
| Scenario | `0.1.0` | `0.1.1` |
| Universe | `evaluation_universe.draft.v1.json` | `evaluation_universe.draft.v2.json` |
| Fixture binding | Hash JSON sau parse/serialize: `2a837540…` | Hash byte file thực: `2a319f48…` |
| Alias evidence refs | Source-relative và `spec/optional-query.patch` không portable trong gói nhóm | Đủ 29 refs tới `input/app/...` và `benchmark/p02/preparation.v1/optional-query.patch`, tính từ gốc gói |
| Trạng thái | Chưa khóa/chưa nhãn | Giữ nguyên: chờ kiểm lại, chưa khóa/chưa nhãn |

F01 do script chuẩn bị tính `hash(JSON.stringify(fixture, null, 2) + '\n')` thay vì hash byte fixture gửi đi. Cả hai mã được tái tạo từ cùng một file; không thay fixture để làm vừa hash sai. Builder mới buộc có raw bytes và đối chiếu JSON object với byte gốc. Checker độc lập kiểm liên kết giữa fixture, scenario, universe và INPUTS, không chỉ tự tạo lại kết quả bằng cùng builder.

F02 tiếp nhận proposal Phát tại commit `00aa4dcc3eb8cb9a4706572b325e481316cbcad4`, SHA-256 `b133526e1102f6082850171745295c39acbc84c61e1363900f40b5ebf5e407c3`. Có 15 alias/29 refs; chỉ sửa refs và metadata phiên bản/liên kết. Proposal gốc vẫn lưu byte riêng.

## Những gì không đổi

- Source PetClinic pin `3858f9c630cf989bb6809a86edf47c2be78dc9f1`; config reference `323993ce2519c6d02df63e08bf4458d123d3b611`; protocol v0.2 pin `5f9204d66253604edf9101c2f888fc7e75aa0be7`.
- Patch SHA-256 `091b04de4a504512cbda4e0c5c0759b747b056b4c7028923d8b7808b43303c4f`; fixture SHA-256 `2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191`.
- Scope spec v1, inventory v1, request-plan v1; 9 Method/4 API/2 Service trước loại seed, 8/3/1 sau loại. Không chọn lại universe bằng output hệ thống.
- Baseline/mutated/canonical IDs và mutated code snapshot `3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50` giữ nguyên vì source + patch không đổi. Đây là revision metadata, không tạo một phiên bản mã thực thi khác.
- Gói bàn giao, checksum và raw evidence trước sửa không bị ghi đè hoặc tái gán là evidence của lượt mới. Runtime trong scenario giữ trạng thái kế hoạch của spec gốc; không phủ nhận baseline feasibility đã có ở hồ sơ cũ.
- F03 còn thiếu runtime; không positive/negative, không accepted ground truth hoặc system prediction/score. Mọi cờ human confirmation/lock/scoring vẫn false/null.

Universe v1 SHA-256 `8c04bbca98318c3d358ec9135516d889f3b7c017793dbc4aa5319771ed8d7424` được bảo toàn. Các hash cụ thể của bản mới nằm trong `INPUTS.json` và `SHA256SUMS.txt`, không điền trước khi sinh file.

## Tái lập chuẩn bị, không chạy ứng dụng

Tại workspace/repository đủ spec và mã cùng bản chụp `tooling/`, với clone PetClinic sạch đúng pin:

```powershell
node scripts/prepare_p02_inputs.mjs prepare --source PATH_TO_CLEAN_PINNED_PETCLINIC
node scripts/verify_p02_revision.mjs --root PATH_TO_NEW_REVISION_PACKAGE
node --test pipeline/p02/preparation.test.mjs pipeline/p02/input-revision.test.mjs
```

Lệnh prepare mặc định không tạo thêm v1; tạo thư mục mới dưới `handoff-out/p02-input-revision/`. Nó chỉ đọc Git/source, chạy `git apply --check`, không áp patch, không network/Docker/model. V1 checker giữ để kiểm lịch sử và báo rõ `historical_integrity_only=true`, `admissible_for_new_input_lock=false`.

Runner baseline/paired-plan/handoff đời trước còn sử dụng layout v1; chưa chuyển chúng sang bundle v2 trong lượt này. Không đưa bundle v2 vào runner cũ hoặc diễn giải checksum pass của v1 là đã giải quyết gate. Sau Phát kiểm lại mới thống nhất input lock và adapter/runtime task riêng.
