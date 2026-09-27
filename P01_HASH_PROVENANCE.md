# Implementation hash review — 2026-09-27

The three mismatches in `repro-20260926T082624Z-d5eb6115/report.json` came from
hashing working-tree bytes before Git normalized CRLF to LF on commit. They
were not Git blob hashes. At the start of this review, each recorded value
matched its local file exactly; replacing only CRLF with LF produced precisely
the bytes of that file in commit `1da100a`. No code-content difference was found.
The original report is retained unchanged, including its lack of HEAD/status.

| File | Report SHA-256 (working tree) | SHA-256 of Git blob at `1da100a` |
| --- | --- | --- |
| `verify_neo4j_live.py` | `78120b6ff9fd9635fb141fc460d4ed491cf6cc82f23095c2f5bb5bfb0a530bd5` | `a04cb346f57d09c0eedb99ec8a368d10f68943f4df800833adc96de1e366b0c3` |
| `src/benchmark_runner.py` | `cadc503020d9dbc586fe7c2baeb69f6108e2bc4e0e459c999896a8a13eda0e70` | `c07cdef66f0d57f939c7c2dba5d6d24f23fcdd9d644fe7b84d44bbfe521ceb1a` |
| `run_baseline_benchmark.py` | `8ece037dcfd1c6788fb5491cfa204a3348ecac105f6c1a02705c2d0aef0cfea8` | `be92395944abba26b6054322d9a1eea7da019d9b7155afe6fab585bd93b4a2c2` |

The probe and full-suite runner now share `tools/p01_provenance.py`:

- Require a clean checkout before running. Record HEAD and full porcelain Git
  status (tracked and non-ignored untracked files), before and after execution.
- Define `implementation_sha256` explicitly as **SHA-256 of the Git HEAD blob
  bytes**, not the Git object's SHA-1 ID or an implicitly normalized local file.
- Record local-byte hashes separately in `git_before.working_tree_sha256` and
  `git_after.working_tree_sha256`. A clean CRLF checkout may legitimately have
  different local-byte and blob hashes.
- Include all tracked Python source/tests/tools, requirements and attributes.
- Fail if HEAD, implementation bytes or checkout cleanliness change mid-run.
- Write reports outside the checkout. Both commands accept `--output-root`;
  the default is `%TEMP%/p01-verification-output`. An output root inside the
  implementation checkout is rejected to prevent self-created dirty evidence.

Reproduction uses a temporary clean clone with `core.autocrlf=false`. Probe
evidence may be committed afterward in an artifact-only commit; that commit
must not change implementation blobs. The final full suite is then run on the
exact final PR HEAD, with its log/JUnit saved externally and reproduced in a PR
comment. This avoids claiming that a pre-commit run tested a later SHA, or
creating an endless new commit for the log of each previous commit.

The remaining TASKS wording and runner comment now explicitly describe smoke
tests and draft labels. No evaluation scores, labels, parser/query logic or
P02 implementation were changed by this review.
