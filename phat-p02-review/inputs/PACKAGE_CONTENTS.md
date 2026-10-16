# Nội dung và giới hạn

Gói riêng cho Phát: xác nhận phạm vi source-first trước nhãn. Mở START_HERE.md; AI_PROMPT.txt dùng khi nhờ AI hỗ trợ. Không gửi chéo gói kỹ thuật sang người kiểm phạm vi làm nguồn nhãn.

- Đầy đủ source/config tại pin, giữ LICENSE upstream; mọi file đã đối chiếu Git blob. Không có .git.
- Bốn spec và ba draft P02 giữ nguyên byte. Chưa khóa universe, chưa có polarity/labels.
- Baseline máy gửi: 147/156 file (tính cả manifest nếu có); chín GET fixture và bốn config/registry, không mutated/POST/full matrix.
- Đã lọc result.json, observations summary và probe stdout summaries. Raw HTTP, readiness attempts, logs/config và command/exit vẫn giữ. Danh sách omitted trong INPUT_PROVENANCE.json.
- Không kèm dependency runtime, build JARs, model output/cache hoặc credential. Chạy test công cụ không tương đương tái lập app.
- SHA256SUMS.txt là manifest của gói. provenance/*original-checksums.sha256 là hồ sơ gốc, có file không được ship, không dùng thay manifest gói.

Kiểm ZIP SHA bằng thông tin người gửi rồi dùng VERIFY_PACKAGE.ps1 hoặc node verify_package.mjs. Verifier không gọi mạng/Docker/LLM; byte integrity không phải label/reviewer approval.
