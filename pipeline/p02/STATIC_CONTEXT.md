# P02 — chuẩn bị context từ baseline source và proposed patch

Bản context hiện hành từ reviewed native run: `node scripts/prepare_p02_reviewed_static_context.mjs --run handoff-out/p02-offline-method-reviewed/20261102t140320547z-03c452f7`, kiểm bằng `node scripts/check_p02_reviewed_static_context.mjs --run NEW_CONTEXT_DIRECTORY`. [Status](../../tasks/P02_REVIEWED_DERIVATIVES_STATUS_2026-11-02.json) và [báo cáo](../../tasks/research/P02_REVIEWED_DERIVATIVES_2026-11-02.md) ghi pin mới, 7 context texts bằng byte bản cũ; core/pins/artifacts trước giữ nguyên.

Cập nhật 02/11: [bản sửa P02 mới đã kiểm độc lập](../../tasks/P02_TECHNICAL_RETURN_STATUS_2026-11-02.json) đạt full-property parity và đủ 8/8 eligible Methods. Artifact/runner/inspector/context ngày 01/11 được mô tả bên dưới giữ snapshot cũ, chưa tự rebuild hoặc đổi pin; không đọc các giới hạn cũ như trạng thái code mới. Runner/checker reviewed 02/11 và candidate profile được dẫn trong status.

Đây là thành phần tích hợp đã chạy trên P02 theo receipt/D20 hiện hành, tách khỏi parser/importer Hiển và annotation Phát. Không dùng prototype synthetic bằng cách đổi marker thành PetClinic. Không áp hợp đồng output ba cấp, tạo prediction, gọi model/embedding hoặc chấm điểm.

## Đã làm được

- Corpus chung là toàn bộ ba file baseline đã pin. Đơn vị retrieval trong preview là **whole source file**, chưa là chính sách chunking cuối của bài báo.
- Query tất định từ known seed + patch byte đúng input lock. Seed file và patch bắt buộc, không dùng expected outcomes, nhãn hoặc notes.
- Lexical BM25 đọc toàn corpus và không đọc graph để chọn nguồn. K1=1.2/b=0.75, Unicode/camel-case, tie theo file ID; ranking score không là CIA metric.
- Graph dùng saved native Neo4j traversal baseline ở 1/2/3 hop. Combined union graph trước rồi lexical, dedup file. Đây là lexical+graph, chưa dense/vector GraphRAG.
- Mọi phần của JSON preview, gồm source, patch, seed và metadata route, được tính UTF-8 byte. Metadata cạnh giữ assumptions/evidence gốc. Witness thiếu source được pack thì giữ ở ledger bỏ, không lén đưa path ngoài context.
- Xuất context text, selection/drop ledger, raw source/patch copies, input/code hashes, preservation và checksum; không sửa artifacts gốc.

## Dùng artifact đã kiểm

Run hiện hành: `handoff-out/p02-static-context/20261101T163443406Z-ec587653`. Mở `SUMMARY.json`, rồi từng `lexical/`, `graph-h1..h3/`, `combined-h1..h3/` để đọc `context.txt` và `selection.json`.

| Cấu hình chuẩn bị | Source files được giữ | Candidate Method từ graph đã lưu | Dung lượng preview |
|---|---:|---:|---:|
| Lexical | 3 | Không dùng graph | 10.893 bytes |
| Graph 1 hop | 2 | 1 | 11.350 bytes |
| Graph 2 / 3 hop | 3 | 2 | 17.778 bytes mỗi cấu hình |
| Combined 1 hop | 3 | 1 | 15.077 bytes |
| Combined 2 / 3 hop | 3 | 2 | 17.778 bytes mỗi cấu hình |

Đây là bảy cấu hình context của **một ca development**, không là bảy thí nghiệm LLM/scenario độc lập. Corpus nhỏ làm các source sets trùng nhiều; chưa có bằng chứng chất lượng retrieval hoặc GraphRAG hơn baseline.

## Chạy và kiểm

Từ gốc repo:

```powershell
node --test pipeline/p02/static-context.test.mjs
node scripts/prepare_p02_static_context.mjs --run handoff-out/p02-offline-method/20261101t061314799z-a263deac
node scripts/check_p02_static_context.mjs --run NEW_CONTEXT_DIRECTORY
```

Có thể dùng `--byte-limit INTEGER` để kiểm packing. Khi mandatory không vừa, runner giữ input_not_packable/failure và trả exit 1, không bỏ seed/patch hoặc gọi model. Preview dùng cap kỹ thuật mặc định 32.768 bytes, **không phải full provider request hoặc token budget đã chốt**; system prompt/schema/output overhead và provider tokenizer chưa nằm trong phép đo này.

Loader chỉ nhận đúng P02 receipt/native manifest đã kiểm, đọc baseline source và patch. Mutated source, raw runtime benchmark và label content không đi vào component. Metadata INPUT gốc có identity của cả hai snapshot, nhưng context chỉ lấy baseline và change information cho phép. Các route lexical không dùng graph-selected corpus; graph artifacts được load sau khi lexical pack đã được chuẩn bị.

Run native mới sau code Hiển cần intake/audit và pin thích hợp, không tự dùng pin cũ. Graph hiện vẫn có giới hạn inventory/resolution/parity đã báo; context builder không sửa chúng hoặc gán âm cho node thiếu. Registry/output ba cấp, scorer/failure policy, token/model budget và inference là các phần riêng. Tài liệu Methods/readiness 01/11 trước lượt này giữ snapshot lịch sử; [status context hiện hành](../../tasks/P02_STATIC_CONTEXT_STATUS_2026-11-01.json) bổ sung tiến độ, không rewrite các bản đã seal.

Artifact dành cho luồng kỹ thuật, không gửi sang annotator hoặc lượt source-first của reviewer. Hướng tiếp là dùng component này trong request/transport phù hợp sau quyết định về output/model/budget; một preview hợp lệ chưa là phản hồi AI hợp lệ hoặc kết quả bài báo.
