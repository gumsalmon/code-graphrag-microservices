"""Independent ZIP payload/source audit; never runs Java, Docker or labels."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile


def sha(data):
    return hashlib.sha256(data).hexdigest()


def payloads(file):
    with zipfile.ZipFile(file) as archive:
        names = [row.filename for row in archive.infolist() if not row.is_dir()]
        if len(names) != len(set(names)):
            raise ValueError('Duplicate JAR member')
        return {name: sha(archive.read(name)) for name in names}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args(); root = args.run.resolve()
    inputs = json.loads((root / 'inputs.json').read_text(encoding='utf-8'))
    baseline_root = Path(inputs['baseline_directory'])
    baseline = json.loads((baseline_root / 'build.json').read_text(encoding='utf-8'))
    mutated_root = root / 'mutated-build'
    mutated = json.loads((mutated_root / 'build.json').read_text(encoding='utf-8'))
    baseline_jar = baseline_root / baseline['jars']['customers-service']['file']
    mutated_jar = mutated_root / mutated['customers_jar']['file']
    if sha(baseline_jar.read_bytes()) != baseline['jars']['customers-service']['sha256'] or sha(mutated_jar.read_bytes()) != mutated['customers_jar']['sha256']:
        raise ValueError('JAR byte identity differs')
    before, after = payloads(baseline_jar), payloads(mutated_jar)
    different = sorted(name for name in set(before) | set(after) if before.get(name) != after.get(name))
    handler = 'BOOT-INF/classes/org/springframework/samples/petclinic/customers/web/OwnerResource.class'
    classes = sorted(name for name in set(before) | set(after) if name.startswith('BOOT-INF/classes/') and name.endswith('.class'))
    changed_classes = [name for name in classes if before.get(name) != after.get(name)]
    allowed = {handler, 'BOOT-INF/classes/git.properties', 'META-INF/build-info.properties', 'BOOT-INF/classes/META-INF/build-info.properties'}
    if changed_classes != [handler] or any(name not in allowed for name in different) or set(before) != set(after):
        raise ValueError('Unexpected compiled/payload change: ' + json.dumps(different))
    source_before = json.loads((mutated_root / 'source-before.json').read_text(encoding='utf-8'))
    source_after = json.loads((mutated_root / 'source-after-build.json').read_text(encoding='utf-8'))
    changes = sorted(name for name in set(source_before) | set(source_after) if source_before.get(name) != source_after.get(name))
    expected = 'spring-petclinic-customers-service/src/main/java/org/springframework/samples/petclinic/customers/web/OwnerResource.java'
    if changes != [expected]:
        raise ValueError('Unexpected source changes')
    checks = {service: sha((baseline_root / record['file']).read_bytes()) == record['sha256'] for service, record in baseline['jars'].items() if service != 'customers-service'}
    if not all(checks.values()):
        raise ValueError('A reused unmodified baseline service JAR changed')
    report = {'scope': 'source/ZIP-member byte audit, not runtime or behavioral ground truth',
              'baseline_customers_jar_sha256': sha(baseline_jar.read_bytes()), 'mutated_customers_jar_sha256': sha(mutated_jar.read_bytes()),
              'application_classes_checked': len(classes), 'changed_application_classes': changed_classes,
              'member_count': len(before), 'changed_payload_members': different, 'unchanged_dependencies': sum(name.startswith('BOOT-INF/lib/') for name in before),
              'only_registered_handler_class_changed': True, 'source_changes': changes, 'reused_baseline_jars_verified': checks,
              'application_tests_executed': False, 'labels_created': False, 'model_calls': 0}
    with args.output.open('x', encoding='utf-8') as stream:
        json.dump(report, stream, indent=2); stream.write('\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
