# P01 visual evidence demo — 12/10/2026

## Kết quả

Bước 2 hoàn thành ở phạm vi **trình xem trực quan bằng chứng P01 đã lưu**. Có thể mở `demo/p01/index.html` trực tiếp bằng Chrome/Edge, không cần Docker hoặc API key. Server tùy chọn chạy bằng `node demo/p01/server.mjs`, chỉ lắng nghe `127.0.0.1:8787`.

Không gọi pipeline live, không chạy lại PetClinic runtime trong bước này, chưa tích hợp semantic retrieval/LLM. Không coi đây là bản GraphRAG E2E hoàn chỉnh hoặc nghiệm thu ground truth.

## Những phần đã triển khai

- Graph tương tác cho ba file Java: 5 Method, 2 cạnh CALLS/INVOKES_API; hai ứng viên query có 1/2 hop và cùng một service-boundary crossing. Seed bị loại khỏi tập. Các method ngoài query không được tự gán nhãn negative.
- Chuyển baseline/mutated; bấm node/cạnh hoặc dùng bàn phím để xem evidence span, mã nguồn, giả định và mục unresolved. Hoạt ảnh “Theo dấu” diễn lại đường query đã ghi nhận, không gửi query mới.
- So sánh contract và patch: provider thêm `includeDetails` bắt buộc; client chỉ gửi `petId`. Overload `read(int)` được phân biệt với handler `/pets/visits`.
- Bảy request/response lịch sử: gateway 200 ở cả hai snapshot, visits trong body 4 → 0; mutated provider thiếu tham số trả 400, có tham số hợp lệ trả 200 và 4 visits. Trường visits không tồn tại được hiển thị “—”, không quy thành 0. Có nút xem code fallback.
- Trang provenance và giới hạn, tải 27 artifact giữ nguyên byte/hash; không đưa `labels.v3.json`, F1 hoặc quyết định reviewer vào bundle.
- Viewer không có CDN, API key, external requests hay thao tác ghi lên hệ thống nghiên cứu. Server allowlist asset, chỉ GET/HEAD, không phục vụ file khác trong repository.

## Revision và nguồn bằng chứng

| Thành phần | Revision |
| --- | --- |
| Branch viewer cục bộ | `codex/p01-evidence-demo`, bắt đầu từ main `65e41a2b4fafa0d37fdd2779985d131a3c7dc116` |
| Implementation | `e95613795133088621117179c9fb9592dab62b16` |
| PetClinic baseline | `3858f9c630cf989bb6809a86edf47c2be78dc9f1` |
| Benchmark source | `5f9204d66253604edf9101c2f888fc7e75aa0be7` |
| Runtime config | `323993ce2519c6d02df63e08bf4458d123d3b611` |

Nguồn kỹ thuật: lượt kiểm chứng bước 1 trong `handoff-out/p01-step1-20261012-02747b5d/evidence-bridge/`. Builder xác minh checksum trước khi đọc các input dùng cho viewer, đồng thời đối chiếu JUnit với audit, source spans, query paths và Neo4j inventory. Suite 59/59 pass, không skip là kết quả bước 1 ngày 12/10; **không chạy lại 59 test trong bước 2**.

Nguồn runtime: Git blob tại revision benchmark đã pin, thuộc `benchmark/p01/raw/rerun-20260923-152742/`, patch lịch sử và ba file source baseline. Builder xác minh sáu artifact runtime dùng trong demo theo manifest của commit, không tuyên bố kiểm lại toàn bộ 117 artifact benchmark trong bước này. Log ứng dụng từ 23/09, được phân biệt với lượt Neo4j 12/10.

Ba file baseline runtime khớp baseline kỹ thuật sau chuẩn hóa CRLF → LF. Patch LF kỹ thuật và UTF-16LE runtime có byte/hash khác nhau; các dòng Java thêm/xóa tương đương sau chuẩn hóa khoảng trắng. Snapshot mutated là thay đổi cục bộ, không phải commit upstream. Header nguồn PetClinic được giữ và Apache License 2.0 đi kèm.

Bundle `demo/p01/data.js`: 272306 byte, SHA-256 `053fe6c2caa4c7b47c8fa40d413ebd3c00ea22828c52f56fb1c902081f041689`. Build lại từ cùng input tạo nội dung giống hệt, không thêm timestamp build ngẫu nhiên.

## Kiểm chứng viewer

1. `node --test demo/p01/demo.test.mjs`: **11/11 pass**, 0 fail/skip. Bao gồm hash/byte của toàn bộ 27 artifact, patch encoding/equivalence, số visits/unknown, chống path escape/checksum tamper, rebuild bundle, source/query consistency và server read-only.
2. `node scripts/check_p01_demo_browser.mjs`: **12 nhóm kiểm tra pass** trên Chrome `154.0.8037.99`. Kiểm thao tác node/cạnh bằng chuột/bàn phím, snapshots, overload, trace, patch/source/runtime, download checksum, provenance, file:// và lỗi rõ ràng khi thiếu bundle.
3. Desktop 1440×1000 và mobile 390×844: bốn trang không làm tràn ngang toàn trang; graph/source/table cho phép cuộn nội bộ. Screenshot được xem để kiểm layout; mobile có hướng dẫn cuộn graph.
4. Không browser error hoặc request ra ngoài ở các test thành công. Test cố ý thiếu bundle được kiểm riêng, không tính thông báo lỗi dự kiến thành lỗi của demo bình thường.

Report trình duyệt và tám screenshot lưu tại `handoff-out/p01-demo-qa-20261012/` (Git ignored). README có cách chạy offline, server, test và build lại.

## Giới hạn và gate nghiên cứu

- Python kiểm chứng chạy trong Linux container với TCP relay cho Docker Desktop bridge, không phải native Windows. Không sửa code verifier/Bolt payload để tạo kết quả pass.
- Đích HTTP dựa trên hostname mặc định; parser đã ghi nhận `setHostname` có thể đổi đích ở runtime. Không suy rộng khả năng hỗ trợ routing động, toàn bộ repo, gRPC hoặc đa ngôn ngữ.
- Dependency reachability ≠ behavioral impact ≠ repair need. HTTP 200 hoặc visits rỗng không chứng minh an toàn hoặc dữ liệu bị xóa ở storage.
- Nhãn P01 vẫn `pending_review`. Chưa mở P02–P04, chưa khóa split và chưa chấm chính thức.
- Demo tiết lộ system outputs, không được dùng thay gói source-first lượt 1 trước khi reviewer lưu nhận định độc lập. Không sửa các ZIP/hồ sơ review đã đóng băng.

## Phạm vi Git

Thêm thư mục `demo/p01/`, builder, script kiểm tra trình duyệt và báo cáo này. Không sửa tracked file hiện có, `PROJECT_CONTEXT.md`, parser/Neo4j, benchmark/raw evidence hoặc nhãn. Giữ các file untracked có sẵn của công việc trước. Không stage, commit, push hoặc merge.

Bước tiếp theo trước mắt: xem và thử demo để xác nhận cách trình bày dễ hiểu. Việc nối pipeline live/LLM là bước kỹ thuật khác; việc chấp nhận nhãn vẫn cần reviewer theo protocol hiện hành.
