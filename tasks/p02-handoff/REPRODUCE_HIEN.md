# Tái lập baseline P02 — phần kỹ thuật

## 1. Kiểm gói, không cần Docker

Giải nén vào đường dẫn ngắn, ví dụ `C:\p02-hien`. Tại thư mục chứa START_HERE.md:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\VERIFY_PACKAGE.ps1
node verify_package.mjs
```

Một trong hai verifier đủ kiểm byte/file. Node verifier còn kiểm metadata vai trò; không gọi Git/Docker/network. So SHA ZIP với thông tin gửi riêng, vì checksum trong một ZIP không tự chứng thực người gửi.

Giữ bản giải nén gốc; tạo bản làm việc riêng nếu chạy tests/build hoặc sửa code. Kết quả nhận package không đồng nghĩa tái lập runtime.

## 2. Kiểm công cụ trong bản làm việc

Cần Node.js 24 trở lên để dùng cùng môi trường đã kiểm:

```powershell
node --test pipeline/p02/preparation.test.mjs pipeline/p02/runtime.test.mjs pipeline/p02/baseline-check.test.mjs
```

Gói có đủ source/import cần cho 24 test này. Không phải toàn bộ 137 test dự án; không bao gồm Java application test suite. Python probe tests cần Python 3.11, đặt PYTHONDONTWRITEBYTECODE=1 hoặc chạy container network none/read-only theo hướng dẫn pipeline; không chạy chúng rồi ghi thành quan sát ứng dụng thật.

## 3. Khi muốn build/rerun

Input snapshot `input/app/`, `input/config/` dùng đọc/đối chiếu offline, không có .git. Source implementation nhóm tại `implementation/` chỉ gồm sáu file đã lọc, không phải toàn repo Git. Không dùng chúng làm checkout sạch giả.

Nếu chưa có checkout đúng pin, có thể chuẩn bị checkout riêng từ repository công khai, không overwrite thư mục đã có:

```powershell
git clone https://github.com/spring-petclinic/spring-petclinic-microservices.git work/app
git -C work/app -c core.autocrlf=false checkout --detach 3858f9c630cf989bb6809a86edf47c2be78dc9f1
git clone https://github.com/spring-petclinic/spring-petclinic-microservices-config.git work/config
git -C work/config -c core.autocrlf=false checkout --detach 323993ce2519c6d02df63e08bf4458d123d3b611
```

Đây là bước setup có mạng, không phải runner offline; không cần credential/API key. Có checkout sẵn thì đối chiếu HEAD/status/diff, không reset. Clone nhóm để phát triển parser thực hiện riêng trên branch cá nhân; pin implementation nguồn trong gói là `e95613795133088621117179c9fb9592dab62b16`. Không checkout/pull latest rồi tự coi tương đương pin.

Cần Docker Linux, tar, Maven distro (đã kiểm 3.9.8), repository cache đủ dependency, local JDK 17 Linux image có sh/java/javac và Python 3.11 image. Không kèm JAR/cache/images vào ZIP. Kiểm thông tin máy hiện có trước; thiếu thì báo prerequisite/blocker và xin thống nhất setup, không làm như đã có. Local image ID của máy gửi không phải registry digest để docker pull; dùng image sẵn có phù hợp và ghi ID/version/diff môi trường. Nếu cần đổi image/config chung cho cặp sau, thống nhất và ghi version.

```powershell
node scripts/prepare_p02_inputs.mjs prepare --source work/app
node scripts/run_p02_baseline.mjs build --source work/app --config work/config --maven-home PATH_TO_MAVEN_DISTRIBUTION --maven-repository PATH_TO_MAVEN_REPOSITORY --java-image LOCAL_JDK_IMAGE
```

Thay placeholder bằng đường dẫn/image đã kiểm. Runner không tự tải image/dependency, Maven network none/cache read-only. Từ JSON output của hai lệnh lấy **đường dẫn run mới trên máy nhận**, không dùng đường dẫn E:/NCKH của evidence cũ:

```powershell
node scripts/run_p02_baseline.mjs baseline --build-run PATH_TO_NEW_BUILD_RUN --preparation PATH_TO_NEW_PREPARATION_RUN
node scripts/check_p02_baseline.mjs --run PATH_TO_NEW_BASELINE_RUN
```

Chỉ baseline GET, không POST/mutated. Tất cả logs/run mới được giữ dưới handoff-out của bản làm việc. Source/config sạch trước/sau, không publish port, dùng network/DB riêng và cleanup đúng run. Ghi kết quả thật, kể cả lỗi/hạ tầng hoặc khác biệt dữ liệu.

## 4. Evidence máy gửi và giới hạn portability

`evidence/baseline/` có đủ 155 artifact và manifest gốc. `provenance/` có build metadata/log/manifest gốc; JAR chỉ có SHA, không có binary. Vì không ship JAR và không giả rebase đường dẫn, **không gọi checker baseline trên thư mục evidence được chuyển rồi mong nó tìm thấy build-run máy gửi**. Dùng VERIFY_PACKAGE để kiểm gói nhận; full baseline checker chỉ cho run mới do runner tạo trên máy nhận.

Các đường dẫn tuyệt đối trong raw commands/inputs là provenance lịch sử, không phải lệnh yêu cầu chạy nguyên xi. Không sửa raw để đổi thành đường dẫn máy mình. Gói không biến sandbox đã kiểm thành môi trường byte-identical của máy khác.

Sau khi nhận gate universe/draft, phần extraction/Neo4j làm theo task packet. Chưa có gate thì chỉ tái lập baseline/audit code, không xuất actual P02 system output hoặc nhãn.
