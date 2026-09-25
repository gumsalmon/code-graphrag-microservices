# Full acceptance suite

Exit code: 1.

[Raw pytest output](pytest.log), [JUnit results](pytest.xml), [command, versions and exit code](process-result.json), [checksums](checksums.sha256).

Per-case process reports and verifier artifacts are under `cases/`. Fault cases intentionally fail in subprocesses; the parent test passes only when the expected real error and exit code are observed.
