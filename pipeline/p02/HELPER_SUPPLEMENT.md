# Bổ sung phép đo bốn helper P02

Theo RQ-H01–H04 trong return của Phát và yêu cầu tiếp tục sau audit ngày 25/10. Luồng này chỉ bổ sung dataset source/contract/runtime evidence. Không chạy parser/Neo4j/retrieval/model hoặc tự thay polarity. Input P02 scenario 0.1.1/universe draft.v2/fixture v1 giữ nguyên; không mở P03/P04.

Runner tái dùng binary baseline đã kiểm và Visits mutated đã khóa ở F03. Không Maven rebuild, không tải dependency/image, không thay byte consumer/source/config. Bốn group baseline/mutated × hai repetition dùng stack năm service/DB/network nội bộ mới, không publish port hoặc dùng DB người dùng. Chỉ GET: ba HTTP input/consumer records và một WebClient GET targeted mỗi group; không chạy lại 40 slots/POST.

- `joinIds`: ghi input `[7,8]`, kiểu và return trực tiếp theo từng group.
- `setHostname`: ghi field trước/sau, URI request thực và response thực từ Visits của group. Setter được gọi bởi harness, không claim production đã gọi setter.
- `addVisitsToOwner`: đọc raw Customers/Visits của group, lưu owner/Visits đầy đủ trước, thực sự apply Function và lưu output.
- `emptyVisitsForPets`: subscribe trực tiếp ở từng group và giữ toàn return. **Không production callback tracing**; fault cũ là bằng chứng riêng. Người lập nhãn/reviewer quyết định mức đủ bằng chứng.

Code helper Java chạy trên compiled application classes/JAR thật, nhưng ObjectMapper và client filter phục vụ đo là cấu hình harness được khai rõ; không giả là Spring app context hoặc toàn bộ production execution. Không tạo mocked circuit breaker.

Measurement v2 ghi rõ phép chiếu DTO `pets[].type.id`: provider PetType có id/name, consumer record chỉ có name. Chỉ bỏ id trong input cho DTO, lưu cả raw/projected tree/pointers, không sửa raw và vẫn từ chối unknown field khác. Lượt decoder lỗi v1 được giữ. Kết quả runtime mới nhất và packet tại [báo cáo 25/10](../../tasks/research/P02_HELPER_RUNTIME_2026-10-25.md); trạng thái chờ Docker trong hồ sơ chuẩn bị là lịch sử.

## Kiểm offline

```powershell
node --test pipeline/p02/helper-supplement.test.mjs
python -B -m unittest discover -s pipeline/p02 -p helper_http_probe_test.py -v
python -B scripts/check_p02_helper_java_offline.py --gateway PINNED_BASELINE_GATEWAY_JAR
```

Lệnh javac chỉ compile against dependency trong JAR đã khóa, dùng `-proc:none --release 17`, không chạy ứng dụng Java. Javac pass không phải runtime evidence.

Tạo và kiểm plan (không cần Docker):

```powershell
node scripts/run_p02_helper_supplement.mjs plan --candidate FROZEN_P02_CANDIDATE --baseline-build PINNED_BASELINE_BUILD --prior-f03 ORIGINAL_F03_RUN
node scripts/check_p02_helper_supplement.mjs --run NEW_PLAN_DIRECTORY
```

Khi Linux Docker engine sẵn sàng, chạy đúng inputs bằng action `run`, tạo folder mới:

```powershell
node scripts/run_p02_helper_supplement.mjs run --candidate FROZEN_P02_CANDIDATE --baseline-build PINNED_BASELINE_BUILD --prior-f03 ORIGINAL_F03_RUN
node scripts/check_p02_helper_supplement.mjs --run NEW_RUNTIME_DIRECTORY
```

Lệnh giữ command/stdout/stderr/exit, readiness mọi attempt, raw body/hash, setup/config/registry, class identity, helper events, source công cụ và ownership/cleanup. Chỉ dọn resource do run tạo có prefix/label đúng; cleanup lỗi thì dừng group kế. Giữ mọi run lỗi và bằng chứng cũ, không retry để chọn kết quả đẹp.

Plan/runtime tạo riêng dưới `handoff-out/p02-helper-supplement/`. Build thư mục `compile/extracted/` chỉ là classpath/cache sandbox, không được claim là raw đã manifest; JAR gốc được hash và mount read-only. Khi đóng packet annotation cần allowlist rõ và ghi binary/cache omissions.

Phần con người còn cần Phát ghi riêng theo `tasks/p02-handoff/HUMAN_CHECK_SUPPLEMENT_TEMPLATE.md`. Script/checksum không xác nhận thay phần đã đọc/quyết định của người thật, không khôi phục source-first/blinding hồi tố và không tự chuyển pending_review thành accepted.
