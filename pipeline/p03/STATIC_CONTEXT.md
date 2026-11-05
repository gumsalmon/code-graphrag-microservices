# Context P03 từ baseline source và proposed patch

Đã chuẩn bị bảy preview cho một ca development: lexical BM25, graph 1/2/3 hop và kết hợp lexical/graph 1/2/3 hop. Cùng corpus sáu file baseline, seed source và patch bắt buộc, top-k hai file mỗi route. Đây là bước chuẩn bị context, chưa gọi model hoặc tạo dự đoán CIA.

```powershell
node --test pipeline/p03/static-context.test.mjs
node scripts/prepare_p03_static_context.mjs --run handoff-out/p03-breaker-offline/20261105t083103189z-c2daafaf
node scripts/check_p03_static_context.mjs --run <thu-muc-context-moi>
```

Run hiện hành: `handoff-out/p03-static-context/20261105T084817515Z-225f3c9a`, manifest `0c6e5219c74c2164143d8f519d7f07f9a9110264035166da12998909ded9153c`, 29 listed files. `SUMMARY.json` và từng `selection.json` ghi selected/dropped files, hashes, paths và byte count.

Component riêng `p03-static-source-context/2` dùng cùng thuật toán BM25/packing đã kiểm ở P02, giữ nguyên code/pin P02. Lexical được chuẩn bị trước khi đọc graph/retrieval. Native file aliases được ràng buộc với `extraction.json` đã seal; ví dụ native `OwnerDetailsBuilder.java` ánh xạ source thật `OwnerDetails.java`. Giữ native IDs và native filename, thêm source binding riêng; không tự sửa parser hoặc claim nested IDs/record accessors đã đầy đủ.

Cap 32.768 bytes tính toàn serialized JSON preview, chưa là ngân sách token/full provider request chính thức. Giữ assumptions/edge evidence/endpoints/unresolved và giới hạn witness source. Missing node không là negative; false breaker flag có thể là protection chưa được chứng minh. Record/serialization/dataflow vẫn hạn chế.

14 unit tests và checker thực đạt; overflow/source-tamper resealed bị từ chối. Bản context đầu thiếu alias binding được giữ cùng source code/logs/manifest; bản /2 dùng source map đã có, không đổi native/source/raw/labels. Không đọc nhãn/notes/runtime outcome vào chương trình context. AI điều phối đã tiếp xúc nhãn trong các lượt intake; không tuyên bố development experiment là blind hoặc unseen test.
