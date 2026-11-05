# Gói kiểm phạm vi P03 — 28/10/2026

Đã chuẩn bị gói có thể gửi cho Phát kiểm độc lập bộ đầu vào trước input lock/mutated. Đây là bước kế tiếp sau baseline D18, theo yêu cầu tiếp tục của Huy. Chưa gửi thay người dùng, chưa có Phát xác nhận nhận việc hoặc kết luận kiểm; không tạo quyền nghiên cứu mới.

## File bàn giao

Thư mục: `handoff-out/p03-scope-packet/20261028T100341Z-65ce05cd/`

- ZIP: `P03_INPUT_SCOPE_CHECK_2026-10-28.zip`, 809.285 byte, SHA-256 `24bacf8e0313d05a02186f66c150cd7ccc0d4470c6f5017e8e0af4cbabb2987d`.
- Sidecar: `P03_INPUT_SCOPE_CHECK_2026-10-28.zip.sha256`.
- Root manifest SHA-256: `2b8f3103ee5b3f993284f880491786e96c4ba818a6b8192de4e2661341bec742`.
- 1.037 regular files: 1.036 file có hash root và chính manifest. Sáu manifest lịch sử kiểm 1.016 entries hiện diện và bảy omission khai rõ.

`P03_INPUT_SCOPE_CHECK/` là bản gói tại máy nguồn; `ZIP_VERIFIED/` là bản thực sự giải nén từ ZIP sang thư mục khác để kiểm portability. `DELIVERY_REPORT.json` cùng command/stdout/stderr nằm ngoài ZIP. [Tin gửi thủ công](../p03-handoff/SEND_PHAT_SCOPE_2026-10-28.md) nêu đúng mục tiêu/đầu ra.

## Nội dung và ranh giới

`START_HERE.md`, bối cảnh được lọc cho vai trò và task nêu trình tự đọc source/patch/SQL, ghi notes/exposure thực tế rồi đối chiếu proposal. Không gửi PROJECT_CONTEXT hoặc full history vì có kết quả/nhãn các ca khác. Phiếu trống, bảng đủ 31 eligible IDs, ba seed và 34 alias có trường human check để null; không điền thay tên/ngày/quyết định hoặc polarity.

`candidate/` giữ đủ 52 file và manifest của proposal C03-A hiện hành, gồm 27 source/support files, sáu config files, source sau áp patch đề nghị và protocol v0.2. Source đề nghị sau patch chưa là mutated runtime. Gói giữ tất cả frozen flags ban đầu; D18 và `CURRENT_STATE.json` riêng ghi Huy đã chọn/baseline, scope/universe vẫn chưa độc lập xác nhận hoặc khóa.

`baseline/` giữ root và hai group manifests, raw request/response, mọi readiness attempt, service logs, config/registry, identity, request order, cleanup và code snapshots gốc. `provenance/BASELINE_INDEX.json` dẫn 46 record/body primary+setup/support, chưa tính readiness; đây là chỉ dẫn điều hướng, không phải 46 scenario/mẫu độc lập.

`baseline-build/` có log/provenance/source hashes/build metadata và manifest gốc. Năm JAR và hai TAR không đóng lại: omission giữ path/hash/size/lý do, đúng bảy file; không mất raw hoặc source candidate. `baseline-audit/` giữ kiểm kỹ thuật phía chuẩn bị. Trên máy người nhận có thể xem source/raw và kiểm nhất quán, **không thể claim replay đầy đủ build/runtime hoặc tái hash binary bị loại** chỉ từ ZIP này.

Không có labels P01/P02/P03, output CIA parser/Neo4j/retrieval/prediction/score, model cache hoặc credentials trong danh sách chuyển. Không chạy model, Docker, Java, HTTP/POST/PUT mới hoặc chấm điểm trong lượt đóng gói. Các path tuyệt đối lịch sử được giữ nguyên, verifier không mở chúng.

## Kiểm đã thực hiện

- Checker baseline gốc đạt trước đóng gói; toàn bộ source files được copy/omitted có checksum được kiểm lại sau đóng để chứng minh không sửa input.
- Bốn Node unit tests cho verifier pass, không skip: trạng thái đúng, từ chối giả independent/accepted/mutated/scoring, candidate/quyết định khác hoặc baseline thiếu, và omission ngoài danh sách cho phép.
- Bốn Python tests cho ngoại lệ scanner pass: chỉ đúng path/byte hash được chấp nhận, giá trị authorization bị đổi/path khác/field thêm đều quay về scanner fail-closed.
- ZIP CRC, tên/path/case collision/file type, recursive archive/content scan đạt. Scanner phát hiện false positive ở `baseline-build/inputs.json`: key `authorization` có giá trị đường dẫn D18, không phải HTTP credential. Packager có ngoại lệ **đúng path + SHA-256 byte `d56cbfe0f4473195a9880600c0760e79b413a9a81c7cc0ee67b5f6afbb4d994b`**; chỉ đổi tên key trong view để scan, giữ mọi value và mọi kiểm khác. Byte file trong ZIP không sửa, shared scanner không nới. Ngoại lệ và số lần dùng được khai trong security scan. Không coi quét theo mẫu là bảo đảm tuyệt đối không có dữ liệu riêng tư.
- Thực sự giải nén ZIP rồi chạy portable verifier bằng tooling ngay trong bản đã chuyển: default và `--records` cùng exit 0. Default chỉ integrity/gate bindings; optional mode kiểm lại frozen candidate, raw HTTP/hash/order/reset/identity của hai group. Không chứng nhận human source-first, census độc lập hoặc quyết định nhãn.
- Quá trình đầu tiên dừng ở scanner false positive trước tạo ZIP; thư mục `20261028T100214Z-3b939372` giữ log checker preflight. Gói thành công hiện hành là `20261028T100341Z-65ce05cd`, không sửa raw để bypass quét.

Lệnh portable từ root giải nén:

```powershell
node tooling/scripts/verify_p03_scope_packet.mjs --root .
# Sau khi người kiểm đã ghi nhận định source/raw và exposure thực tế:
node tooling/scripts/verify_p03_scope_packet.mjs --root . --records
```

Không yêu cầu Docker/Java/API key để làm input precheck. Không nên bắt người kiểm setup lại toàn ứng dụng chỉ để đối chiếu ID hoặc hash. Nếu cần đo thêm để chốt phạm vi, phải ghi câu hỏi và bằng chứng cụ thể; không tự chạy mutated.

## Kết quả cần nhận

Một phiếu kiểm của người thật, notes/source refs/exposure và bảng đối chiếu eligible IDs, seeds, aliases, exclusions, fixture/control. Kết luận là đủ điều kiện **đề nghị** chốt / cần sửa / chưa đủ căn cứ, nêu đúng file/version/hash và giới hạn. Tài liệu/AI kiểm xong không thay phần người thật trực tiếp đọc/quyết định.

Sau phiếu kiểm, phía điều phối đối chiếu và Huy ghi quyết định input lock/quyền mutated phù hợp trên đúng hash. Chưa có phiếu nên giữ độc lập xác nhận/input lock/mutated/annotation/accepted/test/scoring/model/push false. P02 vẫn cần phụ lục con người riêng; gói này không hoàn tất thay task P02.
