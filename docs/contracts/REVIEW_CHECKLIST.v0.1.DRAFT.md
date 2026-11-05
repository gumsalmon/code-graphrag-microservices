# Các điểm cần thống nhất trước áp dụng

ID: `microservice-impact-output/0.1.0-draft.1`. Trạng thái: **nháp, chưa có phê duyệt áp dụng**.

Mục đích là rà hợp đồng chung, không duyệt nhãn hoặc mở rộng task đang làm. Có thể rà sau khi phản hồi gói P02 hiện tại. Chỉ cần bản đặc tả, design manifest và ví dụ toy; không cần xem output P01/P02, graph/context/model response hoặc labels để góp ý format. Không thay nguyên tắc source-first của người lập nhãn/reviewer.

## Hiển — khả thi kỹ thuật

- D01: Có thể xuất ba level rõ ràng, khai báo unsupported level và giữ assessment sparse không? Không yêu cầu triển khai ngay.
- D02: Parser/endpoint metadata đủ tạo API ID theo method/path đã ghép prefix, nhiều mapping/một handler, wildcard và overload chưa? Cần thêm mapping/alias nào, dựa source chứ không dự đoán impact?
- D03: Có đủ Method ID và owning service để kiểm witness cho API/Service, hop logic 1–3, boundary và snapshot không? Những kiểu expression nào phải unresolved?
- D04: Repair strategy có thể được ghi riêng với behavior không? Không suy required từ reachable/likely.
- D05–D06: Direct-only và unknown/citation/omission rules có tương thích đầu ra kỹ thuật không? Chỉ ra limitation chứ không hardcode entity để vượt schema.
- D07–D08: Những thay đổi adapter/schema/request nào sẽ cần làm, test LF/CRLF/ID/path nào còn thiếu? Không sửa parser/Neo4j hiện hành để áp bản nháp trong lượt góp ý.

## Phát — nghĩa đánh giá và ranh giới scorer

- D01–D02: Canonical `(level,id)`, universe, seed, alias và raw ID ledger có giữ đúng protocol không? Cần review evidence cho alias nào trước official score?
- D03: API/Service witness không bị hiểu nhầm thành min hop hoặc gold path? Khi nào behavior phải unresolved dù có dependency?
- D04: Repair tách biệt, conditional strategy có đủ rõ để không nhầm với nhãn tác động?
- D05: Đồng ý đề nghị direct-only hay cần projection track riêng? Nếu projection, cần bổ sung bằng chứng/độ phủ và quy tắc trước khi áp dụng, không chỉ ANY/ALL theo các Method đã trả về.
- D06: Unknown có thể thiếu citation trong đúng pure-abstention; omitted/unsupported không bị thành negative; recall vẫn dùng toàn gold-positive universe. Coverage cần báo những trường nào?
- D07: Đánh giá đề nghị mapping likely→true, unlikely→false, unknown→null + ledger. Scorer Boolean hiện có cần adapter gì? Quy tắc FP invalid/OOS, partial, unassignable level, conflicting duplicates và failed-run denominator nào còn phải chốt?
- D08: Cần những kiểm tổng hợp/provenance nào trước triển khai? Đồng ý định dạng không được ghi thành reviewer approval, accepted label hoặc test/scoring approval.

## Mẫu phản hồi từng quyết định

```text
Contract ID / bản file hoặc SHA đã đọc:
Người góp ý / thời điểm thật / AI hỗ trợ:
Decision ID (D01–D08):
Đề nghị: đồng ý phương án nháp / đề nghị sửa / chưa đủ thông tin
Căn cứ: field, đoạn đặc tả hoặc giới hạn code/protocol liên quan
Nội dung sửa cụ thể và ảnh hưởng tương thích:
Điều kiện/test cần bổ sung trước áp dụng:
Phạm vi chưa đồng ý hoặc chưa kiểm:
```

Không điền mẫu thay thành viên hoặc tự tạo timestamp/chữ ký. Không cần gửi nhãn/output hệ thống làm “đáp án” cho câu hỏi thiết kế.

## Chốt về sau

| Việc | Hiện trạng |
|---|---|
| Hiển góp ý kỹ thuật | Chưa có phản hồi được ghi nhận cho bản nháp này |
| Phát góp ý protocol/scorer | Chưa có phản hồi được ghi nhận cho bản nháp này |
| Điều phối giải quyết bất đồng và chốt áp dụng | Chưa thực hiện |
| Schema/adapter/validator production | Chưa triển khai theo bản nháp |
| Reviewer duyệt nhãn / test lock / scoring approval | Không thuộc quyết định chấp nhận format |

Chỉ sau phản hồi thật và quyết định điều phối mới tạo version áp dụng, change log và test migration. Không sửa protocol/nhãn/raw hoặc hồi tố output P01 để khớp bản nháp. Nếu chưa thống nhất thì giữ open, không tự coi im lặng là đồng ý.
