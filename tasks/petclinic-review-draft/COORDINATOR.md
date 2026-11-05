# Khung review gộp PetClinic P01–P03

Ngày soạn: 01/11/2026. **Bản chuẩn bị nội bộ, chưa phải packet đã phát hành.** Không gửi cả thư mục này cho reviewer: tài liệu điều phối, readiness snapshot và bản thảo bài báo có thông tin không thuộc lượt source-first.

Mục tiêu là chuẩn bị một đợt review nhãn gồm hai lượt đọc, theo protocol v0.2 và lộ trình PetClinic hiện hành. Không thay schema nhãn, người lập nhãn, D20 hoặc quyết định nghiệm thu. Mọi tên reviewer, thời điểm review, xác nhận nhận việc và quyết định còn thiếu đều để trống/null.

## Ranh giới tài liệu

| Phần | Ai sử dụng | Khi nào cung cấp |
|---|---|---|
| Thư mục `round-1/` cùng source/patch/input/raw được chọn lọc | Reviewer | Khi bộ input cho review được kiểm và có quyết định phát hành thực tế |
| Thư mục `round-2/` cùng nhãn nháp/notes/exposure/version/hash được chọn lọc | Reviewer | Sau khi đã nhận và lưu checkpoint nhận định lượt 1 |
| Tài liệu này, readiness snapshot, evidence ledger và Methods draft | Nhóm điều phối/viết bài | Giữ riêng trong giai đoạn review nhãn |
| Parser JSON, Cypher, Neo4j dumps, retrieval, predictions, scores, demo và native inspector | Nhóm kỹ thuật | Giữ riêng trước khi khóa nhận định/nhãn tương ứng |

Hai lượt là trình tự đọc, không phải cam kết reviewer chỉ làm đúng hai lần hoặc không cần sửa. Chấp thuận nhãn từng ca, nhận xét protocol, test/split và scoring là các quyết định khác nhau.

## Điểm sẵn sàng hiện tại

| Ca | Source/input/runtime | Nhãn nháp | Kỹ thuật phương pháp | Việc còn thiếu |
|---|---|---|---|---|
| P01 | Có source/config pin và raw runtime đã kiểm; có gói source-first lịch sử | v3 tại benchmark snapshot 5f9204d, pending_review | Kiểm P01 đã có; cặp model contract mới còn thiếu Graph+Vector hợp lệ do provider 503 | Quyết định reviewer thật; khai blocker model/code release, không ghép output khác contract |
| P02 | Input 0.1.1/universe draft.v2/fixture v1; paired F03 và helper supplement đã kiểm | draft.v4/hash/checkpoint đã kiểm, pending_review; có ngoại lệ bản sao blank template được ghi | Extraction–Neo4j–retrieval đã kiểm có phạm vi | Return Hiển sửa Class.name parity và inventory; reviewer kiểm tính đủ bằng chứng và giới hạn helper |
| P03 | Input D19, paired runtime v2/controls/repetitions/reset đã kiểm | Chưa nhận checkpoint nhãn | Chưa actual method integration; survey Hiển mới syntax-only | Return Phát; kiểm checkpoint, receipt riêng và offline integration theo D20 |

R1 có thể được chuẩn bị từ source/raw trước khi có nhãn P03, nhưng mốc gửi review gộp hiện hành của Huy vẫn cần readiness từng ca và xác nhận blocker. Các lỗi implementation không tự chứng minh nhãn thiếu bằng chứng, và reviewer nhãn không phải chờ LLM hoặc đồng ý F1 để đưa nhận định. Hiện **chưa tuyên bố toàn PetClinic sẵn bàn giao**.

## Nội dung dự kiến đóng gói

```text
R1-source-first/
  START_HERE.md
  NOTES_TEMPLATE.md
  CHECKPOINT_TEMPLATE.md
  PACKAGE_METADATA.json             # metadata thật khi phát hành
  SHA256SUMS.txt                    # byte thật khi phát hành
  inputs/P01|P02|P03/               # input/source/patch/fixture/census/alias đã rà
  raw/P01|P02|P03/                  # observations + request/config/build identities

R2-label-comparison/
  START_HERE.md
  COMPARISON_TEMPLATE.md
  DECISION_TEMPLATE.md
  PACKAGE_METADATA.json
  SHA256SUMS.txt
  drafts/P01|P02|P03/               # đúng phiên bản nhãn và evidence/notes/exposure
```

Đây là layout đề nghị, không phải đường dẫn đã chứa dataset. Không điền SHA hoặc version nhãn P03 trước khi nhận return. Metadata mỗi ca cần source/config/patch/fixture/scenario/scope/universe/aliases, manifest raw và mọi omission; checksum không tự chứng thực người thật đã đọc.

## Kiểm nội dung trước R1

1. Chốt file allowlist theo **nội dung**, không chỉ tên thư mục hoặc phần mở rộng. Giữ nguồn gốc và byte của raw đã chọn. Không copy nguyên ZIP bàn giao thành viên hoặc toàn repository vào R1.
2. Source, patch, fixture và inventory/alias là đầu vào. Không đưa polarity, gold hops, draft rationale, annotator conclusions hoặc expected impact paths vào inventory gửi R1.
3. Rà raw collectors/logs: nếu có expected outcomes, assertions, summary hoặc ghi chú đã kết luận, không gọi toàn file đó là dữ liệu trung lập. Chọn HTTP request/response/log gốc phù hợp. Nếu cần trích, tạo artifact dẫn xuất riêng với source hash/spans/transformation và khai phần bỏ; giữ raw gốc nguyên byte. Không đổi nhãn request như `negative` rồi tuyên bố blind.
4. Tài liệu protocol đầy đủ có thể chứa ví dụ/kết luận pilot. R1 chỉ nhận định nghĩa trung lập cần thiết đã rà; không tự gửi cả benchmark PR hoặc source-first guide chưa sàng lọc nội dung.
5. Gói P01 cũ và full-repository R2 cũ là hồ sơ lịch sử. Kiểm nội dung trước khi tái dùng; không mặc định mọi file của gói cũ phù hợp R1/R2 mới. Không sửa gói đã seal.
6. Khai selection bias: scope, fixture, source shortlist và tên request do nhóm chọn; repo đã public, nên không hứa review blind hoàn toàn. Reviewer ghi exposure thật và phần đã kiểm.
7. Kiểm checksum/path/encoding/license/secret patterns và mở sau giải nén ở đường dẫn mới. Thiếu binary/cache thì nêu giới hạn replay; không bảo reviewer có thể tái hiện full stack chỉ từ raw ZIP.

R1 không cần chạy model, Neo4j hoặc toàn ứng dụng để bắt đầu đọc source/raw. Nếu reviewer chọn tái hiện thêm, thống nhất phạm vi/môi trường/lệnh riêng và ghi kết quả thật. Test kỹ thuật hoặc body equality không thay kết luận nhãn từng thực thể.

## Chuyển sang R2

Nhận notes, exposure, phạm vi từng ca và danh sách chưa xem/thiếu bằng chứng; lưu bản gốc và thời điểm nhận thật. Reviewer xác nhận phần AI hỗ trợ và phần tự kiểm. Tính hash notes ở file/checkpoint riêng, không tự nhét hash vào chính file đã băm. Sửa/bổ sung sau checkpoint phải có phiên bản mới và parent hash.

Không bắt reviewer đổi nhận định cho khớp nhãn hoặc ghi lùi giờ. Nếu đã thấy nhãn/output trước checkpoint, giữ exposure đó; source-first về sau không xóa việc đã tiếp xúc. Điều phối xác nhận giới hạn độc lập còn phù hợp hay cần người review khác, không tự ghi đã blind.

R2 nhận đúng nhãn/version/hash, evidence manifest, changelog, annotator notes/AI exposure và ngoại lệ provenance. **Vẫn giữ output phương pháp và score riêng cho đến khi khóa nhãn tương ứng.** Bản thảo Methods, native inspector và báo cáo kỹ thuật có thể làm lộ kết luận nên không ghép vào R2-label-comparison mặc định.

## Quyết định và bảo toàn hồ sơ

Reviewer đối chiếu đủ ID theo universe, giữ seeds riêng, kiểm behavioral impact/repair/hop/alias/scope và ghi bất đồng. Chọn `approve`, `request_changes` hoặc `unable_to_review` theo từng ca; có thể cần sửa một ca mà không phủ nhận hai ca khác.

Theo protocol, chỉ `approve` có scope rõ, checksum artifact và checksum review hợp lệ mới có thể được ghi nhận accepted. Một lời đồng ý tổng quan hoặc AI điền form không đủ. Nhãn/hash thay đổi cần version mới và review tương ứng; không sửa labels/raw cũ hoặc chuyển chữ ký sang hash khác. Người chép quyết định vào JSON giữ nguyên nội dung và để reviewer kiểm xác nhận bản chép. Chưa có quyết định thật thì fields review giữ null và trạng thái pending_review.

Sau review, phân việc sửa code/evidence/label đúng vai trò; không dùng output hệ thống làm oracle để sửa nhãn. Đánh giá chính thức, test lock, model/budget, công bố code và P04 cần quyết định đúng phạm vi. Khung này không cấp các quyền đó.

## Kết quả chuẩn bị và việc kế tiếp

Đã có hướng dẫn hai lượt, templates trống và [readiness snapshot](readiness.snapshot.json). Chưa có archive/allowlist file-by-file, quyết định gửi, reviewer/lịch mới, notes hoặc decision thật. Khi return đến: kiểm riêng, cập nhật readiness và chỉ sau đó chốt nội dung packet. Không giao thêm việc cho Hiển/Phát trong lượt soạn khung này.
