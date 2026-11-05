"""Independent read-only check of loaded class bytes, config and raw observations."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import uuid
import zipfile


def sha(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False, separators=(',', ':'))


def read(root, path):
    return json.loads((root / path).read_bytes())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path, required=True)
    args = parser.parse_args()
    root = args.run.resolve()
    project = Path(__file__).resolve().parent.parent
    assert root.is_relative_to(project / 'handoff-out/p02-helper-supplement')
    inputs, plan, result = read(root, 'inputs.json'), read(root, 'plan.json'), read(root, 'result.json')
    assert result['runtime_executed'] is True and result['groups_completed'] == 4
    baseline = Path(inputs['baseline_directory'])
    gateway = baseline / 'artifacts/api-gateway.jar'
    assert sha(gateway.read_bytes()) == inputs['bindings']['gateway_jar_sha256']
    configs, overrides, groups, observations, instance_ids = {}, {}, [], {}, []
    expected_classes = [
        'org.springframework.samples.petclinic.api.application.VisitsServiceClient',
        'org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController',
        *['org.springframework.samples.petclinic.api.dto.' + name for name in ['OwnerDetails', 'PetDetails', 'PetType', 'Visits', 'VisitDetails']]]
    verified_classes = 0
    with zipfile.ZipFile(gateway) as jar:
        for group in plan['groups']:
            directory = root / 'groups' / group['id']
            events = [json.loads(line) for line in (directory / 'targeted/events.ndjson').read_bytes().splitlines() if line]
            classes = next(row['data']['classes'] for row in events if row['kind'] == 'application_identity')
            assert set(classes) == set(expected_classes)
            for name in expected_classes:
                resource = name.replace('.', '/') + '.class'
                assert classes[name]['resource'] == resource
                assert sha(jar.read('BOOT-INF/classes/' + resource)) == classes[name]['sha256']
                verified_classes += 1
            for name in ['config-visits', 'config-customers', 'config-gateway']:
                body = read(directory, 'setup/' + name + '.body')
                digest = sha(canonical(body).encode('utf-8'))
                if name in configs:
                    assert configs[name] == digest, 'Effective config differs'
                else:
                    configs[name] = digest
                if name != 'config-gateway':
                    properties = {}
                    for source in reversed(body['propertySources']):
                        properties.update(source['source'])
                    assert properties['spring.sql.init.data-locations'] == 'classpath*:db/hsqldb/data.sql'
                    assert properties['spring.sql.init.schema-locations'] == 'classpath*:db/hsqldb/schema.sql'
            applications = read(directory, 'setup/discovery-registry.body')['applications']['application']
            for name in ['CUSTOMERS-SERVICE', 'VISITS-SERVICE', 'API-GATEWAY']:
                candidates = [row for row in applications if row['name'] == name]
                assert any(any(instance['status'] == 'UP' for instance in (row['instance'] if isinstance(row['instance'], list) else [row['instance']])) for row in candidates)
            identities = read(directory, 'identities.json')
            for service in ['config-server', 'discovery-server', 'customers-service', 'visits-service', 'api-gateway']:
                instance_ids.append(identities[service]['id'])
                command = read(directory, 'start-' + service + '.command.json')['args']
                java_args = command[command.index('-jar') - 2:]
                digest = sha(canonical(java_args).encode('utf-8'))
                if service in overrides:
                    assert overrides[service] == digest, 'Runtime override differs'
                else:
                    overrides[service] = digest
            provider = read(directory, 'raw/provider.body')
            visits = provider['items']
            assert sorted((row['id'], row['petId']) for row in visits) == [(1, 7), (2, 8), (3, 8), (4, 7)]
            assert read(directory, 'setup/setup.json')['fresh_seed_only'] is True
            for name in ['owner', 'provider', 'gateway']:
                observations[(group['snapshot'], group['repetition'], name)] = read(directory, 'raw/' + name + '.body')
            assert read(directory, 'cleanup.json')['complete'] is True
            groups.append({'group_id': group['id'], 'loaded_classes_match_original_jar': True,
                           'four_seed_visits': True, 'config_registry_verified': True, 'cleanup_complete': True})
    assert len(instance_ids) == len(set(instance_ids)) == 20
    pairs = []
    for repetition in [1, 2]:
        for name in ['owner', 'provider', 'gateway']:
            equal = canonical(observations[('baseline', repetition, name)]) == canonical(observations[('mutated', repetition, name)])
            pairs.append({'request': name, 'repetition': repetition, 'full_json_equal_with_object_key_order_ignored_only': equal,
                          'impact_label_assigned': False})
    before, after = read(root, 'protected-before.json'), read(root, 'protected-after.json')
    assert before == after
    report = {'schema': 'p02-helper-readonly-supplement-audit/1', 'status': 'passed_not_labels', 'audited_at': datetime.now(timezone.utc).isoformat(),
        'run_directory': str(root), 'groups': groups, 'loaded_class_checks_against_original_jar': verified_classes,
        'unique_application_instances': len(set(instance_ids)), 'effective_config_equal': True, 'runtime_overrides_equal': True,
        'primary_body_pair_comparisons': pairs, 'protected_legacy_files_unchanged': sum(row.get('files', 0) for row in after['trees']),
        'protected_extra_files_unchanged': len(after['extra']), 'production_callback_traced': False, 'labels_created_or_changed': False,
        'ground_truth_accepted': False, 'official_scoring_authorized': False}
    output = project / 'handoff-out/p02-helper-audit' / (root.name + '-' + uuid.uuid4().hex[:8])
    output.mkdir(parents=True, exist_ok=False)
    (output / 'AUDIT.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'audit_directory': str(output), **report}, indent=2))


if __name__ == '__main__':
    main()
