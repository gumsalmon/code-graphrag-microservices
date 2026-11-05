# Chuẩn bị P03 từ source — 25/10/2026

Huy cho biết Phát đang làm lượt P02 và yêu cầu tiếp tục kỹ thuật, chuẩn bị P03. Kết quả lượt này là **candidate có thể xem/chốt**, chưa phải đã chọn/chốt input, compile app, chạy mutation hoặc tạo nhãn. Phát giữ task P02 đang làm; không giao thêm P03 thay ngang task hiện tại.

## Nội dung và kết quả

- Source PetClinic `3858f9c630cf989bb6809a86edf47c2be78dc9f1`, config `323993ce2519c6d02df63e08bf4458d123d3b611`, protocol v0.2 SHA-256 `92258d2a19599f202c39ab5067191248c17631565391ffab9f96d9cc0608d6cb`.
- Đọc 27 source/support/SQL/POM/application file và sáu config file trực tiếp từ Git blob tại pin; đối chiếu Git object ID. Không lấy byte working tree, không đọc log/nhãn ngoài allowlist. Pilot có untracked evidence/log lịch sử; ghi đúng status và giữ nguyên trước/sau, không giả là checkout sạch. Code nền dự án vẫn HEAD `d1f95eb21c71dd6bfb49d2e450142d1290ceda5f`, thay đổi mới chỉ local.
- Patch một file: thêm hai import và sửa `OwnerResource.findOwner(int)` thành `Optional<Map<String,Object>>`, giữ sáu scalar getter, chuyển list `getPets()` sang khóa `animals`. Không sửa shared Owner getter, gateway, Visits, DB hoặc config. `git apply --check` và áp thật trong bản sao riêng đều exit 0; file sau áp khớp builder. Chưa kiểm Java compile/Jackson/runtime.
- Giữ `GET /owners` và POST/PUT Customers làm đối chứng representation dùng chung. Source audit có 13 vị trí baseline và một block mutated, ghi literal Customers URI, class/method mappings, record component, `getPetIds()` và phạm vi circuit breaker Visits. Không biến source path thành nhãn hành vi hoặc điền gateway 500 trước khi chạy.
- Universe nháp lấy mọi explicit method không phải constructor trong sáu top-level class/record, không lọc theo reachability/positive dự kiến: 27 Method, 5 API, 2 Service; tách ba seed còn **26 Method / 4 API / 1 Service**. Builder lồng nhau, constructor, synthetic/lambda, record accessor ngầm và các file support ngoài sáu class được loại trừ có lý do. Human confirmation còn thiếu; không phải full-repo recall, không phải hợp đồng output/scorer đã áp dụng.
- P03 bắt đầu từ baseline gốc, không chồng mutation P01/P02. Khi được chạy, chỉ rebuild Customers; bốn app còn lại phải là baseline byte-identical. Đặc biệt không dùng JAR Visits đã mutation của P02.

## Fixture và phép thử dự kiến

SQL gốc có 10 owner và cả 10 đều có pet. Owner 1 có pet 1 nhưng không có visits, khác với owner không có pet. Primary vẫn owner 6/pets 7–8 và bốn visits. Nhánh empty-pets cần setup POST tạo owner giả lập riêng trong HSQLDB của từng group; ID lấy từ response và direct readback, không mặc định 11. Không sửa SQL/schema/source để giả fixture sẵn có.

Kế hoạch bốn group baseline/mutated × hai repetition, stack/DB mới mỗi group:

| Nhóm phép thử | Nội dung |
|---|---|
| GET chính | Direct và gateway cho owner populated, có pet không visits, và owner empty-pets tạo ở setup |
| GET đối chứng/chẩn đoán | Owner list, missing owner direct/gateway, Visits direct không đổi |
| Write đối chứng cuối group | POST owner mới, PUT owner mới đó; full raw và readback sau mỗi write |
| Setup riêng | POST tạo empty-pets owner và readback; readiness/SQL/config/registry/build identity |

Tổng kế hoạch: **48 fixture slots = 40 GET + 4 POST + 4 PUT**, thêm bốn setup POST, tám write-control readback và readback/setup/readiness/config/registry bổ sung. Đây không phải số đã thực thi hoặc số mẫu thống kê độc lập. Write chỉ được chạy sau quyền phù hợp trong DB disposable thuộc run. Không sửa consumer để che lỗi.

`response_checks.py` chỉ là kiểm contract offline. Kiểm direct owner yêu cầu hai status thực quan sát là 200, trước/sau chỉ khác top-level key `pets` → `animals`; giữ mọi scalar/nested field và thứ tự mảng. Kiểm control so toàn JSON thành công, chỉ bỏ khác thứ tự key object. Trùng JSON key, thiếu field, null, đổi type, đổi nested data, lỗi HTTP hoặc lỗi parse đều không được chuyển thành pass/negative. Error/missing-owner và outcome gateway phải giữ raw và phân tích riêng. Chưa nối vào runner/parser/Neo4j/LLM/scorer.

## Candidate hiện hành

Thư mục: `handoff-out/p03-preparation/20261024T190227112Z-a8e852db/`. Timestamp thư mục là UTC; ngày làm việc địa phương Asia/Bangkok là 25/10. Có **52 file được manifest khóa + SHA256SUMS.txt**.

| Artifact | SHA-256 |
|---|---|
| SHA256SUMS.txt | `c52f085be74406e542de93db7f6d70b2fc3fe60f215ae47bd45df5b1cc5cec92` |
| scenario.candidate.v0.1.0.json | `36fc64997ed04a5fb9782231471bbd2dec5a0177c0ae0e428f2ff48457a1bed8` |
| owner-response-rename.patch | `87b0083ca0b1c9a01badb94f3cf8ecdf1918a24517d91e7b2690810c8080fbc0` |
| fixture.candidate.v1.json | `52172f64187d29461a754a7535bb5ec14f7a9ac0141e9e35e89f99848df1cc21` |
| scope.candidate.v1.json | `8db699e76e1d6c2d340e26f5d82080c4bea08ef574c7b500146da5cc9d3c4c53` |
| inventory.v1.json | `5ab81b134c0d9bed32ab4943c1b35ffc860f34d0204dbfcd825e008cb8c067a4` |
| evaluation_universe.draft.v1.json | `79a3def8a58e62f376d2ff594a71831163bbbf472fa54c29fbf0defd1b7d43d7` |

Hai bản dựng sơ bộ trước đó `20261024T185830863Z-b47cbd2e` và `20261024T190134519Z-0b00989f` giữ nguyên local để truy vết quá trình bổ sung source audit/exposure/build constraints; dùng bản `190227112Z-a8e852db` hiện hành. Không có bộ nào đã được Huy/Phát chốt. Không đổi byte candidate cũ theo trạng thái mới.

## Kiểm đã chạy

```powershell
node --test pipeline/p03/preparation.test.mjs
python -B -m unittest discover -s pipeline/p03 -p response_checks_test.py -v
node scripts/prepare_p03_inputs.mjs check --run handoff-out/p03-preparation/20261024T190227112Z-a8e852db
node scripts/check_p03_candidate_acceptance.mjs --run handoff-out/p03-preparation/20261024T190227112Z-a8e852db
```

Node **10/10**, Python **12/12**, không skip. Một test constructor/nested-builder đầu tiên phát hiện regex có thể đọc `public` như return type của constructor; đã sửa bằng tách modifier trước và giữ regression. Test dùng dữ liệu tổng hợp, không phải PetClinic runtime. Tool Python thực tế là runtime cục bộ Python 3.12.14; Node 24.22.1.

Verifier tái dựng spec/hash/census/alias từ source packet. Năm kiểm acceptance: verifier nằm trong packet chạy được sau chuyển thư mục; từ chối source bị đổi byte; từ chối giả `input_locked=true` dù đã rehash; từ chối hash fixture lấy từ JSON reserialize; từ chối file không nằm manifest. Candidate gốc được kiểm trước/sau, giữ nguyên. Đây là kiểm lỗi thao tác/toàn vẹn trong trust boundary hiện có, không phải chữ ký xác thực chống người sửa đồng thời code/verifier/manifest.

Log chạy cuối: `handoff-out/p03-preparation-audit/final-20261024T190253Z/CHECKS.json`, có command, exit và hash stdout/stderr cho sáu lệnh, cả sáu exit 0. Bao gồm verifier candidate P02 31 file và checker F03 cũ, không chạy lại app/Docker. Chỉ kiểm bảo toàn kỹ thuật, không phải Phát đã duyệt evidence/nhãn. Không gộp số test hoặc các acceptance copy thành sample nghiên cứu.

## Điểm tiếp tục

1. Huy xem/chọn cụ thể C03-A, operator, patch và fixture/control trên. Source census/alias/coverage cần người phụ trách benchmark xác nhận độc lập trước chốt, có thể sau khi Phát trả lượt P02. Nếu muốn đổi phạm vi để bao gồm implicit record methods/builder hoặc các class khác, sửa bằng bản/version mới trước khóa.
2. Được quyền baseline phù hợp thì dựng/kiểm baseline mới theo fixture P03. Bằng chứng P02 chỉ hỗ trợ feasibility cho các phần trùng, không tự là chứng cứ đủ cho empty-pets/list/POST/PUT P03.
3. Ghi input lock và quyền sandbox runtime/write riêng trên đúng hash; triển khai runner/checker, test offline rồi thu baseline/mutated/control/reset. Chưa cần reviewer nghiệm thu nhãn mới làm các bước kỹ thuật đó.
4. Sau evidence assessment, task riêng cho Phát lập draft từ source/contract/runtime; notes/exposure/checksum trước output development. Người xây hệ thống/AI không điền polarity thay Phát. P02 output development còn chờ draft version/hash thực từ Phát.
5. Tiếp tục mốc review gộp các ca PetClinic P01–P03; sửa theo phản hồi rồi Huy quyết định P04. Accepted, final test/split, scoring, API/model/billing và push vẫn chưa mở.

Giới hạn hiện tại: chưa compile app P03, chưa có runtime slots hoặc labels; chưa có independent inventory confirmation. P03 chỉ candidate, không phải phần PetClinic đã hoàn thành hoặc bằng chứng GraphRAG hơn baseline.
