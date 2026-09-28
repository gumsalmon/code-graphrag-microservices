# Audit đầu vào P01 trước khi giao việc

Ngày kiểm tra: 23/09/2026

Người kiểm tra kỹ thuật: AI hỗ trợ Huy

Phạm vi: kiểm kê read-only; chưa tái chạy Docker/runtime và chưa thẩm định ground truth.

## 1. Provenance đã xác nhận

- Checkout: `E:/NCKH/petclinic-pilot/spring-petclinic-microservices`.
- Git ở detached HEAD: `3858f9c630cf989bb6809a86edf47c2be78dc9f1`.
- Tracked source không có diff tại thời điểm kiểm tra.
- Các file `build_baseline.log`, `docker-compose-test.yml` và `evidence_p01_runtime/` đang untracked trong checkout PetClinic.
- `mutation.patch` thay đổi `VisitResource.read` bằng cách thêm boolean request parameter `includeDetails`; mutation không còn áp dụng trong working tree tại thời điểm kiểm tra.
- Config revision `323993ce2519c6d02df63e08bf4458d123d3b611` xuất hiện trong `api_gateway_mutated.log`.

## 2. Inventory và SHA-256

| File | SHA-256 | Phân loại ban đầu |
|---|---|---|
| `api_gateway_mutated.log` | `8A9E6503478F1C333FC5866C3339A65DBB8AAA8245E150705F58C698D6EECEF6` | Raw/supporting evidence |
| `baseline_results.log` | `71B7CE476A2807AB525807AAFCB4B45B394081ABE5406E53A10BC12D0F2E341F` | Derived/clean result; cần đối chiếu rerun |
| `build_mutated.log` | `0800EF0A7E6DE915A6493C81EAEB775EFCCDB16D544D240E356623E188B19620` | Build provenance |
| `mutation.patch` | `42394CA361D07DB58BA6A73CFC1DDB8BD1D9AEDDB59292873552573ADFA5CC21` | Change input |
| `p01_label.md` | `97DD5B0814296CDD6D087DA5BF2DA8062B17EB0D39CD14844106CC33C1E2DC29` | Draft label; restricted trước independent review |
| `report.md` | `85B2E80A8BF2CF7619146E606C5383A7711CF6B9A4FA1AD0272B80EEB1FDDA80` | Derived interpretation; restricted trước independent review |
| `run_baseline_results.txt` | `847224E65B1D4C5DEA4D7D2095FE193B0DE00FE2D7E1FF9DE3E5AF4EC9F0B8F5` | Raw failed/noisy run |
| `run_mutated_results.log` | `6F5EF40AB5710D9242F2B0FED39C8B391B8448040393CFF1EF3F9A06F84FAC52` | Mixed raw run; có kết quả nhưng có lỗi đầu log |
| `run_mutated_results.txt` | `AE91EFC49CF98097BF8AB445F9D451E666797A69EE9C2715509156FA31DA84EB` | Raw failed/noisy run |
| `test_baseline.ps1` | `15962076F816676A3772697DE2B2855A1656D3FD32003D667CBD723802AF2438` | Historical test script; cần audit |
| `test_mutated.ps1` | `B14625B2861A61A9CC9DCD6AFF5274D5C62077D204244CB7F1DDEDDA93F94615` | Historical test script; cần audit |
| `docker-compose-test.yml` | `13422079EF4FDBFEA3D29F6AF8C9E831D0110CE7C8BDFFB332A60C5F999F2344` | Historical environment config |
| `build_baseline.log` | `EC48FE60A342CAE839D16D7FA11BF2608AFA91457D38143CE30F144507CF9B1E` | Build provenance |

Hash trên mô tả trạng thái file lúc kiểm tra, không chứng minh nội dung đúng hoặc đủ.

## 3. Vấn đề chất lượng đã thấy

1. `run_baseline_results.txt` ghi lỗi kết nối/HTTP và không tạo được status/body hợp lệ; nó không xác nhận baseline thành công.
2. `run_mutated_results.txt` chứa lỗi PowerShell do cách gọi/redirect làm mất biểu thức biến; không dùng file này làm bằng chứng thành công.
3. `run_mutated_results.log` có các kết quả HTTP cần thiết nhưng bắt đầu bằng lỗi do request 400 ném exception. Phải giữ nguyên raw log và tạo rerun sạch thay vì xóa phần lỗi.
4. `baseline_results.log` trình bày kết quả sạch, nhưng gói hiện tại chưa ghi rõ lệnh tạo file và quan hệ dẫn xuất từ raw log nào. Phát phải tái chạy hoặc hạ mức tin cậy.
5. `report.md` là diễn giải sau quan sát, không phải raw evidence.
6. `p01_label.md` là draft label cũ và còn ghi “chờ Huy thẩm định”; không đưa cho Phát trước independent assessment.
7. Báo cáo lịch sử ghi Docker image cache có thể còn bản mutated. Rerun phải dùng image/tag hoặc build identity phân biệt và cách ly snapshot.
8. Chưa có negative behavioral case được chứng minh trên repository thật.
9. Chưa ghi người tạo draft label và reviewer độc lập.
10. Evidence chưa được commit/version hóa trong repository điều phối.

## 4. Kết luận sử dụng

Gói hiện tại đủ để khởi động audit và thiết kế rerun, nhưng chưa đủ để tự động nâng P01 thành ground truth chính thức. Kết quả khoa học hợp lệ ở bước này có thể là `pending_review` nếu rerun không tái hiện hoặc provenance chưa đầy đủ.
