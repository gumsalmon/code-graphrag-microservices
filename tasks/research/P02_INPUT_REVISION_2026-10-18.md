# P02 — sửa F01/F02 có version, 18/10/2026

## Mục tiêu, phạm vi và DoD

Huy cho thực hiện bước tiếp theo sau khi đối chiếu review Phát tại commit `00aa4dcc3eb8cb9a4706572b325e481316cbcad4`: sửa cách băm fixture, tạo scenario/universe mới, tiếp nhận 29 evidence_refs đã rà và chuẩn bị bộ gửi kiểm lại. Không tự xác nhận thay Phát, sửa nhãn, khóa input, chạy runtime/mutation, thay parser/Neo4j/scorer hoặc push GitHub.

DoD kỹ thuật của lượt này: raw fixture liên kết nhất quán; refs phân giải được theo gốc gói; bảo toàn v1/source/patch/fixture/alias IDs/raw; có changelog, provenance, checksum, checker độc lập, test hồi quy và ZIP đã giải nén kiểm lại. DoD này không phải quyết định khoa học của người review.

## Nguyên nhân và cách sửa

F01 được tái tạo từ cùng một file fixture: byte gốc có SHA-256 `2a319f48…`, nhưng `JSON.stringify(JSON.parse(bytes), null, 2) + '\n'` có SHA-256 `2a837540…`. Builder v1 dùng cách thứ hai trong universe. Đây là lỗi của bộ chuẩn bị, không phải dữ liệu đã bị thay. Không đổi fixture để khớp mã sai.

- `scripts/prepare_p02_inputs.mjs`: builder mặc định mới yêu cầu raw fixture bytes, đối chiếu JSON object với byte thực và scenario `0.1.1`; prepare tạo bundle mới, không tạo thêm v1. Builder/checker lịch sử v1 được giữ riêng; kết quả ghi `historical_integrity_only=true`, `admissible_for_new_input_lock=false` và các vấn đề đã biết.
- `scripts/prepare_p02_revision.mjs`: đọc clone PetClinic sạch đúng pin, đối chiếu 12 Git blobs/working tree, `git apply --check` exit 0; không áp patch. Tạo thư mục mới; pin lại bytes v1, inventory/matrix và proposal Phát. Snapshot mã nguồn giữ hậu tố `P02-0.1.0` vì source+patch không đổi; chỉ metadata scenario lên `0.1.1`.
- `scripts/verify_p02_revision.mjs`: checker portable độc lập với builder; kiểm pins v1, manifest/allowlist/path/symlink, cross-file raw hash, phiên bản và thay đổi ngoài phạm vi, 15 alias/29 refs, cờ chưa xác nhận/chưa khóa/chưa nhãn/chưa scoring. Chỉ cho phép bốn file đích đã định danh; không tự dùng checksum hoặc census làm nhãn.
- `pipeline/p02/input-revision.test.mjs`: 15 test mới; bộ `preparation.test.mjs` cũ vẫn 13 test và được ghi rõ là hồi quy v1.
- `.gitattributes` giữ LF cho spec v2; v1 không đổi byte. `PROJECT_CONTEXT.md` lên 0.7; `benchmark/p02/README.md` chỉ điểm bộ kiểm lại hiện hành. Register v3 và các task/gói cũ không bị đổi thành xác nhận mới.

Proposal Phát được lưu byte nguyên gốc tại `benchmark/p02/preparation.v2/phat-f02-proposal.original.json` và `history/` của gói. Nó chỉ sửa đường dẫn, còn hash fixture sai; không coi tên proposal v3 là một phiên bản scenario/universe đã áp dụng.

## Bộ gửi kiểm lại

Gốc gói: `handoff-out/p02-input-revision/20261018T065307839Z-719da955/`.

| Artifact | Version / SHA-256 |
|---|---|
| `benchmark/p02/preparation.v2/scenario.json` | `0.1.1` — `762d993901f1388584adf066f396acd2ad46a7550f1f6b0b12dd6a8c61663ce9` |
| `draft/evaluation_universe.draft.v2.json` | draft.v2 / scenario `0.1.1` — `d79c07727d6fb5348503f0e4079a0d18c63e26e6d34a1e332825f1cc7680aeb5` |
| `benchmark/p02/preparation.v1/fixture.json` | Không đổi — `2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191` |
| `SHA256SUMS.txt` | `0358bf86bee591254483e50018f8d601932a8821a323176eaa10a80b86229539` |
| ZIP `P02_PHAT_RECHECK_0.1.1_20261018_719da955.zip` | 59,335 byte — `4e52aa2918d4e907af93296e40cbbdca8928978d9788c365d2dff76dc7e656d2` |

ZIP ở thư mục cha `handoff-out/p02-input-revision/`, cùng `.zip.sha256` và `.verification.json` ghi kết quả tool thực. Các đường dẫn này là local/Git ignored, chưa có trên GitHub. [Tin nhắn bàn giao](../p02-handoff/SEND_PHAT_RECHECK_2026-10-18.md) chỉ rõ toàn bộ version/hash và kết quả cần gửi lại.

Gói gồm 31 file + manifest: 12 baseline source/support blobs có license; bốn spec v1; scenario mới; universe mới; inventory/request-plan cũ; universe v1/proposal lịch sử; START_HERE/CHANGELOG/RECHECK_TEMPLATE; INPUTS/PROVENANCE; checker và bản chụp mã chuẩn bị/test. Không chứa nhãn, evaluated-system output, score, credentials hoặc raw runtime mới. Raw baseline cũ giữ ở gói trước, không bị đổi provenance thành evidence lượt này.

## Kiểm tra đã chạy

Audit: `handoff-out/p02-input-revision-audit/20261018-verification-64b92a0e/`; `SHA256SUMS.txt` SHA-256 `700a6b9da347e9549bec39af4884a357ed05510cba1f529626a724e65286f7e7`.

```powershell
node scripts/audit_p02_input_revision.mjs --out handoff-out/p02-input-revision-audit/20261018-verification-64b92a0e --source handoff-out/p01-step1-20261012-02747b5d/source
```

Lệnh trên đã chạy; để tái chạy phải chọn audit folder mới và tạo pre-edit snapshot tương ứng, không ghi đè log. `result.json`, từng command/stdout/stderr và manifest được giữ nguyên.

- 75/75 Node tests pass, 0 fail/skip: preparation v1 + revision mới + runtime unit tests + baseline checker + paired plan + handoff + P01 closeout. Đây là test code offline, không phải chạy lại ứng dụng hoặc đánh giá benchmark.
- 8 command audit đều exit 0: hồi quy; prepare v2 từ clone sạch; entry-point check v2; checker portable; hai run preparation v1 lịch sử; hai gói Phát/Hiển gốc. Gói PHAT gốc đạt 399 file, HIEN gốc 424 file.
- Bundle mới đạt 31/31 checksum/bindings. Hai lần prepare sau sửa cho cùng hash universe; khác timestamp provenance/manifest là có chủ đích, không giả byte-identical toàn gói.
- ZIP đã được mở kiểm tên entry, giải nén vào thư mục mới `20261018T065307839Z-719da955-zip-verified`, chạy checker từ chính bản giải nén: 31/31, cùng manifest/universe hash.
- Snapshot trước/sau xác nhận **2.109 file** trong bảy cây tồn tại không đổi: spec v1, các preparation run cũ, toàn bộ handoff P02 đã gửi, raw baseline cũ, prototypes, draft contracts và draft experiments. Hai đường dẫn `benchmark/p01` và `src` không tồn tại ở working tree này, ghi missing chứ không coi đã kiểm các file ở đó. Clone PetClinic sạch trước/sau.
- `git diff --check` exit 0; có cảnh báo LF/CRLF của các file hiện hữu nhưng không phải lỗi whitespace. Git attributes cho fixture v1 và scenario/proposal v2 đều LF. Không stage, commit, push hoặc merge.

Hai lỗi phát triển đã được xử lý và không xóa lịch sử: lượt test đầu 27/28, một assertion do `structuredClone(Buffer)` tạo `Uint8Array`, sửa snapshot test để giữ kiểu Buffer; log gốc ở `initial-tests.tool-output.json`. Lượt CLI đầu gặp chu kỳ import khi top-level-await, đã sửa CLI để module kết thúc khởi tạo trước adapter; sau đó hai lần prepare thành công. Kết quả 75/75 là lượt kiểm cuối sau sửa, không phải tuyên bố lần đầu đã pass.

## Chưa làm / bước tiếp

Chưa nhận Phát kiểm lại; F01/F02 mới là bản sửa kỹ thuật được kiểm tra, chưa có quyết định người thật. F03 vẫn missing/unresolved: chưa mutated, POST, đủ repetitions/reset, URI capture hoặc helper/setter/fallback runtime. Chưa gán polarity, accepted labels, test lock hoặc official scoring. Nhãn P01 giữ pending_review; P03/P04 không mở thêm.

Runner/handoff đời trước vẫn dùng layout v1; không tự đổi adapter để vượt gate. Sau Phát kiểm lại, điều phối xác định chính xác bộ file/hash để chốt input và giao task runtime riêng. Hiển giữ baseline/JAR/cache/log đã bàn giao; không cần làm lại baseline chỉ để chữa hash metadata khi source/fixture/config không đổi. Phát ghi nhận định/bất đồng thật, bổ sung exposure đúng thực tế, không dựng checkpoint source-first hồi tố. Reviewer nhãn khác người lập nhãn vẫn cần ở giai đoạn nghiệm thu sau.
