# P02 — kết quả chuẩn bị paired dry-run, 15/10/2026

## Kết quả và giới hạn

Đã hoàn thành bước chuẩn bị điều phối ở mức **dry-run**: đủ 40 slot, tách bốn nhóm, POST cuối, quy tắc dừng/thu log/cleanup và kiểm artifact. Chưa có paired runtime adapter; không chạy Docker, HTTP, POST, mutation hoặc model. Không tạo/duyệt nhãn, không khóa universe/test hoặc chấm điểm.

Đầu vào: preparation `20261015T095309937Z-d20ef94a` đã kiểm nguyên vẹn; source `3858f9c630cf989bb6809a86edf47c2be78dc9f1`, config `323993ce2519c6d02df63e08bf4458d123d3b611`. Scenario/fixture/patch/draft gốc không sửa.

Mã và hướng dẫn:

- `pipeline/p02/paired-plan.mjs`: structural validator, plan builder, synthetic state-machine, ownership rules và tám fault scenarios. Không I/O hoặc executor có thể gọi app.
- `scripts/prepare_p02_paired_run.mjs`: CLI chỉ có dry-run/check; artifact allowlist, lineage, code snapshot, checksum và tái tính ngữ nghĩa kế hoạch.
- `scripts/test_p02_paired_dry_run.mjs`: acceptance bằng các bản sao cố tình sửa, giữ run gốc nguyên vẹn.
- [Hướng dẫn và DoD](../../pipeline/p02/PAIRED_DRY_RUN.md).
- Hai file test mới: paired-plan.test.mjs và paired-artifacts.test.mjs.

Đây không phải parser/Neo4j/Chroma, không thay phần kiểm độc lập của Phát. Hai gói đã gửi thành viên giữ nguyên; chưa yêu cầu gửi lại hoặc tự ghi họ đã xác nhận công việc.

## Run cuối đã kiểm

`handoff-out/p02-paired-dry-run/20261015t114507111z-6c0a362c/`.

Manifest 14 file, SHA-256:

`18a753bd14ae06e9a664dcbcc4ed7fe794e8eef80f1e845760bd3715f0d85e30`.

| Chỉ số | Kết quả |
|---|---:|
| Nhóm snapshot/repetition | 4 |
| Slot dự kiến và đã duyệt qua bằng mô phỏng | 40 |
| GET / POST dự kiến | 36 / 4 |
| Fault scenarios tổng hợp | 8 |
| HTTP / POST / app starts / cleanup thật | 0 / 0 / 0 / 0 |
| Model calls / nhãn mới | 0 / 0 |

Các file chính: plan.json, simulation.json, fault-simulations.json, summary.json, inputs.json, input snapshots, code snapshots và checksums.sha256. Đường dẫn response trong plan là định danh tương lai, không phải body/status đã thu. Không tạo raw ứng dụng giả.

Run được tạo thành công với Node permission model: chỉ cho ghi dưới thư mục dry-run, không cấp child-process permission. Đây là giới hạn quyền kiểm bổ sung, không tuyên bố sandbox bảo mật/network hoàn chỉnh. Preparation checker của luồng này không gọi Git subprocess.

## Kiểm thử thực tế

1. **24/24 test mới pass**, không skip: matrix đầy đủ/đúng thứ tự, không sửa input, namespace/DB riêng, POST cuối, không retry, startup/fixture/request/POST failures, finally-like logs/cleanup, bảo toàn nhiều lỗi và chặn nhóm sau; unsafe path, fake observation, metadata giả, duplicate/case/traversal và extra artifacts.
2. **11/11 phép acceptance đạt**, mọi bản sửa cố ý bị từ chối. Chín trường hợp đã tính lại checksum vẫn không hợp thức hóa plan/trace/input/code sai; hai trường hợp còn lại kiểm byte lệch và file ngoài manifest. Mỗi bản clone đã pass checker trước khi sửa để tránh kết luận sai do clone vốn không hợp lệ.
3. **170/170 Node tests toàn bộ các thư mục source đã chọn pass**, không skip, dưới Windows profile thật. Bao gồm 24 test mới, 24 test P02 cũ và các suite P01/handoff. Không phải Java app tests, 59 test Python/Neo4j của Hiển hoặc mẫu nghiên cứu mới.
4. Lượt suite trong sandbox đạt 169/170: test SecureString/DPAPI tổng hợp bị lỗi profile không được nạp. Không sửa test, bỏ test hoặc dùng key thật để vượt lỗi; chạy lại dưới Windows profile thật đạt 170/170. Giữ cả log sandbox và profile thật.
5. Sau suite, checker dry-run vẫn pass. Baseline checker cũ vẫn pass với 155 artifact, build 21 file, chín GET + bốn config/registry; không thực thi lại baseline.
6. SHA hai ZIP đã gửi Hiển/Phát còn đúng `f13b316163c2d199ea39fef23b863617dc67e9a0e75c0bfc0e6ff08c679483f2` và `7eeafca9bea6d21828ba44c585aaf0d6191302d13787be1d6ae1a67695a0690f`.

Bằng chứng:

- Acceptance: `handoff-out/p02-paired-dry-run/acceptance-V3mcaK/report.json`; giữ các clone cố tình hỏng tại cùng thư mục.
- Logs suite: `handoff-out/p02-paired-dry-run/verification-20261015t114507111z-6c0a362c/node-suite.sandbox.log` và `node-suite.windows-profile.log`.
- Checker: `node scripts/prepare_p02_paired_run.mjs check --run handoff-out/p02-paired-dry-run/20261015t114507111z-6c0a362c`.

Các artifacts đều cục bộ dưới handoff-out, không tự có trên GitHub. Code và preparation pin phải còn phù hợp để checker ngữ nghĩa kiểm lại; thay code thì tạo run mới, không đổi metadata của run cũ.

## Phần còn lại

Đợi phản hồi xác nhận thật của Phát về scope/seed/alias/fixture và phản hồi kỹ thuật của Hiển. Nếu sửa input thì version lại và tái tạo kế hoạch từ input mới trước khi chạy. Chưa có xác nhận thì không tự sửa gate thành true.

Sau khi chốt đầu vào, còn phải nối và kiểm runtime adapter, build mutated đúng phạm vi, chứng minh consumer/config không đổi và đo readiness/reset/cleanup thực tế; không chỉ bật một flag để biến mô phỏng thành runtime. Nhãn vẫn được lập độc lập và chờ reviewer khác người lập nhãn. Mục tiếp theo có thể chuẩn bị song song là dự thảo output contract Method/API/Service, không tự áp schema hoặc đổi scorer chung.

Không sửa PROJECT_CONTEXT.md hoặc register trong lượt này, không stage/commit/push/merge. Giữ các thay đổi có sẵn của workspace trên branch `codex/p01-evidence-demo`.
