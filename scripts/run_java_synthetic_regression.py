"""Synthetic parser diagnostics only; never reads PetClinic, labels or scores.

Writes a NEW output directory containing every generated Java source and native
parser JSON, including failures. Expectations are software structure/contract
checks, not change-impact benchmark ground truth.
"""
import argparse
import copy
import hashlib
import importlib.metadata
import json
import sys
import traceback
from pathlib import Path


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8', newline='\n') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')


def provider(annotation='@GetMapping("/records")', query='', package='demo.visits'):
    return ('package ' + package + ';\nimport java.util.List;\nimport org.springframework.web.bind.annotation.*;\n'
            '@RestController\n@RequestMapping("/api")\nclass Provider {\n    ' + annotation + '\n'
            '    public Object list(@RequestParam(name="ids") List<Integer> ids' + query + ') { return null; }\n}\n')


def client(uri='"http://visits-service/api/records?ids=1,2"', extra=''):
    return ('package demo.api;\nimport org.springframework.stereotype.Service;\n'
            'import org.springframework.web.reactive.function.client.WebClient;\nimport reactor.core.publisher.Mono;\n'
            '@Service\nclass Client {\n    private final WebClient webClient;\n' + extra + '\n'
            '    Client(WebClient webClient) { this.webClient = webClient; }\n'
            '    public Mono<Object> fetch() { return webClient.get().uri(' + uri + ').retrieve().bodyToMono(Object.class); }\n}\n')


OVERLOAD_CLIENT = ('package demo.api;\nclass Records {\n'
                   '    public Object lookup(String value) { return null; }\n'
                   '    public Object lookup(Integer value) { return null; }\n}\n')


def caller(argument):
    return ('package demo.api;\nimport org.springframework.web.bind.annotation.*;\n@RestController\nclass Entry {\n'
            '    private final Records records;\n    Entry(Records records) { this.records = records; }\n'
            '    @GetMapping("/entry")\n    public Object read() { return records.lookup(' + argument + '); }\n}\n')


def cases():
    return [
        {'id': 'S01', 'purpose': 'Class-level and method-level path plus literal URL', 'provider': provider(), 'client': client(), 'kind': 'valid'},
        {'id': 'S02', 'purpose': 'Explicit optional query/default; omitted by caller', 'provider': provider(query=', @RequestParam(name="expand", required=false, defaultValue="false") boolean expand'), 'client': client(), 'kind': 'optional'},
        {'id': 'S03', 'purpose': 'Required query omitted by caller', 'provider': provider(query=', @RequestParam(name="expand", required=true) boolean expand'), 'client': client(), 'kind': 'required'},
        {'id': 'S04', 'purpose': 'Default value with no declared required flag', 'provider': provider(query=', @RequestParam(name="expand", defaultValue="false") boolean expand'), 'client': client(), 'kind': 'default'},
        {'id': 'S05', 'purpose': 'Same path at wrong target service must not match', 'provider': provider(package='demo.vets'), 'client': client(), 'kind': 'no_edge', 'provider_service': 'vets-service'},
        {'id': 'S06', 'purpose': 'POST endpoint must not match GET caller', 'provider': provider(annotation='@PostMapping("/records")'), 'client': client(), 'kind': 'no_edge'},
        {'id': 'S07', 'purpose': 'Dynamic hostname remains unresolved', 'provider': provider(), 'client': client('"http://" + host + "/api/records?ids=1,2"', '    private String host;'), 'kind': 'dynamic'},
        {'id': 'S08', 'purpose': 'Ambiguous null overload must not produce definite CALLS edges', 'provider': OVERLOAD_CLIENT, 'client': caller('null'), 'kind': 'ambiguous', 'provider_service': 'api-gateway'},
        {'id': 'S09', 'purpose': 'LF/CRLF semantic parity on the synthetic mapping fixture', 'provider': provider(), 'client': client(), 'kind': 'line_endings'},
        {'id': 'S10', 'purpose': 'Known String overload selects one target', 'provider': OVERLOAD_CLIENT, 'client': caller('"known"'), 'kind': 'known_overload', 'provider_service': 'api-gateway'},
    ]


def graph_projection(graph):
    return {'endpoints': [{k: ep[k] for k in ('handler_id', 'service', 'http_method', 'normalized_path', 'query_parameters')} for ep in graph['endpoints']],
            'edges': [{k: edge.get(k) for k in ('source_id', 'target_id', 'type', 'target_service', 'http_method', 'normalized_path', 'contract_status', 'missing_required_parameters')} for edge in graph['edges']]}


def assertions(case, graphs):
    graph = graphs[0]
    rest = [edge for edge in graph['edges'] if edge['type'] == 'INVOKES_API']
    checks = []

    def expect(condition, message):
        checks.append({'check': message, 'pass': bool(condition)})

    kind = case['kind']
    if kind in ('valid', 'optional', 'required', 'default', 'line_endings'):
        expect(len(rest) == 1, 'Exactly one REST dependency, no guessed or duplicate target')
        if rest:
            expect(rest[0]['normalized_path'] == '/api/records', 'Class and method mapping path preserved')
            expect(len(rest[0].get('evidence', [])) >= 2, 'Caller/provider source evidence retained')
            for evidence in rest[0].get('evidence', []):
                expect(evidence['line_start'] > 0 and evidence['line_end'] >= evidence['line_start'], 'Nonempty bounded evidence span')
            expect(rest[0]['contract_status'] == ('CONTRACT_MISMATCH_MISSING_REQUIRED_PARAMS' if kind == 'required' else 'VALID'), 'Required/default contract classification')
        endpoint = next((ep for ep in graph['endpoints'] if ep['normalized_path'] == '/api/records'), None)
        expect(endpoint is not None, 'Mapped provider endpoint exists')
        if endpoint and kind in ('optional', 'required', 'default'):
            query = next((q for q in endpoint['query_parameters'] if q['name'] == 'expand'), None)
            expect(query is not None, 'Declared synthetic query parameter retained')
            if query:
                expect(query['declared_required'] == (False if kind == 'optional' else True if kind == 'required' else None), 'Declared flag separated from effective flag')
                expect(query['effective_required'] == (kind == 'required'), 'Default/optional effective flag')
                expect(query['default_value'] == (None if kind == 'required' else 'false'), 'Literal default preserved')
    elif kind in ('no_edge', 'dynamic'):
        expect(len(rest) == 0, 'Service/method/dynamic URI cannot yield false REST match')
        expect(bool(graph.get('unresolved')), 'Unsupported/unmatched expression retained as unresolved')
    elif kind == 'ambiguous':
        matched = [edge for edge in graph['edges'] if edge['type'] == 'CALLS' and '#lookup(' in edge['target_id']]
        expect(not any(edge.get('resolution_status') == 'RESOLVED' for edge in matched), 'Unknown null overload must not be claimed RESOLVED')
        expect(any('lookup' in str(row.get('expression', '')) for row in graph.get('unresolved', [])), 'Ambiguous invocation remains explicit unresolved')
    elif kind == 'known_overload':
        matched = [edge for edge in graph['edges'] if edge['type'] == 'CALLS' and '#lookup(' in edge['target_id']]
        expect(len(matched) == 1 and matched[0]['target_id'].endswith('#lookup(String)'), 'Known String selects only String overload')
    if kind == 'line_endings':
        expect(graph_projection(graphs[0]) == graph_projection(graphs[1]), 'Only explicit path/provenance differences excluded from LF/CRLF comparison')
    return checks


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--implementation', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    implementation, output = args.implementation.resolve(), args.output.resolve()
    output.mkdir(parents=True, exist_ok=False)
    sys.path.insert(0, str(implementation))
    from src.parser import DependencyGraphBuilder
    code_path = implementation / 'src/parser.py'
    code_hash = hashlib.sha256(code_path.read_bytes()).hexdigest()
    results = []
    for case in cases():
        directory = output / case['id']; directory.mkdir()
        dump(directory / 'CASE.json', {k: v for k, v in case.items() if k not in ('provider', 'client')})
        graphs, error = [], None
        try:
            for variant in (['lf', 'crlf'] if case['kind'] == 'line_endings' else ['lf']):
                root = directory / variant
                provider_path = root / case.get('provider_service', 'visits-service') / 'Provider.java'
                client_path = root / 'api-gateway' / 'Client.java'
                for path, source in [(provider_path, case['provider']), (client_path, case['client'])]:
                    path.parent.mkdir(parents=True, exist_ok=True)
                    raw = source.replace('\n', '\r\n').encode() if variant == 'crlf' else source.encode()
                    with path.open('xb') as stream: stream.write(raw)
                builder = DependencyGraphBuilder(commit_sha='not-a-git-commit:synthetic-dev-fixtures-v1', repository='synthetic://java-rest-regression')
                graph = builder.build_multi_file_graph([str(provider_path), str(client_path)], snapshot_kind='synthetic_dev')
                graphs.append(copy.deepcopy(graph)); dump(directory / (variant + '.graph.json'), graph)
            checks = assertions(case, graphs)
        except Exception as failure:
            error = type(failure).__name__ + ': ' + str(failure)
            (directory / 'exception.txt').write_text(traceback.format_exc(), encoding='utf-8')
            checks = [{'check': 'Parser invocation and native output accessible', 'pass': False}]
        row = {'id': case['id'], 'purpose': case['purpose'], 'pass': all(item['pass'] for item in checks), 'checks': checks, 'error': error}
        dump(directory / 'RESULT.json', row); results.append(row)
    if hashlib.sha256(code_path.read_bytes()).hexdigest() != code_hash:
        raise RuntimeError('Implementation source changed during diagnostic')
    report = {'schema': 'java-parser-synthetic-diagnostics/1', 'scope': 'Software regression fixtures only; no P02/P03 actual method outputs, impact labels or research scores',
              'implementation_parser_sha256': code_hash, 'dependencies': {name: importlib.metadata.version(name) for name in ('tree-sitter', 'tree-sitter-java')},
              'cases': results, 'cases_passed': sum(row['pass'] for row in results), 'cases_failed': sum(not row['pass'] for row in results),
              'implementation_modified': False, 'neo4j_run': False, 'model_calls': 0, 'labels_created': False}
    dump(output / 'REPORT.json', report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not report['cases_failed'] else 1


if __name__ == '__main__':
    sys.exit(main())
