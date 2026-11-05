# Phạm vi và an toàn của gói chuyển máy

## Gói này dành cho ai?

Gói dành cho người điều phối và AI hỗ trợ tiếp tục phát triển/nghiên cứu. Nó chứa mã hiện hành, lịch sử tổng hợp, nhãn nháp, bằng chứng runtime và một số output hệ thống. Không phải packet đã làm mù cho người lập nhãn/reviewer source-first; muốn review cần tạo bộ lọc riêng theo vai trò. Giữ nhãn và output dự đoán khỏi context của phương pháp đang được đánh giá.

Snapshot không tự cấp quyền truy cập GitHub, tài khoản API, máy cũ hoặc container. Quyền của công cụ AI trên máy đích do người dùng cấp. Chỉ nêu một đường dẫn ổ đĩa trong chat web không làm AI đọc được file trên máy.

## Được mang theo và không được suy rộng

Mã nguồn hiện hành bao gồm thay đổi chưa commit/untracked được chọn, giữ layout gốc và các đường dẫn `handoff-out` đã công khai trong metadata. Log, raw evidence và manifest cũ giữ nguyên byte; dữ liệu thử PetClinic là fixture của nghiên cứu, không phải hồ sơ bệnh nhân thú y thật.

`META/transfer.json`, ledger và kết quả kiểm liệt kê chính xác profile/file/phần loại. Chỉ xuất một ZIP profile `full`: đầy đủ code/context và bằng chứng được chọn an toàn, **không có nghĩa sao lưu toàn ổ đĩa hoặc môi trường thực thi zero-install**. Năm JAR P02 không được chuyển; giữ source/config tar và 16 artifact build còn lại cùng manifest gốc.

Những thứ không được chuyển:

- `.git` và Git internals ở mọi cấp, hooks, credential helpers hoặc lịch sử tài khoản.
- API key, `.env` riêng, DPAPI credential, file khóa/chứng chỉ riêng, cookie, token phiên và cấu hình cá nhân có secret.
- `handoff-out/credentials/`, đặc biệt `gemini-api-key.clixml`. Không cần đọc/giải mã file này để đóng gói; DPAPI còn gắn với user/máy cũ.
- Cache công khai ONNX, Maven cache/distribution, Docker images/volumes và DB đang dùng; gói không mang theo toàn bộ môi trường người dùng. File cache/runtime trùng lặp được loại theo chính sách đã ghi.
- `provider-response.json` chứa opaque/signature của provider. Không tạo bản “đã làm sạch” rồi giả như raw response gốc còn nguyên và được checksum lịch sử xác nhận.
- `implementation/docker-compose.yml` của snapshot P01 cũ có cấu hình xác thực viết trực tiếp; không cần cho pipeline hiện hành nên loại cả file và ghi hash, không chuyển giá trị đó hoặc sửa bản gốc.
- Năm `artifacts/*.jar` trong build P02: preflight đệ quy phát hiện key material/cấu hình và special member trong thư viện phụ thuộc. Đây có thể là fixture thư viện công khai, không phải kết luận lộ secret cá nhân. Áp dụng thận trọng: bỏ nguyên JAR, giữ hash/lý do, không sửa binary để giả như artifact build gốc.
- File cá nhân ngoài phạm vi, chẳng hạn toàn bộ thư mục tài liệu/ảnh/Zalo, credentials của hệ thống khác hoặc file đầu ra tạm chỉ vì nó nằm gần dự án.

Script cấu hình key và code xử lý credential có thể được bàn giao vì là mã nguồn; điều đó không đồng nghĩa có key thật trong gói. Các fixture test dùng giá trị giả hoặc cấu hình demo công khai phải được phân biệt với credential thật, không công bố giá trị nhạy cảm khi báo kết quả quét.

## Hai lớp toàn vẹn

1. **Manifest chuyển giao:** `SHA256SUMS.txt` khóa các file thực sự có trong ZIP sau lựa chọn an toàn. Trình `VERIFY_TRANSFER.mjs` kiểm chúng và metadata của gói.
2. **Manifest thí nghiệm cũ:** mô tả lần chạy/gói gốc. Nếu file đã bị loại vì an toàn hoặc profile, manifest cũ vẫn được giữ, và trình kiểm phải báo omission tương ứng. Không cập nhật manifest cũ để làm người nhận hiểu nhầm đã nhận đủ original envelope.

Manifest tính từ repository gốc hoặc bản sao `provenance` được khai ánh xạ `base_directory` đến snapshot tương ứng để kiểm đúng bytes. Không đổi raw path; các entry có thể cùng kiểm một file nhiều lần, nên tổng entry không phải số file duy nhất hoặc số quan sát nghiên cứu.

Vì vậy, “gói chuyển giao đạt checksum” không đồng nghĩa “mọi manifest cũ đầy đủ”, “đã chạy lại runtime”, “đã xác thực provider response” hoặc “nhãn đã được duyệt”. Không coi một report cũ là kết quả chạy trên máy mới. Đọc ledger, smoke report và giới hạn cùng kết quả pass/fail.

Nếu phát hiện file đáng ngờ hoặc secret sau giải nén: không in nội dung, không tải lên dịch vụ AI/GitHub, không tiếp tục đóng gói/phát tán file đó. Ghi tên file và loại nghi vấn, thông báo người dùng để xử lý. Nếu một secret thật đã bị lộ, người dùng cần thu hồi/thay key ở nhà cung cấp; xóa file khỏi bản mới không tự thu hồi key hoặc xóa bản đã gửi.

## Đường dẫn và khả năng tái lập

Log có thể chứa đường dẫn tuyệt đối, tên máy/user, thời điểm và tên người đóng góp để truy vết. Đây là ngữ cảnh provenance, không phải lệnh phải chạy hay đường dẫn bắt buộc tồn tại trên máy đích. Một số checker gốc phụ thuộc đường dẫn/Git nên cần kiểm portable riêng, không sửa raw evidence để “sửa đường dẫn”. Xem `RUN_ON_NEW_MACHINE.md`.

Không có full transitive lock, image export hoặc bảo đảm hermetic/cross-platform. Cache/model/image thiếu phải được chuẩn bị riêng sau khi người dùng thống nhất; không tự tải bù. Chưa chuyển được một artifact phải báo missing, không tạo dữ liệu tổng hợp thay bằng chứng thật.

Gói không thay những bản gốc còn trên máy nguồn. Nên giữ ZIP và checksum như checkpoint, làm tiếp trong thư mục mới, chỉ commit/push đúng phạm vi khi được yêu cầu. Không public nguyên gói điều phối: ngoài rủi ro quyền riêng tư còn có leakage nhãn/dự đoán và tài liệu chưa nghiệm thu.

## Gate nghiên cứu không thay đổi khi chuyển máy

Phát đang bận và chưa xác nhận candidate P02 mới. Người nhận có thể giúp kiểm file, audit cơ học, chuẩn bị tài liệu hoặc đề xuất phương án khi được giao; không tự ký thay người thật hoặc đổi phân công. Người xây hệ thống không tự tạo rồi tự duyệt ground truth của chính mình. P01 còn pending_review; P02 input chưa khóa và F03 chưa đủ; nhãn accepted, final test lock và official scoring đều cần quyết định riêng đúng protocol.
