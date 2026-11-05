"""Compile only against the pinned gateway JAR; no JVM app run or network."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import uuid
import zipfile

EXPECTED_GATEWAY = '239f64873fbce6ade5a5ab355a1838a1122d75d2dbe4ae24987437f86b7c5944'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gateway', type=Path, required=True)
    args = parser.parse_args()
    project = Path(__file__).resolve().parent.parent
    gateway = args.gateway.resolve()
    assert hashlib.sha256(gateway.read_bytes()).hexdigest() == EXPECTED_GATEWAY, 'Gateway JAR differs'
    root = project / 'handoff-out/p02-helper-offline' / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8])
    root.mkdir(parents=True, exist_ok=False)
    java = shutil.which('javac')
    assert java, 'Host javac not available; no automatic installation'
    source = project / 'pipeline/p02/P02PairedHelperProbe.java'
    (root / source.name).write_bytes(source.read_bytes())
    members = {}
    with zipfile.ZipFile(gateway) as archive:
        for item in archive.infolist():
            if item.is_dir() or not item.filename.startswith(('BOOT-INF/classes/', 'BOOT-INF/lib/')):
                continue
            relative = Path(item.filename)
            assert not relative.is_absolute() and '..' not in relative.parts and not stat.S_ISLNK(item.external_attr >> 16)
            target = (root / relative).resolve()
            assert os.path.commonpath([str(root.resolve()), str(target)]) == str(root.resolve())
            data = archive.read(item)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            members[item.filename] = hashlib.sha256(data).hexdigest()
    classpath = str(root / 'BOOT-INF/classes') + os.pathsep + str(root / 'BOOT-INF/lib/*')
    classes = root / 'classes'
    classes.mkdir()
    command = [java, '-proc:none', '--release', '17', '-cp', classpath, '-d', str(classes), str(root / source.name)]
    run = subprocess.run(command, capture_output=True, timeout=90)
    (root / 'javac.stdout.log').write_bytes(run.stdout)
    (root / 'javac.stderr.log').write_bytes(run.stderr)
    result = {'status': 'compiled_only' if run.returncode == 0 else 'compile_failed', 'directory': str(root), 'command': command,
              'exit_code': run.returncode, 'gateway_jar_sha256': EXPECTED_GATEWAY, 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
              'annotation_processing_disabled': True, 'java_application_executed': False, 'runtime_helper_evidence_collected': False,
              'model_calls': 0, 'application_source_modified': False, 'dependency_downloads': 0, 'extracted_members': len(members)}
    (root / 'RESULT.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    (root / 'DEPENDENCY_MEMBERS.json').write_text(json.dumps(members, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, indent=2))
    if run.returncode:
        print(run.stderr.decode('utf-8', errors='replace'))
    return run.returncode


if __name__ == '__main__':
    raise SystemExit(main())
