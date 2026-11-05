# P01 — hồ sơ bàn giao kỹ thuật và các điểm còn mở

Cập nhật: 15/10/2026. Phạm vi: pilot/development trên PetClinic, không phải nghiệm thu hiệu quả nghiên cứu.

P01 đã có luồng chuẩn bị parser → Neo4j/Chroma → hai request, viewer offline và kiểm phản hồi có dẫn chứng. Chưa thể ghi “hoàn thành toàn bộ P01”: cặp suy luận mới còn thiếu phản hồi Graph+Vector hợp lệ; nhãn cần quyết định reviewer thật; phần code mới chưa được công bố thành commit.

## Trạng thái theo từng phần

| Phần | Bằng chứng/trạng thái | Không được suy rộng thành |
|---|---|---|
| Parser → Neo4j baseline/mutated | Kiểm độc lập implementation `e95613795133088621117179c9fb9592dab62b16`, 59/59 test, không skip; bắt lỗi thêm overload sai | Parser toàn repo hoặc nhãn tác động đúng |
| Chuẩn bị có thể tái chạy | [Pipeline P01](../pipeline/p01/README.md); lượt mới `20261015T082522708Z-0539ac7d` chạy parser/Neo4j baseline + mutated/Chroma thật, checker 46/46 file, không gọi LLM | Một lệnh đã chạy cả model và chấm điểm |
| Vector và Graph+Vector context | Chroma thật, cùng truy xuất/seed/patch/registry; graph bổ sung cạnh và metadata; giữ provenance | So sánh đã cân bằng token hoàn toàn hoặc chứng minh lợi ích riêng topology |
| Contract unknown mới | Request `/3`, prompt `p01-static-impact/2`; hai cấu hình cùng quy tắc; response legacy giữ contract cũ | Hồi tố chuyển output lỗi thành pass hoặc unknown thành nhãn âm |
| Vector, model thật | Run `20261015T070159953Z-live-f5d5fdd6`, phản hồi qua kiểm cấu trúc; hai bản ghi pure abstention | Bốn method bị tác động; hai nhãn âm; độ đúng ngữ nghĩa đã được duyệt |
| Graph+Vector, cùng contract | Run `20261015T075831543Z-failed-82a85f89`: HTTP 503 `UNAVAILABLE`, 2070 ms, một call, không retry, usage không có | Dự đoán rỗng, điểm 0, hoặc cặp model đã hoàn tất |
| Viewer đối chiếu | Nhập gói hai attempt, giữ cả lỗi, kiểm ID/quote/path và hiển thị cảnh báo; không gọi API | Chứng thực provider từ browser hoặc thẩm định ground truth |
| Benchmark của Phát | Snapshot `5f9204d66253604edf9101c2f888fc7e75aa0be7`; nhãn v3 giữ nguyên byte, `pending_review` | Nhận xét tổng quan của thầy/anh reviewer là quyết định nhãn |
| Công bố code | HEAD nền `d1f95eb21c71dd6bfb49d2e450142d1290ceda5f`; thay đổi tiếp theo còn working tree | Clone GitHub đã chứa mọi chức năng mới |

SHA-256 nhãn v3: `3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce`. Không đổi nhãn/raw evidence để cập nhật trạng thái review. Kiểm kỹ thuật độc lập và kiểm nguyên vẹn checksum là hai việc khác nhau.

## Tự kiểm hồ sơ hiện tại, không gọi model

Chạy từ gốc repo; các thư mục dưới đây là artifact **cục bộ Git ignored**, không phải file có sẵn từ GitHub. Clone mới đi theo hướng dẫn pipeline để tạo run riêng và truyền đường dẫn tương ứng.

```powershell
node scripts/audit_p01_closeout.mjs --comparison-file handoff-out/p01-comparison/20261015T081222218Z-306e382a/comparison.json --contract-run handoff-out/p01-contract/20261015T064526833Z-96bc2152 --pipeline-run handoff-out/p01-pipeline/20261015T082522708Z-0539ac7d
node scripts/check_p01_demo_browser.mjs --comparison-file handoff-out/p01-comparison/20261015T081222218Z-306e382a/comparison.json
```

Audit đối chiếu gói comparison với artifact gốc, kiểm 8 file contract, 46 file pipeline mới, hash byte nhãn ở snapshot và sổ chuẩn bị ca mới. Pipeline mới và model attempts là các lượt độc lập: request graph mới có provenance/run ID mới nên không gán model response cũ cho nó. Audit chỉ đọc quyết định review ở snapshot đã pin, không khẳng định đó là trạng thái remote mới nhất. Nó không chạy lại runtime, không đọc nhãn làm đáp án, không gọi API, không tự phê duyệt.

`audit.json` được tạo ở thư mục mới trong `handoff-out/p01-closeout/`. **Exit code 0 chỉ có nghĩa hồ sơ qua kiểm toàn vẹn; phải đọc `open_items`.** Hai phản hồi hợp cấu trúc cũng không đủ nghiệm thu nhãn hoặc nghiên cứu. Raw Gemini output không nhúng vào viewer công khai hay gửi cho người lập nhãn/reviewer trước bước độc lập.

Kiểm thử source:

```powershell
node --test reasoning/p01/abstention.test.mjs reasoning/p01/comparison.test.mjs reasoning/p01/comparison-files.test.mjs reasoning/p01/retrieval.test.mjs reasoning/p01/reasoning.test.mjs reasoning/p01/gemini.test.mjs demo/p01/demo.test.mjs pipeline/p01/pipeline.test.mjs pipeline/p01/closeout.test.mjs
```

Test Windows DPAPI phải chạy dưới profile Windows thật, dùng dữ liệu tổng hợp; không đổi sang plaintext hoặc bỏ test để báo đạt. Xem báo cáo chạy thực tế trong `tasks/research/`; không coi lệnh liệt kê ở đây là bằng chứng đã chạy.

## Definition of Done và phần còn thiếu

1. **Bàn giao kỹ thuật:** lệnh, input pin, code provenance, output, checksum, tests/browser và giới hạn được ghi; người nhận phân biệt prepare/offline/model thật. Các kiểm đã thực hiện không thay cho một lượt chạy lại toàn bộ mới.
2. **Cặp suy luận mới:** cả hai phản hồi đúng cùng request contract/config/code và qua validator; hiện còn mở do Graph+Vector 503. Giữ cả hai attempt Graph lỗi, không ghép kết quả legacy. Không tiếp tục gọi API hàng loạt; lượt thử sau cần xác định phạm vi và lưu run mới.
3. **Nghiệm thu benchmark:** reviewer khác người lập nhãn ghi nhận định source-first trước, sau đó đối chiếu nhãn và quyết định thật; hiện chưa có quyết định được xác minh. Nếu reviewer chưa nhận lời review gộp thì không ghi như đã nhận việc.
4. **Công bố source:** chọn rõ file, rà diff/secret, chạy kiểm tại revision công bố, rồi commit/push khi được yêu cầu. Gói candidate cục bộ không phải commit và không làm GitHub tự cập nhật.
5. **Thực nghiệm chính thức:** universe/ID Method–API–Service, baseline mạnh, ablation, budget/coverage/abstention, held-out split và quyền chấm phải được chốt riêng. P01 không trở thành unseen test; không tạo F1/Ragas chính thức từ pilot này.

“Đóng hồ sơ kỹ thuật” ở đây không đồng nghĩa “đã chứng minh GraphRAG hiệu quả”. Phạm vi hiện tại còn biết sẵn seed, ba file/five-method registry kỹ thuật, graph tối đa hai hop trong fixture và output dự đoán cấp Method.

## Có thể làm tiếp ngay

Theo mục 8.4 của [PROJECT_CONTEXT](../PROJECT_CONTEXT.md), **được chuẩn bị/phát triển P02–P04 trước review gộp**. Không cần chờ Gemini hoặc quyết định nhãn P01 để kiểm khả thi nguồn, khóa patch/fixture/universe và thu runtime độc lập. Các ca vẫn development, nhãn pending review; test lock/scoring không tự mở.

- [Kế hoạch, gates, tiêu chí và Definition of Done P02–P04](P02_P04_EXECUTION_PLAN.md).
- [Task packet, đầu ra và tin nhắn đề nghị cho Hiển/Phát](P02_P04_TASK_PACKETS.md).
- [Sổ ứng viên máy đọc được](P02_P04_RESEARCH_REGISTER.json): P02 đã chọn để chuẩn bị [patch/fixture/scope](../benchmark/p02/README.md); chưa khóa universe để gán nhãn hoặc chạy runtime. P03/P04 còn đề xuất.

Thứ tự tiếp theo: chọn ca và phân công được thành viên xác nhận → P02 → P03 → kiểm khả thi baseline P04 rồi mới mutation → review gộp. Các checkpoint không được xác nhận thay bằng suy luận của AI.
