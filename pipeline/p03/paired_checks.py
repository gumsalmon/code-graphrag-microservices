"""Offline checks of raw paired observations. No HTTP, annotations or scoring."""
import argparse
import hashlib
import json
from pathlib import Path
from response_checks import strict_json, canonical, check_owner_rename, check_unchanged_json


def verify_group(directory, snapshot, fixture):
    observations = strict_json((directory / 'observations/paired-observations.json').read_bytes())
    if observations['snapshot'] != snapshot or observations['fixture_slots'] != 12 or len(observations['all_requests']) != 17:
        raise ValueError('Wrong snapshot/request accounting')
    if [row['id'] for row in observations['slots']] != [row['id'] for row in fixture['requests']]:
        raise ValueError('Changed fixture slot order')
    if observations['reset_seed_owners'] != 10 or observations['reset_seed_pets'] != 13:
        raise ValueError('Incorrect fresh DB reset census')
    records, bodies = {}, {}
    for step in observations['all_requests']:
        name = step['id']; meta = strict_json((directory / 'observations' / (name + '.json')).read_bytes())
        raw = (directory / 'observations' / (name + '.body')).read_bytes()
        if meta['error'] is not None or meta['status'] != step['status'] or meta['method'] != step['method'] or meta['path'] != step['path']:
            raise ValueError('Transport error or inconsistent raw ledger: ' + name)
        if meta['body_sha256'] != hashlib.sha256(raw).hexdigest() or meta['body_bytes'] != len(raw) or meta['body_file'] != name + '.body':
            raise ValueError('Raw response binding differs: ' + name)
        if meta['request_body_file']:
            request = (directory / 'observations' / meta['request_body_file']).read_bytes()
            if hashlib.sha256(request).hexdigest() != meta['request_body_sha256'] or len(request) != meta['request_body_bytes']:
                raise ValueError('Raw request binding differs: ' + name)
        records[name] = meta; bodies[name] = raw
    ids = observations['bindings']
    if any(type(ids[key]) is not int or ids[key] <= 0 or ids[key] in fixture['seed_owner_ids'] for key in ['empty_owner_id', 'write_owner_id']) or ids['empty_owner_id'] == ids['write_owner_id']:
        raise ValueError('Invalid observed generated IDs')
    seed = strict_json(bodies['seed_owner_list'])
    if sorted(o['id'] for o in seed) != fixture['seed_owner_ids'] or sum(len(o['pets']) for o in seed) != 13:
        raise ValueError('Reset source/raw mismatch')
    for name, wanted_id in [('setup_empty_owner', ids['empty_owner_id']), ('create_control', ids['write_owner_id'])]:
        created = strict_json(bodies[name])
        if records[name]['status'] != 201 or created['id'] != wanted_id or created['pets'] != []:
            raise ValueError('POST created ID was not observed')
    if records['update_control']['status'] != 204 or bodies['update_control'] != b'':
        raise ValueError('PUT control is not 204 with empty body')
    visits = strict_json(bodies['visits_control'])
    if sorted(v['id'] for v in visits['items']) != [1, 2, 3, 4]:
        raise ValueError('Visits reset/control differs')
    return observations, records, bodies


def compare_pair(before, after, before_records, after_records):
    comparisons = []
    for name in ['direct_populated', 'direct_no_visits', 'direct_empty_pets', 'setup_empty_readback', 'create_readback', 'update_readback']:
        checked = check_owner_rename(before[name], after[name], before_records[name]['status'], after_records[name]['status'])
        comparisons.append({'request_id': name, **checked})
    for name in ['seed_owner_list', 'owner_list_control', 'visits_control', 'setup_empty_owner', 'create_control']:
        checked = check_unchanged_json(before[name], after[name], before_records[name]['status'], after_records[name]['status'])
        comparisons.append({'request_id': name, **checked})
    diagnostics = []
    for name in ['gateway_populated', 'gateway_no_visits', 'gateway_empty_pets', 'missing_direct', 'missing_gateway']:
        # No guessed HTTP outcome, JSON projection or removal of error timestamps.
        diagnostics.append({'request_id': name, 'baseline_status': before_records[name]['status'],
                            'mutated_status': after_records[name]['status'],
                            'baseline_body_sha256': hashlib.sha256(before[name]).hexdigest(),
                            'mutated_body_sha256': hashlib.sha256(after[name]).hexdigest(),
                            'baseline_body_bytes': len(before[name]), 'mutated_body_bytes': len(after[name]),
                            'raw_bytes_equal': before[name] == after[name], 'is_label_or_score': False})
    return {'contract_and_control_checks': comparisons, 'unconstrained_response_observations': diagnostics,
            'raw_files_modified': False, 'errors_normalized_for_equality': False, 'impact_labels_created': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path, required=True)
    args = parser.parse_args(); root = args.run.resolve()
    inputs = strict_json((root / 'inputs.json').read_bytes())
    fixture = strict_json((Path(inputs['candidate_directory']) / 'spec/fixture.candidate.v1.json').read_bytes())
    pairs, records = [], {}
    for repetition in [1, 2]:
        for snapshot in ['baseline', 'mutated']:
            name = snapshot + '-r' + str(repetition)
            records[name] = verify_group(root / 'groups' / name, snapshot, fixture)
        before = records['baseline-r' + str(repetition)]; after = records['mutated-r' + str(repetition)]
        pairs.append({'repetition': repetition, **compare_pair(before[2], after[2], before[1], after[1])})
    print(json.dumps({'scope': 'paired raw/contract/control evidence, not independent labels or method output',
                      'groups_verified': 4, 'fixture_slots': 48, 'collector_requests': 68, 'pairs': pairs,
                      'observed_ids': {name: value[0]['bindings'] for name, value in records.items()},
                      'labels_created': False, 'model_calls': 0, 'official_scoring_authorized': False}, indent=2))


if __name__ == '__main__':
    main()
