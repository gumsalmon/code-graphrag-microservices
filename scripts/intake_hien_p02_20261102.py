"""Preserve and safely unpack Hien's supplied P02 return; execute no received code."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import stat
import uuid
import zipfile
from package_project_transfer import extended_path
from transfer_security import safe_member

ROOT = Path(__file__).resolve().parent.parent
NAME = 'HIEN_P02_TECHNICAL_RETURN_2026-11-02.zip'
EXPECTED = 'f6cb2f86d5d0daf4dba9efaaee0da54606b1d39f02574f0333a1123f6b12c192'


def main():
    source = Path('E:/Zalo') / NAME
    raw = source.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == EXPECTED, 'Supplied archive changed'
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
    out = ROOT / 'handoff-out/hien-p02-return' / stamp
    out.mkdir(parents=True, exist_ok=False)
    with (out / NAME).open('xb') as stream:
        stream.write(raw)
    (out / 'ARCHIVE_SHA256.generated.txt').write_text(EXPECTED+'  '+NAME+'\n', encoding='ascii')
    received = extended_path(out / 'received')
    received.mkdir()
    seen = set()
    count = 0
    with zipfile.ZipFile(source) as archive:
        members = archive.infolist()
        assert len(members) < 1000 and sum(m.file_size for m in members) < 32*1024*1024
        for member in members:
            name = member.filename.rstrip('/') if member.is_dir() else member.filename
            assert safe_member(name) and name.casefold() not in seen
            seen.add(name.casefold())
            mode = stat.S_IFMT(member.external_attr >> 16)
            assert not member.flag_bits & 1 and mode in (0, stat.S_IFREG, stat.S_IFDIR)
            assert member.file_size < 8*1024*1024 and member.file_size <= max(1, member.compress_size)*2000
            dest = received / name
            if member.is_dir():
                dest.mkdir(parents=True, exist_ok=True)
                continue
            assert mode != stat.S_IFDIR
            dest.parent.mkdir(parents=True, exist_ok=True)
            with dest.open('xb') as stream:
                stream.write(archive.read(member))
            count += 1
        assert archive.testzip() is None
    assert source.read_bytes() == raw
    result = {'record_date':'2026-11-02', 'intake_utc':datetime.now(timezone.utc).isoformat(),
              'directory':out.relative_to(ROOT).as_posix(), 'received_root':(out/'received').relative_to(ROOT).as_posix(),
              'archive_sha256':EXPECTED, 'archive_bytes':len(raw), 'regular_files':count,
              'external_checksum_sidecar_supplied':False, 'hash_scope':'Coordinator-computed identity, not sender-side checksum attestation',
              'archive_crc_verified':True, 'received_code_executed':False, 'originals_modified':False,
              'case':'P02', 'p03_return':False, 'p03_packet_forwarded_by_this_message':False}
    with (out/'INTAKE.json').open('x', encoding='utf-8', newline='\n') as stream:
        json.dump(result,stream,ensure_ascii=False,indent=2);stream.write('\n')
    print(json.dumps(result,ensure_ascii=False))


if __name__ == '__main__':
    main()
