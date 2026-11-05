# Hai gói bàn giao P02 — 15/10/2026

Trạng thái: đã tạo và kiểm hai ZIP riêng để gửi thành viên. Chưa gửi thay người dùng, chưa nhận acknowledgement, chưa ghi nhận xác nhận universe hoặc nghiệm thu nhãn. Không commit/push/merge trong lượt đóng gói.

## Gói cuối cùng để gửi

Thư mục: `handoff-out/p02-team-handoff/20261015T111730650Z-5604cc22/`.

| Người nhận | ZIP | SHA-256 | File trong manifest |
|---|---|---|---:|
| Hiển | P02_HIEN_20261015T111730650Z-5604cc22.zip | f13b316163c2d199ea39fef23b863617dc67e9a0e75c0bfc0e6ff08c679483f2 | 424 |
| Phát | P02_PHAT_20261015T111730650Z-5604cc22.zip | 7eeafca9bea6d21828ba44c585aaf0d6191302d13787be1d6ae1a67695a0690f | 399 |

Mỗi ZIP khoảng 1,7 MB, có START_HERE.md, AI_PROMPT.txt, mẫu acknowledgement/bàn giao, context đầy đủ, source/config đúng pin, protocol, patch/fixture và evidence đúng vai trò. Tin nhắn gửi kèm có sẵn trong TIN_NHAN_HIEN.txt / TIN_NHAN_PHAT.txt, bao gồm đúng SHA ZIP tương ứng. Chỉ gửi đúng gói cho từng người; không gửi chéo gói Hiển làm nguồn nhãn cho Phát.

Hiển: kiểm công cụ/prerequisite, tái lập baseline GET nếu đủ dependency và audit tích hợp. Actual P02 extraction/graph/output sau gate đầu vào, không tự mở mutated/model/P03/P04. Phát: source-first kiểm scope/census/seed/alias/fixture, lưu notes rồi đối chiếu draft; chưa gán polarity hoặc ký accepted labels. DoD và chứng cứ cần trả nằm trong từng START_HERE và return template.

## Kiểm chứng đã làm

- Kiểm read-only preparation và baseline gốc; baseline checker đối chiếu 155 artifact, build 21 file và preparation 22 file. Không chạy lại Docker/application trong lượt này.
- Export lại source/config từ hai archive đã kiểm; đối chiếu **208 source files và 12 config files với từng Git blob**. Không dùng thư mục source/target đã build làm snapshot.
- Kiểm code runner/probe được ship đúng hash ghi trong inputs của baseline gốc.
- Kiểm SHA và danh sách file chính xác trước ZIP và sau giải nén; Node verifier, PowerShell 7 và Windows PowerShell 5 đều đạt cho hai gói. Bản QA Hiển sau chạy tests được kiểm manifest lại.
- 24/24 Node P02 tests pass, không skip, ngay trong gói Hiển đã giải nén. Log HIEN_PACKAGE_TESTS.log. Không phải 137 test toàn repo hoặc Java application tests.
- 9/9 test bàn giao pass: path traversal, duplicate/case collision, sửa byte, thêm file, tự nâng trạng thái và file ngoài allowlist Phát đều bị từ chối. Có kiểm synthetic secret/private-key/binary paths; không đọc credential thật.
- Gói Phát không có implementation parser/Neo4j/Chroma, graph/context/predictions/labels/scorer. Derived baseline result/probe summaries đã lọc; raw HTTP, mọi readiness attempt, logs/config/commands/exit giữ nguyên.
- Mọi bản copy giữ byte gốc; checksum gói khác các manifest gốc. Không rebase raw absolute paths để giả portability.

Bằng chứng máy đọc được: BUILD_VERIFICATION.json và ARCHIVES.sha256 cùng thư mục ZIP.

## Giới hạn

- Source snapshots không có .git. Hiển cần checkout Git riêng đúng pin để build; REPRODUCE.md hướng dẫn setup. Không fake checkout hoặc bỏ guard.
- Không kèm JAR ứng dụng, Maven distribution/cache, Docker images, model cache hoặc key. Không hứa runtime chạy zero-install; thiếu dependency phải báo blocker thật.
- Context có counts dự thảo/P01 history; không tuyên bố blinded. Phát phải khai báo exposure và tự kiểm bằng chứng.
- Không có baseline/mutated đầy đủ, POST hoặc 40 slot P02; không sinh nhãn hoặc nâng pending_review. Byte integrity không thay review ngữ nghĩa, xác nhận phạm vi hoặc test/scoring approval.
- ZIP là local working-tree snapshot có per-file SHA, không phải nội dung đã push lên GitHub hoặc một commit mới. Base HEAD không được coi là commit chứa toàn bộ các file mới.
- Các lượt đóng gói thử trước giữ nguyên. Một lượt kiểm Windows PowerShell lồng trong Node không tìm được Get-FileHash; verifier cuối dùng SHA256 qua .NET và đã kiểm lại cả PS5/PS7. Chỉ dùng ZIP thuộc run cuối ở trên.

## Tái tạo / kiểm công cụ đóng gói

```powershell
node --test tasks/p02-handoff/handoff.test.mjs
node scripts/package_p02_team_handoff.mjs --build-run handoff-out/p02-build/20261015T101851660Z-95cea45d --baseline-run handoff-out/p02-baseline/20261015T102355058Z-2e775d19 --preparation handoff-out/p02-preparation/20261015T095309937Z-d20ef94a --source-repo handoff-out/p01-step1-20261012-02747b5d/source --config-repo E:/NCKH/petclinic-pilot/spring-petclinic-microservices-config
```

Tái tạo sinh run/ZIP mới và SHA mới, không overwrite bản cũ. Không tự ghi đè tin nhắn đã gửi bằng hash của run khác. Builder chỉ đọc input/Git objects, tạo output cục bộ và chạy tool tests; không fetch/push/model/runtime app.
