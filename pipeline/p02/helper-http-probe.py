"""Supplementary fixed GET collection; no POST, labels or model calls."""
import argparse
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('p02_f03_helper_collection', Path(__file__).with_name('f03-probe.py'))
f03 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(f03)


def collect(directory):
    rows = []
    for name, target, path in [('owner', 'customers', '/owners/6'),
                               ('provider', 'visits', '/pets/visits?petId=7,8'),
                               ('gateway', 'gateway', '/api/gateway/owners/6')]:
        record, parsed = f03.capture(directory, {'id': name, 'method': 'GET', 'target': target, 'path': path})
        rows.append(record)
        if record['error'] or record['status'] != 200 or parsed is None:
            raise RuntimeError('Supplement input GET failed; retained raw: ' + name)
    f03.save(directory / 'result.json', {'status': 'three_fixed_gets_captured', 'http_records': [row['id'] for row in rows],
                                       'post_requests': 0, 'labels_created': False})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    collect(args.output)
