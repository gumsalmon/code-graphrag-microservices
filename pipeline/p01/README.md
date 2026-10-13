# P01: chuẩn bị bằng một lệnh, không cần Gemini key

Luồng này chạy mới **source → parser → Cypher → Neo4j**, cho baseline và mutated, rồi **Chroma → hai request Vector / Graph+Vector**. Không dùng graph lịch sử thay graph vừa chạy, không gọi AI, đọc nhãn hoặc chấm điểm. Đây là pilot ba file Java, không phải nghiệm thu toàn bộ GraphRAG hoặc kết quả bài báo.

[Báo cáo kiểm chứng 13/10/2026](VERIFICATION_2026-10-13.md) ghi kết quả đã chạy, môi trường, ca lỗi và giới hạn; phân biệt candidate chưa commit với checkout sạch của một SHA đã công bố.

Source baseline được lấy từ byte có checksum trong bundle kỹ thuật, đối chiếu lại với fixture của implementation đã pin. Không giả định có một PetClinic checkout bí mật trên máy. Patch chỉ thêm `includeDetails` bắt buộc; request dự đoán dùng **baseline + proposed patch**, không dùng source mutated, log HTTP hoặc nhãn làm đáp án.

## Điều kiện

- Node.js 24 trở lên, Git, Docker với Linux engine đang chạy. Môi trường đã kiểm: Windows x64 / Docker Desktop, container Linux amd64. Chưa xác minh native macOS/Linux/ARM.
- Implementation riêng, clean tại `e95613795133088621117179c9fb9592dab62b16`. PR của Hiển chưa cần merge; runner không sửa clone này.
- Python image có sáu dependency chính được pin và Neo4j 5.26.0 ở đúng digest bên dưới.
- Model cache ONNX all-MiniLM-L6-v2 đã chuẩn bị. Prepare không tải model, image hoặc dependency nếu thiếu.
- **Không cần Gemini key, tài khoản paid hoặc billing.** Nên dùng môi trường không cấu hình credential để kiểm prepare.

Chạy mọi lệnh từ gốc repository. Thư mục `handoff-out` là dữ liệu cục bộ, Git ignored. Không đưa model cache, credential, database hoặc raw model response lên GitHub.

## Thiết lập một lần (có tải dependency công khai)

Chỉ dùng đường dẫn mới; không ghi đè một clone/cache đang có. Nếu đã có dependency tương ứng, có thể bỏ qua setup và dùng các tùy chọn đường dẫn ở mục sau.

```powershell
git clone --no-checkout https://github.com/gumsalmon/code-graphrag-microservices.git handoff-out/p01-deps/implementation
git -C handoff-out/p01-deps/implementation sparse-checkout set --no-cone /src/ /data/baseline/ /data/mutated/ /verify_neo4j_live.py /requirements.txt
git -C handoff-out/p01-deps/implementation -c core.autocrlf=false -c core.longpaths=true checkout --detach e95613795133088621117179c9fb9592dab62b16
docker build --platform linux/amd64 --tag code-graphrag-p01:py311 pipeline/p01
docker pull neo4j@sha256:5a015e53de1895e7eee1574ae0325cf8c4b89587222778108c594bdd45a474b5
New-Item -ItemType Directory -Path handoff-out/p01-deps/model-cache
```

Chuẩn bị model cache bằng lệnh dưới. Đây là bước setup **có mạng và có thể tải model**, không phải prepare offline; không truyền key hoặc Docker socket. PowerShell chỉ lấy đường dẫn thư mục hiện tại, không chứa secret:

```powershell
$p01CachePath = (Resolve-Path handoff-out/p01-deps/model-cache).Path
docker run --rm --mount "type=bind,source=$p01CachePath,target=/root/.cache" --env ANONYMIZED_TELEMETRY=False code-graphrag-p01:py311 python -c "from chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2 import ONNXMiniLM_L6_V2; e=ONNXMiniLM_L6_V2(preferred_providers=['CPUExecutionProvider']); print('dimension='+str(len(e(['P01 cache setup'])[0])))"
```

Kỳ vọng 384 chiều. Khi prepare, runner kiểm archive SHA-256 `913d7300ceae3b2dbc2c50d1de4baacab4be7b9380491c27fab7418616a16ec3` và probe kiểm sáu file giải nén khớp archive, trước/sau không thay đổi. Thiếu/sai cache thì dừng, không tải bù. Dockerfile pin base digest và sáu dependency chính; phiên bản transitive được ghi trong report, **chưa phải full dependency lock**.

Sparse checkout giữ đúng commit nhưng không checkout evidence/output/tests lịch sử không cần cho runtime. Điều này tránh đường dẫn evidence quá dài trên Windows và không đưa label/acceptance fixture vào container. `core.longpaths`/`core.autocrlf` ở lệnh trên chỉ áp dụng cho process checkout, không sửa Git config toàn máy. Nếu setup cũ thất bại giữa chừng, giữ nó để kiểm tra và dùng thư mục mới; không tự reset/xóa một checkout đang có thay đổi.

## Lệnh chuẩn bị

```powershell
node scripts/run_p01_pipeline.mjs prepare
```

Hoặc chỉ định dependency đã có, dùng đường dẫn tương đối hoặc tuyệt đối của máy đang chạy:

```powershell
node scripts/run_p01_pipeline.mjs prepare --implementation PATH_TO_PINNED_CLEAN_CLONE --model-cache PATH_TO_MODEL_CACHE --python-image IMAGE_ALREADY_INSTALLED
```

Mặc định top-k 5, depth 2, ceiling 32768 byte. Có `--top-k`, `--depth`, `--context-bytes`; không thay cấu hình để làm prediction khớp nhãn. Mỗi lượt tạo thư mục mới dưới `handoff-out/p01-pipeline`, không ghi đè run cũ.

Kết quả thành công: `prepared_fresh_graph_and_retrieval_no_llm`, `remote_llm_calls=0`, `labels_read=false`. Hai Neo4j mới có database trống trước import; import lặp không đổi inventory. Chỉ có network nội bộ riêng, không publish port, không volume/database người dùng và không Docker socket trong Python container. Chroma chạy `network none`, cache/code read-only. Container/network có tên và nhãn riêng, dọn sau khi chạy; giữ evidence và database Chroma riêng của run.

`NEO4J_AUTH=none` chỉ áp dụng cho container thử trong network nội bộ, không public port; không dùng cấu hình này cho server dùng chung hoặc môi trường public.

## Đầu ra và kiểm lại

- `baseline/`, `mutated/`: source snapshot, parser JSON, Cypher, query Neo4j, inventory, import log và environment; patch ở mutated.
- `retrieval/`: corpus/ranking/model identity và token audit embedding; database riêng không thuộc manifest immutable.
- `vector-request.json`, `graph-vector-request.json`: prompt, context, schema và checksum; hai `*-provider-request.json` là payload offline, không chứa key.
- `experiment-plan.json`, `prepared.json`, `result.json`, code before/after, lệnh/container exit/stdout/stderr, cleanup và `checksums.sha256`.

Kiểm read-only, không cần Docker/key:

```powershell
node scripts/check_p01_pipeline.mjs --run PATH_TO_RUN
```

Checker kiểm manifest/path/symlink, nguồn/patch, provenance rồi dựng lại request/payload. Nếu có failure/integrity record thì không nhận run. CLI prepare exit khác 0 khi lỗi, giữ log thật và không tạo prediction/score. Không coi test pass hoặc checksum là nhãn tác động đã được reviewer duyệt.

`.gitattributes` giữ LF cho bundle đã checksum trên Windows/Linux, tránh Git tự đổi byte `data.js` thành CRLF. Không tự sửa checksum để che thay đổi byte.

Graph request có run ID và checksum của **lượt Neo4j mới** nên có thể khác hash giữa hai lượt, kể cả graph nội dung tương đương. Không sửa run ID thành ID lịch sử để tạo tái lập giả. Vector request có thể giữ hash nếu corpus/ranking/source không đổi. Context mới không ghi đè hai request v2 đã đóng băng của thử nghiệm 13/10.

## Gọi AI là bước riêng, không tự chạy

Sau khi được xác nhận, dùng [hướng dẫn Gemini](../../reasoning/p01/GEMINI_SETUP.md) và runner reasoning với `--provider gemini --model gemini-3.8-flash --thinking-level medium --max-output-tokens 8192 --confirm-send --confirm-free-tier`, chỉ rõ từng request. Một attempt mỗi cấu hình, không retry/fallback. Nếu provider trả 503, lưu lỗi và giữ usage null; không thay bằng output smoke v1.

Viewer hiện chỉ nhập request/response v1, chưa có menu context v2. Prepare mới không tự đổi viewer hoặc đóng gói prediction vào demo. Hai context v2 bàn giao qua CLI/JSON.

## Giới hạn nghiên cứu

Vector và Graph+Vector dùng cùng source excerpts/patch/query/top-k/registry/prompt/schema/ceiling; Graph+Vector thêm graph **kèm metadata/bằng chứng cạnh**, không chỉ adjacency trần. Graph dài hơn, chưa chứng minh ngang token/cost. Top-5 hiện chỉ ở provider; không đổi selection để ép có caller. Registry 5 method chưa phải evaluation universe được thẩm định độc lập.

Luồng này kiểm phụ thuộc kỹ thuật, không tái chạy hành vi HTTP của ứng dụng PetClinic, suy ra phần mã bắt buộc sửa hoặc tạo nhãn negative. Chưa có full-repo retrieval, lexical baseline, traversal từ semantic seed, general 3-hop, API/Service prediction, full transitive lock hoặc điểm F1/Ragas chính thức. P01 vẫn `pending_review`; không mở P02–P04/khóa split hoặc thay reviewer/gói source-first.

## Kiểm thử code và chuẩn bị phạm vi công bố

```powershell
node --test pipeline/p01/pipeline.test.mjs reasoning/p01/retrieval.test.mjs reasoning/p01/gemini.test.mjs reasoning/p01/reasoning.test.mjs demo/p01/demo.test.mjs
node scripts/package_p01_candidate.mjs
```

Đóng gói candidate dùng allowlist source, tạo manifest và `publication-scope.json` trong thư mục mới, không stage/commit/push. Không lấy nguyên toàn bộ working tree vì còn có công việc reviewer/literature/handoff khác. Mọi phê duyệt công bố và review nhãn là bước riêng.
