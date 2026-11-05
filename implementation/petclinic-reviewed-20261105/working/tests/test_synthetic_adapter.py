"""Only generated Java inputs; no project case labels/runtime/Neo4j."""
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from src.parser import DependencyGraphBuilder
from src.response_survey import survey_source
from src.synthetic_adapter import run_synthetic


SOURCES = {
    'visits-service/Provider.java': '''package demo.visits;
import java.util.*;
class Provider {
 @GetMapping("/catalog")
 public Object read(@RequestParam("ids") List<Integer> ids) {
   return Map.of("entries", ids);
 }
}
''',
    'api-gateway/Client.java': '''package demo.api;
class Client {
 public Object fetch() {return web.get().uri("http://visits-service/catalog?ids=1").retrieve();}
}
''',
    'api-gateway/View.java': '''package demo.api;
record View(int id, java.util.List<String> entries) {}
class Dto {
 @JsonProperty("external") private String label;
 public Object consume(View view, Dto dto, String dynamicKey) {
   Object x = Map.of("renamed", view.entries(), dynamicKey, dto.label);
   return Optional.ofNullable(dto).map(v -> v.getLabel());
 }
}
'''
}
SEED = 'visits-service::demo.visits.Provider#read(List<Integer>)'


def create_input(root, crlf=False):
    root.mkdir()
    files = []
    for name, source in SOURCES.items():
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        raw = source.replace('\n', '\r\n').encode() if crlf else source.encode()
        path.write_bytes(raw)
        files.append(dict(path=name, sha256=hashlib.sha256(raw).hexdigest()))
    manifest = dict(schema='synthetic-integration-input/1', kind='synthetic_only',
                    repository='synthetic://milestone-a', revision='synthetic-v1', snapshot_kind='synthetic_dev',
                    seed_id=SEED, provenance=dict(fixture_version='v1', origin='generated test source, not PetClinic'),
                    source_files=files)
    file = root / 'input.json'
    file.write_text(json.dumps(manifest), encoding='utf-8')
    return file, manifest


class AdapterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.manifest, self.data = create_input(self.root / 'input')

    def update_manifest(self, data):
        self.manifest.write_text(json.dumps(data), encoding='utf-8')

    def test_native_unchanged_seed_provenance_and_input_output_isolation(self):
        sources = [self.manifest.parent / row['path'] for row in self.data['source_files']]
        before = {p: p.read_bytes() for p in [self.manifest, *sources]}
        expected = DependencyGraphBuilder(repository=self.data['repository'], commit_sha=self.data['revision']).build_multi_file_graph(
            [str(p) for p in sources], snapshot_kind='synthetic_dev')
        result = run_synthetic(self.manifest, self.root / 'out')
        graph = json.loads((self.root / 'out/graph.native.json').read_text())
        self.assertEqual(graph, expected)
        self.assertTrue(result['seed_present_in_native_nodes'])
        self.assertEqual(result['provenance'], self.data['provenance'])
        for endpoint in graph['endpoints']:
            self.assertIn(endpoint['evidence']['file'], result['native_source_map'])
        self.assertFalse(result['neo4j_run'])
        self.assertEqual(before, {p: p.read_bytes() for p in before})
        self.assertTrue((self.root / 'out/graph.synthetic.cypher').is_file())
        self.assertTrue((self.root / 'out/checksums.sha256').is_file())

    def test_repeat_has_identical_native_output_without_overwriting(self):
        run_synthetic(self.manifest, self.root / 'one')
        run_synthetic(self.manifest, self.root / 'two')
        self.assertEqual((self.root / 'one/graph.native.json').read_bytes(), (self.root / 'two/graph.native.json').read_bytes())
        with self.assertRaisesRegex(ValueError, 'new directory'):
            run_synthetic(self.manifest, self.root / 'one')

    def test_input_nested_output_and_ancestor_output_refused(self):
        for output in (self.manifest.parent / 'out', self.root):
            with self.assertRaisesRegex(ValueError, 'outside input'):
                run_synthetic(self.manifest, output)

    def test_actual_case_or_non_synthetic_identity_refused_before_run(self):
        for key, value in [('kind', 'actual_P02'), ('repository', 'https://example.org/real'), ('snapshot_kind', 'baseline')]:
            data = copy.deepcopy(self.data)
            data[key] = value
            self.update_manifest(data)
            with self.assertRaises(ValueError):
                run_synthetic(self.manifest, self.root / 'out')
            self.assertFalse((self.root / 'out').exists())

    def test_wrong_hash_refused_without_creating_output(self):
        self.data['source_files'][0]['sha256'] = '0' * 64
        self.update_manifest(self.data)
        with self.assertRaisesRegex(ValueError, 'hash mismatch'):
            run_synthetic(self.manifest, self.root / 'out')
        self.assertFalse((self.root / 'out').exists())

    def test_snapshot_revision_and_patch_preserved_without_changing_ids(self):
        self.data.update(snapshot_kind='synthetic_variant', revision='synthetic-v2', patch_id='toy-patch-1')
        self.update_manifest(self.data)
        run_synthetic(self.manifest, self.root / 'variant')
        graph = json.loads((self.root / 'variant/graph.native.json').read_text())
        self.assertEqual(graph['metadata']['snapshot_kind'], 'synthetic_variant')
        self.assertEqual(graph['metadata']['commit_sha'], 'synthetic-v2')
        self.assertEqual(graph['metadata']['patch_id'], 'toy-patch-1')
        self.assertTrue(any(n['id'] == SEED for n in graph['nodes']))

    def test_traversal_and_duplicate_allowlist_refused(self):
        for path in ('../escape.java', 'C:/outside.java', 'a\\b.java'):
            data = copy.deepcopy(self.data)
            data['source_files'][0]['path'] = path
            self.update_manifest(data)
            with self.assertRaisesRegex(ValueError, 'Unsafe'):
                run_synthetic(self.manifest, self.root / 'out')
        data = copy.deepcopy(self.data)
        data['source_files'].append(data['source_files'][0])
        self.update_manifest(data)
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            run_synthetic(self.manifest, self.root / 'out')

    def test_missing_seed_keeps_native_output_and_failure_record(self):
        self.data['seed_id'] = SEED.replace('List<Integer>', 'int')
        self.update_manifest(self.data)
        with self.assertRaisesRegex(ValueError, 'Seed absent'):
            run_synthetic(self.manifest, self.root / 'out')
        record = json.loads((self.root / 'out/run.json').read_text())
        self.assertEqual(record['status'], 'failed')
        self.assertFalse(record['seed_present_in_native_nodes'])
        self.assertTrue((self.root / 'out/graph.native.json').exists())
        self.assertTrue((self.root / 'out/checksums.sha256').exists())

    def test_input_change_is_failure_not_success(self):
        original = DependencyGraphBuilder.build_multi_file_graph
        def changing(builder, *args, **kwargs):
            result = original(builder, *args, **kwargs)
            self.manifest.write_text('{}')
            return result
        with patch.object(DependencyGraphBuilder, 'build_multi_file_graph', changing):
            with self.assertRaisesRegex(ValueError, 'Input changed'):
                run_synthetic(self.manifest, self.root / 'out')
        record = json.loads((self.root / 'out/run.json').read_text())
        self.assertEqual(record['status'], 'failed')

    def test_malformed_java_refused_before_partial_inference(self):
        source = self.manifest.parent / self.data['source_files'][0]['path']
        source.write_text('class { broken')
        self.data['source_files'][0]['sha256'] = hashlib.sha256(source.read_bytes()).hexdigest()
        self.update_manifest(self.data)
        with self.assertRaisesRegex(ValueError, 'Invalid Java'):
            run_synthetic(self.manifest, self.root / 'out')
        self.assertFalse((self.root / 'out').exists())


class SurveyTests(unittest.TestCase):
    def test_record_dto_map_and_accesses_are_observations_not_graph_edges(self):
        result = survey_source(SOURCES['api-gateway/View.java'].encode(), 'api-gateway/View.java')
        kinds = {row['kind'] for row in result['observations']}
        self.assertTrue({'record_component', 'dto_field', 'map_literal_key', 'field_access', 'accessor_call'} <= kinds)
        self.assertNotIn('edges', result)
        reasons = [r['reason'] for r in result['unresolved']]
        self.assertTrue(any('Dynamic Map key' in reason for reason in reasons))
        self.assertTrue(any('serialization' in reason for reason in reasons))
        self.assertTrue(any('Optional' in reason for reason in reasons))
        for row in result['observations'] + result['unresolved']:
            self.assertGreater(row['line_start'], 0)
            self.assertGreaterEqual(row['line_end'], row['line_start'])
            self.assertTrue(row['expression'])

    def test_lf_crlf_spans_and_utf8_literals(self):
        source = 'record Résumé(String tên) {}\nclass X {Object f(){return Map.of("tên", 1);}}\n'
        lf = survey_source(source.encode(), 'X.java')
        crlf = survey_source(source.replace('\n', '\r\n').encode(), 'X.java')
        def projection(data):
            return [(r['kind'], r['line_start'], r['line_end'], r['expression'].replace('\r\n', '\n')) for r in data['observations']]
        self.assertEqual(projection(lf), projection(crlf))
        self.assertTrue(any(r.get('java_literal') == '"tên"' for r in lf['observations']))

    def test_dynamic_map_and_nested_type_explicitly_unsupported(self):
        result = survey_source(b'class X {class Nested {} Object f(){return Map.of(key, 1);}}', 'X.java')
        self.assertTrue(any('Nested type' in r['reason'] for r in result['unresolved']))
        self.assertTrue(any('Dynamic Map key' in r['reason'] for r in result['unresolved']))
        self.assertFalse(any(r['kind'] == 'map_literal_key' for r in result['observations']))


if __name__ == '__main__':
    unittest.main()
