# Microservice Impact Benchmark Protocol v0.1

Status: proposed for Huy review

Author/annotator owner: Phát

Prepared with: Codex (evidence organization only)

Created: 2026-09-23T14:42:17+07:00

## 1. Purpose and scope

This protocol defines how P01–P04 scenarios are identified, evidenced, labelled, reviewed, frozen and scored. It covers method, API and service impact caused by a fixed source change in a microservice system. It does not define parser, Neo4j, RAG or LLM implementation details, and their outputs are never label evidence before freeze.

Each scenario is independently reproducible and records:

- scenario ID and version;
- repository and immutable baseline commit;
- configuration revision where relevant;
- patch identity, encoding and scenario kind;
- fixture and observable preconditions;
- seed and impacted entities;
- source, contract and runtime evidence;
- annotator, reviewer, decision and freeze checksum.

## 2. Scenario identity and versioning

- `scenario_id` is stable (`P01`, `P02`, ...).
- `scenario_version` uses semantic versioning.
- A changed repository commit, patch semantics, fixture population, impact definition or hop rule requires a new scenario version.
- A correction that changes any scored label requires a new label version. A frozen file is never edited in place.
- `scenario_kind` is one of `synthetic_mutation`, `historical_change` or `natural_failure`.
- Near-identical mutations against the same endpoint/call path form one `duplicate_group` and cannot be split across development and final test sets.

## 3. Entity identity

Method identity is:

```text
repository@commit::service::class_fqn#method(parameter_types)
```

API identity is:

```text
repository@commit::service::HTTP_METHOD normalized_path
```

Service identity is repository, snapshot and service name. Method names alone are invalid because overloads can exist. Paths are normalized with a leading slash and without query values; declared and sent query parameters are stored separately.

## 4. Seed, impact and repair scope

- **Seed** is the changed method/API contract. It is stored separately and excluded from propagation scores.
- **Dependency** is a source/contract/runtime-supported relationship. Reachability alone is not proof of behavioral impact.
- **Behavioral impact** means a different observable result under a fixed fixture: status, error, response content or missing/incorrect data.
- **Requires code change** is a separate repair label. It records whether that entity must change under the selected repair strategy; it is not inferred from behavioral impact.
- A seed's containing service may be retained as context but is excluded from service-level propagation scoring unless the protocol explicitly defines a non-seed impacted service.

## 5. Hop and service-boundary rules

Edges use caller-to-callee direction. Impact analysis from a changed callee traverses dependencies in reverse.

- Direct `INVOKES_API` between consumer method and provider handler is one logical hop.
- Direct `CALLS` between methods is one logical hop.
- Service/file/class containment edges do not add hops.
- Introducing an API node in a storage schema must not change logical hop count.
- `service_boundary_crossings` is counted separately from logical hops.
- Hop values must be established from source, contract or runtime evidence, never copied from the evaluated graph.

## 6. Label values

Each candidate entity records:

- `polarity`: `positive`, `negative` or `unresolved`;
- `behavioral_impact`: `true`, `false` or `unresolved`;
- `requires_code_change`: `true`, `false`, `conditional` or `unresolved`;
- `logical_hop` and `service_boundary_crossings`;
- evidence references, rationale, confidence and review status.

### Positive

An entity is positive when a fixed change causes a reproducible observable difference at that entity under the scenario fixture, supported by source/contract and, for a behavioral claim, a clean runtime observation.

### Negative

An entity is negative only when it was selected by a documented criterion before viewing evaluated-system output, is in the real repository, is plausibly confusable or comparable, and evidence shows unchanged behavior under the same baseline/mutated fixture. Synthetic parser fixtures are not behavioral negatives.

### Unresolved and pending review

- Use `unresolved` when the target, path, behavior or repair requirement cannot be concluded from available evidence.
- Use `pending_review` when evidence exists but independent human review is incomplete.
- An unverified negative candidate is excluded from scored labels until its baseline/mutated observation is complete.

## 7. Evidence hierarchy

Evidence is evaluated by claim type, not by a single universal rank:

1. **Immutable source and patch:** proves declarations, call expressions and exact changed lines; does not prove runtime behavior.
2. **Official framework/HTTP contract:** proves declared semantics such as required parameters; does not prove application configuration or fallback behavior.
3. **Clean runtime evidence:** proves the observed behavior for the recorded build, fixture and environment; does not generalize beyond them.
4. **Historical/noisy runtime evidence:** may guide rerun design but cannot independently justify `accepted`.
5. **Derived summaries:** valid only when they name their raw inputs and transformation.

Parser, Cypher, Neo4j, retrieval, GraphRAG, Vector RAG, LLM output and benchmark scores are prohibited label evidence.

## 8. Runtime reproduction

Every scenario attempts these observations, or records a blocker with raw diagnostics:

1. clean baseline direct provider request;
2. clean baseline gateway/consumer request;
3. mutated direct request missing the new parameter;
4. mutated direct request with a valid parameter;
5. mutated gateway/consumer request;
6. selected negative case on baseline and mutated snapshots.

The run record includes timestamp, command, exit code, HTTP status, full response body, relevant service logs, fixture IDs, repository commit, patch hash, Java/Maven/Docker versions and unique baseline/mutated image identities. Cache identity must not be assumed from a mutable tag.

## 9. Two-person review

- The annotator creates the candidate label file from allowed evidence.
- A different named reviewer checks provenance, evidence coverage, hop calculation, negative selection and repair labels.
- The reviewer chooses `approve`, `request_changes` or `unable_to_review` and records reasons.
- Disagreements remain explicit. Huy arbitrates changes to shared definitions or schema.
- Phát cannot approve a label file annotated by Phát.
- AI can organize evidence and validate schemas/checksums but cannot occupy either human role.

## 10. Development/test split and leakage control

- Group by repository, changed contract, call path and mutation template before splitting.
- All scenarios in a near-duplicate group stay in the same split.
- Final test scenarios and labels are frozen before any benchmark method is run on them.
- Repair commits, label text, expected paths and later fixes are excluded from model/retrieval context.
- Only after label checksum freeze may evaluated-system output be opened for scoring/error analysis.
- Discovery of a label error after exposure creates a new label version, links the old checksum, documents the independent evidence and triggers re-scoring. The old file remains immutable.

## 11. Freeze procedure

1. Validate JSON syntax and required fields.
2. Confirm prohibited system output has not been accessed.
3. Ensure every scored label references evidence.
4. Record annotator and reviewer status.
5. Compute SHA-256 of the immutable label file into `checksums.sha256` with a UTC/offset timestamp in the review log.
6. Set the freeze state. Do not edit the file afterward.
7. If review/runtime remains incomplete, freeze it as `provisional_frozen`; it is leakage-safe but not accepted ground truth.

## 12. Audit decision

- `accepted`: provenance, required runtime observations, real negative case, two-person review and frozen checksum are complete.
- `pending_review`: evidence is sufficient for review but the second human decision is outstanding.
- `reproduce_required`: missing/invalid runtime evidence or environment prevents the required observations.

No decision states or implies that GraphRAG outperforms any baseline.

## 13. Required package

```text
benchmark/
  protocol/benchmark_protocol_v0.1.md
  pNN/
    scenario.json
    labels.vN.json
    evidence_manifest.json
    review_log.md
    checksums.sha256
    raw/
    derived/
```

Raw files are immutable. Derived material must name all inputs and transformations. JSON files use UTF-8, LF, stable key ordering where practical and repository-relative paths with `/`.
