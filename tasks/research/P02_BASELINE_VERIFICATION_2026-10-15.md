# P02 — kiểm khả thi baseline từ source pin

Ngày: 15/10/2026. Theo yêu cầu bắt đầu runner/baseline sau chuẩn bị P02. Kết luận: **G1 baseline feasibility đạt trong sandbox đã ghi**, chưa phải baseline/mutated comparison, nghiệm thu nhãn hoặc chấm chính thức.

## 1. Đã chạy thật

Build lại năm dịch vụ từ Git source pin `3858f9c630cf989bb6809a86edf47c2be78dc9f1`; config native lấy từ Git config pin `323993ce2519c6d02df63e08bf4458d123d3b611`. Không dùng JAR cũ trong checkout hoặc ứng dụng cũ trong image làm baseline.

```powershell
node scripts/run_p02_baseline.mjs build --source handoff-out/p01-step1-20261012-02747b5d/source --config E:/NCKH/petclinic-pilot/spring-petclinic-microservices-config --maven-home C:/Users/GumSalmon/.m2/wrapper/dists/apache-maven-3.9.8-bin/337e6d14/apache-maven-3.9.8 --maven-repository C:/Users/GumSalmon/.m2/repository
node scripts/run_p02_baseline.mjs baseline --build-run handoff-out/p02-build/20261015T101851660Z-95cea45d --preparation handoff-out/p02-preparation/20261015T095309937Z-d20ef94a
node scripts/check_p02_baseline.mjs --run handoff-out/p02-baseline/20261015T102355058Z-2e775d19
```

Build, baseline và checker đều exit 0. Maven build network none, cache/distro read-only và settings trung tính riêng, không dùng user credential/settings. Java image có JDK Temurin 17.0.20+8; build chỉ chọn Config Server/Discovery/Customers/Visits/API Gateway. Cả năm service SUCCESS; Maven báo 01:22 phút. Java application tests **không chạy**, vì build dùng `maven.test.skip=true`.

Build run `handoff-out/p02-build/20261015T101851660Z-95cea45d`: 21 file manifest. Baseline run `handoff-out/p02-baseline/20261015T102355058Z-2e775d19`: 155 file manifest. Check đọc offline xác nhận byte/hash và lineage build/preparation, HTTP raw bodies, dữ liệu từng visit/gán đúng pet, SQL config và registration UP của ba app thực. Không chỉ kiểm tổng count hoặc metadata success.

## 2. Quan sát baseline

| Request | HTTP quan sát | Nội dung/phạm vi |
|---|---:|---|
| GET visits, thiếu includeDetails | 200 | Đủ bốn visit từ SQL, IDs 1–4, pets 7/8, ngày/description đúng |
| includeDetails=true/false/empty | 200 | Đây là baseline chưa khai báo includeDetails; không suy ra mutated |
| includeDetails=not-a-boolean | 200 | Tham số ngoài contract baseline; giữ probe diagnostic này để đối chiếu sau |
| Thiếu petId | 400 | Log MissingServletRequestParameterException được giữ; không đổi error thành visits=0 |
| Gateway owner 6 | 200 | Pets 7/8, đúng bốn visit với nội dung và assignment tương ứng |
| Gateway owner 1 | 200 | Pet 1, visits rỗng; đối chứng dữ liệu phụ |
| Overload GET visits một pet | 200 | Quan sát API không đổi; chưa tự gán negative label |

Chín GET fixture + bốn config/registry responses sau readiness. Startup polls được lưu đầy đủ, tách khỏi observation; không chọn bỏ gateway fallback/error trong thời gian chờ khởi động. Response body giữ nguyên byte; headers là parsed pairs, không phải raw wire transcript. Không thực hiện POST, không lặp đủ hai repetition hoặc chạy 40 slot.

Baseline chỉ xác nhận setup và bằng chứng nguồn dữ liệu. Không có mutated observation nên chưa thể kết luận behavior unchanged, tương thích toàn miền đầu vào, cần sửa mã hay nhãn positive/negative cho bất kỳ Method/API/Service nào.

## 3. Isolation, provenance và giới hạn

- Docker engine 29.8.0 Linux x86_64. JDK/runtime image ID `sha256:afed130922b1df5f31b8711f47caa7fa853273f40bc8ba03e72c12f82ede7779`; mỗi service chạy JAR mới read-only tại `/p02.jar`, không gọi entrypoint/application cũ. Image ID và SHA từng JAR nằm trong build/inputs.
- Runtime dùng network internal, không publish port, không Docker socket, không credential/model/cache của AI. Config native từ archive pin, không fetch main. HSQLDB riêng trong run; không mount DB người dùng.
- Command overrides Eureka timing/profile/config/tracing request được ghi đầy đủ, không giả môi trường byte-identical P01. Tracing-disable flag không thay chứng cứ network isolation; presence/absence trace IDs không được dùng làm kết luận export thực tế.
- Source archive SHA-256 `9135cfd6869ff2a91f271ab87ff35ffcfea16ef28a2a1843eb722635fdfe688d`; config archive `a0c450c76ef55bd2419b5e915f96c66ca0fefa4a178eeb3beca810fc0135d3ce`.
- Manifest build SHA-256 `dfbd669718b45de4f72d4e83b2ef251f2c1b32545ddaf59291631c24d1e653ff`; manifest baseline `499b25697056c38fe0ad833b290b72d272edb72e91b935922a35c006e94cad55`.
- Result baseline SHA-256 `cae57bce80d02415b1eed773cf41e7a9d38303917fe9a89a0cd1197284e4d878`; inputs SHA-256 `08ce94a37eb6a172cee24321b74ec8520440d30c079055d51bf70a44674b1245`.
- Runtime code SHA-256 ghi trước và kiểm sau: runner `633e39d703a0e856403fffcbfd6bf07426dc1f7fa4ca48ed04043817e0120d6c`, probe `74cc3d64630b80b866d98140ce6003c67893b721df37f94b9542d75f59e2c812`. Không đổi hai file này giữa run. Source candidate lưu code đúng hash; không gán HEAD cũ thành commit chứa code mới.
- Build ban đầu `20261015T101757545Z-23c105ca` dừng ở source LICENSE hash vì `git archive` đổi CRLF. Đã sửa scoped `core.autocrlf=false` cho archive; giữ run lỗi, không sửa blob/hash chuẩn. Build log/commands/archive pin là provenance build; run build này chưa lưu riêng hash runner tại thời điểm build, không quảng bá như có complete signed toolchain provenance.
- Không có full transitive dependency lock hoặc chứng nhận các platform khác. Source/target làm việc không được giả khóa toàn bộ bằng manifest; archives/JAR/raw evidence mới là immutable artifacts được kê khai.
- Container/probe/network mang đúng label run đã tự dọn; Docker queries sau chạy không còn tài nguyên mang label. Source/config checkout vẫn sạch. Không xóa container/volume hoặc dữ liệu khác.

## 4. Tests và đóng gói

- Node regression P01/P02: **137/137**, fail/skip 0, exit 0 trên workspace và candidate cuối; gồm 5 runtime-argument guards, 6 baseline-claim/path guards và regression schema register v1/v2/v3. Fixture tổng hợp không phải evidence ứng dụng.
- Python probe: **5/5 unittest**, exit 0 trong container network none/read-only; kiểm fallback rỗng, fixture IDs, config sources và từ chối public target trước network.
- Không đổi viewer nên không chạy lại browser. Node transport tests không liên hệ provider thật. Windows DPAPI test dùng dữ liệu giả dưới profile thật; không đọc/gửi key thật.
- Source candidate cuối `handoff-out/p01-candidate/20261015T103550526Z-343e1045`: 70 file/962711 byte, 70/70 checksum khớp, scope SHA-256 `d04c3b08be7ba4c322092f32e7adafa08d66a85b0d9bec9b8dd42a9b17c577ee`. Không phải commit/checkout Git sạch, chưa push; loại JAR/cache, raw runtime/model, credentials và reviewer packages.
- `git diff --check` exit 0, chỉ có cảnh báo LF/CRLF ở một số file cũ; index trống. Các thay đổi tồn tại trước lượt này được giữ nguyên.
- P01 closeout audit chạy lại tại `handoff-out/p01-closeout/20261015T103550268Z-5cb87ba0`, vẫn chưa paired inference/accepted labels/official scoring; không thay kết quả P01.

## 5. Trạng thái hiện hành và bước tiếp

PROJECT_CONTEXT v0.6, [runner hướng dẫn](../../pipeline/p02/README.md), kế hoạch/packet và research register v3 đã đồng bộ. Register v3 SHA-256 `d805c615fe505cbc02c7b626eed46ebef6ce738d89b8fe3d8860aceea5021986`; tham chiếu baseline artifact thật, không chỉ cờ true. Spec preparation.v1 giữ trạng thái lúc tạo, không sửa lịch sử; phiên bản register cũ vẫn ở các candidate đã tạo.

P02 đang ở **baseline_verified, universe_confirmation_pending**. Chưa nhận Phát xác nhận độc lập inventory/alias/fixture, chưa khóa universe, chưa mutated/POST/matrix đầy đủ, chưa nhãn hoặc review. Không có source/contract parser output P02, model prediction hoặc score mới. Không tự chuyển vai trò Hiển/Phát, gửi tin nhắn, mở PR, commit/push/merge.

Bước cần phối hợp: chuyển [packet đã cập nhật](../P02_P04_TASK_PACKETS.md) và allowed-input source/patch/fixture/inventory cho Phát xác nhận; nếu có bất đồng tạo version trước nhãn/output. Sau đó mới khóa đầu vào và thu baseline/mutated đầy đủ. Không nhờ reviewer duyệt baseline setup thay nhãn. Nhóm chưa cần đứng im chờ reviewer; vẫn có thể chuẩn bị công cụ, nhưng không tự vượt gate cần người thật.
