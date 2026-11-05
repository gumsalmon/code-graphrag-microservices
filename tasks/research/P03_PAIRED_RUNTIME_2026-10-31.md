# P03 C03-A — bằng chứng runtime paired ngày 31/10/2026

Quyền hiện hành sau báo cáo runtime này: [D20](../../benchmark/decisions/PETCLINIC_DRAFT_INTEGRATION_2026-10-31.json) đã cho Phát lập nhãn nháp P03; actual integration offline sau checkpoint từng ca được kiểm. [Status D20](../PETCLINIC_D20_STATUS_2026-10-31.json) và [gói công việc](PETCLINIC_HANDOFF_2026-10-31.md) cập nhật điều phối. Những câu chưa có quyền annotation trong báo cáo dưới đây là trạng thái lúc đóng D19, không còn là blocker xin quyền.

Đã hoàn tất phần kỹ thuật được cho phép tại [D19](../../benchmark/p03/decisions/INPUT_LOCK_2026-10-31.json): runner offline, build Customers mutated, bốn nhóm baseline/mutated × hai lần lặp, đối chứng ghi/đọc và kiểm reset trong sandbox riêng. Các kiểm tra sau chạy đạt; sandbox đã dọn. Đây là bằng chứng ứng dụng thực thi, chưa phải nhãn tác động, kết quả phương pháp GraphRAG hoặc nghiệm thu P03/PetClinic.

[Status máy đọc được](../P03_PAIRED_STATUS_2026-10-31.json), [bảng điều phối](../PETCLINIC_WORKBOARD.md), [hướng dẫn tái lập](../../pipeline/p03/PAIRED_RUNTIME.md).

## Đầu vào và quyền thực hiện

- Huy xác nhận trực tiếp ngày 31/10; không suy thời điểm cụ thể. D19 lưu nguyên văn chỉ dẫn và sáu hash trong proposal. Scenario 0.1.0, universe draft.v1, fixture v1, scope v1; candidate/proposal/D18 không sửa byte hoặc flags.
- PetClinic source `3858f9c630cf989bb6809a86edf47c2be78dc9f1`; config `323993ce2519c6d02df63e08bf4458d123d3b611`.
- Candidate `handoff-out/p03-preparation/20261024T190227112Z-a8e852db`, manifest `c52f085be74406e542de93db7f6d70b2fc3fe60f215ae47bd45df5b1cc5cec92`.
- Patch SHA-256 `87b0083ca0b1c9a01badb94f3cf8ecdf1918a24517d91e7b2690810c8080fbc0`: chỉ `OwnerResource.findOwner(int)` và import trong Customers, đổi key top-level `pets` thành `animals`, giữ sáu scalar và cùng danh sách từ `owner.getPets()`. Không chồng P01/P02, sửa consumer, entity/getter, config hoặc DB schema.
- Universe đã khóa đầu vào vẫn giới hạn sáu top-level class/record, 27 Method/5 API/2 Service; loại seed còn 26 Method/4 API/1 Service. Khóa input này không khóa final test và không chứng minh coverage toàn PetClinic.

## Hồ sơ thực thi

| Hồ sơ | Đường dẫn local và SHA-256 của SHA256SUMS.txt |
|---|---|
| Offline plan measurement v2 | `handoff-out/p03-paired/20261031t052920526z-413d1ab0` — `135ea9006f8452c5ee2c0574e11c7ffcb55316d052c20abafc5340b9b56c038f` |
| Paired runtime hoàn tất | `handoff-out/p03-paired/20261031t052939742z-be07ff6d` — `65057ce36b3c4235943090079a1fe7384660bafa1f31b5ec3e8d113a764dce56` |
| Lượt lỗi đầu, giữ nguyên | `handoff-out/p03-paired/20261031t052007284z-15efe1e2` — `ffeee8ec69421627dbe271830122785fc9a4abf5ff92d1cc0344ceea91a01d0e` |

[Runtime manifest](../../handoff-out/p03-paired/20261031t052939742z-be07ff6d/SHA256SUMS.txt) liên kết manifest build và từng group. Mỗi group giữ request/response nguyên byte, metadata/hash, argv, stdout/stderr/exit, readiness polls, Docker identities, log năm app và cleanup. Các thư mục handoff-out bị Git bỏ qua; báo cáo này không có nghĩa chúng đã có trên GitHub hoặc được đóng gói để chuyển máy.

Audit riêng tại [handoff-out/p03-paired-audit/20261031t052939742z-be07ff6d](../../handoff-out/p03-paired-audit/20261031t052939742z-be07ff6d/README.md): checker nguồn/isolation, raw comparisons, repetition audit, build payload audit, support GET audit, kiểm bảo toàn/cleanup lượt lỗi và truy vấn Docker cuối. Log kiểm thử và bản sao code audit được lưu kèm, tách khỏi runtime đã seal.

Manifest audit đã seal và kiểm đủ 80 file, SHA-256 `52bfc09af16f4db6e56533d8df949987f9d361406d3b29ec94056ab3d9558014`. `FINAL_SUMMARY.json` ghi 26 implementation files vẫn khớp runtime snapshot và trạng thái Git cuối phiên.

## Kiểm thử và build

21/21 Node tests và 29/29 Python tests liên quan đạt, không fail hoặc skip. Ba kiểm thử Python bổ sung bắt lỗi readiness dùng response nghiệp vụ; các test còn lại kiểm fixture/reset, generated ID, write allowlist, lỗi transport, giữ HTTP 500, exact rename và chống thay đổi nested/order/fields. Log cuối tại `handoff-out/p03-paired-audit/20261031T052843Z-readiness-v2-4b68f271/final-*`, được sao vào audit bundle. Đây là 50 kiểm thử công cụ, không phải 50 scenario hoặc Java application tests.

Baseline dùng lại build P03 đã kiểm ngày 28/10: `handoff-out/p03-build/20261028t094427082z-687c052b`, build.json SHA `76d1d21ad4d55bf093783ea3c9b11b3874e8b0beba90d8a99507b6bb9ba11c8e`. Kiểm lại manifest/source/config/JAR trước dùng; tar source baseline được áp patch trong source/Git sandbox riêng. Maven offline, network none, Maven/dependency cache read-only, chỉ build Customers. Java application tests được skip có khai báo; không gọi build pass là Java suite pass.

Mutated Customers JAR SHA `53e8bf921fbb867df240c41c236d011fff3c2c2881b258cecbbefe5025348df5`. Audit độc lập ZIP payload kiểm 15 application classes, 161 dependency JAR và 289 file members: chỉ `OwnerResource.class` đổi trong class ứng dụng; hai metadata `git.properties`/`build-info.properties` cũng đổi. Không tuyên bố whole JAR hai build phải byte-identical. Bốn baseline JAR Config/Discovery/Visits/Gateway được dùng nguyên hash. Diff source chỉ một file đã đăng ký; bytes consumer/config/overrides được kiểm giữa cả bốn nhóm.

## Phép đo đã thu và kết quả quan sát

Bốn group `baseline-r1`, `mutated-r1`, `baseline-r2`, `mutated-r2` dùng **20 app containers và bốn internal networks mới**, không publish port, không dùng volume DB hoặc tái sử dụng app instance. Mỗi nhóm reset về 10 owners/13 pets và bốn visits theo SQL pin. Owner rỗng và owner đối chứng được POST tạo riêng, lấy ID từ response/readback; thực tế lần này là 11/12 ở cả bốn nhóm, runner không hardcode các số này và synthetic test dùng ID 73/82.

Tổng **48 fixture slots**, **68 collector requests** (gồm setup/reset/write readbacks) và **24 support GET** kiểm config/registry/visits; readiness polls lưu riêng, không cộng thành repetitions. Chỉ ghi Customers DB disposable: bốn setup POST, bốn POST đối chứng và bốn PUT vào owner mới. Không sửa seed owner.

| Quan sát | Baseline, cả hai lần | Mutated, cả hai lần |
|---|---|---|
| GET trực tiếp owner có hai pets / một pet không visits / owner không pet | 200, key `pets` | 200, key `animals`; sáu scalar, nested values và thứ tự danh sách giữ nguyên |
| GET qua Gateway cho ba owner trên | 200 | 500; giữ nguyên response/error/log |
| GET danh sách owners | 200 | 200; full JSON bằng baseline, vẫn có `pets` |
| GET Visits pet 7/8 | 200, bốn visits | 200, full JSON bằng baseline |
| Missing owner trực tiếp | 200, body bốn byte `null` | Giống baseline |
| Missing owner qua Gateway | 200, body rỗng | Giống baseline; body rỗng khác JSON `null` |
| POST tạo owner và PUT owner mới | 201 / 204 body rỗng | 201 / 204 body rỗng; readback dữ liệu đúng, key GET đổi theo handler |

Checker exact rename kiểm sáu cặp GET mỗi repetition: ba ca chính và ba readbacks. Năm cặp reset/list/Visits/POST được so full JSON, giữ nested values và array order. PUT được kiểm status/body/readback riêng. Gateway và missing owner được ghi nhận mà không ép status/body dự kiến vào collector hoặc readiness.

Log Gateway mutated ghi `NullPointerException: ... this.pets is null` tại `OwnerDetails.getPetIds(OwnerDetails.java:36)`, checkpoint `ApiGatewayController#getOwnerDetails(int)`. Điều này phù hợp với consumer còn đọc DTO `pets` trong source pin; đây là chẩn đoán giới hạn theo source/log, chưa là polarity hoặc repair label cho từng method/API/service. Xem `groups/mutated-r1/logs/api-gateway.stdout.log:124` trở đi trong runtime.

Repetition audit so **34 request pairs**, 17 mỗi snapshot. Toàn bộ body baseline và 14/17 body mutated byte-identical giữa hai lần. Ba error bodies Gateway mutated khác `timestamp` và `requestId`; status/path/method giữ nguyên. Các field biến thiên được báo rõ, không xóa hoặc chuẩn hóa để tuyên bố raw bằng nhau. Hai repetitions của một ca không được tính là hai scenario độc lập hoặc bằng chứng thống kê.

## Lượt lỗi đầu và sửa phép đo

Lượt đầu build mutation thành công, thu xong baseline-r1 rồi dừng ở readiness Customers mutated. Probe baseline cũ yêu cầu field `pets`; ứng dụng đã trả 200 với `animals`, nhưng probe vẫn poll đến timeout. Đây là lỗi điều kiện đo do coordinator triển khai. Raw giữ 75 lần poll, failure và cleanup; không sửa patch để làm probe pass, không xóa lượt lỗi hoặc tính baseline-r1 này vào hai repetitions của lượt hoàn tất.

Measurement v2 tách readiness khỏi endpoint đang đo: Customers/Visits/Gateway dùng `/actuator/health` status UP, kiểm riêng ba app đăng ký Eureka UP. Config/Discovery dùng checks cấu trúc tương ứng. Đã thêm regression tests rồi chạy lại trong thư mục/stack mới. Không sửa runner baseline/F03 cũ. Source/config/patch giữ nguyên; hai lượt build có whole-JAR hash khác do metadata đã khai. Audit lượt lỗi xác nhận manifest/bảo toàn và cleanup đủ cả hai group từng khởi tạo.

## Bảo toàn, giới hạn và bước tiếp theo

Source dự án, prototypes, shared contracts/experiment drafts, P01/P02/return evidence, candidate và gói scope Phát không đổi theo protected-before/after. Cleanup build và bốn group complete; truy vấn Docker cuối không còn container hoặc network có label `code-graphrag.p03-paired`. Không prune tài nguyên khác, tải image/package/model hoặc đọc credential.

Bảng điều phối kiểm cấu trúc đạt (23 tasks/37 evidence files), năm tests riêng đạt. Git giữ branch `codex/p01-evidence-demo`, HEAD `d1f95eb21c71dd6bfb49d2e450142d1290ceda5f`, index rỗng; working tree còn thay đổi local, gồm cả thay đổi từ các phiên trước. `git diff --check` mặc định exit 2 do CR cuối dòng trên checkout CRLF; lệnh kiểm lại với `-c core.whitespace=cr-at-eol` exit 0, không đổi cấu hình Git hoặc normalize evidence để che khác biệt. Cả hai log được giữ trong audit bundle.

Chưa tạo nhãn P03, annotation notes thay con người, prediction/parser/Neo4j/retrieval output được đánh giá, model call, test split, score, commit hoặc push. Các checker trên là kiểm độc lập cơ học giữa code/raw/build, không thay reviewer người thật hoặc chứng minh độ đúng ground truth. Không thêm tracing production method: source/stacktrace/HTTP là đúng mức bằng chứng hiện có. Chỉ một operator, một hệ thống, fixture chọn lọc và hai lần lặp; không suy rộng thành kết quả bài tạp chí.

Tiếp theo cần Huy cho riêng bước Phát đọc source/raw và lập nhãn **nháp pending_review** P03, giữ khác vai trò builder/reviewer; packet cần raw/runtime mới cùng source/universe đã khóa, chưa có output phương pháp/score. P02 vẫn cần checkpoint đọc/nhãn nháp của Phát; Hiển giữ phần parser/importer và integration sau checkpoint tương ứng, không bị thay bằng việc lập/duyệt nhãn. Contract D01–D08, thiết kế E01–E10 và quyền model/release vẫn là các việc riêng. Sau human draft/checkpoint mới nối actual output, hoàn thiện packet review gộp PetClinic rồi sửa theo reviewer; chưa mở P04.
