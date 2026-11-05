# Bằng chứng kỹ thuật đã công bố — 05/11/2026

**Dành cho review kỹ thuật sau lượt source-first.** Các bản dưới đây là bản sao nguyên byte của những run đã kiểm, có output phương pháp; không dùng làm đầu vào tạo nhãn hoặc đọc trước nhận định lượt 1.

| Bản lưu | Phạm vi kiểm |
|---|---|
| [P02 native](p02-native/) | Parser/importer, inventory, hai Neo4j DB, parity, idempotence và retrieval |
| [P03 native sau sửa breaker](p03-native/) | Regression và 39 unittest, hai DB, metadata theo call và retrieval; record/dataflow vẫn giới hạn |
| [Context P02](p02-context/) | Bảy preview lexical/graph/kết hợp từ baseline source/patch |
| [Context P03](p03-context/) | Bảy preview, source-map alias tường minh và byte cap |

[PUBLICATION_BINDINGS.json](PUBLICATION_BINDINGS.json) ánh xạ đường dẫn local gốc → đường dẫn công bố cùng SHA-256. Mỗi thư mục giữ manifest gốc. Logs, lỗi và môi trường là hồ sơ của lần chạy tại thời điểm đó; không phải lần chạy mới trên GitHub hoặc chứng nhận nhãn.

Từ clone mới, chạy Python 3.10+:

```powershell
python -B scripts/verify_github_petclinic_20261105.py
```

Lệnh chỉ đọc và kiểm hashes/ZIP/mapping, không gọi Docker/model, không dùng API key, không chấm điểm. [Mã parser/importer đã kiểm](../../implementation/petclinic-reviewed-20261105/README.md) được lưu riêng thay vì ghi đè code lịch sử.

Để chạy thêm các unit/guard tests context trên clone mới, có thể khôi phục **bản lưu** bốn run vào đường dẫn ignored gốc:

```powershell
python -B scripts/verify_github_petclinic_20261105.py --restore-saved-runs
node --test pipeline/p02/static-context.test.mjs pipeline/p03/static-context.test.mjs pipeline/p02/reviewed-native.test.mjs
```

Tùy chọn restore chỉ sao chép evidence đã kiểm hash, từ chối file hiện có khác byte, không chạy lại parser/Docker hoặc sinh kết quả mới. Đây là 30 tests context/guard; bộ tests local rộng hơn còn dùng những intake/run lịch sử không được công bố toàn bộ.

Các runner cũ trỏ tới `handoff-out/...` trên máy gốc. Chỉ clone repo chưa tạo lại cache, JAR, image, các intake hoặc tất cả run cũ; không chạy các runner đó và coi thiếu dữ liệu là lỗi kết quả nghiên cứu. Có thể kiểm bộ bằng chứng được công bố ngay; tái chạy runtime cần chuẩn bị sandbox/dependency đúng pin theo hướng dẫn từng runner. Chưa công bố R2 hoặc toàn bộ local handoff, cache và credential.
