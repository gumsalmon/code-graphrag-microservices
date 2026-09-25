# P01 Neo4j E2E verification

This is a technical graph-path check, not behavioral impact ground truth. It
does not use Phát's results or the draft ground truth. The verifier uses the
existing parser and Cypher generator without changing either one.

## Inputs and execution

- Repository base: `3e28fe5b3ddc6d605de68db7f87b0808bad65917`.
- PetClinic source: a clean checkout of
  `spring-petclinic/spring-petclinic-microservices` at
  `3858f9c630cf989bb6809a86edf47c2be78dc9f1`. The three relevant Java
  files must be present. Their contents are checked against `data/baseline`.
- Mutation: the tracked `data/mutated/VisitResource.java` differs from that
  source in one provider hunk. The verifier writes its own `mutation.patch`.
  This is **not** the independent runtime patch mentioned in the task packet,
  which was unavailable on this machine.
- Neo4j: `neo4j:5.26.0`, run in a fresh, labeled, volume-free container for
  each snapshot. Bolt is bound to a random localhost port. Only the verifier's
  labeled container is stopped afterward.
- Python: use Python 3.11 and `pip install -r requirements.txt` in a venv.

In PowerShell, set `$petclinicRoot` to the clean PetClinic checkout, then run:

```powershell
python verify_neo4j_live.py --snapshot baseline --source-root $petclinicRoot
python verify_neo4j_live.py --snapshot mutated --source-root $petclinicRoot
$env:P01_SOURCE_ROOT = $petclinicRoot
python -m pytest tests/test_verify_neo4j_live.py -q
python tools/run_p01_acceptance.py --source-root $petclinicRoot
python tools/verify_p01_checksums.py
python tools/verify_p01_checksums.py --git-ref HEAD
```

Each run prints `PASS` with an evidence directory and exits 0, or prints
`FAIL` and exits nonzero. An optional `--cypher-file` is accepted only when its
checksum equals the freshly generated Cypher. `--output-root` can redirect
evidence output. A missing source, connection failure, failed Cypher statement,
or cleanup failure must be treated as a failed run.

## Evidence contract

Each `evidence/p01-e2e/<run-id>/` directory contains the selected snapshot
source files, fresh `parser-output.json`, fresh `import.cypher`, `commands.log`
(commands and exit codes), `import.log` (statement hashes and statuses),
`query-result.json` (live Bolt paths and database inventories),
`environment.json` (versions, source provenance, container ID),
`test-results.log`, `summary.md`, and `checksums.sha256`. Mutated runs also
contain `mutation.patch`. Failed runs preserve partial artifacts and the error.
The checksum file covers every other top-level evidence file; it deliberately
does not cover the nested copied source directory, whose per-file hashes are
recorded in `environment.json`.

The technical acceptance fixture in
`tests/fixtures/p01_graph_path_expectation.json` names the seed, client, and
controller method IDs for each snapshot. It is not ground truth: the checks
validate that these IDs are in the newly parsed JSON and newly imported graph,
then independently query Neo4j for reverse 1- and 2-hop paths. The baseline
and mutated seed IDs differ because the mutation adds a method parameter.

The run also checks an empty starting database, import idempotence, full
method/dependency-edge parity between fresh parser JSON and Neo4j, seed
exclusion, and exactly one service crossing on both accepted paths.

## Acceptance results and dependency correction

The original `tree-sitter==0.24.0` pin could not load Go language ABI 15 from
`tree-sitter-go==0.25.0`. Updating only the binding pin to `0.25.2` resolves
those nine test failures; parser, ChromaDB, gRPC and benchmark code are unchanged.

The full suite now passes: **46 passed, 0 failed, 0 skipped**. The durable
[suite report](evidence/p01-e2e/suite-20260923T133049Z-e771f084/summary.md)
links the raw log, JUnit output, exact command, versions, exit code and hashes.
Both positive E2E snapshots and subprocess failure artifacts are under its
`cases/` directory. The failure harness is test-only: it supplies a non-listening
URI, waits for Neo4j readiness then uses bad credentials, blocks the driver import
with an import hook, or appends malformed/runtime-error Cypher after valid
generated statements. It calls the production CLI entry function in a separate
Python process and checks the actual process exit code and original error.

`.gitattributes` disables line-ending conversion for evidence so SHA-256 hashes
describe the same bytes on disk and in Git. Earlier raw runs have been retained;
their original Windows bytes were restored to the index without recomputing
their checksums. `tools/verify_p01_checksums.py --git-ref HEAD` verifies the
committed blobs directly rather than relying on a particular checkout setting.

This closes technical graph-path verification for the tracked baseline/mutated
fixtures. On 2026-09-25, Huy reported that he independently compared our patch
with Phát's benchmark patch and confirmed the method changes are equivalent in
content. This records Huy's review conclusion; we have not repeated that
comparison or received the benchmark patch's SHA-256.
No runtime behavioral claim or benchmark ground-truth claim is made.

## Review follow-up: reject unexpected impacted methods

The verifier now requires exact equality between the returned impact set and
the snapshot's technical acceptance IDs, and rejects duplicates. Previously it
only checked that the two expected methods were present, so a third, incorrect
method could slip through. Expected IDs remain in the acceptance fixture.

Regression tests exercise both baseline and mutated snapshots with an extra
`VisitResource#read(int)` and an unrelated method. Live subprocess tests add a
deliberately wrong `CALLS` edge from the existing `read(int)` overload to the
seed inside the disposable Neo4j container, then run the real traversal. The
query returns three methods and the verifier must exit 1 with an explicit
`Impact set mismatch` error. Raw query results are retained even when acceptance
fails, so reviewers can inspect the extra method rather than just a failure flag.
