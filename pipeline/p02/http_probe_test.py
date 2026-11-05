"""Synthetic probe tests, never runtime or label evidence."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("p02_http_probe", Path(__file__).with_name("http-probe.py"))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class ReadinessTests(unittest.TestCase):
    def test_empty_gateway_fallback_is_not_populated_setup(self):
        body = {"id": 6, "pets": [{"id": 7, "visits": []}, {"id": 8, "visits": []}]}
        self.assertFalse(probe.setup_ready("gateway", body))
        self.assertTrue(probe.setup_ready("customers", body))

    def test_wrong_owner_and_wrong_pet_ids_cannot_be_ready(self):
        self.assertFalse(probe.setup_ready("gateway", {"id": 1, "pets": []}))
        self.assertFalse(probe.setup_ready("gateway", {"id": 6, "pets": [{"id": 999, "visits": [{}, {}, {}, {}]}]}))

    def test_direct_visits_need_the_pinned_fixture_ids(self):
        self.assertFalse(probe.setup_ready("visits", {"items": []}))
        self.assertTrue(probe.setup_ready("visits", {"items": [{"id": i} for i in [1, 2, 3, 4]]}))

    def test_config_requires_nonempty_sources_not_just_http_200(self):
        self.assertFalse(probe.setup_ready("config", {"propertySources": []}))
        self.assertTrue(probe.setup_ready("config", {"propertySources": [{"name": "fixture"}]}))

    def test_public_targets_rejected_before_network(self):
        with self.assertRaises(ValueError):
            probe.capture(Path("/unused"), "synthetic", "https://example.com", "/")


if __name__ == "__main__":
    unittest.main()
