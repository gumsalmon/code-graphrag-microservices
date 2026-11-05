# P03 C03-A — runner baseline theo D18

Huy chọn candidate hiện hành ngày 28/10/2026 và cho phép runner offline, build và baseline trong sandbox riêng. [Quyết định gốc](../../benchmark/p03/decisions/SELECTION_BASELINE_2026-10-28.json) không chốt universe hoặc cho chạy mutated, annotation, output phương pháp, model, scoring hay push. Các flags trong candidate frozen ghi sự kiện lúc tạo, không sửa thành quyền hiện tại.

`scripts/run_p03_baseline.mjs` chỉ có `plan`, `build`, `baseline`. Hai group baseline-r1/r2 dùng source gốc cùng pin; không có lệnh áp patch. Dùng hai network internal, mười application instances mới, không publish port hoặc dùng Docker volume DB. Chỉ cleanup tài nguyên có prefix `p03b-` và label/owner đúng lượt.

Build dùng source/config TAR của baseline P02 đã kiểm, đối chiếu source/config Git blobs trong candidate P03; giải nén vào source riêng. Maven `-o`, network none, cache/settings read-only, image local pin và `--pull never`. Năm service được build lại; Java application tests **skip** có khai. `treeHashes` trước/sau loại build output `target/`, mọi source/config còn lại phải giữ nguyên. Bản cũ không bị sửa.

Baseline kiểm 12 fixture slots/group, chưa phải matrix paired 48 slot của candidate. Mỗi group thêm một GET census trước write, một POST setup owner không pet và GET readback, hai GET readback sau POST/PUT control. Cả lượt có 24 fixture slots; 34 request trong collector khi tính extras, chưa tính readiness và sáu support GET/group. ID mới lấy từ response/readback; PUT chỉ tới owner control vừa tạo, không sửa owner seed. Payloads giữ đúng candidate. Missing-owner được ghi status/body thực tế, không mặc định 404 hoặc gán polarity.

## Chạy offline và runtime

Các đường dẫn `handoff-out` là artifact cục bộ/Git ignored, cần candidate và reference build tương ứng. Clone GitHub đơn thuần không có đủ các file hoặc cache này. Không tải image/model hoặc đọc credential để chạy các lệnh dưới.

```powershell
node --test pipeline/p03/preparation.test.mjs pipeline/p03/baseline.test.mjs
python -B -m unittest discover -s pipeline/p03 -p '*_test.py' -v
node scripts/run_p03_baseline.mjs plan --candidate handoff-out/p03-preparation/20261024T190227112Z-a8e852db
node scripts/check_p03_baseline.mjs --run NEW_OFFLINE_PLAN

node scripts/run_p03_baseline.mjs build --candidate handoff-out/p03-preparation/20261024T190227112Z-a8e852db --reference-build PINNED_P02_BASELINE_BUILD --maven-home LOCAL_MAVEN_HOME --maven-repository LOCAL_READONLY_MAVEN_CACHE
node scripts/run_p03_baseline.mjs baseline --candidate handoff-out/p03-preparation/20261024T190227112Z-a8e852db --build-run NEW_P03_BASELINE_BUILD
node scripts/check_p03_baseline.mjs --run NEW_P03_BASELINE_RUN
python -B scripts/audit_p03_baseline_build.py --rebuilt NEW_P03_BASELINE_BUILD --reference PINNED_P02_BASELINE_BUILD
```

Trên máy hiện hành, Python là `C:/Users/GumSalmon/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`; alias `python` có thể không hoạt động. Không thay bằng bỏ các kiểm Python.

Giữ logs command/stdout/stderr/exit, raw request/response bytes, metadata, ledgers, config/registry, instance/mount identities, source hashes, cleanup và manifests. Lỗi readiness được giữ từng attempt; transport error ở slot không retry. Mỗi lần chạy tạo thư mục mới. Nếu lỗi, giữ run đó; không xóa file để checker pass.

## Ý nghĩa kết quả

Checker chỉ chứng nhận tính nhất quán hồ sơ baseline trong phạm vi đã ghi. Không phải kết quả CIA hoặc ground truth. Rà phạm vi/census/alias độc lập rồi Huy chốt input/quyền chạy mutated là bước tiếp theo. Không dùng response equality, HTTP 200, số assertions hoặc checksum để quyết định polarity thay annotator.

JAR rebuild có thể khác hash cả file do `BOOT-INF/classes/git.properties` và `META-INF/build-info.properties`. Audit độc lập so mọi ZIP member payload; chỉ hai đường dẫn metadata này được phép khác. Application classes, dependency JARs và mọi payload khác phải khớp bản baseline tham chiếu; không gọi đó là whole-JAR byte equality.
