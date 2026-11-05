# P02–P04 — task packet và kết quả cần bàn giao

Ngày 15/10/2026. Theo PROJECT_CONTEXT.md v0.6 và [kế hoạch](P02_P04_EXECUTION_PLAN.md). Huy đã chọn P02; [input đã chuẩn bị](../benchmark/p02/README.md), [baseline feasibility đã chạy](../pipeline/p02/README.md), universe chờ Phát kiểm độc lập. Chưa mutated/nhãn. Packet sẵn sàng gửi, chưa ghi thành viên đã nhận task hoặc reviewer đã nhận review mới. Không tự gửi tin nhắn hoặc mở PR từ tài liệu này.

## 1. Cách nhận việc

Đọc toàn bộ PROJECT_CONTEXT.md, sau đó chỉ đọc packet đúng vai trò và allowed inputs. Gửi xác nhận ngắn: mục tiêu, input SHA, artifact cần nộp, ngoài phạm vi và blocker. AI hỗ trợ phải nói rõ việc nào đã chạy thật, việc nào mới suy luận. Không dùng nhãn/mẫu expected impact set để tạo output kỹ thuật rồi gọi là bằng chứng độc lập.

Mỗi lần bàn giao cần có:

```text
Task / scenario / version:
Repository và source/config SHA:
Implementation SHA hoặc working-tree code hashes nếu chưa commit:
Patch SHA-256 / image identities / tool versions:
Đã chạy: command, exit code, timestamp, thư mục raw artifacts:
Kết quả thực tế, bao gồm lỗi và phần chưa xác minh:
Các file đầu ra và manifest SHA-256:
DoD đạt / chưa đạt:
Nhãn / review / test split / scoring status:
Giới hạn, blocker và bước tiếp theo:
```

Không làm trực tiếp main, force push, tự merge hoặc dùng branch name thay commit pin. Base source PetClinic cho P02/P03 là `3858f9c630cf989bb6809a86edf47c2be78dc9f1`. Implementation Hiển đã kiểm là `e95613795133088621117179c9fb9592dab62b16`; benchmark Phát đã kiểm là `5f9204d66253604edf9101c2f888fc7e75aa0be7`. Đây là các pin đã kiểm, không khẳng định remote hôm nay chưa có commit mới. Nếu dùng base khác, báo SHA/diff và lý do; không tự coi tương đương.

## 2. Hiển — extraction và integration P02 trước

**Kết quả cần đạt:** chứng minh parser/resolver giữ cạnh có bằng chứng nhưng phân biệt được required/default/tùy chọn; không trả một impact set đặt trước hoặc coi reachable là behavioral impact.

Đầu vào được dùng: source/config/patch/fixture P02 sau G0–G2, pin implementation và schema hiện hành, test kỹ thuật không chứa nhãn benchmark. Huy cung cấp patch đã chọn và thông tin version; không tự lấy candidate trong plan làm patch đã khóa. Không cần chờ nhãn được reviewer duyệt để kiểm kỹ thuật.

Đầu ra:

- JSON node/endpoint/edge/unresolved baseline/mutated; nguồn từng cạnh, declared/effective required/default và sent query parameters.
- Cypher mới, import/query Neo4j thật trong database/container riêng; inventory trước/sau, import lặp idempotent, seed exclusion, hop/boundary riêng.
- Test LF/CRLF, overload, service/method/path mismatch và các failure exits; không kiểm oracle tác động hành vi từ nhãn dự thảo.
- Code commit, command, environment/dependency/cache/image identities, raw log, manifest và limitations. Không chỉ gửi screenshot hoặc câu “all pass”.

DoD P02: mutation đúng hash, consumer/source không thuộc phạm vi giữ nguyên; parser xuất đúng contract delta từ source, không hardcode includeDetails/ID/edge; unsupported báo unresolved; graph là dependency evidence, không gán positive/negative behavior. Pipeline kỹ thuật không đọc label/scorer/reviewer notes; mọi run output mới, không overwrite P01.

Ngoài phạm vi: tạo/duyệt nhãn, thay scorer theo kết quả, tuning top-k để tìm đúng method được biết trước, đổi schema/hop lớn chưa có decision, cloud/billing hoặc gọi model ngoài ngân sách.

P03 chỉ sau P02: thêm kiểm class-level RequestMapping, literal WebClient URL, DTO/response schema và consumer field usage. Giữ nguyên distinction return representation/DB schema. P04 chỉ sau feasibility: Go/proto RPC registration/client/config mapping và version-separate provider/consumer. Không báo “đã hỗ trợ gRPC” chỉ vì parser đọc được Go.

## 3. Phát — universe, raw evidence và nhãn dự thảo độc lập

**Kết quả cần đạt:** mỗi ca có bộ source/contract/runtime cho phép reviewer tự kiểm đúng/sai, không phải một bộ nhãn hợp với output hệ thống.

Allowed inputs: source/config commit, mutation patch đã chọn, fixture specification, contract documentation, baseline/mutated build identities, raw request/response/status/log và protocol. Không gửi hoặc mở prediction, comparison.json, context retrieval, parser JSON/Cypher/query result, F1 hay system rationale trước khóa nhãn tương ứng. Nếu vô tình tiếp xúc, ghi exposure và xử lý độc lập; không che sự việc.

Đầu ra theo thứ tự:

1. Sổ chọn ca và duplicate group/split intent, gồm cả ứng viên bị loại và lý do không dựa output/score. Xác nhận có thể lập nhãn độc lập.
2. Inventory source/contract, canonical seed/alias và evaluation universe có version/hash trước polarity. Không chỉ liệt kê những method dự đoán sẽ positive. Phần chưa biết phải missing/unresolved, không “complete=true” cho qua gate.
3. Raw runtime matrix có baseline, mutated, consumer, request tương thích và đối chứng phù hợp từng operator; lệnh, timestamps, exit codes, status/body, log, config/image identity. Không tái dùng log P01 làm runtime P02.
4. Nhãn draft do Phát kiểm và xác nhận, rationale/evidence refs cho từng ID/level; behavior và repair tách biệt. Mọi nhãn pending_review, không tự ký reviewer.
5. Evidence manifest, artifact checksum trước review và phiếu trống/allowed inputs cho source-first; chưa tạo quyết định approve/accepted hoặc checksum sau review giả.

DoD: universe được khóa trước polarity/output theo protocol; từng kết luận có evidence và đúng fixture, mọi unresolved được kê khai; người lập nhãn được ghi thật; annotator không là reviewer; original labels/raw bất biến. Nếu cần sửa sau đối chiếu hoặc bằng chứng mới, tạo version và reason log, không sửa bản frozen.

P02 không mặc định negative chỉ vì được gọi là control. P03 không điền trước HTTP 500. P04 không lấy đặc tả field number làm nhãn runtime sẵn; phải giữ phiên bản client/server và log thật. Nhãn API/Service không tự suy từ Method nếu projection chưa khai báo và có bằng chứng tương ứng.

## 4. Huy — điều phối và phương pháp

- Chốt G0–G2, cấp source/config/patch pins, scope, fixture và inventory rule; thống nhất technical contract dùng chung, không tự duyệt ground truth.
- Giữ task tách biệt: Phát không được đưa vào nhóm AI đang xem output hệ thống để nhờ sửa nhãn. Huy/Hiển không nhận nhãn test để tuning.
- Trước mở rộng inference, bổ sung baseline lexical và graph+contract không LLM, cùng input policy; không gọi source-only là Vector RAG hoặc context metadata-rich là graph topology-only.
- Chốt output/projection Method/API/Service và abstention/failure handling với Phát trước score; không lặng lẽ chuyển 5-ID registry P01 thành benchmark universe.
- Chỉ chạy model theo ngân sách đã duyệt, giữ request/config/code hashes và mọi attempt. Không cần đạt F1 đẹp để hoàn tất task kỹ thuật.
- Khi gói P01–P04 đủ, gửi reviewer source-first một đợt rồi label comparison. Reviewer có thể request_changes hoặc unable_to_review; lưu nguyên phản hồi, không xin ký cho đủ thủ tục.

## 5. Tin nhắn ngắn có thể gửi kèm packet

**Hiển:**

> P02 đã chọn: includeDetails tùy chọn/default false, giữ consumer/thân handler. Input và runner baseline đã có; baseline thật có đủ bốn visits qua provider/gateway, chưa mutated hoặc khóa universe. Bạn báo phần đang làm để tránh trùng, rồi xác nhận có thể tái lập/integration theo packet không. Sau các gate đầu vào mới kiểm parser/contract delta → Neo4j/output development; cần phân biệt optional/default với required, không coi reachable là impacted. Không cần làm lại P01 hoặc baseline từ đầu nếu không phục vụ tái lập, không làm nhãn/tự merge.

**Phát:**

> P02 đã có source/patch/fixture và inventory/universe dự thảo; baseline feasibility mới chạy thật, chưa mutated/nhãn. Nhờ bạn kiểm độc lập census, seed/alias, phạm vi và đối chứng từ source, đừng chỉ ký theo danh sách AI. Nếu cần sửa thì tạo version trước polarity/output. Sau xác nhận mới khóa đầu vào và thu baseline/mutated/đối chứng đầy đủ; chín GET baseline không thay matrix 40 slot. Không dùng parser/GraphRAG/LLM output hoặc score làm căn cứ; bạn không tự duyệt draft. Bạn xác nhận đầu vào và blocker giúp mình nhé.

Đính kèm PROJECT_CONTEXT.md hiện hành, packet này và allowed input snapshot đúng vai trò. Chỉ gửi link GitHub sau khi bản tương ứng thực sự đã được push; hiện các cập nhật điều phối còn cục bộ. Không gửi toàn bộ thư mục output kỹ thuật cho Phát hoặc reviewer trước source-first.
