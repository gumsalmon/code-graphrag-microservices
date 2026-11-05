# Kết quả cần bàn giao

## Ưu tiên 1 — tái hiện và sửa regression tổng hợp

Chạy 10 fixture trên code tham chiếu hoặc bản đang làm có diff rõ. Giữ kết quả trước sửa rồi sửa trong working copy riêng:

- S05: đúng path nhưng sai service — tiếp tục không nối cạnh; ghi unresolved/unmatched với expression/file/dòng và lý do đúng phạm vi đầu vào, không im lặng bỏ invocation.
- S06: cùng path nhưng khác HTTP method — tương tự, không nối cạnh sai và không mất diagnostic.
- S08: nhiều overload đạt cùng mức tương thích — không phát hai cạnh `RESOLVED` như thể đã biết đích. Giữ invocation/ứng viên/lý do chưa phân giải trong cơ chế hiện hành. Không tự chọn overload đầu tiên hoặc đổi luật hop.
- Giữ các ca đúng: prefix cấp lớp + method, URL literal, query tùy chọn/default và bắt buộc, dynamic hostname unresolved, LF/CRLF, overload String đã biết.

DoD: các kỳ vọng đã thống nhất đạt 10/10 trên working copy mới; không skip hoặc dùng tên/ID fixture để viết cố định kết quả. Kèm source/native output và log cho bản trước/sau, file/dòng sửa và giới hạn. Không gọi số case này là cỡ benchmark CIA hoặc điểm nghiên cứu.

## Ưu tiên 2 — metadata parity của importer, kiểm offline

Rà `src/neo4j_importer.py` ở pin và code đang làm: JSON endpoint/edge có declared/effective required, default và sent query, nhưng direct import/Cypher cần giữ metadata tương ứng. Viết kiểm tổng hợp với mock driver/capture parameters và Cypher export để chỉ rõ dữ kiện bị rơi và đề nghị/sửa trong contract hiện hành.

Không cần chạy Neo4j thật trong lượt này. Ghi đúng unit/mock, không gọi là E2E. Không thay ID/snapshot isolation/schema dùng chung ngầm. Nếu một sửa đổi cần schema mới hoặc thay compatibility thì gửi đề nghị riêng, chưa áp vào pipeline thật.

## Chuẩn bị tiếp, không phải điều kiện kéo dài lượt sửa

Sau hai ưu tiên trên, nếu còn thời gian thì ghi thiết kế/nguyên mẫu riêng cho record/DTO response fields và consumer field access trên source tổng hợp, kèm spans và trường hợp unsupported. Chưa nối vào hợp đồng đầu ra chung hoặc chạy P03 thật. Không phải làm thêm gRPC/Online Boutique.

## Phạm vi không được tự mở

Không chạy actual P02/P03 extraction/JSON/Cypher/Neo4j/retrieval/prediction trước checkpoint/gate riêng; không lập hoặc xem nhãn làm oracle; không build/chạy mutation P03; không gọi model/scoring/push/merge. P01/Hiển baseline P02 đã bàn giao không cần làm lại trong task này.

Đầu ra tối thiểu: phản hồi nhận việc/phạm vi, bản tái hiện trước sửa, diff hoặc commit cục bộ + hashes, kết quả sau sửa, unit/mock parity report hoặc blocker, raw logs/commands/exit và limitations. Task được xem là đã nhận chỉ sau phản hồi thật; tài liệu này là gói đề nghị chuyển thủ công.
