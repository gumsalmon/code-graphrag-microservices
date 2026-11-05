"""Offline contract checks for raw JSON. No requests, predictions, labels or scoring."""
import argparse
import hashlib
import json
from pathlib import Path


def _pairs(items):
    result = {}
    for key, value in items:
        if key in result:
            raise ValueError("Duplicate JSON key: " + key)
        result[key] = value
    return result


def strict_json(raw):
    def invalid_constant(value):
        raise ValueError("Non-JSON number: " + value)

    if not isinstance(raw, bytes):
        raise ValueError("Raw response bytes required")
    return json.loads(raw.decode("utf-8"), object_pairs_hook=_pairs, parse_constant=invalid_constant)


def canonical(value):
    # Keep arrays and every field. True and 1 must not compare equal in Python.
    return json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False, separators=(",", ":"))


def check_owner_rename(baseline_raw, mutated_raw, baseline_status, mutated_status):
    if (baseline_status, mutated_status) != (200, 200):
        raise ValueError("Owner rename check requires observed HTTP 200 on both sides")
    before, after = strict_json(baseline_raw), strict_json(mutated_raw)
    fields = {"id", "firstName", "lastName", "address", "city", "telephone", "pets"}
    if not isinstance(before, dict) or set(before) != fields or not isinstance(before["pets"], list):
        raise ValueError("Baseline is not the complete seven-field Owner representation")
    if not isinstance(after, dict) or set(after) != (fields - {"pets"}) | {"animals"}:
        raise ValueError("Mutation must rename exactly one top-level key; no dropped or added fields")
    projected = {("animals" if key == "pets" else key): value for key, value in before.items()}
    if canonical(projected) != canonical(after):
        raise ValueError("Values or nested structure differ beyond the registered key rename")
    return {"contract_delta_check": "only_top_level_pets_to_animals", "all_other_fields_retained": True,
            "collection_order_retained": True, "pet_count": len(before["pets"]),
            "is_label_or_score": False}


def check_unchanged_json(baseline_raw, mutated_raw, baseline_status, mutated_status):
    if baseline_status != mutated_status or not 200 <= baseline_status < 300:
        raise ValueError("Unchanged JSON control requires equal successful observed statuses")
    if canonical(strict_json(baseline_raw)) != canonical(strict_json(mutated_raw)):
        raise ValueError("Control JSON differs; do not hide fields or reorder arrays")
    return {"contract_delta_check": "equal_full_json", "is_label_or_score": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kind", choices=["owner-rename", "unchanged-json"], required=True)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--mutated", type=Path, required=True)
    parser.add_argument("--baseline-status", type=int, required=True)
    parser.add_argument("--mutated-status", type=int, required=True)
    args = parser.parse_args()
    before, after = args.baseline.read_bytes(), args.mutated.read_bytes()
    check = check_owner_rename if args.kind == "owner-rename" else check_unchanged_json
    result = check(before, after, args.baseline_status, args.mutated_status)
    print(json.dumps({**result, "baseline_sha256": hashlib.sha256(before).hexdigest(),
                      "mutated_sha256": hashlib.sha256(after).hexdigest(),
                      "raw_files_modified": False, "array_sorting_performed": False}, indent=2))


if __name__ == "__main__":
    main()
