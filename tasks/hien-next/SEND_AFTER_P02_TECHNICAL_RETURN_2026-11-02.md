Đã kiểm return P02 và tái chạy độc lập: 24/24 unit tests, baseline/mutated đều 9 Method nodes, đủ 8/8 eligible Methods; Neo4j thật 18 nodes/18 relationships, full-property parity/idempotence và retrieval 1/2/3 hop đạt. Hai vấn đề Class.name và inventory helpers đã được xác minh trong phạm vi này. Không cần chạy lại HTTP/POST hoặc làm lại cả gói.

Cần ghi rõ thêm provenance ở report bổ sung/version mới: cypher_sha256 hiện là hash chuỗi LF, trong khi graph.cypher lưu CRLF; manifest hash file thực vẫn đúng. Hãy tách hash byte file và hash LF/canonical, giữ raw/report cũ. Gói lần sau kèm sidecar ZIP SHA-256. RETURN cũng còn ghi chờ tự xem diff; chỉ xác nhận đúng phần bạn đã thực sự xem, nếu chưa thì giữ khai đó, không ký thay bằng AI.

Gói kỹ thuật P03 gửi tiếp là mốc C riêng, không thay receipt P02. implementation-reference trong đó là mốc cũ; giữ candidate P02 mới khi làm trên bản sao riêng, ghi code hashes/diff và dùng receipt/input P03. Không chép đè bằng reference cũ hoặc đổi receipt frozen để khớp code. Bản sửa P02 này chưa chứng minh hỗ trợ serialization/dataflow/record của P03; phần thiếu phải ghi unsupported/unresolved.

Có thể trả extraction/inventory trước rồi DB/parity/retrieval sau. Chưa model/embedding/scoring, duyệt nhãn, contract adoption hoặc commit/push/merge; không gửi output kỹ thuật sang annotator.
