# Phiếu rà soát độc lập P01 — mở trước nhãn dự thảo

Tài liệu này dành cho reviewer là người khác annotator. Đọc các định nghĩa trung lập dưới đây rồi ghi nhận định của chính mình từ source, patch, contract và raw runtime **trước khi mở** `labels.v3.json`, `evidence_manifest.json`, `HANDOFF.md`, `REVIEW_GUIDE.md`, `review_log.md`, `scenario.json`, `derived/runtime_rerun_report.md` hoặc bất kỳ summary/output hệ thống nào. Các tài liệu đó có thể tiết lộ candidate hoặc diễn giải của người lập gói và chỉ dùng ở vòng đối chiếu sau. `PROJECT_CONTEXT.md` đã nêu tuyến ứng viên nên lần rà soát này không thể được coi là blind hoàn toàn.

Làm việc trên một bản sao của phiếu này hoặc ghi kết quả vào hồ sơ review riêng; ghi thời điểm hoàn thành vòng độc lập trước khi mở nhãn. Không sửa raw evidence hay `labels.v3.json`.

## Định nghĩa dùng cho vòng nhận định độc lập

- **Seed:** Method hoặc API contract trực tiếp bị thay đổi; ghi lại để truy vết nhưng loại khỏi tập chấm impact.
- **Dependency và logical hop:** một lời gọi Method→Method hoặc consumer Method→provider API là một hop theo source/contract. Duyệt ngược từ callee bị đổi đến caller; cạnh bao chứa không tăng hop. Đếm service boundary crossing riêng.
- **Behavioral impact:** khác biệt quan sát được giữa baseline và mutated dưới cùng fixture, như status, lỗi, response content hoặc dữ liệu thiếu/sai. Reachability tự nó không đủ.
- **Requires code change:** câu hỏi sửa mã theo một repair strategy nêu rõ; độc lập với behavioral impact.
- **Positive / negative / unresolved:** positive cần khác biệt tái lập và bằng chứng source/contract cùng runtime sạch; negative cần ca đối chứng chọn theo tiêu chí độc lập với output hệ thống và hành vi không đổi; unresolved khi bằng chứng chưa đủ. Reviewer có thể ghi bất đồng và giới hạn thay vì ép nhãn.
- **Evaluation universe:** tập thực thể đủ điều kiện xem xét theo phạm vi đã định trước, gồm cả candidate positive và negative; không được hình thành từ prediction. Với P01 đang review, hãy tự ghi phạm vi và những ID đã xem xét, rồi so sánh với hồ sơ ở vòng hai.

Chỉ dùng các định nghĩa trên trong vòng đầu. Không đọc nhãn, bảng candidate, tóm tắt kết luận, JSON parser, Cypher, kết quả Neo4j/GraphRAG/Vector RAG/LLM hoặc benchmark score trước khi khóa nhận định của mình.

## 1. Xác nhận gói và provenance

Từ checkout sạch của commit bàn giao, chạy:

```powershell
git status --short
powershell -ExecutionPolicy Bypass -File scripts/update_p01_checksums.ps1 -Mode VerifyArtifacts
Get-FileHash benchmark/p01/raw/historical/mutation.patch -Algorithm SHA256
Get-FileHash benchmark/p01/raw/source_baseline/*.java -Algorithm SHA256
```

Đối chiếu commit nguồn `3858f9c630cf989bb6809a86edf47c2be78dc9f1` và config revision `323993ce2519c6d02df63e08bf4458d123d3b611` với raw metadata và runtime environment. Ba snapshot Java được lưu tại `benchmark/p01/raw/source_baseline/`. Patch gốc là `benchmark/p01/raw/historical/mutation.patch` (UTF-16LE có BOM); giữ nguyên byte gốc. Nếu muốn thử `git apply --check`, chuyển **chỉ bản sao** sang UTF-8 rồi kiểm tra trên checkout PetClinic đúng commit nguồn.

Ghi: checkout commit/hash __________; checksum ___/117; nguồn và patch khớp/không khớp __________; giới hạn provenance __________.

## 2. Tự dựng tuyến từ source và patch

Đọc ba snapshot Java và patch gốc, rồi đối chiếu tài liệu hợp đồng Spring `@RequestParam` nếu cần. Tự ghi:

| Câu hỏi | Nhận định độc lập, file:dòng và lý do |
|---|---|
| Handler nào bị thay đổi? Chữ ký, mapping và query contract trước/sau là gì? | |
| Client nào gọi handler đó? URI và tham số thực gửi là gì? | |
| Controller hoặc endpoint nào gọi client? Có fallback nào? | |
| Overload/endpoint gần tên nào không chịu tác động từ patch? Vì sao? | |
| Mỗi quan hệ phụ thuộc có bao nhiêu logical hop và service boundary crossing? | |

Phân biệt thay đổi hành vi quan sát được với việc có cần sửa code trong một chiến lược sửa chữa cụ thể. Không dùng output parser, graph, Neo4j hoặc RAG để suy ra tuyến hay hop.

## 3. Tự đối chiếu raw runtime

Bản chạy chính: `benchmark/p01/raw/rerun-20260923-152742/`. Kiểm tra `environment.json`, `commands.log`, `requests.jsonl`, các file `logs/`, `eureka-visits-mutated.json` và `mutated-gateway-discovery-preflight.json`. Dùng timestamp, command, exit code, HTTP status/body và service log để ghép từng quan sát với đúng image và service. Không mở `summary.json` trước khi khóa nhận định ở mục 4. Bản `rerun-20260923-214211/` là lần xác nhận sau, không thay thế bản chính. Các lần thử khác chỉ là chẩn đoán; ghi riêng nếu chúng làm giảm độ tin cậy.

| Trường hợp cần tự kiểm | Status/body và raw reference | Nhận định hoặc giới hạn |
|---|---|---|
| Baseline direct | | |
| Baseline gateway | | |
| Mutated direct, thiếu tham số mới | | |
| Mutated direct, có tham số hợp lệ | | |
| Mutated gateway và bằng chứng đi tới provider mutated | | |
| Endpoint đối chứng baseline so với mutated | | |

## 4. Khóa nhận định trước khi mở nhãn

Ghi danh sách candidate Method/API/Service, positive/negative/unresolved, behavioral impact, requires-code-change, logical hop, service boundary crossing và bằng chứng cho từng mục. Đánh dấu seed để loại khỏi impact set. Nếu bằng chứng không đủ, ghi `unresolved` cùng lý do, không suy ra theo kỳ vọng.

Reviewer: __________  Thời điểm hoàn thành vòng độc lập (ISO-8601): __________

File hoặc bản ghi lưu nhận định độc lập: __________

Sau bước này mới mở `benchmark/p01/REVIEW_GUIDE.md`, toàn văn protocol v0.2, `scenario.json`, `evidence_manifest.json`, `summary.json` và `labels.v3.json` để đối chiếu từng kết luận. Ghi mọi bất đồng và bằng chứng vào `review_log.md`; quyết định chỉ ghi sau khi rà soát xong. Giữ `audit_decision=pending_review` cho tới khi có quyết định của reviewer đủ điều kiện.
