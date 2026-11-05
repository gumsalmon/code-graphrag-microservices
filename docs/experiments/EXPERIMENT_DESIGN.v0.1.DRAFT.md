# Thiết kế thực nghiệm Code GraphRAG — v0.1 nháp

Ngày 15/10/2026. ID: `microservice-cia-experiment/0.1.0-draft.1`.

**Chưa phê duyệt áp dụng, chưa chạy thí nghiệm mới.** Đây là đề xuất cụ thể hóa [ghi chú nghiên cứu 09/10](../../tasks/research/LITERATURE_COMPARISON_2026-10-09.md), không thay PROJECT_CONTEXT.md, protocol benchmark, scorer hoặc hợp đồng output đang dùng. Model, test set, cỡ mẫu, token/call budget và statistical test cuối đều chưa được chọn. Không có điểm F1, CI hoặc kết luận hiệu quả trong bản này.

## 1. Bài toán và phát biểu có thể kiểm chứng

Với baseline source/config, một provider patch và fixture/domain đã được xác định trước, dự đoán **behavioral impact** ở Method/API/Service; tách phụ thuộc cấu trúc, điều kiện hành vi và phạm vi cần sửa mã. Thí nghiệm chính dự kiến là static pre-deployment, known seed. Không chứng minh impact đúng bằng việc một node reachable hoặc một quote khớp source.

Đóng góp ứng viên cần được kiểm: context dựa trên dependency/contract/consumer usage có cải thiện dự đoán so với retrieval và luật không LLM hay không; cải thiện đến từ chọn nội dung, biểu diễn metadata, reasoning hay đơn giản thêm token. Mọi chênh lệch có thể bằng 0 hoặc bất lợi; không đặt giả thuyết thành kết luận hoặc chọn ca theo score.

Các căn cứ đã đối chiếu lại có phạm vi hẹp:

- CodeRAG-Bench đánh giá cả retrieval và generation; bài không phải CIA. Nhóm mượn cách tách lớp đánh giá và đối chiếu lexical/dense, không lấy metric completion làm impact F1. [CodeRAG-Bench, §§2.4, 3.2–3.4](https://aclanthology.org/2025.findings-naacl.176.pdf).
- RepoGraph §5.2/Table 4 có các biến thể hop/context cho kết quả khác nhau. Vì vậy nhóm sẽ đo depth và token/noise, không mặc định nhiều hop hơn tốt hơn; đây là suy luận thiết kế cho CIA, không phải kết quả CIA của bài. [RepoGraph](https://proceedings.iclr.cc/paper_files/paper/2025/file/4a4a3c197deac042461c677219efd36c-Paper-Conference.pdf).
- Towards CIA lưu ý giới hạn xấp xỉ của phân tích tĩnh. Nhóm giữ riêng cảnh báo cấu trúc và ground truth hành vi theo fixture. [Towards CIA, §V.F–VI, preprint v1](https://arxiv.org/html/2501.11778v1).
- Lựa chọn kiểm định phụ thuộc metric và thiết kế; bootstrap không tự giải quyết mẫu nhỏ. Đề xuất ghép cặp/cluster bên dưới là thiết kế của nhóm, không phải khuyến nghị CIA đã được các tác giả kiểm chứng. [Dror et al., §§3.1–3.3](https://aclanthology.org/P18-1128.pdf).

Chỉ kiểm lại các phần liên quan, không tuyên bố tái đọc toàn văn mọi công trình hoặc tái hiện code/số liệu của tác giả trong lượt này.

## 2. Câu hỏi nghiên cứu và đối chiếu đăng ký trước

| RQ | Câu hỏi | Đối chiếu dự kiến | Phép đo và giới hạn |
|---|---|---|---|
| RQ1 — chất lượng | B5 có cải thiện behavioral impact so với retrieval không graph và luật không LLM không? | **Chính đề nghị: B5–B4**; thứ cấp định trước B5–B3, B5–B2, B5–B1 | Method micro P/R/F1 và ΔF1; API/Service riêng, cùng coverage/failure. Chưa đủ support hoặc level chưa hỗ trợ thì không claim cấp đó |
| RQ2 — thành phần | Semantic selection, explicit contract metadata và depth đóng góp thế nào? | Ablation A-G/A-S/A-C/A-T và depth 1/2/3; so B5–B2 riêng | Cùng config nền/budget, ghi thay đổi candidate/actual tokens; phân biệt single-mechanism và bundle comparison |
| RQ3 — độ tin cậy | Những dạng change/usage/overload/fallback nào gây sai, unknown hoặc failure? | Slice đã định trước theo source/protocol, không chọn slice bằng score | FP/FN, unknown/omitted/unresolved/unsupported, alias/extraction failure, zero-positive cases; không lấy sample minh họa làm thống kê độc lập |
| RQ4 — tài nguyên | Độ đúng đổi ra sao theo latency, context và chi phí, tính cả run hỏng/indexing? | B1–B5, token ceilings và cache regimes đã chốt | Online wall time, offline/index time, native usage/cost provenance, failure rate; không bỏ overhead hoặc giả missing usage=0 |

Đề nghị chọn **Method micro F1, B5 so B4** làm một primary endpoint/contrast để hạn chế chọn kết quả thuận lợi sau chạy. API/Service là endpoints thứ cấp định trước, không được bỏ khi bất lợi; các claim về LLM phải xét thêm B2. Đây chưa phải quyết định áp dụng. Nếu nhóm muốn co-primary levels/contrasts thì chốt family và xử lý multiple comparisons trước test, không đổi sau xem kết quả.

## 3. Bộ baseline — giữ ID B0–B5 đã có

| ID | Cấu hình đề nghị | Đích so sánh | Tình trạng hiện tại |
|---|---|---|---|
| B0 | Diff + contract compatibility rules, không graph/LLM | Contract violation, **không ngang bài toán impact set** | Đề xuất; chưa có reference contract labels/scorer riêng được duyệt |
| B1 | Reverse reachability 1/2/3-hop; heuristic coi candidate reachable là predicted impacted | Baseline topology có thể thừa positive; không phải ground truth | Có traversal kỹ thuật P01, chưa có baseline scorer ba cấp hoàn chỉnh |
| B2 | Graph + contract/consumer-usage rules, không LLM; thiếu căn cứ thì unknown | Comparator mạnh để hỏi LLM có giá trị ngoài rules không | Đề xuất, chưa có rule engine hoàn chỉnh được nghiệm thu |
| B3 | Lexical/BM25 retrieval + cùng LLM | Đối chứng retrieval không graph | Đề xuất, chưa triển khai/đo cho CIA |
| B4 | Vector retrieval + cùng LLM | Baseline so sánh chính dự kiến | Có prototype P01 Method-only và smoke thật; chưa là benchmark chính thức |
| B5 | Semantic retrieval + graph expansion + explicit contract/consumer metadata + cùng LLM | Phương án đầy đủ cần kiểm | P01 có graph-enriched context, chưa chứng minh toàn bộ pipeline/metadata/rules dự kiến hoặc lợi ích phương pháp |

Không gọi B0 là thất bại trên Method/API/Service vì nó giải bài toán khác. Muốn nối contract diff sang downstream impact phải khai báo phương pháp mới gần B2 và reference tương ứng. Không so F1 endpoint-breaking với F1 Method-impact như cùng target.

B1 cố ý là heuristic prediction để đo over-approximation, không biến reachable thành nhãn. Resolver có thể dùng endpoint/service metadata để dựng cạnh, nhưng B1 không dùng required/default/consumer-usage để quyết định impact. B2 cần luật có version/evidence và quy tắc unknown, không hardcode ID/impact set P01. B3/B4/B5 cùng prompt/output/model contract trong cùng experiment family; phương pháp không LLM không bị ép dùng LLM.

Level API/Service của B1/B2 chưa có adapter/projection được thống nhất. Báo unsupported nếu chưa có, không tự suy từ Method hoặc gán F1=0 để đưa vào bảng so sánh ba cấp. B0/B1/B2 không được ghi đã triển khai chỉ vì có parser, Cypher hoặc test traversal.

## 4. Ablation và điều được phép kết luận

| ID | Thay đổi so B5 | Giữ cố định / phải đo | Kết luận tối đa |
|---|---|---|---|
| A-G | Bỏ graph route và derived graph evidence; tương ứng B4 khi config còn lại trùng | Corpus/query/seed/model/prompt/caps; không lén giữ candidate paths hoặc graph-selected helper pool | So sánh bundle graph-assisted vs vector, không chứng minh riêng topology hoặc contract |
| A-S | Bỏ semantic retrieval; lấy source theo graph từ known seed | Resolver/metadata/hop/seed/patch/caps; ghi candidate IDs đổi và fallback bị tắt | Giá trị của semantic selection trong pipeline graph đã định |
| A-C | Bỏ **explicit contract metadata** khỏi context, giữ graph/candidate IDs/source chunks giống nhau | Không dùng contract filter để đổi pool trong contrast này; raw annotations/source vẫn tồn tại, tokenizer/packing phải ghi | Đóng góp biểu diễn metadata đã dẫn xuất, không tuyên bố đã xóa mọi kiến thức contract |
| A-T | Graph topology-only representation: bỏ derived contract/consumer/rule annotations nhưng giữ cạnh và cùng source pool | Giữ identifiers/endpoint identity tối thiểu để nhận diện cạnh; không giấu derived conclusions trong prose/retrieval scores | Đóng góp của metadata enrichment; raw source vẫn có thể chứa semantics |
| H1/H2/H3 | Độ sâu logical 1/2/3 | Cùng corpus/seed/output cap/token ceiling; ghi candidate/context thực thay đổi | Trade-off depth/context/noise, không giả path dài hơn luôn tốt hơn |
| LLM comparator | Thay LLM bằng rule engine B2 | Graph/source facts chung trong phạm vi khả thi; ghi rõ predictor/format/cost khác | **Không phải ablation một biến sạch**; chỉ là đối chiếu hai decision procedures |

A-G alias B4 không được chạy/đếm như một phương pháp độc lập bổ sung nếu toàn config trùng. B5 đã có depth được chọn thì variant H tương ứng cũng là alias, không tăng N bằng đổi tên.

Với H1, gold universe vẫn là cùng universe đã khóa cho family/hop limit chung; positive 2/3-hop không được loại khỏi denominator chỉ vì không vào traversal H1. Phân tích theo hop dựa source/contract/runtime/reference độc lập, không lấy độ sâu do graph phương pháp đang được đánh giá trả về.

Nếu thực sự muốn kiểm contract-guided **selection/filtering**, thêm contrast khác có ID/version trước chạy; không trộn với A-C đã cố định pool. Không dùng LLM summary bổ sung vào một phía mà quên cộng call/token/latency.

## 5. Kiểm soát đầu vào, packing và tính công bằng

Một experiment family cố định source/config/patch/fixture/domain/universe/alias, input policy, seed mode, model identity, prompt/output version, cache regime và replication policy. Registry không chứa polarity/hop gold/reviewer notes. Không dùng label hoặc future repair để định query, chunk hay path.

Đề nghị hai track tách biệt:

1. **Deployment-style equal ceiling:** cùng trần tổng input/output tokens và cùng corpus được phép, mỗi phương pháp tự chọn context; đo actual usage. Graph có thể thêm metadata nhưng không vượt cap. Chênh lệch là toàn pipeline, không phải topology thuần.
2. **Matched-information/packing diagnostic:** giữ source chunk IDs và patch/seed giống nhau rồi bật/tắt representation/metadata; tokenizer và context cap chung. Đây là chẩn đoán cơ chế, không thay headline triển khai. Không dùng gold để chọn shared chunks; cần quy tắc deterministic đăng ký trước.

Đếm trần cho toàn request: system prompt + source/patch + metadata + registry + output-schema overhead theo khả năng tokenizer/provider, không chỉ text chunks. Mandatory seed/patch/registry phần cần thiết chiếm budget của mọi phương pháp như nhau; nếu không vừa thì input_not_packable, giữ lỗi, không bỏ seed hoặc xén âm thầm. Byte count chỉ là chỉ số phụ, **32768 bytes hiện tại không chứng minh cùng số token**.

Packing cần version/hash và deterministic tie-break (ví dụ score rồi stable chunk ID), ghi danh sách selected/dropped chunk/evidence, actual tokens/bytes và lý do cắt. Không chặt giữa quote/AST span mà vẫn gán vị trí nguồn cũ. Không thêm padding không liên quan chỉ để làm số token bằng nhau; dùng cùng ceiling và sensitivity analysis đã định trước. Values cụ thể của top-k/chunk strategy/context cap/output cap còn null, chốt trên dev và ngân sách trước test.

Known seed là điều kiện chính dự kiến. Tự định vị seed từ mô tả là track riêng, báo localization error trước propagation; không gộp vào nhận xét “graph traversal kém”. Không đổi model/embedding/provider một phía để cứu attempt lỗi. Shared source availability không có nghĩa shared derived graph/metadata trong control không graph.

Schema/ID/quote checks cần cùng chính sách trong family. Các mức kiểm path khác nhau do có/không supplied graph phải được báo đúng scope; source-inferred path không được tự coi verified, graph-match cũng không thành gold. Policy validation/partial ảnh hưởng điểm phải chốt trước theo output contract, không chọn cách loại record khác nhau để tạo lợi thế một phía.

## 6. Dữ liệu, independence và split

P01 development vĩnh viễn ở đợt thiết kế này; P02 cùng duplicate group P01, đã chọn development và baseline thật, còn chờ xác nhận đầu vào/paired runtime. P03/P04 vẫn ứng viên chưa mở. Bản ghi chú 09/10 nói P02 chưa mở là lịch sử tại thời điểm đó, không ghi đè trạng thái 15/10.

P01–P04 dùng sửa parser/prompt/process thì không thể đổi tên thành final unseen test về sau. Cần campaign mới: nguồn scenario/historical events, eligibility, selection order, cả ca bị loại/blocker, duplicate group và phạm vi hệ thống khai báo trước nhãn/output. Không chọn/bỏ ca bằng score, số positive hoặc vì retriever dễ tìm.

- Group gần trùng ở cùng split; nếu đủ hệ thống xem xét repository holdout, nếu không thì group holdout và ghi limitation. Không hứa nhiều domain chỉ với hai hệ thống.
- Static input được phép: baseline source, static config và dependency manifests đã pin, proposed provider diff, seed và fixture specification được biết trước. Raw runtime dùng tạo nhãn ở luồng độc lập, **không vào prompt/index** của primary track.
- Không đưa mutated/repair follow-up source ngoài changed declaration mà bài toán cho phép, expected paths, benchmark rationale, output/scorer/reviewer artifacts hoặc test labels vào retrieval. Với historical change, pin thời điểm snapshot và quy tắc lọc future commits/tài liệu.
- Developer có thể tạo graph/index, nhưng người lập nhãn không lấy chúng làm evidence. Annotator và reviewer khác nhau; notes source-first trước đối chiếu draft. Unknown output khác unresolved gold; chưa adjudicate universe thì chặn official score, không biến unresolved thành negative.
- Không đổi scope để tránh missing entity sau xem output; version mới + lý do + review lại và rescore kết quả liên quan khi được phép.

Quy mô cuối, số repository/group/scenario, phân bố operator và historical/mutation chưa chốt. Khả năng source/runtime và ngân sách annotation phải được kiểm trước. Không tự chọn một con số “đủ journal” hoặc tuyên bố power từ bốn pilot.

## 7. Metric, failure và coverage

Tách ba lớp: extraction đúng entity/edge; retrieval có reference context/candidate phù hợp; end-to-end behavioral impact. Extraction/retrieval cần reference độc lập riêng nếu muốn báo precision/recall; test parser hoặc graph tự sinh không làm gold của chính nó.

Primary dự kiến theo protocol v0.2: P/R/F1 từng level, micro chính, macro bổ trợ; TP/FP/FN/support/invalid/OOS/unjudged và seed diagnostics. Không gộp ba level thành một F1; repair tách riêng. Giữ zero_division=0, positive_support=0 được báo; compatible scenario không tự nhận perfect F1 khi prediction/gold đều rỗng. Có thể báo false-positive count hoặc compatible-case acceptance theo định nghĩa chốt riêng, chỉ sau nhãn thật.

Prediction unknown hoặc omitted trên gold positive vẫn không vào predicted-positive set nên là FN trong full-universe recall; không bỏ chúng để nâng recall. Unsupported level ghi N/A + lý do, không được trình bày như kết quả ba cấp đầy đủ. Invalid/OOS positive giữ ledger và xử lý FP theo protocol; record không xác định được level, conflict duplicate và partial policy còn phải thống nhất với Phát trước scoring adapter.

Với failure, luôn lưu mọi planned run/attempt, denominator và nguyên nhân. Báo execution success coverage, structurally-valid coverage, abstention/omission coverage theo eligible universe; `1 - unknown_rate` không phải toàn bộ coverage nếu còn omitted/failed. Success-only quality là conditional/subset diagnostic; nếu hai phương pháp có failure khác nhau không dùng subset đó để kết luận ưu thế toàn hệ thống.

Policy failed/partial run đi vào primary quality thế nào **còn mở**. Một sensitivity có thể là “failed run treated as all-abstaining” trên ledger đánh giá, nhưng không ghi thành raw empty model prediction và chỉ được áp sau phê duyệt. Chưa chốt policy thì chưa phát sinh official score hoặc p-value.

Explanation đánh giá riêng path/quote/semantic support; graph self-consistency không phải reference độc lập. Human explanation audit cần sampling plan sau khóa nhãn, không dùng rationale hệ thống sửa nhãn. Ragas chỉ supplementary, judge/model/budget riêng, không được âm thầm gọi provider hoặc xem là CIA ground truth.

## 8. Đơn vị thống kê và biến thiên

Đơn vị thực nghiệm là change scenario; Method/API/Service là quan sát lồng trong scenario, duplicate groups lồng trong hệ thống. Lặp LLM hay runtime không tạo scenario/hệ thống độc lập. Báo rõ bốn số: hệ thống, nhóm gần trùng, scenario, repetitions; không dùng số node/test kỹ thuật làm N nghiên cứu.

So sánh ghép cặp trên cùng units/configs đã chốt; chọn paired estimand và denominator trước khi xem test. Đối với micro F1, phải resample/swap paired units rồi **tính lại tổng TP/FP/FN và F1**, không dùng trung bình scenario F1 thay cho micro mà không khai báo. Repetitions báo biến thiên theo scenario và cùng lịch lấy mẫu; không chọn best-of-R hoặc vote mà chưa đăng ký một method/call budget riêng.

Đề nghị xem xét paired resampling/randomization ở cấp duplicate group, có cấu trúc repository; phải xét số cluster và estimand. Chỉ hai repo/ít group không cho CI đáng tin về mọi hệ thống tương lai; conditional within-system analysis không được gọi là cross-system generalization. Final test/statistical procedure, mức CI, số lần resample, effect-size threshold và multiple-comparison correction còn null, chốt khi có sample design và tư vấn phù hợp. Không bootstrap bốn pilot rồi dùng p<0.05 như chứng nhận journal.

## 9. Phép đo tài nguyên và provenance

Mẫu [measurement-template](measurement-template.v0.1.draft.json) là chỗ trống, không collector hoặc log thật. Khi triển khai cần:

- Offline: source preparation, parser/resolver, graph import/index, embedding/index build, cache preparation; thời gian/CPU/RAM/index bytes và dependency/model hashes nếu đo được. Không tính tải model miễn phí hoặc giấu bước preload; cold/warm/cache-ready báo riêng.
- Online: query construction, retrieval, traversal, metadata/packing, provider request wall time, validation/normalization, total wall time. Đo monotonic timer cho duration; UTC timestamps để liên kết artifact. Tổng online wall time không mặc định bằng cộng các stage nếu có chạy chồng lấp.
- Native usage: giữ payload gốc đã làm sạch secret, input/output/thinking/cache token fields và mapping version của provider. Không cộng những trường có thể overlap rồi gọi là total tokens; không coi trường không có là 0. Local token estimate và provider usage là hai phép đo khác.
- Cost: thực chi và ước tính tách biệt; rate/currency/source/access date/pricing revision chưa có để null. Free Tier không tự chứng minh measured cost=0, cost null không phải miễn phí. Khi chọn model mới kiểm giá/quota chính thức và duyệt budget riêng, chưa làm trong lượt này.
- Failed/timeout/retry: giữ latency, usage đã nhận, remote receipt ambiguity và tất cả attempts. Không chỉ báo attempt thành công hoặc chi phí attempt cuối. Không có retry vô hạn, tự thay model hay paid fallback.
- Amortization: có thể báo `index_cost / Q + online_cost` khi Q, cache validity và workload được đăng ký; Q hiện null. Không tự giả Q lớn để che build/index overhead.
- Không ghi credential hoặc credential path trong telemetry; sanitize provider echoes. Các metric chưa đo là null, không điền latency/token/F1 minh họa như kết quả.

Khi scoring được cho phép, report liên kết riêng label/version/hash, review decision/checksums, split, scorer/adapter/failure-policy revision. Các binding đánh giá này **không phải input model/retrieval**; template để trống trong một nhóm riêng để tránh trộn hai luồng.

## 10. Triển khai theo tầng, không mở một grid lớn ngay

T0 hiện tại: chỉ thiết kế/check tài liệu, 0 API/model/runtime calls. T1 sau thống nhất phạm vi: kiểm offline lexical/rules/packing và synthetic harness, không nhận là đã đo CIA. T2 sau input/draft gate và duyệt API budget: chạy smoke cặp nhỏ có cùng config, kiểm ledger và fail closed, không gọi là official result. T3 chỉ sau protocol/contract/config/split/scoring gates riêng: thực nghiệm đã đăng ký, tất cả runs/attempts và lỗi giữ lại.

Chưa có số calls được duyệt. Dự toán bằng tổng số repetitions trên các cặp `(scenario, unique method configuration)` có LLM, cộng mọi sub-call/judge/retry theo policy; không nhân cả B0/B1/B2 thành LLM calls và không đếm alias ablation hai lần. Thời gian/tokens/cost indexing tính riêng. Không nhầm 40 HTTP slots P02 hoặc hai runtime repetitions với số LLM repetitions.

Gate dừng thật: cần Phát/Huy xác nhận universe/alias/fixture; chưa thống nhất output/scorer/failure policy; thiếu reference/review; cần quyền/tài nguyên/model budget mới; tới khóa test/scoring. Không yêu cầu reviewer ký vì tests pass, không tự ghi thành viên nhận việc/duyệt format, không dùng provider 503 làm lý do đổi nhãn.

## 11. Những gì phải chốt trước áp dụng

Xem [checklist E01–E10](REVIEW_CHECKLIST.v0.1.DRAFT.md): target/primary contrast; baseline/rules readiness; ablation semantics; packing/token budget; candidate selection/holdout; model/calls/cost; failure/scorer/projection; replication/statistics; telemetry; rollout/approval. Các decision để open; phần đang làm của Hiển/Phát không bị thay hoặc giao lại.

Tài liệu này hoàn tất ở mức proposal khi có RQ→contrast→metric→limitation rõ, điều kiện công bằng, data/leakage/failure/statistics/budget và phép đo có thể kiểm. Không cần và không được bịa kết quả để “hoàn thành” bước chuẩn bị.
