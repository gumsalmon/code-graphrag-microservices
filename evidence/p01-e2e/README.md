# P01 verification runs

Latest scoped reproducibility check, 2026-09-26:
[repro-20260926T082624Z-d5eb6115](repro-20260926T082624Z-d5eb6115/report.json)
contains 11 passing focused tests, LF/CRLF clean-checkout comparisons, and real
Chroma warm/empty-cache probes. No full-suite or benchmark-score rerun.
See [limits and reproduction instructions](../../P01_REPRODUCIBILITY.md).

Current review acceptance: [suite-20260925T113007Z-952db4d5](suite-20260925T113007Z-952db4d5/summary.md)
records **54 passed / 0 failed / 0 skipped** after Docker was restarted.
Both live overload-rejection subprocesses returned exit code 1 as expected;
normal baseline/mutated runs passed. See [follow-up status](../../P01_REVIEW_FOLLOWUP.md).

Earlier failed attempt: [suite-20260925T112300Z-fb5318c3](suite-20260925T112300Z-fb5318c3/summary.md)
records **45 passed / 9 failed** while Docker Engine was unavailable. It is kept
unchanged as historical evidence, not the current acceptance result.

Previous successful acceptance at `492c0eb`:

- [suite-20260923T133049Z-e771f084](suite-20260923T133049Z-e771f084/summary.md):
  46 passed, no failures or skips; includes positive baseline/mutated runs,
  actual subprocess failure exits, and full environment information.
- Baseline: `suite-20260923T133049Z-e771f084/cases/live-success/20260923T133203Z-baseline-3b86f919`.
- Mutated: `suite-20260923T133049Z-e771f084/cases/live-success/20260923T133222Z-mutated-ab144353`.

Previous successful runs, retained as historical evidence:

- `20260923T131444Z-baseline-32973281`: PASS, baseline.
- `20260923T131524Z-mutated-a461c01c`: PASS, mutated.

The earlier runs are retained as raw diagnostic history, not the final
acceptance result:

- `20260923T122603Z-baseline-9a3328c3`: preliminary baseline PASS.
- `20260923T122636Z-mutated-fae5a8e4`: FAIL because the initial technical
  fixture used the baseline seed signature for the mutated method. This
  exposed the mutation's added `boolean` parameter; the fixture was corrected.
- `20260923T122723Z-mutated-51d72693`: preliminary mutated PASS.

The preliminary failed run predates the final failure-reporting code and does
not contain `summary.md`. Its original `test-results.log`, commands, import
log, generated JSON/Cypher, and checksums remain unaltered.
