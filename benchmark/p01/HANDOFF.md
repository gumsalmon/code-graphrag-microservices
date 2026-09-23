# P01 Independent Benchmark Review — Handoff

Task: P01 independent benchmark review

Branch: `Pham_Nguyen_Phat`

Protocol version: `0.1` (proposed for Huy review)

Baseline commit / config revision / patch hash:

- `3858f9c630cf989bb6809a86edf47c2be78dc9f1`
- `323993ce2519c6d02df63e08bf4458d123d3b611`
- `42394ca361d07db58ba6a73cfc1ddb8bd1d9aeddb59292873552573adfa5cc21`

Input hashes confirmed: 18/18 package entries matched the supplied manifest. Three source snapshots also matched a fresh official checkout byte-for-byte.

Artifact paths:

- `benchmark/protocol/benchmark_protocol_v0.1.md`
- `benchmark/p01/scenario.json`
- `benchmark/p01/labels.v1.json` (superseded, immutable)
- `benchmark/p01/labels.v2.json` (superseded, immutable)
- `benchmark/p01/labels.v3.json` (current provisional freeze)
- `benchmark/p01/evidence_manifest.json`
- `benchmark/p01/review_log.md`
- `benchmark/p01/checksums.sha256`
- `benchmark/p01/raw/`
- `benchmark/p01/derived/`

Rerun command and environment: run `scripts/run_p01_runtime.ps1`. Docker 29.5.3 and Compose v5.1.4 executed distinct baseline/patched image IDs. The authoritative raw run is `benchmark/p01/raw/rerun-20260923-152742/`; the concise account is `derived/runtime_rerun_report.md`.

Observations reproduced:

- repository commit and clean tracked tree;
- source snapshot identity;
- patch content and semantic applicability after exact UTF-16LE-to-UTF-8 transcoding;
- source-level provider/client/controller contracts and two-hop candidate dependency;
- official Spring `RequestParam` required-parameter contract.
- clean baseline direct and gateway behavior;
- patched missing-parameter `400` and valid-parameter `200` behavior;
- patched gateway `200` with empty visits after proving that the gateway reached the patched provider;
- unchanged baseline/patched negative overload behavior.

Observations not reproduced:

- none of the mandatory protocol v0.1 runtime observations.

Label status: `pending_review`

Current label checksum and freeze time:

- `labels.v3.json` SHA-256: `3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce`
- freeze: `2026-09-23T15:32:00+07:00`

Annotator: Phát

Reviewer: unassigned; Huy must designate a different eligible human. AI is not a reviewer.

Disagreement / unresolved:

- original patch encoding is not directly consumable by `git apply`;
- reviewer identity and decision are missing.

Limitations / threats to validity:

- `PROJECT_CONTEXT.md` exposed the expected candidate path, creating expectancy bias;
- historical runtime files and two discovery-timing attempts are retained but excluded from the authoritative causal claim;
- P01 is one synthetic pilot and cannot support a general comparison claim;
- no parser, Neo4j, GraphRAG, Vector RAG, LLM output or score was used as label evidence.

Proposed next step: Huy assigns an eligible reviewer who verifies provenance, the authoritative runtime matrix, hop counts, repair labels and negative selection. Approval may change the decision to `accepted`; requested corrections must create a new immutable label version rather than editing v3.
