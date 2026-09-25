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

## Validation and current blocker

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

Status: **blocked: live E2E environment unavailable** for this follow-up's live
verification. The older 46-pass run belongs to commit `492c0eb` and is not
evidence that the two new live tests passed. Restore Docker Desktop, then rerun
the full-suite command above. Huy's independent verification and merge decision
remain pending. No P02 work or merge is included.
