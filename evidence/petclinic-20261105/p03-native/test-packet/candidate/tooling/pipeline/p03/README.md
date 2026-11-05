# Chuẩn bị kỹ thuật P03

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
