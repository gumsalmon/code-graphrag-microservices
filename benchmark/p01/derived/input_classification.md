# Phân loại đầu vào P01

Toàn bộ hash đã được tính lại trước khi phân loại. Các raw failure được giữ nguyên.

| File | Phân loại | Cách sử dụng |
|---|---|---|
| `api_gateway_mutated.log` | raw/bổ trợ | Xác nhận config revision và cung cấp ngữ cảnh chẩn đoán; một mình file này không đủ để lập nhãn impact |
| `baseline_results.log` | dẫn xuất/có vẻ sạch nhưng provenance yếu | Chỉ dùng để hình thành giả thuyết chạy lại |
| `build_baseline.log` | provenance của build | Bổ trợ môi trường/build |
| `build_mutated.log` | provenance của build | Bổ trợ môi trường/build |
| `docker-compose-test.yml` | cấu hình môi trường lịch sử | Dùng thiết kế lần chạy lại; tag image có thể thay đổi nên không chứng minh được identity |
| `mutation.patch` | đầu vào thay đổi có lỗi encoding | Giữ byte/hash gốc làm bản có thẩm quyền; cần bản chuyển UTF-8 chuẩn hóa để chạy `git apply` |
| `run_baseline_results.txt` | không hợp lệ/nhiễu | Giữ lại; không dùng cho kết luận thành công |
| `run_mutated_results.log` | kết quả raw hỗn hợp | Bổ trợ giả thuyết chạy lại; phần đầu có lỗi request |
| `run_mutated_results.txt` | không hợp lệ/nhiễu | Giữ lại; không dùng cho kết luận thành công |
| `test_baseline.ps1` | script lịch sử | Chỉ audit/tham khảo; xử lý lỗi chưa đủ |
| `test_mutated.ps1` | script lịch sử | Chỉ audit/tham khảo; request đầu phát sinh exception trước logic catch phía sau |
| Ba file Java baseline | snapshot source bất biến | Dùng làm source evidence sau khi đối chiếu với commit chính thức |
| `PACKAGE_METADATA.json` | provenance của package | Nguồn gốc và danh sách loại trừ được khai báo |
| `input_checksums.sha256` | tính toàn vẹn khi intake | Xác minh byte của đầu vào trong package |

Hai file bị hạn chế `p01_label.md` và `report.md` không có trong package và không được sử dụng. Output JSON/Cypher/Neo4j/RAG/LLM và benchmark score của hệ thống được đánh giá cũng không được sử dụng.
