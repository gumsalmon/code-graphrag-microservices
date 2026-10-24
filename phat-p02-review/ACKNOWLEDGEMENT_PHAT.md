# Xác nhận nhận việc P02

Trạng thái: xác nhận nhận việc kiểm phạm vi và bằng chứng P02 trước nhãn; chưa xác nhận universe, duyệt nhãn hoặc cho phép chấm điểm.

- Người nhận: Phạm Nguyên Phát.
- Vai trò: kiểm phạm vi và bằng chứng P02 trước nhãn.
- Thời điểm xác nhận nhận việc: 2026-10-16T17:57:23+07:00.
- Source pin: `3858f9c630cf989bb6809a86edf47c2be78dc9f1`.
- Config pin: `323993ce2519c6d02df63e08bf4458d123d3b611`.
- Implementation khai báo: `e95613795133088621117179c9fb9592dab62b16`, chỉ provenance, không dùng làm đáp án.
- Protocol: v0.2, pin `5f9204d66253604edf9101c2f888fc7e75aa0be7`.

## Gói và kết quả tự kiểm của người nhận

- ZIP gốc: `P02_PHAT_20261015T111730650Z-5604cc22.zip`.
- ZIP SHA-256: `7eeafca9bea6d21828ba44c585aaf0d6191302d13787be1d6ae1a67695a0690f`.
- Manifest SHA-256: `be22459eb24040d2234654c9d3a40f962accae6fd17311eda230b03b8f4e0d1e`.
- Đã tự chạy Get-FileHash SHA-256 cho ZIP và portable verifier: 399 file, exit_code=0, network_calls=0, status=bytes_verified_not_a_research_approval. Log: zip-checksum.log và package-verifier.log.
- Đã tự đối chiếu metadata pins giữa INPUT_PROVENANCE.json, scenario.json và raw baseline inputs.json; source/config/protocol nhất quán. Protocol SHA-256 `92258d2a19599f202c39ab5067191248c17631565391ffab9f96d9cc0608d6cb`. Log: pins-read.log.
- Những kiểm tra này xác nhận tính toàn vẹn byte và nhất quán metadata trong gói; chưa xác thực cây commit upstream hoặc kết luận nghiên cứu.

## Mục tiêu và đầu ra nhận việc

Kiểm source/contract, patch, config, fixture, inventory/universe, seed, exclusions và alias P02. Đầu ra là SOURCE_NOTES.md, checklist đã tự kiểm và RETURN_PHAT.md theo template; có file/dòng, hashes, bất đồng, missing và đề nghị đủ để khóa/cần sửa/chưa đủ. Lượt này chưa gán polarity hoặc duyệt nhãn.

Kế hoạch tại thời điểm nhận việc: đọc source, ghi notes riêng; đối chiếu từng ID/exclusion/alias, fixture và blocker; hoàn thiện kết luận phạm vi bằng nhận định thật. Tiến độ sau nhận việc được ghi ở CHECKLIST_PHAT.md.

## Exposure và giới hạn

Đã đọc START_HERE, toàn bộ PROJECT_CONTEXT, PACKAGE_CONTENTS, PORTABLE_PATHS và protocol v0.2; đã biết census dự thảo 8 Method/3 API/1 Service, nhận định chuẩn bị, F01 và đề nghị v2. Không gọi lượt này blinded. Các draft/labels/output hệ thống khác: theo khai báo lúc nhận việc là không có. Nguồn soạn thảo và phần trực tiếp đối chiếu được khai ở SOURCE_NOTES.md.

F01: fixture hash trong universe v1 khác fixture ship/raw baseline, cần xác nhận intended fixture và version mới nếu sửa. F02: evidence refs portable cần kiểm. F03: thiếu mutated/POST/đủ repetitions-reset và evidence helper/setter/fallback. Tại thời điểm nhận việc, các blocker này chưa được người nhận tự đối chiếu. Không suy default negative từ thiếu observation.

Chưa có commit/merge/push được thực hiện trong các lượt hỗ trợ đã ghi nhận. Xác nhận nhận việc không là xác nhận universe, accepted labels, test lock hoặc scoring authorization. Giữ raw/draft và protocol frozen; sửa thiết kế bằng version mới có lý do.
