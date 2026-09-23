# Task packet cho Hiển — Sửa verifier và nghiệm thu E2E Neo4j P01

Ngày giao: 23/09/2026

Chủ trì: Hiển

Người phê duyệt phạm vi: Huy

Branch đầu vào: `origin/hien/graphrag-parser-benchmark`

Commit đầu vào đã kiểm tra: `3e28fe5b3ddc6d605de68db7f87b0808bad65917`

Branch làm việc đề xuất: `hien/p01-neo4j-e2e-verification`

## 1. Kết quả cần đạt

Một lần chạy có thể tái lập theo đúng chuỗi:

```text
source snapshot cố định
  -> parser thực sự chạy lại
  -> JSON mới sinh
  -> Cypher mới sinh từ JSON đó
  -> Neo4j sạch/cách ly và chỉ nạp snapshot được chọn
  -> query ngược từ seed
  -> client 1-hop và controller 2-hop
  -> impact set không chứa seed
```

Kết quả phải được chứng minh bằng test, command log, exit code và artifact có provenance. Ảnh giao diện Neo4j, node/edge count hoặc file Cypher có sẵn không đủ để nghiệm thu.

## 2. Phản hồi bắt buộc trước khi sửa

Hiển hoặc AI hỗ trợ gửi Huy:

1. Tên branch mới và commit gốc.
2. Python, dependency, Docker và Neo4j versions dự kiến dùng.
3. Danh sách lỗi đã hiểu trong `verify_neo4j_live.py`.
4. Test sẽ thêm cho từng lỗi và test E2E dự kiến.
5. Blocker về credential, Docker hoặc vị trí PetClinic source.

## 3. Các lỗi đã xác minh ở commit đầu vào

1. `sys.exit(0 if success else 0)` luôn trả exit code 0, kể cả thất bại.
2. Cách `content.split(";")` rồi loại đoạn `startswith("//")` có thể bỏ luôn statement đi cùng comment.
3. Lỗi từng Cypher statement chỉ được in rồi tiếp tục; hàm vẫn có thể trả thành công.
4. `glob("output/*.cypher")` tự nạp mọi file, có thể trộn baseline, mutated, Online Boutique và output cũ.
5. Không fail khi không có Cypher phù hợp.
6. Không có lựa chọn snapshot/input rõ ràng và không chứng minh database sạch/cách ly.
7. Script chỉ đếm node/edge; chưa query đúng seed, 1-hop, 2-hop hoặc loại seed khỏi impact set.
8. Luồng hiện tại có thể bắt đầu từ Cypher sinh sẵn, chưa chứng minh source -> parser -> Cypher -> Neo4j trong cùng run.

Không giới hạn cách sửa ở đúng tám mục nếu test phát hiện lỗi khác, nhưng không tự mở rộng sang framework/ngôn ngữ mới.

## 4. Yêu cầu triển khai

### A. CLI và lựa chọn input

- Cho phép chỉ định rõ snapshot và/hoặc đúng file Cypher cần nạp.
- Không dùng wildcard rộng làm mặc định nghiệm thu.
- In resolved absolute/relative input paths, SHA-256 và snapshot metadata.
- Fail non-zero nếu input thiếu, rỗng, trùng/mâu thuẫn snapshot hoặc metadata không khớp.

### B. Cypher execution an toàn và đáng tin cậy

- Parser statement phải giữ câu lệnh có comment đứng trước; thêm fixture/test cho trường hợp này.
- Mọi statement failure phải làm cả run thất bại và trả non-zero.
- Import error, bad credentials, unavailable Neo4j và missing driver đều trả non-zero.
- Không in password/token vào log.
- Chọn chiến lược isolation rõ ràng: dedicated disposable database/container hoặc cleanup/tag theo run được kiểm chứng. Không vô tình xóa database dùng chung.

### C. E2E orchestration

- Chạy parser từ source baseline/mutated đúng input và config.
- Sinh JSON và Cypher mới vào run directory riêng có timestamp/run ID.
- Không đọc output cũ ngoài run directory.
- Nạp một snapshot mỗi run; baseline và mutated chạy cách ly.
- Lưu versions, command, exit code, duration và checksums.

### D. Query nghiệm thu

- Chọn seed bằng method ID đầy đủ, không bằng tên `read` đơn lẻ.
- Duyệt ngược `INVOKES_API` và `CALLS` theo hop logic trong `PROJECT_CONTEXT.md`.
- Xuất machine-readable result gồm seed, impacted method IDs, hop, edge path và service-boundary crossings.
- Khẳng định bằng assertion: client ở 1-hop, controller ở 2-hop, seed không nằm trong impact set.
- Chạy kiểm tra riêng cho baseline và mutated; không lấy label draft làm input.

## 5. Test tối thiểu

- Unit test: comment trước statement không làm mất statement.
- Unit/integration test: malformed Cypher trả non-zero.
- Test: missing driver/import, bad URI/credentials và no input trả non-zero.
- Test: snapshot selection không trộn file khác.
- Test: chạy lặp không tạo cạnh trùng hoặc nhiễm snapshot trước.
- E2E: source -> JSON -> Cypher -> Neo4j -> 1/2-hop result.
- Toàn bộ test hiện có vẫn pass; báo rõ tổng số test và test nào skip cùng lý do.

Không viết cứng expected edge trong production code. Expected result chỉ đặt trong test/acceptance fixture và phải gắn với commit/snapshot.

## 6. Artifact bàn giao

```text
evidence/p01-e2e/<run-id>/
  environment.json
  commands.log
  parser-output.json
  import.cypher
  import.log
  query-result.json
  test-results.log
  checksums.sha256
  summary.md
```

`summary.md` phải liên kết tới raw artifact, không chép tay một kết quả không truy xuất được.

## 7. Definition of Done

- Các lỗi mục 3 có regression test hoặc acceptance test tương ứng.
- Mọi failure quan trọng trả non-zero; success chỉ khi tất cả statement và assertion cần thiết pass.
- Một run chỉ dùng artifact vừa sinh và đúng snapshot.
- Neo4j được cách ly; baseline/mutated không nhiễm nhau.
- Query trả đúng tuyến 1/2-hop theo quy ước logic và loại seed khỏi impact set.
- Có artifact/hash/version/command/exit code đủ để người khác tái chạy.
- Không gọi output là ground truth và không dùng label draft để sửa parser/query.
- Không force push; bàn giao branch/commit để Huy review, chưa tự merge `main`.

## 8. Điều kiện phải dừng và hỏi Huy

- Source/commit P01 không khớp hoặc fixture khác baseline đã chốt.
- Cần đổi JSON schema, hop definition hoặc Neo4j schema dùng chung.
- Muốn xóa database không chắc chắn là môi trường riêng của task.
- E2E yêu cầu dependency/hạ tầng mới ngoài phạm vi đã thống nhất.

## 9. Mẫu bàn giao

```text
Task: P01 Neo4j E2E verification
Branch / commit:
Base commit:
Environment versions:
Source commit / snapshot:
Lệnh chạy chính:
Test command và kết quả:
Failure-path tests:
Artifact run directory:
JSON / Cypher / query-result hashes:
Kết quả 1-hop:
Kết quả 2-hop:
Seed excluded: yes | no
Snapshot isolation evidence:
Unresolved / limitations:
Điểm khác đặc tả và lý do:
Bước tiếp theo:
```
