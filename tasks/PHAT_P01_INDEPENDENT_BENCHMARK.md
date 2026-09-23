# Task packet cho Phát — Protocol và review độc lập P01

Ngày giao: 23/09/2026

Chủ trì: Phát

Người phê duyệt phạm vi: Huy

Trạng thái ban đầu: branch đã tạo, chưa có artifact task

Branch làm việc: `Pham_Nguyen_Phat`

Commit gốc đã kiểm tra: `7008cba6fa1d3f6ee5235774be7e1f5679b06b3d`

## 1. Kết quả cần đạt

Khi task kết thúc, nhóm phải có:

1. Một benchmark protocol có thể tái sử dụng cho P02–P04.
2. Một gói P01 có provenance, scenario manifest, evidence manifest và label file máy đọc được.
3. Một quyết định audit trung thực: `accepted`, `pending_review` hoặc `rejected/reproduce_required`.
4. Checksum của label version được khóa trước khi mở output parser/Neo4j/RAG/LLM.
5. Review log có hai người khác nhau ở vai trò người lập nhãn và người rà soát.

Mục tiêu không phải là xác nhận tuyến ứng viên hay số liệu đã được mô tả trước. Nếu bằng chứng không đủ, kết quả đúng là giữ `pending_review` và nêu chính xác cần tái chạy gì.

## 2. Phản hồi bắt buộc trước khi làm

Phát hoặc AI hỗ trợ phải gửi Huy một bản xác nhận gồm đúng năm mục:

1. Commit/snapshot và patch sẽ dùng.
2. Danh sách input đã nhận cùng checksum tự tính lại.
3. Danh sách input bị cấm trước khi khóa nhãn.
4. Danh sách artifact dự kiến tạo.
5. Blocker, dữ liệu thiếu và ai cần cung cấp.

Không sửa artifact dùng chung trước khi Huy xác nhận các blocker ảnh hưởng schema hoặc protocol.

## 3. Input được phép và input phải cách ly

Đọc toàn bộ `PROJECT_CONTEXT.md` và `tasks/P01_INPUT_AUDIT.md` trước.

Được phép trước khi khóa nhãn:

- Source PetClinic tại commit `3858f9c630cf989bb6809a86edf47c2be78dc9f1`.
- Config revision quan sát `323993ce2519c6d02df63e08bf4458d123d3b611`.
- `mutation.patch`, raw/build/runtime logs, test scripts và compose config liệt kê là được gửi trong checklist của Huy.
- Tài liệu hợp đồng Spring/HTTP chính thức và lệnh tái hiện do Phát tự xây dựng.

Phải cách ly cho đến khi label file đã version hóa và checksum:

- `p01_label.md`, `report.md`.
- JSON/Cypher/parser output, Neo4j result, GraphRAG/Vector RAG/LLM output và benchmark score.

`PROJECT_CONTEXT.md` đã chứa giả thuyết và tuyến ứng viên. Ghi rõ đây là nguy cơ expectancy bias; không tuyên bố quy trình P01 là blind hoàn toàn.

## 4. Công việc bắt buộc

### A. Intake và provenance

- Tự tính lại SHA-256 của mọi input đã nhận; so với audit và ghi mismatch.
- Xác nhận source đúng commit, tracked tree sạch trước mutation và patch áp dụng được.
- Phân loại từng file: raw evidence, derived summary, draft interpretation, invalid/noisy hoặc missing.
- Không xóa raw failure logs.

### B. Benchmark protocol

Protocol tối thiểu phải định nghĩa:

- scenario ID/version, repository, baseline commit, config revision, patch identity và scenario kind;
- seed và quy tắc loại seed khỏi impact set;
- behavioral impact khác `requires_code_change` như thế nào;
- nhãn Method/API/Service, hop logic và số lần qua ranh giới service;
- positive/negative/unresolved/pending-review criteria;
- evidence hierarchy: source, contract, runtime và giới hạn từng loại;
- quy trình hai người, xử lý bất đồng và thay đổi nhãn;
- development/test split, near-duplicate detection và label leakage control;
- version/checksum/freeze/unfreeze procedure.

### C. Review source và contract độc lập

- Xác định symbol bằng service + class FQN + method + parameter types; không chỉ dùng tên method.
- Dẫn file/dòng theo đúng snapshot.
- Kiểm tra HTTP method, path, query parameter, fallback và hành vi quan sát được.
- Không lấy độ sâu hoặc quan hệ từ output parser/Neo4j.

### D. Rerun runtime sạch

- Bắt đầu từ source baseline sạch và ghi `git status`, commit, Docker/Java/Maven versions.
- Dùng image/build identity riêng cho baseline và mutated; không dựa vào cache không xác định.
- Ghi fixture data, owner/pet/visit IDs và điều kiện trước khi gọi.
- Kiểm tra baseline direct + gateway; mutated thiếu param; mutated có param hợp lệ; mutated qua gateway.
- Ghi timestamp, command, exit code, HTTP status, response body và service logs liên quan.
- Nếu không tái hiện được, giữ raw logs và ghi chính xác blocker; không sửa báo cáo cho khớp kỳ vọng.

### E. Artifact và review

Cấu trúc đề xuất:

```text
benchmark/
  protocol/benchmark_protocol_v0.1.md
  p01/
    scenario.json
    labels.v1.json
    evidence_manifest.json
    review_log.md
    checksums.sha256
    raw/
    derived/
```

Schema cụ thể phải được Huy đồng ý trước khi task khác phụ thuộc. Raw và derived phải tách thư mục.

## 5. Definition of Done

- Tất cả artifact có repository, commit, config, patch/snapshot, protocol version, tác giả và timestamp.
- Từng nhãn có evidence reference kiểm tra được; thiếu evidence mang trạng thái unresolved/pending.
- Seed tách khỏi impact set; behavioral impact tách khỏi requires-code-change.
- Hop không lấy từ graph được đánh giá.
- Rerun ghi đủ bốn nhóm quan sát hoặc ghi blocker tái hiện có raw evidence.
- Negative behavioral case chỉ được thêm nếu có tiêu chí và evidence repository thật.
- Label file được checksum/freeze trước khi xem output hệ thống.
- Người lập nhãn và reviewer là hai người khác nhau; Phát không tự duyệt nhãn mình lập.
- Có limitations và threats to validity, gồm expectancy bias do tài liệu hiện có đã nêu tuyến ứng viên.
- P01 vẫn được gọi là pilot; không có kết luận GraphRAG tốt hơn baseline.

## 6. Điều kiện phải dừng và hỏi Huy

- Commit/patch/hash không khớp.
- Cần đổi định nghĩa impact/hop hoặc schema dùng chung.
- Không biết ai là người lập draft label hoặc chưa có reviewer thứ hai.
- Muốn xem output hệ thống trước khi label freeze.
- Runtime cần thay đổi fixture/mutation làm khác scenario P01.

## 7. Mẫu bàn giao

```text
Task: P01 independent benchmark review
Branch / commit triển khai:
Protocol version:
Baseline commit / config revision / patch hash:
Input hashes đã xác nhận:
Artifact paths:
Lệnh rerun và môi trường:
Quan sát tái hiện được:
Quan sát không tái hiện được:
Label status: accepted | pending_review | rejected/reproduce_required
Label checksum và thời điểm freeze:
Annotator:
Reviewer:
Bất đồng / unresolved:
Limitations / threats to validity:
Bước tiếp theo đề xuất:
```
