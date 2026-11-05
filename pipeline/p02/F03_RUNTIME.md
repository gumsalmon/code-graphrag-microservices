# P02 — thu bằng chứng F03 sau chốt input

Quyết định của Huy ngày 24/10/2026 nằm tại `benchmark/p02/decisions/INPUT_LOCK_2026-10-24.json`, dựa trên phiếu Phát commit `187c4d82fb75c07d6593522dd68bc1dfdd86ceca`. Gói 31 file vẫn frozen/candidate trong chính bytes lịch sử; adapter đọc thêm quyết định riêng, không sửa flags để giả người review đã ký ở thời điểm tạo gói.

## Phạm vi / đầu ra / DoD

Được build provider mutated và chạy baseline/mutated trên bốn stack mới, mỗi stack một repetition và DB in-memory riêng; 10 fixture slots/nhóm, chín GET rồi POST cuối. Thu thêm request kiểm seed/config/registry, POST readback và fault probe; **không cộng chúng vào ma trận 40 slot**. Source/patch/fixture/inventory/universe đúng hash đã chốt. Không đổi consumer, không lấy graph/model output làm oracle, không lập/duyệt nhãn, khóa test hoặc scoring.

Kết quả ở `handoff-out/p02-f03/<run-id>/`: decision/input/code snapshots, identity baseline, build mutated, targeted helper probe, bốn group, command/stdout/stderr/exit, raw HTTP/request bodies, service logs, ownership/cleanup, protected-input snapshots và manifest. Một run có failure là bằng chứng chưa hoàn tất, không bị overwrite hoặc đổi nhãn thành success. Maven application tests vẫn skip; build pass không phải Java application test suite pass.

Đạt DoD kỹ thuật khi checker chỉ đọc xác minh được 40 slots, bốn POST và readback thực, seed SQL được reset trước từng nhóm, 20 container service khác nhau, JAR/config identities và consumer unchanged, cleanup toàn bộ tài nguyên thuộc run, helper/fault evidence cùng giới hạn. Chất lượng/độ đầy đủ để gán nhãn vẫn cần người thật đánh giá riêng; không đóng F03 bằng một cờ tự khai.

## Cách kiểm và chạy

Node 24+, Git, tar, Docker Linux và image/cache có sẵn. Không tự pull hoặc tải dependency. Docker client dùng config rỗng riêng tại `pipeline/p02/docker-client/`, không nạp credential cá nhân. Container không publish port, không mount socket hoặc DB của người dùng, filesystem read-only trừ workspace riêng, build network none/cache read-only.

```powershell
node scripts/run_p02_f03.mjs check-input --candidate handoff-out/p02-input-revision/20261018T065307839Z-719da955

# Chỉ chạy sau authorization đúng hash và khi môi trường đã được chuẩn bị:
node scripts/run_p02_f03.mjs run --candidate PATH_TO_FROZEN_V2_BUNDLE --baseline-build PATH_TO_VERIFIED_P02_BASELINE_BUILD --maven-home PATH_TO_MAVEN_DISTRIBUTION --maven-repository PATH_TO_MAVEN_REPOSITORY

# Sau khi runner xong, chỉ đọc, không khởi động stack:
node scripts/check_p02_f03.mjs --run PATH_TO_NEW_F03_RUN

node --test pipeline/p02/f03.test.mjs
# Python 3.11+ thực hoặc runtime được chuẩn bị riêng:
python -B -m unittest discover -s pipeline/p02 -p f03_probe_test.py
```

Run mới có namespace mới, không retry HTTP/POST tự động. Readiness có polling hữu hạn và lưu từng attempt, không phải lặp lại fixture slot. Reset bằng hủy stack thuộc nhóm rồi tạo service/DB mới; trước mỗi nhóm đối chiếu đúng bốn SQL visits qua overload API không chịu mutation, không dùng response của seed làm oracle readiness.

## Helper và fallback: phạm vi chứng minh

- `P02HelperProbe.java` chạy trực tiếp class byte từ JAR gateway baseline đã kiểm, classpath lấy từ chính JAR; không sửa class triển khai. Gọi `joinIds`, đọc hostname mặc định, gọi setter và subscribe WebClient với HTTP fixture server local để ghi URI thật. Đây là **targeted harness có fixture HTTP**, không phải PetClinic E2E hoặc chứng minh setter được production flow gọi.
- Gọi `addVisitsToOwner` rồi thực sự áp dụng Function trả về với visit khác pet, kiểm gán đúng owner/pet; subscribe trực tiếp `emptyVisitsForPets`. Không giả circuit breaker trong harness hoặc tuyên bố harness chứng minh wiring thật.
- Consumer E2E thật nằm trong ma trận qua gateway và năm service. Sau POST/readback, pause đúng visits-container của nhóm rồi gọi gateway owner 6, giữ body/status/log và unpause. Đây là fault injection riêng để quan sát fallback/timeout, không phải slot benchmark hoặc nhãn tác động P02. Kết luận method-specific cần đối chiếu source và giới hạn, không tự coi HTTP 200 là trace đầy đủ mọi method.
- Cả baseline/mutated giữ nguyên gateway JAR. Không gọi parser/Neo4j/scorer/model trong luồng F03. Unknown/missing vẫn được ghi nếu probe thất bại; không suy negative.

Giới hạn: các checksum do gói tự cung cấp kiểm toàn vẹn, không chứng thực độc lập tác giả; sandbox Docker không là bảo đảm hermetic tuyệt đối; dependency chưa full transitive lock; chỉ Windows x64/Docker Linux amd64 đã dùng. Chưa có permission thay model/ngân sách, nhãn hay final test. Các tài liệu preflight/dry-run cũ giữ trạng thái tại lúc tạo, không bị sửa thành kết quả runtime mới.
