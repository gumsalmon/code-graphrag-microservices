import unittest
from package_p02_phat_f03 import forbidden
from transfer_security import safe_member


class PacketScopeTests(unittest.TestCase):
    def test_role_excludes_known_research_outputs_and_private_material(self):
        for name in ["runtime/parser-output.json","runtime/comparison.json","body-comparison.json","labels.v3.json",
                     "PROJECT_CONTEXT.md","FULL_PROJECT_CONTEXT_2026-10-18.md","reasoning/result.json","neo4j.cypher",
                     "credentials/key.clixml","source/.git/config","source/target/generated.class"]:
            with self.subTest(name=name):self.assertTrue(forbidden(name))

    def test_source_raw_protocol_and_empty_notes_are_allowed(self):
        for name in ["source/baseline/Example.java","runtime/groups/baseline-r1/observations/direct_omitted.body",
                     "protocol/benchmark_protocol_v0.2.md","templates/NOTES_BY_ENTITY.json","candidate/SHA256SUMS.txt"]:
            with self.subTest(name=name):self.assertFalse(forbidden(name));self.assertTrue(safe_member(name))

    def test_portable_paths_reject_escape_alternate_stream_and_windows_alias(self):
        for name in ["../escape","/absolute","C:/target","a:b","a/CON.txt","a\\b"]:
            self.assertFalse(safe_member(name))


if __name__=="__main__":unittest.main()
