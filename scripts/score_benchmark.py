"""Score reviewed test scenarios under a frozen split manifest (stdlib only)."""

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime
from pathlib import Path

LEVELS = ("method", "api", "service")


class ScoringBlocked(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise ScoringBlocked(message)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def artifact_path(root, relative):
    require(isinstance(relative, str) and relative and not Path(relative).is_absolute(),
            "Missing or absolute artifact path")
    path = (root / relative).resolve()
    require(path.is_relative_to(root.resolve()) and path.is_file(), f"Unsafe or missing artifact: {relative}")
    return path


def checked_bytes(root, relative, expected_hash):
    path = artifact_path(root, relative)
    require(isinstance(expected_hash, str) and re.fullmatch(r"[0-9a-fA-F]{64}", expected_hash),
            f"Missing SHA-256: {relative}")
    content = path.read_bytes()
    actual = hashlib.sha256(content).hexdigest()
    require(actual == expected_hash.lower(), f"SHA-256 mismatch: {relative}")
    return content


def checked_file(root, relative, expected_hash):
    return json.loads(checked_bytes(root, relative, expected_hash).decode("utf-8"))


def verify_checksums(root, content, required, exact=False):
    entries = {}
    for line in content.decode("utf-8-sig").splitlines():
        if not line.strip():
            continue
        match = re.fullmatch(r"([0-9a-fA-F]{64})  (.+)", line)
        require(match is not None, "Invalid checksum line")
        digest, relative = match.groups()
        require(relative not in entries, f"Repeated checksum artifact: {relative}")
        entries[relative] = digest.lower()
    require(set(required) <= set(entries) and (not exact or set(required) == set(entries)),
            "Incomplete or unexpected checksum coverage")
    for relative, expected_hash in required.items():
        require(expected_hash is None or entries[relative] == expected_hash.lower(),
                f"Checksum does not bind scored artifact: {relative}")
    for relative, digest in entries.items():
        checked_bytes(root, relative, digest)


def validate_review_checksums(root, entry):
    artifact_manifest = entry.get("artifact_checksums_file")
    review_log = entry.get("review_log_file")
    artifact_path(root, artifact_manifest)
    artifact_path(root, review_log)
    content = checked_bytes(root, entry.get("review_checksums_file"), entry.get("review_checksums_sha256"))
    review_files = [artifact_manifest, review_log, entry["review_decision_file"]]
    require(len(set(review_files)) == 3, "Review checksum artifacts must be distinct")
    verify_checksums(root, content, {
        artifact_manifest: None, review_log: None,
        entry["review_decision_file"]: entry["review_decision_sha256"]
    }, exact=True)
    verify_checksums(root, artifact_path(root, artifact_manifest).read_bytes(), {
        entry[f"{kind}_file"]: entry[f"{kind}_sha256"] for kind in ("scenario", "universe", "label")
    })


def has_text(value):
    return isinstance(value, str) and bool(value.strip())


def ratio(numerator, denominator):
    return numerator / denominator if denominator else 0.0


def timestamp(value, field):
    require(isinstance(value, str), f"Missing timestamp: {field}")
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:
        raise ScoringBlocked(f"Invalid timestamp: {field}") from exc
    require(parsed.tzinfo is not None and parsed.utcoffset() is not None,
            f"Timestamp needs UTC offset: {field}")
    return parsed


def metrics(counts):
    precision = ratio(counts["tp"], counts["tp"] + counts["fp"])
    recall = ratio(counts["tp"], counts["tp"] + counts["fn"])
    return {**counts, "precision": precision, "recall": recall,
            "f1": ratio(2 * precision * recall, precision + recall)}


def validate_manifest(manifest):
    require(manifest.get("status") == "approved_for_test", "Split manifest is not approved for test")
    approval = manifest.get("approval") or {}
    require(approval.get("decision") == "approve_test_scoring" and
            approval.get("reviewer") and approval.get("approved_at"),
            "Separate test-scoring approval is missing")
    entries = manifest.get("scenarios") or []
    require(entries, "Manifest has no scenarios")
    seen_ids, groups, test = set(), {}, []
    for entry in entries:
        sid, split, group = entry.get("scenario_id"), entry.get("split"), entry.get("duplicate_group_id")
        require(sid and sid not in seen_ids and split in ("development", "test") and group,
                "Invalid or repeated scenario/split/group")
        seen_ids.add(sid)
        require(group not in groups or groups[group] == split, "Duplicate group crosses split")
        groups[group] = split
        if split == "test":
            test.append(entry)
    require(test, "No test scenarios are locked")
    return test


def score_case(root, entry, prediction_records):
    sid = entry["scenario_id"]
    scenario = checked_file(root, entry.get("scenario_file"), entry.get("scenario_sha256"))
    universe = checked_file(root, entry.get("universe_file"), entry.get("universe_sha256"))
    labels = checked_file(root, entry.get("label_file"), entry.get("label_sha256"))
    decision = checked_file(root, entry.get("review_decision_file"), entry.get("review_decision_sha256"))
    require(scenario.get("scenario_id") == sid and scenario.get("scenario_version") == entry.get("scenario_version") and
            universe.get("scenario_id") == sid and labels.get("scenario_id") == sid and
            universe.get("scenario_version") == entry.get("scenario_version") and
            labels.get("scenario_version") == entry.get("scenario_version"),
            f"Scenario identity mismatch: {sid}")
    require(universe.get("complete") is True and universe.get("review_status") == "approved",
            f"Evaluation universe is not complete/reviewed: {sid}")
    selected_at = timestamp(entry.get("selected_at"), f"{sid}.selected_at")
    universe_locked_at = timestamp(universe.get("locked_at"), f"{sid}.universe.locked_at")
    label_created_at = timestamp(labels.get("created_at"), f"{sid}.labels.created_at")
    require(selected_at <= universe_locked_at < label_created_at,
            f"Scenario selection/universe must precede labels: {sid}")
    annotator, reviewer = labels.get("annotator"), decision.get("reviewer")
    require(has_text(annotator), f"Missing label annotator: {sid}")
    require(decision.get("decision") == "approve" and decision.get("audit_decision") == "accepted" and
            decision.get("scenario_id") == sid and
            decision.get("label_file") == entry.get("label_file") and
            decision.get("label_sha256") == entry.get("label_sha256") and
            decision.get("label_version") == labels.get("label_version") and
            has_text(reviewer) and reviewer.strip().casefold() != annotator.strip().casefold() and
            has_text(decision.get("comments")),
            f"Accepted independent label review is missing: {sid}")
    reviewed_at = timestamp(decision.get("reviewed_at"), f"{sid}.reviewed_at")
    require(label_created_at <= reviewed_at, f"Labels must precede review: {sid}")
    validate_review_checksums(root, entry)

    universe_ids, seeds, truth = {}, {}, {}
    for level in LEVELS:
        ids = universe.get("levels", {}).get(level)
        seed_list = universe.get("seed_ids", {}).get(level)
        require(isinstance(ids, list) and isinstance(seed_list, list) and
                all(isinstance(x, str) and x for x in ids + seed_list) and
                len(set(ids)) == len(ids) and len(set(seed_list)) == len(seed_list) and
                not (set(ids) & set(seed_list)), f"Invalid universe/seed IDs: {sid}/{level}")
        universe_ids[level], seeds[level], truth[level] = set(ids), set(seed_list), {}
    for label in labels.get("labels", []):
        level, eid = label.get("level"), label.get("entity_id")
        require(level in LEVELS and eid in universe_ids[level] and eid not in truth[level],
                f"Label outside universe or repeated: {sid}/{eid}")
        impact = label.get("behavioral_impact")
        require(type(impact) is bool and label.get("polarity") == ("positive" if impact else "negative"),
                f"Unresolved or inconsistent label: {sid}/{eid}")
        truth[level][eid] = impact
    for level in LEVELS:
        require(set(truth[level]) == universe_ids[level], f"Universe is not fully adjudicated: {sid}/{level}")

    aliases = {}
    for alias in universe.get("aliases", []):
        mutated, canonical = alias.get("mutated_id"), alias.get("canonical_id")
        require(isinstance(mutated, str) and mutated and isinstance(canonical, str) and
                any(canonical in universe_ids[x] or canonical in seeds[x] for x in LEVELS) and
                alias.get("evidence_refs") and mutated not in aliases,
                f"Unverified or repeated alias: {sid}")
        aliases[mutated] = canonical
    canonical_ids = set().union(*universe_ids.values(), *seeds.values())

    results = {}
    for level in LEVELS:
        predicted, out_of_scope_ids, invalid, seed_predictions = set(), set(), 0, 0
        for record in prediction_records:
            require(isinstance(record, dict) and record.get("level") in LEVELS and
                    type(record.get("predicted_impacted")) is bool,
                    f"Malformed prediction record/level: {sid}")
            if record["level"] != level or not record["predicted_impacted"]:
                continue
            raw_id = record.get("entity_id")
            if not isinstance(raw_id, str) or not raw_id.strip():
                invalid += 1
                continue
            eid = raw_id if raw_id in canonical_ids else aliases.get(raw_id, raw_id)
            if eid in seeds[level]:
                seed_predictions += 1
            elif eid in universe_ids[level]:
                predicted.add(eid)
            else:
                out_of_scope_ids.add(eid)
        out_of_scope = len(out_of_scope_ids)
        positives = {eid for eid, impact in truth[level].items() if impact}
        counts = {"tp": len(predicted & positives), "fp": len(predicted - positives) + invalid + out_of_scope,
                  "fn": len(positives - predicted), "positive_support": len(positives),
                  "negative_support": len(universe_ids[level] - positives),
                  "prediction_count": len(predicted) + invalid + out_of_scope,
                  "invalid_count": invalid, "out_of_scope_count": out_of_scope,
                  "seed_prediction_count": seed_predictions, "unjudged_count": 0}
        results[level] = metrics(counts)
    return results


def score(root, manifest_path, manifest_hash, predictions_path):
    root = Path(root).resolve()
    manifest = checked_file(root, manifest_path, manifest_hash)
    test_entries = validate_manifest(manifest)
    supplied = read_json(Path(predictions_path))
    records = supplied.get("scenarios")
    require(isinstance(records, list), "Predictions must contain scenarios")
    by_id = {}
    for item in records:
        require(isinstance(item, dict) and item.get("scenario_id") not in by_id and
                isinstance(item.get("predictions"), list), "Repeated or malformed prediction scenario")
        by_id[item["scenario_id"]] = item["predictions"]
    expected = {entry["scenario_id"] for entry in test_entries}
    require(set(by_id) == expected, "Predictions must cover exactly the locked test scenarios")
    cases = {entry["scenario_id"]: score_case(root, entry, by_id[entry["scenario_id"]])
             for entry in test_entries}
    aggregate = {}
    for level in LEVELS:
        count_keys = ("tp", "fp", "fn", "positive_support", "negative_support", "prediction_count",
                      "invalid_count", "out_of_scope_count", "seed_prediction_count", "unjudged_count")
        totals = {key: sum(case[level][key] for case in cases.values()) for key in count_keys}
        aggregate[level] = {"micro": metrics(totals), "macro": {
            key: sum(case[level][key] for case in cases.values()) / len(cases)
            for key in ("precision", "recall", "f1")}}
        aggregate[level]["macro"]["scenario_count"] = len(cases)
        aggregate[level]["macro"]["zero_positive_scenarios"] = sum(
            case[level]["positive_support"] == 0 for case in cases.values())
    return {"status": "official_score", "scenarios": cases, "aggregate": aggregate}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, help="Repository-relative manifest path")
    parser.add_argument("--manifest-sha256", required=True, help="Expected frozen manifest hash")
    parser.add_argument("--predictions", required=True)
    args = parser.parse_args()
    try:
        result = score(Path(__file__).resolve().parent.parent, args.manifest,
                       args.manifest_sha256, args.predictions)
    except (ScoringBlocked, OSError, ValueError, KeyError, TypeError) as exc:
        print(f"Scoring blocked: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
