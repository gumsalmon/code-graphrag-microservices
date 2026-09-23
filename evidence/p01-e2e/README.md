# P01 verification runs

Current acceptance run:

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
