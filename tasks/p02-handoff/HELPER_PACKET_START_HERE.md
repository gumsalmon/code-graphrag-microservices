# P02 — bằng chứng bổ sung bốn helper

Gói này bổ sung RQ-H01–H04 cho input P02 đã chốt: scenario 0.1.1, universe draft.v2, fixture v1. Không chứa nhãn mới, prediction hoặc score; không phải reviewer đã duyệt nhãn. Gói F03 ban đầu và draft đã gửi giữ nguyên.

## Bắt đầu

1. Kiểm ZIP SHA-256 với sidecar. Từ thư mục giải nén, Node 24+ có thể chạy kiểm toàn vẹn:

```powershell
node tooling/scripts/verify_p02_helper_packet.mjs --root .
```

Lệnh mặc định chỉ kiểm bytes/manifest/declared decision, không chạy Docker/model hoặc chấm tác động. Hash gói phát hiện lỗi chuyển file, không tự xác thực người ký hoặc quyết định con người.

2. Đọc `candidate/` và `decisions/` nếu cần đối chiếu input. Source baseline/mutated cần cho helper/DTO nằm ở `source/`; source provenance liên kết với manifest packet F03 gốc. Phạm vi vẫn bounded census P02, không mở rộng universe.
3. Đọc `runtime/plan.json`, raw ở `runtime/groups/{baseline,mutated}-r{1,2}/raw/` và `targeted/events.ndjson`. Ghi nhận định/exposure của người đọc trước khi mở kiểm derived. Mỗi group có stack/DB riêng, dùng cùng consumer binary, provider baseline hoặc mutated đã khóa. Đây không phải 40-slot matrix rerun hoặc các scenario độc lập mới.
4. Xem source công cụ trong `runtime/code/`, source helpers/DTO trong `source/`, các command/log/class hashes/cleanup để kiểm thực thi. Sau khi đọc raw, nếu muốn kiểm record máy đọc được:

```powershell
node tooling/scripts/verify_p02_helper_packet.mjs --root . --records
```

## Bốn ID và giới hạn

| ID | Bằng chứng mới cần xem |
|---|---|
| R06 joinIds | input `[7,8]`, return và consumer class identity riêng ở mỗi group |
| R07 setHostname | field trước/sau, URI/status WebClient thật tới Visits của group; setter được harness gọi, không phải chứng minh production callsite |
| R10 addVisitsToOwner | raw Customers/Visits, full merge inputs, Function thực sự apply và output owner/pets/visits |
| R11 emptyVisitsForPets | paired direct subscription và full return; **không callback trace production** |

Customers trả PetType có id/name; DTO consumer ở commit pin chỉ có name. `targeted/owner-projection.json` giữ full raw/projected tree và danh sách trường bỏ đúng `pets[].type.id` để đưa vào DTO thật. Strict decoder vẫn từ chối unknown field khác; không bỏ field khỏi raw để ép kết quả. Đừng gọi full provider JSON và consumer DTO là hai representation lossless giống nhau.

Lượt harness đầu bị lỗi decode được giữ dưới `history/decoder-failed-run/`, cùng failure/command/raw/cleanup và source công cụ cũ. Lượt mới đổi measurement version, không sửa source/JAR/scenario/nhãn. Không bỏ lịch sử này khi mô tả khả năng tái lập.

Compiled application JAR/image và classpath/cache sandbox không chuyển trong packet. Class helper đã compile có thể được loại có hash/omission ledger; không nói đã tái chạy Java vì checksum pass. Header pairs là parsed pairs, body giữ byte gốc. Absolute provenance paths máy nguồn giữ nguyên; JSON refs mới ở dưới runtime tương đối với gói.

## Phần bàn giao tiếp

Rà evidence sufficiency từng ID, giữ unresolved nếu chưa đủ; không lấy tool pass/equality làm quyết định nhãn tự động. Lưu notes thật, input/run/hash đã đọc, exposure AI và phần người trực tiếp quyết định. Mẫu phụ lục ở `templates/HUMAN_CHECK_SUPPLEMENT_TEMPLATE.md` chưa được điền; không chứng nhận strict source-first/blinding hồi tố.

Nếu cần thay draft.v3 thì tạo version mới cùng evidence/hash/reason, giữ bản cũ. Repair/confidence chưa đủ thì ghi đúng giới hạn. Reviewer khác annotator, reviewer/decision chưa có để null, pending_review; không tự accepted/test/scoring/push hoặc mở P03. Return đặt ngoài packet frozen, gồm phụ lục, nhận xét theo ID, nhãn/evidence version mới nếu có và checksum.
