# P01 — Rà soát độc lập từ source, patch và runtime

P01 là một tình huống pilot trên Spring PetClinic. Mục tiêu của lượt 1 là xác định những Method/API/Service có thay đổi hành vi sau patch, tuyến phụ thuộc hỗ trợ nhận định và các điểm còn thiếu bằng chứng. Phạm vi này không bao gồm nghiệm thu toàn hệ thống hoặc kết luận GraphRAG tốt hơn phương pháp khác.

Gói sử dụng bằng chứng benchmark tại commit `{{BENCHMARK_SHA}}`, source PetClinic `3858f9c630cf989bb6809a86edf47c2be78dc9f1` và config `323993ce2519c6d02df63e08bf4458d123d3b611`. Thời điểm đóng gói, danh sách bằng chứng và hash nằm trong `PACKAGE_METADATA.json`.

## Bắt đầu

1. Giải nén ZIP vào thư mục riêng có đường dẫn ngắn. Không cần Docker, Neo4j hay tài khoản GitHub để đọc tài liệu. File `.md` mở được bằng Notepad hoặc VS Code.
2. Tại thư mục chứa hướng dẫn này, mở PowerShell và kiểm tính toàn vẹn gói:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./VERIFY_PACKAGE.ps1
```

3. Sao chép `INDEPENDENT_NOTES_TEMPLATE.md` ra ngoài thư mục gói thành `P01-independent-notes.md`. Điền vào bản sao; giữ nguyên source, patch, log và các file trong gói lưu trữ.
4. Đọc source và patch trước, tự ghi nhận định rồi đối chiếu raw runtime. Chưa mở nhãn dự thảo, summary, báo cáo, PR, PROJECT_CONTEXT, benchmark score hoặc output parser/Neo4j/RAG trước khi hoàn thành và bàn giao phiếu lượt 1. Nếu đã xem, ghi rõ tài liệu và thời điểm tiếp xúc.

## Vị trí bằng chứng

- `petclinic-source/`: source upstream đầy đủ ở baseline, gồm test và cấu hình. Các test có trong source không đồng nghĩa đã được chạy trong quá trình chuẩn bị gói.
- `petclinic-config/`: config upstream đúng revision đã ghi.
- `evidence/benchmark/p01/raw/source_baseline/`: ba snapshot Java do người lập gói chọn. Có thể kiểm thêm trong source đầy đủ; không coi shortlist này là evaluation universe.
- `evidence/benchmark/p01/raw/historical/mutation.patch`: patch gốc, UTF-16LE có BOM. File `mutation-readable.utf8.patch` ở gốc gói chỉ đổi encoding, không đổi nội dung; hash của hai bản được ghi trong metadata.
- `evidence/benchmark/p01/raw/rerun-20260923-152742/`: bản runtime chính. Đọc `environment.json`, `commands.log`, `requests.jsonl`, service logs, discovery/preflight và image identities; đối chiếu timestamp, status và response body.
- `evidence/benchmark/p01/raw/rerun-20260923-214211/`: lần xác nhận sau. Những thư mục rerun khác là lần thử hoặc chẩn đoán, được giữ để kiểm tra lỗi và giới hạn, không thay thế bản chính.

Gói không chứa `summary.json`, nhãn hay kết luận dự thảo. Tuy nhiên, fixture, tên request (có cả chữ `negative`) và việc chọn ba snapshot là do người chạy chuẩn bị; đây không phải review blind hoàn toàn. Không suy ra nhãn từ tên request. Source đầy đủ cho phép mở rộng kiểm tra, nhưng log chỉ bao phủ những fixture đã chạy. Dữ liệu PetClinic là dữ liệu mẫu, không phải dữ liệu bệnh nhân thực.

## Định nghĩa dùng khi rà soát

- **Seed:** Method hoặc API contract trực tiếp bị thay đổi; lưu để truy vết và loại khỏi tập chấm impact.
- **Logical hop:** một lời gọi Method→Method hoặc consumer Method→provider API là một hop. Khi tìm bên sử dụng chịu ảnh hưởng, duyệt ngược callee→caller. Cạnh bao chứa không tăng hop; số lần qua ranh giới service được đếm riêng.
- **Behavioral impact:** khác biệt quan sát được giữa baseline và mutated dưới cùng fixture, như status, lỗi, nội dung hoặc dữ liệu thiếu/sai. Reachability trong graph chưa đủ để kết luận.
- **Requires code change:** nhu cầu sửa mã theo một repair strategy nêu rõ, được đánh giá riêng với thay đổi hành vi.
- **Positive / negative / unresolved:** positive cần source/contract cùng khác biệt runtime đủ tin cậy; negative cần đối chứng chọn độc lập với prediction và hành vi không đổi trong phạm vi đã kiểm; unresolved dùng khi chưa đủ bằng chứng.
- **Evaluation universe:** tập thực thể đủ điều kiện xem xét trong phạm vi đã định, không lấy từ output hệ thống. Ghi phạm vi và các thực thể đã tự xem xét trước khi đối chiếu hồ sơ lượt 2. Việc rà soát không thay đổi hồi tố cách chọn pilot; thiên lệch hoặc giới hạn được ghi riêng.

## Nội dung phiếu nhận định

Phiếu ghi người rà soát, quan hệ với dự án và việc có tham gia lập nhãn hoặc xây phần implementation đang đánh giá hay không; tài liệu đã tiếp xúc và công cụ/AI đã dùng; phạm vi đã kiểm; contract trước/sau; tuyến caller/callee, hop và service boundary; quan sát baseline/mutated/đối chứng; danh sách Method/API/Service cùng seed, impact, repair và bằng chứng; giới hạn và câu hỏi còn lại.

Mỗi nhận định dẫn file:dòng hoặc request/timestamp/log cụ thể. Phân biệt quan sát với suy luận. Với phần chưa đủ bằng chứng, ghi `unresolved` cùng lý do, không ép nhãn. Không đặt trước số lượng thực thể hoặc yêu cầu nhận định khớp với dự thảo. Người rà soát độc lập không đồng thời là annotator hoặc người xây phần implementation được đánh giá.

## Lưu và bàn giao phiếu lượt 1

Sau khi kiểm tra nội dung, ghi thời điểm hoàn thành theo ISO-8601 có múi giờ, ví dụ `2026-10-05T21:00:00+07:00`, rồi lưu file. Tính SHA-256 bằng lệnh sau; thay `DUONG_DAN` bằng thư mục chứa phiếu:

```powershell
Get-FileHash -LiteralPath 'DUONG_DAN/P01-independent-notes.md' -Algorithm SHA256
```

Bàn giao phiếu cùng hash và thời điểm hoàn thành trước khi nhận hoặc mở tài liệu lượt 2. Không điền hash vào chính file sau khi tính vì sẽ làm hash đổi. Giữ bản đã bàn giao; các bổ sung sau đó lưu riêng.

Hash xác nhận byte file không đổi, không tự chứng minh thời điểm hoặc tính độc lập. Việc bàn giao trước lượt 2 cần được ghi nhận để giữ dấu vết thời gian. Lượt 2 dùng phiếu này để đối chiếu nhãn dự thảo, nêu bất đồng và ghi quyết định review.

## Tái chạy và giới hạn kiểm chứng

Có thể bắt đầu bằng việc đối chiếu source và raw evidence. Nếu chưa chạy lại, ghi đúng là “đối chiếu log được cung cấp”, không gọi là “tái lập độc lập”. Khi bằng chứng chưa đủ, yêu cầu bổ sung hoặc ghi `unresolved`.

Nếu cần chạy lại trước lượt 2, yêu cầu hướng dẫn kỹ thuật không chứa nhãn/kết luận; chưa mở script benchmark hoặc report để lấy kết quả dự kiến. Không bắt buộc chạy Neo4j: đó là kiểm chứng implementation riêng, không phải nguồn tạo nhãn.

## Sử dụng AI hỗ trợ

Ở lượt 1, chỉ cung cấp gói này cho AI. AI có thể hỗ trợ tìm và trích bằng chứng; người rà soát kiểm tra nội dung và chịu trách nhiệm nhận định. Có thể dùng yêu cầu sau:

> Chỉ sử dụng file trong gói này và đọc ROUND1_READ_FIRST.md. Tìm source, patch và raw runtime, trích bằng chứng với file:dòng hoặc timestamp. Phân biệt quan sát với suy luận, impact với repair và seed với tập chấm. Không truy cập PR, GitHub của dự án, nhãn, summary, score hoặc output parser/Neo4j/RAG. Không suy ra nhãn từ tên request. Nêu rõ phần thiếu bằng chứng và câu hỏi cần kiểm tra. Không ký thay reviewer, không tự approve hoặc đánh dấu accepted; kết luận được người rà soát kiểm tra và xác nhận.
