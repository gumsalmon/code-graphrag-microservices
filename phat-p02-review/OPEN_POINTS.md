# Điểm mở P02 và bản xử lý đề nghị

Trạng thái: hồ sơ trước nhãn với xác nhận bằng tên của Phạm Nguyên Phát cho kết luận CẦN SỬA tại RETURN. Người kiểm đồng ý đề nghị sửa refs F02 có căn cứ; proposal chưa active, chưa khóa input hoặc thực thi runtime.

## F01 — xác nhận fixture dự định

Fixture đang ship có SHA-256 `2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191` và khớp evidence/baseline/inputs.json:36. Universe frozen v1:16 khai `2a837540d0316d290401a1485ddeeb86a62a6f06447ccd75aa976fc2c5c8168a`. Nội dung SQL/raw phù hợp fixture đang ship, nhưng chưa có xác nhận từ bên giao gói rằng đây là fixture dự định.

Nội dung dự phòng để dùng khi đến bước liên hệ bên giao gói; tạm chưa hỏi ở giai đoạn hoàn thiện RETURN:

> Fixture có SHA-256 2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191 đang được gửi có đúng là input dự định của P02 không? Universe v1 đang khai 2a837540d0316d290401a1485ddeeb86a62a6f06447ccd75aa976fc2c5c8168a. Nếu fixture đang ship là đúng, đề nghị tạo universe version mới với hash tương ứng và changelog; nếu intended fixture khác, cần cung cấp fixture/evidence đúng version để đối chiếu lại. Giữ nguyên v1 frozen.

Bước liên hệ F01 tạm để sau; chưa gửi tin nhắn hoặc nhận trả lời. Trạng thái F01: **unresolved — chưa xác nhận intended fixture**. Có thể hoàn thiện và bàn giao nhận định cần sửa trong khi giữ nguyên điểm mở này.

Nếu xác nhận fixture đang ship là đúng: tạo version universe mới liên kết hash fixture này, kiểm lại các refs/ID và để người kiểm xác nhận đúng bộ file/hash trước khi khóa. Nếu intended fixture khác: bổ sung đúng fixture; raw baseline hiện tại chỉ được coi là evidence của fixture đang ship, không dùng làm paired evidence cho fixture khác. Thu run mới khi cần, giữ raw/run cũ nguyên vẹn.

## F02 — bản đề nghị sửa đường dẫn evidence

Bản mới: `proposals/evaluation_universe.draft.v3.paths-only.json`, SHA-256 `b133526e1102f6082850171745295c39acbc84c61e1363900f40b5ebf5e407c3`.

Cơ sở là `draft/evaluation_universe.draft.v1.json`, SHA-256 `8c04bbca98318c3d358ec9135516d889f3b7c017793dbc4aa5319771ed8d7424`. Đánh số v3 để không trùng candidate v2 đã có; không kế thừa quyết định fixture từ candidate đó. Chỉ thay aliases[*].evidence_refs: 13 refs patch và 16 refs source. Cả 29 reference sau sửa phân giải được tới 4 file thực tế dưới input root, SHA khớp INPUT_HASHES.json.

| Ref cũ | Ref đề nghị | Số lần | SHA-256 file đích |
|---|---|---|---|
| spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java | input/app/spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java | 7 | `0bf7d4638add57363cde29b964d9fcc44ac55da9df320ff1ebfebc5c9f0786cd` |
| spec/optional-query.patch | benchmark/p02/preparation.v1/optional-query.patch | 13 | `091b04de4a504512cbda4e0c5c0759b747b056b4c7028923d8b7808b43303c4f` |
| spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/application/VisitsServiceClient.java | input/app/spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/application/VisitsServiceClient.java | 4 | `d7d1437c4dce96d4de5f636511d3bcf5549df4a11b7826fde0375bce358f1e13` |
| spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java | input/app/spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java | 5 | `bb815e3727be7e56330072d54774944ef5029d66d2d7e56976d7c60dbeafbb21` |

Evidence refs của proposal tương đối gốc inputs/ đi kèm đã nêu trong README, không tương đối thư mục proposals; cả bốn file đích được giữ đúng byte trong subset. Các annotation mapping đã đối chiếu tại S1:56,67,72 và S3:37,54; evidence signature/body/alias chi tiết ở SOURCE_NOTES.md.

Đã kiểm so sánh cấu trúc JSON: mọi trường ngoài evidence_refs giữ nguyên, gồm scenario version, baseline/mutated/canonical IDs, eligible_entities, excluded_seeds, fixture_sha256 và các flags. Không đổi independently_confirmed=false thành true; không thay người hoặc quyết định trong provenance của draft cơ sở.

Nhận xét sau đợt kiểm bổ sung bằng công cụ lúc 2026-10-17T00:26:41+07:00: đã rà đủ 15 alias và toàn bộ 29 ref thay đổi; bốn file đích/hash đúng, mọi trường khác giữ nguyên. Phần sửa refs có căn cứ để đề nghị tiếp nhận thành version mới. Điều kiện trước khi khóa vẫn là giải quyết F01, xác định chính xác bộ version/hash áp dụng và nhận xác nhận thật của người kiểm/bên giữ input. Thời điểm trên là log kiểm bằng công cụ, không là thời điểm ký hoặc quyết định của Phát.

Proposal v3 **chưa active, chưa được chấp thuận để khóa hoặc chạy mutation**. Nó vẫn giữ hash fixture lệch của v1 để không tự quyết định F01. Trạng thái F02: **người kiểm đã rà và đồng ý đề nghị sửa refs trong kết luận CẦN SỬA; chờ bên giữ input tiếp nhận version mới khi đủ điều kiện**. Bản nộp đã kèm subset inputs/ chứa đủ các file đích và evidence được trích dẫn; package gốc vẫn được giữ riêng. Subset không thay full-package verifier hoặc quyết định intended fixture.

## F03 — bằng chứng runtime còn thiếu và phép thử đề nghị

Nguồn: fixture F1:20–39; B1:43–45; S2:34,42–56; S3:58–82. Hiện chỉ có chín scenario GET baseline; chưa mutated/POST/đủ repetitions-reset. Trạng thái F03: **missing/unresolved evidence**, chưa có labels positive/negative.

| Phần thiếu | Phép thử/evidence cần bổ sung sau khi input được thống nhất | Kết quả phải giữ |
|---|---|---|
| Paired HTTP matrix | Chạy 10 request của fixture trên baseline/mutated, mỗi snapshot 2 repetitions; cùng source/config/fixture và DB cô lập/reset. POST cuối mỗi lượt, reset sau. | Request/path/body, status, headers, raw body, stderr, service logs, version/hash và bằng chứng profile/SQL/effective config; 40 là số planned slots, chưa chạy. |
| joinIds/getVisitsForPets | Dùng HTTP stub/capture có kiểm soát để quan sát URI/query của danh sách pets 7,8 trên hai snapshot. | URI/query thực gửi, danh sách đầu vào và response; phân biệt lời gọi source với thực thi đã quan sát. |
| setHostname | Kiểm hostname mặc định và sau khi gọi setter từ test cùng package; capture địa chỉ đích thực tế trên hai snapshot. | Bằng chứng setter được gọi, giá trị trước/sau và destination; không suy setter được exercise từ gateway 200. |
| addVisitsToOwner | Áp dụng Function thực sự với owner/pets/visits có dữ liệu, hoặc quan sát qua handler với upstream được kiểm soát. | Owner trả về có visits 1/4 ở pet7, 2/3 ở pet8; đủ trường và bằng chứng Function/lambda thực thi, không chỉ quan sát helper trả Function. |
| emptyVisitsForPets/circuit breaker | Tạo lỗi hoặc timeout upstream có kiểm soát, cùng policy/config trên baseline/mutated; tách khỏi ca dữ liệu rỗng hợp lệ. | Bằng chứng nhánh fallback được gọi và kết quả Mono/owner, lỗi/timeout/config và raw; HTTP 200/rỗng đơn lẻ chưa chứng minh nhánh. |

Chưa chạy app, Docker, POST, mutation hoặc phép thử nào trong bảng này. Đây là đề nghị thu evidence ở giai đoạn runtime riêng; không tự cấp quyền chạy, không sửa consumer/config để ép kết quả, không dùng parser/graph/retrieval/prediction/score làm đáp án.

## Cách bàn giao khi chưa đóng hết điểm mở

Có thể nộp kết quả kiểm phạm vi với kết luận **cần sửa**, kèm F01 chờ xác nhận, F02 có proposal chưa active và F03 missing. Xác nhận bằng tên của Phạm Nguyên Phát đã ghi riêng trong RETURN_PHAT.md theo yêu cầu trực tiếp; không ghi thời điểm hoàn thành vì người kiểm không nhớ chính xác. Không gọi proposal/notes là accepted ground truth, test lock hoặc scoring approval.
