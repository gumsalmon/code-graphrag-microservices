# P02 native extraction / Neo4j / graph retrieval theo D20

Cập nhật 02/11: [bản sửa P02 mới đã kiểm độc lập](../../tasks/P02_TECHNICAL_RETURN_STATUS_2026-11-02.json) đạt full-property parity và đủ 8/8 eligible Methods. Artifact/runner/inspector/context ngày 01/11 được mô tả bên dưới giữ snapshot cũ, chưa tự rebuild hoặc đổi pin; không đọc các giới hạn cũ như trạng thái code mới. Runner/checker reviewed 02/11 và candidate profile được dẫn trong status.

Entry point mới: `node scripts/run_p02_offline_method.mjs`. Chỉ nhận P02 receipt đã được coordinator kiểm ngày 01/11; guard khóa case/input/version/hash/quyền. Không chạy runner synthetic-only của Hiển trên dữ liệu ca thật bằng cách đổi marker. Không mở P03, model/embedding inference, scoring hoặc shared output contract draft.

Đây là runner local dùng các source/cache paths đã kiểm trên máy Huy; đường dẫn không phải CLI portable cho máy khác. Muốn tái hiện ở máy khác cần map đúng source/implementation/cache, kiểm receipt/input bytes và sandbox riêng, không giả đường dẫn Huy tồn tại. Gói cho Hiển chỉ chứa source/evidence được chọn, không full replay app.

```powershell
node --test pipeline/p02/offline-method.test.mjs
python -B -m unittest discover -s pipeline/p02 -p offline_method_probe_test.py -v
node scripts/run_p02_offline_method.mjs
node scripts/check_p02_offline_method.mjs --run NEW_RUN_DIRECTORY
```

Không rerun chỉ để cập nhật tiến độ. Runner dùng image/cache có sẵn và tạo thư mục/container/network mới, no pull. Sao đúng ba source baseline/mutated từ gói nguồn đã kiểm, chỉ mount source/receipt/implementation vào probe; không mount labels, notes, raw outcome benchmark hoặc khóa credential. Source SHA/candidate/receipt/implementation hash được giữ trước/sau. Native schema và IDs từ candidate không đổi; snapshot có seed signature riêng vì patch thêm boolean.

Extract trong Python container không mạng, input/code read-only. Mỗi snapshot dùng DB Neo4j thật riêng trong network internal, không port publish hoặc volume dự án. Data/log tmpfs không lưu DB cá nhân; `/data` 2 GiB vì 512 MiB không đủ preallocate transaction log. Readiness phải chạy query trên database `neo4j`, không chỉ Bolt connectivity. Polls/readiness không là repetitions nghiên cứu.

Direct importer và generated Cypher được thử hai lần cùng snapshot trong DB run-owned, lưu dumps đầy đủ; clear chỉ DB mới sở hữu giữa hai route. Kiểm required Method/Endpoint/query/edge metadata, source chunks và witness paths 1–3 hop, seed để riêng. Không đồng nhất reachability với behavioral impact/repair. Chưa vector retrieval/Chroma/LLM hoặc official metrics.

Lượt hiện tại có hai giới hạn mở: Class.name thiếu ở direct importer nên full-property parity=false; native Method inventory biểu diễn bốn trong tám eligible, không tự âm cho bốn missing helpers. Điều này không bị che bởi required-metadata parity pass; xem [báo cáo](../../tasks/research/TEAM_RETURNS_REVIEW_2026-11-01.md) và [status](../../tasks/TEAM_RETURN_STATUS_2026-11-01.json). Snapshot isolation ở mức DB/container riêng, không tuyên bố native keys đã snapshot-qualified. Neo4j/metadata/idempotence pass là bằng chứng kỹ thuật có phạm vi, chưa hoàn tất P02 hoặc bài báo.
