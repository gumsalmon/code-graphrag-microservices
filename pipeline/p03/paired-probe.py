"""D19 fixture evidence collector. HTTP errors are observations, never predictions."""
import argparse
import copy
import json
import time
from pathlib import Path

from response_checks import strict_json, canonical
import importlib.util

spec = importlib.util.spec_from_file_location('p03_baseline_probe', Path(__file__).with_name('baseline-probe.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)


def readiness_spec(target):
    if target in ('customers', 'visits', 'gateway'):
        return target, '/actuator/health'
    if target == 'registered':
        return 'discovery', '/eureka/apps'
    if target in ('config', 'discovery'):
        return target, base.shared.READY_PATHS[target]
    raise ValueError('Unknown readiness target')


def lifecycle_ready(target, body):
    if target in ('customers', 'visits', 'gateway'):
        return isinstance(body, dict) and body.get('status') == 'UP'
    if target == 'registered':
        apps = body.get('applications', {}).get('application', []) if isinstance(body, dict) else []
        if not isinstance(apps, list):
            apps = [apps]
        for name in ('CUSTOMERS-SERVICE', 'VISITS-SERVICE', 'API-GATEWAY'):
            if not any(a.get('name') == name and any(i.get('status') == 'UP' for i in
                       (a['instance'] if isinstance(a.get('instance'), list) else [a.get('instance', {})])) for a in apps):
                return False
        return True
    return base.shared.setup_ready(target, body)


def wait(directory, target):
    host_target, path = readiness_spec(target)
    deadline, attempts = time.monotonic() + 150, 0
    while time.monotonic() < deadline:
        attempts += 1
        record, body = base.shared.capture(directory, 'readiness-%03d' % attempts, host_target, path)
        if record['error'] is None and record['status'] == 200 and lifecycle_ready(target, body):
            result = {'status': 'lifecycle_ready', 'target': target, 'path': path, 'attempts': attempts,
                      'measurement_version': 2, 'business_response_shape_used_as_readiness': False,
                      'all_readiness_attempts_retained': True, 'labels_created': False}
            base.save(directory / 'readiness.json', result)
            return result
        time.sleep(2)
    raise RuntimeError('Lifecycle readiness timed out; business response outcome is not a readiness criterion')


def readback_owner(raw, expected):
    """Fixture identity check only. Explicit pets/animals alternative; raw is unchanged."""
    value = strict_json(raw)
    if not isinstance(value, dict):
        raise ValueError('Readback is not an owner object')
    collection_keys = [key for key in ('pets', 'animals') if key in value]
    if len(collection_keys) != 1:
        raise ValueError('Readback collection identity is ambiguous/missing')
    key = collection_keys[0]
    projected = {('pets' if k == key else k): v for k, v in value.items()}
    if canonical(projected) != canonical(expected):
        raise ValueError('Readback differs beyond disclosed collection-key alternative')
    return {'collection_key_observed': key, 'normalization_for_fixture_identity_only': True, 'raw_modified': False}


def collect(directory, fixture, snapshot):
    if snapshot not in ('baseline', 'mutated'):
        raise ValueError('Explicit baseline/mutated snapshot required')
    if snapshot == 'baseline':
        result = base.collect(directory, fixture)
        result = {**result, 'schema': 'p03-paired-observations/1', 'measurement_version': 2, 'snapshot': snapshot,
                  'status': 'fixture_evidence_collected', 'input_locked': True}
        base.save(directory / 'paired-observations.json', result)
        return result
    bindings, ledger, observations, fixture_readbacks = {}, [], {}, []

    def request(definition, kind):
        row = copy.deepcopy(definition)
        row['path'] = base.bind_path(row['path'], bindings)
        record, raw = base.capture(directory, row, fixture, bindings)
        observations[row['id']] = (record, raw)
        ledger.append({'order': len(ledger) + 1, 'id': row['id'], 'kind': kind,
                       'method': row['method'], 'path': row['path'], 'status': record['status']})
        base.save(directory / ('ledger-%02d.json' % len(ledger)), {'requests': ledger, 'bindings': bindings})
        return record, raw

    record, raw = request({'id': 'seed_owner_list', 'target': 'customers', 'method': 'GET', 'path': '/owners'}, 'reset_check')
    seed = strict_json(raw)
    if record['status'] != 200 or not isinstance(seed, list) or sorted(base.owner(o)['id'] for o in seed) != fixture['seed_owner_ids']:
        raise ValueError('Fresh owner DB does not match selected seed census')
    expected_pets = {(p['owner_id'], p['id']) for p in fixture['seed_pets']}
    actual_pets = {(o['id'], p['id']) for o in seed for p in o['pets']}
    if expected_pets != actual_pets or sum(len(o['pets']) for o in seed) != len(fixture['seed_pets']):
        raise ValueError('Fresh pet DB differs from fixture')
    setup = fixture['empty_pets_setup']
    record, raw = request({'id': 'setup_empty_owner', **{k: setup[k] for k in ('method', 'target', 'path', 'body')}}, 'fixture_setup')
    created = base.created_owner(record, raw, setup['body'], fixture['seed_owner_ids'], [])
    bindings['empty_owner_id'] = created['id']
    record, raw = request({'id': 'setup_empty_readback', 'target': 'customers', 'method': 'GET', 'path': '/owners/{empty_owner_id}'}, 'fixture_setup_readback')
    if record['status'] != 200:
        raise ValueError('Empty setup cannot be verified by readback')
    fixture_readbacks.append({'id': 'setup_empty_readback', **readback_owner(raw, created)})
    for definition in fixture['requests']:
        record, raw = request(definition, 'fixture_slot')
        name = definition['id']
        # GET 4xx/5xx and response bodies are retained. Do not require a selected mutation outcome here.
        if name == 'create_control':
            created_write = base.created_owner(record, raw, definition['body'], fixture['seed_owner_ids'], list(bindings.values()))
            bindings['write_owner_id'] = created_write['id']
            rb, body = request({'id': 'create_readback', 'target': 'customers', 'method': 'GET', 'path': '/owners/{write_owner_id}'}, 'write_readback')
            if rb['status'] != 200:
                raise ValueError('POST control has no successful independent readback')
            fixture_readbacks.append({'id': 'create_readback', **readback_owner(body, created_write)})
        elif name == 'update_control':
            if record['status'] != 204 or raw != b'':
                raise ValueError('PUT control violates original declared write contract')
            rb, body = request({'id': 'update_readback', 'target': 'customers', 'method': 'GET', 'path': '/owners/{write_owner_id}'}, 'write_readback')
            expected = {'id': bindings['write_owner_id'], 'pets': [], **definition['body']}
            if rb['status'] != 200:
                raise ValueError('PUT control has no successful independent readback')
            fixture_readbacks.append({'id': 'update_readback', **readback_owner(body, expected)})
    result = {'schema': 'p03-paired-observations/1', 'measurement_version': 2, 'status': 'fixture_evidence_collected', 'snapshot': snapshot,
              'fixture_slots': len(fixture['requests']), 'slots': [row for row in ledger if row['kind'] == 'fixture_slot'],
              'all_requests': ledger, 'bindings': bindings, 'reset_seed_owners': len(seed),
              'reset_seed_pets': sum(len(o['pets']) for o in seed), 'fixture_identity_readbacks': fixture_readbacks,
              'mutated_executed': True, 'input_locked': True, 'labels_created': False, 'model_calls': 0}
    base.save(directory / 'paired-observations.json', result)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['wait', 'setup', 'collect'])
    parser.add_argument('--output', required=True)
    parser.add_argument('--fixture')
    parser.add_argument('--target', choices=list(base.shared.TARGETS) + ['registered'])
    parser.add_argument('--snapshot', choices=['baseline', 'mutated'], required=True)
    args = parser.parse_args()
    directory = Path(args.output)
    if not str(directory).startswith('/run/'):
        raise ValueError('Private mounted output required')
    directory.mkdir(parents=True, exist_ok=False)
    try:
        if args.action == 'wait':
            result = wait(directory, args.target)
        else:
            fixture = strict_json(Path(args.fixture).read_bytes())
            result = base.support.setup(directory, fixture) if args.action == 'setup' else collect(directory, fixture, args.snapshot)
        print(json.dumps(result))
    except Exception as error:
        base.save(directory / 'failure.json', {'error': str(error), 'snapshot': args.snapshot, 'labels_created': False})
        raise


if __name__ == '__main__':
    main()
