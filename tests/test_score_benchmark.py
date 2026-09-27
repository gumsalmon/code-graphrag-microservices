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

    def write(self, name, content):
        path = self.root / name
        path.write_text(json.dumps(content), encoding="utf-8")
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def run_score(self, predictions):
        self.entry["scenario_file"] = "scenario.json"
        self.entry["scenario_sha256"] = self.write("scenario.json", self.scenario)
        self.entry["universe_file"] = "universe.json"
        self.entry["universe_sha256"] = self.write("universe.json", self.universe)
        self.entry["label_file"] = "labels.json"
        self.entry["label_sha256"] = self.write("labels.json", self.labels)
        decision = {"scenario_id": "T01", "decision": "approve", "audit_decision": "accepted",
                    "label_file": "labels.json", "label_sha256": self.entry["label_sha256"],
                    "label_version": "1.0.0", "reviewer": "Reviewer"}
        self.entry["review_decision_file"] = "decision.json"
        self.entry["review_decision_sha256"] = self.write("decision.json", decision)
        manifest_hash = self.write("manifest.json", self.manifest)
        self.write("predictions.json", {"scenarios": [{"scenario_id": "T01", "predictions": predictions}]})
        return score(self.root, "manifest.json", manifest_hash, self.root / "predictions.json")

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
