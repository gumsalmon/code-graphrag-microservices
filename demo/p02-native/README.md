# P02 — xem bằng chứng kỹ thuật offline

Bản xem hiện hành: [P02 reviewed 02/11](REVIEWED_VIEW.md), [status](../../tasks/P02_REVIEWED_DERIVATIVES_STATUS_2026-11-02.json). Chín Method nodes/full parity và bố trí desktop/mobile đã kiểm. Artifact 01/11 dưới đây giữ lịch sử.

Cập nhật 02/11: [bản sửa P02 mới đã kiểm độc lập](../../tasks/P02_TECHNICAL_RETURN_STATUS_2026-11-02.json) đạt full-property parity và đủ 8/8 eligible Methods. Artifact/runner/inspector/context ngày 01/11 được mô tả bên dưới giữ snapshot cũ, chưa tự rebuild hoặc đổi pin; không đọc các giới hạn cũ như trạng thái code mới. Runner/checker reviewed 02/11 và candidate profile được dẫn trong status.

Bộ xem riêng cho output native đã được kiểm theo D20: source → parser → Neo4j → graph retrieval. Không thay viewer P01 hoặc output contract Method/API/Service; chưa phải prediction/E2E GraphRAG. Chỉ dùng cho Huy/Hiển ở luồng điều phối/kỹ thuật, không chuyển evaluated outputs cho người lập nhãn/reviewer source-first trước bước độc lập.

## Mở bản đã kiểm

Mở `handoff-out/p02-native-inspector/20261101T094931661Z-6028104b/index.html` bằng Chrome/Edge. Trang tự chứa dữ liệu và code, không cần server, Docker, Python, API key hoặc kết nối mạng. Giữ README/license đi kèm khi chuyển bộ xem.

1. Chọn baseline/mutated và 1/2/3 hop. Đây là kết quả truy vấn đã lưu, không truy vấn database mới.
2. Bấm Method hoặc dùng Tab/Enter: xem source đúng snapshot/dòng, phân biệt overload và seed. Trên màn hình nhỏ cuộn ngang trong graph/source/table.
3. Xem required/default của endpoint seed và Cypher/seed gốc. Không lấy metadata hoặc đường đi làm nhãn behavioral impact.
4. Đối chiếu import/parity và giới hạn: full Class.name parity chưa đạt, native inventory còn thiếu bốn Method eligible; unresolved được giữ nguyên. Không tự âm cho node thiếu hoặc ngoài tuyến.
5. Tải source/JSON/Cypher byte gốc với SHA. JSON bundle là dữ liệu trình bày dẫn xuất, không phải raw evidence mới.

P02 gốc được dùng có run `20261101t061314799z-a263deac`, manifest SHA `ad7fe3ac6536a54315219a44533f73a36a016a1c1f362e4c7026134971c126d4`. Bộ xem bind cố định run này; run code Hiển mới cần được review/audit riêng trước cập nhật pin, không tự dùng receipt/identity cũ.

## Build và kiểm

Từ gốc repository:

```powershell
node --test demo/p02-native/view-model.test.mjs
node scripts/build_p02_native_inspector.mjs --run handoff-out/p02-offline-method/20261101t061314799z-a263deac
node scripts/check_p02_native_inspector_browser.mjs --build NEW_BUILD_DIRECTORY
```

Builder chỉ đọc run đã seal và gọi checker kỹ thuật hiện hành, không chạy parser/Neo4j/model. Nó dùng raw source ba file mỗi snapshot, graph native, retrieval, parity, DB dumps, Cypher và structural inventory audit. Không đọc labels/notes/raw benchmark outcomes; receipt chỉ cung cấp identity/quyền. Schema `p02-native-evidence-view/1` chỉ là dữ liệu trình bày, không được import như contract dự đoán hoặc schema benchmark.

`index.html` có CSP khóa network, code/style được bind bằng hash; dữ liệu nhúng base64 và DOM dùng textContent. Không có form nhập key, remote asset hoặc API chạy code. Scanner mẫu và kiểm byte không chứng minh mọi dữ liệu riêng tư có thể có đều vắng mặt. Khi phân phối source cần giữ license PetClinic.

Unit kiểm source byte/span, snapshot/seed, witness/edge, từ chối model/scoring scope và dữ liệu nhúng. Browser QA dùng Playwright/Chrome cục bộ, offline=true; thiếu dependency thì báo, không tải ngầm. QA kiểm controls, keyboard, overload, unresolved, raw downloads, 390px và relocated HTML. Những kiểm này không xác nhận ngữ nghĩa graph, nhãn hoặc khả năng tổng quát hóa.

Không ghi task VIEWER-E2E đã hoàn tất bằng bộ xem này. [Status](../../tasks/P02_NATIVE_INSPECTOR_STATUS_2026-11-01.json) ghi bản hiện hành, giới hạn, các lượt QA lỗi và bằng chứng kiểm.
