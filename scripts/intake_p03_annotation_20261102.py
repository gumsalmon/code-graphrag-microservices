"""Preserve and unpack the explicitly supplied P03 annotation return; run no received code."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import stat
import uuid
import zipfile

from package_project_transfer import extended_path
from transfer_security import safe_member

ROOT = Path(__file__).resolve().parent.parent
NAME = 'P03_ANNOTATION_2026-11-01_v2.zip'
PREFIX = NAME.removesuffix('.zip')
EXPECTED = '97b04596bbad8f0c423bb320bf1bcba8300d8413e4edbd6d3b339e46c5ca734e'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    source = Path('E:/Zalo') / NAME
    raw = source.read_bytes()
    sidecar_path = source.with_name(NAME + '.sha256')
    sidecar = sidecar_path.read_bytes()
    match = re.fullmatch(r'([a-fA-F0-9]{64})\s+\*?(.+)', sidecar.decode('utf-8-sig').strip())
    if not match or match[2] != NAME or match[1].lower() != digest(raw) or digest(raw) != EXPECTED:
        raise ValueError('Supplied archive/sidecar identity differs')
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
    out = ROOT / 'handoff-out/p03-annotation-return' / stamp
    out.mkdir(parents=True, exist_ok=False)
    for name, value in [(NAME, raw), (NAME + '.sha256', sidecar)]:
        with (out / name).open('xb') as stream:
            stream.write(value)
    received = extended_path(out / 'received')
    received.mkdir()
    count = 0
    try:
        with zipfile.ZipFile(source) as archive:
            members = archive.infolist()
            if len(members) > 20000 or sum(m.file_size for m in members) > 128 * 1024 * 1024:
                raise ValueError('Archive expansion limit')
            folded = set()
            for member in members:
                name = member.filename.rstrip('/') if member.is_dir() else member.filename
                mode = stat.S_IFMT(member.external_attr >> 16)
                if not safe_member(name) or name.casefold() in folded or name.split('/')[0] != PREFIX:
                    raise ValueError('Unsafe/duplicate/unexpected archive member: ' + name)
                folded.add(name.casefold())
                if member.flag_bits & 1 or mode not in (0, stat.S_IFREG, stat.S_IFDIR):
                    raise ValueError('Encrypted/special archive member')
                if member.file_size > 16 * 1024 * 1024 or member.file_size > max(1, member.compress_size) * 2000:
                    raise ValueError('Member expansion limit')
                destination = received / name
                if member.is_dir():
                    destination.mkdir(parents=True, exist_ok=True)
                    continue
                if mode == stat.S_IFDIR:
                    raise ValueError('File/directory mode mismatch')
                destination.parent.mkdir(parents=True, exist_ok=True)
                with destination.open('xb') as stream:
                    stream.write(archive.read(member))
                count += 1
            if archive.testzip() is not None:
                raise ValueError('Archive CRC mismatch')
        if source.read_bytes() != raw or sidecar_path.read_bytes() != sidecar:
            raise ValueError('Supplied files changed during intake')
        record = {
            'record_date': '2026-11-02', 'intake_utc': datetime.now(timezone.utc).isoformat(),
            'archive': NAME, 'archive_sha256': digest(raw), 'archive_bytes': len(raw),
            'sidecar_verified': True, 'archive_crc_verified': True,
            'regular_files_extracted': count,
            'directory': out.relative_to(ROOT).as_posix(),
            'received_root': (out / 'received' / PREFIX).relative_to(ROOT).as_posix(),
            'received_code_executed': False, 'originals_modified': False,
            'model_calls': 0, 'git_mutations': False,
        }
        with (out / 'INTAKE.json').open('x', encoding='utf-8', newline='\n') as stream:
            json.dump(record, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
        print(json.dumps(record, ensure_ascii=False))
    except Exception as error:
        with (out / 'FAILURE.json').open('x', encoding='utf-8', newline='\n') as stream:
            json.dump({'error': str(error), 'received_code_executed': False}, stream)
        raise


if __name__ == '__main__':
    main()
