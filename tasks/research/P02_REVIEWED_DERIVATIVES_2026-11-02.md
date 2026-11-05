# Tích hợp P02 reviewed trong lúc chờ Hiển

Huy đã báo gửi gói P03 và phản hồi P02; [delivery record](../DELIVERY_REPORTED_2026-11-02.md) ghi theo lời báo, chưa ACK/ETA/return mới. Cả hai checkpoint nhãn đã đủ cho kỹ thuật theo D20, không giao lại việc đã xong cho Phát hoặc làm song song task parser P03 của Hiển.

Đã hoàn tất hai phần tích hợp độc lập: chuẩn bị context từ **baseline source + proposed patch**, và bộ xem offline từ **native evidence hai snapshot**. Chúng dùng run P02 reviewed đã được kiểm độc lập, giữ code/evidence cũ; không chạy parser/Docker/Neo4j mới, không model/embedding/scoring hoặc áp shared output contract.

## Identity và kiểm đầu vào

[Guard mới](../../pipeline/p02/reviewed-native.mjs) pin native manifest `42e48fbf04beb48bf79ff84812d4476c05f5286056a19621fdf86b9d0945b978`, receipt P02/D20 và implementation profile `c1f8aed32565e50512f4cdea32742892b0ae2ea3db4a2177846c69fef88051a0`. Không sửa pin/default của entry points cũ. Bốn guard tests đạt: từ chối manifest cũ, code hoặc input policy lệch, parity/inventory thiếu và audit có model calls. Đây là kiểm ranh giới kỹ thuật, không là review ground truth.

## Context P02 hiện hành

- Run: `handoff-out/p02-static-context-reviewed/20261102T154557244Z-67f6d9ea`; manifest `4ef4d1ced6f18c42a26bfeb788c72df97a15e61c9d1156d34d941e5d165fd878`, **26 listed files**.
- Bảy previews: lexical BM25; graph 1/2/3 hop; graph + lexical 1/2/3 hop. Corpus chung ba baseline files, seed source/patch bắt buộc. Lexical chuẩn bị trước khi load graph; không dùng graph pool cắt corpus lexical hoặc đưa mutated source, labels/notes/raw outcomes vào input.
- Core selection/packing cũ giữ byte; entry point/checker mới chỉ dùng reviewed identity đã kiểm và ghi provenance mới. Checker độc lập ràng buộc lại receipt, authority/input lock, source/patch/native manifest và edge assumptions/evidence.
- Byte cap 32.768 là toàn JSON context preview, chưa full provider request/token budget. Không là dense/vector retrieval hay cấu hình LLM đã hoàn tất.
- Cả bảy `context.txt` **giống byte bản context trước**: corpus/source/patch và saved witness paths không đổi, bốn helper thêm vào inventory không nối vào tuyến seed. Không suy rằng mở rộng inventory tự cải thiện coverage tác động, chất lượng retrieval hoặc điểm số. Bảy previews là một development scenario, không bảy thí nghiệm độc lập.
- Guard overflow cap 0: bảy `input_not_packable`, exit 1/context null. Copy source bị sửa và seal lại vẫn bị checker từ chối vì lệch native source đã pin. Không sửa bản gốc, bỏ seed/patch để vượt cap hoặc gọi đó là model failure.

Lệnh từ gốc repo:

```powershell
node --test pipeline/p02/reviewed-native.test.mjs
node scripts/prepare_p02_reviewed_static_context.mjs --run handoff-out/p02-offline-method-reviewed/20261102t140320547z-03c452f7
node scripts/check_p02_reviewed_static_context.mjs --run NEW_CONTEXT_DIRECTORY
```

## Bộ xem native evidence

[Hướng dẫn xem](../../demo/p02-native/REVIEWED_VIEW.md) dẫn HTML mới, standalone/offline, chín Methods và đủ 8/8 eligible, full parity đạt. Hai snapshot dùng raw data đã lưu, 20 artifacts tải đúng byte. Bốn helpers mới bấm được source mà không thành reachable candidate hoặc nhãn negative. Giữ unresolved/source/hop/seed/contract metadata và code/source identity.

Run build `handoff-out/p02-native-inspector-reviewed/20261102T155422536Z-619e6cc6`, manifest `c5d80190c94d580e380f41fda58d275b22b14fb602d1e6bfec7dd5c3c48fd521`, **6 listed files**. QA `handoff-out/p02-native-inspector-reviewed-qa/20261102T155439471Z-8d9678ea`: 11 browser checks đạt, không page/CSP error hoặc HTTP request, raw source/JSON downloads khớp, relocated HTML chạy được. Xem ảnh desktop/mobile xác nhận bố trí tuyến ngang và inventory riêng trên desktop, tuyến dọc trên mobile; render không thay tập node/cạnh/path.

Giữ build/QA đầu `20261102T154802633Z-3181edf2` / `20261102T154858214Z-f84adcf9`: kiểm máy pass 11, ảnh có khoảng trống lớn do dùng bố trí cũ với inventory mới. Đã sửa renderer/CSS reviewed riêng, không sửa app/CSS hoặc artifact 01/11. Source builder/QA đầu được tái dựng sau đổi layout, hash khớp records ban đầu; không gọi đó là source copy đồng thời hoặc giả lượt trước fail. Đây là cải thiện hiển thị, không scientific rerun.

Audit/commands/stdout/stderr/negative guards và comparison tại `handoff-out/p02-reviewed-derivatives-audit/20261102T154516369Z-4904b2fd`; [status](../P02_REVIEWED_DERIVATIVES_STATUS_2026-11-02.json) giữ hashes và kết quả cuối. Các mẫu scan view/decoded bytes nếu dùng được khai đúng, không sửa scanner hoặc raw để pass.

P03 actual extraction/DB/retrieval vẫn chờ Hiển trả mốc C; nhãn P01–P03 pending_review, R22 inference/20 unresolved không đổi. Chưa prediction ba cấp, final model/chunk/token policy, dense retrieval, accepted/test lock/scoring, commit/push/merge hoặc P04. Bộ xem không gửi sang annotator/source-first reviewer và không chứng minh GraphRAG hơn baseline.
