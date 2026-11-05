"""P03 baseline fixture collection, fixed private hosts and disposable owners only."""
import argparse
import copy
import hashlib
import http.client
import importlib.util
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from response_checks import strict_json, canonical


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


shared = load('p03_shared_baseline', Path(__file__).resolve().parents[1] / 'p02/http-probe.py')
support = load('p03_shared_setup', Path(__file__).resolve().parents[1] / 'p02/f03-probe.py')
save = shared.save
OWNER_FIELDS = {'id', 'firstName', 'lastName', 'address', 'city', 'telephone', 'pets'}


def bind_path(path, bindings):
    for token in re.findall(r'\{([^{}]+)\}', path):
        value = bindings.get(token)
        if type(value) is not int or value <= 0:
            raise ValueError('Missing observed positive integer ID: ' + token)
        path = path.replace('{' + token + '}', str(value))
    if '{' in path or '}' in path:
        raise ValueError('Unresolved path binding')
    return path


def validate_request(request, fixture, bindings):
    name, target, method, path = (request[k] for k in ('id', 'target', 'method', 'path'))
    if not re.fullmatch(r'[a-z0-9_-]+', name) or target not in shared.TARGETS or method not in ('GET', 'POST', 'PUT'):
        raise ValueError('Unsupported observation or method/host')
    if not path.startswith('/') or path.startswith('//') or any(c in path for c in ('\r', '\n', '\\', '{', '}')):
        raise ValueError('Unsafe private request path')
    if method == 'GET':
        if 'body' in request:
            raise ValueError('Unexpected GET body')
        return
    if target != 'customers':
        raise ValueError('Writes may only target disposable Customers fixture')
    definition = fixture['empty_pets_setup'] if name == 'setup_empty_owner' else next(
        (row for row in fixture['requests'] if row['id'] == name), None)
    if definition is None or definition['method'] != method or request.get('body') != definition['body']:
        raise ValueError('Write not in selected fixture')
    if name == 'update_control' and bindings.get('write_owner_id') in fixture['seed_owner_ids']:
        raise ValueError('Refuse PUT to a seed owner')
    if path != bind_path(definition['path'], bindings):
        raise ValueError('Write path is not bound to observed owner')


def capture(directory, request, fixture, bindings):
    validate_request(request, fixture, bindings)
    name, method = request['id'], request['method']
    host, port = shared.TARGETS[request['target']]
    payload = json.dumps(request['body'], separators=(',', ':'), allow_nan=False).encode() if 'body' in request else None
    headers = {'Accept': 'application/json', 'Accept-Encoding': 'identity'}
    if payload is not None:
        headers['Content-Type'] = 'application/json'
    record = {'id': name, 'method': method, 'host': host, 'port': port, 'path': request['path'],
              'timestamp_utc': datetime.now(timezone.utc).isoformat(), 'request_headers': headers,
              'request_body_file': None, 'status': None, 'error': None, 'body_file': None,
              'response_headers': None, 'redirects_followed': False}
    if payload is not None:
        record.update(request_body_file=name + '.request.body', request_body_sha256=hashlib.sha256(payload).hexdigest(), request_body_bytes=len(payload))
        with (directory / record['request_body_file']).open('xb') as stream:
            stream.write(payload)
    connection = http.client.HTTPConnection(host, port, timeout=20)
    started, raw = time.monotonic(), None
    try:
        connection.request(method, request['path'], body=payload, headers=headers)
        response = connection.getresponse()
        record.update(status=response.status, response_headers=response.getheaders())
        raw = response.read(4 * 1024 * 1024 + 1)
        with (directory / (name + '.body')).open('xb') as stream:
            stream.write(raw)
        record.update(body_file=name + '.body', body_sha256=hashlib.sha256(raw).hexdigest(), body_bytes=len(raw))
        if len(raw) > 4 * 1024 * 1024:
            raise ValueError('Incomplete oversized response retained')
    except Exception as error:
        record['error'] = type(error).__name__ + ': ' + str(error)
    finally:
        connection.close()
        record['elapsed_ms'] = round((time.monotonic() - started) * 1000)
        save(directory / (name + '.json'), record)
    if record['error']:
        raise RuntimeError('Transport/incomplete observation; no retry: ' + name)
    return record, raw


def owner(body, expected_id=None):
    if not isinstance(body, dict) or set(body) != OWNER_FIELDS or type(body['id']) is not int or not isinstance(body['pets'], list):
        raise ValueError('Baseline Owner must retain all seven fields with pets list')
    if expected_id is not None and body['id'] != expected_id:
        raise ValueError('Unexpected owner ID')
    return body


def created_owner(record, raw, expected_body, seed_ids, already_bound):
    if record['status'] != 201:
        raise ValueError('POST status does not match OwnerResource contract')
    body = owner(strict_json(raw))
    if body['id'] in seed_ids or body['id'] in already_bound or body['id'] <= 0 or body['pets'] != []:
        raise ValueError('Created ID must be new, observed and empty-pets')
    if any(body.get(k) != v for k, v in expected_body.items()):
        raise ValueError('Created owner payload differs')
    return body


def collect(directory, fixture):
    bindings, observations, ledger = {}, {}, []

    def request(row, kind):
        row = copy.deepcopy(row)
        row['path'] = bind_path(row['path'], bindings)
        record, raw = capture(directory, row, fixture, bindings)
        observations[row['id']] = (record, raw)
        ledger.append({'order': len(ledger) + 1, 'id': row['id'], 'kind': kind,
                       'method': row['method'], 'path': row['path'], 'status': record['status']})
        # Persist each step, including partial ledgers if a subsequent operation fails.
        save(directory / ('ledger-%02d.json' % len(ledger)), {'requests': ledger, 'bindings': bindings})
        return record, raw

    # Prove reset before any write. Do not assume auto-generated ID 11.
    record, raw = request({'id': 'seed_owner_list', 'target': 'customers', 'method': 'GET', 'path': '/owners'}, 'reset_check')
    seed = strict_json(raw)
    if record['status'] != 200 or not isinstance(seed, list) or sorted(owner(row)['id'] for row in seed) != fixture['seed_owner_ids']:
        raise ValueError('Fresh owner DB does not match seed census')
    for expected in fixture['seed_pets']:
        parent = next(row for row in seed if row['id'] == expected['owner_id'])
        if not any(pet['id'] == expected['id'] for pet in parent['pets']):
            raise ValueError('Seed pet ownership differs')
    if sum(len(row['pets']) for row in seed) != len(fixture['seed_pets']):
        raise ValueError('Seed DB has extra or missing pets')
    setup = fixture['empty_pets_setup']
    record, raw = request({'id': 'setup_empty_owner', **{k: setup[k] for k in ('method', 'target', 'path', 'body')}}, 'fixture_setup')
    created = created_owner(record, raw, setup['body'], fixture['seed_owner_ids'], [])
    bindings['empty_owner_id'] = created['id']
    record, raw = request({'id': 'setup_empty_readback', 'target': 'customers', 'method': 'GET',
                           'path': '/owners/{empty_owner_id}'}, 'fixture_setup_readback')
    if record['status'] != 200 or canonical(strict_json(raw)) != canonical(created):
        raise ValueError('Empty owner setup not proven by independent readback')
    for slot, definition in enumerate(fixture['requests'], 1):
        record, raw = request(definition, 'fixture_slot')
        name = definition['id']
        if definition['method'] == 'GET' and name not in ('missing_direct', 'missing_gateway'):
            if record['status'] != 200:
                raise ValueError('Baseline fixture GET failed: ' + name)
            body = strict_json(raw)
            if name.startswith(('direct_', 'gateway_')):
                expected_id = 6 if name.endswith('populated') else 1 if name.endswith('no_visits') else bindings['empty_owner_id']
                owner(body, expected_id)
                ids = sorted(p['id'] for p in body['pets'])
                expected_ids = [7, 8] if expected_id == 6 else [1] if expected_id == 1 else []
                if ids != expected_ids:
                    raise ValueError('Baseline owner pet census differs: ' + name)
                if name.startswith('gateway_'):
                    visit_ids = sorted(v['id'] for pet in body['pets'] for v in pet.get('visits', []))
                    if visit_ids != ([1, 2, 3, 4] if expected_id == 6 else []):
                        raise ValueError('Gateway baseline visit fixture differs')
            elif name == 'owner_list_control':
                expected = seed + [created]
                if canonical(body) != canonical(expected):
                    raise ValueError('Owner list changed beyond the disclosed setup owner')
            elif name == 'visits_control':
                expected = sorted((v['id'], v['pet_id'], v['date'], v['description']) for v in fixture['seed_visits'])
                if support.visits_tuple(body) != expected:
                    raise ValueError('Visits baseline data differs')
        if name == 'create_control':
            created_write = created_owner(record, raw, definition['body'], fixture['seed_owner_ids'], list(bindings.values()))
            bindings['write_owner_id'] = created_write['id']
            rb, rb_raw = request({'id': 'create_readback', 'target': 'customers', 'method': 'GET',
                                   'path': '/owners/{write_owner_id}'}, 'write_readback')
            if rb['status'] != 200 or canonical(strict_json(rb_raw)) != canonical(created_write):
                raise ValueError('POST control readback differs')
        elif name == 'update_control':
            if record['status'] != 204 or raw != b'':
                raise ValueError('PUT control differs from declared 204 empty-body contract')
            rb, rb_raw = request({'id': 'update_readback', 'target': 'customers', 'method': 'GET',
                                   'path': '/owners/{write_owner_id}'}, 'write_readback')
            expected = {'id': bindings['write_owner_id'], 'pets': [], **definition['body']}
            if rb['status'] != 200 or canonical(strict_json(rb_raw)) != canonical(expected):
                raise ValueError('PUT control readback differs')
    result = {'schema': 'p03-baseline-observations/1', 'status': 'baseline_fixture_verified', 'snapshot': 'baseline',
              'fixture_slots': 12, 'slots': [r for r in ledger if r['kind'] == 'fixture_slot'],
              'all_requests': ledger, 'bindings': bindings, 'reset_seed_owners': len(seed),
              'reset_seed_pets': sum(len(o['pets']) for o in seed), 'empty_setup_posts': 1,
              'fixture_posts': 1, 'fixture_puts': 1, 'extra_write_readbacks': 2,
              'missing_owner_observations': {name: {'status': observations[name][0]['status'],
                                                    'body_sha256': hashlib.sha256(observations[name][1]).hexdigest()}
                                             for name in ('missing_direct', 'missing_gateway')},
              'mutated_executed': False, 'labels_created': False, 'model_calls': 0}
    save(directory / 'observations.json', result)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['wait', 'setup', 'collect'])
    parser.add_argument('--output', required=True)
    parser.add_argument('--target', choices=list(shared.TARGETS))
    parser.add_argument('--fixture')
    args = parser.parse_args()
    directory = Path(args.output)
    if not str(directory).startswith('/run/'):
        raise ValueError('Output must be in private mounted run')
    directory.mkdir(parents=True, exist_ok=False)
    try:
        if args.action == 'wait':
            result = shared.wait(directory, args.target)
        else:
            fixture = strict_json(Path(args.fixture).read_bytes())
            result = support.setup(directory, fixture) if args.action == 'setup' else collect(directory, fixture)
        print(json.dumps(result))
    except Exception as error:
        save(directory / 'failure.json', {'error': str(error), 'mutated_executed': False, 'labels_created': False})
        raise


if __name__ == '__main__':
    main()
