"""Full raw/JSON repetition comparison with error variability retained, no scoring."""
import argparse
import hashlib
import json
from pathlib import Path


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':'), allow_nan=False)


def parsed(raw):
    if raw == b'':
        return 'empty', None
    def pairs(rows):
        value = {}
        for key, item in rows:
            if key in value:
                raise ValueError('Duplicate JSON key')
            value[key] = item
        return value
    try:
        value = json.loads(raw.decode('utf-8'), object_pairs_hook=pairs,
                           parse_constant=lambda s: (_ for _ in ()).throw(ValueError(s)))
        return 'json', value
    except (ValueError, UnicodeDecodeError):
        return 'non_json', None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args(); root = args.run.resolve(); snapshots = []
    for snapshot in ['baseline', 'mutated']:
        first = root / 'groups' / (snapshot + '-r1') / 'observations'
        second = root / 'groups' / (snapshot + '-r2') / 'observations'
        left = json.loads((first / 'paired-observations.json').read_text())
        right = json.loads((second / 'paired-observations.json').read_text())
        if [row['id'] for row in left['all_requests']] != [row['id'] for row in right['all_requests']]:
            raise ValueError('Repetitions have different request order')
        comparisons = []
        for request in left['all_requests']:
            name = request['id']; a = json.loads((first / (name + '.json')).read_text()); b = json.loads((second / (name + '.json')).read_text())
            x = (first / (name + '.body')).read_bytes(); y = (second / (name + '.body')).read_bytes()
            kx, vx = parsed(x); ky, vy = parsed(y)
            equal_json = canonical(vx) == canonical(vy) if kx == ky == 'json' else None
            diagnostics = name.startswith(('gateway_', 'missing_'))
            diff = sorted(key for key in set(vx) | set(vy) if canonical(vx.get(key)) != canonical(vy.get(key))) if isinstance(vx, dict) and isinstance(vy, dict) else None
            if a['status'] != b['status'] or a['path'] != b['path'] or a['method'] != b['method']:
                raise ValueError('Repetition request/status differs: ' + snapshot + '/' + name)
            if not diagnostics and not (x == y or equal_json is True):
                raise ValueError('Required contract/control repetition differs: ' + snapshot + '/' + name)
            comparisons.append({'request_id': name, 'status': a['status'], 'request_path': a['path'],
                                'raw_bytes_equal': x == y, 'full_parsed_json_equal': equal_json,
                                'r1_body_kind': kx, 'r2_body_kind': ky, 'different_top_level_fields': diff,
                                'r1_sha256': hashlib.sha256(x).hexdigest(), 'r2_sha256': hashlib.sha256(y).hexdigest(),
                                'diagnostic_not_assumed_unchanged': diagnostics})
        snapshots.append({'snapshot': snapshot, 'requests_compared': len(comparisons),
                          'observed_ids_r1': left['bindings'], 'observed_ids_r2': right['bindings'],
                          'comparisons': comparisons})
    result = {'scope': 'repetition consistency of raw/contract/control evidence only', 'snapshots': snapshots,
              'raw_modified': False, 'error_fields_removed_or_normalized': False, 'labels_created': False,
              'new_independent_scenarios_claimed': False, 'model_calls': 0}
    with args.output.open('x', encoding='utf-8') as stream:
        json.dump(result, stream, indent=2); stream.write('\n')
    print(json.dumps({'snapshots': len(snapshots), 'request_pairs_compared': sum(s['requests_compared'] for s in snapshots),
                      'raw_differences_retained': [(s['snapshot'], c['request_id'], c['different_top_level_fields']) for s in snapshots for c in s['comparisons'] if not c['raw_bytes_equal']],
                      'labels_created': False}, indent=2))


if __name__ == '__main__':
    main()
