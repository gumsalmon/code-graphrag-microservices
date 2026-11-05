# Thiết kế thực nghiệm nháp — bàn giao 15/10/2026

Đã hoàn thành phần chuẩn bị thiết kế trong thời gian chờ phản hồi Hiển/Phát. Không triển khai/chạy phương pháp mới, không áp dụng output contract, không mở test hoặc scoring.

## Tài liệu

- [Thiết kế đọc chính](../../docs/experiments/EXPERIMENT_DESIGN.v0.1.DRAFT.md).
- [Design register](../../docs/experiments/experiment-design.v0.1.draft.json): `microservice-cia-experiment/0.1.0-draft.1`, applied=false, results=null, approvals trống; chỉ T0 planning enabled.
- [Measurement template](../../docs/experiments/measurement-template.v0.1.draft.json): chưa đo, không collector/schema production; identity/config/measurement/score bindings chưa có đều null.
- [Checklist E01–E10](../../docs/experiments/REVIEW_CHECKLIST.v0.1.DRAFT.md): điều kiện chốt trước triển khai; chưa có phản hồi/decision điền sẵn.

## Các điểm đã cụ thể hóa

1. Bốn RQ cho chất lượng, đóng góp thành phần, error/abstention/failure và tài nguyên. Đề nghị B5–B4/Method micro F1 làm primary; API/Service thứ cấp định trước, chưa chốt áp dụng. Không giả định B5 thắng.
2. Giữ baseline IDs B0–B5 của ghi chú 09/10. B0 contract violation không trộn vào CIA impact F1; B1/B2/B3 chưa thành benchmark hoàn chỉnh chỉ vì có code traversal/parser. Hiện B4/B5 mới là prototype/smoke P01, không có điểm bài báo.
3. A-G/A-S/A-C/A-T, depth 1/2/3 và B5–B2 có intervention/fixed factors/claim limit rõ. Metadata-off không giả xóa contract khỏi raw source; no-graph không đọc hidden graph-selected context. Alias config không đếm thêm N/calls.
4. Equal token ceiling và matched-information diagnostic tách riêng; không coi cùng bytes là cùng tokens, không silently truncate. H1 không được bỏ positives 2/3-hop khỏi gold universe để tăng recall.
5. P01/P02 development, P03/P04 còn ứng viên; cần campaign mới chưa lộ cho final test. Universe/label/reference độc lập và split chống group leakage, không chọn ca bằng score hoặc số positive.
6. Unknown/omission/failure/invalid/OOS/unsupported tách biệt; failure-to-primary-quality policy chưa chốt, không tạo successful empty output hoặc official scores. Micro/macro từng level, support và failure/coverage trên toàn planned attempts.
7. Scenario/group/repository và repetitions không được coi như N độc lập ngang nhau. Statistical test/CI/resampling/sample size/multiplicity còn null; không hứa significance/journal readiness từ bốn pilot.
8. Offline/index và online wall time, cache, native usage, overlapping token fields, failed attempts, estimated vs billed cost và pricing provenance tách riêng. Score lineage thuộc nhóm riêng, không đưa vào model input.

## Căn cứ và mức đọc

Đọc đầy đủ PROJECT_CONTEXT.md v0.6, kế hoạch P02–P04, ghi chú literature 09/10 và đối chiếu draft output contract, code retrieval/budget/provider telemetry hiện hành. Giữ trạng thái lịch sử của literature note, không sửa dòng P02 chưa mở tại thời điểm 09/10.

Kiểm lại trực tuyến có mục tiêu, không tuyên bố đọc toàn văn mới hoặc tái hiện:

- [CodeRAG-Bench, Findings NAACL 2025](https://aclanthology.org/2025.findings-naacl.176.pdf), phần retrieval/generation/effectiveness/efficiency.
- [RepoGraph, ICLR 2025](https://proceedings.iclr.cc/paper_files/paper/2025/file/4a4a3c197deac042461c677219efd36c-Paper-Conference.pdf), §5.2/Table 4.
- [Towards CIA, preprint v1](https://arxiv.org/html/2501.11778v1), giới hạn xấp xỉ static analysis.
- [Dror et al., ACL 2018](https://aclanthology.org/P18-1128.pdf), lựa chọn statistical test và hạn chế small-sample bootstrap.

Các lựa chọn experiment/cluster/projection của nhóm là đề xuất suy ra cho bài toán này, không phải policy được tác giả các bài nói trên phê duyệt hoặc kết quả CIA đã kiểm chứng. Không đọc labels.v3 hoặc model output thật để chọn RQ/config/scenario.

## Kiểm tra thực tế

- 12/12 test thiết kế mới pass: draft/no authorization, B0 khác task, ID/contrast/alias consistency, fixed pool/metadata, gold universe qua depth, các choices chưa chốt/null, draft contract dependency, dev/test independence, coverage/failure/statistical denominator và E01–E10 còn open.
- 87/87 test trong tập hồi quy đã chọn pass, không skip: 12 mới + draft contract, P01 reasoning/abstention, P02 paired dry-run và handoff. Không phải lượt chạy toàn bộ 190 Node tests hoặc Java/Neo4j/runtime/benchmark.
- Log: `handoff-out/experiment-design-draft/20261015-verification-01/draft-regression.log`.
- Test helper chỉ kiểm tài liệu/JSON/tính nhất quán; không được runner, scorer hoặc telemetry pipeline import.
- Không gọi LLM/API, không chạy Docker/mutation/POST hoặc đo F1/chi phí thật. Chỉ tạo tài liệu/test mới và log cục bộ; không sửa protocol, nhãn, PROJECT_CONTEXT.md, code đang chạy hoặc hai ZIP đã gửi. Không stage/commit/push/merge.

## Bước tiếp theo và đường găng

Ba phần chuẩn bị đã có: paired dry-run, output contract nháp, experimental design nháp. Đường găng để thực thi mutation P02 vẫn là phản hồi xác nhận inventory/alias/fixture của Phát và kiểm kỹ thuật của Hiển; xử lý bất đồng/version input rồi mới nối/kiểm runtime adapter. Không dùng hoàn thành tài liệu hoặc test pass để tự bỏ gate này.

Chưa phải toàn bộ dự án hết việc hoặc chỉ còn đợi reviewer: có thể rà/chuẩn bị công cụ offline trong phạm vi được giao, nhưng thiết kế/apply schema/LLM budget/final test/scoring cần quyết định đúng người. Không mở P03/P04 đồng loạt hoặc yêu cầu thành viên đổi task hiện tại chỉ vì có thêm proposal.
