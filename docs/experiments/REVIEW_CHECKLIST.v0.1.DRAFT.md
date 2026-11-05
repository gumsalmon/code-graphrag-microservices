# Những quyết định cần chốt cho thiết kế thực nghiệm

ID: `microservice-cia-experiment/0.1.0-draft.1`. Tất cả E01–E10 **đang mở**, không có chữ ký hoặc phê duyệt điền thay. Chuẩn bị tài liệu không giao thêm task cho thành viên hay cho phép chạy API/test/scorer.

| ID | Cần chốt | Người/luồng cần góp ý | Đầu ra quyết định thật |
|---|---|---|---|
| E01 | Static pre-deployment, known seed; B5–B4/Method micro F1 làm primary hay co-primary? | Điều phối + giảng viên, Phát kiểm nghĩa đánh giá | Target/estimand, contrast family và endpoints có version |
| E02 | Baseline B0–B5: feasibility, rule scope, unsupported levels | Hiển kiểm kỹ thuật, Phát kiểm cùng task/metric | Component readiness, input/output/version/tests, không claim implemented khi chưa có |
| E03 | A-G/A-S/A-C/A-T/H và B5–B2: fixed pool hay selection change? | Điều phối + Hiển | Cấu hình giữ/bỏ, alias/dedup và claim tối đa từng contrast |
| E04 | Corpus/chunking/query/top-k/tokenizer/packing/context/output cap | Điều phối + Hiển | Frozen config/hash, mandatory input policy, actual-token measurement |
| E05 | Nguồn ca/hệ thống, eligibility, duplicate group, holdout và annotation budget | Điều phối + Phát + giảng viên | Danh sách/selection log/universe/split để phê duyệt riêng; không tự tạo final test |
| E06 | Provider/model/revision, repetition, max calls/quota/money, retry và judge budget | Người có quyền duyệt chi phí + điều phối | Budget cho phạm vi cụ thể; chưa có thì không gọi API hoặc paid fallback |
| E07 | Output contract/scorer adapter/projection, invalid/OOS/unjudged/partial/failure denominator | Phát + Hiển + điều phối | Policy dùng chung và test trước score; không sửa nhãn/scorer theo kết quả |
| E08 | Cluster/paired analysis, repeats, CI/test/multiple comparisons và sample feasibility | Điều phối + giảng viên/người có chuyên môn thống kê phù hợp | Analysis plan trước test; không hứa power từ bốn pilot |
| E09 | Offline/online timing, cache, native usage, pricing provenance và failed attempts | Hiển + điều phối | Telemetry implementation/tests có source/version, không credential hoặc số đo giả |
| E10 | Trình tự T0–T3, readiness/stop gates, evidence/review/test/scoring authorizations | Điều phối và người được chỉ định đúng vai trò | Quyết định có scope/hash/người/thời điểm thật; mỗi gate độc lập |

Không cần xem output hệ thống/score hoặc nhãn để góp ý proposal. Phát giữ source-first và không dùng phương pháp đang được đánh giá làm oracle. Reviewer khác annotator; thiết kế này không tự chỉ định reviewer hoặc lịch review mới.

## Mẫu phản hồi

```text
Design ID / version / file hoặc SHA đã đọc:
Người góp ý / thời điểm thật / AI hỗ trợ:
Decision ID:
Đồng ý phương án nháp / cần sửa / chưa đủ thông tin:
Căn cứ từ đặc tả, code/protocol hoặc nguồn nghiên cứu:
Sửa gì, ảnh hưởng fairness/leakage/budget/metric nào:
Phần đã kiểm / chưa kiểm / test cần bổ sung:
Quyết định này không phê duyệt những gate nào:
```

Đợi phản hồi P02 hiện tại trước khi yêu cầu thêm việc không cần thiết. Bản nháp có thể được rà soát theo phần; im lặng, test pass hoặc nhận xét tổng quan không tự thành adopted design, accepted labels, khóa final test hoặc scoring approval.
