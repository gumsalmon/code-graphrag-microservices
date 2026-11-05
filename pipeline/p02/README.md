# P02 — build và kiểm baseline cách ly

Tài liệu này mô tả runner G1 baseline lịch sử. Từ quyết định chốt input ngày 24/10/2026 đã có [luồng F03 riêng](F03_RUNTIME.md) cho adapter v2 và runtime paired. Không đổi runner/log cũ thành đã chạy F03; trạng thái thực tế theo PROJECT_CONTEXT và báo cáo F03 tương ứng.

Luồng này build **source baseline thật**, khởi động Config Server, Eureka, Customers, Visits và API Gateway, rồi kiểm dữ liệu SQL và lời gọi consumer thật. Không chạy parser/graph/model, POST, mutation, lập nhãn hoặc chấm điểm. Đây là G1 baseline feasibility, không phải toàn bộ P02.

Phần chuẩn bị cặp baseline/mutated có [dry-run riêng](PAIRED_DRY_RUN.md): kiểm kế hoạch 40 slot và đường lỗi/cleanup bằng mô phỏng, không thực thi app/POST hoặc thay runner baseline bên dưới. Chưa phải bằng chứng runtime paired.

## Đầu vào và điều kiện

- Node.js 24+, Git, `tar`, Docker Linux engine.
- PetClinic checkout sạch tại `3858f9c630cf989bb6809a86edf47c2be78dc9f1`.
- Config checkout sạch tại `323993ce2519c6d02df63e08bf4458d123d3b611`.
- Maven distribution và dependency repository có sẵn trên máy. Lượt đã kiểm dùng Maven 3.9.8, image JDK 17 đã có; chưa có full transitive dependency lock.
- Java image có `/bin/sh`, `java`, `javac`, và Python 3.11 image cho HTTP probe; phải chuẩn bị trước, không tự pull. Java image của lượt đã chạy là `sha256:afed130922b1df5f31b8711f47caa7fa853273f40bc8ba03e72c12f82ede7779`. Image chỉ cấp JDK/runtime: code cũ trong image không dùng làm ứng dụng; mỗi service chạy JAR vừa build gắn read-only tại `/p02.jar`.
- [Gói input P02](../../benchmark/p02/README.md) đã tạo và qua checker; universe vẫn draft, chưa gán nhãn.

Không cần API key/billing. Không dùng `docker-compose.yml` của ứng dụng vì file đó có tên/port cố định, tag không pin và cả GenAI/observability ngoài phạm vi.

## Build offline

Từ gốc repo, thay các placeholder bằng đường dẫn thật:

```powershell
node scripts/run_p02_baseline.mjs build --source PATH_TO_CLEAN_PETCLINIC --config PATH_TO_CLEAN_CONFIG --maven-home PATH_TO_MAVEN_DISTRIBUTION --maven-repository PATH_TO_MAVEN_REPOSITORY --java-image LOCAL_JDK_IMAGE
```

Runner xuất hai Git archive vào thư mục mới dưới `handoff-out/p02-build/`, không sửa clone đầu vào. `core.autocrlf=false` chỉ áp dụng lệnh archive để giữ byte LF; không sửa Git config toàn máy. Kiểm source/support blob với SHA đã pin trước khi build, không hợp thức hóa source lệch bằng sửa checksum.

Maven chạy trong container `network none`, cache/distro read-only, settings trung tính riêng; không nạp credential từ user settings. Chỉ workspace riêng được ghi. Offline build thiếu dependency sẽ báo lỗi, giữ log và dừng, không tải bù. `maven.test.skip=true` nên build thành công **không có nghĩa đã chạy Java application tests**. Không chạy profile buildDocker hoặc push image.

Đầu ra: source/config archives, JAR của năm dịch vụ và SHA-256, lệnh, stdout/stderr/exit code, build status và manifest. Folder source/target có thể thay đổi trong quá trình build; manifest khóa archives, JAR và evidence, không giả khóa toàn bộ target/cache. Không dùng JAR cũ của P01 thay build mới.

## Baseline thật, chỉ GET

```powershell
node scripts/run_p02_baseline.mjs baseline --build-run PATH_TO_BUILD_RUN --preparation PATH_TO_P02_PREPARATION_RUN
node scripts/check_p02_baseline.mjs --run PATH_TO_NEW_BASELINE_RUN
```

Runner kiểm build/preparation trước. Tạo network nội bộ riêng, không publish port; config native lấy từ archive đã pin, không fetch main. Các container có tên/label theo run, filesystem read-only, mount JAR/config read-only, không Docker socket hoặc credential. Giữ HSQLDB in-memory riêng cho run, không mount DB người dùng.

Ghi command-line overrides đầy đủ: profile docker/native, config URL nội bộ, Eureka registration/cache intervals phục vụ setup, tracing-disable request và actuator exposure hẹp. Chúng là cấu hình hạ tầng của feasibility sandbox, không phải chứng minh môi trường byte-identical P01. Nếu chạy baseline/mutated sau này phải dùng cùng overrides/config và ghi phiên bản. Không suy từ flag tracing-disable rằng mọi tracing component thực tế đều tắt; network nội bộ vẫn là ranh giới không truy cập provider ngoài.

Readiness polling có hạn và giữ **mọi** attempt, kể cả HTTP lỗi hoặc gateway fallback rỗng. Readiness cần fixture có dữ liệu, không chỉ HTTP 200. Sau sẵn sàng, thu một lượt chín GET trong fixture và bốn request config/registry; không thực hiện POST cuối fixture. Đây không phải hai repetition hoặc đủ 40 slot; không ghi đè request plan frozen thành đã chạy hết.

Lưu response body byte gốc, SHA/length, parsed header pairs, status/latency/time, service logs, config/registry và provenance. Header pairs không được mô tả như transcript byte-exact trên wire. Probe không theo redirect; lỗi/absent body không bị biến thành visits=0. Checker tái kiểm fixture, nội dung từng visit và gán đúng pet, config SQL HSQLDB và registration UP của ba app; không dùng expected impacted-method set.

Kết thúc tự dọn đúng container/network do run sở hữu, giữ artifacts/logs. Không dọn container/network/volume khác. Nếu lỗi startup/build/config thì giữ failure record và không chạy mutation để bỏ qua.

## Trạng thái đã kiểm ngày 15/10/2026

- Build `20261015T101851660Z-95cea45d`: năm service thành công offline, Java tests không chạy.
- Baseline `20261015T102355058Z-2e775d19`: chín GET + bốn config/registry responses; provider và gateway đều có đúng bốn visits, owner/pet đúng SQL. Omit/true/false/empty/invalid includeDetails của **baseline chưa khai báo tham số này** đều HTTP 200; thiếu petId HTTP 400. Đây là quan sát baseline, không dự đoán mutated.
- Baseline checker: 155 file; build manifest 21 file, preparation 22 file. Toàn bộ dữ liệu ở `handoff-out` là cục bộ Git ignored, không có sẵn từ clone.
- Lượt build đầu `20261015T101757545Z-23c105ca` bị từ chối do archive CRLF; giữ nguyên artifact lỗi. Lượt sau sửa export LF, không sửa nhãn hoặc input nguồn để làm đẹp kết quả.

P02 chưa chạy mutated, POST hoặc đủ matrix; universe chờ Phát xác nhận độc lập trước nhãn/output đánh giá. Source prep/scenario frozen vẫn ghi trạng thái lúc tạo; trạng thái tiến độ hiện hành theo PROJECT_CONTEXT và research register v3, không sửa lịch sử.

## Kiểm thử

```powershell
node --test pipeline/p02/preparation.test.mjs pipeline/p02/runtime.test.mjs pipeline/p02/baseline-check.test.mjs pipeline/p01/closeout.test.mjs
```

Python probe tests là fixture tổng hợp, chạy bằng Python 3.11, ví dụ trong container network none có mount `pipeline/p02` read-only tại `/probe`, dùng `python -m unittest -v http_probe_test`. Chúng không thay runtime app hoặc review nhãn. Kiểm đầy đủ P01 vẫn dùng suite trong hồ sơ P01; không gộp chồng các test thành số sample nghiên cứu.
