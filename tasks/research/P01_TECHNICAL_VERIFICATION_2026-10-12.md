# P01 — kiểm chứng kỹ thuật độc lập, 12/10/2026

Trạng thái: **đạt trong môi trường ghi dưới đây**. Không phải quyết định duyệt nhãn P01, nghiệm thu toàn hệ thống GraphRAG + LLM hoặc kết quả bài báo.

## Phạm vi và phiên bản

- PR #1: `e95613795133088621117179c9fb9592dab62b16`; xác nhận head không đổi trước/sau kiểm chứng, PR vẫn open và chưa merge.
- PetClinic: `3858f9c630cf989bb6809a86edf47c2be78dc9f1`.
- Hai clone riêng dưới `handoff-out/p01-step1-20261012-02747b5d/`; không đổi checkout hoặc evidence cũ.
- Chạy từ khoảng 11:16–11:22 ngày 12/10/2026, UTC+07:00. Timestamp gốc có trong audit.
- Source -> parser -> JSON/Cypher mới sinh -> Neo4j thật -> truy vấn đường phụ thuộc, cho baseline và mutated.
- Tái chạy nguyên code của PR, không sửa parser, verifier, fixture hay các nhãn.

## Kết quả đã quan sát

| Kiểm tra | Kết quả |
|---|---|
| Dependency consistency | `pip check` exit 0 |
| Evidence cũ trong Git | 35 manifests, 620 entries, 0 failures |
| Evidence cũ trên checkout | 35 manifests, 620 entries, 0 failures |
| Baseline live preflight | exit 0 |
| Full suite | **59 passed, 0 failed, 0 errors, 0 skipped**; JUnit 214,121 giây |
| Probe bổ sung | **11 passed**, không skip; các test này có giao với full suite, không cộng thành 70 test độc lập |
| LF/CRLF | Canonical source/JSON/Cypher/patch tương đương ở baseline và mutated; source đổi nội dung bị từ chối |
| Chroma warm cache | Embedding 384 chiều, index/query thật trên database riêng; không tải model trong probe |
| Chroma cold cache | Thất bại đúng kỳ vọng khi chặn tải model |
| Evidence mới | **177 file khớp checksum**, kiểm lại bằng PowerShell trên host |
| Git provenance | Clone implementation và source đều sạch trước/sau, đúng SHA |

Hai truy vấn live baseline/mutated đều trả đúng hai method trong **technical acceptance fixture**: client ở hop 1, controller ở hop 2; seed được loại, mỗi tuyến vượt một ranh giới dịch vụ. Hai snapshot dùng container khác nhau, database trống trước import, import lặp không đổi inventory.

Các failure cases được suite kiểm tra: sai URI, sai mật khẩu, thiếu driver, malformed Cypher, lỗi thực thi Cypher, thiếu tham số CLI và trả thêm overload `VisitResource.read(int)`. Trả thêm overload ở cả baseline/mutated bị từ chối với exit 1. CLI thiếu input trả exit 2.

Chạy full suite bao gồm các fixture smoke lịch sử có tên P02–P04; đây không phải mở scenario mới, khóa split hoặc chấm benchmark chính thức.

## Môi trường và giới hạn tái lập

- Host Windows/Docker Desktop, Docker Engine 29.8.0.
- Python **3.11.16 trong container Linux**, khác Python 3.11.9 trong bàn giao của Hiển. Không tuyên bố đã chạy Python native Windows.
- Image Python đã có, pin bằng ID `sha256:63c6e72e510d658265cf956b0e589ec7b55c6049b766b6b68120253f7ee06281`.
- Sáu dependency chính khớp requirements: tree-sitter 0.25.2, tree-sitter-java 0.23.5, tree-sitter-go 0.25.0, chromadb 1.5.9, neo4j driver 5.28.1, pytest 9.1.1. Phiên bản transitive có trong process report; không coi requirements hiện tại là full lock.
- Neo4j server 5.26.0 trong container tạm, không volume và chỉ publish Bolt trên loopback host.
- Model Chroma được tải vào cache riêng trong lượt này, không dùng/xóa cache hoặc database của người dùng. Archive SHA-256 `913d7300ceae3b2dbc2c50d1de4baacab4be7b9380491c27fab7418616a16ec3` khớp cấu hình thư viện và kiểm lại trên host.
- Lượt đầu dùng host networking bị lỗi: localhost bên Python container không tới cổng Neo4j host. Log thất bại được giữ nguyên ở `evidence/`; chưa chạy full suite trong lượt đó.
- Lượt đạt dùng **TCP relay trong container Python**: localhost của verifier -> host.docker.internal -> cổng Neo4j có nhãn P01. Relay không đọc/sửa payload Bolt, không thay code của PR, không sinh node/edge hay kết quả truy vấn. Phải ghi giới hạn môi trường này khi tái hiện.
- Không đổi cấu hình Docker Desktop toàn máy; các container test đã dọn xong sau lượt chạy.
- Không tái chạy ứng dụng PetClinic HTTP/gateway ở bước này. Bằng chứng runtime ứng dụng và thẩm định behavioral impact là phạm vi khác.
- Bộ test và acceptance fixture giúp kiểm chứng kỹ thuật; không thay review ground truth hoặc chứng minh khả năng tổng quát hóa.

## Bằng chứng

- [Audit tổng hợp](E:/NCKH/code-graphrag-microservices/handoff-out/p01-step1-20261012-02747b5d/evidence-bridge/independent-audit.json).
- [Pytest log mới](E:/NCKH/code-graphrag-microservices/handoff-out/p01-step1-20261012-02747b5d/evidence-bridge/suite-20261012T041815Z-73cbc712/pytest.log).
- [JUnit 59 test](E:/NCKH/code-graphrag-microservices/handoff-out/p01-step1-20261012-02747b5d/evidence-bridge/suite-20261012T041815Z-73cbc712/pytest.xml).
- [Process/provenance/dependency versions](E:/NCKH/code-graphrag-microservices/handoff-out/p01-step1-20261012-02747b5d/evidence-bridge/suite-20261012T041815Z-73cbc712/process-result.json).
- [Report LF/CRLF và cache](E:/NCKH/code-graphrag-microservices/handoff-out/p01-step1-20261012-02747b5d/evidence-bridge/repro-20261012T042158Z-1f59c813/report.json).
- [Manifest 177 evidence files](E:/NCKH/code-graphrag-microservices/handoff-out/p01-step1-20261012-02747b5d/evidence-bridge/independent-checksums.sha256).
- [Lượt lỗi host networking, giữ nguyên](E:/NCKH/code-graphrag-microservices/handoff-out/p01-step1-20261012-02747b5d/evidence/independent-audit.json).
- [TCP relay và scope](E:/NCKH/code-graphrag-microservices/handoff-out/p01-step1-20261012-02747b5d/tcp_relay.py); [log các listener](E:/NCKH/code-graphrag-microservices/handoff-out/p01-step1-20261012-02747b5d/tcp-relay-events.json).
- [Kiểm lại evidence trên host](E:/NCKH/code-graphrag-microservices/handoff-out/p01-step1-20261012-02747b5d/VERIFY_EVIDENCE.ps1).
- [Lệnh chạy có guard chống ghi đè](E:/NCKH/code-graphrag-microservices/handoff-out/p01-step1-20261012-02747b5d/RUN_STEP1.ps1). Không chạy lại trong thư mục đã có evidence; mỗi lần tái hiện cần một run directory mới.
- [Hash các helper và manifest](E:/NCKH/code-graphrag-microservices/handoff-out/p01-step1-20261012-02747b5d/SUPPLEMENTAL_CHECKSUMS.sha256).

## Kết luận và bước tiếp theo

Bước 1 đủ để chuyển sang chuẩn bị **demo kỹ thuật P01** bằng artifact thật. Có căn cứ mới rằng bản bàn giao của Hiển chạy được trong môi trường đã mô tả; vẫn cần giữ phạm vi kỹ thuật, không gắn điểm F1 smoke thành kết quả bài báo.

Bước tiếp theo: màn hình thể hiện patch/seed/tuyến/bằng chứng nguồn và raw runtime đã có, tách rõ candidate dependency với behavioral impact. Chưa triển khai bước LLM trong lượt này.

`PROJECT_CONTEXT.md`, protocol, nhãn, raw evidence cũ và gói reviewer không thay đổi. Không stage, commit, push hay merge.
