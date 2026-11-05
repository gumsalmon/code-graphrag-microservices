# Contract unknown/abstention — phiên bản 2

Ngày áp dụng: 15/10/2026. Huy phê duyệt trong trao đổi: áp dụng cùng quy tắc unknown cho cả hai cấu hình, giữ nguyên kết quả cũ và kiểm thử lại. Quyết định này chỉ thay hợp đồng phản hồi; không phê duyệt nhãn, mở scenario mới, khóa split hoặc cho phép gọi API thêm.

## Quy tắc đã chốt

Một method record chỉ được để `citations: []` khi **đồng thời**:

```json
{
  "dependency_status": "unknown",
  "dependency_path": [],
  "logical_hops": null,
  "service_boundary_crossings": null,
  "behavioral_impact": "unknown",
  "requires_code_change": "unknown",
  "rationale": "Nêu rõ bằng chứng được cung cấp còn thiếu; không khẳng định có/không tác động hoặc cần sửa.",
  "citations": []
}
```

Vẫn cần `method_id` hợp lệ, đúng overload và không phải seed; không duplicate; rationale phải có nội dung. Đây là **abstention** (chưa đủ bằng chứng để kết luận), không phải negative label hoặc impacted set rỗng. Record hoàn toàn unknown có citation hợp lệ vẫn được chấp nhận; citation có mặt luôn phải qua kiểm ID/quote, không bỏ qua vì trạng thái unknown.

Mọi record không thỏa tổ hợp trên phải có ít nhất một citation. `not_established`, `unlikely`, `likely`, `reachable`, `required`, `optional` đều không được dùng để né yêu cầu bằng chứng. Zero không thay cho null; path không được chứa method khi chưa thiết lập phụ thuộc. Summary vẫn bắt buộc có citation. Các giới hạn 30 citation/record, quote nguyên văn, ID/overload/seed/path/hop/boundary và chống trường phê duyệt tự thêm được giữ nguyên.

Prompt, JSON Schema và validator dùng cùng quy tắc. Schema có hai nhánh `anyOf`: citation không rỗng, hoặc pure unknown với path rỗng/count null/citation rỗng. Tài liệu [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output?hl=en) mô tả `anyOf`, `minItems` và `maxItems`; vẫn cần validation phía ứng dụng. Sau kiểm offline, hai attempt thật ngày 15/10 cho Vector qua kiểm với hai abstention, còn Graph+Vector trả 503 high demand: [báo cáo smoke mới](../../tasks/research/P01_ABSTENTION_LIVE_2026-10-15.md). Chưa có cặp output mới hợp lệ để so chất lượng. Không đổi endpoint/model hoặc billing.

## Phiên bản và bảo toàn lịch sử

| Request | Context | Prompt | Validation | Chính sách |
| --- | --- | --- | --- | --- |
| `p01-reasoning-request/1` | `/1` | `p01-static-impact/1` | `p01-validated-prediction/1` | Legacy, mọi record cần citation |
| `p01-reasoning-request/2` | `/2` retrieval | `p01-static-impact/1` | `p01-validated-prediction/1` | Legacy, mọi record cần citation |
| `p01-reasoning-request/3` | `/2` retrieval | `p01-static-impact/2` | `p01-validated-prediction/2` | Pure unknown được abstain |

Request version, prompt version, prompt text, context prompt version và schema phải khớp chính xác; đổi một trường rồi tính lại hash không bỏ qua quy tắc. Validator chọn chính sách **theo request**, không theo ngày chạy hoặc một flag nới kiểm tra. Các hằng `PROMPT_VERSION`, `SYSTEM_PROMPT`, `SCHEMA` legacy giữ nguyên để dựng lại request lịch sử; hằng `ABSTENTION_*` chứa phiên bản mới.

`core.withAbstentionContract(request)` trả bản sao mới của retrieval request, không sửa input. Nó thay request/prompt/schema và hash tương ứng, giữ source excerpts, patch, retrieval/ranking/top-k, graph và registry. Không đọc response hay nhãn. Gọi lại trên một request mới đã hợp lệ cho cùng kết quả.

Validation mới ghi `assessment_kind=abstention` hoặc `evidence_backed_assessment`, `abstention_is_negative_label=false`, semantic/human/runtime review vẫn false. Tên assessment có citation chỉ phản ánh đã kiểm cấu trúc/quote, **không chứng minh quote hỗ trợ đúng lập luận**. Rationale/summary là văn bản tự do; prompt cấm khẳng định vô căn cứ nhưng validator không chứng minh được ngữ nghĩa câu chữ.

Không chạy lại câu trả lời lịch sử dưới request mới rồi gọi là thành công mới. Vector ngày 15/10 vẫn bị từ chối theo request/prompt legacy; Graph+Vector vẫn chỉ đạt kiểm cấu trúc. Không thay response, validation, usage, provenance, manifest hoặc gói đối chiếu lịch sử. Viewer/packer kiểm riêng hai phiên bản và từ chối trộn chúng thành một cặp.

## Chuẩn bị request mới, không gọi LLM

Từ một lượt retrieval legacy hợp lệ:

```powershell
node scripts/prepare_p01_abstention.mjs --retrieval-run handoff-out/p01-retrieval/20261012T151104176Z-89ba55ec
```

Đầu ra luôn là thư mục mới trong `handoff-out/p01-contract/`, gồm hai request `/3`, hai provider payload, experiment plan, origin hashes, code provenance, run metadata và manifest. `remote_calls=0`, usage null, không có response/validation/scoring. Nguồn phải ở private retrieval root và qua checker trước/sau; không đọc key hoặc response cũ. Không overwrite thư mục.

Kiểm độc lập lại gói đã tạo:

```powershell
node scripts/prepare_p01_abstention.mjs --check PATH_TO_CONTRACT_DIRECTORY
```

Prepare pipeline mới qua `pipeline/p01/context.mjs::preparePair` mặc định dùng contract mới cho cả Vector/Graph+Vector. Checker pipeline đọc version từ request đã lưu để dựng lại đúng legacy hoặc mới. `buildRetrievalRequest` cấp thấp vẫn mặc định legacy cho tương thích checker lịch sử; khi gọi trực tiếp để tạo phiên bản mới phải truyền `promptVersion: core.ABSTENTION_PROMPT_VERSION`. Runner retrieval lịch sử và trang Context & LLM v1 vẫn giữ legacy, không âm thầm thay hash.

Live CLI hiện có có thể nhận request `/3`, nhưng lượt API cần phê duyệt riêng. Kiểm thử transport hiện dùng fetch tổng hợp, không bằng chứng provider thật. Adapter/provider khác chưa được nghiệm thu với schema mới. Không dùng việc sửa contract làm lý do thay model một phía hoặc tái gán nhãn theo prediction.

## Kiểm thử và giới hạn

```powershell
node --test reasoning/p01/abstention.test.mjs reasoning/p01/comparison.test.mjs reasoning/p01/comparison-files.test.mjs reasoning/p01/retrieval.test.mjs reasoning/p01/reasoning.test.mjs reasoning/p01/gemini.test.mjs demo/p01/demo.test.mjs pipeline/p01/pipeline.test.mjs
```

Có kiểm toàn bộ 36 tổ hợp dependency/behavior/repair cho từng cấu hình khi citation rỗng, cả schema constraints và validator. Ca cố đưa path/count, ID/seed sai, duplicate, rationale rỗng, citation sai kiểu hoặc quote giả vẫn bị từ chối. Kiểm version spoofing, tương thích legacy, hai payload đồng cấu hình và transport giả lập. Bộ đối chiếu hiển thị nhãn abstention, không tự xác nhận provider/model hoặc chấm F1.

Abstention cần được báo cáo riêng khi thiết kế metric/coverage; không quy thành negative hoặc coi failure là một dự đoán rỗng đúng. Chưa chốt scorer mới trong task này. P01 vẫn pending_review; người xây hệ thống không được dùng sửa contract để tự duyệt ground truth. P02–P04 chưa mở, split chưa khóa.
