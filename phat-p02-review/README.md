# Hồ sơ kiểm phạm vi P02 của Phát

Hồ sơ kiểm phạm vi trước nhãn với kết luận CẦN SỬA đã được Phạm Nguyên Phát xác nhận bằng tên theo yêu cầu trực tiếp. F01/F03 vẫn unresolved/missing, proposal F02 chưa active; hồ sơ không là accepted ground truth.

## Vị trí sau khi đổi tên

- Bản làm việc hiện hành: `phat-p02-review/`, trước đây là `phat-p02-ACKNOWLEDGEMENT-review/`. Tiếp tục chỉnh RETURN, notes và checklist tại đây.
- Evidence của bản làm việc: `inputs/` ngay trong thư mục này; các liên kết tương đối không đổi khi đổi tên thư mục.
- Bản lưu trữ: `phat-p02-review_backup/`, trước đây là `phat-p02-review/`. README trong bản backup giải thích các đường dẫn lịch sử; tài liệu, raw, draft và checksum lưu trữ giữ nguyên byte.

Git nhận bản làm việc hiện hành cùng các log bằng chứng được cho phép; thư mục backup và ZIP lưu trữ được bỏ qua. Chưa stage/commit/push; xác nhận hiện có chỉ cho kết luận phạm vi trước nhãn, chưa khóa input hoặc duyệt nhãn.

| File / thư mục | Nội dung |
|---|---|
| [RETURN_PHAT.md](RETURN_PHAT.md) | Bằng chứng, hashes, nhận xét F02 và xác nhận bằng tên cho kết luận CẦN SỬA; không ghi thời điểm hoàn thành, chi tiết exposure còn thiếu |
| [SOURCE_NOTES.md](SOURCE_NOTES.md) | Source/patch/config/fixture, inventory/exclusions/alias và raw baseline |
| [CHECKLIST_PHAT.md](CHECKLIST_PHAT.md) | Tiến độ xác nhận của người kiểm, giữ riêng những mục còn mở |
| [OPEN_POINTS.md](OPEN_POINTS.md) | F01 dự phòng chưa liên hệ, proposal F02 và kế hoạch F03 |
| [ACKNOWLEDGEMENT_PHAT.md](ACKNOWLEDGEMENT_PHAT.md) | Hồ sơ nhận việc, pins và kết quả tự kiểm đầu vào |
| [INPUT_HASHES.json](INPUT_HASHES.json) | Danh sách/hash/size 58 input; package_root=inputs/ tương đối thư mục hồ sơ |
| [inputs/CHECKSUMS.sha256](inputs/CHECKSUMS.sha256) | Manifest subset input, không bao gồm chính manifest |
| [proposals/evaluation_universe.draft.v3.paths-only.json](proposals/evaluation_universe.draft.v3.paths-only.json) | Chỉ sửa 29 evidence_refs, chưa active, giữ F01 unresolved |
| zip-checksum.log, package-verifier.log, pins-read.log | Bằng chứng người nhận tự kiểm gói đầy đủ ban đầu |
| [CHECKSUMS.sha256](CHECKSUMS.sha256) | Manifest toàn bộ file hồ sơ hiện tại, không bao gồm chính manifest |
| .gitattributes | Giữ byte file qua Git để checksum không đổi do chuyển CRLF/LF |

## Evidence đi kèm và cách phân giải refs

Gốc input là `inputs/` trong cùng thư mục với README. Các refs S/C/Q/P/F/SC/SP/PR/U/I/B/L và path observation trong SOURCE_NOTES/RETURN/proposal tương đối gốc này. Ví dụ S1 mở tại [VisitResource.java](inputs/input/app/spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java#L72); patch tại [optional-query.patch](inputs/benchmark/p02/preparation.v1/optional-query.patch#L1). Không cần đường dẫn D:/ trên máy soạn.

Subset có 58 file sao chép nguyên byte từ package frozen theo INPUT_HASHES.json; includes source/config/SQL, patch/fixture/scenario/scope, protocol/context/provenance, drafts, raw observations/logs được trích dẫn và LICENSE của app/config. Không lấy dữ liệu ngoài gói, không đưa nhãn/output P01 hoặc đầu ra phương pháp được đánh giá vào hồ sơ.

Đây không phải full package 399 file. `inputs/SHA256SUMS.txt` giữ manifest full package gốc làm provenance; một số file trong manifest đó không thuộc subset. Kiểm subset bằng `inputs/CHECKSUMS.sha256`; không chạy full-package verifier trên subset rồi suy là thiếu/gói hỏng. Log package-verifier.log vẫn là kết quả kiểm gói đầy đủ tại thời điểm nhận việc. Liên kết lịch sử trong context/provenance giữ nguyên nội dung; không tự tải các tài liệu/output ngoài phạm vi theo các link đó.

[LICENSE app](inputs/input/app/LICENSE) và [LICENSE config](inputs/input/config/LICENSE) được giữ cùng source/config. Raw/log/provenance giữ nguyên bytes, gồm timestamp và đường dẫn máy lịch sử bên trong; mapping ở README chỉ thay cách mở evidence trong bản nộp.

## Trạng thái và việc còn lại

Người kiểm đã xác nhận Inventory 15 dòng, 8 nhóm exclusions, 15 alias identity, overload/mapping và cách ghi phạm vi/hop/seed/projection; đã báo hoàn thành phần đối chiếu fixture/SQL/raw, miền request và rà F02. RETURN có xác nhận bằng tên cho kết luận CẦN SỬA. F02 chưa active, F01 tạm chưa liên hệ, F03 chưa runtime mutated/POST/repetitions-reset/helper tests; không gán polarity.

Phần có thể chuẩn bị offline và xác nhận kết luận đã có trong RETURN. Không ghi thời điểm hoàn thành vì người kiểm không nhớ chính xác; giữ riêng timestamp ACK/raw/công cụ lịch sử. Danh sách đầy đủ tên các draft JSON người kiểm trực tiếp mở còn chưa khai. Không khóa universe, duyệt nhãn, test/scoring hoặc tự mở P03/P04.

Đợt kiểm bổ sung bằng công cụ đã đối chiếu đủ fixture/SQL/raw, miền request/kế hoạch 40 case và 29 thay đổi refs của F02. Sau đó người kiểm yêu cầu ghi xác nhận bằng tên Phạm Nguyên Phát cho kết luận **cần sửa**; xác nhận được ghi theo yêu cầu này, không suy từ tên trong ACK hoặc timestamp công cụ.

Gói input đầy đủ gốc vẫn giữ local nguyên vẹn: P02_PHAT_20261015T111730650Z-5604cc22.zip, SHA-256 7eeafca9bea6d21828ba44c585aaf0d6191302d13787be1d6ae1a67695a0690f. Không sửa raw/draft gốc hoặc protocol/split/scorer; chưa stage, commit, merge hoặc push.
