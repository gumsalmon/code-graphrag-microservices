# P01 verification runs

Final runs from the current verifier:

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
