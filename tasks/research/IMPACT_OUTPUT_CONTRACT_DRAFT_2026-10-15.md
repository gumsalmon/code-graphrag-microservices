# Bản nháp hợp đồng Method/API/Service — 15/10/2026

Đã soạn theo yêu cầu: giữ ở dạng nháp để Hiển/Phát thống nhất trước áp dụng. Không thay hợp đồng đang chạy hoặc tự ghi quyết định áp dụng.

## Tài liệu bàn giao

- [Điểm bắt đầu](../../docs/contracts/README.md).
- [Đặc tả v0.1 nháp](../../docs/contracts/IMPACT_OUTPUT_CONTRACT.v0.1.DRAFT.md): ID, candidate payload, witness/hop, citations/abstention, projection, run envelope, scorer boundary và migration.
- [Design manifest](../../docs/contracts/impact-output.v0.1.draft.json): applied=false, không scoring authorization, adoption approvals null; D01–D08 đều open. Đây không phải JSON Schema hoặc production validator.
- [Ví dụ toy](../../docs/contracts/examples/impact-output.synthetic.json): một payload minh họa ba cấp/likely/unlikely/unknown/omitted và một provider failure tổng hợp; không có real commit/hash hoặc output P01/P02, không dùng làm nhãn/scorer input.
- [Checklist theo vai trò](../../docs/contracts/REVIEW_CHECKLIST.v0.1.DRAFT.md): Hiển kiểm khả thi registry/parser/path; Phát kiểm nghĩa protocol/universe/alias/projection/scorer. Không yêu cầu đổi task hiện tại hoặc điền kết luận thay thành viên.

## Các ranh giới chính

1. Tách registry/input, candidate prediction, trusted run envelope/validation và score adapter; nhãn/review là luồng riêng.
2. Method không tự nhận credit API/Service. Direct-only là phương án thảo luận; mọi projection vẫn cần thống nhất/version trước áp dụng.
3. Unknown, not_returned, unsupported level, invalid và execution_failed không bị tự biến thành negative. Parser unresolved, model unknown, label unresolved và pending_review giữ nghĩa riêng.
4. Pure abstention có thể thiếu citation theo điều kiện chặt; mọi citation hiện diện vẫn phải kiểm. Reachable/behavior unknown không phải pure abstention.
5. API/Service dùng Method witness với handler/owning-service binding; không cộng containment/API node hop hoặc nhận witness Service thành min-hop ground truth.
6. Đề nghị likely→true, unlikely→false, unknown→null + ledger chưa được triển khai. Scorer Boolean hiện có không nhận payload mới; partial/invalid/failure/duplicate policy vẫn mở. Không bỏ gold positive abstained khỏi recall denominator.
7. Failure giữ payload null khi không có response parse được, usage null khi không đo được, raw/error attempts bất biến; không giả một successful empty prediction.

## Căn cứ đã đối chiếu

Đọc đầy đủ PROJECT_CONTEXT.md v0.6; protocol benchmark v0.2 và scorer tại pin `5f9204d66253604edf9101c2f888fc7e75aa0be7`; P01 abstention contract/core hiện hành; P02 scope preparation.v1 và task packet. Chỉ đọc code/protocol/cấu trúc, không mở labels.v3 hoặc output model thật để đặt hợp đồng.

Scorer hiện tại yêu cầu Boolean và đầy đủ gates; malformed level/Boolean có thể chặn case. Không tuyên bố scorer hiện đã thực hiện toàn bộ semantics đề nghị; để Phát xác nhận adapter/policy sau. gRPC API ID cũng chưa được tự mở hoặc coi là đã được hỗ trợ.

## Kiểm chứng trong lượt này

- 8/8 test tài liệu/ví dụ toy pass, không skip. Kiểm trạng thái draft/approval trống, ID/seed/level, quotes, hop/API anchor, 36 tổ hợp abstention, unknown không né citation/ID/count guards và failed payload không thành empty success.
- 75/75 test của tập hồi quy đã chọn pass, không skip: 8 test mới, P01 reasoning/abstention, P02 paired dry-run và handoff. Đây không phải lượt chạy lại 170 test toàn bộ, Java/runtime/Neo4j suite hoặc đánh giá nghiên cứu.
- Log: `handoff-out/impact-output-contract-draft/20261015-verification-01/draft-regression.log`.
- Test helper chỉ nằm trong docs/contracts/impact-output-draft.test.mjs, không được runtime/scorer import; không triển khai production validator hoặc score adapter.
- Không chạy Docker/mutation/POST/model, không đọc credential thật hoặc gửi dữ liệu/tin nhắn ra ngoài. Không stage/commit/push/merge.

## Điều kiện bước tiếp

Giữ bản này là proposal. Khi có phản hồi thật: ghi D01–D08 được đồng ý/cần sửa/chưa rõ, giải quyết bất đồng rồi mới tạo bản áp dụng có version, schema/adapter/validator/tests riêng. Chấp thuận format không thay quyết định nhãn, final test hoặc scoring authorization. Hai ZIP đã gửi Hiển/Phát không cần đổi trong lúc họ làm phần P02 đã nhận.
