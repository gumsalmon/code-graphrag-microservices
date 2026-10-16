# Kết quả kiểm phạm vi P02 trước nhãn

Trạng thái: **người kiểm đã xác nhận bằng tên kết luận phạm vi: cần sửa**. Xác nhận áp dụng cho lượt kiểm phạm vi P02 trước nhãn; F01/F03 vẫn unresolved/missing và proposal F02 chưa active.

Người kiểm và xác nhận bằng tên: **Phạm Nguyên Phát**. Ghi xác nhận theo yêu cầu trực tiếp của người kiểm trong trao đổi, với kết luận CẦN SỬA đã được điền trong RETURN. Không ghi thời điểm hoàn thành vì người kiểm không nhớ chính xác. Nguồn hỗ trợ soạn thảo và exposure được khai trong SOURCE_NOTES.md; không gọi lượt kiểm này blinded.

Vị trí bản RETURN hiện hành: `phat-p02-review/RETURN_PHAT.md`; thư mục làm việc đã đổi tên từ `phat-p02-ACKNOWLEDGEMENT-review/`. Bản review gốc được lưu tại `phat-p02-review_backup/`, giữ nguyên nội dung và checksum lịch sử; không dùng bản đó thay cho tiến độ/xác nhận trong bản hiện hành. Gốc input của bản nộp vẫn là `inputs/` tương đối thư mục này.

## Input pins và hashes

- ZIP gốc: P02_PHAT_20261015T111730650Z-5604cc22.zip; SHA-256 `7eeafca9bea6d21828ba44c585aaf0d6191302d13787be1d6ae1a67695a0690f` theo hồ sơ nhận việc/zip-checksum.log.
- Source pin: `3858f9c630cf989bb6809a86edf47c2be78dc9f1`.
- Config pin: `323993ce2519c6d02df63e08bf4458d123d3b611`.
- Protocol pin: `5f9204d66253604edf9101c2f888fc7e75aa0be7`, version 0.2.
- Implementation khai báo: `e95613795133088621117179c9fb9592dab62b16`, chỉ metadata, không dùng làm đáp án.

Các path input dưới đây tương đối gốc inputs/ đi kèm bản nộp. Hash từng source/config/SQL/raw và giấy phép được giữ ở INPUT_HASHES.json. Tất cả 58 file subset trùng byte package frozen; inputs/CHECKSUMS.sha256 là manifest subset. File inputs/SHA256SUMS.txt là bản sao manifest full package gốc (399 entries), chỉ giữ làm provenance, không dùng để verify subset.

| Input | File trong gói | SHA-256 |
|---|---|---|
| Manifest gói gốc | SHA256SUMS.txt | `be22459eb24040d2234654c9d3a40f962accae6fd17311eda230b03b8f4e0d1e` |
| Context v0.6 | PROJECT_CONTEXT.md | `c1c8ad23f95a8e9e2fd4a8762b23d41c3984fd5ddc9bffc19a48617d18aa5434` |
| Provenance gói | INPUT_PROVENANCE.json | `391b9387cce4f93c0d5fa2a44c40cc8cd0a452a7b4d4720e2b9353bd18e69b44` |
| Protocol v0.2 | benchmark/protocol/benchmark_protocol_v0.2.md | `92258d2a19599f202c39ab5067191248c17631565391ffab9f96d9cc0608d6cb` |
| Scenario | benchmark/p02/preparation.v1/scenario.json | `7d415b72a0d60911c104afe012d912ab3c600cb8f2da24e94791f7ab90264557` |
| Patch | benchmark/p02/preparation.v1/optional-query.patch | `091b04de4a504512cbda4e0c5c0759b747b056b4c7028923d8b7808b43303c4f` |
| Fixture ship | benchmark/p02/preparation.v1/fixture.json | `2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191` |
| Scope frozen | benchmark/p02/preparation.v1/scope.json | `4faf66f411ca91799fb67b5698a7541c8859a50f08bcb628323eccb5cabf6695` |
| Inventory frozen | draft/inventory.v1.json | `9f4a7f1f323a5f11a3902def30f717a16ba3d1b2023ed9982a81f298d9dc74f6` |
| Universe frozen v1 | draft/evaluation_universe.draft.v1.json | `8c04bbca98318c3d358ec9135516d889f3b7c017793dbc4aa5319771ed8d7424` |
| Request plan frozen | draft/request-plan.v1.json | `a4613b82f251b957fd97b0e6ba565db913d11e613472c7915b6647fbb0aa43b2` |
| Raw baseline inputs | evidence/baseline/inputs.json | `08ce94a37eb6a172cee24321b74ec8520440d30c079055d51bf70a44674b1245` |

## Source notes và exposure

SOURCE_NOTES.md hiện tại có SHA-256 `6042270848c8560464bc39907abfb8a502058744b19e17ec2de4d522b9649ff6`; nếu sửa notes phải cập nhật hash này và CHECKSUMS.sha256. Không suy thời điểm người kiểm hoàn thành từ ACK, timestamp raw hoặc log kiểm bằng công cụ.

Chưa có checkpoint source-first riêng của người kiểm được xác nhận trước exposure; không dựng lại checkpoint hồi tố. Phần exposure đã có căn cứ được ghi dưới đây; không dùng output hệ thống hoặc nhãn để điều chỉnh kết luận.

| Phần tiếp xúc / người thực hiện | Thông tin đã được ghi nhận | Giới hạn |
|---|---|---|
| Người kiểm, theo ACK và các xác nhận đã gửi | Đã đọc các tài liệu bắt buộc, biết census dự thảo 8 Method/3 API/1 Service, nhận định chuẩn bị, F01 và đề nghị v2; đã báo kiểm 15 dòng inventory, 8 nhóm exclusions, 15 alias, overload/mapping và cách ghi phạm vi/hop/seed/projection. | Chưa có danh sách đầy đủ tên các draft JSON người kiểm trực tiếp mở; không suy từ việc rà bảng thành đã mở mọi file. |
| Phần hỗ trợ soạn thảo, theo SOURCE_NOTES.md | Đã đọc source/config/SQL/patch/fixture/protocol và raw baseline được phép; đã tiếp xúc inventory v1, universe v1, request-plan v1 và proposal v3. | Kết quả kiểm bằng công cụ được ghi riêng, không thay nhận định độc lập hoặc chữ ký người kiểm. |
| Xác nhận bổ sung của người kiểm | Người kiểm báo đã hoàn thành phần đối chiếu fixture/SQL/raw, miền request và rà F02; RETURN đã có kết luận CẦN SỬA, người kiểm yêu cầu ghi xác nhận bằng tên. | Ghi nhận theo lời người kiểm, không chứng nhận độc lập thao tác cá nhân; không kích hoạt proposal, khóa universe hoặc duyệt nhãn. Không ghi thời điểm hoàn thành do người kiểm không nhớ chính xác. |
| Exposure còn thiếu chi tiết | Danh sách đầy đủ tên các draft JSON người kiểm trực tiếp mở chưa được khai. | Giữ nguyên giới hạn này; xác nhận bằng tên không bổ sung hồi tố một lịch sử exposure chưa được cung cấp. |

## Đối chiếu từ bằng chứng

Các ref S1/S2/S3, C/Q/P/F/SP/PR/U/I/B được định nghĩa ở SOURCE_NOTES.md. Cột trạng thái dưới đây phân biệt xác nhận đã nhận của người kiểm với evidence hỗ trợ chưa được xác nhận riêng.

| Nhóm | Nhận định và phạm vi đã kiểm | Source/config/contract file và dòng | Đồng ý / cần sửa / chưa rõ |
|---|---|---|---|
| Scope / coverage | Census ba file, lấy explicit non-constructor methods gồm private/package-private. 3-hop là giới hạn khai báo, không chứng minh full-repo coverage. | SP:8–25,33–40; PR:81–88; S1/S2/S3 | Người kiểm đã xác nhận trực tiếp kiểm và đồng ý cách ghi giới hạn; chưa khóa universe. |
| Census Method/API/Service | 9/4/2 trước loại seed; 8/3/1 eligible. Mỗi ID giữ đúng level, service, FQN/signature hoặc verb/path. | SOURCE_NOTES inventory từng dòng; S1:56–76; S2:42–56; S3:37,54–82; C1/C2:1–3 | Người kiểm đã xác nhận đối chiếu 15 dòng inventory. |
| Seed và exclusions | Seed method/API và owning visits-service ghi riêng; constructors/lambda/record implicit/generated/field/call/source ngoài phạm vi xử lý theo rule census, không suy negative. | S1:48–54,78–81; S2:34–40,50–56; S3:40–52,57–82; SP:33–40; PR:73–77 | Người kiểm đã xác nhận kiểm 8 nhóm exclusions và cách ghi seed/projection. |
| Alias / overload / snapshots | read(int) khác read(List<Integer>); prefix/wildcard/HTTP method giữ đúng annotation. 15 alias giữ canonical baseline, seed after thêm boolean. | S1:56,67–76; S3:37,54; P1:8–10; PR:220–246; U1:81–244 | Người kiểm đã xác nhận identity alias/overload/mapping và báo hoàn thành rà F02, đồng ý đề nghị sửa refs trong kết luận CẦN SỬA. Proposal chưa active. |
| Fixture / miền request / đối chứng | Owner6/pets7–8/bốn visits khớp SQL/schema và 9 raw scenario GET; đối chiếu đủ trường owner/pet/visit, method/path/host/hash/size. Owner1/pet1 rỗng không thay populated/fault. Primary omitted, true/false/empty binding, invalid/missing diagnostic tách riêng. 40 case của request-plan khớp fixture nhưng chưa thực thi. | F1:12–39; Q1:8,13,19,25–26; Q2:11–29; Q3:1–4; Q4:3–8; raw observations; SOURCE_NOTES mục fixture bổ sung | Người kiểm báo đã hoàn thành đối chiếu và xác nhận kết luận phạm vi với các giới hạn đã kê. Không tự giải quyết F01 intended fixture hoặc suy binding mutated. |
| Runtime còn thiếu cho từng loại kết luận | Chưa mutated/POST/đủ matrix repetitions-reset hoặc evidence helper/setter/fallback. Kế hoạch thu evidence ở OPEN_POINTS.md. | B1:43–45; F1:20–34; S2:34,42–56; S3:58–82 | Missing/unresolved evidence; chưa gán polarity hoặc quyết định hành vi. |

## Bất đồng / bản sửa đề nghị

- F01: fixture ship/raw baseline cùng SHA `2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191`, nhưng universe v1 khai `2a837540d0316d290401a1485ddeeb86a62a6f06447ccd75aa976fc2c5c8168a`. Bước liên hệ tạm để sau, chưa có trả lời intended fixture; OPEN_POINTS.md giữ câu hỏi dự phòng và nhánh xử lý. F01 vẫn unresolved, không cản việc hoàn thiện RETURN; không sửa fixture hash theo suy đoán.
- F02: proposal `proposals/evaluation_universe.draft.v3.paths-only.json`, SHA `b133526e1102f6082850171745295c39acbc84c61e1363900f40b5ebf5e407c3`, chỉ sửa 29 evidence_refs. Đã rà lại đủ 15 alias, 29 refs tới 4 file tồn tại/hash đúng; giữ mọi ID/flags/hash fixture như v1. Người kiểm đồng ý đề nghị sửa refs có căn cứ trong kết luận CẦN SỬA; việc tiếp nhận thành input áp dụng vẫn chưa thực hiện. Proposal chưa active và không được dùng khóa/chạy mutation khi F01 còn mở. Lý do sửa là đường dẫn portable/file identity, không dựa prediction/score.
- F03: OPEN_POINTS.md ghi matrix và targeted observations cần bổ sung cho client/helper/setter/Function/fallback. Chưa thực hiện; không lấy status/body equality của gateway làm đáp án cho mọi method.

## Đợt kiểm bổ sung — command/log

Thời điểm hoàn tất kiểm bằng công cụ: **2026-10-17T00:26:41+07:00**, không phải thời điểm người kiểm nhận xét hoặc ký. Lệnh thực tế: `python -`, nhận script qua stdin bằng PowerShell here-string; script tạm không được lưu thành file riêng. Script đọc JSON/tuple SQL/schema/raw trong inputs/, dùng SHA-256 kiểm byte, so 40 case kế hoạch và so cấu trúc JSON của F02; không gọi mạng hoặc chạy ứng dụng. Kết quả lệnh: **exit_code=0**. Log kết quả:

```json
{
  "checked_at": "2026-10-17T00:26:41+07:00",
  "input_hashes_verified": 58,
  "fixture_sql_raw": "match_for_shipped_fixture",
  "owner_pet_groups_verified": 2,
  "visit_tuples_verified": 4,
  "raw_get_pairs_verified": 9,
  "baseline_statuses": {
    "direct_omitted": 200,
    "direct_true": 200,
    "direct_false": 200,
    "direct_empty": 200,
    "direct_invalid": 200,
    "direct_missing_pet_id": 400,
    "gateway_populated": 200,
    "gateway_empty": 200,
    "overload_read": 200
  },
  "request_plan_slots_verified": 40,
  "plan_executed": false,
  "f02_aliases_reviewed": 15,
  "f02_changed_refs": {"source": 16, "patch": 13},
  "f02_unique_targets": 4,
  "f02_other_fields_unchanged": true,
  "f02_confirmed_locked_scoring_flags": false,
  "f01": "unresolved_fixture_hash_mismatch",
  "f03": "missing_mutated_post_repetitions_reset_helper_evidence",
  "human_confirmation": "not_recorded_for_this_recheck",
  "network_calls": 0
}
```

Log trên phản ánh thời điểm kiểm bằng công cụ trước xác nhận bằng tên hiện tại; giữ nguyên trường human_confirmation của log lịch sử. Nội dung baseline được kiểm đủ trường, không chỉ HTTP status; chỉ sắp xếp arrays trong bộ nhớ để so ID, raw và error timestamp trên đĩa giữ nguyên. Kết quả true/false/empty/invalid cùng body chỉ thuộc baseline S1 chưa khai includeDetails; chưa có evidence binding/runtime mutated. Hash input từng file ở INPUT_HASHES.json, hash artifact ở bảng bàn giao và CHECKSUMS.sha256.

## Thao tác, log và phần chưa làm

- ZIP/verifier/pins: người nhận đã khai tự kiểm trong ACK. zip-checksum.log ghi hash ZIP; package-verifier.log ghi 399 file, exit_code=0, network_calls=0; pins-read.log ghi các pin/protocol nhất quán. Command-line đầy đủ không được ghi trong mọi log; không tái tạo flags chưa được xác nhận.
- Đã đối chiếu source/patch/config/SQL/raw, kiểm hash/size và refs offline; kết quả ở SOURCE_NOTES.md, INPUT_HASHES.json và OPEN_POINTS.md. Đã kiểm 58 input copy với manifest gốc và kiểm 29 proposal refs; mọi trường JSON ngoài evidence_refs giữ nguyên. Không tái chạy app hoặc gọi mạng.
- Đã thêm .gitattributes trong hồ sơ để giữ byte file/checksum qua Git trên máy có core.autocrlf=true; raw/provenance/log vẫn nguyên nội dung, không sửa timestamp hoặc đường dẫn lịch sử bên trong chúng.
- F01 tạm để sau và giữ unresolved; chưa tiếp nhận proposal v3 làm input active. Người kiểm báo đã hoàn thành phần đối chiếu và yêu cầu ghi xác nhận bằng tên cho kết luận CẦN SỬA; không ghi thời điểm hoàn thành vì không nhớ chính xác. Danh sách draft exposure chi tiết vẫn chưa đầy đủ.
- Đã kèm 58 file input chọn lọc trong inputs/, giữ đúng byte source/config/SQL/patch/fixture/protocol/draft/raw được trích dẫn và LICENSE upstream. Các refs có thể phân giải trong bản clone; không cần đường dẫn D:/ của máy soạn. Gói đầy đủ gốc vẫn lưu riêng, subset không phải full package 399 file.
- Không tạo labels positive/negative; không runtime mutated/POST/matrix/helper tests, không accepted/test/scoring/P03/P04, không sửa protocol/split/scorer, không commit/merge/push.

## Bộ file bàn giao và kiểm tra khả năng truy vết

| Artifact | Vai trò / trạng thái | SHA-256 |
|---|---|---|
| SOURCE_NOTES.md | Bảng source/contract/fixture và xác nhận phạm vi đã nhận; không ghi thời điểm hoàn thành, exposure chi tiết vẫn còn thiếu | `6042270848c8560464bc39907abfb8a502058744b19e17ec2de4d522b9649ff6` |
| INPUT_HASHES.json | Danh sách 58 input và gốc tương đối inputs/ | `c19a4e3c20e4236c067b7a089156e0639734be81986139a200fcf2b574767c2f` |
| inputs/CHECKSUMS.sha256 | Manifest 58 file subset, không bao gồm chính manifest | `f00195fc86e5118567ac8911404590426d6748b71bfeb06ef9821edf459ab68b` |
| OPEN_POINTS.md | F01 tạm để sau, F02 proposal và F03 kế hoạch chưa thực thi | `86192653038bd2af2a4e965e8c211c882f970146b27228a81b0162d435cb3dc4` |
| proposals/evaluation_universe.draft.v3.paths-only.json | Bản sửa refs chưa active; mọi trường khác giữ như frozen v1 | `b133526e1102f6082850171745295c39acbc84c61e1363900f40b5ebf5e407c3` |

CHECKSUMS.sha256 ở gốc hồ sơ khóa đúng các file hiện tại, gồm bản RETURN và subset; manifest không chứa hash của chính nó. Nếu sửa bất kỳ file nào, cập nhật manifest và các hash liên quan trong RETURN. Không đưa checksum bản đã sửa vào thay cho hash input frozen.

Các việc còn chờ được kê rõ: F01 intended fixture; bên giữ input tiếp nhận version sửa refs khi đủ điều kiện; chi tiết draft exposure chưa khai và bàn giao bộ file. Xác nhận bằng tên của Phạm Nguyên Phát đã được ghi theo yêu cầu cho kết luận CẦN SỬA; không ghi thời điểm hoàn thành vì người kiểm không nhớ. F03 chỉ cần kê missing và đề nghị phép thử trong lượt này; chưa thực thi hoặc gán polarity.

## Kết luận phạm vi

**Kết luận phạm vi được người kiểm xác nhận: cần sửa.** Source/patch/config/SQL/raw của fixture đang ship nhất quán trong phạm vi evidence đã kiểm; census, identity alias, overload/mapping và cách ghi giới hạn scope đã có những xác nhận riêng của người kiểm. Tuy nhiên, universe v1 pin hash fixture khác fixture ship/raw baseline (F01), nên chưa đủ điều kiện đề nghị khóa bộ input. Bản v3 sửa đúng 29 evidence_refs và giữ các trường còn lại, có căn cứ trình tiếp nhận phần sửa refs (F02), nhưng chưa active và vẫn giữ F01 chưa giải quyết. Đề nghị xác nhận intended fixture, tạo version/hash mới có lý do và nhận xác nhận thật về bộ file áp dụng trước khi khóa. Runtime mutated/POST/repetitions-reset/helper/fallback vẫn missing (F03), nên chưa kết luận hành vi hoặc gán polarity.

Có thể bàn giao lượt kiểm phạm vi này với đề nghị **cần sửa**, ghi rõ F01/F03 unresolved và F02 proposal chưa active, không cần chạy runtime hoặc liên hệ ngay để hoàn thiện bản làm việc.

**Xác nhận kết luận cuối của Phạm Nguyên Phát: CẦN SỬA.**

Chưa đủ điều kiện đề nghị khóa bộ input P02.

- F01: hash fixture trong universe khác fixture thực tế/raw baseline; cần xác nhận fixture dự định và sửa bằng version mới.
- F02: bản sửa 29 đường dẫn có căn cứ, đã kiểm đúng file/hash; proposal chưa được tiếp nhận làm bản áp dụng.
- F03: thiếu runtime mutated và bằng chứng helper/setter/fallback; giữ missing/unresolved, chưa kết luận hành vi hoặc gán positive/negative.

**Xác nhận bằng tên: Phạm Nguyên Phát.** Ghi theo yêu cầu trực tiếp của người kiểm trong trao đổi. Người kiểm báo đã hoàn thành phần đối chiếu và đồng ý kết luận trên; không ghi thời điểm hoàn thành vì không nhớ chính xác. Xác nhận này chỉ áp dụng cho lượt kiểm phạm vi trước nhãn, không kích hoạt proposal hoặc khóa universe.

Bộ input đang được rà là source/config/protocol pins và frozen preparation/draft hashes trong bảng; proposal v3 chỉ là bản sửa refs chưa active. Khi F01 được trả lời hoặc đổi thiết kế, tạo version/hash mới và cập nhật chính xác bộ file áp dụng. Không sửa v1 frozen.

Xác nhận phạm vi này không là accepted labels, reviewer approval cho nhãn, test lock hoặc scoring authorization. Chưa gán polarity vì chưa đủ raw baseline/mutated. Các mốc trong log/raw/ACK giữ nguyên lịch sử, không được dùng làm thời điểm người kiểm hoàn thành.
