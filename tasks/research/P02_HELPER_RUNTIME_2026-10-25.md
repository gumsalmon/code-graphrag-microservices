# P02 — đã thu và kiểm bằng chứng helper bổ sung

Ngày 25/10/2026, sau khi Huy cho biết sẽ bật Docker, đã kiểm thực tế engine Linux 29.8.0 sẵn sàng rồi tiếp tục scope helper/setter/fallback của D15 và yêu cầu tiếp tục sau return Phát. Không suy engine đã sẵn sàng chỉ từ lời nhắn. Không pull image, gọi model, rebuild application hoặc thay nhãn.

## Kết quả

Run thành công: `handoff-out/p02-helper-supplement/20261025t121836544z-0997bbbe/`.

Root manifest SHA-256: `fed3742ce6d836e225a8711ebc71118594c2dfe8cd5fad8989e6feba3210772e`.

- Bốn group baseline/mutated × hai repetition, **20 application container instances riêng**, mỗi group network internal và HSQLDB mới, không publish port/DB volume. Setup/raw xác nhận bốn seed visits ở cả bốn group.
- Tái dùng app binaries đã khóa; gateway JAR `239f64873fbce6ade5a5ab355a1838a1122d75d2dbe4ae24987437f86b7c5944`; chỉ Visits baseline/mutated đổi đúng binary đã đăng ký, mutated JAR `91fe74407a4ea8075df1b7b744c773138c88d4e4a3d87ed0dd88115398377609`. Source/config/scenario/universe/fixture P02 không đổi.
- 12 GET capture Customers/Visits/gateway và bốn GET từ targeted WebClient, ngoài readiness/setup/config/registry. Không POST, không rerun 40-slot matrix; những record/lần lặp này không là scenario nghiên cứu độc lập mới.
- Checker run đạt. Audit riêng kiểm **28 loaded-class hashes = 7 lớp × 4 group** khớp member thực trong gateway JAR; effective config và Java overrides giống nhau, registry thật có consumer/provider UP. Sáu cặp primary body baseline/mutated bằng nhau khi chỉ bỏ thứ tự object key; không bỏ field/sort array để ép equality. Đây là quan sát, không phải nhãn tự động.
- 2.109 file legacy và năm extra được snapshot bảo toàn. Cleanup compile/group hoàn tất; kiểm Docker read-only cuối cho namespace helper xác nhận không còn container/network của các lượt này.
- **8 Node/2 Python tests cuối pass, không skip**, cùng regression cho phép chuyển DTO được khai. Java harness measurement v2 compile và chạy trong container JDK đã khóa; không chạy lại Java application test suite hoặc Maven.

## Quan sát theo ID

| ID | Quan sát thực tế ở bốn group | Phạm vi |
|---|---|---|
| R06 joinIds | input `[7,8]`, String return `7,8` | Direct helper call, cùng unchanged consumer binary |
| R07 setHostname | field `http://visits-service/` → `http://visits-service:8082/`; URI WebClient thực có `petId=7%2C8`, HTTP 200, đủ bốn Visits | Setter do harness gọi để bind provider nội bộ, không claim production setter callsite được exercise |
| R10 addVisitsToOwner | Đọc raw Customers/Visits của group, ghi full decoded inputs, apply Function thật; output pet 7 nhận visits 1/4, pet 8 nhận 2/3 | Targeted Function application, không instrument source ứng dụng |
| R11 emptyVisitsForPets | Subscribe trực tiếp, full return `{"items":[]}` | **production_callback_traced=false**; fault/wiring cũ là evidence riêng |

Source Java, inputs/raw/headers/status/latency, helper events, class identity, config/registry, commands/stdout/stderr/exit và cleanup đều được giữ. Header pairs không phải wire transcript. Người lập nhãn/reviewer vẫn cần đánh giá mức đủ bằng chứng; không tự biến bốn unresolved thành negative từ bảng này.

## Lượt lỗi và sửa bộ đo

Lượt `20261025t121439628z-5d146b16` dừng ở baseline-r1: strict ObjectMapper của harness không nhận `pets[].type.id`, trong khi DTO consumer `PetType` tại source pin là `record PetType(String name)`. Đây là lỗi cách dựng input của công cụ đo mới, không phải bằng chứng mutation làm ứng dụng lỗi. Compile/application startup/GET của group đã có raw; helper mới chỉ ghi identity trước exception. Sandbox được dọn, protected data không đổi; giữ toàn run lỗi.

Measurement version 2 vẫn strict duplicate/unknown-field checking, chỉ thực hiện **phép chiếu DTO được khai rõ**: bỏ `pets[].type.id` trong bản dùng để decode vào consumer record. `owner-projection.json` giữ cả full raw tree, projected tree và mỗi JSON pointer/value bỏ đi; raw `owner.body` không sửa. Phần `visits=[]` ở decoded PetDetails là compact constructor của DTO thật; trước/sau merge đều có record đầy đủ. Không dùng bỏ field âm thầm hoặc đổi getter/entity/consumer để ép phép thử pass. Không gọi provider JSON và consumer DTO là hai representation lossless giống nhau.

Source probe measurement v2 SHA-256: `8349c527c2da0ed97c44efeae891e90b64a01c7a259af10e893ae0fefadcdcd3`. Run lỗi, source/version cũ và log exception được đưa vào phần history của packet bổ sung. Không overwrite raw hoặc dùng lại run folder để che lỗi.

## Audit và gói gửi Phát

Audit riêng:

`handoff-out/p02-helper-audit/20261025t121836544z-0997bbbe-90a3887f/`

Có `AUDIT.json`, `FINAL_CHECKS.json`, các command/stdout/stderr/exit của tests, verifier runtime và verifier packet sau giải nén; final-owned-containers/networks logs trống. Node/Python/JAR audit là kiểm kỹ thuật, không quyết định annotation của người thật.

Gói đã lọc:

`handoff-out/p02-helper-packet/20261025T122642Z-a78a8e8c/P02_HELPER_SUPPLEMENT_2026-10-25.zip`

- Kích thước **1.227.172 byte**, khoảng 1,23 MB.
- ZIP SHA-256 **`aade807e42937188a629c144bd37817f96231df3ca2c43aa61bbdd77a0f3b8e2`**.
- Packet root manifest **`2907f8b5926660251a81a7ada1cfdc19974631a6493f08c48f1c190ff4813a77`**.
- 2.122 file tổng, gồm 2.121 file manifest khóa và root manifest. Mười manifest lịch sử kiểm được; hai omission là compiled measurement class v1/v2 có hash riêng. Không thiếu raw ẩn dưới lý do omission.
- ZIP được giải nén sang folder mới và chạy portable verifier/record checks đạt cho cả bốn group. Scanner toàn selected bytes và recursive ZIP không có finding theo mẫu; không chứng minh tuyệt đối mọi dữ liệu là công khai.
- Gồm raw/source/patch/fixture/universe/decision/protocol, code measurement, lịch sử lỗi, mẫu phụ lục người thật chưa điền và hướng dẫn. Không kèm nhãn, prediction, score, API credentials, JAR/image hoặc classpath/cache. Original files giữ nguyên; chưa tự gửi Phát hoặc push GitHub.

Trong packet, bắt đầu `START_HERE.md`; kiểm bytes bằng `node tooling/scripts/verify_p02_helper_packet.mjs --root .`. Đọc source/raw và ghi notes trước, rồi mới dùng optional `--records` để kiểm derived records. Muốn tái chạy runtime cần môi trường/binaries riêng đã pin; việc đọc/kiểm packet không cần Docker hoặc API key.

## Điểm tiếp tục

Huy gửi ZIP + sidecar và tin nhắn tại `tasks/p02-handoff/SEND_PHAT_HELPER_PACKET_2026-10-25.md`. Phát rà bốn helper và phần mình trực tiếp xem/kiểm theo mẫu trong packet; ghi exposure thật, không dựng strict source-first/blinding hồi tố. Giữ draft.v3 nguyên byte; nếu kết luận đổi, tạo version nhãn/evidence/hash mới. Repair/confidence phải là nhận định hoặc giới hạn thật.

Lượt này hoàn tất **thu/kiểm/đóng gói bằng chứng bổ sung**, không hoàn tất annotation/reviewer acceptance. Nhãn draft.v3 vẫn 8 negative/4 unresolved và `pending_review`; SHA `7d85eb6bb7bee9b7b138766ebd1a8deefd945a2a4bee8dc922f61f0a673e42cb`. Chưa tự mở output P02, accepted/final test/scoring hoặc model/billing. P03 vẫn candidate cần Huy chọn và kiểm scope/input độc lập; P04 sau checkpoint review PetClinic.
