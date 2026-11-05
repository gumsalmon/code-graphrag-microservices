# Lượt 2 — đối chiếu nhãn nháp và ghi quyết định

**Mẫu hướng dẫn đang chuẩn bị, chưa có dataset hoặc quyết định review.** Chỉ sử dụng sau khi notes/exposure/checkpoint lượt 1 đã được lưu. Nếu đã mở nhãn sớm, khai exposure thật; không dựng lại bản notes như thể chưa từng tiếp xúc.

Gói R2 khi phát hành gồm đúng nhãn/version/hash, evidence manifest, annotator notes/exposure, changelog và các ngoại lệ provenance được chỉ rõ. Output parser/Neo4j/retrieval/LLM, score và bản thảo bài báo vẫn giữ riêng trong giai đoạn quyết định nhãn.

## Đối chiếu

1. Kiểm case/version/hash của gói và nhãn, cùng linkage tới notes lượt 1 đã nhận. Giữ input và notes gốc.
2. Đọc nhãn và notes của người lập nhãn, gồm AI assistance, phần trực tiếp tự kiểm và giới hạn thực tế. Không lấy checkbox/human self-report làm chứng minh vật lý đã đọc từng file.
3. Dùng [COMPARISON_TEMPLATE.md](COMPARISON_TEMPLATE.md) đối chiếu từng ID trong universe, cả phần seed/excluded/missing/alias. Ghi đồng ý, bất đồng hoặc chưa đủ evidence; behavior, repair và hop đánh giá riêng.
4. Nếu cần evidence mới, ghi câu hỏi/ID/phép đo cần bổ sung. Không sửa nhãn cho khớp notes hoặc output hệ thống, không thu hẹp universe để bỏ trường hợp khó.
5. Dùng [DECISION_TEMPLATE.md](DECISION_TEMPLATE.md) ghi quyết định thật theo từng ca và phiên bản nhãn. Trường chưa quyết định giữ trống/null.

Các kết luận về helper/direct subscription chỉ áp trong phép đo và điều kiện được chứng minh. HTTP body không đổi ở một đường gọi không tự chứng minh mọi helper hoặc toàn service đều không ảnh hưởng. Unknown/unresolved không được ép thành negative, repair chưa xác định không tự chuyển thành false.

## Hoàn tất

Hồ sơ trả gồm notes/checkpoint lượt 1 gốc, bảng đối chiếu, decision theo từng ca, source/raw refs, exposure và giới hạn, tên/xác nhận reviewer và các mốc thời gian thật. `approve` chỉ áp cho đúng version/hash và scope đủ căn cứ; `request_changes` hoặc `unable_to_review` là kết quả hợp lệ khi còn vấn đề.

Theo protocol, quyết định người thật được ghi vào review_decision/review_log và niêm phong checksum review riêng sau khi checksum artifact được kiểm. Nếu người khác chép quyết định vào JSON, reviewer kiểm và xác nhận bản chép. Không sửa labels/raw đã khóa hoặc dùng chữ ký cũ cho hash mới. Bản sửa có version riêng và phần review tương ứng.

AI có thể tổ chức bảng khác biệt và tìm references từ gói; reviewer kiểm evidence và quyết định. Không dùng AI để điền chữ ký, giả giờ đọc hoặc tự chọn approve. Chấp thuận một ca không tự duyệt cả batch, protocol, split/test, scoring, model/budget hoặc hiệu quả GraphRAG.
