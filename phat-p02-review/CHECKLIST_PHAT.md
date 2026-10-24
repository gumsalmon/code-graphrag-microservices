# Checklist Phát — kiểm phạm vi P02 trước nhãn

Các dấu chọn ghi theo checklist và xác nhận người kiểm đã cung cấp. Các mục fixture/miền request, rà F02 và kết luận được cập nhật theo lời báo đã hoàn thành và yêu cầu ghi xác nhận bằng tên; không đánh dấu đã giải quyết F01 hoặc kích hoạt proposal.

## 1. Xác nhận nhận việc và đầu vào

- [x] Đọc đầy đủ START_HERE.md, PROJECT_CONTEXT.md, PACKAGE_CONTENTS.md, PORTABLE_PATHS.md và protocol v0.2, đặc biệt §6.1, §9–12.
- [x] Điền xác nhận nhận việc bằng thông tin thật: vai trò, phần đã làm/commit, đầu ra dự kiến và blocker.
- [x] Kiểm ZIP SHA-256 và chạy verifier; đối chiếu pins/hashes. Checksum đạt chỉ chứng minh tính toàn vẹn byte.
- [x] Ghi exposure thật: đã biết census/lịch sử P01 và những draft/nhận định đã xem. Không gọi lượt kiểm này blinded.

## 2. Ghi nhận định từ source

- [x] Đọc trực tiếp VisitResource.java, VisitsServiceClient.java và ApiGatewayController.java; đối chiếu patch, config và fixture.
- [x] Ghi source notes riêng; khai đúng exposure khi đã xem draft, không tạo checkpoint hồi tố trước exposure.
- [x] Giữ gói gốc và checkpoint nguồn soạn ban đầu; không đổi tác giả hoặc ký nhận như thể mọi nội dung là nhận định độc lập do mình tự lập.

## 3. Kiểm từng ID, exclusion và alias

- [x] Đi từng dòng inventory trong SOURCE_NOTES.md: 15 entity, gồm 12 eligible và 3 seed/seed owner. Tự kiểm ID, file/dòng và membership.
- [x] Phân biệt read(int) với read(List<Integer>); kiểm prefix gateway, wildcard * và HTTP method của từng API. Người kiểm xác nhận đã trực tiếp kiểm và đồng ý kết quả; không là khóa universe hoặc duyệt nhãn.
- [x] Kiểm đủ exclusions: ba constructor, lambda/record implicit/generated methods và source hỗ trợ ngoài ba file. Excluded không có nghĩa không ảnh hưởng.
- [x] Kiểm từng alias baseline/mutated/canonical, đặc biệt seed đổi thành read(List<Integer>,boolean). Không ghép theo tên gần giống hoặc chỉ đổi confirmed=false thành true.
- [x] Xác nhận giới hạn ba file/3-hop, loại seed ở cả ba cấp và không tự nhận credit Method→API→Service. Người kiểm xác nhận đã trực tiếp kiểm và đồng ý kết quả; không là khóa universe hoặc duyệt nhãn.

## 4. Xử lý các điểm còn mở

- [ ] F01: xác nhận intended fixture khi universe v1 pin 2a837540… nhưng fixture ship/raw baseline pin 2a319f48…; kiểm proposal/version mới, chưa coi đã khóa. Câu hỏi dự phòng và nhánh xử lý ở OPEN_POINTS.md; bước liên hệ tạm để sau, F01 giữ unresolved khi hoàn thiện RETURN.
- [x] F02: kiểm source refs dưới input/app và patch tại benchmark/p02/preparation.v1; kiểm annotation mapping cùng declaration. Người kiểm báo hoàn thành rà và đồng ý đề nghị sửa 29 refs có căn cứ trong kết luận CẦN SỬA; proposal v3 vẫn chưa active, chờ bên giữ input tiếp nhận khi đủ điều kiện.
- [x] Fixture: đối chiếu SQL/schema/raw body owner 6, pets 7–8, bốn visits; owner 1/pet 1 là đối chứng rỗng. Ghi nhận hoàn thành theo lời người kiểm; không xác nhận intended fixture F01 hoặc hành vi mutated.
- [x] F03: ghi riêng thiếu mutated, POST, hai repetitions/reset và phép thử helper/setter/fallback; không suy mọi method không ảnh hưởng từ HTTP 200. Người kiểm xác nhận kết luận với giới hạn missing/unresolved này; danh sách phép thử ở OPEN_POINTS.md vẫn chưa thực thi.
- [x] Phân biệt request cũ bỏ includeDetails với true/false/empty và diagnostic invalid boolean/missing petId. Người kiểm báo hoàn thành phần đối chiếu miền request; chưa suy kết quả binding/runtime mutated.

## 5. Hoàn thiện và bàn giao

- [ ] Hoàn thiện và bàn giao RETURN_PHAT.md cùng notes/checklist: đã có bằng chứng, file/dòng, hashes, command/log, bất đồng, phần chưa làm, subset portable và xác nhận kết luận. Danh sách đầy đủ tên các draft JSON người kiểm trực tiếp mở vẫn chưa khai; chưa gửi/commit/push bộ file.
- [x] Chọn kết luận thật: Phạm Nguyên Phát xác nhận CẦN SỬA, chưa đủ điều kiện đề nghị khóa bộ input; F01/F03 vẫn unresolved/missing và proposal F02 chưa active. Version/hash và điều kiện còn thiếu được kê ở RETURN.
- [x] Ghi xác nhận bằng tên Phạm Nguyên Phát trong RETURN theo yêu cầu trực tiếp của người kiểm. Không ghi thời điểm hoàn thành vì người kiểm không nhớ chính xác; không dùng thời điểm ACK hoặc công cụ thay thế. Việc bàn giao được kê riêng ở mục trên.
- [x] Giữ raw/draft frozen; mọi sửa đổi có version/lý do riêng. Trong lượt xử lý này chưa mở nhãn, accepted/test/scoring, P03/P04; không merge/main/force push. Xác nhận phạm vi không cấp quyền cho các bước đó.

## Phần chuẩn bị hồ sơ đã hoàn thiện

Đã điền phần bằng chứng trong RETURN_PHAT.md, chuẩn bị proposal F02 và kế hoạch F03, đóng gói subset inputs/ đúng byte với manifest/giấy phép và refs dùng được sau clone. Đã ghi xác nhận bằng tên cho kết luận CẦN SỬA theo yêu cầu của người kiểm; không ghi thời điểm hoàn thành. F01 tạm để sau, giữ unresolved; proposal F02 chưa active, F03 vẫn missing.

Đợt kiểm bổ sung bằng công cụ lúc 2026-10-17T00:26:41+07:00 đã hoàn tất fixture/SQL/raw (hai nhóm owner/pet, bốn visits, chín cặp GET), 40 case của request-plan chưa thực thi và toàn bộ thay đổi F02 (15 alias, 29 refs, bốn file đích). Đây là mốc log công cụ lịch sử. Sau đó người kiểm báo đã hoàn thành các phần đối chiếu và yêu cầu ghi xác nhận bằng tên cho kết luận CẦN SỬA; các mục tương ứng được cập nhật theo xác nhận đó, không theo timestamp công cụ.
