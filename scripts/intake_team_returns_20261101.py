"""Copy and safely unpack the two explicitly supplied team returns; execute no received code."""
import hashlib
import json
from pathlib import Path
import re
import stat
import uuid
import zipfile
from datetime import datetime, timezone
from transfer_security import safe_member
from package_project_transfer import extended_path

ROOT = Path(__file__).resolve().parent.parent


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
    out = ROOT / 'handoff-out/team-returns-20261101' / stamp
    out.mkdir(parents=True, exist_ok=False)
    records = []
    for role, filename, prefix in [('phat', 'P02_CHECKPOINT_2026-10-31.zip', 'P02_CHECKPOINT_2026-10-31'),
                                   ('hien', 'HIEN_MILESTONE_A_RETURN_2026-10-31.zip', '')]:
        source = Path('E:/Zalo') / filename
        raw = source.read_bytes(); sidecar = source.with_name(filename + '.sha256').read_bytes()
        match = re.fullmatch(r'([a-fA-F0-9]{64})\s+\*?(.+)', sidecar.decode('utf-8-sig').strip())
        assert match and match[1].lower() == sha(raw) and match[2] == filename, 'Sidecar mismatch: ' + role
        target = out / role; target.mkdir()
        (target / filename).write_bytes(raw); (target / (filename + '.sha256')).write_bytes(sidecar)
        received = extended_path(target / 'received'); received.mkdir()
        count = 0
        with zipfile.ZipFile(source) as archive:
            members = archive.infolist(); folded = set()
            assert len(members) < 20000 and sum(x.file_size for x in members) < 256 * 1024 * 1024, 'Archive limits exceeded'
            for member in members:
                name = member.filename.rstrip('/') if member.is_dir() else member.filename
                assert safe_member(name) and name.casefold() not in folded, 'Unsafe/duplicate archive path'
                folded.add(name.casefold())
                assert not member.flag_bits & 1 and stat.S_IFMT(member.external_attr >> 16) in (0, stat.S_IFREG, stat.S_IFDIR), 'Encrypted/special member'
                assert member.file_size < 32 * 1024 * 1024, 'Member too large'
                destination = received / name
                if member.is_dir(): destination.mkdir(parents=True, exist_ok=True); continue
                assert stat.S_IFMT(member.external_attr >> 16) != stat.S_IFDIR, 'Directory/file mode mismatch'
                destination.parent.mkdir(parents=True, exist_ok=True)
                with destination.open('xb') as stream: stream.write(archive.read(member))
                count += 1
            assert archive.testzip() is None, 'CRC mismatch'
        root = target / 'received' / prefix if prefix else target / 'received'
        record = {'role': role, 'source': str(source), 'archive_copy': str(target / filename), 'archive_sha256': sha(raw),
                  'archive_bytes': len(raw), 'sidecar_verified': True, 'regular_files_extracted': count,
                  'received_root': str(root), 'received_code_executed': False}
        if role == 'hien':
            external = Path('E:/Zalo/RETURN_HIEN (1).md').read_bytes()
            (target / 'external-RETURN_HIEN.original.md').write_bytes(external)
            record.update(external_return_sha256=sha(external), external_return_matches_zip=external == (root / 'RETURN_HIEN.md').read_bytes())
        assert source.read_bytes() == raw, 'Source archive changed'
        records.append(record)
    result = {'record_date': '2026-11-01', 'intake_utc': datetime.now(timezone.utc).isoformat(), 'directory': str(out),
              'records': records, 'labels_or_raw_modified': False, 'git_mutations': False, 'model_calls': 0}
    (out / 'INTAKE.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
