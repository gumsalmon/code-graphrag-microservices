import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from score_benchmark import ScoringBlocked, score


class ScorerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.universe = {
            "scenario_id": "T01", "scenario_version": "1.0.0", "complete": True,
            "review_status": "approved", "locked_at": "2026-09-27T01:00:00+07:00",
            "levels": {"method": ["m+", "m-"], "api": ["a+"], "service": []},
            "seed_ids": {"method": ["seed"], "api": [], "service": []},
            "aliases": [{"mutated_id": "mutated-m+", "canonical_id": "m+", "evidence_refs": ["source"]}]
        }
        self.labels = {
            "scenario_id": "T01", "scenario_version": "1.0.0", "label_version": "1.0.0",
            "annotator": "Annotator", "created_at": "2026-09-27T02:00:00+07:00", "labels": [
                {"level": "method", "entity_id": "m+", "behavioral_impact": True, "polarity": "positive"},
                {"level": "method", "entity_id": "m-", "behavioral_impact": False, "polarity": "negative"},
                {"level": "api", "entity_id": "a+", "behavioral_impact": True, "polarity": "positive"}
            ]
        }
        self.entry = {"scenario_id": "T01", "scenario_version": "1.0.0",
                      "duplicate_group_id": "group-1", "split": "test",
                      "selected_at": "2026-09-27T00:00:00+07:00"}
        self.scenario = {"scenario_id": "T01", "scenario_version": "1.0.0"}
        self.manifest = {"status": "approved_for_test",
                         "approval": {"decision": "approve_test_scoring", "reviewer": "Lead",
                                      "approved_at": "2026-09-27T00:00:00+07:00"},
                         "scenarios": [self.entry]}
        self.decision = {"scenario_id": "T01", "decision": "approve", "audit_decision": "accepted",
                         "label_file": "labels.json", "label_version": "1.0.0",
                         "reviewer": "Reviewer", "reviewed_at": "2026-09-27T03:00:00+07:00",
                         "comments": "Checked source, runtime and universe coverage."}

    def write(self, name, content):
        path = self.root / name
        path.write_text(json.dumps(content), encoding="utf-8")
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def write_checksums(self, name, paths):
        path = self.root / name
        path.write_text("".join(
            f"{hashlib.sha256((self.root / relative).read_bytes()).hexdigest()}  {relative}\n"
            for relative in paths), encoding="utf-8")
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def score_prepared(self):
        manifest_hash = self.write("manifest.json", self.manifest)
        return score(self.root, "manifest.json", manifest_hash, self.root / "predictions.json")

    def refresh_review_checksums(self):
        self.entry["review_checksums_sha256"] = self.write_checksums(
            "checksums.review.v1.sha256", ["checksums.sha256", "review_log.md", "decision.json"])

    def run_score(self, predictions):
        self.entry["scenario_file"] = "scenario.json"
        self.entry["scenario_sha256"] = self.write("scenario.json", self.scenario)
        self.entry["universe_file"] = "universe.json"
        self.entry["universe_sha256"] = self.write("universe.json", self.universe)
        self.entry["label_file"] = "labels.json"
        self.entry["label_sha256"] = self.write("labels.json", self.labels)
        self.decision["label_sha256"] = self.entry["label_sha256"]
        self.entry["review_decision_file"] = "decision.json"
        self.entry["review_decision_sha256"] = self.write("decision.json", self.decision)
        self.entry["artifact_checksums_file"] = "checksums.sha256"
        self.write_checksums("checksums.sha256", ["scenario.json", "universe.json", "labels.json"])
        self.entry["review_log_file"] = "review_log.md"
        (self.root / "review_log.md").write_text("Independent review completed.\n", encoding="utf-8")
        self.entry["review_checksums_file"] = "checksums.review.v1.sha256"
        self.refresh_review_checksums()
        self.write("predictions.json", {"scenarios": [{"scenario_id": "T01", "predictions": predictions}]})
        return self.score_prepared()

    def test_exact_canonical_ids_take_precedence_over_aliases(self):
        self.universe["aliases"].extend([
            {"mutated_id": "m+", "canonical_id": "m-", "evidence_refs": ["source"]},
            {"mutated_id": "m-", "canonical_id": "m+", "evidence_refs": ["source"]},
            {"mutated_id": "seed", "canonical_id": "m+", "evidence_refs": ["source"]},
            {"mutated_id": "a+", "canonical_id": "m+", "evidence_refs": ["source"]}
        ])
        for eid, expected in [("m+", (1, 0, 0, 0)), ("m-", (0, 1, 1, 0)),
                              ("seed", (0, 0, 1, 1))]:
            with self.subTest(entity_id=eid):
                result = self.run_score([{"level": "method", "entity_id": eid,
                                          "predicted_impacted": True}])
                method = result["aggregate"]["method"]["micro"]
                self.assertEqual(tuple(method[key] for key in ("tp", "fp", "fn", "seed_prediction_count")),
                                 expected)
        result = self.run_score([
            {"level": "method", "entity_id": "a+", "predicted_impacted": True},
            {"level": "api", "entity_id": "a+", "predicted_impacted": True}
        ])
        self.assertEqual(result["aggregate"]["method"]["micro"]["out_of_scope_count"], 1)
        self.assertEqual(result["aggregate"]["api"]["micro"]["tp"], 1)

    def test_missing_or_blank_annotator_blocks(self):
        for value in (None, "", " \t", 123):
            with self.subTest(annotator=value):
                self.labels["annotator"] = value
                with self.assertRaisesRegex(ScoringBlocked, "annotator"):
                    self.run_score([])
        self.labels.pop("annotator")
        with self.assertRaisesRegex(ScoringBlocked, "annotator"):
            self.run_score([])

    def test_incomplete_review_record_blocks(self):
        for field in ("reviewer", "reviewed_at", "comments"):
            original = self.decision[field]
            for value in (None, "", " \t"):
                with self.subTest(field=field, value=value):
                    self.decision[field] = value
                    with self.assertRaises(ScoringBlocked):
                        self.run_score([])
            self.decision[field] = original
        self.decision["reviewer"] = " annotator "
        with self.assertRaisesRegex(ScoringBlocked, "review is missing"):
            self.run_score([])

    def test_invalid_or_early_review_timestamp_blocks(self):
        for value in ("invalid", "2026-09-27T03:00:00", "2026-09-27T01:00:00+07:00"):
            with self.subTest(reviewed_at=value):
                self.decision["reviewed_at"] = value
                with self.assertRaisesRegex(ScoringBlocked, "[Tt]imestamp|precede review"):
                    self.run_score([])

    def test_missing_review_artifacts_or_checksums_block(self):
        for field in ("review_decision_file", "review_decision_sha256", "artifact_checksums_file",
                      "review_log_file", "review_checksums_file", "review_checksums_sha256"):
            for value in (None, ""):
                with self.subTest(field=field, value=value):
                    self.run_score([])
                    self.entry[field] = value
                    with self.assertRaises(ScoringBlocked):
                        self.score_prepared()
            with self.subTest(missing_field=field):
                self.run_score([])
                self.entry.pop(field)
                with self.assertRaises(ScoringBlocked):
                    self.score_prepared()
        for name in ("decision.json", "review_log.md", "checksums.sha256", "checksums.review.v1.sha256"):
            with self.subTest(missing_file=name):
                self.run_score([])
                (self.root / name).unlink()
                with self.assertRaises(ScoringBlocked):
                    self.score_prepared()

    def test_changed_review_package_blocks(self):
        for name in ("decision.json", "review_log.md", "checksums.sha256", "checksums.review.v1.sha256"):
            with self.subTest(changed_file=name):
                self.run_score([])
                with (self.root / name).open("a", encoding="utf-8") as artifact:
                    artifact.write("\n ")
                with self.assertRaisesRegex(ScoringBlocked, "SHA-256 mismatch"):
                    self.score_prepared()
        # Updating only the decision hash cannot bypass the signed review package.
        self.run_score([])
        self.decision["comments"] = "Revised after review."
        self.entry["review_decision_sha256"] = self.write("decision.json", self.decision)
        with self.assertRaisesRegex(ScoringBlocked, "does not bind scored artifact"):
            self.score_prepared()

    def test_review_checksums_must_cover_complete_package(self):
        paths = ["checksums.sha256", "review_log.md", "decision.json"]
        for omitted in paths:
            with self.subTest(omitted=omitted):
                self.run_score([])
                self.entry["review_checksums_sha256"] = self.write_checksums(
                    "checksums.review.v1.sha256", [path for path in paths if path != omitted])
                with self.assertRaisesRegex(ScoringBlocked, "coverage"):
                    self.score_prepared()

    def test_artifact_checksums_must_cover_scored_files(self):
        paths = ["scenario.json", "universe.json", "labels.json"]
        for omitted in paths:
            with self.subTest(omitted=omitted):
                self.run_score([])
                self.write_checksums("checksums.sha256", [path for path in paths if path != omitted])
                self.refresh_review_checksums()
                with self.assertRaisesRegex(ScoringBlocked, "coverage"):
                    self.score_prepared()
        self.run_score([])
        (self.root / "raw.txt").write_text("Runtime evidence", encoding="utf-8")
        self.write_checksums("checksums.sha256", paths + ["raw.txt"])
        self.refresh_review_checksums()
        self.score_prepared()
        (self.root / "raw.txt").write_text("Changed evidence", encoding="utf-8")
        with self.assertRaisesRegex(ScoringBlocked, "SHA-256 mismatch"):
            self.score_prepared()

    def test_invalid_checksum_manifests_block(self):
        for name in ("checksums.sha256", "checksums.review.v1.sha256"):
            for mutation in ("malformed", "duplicate", "unsafe", "wrong_hash"):
                with self.subTest(manifest=name, mutation=mutation):
                    self.run_score([])
                    path = self.root / name
                    original = path.read_text(encoding="utf-8")
                    first_line = original.splitlines()[0]
                    if mutation == "malformed":
                        content = original + "not a checksum\n"
                        message = "Invalid checksum line"
                    elif mutation == "duplicate":
                        content = original + first_line + "\n"
                        message = "Repeated checksum artifact"
                    elif mutation == "unsafe":
                        content = original.replace("  " + first_line.split("  ")[1], "  ../outside.json", 1)
                        message = "coverage|Unsafe"
                    else:
                        content = original.replace(first_line[:64], "0" * 64, 1)
                        message = "does not bind scored artifact|SHA-256 mismatch"
                    path.write_text(content, encoding="utf-8")
                    # Freeze the altered manifest so content validation, not just its outer hash, is exercised.
                    if name == "checksums.sha256":
                        self.refresh_review_checksums()
                    else:
                        self.entry["review_checksums_sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
                    with self.assertRaisesRegex(ScoringBlocked, message):
                        self.score_prepared()

    def test_counts_alias_dedup_seed_invalid_and_outside_universe(self):
        result = self.run_score([
            {"level": "method", "entity_id": "mutated-m+", "predicted_impacted": True},
            {"level": "method", "entity_id": "m+", "predicted_impacted": True},
            {"level": "method", "entity_id": "m-", "predicted_impacted": True},
            {"level": "method", "entity_id": "seed", "predicted_impacted": True},
            {"level": "method", "entity_id": "outside", "predicted_impacted": True},
            {"level": "method", "entity_id": "outside", "predicted_impacted": True},
            {"level": "method", "entity_id": None, "predicted_impacted": True}
        ])
        method = result["aggregate"]["method"]["micro"]
        self.assertEqual((method["tp"], method["fp"], method["fn"]), (1, 3, 0))
        self.assertEqual((method["invalid_count"], method["out_of_scope_count"],
                          method["seed_prediction_count"]), (1, 1, 1))
        self.assertEqual(method["precision"], 0.25)
        self.assertEqual(result["aggregate"]["api"]["micro"]["fn"], 1)
        self.assertEqual(result["aggregate"]["service"]["micro"]["f1"], 0)

    def test_draft_and_unreviewed_universe_block(self):
        self.manifest["status"] = "draft"
        with self.assertRaisesRegex(ScoringBlocked, "not approved"):
            self.run_score([])
        self.manifest["status"] = "approved_for_test"
        self.universe["levels"]["method"].append("unjudged")
        with self.assertRaisesRegex(ScoringBlocked, "not fully adjudicated"):
            self.run_score([])

    def test_group_leakage_and_missing_prediction_block(self):
        self.manifest["scenarios"].append({"scenario_id": "D01", "split": "development",
                                           "duplicate_group_id": "group-1"})
        with self.assertRaisesRegex(ScoringBlocked, "crosses split"):
            self.run_score([])
        self.manifest["scenarios"].pop()
        with self.assertRaisesRegex(ScoringBlocked, "cover exactly"):
            self.run_with_no_scenario()

    def test_changed_artifact_and_pending_review_block(self):
        self.run_score([])
        (self.root / "labels.json").write_text("{}", encoding="utf-8")
        manifest_hash = hashlib.sha256((self.root / "manifest.json").read_bytes()).hexdigest()
        with self.assertRaisesRegex(ScoringBlocked, "SHA-256 mismatch"):
            score(self.root, "manifest.json", manifest_hash, self.root / "predictions.json")
        self.run_score([])
        decision = json.loads((self.root / "decision.json").read_text(encoding="utf-8"))
        decision["audit_decision"] = "pending_review"
        self.entry["review_decision_sha256"] = self.write("decision.json", decision)
        self.refresh_review_checksums()
        manifest_hash = self.write("manifest.json", self.manifest)
        with self.assertRaisesRegex(ScoringBlocked, "review is missing"):
            score(self.root, "manifest.json", manifest_hash, self.root / "predictions.json")

    def test_selection_after_label_blocks(self):
        self.entry["selected_at"] = "2026-09-27T03:00:00+07:00"
        with self.assertRaisesRegex(ScoringBlocked, "must precede labels"):
            self.run_score([])

    def run_with_no_scenario(self):
        self.run_score([])
        self.write("predictions.json", {"scenarios": []})
        manifest_hash = hashlib.sha256((self.root / "manifest.json").read_bytes()).hexdigest()
        return score(self.root, "manifest.json", manifest_hash, self.root / "predictions.json")


if __name__ == "__main__":
    unittest.main()
