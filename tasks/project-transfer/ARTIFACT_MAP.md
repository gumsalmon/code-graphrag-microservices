# Bản đồ file trong ZIP bàn giao

Các đường dẫn dưới đây tính từ **gốc ZIP sau giải nén**, theo lựa chọn trong `scripts/package_project_transfer.py`. Đặc biệt, `external/` là layout được tạo khi đóng gói, không phải khẳng định các đường dẫn đó đã tồn tại ở workspace nguồn.

## Lối vào và mã hiện hành

| Đường dẫn trong ZIP | Nội dung / cách dùng |
|---|---|
| `START_HERE_NEW_MACHINE.md` | Bản sao hướng dẫn bắt đầu; cùng nội dung với `tasks/project-transfer/START_HERE.md` |
| `AI_START_PROMPT.txt` | Prompt tiếp nhận để đưa cho AI; bản gốc ở `tasks/project-transfer/AI_START_PROMPT.txt` |
| `VERIFY_TRANSFER.mjs`, `SHA256SUMS.txt`, `META/transfer.json` | Kiểm gói, danh sách file và omission ledger theo profile |
| `META/source-state.json`, `META/path-map.json`, `META/security-scan.json` | HEAD/branch/dirty worktree nguồn, ánh xạ đường dẫn tham khảo và phạm vi quét an toàn |
| `PROJECT_CONTEXT.md`, `FULL_PROJECT_CONTEXT_2026-10-18.md` | Quy tắc hiện hành và toàn bộ ngữ cảnh tổng hợp; không phải transcript nguyên văn |
| `scripts/`, `pipeline/`, `reasoning/`, `benchmark/p02/` | Tooling hiện hành, runner, adapter, kiểm thử và spec P02; có thay đổi chưa commit |
| `demo/p01/index.html`, `demo/p01/data.js`, `demo/p01/` | Viewer và bundle minh họa P01; không thay nhãn được nghiệm thu |
| `docs/`, `tasks/`, `prototypes/` | Hợp đồng/thiết kế còn nháp, task, nghiên cứu liên quan, report và prototype offline |

**Không có `src/` hay `requirements.txt` ở gốc workspace hiện hành.** Mã parser/Neo4j/Chroma của Hiển nằm trong dependency snapshot bên dưới; không kết luận “thiếu code” chỉ vì tìm ở gốc không thấy.

## P01: dependency, benchmark và kết quả kỹ thuật

Tiền tố dependency:

`handoff-out/p01-step1-20261012-02747b5d/`

- `implementation/src/`: `parser.py`, `neo4j_importer.py`, `chroma_baseline.py`, runner và parser phụ tại implementation pin đã kiểm.
- `implementation/requirements.txt`, `implementation/tests/`, `implementation/verify_neo4j_live.py`: dependency/test/verifier của implementation, không phải requirements toàn bộ workspace.
- `source/`: snapshot PetClinic; `evidence/`, `evidence-bridge/` và helper ở tiền tố này giữ kiểm độc lập, cả lượt lỗi và lượt đạt. `.git`, model cache và cache dùng lại bị loại; snapshot không tự thành Git checkout sạch.

Tiền tố benchmark:

`handoff-out/p01-20261005-205206-5f9204d/`

- `benchmark-snapshot/benchmark/p01/`: nhãn, review record và bằng chứng P01; nhãn vẫn `pending_review`.
- `benchmark-snapshot/benchmark/protocol/`: protocol v0.1/v0.2; snapshot còn có scripts/tests và split drafts.
- `P01-ROUND1-SOURCE-FIRST.zip`, `P01-ROUND2-COMPARE-AND-DECIDE.zip` và metadata ở tiền tố này: packet review lịch sử, không phải quyết định review đã có.

Các cây `handoff-out/p01-pipeline/`, `p01-retrieval/`, `p01-reasoning/`, `p01-comparison/`, `p01-contract/`, `p01-closeout/` giữ các run đã chọn, kể cả lỗi provider. Pipeline mới tham chiếu trong context là `p01-pipeline/20261015T082522708Z-0539ac7d/`; comparison hiện hành là `p01-comparison/20261015T081222218Z-306e382a/`. Không gán phản hồi model của run cũ cho request mới.

Hai folder `handoff-out/phat-p01-independent-input-20260923-122838/` và `...-123108/` giữ gói input độc lập P01 gốc để đối chiếu lineage của `raw/input_checksums.sha256`; không thay bằng dữ liệu tạo lại.

## P02: đầu vào, build, runtime và bàn giao theo vai trò

| Đường dẫn trong ZIP | Trạng thái / lưu ý |
|---|---|
| `handoff-out/p02-input-revision/20261018T065307839Z-719da955/` | Candidate mới nhất: scenario `0.1.1`, universe `draft.v2`; có START_HERE, CHANGELOG, RECHECK_TEMPLATE và checker portable. Chưa có xác nhận người thật |
| `handoff-out/p02-input-revision-audit/20261018-verification-64b92a0e/` | Log/test/checksum của bản sửa F01/F02; không phải review nhãn |
| `handoff-out/p02-preparation/` | Preparation v1 lịch sử; giữ nguyên hash sai trong metadata cũ để truy vết, không dùng thay candidate mới |
| `handoff-out/p02-build/20261015T101851660Z-95cea45d/` | Build baseline lịch sử đạt: giữ source/config tar, metadata, lệnh/log và manifest; 16/21 artifact có trong ZIP, năm `artifacts/*.jar` bị loại sau preflight an toàn và ghi hash/lý do |
| `handoff-out/p02-build/20261015T101757545Z-23c105ca/` | Lượt build bị từ chối do archive CRLF, giữ metadata/archive/log; không quảng bá là build đạt |
| `handoff-out/p02-baseline/20261015T102355058Z-2e775d19/` | Baseline Huy: chín GET và bốn request config/registry. Chưa mutated/POST/đủ matrix; checker gốc còn đường dẫn tuyệt đối |
| `handoff-out/p02-team-handoff/20261015T111730650Z-5604cc22/` | Hai folder `P02_HIEN/`, `P02_PHAT/`, ZIP gốc và metadata/tin nhắn theo vai trò. Đây là bản đã gửi trước khi sửa F01/F02, không đổi byte thành bản mới |
| `handoff-out/p02-paired-dry-run/` | Kế hoạch/mô phỏng paired 40 slot và bằng chứng kiểm offline; chưa phải runtime 40 request |
| `handoff-out/impact-output-validator/`, `experiment-telemetry/`, `impact-output-contract-draft/`, `experiment-design-draft/` | Evidence của prototype và thiết kế, chưa mặc nhiên tích hợp hoặc chốt áp dụng |

## Hồ sơ ngoài workspace được nhập vào ZIP

- `external/hien/RETURN_HIEN.md` và `external/hien/P02_HIEN_RETURN_20261015T123448Z.zip`: báo cáo/ZIP Hiển gửi, kiểm độc lập trên máy Hiển. Packet gốc không có JAR; ZIP chuyển máy cũng không mang năm JAR của build Huy, lý do riêng ghi trong ledger.
- `external/phat-review-00aa4dcc/phat-p02-review/`: đúng 72 file review public tại commit `00aa4dcc3eb8cb9a4706572b325e481316cbcad4`, gồm RETURN_PHAT, SOURCE_NOTES, checklist, inputs/checksum và proposal F02. Chỉ lấy folder review, không mang toàn bộ repo từ codeload. Kết luận là **cần sửa**, không phải duyệt candidate mới hoặc ground truth.
- `external/history/CONTEXT_2026-09-25_TO_2026-09-26.md`: context lịch sử người dùng cung cấp.
- `external/history/p01-runtime/`: raw/runtime, patch và ghi chú P01 gốc của Huy; đọc như lịch sử, không lấy nhãn nháp làm oracle.

Gói không kèm credential, `.git`, cache ONNX/Maven hoặc Docker images. Raw đã chọn giữ nguyên byte; những file không được mang theo được ghi trong metadata/ledger, không sửa manifest cũ để che omission. Đây là gói điều phối có nhãn nháp và prediction: **không đưa nguyên gói cho reviewer source-first**. Quy trình kiểm và giới hạn máy mới ở `tasks/project-transfer/RUN_ON_NEW_MACHINE.md`.
