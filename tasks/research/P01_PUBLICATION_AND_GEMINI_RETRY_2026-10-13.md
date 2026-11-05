# P01 — công bố nhánh kỹ thuật và thử lại cặp Gemini, 13/10/2026

## Kết quả

**Commit/push và kiểm checkout sạch đã hoàn tất. Cặp inference v2 chưa có output hợp lệ: cả hai lượt mới trả 503 high demand.** Không coi chuẩn bị pipeline thành công là thành công của inference hoặc kết quả bài báo.

Phạm vi 38 file kỹ thuật đã được phê duyệt. Đã đọc toàn bộ `PROJECT_CONTEXT.md`, kiểm status/diff, fetch origin, kiểm candidate/index hashes trước commit và không sửa protocol/nhãn/gói reviewer. Không merge vào main, force push, mở PR hoặc gọi API ngoài hai attempt được duyệt.

## Commit và remote

- Commit: [`d1f95eb21c71dd6bfb49d2e450142d1290ceda5f`](https://github.com/gumsalmon/code-graphrag-microservices/commit/d1f95eb21c71dd6bfb49d2e450142d1290ceda5f).
- Message: `feat: add reproducible P01 preparation pipeline`.
- Nhánh được push: `codex/p01-evidence-demo`; upstream `origin/codex/p01-evidence-demo`. Remote ref đã đối chiếu đúng SHA commit.
- `origin/main` trước/sau push vẫn `65e41a2b4fafa0d37fdd2779985d131a3c7dc116`. Chỉ tạo nhánh kỹ thuật mới, không thay main hoặc merge PR của Hiển/Phát.
- [Hướng dẫn public ở đúng commit](https://github.com/gumsalmon/code-graphrag-microservices/blob/d1f95eb21c71dd6bfb49d2e450142d1290ceda5f/pipeline/p01/README.md). Người đọc cần mở nhánh/commit này, không mặc định thấy code mới trên main.
- Candidate 40 file có 2 file nền không đổi (`PROJECT_CONTEXT.md`, `.gitignore`); **38 file staged/committed**, 37 file mới và README sửa. Mọi Git blob staged của 38 file khớp hash candidate đã duyệt; staged diff/check được kiểm trước commit. Không bao gồm key/cache/database/raw Gemini responses hoặc công việc reviewer/literature khác.
- Lượt commit đầu dừng vì chưa cấu hình Git identity. Ba commit gần nhất có cùng author `gumsalmon`; lệnh commit dùng lại name/email từ lịch sử cho riêng process, không sửa global Git config hoặc giả một identity khác.

## Checkout sạch của SHA chứa code mới

Clone kiểm độc lập: `handoff-out/p01-commit-qa-20261013-b10c3f62/project`. Checkout detached đúng `d1f95eb21c71dd6bfb49d2e450142d1290ceda5f`, `core.autocrlf=true` cho process checkout. Không overlay candidate hoặc chỉnh source sau checkout.

- Git status sạch trước và sau toàn bộ test/prepare/browser QA; implementation dependency sparse checkout riêng sạch tại `e95613795133088621117179c9fb9592dab62b16`.
- Không file Gemini credential trong clone, không Gemini/Google key trong env. Prepare không gọi API; cache là bản sao weights riêng, không gọi model/download hoặc lấy lại graph/database lịch sử.
- Bundle vẫn SHA-256 `053fe6c2caa4c7b47c8fa40d413ebd3c00ea22828c52f56fb1c902081f041689`; LF attributes giữ đúng byte dù checkout Windows CRLF được bật.
- **77/77 Node tests pass, 0 fail/skip**, gồm 10 pipeline/publication guards và 67 test reasoning/retrieval/Gemini/viewer trước đó. Đây là các test offline/fixture tổng hợp, không 77 lần inference hoặc ground-truth acceptance.
- **16 nhóm browser checks pass**, Chrome `155.0.8059.40`, desktop/mobile/file://; không external request/browser error. Browser server tạm đã đóng sau test.
- Lệnh mặc định `node scripts/run_p01_pipeline.mjs prepare` chạy mới parser/Cypher/Neo4j baseline và mutated, Chroma rồi tạo request v2; status `prepared_fresh_graph_and_retrieval_no_llm`, **0 remote LLM calls**.
- Checker đạt **46/46 file manifest**, dựng lại request/payload, kiểm source/patch/provenance và cleanup. Git/code before/after giữ SHA/status đúng, dependency vẫn sạch. Neo4j/network/container tạm của run đã dọn; giữ evidence/database Chroma riêng/cache/image để kiểm lại, không xóa dữ liệu người dùng.

Evidence:

- [Checkout trước](E:/NCKH/code-graphrag-microservices/handoff-out/p01-commit-qa-20261013-b10c3f62/checkout-before.json), [checkout sau](E:/NCKH/code-graphrag-microservices/handoff-out/p01-commit-qa-20261013-b10c3f62/checkout-after.json).
- [Node log gốc](E:/NCKH/code-graphrag-microservices/handoff-out/p01-commit-qa-20261013-b10c3f62/node-tests.log), SHA-256 `235166ca1a98e38e40c46cae2b5d03d59123d045a9cd1a29a48252ed6b5f5967`.
- [Run pipeline mới](E:/NCKH/code-graphrag-microservices/handoff-out/p01-commit-qa-20261013-b10c3f62/project/handoff-out/p01-pipeline/20261013T144939797Z-68149583/result.json), [checker](E:/NCKH/code-graphrag-microservices/handoff-out/p01-commit-qa-20261013-b10c3f62/pipeline-check.json), SHA-256 checker `ada797330ddaeee2b5bdbd1fc21a60b28204446ae73367084b2ea5575853b821`.
- [Browser report](E:/NCKH/code-graphrag-microservices/handoff-out/p01-commit-qa-20261013-b10c3f62/project/handoff-out/p01-demo-qa-20261012/20261013T145156631Z-429caac3/browser-report.json).
- SHA-256 `checkout-after.json`: `2cf38c4b1e81aab14a6ee34e06d2a906ce5b76e89b41ffb61ed41965bad8a3c5`.

Report public trong commit là hồ sơ **giai đoạn candidate trước commit**. Các kết quả checkout sạch theo SHA mới ở trên được ghi bổ sung trong report cục bộ này; không sửa lại lịch sử hoặc tự commit thêm ngoài phạm vi đã duyệt.

## Hai lượt Gemini sau push

Dùng đúng cặp đã đóng băng trong `handoff-out/p01-retrieval/20261012T151104176Z-89ba55ec`, không dùng graph request mới từ run pipeline vừa tạo. Checker kiểm lại 18/18 file của retrieval cũ, so corpus/ranking/request hashes với run độc lập trước đó, đều khớp.

- Vector request SHA-256 `a7278d6656422e333f0d985932430734e7d2a4804b89cb2882e89c64b1e2c4c0`, context 8860 byte.
- Graph+Vector request SHA-256 `069af7bbb66613d162b5f7ef1b1eb3c6281b55b882f6dfd613ca82cd3ce8b09f`, context 14424 byte.
- Cùng source excerpts/patch, seed/registry/query/top-k, prompt/output schema/ceiling. Cấu hình chung `gemini-3.8-flash`, thinking MEDIUM, output cap 8192, MIME enum APPLICATION_JSON; một attempt/config, chạy Vector trước.
- Key DPAPI đọc được qua doctor không in giá trị. Free Tier là xác nhận của người dùng, không được suy ra từ metadata API. Không bật billing/đổi model hoặc sửa key để xử lý lỗi 503.

| Cấu hình | Run ID | HTTP / status | Thời gian đến lỗi | Attempt / retry | Usage |
| --- | --- | --- | ---: | --- | --- |
| Vector | 20261013T145356184Z-failed-5038d477 | 503 / UNAVAILABLE | 2490 ms | 1 / 0 | null |
| Graph+Vector | 20261013T145439932Z-failed-978b8d99 | 503 / UNAVAILABLE | 3166 ms | 1 / 0 | null |

Provider của cả hai báo model đang có nhu cầu sử dụng cao, đề nghị thử sau. Đây không phải thông báo yêu cầu bật billing. Cả hai CLI exit 1; không returned model version/final text/prediction/response ID hoặc usage. Requested model không được coi là returned model đã kiểm. Không biến null thành 0, bịa chi phí hoặc so thời gian lỗi thành latency inference.

- [Vector failure](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261013T145356184Z-failed-5038d477/run.json), `run.json` SHA-256 `dee547835b0cb57ccae71f630d7e3652e7af4abc56dc51822a84dc620ff081f1`.
- [Graph+Vector failure](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261013T145439932Z-failed-978b8d99/run.json), `run.json` SHA-256 `21d244cd239960175a2db54b4d930d87583f6ec7130c375cc4da895e29982d1f`.
- **4/4 file mỗi run** khớp manifest, request khớp cặp gốc, payload dựng lại khớp, metadata model/config/receipt/count đúng. Code provenance hai run giống nhau, ghi HEAD `d1f95eb21c71dd6bfb49d2e450142d1290ceda5f`, **code_is_uncommitted=false**, 9/9 hash code khớp. Overall working tree có untracked không liên quan, được ghi thật, không che thành sạch.
- Tổng lượt mới: **2 remote attempts, 0 automatic retries**. Prediction/usage comparison, chất lượng/F1/Ragas và cost đều chưa có. Giữ nguyên cặp lỗi trước lúc 13:35 UTC và smoke v1 thành công ngày 12/10, không ghép v1 với v2 để giả so sánh.

## Trạng thái bàn giao

Nhánh local đã đồng bộ upstream; tracked diff và staged diff rỗng. Working tree chính **không hoàn toàn sạch** vì vẫn có các file untracked reviewer/handoff/research đã giữ lại, gồm report này. Credential và toàn bộ run/cache/QA dưới `handoff-out` vẫn Git ignored, không lên GitHub.

Báo cáo này chưa commit/push; phần công bố đúng 38 file đã được duyệt đã hoàn tất. Main, `PROJECT_CONTEXT.md`, nhãn/benchmark/protocol, raw runtime và reviewer package không bị sửa. P01 vẫn `pending_review`; P02–P04 chưa mở/khóa split/chấm chính thức. Thành công chuẩn bị và test không thay review độc lập, không chứng minh GraphRAG hơn baseline hoặc tạo ground truth.

Chỉ phần suy luận của cặp v2 đang chờ provider. Không tự lập lịch/retry hoặc đổi model sau hai lỗi mới; vẫn có thể tiếp tục công việc kỹ thuật offline trong phạm vi được giao. Lượt API tiếp theo cần quyết định rõ, giữ cùng input/config và lưu toàn bộ lỗi; nếu muốn đổi model phải tạo cấu hình so sánh mới và chạy cả hai nhánh, không thay một nhánh âm thầm.
