# Bổ sung helper P02 — đã chuẩn bị offline, chờ Docker

Ngày 25/10/2026, sau audit return của Phát, Huy yêu cầu tiếp tục công việc tiếp theo. Lượt này triển khai bộ đo theo RQ-H01–H04 và mẫu phụ lục người thật. Quyền thu runtime helper nằm trong D15 và yêu cầu tiếp tục; không đổi scenario/universe/fixture, tạo nhãn hoặc mở output hệ thống.

## Kết quả đã có

- Thêm `P02PairedHelperProbe.java`, runner và checker riêng. Không sửa `P02HelperProbe.java`, runner F03/baseline, source/JAR ứng dụng, nhãn, raw hoặc gói frozen.
- Node **7/7**, Python **2/2** pass, không skip. Tests tổng hợp kiểm group/snapshot binding, resource ownership, source/raw/hash, URI/HTTP lỗi, Function chưa apply, data mất/sai và không tự nhận production trace/accepted.
- **Java compile thành công** trên host JDK 17.0.20.101 từ dependency trong đúng gateway JAR SHA `239f64873fbce6ade5a5ab355a1838a1122d75d2dbe4ae24987437f86b7c5944`, với `-proc:none --release 17`. Không Maven, tải dependency hoặc chạy application classes trong phép kiểm này. Source probe SHA `779143cca9a289e7c4fa44dc99180e077565bf91392f0620b45be74879aa929c`; Java runtime mới **chưa** được kiểm vì Docker chưa sẵn sàng.
- Plan được dựng từ exact input lock P02 0.1.1/draft.v2/fixture v1, kiểm baseline build, root manifest F03 cũ và JAR Visits mutated SHA `91fe74407a4ea8075df1b7b744c773138c88d4e4a3d87ed0dd88115398377609`. Consumer/config unchanged theo bindings; không chồng P03.
- Plan/checker offline đạt; bảo toàn **2.109 file lịch sử và năm file extra** trong snapshot kiểm. Năm extra gồm ZIP/labels/manifest Phát trả, manifest P03 và manifest F03 cũ; không claim đã khóa mọi file ngoài danh sách này.
- Thêm mẫu phụ lục chưa điền và tin nhắn để chuyển cho Phát thủ công. Không ký thay hoặc đánh dấu người thật đã đọc source/raw.

## Vị trí artifact thực tế

| Artifact | Thư mục/hash |
|---|---|
| Plan | `handoff-out/p02-helper-supplement/20261025t101307537z-66b33086` |
| Plan SHA256SUMS.txt | `7ffad422a7a16b833dccbfeb914a5b8d37beeb9b25379385d3a0c3423f0ea862` |
| Root plan files | 20 file khóa + SHA256SUMS.txt; runtime_executed=false, groups_completed=0 |
| Host javac | `handoff-out/p02-helper-offline/20261025T101255Z-375f359d/RESULT.json` cùng command/stdout/stderr và hash member dependency |
| Log kiểm cuối | `handoff-out/p02-helper-preparation-audit/20261025T102056Z/AUDIT.json` và stdout/stderr từng lệnh |
| Hướng dẫn | `pipeline/p02/HELPER_SUPPLEMENT.md` |
| Mẫu cho Phát | `tasks/p02-handoff/HUMAN_CHECK_SUPPLEMENT_TEMPLATE.md` |
| Tin nhắn soạn sẵn | `tasks/p02-handoff/SEND_PHAT_SUPPLEMENT_2026-10-25.md` |

Cache giải nén JAR trong thư mục javac là dependency cục bộ của phép compile, không phải packet raw để gửi reviewer. Không gửi cả folder này hoặc claim JAR/cache đã nằm trong gói annotation.

## Phép đo đã chuẩn bị nhưng chưa chạy

Bốn group baseline/mutated × hai repetition, mỗi group stack năm service/DB/network mới, chỉ network internal, không publish port hoặc mount DB người dùng. Tái dùng binary đã khóa, không rebuild app; chỉ Visits binary thay theo snapshot. Dự kiến 12 GET capture owner/provider/gateway và bốn GET từ targeted WebClient, ngoài readiness/setup/config/registry. **Không chạy lại 40 slots, POST hoặc fault intervention cũ.**

| ID | Dữ liệu sẽ lưu |
|---|---|
| R06 joinIds | input, kiểu/return trực tiếp theo từng group và consumer class identity |
| R07 setHostname | field trước/sau, hostname nội bộ cố định, actual WebClient URI/status và decoded response từ Visits thật |
| R10 addVisitsToOwner | raw Customers/Visits của group, full decoded input, thực sự apply Function và full output owner/pets/visits |
| R11 emptyVisitsForPets | paired direct subscription và full return; production_callback_traced=false |

Code gọi helper bằng reflection trong harness; không sửa application classes, không mock circuit breaker. ObjectMapper và client filter phục vụ đo được khai là cấu hình targeted harness, không giả là Spring production context. Method-level production callback tracing không được claim; nếu annotator/reviewer cần mức đó thì tiếp tục giữ unresolved hoặc yêu cầu phép đo riêng.

Equality, checker pass hoặc observation mới không tự quyết định behavioral polarity. Phát cần xem evidence và giữ/đổi bằng label version mới khi phù hợp; draft.v3 vẫn nguyên byte/pending_review.

## Blocker thực tế

Docker Engine không chạy. Lệnh read-only `docker ... info` trả exit 1: không tìm thấy pipe `docker_engine`; không có container/network ứng dụng mới được tạo. Đã yêu cầu Huy bật Docker qua câu hỏi trong chat. Không tải image, tự bật billing, gọi model hoặc dùng dịch vụ ngoài để thay sandbox.

Đây là blocker hạ tầng cho **runtime mới**, không phải phải chờ reviewer nghiệm thu mới làm kỹ thuật. Có thể gửi mẫu phụ lục cho Phát song song. Trạng thái `offline_plan_ready` không được báo là bốn helper đã đủ bằng chứng hoặc P02 hoàn tất.

## Cách tiếp tục khi engine đã sẵn sàng

Từ gốc workspace:

```powershell
node scripts/run_p02_helper_supplement.mjs run --candidate handoff-out/p02-input-revision/20261018T065307839Z-719da955 --baseline-build handoff-out/p02-build/20261015T101851660Z-95cea45d --prior-f03 handoff-out/p02-f03/20261024t103954400z-989f2a57
node scripts/check_p02_helper_supplement.mjs --run NEW_RUNTIME_DIRECTORY
```

Runner ghi folder mới, command/stdout/stderr/exit, source công cụ, raw bodies, identity, cleanup và manifest. Local image thiếu thì dừng, không tự pull. Chỉ dọn resource của run đúng label/prefix; cleanup lỗi thì dừng group kế. Mọi run lỗi giữ nguyên. Sau raw audit mới đóng packet bổ sung cho Phát, source/raw trước derived summary, ghi rõ targeted scope và binary/cache omissions.

Phụ lục người thật/source-first/exposure vẫn phải do Phát thực hiện. Không ghi lùi giờ hoặc sửa notes ban đầu để giả blinded. P03 vẫn candidate cần chọn/chốt riêng; P04 vẫn sau review PetClinic. Không stage/commit/push/merge hoặc thay gate accepted/test/scoring/model.
