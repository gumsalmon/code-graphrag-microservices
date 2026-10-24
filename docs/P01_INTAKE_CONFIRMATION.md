# Xác nhận đầu vào trước khi thực hiện P01

Trạng thái: **DRAFT — gửi Huy xác nhận trước khi tạo/sửa artifact dùng chung**

Ngày lập: 23/09/2026

Người phụ trách: Phát

AI hỗ trợ: Codex (chỉ kiểm kê, tổ chức bằng chứng và chuẩn bị biểu mẫu; không thay thế annotator/reviewer)

## 1. Commit/snapshot và patch sẽ dùng

- Repository điều phối: `https://github.com/gumsalmon/code-graphrag-microservices.git`.
- Branch của Phát: `Pham_Nguyen_Phat`.
- Commit gốc repository điều phối đã kiểm tra: `7008cba6fa1d3f6ee5235774be7e1f5679b06b3d`.
- Repository nguồn P01 theo package metadata: `https://github.com/spring-petclinic/spring-petclinic-microservices`.
- Baseline commit dự kiến: `3858f9c630cf989bb6809a86edf47c2be78dc9f1`.
- Config revision quan sát: `323993ce2519c6d02df63e08bf4458d123d3b611`.
- Patch dự kiến: `evidence/raw/mutation.patch`, SHA-256 `42394ca361d07db58ba6a73cfc1ddb8bd1d9aeddb59292873552573adfa5cc21`.
- Snapshot source hiện nhận được chỉ gồm ba file trong `source/baseline/`; package khai báo chúng thuộc baseline commit trên. Chưa có full checkout để tự xác nhận commit, trạng thái tracked tree sạch hoặc khả năng áp dụng patch.
- P01 được xử lý như pilot. Không mặc định xác nhận tuyến ứng viên, nhãn cũ hay kết luận GraphRAG tốt hơn baseline.

## 2. Input đã nhận và checksum tự tính lại

Tất cả 18 entry được liệt kê trong `checksums.sha256` đã được tính lại bằng SHA-256 ngày 23/09/2026 và **đều khớp**. Hash của chính file manifest `checksums.sha256` là `e9ca64c7572e487781c05b6dc113bc756a1af0a316ce50a5a71e1e7e8908734f` (manifest không tự liệt kê hash của nó).

| Input | SHA-256 tự tính lại | Kết quả |
|---|---|---|
| `docs/P01_INPUT_AUDIT.md` | `5c81a9209ca14a4faf02035a0131f7fbeba6cd52c3b91eca57743138114fd217` | Khớp |
| `docs/PHAT_P01_INDEPENDENT_BENCHMARK.md` | `2967df10004ef57baad02383e833ecb923bce6e456a0bddfa9298e11b11ae1f3` | Khớp |
| `docs/PROJECT_CONTEXT.md` | `f2749bcba2e65f3339ef0c0ffcc1917d04ee0013e9776b506600c4f5edad679c` | Khớp |
| `evidence/raw/api_gateway_mutated.log` | `8a9e6503478f1c333fc5866c3339a65dbb8aaa8245e150705f58c698d6eecef6` | Khớp |
| `evidence/raw/baseline_results.log` | `71b7ce476a2807ab525807aafcb4b45b394081abe5406e53a10bc12d0f2e341f` | Khớp |
| `evidence/raw/build_baseline.log` | `ec48fe60a342cae839d16d7fa11bf2608afa91457d38143ce30f144507cf9b1e` | Khớp |
| `evidence/raw/build_mutated.log` | `0800ef0a7e6de915a6493c81eaeb775efccdb16d544d240e356623e188b19620` | Khớp |
| `evidence/raw/docker-compose-test.yml` | `13422079ef4fdbfea3d29f6af8c9e831d0110ce7c8bdffb332a60c5f999f2344` | Khớp |
| `evidence/raw/mutation.patch` | `42394ca361d07db58ba6a73cfc1ddb8bd1d9aeddb59292873552573adfa5cc21` | Khớp |
| `evidence/raw/run_baseline_results.txt` | `847224e65b1d4c5dea4d7d2095fe193b0de00fe2d7e1ff9de3e5af4ec9f0b8f5` | Khớp |
| `evidence/raw/run_mutated_results.log` | `6f5ef40ab5710d9242f2b0fed39c8b391b8448040393cff1ef3f9a06f84fac52` | Khớp |
| `evidence/raw/run_mutated_results.txt` | `ae91efc49cf98097bf8ab445f9d451e666797a69ee9c2715509156fa31da84eb` | Khớp |
| `evidence/raw/test_baseline.ps1` | `15962076f816676a3772697de2b2855a1656d3fd32003d667cbd723802af2438` | Khớp |
| `evidence/raw/test_mutated.ps1` | `b14625b2861a61a9cc9dcd6aff5274d5c62077d204244cb7f1ddedda93f94615` | Khớp |
| `PACKAGE_METADATA.json` | `0934c77f8c4c10aa5cecf8da72c4126f07d982aba57f0ef0aba8fb091573150b` | Khớp |
| `source/baseline/ApiGatewayController.java` | `08abd935c2c090593e920d02dfeeea9ed08e92434b4f7e0b3c0da41f5a2c1ff5` | Khớp |
| `source/baseline/VisitResource.java` | `78841fc2f1bc5b69339e085a3934040e467578e257af86dd9bbe352a30a1fe48` | Khớp |
| `source/baseline/VisitsServiceClient.java` | `3aaff229d5971908e679f22dbc6f79fbec10793777f1501715ed9b2ee8b7b058` | Khớp |

## 3. Input bị cấm trước khi khóa nhãn

- `evidence_p01_runtime/p01_label.md`.
- `evidence_p01_runtime/report.md`.
- JSON hoặc output do parser sinh.
- Cypher và kết quả truy vấn Neo4j.
- Context/kết quả/điểm số từ GraphRAG, Vector RAG hoặc LLM.
- Bất kỳ benchmark score nào của phương pháp đang được đánh giá.

Hai file nhãn/báo cáo cũ không có trong package đã nhận. `PROJECT_CONTEXT.md` có nêu giả thuyết và tuyến ứng viên nên P01 không được mô tả là blind hoàn toàn; nguy cơ expectancy bias sẽ được ghi trong threats to validity.

## 4. Artifact dự kiến tạo

```text
benchmark/
  protocol/
    benchmark_protocol_v0.1.md
  p01/
    scenario.json
    labels.v1.json
    evidence_manifest.json
    review_log.md
    checksums.sha256
    raw/
    derived/
```

- `benchmark_protocol_v0.1.md`: protocol tái sử dụng cho P02–P04, gồm định nghĩa impact/hop, evidence hierarchy, negative/unresolved criteria, quy trình hai người, split/leakage và freeze/unfreeze.
- `scenario.json`: provenance, seed, loại scenario, fixture và các điều kiện tái hiện; chưa chứa output của hệ thống được đánh giá.
- `labels.v1.json`: nhãn máy đọc được, tách seed khỏi impact set và tách `behavioral_impact` khỏi `requires_code_change`.
- `evidence_manifest.json`: ánh xạ từng assertion/label tới source, contract hoặc runtime evidence có thể kiểm tra.
- `review_log.md`: annotator, reviewer, thời gian, bất đồng, quyết định và lý do; hai vai trò phải là hai người khác nhau.
- `checksums.sha256`: checksum dùng khi freeze label version.
- `raw/`: input/log nguyên trạng, không xóa hoặc sửa lỗi lịch sử.
- `derived/`: bản phân loại, bảng tóm tắt và kết quả dẫn xuất; luôn truy ngược được về raw evidence.

Schema trên mới là đề xuất. Không để task khác phụ thuộc và không freeze `labels.v1.json` trước khi Huy xác nhận schema/protocol cùng reviewer.

## 5. Blocker, dữ liệu thiếu và người cần cung cấp/xác nhận

| Blocker hoặc dữ liệu thiếu | Ảnh hưởng | Người cần cung cấp/xác nhận |
|---|---|---|
| Full checkout PetClinic tại `3858f9c...` hiện không còn trên máy; chỉ có snapshot ba file | Chưa thể tự xác nhận commit, tracked tree sạch, patch áp dụng được hoặc dẫn file/dòng toàn repository | Huy xác nhận cho phép khôi phục từ remote chính thức hoặc cung cấp checkout/snapshot đầy đủ; Phát/AI thực hiện kiểm tra sau khi có |
| Chưa có xác nhận schema và protocol version dùng chung | Không được tạo dependency chung hoặc khóa nhãn chính thức | Huy phê duyệt đề xuất tại mục 4 |
| Chưa xác định annotator của draft cũ và chưa chỉ định reviewer thứ hai | Không thể đạt điều kiện review độc lập hoặc chuyển `pending_review` thành `accepted` | Huy chỉ định/ghi nhận annotator và reviewer; Phát không tự duyệt nhãn mình lập |
| Raw baseline hiện có lỗi/noisy; bản tóm tắt sạch chưa truy nguyên đầy đủ | Chưa đủ evidence runtime để chấp nhận P01 | Phát/AI rerun bốn nhóm quan sát sau khi môi trường được khôi phục; Huy hỗ trợ nếu fixture/scenario cần thay đổi |
| Maven không có trong `PATH`; Docker CLI có nhưng báo không đọc được `C:\Users\voltk\.docker\config.json` trong sandbox | Có thể cản build/rerun; Maven Wrapper trong full checkout có thể giải quyết phần Maven | Phát/AI kiểm tra wrapper và Docker runtime sau khi có checkout; báo Huy nếu cần thay đổi môi trường |
| Negative behavioral case trên repository thật chưa được chọn | Chưa đạt Definition of Done; không được thay bằng fixture âm của parser | Phát đề xuất theo protocol và evidence; reviewer độc lập rà soát; Huy xác nhận nếu lựa chọn làm đổi phạm vi scenario |

Đề nghị Huy xác nhận: (a) cho phép khôi phục full source từ repository chính thức đúng commit; (b) chấp thuận hoặc sửa cấu trúc/schema đề xuất; (c) chỉ định reviewer thứ hai và làm rõ annotator của draft cũ. Trong khi chờ, trạng thái P01 giữ `pending_review`, chưa có label freeze/checksum chính thức.
