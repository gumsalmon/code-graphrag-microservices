# Công việc và đầu ra P02

## Mục tiêu

Hoàn thiện hồ sơ benchmark P02 đến mức **nhãn nháp độc lập sẵn sàng review**, không cần chờ reviewer duyệt từng bước. Giữ input đã chốt; không coi checklist/test pass là nhãn.

## Thứ tự thực hiện

### A. Tiếp nhận và notes trước nhãn

Kiểm gói; đọc protocol, decision/input candidate, source baseline/mutated, patch và fixture. Đọc raw HTTP, service logs, build/ownership/cleanup và targeted helper records để rà từng ID/alias. Khai đúng những draft/notes/summary đã từng xem và phần AI hỗ trợ; không tạo timestamp hay checkpoint trước exposure hồi tố.

Ghi `SOURCE_FIRST_NOTES.md` cùng worksheet theo từng ID, trước khi lập nhãn hoặc đọc tổng hợp/kết luận của người khác. Lưu bản gốc và SHA-256. Rà bằng chứng độc lập từ dữ liệu, không chỉ lặp kết luận stdout của checker.

Phân biệt:

- Miền request cũ hợp lệ và binding diagnostics (invalid boolean/missing petId).
- Dependency, behavioral impact và requires_code_change/repair strategy.
- Production consumer E2E, local HTTP fixture, gọi helper trực tiếp và fault injection bổ sung.
- Không quan sát được, không đủ bằng chứng và bằng chứng hợp lệ về hành vi không đổi.

Không ép mọi method reachable thành positive, hoặc mọi helper chưa được quan sát thành negative. Giữ seed/exclusions, Method/API/Service IDs, alias/census/scope; không bỏ ID khó để làm gói “đủ”. Nếu cần thay input/universe, ghi đề nghị version mới để thống nhất trước; không tự áp dụng.

### B. Nhãn nháp có điều kiện

Theo yêu cầu điều phối mới, khi đã lưu notes và xác định evidence phù hợp, Phát được lập `labels.draft.vN.json` và `evidence_manifest.vN.json` theo protocol v0.2, gắn đúng scenario/universe/fixture hashes và source/runtime refs. Người thật quyết định polarity và giải thích; AI chỉ hỗ trợ tổ chức/kiểm tra. Nếu chưa đủ, dùng `unresolved` với lý do/phép đo cần bổ sung, không mặc định false.

Nhãn hành vi, nhãn repair, hop logic và số lần vượt service boundary phải riêng, có provenance. Dùng baseline canonical IDs và alias đã chốt; không suy hop từ graph đang đánh giá. Không tự projection Method sang API/Service. Nếu format cần mở rộng ngoài protocol, đề nghị schema/version trước thay đổi dùng chung.

Nhãn vẫn **pending_review**. Annotator ghi người thật, ngày/thời điểm biết thực tế, mức AI hỗ trợ. Reviewer và quyết định chưa có giữ null. Tạo checksum draft để có checkpoint trước khi phía kỹ thuật mở output development; không tự ghi accepted/test/scoring.

### C. Bàn giao

Tạo folder return ngoài packet và ZIP gồm:

1. `RETURN_PHAT.md`: input/ZIP/version/hash đã nhận, công việc thực làm, kết luận evidence readiness, chưa đủ gì, mức AI hỗ trợ và danh sách file đầu ra.
2. Notes gốc, worksheet theo ID và hash checkpoint trước annotation.
3. Draft labels/evidence manifest/version/hash nếu đủ điều kiện lập; unresolved list cho các ID chưa đủ. Nếu chưa lập, ghi rõ lý do thay vì tạo file trống rồi gọi đã xong.
4. `EVIDENCE_REQUESTS.md`: chỉ khi cần bổ sung, ghi ID, bằng chứng thiếu, phép đo cụ thể, tiêu chí đạt và vì sao raw hiện có chưa đủ. Không yêu cầu chạy lại toàn matrix mặc định.
5. Lệnh, stdout/stderr/exit đã thực chạy, checksum của return; khai phần chỉ đọc, chỉ suy luận hoặc chưa tái hiện. Không đưa credential/cache/JAR không cần thiết.

Không sửa hoặc tự duyệt labels của mình, không sửa source/raw/manifest frozen, parser/Neo4j/GraphRAG/scorer, không xem prediction/score để điều chỉnh nhãn. Không commit/push/merge thay nhóm.

## Definition of Done

Mỗi eligible ID có notes/evidence sufficiency rõ, nhãn draft có căn cứ hoặc unresolved có lý do; nguồn dữ liệu truy vết được, input/hash không drift, source-first checkpoint/exposure/AI assistance khai thật, output `pending_review` và có checksum. Không đặt số positive/negative cần đạt, không hứa nhãn sẽ được reviewer chấp thuận.
