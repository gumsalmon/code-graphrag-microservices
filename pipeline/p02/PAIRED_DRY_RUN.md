# P02 — chuẩn bị runner baseline/mutated bằng dry-run

Ngày 15/10/2026. Đây là phần **kế hoạch và điều phối mô phỏng**, chưa phải runner thực thi baseline/mutated hoàn chỉnh. Chưa chạy mutation, POST, Docker hoặc LLM; chưa khóa phạm vi hay tạo nhãn. Runner baseline GET hiện có không bị sửa.

## Mục tiêu / đầu vào / đầu ra

Đầu vào duy nhất của CLI là một preparation run P02 đã qua checker. Script kiểm lại byte của spec/source và tính lại các draft như công cụ preparation hiện hành; không dùng parser/graph/context/prediction/score làm oracle. Fixture, scenario, patch, request plan gốc và các gói đã gửi thành viên giữ nguyên.

Đầu ra mới nằm tại `handoff-out/p02-paired-dry-run/<run-id>/`:

- `plan.json`: bốn nhóm riêng `baseline-r1`, `baseline-r2`, `mutated-r1`, `mutated-r2`; mỗi nhóm mười request theo fixture, chín GET rồi một POST. Có 40 slot dự kiến, không phải 40 quan sát thực tế.
- `simulation.json`: trace state-machine tổng hợp. Không có body hoặc status HTTP được bịa để làm bằng chứng thành công.
- `fault-simulations.json`: tám tình huống lỗi tổng hợp: network, service startup, fixture, request, POST, thu log, cleanup và lỗi chính + thu log + cleanup đồng thời.
- `summary.json`: tách planned/simulated/actual; luôn `runtime_matrix_completed=false`, `labels_created=false`, `actual_http_requests=0`.
- `inputs.json`, năm file input sao nguyên byte, ba code snapshot và `checksums.sha256` cho 14 file. Snapshot code chỉ để đối chiếu, không tự thực thi code dưới `code/`.

Các đường dẫn response trong plan là **đường dẫn tương lai**, không trỏ tới response đã thu. Plan không có base URL đang hoạt động, mutated JAR hoặc quyết định của Phát giả định.

## Điều phối được kiểm bằng mô phỏng

Trong từng nhóm: đăng ký tài nguyên dự kiến → khởi động năm service → kiểm fixture/config/readiness → mười request đúng thứ tự → thu log → cleanup đảo thứ tự. Nhóm tiếp theo chỉ được xét sau khi nhóm trước hoàn tất và không còn tài nguyên mô phỏng.

- Mỗi nhóm có network, năm container và khóa DB riêng; HSQLDB mới theo nhóm, không shared volume, không host port. Reset được thiết kế bằng hủy stack riêng rồi tạo stack/DB mới, không xóa dữ liệu dùng chung.
- Cùng source/config/fixture cho cặp; chỉ provider mới có patch. Trước runtime phải có build identities và bằng chứng consumer/config không đổi. Hiện các mục này là yêu cầu, không phải kiểm chứng đã thực hiện.
- Fixture check đứng trước mọi request. Startup/fixture hỏng thì không chạy request, không bỏ baseline lỗi để chạy mutated.
- POST luôn cuối nhóm. Không có retry request tự động, đặc biệt tránh POST lặp khi không rõ kết quả.
- Khi lỗi vẫn mô phỏng đường thu log và cleanup. Lỗi chính, lỗi log và lỗi cleanup lưu riêng; không để finally che nguyên nhân đầu.
- Mọi cleanup target phải thuộc đúng danh sách tên/loại/label của run và nhóm, không chỉ cùng prefix; không có global prune. Cleanup lỗi thì thử phần còn lại, giữ danh sách chưa dọn và không mở nhóm sau.

Đây là kiểm quy tắc state-machine, **không chứng minh Docker cleanup, readiness hoặc DB reset thực tế**. Adapter thật sau này phải kiểm ownership labels từ Docker, giữ cả trạng thái tạo tài nguyên không chắc chắn, thu raw evidence thật và xác minh cleanup. Không dùng metadata tự khai trong plan thay việc inspect tài nguyên.

## Cách chạy, không cần Docker hoặc API key

Từ gốc repo, thay đường dẫn bằng preparation run đã kiểm:

```powershell
node scripts/prepare_p02_paired_run.mjs dry-run --preparation handoff-out/p02-preparation/20261015T095309937Z-d20ef94a
node scripts/prepare_p02_paired_run.mjs check --run PATH_TO_NEW_PAIRED_DRY_RUN
```

Mỗi lần dry-run tạo thư mục mới, không overwrite. `check` chỉ đọc, kiểm đủ file, checksum, đối chiếu input/code pin và tái tính plan/trace/summary. Vì dựa vào preparation gốc và code version hiện hành, đây không phải portable ZIP verifier. Khi thay code cần tạo run mới; giữ bản cũ cho truy vết.

CLI cố ý **không có** `run`, `execute`, `--force`, `--confirmed`, `--base-url`, retry hoặc pluggable runtime adapter. Thêm flag thật vào file JSON rồi tính checksum lại vẫn bị checker từ chối. Không sửa frozen scenario/universe thành confirmed để vượt gate.

Có thể chạy với Node permission model, chỉ cấp quyền ghi vào thư mục dry-run và không cấp quyền tạo child process:

```powershell
node --permission --allow-fs-read=E:/NCKH/code-graphrag-microservices --allow-fs-write=E:/NCKH/code-graphrag-microservices/handoff-out/p02-paired-dry-run scripts/prepare_p02_paired_run.mjs dry-run --preparation handoff-out/p02-preparation/20261015T095309937Z-d20ef94a
```

Đường dẫn trên chỉ là ví dụ workspace hiện tại, cần đổi khi chuyển máy. Không coi permission model là sandbox an ninh đầy đủ hoặc bằng chứng đã kiểm mọi hình thức network access. Implementation hiện tại không có HTTP/Docker executor; kiểm preparation chỉ đọc và không gọi Git subprocess.

## Kiểm thử và DoD của bước dry-run

```powershell
node --test pipeline/p02/paired-plan.test.mjs pipeline/p02/paired-artifacts.test.mjs
node scripts/test_p02_paired_dry_run.mjs --run PATH_TO_NEW_PAIRED_DRY_RUN
```

Acceptance script kiểm clone nguyên vẹn trước mỗi phép sửa, rồi giữ các bản cố tình sửa trong thư mục acceptance mới: giả HTTP, runtime complete, xác nhận người thật; sửa fixture/code; che lỗi cleanup; bỏ POST; thêm nhãn ngoài manifest; byte lệch. Tính lại checksum không hợp thức hóa input hoặc kết quả khác quy tắc. Script không sửa run gốc, không đọc credential thật hoặc ký nhãn.

Bước này đạt khi đủ 40 slot đúng fixture, bốn namespace/DB riêng, POST cuối, lỗi/cleanup và stop rules được kiểm tổng hợp; artifact có lineage/hash và checker phát hiện sửa đổi; mọi actual count vẫn bằng 0. Test pass không duyệt universe, không nghiệm thu nhãn và không cho phép scoring.

## Bước còn chờ

Sau khi Phát xác nhận phạm vi/alias/fixture và đầu vào được chốt đúng version/hash: xử lý bất đồng nếu có, phát triển/kiểm adapter runtime và build mutated đúng pin, rồi mới thực thi cặp trên stack riêng để thu raw evidence. Source-first annotation và technical method outputs vẫn là hai luồng độc lập; không dùng output hệ thống để sửa nhãn.

Chưa mở P03/P04 hoặc gọi model từ bước này. Hai ZIP đã gửi Hiển/Phát không bị tái đóng gói; chưa cần yêu cầu họ làm thêm phần mới khi đang xử lý task đã nhận.
