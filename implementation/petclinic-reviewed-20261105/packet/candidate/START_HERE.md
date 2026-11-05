# P03 — đề nghị đầu vào, chưa chốt để chạy

Ứng viên C03-A đổi tên khóa JSON `pets` thành `animals` tại **GET `/owners/{ownerId}` của Customers**. Gateway, entity Owner dùng chung, database và config giữ nguyên. Đây là synthetic mutation trong development, cùng họ PetClinic owner-details với P01/P02; không phải tập test chưa lộ.

## Đọc theo thứ tự

1. `spec/scenario.candidate.v0.1.0.json`: operator, source/config pin, các hash và quyền chưa mở.
2. `input/app/`, `draft/source-audit.v1.json` và `spec/owner-response-rename.patch`: byte Git gốc, vị trí mã và patch; `mutated/app/` chỉ chứa file áp patch trong bản sao riêng. Chưa compile hoặc chạy ứng dụng.
3. `spec/fixture.candidate.v1.json` và `draft/runtime-plan.v1.json`: primary owner 6/pets 7–8; owner 1 có pet nhưng không có visits; muốn owner không có pet phải tạo riêng trong DB sandbox. Kế hoạch có setup POST và write controls nhưng chưa được phép thực thi.
4. `spec/scope.candidate.v1.json`, `draft/inventory.v1.json`, `draft/evaluation_universe.draft.v1.json`: census sáu top-level class/record, có helper/getter/setter và đối chứng; chưa được xác nhận độc lập. Các builder lồng nhau, constructor, accessor record ngầm và file support có quy tắc loại trừ rõ; không gọi full-repo coverage.
5. `protocol/benchmark_protocol_v0.2.md`, `PROVENANCE.json`, `commands.json`: quy trình nguồn, lệnh Git và các giới hạn.

## Kiểm toàn vẹn

Node 24+, không cần npm/Docker/API key hoặc mạng:

```powershell
node tooling/scripts/prepare_p03_inputs.mjs check --run .
```

Lệnh phải báo `candidate_integrity_verified_not_input_lock`. Checksum và kiểm tái dựng không thay xác nhận phạm vi, chốt input hoặc nghiệm thu nhãn. File manifest gốc: `SHA256SUMS.txt`.

## Những gì còn phải quyết định và đo

- Huy xem operator/patch/fixture/scope cụ thể và chọn ca; người phụ trách benchmark xác nhận census, alias, coverage và khả năng lập nhãn độc lập trước chốt input.
- Chỉ sau quyền phù hợp mới build/kiểm baseline và chạy baseline/mutated. Map bảy trường là đề xuất; phải đo cả nested JSON, `Optional.empty`, owner list, POST/PUT và consumer thật để kiểm cô lập. Không điền trước gateway 500, null hay fallback.
- Mỗi group là stack và DB mới. Giữ raw mọi lỗi/readiness/setup, build/image/config/hash; không sửa consumer, không retry để chọn kết quả đẹp. Các repetition không phải sample nghiên cứu độc lập.
- Khi đủ source/contract/runtime mới giao Phát lập nhãn nháp theo task riêng, lưu notes/exposure và checksum trước output phương pháp. Thiếu bằng chứng giữ unresolved. Reviewer khác annotator, chưa nhận việc thì để null.

Không có nhãn, prediction hoặc score trong gói này. Công cụ kiểm response chỉ kiểm delta dữ liệu bằng fixture tổng hợp, chưa nối runner/parser/Neo4j/scorer. Giữ nguyên gói khi phản hồi; ghi nhận xét hoặc đề nghị sửa ở thư mục khác. Không gửi gói này như một task mới bắt Phát ngưng lượt P02 đang làm.
