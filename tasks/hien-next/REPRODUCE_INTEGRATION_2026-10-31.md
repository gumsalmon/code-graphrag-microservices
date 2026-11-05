# Môi trường và lệnh chuẩn bị

Gói không kèm Docker images, dependency/model cache hoặc application JAR. Node.js dùng kiểm gói; Python cần cho runner tổng hợp. Không tự tải package/image/model. Chọn đường dẫn cache đã có trên máy nhận; đường dẫn ghi trong raw là provenance máy nguồn, không phải yêu cầu phải có cùng ổ đĩa.

```powershell
node tooling/scripts/verify_petclinic_role_packet.mjs --root .
python -B tooling/scripts/run_java_synthetic_regression.py --help
python -B tooling/scripts/run_java_synthetic_regression.py --implementation implementation --output work/synthetic-new-run
python -B -m unittest discover -s implementation/tests -p 'test_*.py' -v
```

Đọc `tooling/scripts/run_java_synthetic_regression.py` trước chạy; `--help` chỉ hiển thị options, không phải kết quả regression. Hai lệnh test tiếp theo chỉ dùng sau khi dependencies đã có, output cần là thư mục mới. Code candidate để riêng trong `implementation/`, không tự nhập đè source dự án. Tests metadata/resolution ở `implementation/tests/`; các dependencies cần được cài sẵn đúng pin trước khi chạy test. Runner gốc được giữ nguyên, khi chạy container phải map đường dẫn input/output đúng mount và dùng cache/image cục bộ, không copy nguyên đường dẫn máy nguồn.

Image Python dùng trong kiểm độc lập trước là `sha256:63c6e72e510d658265cf956b0e589ec7b55c6049b766b6b68120253f7ee06281`; Java app runtime trước dùng `sha256:afed130922b1df5f31b8711f47caa7fa853273f40bc8ba03e72c12f82ede7779`. Không suy máy nhận đã có các image này. Đọc `implementation/requirements.txt` để biết dependencies của code nền; không gọi Python stdlib-only check là đã kiểm parser deps.

Neo4j thật chỉ chạy cho ca có receipt: container/DB/network sandbox thuộc run mới, không dùng DB cá nhân hoặc project volume cũ; không publish rộng ra mạng; secrets nếu cần đặt cục bộ, không ghi vào command/log bàn giao. Ghi version/image thực, lệnh đã chạy (che secret), query/result và cleanup. Nếu chỉ có mock, nói đúng mock.

Input P02 giữ byte ở `p02-input/`, input P03 ở `candidate/`; đọc file INPUTS/manifest và D15/D19 khi map đường dẫn. Các START_HERE bên trong input cũ là lịch sử chuẩn bị, không thay nhiệm vụ/điều kiện ở root gói mới.
