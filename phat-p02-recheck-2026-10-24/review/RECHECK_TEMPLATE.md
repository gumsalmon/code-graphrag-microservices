# Phiếu kiểm lại P02 — F01/F02

Lưu phiếu thành file riêng; không điền/sửa vào gói đã có checksum. AI có thể hỗ trợ đối chiếu, không tự ghi xác nhận thay người.

- Người kiểm: Phạm Nguyên Phát
- Thời điểm thực tế ghi nhận (nếu biết; không suy từ log công cụ): 
- ZIP SHA-256: 4e52aa2918d4e907af93296e40cbbdca8928978d9788c365d2dff76dc7e656d2
- Manifest SHA-256:  0358bf86bee591254483e50018f8d601932a8821a323176eaa10a80b86229539
- Scenario path/version/SHA-256: `benchmark/p02/preparation.v2/scenario.json`; version `0.1.1`; SHA-256 `762d993901f1388584adf066f396acd2ad46a7550f1f6b0b12dd6a8c61663ce9`.
- Universe path/version/SHA-256: `draft/evaluation_universe.draft.v2.json`; draft v2, `scenario_version=0.1.1`; SHA-256 `d79c07727d6fb5348503f0e4079a0d18c63e26e6d34a1e332825f1cc7680aeb5`.
- Fixture path/SHA-256: `benchmark/p02/preparation.v1/fixture.json`; giữ nguyên byte v1; SHA-256 `2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191`.
- Gốc đường dẫn các file đầu vào trên: gốc ZIP sau giải nén.
- Những draft/notes/output đã thực tế xem, kể cả trước vòng này: vòng này theo danh sách khai ở phần kiểm trực tiếp bên dưới; output gồm INPUTS/fixture, hash fixture, bảng alias/refs, so sánh ID, census, các cờ trạng thái, tổng hợp request-plan/F03 và verifier. Danh sách đầy đủ tên các file trực tiếp xem trước vòng này chưa được khai bổ sung; không suy việc xem bảng là đã đọc toàn bộ JSON và không gọi lượt kiểm này blinded.
- Phần kiểm trực tiếp và phần có AI hỗ trợ:
Có AI hỗ trợ đọc source/patch, đếm alias và refs, kiểm sự tồn tại của file đích, so sánh ID, kiểm census, checksum, các cờ trạng thái, đối chiếu raw baseline subset và chạy verifier.

Phần kiểm trực tiếp đọc/đối chiếu theo khai báo của người kiểm: INPUTS.json, fixture.json, evaluation_universe.draft.v2.json, history/evaluation_universe.draft.v1.json, inventory.v1.json, preparation.v2/scenario.json, request-plan.v1.json, VisitResource.java, VisitsServiceClient.java, ApiGatewayController.java, optional-query.patch, verify_p02_revision.mjs

| Nội dung | Kết quả và file/dòng/hash hoặc lệnh/log | Bất đồng/chưa kiểm |
|---|---|---|
| F01: đúng fixture dự định, liên kết raw byte giữa scenario/universe/INPUTS |Đã trực tiếp đọc fixture: owner 6/pets 7–8/bốn visits; đối chứng owner 1/pet 1. SHA-256 byte file khớp INPUTS.json |Không phát hiện bất đồng về dữ liệu fixture và liên kết hash trong phạm vi đã đối chiếu. |
| F02: 15 alias/29 refs, gốc đường dẫn và bốn file đích | đối chiếu 15 alias và 29 evidence_refs: 16 source refs, 13 patch refs, dẫn tới bốn file đích đều tồn tại. Đường dẫn tính từ gốc gói; toàn bộ refs khớp proposal F02 gốc. Đã đọc ba file Java và optional-query.patch, đối chiếu các khai báo method/API/service cùng thay đổi chữ ký method seed. Đây là đối chiếu source/metadata, chưa chứng minh hành vi runtime.|Không phát hiện bất đồng về 15 alias/29 refs trong phạm vi đối chiếu source và metadata. |
| Bảo toàn source/patch/scope/inventory/request-plan/snapshot IDs/v1/raw | universe v1 với draft v2: 15/15 baseline_id, mutated_id và canonical_id giữ nguyên; mutated snapshot ID giữ nguyên. Census giữ 9 Method/4 API/2 Service, sau loại seed còn 8/3/1. Kiểm checksum độc lập đạt 31/31 file gốc; source khớp hash trong inventory. Sau khi chuyển phiếu ra ngoài gói, verifier tại thư mục giải nén đạt 31/31 file, exit_code=0; log bàn giao tại phat-p02-recheck-2026-10-24/verifier-output.txt (bản UTF-8 của verifier.log), tương đối gốc repo. AI đã đối chiếu raw baseline cũ tại phat-p02-review/inputs/evidence/baseline: 31/31 file khớp manifest bàn giao cũ và giống nguyên byte với bản backup; 13/13 body khớp hash trong observation metadata. Source commit, config commit tham chiếu và fixture hash của lần chạy cũ khớp bộ đầu vào recheck hiện tại.| Raw cũ chỉ đối chiếu subset 31 file được cung cấp; chưa kiểm toàn bộ gói cũ 399 file.|
| Các cờ chưa xác nhận/chưa khóa/chưa nhãn/chưa scoring | các cờ: chưa nhận xác nhận độc lập; người xác nhận universe null; 15/15 alias chưa independently_confirmed; inventory chưa xác nhận độc lập; chưa khóa đầu vào để gán nhãn; chưa cho phép gán polarity; chưa tạo nhãn, annotator/reviewer null; chưa khóa test và chưa cho phép scoring chính thức. Giữ nguyên các trạng thái trong gói frozen.|Không phát hiện bất đồng về các cờ chưa khóa/chưa nhãn/chưa scoring. |

- Kết luận metadata: Đủ điều kiện đề nghị chốt đầu vào P02 trong phạm vi F01/F02.
- Lý do và phạm vi kết luận: Đủ điều kiện đề nghị chốt đầu vào P02 gồm scenario 0.1.1, universe draft v2 và fixture v1 theo các hash đã đối chiếu. F01/F02 đã được kiểm tra; các ID, census và phạm vi được bảo toàn. ZIP gốc giải nén sạch đạt verifier 31/31 file, exit 0.
- F03 giữ missing/unresolved; runtime tasks cần thiết sau thống nhất input:
F03 tiếp tục missing/unresolved. Sau khi thống nhất đầu vào, cần thống nhất adapter/runner cho bundle v2; bổ sung bằng chứng mutated, POST, đủ repetitions/reset và helper/setter/fallback. Chín GET baseline cũ không thay cho paired matrix 40 case. Runtime được xét riêng; kết luận này chưa xác nhận nhãn, khóa test hoặc cho phép scoring chính thức.
- Những việc không được suy ra từ phiếu: Phiếu này chỉ đề nghị chốt bộ đầu vào sau kiểm lại F01/F02. Việc duyệt nhãn chuẩn, khóa tập test, cho phép chấm điểm chính thức và kết luận hiệu quả phương pháp được xem xét riêng. F03 vẫn còn thiếu bằng chứng runtime.

Không tạo lại source-first checkpoint trước exposure. Không tự đổi trạng thái dữ liệu frozen. Nếu đề nghị chốt đầu vào, nêu đúng bộ file/version/hash để điều phối xem xét riêng; không coi kết luận metadata là quyền thực thi mọi bước sau.
