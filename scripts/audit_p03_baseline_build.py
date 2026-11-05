"""Read-only comparison of rebuilt baseline JAR member payloads; no Java execution."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

SERVICES = ['config-server', 'discovery-server', 'customers-service', 'visits-service', 'api-gateway']
BUILD_METADATA = {'BOOT-INF/classes/git.properties', 'META-INF/build-info.properties'}


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def entries(path):
    with zipfile.ZipFile(path) as archive:
        if len(archive.namelist()) != len(set(archive.namelist())):
            raise ValueError('Duplicate archive member')
        return {i.filename: digest(archive.read(i)) for i in archive.infolist() if not i.is_dir()}


def audit(rebuilt, reference):
    rows = []
    for service in SERVICES:
        current = rebuilt / 'artifacts' / (service + '.jar')
        old = reference / 'artifacts' / (service + '.jar')
        before, after = entries(old), entries(current)
        if set(before) != set(after):
            raise ValueError('JAR member set changed: ' + service)
        changes = [name for name in before if before[name] != after[name]]
        if not set(changes) <= BUILD_METADATA:
            raise ValueError('Unexpected non-metadata JAR change: ' + service + ': ' + ','.join(changes))
        classes = [name for name in before if name.startswith('BOOT-INF/classes/') and name.endswith('.class')]
        libraries = [name for name in before if name.startswith('BOOT-INF/lib/') and name.endswith('.jar')]
        rows.append({'service': service, 'application_class_members_equal': len(classes),
                     'dependency_jars_equal': len(libraries), 'all_other_member_payloads_equal': True,
                     'changed_zip_members': changes, 'rebuilt_sha256': digest(current.read_bytes()),
                     'reference_sha256': digest(old.read_bytes()), 'whole_jar_bytes_equal': current.read_bytes() == old.read_bytes()})
    return {'schema': 'p03-baseline-rebuild-identity-audit/1', 'record_date': '2026-10-28', 'result': 'pass',
            'rebuilt_directory': str(rebuilt), 'reference_directory': str(reference), 'services': rows,
            'application_class_comparisons': sum(row['application_class_members_equal'] for row in rows),
            'dependency_jar_comparisons': sum(row['dependency_jars_equal'] for row in rows),
            'limitations': 'Whole JAR hashes change with regenerated build metadata. All extracted member payloads except the two explicitly named build metadata resources match. No runtime, impact-label or review decision.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rebuilt', type=Path, required=True)
    parser.add_argument('--reference', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(audit(args.rebuilt.resolve(), args.reference.resolve()), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
