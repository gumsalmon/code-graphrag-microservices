"""Receipt-guarded P03 technical extraction, never prediction/scoring or runtime."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from src.parser import DependencyGraphBuilder
from src.neo4j_importer import Neo4jGraphImporter
from src.response_survey import survey_source, walk
from tree_sitter import Language, Parser
import tree_sitter_java


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def save(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def safe(root, relative):
    path = (root / relative).resolve()
    require(path.is_relative_to(root.resolve()), 'Path outside allowed root')
    return path


def verify(packet, receipt_hash):
    receipt_file = packet / 'P03_TECHNICAL_RECEIPT_2026-11-02.json'
    require(sha(receipt_file) == receipt_hash, 'Receipt hash mismatch')
    r = read(receipt_file)
    require(r['case'] == 'P03' and r['status'] == 'ready_for_offline_integration', 'P03 gate closed')
    require(r['authority_id'] == 'D20', 'Unexpected authority')
    require(not r['model_calls_authorized'] and not r['official_scoring_authorized'], 'Unsupported authority scope')
    require(sha(packet/'decisions/D20.json') == r['authority_sha256'], 'D20 hash mismatch')
    require(sha(packet/'decisions/D19.json') == r['input_decision_sha256'], 'D19 hash mismatch')
    d19, d20 = read(packet/'decisions/D19.json'), read(packet/'decisions/D20.json')
    inputs, candidate = r['case_inputs'], packet/'candidate'
    for key in ('source_commit', 'config_commit', 'scenario_version', 'universe_version', 'fixture_version', 'scope_version', 'candidate_manifest_sha256'):
        require(inputs[key] == d19[key], 'Pin differs from D19: '+key)
    require(d20['case_inputs']['P03']['input_decision_sha256'] == r['input_decision_sha256'], 'D20 P03 binding mismatch')
    require(sha(candidate/'SHA256SUMS.txt') == inputs['candidate_manifest_sha256'], 'Candidate manifest hash mismatch')
    for item in d19['artifacts']:
        require(sha(safe(candidate, item['path'])) == item['sha256'], 'Input hash mismatch: '+item['path'])
    for item in ('scenario', 'universe', 'fixture', 'scope', 'inventory', 'patch'):
        require(inputs[item+'_sha256'] in {a['sha256'] for a in d19['artifacts']}, 'Receipt artifact binding mismatch')
    # Verify all candidate byte files, including config and mutated overlay.
    bindings = []
    for line in (candidate/'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
        digest, rel = line.split(None, 1)
        rel = rel.lstrip('*')
        require(sha(safe(candidate, rel)) == digest, 'Candidate byte mismatch: '+rel)
        bindings.append({'file': rel, 'sha256_bytes': digest})
    return r, bindings


def inspect(raw, file, class_fqn, graph):
    tree = Parser(Language(tree_sitter_java.language())).parse(raw)
    require(not tree.root_node.has_error, 'Invalid Java '+file)
    def txt(n):
        return raw[n.start_byte:n.end_byte].decode('utf-8') if n else None
    def span(n):
        return {'file': file, 'line_start': n.start_point[0]+1, 'line_end': n.end_point[0]+1, 'expression': txt(n)}
    eligible, unsupported, syntax = [], [], []
    for decl in tree.root_node.named_children:
        if decl.type not in ('class_declaration', 'record_declaration'):
            continue
        body = decl.child_by_field_name('body')
        for n in body.named_children if body else []:
            if n.type == 'method_declaration':
                name = txt(n.child_by_field_name('name'))
                represented = [x for x in graph['nodes'] if x['class_fqn'] == class_fqn and x['method_name'] == name and x['line_end'] == n.end_point[0]+1]
                eligible.append({**span(n), 'name': name, 'represented_ids': [x['id'] for x in represented], 'status': 'represented' if represented else 'unsupported', 'reason': None if represented else 'Native parser handles class declarations only; record explicit method not extracted'})
            elif n.type in ('constructor_declaration', 'class_declaration', 'record_declaration'):
                unsupported.append({**span(n), 'kind': n.type, 'status': 'excluded_from_top_level_method_census'})
        if decl.type == 'record_declaration':
            unsupported.append({**span(decl.child_by_field_name('parameters')), 'kind': 'implicit_record_methods', 'status': 'not_synthesized', 'reason': 'No implicit accessor/constructor IDs invented'})
    # Supplemental raw AST evidence. No Java names are inferred to be JSON fields.
    for n in walk(tree.root_node):
        if n.type in ('return_statement', 'method_invocation', 'method_reference', 'record_declaration', 'field_declaration', 'annotation', 'marker_annotation'):
            syntax.append({**span(n), 'kind': n.type, 'binding': 'syntax_only', 'serialization_dataflow': 'unresolved'})
    return {'explicit_methods': eligible, 'unsupported_excluded': unsupported, 'raw_syntax': syntax, 'survey': survey_source(raw, file)}


def run(packet, receipt_hash, out):
    require(not out.exists(), 'Refuse overwrite existing output')
    r, bindings = verify(packet, receipt_hash)
    c = packet/'candidate'
    scope, scenario = read(c/'spec/scope.candidate.v1.json'), read(c/'spec/scenario.candidate.v0.1.0.json')
    inventory, provenance = read(c/'draft/inventory.v1.json'), read(c/'PROVENANCE.json')
    require(scenario['baseline_commit'] == r['case_inputs']['source_commit'], 'Source pin mismatch')
    mutation = scenario['mutation']
    baseline_mutation = safe(c/'input/app', mutation['file']).read_text(encoding='utf-8')
    overlay = safe(c/'mutated/app', mutation['file'])
    require(sha(overlay) == provenance['patch_result_sha256'], 'Mutation hash mismatch')
    require(baseline_mutation.count(mutation['old_method']) == 1, 'Mutation anchor mismatch')
    mutated_text = overlay.read_text(encoding='utf-8')
    require(mutation['new_method'] in mutated_text and mutation['old_method'] not in mutated_text, 'Mutation body mismatch')
    out.mkdir(parents=True)
    report = {'case': 'P03', 'receipt_id': r['receipt_id'], 'receipt_sha256': receipt_hash, 'pins': r['case_inputs'], 'candidate_file_bindings': bindings, 'code_sha256': {str(x.relative_to(ROOT)): sha(x) for x in (ROOT/'src/parser.py', ROOT/'src/neo4j_importer.py', ROOT/'src/response_survey.py', Path(__file__))}, 'snapshots': {}, 'limitations': ['No labels, model, scoring, HTTP runtime or contract adoption', 'No serialization/dataflow edges inferred', 'Native IDs unchanged; repository/receipt/snapshot bindings are sidecar only', 'Mutated graph diagnostic only; never merge into primary baseline context']}
    for kind in ('baseline', 'mutated'):
        target = out/kind
        target.mkdir()
        files, source_map = [], []
        for item in scope['files']:
            original = safe(c/'input/app', item['file'])
            require(sha(original) == inventory['source_files_sha256'][item['file']], 'Source hash mismatch')
            selected = overlay if kind == 'mutated' and item['file'] == mutation['file'] else original
            files.append(str(selected))
            source_map.append({'repo_file': item['file'], 'packet_file': str(selected.relative_to(packet)), 'sha256_bytes': sha(selected)})
        graph = DependencyGraphBuilder(commit_sha=scenario['baseline_commit']).build_multi_file_graph(files, snapshot_kind=kind, patch_id=sha(c/'spec/owner-response-rename.patch') if kind == 'mutated' else None)
        seed_spec = [(f, m) for f in scope['files'] for m in f['methods'] if m.get('seed')]
        require(len(seed_spec) == 1, 'Ambiguous seed declaration')
        f, m = seed_spec[0]
        seed = f['service']+'::'+f['class_fqn']+'#'+m['signature']
        require(seed in {x['id'] for x in graph['nodes']}, 'Missing snapshot seed')
        audit = [inspect(Path(path).read_bytes(), item['file'], item['class_fqn'], graph) for item,path in zip(scope['files'],files)]
        eligible = [x for a in audit for x in a['explicit_methods']]
        represented = {i for x in eligible for i in x['represented_ids']}
        extras = [x for x in graph['nodes'] if x['id'] not in represented]
        save(target/'graph.native.json', graph)
        Neo4jGraphImporter().generate_cypher_script(graph, str(target/'graph.cypher'))
        save(target/'inventory-response-audit.json', {'scope': scope['scope_id'], 'audit': audit, 'out_of_scope_native_nodes': extras, 'missing_is_negative': False})
        save(target/'bindings.json', {'repository': scenario['repository'], 'snapshot_kind': kind, 'source_commit': scenario['baseline_commit'], 'receipt_sha256': receipt_hash, 'seed_id': seed, 'source_map': source_map, 'native_id_scope': 'service/class/signature; repository/commit/snapshot bound by this sidecar and isolated DB'})
        for hops in (1,2,3):
            save(target/f'offline-retrieval-{hops}.json', DependencyGraphBuilder().trace_backward_impact(graph, seed, max_hops=hops))
        raw = (target/'graph.cypher').read_bytes()
        report['snapshots'][kind] = {'seed_id': seed, 'native_methods': len(graph['nodes']), 'eligible_explicit': len(eligible), 'represented_explicit': sum(bool(x['represented_ids']) for x in eligible), 'unsupported_explicit': [x for x in eligible if not x['represented_ids']], 'out_of_scope_native_count': len(extras), 'endpoints': len(graph['endpoints']), 'edges': len(graph['edges']), 'unresolved': len(graph['unresolved']), 'graph_sha256_bytes': sha(target/'graph.native.json'), 'cypher_sha256_bytes': hashlib.sha256(raw).hexdigest(), 'cypher_sha256_lf_canonical': hashlib.sha256(raw.replace(b'\r\n',b'\n')).hexdigest(), 'source_map': source_map}
    save(out/'report.json',report)
    print(json.dumps({k:{a:b for a,b in v.items() if a not in ('source_map','unsupported_explicit')} for k,v in report['snapshots'].items()},indent=2))


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--packet', type=Path, required=True)
    p.add_argument('--receipt-sha256', required=True)
    p.add_argument('--out', type=Path, required=True)
    a = p.parse_args()
    run(a.packet.resolve(), a.receipt_sha256, a.out.resolve())
