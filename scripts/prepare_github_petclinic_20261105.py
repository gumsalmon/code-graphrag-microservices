"""Publishable copies only: preserve local sealed records and withhold round 2."""
from pathlib import Path
import hashlib
import json
from prepare_petclinic_review_data_20261105 import ReviewScanner, origin_path, walk

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / 'handoff-out/petclinic-review-packages/20261105T093250Z-45a9dd18'
R1 = BUILD / 'PETCLINIC_R1_SOURCE_FIRST'
REVIEW = ROOT / 'review'
EVIDENCE = ROOT / 'evidence/petclinic-20261105'
IMPLEMENTATION = ROOT / 'implementation/petclinic-reviewed-20261105'
RECEIVED = ROOT / 'handoff-out/hien-p03-breaker-return/20261105T082719Z-86eac2cb/received'
RUNS = [
    ('p02-native', 'handoff-out/p02-offline-method-reviewed/20261102t140320547z-03c452f7'),
    ('p03-native', 'handoff-out/p03-breaker-offline/20261105t083103189z-c2daafaf'),
    ('p02-context', 'handoff-out/p02-static-context-reviewed/20261102T154557244Z-67f6d9ea'),
    ('p03-context', 'handoff-out/p03-static-context/20261105T084817515Z-225f3c9a'),
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data, str):
        data = data.encode('utf-8')
    if path.exists():
        assert path.read_bytes() == data, 'Refusing to replace a different publication file: ' + str(path)
    else:
        path.write_bytes(data)


def encoded(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'


def main():
    scanner = ReviewScanner()
    bindings = []

    def copy(source, target):
        data = source.read_bytes()
        scanner.scan(target.relative_to(ROOT).as_posix(), data)
        save(target, data)
        bindings.append({'origin': origin_path(source),
                         'published': target.relative_to(ROOT).as_posix(),
                         'sha256': sha(data), 'bytes': len(data)})

    for name, source in walk(R1):
        copy(source, REVIEW / 'round-1' / name)
    for name in ['PETCLINIC_R1_SOURCE_FIRST_2026-11-05.zip',
                 'PETCLINIC_R1_SOURCE_FIRST_2026-11-05.zip.sha256']:
        copy(BUILD / name, REVIEW / 'downloads' / name)

    index = json.loads((R1 / 'EVIDENCE_INDEX.json').read_text(encoding='utf-8-sig'))
    entries = index['files']
    for case in ['P01', 'P02', 'P03']:
        rows = [row for row in entries if row['case'] == case]
        text = '# ' + case + ' — mục lục bằng chứng lượt 1\n\n'
        text += '[Hướng dẫn bắt đầu](../README.md) · [Quy ước ba ca](../round-1/CASES.md)\n\n'
        text += 'Đường dẫn dưới đây là tên gốc để tra trích dẫn. Liên kết mở bản lưu giữ nguyên byte trên GitHub. '
        text += 'Dùng tìm kiếm của trình duyệt để tìm tên file; đối chiếu snapshot và hash khi trùng basename.\n\n'
        text += '| Đường dẫn gốc | Mở bằng chứng | SHA-256 |\n|---|---|---|\n'
        for row in rows:
            name = row['logical_path'].replace('|', '&#124;')
            text += '| `' + name + '` | [Mở](../round-1/' + row['stored_path'] + ') | `' + row['sha256'] + '` |\n'
        save(REVIEW / 'catalog' / (case + '.md'), text)

    for alias, origin in RUNS:
        for name, source in walk(ROOT / origin):
            copy(source, EVIDENCE / alias / name)
    copy(ROOT / 'handoff-out/hien-p02-return/20261102T135352Z-54131bc0/independent-reviewed-run-check.stdout.log',
         EVIDENCE / 'p02-reviewed-audit.json')
    # Keep the reviewed working/packet relative layout used by the received tests.
    for part in ['working', 'packet']:
        for name, source in walk(RECEIVED / part):
            copy(source, IMPLEMENTATION / part / name)

    save(EVIDENCE / 'PUBLICATION_BINDINGS.json', encoded({
        'schema': 'petclinic-github-publication-bindings/1',
        'record_date': '2026-11-05',
        'authorization_quote': 'vậy hãy push lên github đầy đủ vì thầy và anh chỉ review bằng github thôi',
        'base_commit': 'd1f95eb21c71dd6bfb49d2e450142d1290ceda5f',
        'bindings': bindings,
        'scope': 'R1 plus corrected native/context evidence and reviewed implementation; raw bytes unchanged',
        'round2_included': False,
        'human_review_received': False,
        'ground_truth_accepted': False,
        'model_calls': 0,
        'security_scan': scanner.summary(),
        'limitations': [
            'Public development repository already contains historical labels/results in other branches and documents.',
            'R1 guide is an isolated reading route, not access control or a claim of reviewer blindness.',
            'Only selected reviewed native/context runs are copied; local caches, binaries, returns and failed historical runs stay local.',
            'Old runner absolute/local paths describe the original machine; verify the saved evidence from a fresh clone before any new execution.',
        ],
    }))
    print(encoded({'copied_files': len(bindings), 'bytes': sum(row['bytes'] for row in bindings),
                   'round2_included': False, 'scanner_failures': scanner.summary()['failures']}))


if __name__ == '__main__':
    main()
