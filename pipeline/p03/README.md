# Chuẩn bị kỹ thuật P03

Quyền mới nhất D20: annotation P03 đã được cho Phát, tích hợp extraction–Neo4j–retrieval offline có điều kiện sau checkpoint nhãn nháp version/hash được kiểm của từng ca. Xem [gói công việc](../../tasks/research/PETCLINIC_HANDOFF_2026-10-31.md) và [status D20](../../tasks/PETCLINIC_D20_STATUS_2026-10-31.json); chưa checkpoint mới hoặc actual integration. Các đoạn D19 dưới đây giữ lịch sử lúc thu runtime, không thay quyền D20; chưa model/scoring/accepted/áp hợp đồng nháp/push.

Checkpoint D19 ngày 31/10: input đã được Huy chốt sau kiểm scope Phát; paired measurement v2 đã build/thu/kiểm đủ bốn nhóm/48 slots theo [báo cáo](../../tasks/research/P03_PAIRED_RUNTIME_2026-10-31.md), [PAIRED_RUNTIME.md](PAIRED_RUNTIME.md) và [status](../../tasks/P03_PAIRED_STATUS_2026-10-31.json). Raw/controls/repetition/reset/source/config/cleanup đạt; lượt lỗi readiness giữ nguyên. Quyền annotation/evaluated method/model/scoring/push vẫn chưa mở. Các đoạn chuẩn bị/baseline dưới đây giữ lịch sử, không sửa candidate frozen.

Cập nhật 28/10: C03-A đã được Huy chọn và baseline đã chạy/kiểm theo D18. Runner mới và lệnh tái hiện ở [BASELINE.md](BASELINE.md), kết quả ở [báo cáo baseline](../../tasks/research/P03_BASELINE_2026-10-28.md). Phần dưới mô tả công cụ candidate frozen ban đầu; không đổi candidate flags theo sự kiện về sau. Mutated/universe lock vẫn chờ kiểm độc lập/quyết định phù hợp.

Đây là công cụ dựng **candidate C03-A**, chưa là runtime runner hoặc bộ nhãn. Đọc `PROJECT_CONTEXT.md` và `benchmark/p03/README.md` trước. Không sửa pipeline P02 hoặc áp hợp đồng output đang nháp.

`preparation.mjs` là census khai báo từ source theo sáu top-level class/record và builder patch; không phải parser của phương pháp đang đánh giá. `response_checks.py` kiểm JSON offline, từ chối mất trường, đổi dữ liệu nested, key trùng, non-JSON, status lỗi và thay đổi thứ tự mảng. Chỉ bỏ khác biệt thứ tự key object; không gán nhãn tác động hoặc score. Test dùng dữ liệu tổng hợp, không phải runtime PetClinic.

```powershell
node --test pipeline/p03/preparation.test.mjs
python -B -m unittest discover -s pipeline/p03 -p response_checks_test.py -v
```

Dựng candidate từ Git object tại pin, không lấy byte working tree và không đọc log/nhãn nằm ngoài allowlist:

```powershell
node scripts/prepare_p03_inputs.mjs prepare --source LOCAL_PETCLINIC_GIT --config LOCAL_CONFIG_GIT --protocol PINNED_PROTOCOL_V02_FILE
node scripts/prepare_p03_inputs.mjs check --run NEW_CANDIDATE_DIRECTORY
```

Đầu ra dưới `handoff-out/p03-preparation/` là thư mục mới có spec, source/config, patch áp kiểm riêng, universe/inventory nháp, request plan, provenance, code và checksum. Không commit, build app, gọi Docker/model hoặc khóa bất kỳ gate nào từ lệnh này. Git `apply --check` và áp patch thật chỉ tác động bản sao file riêng, không sửa source pilot hay index dự án.

Ma trận **dự kiến** gồm bốn group baseline/mutated × hai repetition: 48 fixture slots (40 GET, 4 POST, 4 PUT), thêm bốn POST tạo fixture owner rỗng và tám readback write controls, cùng readiness/seed/config/registry bổ sung. Chưa có slot thực thi. Setup và write phải được cho phép rõ trong sandbox riêng trước khi chạy; không dùng URL/DB cá nhân.
