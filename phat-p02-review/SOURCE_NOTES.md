# Source notes P02

Trạng thái: bản làm việc kiểm phạm vi trước nhãn; chưa khóa universe, chưa gán polarity hoặc duyệt nhãn.

- Người kiểm và xác nhận bằng tên: Phạm Nguyên Phát, ghi theo yêu cầu trực tiếp trong trao đổi cho kết luận CẦN SỬA ở RETURN.
- Không ghi thời điểm hoàn thành vì người kiểm không nhớ chính xác; không lấy timestamp công cụ/raw/ACK để thay thế.
- Tài liệu đã tự đọc trước notes: PROJECT_CONTEXT v0.6 và các tài liệu trong checklist.
- Phạm vi đã báo thực hiện: đọc trực tiếp S1/S2/S3, đối chiếu patch/config/fixture và đã đối chiếu toàn bộ 15 dòng Inventory (ID, file/dòng, membership) với source theo xác nhận người kiểm. Người kiểm cũng xác nhận đã kiểm xong 8 nhóm exclusions và 15 alias baseline/mutated/canonical, overload/mapping cùng cách ghi phạm vi ba file, giới hạn 3-hop và seed/projection. Trong xác nhận bổ sung, người kiểm báo đã hoàn thành đối chiếu fixture/SQL/raw, miền request và rà F02, yêu cầu ghi xác nhận bằng tên cho kết luận CẦN SỬA. Ghi nhận theo lời người kiểm, không chứng nhận độc lập thao tác cá nhân. F01/F03 vẫn unresolved/missing, proposal F02 chưa active; chưa khóa universe hoặc gán polarity.
- Exposure: theo ACK, đã biết census dự thảo, nhận định chuẩn bị, F01 và đề nghị v2; người kiểm đã báo kiểm các bảng inventory/exclusions/alias và overload/mapping. Danh sách tên file draft người kiểm trực tiếp mở chưa được khai đầy đủ, không suy việc kiểm bảng đồng nghĩa đã mở mọi JSON. Phần hỗ trợ soạn thảo đã đọc inventory v1, universe v1, request-plan v1, proposal v3 và raw baseline được phép. Không gọi lượt này blinded.
- Nguồn soạn thảo: có hỗ trợ AI trong việc tổ chức bảng và kiểm byte, đã tiếp xúc draft; nhận xét/xác nhận cuối thuộc người kiểm thật.

## Input references


Gốc bằng chứng đi kèm: `inputs/`. Các path evidence dưới đây tương đối gốc này; số dòng bắt đầu từ 1, baseline trừ khi ghi rõ khác. Đây là subset 58 file trích đúng byte từ package frozen, có manifest riêng inputs/CHECKSUMS.sha256; không phải full package 399 file của verifier gốc.

Metadata chép từ gói/hồ sơ đã kiểm; người kiểm ghi rõ phần tự đối chiếu của mình:

- Source pin: `3858f9c630cf989bb6809a86edf47c2be78dc9f1`
- Config pin: `323993ce2519c6d02df63e08bf4458d123d3b611`
- Protocol v0.2 pin: `5f9204d66253604edf9101c2f888fc7e75aa0be7`
- Patch: `benchmark/p02/preparation.v1/optional-query.patch`, SHA-256 `091b04de4a504512cbda4e0c5c0759b747b056b4c7028923d8b7808b43303c4f`
- Fixture đang ship: `benchmark/p02/preparation.v1/fixture.json`, SHA-256 `2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191`; liên kết hash trong universe còn là blocker F01; intended fixture chưa được xác nhận.

| Ref | File evidence trong gói |
| --- | --- |
| S1 | `input/app/spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java` |
| S2 | `input/app/spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/application/VisitsServiceClient.java` |
| S3 | `input/app/spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java` |
| C1 | `input/app/spring-petclinic-visits-service/src/main/resources/application.yml` |
| C2 | `input/app/spring-petclinic-api-gateway/src/main/resources/application.yml` |
| C3 | `input/config/application.yml` |
| Q1 | `input/app/spring-petclinic-customers-service/src/main/resources/db/hsqldb/data.sql` |
| Q2 | `input/app/spring-petclinic-customers-service/src/main/resources/db/hsqldb/schema.sql` |
| Q3 | `input/app/spring-petclinic-visits-service/src/main/resources/db/hsqldb/data.sql` |
| Q4 | `input/app/spring-petclinic-visits-service/src/main/resources/db/hsqldb/schema.sql` |
| P1 | `benchmark/p02/preparation.v1/optional-query.patch` |
| F1 | `benchmark/p02/preparation.v1/fixture.json` |
| SC | `benchmark/p02/preparation.v1/scenario.json` |
| SP | `benchmark/p02/preparation.v1/scope.json` |
| PR | `benchmark/protocol/benchmark_protocol_v0.2.md` |
| U1 | `draft/evaluation_universe.draft.v1.json` |
| I1 | `draft/inventory.v1.json` |
| B1 | `evidence/baseline/inputs.json` |
| L1 | `evidence/baseline/logs/visits-service.log` |
| L2 | `evidence/baseline/logs/api-gateway.log` |
| L3 | `evidence/baseline/logs/customers-service.log` |
| L4 | `evidence/baseline/logs/config-server.log` |

S1 SHA-256 đối chiếu khi tạo biểu mẫu: `0bf7d4638add57363cde29b964d9fcc44ac55da9df320ff1ebfebc5c9f0786cd`. Đây là kiểm byte, không phải nhận xét của người kiểm thật.

## Quy tắc phạm vi tự đối chiếu

Phạm vi census đề nghị giới hạn S1/S2/S3; lấy mọi explicit non-constructor method, gồm private/package-private, mapping HTTP của hai controller và owning service. Constructor, field, lambda/generated record methods ghi exclusion riêng; source/config/SQL khác chỉ hỗ trợ evidence ngoài census. Seed method/API và seed-owner visits-service lưu riêng, không coi excluded là negative. Không mở rộng/thu hẹp theo output hệ thống; chưa xác nhận full-repo recall hoặc độ phủ 3 logical hops. Protocol PR:45–77,115–122,220–246 hỗ trợ ID/seed/alias; người kiểm đã xác nhận cách ghi census ba file và giới hạn hop, chưa khóa universe.

## Bước đang làm: VisitResource.java

Đọc toàn file để biết package/imports, rồi tập trung S1:44–82. Các câu hỏi để người kiểm tự đối chiếu; evidence cho nhiệm vụ 1–2 được tổ chức riêng bên dưới:

1. Class FQN và owning service là gì? Service có file application.yml hỗ trợ định danh không? Ghi file/dòng.
2. Có những method declaration tường minh nào? Ghi tên + kiểu tham số theo đúng thứ tự, dòng declaration và thân. Phân biệt overload; tên method đơn lẻ chưa đủ ID.
3. Mỗi HTTP mapping trỏ tới handler nào? Ghi HTTP verb, path và annotation line; kiểm class mapping nếu có, giữ wildcard và tách query khỏi API path.
4. Constructor và nested record nằm ở đâu? Đề nghị đưa vào/loại khỏi census theo quy tắc nào, vì sao? Không coi excluded là negative.
5. Đọc patch: declaration trước/sau thay đổi gì? Ghi annotation parameter, default và phần body/consumer cần đối chiếu. Source/patch không tự chứng minh hành vi runtime.

### Evidence S1

Nguồn sử dụng trong phần này: toàn bộ S1 (82 dòng), cùng `input/app/spring-petclinic-visits-service/src/main/resources/application.yml:1–5` để đối chiếu owning service. SHA-256 S1 đối chiếu lại là `0bf7d4638add57363cde29b964d9fcc44ac55da9df320ff1ebfebc5c9f0786cd`, khớp input đã pin. Exposure được khai báo ở đầu file.

Đây là trích xuất/tổ chức evidence từ source, không là kết quả chạy app hoặc polarity. Thông tin người kiểm và xác nhận kết luận phạm vi được ghi riêng ở đầu file/RETURN theo yêu cầu trực tiếp của người kiểm; không suy thời điểm hoàn thành. Phần S1 bên dưới tổ chức evidence cho nhiệm vụ 1–2; patch/inventory/alias/fixture được tổ chức ở các mục tiếp theo; trạng thái kiểm theo CHECKLIST_PHAT.md.

**Định danh lớp và service**

- Package: `org.springframework.samples.petclinic.visits.web` — S1:16.
- Class: `VisitResource` — S1:46; FQN là `org.springframework.samples.petclinic.visits.web.VisitResource`.
- Owning service đề nghị: `visits-service` — file `application.yml:1–3` khai báo `spring.application.name: visits-service`; module source là `spring-petclinic-visits-service`.
- Annotation cấp lớp: `@RestController` và `@Timed("petclinic.visit")` — S1:44–45. Không có `@RequestMapping` cấp lớp trong S1; không thêm prefix cấp lớp không được khai báo.

**Method declaration tường minh**

| Signature theo cách viết source/import | Return type | Declaration | Thân/đóng method | Evidence đọc trực tiếp |
|---|---|---|---|---|
| `create(Visit,int)` | `Visit` | S1:58–60 | S1:62–65 | Tham số `Visit visit`, `int petId`; body gọi `visit.setPetId(petId)` và `visitRepository.save(visit)`. |
| `read(int)` | `List<Visit>` | S1:68 | S1:69–70 | Tham số `int petId`; body gọi `visitRepository.findByPetId(petId)`. |
| `read(List<Integer>)` | `Visits` | S1:73 | S1:74–76 | Tham số `List<Integer> petIds`; body gọi `visitRepository.findByPetIdIn(petIds)` rồi tạo `new Visits(byPetIdIn)`. |

`List` được import tại S1:18, `Visit` tại S1:26. Signature trên giữ cách viết source/import theo hồ sơ P02; không dùng tên biến làm parameter type và không đồng nhất `read(int)` với `read(List<Integer>)`. Hai method cùng tên `read` khác kiểu tham số, phải giữ overload riêng. `Visits` là nested record được khai báo trong chính lớp tại S1:78–81.

**HTTP mappings và handler**

Path trong bảng được chuẩn hóa có dấu `/` đầu theo quy ước API ID; giữ nguyên wildcard/placeholder trong annotation. Đây là mapping khai báo, chưa phải quan sát runtime.

| HTTP method | Path chuẩn hóa | Handler | Annotation line | Bằng chứng bổ sung |
|---|---|---|---|---|
| POST | `/owners/*/pets/{petId}/visits` | `create(Visit,int)` | S1:56 | S1:57 khai báo `@ResponseStatus(HttpStatus.CREATED)`; S1:59–60 nhận request body và path variable petId. Chưa có POST runtime trong phần này. |
| GET | `/owners/*/pets/{petId}/visits` | `read(int)` | S1:67 | S1:68 nhận `@PathVariable("petId") @Min(1) int petId`. |
| GET | `/pets/visits` | `read(List<Integer>)` | S1:72 | S1:73 nhận `@RequestParam("petId") List<Integer> petIds`; query parameter được ghi riêng, không thêm query value vào API path. |

Không đổi `*` thành `{ownerId}`: source dùng wildcard `*`, không khai báo path variable ownerId ở các handler này. Hai mapping cùng path owners/pets nhưng khác HTTP method là hai API riêng.

**Constructor, nested record và đề nghị exclusions**

| Thành phần | Source span | Nhận định từ source / đề nghị để Phát kiểm |
|---|---|---|
| Constructor `VisitResource(VisitRepository)` | S1:52–54 | Tên trùng lớp, không có return type, body gán field `visitRepository`. Đề nghị loại khỏi census explicit non-constructor methods theo phạm vi đã mô tả; không gán negative. |
| Nested record `Visits(List<Visit> items)` | S1:78–81 | Trong record này không có method body tường minh. Đề nghị không tạo Method ID riêng cho constructor/accessor/generated methods không được khai báo tường minh trong source; nếu thay quy tắc scope phải ghi version/lý do riêng. |
| Các field `log`, `visitRepository` | S1:48–50 | Là field declaration, không phải method declaration. Không thêm làm Method entity. |
| Các call expressions `setPetId`, `save`, `findByPetId`, `findByPetIdIn` | S1:62,64,69,74 | Là lời gọi trong body, không phải declaration method mới trong VisitResource. Source hỗ trợ của các đích gọi cần kiểm riêng nếu dùng làm evidence; không tự thêm vào census S1. |

Đếm declaration trong riêng S1: 3 explicit non-constructor methods, 3 HTTP mappings (1 POST/2 GET), 1 constructor tường minh và 1 nested record. Số đếm này chỉ phục vụ kiểm source; chưa xác nhận độ phủ universe, alias, seed membership hoặc hành vi P02. Phát cần tự đối chiếu các span và ghi nhận định của mình.

**Đoạn nhận định S1 có sẵn trong bản làm việc:**

Đoạn dưới giữ nội dung đối chiếu trong bản ghi này; nguồn soạn thảo và trạng thái xác nhận theo CHECKLIST_PHAT.md. Nhận xét của người kiểm ghi theo xác nhận thực tế; không ghi thời điểm hoàn thành do người kiểm không nhớ chính xác.

VisitResource.java có ba method tường minh: create(Visit,int) tại dòng 58–65, read(int) tại dòng 68–70 và read(List<Integer>) tại dòng 73–76. Hai method read khác kiểu tham số nên phải được định danh riêng.

Mapping GET /pets/visits tại dòng 72 thuộc handler read(List<Integer>) ở dòng 73. Mapping GET /owners/*/pets/{petId}/visits tại dòng 67 thuộc read(int). Cần giữ nguyên wildcard * theo source.

Patch P02 sửa declaration của read(List<Integer>), thêm tham số boolean includeDetails với required=false và defaultValue="false". Signature sau sửa là read(List<Integer>,boolean). Dòng cũ trong patch khớp source baseline. Evidence: S1:73; P1:8–10.

Mapping GET /pets/visits và hai câu lệnh trong body được giữ nguyên: gọi visitRepository.findByPetIdIn(petIds) rồi trả new Visits(byPetIdIn). Evidence: S1:72–75; P1:7–12. Toàn patch không chứa thay đổi consumer, config hoặc SQL.

Constructor tại S1:52–54 và nested record tại S1:78–81 ghi riêng khi kiểm exclusions. Loại constructor và các method do compiler sinh khỏi census explicit non-constructor methods theo phần exclusions người kiểm đã xác nhận; không có nghĩa các thực thể đó là negative.

### Đối chiếu patch với source

**Nguồn đối chiếu**

- S1: [VisitResource.java](inputs/input/app/spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java#L72), baseline commit `3858f9c630cf989bb6809a86edf47c2be78dc9f1`.
- P1: [optional-query.patch](inputs/benchmark/p02/preparation.v1/optional-query.patch#L1).
- SHA-256 S1: `0bf7d4638add57363cde29b964d9fcc44ac55da9df320ff1ebfebc5c9f0786cd`.
- SHA-256 P1: `091b04de4a504512cbda4e0c5c0759b747b056b4c7028923d8b7808b43303c4f`.

**Kết quả đối chiếu**

| Nội dung        | Nhận định từ source/patch                                                                                             | Evidence           |
| --------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Method bị sửa   | Overload `read(List<Integer>)` của `VisitResource`.                                                                   | S1:73; P1:8–10     |
| Dòng cũ         | Declaration bị thay thế trong patch khớp declaration tại source baseline.                                             | S1:73; P1:8        |
| Signature trước | `read(List<Integer>)`.                                                                                                | S1:73              |
| Signature sau   | `read(List<Integer>,boolean)`.                                                                                        | P1:9–10            |
| Tham số thêm    | `boolean includeDetails`, query name `includeDetails`, khai báo `required=false`, `defaultValue="false"`.             | P1:10              |
| Tham số cũ      | `@RequestParam("petId") List<Integer> petIds` được giữ nguyên.                                                        | S1:73; P1:8–9      |
| API mapping     | Vẫn là GET `/pets/visits`.                                                                                            | S1:72; P1:7        |
| Thân method     | Vẫn gọi `visitRepository.findByPetIdIn(petIds)` rồi trả `new Visits(byPetIdIn)`. Hai dòng này giữ nguyên trong patch. | S1:74–75; P1:11–12 |
| Overload khác   | `read(int)` không phải method được sửa.                                                                               | S1:67–70; P1:8–10  |
| Phạm vi diff    | Toàn patch chỉ chứa thay đổi declaration trong `VisitResource.java`; không chứa thay đổi consumer, config hoặc SQL.   | P1:1–13            |

**Đề nghị ánh xạ seed**

Từ bằng chứng trên, đề nghị ánh xạ signature trước `read(List<Integer>)` và signature sau `read(List<Integer>,boolean)` về cùng logical seed tại cùng lớp/service. Đây là đề nghị từ source/patch, chưa phải xác nhận alias của Phát; seed vẫn được lưu riêng khỏi tập tác động lan truyền.
Giới hạn và phần chưa xác nhận

Kết quả trên chỉ mô tả thay đổi khai báo trong code. required=false, default false và body giữ nguyên chưa chứng minh hành vi runtime không đổi. Gói chưa có runtime mutated; chưa gán positive/negative hoặc xác nhận hành vi của consumer/helper/setter.

Phần SQL/fixture chưa được đối chiếu trong đoạn này.

## Inventory từ declaration

Inventory được tổ chức từ declaration S1/S2/S3 rồi so membership của I1/U1. Người kiểm xác nhận đã đối chiếu toàn bộ 15 dòng về ID, file/dòng và membership với source. Ghi nhận này áp dụng cho bảng Inventory; chưa là xác nhận exclusions/alias, khóa universe hoặc kết luận behavioral impact. STT là số dòng tham chiếu nội bộ.

| Thành phần | Giá trị / cách lấy |
| --- | --- |
| Repository | `spring-petclinic-microservices` — SC:8 |
| Snapshot canonical | `3858f9c630cf989bb6809a86edf47c2be78dc9f1` — SC:9; PR:220–225 |
| Service của S1 | visits-service — C1:1–3 |
| Service của S2/S3 | api-gateway — C2:1–3 |
| Class FQN | Package + tên class: S1:16,46; S2:16,31; S3:16,38 |
| Method signature | Tên method + kiểu tham số theo thứ tự; bỏ annotation/tên biến/final. Giữ cách viết source/import; phân biệt overload. |

Method ID: `repository@snapshot::service::class_fqn#method(parameter_types)`. API ID: `repository@snapshot::service::HTTP_METHOD /normalized_path`. Service ID: `repository@snapshot::service` (PR:45–69).

`eligible`, `seed`, `seed_owner`, `excluded` chỉ mô tả phạm vi census đề nghị. Seed method/API và service chứa seed ghi riêng theo PR:73–77; không có polarity trong bảng. Kiểm kê có 9 Method, 4 API, 2 Service trước loại seed; tập eligible đề nghị có 8 Method, 3 API, 1 Service. Không suy ra độ phủ toàn repository hoặc giới hạn hop từ số đếm này.

| STT | Level | Canonical ID đề nghị | Source file/dòng | Seed / eligible / excluded | Căn cứ / điều cần xác minh |
| --- | --- | --- | --- | --- | --- |
| 1 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#create(Visit,int)` | S1:58–65 | eligible | Khai báo hai tham số Visit, int; tạo/lưu visit. Chưa có POST runtime. Đã đối chiếu inventory theo xác nhận người kiểm. |
| 2 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(int)` | S1:68–70 | eligible | Overload nhận int, gọi findByPetId; tách khỏi overload seed. Đã đối chiếu inventory theo xác nhận người kiểm. |
| 3 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>)` | S1:73–76 | seed / excluded | P1:8–10 đổi signature thành read(List<Integer>,boolean); lưu riêng seed. Đã đối chiếu inventory theo xác nhận người kiểm. |
| 4 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#getVisitsForPets(List<Integer>)` | S2:42–48 | eligible | Client gửi GET có petId; S2:45 chưa gửi includeDetails. Dependency chưa là impact. Đã đối chiếu inventory theo xác nhận người kiểm. |
| 5 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#joinIds(List<Integer>)` | S2:50–52 | eligible | Private method tường minh, nối ID bằng dấu phẩy; không loại chỉ vì private. Đã đối chiếu inventory theo xác nhận người kiểm. |
| 6 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#setHostname(String)` | S2:54–56 | eligible | Method package-private gán hostname; chưa có evidence runtime gọi setter. Đã đối chiếu inventory theo xác nhận người kiểm. |
| 7 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#getOwnerDetails(int)` | S3:55–66 | eligible | Handler ghép customers/visits và circuit breaker; HTTP 200 không đủ phân biệt nhánh. Đã đối chiếu inventory theo xác nhận người kiểm. |
| 8 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#addVisitsToOwner(OwnerDetails)` | S3:68–78 | eligible | Trả Function; lambda lọc visit theo petId rồi addAll. Cần quan sát khi Function được áp dụng. Đã đối chiếu inventory theo xác nhận người kiểm. |
| 9 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#emptyVisitsForPets()` | S3:80–82 | eligible | Private helper trả Mono có Visits rỗng; thiếu thử lỗi/timeout có kiểm soát. Đã đối chiếu inventory theo xác nhận người kiểm. |
| 10 | api | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::POST /owners/*/pets/{petId}/visits` | S1:56–65 | eligible | PostMapping giữ wildcard *; @ResponseStatus CREATED là khai báo, chưa phải quan sát. Đã đối chiếu inventory theo xác nhận người kiểm. |
| 11 | api | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::GET /owners/*/pets/{petId}/visits` | S1:67–70 | eligible | GetMapping gắn read(int); không đổi * thành ownerId placeholder. Đã đối chiếu inventory theo xác nhận người kiểm. |
| 12 | api | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::GET /pets/visits` | S1:72–76; P1:7–12 | seed / excluded | API seed; query lưu riêng, không đưa petId/includeDetails vào API ID. Đã đối chiếu inventory theo xác nhận người kiểm. |
| 13 | api | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::GET /api/gateway/owners/{ownerId}` | S3:37,54–66 | eligible | Ghép prefix /api/gateway với owners/{ownerId}; handler getOwnerDetails(int). Đã đối chiếu inventory theo xác nhận người kiểm. |
| 14 | service | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service` | C1:1–3 | seed_owner / excluded | Tên application/service từ config; nhận diện service không chứng minh hành vi tổng thể. Đã đối chiếu inventory theo xác nhận người kiểm. |
| 15 | service | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway` | C2:1–3 | eligible | Tên application/service từ config; nhận diện service không chứng minh hành vi tổng thể. Đã đối chiếu inventory theo xác nhận người kiểm. |

### Exclusions — phạm vi đề nghị

Người kiểm xác nhận đã kiểm xong 8 nhóm exclusions bên dưới. Quy tắc explicit non-constructor methods trong ba file là phạm vi census đề nghị, không phải quy tắc loại constructor/private method chung do protocol tự áp đặt. Xác nhận đã kiểm exclusions không thay quyết định riêng về độ phủ/hop hoặc khóa universe.

| STT | Declaration/loại thực thể | Source file/dòng | Lý do đề nghị exclusion | Câu hỏi / phần chưa tự kiểm |
| --- | --- | --- | --- | --- |
| 1 | Constructor VisitResource(VisitRepository) | S1:52–54 | Constructor không có return type; đề nghị loại khỏi census explicit non-constructor methods. | Rule census đã được đối chiếu; không suy ra negative. Đã kiểm exclusions theo xác nhận người kiểm. |
| 2 | Constructor VisitsServiceClient(WebClient.Builder) | S2:38–40 | Khởi tạo webClientBuilder; ghi riêng lifecycle, không tạo Method ID trong phạm vi đề nghị. | Không loại setHostname(String): đó là method tường minh. Đã kiểm exclusions theo xác nhận người kiểm. |
| 3 | Constructor ApiGatewayController(CustomersServiceClient,VisitsServiceClient,ReactiveCircuitBreakerFactory) | S3:46–52 | Gán ba dependency fields; đề nghị loại constructor khỏi census. | Exclusion đã được đối chiếu; nếu thay phạm vi phải tạo version và lý do. Đã kiểm exclusions theo xác nhận người kiểm. |
| 4 | Nested record Visits và method do compiler sinh | S1:78–81 | Record không có explicit method body; không dựng ID cho accessor/constructor sinh ngầm. | Không có nghĩa record không tham gia response; chỉ là rule inventory. Đã kiểm exclusions theo xác nhận người kiểm. |
| 5 | Lambda và method reference | S2:51; S3:57–77 | Giữ enclosing method; không tạo ID synthetic riêng cho lambda/Object::toString. | Return Function tại S3:68 khác lúc lambda thực thi; cần evidence riêng nếu kết luận hành vi. Đã kiểm exclusions theo xác nhận người kiểm. |
| 6 | Field declarations | S1:48–50; S2:34–36; S3:40–44 | Field không phải method/API/service declaration. | Hostname field vẫn là evidence URI; không bỏ method setter ra khỏi census. Đã kiểm exclusions theo xác nhận người kiểm. |
| 7 | Call expressions bên trong method | S1:62,64,69,74; S2:43–47; S3:56–63 | Lời gọi không phải declaration mới trong ba file; không tự tạo entity ngoài phạm vi. | Nếu cần đọc source đích gọi thì ghi evidence hỗ trợ ngoài census. Đã kiểm exclusions theo xác nhận người kiểm. |
| 8 | Các file/service còn lại trong repository; DTO/model/repository/test/bootstrap | Phạm vi S1/S2/S3; Q1–Q4 và C1–C3 dùng làm evidence hỗ trợ | Đề nghị census giới hạn ba file, không phải recall toàn repository; seed method/API và seed-owner service ghi riêng ở inventory. | Độ phủ/giới hạn 3 logical hops trong U1:14 còn là mục riêng; chưa có chứng minh độ phủ toàn repository. Đã kiểm exclusions theo xác nhận người kiểm. |

## Ghi nhận S2 / S3 / source hỗ trợ

Các span dưới đây giúp Phát đọc và kiểm từng ý. Các helper/setter có declaration tường minh vẫn được giữ trong inventory. Nhận định source không thay quan sát hành vi.

| STT | Ref / tên file | Declaration hoặc biểu thức đã xem | Dòng evidence | Nhận định từ source / câu hỏi | Trạng thái kiểm chi tiết |
| --- | --- | --- | --- | --- | --- |
| 1 | S2 | getVisitsForPets(List<Integer>) | 16,31,42–48 | FQN từ package/class; WebClient GET tới hostname + pets/visits?petId={petId}; không gửi includeDetails. Đây là quan hệ source, chưa là impact. | Theo CHECKLIST_PHAT.md. |
| 2 | S2 | joinIds(List<Integer>) | 50–52 | Private helper nối ID bằng dấu phẩy; cần capture URI/query cho danh sách có dữ liệu. | Theo CHECKLIST_PHAT.md. |
| 3 | S2 | hostname và setHostname(String) | 34–36,54–56 | Giá trị ban đầu http://visits-service/; setter có thể ghi đè. Chưa biết lần chạy có gọi setter hay dùng hostname nào. | Theo CHECKLIST_PHAT.md. |
| 4 | S2 | Constructor | 38–40 | Chỉ gán WebClient.Builder; đề nghị exclusion constructor, giữ cả 3 explicit methods. | Theo CHECKLIST_PHAT.md. |
| 5 | S3 | Prefix/mapping/getOwnerDetails(int) | 37,54–66 | GET /api/gateway/owners/{ownerId}; lấy owner, gọi visits, circuit breaker, rồi áp dụng addVisitsToOwner. | Theo CHECKLIST_PHAT.md. |
| 6 | S3 | Circuit breaker/fallback | 58–63,80–82 | cb.run nhận fallback emptyVisitsForPets(); helper trả Mono<Visits> rỗng. Response rỗng không tự chứng minh fallback đã chạy. | Theo CHECKLIST_PHAT.md. |
| 7 | S3 | addVisitsToOwner(OwnerDetails) | 68–78 | Method trả Function; lambda lọc petId == pet.id và addAll. Cần owner 6/pets 7–8 và đối chứng lỗi/timeout để tách nhánh. | Theo CHECKLIST_PHAT.md. |
| 8 | S3 | Constructor/fields/lambdas | 40–52,57–77 | Constructor và lambda ghi exclusion riêng; không bỏ private helper ra khỏi Method inventory. | Theo CHECKLIST_PHAT.md. |
| 9 | C1/C2 | spring.application.name | C1:1–3; C2:1–3 | visits-service / api-gateway là owning service của ba source; các routes /api/visit/** trong C2:27–32 không phải mapping mới trong S3 census. | Theo CHECKLIST_PHAT.md. |
| 10 | C3 | SQL config và override | 13–14,19–23,83–107 | Default SQL HSQLDB; profile docker có tracing, mysql thay SQL; override được phép nên chỉ đọc YAML chưa đủ xác nhận effective runtime config. | Theo CHECKLIST_PHAT.md. |
| 11 | Q1/Q2/Q3/Q4 | Owner/pet keys và thứ tự cột visits | Q1:8,13,19,25–26; Q2:11–29; Q3:1–4; Q4:3–8 | Đối chiếu tuple SQL với fixture; schema làm rõ owner_id, pet_id, visit_date. Evidence hỗ trợ ngoài census. | Theo CHECKLIST_PHAT.md. |
| 12 | L1/L3/L4 và raw config | Framework/profile/database ghi trong raw | L1:8,10–11,36,94–97; L3:94–97; L4:11 | Log baseline ghi Boot 4.0.1, Java 17.0.20, docker, HSQLDB 2.7.3; config-server native. Đây là dữ kiện raw được cung cấp, chưa tái chạy hay xác thực binary độc lập. | Theo CHECKLIST_PHAT.md. |

## Alias và fixture

Identity được đối chiếu dưới đúng patch P1 và dữ liệu fixture/SQL/raw baseline được cung cấp. Chưa có runtime mutated; trạng thái xác nhận alias/fixture theo CHECKLIST_PHAT.md. Alias xác nhận cùng thực thể qua mutation, không xác nhận behavior không đổi.

### Snapshot / patch identity

| Thành phần cần ghi | Giá trị | Nguồn file/dòng hoặc log | Phần đã đối chiếu / còn thiếu |
| --- | --- | --- | --- |
| Baseline commit / snapshot | `3858f9c630cf989bb6809a86edf47c2be78dc9f1` | SC:9; U1:8; B1:4 | Khai báo pin thống nhất; source/hash trong gói. Chưa xác thực upstream commit độc lập. |
| Source file SHA-256 | S1: `0bf7d4638add57363cde29b964d9fcc44ac55da9df320ff1ebfebc5c9f0786cd`<br>S2: `d7d1437c4dce96d4de5f636511d3bcf5549df4a11b7826fde0375bce358f1e13`<br>S3: `bb815e3727be7e56330072d54774944ef5029d66d2d7e56976d7c60dbeafbb21` | Tính lại từ byte S1/S2/S3; INPUT_HASHES.json → files | Đã kiểm byte/declaration trong bản ghi này; phần người kiểm đối chiếu span/identity theo CHECKLIST_PHAT.md. |
| Mutation patch path / SHA-256 | `benchmark/p02/preparation.v1/optional-query.patch`<br>`091b04de4a504512cbda4e0c5c0759b747b056b4c7028923d8b7808b43303c4f` | P1:1–13 | Một hunk khớp source baseline, chỉ thay declaration; không sửa config/consumer/SQL trong diff. |
| Mutated snapshot ID được khai báo | `3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50` | U1:9; SC:4,19–24; patch hash suffix 091b04de4a50 | Đây là định danh draft, không phải commit/build/runtime mutated đã được xác minh. Định danh snapshot được lấy từ draft đã khai báo. |
| Source sau patch / evidence identity nếu có | `c2253806644e38b298988693b44188ecab23c7fd9b2210e809fa12e728292fd0`<br>VisitResource sau patch: 83 dòng | S1 + P1; source tái dựng từ S1 + P1, chưa compile/chạy | Áp hunk trong bộ nhớ trong bản ghi này và khớp từng byte specimen có sẵn; chưa compile/chạy. S1 cũ 73 → sau 73–74; body sau 75–76; record sau 79–82. |

### Alias baseline/mutated/canonical — đã kiểm identity

Người kiểm xác nhận đã kiểm xong 15 alias baseline/mutated/canonical ở mức identity, với canonical baseline (PR:220–246). Signature seed được đổi theo P1; các entity khác giữ service/FQN/signature/path dưới patch chỉ chạm một declaration. Evidence sau patch là source suy ra bằng áp patch chính xác, chưa phải binary/runtime mutated được xác minh. Việc đã kiểm alias không xác nhận hành vi không đổi hoặc tự giải quyết F02 về portable evidence refs.

| STT | Level | Baseline ID / signature | Mutated ID / signature | Canonical ID đề nghị | Evidence trước/sau: file/dòng/hash | Căn cứ / phần chưa rõ |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#create(Visit,int)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50::visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#create(Visit,int)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#create(Visit,int)` | S1:58–65 giữ nguyên trước/sau; P1:1–13 chỉ đổi declaration seed; SHA ở bảng identity. | Service/FQN/signature hoặc verb/path giữ nguyên dưới đúng patch này; chưa xác minh runtime. Đã kiểm identity alias theo xác nhận người kiểm. |
| 2 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(int)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50::visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(int)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(int)` | S1:68–70 giữ nguyên trước/sau; P1:1–13 chỉ đổi declaration seed; SHA ở bảng identity. | Service/FQN/signature hoặc verb/path giữ nguyên dưới đúng patch này; chưa xác minh runtime. Đã kiểm identity alias theo xác nhận người kiểm. |
| 3 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50::visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>,boolean)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>)` | S1:73–76 → sau patch:73–77; P1:8–12; SHA S1/P1/sau patch ở bảng identity. | Cùng logical seed; signature đổi do thêm boolean. Giữ canonical before; lưu seed riêng. Đã kiểm identity alias theo xác nhận người kiểm. |
| 4 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#getVisitsForPets(List<Integer>)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50::api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#getVisitsForPets(List<Integer>)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#getVisitsForPets(List<Integer>)` | S2:42–48; SHA `d7d1437c4dce96d4de5f636511d3bcf5549df4a11b7826fde0375bce358f1e13`; P1:1–13 không chạm file này. | Đề nghị giữ identity service/FQN/signature hoặc path dưới patch được cung cấp; không đồng nhất identity với behavioral impact. Đã kiểm identity alias theo xác nhận người kiểm. |
| 5 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#joinIds(List<Integer>)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50::api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#joinIds(List<Integer>)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#joinIds(List<Integer>)` | S2:50–52; SHA `d7d1437c4dce96d4de5f636511d3bcf5549df4a11b7826fde0375bce358f1e13`; P1:1–13 không chạm file này. | Đề nghị giữ identity service/FQN/signature hoặc path dưới patch được cung cấp; không đồng nhất identity với behavioral impact. Đã kiểm identity alias theo xác nhận người kiểm. |
| 6 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#setHostname(String)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50::api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#setHostname(String)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#setHostname(String)` | S2:54–56; SHA `d7d1437c4dce96d4de5f636511d3bcf5549df4a11b7826fde0375bce358f1e13`; P1:1–13 không chạm file này. | Đề nghị giữ identity service/FQN/signature hoặc path dưới patch được cung cấp; không đồng nhất identity với behavioral impact. Đã kiểm identity alias theo xác nhận người kiểm. |
| 7 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#getOwnerDetails(int)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50::api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#getOwnerDetails(int)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#getOwnerDetails(int)` | S3:55–66; SHA `bb815e3727be7e56330072d54774944ef5029d66d2d7e56976d7c60dbeafbb21`; P1:1–13 không chạm file này. | Đề nghị giữ identity service/FQN/signature hoặc path dưới patch được cung cấp; không đồng nhất identity với behavioral impact. Đã kiểm identity alias theo xác nhận người kiểm. |
| 8 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#addVisitsToOwner(OwnerDetails)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50::api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#addVisitsToOwner(OwnerDetails)` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#addVisitsToOwner(OwnerDetails)` | S3:68–78; SHA `bb815e3727be7e56330072d54774944ef5029d66d2d7e56976d7c60dbeafbb21`; P1:1–13 không chạm file này. | Đề nghị giữ identity service/FQN/signature hoặc path dưới patch được cung cấp; không đồng nhất identity với behavioral impact. Đã kiểm identity alias theo xác nhận người kiểm. |
| 9 | method | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#emptyVisitsForPets()` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50::api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#emptyVisitsForPets()` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#emptyVisitsForPets()` | S3:80–82; SHA `bb815e3727be7e56330072d54774944ef5029d66d2d7e56976d7c60dbeafbb21`; P1:1–13 không chạm file này. | Đề nghị giữ identity service/FQN/signature hoặc path dưới patch được cung cấp; không đồng nhất identity với behavioral impact. Đã kiểm identity alias theo xác nhận người kiểm. |
| 10 | api | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::POST /owners/*/pets/{petId}/visits` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50::visits-service::POST /owners/*/pets/{petId}/visits` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::POST /owners/*/pets/{petId}/visits` | S1:56–65 giữ nguyên trước/sau; P1:1–13 chỉ đổi declaration seed; SHA ở bảng identity. | Service/FQN/signature hoặc verb/path giữ nguyên dưới đúng patch này; chưa xác minh runtime. Đã kiểm identity alias theo xác nhận người kiểm. |
| 11 | api | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::GET /owners/*/pets/{petId}/visits` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50::visits-service::GET /owners/*/pets/{petId}/visits` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::GET /owners/*/pets/{petId}/visits` | S1:67–70 giữ nguyên trước/sau; P1:1–13 chỉ đổi declaration seed; SHA ở bảng identity. | Service/FQN/signature hoặc verb/path giữ nguyên dưới đúng patch này; chưa xác minh runtime. Đã kiểm identity alias theo xác nhận người kiểm. |
| 12 | api | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::GET /pets/visits` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50::visits-service::GET /pets/visits` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service::GET /pets/visits` | S1:72–76 → sau patch:72–77; P1:7–12; SHA ở bảng identity. | Verb/path không đổi; contract query có thêm includeDetails. API vẫn là seed, không suy ra behavior không đổi. Đã kiểm identity alias theo xác nhận người kiểm. |
| 13 | api | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::GET /api/gateway/owners/{ownerId}` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50::api-gateway::GET /api/gateway/owners/{ownerId}` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway::GET /api/gateway/owners/{ownerId}` | S3:37,54–66; SHA `bb815e3727be7e56330072d54774944ef5029d66d2d7e56976d7c60dbeafbb21`; P1:1–13 không chạm file này. | Đề nghị giữ identity service/FQN/signature hoặc path dưới patch được cung cấp; không đồng nhất identity với behavioral impact. Đã kiểm identity alias theo xác nhận người kiểm. |
| 14 | service | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50::visits-service` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::visits-service` | C1:1–3; SHA `129ebad1487c0c78d10bd083658fc7b1712f0b0147c682dd56b7ae82239b9007`; P1:1–13 không đổi config. | Tên service không đổi; không phải kết luận hành vi toàn service. Là seed-owner, đề nghị loại điểm lan truyền theo PR:73–77. Đã kiểm identity alias theo xác nhận người kiểm. |
| 15 | service | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50::api-gateway` | `spring-petclinic-microservices@3858f9c630cf989bb6809a86edf47c2be78dc9f1::api-gateway` | C2:1–3; SHA `6cc8fcf6d3cf9ae4ac1416ed9ae7fea2e056462c88959fb2b83ed5ccdf887a30`; P1:1–13 không đổi config. | Tên service không đổi; không phải kết luận hành vi toàn service. Đã kiểm identity alias theo xác nhận người kiểm. |

### Fixture — owner / pets / đối chứng

| Thành phần | ID / quan hệ ghi trong fixture | Fixture file/dòng | SQL + schema file/dòng | Kết quả đối chiếu / bất đồng |
| --- | --- | --- | --- | --- |
| Owner chính | owner_id=6; Jean Coleman | F1:12 | Q1:13; Q2:11–18 | Owner 6 tồn tại; tên theo SQL và raw gateway_populated.body:1. |
| Các pet của owner chính | pet_id=7 Samantha; pet_id=8 Max; cả hai owner_id=6 | F1:12,15–18 | Q1:25–26; Q2:21–29 | owner_id là cột thứ 5 của pets; khóa ngoại tới owners. Pets 7/8 có visit theo Q3. |
| Owner/pet đối chứng rỗng | owner_id=1 George Franklin; pet_id=1 Leo | F1:13,30 | Q1:8,19; Q2:11–29; Q3:1–4 | SQL visits cung cấp chỉ có pet 7/8; raw gateway_empty.body:1 có pet 1 với visits=[]. Không chứng minh fallback được exercise. |
| SQL/profile/config liên quan | HSQLDB mới cho mỗi snapshot/repetition; kiểm config hiệu lực trước observation | F1:5–10,20–21,34 | C3:13–14,19–23,83–107; Q4:3–8; L1/L3:94–97 | Raw baseline ghi docker/HSQLDB; còn thiếu mutated, đủ repetition/reset và kiểm effective config riêng của từng run. Native config response version=null, không tự chứng minh config commit. |
| Fixture ID / SHA-256 / liên kết input | `petclinic-hsqldb-seed-owner6-pets7-8-v1`<br>SHA thực tế: `2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191` | F1:3; B1:36; U1:16 | Q1/Q3 được đối chiếu tuple bên trên; hash từ bytes F1 | F01: F1 khớp B1:36; U1:16 lại khai `2a837540d0316d290401a1485ddeeb86a62a6f06447ccd75aa976fc2c5c8168a`. Chưa biết intended fixture; cần xác nhận và version mới, giữ draft frozen. |

### Fixture — từng visit

Q4:3–8 cho thứ tự cột `id, pet_id, visit_date, description`; đối chiếu đủ từng giá trị, không chỉ đếm record.

| STT | Visit ID | Pet ID | Date | Description | Fixture file/dòng | SQL file/dòng | Kết quả đối chiếu / còn thiếu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 7 | 2013-01-01 | rabies shot | F1:15 | Q3:1; Q4:3–8 | Tuple khớp đầy đủ ID/pet/date/description; raw direct và gateway populated baseline cũng khớp. Thiếu mutated. |
| 2 | 2 | 8 | 2013-01-02 | rabies shot | F1:16 | Q3:2; Q4:3–8 | Tuple khớp đầy đủ ID/pet/date/description; raw direct và gateway populated baseline cũng khớp. Thiếu mutated. |
| 3 | 3 | 8 | 2013-01-03 | neutered | F1:17 | Q3:3; Q4:3–8 | Tuple khớp đầy đủ ID/pet/date/description; raw direct và gateway populated baseline cũng khớp. Thiếu mutated. |
| 4 | 4 | 7 | 2013-01-04 | spayed | F1:18 | Q3:4; Q4:3–8 | Tuple khớp đầy đủ ID/pet/date/description; raw direct và gateway populated baseline cũng khớp. Thiếu mutated. |

### Request domain / đối chứng / kế hoạch

Request chép từ F1:23–32 và phân miền theo F1:36. Matrix **kế hoạch** là 10 requests × 2 snapshots × 2 repetitions = 40 lượt; raw hiện tại không chứng minh đã chạy matrix này. Chưa tự gửi request/chạy POST hay khởi động app trong lượt điền notes.

| STT | Request ID | Target | HTTP method + path / body nếu có | Vai trò / miền request | Snapshot + repetition dự kiến / thứ tự/reset | Evidence hoặc phần chưa rõ |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `direct_omitted` | visits | `GET /pets/visits?petId=7,8` | Primary: request cũ hợp lệ không gửi includeDetails. | Kế hoạch baseline + mutated, mỗi snapshot 2 repetition; DB mới/kiểm config trước mỗi lượt. GET trước POST; chưa có đủ paired repetitions. | F1:23,20–21,34–39; raw baseline có direct_omitted.json/.body; thiếu mutated và đủ repetition. |
| 2 | `direct_true` | visits | `GET /pets/visits?petId=7,8&includeDetails=true` | Binding coverage: boolean true tường minh. | Kế hoạch baseline + mutated, mỗi snapshot 2 repetition; DB mới/kiểm config trước mỗi lượt. GET trước POST; chưa có đủ paired repetitions. | F1:24,20–21,34–39; raw baseline có direct_true.json/.body; thiếu mutated và đủ repetition. |
| 3 | `direct_false` | visits | `GET /pets/visits?petId=7,8&includeDetails=false` | Binding coverage: boolean false/default tường minh. | Kế hoạch baseline + mutated, mỗi snapshot 2 repetition; DB mới/kiểm config trước mỗi lượt. GET trước POST; chưa có đủ paired repetitions. | F1:25,20–21,34–39; raw baseline có direct_false.json/.body; thiếu mutated và đủ repetition. |
| 4 | `direct_empty` | visits | `GET /pets/visits?petId=7,8&includeDetails=` | Probe binding empty/default; chưa suy ra kết quả mutated từ annotation. | Kế hoạch baseline + mutated, mỗi snapshot 2 repetition; DB mới/kiểm config trước mỗi lượt. GET trước POST; chưa có đủ paired repetitions. | F1:26,20–21,34–39; raw baseline có direct_empty.json/.body; thiếu mutated và đủ repetition. |
| 5 | `direct_invalid` | visits | `GET /pets/visits?petId=7,8&includeDetails=not-a-boolean` | Diagnostic ngoài valid boolean domain; tách riêng, không coi là request cũ hợp lệ bị gãy. | Kế hoạch baseline + mutated, mỗi snapshot 2 repetition; DB mới/kiểm config trước mỗi lượt. GET trước POST; chưa có đủ paired repetitions. | F1:27,20–21,34–39; raw baseline có direct_invalid.json/.body; thiếu mutated và đủ repetition. |
| 6 | `direct_missing_pet_id` | visits | `GET /pets/visits` | Diagnostic thiếu petId vốn required; đối chứng validation cũ. | Kế hoạch baseline + mutated, mỗi snapshot 2 repetition; DB mới/kiểm config trước mỗi lượt. GET trước POST; chưa có đủ paired repetitions. | F1:28,20–21,34–39; raw baseline có direct_missing_pet_id.json/.body; thiếu mutated và đủ repetition. |
| 7 | `gateway_populated` | gateway | `GET /api/gateway/owners/6` | Consumer thật giữ nguyên; so đầy đủ owner/pets/visits với dữ liệu 7/8. | Kế hoạch baseline + mutated, mỗi snapshot 2 repetition; DB mới/kiểm config trước mỗi lượt. GET trước POST; chưa có đủ paired repetitions. | F1:29,20–21,34–39; raw baseline có gateway_populated.json/.body; thiếu mutated và đủ repetition. |
| 8 | `gateway_empty` | gateway | `GET /api/gateway/owners/1` | Đối chứng độ nhạy với data rỗng; không thay populated hoặc thử lỗi/timeout. | Kế hoạch baseline + mutated, mỗi snapshot 2 repetition; DB mới/kiểm config trước mỗi lượt. GET trước POST; chưa có đủ paired repetitions. | F1:30,20–21,34–39; raw baseline có gateway_empty.json/.body; thiếu mutated và đủ repetition. |
| 9 | `overload_read` | visits | `GET /owners/6/pets/7/visits` | Đối chứng overload read(int) và API GET owners/pets. | Kế hoạch baseline + mutated, mỗi snapshot 2 repetition; DB mới/kiểm config trước mỗi lượt. GET trước POST; chưa có đủ paired repetitions. | F1:31,20–21,34–39; raw baseline có overload_read.json/.body; thiếu mutated và đủ repetition. |
| 10 | `create_control` | visits | `POST /owners/6/pets/7/visits`<br>Content-Type: application/json<br>`{"date":"2026-10-01","description":"P02 isolated write control"}` | Đối chứng POST create; chỉ DB dùng riêng, chạy cuối và reset sau. | Kế hoạch baseline + mutated, mỗi snapshot 2 repetition; DB mới/kiểm config trước mỗi lượt. POST cuối mỗi repetition; reset sau. Chưa chạy. | F1:32,20–21,34–39; không có raw create_control; chưa tự gửi request. |

### Raw baseline đã xem trong bản ghi này

Gốc các observation: `evidence/baseline/observations/`. Đã đọc 13 cặp metadata/body trong bản ghi này: 9 scenario GET và 4 config/registry GET; kiểm SHA-256 và byte length đều khớp metadata. Body JSON mỗi file ở dòng 1; số dòng metadata trong bảng là thực tế của từng file. Các timestamp trong raw thuộc run người gửi, không phải thời điểm Phát review. Không sửa/sort/normalize raw trên đĩa; chỉ đối chiếu giá trị trong bộ nhớ.

| STT | Observation ID | Raw metadata/body file | Status ghi trong raw | Nội dung đối chiếu trong bản ghi này | Body SHA-256 / evidence | Giới hạn / còn thiếu |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `direct_omitted` | `evidence/baseline/observations/direct_omitted.json`<br>`evidence/baseline/observations/direct_omitted.body` | 200 — metadata:8 | Body:1; 4 visits: 1/4 của pet 7; 2/3 của pet 8; date/description khớp F1/Q3. | `8e0a343551d92ce841e0f20cb8708859a7bf07ae5d2a1bd6ca6c0ef6ac04144c`<br>khớp metadata:30 và body_bytes | Chỉ observation baseline được cung cấp; thiếu mutated/paired repetition; |
| 2 | `direct_true` | `evidence/baseline/observations/direct_true.json`<br>`evidence/baseline/observations/direct_true.body` | 200 — metadata:8 | Body:1; Cùng byte body direct_omitted trong baseline; 4 visit khớp fixture. | `8e0a343551d92ce841e0f20cb8708859a7bf07ae5d2a1bd6ca6c0ef6ac04144c`<br>khớp metadata:30 và body_bytes | Chỉ observation baseline được cung cấp; thiếu mutated/paired repetition; |
| 3 | `direct_false` | `evidence/baseline/observations/direct_false.json`<br>`evidence/baseline/observations/direct_false.body` | 200 — metadata:8 | Body:1; Cùng byte body direct_omitted trong baseline; 4 visit khớp fixture. | `8e0a343551d92ce841e0f20cb8708859a7bf07ae5d2a1bd6ca6c0ef6ac04144c`<br>khớp metadata:30 và body_bytes | Chỉ observation baseline được cung cấp; thiếu mutated/paired repetition; |
| 4 | `direct_empty` | `evidence/baseline/observations/direct_empty.json`<br>`evidence/baseline/observations/direct_empty.body` | 200 — metadata:8 | Body:1; Cùng byte body direct_omitted trong baseline; 4 visit khớp fixture. | `8e0a343551d92ce841e0f20cb8708859a7bf07ae5d2a1bd6ca6c0ef6ac04144c`<br>khớp metadata:30 và body_bytes | Chỉ observation baseline được cung cấp; thiếu mutated/paired repetition; |
| 5 | `direct_invalid` | `evidence/baseline/observations/direct_invalid.json`<br>`evidence/baseline/observations/direct_invalid.body` | 200 — metadata:8 | Body:1; Baseline vẫn trả 4 visit, cùng byte body; S1 baseline chưa khai includeDetails. | `8e0a343551d92ce841e0f20cb8708859a7bf07ae5d2a1bd6ca6c0ef6ac04144c`<br>khớp metadata:30 và body_bytes | Chỉ observation baseline được cung cấp; thiếu mutated/paired repetition; Tách diagnostic domain; không dùng baseline này dự đoán mutated. |
| 6 | `direct_missing_pet_id` | `evidence/baseline/observations/direct_missing_pet_id.json`<br>`evidence/baseline/observations/direct_missing_pet_id.body` | 400 — metadata:8 | Body:1; 400 Bad Request, path /pets/visits; timestamp raw được giữ; L1:136 ghi thiếu petId. | `710eb63ad119331c42f87e1b67ac8a4270de15f35537fb454e2e0d157776c42f`<br>khớp metadata:34 và body_bytes | Chỉ observation baseline được cung cấp; thiếu mutated/paired repetition; |
| 7 | `gateway_populated` | `evidence/baseline/observations/gateway_populated.json`<br>`evidence/baseline/observations/gateway_populated.body` | 200 — metadata:8 | Body:1; Owner 6; pet 8 có visit 2/3, pet 7 có visit 1/4; các trường visit khớp SQL/fixture. | `4cec186c7c41d5b0e8471457323c97ec49254b8d3358fdf2daeb00c381db0acf`<br>khớp metadata:26 và body_bytes | Chỉ observation baseline được cung cấp; thiếu mutated/paired repetition; HTTP 200 không chứng minh helper/setter/fallback đều được exercise. |
| 8 | `gateway_empty` | `evidence/baseline/observations/gateway_empty.json`<br>`evidence/baseline/observations/gateway_empty.body` | 200 — metadata:8 | Body:1; Owner 1, pet 1 Leo có visits=[]; không thấy chứng cứ riêng gọi fallback. | `c32094f8acca185aa105ffbb15f4b98ca25f12e467871668fb372510f5d833c8`<br>khớp metadata:26 và body_bytes | Chỉ observation baseline được cung cấp; thiếu mutated/paired repetition; HTTP 200 không chứng minh helper/setter/fallback đều được exercise. |
| 9 | `overload_read` | `evidence/baseline/observations/overload_read.json`<br>`evidence/baseline/observations/overload_read.body` | 200 — metadata:8 | Body:1; Array hai visit 1/4 thuộc pet 7, đủ ID/petId/date/description. | `8cbcdc3afb8c9c4e05f13edb8dba94e441cc6df540764b9507f4748a2ab1906f`<br>khớp metadata:30 và body_bytes | Chỉ observation baseline được cung cấp; thiếu mutated/paired repetition; |
| 10 | `config-customers` | `evidence/baseline/observations/config-customers.json`<br>`evidence/baseline/observations/config-customers.body` | 200 — metadata:8 | Body:1; name customers-service; profile docker; native version=null; nguồn properties có port 8081 và SQL HSQLDB. | `b0c9c4417b5312c4cf66e719579d1db37b95d84c2641e8ec27352a4edf8c44bb`<br>khớp metadata:30 và body_bytes | Evidence môi trường baseline; không phải impact label hay xác thực upstream commit/binary. |
| 11 | `config-gateway` | `evidence/baseline/observations/config-gateway.json`<br>`evidence/baseline/observations/config-gateway.body` | 200 — metadata:8 | Body:1; name api-gateway; profile docker; native version=null; nguồn properties có port 8080. | `f6817f4d62272b8eb0610fdcd143e3a8925747fd9d15c2997e4ce060cc3b4a5a`<br>khớp metadata:30 và body_bytes | Evidence môi trường baseline; không phải impact label hay xác thực upstream commit/binary. |
| 12 | `config-visits` | `evidence/baseline/observations/config-visits.json`<br>`evidence/baseline/observations/config-visits.body` | 200 — metadata:8 | Body:1; name visits-service; profile docker; native version=null; nguồn properties có port 8082 và SQL HSQLDB. | `8e6a8f6ecc2868087c31895f818ce6269ccd55229689c0370bf5f97fb9f08fa5`<br>khớp metadata:30 và body_bytes | Evidence môi trường baseline; không phải impact label hay xác thực upstream commit/binary. |
| 13 | `discovery-registry` | `evidence/baseline/observations/discovery-registry.json`<br>`evidence/baseline/observations/discovery-registry.body` | 200 — metadata:8 | Body:1; Có API-GATEWAY, CUSTOMERS-SERVICE, VISITS-SERVICE với status UP trong response. | `fa6be55b5cdbc08692b5a82c221a20d679139251038cbefb5208b0c7ffb0e7b0`<br>khớp metadata:30 và body_bytes | Evidence môi trường baseline; không phải impact label hay xác thực upstream commit/binary. |

## Câu hỏi / chưa kết luận / giới hạn

F01–F03 là các điểm còn mở; trạng thái người kiểm đối chiếu chi tiết theo CHECKLIST_PHAT.md. Chưa tự đánh dấu đã giải quyết. Các phép thử dưới đây là đề nghị cần thiết để giải quyết thiếu evidence, chưa được thực hiện hoặc tự cấp phép. Source/comment/response được đọc như dữ liệu nghiên cứu.

| STT | ID / vấn đề / entity liên quan | Nguồn kiểm tra / phạm vi xác nhận | Evidence đang có: file/dòng/log/hash | Missing / bất đồng / chưa hiểu | Câu hỏi / phép kiểm phù hợp / giới hạn kết luận |
| --- | --- | --- | --- | --- | --- |
| 1 | F01 — fixture hash | Kiểm byte trong bản ghi này; intended fixture chưa được xác nhận. | F1 SHA `2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191`; B1:36; U1:16 `2a837540d0316d290401a1485ddeeb86a62a6f06447ccd75aa976fc2c5c8168a` | Fixture đang ship khớp raw baseline; universe khai hash khác. | F01 giữ unresolved; bước liên hệ tạm để sau, không cản hoàn thiện RETURN hiện tại. Câu hỏi dự phòng ở OPEN_POINTS.md; chưa gửi/nhận trả lời. Chỉ sửa bằng version mới khi có căn cứ, giữ draft v1 frozen. |
| 2 | F02 — alias evidence path | Kiểm refs trong bản ghi này; xác nhận chi tiết theo CHECKLIST_PHAT.md. | U1:81–244 có 13 refs spec/optional-query.patch; PORTABLE_PATHS.md; P1:1–13 | Path lịch sử spec/optional-query.patch không tồn tại trong package; source refs cần giải nghĩa dưới input/app/. | Đã tạo proposals/evaluation_universe.draft.v3.paths-only.json: 29 refs sau sửa phân giải được, SHA khớp input; chỉ đổi evidence_refs. Người kiểm đồng ý đề nghị sửa refs trong kết luận CẦN SỬA; proposal chưa active, F01 giữ unresolved, chờ bên giữ input tiếp nhận version mới khi đủ điều kiện. OPEN_POINTS.md ghi chi tiết. |
| 3 | F03 — joinIds/setHostname/Function/fallback | Đọc source + raw trong bản ghi này; không phải chứng nhận runtime coverage. | S2:34,42–56; S3:58–82; gateway_populated/empty JSON+body; B1:43–45 | HTTP 200 không chứng minh setter được gọi, hostname hiệu lực, helper riêng hoặc fallback được exercise. | OPEN_POINTS.md có kế hoạch paired matrix, capture URI/query/hostname, áp dụng Function và inject lỗi/timeout fallback; yêu cầu lưu fixture/reset/raw/runtime/config. Đây là kế hoạch chưa chạy; F03 vẫn missing/unresolved. |
| 4 | M01 — mutated / 40 planned slots / POST | Đối chiếu fixture và danh sách raw trong bản ghi này. | F1:20–34; B1:43–45; observations có 9 scenario GET + 4 config/registry | Thiếu mutated, POST và 2 repetitions/snapshot; 40 là 10 requests × 2 snapshots × 2 repetitions theo kế hoạch, chưa thực hiện. | Sau khi gate thiết kế được xác nhận, thực hiện matrix phù hợp ở DB cô lập; giữ logs/status/headers/body/stderr và reset. Không chạy tự động từ notes. |
| 5 | M02 — census/exclusions/alias | Tổ chức declaration rồi so draft trong bản ghi này; exposure khai ở đầu file. | S1:44–82; S2:30–57; S3:36–83; PR:45–77,115–122,220–246; I1/U1 | Kiểm kê có 9 method/4 API/2 service; membership IDs và 15 alias khớp draft theo bằng chứng source. Người kiểm đã xác nhận inventory/exclusions/alias, overload/mapping và cách ghi phạm vi/hop. | Xác nhận bằng tên cho kết luận CẦN SỬA đã ghi ở RETURN; không chứng minh full-repo recall hoặc khóa universe. Không gọi lượt này blinded. |
| 6 | M03 — contract binding/runtime | Đọc annotation/patch và raw logs trong bản ghi này; chưa chạy mutated. | S1:73; P1:8–10; L1:8,10–11,94–97; F1:23–28,36 | required=false/defaultValue=false là khai báo; includeDetails chưa được dùng trong body. Chưa có observation binding mutated. | Giữ primary omitted riêng với true/false/empty và invalid/missing diagnostic; kiểm runtime/framework/config thực tế. Không lấy tài liệu mạng hoặc response baseline làm đáp án mutated. |
| 7 | M04 — warnings / config provenance | Đọc raw được phép trong bản ghi này; chưa quy nguyên nhân tới mutation. | L1:16,23,26,40–41,94–97; L3:16,23,26,40–41; L2:67–112; L4:11; C3:19–23 | Có optional localhost config connection refused, dropped tracing spans, observation-scope warnings; native config version=null và override được phép. | Ghi warnings/ngữ cảnh; khi chạy paired cần lưu effective config, profile, loaded SQL và xem warnings ảnh hưởng tính so sánh không. Không gọi baseline hoàn toàn sạch hoặc lỗi do P02. |
| 8 | M05 — giới hạn evidence / gate | Người kiểm đã xác nhận bằng tên kết luận phạm vi CẦN SỬA; chưa quyết định nhãn. | Các bảng source, fixture, alias; F01/F02/F03; PR:103–122 | Thiếu runtime mutated/helper/fallback cho polarity; identity/hash và xác nhận phạm vi không phải accepted ground truth. | Cần sửa liên kết F01/F02; F01/F03 vẫn unresolved/missing, proposal F02 chưa active. Chưa khóa universe, duyệt nhãn, test hoặc scoring. |

**Nhận định phạm vi đã được người kiểm xác nhận bằng tên:** **cần sửa** liên kết fixture/hash và portable evidence refs bằng version mới; source census và alias có bằng chứng đối chiếu cụ thể. **Chưa đủ** để kết luận hành vi hoặc gán nhãn do thiếu runtime mutated và evidence từng helper/setter/fallback. Xác nhận của Phạm Nguyên Phát ghi tại RETURN theo yêu cầu trực tiếp, không ghi thời điểm hoàn thành; bản này không là accepted ground truth, test/scoring approval. Không sửa protocol/split/scorer hoặc tự mở P03/P04.

## Đối chiếu bổ sung: overload và HTTP mapping

Người kiểm đã xác nhận trực tiếp kiểm và đồng ý kết quả overload/mapping bên dưới. Ghi nhận này chỉ về đối chiếu khai báo; không ghi thay thời điểm nhận xét, không xác nhận hành vi runtime hoặc nhãn.

| Handler baseline | Kiểu tham số để phân biệt | HTTP method và path chuẩn hóa | Evidence | Kết quả đối chiếu source |
|---|---|---|---|---|
| create(Visit,int) | Visit, int | POST /owners/*/pets/{petId}/visits | S1:56–65 | Annotation là PostMapping; giữ nguyên wildcard * và placeholder petId. |
| read(int) | int petId, nhận qua PathVariable | GET /owners/*/pets/{petId}/visits | S1:67–70 | Khác overload nhận List<Integer>; có Method ID riêng. |
| read(List<Integer>) | List<Integer> petIds, nhận qua RequestParam | GET /pets/visits | S1:72–76 | Query parameter lưu riêng, không thêm query value vào API ID. |
| getOwnerDetails(int) | int ownerId | GET /api/gateway/owners/{ownerId} | S3:37,54–66 | Ghép prefix cấp lớp /api/gateway với mapping method owners/{ownerId}; GetMapping xác định GET. |

Bốn mapping khai báo khớp inventory đang ghi. Method ID phân biệt overload bằng kiểu tham số, không dùng tên biến hoặc return type làm phần phân biệt signature. Query không nằm trong normalized API path theo PR:65–69. Kết quả này kiểm khai báo, chưa chứng nhận runtime route hoặc behavioral impact.

## Đối chiếu bổ sung: phạm vi, hop, seed và cấp thực thể

SP là thiết kế dự thảo được đối chiếu với declaration/source và protocol; nội dung SP tự nó không chứng minh độ phủ đầy đủ. Các flags trong SP/U1 frozen được giữ nguyên; chưa ghi người kiểm đã chấp thuận khóa đầu vào.

| Nội dung | Kết quả đối chiếu | Evidence | Giới hạn / phần cần người kiểm xác nhận |
|---|---|---|---|
| Census ba file | SP liệt kê đúng S1 VisitResource, S2 VisitsServiceClient, S3 ApiGatewayController; chín declaration method khớp source, gồm private/package-private. Lấy toàn bộ declaration theo scope, không lọc theo dự kiến impact. | SP:9–25; S1:58–76; S2:42–56; S3:55–82 | Người kiểm đồng ý cách ghi census giới hạn ba file; source hỗ trợ/SQL/config ngoài census. Chưa là full-repo recall hoặc khóa universe. |
| Giới hạn 3-hop | SP khai logical_hop_limit=3. PR định nghĩa CALLS hoặc INVOKES_API trực tiếp là một logical hop; cạnh bao chứa Service/File/Class không cộng hop. | SP:8–9; PR:81–88 | Đây là giới hạn thiết kế khai báo; chưa chứng minh đã tìm đủ mọi thực thể trong ba hop của toàn repository. Không dùng số hop để bỏ helper/setter khỏi census ba file. |
| Tuyến source minh họa | getOwnerDetails gọi getVisitsForPets: một CALLS. Với hostname mặc định, client GET pets/visits trỏ tới provider read(List<Integer>): một INVOKES_API nữa. Tuyến này có hai logical hops; duyệt ảnh hưởng theo chiều ngược từ callee seed. | S3:58; S2:34,42–47; S1:72–76; PR:81–88 | S2:54–56 có setter ghi đè hostname. Đây là tuyến khai báo theo hostname mặc định, chưa xác nhận runtime routing hoặc coverage mọi caller. |
| Seed Method | VisitResource#read(List<Integer>) được ghi riêng; after patch là read(List<Integer>,boolean), cùng canonical seed baseline. Không nằm trong eligible method set. | S1:73; P1:8–10; U1:67–71; SP:14,37; PR:73 | Không tự gán nhãn hoặc nhận điểm lan truyền cho seed. |
| Seed API | GET /pets/visits được ghi riêng, không nằm trong eligible API set. | S1:72; U1:72–75; SP:14,37; PR:73 | Path không đổi không chứng minh contract/behavior không đổi. |
| Service chứa seed | visits-service được giữ làm ngữ cảnh và loại khỏi điểm lan truyền ở cấp Service trong scope này. | C1:1–3; U1:76–79; SP:9,37; PR:77 | Service exclusion không có nghĩa service negative; không tự chuyển kết quả Method/API sang Service. |
| Credit giữa các cấp | SP chưa cho tự chuyển credit Method→API→Service; protocol yêu cầu quy tắc projection được khai báo nếu áp dụng. | SP:40; U1:266; PR:69 | Định danh và kết quả ba level phải giữ riêng; chưa chạy/chấp thuận scoring hoặc sửa scorer. |

Người kiểm đã xác nhận trực tiếp kiểm và đồng ý overload/mapping cùng cách ghi phạm vi ba file, giới hạn 3-hop và seed/projection. Không diễn giải xác nhận này thành chứng minh full-repo coverage trong ba hop, khóa universe hoặc duyệt nhãn. Hai mục tương ứng trong CHECKLIST_PHAT.md được đánh dấu theo xác nhận thật; F01/F02/F03 và thiếu runtime vẫn độc lập với kết quả này.

## Đối chiếu bổ sung: fixture và miền request

Đã đối chiếu dữ liệu từ SQL/schema, fixture và chín cặp metadata/body scenario GET của baseline được cung cấp. Đợt kiểm bổ sung bằng công cụ hoàn tất lúc 2026-10-17T00:26:41+07:00: hai nhóm owner/pet, đủ bốn tuple visit, nội dung owner/pet/visit của raw và chín cặp method/path/host/hash/size đều khớp. Không chạy lại ứng dụng hoặc gửi request mới. Đây là thời điểm công cụ kiểm bằng chứng, không phải thời điểm người kiểm nhận xét/ký. Người kiểm đã báo hoàn thành phần đối chiếu fixture/miền request và yêu cầu ghi xác nhận bằng tên cho kết luận phạm vi; không ghi thời điểm hoàn thành của người kiểm.

| Nội dung kiểm | Kết quả từ dữ liệu được cung cấp | Evidence | Giới hạn / phần còn mở |
|---|---|---|---|
| Owner 6 và pets 7–8 | SQL có Jean Coleman, pet 7 Samantha và pet 8 Max cùng owner_id=6. Raw gateway_populated giữ đầy đủ trường owner/pet, type cat và dữ liệu visit khớp SQL/fixture. | F1:12,15–18; Q1:1,13,25–26; Q2:11–29; observations/gateway_populated.body:1 | Kết quả baseline trong gói; không chứng thực upstream commit/binary độc lập. |
| Bốn visits | ID 1→pet7/2013-01-01/rabies shot; 2→pet8/2013-01-02/rabies shot; 3→pet8/2013-01-03/neutered; 4→pet7/2013-01-04/spayed. So đủ từng trường, khớp direct GET và gateway populated. | F1:15–18; Q3:1–4; Q4:3–8; direct_omitted.body:1; gateway_populated.body:1 | Pet 7 có visits 1/4; pet 8 có 2/3. Chưa có mutated để so paired behavior. |
| Đối chứng rỗng | SQL có George Franklin, pet 1 Leo thuộc owner 1; bốn dòng SQL visits không có pet1. Raw gateway_empty có visits=[]. | F1:13,30; Q1:8,19; Q3:1–4; gateway_empty.body:1 | Không thay ca populated và không chứng minh nhánh fallback đã được exercise. |
| Request/raw metadata | Chín scenario GET có method/path/host khớp fixture; SHA-256 và body_bytes của cả chín body khớp metadata. Các trường JSON được giữ khi đối chiếu. | F1:23–31; evidence/baseline/observations/*.json và *.body; bảng raw ở trên; INPUT_HASHES.json | Chỉ sắp xếp arrays trong bộ nhớ để so ID; raw trên đĩa không bị sửa, error timestamp vẫn giữ. |
| Fixture identity | SHA fixture thực tế khớp B1:36; vẫn khác hash khai trong U1:16. | F1 SHA 2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191; B1:36; U1:16 | F01 vẫn unresolved: cần xác nhận intended fixture và version mới nếu sửa liên kết. Nội dung tuple khớp không tự giải quyết hash linkage. |

Các path observation rút gọn trong bảng trên đều nằm dưới evidence/baseline/observations/ của input root. Hash từng file ở INPUT_HASHES.json và bảng raw baseline hiện có.

| Miền / vai trò | Request ID | Kết quả baseline có bằng chứng | Cách dùng / giới hạn |
|---|---|---|---|
| Request cũ hợp lệ, primary | direct_omitted | GET petId=7,8, không gửi includeDetails; 200 và đủ bốn visits. | Dùng làm primary domain để so cùng request trên baseline/mutated sau này; chưa có cặp mutated. |
| Binding coverage | direct_true, direct_false, direct_empty | Cả ba 200, body trùng byte direct_omitted trong baseline. | True/false/empty được báo riêng theo F1:36; baseline S1 chưa khai includeDetails, không suy kết quả binding mutated. |
| Diagnostic ngoài valid boolean domain | direct_invalid | not-a-boolean trả 200, cùng body baseline direct_omitted. | Không coi đây là bằng chứng request cũ hợp lệ bị gãy; chưa kết luận mutated sẽ trả gì. |
| Diagnostic thiếu tham số vốn required | direct_missing_pet_id | Thiếu petId trả 400 Bad Request; giữ nguyên timestamp/path/status/error trong raw. | Đối chứng validation cũ; không âm thầm bỏ timestamp hoặc gọi errors byte-identical. |
| Consumer và độ nhạy dữ liệu | gateway_populated, gateway_empty | Owner 6 có đủ visit; owner 1/pet1 rỗng; cả hai 200. | So content cùng status; không dùng empty thay populated/fault hoặc suy mọi helper/setter không ảnh hưởng. |
| Đối chứng overload | overload_read | GET /owners/6/pets/7/visits trả 200 và hai visits 1/4 thuộc pet7. | Thuộc read(int), tách khỏi seed read(List<Integer>); chưa có paired mutated. |
| Đối chứng ghi dữ liệu dự kiến | create_control | Chỉ có kế hoạch POST với date 2026-10-01 và description P02 isolated write control; chưa có raw POST. | Chạy cuối lượt lặp, DB dùng riêng và reset sau theo F1:32–34; chưa tự thực thi. |

F1:20–21 dự kiến hai snapshots, hai repetitions; 10 requests tạo 40 planned slots. B1:43–45 ghi full matrix và mutated chưa thực hiện. Chín GET baseline không thay 40 slots, không chứng minh repetition/reset đầy đủ và không đủ để gán polarity. Kết quả đối chiếu fixture/miền request đã sẵn cho người kiểm rà; chưa xác nhận intended fixture, nhãn hoặc khóa đầu vào.

Đã kiểm toàn bộ request-plan v1: 40 case có đúng snapshot/repetition/request ID, thứ tự và method/path/headers/body/role của fixture; POST create_control đứng cuối mỗi lượt. Mọi actual_http_status/raw_response_file vẫn null; planned_only=true và actual_remote_calls=0. Đây là kiểm tính nhất quán kế hoạch, không phải 40 request đã chạy. Việc body baseline của true/false/empty/invalid trùng nhau không xác nhận binding trên mutated: S1:73 chưa khai includeDetails; P1:9–10 mới thêm tham số đó.

## Rà bản sửa F02 — nhận xét kỹ thuật

Đợt kiểm bổ sung 2026-10-17T00:26:41+07:00 so trực tiếp U1 với proposals/evaluation_universe.draft.v3.paths-only.json. Cả 15 alias giữ baseline/mutated/canonical ID; chỉ thay 29 evidence_refs, gồm 16 source refs và 13 patch refs. Bốn file đích tồn tại dưới inputs/, SHA khớp INPUT_HASHES.json; annotation mapping và signature/body được đối chiếu với S1:56,67–76; S2:42–56; S3:37,54–82; P1:1–13.

Nhận xét: phần sửa đường dẫn có căn cứ và người kiểm đồng ý đề nghị sửa refs trong kết luận CẦN SỬA; chờ bên giữ input tiếp nhận thành version mới khi đủ điều kiện. Mọi trường ngoài evidence_refs giữ nguyên; independently_confirmed vẫn false, independently_confirmed_by vẫn null, locked_for_labeling và official_scoring_authorized vẫn false. Proposal vẫn giữ hash fixture lệch của U1; vì F01 chưa có trả lời, chưa thể dùng proposal để khóa universe hoặc thực thi mutation. Xác nhận phạm vi không kích hoạt proposal hoặc đổi các cờ này.

## Bản xử lý điểm mở

OPEN_POINTS.md ghi F01 tạm để sau, proposal sửa refs F02 và kế hoạch evidence F03. RETURN_PHAT.md có xác nhận bằng tên cho kết luận CẦN SỬA theo yêu cầu trực tiếp của người kiểm, kèm subset inputs/ để mở refs sau clone. Không ghi thời điểm hoàn thành; proposal v3 chưa active và không sửa fixture hash khi chưa biết intended fixture.

## Checkpoint và xác nhận của người kiểm

| Mục | Trạng thái thực tế |
|---|---|
| Checkpoint notes do người kiểm xác nhận | Chưa lập/chưa xác nhận. Không tạo checkpoint hồi tố trước exposure. |
| Xác nhận bằng tên | Phạm Nguyên Phát; ghi theo yêu cầu trực tiếp trong trao đổi cho kết luận CẦN SỬA. Không ghi thời điểm hoàn thành vì người kiểm không nhớ chính xác. |
| Checksum bản hiện tại | CHECKSUMS.sha256; tính lại nếu sửa nội dung trước khi nộp. |
| Kiểm từng ID/exclusion/alias | Người kiểm xác nhận Inventory 15 dòng, 8 nhóm exclusions, 15 alias identity, overload/mapping và cách ghi phạm vi/hop/seed/projection; đã báo hoàn thành đối chiếu fixture/miền request và rà F02. Chưa khóa universe hoặc nhãn. |
| Kết luận phạm vi | Phạm Nguyên Phát xác nhận bằng tên: CẦN SỬA, chưa đủ điều kiện đề nghị khóa bộ input; F01/F03 vẫn unresolved/missing và proposal F02 chưa active. |
| Runtime và nhãn | Mutated/helper coverage còn thiếu; chưa positive/negative, accepted ground truth, test lock hoặc scoring approval. |
