# P01 review follow-up — 2026-09-25

Huy reported that he compared the P01 patch with Phát's benchmark patch and
confirmed that the method changes are equivalent in content. This is Huy's
review conclusion, not a new comparison performed by this verifier. The
benchmark patch bytes/hash have not been provided in this conversation.

## Change

Acceptance now requires exactly the two snapshot-specific impacted method IDs
in the technical fixture. Extra IDs and duplicate IDs fail. In particular,
`VisitResource#read(int)` must not be accepted in addition to the expected
client and controller. The parser and traversal query are unchanged.

Six unit cases cover the valid set and two kinds of extra methods for both
snapshots. Two additional live subprocess cases create a wrong edge from the
existing overload to the seed in a disposable Neo4j graph and require a real
three-method query result to cause exit code 1. Query output is written before
acceptance so a rejected result remains inspectable.

## Validation after Docker was restarted

The user restored Docker and the complete suite was rerun on 2026-09-25:
**54 passed, 0 failed, 0 skipped**, exit code 0, 180.18 seconds.

- [Current raw log](evidence/p01-e2e/suite-20260925T113007Z-952db4d5/pytest.log),
  [JUnit](evidence/p01-e2e/suite-20260925T113007Z-952db4d5/pytest.xml),
  [commands and versions](evidence/p01-e2e/suite-20260925T113007Z-952db4d5/process-result.json).
- [Baseline extra-overload process](evidence/p01-e2e/suite-20260925T113007Z-952db4d5/cases/extra-overload-baseline/process-result.json)
  and [mutated extra-overload process](evidence/p01-e2e/suite-20260925T113007Z-952db4d5/cases/extra-overload-mutated/process-result.json)
  both return exit code 1 with `Impact set mismatch`, identify `VisitResource#read(int)`
  as unexpected, and retain the real Neo4j query result containing three methods.
- Normal baseline/mutated E2E runs pass with exactly the client and controller.

Status: live verification complete; the environment blocker is resolved.
Huy's independent verification and merge decision remain pending. No P02 work
or merge is included.

## Earlier failed attempt (retained for provenance)

- Focused command: `python -m pytest tests/test_verify_neo4j_live.py -k acceptance_rejects_extra_methods -v`
  returned **6 passed, 21 deselected**, exit code 0.
- Full-suite command: `python tools/run_p01_acceptance.py --source-root <clean-PetClinic-checkout>`
  returned **45 passed, 9 failed**, exit code 1. All nine failures require Docker
  and occurred because the Docker Engine named pipe was absent.
- [Full raw log](evidence/p01-e2e/suite-20260925T112300Z-fb5318c3/pytest.log),
  [JUnit with individual cases](evidence/p01-e2e/suite-20260925T112300Z-fb5318c3/pytest.xml),
  [commands and environment checks](evidence/p01-e2e/suite-20260925T112300Z-fb5318c3/process-result.json).
- Docker Desktop startup failed because `SOFTWARE\Docker Inc.\Docker Desktop`
  was missing. Launching the installed executable also did not restore the
  engine. No registry edits or reinstall were performed.

That attempt was marked **blocked: live E2E environment unavailable**.
Its raw evidence remains unchanged; the successful 54-test run above supersedes
that status. The older 46-pass run at `492c0eb` is historical evidence only.
