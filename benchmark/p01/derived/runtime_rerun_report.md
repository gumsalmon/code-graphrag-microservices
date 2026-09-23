# P01 clean runtime rerun

Decision input: `runtime_complete_pending_human_review`

Valid evidence run: `benchmark/p01/raw/rerun-20260923-152742/`

Runner: `scripts/run_p01_runtime.ps1`

Compose definition: `benchmark/p01/derived/docker-compose-rerun.yml`

## Fixed identities

- Repository commit: `3858f9c630cf989bb6809a86edf47c2be78dc9f1`
- Configuration revision: `323993ce2519c6d02df63e08bf4458d123d3b611`
- Original patch SHA-256: `42394ca361d07db58ba6a73cfc1ddb8bd1d9aeddb59292873552573adfa5cc21`
- Fixture: owner `6`; pets `7,8`; negative pet `7`
- Baseline and patched images are separately tagged and their immutable image IDs are recorded in `environment.json`.

## Valid observations

| Observation | Baseline | Patched | Interpretation |
|---|---|---|---|
| Direct `GET /pets/visits?petId=7,8` | `200`, four visits | `400` when `includeDetails` is absent | Required parameter changes the provider contract |
| Direct request with `includeDetails=true` | Not needed | `200`, same four visits | Service remains functional when the new contract is met |
| Gateway `GET /api/gateway/owners/6` | `200`, visits populated for pets 7 and 8 | `200`, visits empty for both pets | Observable gateway behavior changes through fallback |
| Negative `GET /owners/6/pets/7/visits` | `200`, two visits | `200`, identical two visits | Same-class overload/different mapping is not impacted |

The patched gateway observation was recorded only after a discovery preflight proved that the gateway request reached the recreated visits service. The preflight succeeded on attempt 5, and the visits service logged `MissingServletRequestParameterException`. This prevents a temporary Eureka cache miss from being mistaken for mutation behavior.

## Superseded diagnostic attempts

- `rerun-20260923-151719` reached the expected outward responses but did not wait for mutated-service registration; it is retained as raw diagnostic evidence and is not used for the gateway causal claim.
- `rerun-20260923-152349` waited for Eureka registration, but the gateway's local discovery cache had not refreshed and logged `No servers available for service: visits-service`; it is retained and excluded from the gateway causal claim.
- `rerun-20260923-152332` failed before starting because the sandbox could not access the Docker named pipe; it is retained as an environment diagnostic.

## Result

All six mandatory runtime observations in protocol v0.1 are complete, including the real-repository negative case. The correct audit decision is `pending_review`, not `accepted`, because the independent human reviewer role is still unassigned.
