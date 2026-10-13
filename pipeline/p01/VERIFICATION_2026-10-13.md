# P01 preparation — kiểm chứng ngày 13/10/2026

Trạng thái: **đạt cho phần chuẩn bị kỹ thuật không gọi LLM**, trong môi trường bên dưới. Không phải ground-truth acceptance, kết quả bài báo hoặc nghiệm thu toàn bộ GraphRAG live.

## Phiên bản và phạm vi

- PetClinic baseline `3858f9c630cf989bb6809a86edf47c2be78dc9f1`, ba file Java có checksum trong bundle, đối chiếu fixture đúng implementation pin.
- Implementation `e95613795133088621117179c9fb9592dab62b16`, giữ nguyên parser/importer/verifier/Chroma; dùng clone riêng clean, sparse checkout chỉ code/fixture runtime.
- Base repository `65e41a2b4fafa0d37fdd2779985d131a3c7dc116`. Code mới là candidate chưa commit: **base checkout sạch trước overlay**, sau overlay các file đề xuất còn uncommitted. Chưa có SHA chứa candidate để kiểm clean checkout sau commit; không trình bày HEAD cũ như commit chứa pipeline mới.
- Chạy mới parser → JSON/Cypher → hai Neo4j riêng → Chroma database riêng → Vector/Graph+Vector requests. Không đọc acceptance-label fixture hoặc draft labels, chạy scorer, gọi Gemini, mở P02–P04 hoặc tự phê duyệt nhãn.

## Kiểm tra đã thực hiện

| Kiểm tra | Kết quả |
| --- | --- |
| Node tests bản candidate cuối | **77 passed, 0 failed, 0 skipped** |
| Browser viewer, desktop/mobile/file:// | **16 nhóm đạt**, không browser errors/external requests |
| Prepare với image đã có trong workspace chính | Thành công; **46/46** file manifest khớp |
| Prepare trong clone mới + dependency/cache riêng, image cũ chỉ định rõ | Thành công; **47/47** file manifest khớp |
| `node scripts/run_p01_pipeline.mjs prepare` mặc định trong clone mới, image recipe vừa build | Thành công; **46/46** file manifest khớp |
| Ca lỗi thật: dùng base Python image không có dependency | Pipeline exit **1**, giữ failure, không có prediction; checker exit **1** từ chối run |
| Cleanup của các run mới | Không còn container/network có đúng nhãn của run |
| Code/source integrity | Before/after không đổi; mỗi request/payload được checker dựng lại và đối chiếu |
| Credential isolation ở clone mới | Không file credential cục bộ hoặc Gemini/Google key trong env; **0 remote LLM calls** |

Số file manifest có thể khác do Chroma tạo session file tùy môi trường; inventory thực và mọi file evidence đều được checker kiểm. Database Chroma runtime không thuộc manifest immutable. Không ép số lượng file hoặc hash của graph request giống lịch sử bằng cách sửa artifact.

Neo4j mới đều trống trước import, import lần hai không đổi inventory và nodes/edges khớp parser mới. Quan sát tuyến client 1-hop và controller 2-hop, mỗi tuyến vượt một service boundary; seed bị loại. Đây là kết quả phụ thuộc kỹ thuật, không nhãn behavioral impact/required repair. Patch mutated khớp proposed patch; source consumer giữ nguyên. Không chạy lại HTTP/gateway của PetClinic.

Chroma thật trả 13 AST chunk trong corpus, top-k 5 vẫn ở provider. Không đổi ranking/top-k để ép lấy caller. Hai context dùng cùng source excerpts/patch/query/registry/prompt/schema/ceiling; Graph+Vector thêm graph kèm bằng chứng cạnh. Vector context 8860 byte, Graph+Vector 14427 byte trong các run chuẩn bị mới. Không tuyên bố ngang token/cost.

## Môi trường và giới hạn tái lập

- Windows x64, Docker Engine 29.8.0, Python 3.11.16 trong Linux amd64 container; Node `v24.19.0`, Chrome `155.0.8059.40` cho browser QA. Chưa xác minh native Linux/macOS hoặc ARM.
- Image cũ đã dùng: `sha256:63c6e72e510d658265cf956b0e589ec7b55c6049b766b6b68120253f7ee06281`.
- Image mới build thành công từ Dockerfile của candidate, `pip check` đạt; image ID đã quan sát `sha256:3a89901c72e437213648b05f0176e56fd3c2b6f556523d9e0e75f81cd9e5fb64`. ID build trên máy khác có thể khác; runner ghi ID thực và dependency versions, không suy thành bit-identical image.
- Base Python và Neo4j pin digest trong Dockerfile/runner; sáu dependency chính được pin. `pip freeze` thực của recipe được lưu riêng; **chưa phải transitive dependency lock có hash wheel**.
- Neo4j không publish port, không dùng volume người dùng; network nội bộ riêng. Python probe không cần Docker socket/TCP relay. Chroma `network none`, cache read-only; model archive và sáu extracted files được kiểm trước/sau.
- Setup recipe có tải dependency công khai; prepare không tải model/image, không cần key/billing. Cache trong clone kiểm thử là bản sao riêng của weights đã kiểm, không tuyên bố đã tải model lại từ Internet hoặc dùng máy sạch hoàn toàn không có Docker/cache.
- Lượt full checkout dependency đầu tiên gặp giới hạn đường dẫn evidence trên Windows. Đã giữ thư mục lỗi, chuyển hướng dẫn sang sparse checkout và `core.longpaths` theo process; không reset kho người dùng hoặc đổi Git config toàn máy.
- `.gitattributes` giữ LF cho bundle/source để Windows checkout không phá byte hash. Kiểm `check-attr` với `core.autocrlf=true` trả `text=set`, `eol=lf` cho `demo/p01/data.js`.

## Hồ sơ cục bộ và cách kiểm

Evidence/log nằm trong `handoff-out` Git ignored, **không nằm trong source candidate hoặc tự có trên GitHub**. Các ID của lần kiểm này:

- Workspace run: `p01-pipeline/20261013T135849833Z-69eebc44`.
- Clone QA: `p01-fresh-qa-20261013-f8be6052/project`.
- Run image cũ trong clone QA: `20261013T141430471Z-db1b03b6`.
- Run mặc định bằng recipe mới: `20261013T141638149Z-361d5f78`.
- Run lỗi thật được giữ: `20261013T142057208Z-222a8d39`.
- Browser report trong clone QA: `p01-demo-qa-20261012/20261013T142409011Z-a57779f9/browser-report.json` (thư mục cha mang tên lịch sử của script; timestamp report/run là ngày 13/10).

Tái hiện và kiểm artifact riêng bằng [hướng dẫn](README.md). Khi candidate được commit, cần chạy lại từ checkout sạch của **SHA mới**, không dùng kết quả này để khẳng định code đã có trong commit cũ.

## Công bố và gate còn giữ

Candidate chỉ có allowlist source/demo/test/docs và các helper kỹ thuật. Không bao gồm credential, cache/model/database, raw Gemini response, reviewer ZIP, hồ sơ reviewer hoặc công việc literature/handoff không liên quan. Chưa stage/commit/push/merge trong lượt kiểm này.

Smoke Gemini v1 ngày 12/10 vẫn hợp lệ. Cặp v2 đã đóng băng ngày 13/10 từng trả 503 cả hai lượt; **không gọi lại API trong việc chuẩn bị/QA này**, không ghép output v1 vào nhánh v2. Context graph mới giữ run ID/checksum mới, không ghi đè cặp request v2 lịch sử; lượt API kế tiếp phải chọn đúng cặp đã thống nhất và cùng config.

P01 vẫn `pending_review`; chưa khóa split/chấm F1/Ragas, mở P02–P04, dùng output hệ thống làm nhãn hoặc thay reviewer/gói source-first. Đây là pilot ba file/known seed/Method only, chưa đủ chứng minh chất lượng tổng quát, traversal từ semantic seed hoặc đóng góp khoa học. License Apache 2.0 đi kèm chỉ cho mã PetClinic; license của mã nhóm chưa được lựa chọn trong task này.
