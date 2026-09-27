# Chuẩn bị split và chấm điểm

`split_manifest.v1.json` là bản nháp. P01 chỉ ở `development`; P02–P04 chưa được chọn, chưa có evaluation universe và chưa được gán split. Không sửa bản nháp thành `approved_for_test` chỉ bằng cách đổi trường `status`.

Trước khi gán nhãn ca mới, ghi sổ ứng viên (cả ca bị loại và lý do), khóa tiêu chí chọn, duplicate group, split và `evaluation_universe.vN.json` theo protocol v0.2. Universe có dạng:

```json
{
  "scenario_id": "P02",
  "scenario_version": "1.0.0",
  "complete": true,
  "review_status": "approved",
  "locked_at": "2026-09-27T01:00:00+07:00",
  "levels": {"method": ["canonical method ID"], "api": [], "service": []},
  "seed_ids": {"method": [], "api": [], "service": []},
  "aliases": [{"mutated_id": "mutated ID", "canonical_id": "canonical ID", "evidence_refs": ["source reference"]}]
}
```

Inventory, phạm vi, fixture, tiêu chí loại trừ, người lập/reviewer và checksum cần lưu cùng universe thực tế. Manifest cần `selected_at`, `scenario_file`/`scenario_sha256`; universe cần `locked_at`; label cần `created_at` với UTC offset. Scorer kiểm tra thứ tự chọn scenario → khóa universe → tạo nhãn. Mọi ID đủ điều kiện trong `levels` phải có nhãn đã được reviewer chấp nhận; ID chưa giải quyết chặn score chính thức. Prediction không được dùng để tạo universe hoặc chọn scenario.

Scorer `scripts/score_benchmark.py` chỉ chạy khi manifest có `status=approved_for_test`, quyết định phê duyệt riêng (`approval.decision=approve_test_scoring`), test scenario và hash của manifest được cung cấp. Mỗi test entry phải có file universe, label, review decision và SHA-256 tương ứng. Reviewer decision phải `approve`/`accepted` và trỏ đúng label hash. Input prediction JSON:

```json
{"scenarios": [{"scenario_id": "P02", "predictions": [{"level": "method", "entity_id": "canonical ID", "predicted_impacted": true}]}]}
```

Lệnh khi đã được phê duyệt riêng: `python scripts/score_benchmark.py --manifest benchmark/splits/split_manifest.vN.json --manifest-sha256 <hash-đã-khóa> --predictions <file.json>`. Kết quả JSON ghi ra stdout. Hiện tại dùng `python -m unittest discover -s tests` để kiểm tra scorer trên fixture tổng hợp; đây không phải benchmark P02–P04.
