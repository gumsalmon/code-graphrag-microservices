# Methods working draft: evidence-grounded change impact analysis

Draft 0.1, 1 November 2026. Authoring assistance: project coordinator AI. Human authors must verify and revise the text before submission. The completed components described below are scoped development work. The final evaluation campaign, independently accepted labels and comparative results are not yet available. References E01–E12 resolve through the [evidence map](EVIDENCE_MAP_2026-11-01.md) and its byte-identity snapshot; they are internal provenance references, not a completed scholarly bibliography.

## 1. Task and observation domain

We study change impact analysis in microservice source code. A case specifies a baseline source revision, configuration revision, provider-side patch, seed entities, fixture and observation domain, and an evaluation universe. The target is a behavioral assessment for eligible Method, API and Service entities under those declared conditions. We distinguish behavioral change from a structural dependency and from a requirement to repair code. A caller may depend on an altered provider without exhibiting a behavioral difference under a particular fixture; alternative repair strategies may also place code changes in different components. [E01, E02]

Source facts, contract interpretation, runtime observations and inferred conclusions are recorded separately. A negative assessment is restricted to the declared comparison and evidence; absence of a graph node, path, observed event or returned prediction is insufficient to establish a negative behavioral label. Insufficient evidence is retained as unresolved. Repair requirements are considered separately under an explicit strategy and are not substituted for the behavioral target. [E01, E04]

The intended prediction setting is static, before deployment, with a known seed. Permitted predictor inputs are pinned baseline source/configuration and the proposed change information declared for the experiment. Paired runtime observations, annotations, reviewer notes and gold paths belong to the independent evidence/evaluation stream. The proposed prediction setting is distinct from the baseline/mutated extraction experiments used to check the implementation. [E06, E09, E11]

## 2. Development cases and input identity

The current development work uses Spring PetClinic Microservices source revision `3858f9c630cf989bb6809a86edf47c2be78dc9f1` and configuration revision `323993ce2519c6d02df63e08bf4458d123d3b611`. The selected changes are controlled mutations; they are not presented as historical production incidents. P01 and P02 share an endpoint/change family and remain in the same near-duplicate development group. The three cases are not an unseen test set or evidence of cross-system generalization. [E01–E03, E11]

| Case | Controlled provider change | Declared scope and present status |
|---|---|---|
| P01 | Add a required boolean query parameter, without a default, to the visits collection handler; retain its response body logic and the consumer | Pilot with source/runtime and scoped parser/Neo4j verification; draft labels await independent acceptance |
| P02 | Add the boolean query parameter with `required=false` and `defaultValue="false"`; retain the handler body and consumer | Scenario 0.1.1, universe draft.v2, fixture v1; after seed exclusion, 8 Method, 3 API and 1 Service IDs; checked draft checkpoint, labels still pending review |
| P03 | Rename the owner response key `pets` to `animals` at the provider boundary using a response Map; retain the consumer and shared entity/getter | Scenario 0.1.0, universe draft.v1; six top-level class/record declarations in scope, with 26 Method, 4 API and 1 Service eligible IDs after seed exclusion; input and paired runtime checked, annotation checkpoint not yet received |

The P03 operator changes the exposed response representation. It is not a database migration or an implementation of general serialization/dataflow analysis. For the newly prepared P02/P03 cases, eligibility was fixed from the declared source/contract scope before their draft labels and before evaluated outputs for those cases were generated. P01 remains a legacy development pilot with prior exposure, not a retrospectively preregistered case. Source support files and implicit record members are not automatically promoted to eligible explicit Method entities. [E01–E03, E08]

For each case, identities bind the source/configuration revisions, patch bytes, fixture, scenario, scope, universe and declared aliases. Scope or semantic changes require a new version. The evaluator distinguishes levels and overloads; it does not identify methods by an unqualified name. Cross-snapshot aliases require source evidence and are retained with the raw identifier, rather than inferred by fuzzy matching. [E01–E03]

## 3. Runtime evidence collection

Runtime evidence is collected independently of the evaluated parser/retriever. P02 and P03 runners use disposable, run-owned service stacks and internal networks, with baseline and mutated groups separated. Build, image, source, configuration, command, exit status, fixture and request/response identities are retained. Input/configuration and protected artifacts are checked for preservation, and cleanup is recorded. Controls, repetitions and reset observations are linked to the corresponding group instead of being counted as additional independent scenarios. [E04, E05]

The P02 F03 measurement contains baseline/mutated groups with two repetitions per snapshot and explicit fixture reset. It includes direct provider requests, gateway requests and POST/readback controls. An additional helper measurement uses unchanged compiled gateway classes and logs its transformations. In that measurement a provider-only `pets[].type.id` field is removed in a declared consumer DTO input projection; the full raw response and projected representation are retained separately. Direct setter execution and fallback subscription support only the stated helper experiment, not a claim that the production caller or callback was traced. [E04]

The P03 paired measurement includes a populated owner, an owner without visits, an owner with an empty pet collection, selected missing-owner observations, list/Visits controls and create/update/readback operations. Setup identifiers are read from actual responses, and reset is verified before each group. Lifecycle readiness is checked independently of the business response schema: requiring the baseline response key during readiness would otherwise reject the very mutation being measured. Such measurement failures and subsequent fixes are retained as development history. [E05]

Observation counts, repeated requests and technical test counts describe measurement coverage; they are not the sample size of an independent comparative study. Maven application tests were skipped in the recorded offline application builds and are not claimed as executed. Runtime collection and targeted probe tests provide separate evidence and do not replace that application test suite. [E04, E05]

## 4. Static extraction and dependency representation

The Java prototype uses Tree-sitter and pattern-specific resolution rules. Its supported REST path extracts method signatures, HTTP mappings, provider query declarations, client request expressions and selected intra-service calls. Provider query metadata distinguishes declared and effective requirements and records defaults. Client parameters actually sent are kept separate from provider declarations. Resolution combines service identity, HTTP method and normalized path; unresolved expressions and assumptions, including use of a default hostname that may be changed by a setter, are preserved. This is scoped framework analysis, not a complete Java call graph or a whole-repository microservice resolver. [E06, E07]

For logical dependency analysis, let `G=(V,E)` contain Method vertices and directed `CALLS` or `INVOKES_API` edges from caller to callee. A direct consumer-to-provider-handler invocation contributes one logical hop. Storage containment and endpoint-to-handler bindings do not add logical hops. The number of service-boundary transitions is recorded separately from path length. Endpoint/Class/Service storage entities may support provenance without changing this logical definition. [E01, E06, E07]

For seed Method `s` and depth `k` in `{1,2,3}`, the reverse dependency candidate set is:

```text
C_k(s) = { v != s : a recorded resolved path v -> ... -> s has length 1..k }.
```

These sets and their witness paths are retrieval candidates, not behavioral labels or independently established ground-truth paths. The seed is retained for context and excluded from the propagated candidate set. A path matching the supplied graph is only a graph consistency check; it does not establish semantic correctness of a behavioral conclusion. [E01, E06]

## 5. Neo4j and technical integration checks

The P02 technical run checks baseline and mutated source separately. Each snapshot uses a fresh Neo4j database container. Direct import and generated Cypher are each repeated on the same snapshot and their stored outputs are compared. The checker verifies the recorded Method/Endpoint/query/edge metadata, saved retrieval paths and source chunks. Raw input hashes, source spans, full graph dumps and the outcomes of these checks are retained. Current native keys are not intrinsically snapshot-qualified; separation is provided by the database/container boundary rather than by an asserted key migration. [E06, E07]

This verification remains incomplete in two respects. The recorded direct import lacks the `Class.name` property present in the Cypher route. The native graph also represents only four of the eight eligible non-seed Method IDs in the scoped P02 inventory. These differences are reported as open implementation limitations. Missing entities are not treated as behavioral negatives and the evaluation universe is not reduced to the extracted graph. P03 extraction/graph integration has not yet been run under a checked annotation receipt; a syntax-level response survey is not evidence of resolved serialization or producer–consumer dependencies. [E06, E08]

## 6. Retrieval, context and response validation

The P01 pilot includes real Chroma retrieval over its declared baseline-source corpus and graph-assisted context preparation with the same change/seed information. The source request is checked before enrichment, and retained provenance distinguishes source excerpts, patch and derived static graph evidence. Depth limits constrain graph expansion. A byte budget is recorded in the pilot; equal bytes are not asserted to provide equal total-request token budgets. Tokenizer, full-request caps and packing policy remain decisions for the final comparison. [E09, E11]

P01 also implements an explicit pure-abstention response policy shared by both configurations in its revised request contract. A record with unknown dependency, behavior and repair may omit citations only with an empty path, null hop/boundary counts and a reason for insufficient evidence. Any supplied citation is still checked. Identifier, overload, seed, quote and path validation are structural checks, not independent validation of the explanation's semantics. Historical requests and responses retain their original contract versions. [E10]

At this checkpoint, a structurally valid Vector smoke response and a failed Graph+Vector attempt under the revised contract do not form a completed paired quality comparison. The provider failure is retained as a failed attempt, not recast as an empty prediction. General Method/API/Service response formatting, projection and score adapters remain draft designs; their prototype tests do not establish adoption. [E10–E12]

## 7. Annotation and independent review status

The benchmark protocol separates builders of the evaluated system from annotation and independent acceptance. Evidence for annotations is source, patch, contract and appropriately scoped runtime, rather than parser, Neo4j, retrieval or model output. The current P02 annotations are AI-assisted drafts with recorded human responsibility and exposure. A grouped statement of reading is recorded as the participant's self-report, not as independent authentication of physical reading, per-file timestamps or blinding. Reviewer fields and label acceptance remain unresolved; a P03 annotation checkpoint is still awaited. [E01, E08]

The planned batch review uses two stages. First, a reviewer different from the annotator records source/raw-based notes, evidence and exposure; the original notes are saved and hashed. Second, the reviewer compares those notes with versioned drafts and records agreements, disagreements and a decision for each case. Any revisions preserve the prior notes and labels, and a decision binds the exact label version/hash. This process has been prepared, not completed. Prior public exposure and AI use must be reported as they occurred rather than reconstructed as blind review. [E01, E12]

Technical integration is authorized per case after a draft checkpoint is checked; it does not require accepted labels. Conversely, checksum/test success does not confer label acceptance. Decisions about final test splits and official scoring are separate from the development integration authority. [E02, E08, E12]

## 8. Proposed comparative evaluation — not yet executed

The draft experiment design proposes Vector RAG plus an LLM as the main retrieval comparator, with lexical retrieval, topology reachability and graph/contract rules as additional controls. The full proposed GraphRAG configuration combines semantic selection, graph context and explicit contract/consumer metadata with an LLM. Those names are registered design candidates, not a claim that every baseline, level or rule engine is implemented. The proposed primary contrast is B5–B4 at Method micro F1; this endpoint and the rest of the design have not been adopted. [E11]

The planned comparisons hold permitted corpus/change/seed conditions and the LLM identity, prompt/output format and total-request token ceilings fixed within a comparison family. Depths 1/2/3 and metadata/selection ablations are distinguished. A metadata representation ablation holds source chunks fixed; it does not assert that contract semantics have disappeared from source annotations. A graph-free control must not inherit hidden graph-selected evidence. Aliased configurations are not counted as independent methods. [E11]

Under the benchmark protocol, behavioral Precision/Recall/F1 are defined separately for Method, API and Service after canonicalization and seed exclusion. Repair is a separate target. Micro scores aggregate TP/FP/FN within a level; macro scores are supplementary. Zero denominators use the declared `zero_division=0` convention with support reported, rather than treating an empty positive set as perfect performance. These are protocol definitions, not computed results. [E01]

Unknown and omitted predictions must retain distinct coverage records; they do not remove gold positives from recall's denominator. Unsupported levels, invalid/out-of-scope predictions, unjudged entities, partial results and failed attempts require explicit accounting. The complete failure/partial-output policy and scorer adapter have not been settled, so no official score is reported. Ragas is planned as supplementary explanation/context evaluation, not as a substitute for independently reviewed impact labels. [E01, E10, E11]

Final model/embedding revisions, chunking/top-k, token/call/cost budgets, repetitions, scenario selection/holdout, uncertainty analysis and statistical procedures are still open. Runtime repetitions do not count as independent change scenarios, and the current PetClinic development cases cannot establish generalization across systems. No final test set, official F1/Ragas, confidence interval, p-value or superiority claim is present in this draft. [E11, E12]

## 9. Reproducibility and current limits

The working records bind input, implementation and artifact identities, including dependencies/cache/image information where recorded, commands and raw outputs. Failed runs and provider errors are retained; later corrections create new artifacts. Raw observations are preserved alongside declared derived views. A small exception in a copied blank historical template is documented without rewriting the original copy or representing the entire handoff as byte-identical. [E04–E10, E12]

The manuscript must report the remaining threats explicitly: a single current application repository; controlled, scoped mutations and near-duplicates; selected fixtures and partial inventory; helper measurements that do not prove production callback coverage; a pattern-specific resolver; incomplete serialization/dataflow support; non-blinded AI-assisted annotation drafts; pending independent acceptance; incomplete model pairing and token fairness; and local artifacts/code changes not yet released as a new public revision. Technical tests, a saved-evidence viewer and matched hashes do not by themselves resolve these limitations. [E01–E12]

The draft therefore describes a developing method and evidence collection process. It does not establish that GraphRAG improves change impact analysis over a fair baseline. The text and evidence snapshot must be versioned as the remaining implementation, review and experiment decisions are completed.
