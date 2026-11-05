# P02 — tham số tùy chọn, consumer giữ nguyên

Chốt lựa chọn C02-A bởi Huy ngày 15/10/2026. Đây là ca development/mutation tổng hợp, cùng duplicate group với P01. Không phải test chưa từng thấy, không phải benchmark đã được nghiệm thu.

Cập nhật hiện hành 24/10/2026: Phát đã kiểm lại F01/F02 tại `187c4d82fb75c07d6593522dd68bc1dfdd86ceca`; Huy chốt scenario `0.1.1`/universe `draft.v2`/fixture `v1` đúng hash và cho phép adapter/runner cùng runtime F03. Xem [quyết định riêng](decisions/INPUT_LOCK_2026-10-24.md) và [luồng F03](../../pipeline/p02/F03_RUNTIME.md). Đây là authorization, không tự là kết quả đã chạy hoặc quyền lập/duyệt nhãn/test/scoring. Các cập nhật 15–18/10 bên dưới giữ lịch sử, đã được quyết định mới thay thế ở phần input/runtime.

Kết quả thực 24/10: đã thu/kiểm 40 fixture slots, bốn POST/reset/readback, bốn extra fault probes và targeted helper evidence. [Báo cáo F03](../../tasks/research/P02_F03_RUNTIME_2026-10-24.md) ghi run/hash/tests/giới hạn; chưa Phát rà evidence sufficiency, chưa nhãn/test/scoring. Không dùng các dòng “chưa mutated/chờ input” của mốc G1 bên dưới làm hiện trạng mới.

Cập nhật 18/10/2026: review Phát kết luận cần sửa F01/F02. Bản đề nghị kiểm lại là **scenario 0.1.1/universe draft.v2**, chưa khóa và chưa được Phát xác nhận lại. Xem [điểm bắt đầu](preparation.v2/START_HERE.md), [changelog](preparation.v2/CHANGELOG.md), [hồ sơ và hash cụ thể](../../tasks/research/P02_INPUT_REVISION_2026-10-18.md). Fixture/patch/scope v1 giữ nguyên byte; các mô tả chưa nhận xác nhận bên dưới là lịch sử của gói 15/10, không phủ nhận lượt review vừa nhận.

Cập nhật G1: đã build offline và chạy baseline thật, provider/gateway có đúng bốn visits; [hướng dẫn và giới hạn](../../pipeline/p02/README.md). Chưa chạy mutated/POST/đủ 40 slot, universe vẫn chờ xác nhận độc lập. Các spec preparation.v1 bên dưới giữ trạng thái lúc tạo, không sửa lịch sử thành đã chạy.

## Những gì đã chuẩn bị

- Source PetClinic pin `3858f9c630cf989bb6809a86edf47c2be78dc9f1`.
- [Patch](preparation.v1/optional-query.patch) chỉ sửa declaration của `VisitResource.read(List<Integer>)`, thêm `includeDetails` kiểu boolean, `required=false`, `defaultValue="false"`. Không đổi thân method, consumer, database hoặc config.
- [Scenario](preparation.v1/scenario.json), [dữ liệu thử/ma trận request](preparation.v1/fixture.json), [quy tắc inventory/phạm vi](preparation.v1/scope.json).
- Script tạo snapshot source/patch/fixture/inventory/alias và universe **dự thảo**, có checksum; không tạo nhãn hoặc chạy hệ thống.

[Spring RequestParam](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/annotation/RequestParam.html) quy định default cho tham số bị bỏ hoặc rỗng, và có default thì required có hiệu lực false. Đây là căn cứ thiết kế; runtime phải ghi đúng framework/config và kết quả thật, không lấy tài liệu làm nhãn sẵn.

Patch SHA-256: `091b04de4a504512cbda4e0c5c0759b747b056b4c7028923d8b7808b43303c4f`.

## Dữ liệu thử

Lấy từ SQL HSQLDB ở source pin, không lấy response P01 làm dữ liệu P02:

- Owner 6, pets 7 và 8, bốn visit có ID 1–4. Đây là fixture có dữ liệu để phát hiện thiếu visits bị HTTP 200 che khuất.
- Owner 1, pet 1, không có visit trong SQL: đối chứng dữ liệu rỗng phụ, không thay fixture chính.
- Mỗi snapshot baseline/mutated, hai lần lặp với DB sạch riêng. Mười request mỗi lần: omit/true/false/empty/invalid boolean, thiếu petId, gateway có/rỗng visits, overload GET và POST không đổi. Tổng **40 slot dự kiến, chưa chạy**.
- POST chạy cuối trên DB riêng của run, reset trước lặp tiếp theo; không chạy POST vào server hoặc DB người dùng. Không kiểm dữ liệu sau POST rồi coi còn giống fixture ban đầu.

Tên “control tương thích” không ấn định nhãn negative. Miền chính là request hợp lệ hiện có của consumer không gửi includeDetails. Boolean không hợp lệ là probe miền đầu vào khác, vẫn giữ và báo riêng mọi status/body thay đổi. Không kết luận tương thích cho toàn bộ đầu vào HTTP từ một miền con. Nếu đổi định nghĩa fixture/miền đánh giá, tạo version mới trước nhãn/output.

Giữ byte raw status/body/header/log và lỗi hạ tầng. Bản chuẩn hóa sắp xếp theo ID chỉ hỗ trợ so nội dung; vẫn báo khác biệt thứ tự mảng raw, không tuyên bố byte-identical hoặc bỏ field cho đẹp. Không dùng request/response giả hoặc MockMvc thay runtime consumer thật.

## Phạm vi đánh giá dự thảo

Quy tắc đã ghi trước nhãn/output: kiểm kê mọi method khai báo trực tiếp (không constructor) và HTTP mapping trong ba file VisitResource, VisitsServiceClient, ApiGatewayController, bất kể reachable hay dự kiến impacted. Không dùng registry năm node của parser P01 để chọn ID.

| Cấp | Inventory nguồn | Loại seed | Còn trong universe dự thảo |
|---|---:|---:|---:|
| Method | 9 | 1 | 8 |
| API | 4 | 1 | 3 |
| Service | 2 | 1 | 1 |

Giữ cả `joinIds`, `setHostname`, `addVisitsToOwner`, `emptyVisitsForPets`. Method riêng không được tự coi negative chỉ vì HTTP gateway không đổi hoặc vì không chạy qua nó. Thiếu quan sát phù hợp thì unresolved. Constructor, generated/implicit methods và source ngoài ba file được loại theo quy tắc khai báo, không phải nhãn âm.

Canonical ID dùng baseline snapshot, có alias seed before/after khác signature và alias các entity không đổi. Alias/coverage do nhóm xây dựng chuẩn bị, **Phát chưa xác nhận độc lập**. Source hỗ trợ DTO, model, SQL và license có trong gói nhưng không tự trở thành scored inventory. Đây không phải full-repo recall; output Method/API/Service/projection/scorer hiện chưa đủ để chấm cả universe này.

Phạm vi pilot đã được ghi cố định trong spec v1; `evaluation_universe.draft.v1.json` vẫn `locked_for_labeling=false`. Phát cần đối chiếu source, inventory, exclusions, alias và miền fixture trước khi xác nhận universe để gán nhãn. Không đổi checksum/thêm “confirmed=true” thay xác nhận thật; tạo artifact/version hoặc quyết định riêng.

## Tạo và kiểm gói sửa hiện hành, không gọi API/Docker

Từ gốc repo, dùng clone PetClinic sạch đúng pin; không dùng folder implementation của nhóm:

```powershell
node scripts/prepare_p02_inputs.mjs prepare --source PATH_TO_CLEAN_PETCLINIC_CLONE
node scripts/verify_p02_revision.mjs --root PATH_TO_NEW_P02_REVISION_PACKAGE
node --test pipeline/p02/preparation.test.mjs pipeline/p02/input-revision.test.mjs pipeline/p01/closeout.test.mjs
```

Prepare đọc Git blobs và đối chiếu working tree (chấp nhận LF/CRLF cùng nội dung), chạy `git apply --check`, không áp patch vào clone, không sửa Git config toàn máy. Tạo thư mục mới `handoff-out/p02-input-revision/<id>`; source clone phải sạch trước/sau. Có 12 source/support blobs pin SHA-256 và bốn spec v1 pin byte; scenario mới chỉ được đổi version/revision metadata. Chỉnh file rồi tự tính lại manifest không đủ làm input hợp lệ. Thay đổi thiết kế cần version mới.

Gói sửa gồm 31 file có manifest, cộng `SHA256SUMS.txt`: spec, source có license, census, universe mới, 40 request slots dự kiến, lịch sử v1/proposal, provenance, mã chuẩn bị/test và hướng dẫn kiểm lại. Không chứa nhãn, graph/context/prediction hoặc score. Không tự tải dependency, gửi source cho provider hoặc build/chạy ứng dụng. Check exit 0 chứng minh toàn vẹn/khớp đặc tả, không phải nhãn hoặc runtime đúng. Gói preparation v1 cũ vẫn 22 file + `checksums.sha256`, được giữ nguyên; checker v1 chỉ xác nhận lịch sử và báo lỗi F01/F02 đã biết, không cấp điều kiện khóa input mới.

## Cần làm tiếp, theo thứ tự

1. Phát xác nhận inventory/universe/fixture từ source độc lập; nếu có bất đồng thì sửa thành version mới và ghi lý do, chưa gán polarity. Không ghi thành viên đã nhận việc nếu chưa phản hồi.
2. Baseline feasibility đã chạy ở sandbox riêng với config commit pin và JAR build mới; giữ provenance đó khi chuẩn bị bước tiếp. Không mặc định môi trường khác đã được kiểm hoặc dùng remote main.
3. Sau xác nhận đầu vào, khóa universe trước nhãn hoặc output phương pháp. Chạy baseline/mutated theo matrix, giữ raw evidence, kiểm consumer không đổi. Patch hiện mới được chuẩn bị/kiểm áp dụng, **chưa chạy mutated**; chín GET feasibility không thay 40 slot theo fixture.
4. Phát lập draft từ evidence, người khác review gộp theo source-first. Parser/graph/model là luồng riêng, không oracle nhãn. Chỉ sau các gate mới xem output development; accepted/test lock/chấm chính thức là quyết định riêng.

## Phối hợp

Huy và AI có thể chuẩn bị input, code runner và kiểm kỹ thuật, nhưng không thay Phát ký inventory hoặc tạo/duyệt ground truth. Hiển có thể triển khai hoặc tái lập độc lập trên máy khác; không tự bỏ task Hiển đang làm. Phát tập trung phần độc lập thay vì nhập liệu thủ công. Đây là phương án phối hợp đề nghị; chưa tự thay phân công chính thức.
