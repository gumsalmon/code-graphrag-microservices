# P03 — extraction, Neo4j và retrieval sau checkpoint

Checkpoint P03 đã được kiểm theo D20. Receipt `P03_TECHNICAL_RECEIPT_2026-11-02.json` mở mốc C đã giao; không cần chờ P02 hoàn tất hoặc reviewer duyệt nhãn. Đây là quyền kiểm kỹ thuật, chưa là quyền inference/chấm điểm.

## Đầu vào

- P03 scenario 0.1.0, universe draft.v1, fixture v1, scope v1; source/config và sáu artifact hashes theo receipt/D19.
- `candidate/` giữ nguyên input đã khóa: baseline/mutated source, patch đổi response boundary `pets` thành `animals`, inventory/universe, fixture, protocol và provenance. Flags cũ là snapshot lịch sử; receipt/D20 là quyền hiện hành. Không sửa flags hoặc chồng mutation P01/P02.
- `implementation-reference/` là candidate từng bàn giao và kiểm, không khẳng định đó là HEAD mới nhất. Giữ branch/diff đang làm, đối chiếu hashes; không chép đè bản sửa P02. Ghi HEAD và trạng thái thật, không tự commit/push/merge.
- `synthetic_adapter.py` và `response_survey.py` chỉ hỗ trợ phạm vi tổng hợp/cú pháp đã khai. Không đổi marker synthetic để giả actual PetClinic hoặc gọi syntax survey là serialization/dataflow analysis.

Gói không chứa nhãn, nhận định người lập nhãn, raw kết quả benchmark hoặc gold path/hop. Không lấy các tài liệu này từ gói annotation hay context điều phối để đặt trước output.

## Kết quả cần đạt

1. **Extraction thực:** entry point nhận receipt/input/source hash, chạy parser trên hai snapshot P03 riêng, xuất native JSON/Cypher tự sinh và log. Seed là đúng handler `OwnerResource.findOwner(int)` tại source pin; ID phải giữ repository/service/class/signature/snapshot. Không hardcode cạnh hoặc method mong đợi.
2. **Inventory và giới hạn:** đối chiếu explicit declarations trong phạm vi sáu top-level class/record. Ghi node được biểu diễn và ledger thiếu/unsupported, kể cả accessor/Lombok/record/nested type. Không tự sinh method ngầm để khớp universe hoặc coi thiếu node là negative. Giữ schema/ID/hop kỹ thuật hiện hành; cần mở rộng schema thì gửi proposal riêng trước áp.
3. **Response contract:** báo phần thực sự bóc tách được từ handler Map/Optional, DTO/record và consumer usage bằng file/dòng/expression. Ghi `unsupported/unresolved` khi chưa có quan hệ serialization/dataflow đủ căn cứ. Không biến đổi tên field thành database migration, API/Service impact hoặc cạnh đã resolved bằng suy luận từ outcome.
4. **Neo4j thực:** sandbox/DB mới, chỉ dùng image/cache cục bộ, không ảnh hưởng DB/volume đang có. Kiểm direct/Cypher parity toàn node properties và edge metadata, import lặp không tăng trùng, tách snapshot, source/path/assumption bindings. Unit/mock pass phải phân biệt với kiểm DB thật.
5. **Retrieval offline:** reverse dependency 1/2/3 logical hops từ seed, giữ riêng seed và service-boundary counts; không tính containment thành hop. Xuất saved query/result/path cùng source spans/metadata và unresolved. Baseline source + proposed patch là đầu vào context tĩnh; mutated graph là diagnostic riêng, không tự gộp vào primary prediction context.

## Definition of Done và bàn giao từng phần

Có thể trả extraction + inventory/limitations trước, rồi DB/parity/retrieval sau. Mỗi phần phải có:

```text
Mốc / case / receipt version và SHA:
Branch / HEAD / trạng thái working tree / diff và code hashes:
Source/config/scenario/universe/fixture/patch hashes:
Lệnh, dependencies/images/cache, exit code và raw stdout/stderr:
Artifacts và SHA256SUMS; giữ cả lượt lỗi:
Test pass/fail/skip; unit/mock hay DB thật:
Coverage/unsupported/unresolved và điều chưa làm:
Isolation/cleanup và xác nhận input/evidence cũ giữ nguyên:
AI hỗ trợ và phần diff đã tự kiểm:
```

Không cần chạy lại HTTP baseline/mutated/POST/repetitions/reset để làm task parser/graph này. Nếu thiếu dependency/cache hoặc Docker, gửi phần offline dùng được và nêu đúng blocker; không tự tải mới.

Chưa gọi model/embedding inference, scoring, lập hoặc duyệt nhãn, khóa test, áp output contract Method/API/Service đang nháp, push hoặc merge. Output kỹ thuật giữ riêng, không gửi cho người lập nhãn để chỉnh nhãn cho khớp.
