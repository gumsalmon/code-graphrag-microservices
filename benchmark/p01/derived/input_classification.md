# P01 Input Classification

All hashes were recomputed before classification. Raw failures are retained unchanged.

| File | Classification | Use |
|---|---|---|
| `api_gateway_mutated.log` | raw/supporting | Config revision and diagnostic context; not sufficient alone for impact labels |
| `baseline_results.log` | derived/clean-looking but weak provenance | Rerun hypothesis only |
| `build_baseline.log` | build provenance | Environment/build support |
| `build_mutated.log` | build provenance | Environment/build support |
| `docker-compose-test.yml` | historical environment config | Rerun design; mutable image tags prevent identity proof |
| `mutation.patch` | change input with encoding defect | Authoritative original bytes/hash; canonical UTF-8 transcode required for `git apply` |
| `run_baseline_results.txt` | invalid/noisy | Retain; do not use for success claim |
| `run_mutated_results.log` | mixed raw result | Supports rerun hypothesis; begins with request error |
| `run_mutated_results.txt` | invalid/noisy | Retain; do not use for success claim |
| `test_baseline.ps1` | historical script | Audit/reference; error handling is insufficient |
| `test_mutated.ps1` | historical script | Audit/reference; first request throws before later catch logic |
| three baseline Java files | immutable source snapshots | Source evidence after matching official commit |
| `PACKAGE_METADATA.json` | package provenance | Declared origin and exclusions |
| `input_checksums.sha256` | intake integrity | Verifies packaged input bytes |

Restricted files `p01_label.md` and `report.md` were not included in the package and were not used. Evaluated-system JSON/Cypher/Neo4j/RAG/LLM outputs and scores were not used.
