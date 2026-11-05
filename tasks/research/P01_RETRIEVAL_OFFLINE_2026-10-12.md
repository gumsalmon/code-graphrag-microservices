# P01 — bước 4, Chroma và đối chứng context offline, 12/10/2026

> Đây là hồ sơ lịch sử của phần offline. Smoke graph-assisted v1 bước 3 đã đạt sau đó ngày 12/10; cặp request v2 đã thử ngày 13/10 nhưng cả hai trả 503, chưa có output để đối chiếu. Xem [báo cáo API cặp v2](E:/NCKH/code-graphrag-microservices/tasks/research/P01_GEMINI_PAIRED_ATTEMPT_2026-10-13.md); bằng chứng và kết quả offline bên dưới được giữ nguyên.

## Kết quả và ranh giới

**Hoàn thành phần offline của bước 4:** tái sử dụng Chroma của Hiển, index/query thật trên baseline corpus có provenance và tạo hai request Vector RAG/graph-augmented vector có điều kiện chung. Không gọi Gemini hoặc dùng credential thật; chưa có dự đoán LLM, điểm F1/Ragas, review độc lập, split khóa hoặc nghiệm thu GraphRAG E2E.

Đọc toàn bộ `PROJECT_CONTEXT.md` trước khi hành động. Git ở `codex/p01-evidence-demo`, các file triển khai/demo mới còn untracked; giữ nguyên tracked files, code/clone của Hiển, protocol/labels của Phát, raw evidence, gói reviewer và `demo/p01/data.js`. Không stage, commit, push hoặc merge. Trạng thái kỹ thuật mới được phân biệt với các giới hạn cũ trong tài liệu bối cảnh.

## Phần được tái sử dụng và phần mới

- Hiển implementation `e95613795133088621117179c9fb9592dab62b16`: dùng nguyên AST chunker, store và `query_impact`, không sửa parser/Neo4j/Chroma của Hiển. Code `chroma_baseline.py` hash `b124d9516ec3b15d6cf70deed7933a077a19562486ae664c019e6253f9fb02d5`, `parser.py` hash `349be1e5694505e2d14d0cceed0bc3d22411406bd7708286bc15d534edbf68fb`.
- Adapter Python mới chỉ nhận packet source/seed/query allowlist, upsert cùng document representation của `index_files` và lấy đầy đủ corpus/source span. Không gọi legacy `compare_with_graph_hops` hoặc dùng graph làm ground truth.
- `retrieval-context.mjs`: ghép top-k + known seed + parent headers, không graph-selected source enrichment; source excerpt được đối chiếu trực tiếp file baseline.
- Core shared mở rộng request/context v2, hỗ trợ source excerpts và hai mode mới; giữ nguyên prompt/output schema và hash các request v1.
- Runner tạo database/container mới, context/request/provider payload offline, provenance/log/checksum; checker chỉ đọc, dựng lại request và so run.
- Xem [hướng dẫn chạy](E:/NCKH/code-graphrag-microservices/reasoning/p01/RETRIEVAL_SETUP.md).

## Nguồn cố định và môi trường thực thi

PetClinic `3858f9c630cf989bb6809a86edf47c2be78dc9f1`; corpus chỉ ba file Java baseline của bước 2. Bundle SHA-256 vẫn `053fe6c2caa4c7b47c8fa40d413ebd3c00ea22828c52f56fb1c902081f041689`.

Docker Engine 29.8.0, image Python đã có `sha256:63c6e72e510d658265cf956b0e589ec7b55c6049b766b6b68120253f7ee06281`, Python 3.11.16. Chroma 1.5.9, tree-sitter 0.25.2, Java 0.23.5, Go 0.25.0; phiên bản ONNX/tokenizers thực trong retrieval report. Không giả định requirements là full transitive lock.

Container `network none`, `--pull never`, root/code/cache chỉ đọc, cap-drop ALL, no-new-privileges; 2 CPU, memory 2 GiB, tmpfs `/tmp`. Không Docker socket, port, environment key hoặc thay cấu hình Docker Desktop toàn máy. Database riêng trong run root. Container thử đã tự dọn; chỉ giữ artifact/cache riêng, không xóa dữ liệu người dùng.

Model cache riêng bước 1: ONNX all-MiniLM-L6-v2, archive hash `913d7300ceae3b2dbc2c50d1de4baacab4be7b9380491c27fab7418616a16ec3`. Lượt cuối kiểm sáu file giải nén khớp archive bằng cách đọc tar members, không extract/ghi cache, và hash trước/sau không đổi. `_download` bị chặn; network none là ranh giới thực thi thêm.

Ban đầu Docker engine chưa chạy; đã kiểm dưới Windows user thật rồi hỏi người dùng bật Docker, không tự thay hạ tầng. Không có Python native được phát hiện; dùng đúng môi trường container đã tái hiện trước đó.

## Retrieval thật đã quan sát

Hai run độc lập, khác Python process/container/database:

1. [Run đầu](E:/NCKH/code-graphrag-microservices/handoff-out/p01-retrieval/20261012T145915661Z-5efcabcf/run.json).
2. [Run cuối sau bổ sung kiểm archive/provenance](E:/NCKH/code-graphrag-microservices/handoff-out/p01-retrieval/20261012T151104176Z-89ba55ec/run.json).

Cả hai: **13 AST chunk** (3 class header, 9 method, 1 record), 384 chiều, top-k 5, query từ seed + dòng thay đổi, squared L2. Mở lại PersistentClient trong cùng process cho cùng ranking; hai index mới trên hai process cũng cho cùng corpus/ranking/distances/request hashes. Không suy thành bảo đảm bit-identical trên mọi CPU/platform/library.

Corpus SHA-256 `83e83b2b8841b5b6d9c9d30885df275265e0af918896e7a7fd13d6141dd77117`. Query có **118 token embedding trước truncation**; không document nào vượt cap 256 trong lượt này. Chroma ONNX có truncation cap 256 theo [source 1.5.9](https://github.com/chroma-core/chroma/blob/1.5.9/chromadb/utils/embedding_functions/onnx_mini_lm_l6_v2.py); đây không phải số token Gemini. Report lưu audit từng document và identity sáu model files.

Top-5 thực lần lượt là `VisitResource.read(List<Integer>)`, `create(Visit,int)`, record `Visits`, `read(int)`, class header VisitResource. Client/controller không được truy xuất trong top-5 này. Không đổi top-k/prompt theo điểm benchmark hoặc ép danh sách khớp graph. **Retrieved context không phải impact prediction**: có overload `read(int)` trong retrieval không tự khẳng định nó chịu tác động, và không dùng verifier exact-set của Neo4j để lọc ranking vector.

stderr giữ warning ONNX không lưu được telemetry device ID trên filesystem chỉ đọc và dùng ID trong memory; không che warning. Các container không có mạng. Thư viện tạo session file tên `:memory:.ses` được Windows/Docker ánh xạ thành ký tự riêng; giữ nguyên trong private run, có checksum, không commit. Checker ASCII-only ban đầu từ chối tên này; checker cuối kiểm basename/path thực, symlink, inventory và checksum, hỗ trợ tên Unicode an toàn. Không đổi bằng chứng để làm checker pass.

## Hai request được bàn giao

| Cấu hình | Source excerpt + patch | Cạnh/path được cấp | Context byte UTF-8 | Request SHA-256 |
| --- | --- | --- | ---: | --- |
| Vector retrieved | 5 AST excerpt + proposed patch | Không | 8860 | `a7278d6656422e333f0d985932430734e7d2a4804b89cb2882e89c64b1e2c4c0` |
| Graph + cùng vector context | Giống hoàn toàn hàng trên | Hai cạnh và đường P01 đã ghi | 14424 | `069af7bbb66613d162b5f7ef1b1eb3c6281b55b882f6dfd613ca82cd3ce8b09f` |

Ceiling chung 32768 byte, known seed, depth 2, cùng corpus/query/top-k/registry/prompt/schema. Provider plan chung Gemini 3.8 Flash, thinking MEDIUM, max output 8192; chưa gọi provider. Cấu hình graph không bổ sung source chunk dựa theo candidate paths. Giới hạn 1/2/3 chỉ lọc các path P01 đã lưu, không tạo graph live hoặc đường 3-hop mới.

Đây là **pilot ablation thêm graph vào cùng vector-retrieved context**, chưa phải phương pháp đầy đủ có contract-aware filtering/traversal từ semantic seeds. Byte ceiling chung không chứng minh ngang token/cost; context graph thực dài hơn. LLM token/time/cost vẫn chưa có, không lấy embedding tokens hoặc fixture usage thay thế.

Shared prediction registry có 5 method kỹ thuật từ parser, nhỏ hơn 9 method của AST corpus. Nó không phải evaluation universe độc lập đã nghiệm thu; cần protocol/reviewer xác định universe phù hợp trước chấm chính thức. Giữ overload, tách dependency/behavior/repair và không ép prediction bằng hai method mong đợi.

## Bằng chứng kiểm chứng

- **67/67 Node tests**, 0 fail/skip: 14 retrieval/context v2, 21 Gemini/key, 21 reasoning/OpenAI, 11 viewer/data/server. [Log gốc](E:/NCKH/code-graphrag-microservices/handoff-out/p01-step4-qa-20261012-62de7b14/node-tests.log). Test response/ranking/usage tổng hợp không được lưu thành research output.
- **8/8 Python guard tests** qua unittest trong container network none: input fields, revision, checksum/LF, allowlist/duplicate, query, top-k và code đổi bị từ chối trước import/model access. Log trong transcript thực thi; không gọi embedding/LLM trong unit tests.
- **16 nhóm browser checks đạt**, desktop/mobile/file://, không external request hoặc browser error. [Browser report](E:/NCKH/code-graphrag-microservices/handoff-out/p01-demo-qa-20261012/20261012T151107320Z-6d4af294/browser-report.json). Viewer vẫn dùng v1; chưa thêm luồng retrieval v2 vào browser.
- Checker cuối xác minh **18/18 file mỗi run**, dựng lại context/request/provider plan, so hai run: corpus, ranking, request hashes đều giống. Database runtime không thuộc manifest immutable; session file ở root có ghi checksum. Không dùng checksum thay kiểm ý nghĩa dự đoán.
- CLI reasoning hiện có nhận cả hai request v2 và tạo provider plan mới, không đọc key hoặc gọi API: [Vector plan](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261012T152431290Z-gemini-plan-2be62d29/run.json), [Graph-vector plan](E:/NCKH/code-graphrag-microservices/handoff-out/p01-reasoning/20261012T152431589Z-gemini-plan-0609dd13/run.json). Đây không phải response model.
- Node test log SHA-256 `9d1defbdd9e938d4d2881845e0635e3df452d2b5915398c2ada5517a7c46bb7b`; staged diff rỗng và `git diff --check` đạt. Các artifact runtime mới nằm trong thư mục Git ignored, các file code/báo cáo mới chưa commit.
- Checker từ chối run path ngoài output root trước đọc file; giải quyết path thực và không nhận symlink evidence.
- Code hashes trước/sau và clone implementation sạch; các request v1 giữ nguyên hash. Không chạy lại suite 59 test Neo4j của Hiển vì không sửa implementation đó.

Lệnh tái hiện/check:

```powershell
node scripts/run_p01_retrieval.mjs --top-k 5 --depth 2 --context-bytes 32768
node scripts/check_p01_retrieval_run.mjs --run handoff-out/p01-retrieval/20261012T151104176Z-89ba55ec --compare handoff-out/p01-retrieval/20261012T145915661Z-5efcabcf
```

## Việc còn lại

1. Bước 3 vẫn chưa có smoke prediction hợp lệ do lượt Gemini trước trả 503. Bước 4 offline không thay việc này; cần xác nhận riêng trước gọi model lại.
2. Khi provider hoạt động, chạy các request đã lưu dưới cùng model/config, giữ failure/usage/provenance thật và hậu kiểm citation/schema; không lấy prediction làm nhãn.
3. Chưa có lexical baseline, graph+contract không LLM, retrieval toàn repo, general multi-hop/live pipeline hoặc API/Service prediction. Không dùng pilot này tuyên bố GraphRAG hơn Vector RAG.
4. Protocol, review nhãn và universe/split/test-lock cần quyết định thật trước chấm chính thức. P01 vẫn `pending_review`, P02–P04 chưa mở.

Phần offline đủ điều kiện bàn giao; chưa phải nghiệm thu nghiên cứu hoặc toàn bộ sản phẩm. Không commit/push/merge, không đổi `PROJECT_CONTEXT.md` hoặc frozen reviewer artifacts.
