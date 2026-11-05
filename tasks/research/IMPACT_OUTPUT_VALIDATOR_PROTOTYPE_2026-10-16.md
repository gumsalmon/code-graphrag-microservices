# Validator đầu ra theo hợp đồng nháp — bàn giao 16/10/2026

## Phạm vi được yêu cầu

Xây prototype kiểm đầu ra theo draft, chỉ dùng dữ liệu tổng hợp/offline; chưa áp dụng vào parser, Neo4j hoặc scorer. Đã đọc toàn bộ PROJECT_CONTEXT.md v0.6 và draft/manifest/example/checklist trước triển khai. Không đọc nhãn hay output phương pháp P01/P02 để xây quy tắc.

## Đầu ra

- [Hướng dẫn và giới hạn](../../prototypes/impact-output-validator/README.md).
- Core thuần `prototypes/impact-output-validator/validator.mjs`: nhận request + attempt, trả diagnostic ledger, không I/O hoặc runtime/scorer bridge.
- CLI `cli.mjs`: demo hoặc kiểm hai file toy JSON, stdout, không ghi/overwrite input.
- `fixtures.mjs`: tái sử dụng ví dụ toy có sẵn, không sửa byte ví dụ. Hai file test riêng cho core/CLI.
- ID prototype: `impact-output-validator/synthetic-prototype.1`; contract nguồn `microservice-impact-output/0.1.0-draft.1`. Code mới còn cục bộ, chưa có commit chứa nó.

## Những kiểm tra đã hiện thực

1. Level/ID/canonical snapshot/overload, exact alias có evidence binding; không fuzzy match hoặc tự thay snapshot. Seed Method/API/owning Service bị loại. Registry support entity không tự thành universe.
2. HTTP API ID giữ mapping path, wildcard/path variable và handler ownership; nhiều mapping/một handler vẫn là nhiều API IDs. Không giả hỗ trợ gRPC.
3. Required fields/enums/rationale/assumptions/repair strategy; không suy behavior từ reachable hoặc repair từ likely.
4. Citation ID theo request và exact quote; không normalize LF/CRLF/case/whitespace. Pure unknown mới có thể bỏ citation, summary luôn cần citation. Request không có quote khả dụng được báo lỗi chuẩn bị input, không ép bịa dẫn chứng. Có kiểm đủ 36 tổ hợp dependency/behavior/repair.
5. Witness dùng Method IDs, đúng anchor, hướng caller→callee→seed, 1–3 hop/boundary riêng. Supplied-graph và source-inferred được phân biệt; witness sai không nhận tag matches_supplied_graph.
6. Duplicate/conflicting canonical records bị cách ly tất cả bản và giữ ledger, không chọn bản có lợi. Partial/invalid/omission/unsupported/unknown/failure được phân biệt; không xuất Boolean, projected prediction, metric hay label.
7. JSON duplicate keys, kể cả escaped Unicode key và nested object, không được chọn last-wins. Input CLI có giới hạn byte/nesting; lỗi đọc/parse không echo nội dung file.

## Kiểm chứng đã chạy

- Node.js thực tế: v24.19.0.
- 105/105 test prototype pass, 0 fail, 0 skip. Gồm type mutations, duplicate/conflict, tampered quote/ID/path, full abstention combinations, lỗi input không có evidence đủ trích, CLI/file mode và 200 JSON round-trips tổng hợp xác định.
- 195/195 test trong tập hồi quy offline đã chọn pass, 0 fail, 0 skip: 105 mới + 90 test cũ cho draft contracts/experimental design, P02 preparation/runtime argument checks/paired dry-run, P01 abstention và handoff. Không phải full project suite, Java tests, actual Neo4j hoặc benchmark.
- Bốn CLI demo được chạy thật dưới Node permission mode chỉ cấp đọc thư mục prototype và docs/contracts, không cấp fs-write/child-process: mixed→exit 0/valid; quote sai→exit 1/partial; lỗi 503 tổng hợp→exit 1/not_checked + execution failed; source-inferred→exit 0/valid với tag không graph-verified. Không coi permission mode là bằng chứng sandbox network toàn diện.
- Đối chiếu trước/sau 95 file được bảo vệ: không đổi, không file thêm trong tập này. Gồm PROJECT_CONTEXT, contract/manifest/example/checklist và các file hiện có dưới pipeline/reasoning/benchmark/demo/scripts/handoff/experiment docs; danh sách/hash cụ thể được lưu.
- Không tìm thấy import/tên validator mới trong pipeline, reasoning, benchmark, demo, scripts hoặc task handoff. Chỉ thêm link prototype vào docs/contracts/README.md; không đổi đặc tả draft hay approvals.
- `git diff --check` exit 0; Git vẫn cảnh báo LF/CRLF của working tree đã có. Không sửa line endings hoặc thay đổi cũ của người dùng.

Bằng chứng:

- [Tổng hợp lệnh/phạm vi/kết quả](../../handoff-out/impact-output-validator/20261016-verification-7677170c/verification.json).
- [105 test prototype, lượt cuối](../../handoff-out/impact-output-validator/20261016-verification-7677170c/prototype-final.log).
- [195 test hồi quy chọn lọc, lượt cuối](../../handoff-out/impact-output-validator/20261016-verification-7677170c/regression-final.log).
- [Hash trước/sau](../../handoff-out/impact-output-validator/20261016-verification-7677170c/protected-before-after.json).
- Bốn `demo-*.json` tại cùng thư mục đều đánh dấu synthetic, không phải model output hoặc bằng chứng runtime.
- Hai log trước khi bổ sung kiểm input không có quote vẫn được giữ nguyên; kết luận hiện hành dùng các log `*-final.log`, không sửa log cũ hồi tố.
- `SHA256SUMS.txt` tại thư mục verification ghi byte identities của code/docs/input toy và bằng chứng; checksum không phải xác thực tác giả hoặc nghiệm thu khoa học.

## Giới hạn và quyết định còn mở

Prototype profile là lựa chọn triển khai có thể bỏ đi để thử bản nháp, không phải JSON Schema/envelope production đã thống nhất. Các lựa chọn đóng fields, supported subset, null repair strategy, cách ly mọi duplicate và trạng thái partial được ghi rõ trong README; D01–D08 vẫn open. Không tự thay scorer/protocol hoặc quyết định FP/failure penalty.

Exact quote hay graph match không chứng minh ngữ nghĩa impact đúng. Registry/alias/snapshot toy chưa được xác minh bằng source/file/hash thật, chưa hỗ trợ lineage thật hoặc mutated evidence provenance. Không có checker phát hiện mọi suy luận bịa bên trong rationale. Mọi report đều không xác nhận semantic correctness, lineage, accepted labels, production readiness hoặc quyền scoring.

File mode/JSON tag chỉ tránh dùng nhầm, không chứng minh người cung cấp dữ liệu thật sự synthetic. Không đưa key, nhãn hay output thật vào CLI. Lỗi hiển thị giữ raw ID/pointer, không phải hệ thống redaction tổng quát.

## Không thực hiện / bước tiếp theo

Không Docker/HTTP/model, mutation/POST/extraction/graph thật, không áp dụng parser/Neo4j/prompt/pipeline/viewer/benchmark/scorer, không tạo/duyệt nhãn hay chấm điểm. Không stage, commit, push hoặc merge; giữ nguyên PROJECT_CONTEXT và gói đã gửi thành viên.

Có thể dùng prototype làm ví dụ khi thảo luận D01–D08 sau task hiện tại của Hiển/Phát, nhưng không coi im lặng là đồng ý. Trước dùng thật cần quyết định áp dụng/version, registry/lineage và schema/adapter production riêng, test migration và gate phù hợp. Đường găng P02 vẫn là kiểm ZIP Hiển và phản hồi độc lập inventory/alias/fixture/universe của Phát.
