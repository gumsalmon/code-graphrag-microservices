# P03 paired runtime theo D19

Cập nhật quyền sau khi đóng lượt runtime: [D20](../../benchmark/decisions/PETCLINIC_DRAFT_INTEGRATION_2026-10-31.json) đã cho Phát lập nhãn nháp P03 và tích hợp offline từng ca sau checkpoint version/hash được kiểm. [Status D20](../../tasks/PETCLINIC_D20_STATUS_2026-10-31.json) là điều phối hiện hành. Nội dung D19 bên dưới mô tả quyền và kết quả tại lúc thu runtime; không sửa raw/manifest hoặc tạo checkpoint người thật từ test pass.

[D19](../../benchmark/p03/decisions/INPUT_LOCK_2026-10-31.json) ghi xác nhận Huy ngày 31/10/2026: input scenario 0.1.0/universe draft.v1/fixture v1/scope v1, đúng sáu hashes của proposal. D18 và candidate frozen giữ nguyên, gồm flags cũ; quyền hiện hành nằm ở quyết định D19 riêng. Chưa annotation, evaluated parser/Neo4j/output, model, scoring hoặc push.

Runner mới dùng `pipeline/p03/paired.mjs`, `paired-probe.py`, `paired_checks.py`; không sửa runner baseline hoặc F03 cũ. Measurement v2 dùng health cho Customers/Visits/Gateway và registry UP riêng, không dùng response pets/animals hoặc gateway visits làm điều kiện readiness. Lượt đầu dùng baseline readiness bị timeout ở response mutated hợp lệ; giữ nguyên toàn bộ failed run và cleanup rồi mới chạy v2, source/patch không đổi. Code/hash/argv/env giới hạn/stdout/stderr/exit được lưu trong run mới; không retry quan sát tự động. Readiness polling giữ riêng khỏi repetitions.

## Trình tự

```powershell
node --test pipeline/p03/preparation.test.mjs pipeline/p03/baseline.test.mjs pipeline/p03/paired.test.mjs
$env:PYTHONPATH = 'E:/NCKH/code-graphrag-microservices/pipeline/p03'
python -B -m unittest discover -s pipeline/p03 -p '*_test.py' -v
node scripts/run_p03_paired.mjs plan --candidate YOUR_FROZEN_CANDIDATE
node scripts/check_p03_paired.mjs --run YOUR_NEW_PLAN
node scripts/run_p03_paired.mjs run --candidate YOUR_FROZEN_CANDIDATE --build-run VERIFIED_P03_BASELINE_BUILD --maven-home LOCAL_MAVEN_HOME --maven-repository LOCAL_READ_ONLY_CACHE
node scripts/check_p03_paired.mjs --run YOUR_NEW_RUNTIME_RUN
python -B pipeline/p03/paired_checks.py --run YOUR_NEW_RUNTIME_RUN
python -B scripts/audit_p03_paired_build.py --run YOUR_NEW_RUNTIME_RUN --output NEW_AUDIT_JSON
python -B scripts/audit_p03_paired_repetitions.py --run YOUR_NEW_RUNTIME_RUN --output NEW_REPETITION_JSON
node scripts/audit_p03_paired_support.mjs YOUR_NEW_RUNTIME_RUN NEW_AUDIT_DIRECTORY
```

Python trên máy Huy là `C:/Users/GumSalmon/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`; alias python PATH có thể không hoạt động. Các lệnh liệt kê không tự là evidence đã chạy, xem status/report phiên cụ thể.

Chỉ dùng Java image `sha256:afed130922b1df5f31b8711f47caa7fa853273f40bc8ba03e72c12f82ede7779` và Python image `sha256:da047cb8f9d1d98e5c070f5300ba9f7274e33b8fc0e5be5ed88740aed1b95ba9` đã có local; Docker config trung tính pipeline/p02/docker-client. Không đọc cấu hình credential của người dùng, tải image/package/model hoặc bật billing. Thiếu cache/image thì báo blocker.

## Isolation và build

Baseline lấy từ build P03 đã có source/config TAR và JAR hashes. Kiểm lại manifest, source tree và selected Git blobs trước dùng. Giải nén TAR baseline vào source riêng; kiểm và áp đúng patch với bare Git sandbox riêng, không commit hoặc đụng index repo chính. Chỉ một source OwnerResource đổi, đối chiếu byte candidate mutated; không chồng patch P01/P02.

Maven chỉ build Customers `-o`, network none, Maven/dependency/settings mount read-only; source riêng được ghi target. Java application tests skip được khai, không gọi Maven package pass là app tests pass. Reuse đúng bốn baseline JAR khác. Audit ZIP payload riêng kiểm class và dependency, phân biệt byte whole JAR với payload/build metadata.

## Phép đo

Bốn group theo baseline-r1/mutated-r1/baseline-r2/mutated-r2, mỗi group network internal và năm app instances mới, không publish port/volume tái sử dụng. Mọi cleanup kiểm exact prefix/owner label, không prune hoặc xóa tài nguyên khác. Cleanup chưa đủ thì dừng trước group sau.

Mỗi group có 12 fixture slots: 10 GET, một POST và một PUT; thêm một GET kiểm reset, setup POST owner không pet, GET readback setup, hai GET readback write controls. Tổng dự kiến 48 slots, 68 collector requests và 24 support GET ngoài readiness. ID mới phải lấy từ response/readback, không giả định 11/12. Writes chỉ Customers DB disposable, PUT không được đụng seed owner.

Baseline dùng validator hiện có. Mutated giữ cả HTTP 4xx/5xx ở GET, không đặt trước kết quả gateway; lỗi transport/incomplete capture thì dừng và giữ failure/partial ledger, không đổi thành HTTP observation thành công. Readback setup/write chỉ xác minh identity với hai key pets/animals được khai; raw không sửa và kết luận exact rename phải qua checker paired riêng.

Checker so đủ scalar/nested/array order cho direct response rename và controls, không bỏ fields để làm khớp. Gateway/missing owner được giữ như quan sát không ép kết quả; không xóa timestamp error để giả raw bằng nhau. Hai repetitions không là hai scenario độc lập. Không gán polarity/repair/hop/score từ checker.

## Bàn giao

Status và báo cáo mới nhất trong tasks/ nêu run/manifest, tests, build identity, raw observations và limitations. Hồ sơ runtime này là bằng chứng cho người lập nhãn sau phạm vi được Huy cho riêng, chưa là labels accepted. Không đưa prediction/score vào packet Phát. Nếu phiên bị ngắt, đọc plan/command/cleanup và xác minh exact ownership trước xử lý resource; không mở rerun chồng lên stack chưa dọn.

Lượt measurement v2 ngày 31/10 đã hoàn tất và kiểm: [báo cáo](../../tasks/research/P03_PAIRED_RUNTIME_2026-10-31.md), [status](../../tasks/P03_PAIRED_STATUS_2026-10-31.json). Không cần rerun chỉ để cập nhật tiến độ; readiness failure cũ và raw mới giữ nguyên. Quyền annotation P03 vẫn chưa mở.
