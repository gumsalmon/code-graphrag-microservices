# Bàn giao toàn bộ dự án Code GraphRAG — 18/10/2026

**Mục đích:** đưa một file này cho AI hỗ trợ điều phối ngày mai để hiểu mục tiêu bài tạp chí, quá trình đã làm, quyết định hiện hành, bằng chứng, phần chưa xong và cách tiếp tục. Đọc hết trước khi hành động.

Đây là snapshot tổng hợp từ lịch sử hội thoại còn truy cập được, context 25–26/09, tài liệu repository, báo cáo và artifact cục bộ. **Không phải bản xuất nguyên văn toàn bộ chat**, không khẳng định phục hồi những lời đáp không còn trong dữ liệu. Chỗ thiếu bằng chứng được ghi rõ, không điền trí nhớ giả. Các mốc bên dưới phân biệt lời thành viên báo, record kiểm độc lập đã có, kiểm lại byte hiện tại và đề xuất chưa áp dụng.

**Đối tượng sử dụng:** Huy và AI điều phối/phát triển. File có mô tả kết quả runtime, nhãn dự thảo và output hệ thống; **không gửi file này làm đầu vào source-first cho người lập nhãn/reviewer chưa tiếp xúc**. Dùng packet đã lọc đúng vai trò cho họ.

Một file đủ để tiếp nhận ngữ cảnh và lập kế hoạch; **không thay thế source, Git objects, raw log, ZIP, cache hoặc credential**. AI chỉ có file này, không có workspace, phải nói rõ không thể tự xác minh/chạy thực tế. Không dựng lại raw evidence hoặc báo test pass từ thông tin được kể.

## 0. Đọc nhanh: chúng ta đang ở đâu?

- Người điều phối là **Huy**. Hiển làm kỹ thuật/parser/Neo4j/baseline; Phát làm benchmark/protocol/evidence/nhãn nháp theo ranh giới độc lập. Thầy hướng dẫn và một anh cựu SV đã góp ý tổng quan, chưa có quyết định nghiệm thu nhãn được xác minh.
- Đích là **bài tạp chí quốc tế có phản biện**, không chỉ demo chạy được. Venue/Q1/Q2/Scopus/WoS chưa chốt. Chưa chứng minh GraphRAG hơn Vector RAG.
- **P01** là một tình huống trong Spring PetClinic: thêm query parameter bắt buộc ở provider, consumer không đổi. Kỹ thuật parser→Neo4j đã kiểm độc lập; nhãn vẫn `pending_review`. Đã có viewer và API smoke, chưa có cặp suy luận cùng contract mới hoàn chỉnh hoặc điểm bài báo.
- **P02** vẫn trên PetClinic, thêm query parameter tùy chọn/default false. Đã build và chạy baseline thật. Chưa mutated/POST/đủ matrix, chưa nhãn. Phát tìm đúng lỗi liên kết hash và đường dẫn; đã tạo bản sửa **scenario 0.1.1 / universe draft.v2**, 75/75 test offline, ZIP kiểm lại 31/31 file, nhưng chưa nhận Phát kiểm lại.
- **P03/P04** còn đề xuất; P04 dự kiến dùng hệ thống thứ hai **Online Boutique**. P01 không phải tên gọi khác của toàn bộ PetClinic; P02–P04 cũng không phải bốn hệ thống riêng.
- Hợp đồng Method/API/Service và thiết kế thực nghiệm là **bản nháp**. Validator/telemetry mới là **prototype tổng hợp offline**, chưa nối hệ thống thật.
- **Tin mới nhất từ Huy:** Phát bận, chưa thể hoàn tất; Huy cần bàn giao toàn dự án hôm nay vì việc cá nhân. Việc này không cho phép AI ký thay Phát, tự duyệt nhãn hoặc tự bỏ gate.
- **Điểm dừng được đề nghị:** lưu đầy đủ ngữ cảnh ở candidate P02 đã kiểm kỹ thuật, chờ quyết định người thật về đầu vào; không cần chạy mutation hoặc làm giả phê duyệt để có một bản bàn giao hoàn chỉnh.

## 1. Thẩm quyền, môi trường và Git

### 1.1 Nguồn nào là hiện hành?

1. Yêu cầu mới nhất của Huy và quyết định thật có phạm vi rõ ràng.
2. `PROJECT_CONTEXT.md` hiện hành: mục tiêu, phân công, định nghĩa và gate nghiên cứu.
3. Artifact đúng pin/version cùng raw log và báo cáo tương ứng.
4. File bàn giao này là snapshot lịch sử/điều phối, không tự phê duyệt proposal hoặc thay protocol.
5. Task packet/context cũ mô tả trạng thái tại lúc tạo; không dùng chúng để phủ nhận tiến độ hoặc quyết định mới hơn.

Nếu mâu thuẫn, nêu mâu thuẫn và bằng chứng; không tự đổi thiết kế, raw/nhãn, hoặc diễn đạt mọi file cũ đều là hiện trạng. Khi tiếp tục trên repository phải đọc lại toàn bộ PROJECT_CONTEXT và kiểm AGENTS nếu có.

### 1.2 Workspace tại lúc bàn giao

```text
OS/shell: Windows, PowerShell; múi giờ Asia/Bangkok
Repository local: E:/NCKH/code-graphrag-microservices
GitHub: https://github.com/gumsalmon/code-graphrag-microservices
Branch local: codex/p01-evidence-demo
HEAD: d1f95eb21c71dd6bfb49d2e450142d1290ceda5f
Node ghi nhận gần nhất: v24.19.0
```

Các đường dẫn không có ổ đĩa trong file này tương đối với repository root. Khi chuyển máy phải ánh xạ lại; không xem một đường dẫn không tồn tại là bằng chứng task chưa từng được làm.

Working tree **đang dirty**, nhiều thay đổi có trước lượt bàn giao và nhiều thư mục chưa tracked. Index được kiểm gần đây không có file staged. Chưa commit/push/merge những sửa mới P02/context. Giữ nguyên mọi thay đổi người dùng; không `reset --hard`, checkout đè, clean, stage toàn bộ hoặc tự chuyển branch.

Local refs đã thấy, **không phải xác nhận remote hôm nay** vì lượt bàn giao không fetch:

| Ref/pin | Giá trị và nghĩa |
|---|---|
| local main / cached origin/main | `65e41a2b4fafa0d37fdd2779985d131a3c7dc116` |
| cached origin/codex/p01-evidence-demo | `d1f95eb21c71dd6bfb49d2e450142d1290ceda5f` |
| cached origin/Pham_Nguyen_Phat | `5f9204d66253604edf9101c2f888fc7e75aa0be7` |
| cached origin/hien/graphrag-parser-benchmark | `e95613795133088621117179c9fb9592dab62b16` |
| cached origin/hien/p01-neo4j-e2e-verification | `492c0eb4dba7d7ff0c698f36d3a810500a1e0de2` |

Phát gửi review P02 tại commit `00aa4dcc3eb8cb9a4706572b325e481316cbcad4`; commit này đã được đọc từ public GitHub ở vòng audit trước, không suy từ cached branch đang ở 5f9204d. Không mặc định PR #1 đã merge hoặc các branch không đổi; kiểm hiện trạng trước khi thực hiện Git ở task mới.

Ngày 13/10 đã công bố 38 file nền kỹ thuật qua commit d1f95eb, message `feat: add reproducible P01 preparation pipeline`, branch codex/p01-evidence-demo, không merge main. Các sửa unknown/comparison/closeout/P02/prototype về sau còn local. **HEAD không chứa mọi nội dung working tree hiện tại; clone GitHub đơn thuần sẽ thiếu chúng.**

`handoff-out/` Git ignored: chứa artifact/run/ZIP/cache cục bộ. Không nói những file ở đó đã trên GitHub nếu chưa thực sự xuất bản. Huy từng cho push một số task trước đây; đó không phải giấy phép push mọi lượt sau. Không force push.

### 1.3 File ngoài repository đã được cung cấp

- Context lịch sử: `C:/Users/GumSalmon/Documents/Codex/2026-09-19/ng-d-ng-graphrag-trong-ph/CONTEXT_2026-09-25_TO_2026-09-26.md` — còn tồn tại và đã đọc khi chuẩn bị bản này.
- Hiển P02: `E:/Bài báo NCKH/RETURN_HIEN.md` và `E:/Bài báo NCKH/P02_HIEN_RETURN_20261015T123448Z.zip` — còn tồn tại; ZIP 2.116.179 byte.
- Các ảnh Zalo/PowerShell người dùng gửi trong chat là thông tin lịch sử; không mặc định file clipboard tạm còn tồn tại hoặc coi ảnh là artifact runtime tái lập.

### 1.4 Cách làm việc phù hợp với Huy

- Trao đổi bằng tiếng Việt rõ ràng, giải thích ý nghĩa kết quả và cho thấy tiến độ cụ thể; Huy chưa quen toàn bộ thuật ngữ hoặc cách đánh giá một hệ thống nghiên cứu.
- Khi được giao một bước, nêu input/output/DoD, thực hiện và báo điều đã chạy/đạt/chưa đạt. Nếu cần quyết định người thật hoặc không còn việc hợp lệ để làm thì báo đúng điểm dừng.
- Task gửi Hiển/Phát phải đủ tự chứa cho AI hỗ trợ, nhưng chỉ gồm allowed inputs đúng vai trò. Không chép output hệ thống sang luồng làm nhãn.
- Văn bản hướng dẫn public cần tự nhiên, trung tính; tránh cách xưng hô kiểu “gửi kết quả lại cho Huy/thầy” khi không cần. “Hoàn hảo” nghĩa là làm kỹ và trung thực, không bảo đảm không thể có lỗi.
- Dư token không là ngân sách API/tiền, quyền retry, bỏ review hoặc thay đổi phạm vi. Việc Git, dịch vụ, dữ liệu và quyền thực thi phải theo task đang được giao, không theo một lần cho phép cũ.

## 2. Mục tiêu khoa học và sản phẩm

Tên đề tài: **Nghiên cứu ứng dụng GraphRAG trong phân tích tác động mã nguồn đa dịch vụ cho kiến trúc Microservices.**

Input nghiên cứu: source/config tại snapshot cố định và một thay đổi cụ thể. Output hướng đến: Method, API Endpoint và Service chịu tác động, đường phụ thuộc, dẫn chứng, giả định và phần chưa xác định. Phạm vi ban đầu 1–3 hop logic.

Ba sản phẩm hướng tới:

1. Pipeline Code GraphRAG hoạt động được, mã nguồn mở và tái lập được.
2. Microservice Impact Benchmark có provenance/nhãn được thẩm định độc lập; đánh giá Precision/Recall/F1 nhiều cấp, Ragas bổ sung.
3. Bài tạp chí quốc tế có phản biện. RIVF/KSE là phương án dự phòng, không biến thành mục tiêu chính đã chọn. Thuyết minh ghi 10/2026–04/2027.

Không hứa Q1/Q2, tính mới, superiority hoặc xác suất được nhận khi chưa có bằng chứng. Tích hợp Tree-sitter + Neo4j + Chroma + LLM chỉ là phần mềm nền; đóng góp cần được định vị với công trình gần nhất và kiểm chứng bằng thí nghiệm công bằng.

Đóng góp **ứng viên**, chưa phải kết quả:

- Biểu diễn/retrieval contract-aware nối symbol–endpoint–service, evidence/provenance, giả định phân giải và unresolved.
- Kết hợp cấu trúc, contract và ngữ nghĩa để phân biệt behavioral impact với chỉ reachable hoặc nhu cầu sửa mã.
- Benchmark có bằng chứng runtime, nhãn độc lập, split chống leakage và đo cả failure/uncertainty/cost.

P01–P04 là đợt pilot/development mở rộng; bốn ca không tự đủ cho bài tạp chí hoặc suy rộng nhiều hệ thống.

## 3. Giải thích đơn giản để không nhầm mục tiêu với một web/app

Microservices là một ứng dụng chia thành nhiều dịch vụ giao tiếp qua HTTP/RPC. PetClinic có visits-service, customers-service, api-gateway và hạ tầng config/discovery. Sửa một API ở visits-service có thể làm client/gateway trả thiếu thông tin dù phần giao diện vẫn mở được.

Nhóm đang xây công cụ đọc code và thay đổi, tìm phụ thuộc, chuẩn bị ngữ cảnh, rồi dự đoán ảnh hưởng **trước triển khai**. Sản phẩm cốt lõi là pipeline và bằng chứng, không phải một website nghiệp vụ. Viewer chỉ giúp nhìn thấy graph, patch, source, raw HTTP và output đã lưu; không đồng nghĩa GraphRAG live chạy trong trình duyệt.

Huy từng khó hình dung tiến độ vì không thấy web/app; vì vậy AI cần giải thích bằng đầu vào→đầu ra cụ thể, mở viewer khi phù hợp và báo checkpoint có bằng chứng. Không thay việc làm thực nghiệm bằng viết thêm quy trình vô hạn, cũng không bỏ quy tắc nghiên cứu để làm demo đẹp.

## 4. Nhân sự, reviewer và cách dùng AI

| Người/luồng | Vai trò hiện hành | Không được tự làm |
|---|---|---|
| Huy | Điều phối; kiến trúc/resolver/traversal; chọn ca; tích hợp LLM; thiết kế thí nghiệm; chủ trì viết bài | Tự phê duyệt ground truth của phương pháp mình xây |
| Hiển | Parser/resolver theo task; Neo4j Docker; Chroma baseline; integration/tái lập kỹ thuật | Lấy output triển khai làm nhãn; tự merge hoặc tự nghiệm thu nhãn |
| Phát | Protocol; source/contract/runtime evidence; scope/universe; draft labels và quản lý review/leakage | Parser/Neo4j/phương pháp được đánh giá; tự duyệt nhãn mình lập |
| Reviewer thật khác người lập nhãn | Source-first notes, đối chiếu nhãn, quyết định/bất đồng có danh tính thật | Ký theo AI/score hoặc theo mong muốn nhóm, bỏ qua exposure |
| AI hỗ trợ | Tìm/tổ chức bằng chứng; kiểm code/checksum; viết test/tài liệu, chạy việc được giao | Giả người ký, giả thời điểm/checkpoint, tự accepted hoặc dùng output làm oracle |

Huy báo Phát bận tại mốc bàn giao. **Chưa có người thay Phát được chỉ định.** Không coi im lặng là đồng ý. Huy/AI có thể làm phần kiểm cơ học hoặc chuẩn bị kỹ thuật với attribution thật; điều đó không biến thành Phát xác nhận hoặc review độc lập. Nếu cần thay người, Huy chỉ định người thật phù hợp rồi ghi scope/exposure; không đổi tên trên hồ sơ cũ.

Quy tắc độc lập là thiết kế chất lượng do nhóm lựa chọn nhằm giảm bias, không phải có một luật bắt mọi bài CIA phải thuê reviewer bên ngoài. Thầy có thể review nếu đủ chuyên môn và độc lập với việc lập nhãn/implementation tương ứng; cựu SV được thầy giới thiệu cũng có thể phù hợp. Việc bỏ/thay quy tắc phải có quyết định protocol versioned, lý do và threats to validity; **chưa có quyết định bỏ**, không lách chỉ vì người bận.

Thành viên đa số dùng AI: packet phải có mục tiêu, allowed inputs đúng SHA, output, commands, evidence, Definition of Done và ngoài phạm vi. AI không nhận cả output hệ thống/score để tạo nhãn. Mỗi người bàn giao nêu phần trực tiếp kiểm và phần AI hỗ trợ, không chỉ ảnh hoặc câu “all pass”.

## 5. Định nghĩa bắt buộc

- **Seed:** method/API bắt đầu thay đổi; ghi riêng và loại khỏi propagation score. P02 còn loại Service chứa seed theo scope đã khai.
- **Dependency:** quan hệ cấu trúc có evidence; có đường đi không tự suy behavioral impact.
- **Behavioral impact:** kết quả quan sát khác trong điều kiện thử xác định, kể cả lỗi/thiếu dữ liệu. Không đồng nghĩa DB mất dữ liệu.
- **Requires code change:** phụ thuộc chiến lược sửa; không phải mọi caller bị tác động đều phải đổi signature.
- **Ground truth:** nhãn dựa source/contract/runtime và qua review phù hợp, không phải output của chính parser/GraphRAG/LLM.
- **Unknown/unresolved/missing:** chưa đủ bằng chứng; không phải negative, không coi omission là tuyên bố không tác động.
- Caller→callee là chiều cạnh. Phân tích ảnh hưởng từ callee/seed truy ngược. CALLS và INVOKES_API mỗi cạnh trực tiếp = một hop logic; Service/File/Class containment không tính. Số service boundary ghi riêng.
- Method ID phải có service/FQN/parameter types để phân biệt overload; API ID gồm service + verb + normalized path/prefix, query values không ghép vào path ID. Alias qua snapshot phải được chứng minh, không ghép gần tên.
- 40 hex thường là Git commit SHA; 64 hex SHA-256 định danh byte file/ZIP. Chúng không phải API key, không phải chương trình cần chạy. Hash đúng không chứng minh review độc lập hoặc thời điểm thật.
- Synthetic test fixture kiểm code validator/parser không thay bằng chứng âm hành vi trên hệ thống thật. Status 200 không đủ, phải đọc response body và quan hệ dữ liệu.

## 6. Quá trình từ đầu cuộc trao đổi đến nay

### 6.1 Bối cảnh, Git và phân công ban đầu

Huy yêu cầu đọc hết PROJECT_CONTEXT, kiểm Git và chỉ báo cáo mục tiêu công bố/đã kiểm/chưa nghiệm thu/bước tiếp. Sau đó bổ sung Phát để lấp khoảng trống benchmark/evidence/review, không trùng parser/Neo4j của Hiển. Huy lần lượt cho sửa context/phân công và push đúng file/message; không hiểu các lệnh “chỉ đọc” hoặc “được push” cũ là quyền chung vĩnh viễn.

Git history còn thấy các mốc `bb22f9b` (update international journal context), `7008cba` (assign independent benchmark role), `65e41a2` (execution task packets), rồi `d1f95eb` (P01 preparation pipeline). Dùng full pin trong artifact, không dựa branch name để suy snapshot.

Hiển đã có branch và PR #1; không giao lại task cũ như chưa làm. Huy hỏi việc tạo branch mới hay dùng branch có sẵn; điểm cốt yếu hiện nay là đúng base/commit, không sửa main/force push/tự merge. Không tạo branch hồi tố chỉ để làm đúng một câu trong packet cũ.

### 6.2 Chuỗi bàn giao tháng 9 và vấn đề tái lập

Hiển báo các lần cập nhật `e732fb6` (54 tests/exact-set guard), `1da100a` (LF/CRLF/cache/smoke wording), `5b58956` (59 tests, provenance Git blob vs working tree). Các báo cáo tác giả không tự bằng kiểm độc lập ở đúng SHA. Context 25–26/09 ghi P01 subset 27/27 đã chạy Neo4j, full suite/chroma/line endings lúc ấy còn vấn đề. Không mang các blocker cũ thành hiện trạng sau 12/10.

Phát bàn giao protocol/labels qua chuỗi commit có `a14fed5`, `34db281` (15 log gốc,117 checksums), `fa8e3d2` (có file tên bất thường), `ca05ef8`/`5991e7c` (dọn output diff commit nhầm, bổ sung scenario/universe selection/scorer/split nháp). Pin benchmark/protocol dùng về sau là `5f9204d...`. Giữ labels.v3/raw; record trạng thái accepted bằng quyết định riêng, không sửa byte nhãn để làm như đã review.

Huy bật Docker sau khi làm rõ Docker trước đó chưa chạy; không coi “máy không có Docker” là blocker vĩnh viễn. Các hash lệch do byte working tree CRLF/Git blob LF phải tách khỏi thay đổi nội dung; báo cáo sau có HEAD/status trước/sau, không chỉ hash file tùy checkout.

### 6.3 Tìm reviewer, GitHub public và hai lượt

Huy từng hỏi có nên tự review, hỏi thầy, có nên bỏ quy tắc và P01 label là gì. Hướng hiện hành không cho người xây hệ thống tự duyệt ground truth của mình. Accepted sau review là bộ reference được nghiệm thu trong phạm vi/hash đó, không biến cả đề tài thành xong.

Thầy đồng ý nhờ một anh cựu SV xem; yêu cầu link Git trước rồi hẹn trao đổi. Huy chuyển repo public, có lúc gửi/rút tin nhắn Zalo/ZIP khi thầy chưa đọc để chuyển hướng sang hướng dẫn tải trên GitHub. Đã chuẩn bị round1 source-first, round2 đối chiếu; hướng dẫn public chỉnh văn phong tự nhiên, không kiểu “kết quả gửi lại cho Huy/thầy”.

Public round1 theo hướng dẫn local: release `p01-review-round1-20261005`, asset `P01-ROUND1-SOURCE-FIRST.zip`, SHA-256 `8c6edae950b7d36ec401ca25e53a0f83510536c99da507b3498d2a2a4370ada3`. Không nhầm GitHub “Source code.zip” với asset đã lọc. Lượt bàn giao này không tải lại release để xác nhận availability.

### 6.4 Góp ý thầy/anh và lý do làm demo/pipeline

Huy chuyển tiếp nhận xét trong chat: đánh giá hướng kết hợp source graph + GraphRAG, benchmark và phân tách vai trò là hợp lý; khen evidence thật/protocol/metrics; chê triển khai dở dang, chưa demo E2E rõ, script chính còn lỗi, resolver HTTP/gRPC khó, sản phẩm nặng quy trình và thiếu trực quan. Anh gửi `https://github.com/abhigyanpatwari/GitNexus` để tham khảo.

Đây là **nhận xét tổng quan qua chat**, không phải phiếu source-first/approve labels. Không tự gán danh tính, ngày review từng nhãn hoặc accepted. Không có bằng chứng được audit rằng viewer của nhóm được xây bằng code GitNexus; không nói đã fork/tích hợp dự án đó. Nếu sau này muốn reuse phải xem source/license/phạm vi riêng.

Từ phản hồi này nhóm đi các bước kỹ thuật: kiểm P01 thật → viewer evidence → reasoning offline → Chroma/model adapter → API smoke → fresh preparation pipeline → comparison/unknown → audit closeout. Những cải thiện này giải quyết một phần engineering feedback, không tự thỏa journal evaluation.

### 6.5 Gemini, nghiên cứu tiếp và mở P02

Huy không có gói AI trả phí, muốn Free Tier. Người dùng tự tạo/lưu Gemini key; dấu `*` khi nhập secure console là bình thường, nhưng copy masked preview không phải key thật. Adapter/API được kiểm theo provenance; không ghi key vào chat/context.

Trong lúc chờ reviewer/provider, Huy cho đọc nghiên cứu sâu và lập bảng bài toán/contract/graph/ground truth/split/baseline/metric/limitations; kết quả ở notes 09/10. Huy muốn tiếp tục kỹ thuật không đứng chờ vô ích, từng thử đổi model trợ lý và lo mất ngữ cảnh. Vì vậy phải bàn giao có bằng chứng, không hứa “khôi phục trí nhớ nguyên vẹn” khi chỉ có summary.

Ngày 15/10 Huy đồng ý chuẩn bị/phát triển P02–P04 trước review gộp, thay ý tưởng cũ “P01 accepted rồi mới mở P02”. Chưa bỏ gate input/universe/labels/final test/scoring. Huy chọn P02 C02-A; nhóm chuẩn bị patch/fixture/census, baseline thật, hai packet tách biệt; Huy xác nhận đã gửi Hiển và Phát và chờ họ phản hồi.

Trong lúc chờ: paired dry-run, draft output contract, draft experiment design, synthetic validator và telemetry; tất cả giữ trạng thái nháp/prototype đúng phạm vi đã cho.

### 6.6 Hiển/Phát phản hồi P02 và checkpoint hôm nay

Hiển gửi RETURN rồi ZIP; đã kiểm package/raw evidence và phạm vi việc đã làm, không coi self-report là toàn P02 hoàn thành. Phát gửi review scope commit `00aa4dcc...`, kết luận cần sửa F01/F02, F03 chưa runtime. Nhóm tái tạo nguyên nhân F01 ở builder và tạo candidate v2 để Phát kiểm lại. Huy hiện báo Phát bận, muốn dừng ở mốc an toàn và có bản context đủ cho AI khác ngày mai. **Chưa có xác nhận Phát cho candidate mới; chưa gửi hộ tin nhắn hay tự đổi người phụ trách.**

## 7. P01: dữ liệu, kỹ thuật và điều chưa nghiệm thu

### 7.1 Bộ pin phải giữ

| Thành phần | Pin |
|---|---|
| PetClinic source | `3858f9c630cf989bb6809a86edf47c2be78dc9f1` |
| Config | `323993ce2519c6d02df63e08bf4458d123d3b611` |
| Implementation Hiển kiểm độc lập | `e95613795133088621117179c9fb9592dab62b16` |
| Benchmark/protocol Phát | `5f9204d66253604edf9101c2f888fc7e75aa0be7` |
| labels.v3 SHA-256 | `3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce` |

Mutation P01: provider `VisitResource.read(List<Integer>)` thêm boolean `includeDetails` **required**, không default; thân method/consumer/config giữ nguyên. Không dùng tên nhầm `visitsMultiGet` hay gọi client là Feign; source thật dùng WebClient.

```text
ApiGatewayController.getOwnerDetails(int)
  --CALLS--> VisitsServiceClient.getVisitsForPets(List<Integer>)
  --INVOKES_API--> VisitResource.read(List<Integer>)
```

Từ seed, client ở 1-hop, controller ở 2-hop; có một lần vượt ranh giới dịch vụ. `VisitResource.read(int)` là overload khác, không được ghép chỉ theo tên.

Runtime PetClinic lịch sử: baseline direct/gateway 200 có visits; mutated direct thiếu parameter 400; có parameter hợp lệ 200 vẫn có dữ liệu; gateway không đổi 200 nhưng visits rỗng do fallback. Đây là thiếu dữ liệu response, không xóa DB. Controller/client có thể sửa theo nhiều chiến lược; không mặc định mọi chữ ký Java phải đổi.

### 7.2 Kiểm độc lập kỹ thuật đã ghi ngày 12/10

- Source→parser→JSON/Cypher mới→Neo4j thật cho baseline/mutated; **59/59 test, không skip** trên implementation e956137.
- Exact-set negative guard từ chối method thừa, đặc biệt read(int), trên cả hai snapshot. Có failure exits/overload/service+verb+path guards, không chỉ query trả tập con mong đợi.
- Probe LF/CRLF và thay nội dung source; 11 probe có giao với full59, không cộng thành70 bằng chứng độc lập.
- Chroma thật, embedding ONNX all-MiniLM-L6-v2, 384 chiều; warm cache chạy được, cold cache cần tải model và không chạy offline nếu thiếu. Tái lập dùng 13 AST chunks; top 5 đều ở provider, không tăng top-k để ép có caller.
- Python 3.11.16 trong Docker Linux; không phải bằng chứng native Windows/macOS/ARM. TCP relay phục vụ bridge Docker/localhost, không sửa payload/graph để pass.
- Kiểm parser/Neo4j/demo **không phải chạy lại PetClinic HTTP**; HTTP được lấy từ evidence lịch sử đúng snapshot, ghi rõ provenance/encoding patch.

Nguồn: `tasks/research/P01_TECHNICAL_VERIFICATION_2026-10-12.md`, `tasks/research/P01_RETRIEVAL_OFFLINE_2026-10-12.md`.

### 7.3 Pipeline/viewer/reasoning hiện có

- `pipeline/p01/`: prepare từ source→parser→Neo4j→Chroma→request Vector/Graph+Vector, không cần key cho prepare. Fresh run ngày 15/10: `handoff-out/p01-pipeline/20261015T082522708Z-0539ac7d`, checker 46/46, 0 LLM calls, không đọc labels.
- `reasoning/p01/`: context/prompt/output schema, validators, offline OpenAI adapter và Gemini live adapter. OpenAI mới kiểm offline, không có credential/live run được xác minh.
- Output P01 đang là **Method**, biết trước seed, technical registry gồm 5 methods trong ba file Java; không phải full-repo inventory hoặc Method/API/Service contract production.
- `demo/p01/`: Evidence Lab xem graph/source/patch/HTTP, tạo request offline, import response/comparison. Mở `demo/p01/index.html` với Chrome/Edge hoặc server loopback; không Neo4j/Chroma/LLM live trong browser. Viewer import chỉ kiểm JSON, không tự xác nhận file được model thật nào tạo.

Audit P01 `handoff-out/p01-closeout/20261015T082832078Z-79137577/audit.json` ghi: integrity kỹ thuật true, paired inference complete false, full research complete false, ground truth accepted false, scoring false, pipeline_requests_match_model_requests false.

Fresh graph request hash `cc26636ced4eae74a8150638fa06d71de0e6c3abd4f03ef0996a764bc0e511e8` khác request API `8f53c0484537f4740e4d695f9603b37d5034716bbe210b0e4b8838bd04c3c251` do provenance/run mới. Không gắn response cũ vào prepare mới để giả đã gọi.

Các báo cáo ngày 15/10 ghi selected P01 suite 111/111 và 20 nhóm kiểm browser; clean checkout d1f95eb trước đó đạt 77 tests/16 nhóm browser. Đây là các snapshot/suite khác nhau, không cộng với 59 hoặc các suite mới thành một số “tổng test toàn dự án”.

### 7.4 Chưa có

Chưa có accepted labels, final-test lock, official F1/Ragas hoặc kết luận GraphRAG tốt hơn baseline. Còn thiếu full-repo retrieval/resolution, baseline lexical mạnh, graph+contract không LLM đầy đủ, API/Service prediction/scorer production và khả năng 3-hop/polyglot/gRPC tổng quát. Nhiều dependency chính đã pin nhưng chưa có full transitive lock.

## 8. Gemini, unknown và chi phí: lịch sử không được ghép nhầm

Tên `gemini-3.8-flash` là model **được request/ghi nhận trong provenance lịch sử của dự án**, không phải đề nghị model mới hoặc xác minh availability hôm nay. Nếu gọi lại phải check models/config và budget trong task tương ứng; không tự đổi model chỉ một phía để làm cặp pass.

| Mốc/run | Đã ghi nhận | Cách hiểu đúng |
|---|---|---|
| 12/10 `20261012T154435050Z-live-c20d99cf` | Graph-assisted legacy v1 smoke thật, 1 call/0 retry, hợp cấu trúc | Static graph-assisted v1, chưa semantic/vector retrieval; không chứng minh gold correctness |
| 13/10 các attempt cặp request v2 | Provider 503 ở cả hai cấu hình trong các lượt ghi nhận | Không lấy success v1 ghép thành cặp v2 |
| 15/10 `20261015T060100684Z-failed-9cc76ba2` Vector | JSON có STOP nhưng hai pure unknown thiếu citation bị validator cũ từ chối | Bất nhất prompt/schema/validator, không phải F1=0 |
| 15/10 `20261015T060348327Z-live-8cd62a51` Graph | Legacy request/2 structurallyvalid | Không chứng minh Graph hơn Vector |
| 15/10 `20261015T070159953Z-live-f5d5fdd6` Vector | Request/3 mới hợp contract, hai pure abstention ở client/controller | Unknown không phải negative; chưa đối chiếu gold được nghiệm thu |
| 15/10 `20261015T070330765Z-failed-1f789489` Graph | 503, usage null | Chưa có cặp cùng contract mới hoàn chỉnh |
| Bổ sung `20261015T075831543Z-failed-82a85f89` Graph | 503 UNAVAILABLE/high demand, 1 call/0 retry, usage/cost null | Không retry ngầm hoặc đổ lỗi chắc chắn cho key/Docker/billing |

Huy phê duyệt sửa unknown cho **cả hai cấu hình**, request `/3`, context retrieval `/2`, prompt `p01-static-impact/2`, validation `/2`. Citation có thể rỗng chỉ khi dependency/behavior/repair đều unknown, path là `[]`, hop/boundary là `null`, ID hợp lệ/không seed/không duplicate và rationale có nội dung. Record khác và summary vẫn cần citation. Xem `reasoning/p01/ABSTENTION_CONTRACT.md`.

Legacy giữ luật/trạng thái cũ; không revalidate response cũ với request mới để hồi tố rejected→pass. Quote/schema/path đúng chỉ là validation cấu trúc, không chứng minh quote hỗ trợ claim hoặc tác động hành vi đúng.

Comparison hiện hành: `handoff-out/p01-comparison/20261015T081222218Z-306e382a/comparison.json`, SHA-256 `2ad0fa10163d18e3a6fe7227327f7b40be8808ce0118ce62a41e28627cc8f9db`; nó trình bày bất cân xứng success/failure, không có official score.

Huy xác nhận project Free Tier, không bật billing. Không có paid fallback/budget rộng được duyệt. Free Tier không chứng minh mỗi request cost=0; `serviceTier=standard` cũng không xác minh billing. Missing usage/cost giữ null; providerfailure không là empty prediction/zero tokens/zero quality. Các lần Huy cho “đúng một lượt” không thành quyền retry vô hạn ngày mai.

Credential cục bộ DPAPI gắn Windows user/machine, Git ignored: `handoff-out/credentials/gemini-api-key.clixml`. **Không đọc/in/decrypt/đính kèm file đó vào bàn giao, không dán key lên chat.** Muốn chuyển máy thì người dùng tự cấu hình key bằng `scripts/configure_gemini_key.ps1`; không chuyển plaintext hay gọi private `-ReadForRunner` trực tiếp. DPAPI unit tests dùng dữ liệu tổng hợp; thiếu Windows profile trong sandbox phải báo thật, không bỏ test/đổi lưu plaintext để pass.

## 9. P02: thiết kế và baseline thực tế

### 9.1 Ca được Huy chọn

C02-A/P02: vẫn source/config pin PetClinic như P01; thêm `includeDetails` boolean **required=false, defaultValue="false"** ở seed, giữ body/consumer/DB/config. Cùng duplicate group với P01, thuộc development; không chia P01 thành dev và P02 thành unseen test.

Patch SHA-256 `091b04de4a504512cbda4e0c5c0759b747b056b4c7028923d8b7808b43303c4f`. Fixture raw SHA-256 `2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191`.

Fixture từ SQL nguồn: owner 6 Jean Coleman, pets 7 Samantha và 8 Max. Bốn visits: ID 1→pet 7/rabies shot/2013-01-01; ID 2→pet 8/rabies shot/2013-01-02; ID 3→pet 8/neutered/2013-01-03; ID 4→pet 7/spayed/2013-01-04. Owner 1 George Franklin/pet 1 Leo không có visits là đối chứng rỗng, không chứng minh fallback chạy.

Census **mọi method khai báo** không phải constructor và các mapping trong VisitResource, VisitsServiceClient, ApiGatewayController: 9 Method/4 API/2 Service; loại seed Method/API/owning Service còn 8/3/1. Giữ joinIds, setHostname, addVisitsToOwner, emptyVisitsForPets; không chọn universe theo prediction/reachability. Source DTO/model/SQL hỗ trợ không tự thành scored inventory. Không quảng bá full-repo recall.

Ma trận dự kiến: 10 requests × 2 snapshots × 2 repetitions = 40 slot, gồm 36 GET + 4 POST. DB mới mỗi nhóm; POST chạy cuối:

- Direct omit/true/false/empty/invalid includeDetails; diagnostic thiếu petId.
- Gateway owner 6 có dữ liệu và owner 1 rỗng; GET overload read(int).
- POST create_control trên DB do run sở hữu, reset sau; không POST vào server/DB người dùng.

Miền chính là request consumer hợp lệ cũ không gửi tham số mới. Invalid boolean/missing petId là diagnostic phải báo riêng, không dùng để tuyên bố request cũ hợp lệ bị gãy. Tên “control tương thích” không ấn định nhãn âm.

### 9.2 Baseline Huy đã chạy và Hiển tái lập

Build Huy: `handoff-out/p02-build/20261015T101851660Z-95cea45d`; baseline `handoff-out/p02-baseline/20261015T102355058Z-2e775d19`. Maven offline trong Docker network none/cache read-only build 5 services; config native đúng pin, Eureka và network nội bộ không publish host ports.

Quan sát thật: 9 GET scenario + 4 config/registry; provider và gateway đúng 4 visits và pet assignments; missing petId trả 400, các request baseline có includeDetails chưa được khai vẫn trả 200. Đối chiếu nội dung đầy đủ, không chỉ đếm/status. **Java application tests đã skip** (`maven.test.skip=true`); build pass không có nghĩa test Java pass. Có failure CRLF archive ban đầu được giữ, sau dùng Git blobs LF; chưa có full transitive dependency lock.

Hiển báo 24 Node + 5 Python probe tests, audit parser/Neo4j có file/dòng/giới hạn; không có implementation commit mới, chưa extraction/graph/output/mutation. ZIP SHA-256 `dd9a8ff6f10098f4bca25d9c9a866ed6a8655975880922f90aa565e23ca6832c`. Vòng kiểm ZIP trước đã xác minh outer 465/465, preparation 22/22, baseline 194/194; 82 stdout/stderr hashes và 20 code/spec/test files khớp gói gửi. Năm JAR không đính kèm, chỉ có metadata/hash: không nói đã kiểm byte binary trong ZIP. Có 13 cặp HTTP body/metadata và các fixture tuples đã đối chiếu; 90 readiness attempts gồm 85 lỗi transport và 5 success được giữ. Không phải AI đã chạy lại toàn bộ commands của Hiển.

Đủ bằng chứng bàn giao baseline/audit của Hiển, **không phải toàn P02**. Không cần Hiển làm lại baseline chỉ để sửa metadata khi source/config/fixture không đổi. Giữ JAR/cache/raw/log cho runtime bước sau.

### 9.3 Gói hai người đã gửi

Root `handoff-out/p02-team-handoff/20261015T111730650Z-5604cc22/`, riêng P02_HIEN và P02_PHAT. Gói Phát lọc system outputs/labels; có full source/config và permitted raw baseline, không “blinded” tuyệt đối vì đã biết census/thiết kế. Huy đã xác nhận gửi và cả hai đã trả lời; các packet ngày 15/10 còn nói chưa gửi/chưa ACK là trạng thái lịch sử, không ghi đè cuộc trao đổi mới.

Original PHAT ZIP SHA `7eeafca9bea6d21828ba44c585aaf0d6191302d13787be1d6ae1a67695a0690f`, verifier 399 files. Original HIEN ZIP SHA `f13b316163c2d199ea39fef23b863617dc67e9a0e75c0bfc0e6ff08c679483f2`, verifier 424 files.

## 10. Review Phát P02, F01/F02/F03 và bộ sửa hiện hành

### 10.1 Phát đã gửi gì?

Public review commit `00aa4dcc3eb8cb9a4706572b325e481316cbcad4`:

- `phat-p02-review/`: hồ sơ hiện hành, trước tên phat-p02-ACKNOWLEDGEMENT-review; RETURN/SOURCE_NOTES/checklist/input subset/hashes/proposal F02.
- `phat-p02-review_backup/`: local backup lịch sử/Git ignored, không thuộc commit bàn giao; không nhầm với hồ sơ hiện hành.
- Kết luận thật được ghi bằng tên **Phạm Nguyên Phát: CẦN SỬA**, chưa đủ điều kiện đề nghị khóa input; không phải approval nhãn.

Vòng audit trước đọc commit/ZIP qua public GitHub: 72 files, root manifest 71/71, subset inputs 58/58; 58 inputs khớp byte gói gửi. Không chỉ tin screenshot. Đây là integrity check, không tự chứng minh Phát tự kiểm mọi thao tác ghi trong checklist.

Exposure: đã xem draft/census/nhận định chuẩn bị; checkpoint trước exposure không được lưu, danh sách đầy đủ draft JSON trực tiếp mở còn thiếu. Không dựng checkpoint/timestamp/name mới để che việc đó. Lượt này là pre-label scope review, không phải blind review hoặc accepted ground truth.

### 10.2 F01 — nguyên nhân thuộc bộ chuẩn bị

Universe v1 khai `2a837540d0316d290401a1485ddeeb86a62a6f06447ccd75aa976fc2c5c8168a`, còn fixture ship `2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191`. Từ **cùng một file**, băm byte gốc cho `2a319...`; parse rồi JSON.stringify pretty + newline cho `2a837...`. Không phải bằng chứng nội dung fixture đổi, không mặc định là lỗi CRLF, không phải Phát sai. Builder cũ dùng hash reserialization nhưng ship byte gốc; test cũ tái tạo cùng lỗi nên thiếu cross-artifact invariant.

Huy đã cho sửa có version: bắt buộc raw fixture bytes, object phải khớp byte ship; checker độc lập đối chiếu fixture/scenario/universe/INPUTS. Giữ fixture dự định nguyên v1; không sửa fixture để làm vừa hash sai.

### 10.3 F02 — đường dẫn

Proposal gốc `evaluation_universe.draft.v3.paths-only.json` có 15 aliases/29 refs: 16 source refs và 13 patch refs, bốn file đích. SHA-256 proposal `b133526e1102f6082850171745295c39acbc84c61e1363900f40b5ebf5e407c3`. V3 trong tên bản làm việc **không phải** scenario/universe v3 được áp dụng; proposal giữ nguyên hash fixture lỗi nên không dùng nguyên trạng để khóa.

Candidate sửa dùng `input/app/...` và `benchmark/p02/preparation.v1/optional-query.patch`; **gốc giải quyết refs là gốc gói sau giải nén**, không thư mụcdraft/proposal/repoPetClinic. Không đổi alias IDs, seed/exclusions/projection/census.

### 10.4 F03 — vẫn chưa có runtime tương ứng

Chưa có mutated/POST/hai repetitions-reset/đủ 40 slot; chưa capture URI/query từ joinIds/getVisitsForPets, destination mặc định/setHostname, apply thật Function trả từ addVisitsToOwner, controlled fault/timeout cho fallback/circuit breaker. Gateway 200 hoặc empty response không chứng minh mọi helper/setter/fallback được exercise. Targeted helper tests có thể bổ sung nhưng không thay paired consumer E2E thật. F03 là giai đoạn sau thống nhất input, không tạo vòng lặp đòi đủ runtime mới được sửa metadata input.

### 10.5 Bộ candidate đã kiểm kỹ thuật, chưa nhận recheck

Gốc: `handoff-out/p02-input-revision/20261018T065307839Z-719da955/`.

| Artifact | Version / SHA-256 |
|---|---|
| `benchmark/p02/preparation.v2/scenario.json` | `0.1.1` — `762d993901f1388584adf066f396acd2ad46a7550f1f6b0b12dd6a8c61663ce9` |
| `draft/evaluation_universe.draft.v2.json` | draft.v2, scenario 0.1.1 — `d79c07727d6fb5348503f0e4079a0d18c63e26e6d34a1e332825f1cc7680aeb5` |
| Fixture v1 | `2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191` |
| Bundle manifest | `0358bf86bee591254483e50018f8d601932a8821a323176eaa10a80b86229539` |
| ZIP `P02_PHAT_RECHECK_0.1.1_20261018_719da955.zip` | 59.335 byte — `4e52aa2918d4e907af93296e40cbbdca8928978d9788c365d2dff76dc7e656d2` |

ZIP ở thư mục cha `handoff-out/p02-input-revision/`, có `.zip.sha256` và `.verification.json`. Có 31 files + manifest: source/support/license, spec, current draft, history universe/proposal, hướng dẫn/changelog/recheck template, provenance và mã chuẩn bị/test; không chứa accepted labels, predictions, score, credential hoặc raw runtime mới.

Code: `scripts/prepare_p02_inputs.mjs` mặc định v2; `scripts/prepare_p02_revision.mjs`; portable `scripts/verify_p02_revision.mjs`; regression `pipeline/p02/input-revision.test.mjs`; audit `scripts/audit_p02_input_revision.mjs`. V1 checker vẫn kiểm lịch sử nhưng báo `historical_integrity_only=true`, `admissible_for_new_input_lock=false` và F01/F02 known issues.

Records kiểm cuối: 75/75 offline Node tests, 0 skip; 31/31 file bindings ở gói tạo và bản ZIP đã giải nén; 2.109 file được bảo vệ không đổi (v1, old runs/hand-offs/raw baseline, prototypes, contract/experiment drafts). Log giữ lỗi phát triển đầu 27/28 do snapshot test chuyển Buffer→Uint8Array và lỗi CLI top-level-await import cycle đã sửa trước final run; không tuyên bố lần đầu đã pass.

Audit `handoff-out/p02-input-revision-audit/20261018-verification-64b92a0e/`, manifest SHA `700a6b9da347e9549bec39af4884a357ed05510cba1f529626a724e65286f7e7`. Chi tiết `tasks/research/P02_INPUT_REVISION_2026-10-18.md`; tin nhắn soạn sẵn `tasks/p02-handoff/SEND_PHAT_RECHECK_2026-10-18.md`. Gói đã sẵn để gửi, **chưa có xác nhận đã gửi/Phát đã kiểm bản mới**.

Snapshot mã mutated vẫn `3858f9c630cf989bb6809a86edf47c2be78dc9f1+P02-0.1.0-091b04de4a50` vì source + patch không đổi; scenario 0.1.1 chỉ sửa metadata.

**Ba bẫy drift:** register v3 vẫn trỏ universe v1 lịch sử `8c04bb...`; runtime fields trong scenario v2 vẫn giữ planning state not_started/false từ spec gốc, không phủ nhận G1 baseline có log riêng; runner/paired/handoff đời trước còn **layout v1**, chưa có adapter v2. Không nạp gói v2 vào runner cũ hoặc đổi flag cho qua. Chuyển adapter/runtime là task riêng sau quyết định input.

## 11. Các bước chuẩn bị offline khác, không nhầm là triển khai production

| Nhánh | Đã có | Phần chưa có / giới hạn |
|---|---|---|
| P02 paired dry-run | `pipeline/p02/paired-plan.mjs`: kế hoạch 40 slot, 4 nhóm, POST cuối, 8 mô phỏng lỗi; 24 test mới / 11 phép kiểm sửa artifact có chủ ý | Chưa có HTTP, khởi động app, reset hoặc cleanup thật; còn thiếu adapter runtime, build mutated và kiểm readiness/reset |
| Output contract | `docs/contracts/IMPACT_OUTPUT_CONTRACT.v0.1.DRAFT.md`, ID `microservice-impact-output/0.1.0-draft.1` | D01–D08 còn OPEN; chưa có phản hồi/chốt áp dụng từ Hiển/Phát; không đổi parser/Neo4j/prompt/scorer |
| Experiment design | `docs/experiments/EXPERIMENT_DESIGN.v0.1.DRAFT.md`, ID `microservice-cia-experiment/0.1.0-draft.1` | E01–E10 còn OPEN; chưa có runner hoặc manifest chấm điểm được duyệt; model, budget và cỡ mẫu cuối chưa chốt |
| Output validator prototype | `prototypes/impact-output-validator/`: 105 test mới và 195 test hồi quy chọn lọc pass | Chỉ kiểm registry/schema/ID/quote/path và ledger bản ghi trùng bằng dữ liệu toy; không xác minh ground truth, không chấm điểm, chưa tích hợp |
| Telemetry prototype | `prototypes/experiment-telemetry/`: 54 test mới và 249 test hồi quy chọn lọc pass | Clock và usage giả lập; chưa có adapter provider thật, đo thời gian/token thật, pricing, budget, scheduler hoặc persistence |

Draft output tách assessment trực tiếp ở cấp Method/API/Service, phân biệt unknown, omission, unsupported và failure; không tự projection Method → API → Service. Witness dùng Method IDs theo hướng caller → callee → seed, tách hop khỏi số lần vượt ranh giới dịch vụ. Có dependency chưa đủ để kết luận behavioral impact; repair phụ thuộc chiến lược sửa đã khai báo. Design manifest JSON không phải JSON Schema production. Scorer Boolean của Phát cần adapter được thống nhất trước khi chuyển unknown → null; nhãn unresolved không phải negative. Cách xử lý OOS, invalid, bản ghi trùng và mẫu số khi run thất bại còn phải chốt.

Telemetry dùng đồng hồ monotonic để tính duration và UTC để liên kết provenance; wall clock có thể quay lùi. Giữ các attempt thất bại, retry và span chồng lấp; không cộng các span chồng lấp rồi gọi đó là wall time. Usage thiếu dữ liệu giữ `null`, không phải `0`; mapping usage toy không phải mapping Gemini thật. Không tùy tiện cộng cached/thinking vào total hoặc suy Free Tier đồng nghĩa cost bằng 0. Log lượt đầu 49/51 test pass do lỗi fixture được giữ trước khi sửa; không sửa số đo P01/P02 cũ.

Evidence hiện tồn tại:

- Paired plan: `handoff-out/p02-paired-dry-run/20261015t114507111z-6c0a362c`, 14 mục trong manifest; `18a753bd14ae06e9a664dcbcc4ed7fe794e8eef80f1e845760bd3715f0d85e30`.
- Validator: `handoff-out/impact-output-validator/20261016-verification-7677170c`, 21 mục; `e38596084b9103523b19bfc55d195b355edd6e2f8c33572ad15aefe17c936b08`.
- Telemetry: `handoff-out/experiment-telemetry/20261016-verification-3f05513d`, 19 mục; `ae1a10f2bdd0cbc00d707d1afd861d6935e8be446b787a683fb89c43b7899032`.

Manifest của ba nhánh này và baseline 155/155 đã được kiểm lại chỉ đọc khi chuẩn bị bàn giao. Không tái chạy runtime hoặc model. Các số 137/170/195/249/75 là kết quả những suite ở các mốc có giao nhau; không cộng chúng và không dùng làm kích thước mẫu khoa học.

## 12. Nghiên cứu liên quan đã đọc và tác dụng với bài báo

Nguồn chi tiết: `tasks/research/LITERATURE_COMPARISON_2026-10-09.md`. Notes ghi đã đọc toàn văn có trọng tâm của 8 công trình; đây không phải systematic review hoặc tái chạy độc lập số liệu tác giả. Vòng bàn giao chỉ đọc lại notes, không tuyên bố đã đọc/xác minh lại toàn bộ các bài hôm nay.

| Công trình | Bài toán / contract / graph | Gold / split / baseline / metric và bài học |
|---|---|---|
| RepoCoder, EMNLP 2023 / arXiv v3 | Code completion Python, truy xuất lặp; không có contract hoặc graph microservices | Masked code/tests; lọc theo ngày repository không tự thay khóa dev/test; baseline in-file/RAG/oracle; EM/edit/pass; giới hạn duplication/latency |
| DraCo, ACL 2024 | Completion từ import/type/symbol, graph dataflow của entity | Held-out line; CrossCodeEval/ReccEval và date filters; RepoCoder/CCFinder; code/identifier match; giới hạn Python/model leakage |
| GraphCoder, ASE 2024 / arXiv v2 | Completion Python/Java, graph control/data dependence cấp statement | Masked line; 20 repository / 8.000 case, date filters; RAG/RepoCoder; code/identifier match, time/storage/tokens; không đánh giá behavioral CIA |
| RepoGraph, ICLR 2025 | Issue repair; code-line graph với invokes/contains, k-hop ego graph | SWE-bench tests/gold patch; Agentless/SWE-agent có/không graph; resolve/localization/cost; chủ yếu Python/Lite, nhiễu context |
| CodeRAG-Bench, NAACL Findings 2025 | Retrieval + code generation; không có graph hoặc contract riêng cho CIA | Canonical docs/execution tests; BM25/dense/rerank/oracle; NDCG, P/R, pass@k; context có thể gây nhiễu |
| Towards CIA, preprint v1 | Spring/REST component call graph + IR/change | 8 project, mutation + 25 thay đổi lịch sử, tác giả review; incremental so với full IR; cảnh báo tác động tiềm tàng, chưa chứng minh runtime breakage; không so sánh RAG |
| Cross-Repository Contract Testing… / K11, IJECS 2026 | OpenAPI/Proto/GraphQL/AsyncAPI, graph dịch vụ có hướng | 15 controlled / 59 external / 8 transitive / 8 drift; B1 diff / B2 graph / B3 LLM; P/R/F1/accuracy/uncertainty; external gold từ B1 có circularity risk |
| Original GraphRAG, preprint v2 | Query summarization trên document corpus, LLM entity graph/Leiden | LLM pairwise judging, không có CIA gold; Vector/text-map-reduce; win rate/claims/tokens; không phải code impact benchmark |

JSS 2025 CIA systematic review mới được xem metadata/abstract, **chưa đọc toàn văn**; không điền bảng như thể đã đọc. “Chưa nêu” trong notes không đồng nghĩa tác giả chắc chắn không thực hiện trong code.

Nguồn được lưu trong notes để AI chỉ có file này vẫn tra được đúng bài/bản; danh sách này không tuyên bố URL còn truy cập được hoặc paper vừa được đọc lại hôm nay:

- [RepoCoder — bản tác giả arXiv v3](https://arxiv.org/html/2303.12570v3); [hồ sơ EMNLP 2023](https://aclanthology.org/2023.emnlp-main.151/).
- [DraCo — ACL 2024, toàn văn proceedings](https://aclanthology.org/2024.acl-long.431.pdf).
- [GraphCoder — bản tác giả arXiv v2](https://arxiv.org/html/2406.07003v2).
- [RepoGraph — ICLR 2025, toàn văn proceedings](https://proceedings.iclr.cc/paper_files/paper/2025/file/4a4a3c197deac042461c677219efd36c-Paper-Conference.pdf).
- [CodeRAG-Bench — Findings NAACL 2025](https://aclanthology.org/2025.findings-naacl.176.pdf).
- [Towards Change Impact Analysis in Microservices-based System Evolution — preprint v1](https://arxiv.org/html/2501.11778v1).
- [Cross-Repository Contract Testing and Change Impact Analysis in Microservice CI/CD — IJECS 2026, gọi tắt K11 trong notes](https://www.ijecs.in/index.php/ijecs/article/view/5599).
- [From Local to Global: A GraphRAG Approach to Query-Focused Summarization — preprint v2](https://arxiv.org/html/2404.16130v2).
- [Change impact analysis in microservice systems: A systematic literature review — JSS 2025, trang metadata/abstract](https://experts.arizona.edu/en/publications/change-impact-analysis-in-microservice-systems-a-systematic-liter/).

K11 Table 8 loại UNCERTAIN khỏi TP/FP/FN nên F1 = 100% nhưng accuracy = 93,3%. External gold được dẫn xuất từ baseline, và việc reachable ở depth 2 không tự đồng nghĩa BREAKING, là các threats cần phân biệt. Không kết luận tác giả giả số liệu. Completion EM, identifier F1 hoặc tỷ lệ giải quyết issue không trực tiếp so được với CIA F1 ở cấp Method impact.

AI có thể giúp đọc/phân tích/định vị related work, viết draft với trích dẫn chính xác, tổ chức baseline/ablation/limitations. Huy vẫn cần hiểu và kiểm lập luận cùng các bài trọng tâm với thầy; không tuyên bố novelty chỉ dựa vào câu trả lời AI, không bịa nguồn hoặc kết quả. Nếu cần citation/claim mới hoặc phiên bản mới thì phải đọc nguồn chính thức phù hợp, không dùng snapshot notes làm xác minh thông tin hiện hành.

## 13. Kế hoạch thực nghiệm tạp chí — mới là đề xuất

RQ nháp: (1) chất lượng behavioral CIA, (2) đóng góp của graph/semantics/contract/hops, (3) failure/uncertainty/generalization, (4) trade-off giữa latency, token và cost.

| Baseline | Thiết kế đề xuất | Hiện trạng cần nhớ |
|---|---|---|
| B0 | Contract-diff rules, không LLM | Contract breaking không cùng target với behavioral CIA cấp Method nếu chưa có adapter/grounding |
| B1 | Reverse reachability 1/2/3 hop, không LLM | Baseline ứng viên; reachable ≠ impacted; traversal phạm vi hẹp của P01 không đồng nghĩa triển khai tổng quát, đầy đủ |
| B2 | Graph + contract/consumer rules, không LLM | Baseline mạnh quan trọng, chưa hoàn chỉnh |
| B3 | Lexical/BM25 + cùng LLM | Chưa đầy đủ |
| B4 | Vector RAG + cùng LLM | P01 đã có Chroma + smoke, chưa có full benchmark |
| B5 | Hybrid graph/semantic/explicit contract context + cùng LLM | P01 mới là prototype phạm vi hẹp, chưa phải toàn bộ phương pháp được đề xuất |

Phải so sánh công bằng về source, change, điều kiện known seed, model, prompt, output contract, context cap và policy cho attempt thất bại. Cùng 32.768 byte UTF-8 không đồng nghĩa cùng token/cost; graph context chứa callsite/metadata/fallback, không chỉ topology. Ablation graph/semantic/explicit metadata/topology/depth phải ghi rõ thay đổi cách chọn pool hay thay đổi thông tin biểu diễn; không đưa cạnh vào cấu hình “no graph” mà không khai báo.

Tách extraction accuracy, candidate retrieval và end-to-end CIA. Đo theo Method/API/Service, scenario/system/change type/hop; loại seed khỏi điểm lan truyền. Chốt policy unknown/OOS/invalid/partial/failed-run trước khi chấm. Abstention trên gold positive vẫn là FN trong end-to-end recall; selective F1 phải kèm coverage và metric trên toàn bộ gold. Quy ước cho trường hợp không có positive phải định trước, không tạo perfect F1 để trang trí. Ragas Faithfulness/Context Precision là thước đo bổ sung, không phải oracle cho nhãn CIA.

Scenario là đơn vị/cluster thí nghiệm; nhiều Method trong một scenario không tạo N độc lập. Split theo group/family/system trước tuning, lưu selection log và các phương án bị loại với lý do không dựa vào điểm. Ca đã dùng debug không thể đổi tên thành unseen final test. CI, phân tích ghép cặp, kiểm định thống kê, repetitions và multiple comparisons cần kế hoạch phù hợp với cỡ mẫu; bốn pilot không đủ để tuyên bố statistical power. Temperature 0 cũng không bảo đảm tính tất định tuyệt đối.

Chưa chốt venue, cỡ mẫu cuối, model/embedding/config chính thức, ngân sách API/token/tiền, repetitions/judge budget, scorer/projection/primary metric. E01–E10 còn OPEN; Method micro F1, B5 so với B4 là primary contrast **đề nghị**, chưa được áp dụng.

## 14. P03/P04 sẽ làm gì nếu sau này được chọn?

| Ca | Đề xuất từ source audit | Chưa làm và bẫy |
|---|---|---|
| P03/C03-A | PetClinic cùng pin; đổi key `pets` → `animals` trong response GET một owner tại một boundary, giữ consumer không đổi | Chưa chốt operator/patch/fixture/universe/runtime/labels. Không rename getter toàn cục làm mutation lan rộng; không mặc định Jackson/DTO sẽ trả 500 hoặc coi đây là thay đổi DB schema |
| P04/C04-A | Online Boutique, candidate commit `38e7348eb289eb5b87c0c6e8cb19ced0449dc389`; provider-only `GetProductRequest.id` đổi wire tag 1 → tag mới chưa dùng, regenerate provider, giữ legacy consumer | Chưa clone/build hoặc xác minh runtime/toolchain; chưa có labels. Không regenerate toàn bộ vì sẽ xóa mismatch; không tuyên bố hỗ trợ gRPC mọi ngôn ngữ hoặc tự triển khai cloud/GCP/Kubernetes/billing. Không rút ngắn hop để vừa giới hạn 3 |

P04 bắt đầu bằng subset Go/proto chạy local có evidence; full checkout/multilanguage E2E không nằm trong bằng chứng đã có. Nếu gặp feasibility blocker thì ghi đúng thực tế và xin quyết định điều phối; không âm thầm thay bằng ca dễ hoặc có điểm đẹp.

## 15. Gate hiện hành và review hai bước

G0 chọn ca/tiêu chí → G1 kiểm baseline khả thi → G2 đầu vào có version/khóa universe → G3 bằng chứng runtime và nhãn nháp độc lập → G4 output development sau khi ghi version/hash nhãn nháp theo protocol → G5 review gộp bởi người thật → G6 phê duyệt test/scoring riêng. Không mở tất cả gate chỉ vì một AI nhận định là ổn.

**Quyết định 15/10:** được chuẩn bị và phát triển P02–P04 trước khi P01 accepted và trước review gộp. Điều kiện cũ “chưa mở P02 trước khi duyệt P01” đã được thay thế. Nhãn vẫn pending; giữ source-first và chốt universe/hash trước khi gán polarity hoặc xem output hệ thống. Không ngầm cho phép final test/official score. Gemini 503 không chặn công việc không phụ thuộc API.

Kế hoạch review hiện hành là **một đợt gộp khi đủ hồ sơ**, vẫn gồm hai bước đọc:

1. Đọc source, patch, config, fixture, raw runtime, inventory, universe và mẫu ghi chú trống; chưa xem labels, summary, predictions hoặc scores. Người kiểm lưu ghi chú kèm bằng chứng, tên, thời điểm, hash, exposure và mức AI hỗ trợ thực tế; không đặt trước số positive/negative.
2. Sau khi lưu bản gốc mới đối chiếu nhãn nháp/version/hash; ghi `approve`, `request_changes` hoặc `unable_to_review` cùng bất đồng/unresolved. Giữ phiếu cũ, không sửa để khớp bản nháp. Nếu chép quyết định sang JSON, người ra quyết định phải xác nhận nội dung.

Repository public nên hai ZIP không bảo đảm blinding; đã xem gì phải khai thật. Reviewer không nhất thiết cài Neo4j/model; có thể đọc bằng chứng và đề nghị tái hiện HTTP nếu chưa đủ. Không mặc định thầy/anh đã nhận review mọi ca mới hoặc phải duyệt từng commit.

Chấp nhận nhãn, khóa final test/split kèm cho phép chấm chính thức, và công bố kết quả sau audit là **ba quyết định tách biệt**. Nhãn được duyệt không biến ca đã dùng debug thành test, cũng không chứng minh bài báo đã sẵn sàng. P01 chưa có quyết định nhãn thật được xác minh. Nếu Phát lập nhãn, người khác phải review; Huy/Hiển không ký duyệt ground truth của chính hệ thống mình xây.

## 16. Điểm dừng và lựa chọn khi Phát bận

**Đề nghị hôm nay:** dừng thay đổi thực nghiệm tại candidate P02 0.1.1/draft.v2 đã kiểm offline, hoàn thiện hồ sơ bàn giao. “Context đầy đủ” nghĩa là nêu rõ cả phần chưa xong, không phải tất cả công việc đã hoàn thành.

Ngày mai có ba hướng hợp lệ, không tự chọn thay Huy:

- **Chờ người thật kiểm lại:** Phát khi rảnh hoặc người khác được Huy chỉ định, có chuyên môn và mức độc lập phù hợp. Ghi đúng danh tính/exposure; không ký thay Phát.
- **Tiếp tục phần không vượt gate:** audit chỉ đọc, soạn nháp Introduction/Related Work/Methods/Threats to Validity, lập kế hoạch adapter/test tổng hợp, rà tài liệu tham khảo và dữ liệu hiện có. Task code/thí nghiệm mới cần Huy giao rõ; không tự thay hợp đồng dùng chung.
- **Chủ động thay quy trình/nhân sự:** Huy/thầy quyết định version, attribution và threats to validity nếu thật sự cần; không giả độc lập. Chưa có phê duyệt hướng này. AI không dùng thông tin “Phát bận” làm phép bỏ gate hoặc tự chốt universe.

Không cần làm thay toàn bộ công việc của Phát hoặc đợi tới P04 mới bàn giao. Huy/AI có thể hỗ trợ phần cơ học, nhưng không thể vừa xây phương pháp vừa tự duyệt gold labels rồi gọi đó là independent review. Không tuyên bố toàn dự án phải đứng im; chỉ báo “cần người thật” ở đúng bước, đồng thời giữ các công việc hợp lệ khác.

## 17. Lệnh tiếp nhận an toàn cho AI ngày mai

Đây là **tham chiếu**, không cấp quyền chạy mọi lệnh. Ngày mai bắt đầu bằng đọc và báo cáo, chờ Huy chốt task tiếp theo.

```powershell
Set-Location 'E:\NCKH\code-graphrag-microservices'
Get-Content -LiteralPath PROJECT_CONTEXT.md -Raw
git -c safe.directory=E:/NCKH/code-graphrag-microservices status --short
git -c safe.directory=E:/NCKH/code-graphrag-microservices branch --show-current
git -c safe.directory=E:/NCKH/code-graphrag-microservices rev-parse HEAD

# Kiểm candidate P02 có sẵn, chỉ đọc; không prepare/run ứng dụng:
node scripts/verify_p02_revision.mjs --root handoff-out/p02-input-revision/20261018T065307839Z-719da955

# Xác minh ZIP đúng được bàn giao:
Get-FileHash -LiteralPath handoff-out/p02-input-revision/P02_PHAT_RECHECK_0.1.1_20261018_719da955.zip -Algorithm SHA256

# Các checker P01 có sẵn, không Gemini/Docker:
node scripts/check_p01_pipeline.mjs --run handoff-out/p01-pipeline/20261015T082522708Z-0539ac7d
node scripts/check_p01_retrieval_run.mjs --run handoff-out/p01-retrieval/20261012T151104176Z-89ba55ec
node scripts/prepare_p01_abstention.mjs --check handoff-out/p01-contract/20261015T064526833Z-96bc2152
```

Các checker trên xác minh artifact trong phạm vi đặc tả, không nghiệm thu nhãn. Nếu thiếu thư mục/commit, báo missing và xin đúng gói; không tự download, giải nén ghi đè hoặc giả dữ liệu.

Viewer tùy chọn khi Huy yêu cầu minh họa: mở `demo/p01/index.html` hoặc chạy `node demo/p01/server.mjs`, vào `http://127.0.0.1:8787`; dùng `Ctrl+C` để dừng server. Không tự mở/tắt Docker hoặc container của người dùng. `node scripts/run_p01_pipeline.mjs prepare` **chạy parser/Neo4j/Chroma và tạo run mới**, không phải checker chỉ đọc. Runner baseline P02 chạy ứng dụng; reasoning live có thể gọi API. Không chạy chúng chỉ vì README có liệt kê lệnh.

Không tự fetch/pull/commit/push/merge, thiết lập credential, gọi API, bật billing, chạy mutation/POST, tải model hoặc chấm điểm trong lượt nhận bàn giao. Nếu được yêu cầu ở lượt sau, phải ghi input, version, run mới, commands, exit code, log, hash và giới hạn; không sửa log cũ.

## 18. Bản đồ file đọc sâu theo nhiệm vụ

| Mục cần làm | Tài liệu đầu tiên |
|---|---|
| Quy tắc/điều phối | `PROJECT_CONTEXT.md`, `tasks/P02_P04_EXECUTION_PLAN.md`, `tasks/P02_P04_TASK_PACKETS.md` |
| P01 đã kiểm/thiếu gì | `tasks/P01_CLOSEOUT.md`, `pipeline/p01/VERIFICATION_2026-10-13.md`, `tasks/research/P01_TECHNICAL_VERIFICATION_2026-10-12.md` |
| P01 chạy chuẩn bị | `pipeline/p01/README.md` |
| Viewer/reasoning | `demo/p01/README.md`, `reasoning/p01/README.md`, `reasoning/p01/ABSTENTION_CONTRACT.md` |
| Model/unknown/503 | `tasks/research/P01_GEMINI_SMOKE_SUCCESS_2026-10-12.md`, `tasks/research/P01_PAIRED_DEMO_2026-10-15.md`, `tasks/research/P01_ABSTENTION_LIVE_2026-10-15.md` |
| Related work cho bài tạp chí | `tasks/research/LITERATURE_COMPARISON_2026-10-09.md` |
| Candidate P02 hiện hành | `tasks/research/P02_INPUT_REVISION_2026-10-18.md`, `benchmark/p02/preparation.v2/START_HERE.md`, `benchmark/p02/preparation.v2/CHANGELOG.md`, `benchmark/p02/preparation.v2/RECHECK_TEMPLATE.md` |
| Nội dung gửi Phát | `tasks/p02-handoff/SEND_PHAT_RECHECK_2026-10-18.md`; không tự gửi hoặc nói Phát đã nhận |
| Baseline/kế hoạch chạy cặp P02 | `pipeline/p02/README.md`, `pipeline/p02/PAIRED_DRY_RUN.md`, `tasks/research/P02_BASELINE_VERIFICATION_2026-10-15.md`, `tasks/research/P02_PAIRED_DRY_RUN_2026-10-15.md` |
| Nháp hợp đồng đầu ra/thực nghiệm | `docs/contracts/README.md`, `docs/experiments/README.md`, `docs/contracts/REVIEW_CHECKLIST.v0.1.DRAFT.md`, `docs/experiments/REVIEW_CHECKLIST.v0.1.DRAFT.md` |
| Prototype offline | `prototypes/README.md` và README từng prototype/báo cáo ngày 16/10 |
| Reviewer | `tasks/p01-reviewer/P01-ROUND1-START-HERE.md`, `tasks/p01-reviewer/NEXT_REVIEW_MILESTONE.md` |

`tasks/p01-reviewer/COORDINATOR.md` còn placeholder `{{BENCHMARK_SHA}}`; không dùng chi tiết trong template để kết luận gói thật chưa pin. Quy trình review và pin mới nhất theo hướng dẫn hiện hành. Không sửa template hoặc gói lịch sử chỉ để xóa dấu vết trạng thái cũ.

## 19. Bẫy dễ mất khi đổi AI

1. Đọc context 25/9 rồi kết luận tới nay chưa kiểm Neo4j/full suite 59 test: sai mốc thời gian.
2. Đọc packet 15/10 ghi “chưa ACK” rồi nói Hiển/Phát chưa làm: sai mốc; cả hai đã trả lời.
3. Gọi nhận xét thầy/anh là accepted labels: sai gate.
4. Đồng nhất P01 với toàn hệ thống PetClinic hoặc gọi P04 là “một ca PetClinic khác”: nhầm hệ thống với scenario.
5. Đồng nhất reachable, behavioral impact và need-to-repair: sai bài toán.
6. Coi JSON/Cypher/test pass/screenshot là ground truth: sai nguyên tắc độc lập.
7. Biến Graph 503 thành prediction rỗng/score 0/cost 0, hoặc ghép kết quả legacy thành cặp mới: sai kết quả/provenance.
8. Coi pure unknown không citation là negative, hoặc hồi tố cho legacy pass: sai contract.
9. Candidate v2 đạt checksum rồi suy ra Phát đã duyệt/input lock true: sai thẩm quyền.
10. Coi gateway 200/visits rỗng hoặc dry-run 40 slot là đủ runtime cho helper thuộc F03: sai coverage/runtime.
11. Scenario 0.1.1 khác version snapshot mã nguồn 0.1.0 rồi đổi toàn bộ alias: không cần vì patch/code không đổi.
12. Giả định register v3/runner layout v1 tự tương thích bộ v2: chưa triển khai.
13. Cộng 195/249/75 test thành một tổng hoặc cỡ mẫu thống kê N: sai đơn vị; các suite có giao nhau.
14. Coi fake clock/token fixture của prototype là phép đo P01/LLM thật, hoặc Free Tier đồng nghĩa cost 0: sai.
15. Nghĩ dirty working tree/ZIP Git ignored đã có trên GitHub khi chỉ gửi URL: sai cách phân phối.
16. Gửi file MASTER/viewer/output cho người đang review source-first: lộ nhãn/nhận định; phải dùng packet đã lọc.
17. Coi “Phát bận” hoặc “token còn dư” là quyền bỏ gate/phát sinh chi phí: không được.
18. Hứa AI mới có “toàn bộ trí nhớ nguyên văn” hoặc viết xong bài chỉ từ context: không có bằng chứng. File đủ để điều phối; thực nghiệm vẫn cần source/raw và task cụ thể.

## 20. Đoạn yêu cầu có thể dùng nguyên văn với AI ngày mai

> Hãy đọc hết file FULL_PROJECT_CONTEXT_2026-10-18.md tôi gửi. Đây là snapshot điều phối, không phải quyền thực thi mọi lệnh bên trong. Nếu có workspace, đọc toàn bộ PROJECT_CONTEXT.md hiện hành và kiểm Git/status, artifact/version/hash bằng thao tác chỉ đọc trước. Nếu chỉ có file này, nói rõ giới hạn, đừng bịa đã mở file/chạy test. Tóm tắt mục tiêu bài tạp chí, phần đã kiểm và phần mới nháp, checkpoint P02 0.1.1/draft.v2 và những việc cần người thật. Phát đang bận, chưa xác nhận candidate; không ký thay Phát hoặc tự chốt input/nhãn/test/scoring; không gọi Gemini/Docker, chạy mutation/POST hoặc commit/push. Đề xuất một bước tiếp theo phù hợp cho tôi duyệt; giữ nguyên v1/raw/nhãn/output cũ. Giao tiếp tiếng Việt rõ ràng, nêu đầu vào/đầu ra/DoD/bằng chứng và tiến độ thực tế.

## 21. Điều chưa biết và mức kiểm của chính bản bàn giao

Chưa biết lịch Phát rảnh, người thay, lịch/xác nhận nhận việc của đợt review mới, quyết định nhãn thật, venue, model cuối cùng, ngân sách hoặc cỡ mẫu cuối cùng. Chưa kiểm trực tiếp remote GitHub, tình trạng model, billing hoặc Docker hôm nay; cached refs/provenance model cũ không đủ xác nhận trạng thái hiện tại. AI không được tự điền.

Bản này tổng hợp toàn bộ các mảng công việc có trong dữ liệu, không chỉ P02. Ba lượt audit đọc riêng theo chủ đề đã rà lịch sử/nghiên cứu, P01 và P02/các bản nháp; không ai ký thay người thật. Có kiểm trực tiếp một số metadata, manifest, hash và chạy checker P02 chỉ đọc; không tái chạy tất cả suite/runtime/API khi làm context. Các số “đã kiểm độc lập ngày 12/10”, 75/75 và các lượt smoke là kết quả của đúng lượt tương ứng, không phải kết quả chạy mới khi tạo file này.

Nguồn lịch sử có thể chưa đầy đủ mọi lời đáp trong chat; ghi “chưa xác minh/chưa ghi nhận” thay vì tự dựng sự kiện. Khi có thông tin mới, bổ sung snapshot/decision kèm ngày và lý do; giữ nguyên hồ sơ frozen. **Bàn giao đầy đủ không đồng nghĩa nghiên cứu hoàn tất.**
