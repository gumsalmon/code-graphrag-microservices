# P01 Independent Benchmark Review — Handoff

Task: P01 independent benchmark review

Branch / implementation commit: `Pham_Nguyen_Phat` / `8df54be52432b2b2b01b29f78a35298d2ca7154a`

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
- `benchmark/p01/labels.v2.json` (current provisional freeze)
- `benchmark/p01/evidence_manifest.json`
- `benchmark/p01/review_log.md`
- `benchmark/p01/checksums.sha256`
- `benchmark/p01/raw/`
- `benchmark/p01/derived/`

Rerun command and environment: a clean source checkout and patch apply check were completed. Docker 29.5.3 and Compose v5.1.4 are installed, but the Docker daemon was unavailable. Maven is absent from `PATH`; the repository Maven Wrapper is present. Full diagnostics and the required rerun sequence are in `derived/runtime_rerun_attempt.md`.

Observations reproduced:

- repository commit and clean tracked tree;
- source snapshot identity;
- patch content and semantic applicability after exact UTF-16LE-to-UTF-8 transcoding;
- source-level provider/client/controller contracts and two-hop candidate dependency;
- official Spring `RequestParam` required-parameter contract.

Observations not reproduced:

- clean baseline direct and gateway HTTP observations;
- clean mutated missing/valid parameter and gateway observations;
- clean baseline/mutated negative behavioral case.

Label status: `reproduce_required`

Current label checksum and freeze time:

- `labels.v2.json` SHA-256: `910d15049e580bdd193c3ee5b35740e0c164a1a7f9d90640506cd10893408bde`
- freeze: `2026-09-23T14:52:00+07:00`

Annotator: Phát

Reviewer: unassigned; Huy must designate a different eligible human. AI is not a reviewer.

Disagreement / unresolved:

- original patch encoding is not directly consumable by `git apply`;
- mandatory clean runtime evidence is absent;
- proposed real-repository negative case is not scored until runtime verification;
- reviewer identity and decision are missing.

Limitations / threats to validity:

- `PROJECT_CONTEXT.md` exposed the expected candidate path, creating expectancy bias;
- historical runtime files are noisy or incompletely traceable;
- P01 is one synthetic pilot and cannot support a general comparison claim;
- no parser, Neo4j, GraphRAG, Vector RAG, LLM output or score was used as label evidence.

Proposed next step: Huy assigns an eligible reviewer and provides a Docker-capable environment. Run the matrix in `derived/runtime_rerun_attempt.md`; if evidence changes any label, create `labels.v3.json`, preserve v1/v2 and record a new checksum/review event.
