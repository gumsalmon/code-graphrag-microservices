# Tiếp nhận checkpoint từng ca theo D20

Đây là checklist điều phối, không thay schema nhãn/protocol hoặc người lập nhãn. D20 đã cho quyền kỹ thuật có điều kiện; sau khi đủ checkpoint của một ca thì tiếp tục ca đó, không hỏi lại quyền đã được cho hoặc đợi ca còn lại. Chưa có checkpoint mới P02/P03 được xác nhận tại lúc tạo checklist này.

## Kiểm khi nhận return

1. Lưu bản nhận nguyên byte vào thư mục mới; xác minh archive/file/manifest hashes. Không chạy script lạ trong return để duyệt chính return đó.
2. Đối chiếu source/config/scenario/patch/universe/fixture đúng input đã khóa của ca; không tự thêm/bớt ID. Đủ ID, không trùng, seed riêng; unresolved có căn cứ là hợp lệ, không ép polarity/confidence/hop hoặc repair thành giá trị chắc chắn.
3. Lưu label version/hash cùng evidence manifest, notes trước annotation và exposure thực tế. Kiểm reference file/dòng/request và nội dung căn cứ trong phạm vi được khai. Không xem metadata `annotation_complete=true` hoặc checksum pass là bằng chứng người thật đã đọc.
4. P02 cần bổ sung scope tự xem/kế thừa/chưa xem của tám ID cũ; bốn helper giữ phạm vi direct measurement/callback limits. Có thể trỏ v3 nguyên hash nếu Phát quyết định giữ unresolved; không bắt buộc đổi nhãn để mở kỹ thuật.
5. P03 cần nhận định người thật cho 31 ID, ba seed riêng; notes/exposure khai AI/gợi ý đã biết, không giả blinded. AI chỉ tổ chức/kiểm file, không ký thay. Nếu schema cần mở rộng, xử lý như proposal riêng trước áp, không tự dùng shared output contract draft.
6. Tất cả nhãn pending_review, accepted/test/scoring false, reviewer/decision chưa có null. Không yêu cầu reviewer ký hoặc uncertainty hết mới chấp nhận checkpoint cho phát triển kỹ thuật.

Nếu còn thiếu: ghi đúng file/ID/nhận định/bằng chứng cần bổ sung; không chặn ca khác đã đủ. Thiếu thông tin người thật không được giải bằng AI tự điền hoặc tăng số lượng tests máy.

## Receipt kỹ thuật sau kiểm

Tạo receipt mới theo ca ghi: case/input versions/hashes, label version/hash, notes/exposure/evidence manifest hashes (giữ ở coordinator), phạm vi kiểm thực tế và limitations, ngày kiểm thật, D20 và kết luận đủ/chưa đủ checkpoint. Không tạo receipt `ready` trước khi return được kiểm.

Bản chuyển Hiển chỉ chứa case/input/implementation phù hợp, hash/version checkpoint và kết luận phạm vi kỹ thuật được phép; không chứa polarity, label rows, gold path/hop, notes/conclusion hoặc prediction/score. Lưu human checkpoint riêng, không mount vào parser/Neo4j/retrieval sandbox hoặc context model. Receipt không chứng nhận ground truth đúng hoặc accepted.

Khi receipt đủ, cập nhật bảng việc và giao actual integration. Ghi input/code/receipt hash ở output mới, bảo toàn source/raw/labels cũ, chỉ cache/image sẵn có; chưa inference model, scoring, contract adoption hoặc push. Khi Hiển bàn giao, kiểm native output/metadata, DB thật/parity/idempotence, retrieval và cleanup đúng mức; không biến compiler/mock pass thành E2E.
