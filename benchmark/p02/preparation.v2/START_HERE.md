# P02 — kiểm lại đầu vào sau F01/F02

Đây là bản **đề nghị kiểm lại**, không phải bộ input đã khóa hoặc nhãn được duyệt. Scenario `0.1.1`, universe `draft.v2`; fixture/patch/scope/inventory/request-plan vẫn giữ byte của v1. Phiên bản này chỉ sửa liên kết checksum và đường dẫn bằng chứng.

## Bắt đầu

1. Giải nén toàn bộ ZIP vào thư mục mới; không chép đè gói P02 trước. Thư mục có file này là **gốc gói**.
2. Đối chiếu SHA-256 ZIP với thông tin bàn giao. Mở PowerShell tại gốc gói, chạy:

   ```powershell
   node .\verify_p02_revision.mjs
   ```

   Cần Node.js có sẵn; không cần npm install, Docker, API key hoặc mạng. Checker chỉ đọc file, không khởi động ứng dụng. Exit 0 xác nhận byte/liên kết theo đặc tả, không thay quyết định người kiểm.
3. Đọc `CHANGELOG.md` và `INPUTS.json`. Hai file đề nghị dùng cho vòng kiểm này là:
   - `benchmark/p02/preparation.v2/scenario.json` — scenario `0.1.1`.
   - `draft/evaluation_universe.draft.v2.json` — universe dự thảo, `scenario_version=0.1.1`.
4. Đối chiếu fixture tại `benchmark/p02/preparation.v1/fixture.json`, source tại `input/app/`, patch/scope trong `benchmark/p02/preparation.v1/`. Mọi `evidence_refs` trong universe tính từ **gốc gói**, không từ thư mục `draft/` hoặc repo PetClinic.
5. Dùng `RECHECK_TEMPLATE.md` ghi kết luận, bất đồng và phần chưa kiểm; lưu thành hồ sơ mới ở ngoài gói frozen. Không sửa byte gói để ghi quyết định.

## Cần kiểm lại gì?

- **F01:** SHA-256 của byte fixture phải là `2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191` và khớp scenario, universe, INPUTS. Dữ liệu dự định vẫn là owner 6/pets 7–8/bốn visits; owner 1/pet 1 đối chứng rỗng. Hash `2a837540…` của universe cũ đến từ việc định dạng lại JSON, không phải một fixture nội dung khác.
- **F02:** đủ 29 đường dẫn đã rà, gồm 16 source refs và 13 patch refs; bốn file đích tồn tại. Giữ 15 alias cùng baseline/mutated/canonical ID, census, seeds và exclusions như cũ. `evidence_root` đã khai rõ là gốc gói.
- **Phạm vi sửa:** không thay request domain, split development, patch, source hoặc config; không tự xác nhận alias, gán polarity hoặc đổi trạng thái nghiệm thu.
- **F03:** vẫn missing/unresolved. Mutated/POST/40 slots/repetitions-reset/helper/setter/fallback chưa chạy trong vòng sửa này; không yêu cầu những quan sát chưa có để giả hoàn thành review metadata. Kế hoạch runtime được xét riêng sau thống nhất đầu vào.

## Lịch sử và giới hạn

- `history/evaluation_universe.draft.v1.json` giữ đúng byte universe trước sửa; chỉ để truy vết, không dùng khóa input mới.
- `history/phat-f02-proposal.original.json` giữ proposal paths-only tại commit `00aa4dcc3eb8cb9a4706572b325e481316cbcad4`. Tên proposal “v3” là tên bản làm việc của Phát, **không phải** scenario/universe v3 được áp dụng. Proposal vẫn giữ hash fixture cũ có lỗi; không dùng thay bộ được chỉ định trong INPUTS.
- `draft/inventory.v1.json` và `draft/request-plan.v1.json` không đổi. 40 case vẫn chỉ là kế hoạch; chưa phải 40 request đã chạy.
- Gói này không chứa raw baseline cũ vì không tái chạy hoặc thay thế evidence; dùng gói P02 trước/hồ sơ review của Phát để đọc bằng chứng đó. Không cần chạy lại baseline chỉ để sửa metadata nếu dữ liệu/source/config thực sự không đổi.
- Đây là review phạm vi trước nhãn; đã có exposure draft nên không gọi blinded hoặc accepted ground truth. Bổ sung đúng các draft thực tế đã xem, không tạo checkpoint source-first hồi tố hay dùng timestamp công cụ làm chữ ký người.
- `tooling/` là bản chụp mã chuẩn bị/test để audit, không phải implementation được đánh giá hoặc entry point chạy ứng dụng. Để tạo lại gói dùng workspace/repository đủ spec với lệnh trong changelog; verifier ở gốc gói chạy độc lập.

Sau vòng này cần quyết định người thật về F01/F02 và đề nghị chốt đầu vào. Kết luận thuận lợi không tự mở runtime, nghiệm thu nhãn, khóa test hoặc chấm điểm chính thức.
