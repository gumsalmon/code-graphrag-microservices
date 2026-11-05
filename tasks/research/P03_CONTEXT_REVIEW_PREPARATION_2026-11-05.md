# Context P03 và dữ liệu chuẩn bị review PetClinic — 05/11/2026

Đã hoàn tất context P03 và gom dữ liệu thực cho hai lượt review ở chế độ chuẩn bị nội bộ. Không cần gửi ACK cho Hiển để tiếp tục; ACK là thông báo kết quả tùy chọn, không là gate kỹ thuật. Không tự gửi tin nhắn hoặc giao thêm vòng sửa cho Hiển/Phát.

## Context P03

[Hướng dẫn](../../pipeline/p03/STATIC_CONTEXT.md), [run hiện hành](../../handoff-out/p03-static-context/20261105T084817515Z-225f3c9a/SUMMARY.json), manifest `0c6e5219c74c2164143d8f519d7f07f9a9110264035166da12998909ded9153c`, 29 listed files. Source/patch/receipt/D19/D20/native manifest và parser 75e5d0f được ràng buộc; chỉ baseline code và proposed patch đi vào context. Graph mới có corrected breaker metadata; mutated source/graph chỉ nằm ở luồng diagnostic cũ.

| Preview | Bytes JSON context | Files source | Saved candidate Methods |
|---|---:|---:|---:|
| lexical | 13.342 | 3 | 0, graph không được đọc |
| graph h1 | 12.491 | 2 | 1 |
| graph h2 / h3 | 19.273 / 19.273 | 3 / 3 | 2 / 2 |
| combined h1 | 19.760 | 4 | 1 |
| combined h2 / h3 | 26.542 / 26.542 | 5 / 5 | 2 / 2 |

Đây là bảy cấu hình chuẩn bị của **một development scenario**, không phải bảy samples hoặc kết quả so sánh accuracy. BM25 là lexical; chưa embedding/dense retrieval hoặc LLM. Seed source/patch bắt buộc, cùng corpus sáu file cho mọi route, lexical chạy trước graph. Budget 32.768 bytes chưa gồm full provider/system/schema/output request và chưa là token fairness chính thức.

14/14 unit tests và checker độc lập đạt: byte source/patch, provenance, saved paths, native edge metadata, selected/dropped ledger, source aliases. Overflow cap 0 giữ context null/exit 1; source bị sửa cùng BASE hash rồi seal lại vẫn bị checker từ chối vì khác pinned native source. Ba probe contamination khác từ chối annotation path, renamed nested behavior label và gold hop trong R1; raw HTTP failure vẫn được phép làm evidence.

Run đầu `20261105T084603140Z-94c650e6`, manifest `cd37a133f4451fca307e65b950be070bab72f8d9666268c56524c0ab36c0f58f`, chỉ chuẩn bị lexical rồi bị guard `NATIVE_NODE_BINDING`: P03 native builder filename khác source thật. Không sửa graph để pass. Packer /2 sử dụng source map đã seal, giữ native/source filenames riêng; code ban đầu và log/error được giữ trong audit. Không coi ánh xạ file này là đã giải quyết enclosing-record IDs hoặc record/dataflow support.

AI điều phối đã tiếp xúc draft labels ở các lượt intake và khi chuẩn bị R2. `READ_INPUTS.json` chứng minh phạm vi đọc của chương trình context, không chứng minh AI/người xây đã blind. Các ca vẫn development; không hồi tố thành final test hoặc preregistered experiment.

## Dữ liệu review thực đã gom

[Thư mục nội bộ và hướng dẫn](../../handoff-out/petclinic-review-data-preparation/20261105T090449Z-73003c34/COORDINATOR_README.md), manifest `0fa1584d42f89dd2a5b6cc39bb3d1df1d1f5fa942cf0cd8433348dd3fb2bfc97`, 7.320 listed files. Không gửi cả thư mục này cho reviewer vì chứa đồng thời hai lượt và tài liệu điều phối.

- **R1-source-first: 915 files**, gồm source/config/patch, registry trung lập P02/P03, raw HTTP/setup/reset/direct-helper events/application logs của các repetitions. P01 giữ source/seed/fixture và attempts lịch sử; không tạo evaluation universe từ labels hoặc mô tả preregistration hồi tố. Không có draft labels, annotator judgments hoặc output parser/Neo4j/RAG/LLM.
- **R2-label-comparison: 6.396 files**, gồm đúng P01 v3, P02 draft.v4, P03 draft.v2; notes/exposure/checkpoints/evidence và histories liên quan, giữ byte labels/notes. Chỉ cung cấp sau checkpoint nhận định R1 thật. Nhãn vẫn pending_review, reviewer/decision còn null.
- `ALLOWLIST.json`: 7.311 entries có origin, hash, bytes, role và screening basis. `OMISSIONS.json`: 194 entries cho executable/audit/binary hoặc content không chọn. Không claim đây là bản sao đầy đủ original annotation/runtime package.
- `COORDINATOR_EVIDENCE_LOCATOR.json` tra original paths trong notes tới file đã chọn; chưa viết lại labels/notes để đổi refs. Các checksum manifests lịch sử có thể chứa omitted files; manifest gốc mỗi lượt mới xác định tập preview hiện có.

Checker độc lập xác nhận 7.306 source originals giữ byte, ba label hashes đúng, registry P02 đủ 12 eligible/ba seed và P03 đủ 31/ba seed, 200 HTTP records có body/request-body references đúng hash. Các con số kiểm hồ sơ không là số mẫu hoặc quality metric của bài báo.

Content screening dùng selection theo loại dữ liệu thực, schema/key barrier và scanner chung, có khai phạm vi AI/rule screening. Hai byte hashes của file `authorization` trong P03 history là đường dẫn D18/D19; scanner script cục bộ disambiguate đúng hai JSON scan views, raw giữ nguyên, shared scanner không sửa. Bản preview trước giữ flags cùng source code; không gọi flags trước đó là credential thật hoặc âm thầm sửa raw.

Giữ lượt chuẩn bị đầu dừng do `relative_to` với Windows extended path; sửa utility spelling trên đường dẫn, tạo output mới. Giữ bản v2 có hai semantic false positives, bản v3 hoàn tất với zero unresolved security flags. Không chạy scripts nhận của thành viên hoặc ứng dụng/DB/model trong lượt này.

## Ranh giới còn mở

Đã có **data previews và allowlist**, chưa là hai ZIP review chính thức đã phát hành. Các preview instructions chỉ mô tả trạng thái chuẩn bị; khi assemble release phải đồng bộ hướng dẫn trung lập đầy đủ và metadata/checksum/linkage/omission locator, kiểm portability rồi giữ R1/R2 riêng. Khung hướng dẫn đầy đủ 01/11 và bản readiness cũ được giữ; snapshot readiness mới ghi đúng trạng thái này.

Phần người thật/reviewer không được AI tự hoàn tất: reviewer khác annotator, exposure/notes/checkpoint thật, đối chiếu và quyết định nhãn. Không có danh tính/lịch/approval mới từ lượt này. P01 provider 503 vẫn khai trong technical limitations, không tự ghép output khác contract. Record getPetIds, nested/snapshot IDs và serialization/dataflow P03 vẫn hạn chế; không đổi nhãn theo graph.

Shared output contract/final model/token budget/scoring/test lock/code release và P04 giữ các điều kiện riêng. Chưa gọi model/embedding, tạo prediction/F1/Ragas, accepted labels, áp shared contract, stage/commit/push/merge hoặc gửi gói ra ngoài. Git HEAD `d1f95eb21c71dd6bfb49d2e450142d1290ceda5f`, index rỗng/working tree dirty. Context v0.35 và board/status ghi ACK không bắt buộc và các kết quả hiện hành.
