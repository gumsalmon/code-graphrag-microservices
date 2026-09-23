# P01 Review Log

Scenario: P01 v1.0.0

Protocol: v0.1

Current label file: `labels.v3.json`

Current decision: `pending_review`

## Label version history

| File | Version | SHA-256 | State |
|---|---|---|---|
| `labels.v1.json` | 1.0.0 | `32270aed44b91f3436d7ad606f2276430e6ec9f76ea00a84d1f5bce2b21bd807` | Superseded; immutable |
| `labels.v2.json` | 1.1.0 | `910d15049e580bdd193c3ee5b35740e0c164a1a7f9d90640506cd10893408bde` | Superseded; immutable |
| `labels.v3.json` | 1.2.0 | `3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce` | Current provisional freeze; pending independent review |

## Roles

| Role | Person | State |
|---|---|---|
| Annotator | Phát | Candidate labels prepared |
| Reviewer | Unassigned | Required; must be a different human |
| AI assistance | Codex | Evidence organization/schema/checksum support only; not a human review role |

The two-person acceptance condition is not met. Phát must not approve this label version, and the missing reviewer must not be replaced by AI.

## Events

| Time (Asia/Bangkok) | Actor | Event | Result |
|---|---|---|---|
| 2026-09-23T14:20:00+07:00 | Codex supporting Phát | Recomputed all 18 package-entry SHA-256 values | All matched `input_checksums.sha256` |
| 2026-09-23T14:28:00+07:00 | Codex supporting Phát | Fetched `origin/main` and checked ancestry | Branch had no unique commits and was one commit behind; no divergence |
| 2026-09-23T14:29:00+07:00 | Codex supporting Phát | Fast-forwarded `Pham_Nguyen_Phat` to `65e41a2` with `--ff-only` | Success; no force push |
| 2026-09-23T14:34:00+07:00 | Codex supporting Phát | Created official PetClinic checkout at `3858f9c...` | Detached HEAD verified; tracked tree clean |
| 2026-09-23T14:36:00+07:00 | Codex supporting Phát | Compared three packaged source snapshots with official commit | All SHA-256 values matched |
| 2026-09-23T14:37:00+07:00 | Codex supporting Phát | Tested mutation patch | Original UTF-16LE file was not directly accepted by `git apply`; exact UTF-8 transcode passed `git apply --check` |
| 2026-09-23T14:40:00+07:00 | Codex supporting Phát | Attempted to make runtime available | Docker CLI present; daemon unavailable; background start did not produce a daemon |
| 2026-09-23T14:42:17+07:00 | Phát with Codex support | Serialized candidate labels without opening evaluated-system output | Decision set to `reproduce_required`; reviewer still required |
| 2026-09-23T14:48:34+07:00 | Phát with Codex support | Provisionally froze `labels.v1.json` before access to evaluated-system output | SHA-256 recorded in `checksums.sha256`; file must not be edited in place |
| 2026-09-23T14:52:00+07:00 | Phát with Codex support | Schema validation found non-enum `requires_code_change` wording in v1 | Preserved v1 and created v2 with boolean values plus separate repair assumptions |
| 2026-09-23T14:52:00+07:00 | Phát with Codex support | Provisionally froze `labels.v2.json` | SHA-256 `910d15049e580bdd193c3ee5b35740e0c164a1a7f9d90640506cd10893408bde`; no evaluated-system output opened |
| 2026-09-23T15:17:19+07:00 | Phát with Codex support | Ran the first Docker matrix | Direct and outward gateway observations completed, but gateway routing after service recreation was not proven; retained as diagnostic only |
| 2026-09-23T15:23:49+07:00 | Phát with Codex support | Repeated the matrix after waiting for Eureka registration | Gateway still logged a stale local discovery-cache miss; retained as diagnostic only |
| 2026-09-23T15:27:42+07:00 | Phát with Codex support | Ran the matrix with an end-to-end gateway routing preflight | Complete; preflight attempt 5 reached the patched visits service and all mandatory observations plus the negative case passed |
| 2026-09-23T15:32:00+07:00 | Phát with Codex support | Created and provisionally froze `labels.v3.json` before any evaluated-system output was opened | Clean evidence added; decision changed to `pending_review`; SHA-256 `3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce` |

## Evidence disagreements and unresolved items

- No hash mismatch was found.
- Original patch encoding is a reproducibility defect, not a semantic mismatch. Keep the original hash and document the canonical UTF-8 transcode separately.
- Historical baseline/mutated files are retained but do not qualify as the clean independent rerun.
- The first two new Docker runs exposed service-registration/cache timing problems and are retained as diagnostics rather than used for the gateway causal claim.
- The proposed negative overload and its endpoint returned the same response in baseline and patched snapshots and are now scored negatives.
- `PROJECT_CONTEXT.md` exposed the expected candidate path. This creates expectancy bias, so the exercise is not fully blind.
- Reviewer identity and review decision are unresolved.

## Decision rationale

`pending_review` is used because the clean runtime matrix, gateway routing proof and negative behavioral observation are complete, but a different human reviewer has not reviewed the package. `accepted` remains prohibited until that reviewer is named and records approval.

## Reviewer section

Reviewer name: **TBD by Huy**

Review time: **not performed**

Decision: **not performed**

Comments: **not performed**
