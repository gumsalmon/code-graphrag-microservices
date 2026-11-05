# Tin nhắn gửi Phát — kiểm lại P02

Gửi kèm đúng ZIP `P02_PHAT_RECHECK_0.1.1_20261018_719da955.zip` trong `handoff-out/p02-input-revision/`. Gói đang ở local, chưa được push lên GitHub. Nội dung dưới đây có thể gửi nguyên văn:

---

Mình gửi lại bộ P02 sau khi sửa kỹ thuật F01/F02, có AI hỗ trợ. Nhờ bạn kiểm lại trước khi đề nghị chốt đầu vào.

F01: đúng fixture dự định là file đang ship, SHA-256 `2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191`. Hash `2a837540…` trong universe cũ do script băm JSON sau khi định dạng lại, không phải byte gốc. Đã sửa builder và thêm test; fixture/source/patch/scope không đổi.

F02: đã tiếp nhận đủ 29 evidence_refs từ proposal của bạn. Các đường dẫn được tính từ gốc ZIP sau giải nén, không từ thư mục draft.

Bộ đề nghị dùng cho vòng kiểm lại:

- Scenario: `benchmark/p02/preparation.v2/scenario.json`, version `0.1.1`; SHA-256 `762d993901f1388584adf066f396acd2ad46a7550f1f6b0b12dd6a8c61663ce9`.
- Universe: `draft/evaluation_universe.draft.v2.json`, scenario_version `0.1.1`; SHA-256 `d79c07727d6fb5348503f0e4079a0d18c63e26e6d34a1e332825f1cc7680aeb5`.
- Fixture giữ tại `benchmark/p02/preparation.v1/fixture.json`, SHA-256 như trên.
- ZIP: `P02_PHAT_RECHECK_0.1.1_20261018_719da955.zip`; SHA-256 `4e52aa2918d4e907af93296e40cbbdca8928978d9788c365d2dff76dc7e656d2`.

Giải nén vào folder mới, bắt đầu từ `START_HERE.md`. Chạy `node verify_p02_revision.mjs` tại gốc gói để kiểm tra offline; không cần Docker, key hoặc cài thêm dependency. Bản đóng gói và bản giải nén đã kiểm đạt 31/31 file; hồi quy 75/75 test pass, không skip. Checksum/test không thay kết luận của bạn.

Kết quả cần gửi lại là phiếu kiểm riêng theo `RECHECK_TEMPLATE.md`: bộ file/version/hash đã kiểm, nhận định F01/F02, phần chưa kiểm hoặc bất đồng, và kết luận đủ điều kiện đề nghị chốt đầu vào/cần sửa/chưa đủ. Ghi đúng phần kiểm trực tiếp, AI hỗ trợ và các draft thực tế đã xem; không tạo checkpoint trước exposure hồi tố. Không sửa gói frozen để ghi quyết định.

V1 và raw cũ giữ nguyên. Inventory/request-plan, 15 alias ID, seeds và snapshot mã nguồn không đổi. F03 vẫn missing/unresolved, xử lý ở giai đoạn runtime sau thống nhất đầu vào. Bộ này chưa khóa input, chưa gán polarity, chưa duyệt nhãn hoặc cho phép test/scoring; hiện chưa coi bạn đã xác nhận bản sửa.
