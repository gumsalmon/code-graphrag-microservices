# Công cụ thử nghiệm offline

Các prototype dưới đây chưa được nối vào hệ thống đang chạy. Chỉ dùng dữ liệu tổng hợp; test pass không phê duyệt hợp đồng chung hoặc nhãn benchmark.

- [Validator đầu ra Method/API/Service](impact-output-validator/README.md): kiểm cấu trúc/ID/citation/path theo hợp đồng nháp, không xuất score hoặc label.
- [Telemetry thực nghiệm](experiment-telemetry/README.md): thử recorder thời gian/usage/error bằng clock và token fixture, không đo hoặc gọi phương pháp thật.
- [Context selection và integration](context-selection/README.md): lexical BM25, reverse graph 1–3 hop, packing/citation ledger và nối thử validator/telemetry bằng source/response cố định tổng hợp. Chưa là pipeline PetClinic hoặc baseline nghiên cứu hoàn chỉnh.

Mỗi thư mục có hướng dẫn, giới hạn và test riêng. Không tự import vào parser, Neo4j, pipeline, viewer hoặc scorer trước quyết định áp dụng/version phù hợp.
