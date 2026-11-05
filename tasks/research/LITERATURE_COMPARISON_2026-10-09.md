# Đối chiếu nghiên cứu cho Code GraphRAG

Ngày đọc: 09/10/2026. Trạng thái: ghi chú nghiên cứu và đề xuất nội bộ.
Không phải protocol được phê duyệt, nhãn được nghiệm thu hay kết quả thực nghiệm.

## 1. Phạm vi và mức độ bằng chứng

Đã đọc lại toàn bộ PROJECT_CONTEXT.md và đối chiếu với các phần phương pháp, xây dữ liệu, đánh giá, phân tích lỗi và giới hạn trong toàn văn trực tuyến của tám công trình dưới đây. Các phụ lục liên quan đến benchmark, metric và triển khai cũng được kiểm tra. Không tuyên bố đã tái chạy code hay kiểm chứng độc lập số liệu của các tác giả.

RepoCoder và GraphCoder được đọc qua bản tác giả trên arXiv; không mặc định nội dung này giống tuyệt đối bản xuất bản. PDF RepoCoder trên ACL và bản lưu tại CityU không truy cập được qua công cụ đọc trong phiên này. DraCo, RepoGraph và CodeRAG-Bench được đọc từ PDF proceedings chính thức. Bài K11 được đọc từ toàn văn HTML của tạp chí. Bài Towards CIA được đọc từ preprint v1. GraphRAG được đọc từ preprint v2.

Đây là đối chiếu có chủ đích, không phải systematic literature review đầy đủ. "Chưa nêu" nghĩa là không thấy đặc tả tương ứng trong tài liệu đã đọc, không có nghĩa tác giả chắc chắn không thực hiện trong code.

| ID | Công trình và bản đã đọc | Vị trí bằng chứng trọng tâm |
|---|---|---|
| R1 | [RepoCoder, arXiv v3; EMNLP 2023](https://arxiv.org/html/2303.12570v3) | §2–4, §6, Limitations, Appendix C–D. [Hồ sơ xuất bản](https://aclanthology.org/2023.emnlp-main.151/). |
| R2 | [DraCo, ACL 2024](https://aclanthology.org/2024.acl-long.431.pdf) | §3–5, Limitations; Appendix C.1–C.4, D.2. |
| R3 | [GraphCoder, arXiv v2](https://arxiv.org/html/2406.07003v2) | §3–5, §6.3–6.4, §7. [Hồ sơ ASE 2024](https://conf.researchr.org/details/ase-2024/ase-2024-research/46/GraphCoder-Enhancing-Repository-Level-Code-Completion-via-Coarse-to-fine-Retrieval-B). |
| R4 | [RepoGraph, ICLR 2025](https://proceedings.iclr.cc/paper_files/paper/2025/file/4a4a3c197deac042461c677219efd36c-Paper-Conference.pdf) | §3–5; Table 4; Appendix A–B, E. |
| R5 | [CodeRAG-Bench, Findings NAACL 2025](https://aclanthology.org/2025.findings-naacl.176.pdf) | §2.1–2.4, §3–4, Limitations; Appendix B–C, E. |
| R6 | [Towards Change Impact Analysis in Microservices-based System Evolution, preprint v1](https://arxiv.org/html/2501.11778v1) | §III–IV, §V.B–V.F. |
| R7 | [Cross-Repository Contract Testing and Change Impact Analysis in Microservice CI/CD, IJECS, 19/07/2026](https://www.ijecs.in/index.php/ijecs/article/view/5599) | §3–4, §5.A–F, Tables 8/12/13, §6.E. |
| R8 | [From Local to Global: A GraphRAG Approach to Query-Focused Summarization, preprint v2](https://arxiv.org/html/2404.16130v2) | §3–4, §6.1, Appendix G. |

## 2. Bảng đối chiếu: bài toán, contract, graph, ground truth

Contract ở đây chỉ hợp đồng giao tiếp liên dịch vụ: định danh thao tác, tham số, schema và tương thích. Không đồng nhất với tên hàm/API thư viện trong bài code completion. Ground truth của completion, sửa lỗi và CIA là các đối tượng khác nhau.

| Công trình | Bài toán | Contract | Loại graph | Ground truth |
|---|---|---|---|---|
| R1 RepoCoder | Hoàn thành dòng/lời gọi/thân hàm Python. | API nội bộ, không phải contract microservice. | Không graph; chunk + truy xuất lặp. | Code bị che; unit test cho thân hàm. |
| R2 DraCo | Hoàn thành dòng đang viết. | Import, type, symbol; không HTTP/gRPC. | Đồ thị thực thể có contains/depends; dataflow hướng dẫn retrieval. | Dòng nguồn được giữ làm đáp án. |
| R3 GraphCoder | Hoàn thành dòng/lời gọi Python, Java. | API trong repo; không contract liên dịch vụ. | Statement graph: control-flow, control-dependence, data-dependence. | Dòng nguồn bị loại khỏi input. |
| R4 RepoGraph | Sửa GitHub issue; thêm thử nghiệm completion. | Definition/reference; không contract microservice. | Code-line graph, invokes/contains; k-hop ego-graph. | SWE-bench tests, gold patch cho localization. |
| R5 CodeRAG-Bench | Retrieval và sinh/sửa code. | Tài liệu API thư viện; không CIA contract. | Không đề xuất graph riêng. | Canonical documents và execution tests. |
| R6 Towards CIA | Cảnh báo xung đột khi microservice tiến hóa. | REST call/endpoint và thành phần Spring. | Component call graph liên dịch vụ; IR + change delta. | Mutation, 25 ca lịch sử, review bởi hai nhóm tác giả. |
| R7 K11 | Contract compatibility và consumer impact. | OpenAPI, Protobuf, GraphQL, AsyncAPI. | Directed service graph; cạnh có endpoint/method. | Controlled labels do tác giả; external labels dựa B1 diff. |
| R8 GraphRAG | Tổng hợp câu trả lời toàn corpus. | Không áp dụng. | Entity graph do LLM trích; cộng đồng Leiden. | Không gold answer; LLM đánh giá cặp câu trả lời. |

Mỗi hàng gắn với nguồn R1–R8 và các mục bằng chứng ở bảng trên. Việc không mô hình hóa contract microservice là nhận xét về phạm vi các công trình này, không phải lỗi thiết kế của chúng.

## 3. Bảng đối chiếu: split, baseline, metric, limitations

Split là cách phân tách dữ liệu để phát triển và kiểm thử, không phải chia chunk hay chia tác vụ theo mức độ khó. Tạo repo sau mốc pretraining chỉ giảm một dạng rò rỉ; không tự chứng minh đã khóa test.

| Công trình | Split / kiểm soát rò rỉ | Baseline | Metric | Limitations |
|---|---|---|---|---|
| R1 RepoCoder | Repo sau 2021; 14 repo; chưa nêu dev/test riêng. | In-file, RAG một lượt, oracle; sparse/dense. | EM, edit similarity, test pass; retrieval recall. | Phụ thuộc duplication; iteration bất ổn; latency. |
| R2 DraCo | CrossCodeEval/ReccEval; zero-shot; PyPI 01–04/2023; chưa nêu dev/test riêng. | Zero-shot, CCFinder, RG-1, RepoCoder. | Code/identifier match; prompt time. | Python; khả năng LLM; leakage của model mới. |
| R3 GraphCoder | 20 repo, 8.000 ca; lọc ngày repo/model; chưa nêu dev/test riêng. | No RAG, Vanilla/Shifted RAG, RepoCoder. | Code/identifier match; retrieval time, storage, tokens. | Python/Java; duplication; baseline tự triển khai. |
| R4 RepoGraph | SWE-bench-Lite test; CrossCodeEval Python. | RAG, Agentless, SWE-agent, AutoCodeRover ±graph. | Resolve, patch-apply, localization, cost/tokens. | Main Python/Lite; context nhiễu; chi phí. |
| R5 CodeRAG-Bench | Kế thừa dataset/subset; canonical/open retrieval không phải dev/test. | BM25, dense, reranker; no-retrieval/gold context. | NDCG@10, precision/recall, pass@k, efficiency. | Chủ yếu Python; context có thể gây nhiễu. |
| R6 Towards CIA | 8 dự án Java/Spring; lịch sử và mutation; chưa nêu dev/test khóa. | Đối chiếu incremental IR với full reconstruction; không RAG baseline. | Phát hiện ca đã chọn, rule-violation counts. | Cảnh báo tiềm năng, chưa chứng minh runtime breakage. |
| R7 K11 | 15 controlled +59 external +8 transitive +8 drift; chưa nêu dev/test khóa. | B1 diff, B2 graph+diff, B3 +LLM. | P/R/F1, accuracy, uncertainty, latency. | External chỉ B1; depth-2 breakage chưa chứng minh. |
| R8 GraphRAG | 2 corpus, 125 câu/corpus; chưa nêu dev/test riêng. | Vector RAG, text map-reduce, graph levels. | LLM win-rate, claim count/diversity; tokens. | Không CIA; không gold answer; hạn chế factuality. |

EM: khớp chính xác. NDCG: chất lượng xếp hạng retrieval. Pass@k: đúng theo bộ test trong k phương án. Identifier F1 không phải F1 của tập method bị ảnh hưởng. Resolve rate không phải impact recall. Prompt generation time không mặc định bao gồm inference.

### Lưu ý riêng khi đọc số liệu R7

B1 tạo nhãn external rồi cũng được đánh giá: có nguy cơ đánh giá vòng tròn; việc kiểm tra sáu positive chưa tương đương rà soát độc lập toàn tập. Table 8 loại một UNCERTAIN khỏi TP/FP/FN: F1=100% nhưng accuracy=93,3%. §5.F nói phát hiện consumer depth-2 chưa chứng minh consumer đó BREAKING. Đây là giới hạn bài báo tự mô tả; không kết luận số liệu giả. [Nguồn R7, §5.A/F và Table 8](https://www.ijecs.in/index.php/ijecs/article/view/5599).

### Công trình tổng quan chưa đọc được toàn văn

[Change impact analysis in microservice systems: A systematic literature review, JSS 219, 2025](https://experts.arizona.edu/en/publications/change-impact-analysis-in-microservice-systems-a-systematic-liter/) được kiểm tra metadata và abstract trên trang tác giả. Abstract nêu khoảng trống về quan sát tác động trực tiếp và validation. Không điền graph/ground truth/split/baseline/metric của toàn bộ các nghiên cứu được tổng quan khi chưa có full text. Cần bản tác giả hợp pháp hoặc quyền truy cập thư viện để hoàn tất.

## 4. Định vị đóng góp: đề xuất của nhóm, chưa phải kết quả

Không nên định vị đóng góp chỉ là "kết hợp parser + Neo4j + vector + LLM". Các nguồn R2–R4 đã có hướng dùng cấu trúc code để hỗ trợ LLM; R6–R7 gần trực tiếp bài toán microservice CIA. Sự khác biệt dưới đây là hướng cần kiểm chứng, không phải tuyên bố "đầu tiên" hoặc "tốt hơn".

Đề xuất phát biểu bài toán:

> Với source/config snapshot và một provider change đã xác định, dự đoán tập Method/API/Service thay đổi hành vi dưới điều kiện thử được đặc tả; cung cấp đường phụ thuộc và bằng chứng, đồng thời phân biệt tập đó với các thành phần chỉ reachable và phạm vi cần sửa mã.

Ba đóng góp ứng viên:

1. Biểu diễn và truy xuất contract-aware nối symbol, endpoint và service, kèm source provenance, giả định phân giải và unresolved.
2. Phương pháp sử dụng context kết hợp cấu trúc/contract/ngữ nghĩa để quyết định tác động hành vi, không mặc định mọi ancestor đều impacted.
3. Benchmark có nhãn độc lập, runtime evidence, split chống rò rỉ và đánh giá nhiều cấp, công bố cả failure/uncertainty/cost.

Mỗi điểm chỉ trở thành đóng góp khoa học sau khi có so sánh phù hợp. "Có reviewer" hoặc "có provenance" riêng lẻ chưa đủ chứng minh tính mới.

## 5. Thiết kế baseline đề xuất

Chưa giao việc triển khai hoặc thay đổi bộ baseline chính thức. Mọi mở rộng chung phải được thống nhất theo PROJECT_CONTEXT.md.

| ID | Cấu hình đề xuất | Mục đích |
|---|---|---|
| B0 | Diff + contract rules, không graph/LLM | Đo phần phát hiện vi phạm contract có thể giải bằng luật. |
| B1 | Reverse reachability 1/2/3-hop, không LLM | Đo khả năng lấy candidate và false-positive khi xem reachable là impacted. |
| B2 | Graph + contract/consumer usage rules, không LLM | Baseline mạnh để tách lợi ích thực của LLM. |
| B3 | BM25/lexical retrieval + cùng LLM | Tránh chỉ so với một vector retriever có thể kém hợp mã nguồn. |
| B4 | Vector retrieval + cùng LLM | Baseline đã định hướng trong context. |
| B5 | Graph/contract/semantic retrieval + cùng LLM | Phương pháp đầy đủ cần đánh giá. |

Lý do lựa chọn tham khảo: R1/R5 cho retrieval lexical/dense; R6/R7 cho phân tích cấu trúc/contract không LLM. Đây là cấu hình thích nghi cho CIA, không phải tuyên bố tái triển khai nguyên bản các phương pháp đó.

B0 vốn dự đoán contract violation chứ chưa dự đoán toàn impact set. Không đặt endpoint-breaking F1 và Method-impact F1 vào cùng bảng so thắng/thua. Nếu bổ sung phép ánh xạ B0 sang downstream impact, phải ghi rõ phép ánh xạ; khi đó cấu hình gần B2.

Điều kiện công bằng:

- Cùng baseline source/config/change và evaluation universe; seed được biết đúng trong thí nghiệm chính.
- Chế độ tự định vị seed là thí nghiệm riêng, không nhập lỗi định vị vào kết luận về propagation.
- Các cấu hình LLM dùng cùng model/version/prompt/output schema, giới hạn output và context budget; ghi tokens thực dùng.
- Cùng corpus được phép, không nhãn, repair patch, reviewer notes hay log chứa kết luận trong context dự đoán.
- Graph và vector được phép xây index bằng phương pháp của mình, nhưng nguồn dữ liệu phải ngang nhau.
- Tuning chunking, top-k, threshold, hop và prompt chỉ trên dev; không chọn cấu hình tốt nhất bằng test.
- Nếu có iteration: ghi ngân sách tổng các lượt, không chỉ context ở lượt cuối.
- Baseline không LLM được so cả độ đúng và chi phí; không ép nó gọi LLM để "cùng model".

Ablation dự kiến: bỏ semantic retrieval; bỏ contract-aware filtering; bỏ LLM; thay traversal depth 1/2/3. Đặc tả mỗi thành phần bị bỏ còn giữ nguyên những gì. Tránh gọi một cấu hình "bỏ graph" nhưng vẫn cấp sẵn đường phụ thuộc do graph tạo.

## 6. Khung benchmark và split đề xuất

### 6.1 Đơn vị đánh giá

Một change scenario gồm source/config snapshot, provider patch, dữ liệu/điều kiện thử và universe đã xác định. Method/API/Service là đơn vị chấm bên trong scenario; không xem hàng trăm method trong một scenario là hàng trăm thí nghiệm độc lập.

Các nhóm nhãn riêng:

- dependency: có quan hệ/đường phụ thuộc bằng chứng.
- behavioral_impact: thay đổi hành vi trong điều kiện đã đặc tả.
- requires_code_change: cần sửa dưới chiến lược khắc phục được nêu.
- unresolved: bằng chứng chưa đủ; không tự đổi thành negative.

Những tên này mô tả khái niệm, không phải thay schema hiện có.

### 6.2 Quy trình độc lập

Source/contract/raw runtime -> ghi nhận định source-first -> lưu dấu thời gian/hash -> đối chiếu draft labels -> ghi bất đồng/quyết định. Người lập nhãn không tự duyệt. AI hỗ trợ kiểm tra và tổ chức, không thay quyết định của reviewer.

Runtime dùng để xác lập nhãn không tự động được đưa cho mô hình dự đoán. Nếu mục tiêu là static pre-deployment CIA, input chỉ gồm thông tin trước triển khai. Thí nghiệm cho thêm runtime phải tách riêng và ghi rõ.

Không chứng minh "không ảnh hưởng trong mọi hoàn cảnh" bằng một request pass. Negative phải gắn điều kiện thử, phạm vi bằng chứng và mức chắc chắn; phần còn lại để unresolved.

### 6.3 Split chống rò rỉ

- P01 đã được xem nhiều lần: giữ là pilot/dev minh họa; không gọi là final unseen test.
- Nhóm scenario gần trùng theo hệ thống, endpoint/symbol, họ mutation, consumer usage và sự kiện lịch sử; các biến thể gần trùng cùng split.
- P02–P04 chưa được mở/chọn chính thức. Chỉ lập yêu cầu coverage; khóa manifest sau phê duyệt và thẩm định.
- In-system held-out change đo tổng quát hóa sang thay đổi mới trong hệ thống quen thuộc.
- Held-out system đo sang hệ thống mới; không để sửa prompt/rules bằng nhãn hệ thống test.
- Hai hệ thống có thể dùng cho bước đầu nhưng chưa đủ suy rộng nhiều domain. Quy mô cuối còn cần chốt theo nguồn lực.
- Với thay đổi lịch sử, loại repair/follow-up khỏi index ở thời điểm dự đoán. Việc upstream public từng có thể nằm trong pretraining vẫn là limitation.
- Mutation và historical change báo riêng. Mutation khó không tự động là realistic production change.

### 6.4 Coverage cần bàn trước khi tạo scenario

| Chiều coverage | Điều cần phân biệt |
|---|---|
| Contract | required/optional/default; request/response; path/method/service; field/type. |
| Propagation | direct/transitive; logical hop và service-boundary count. |
| Consumer usage | thực sự dùng field, bỏ qua field, biến đổi dữ liệu, fallback. |
| Negative khó | cùng tên/path nhưng khác overload/method/service; reachable nhưng không thay đổi hành vi. |
| Failure mode | HTTP lỗi rõ; HTTP 200 nhưng payload thiếu/sai; chưa phân giải cấu hình. |
| Provenance | mutation có kiểm soát so với thay đổi lịch sử; source/config cố định. |

Các ô là yêu cầu thiết kế, không phải danh sách P02–P04 đã chọn.

## 7. Metric và quy tắc chấm đề xuất

### 7.1 Tách ba lớp kiểm chứng

| Lớp | Câu hỏi | Bằng chứng / metric |
|---|---|---|
| Extraction | Method/endpoint/edge có đúng không? | Fixture + source review; edge precision/recall nếu có reference độc lập. |
| Candidate retrieval | Tập context có chứa phần cần dự đoán không? | Candidate recall, số candidate, context budget; reference độc lập. |
| End-to-end CIA | Tập dự đoán impacted có đúng không? | P/R/F1 và exact-set match theo Method/API/Service. |

Parser test pass không thay benchmark CIA. Retrieval tốt không đồng nghĩa mô hình suy luận đúng. Một output đúng không chứng minh giải thích và đường đi đúng.

### 7.2 Chấm tập dự đoán

Với universe U được khóa trước, gold positive G và prediction P: TP = P ∩ G, FP = P ngoài G trong vùng đã có nhãn xác định, FN = G ngoài P. Seed loại khỏi tập chấm lan truyền theo context.

- Chấm behavior và repair riêng; không cộng hai loại nhãn vào một F1.
- API ID gồm service + method + path; method ID phân biệt overload.
- Một prediction ngoài universe phải bị phát hiện và báo riêng; không im lặng bỏ đi. Quy tắc phạt/exact-set phải chốt trước.
- Gold unresolved không là negative. Báo số lượng, phạm vi loại khỏi primary scoring và nguy cơ chọn mẫu.
- Model abstention trên gold positive là chưa tìm ra positive trong end-to-end recall; báo thêm tỷ lệ abstention.
- Nếu tính selective F1 chỉ trên ca model nhận trả lời, luôn đi cùng coverage và end-to-end kết quả trên toàn tập nhãn xác định.
- Ca không có gold/predicted positive cần quy ước empty-set trước; báo specificity/FP hoặc compatible accuracy, không tự tạo perfect F1 để làm đẹp macro.
- Báo micro và macro theo scenario; theo system/change type/hop. API/Service aggregation không thay kết quả Method.

### 7.3 Giải thích và tài nguyên

- Explanation: đường có đúng quan hệ không; source span có hỗ trợ nhận định không; đúng contract incompatibility hay chỉ nói "có gọi".
- Không dùng output parser đang đánh giá làm chuẩn duy nhất để xác nhận đường của chính nó.
- Ragas là supplementary, không thay human-grounded CIA.
- Ghi offline indexing/parser/embedding time, query/retrieval time, LLM time, tổng end-to-end, input/output tokens, chi phí, lỗi/timeout và unresolved.
- Ghi model/version, prompt/config hash, dependency/cache provenance, source/config SHA và scenario/label/review version.
- Temperature=0 không bảo đảm tuyệt đối mọi lần gọi backend API giống nhau; lưu output thô và chính sách lặp.

### 7.4 Thống kê

Đề xuất so sánh ghép cặp trên cùng scenario, khoảng tin cậy theo scenario/nhóm scenario; tính đến phụ thuộc trong cùng hệ thống. Chưa chọn kiểm định hay cỡ mẫu khi chưa có final design. Không tăng N bằng chạy P01 nhiều lần: lặp giúp đo biến thiên, không tạo hệ thống/change độc lập.

## 8. Áp dụng ngay cho P01 mà không sửa nhãn

Theo PROJECT_CONTEXT.md, mutation thêm includeDetails bắt buộc và giữ consumer cũ; tuyến xét gồm VisitResource.read(List<Integer>), VisitsServiceClient.getVisitsForPets và ApiGatewayController.getOwnerDetails.

Lập luận dùng trong thiết kế, không phải quyết định reviewer:

- Graph có thể đưa client/controller vào candidate set.
- Contract analysis có thể kiểm tra yêu cầu mới không được request cũ gửi.
- Source consumer và fallback cần để lý giải vì sao gateway có thể trả 200 nhưng visits rỗng.
- Không suy ra controller cần đổi chữ ký chỉ vì nằm trên tuyến.
- VisitResource.read(int) không được coi cùng seed vì trùng tên.
- Các quan sát trong context là evidence pilot đã ghi trước đó; phiên đọc paper này không tái chạy runtime và không chuyển nhãn sang accepted.

Một ca có thể giải bằng graph + contract rules vẫn là pilot hữu ích, nhưng chưa chứng minh cần semantic retrieval hay LLM. Benchmark sau phải chứa trường hợp phân biệt được giá trị các thành phần, đồng thời giữ ca đơn giản để phản ánh phạm vi thực tế.

## 9. Công việc có thể chuẩn bị trong thời gian chờ reviewer

| Công việc | Đầu vào | Đầu ra | Definition of Done |
|---|---|---|---|
| Định vị bài báo | Bảng R1–R8 + context | Contribution claims và RQ nháp | Mỗi claim có baseline/ablation kiểm chứng; không claim first/better chưa có bằng chứng. |
| Đặc tả thí nghiệm | Protocol hiện hành + đề xuất B0–B5 | Experiment plan nháp | Input/schema/budget/split/leakage/metric/failure rõ; thay đổi chung chờ phê duyệt. |
| Checklist benchmark | Protocol + coverage table | Checklist, không labels mới | Phân biệt dependency/behavior/repair; negative và unresolved có quy tắc. |
| Related work | Nguồn chính đã đọc | Bản viết nháp có source locator | Phân biệt code completion, issue repair, microservice CIA và document GraphRAG. |
| Tái hiện đối thủ | Artifact của bài + dependency | Feasibility audit có version | Chỉ nói reproduced sau chạy thật; mọi adaptation ghi rõ. Chưa thực hiện trong lượt này. |

RQ nháp:

1. Contract-aware graph context có giúp dự đoán behavioral impact hơn lexical/vector context và graph+contract không LLM không?
2. Tác dụng của semantic retrieval, contract analysis, LLM và logical hop depth là gì?
3. Những loại consumer usage/change/fallback nào khiến phương pháp sai hoặc phải abstain, và trade-off chi phí ra sao?

Các RQ này là đề xuất để thống nhất, không tự đổi cam kết hoặc protocol.

## 10. Phần người chủ trì cần đọc và quyết định

Không cần đọc toàn bộ tám bài ngay. Nên tự kiểm tra ba đoạn trước khi chốt thiết kế:

- R7: §5.A, Table 8 và §5.F/§6.E để hiểu oracle, uncertainty và phạm vi generalization.
- R6: §IV và §V.C–V.F để hiểu cảnh báo cấu trúc khác runtime effect.
- R4: §5.2, Table 4 để hiểu context nhiều hop có thể làm kết quả kém đi.

Mỗi đoạn có thể trao đổi trực tiếp bằng một ví dụ P01. AI có thể tra cứu, đối chiếu, dự thảo code/kế hoạch/paper và hỗ trợ kiểm tra; không thay người chủ trì hiểu claims mình bảo vệ, không phê duyệt protocol/split hay nhãn thay reviewer.

Cần thống nhất sau khi xem đề xuất: phạm vi primary task, bộ baseline khả thi, ngân sách thực nghiệm, chính sách unseen test và mức generalization mong muốn. Không chốt model/venue/cỡ mẫu bằng suy đoán.

## 11. Trạng thái bàn giao

Đã hoàn thành đối chiếu tài liệu và bản thiết kế nghiên cứu nháp. Chưa tái hiện code các bài, chưa chạy benchmark mới, chưa giao task chính thức cho Hiển/Phát, chưa mở P02–P04, chưa khóa split, chưa thay nhãn hoặc reviewer artifacts, chưa commit/push/merge.
