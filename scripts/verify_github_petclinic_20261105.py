"""Read-only verification of the public R1, implementation and technical evidence."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parent.parent


def disk(path):
    """Windows long paths must work after cloning into a deeper directory."""
    value = str(path.resolve())
    if os.name == 'nt' and not value.startswith('\\\\?\\'):
        value = '\\\\?\\UNC\\' + value[2:] if value.startswith('\\\\') else '\\\\?\\' + value
    return Path(value)


def digest(path):
    return hashlib.sha256(disk(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--restore-saved-runs', action='store_true',
                        help='Copy the four saved runs to their ignored original paths; refuse changed existing files')
    options = parser.parse_args()
    bindings = json.loads((ROOT / 'evidence/petclinic-20261105/PUBLICATION_BINDINGS.json').read_text(encoding='utf-8'))
    assert bindings['round2_included'] is False
    for row in bindings['bindings']:
        path = ROOT / row['published']
        assert path.is_relative_to(ROOT) and disk(path).is_file(), row['published']
        assert disk(path).stat().st_size == row['bytes'] and digest(path) == row['sha256'], row['published']
    counts = {}
    for name in ['p02-native', 'p03-native', 'p02-context', 'p03-context']:
        base = ROOT / 'evidence/petclinic-20261105' / name
        lines = (base / 'SHA256SUMS.txt').read_text(encoding='utf-8-sig').splitlines()
        for line in lines:
            if not line.strip():
                continue
            expected, member = line.split('  ', 1)
            member = member.removeprefix('*')
            path = base / member
            assert path.is_relative_to(base) and '..' not in Path(member).parts, member
            assert digest(path) == expected, name + '/' + member
        counts[name] = len(lines)
    archive = ROOT / 'review/downloads/PETCLINIC_R1_SOURCE_FIRST_2026-11-05.zip'
    assert digest(archive) == 'f0e1876e34a4f56cbf012403276569802396d1ee1956da2dc4fcd584084b3b2d'
    with zipfile.ZipFile(archive) as package:
        assert package.testzip() is None
    result = subprocess.run([sys.executable, '-B', str(ROOT / 'review/round-1/VERIFY_PACKAGE.py'), '--root',
                             str(ROOT / 'review/round-1')], capture_output=True, text=True, encoding='utf-8')
    if result.returncode:
        raise AssertionError('R1 verifier failed: ' + result.stdout + result.stderr)
    restored = 0
    if options.restore_saved_runs:
        runs = {
            'p02-native': 'handoff-out/p02-offline-method-reviewed/20261102t140320547z-03c452f7',
            'p03-native': 'handoff-out/p03-breaker-offline/20261105t083103189z-c2daafaf',
            'p02-context': 'handoff-out/p02-static-context-reviewed/20261102T154557244Z-67f6d9ea',
            'p03-context': 'handoff-out/p03-static-context/20261105T084817515Z-225f3c9a',
        }
        for row in bindings['bindings']:
            if row['published'] == 'evidence/petclinic-20261105/p02-reviewed-audit.json':
                assert row['origin'] == 'handoff-out/hien-p02-return/20261102T135352Z-54131bc0/independent-reviewed-run-check.stdout.log'
                runs['p02-auxiliary-audit'] = 'handoff-out/hien-p02-return/20261102T135352Z-54131bc0'
            for alias, origin in runs.items():
                prefix = 'evidence/petclinic-20261105/' + alias + '/'
                if alias == 'p02-auxiliary-audit':
                    prefix = 'evidence/petclinic-20261105/p02-reviewed-audit.json'
                if not row['published'].startswith(prefix):
                    continue
                member = row['published'][len(prefix):]
                if alias == 'p02-auxiliary-audit':
                    member = 'independent-reviewed-run-check.stdout.log'
                assert row['origin'] == origin + '/' + member
                target = ROOT / row['origin']
                assert target.resolve().is_relative_to(ROOT) and '..' not in Path(member).parts
                if disk(target).exists():
                    assert digest(target) == row['sha256'], 'Refusing changed existing file: ' + row['origin']
                else:
                    disk(target.parent).mkdir(parents=True, exist_ok=True)
                    with disk(target).open('xb') as stream:
                        stream.write(disk(ROOT / row['published']).read_bytes())
                    restored += 1
    print(json.dumps({'bindings_verified': len(bindings['bindings']), 'run_manifests': counts,
                      'r1_zip_crc_and_sha256': True, 'r1_verifier': True,
                      'round2_included': False, 'model_calls': 0,
                      'saved_run_files_restored': restored}, indent=2))


if __name__ == '__main__':
    main()
