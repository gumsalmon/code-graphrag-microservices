# P01 Independent Runtime Rerun Attempt

Time: 2026-09-23, Asia/Bangkok

PetClinic commit: `3858f9c630cf989bb6809a86edf47c2be78dc9f1`

Patch SHA-256: `42394ca361d07db58ba6a73cfc1ddb8bd1d9aeddb59292873552573adfa5cc21`

## Verified before runtime

- Fresh clone from the official PetClinic repository.
- Detached `HEAD` equals the required commit.
- `git diff --quiet --exit-code` returned 0.
- Three packaged source snapshots match the official commit byte-for-byte.
- Maven Wrapper exists in the checkout.
- Project declares Java 17; host Java reports version 23.
- Original patch is UTF-16LE. `git apply --check` rejects that representation as “No valid patches in input”. An exact text transcode to UTF-8 (SHA-256 `901b19f5dab72c65d3bb424a24e53ea4c3a83cfc5bd72332bdbaf297031441f5`) passes apply check.

## Environment diagnostic

```text
Docker CLI: 29.5.3
Docker Compose: v5.1.4
Docker daemon: unavailable
Docker API error: npipe:////./pipe/docker_engine — system cannot find the file specified
Maven in PATH: unavailable
Maven Wrapper: available in source checkout
```

Docker Desktop was started in the background but no daemon became available. No baseline or mutated container was launched, no HTTP request was made, and no runtime result was fabricated.

## Required rerun when Docker is available

1. Record commit/status and Java/Maven/Docker/Compose versions.
2. Build baseline visits-service and api-gateway with immutable P01-specific tags.
3. Start dependencies with an isolated Compose project and record fixture owner 6, pets 7/8 and their visits.
4. Record baseline direct and gateway status/body.
5. Apply the documented UTF-8 transcode of the original patch to a separate clean checkout.
6. Build mutated visits-service with a distinct immutable tag; do not reuse the baseline tag.
7. Record mutated direct missing parameter, mutated direct valid parameter and mutated gateway status/body plus service logs.
8. Record baseline and mutated behavior of the preselected negative endpoint `GET /owners/*/pets/{petId}/visits`.
9. Store commands, exit codes and unedited logs under `raw/rerun-<timestamp>/`.

Current runtime conclusion: `reproduce_required`.
