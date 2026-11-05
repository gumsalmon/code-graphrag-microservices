"""Static byte/patch/log audit of reviewed milestone-A files; executes no return helper."""
import ast
import hashlib
import json
from pathlib import Path
from package_project_transfer import parse_manifest
from transfer_security import safe_member

ROOT = Path(__file__).resolve().parent.parent
INTAKE = ROOT / 'handoff-out/team-returns-20261101/20261101T054957Z-a801d6ca'
P = INTAKE / 'hien/received'
OLD = ROOT / 'handoff-out/hien-synthetic-return/20261028T150351Z-3ac4bad6/received'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    entries = parse_manifest((P / 'CHECKSUMS.sha256').read_bytes())
    for name, expected in entries:
        assert safe_member(name) and (P / name).is_file() and not (P / name).is_symlink()
        assert sha((P / name).read_bytes()) == expected, 'Manifest differs: ' + name
    assert {name for name,_ in entries} == {f.relative_to(P).as_posix() for f in P.rglob('*') if f.is_file() and f.name != 'CHECKSUMS.sha256'}
    identity = json.loads((P / 'CODE_HASHES.json').read_bytes())
    for row in identity:
        raw = (P / 'code' / row['path']).read_bytes()
        assert sha(raw) == row['sha256'] and len(raw) == row['bytes']
        if row['path'].endswith('.py'): ast.parse(raw.decode('utf-8'), filename=row['path'])
        if not row['milestone_a_new']:
            assert raw == (OLD / 'code-after' / row['path']).read_bytes(), 'Previously reviewed candidate changed'
    assert (P / 'CANDIDATE_PREVIOUS.original.patch').read_bytes() == (OLD / 'changes.patch').read_bytes()
    changes, active = {}, None
    for line in (P / 'MILESTONE_A.patch').read_bytes().splitlines(keepends=True):
        if line.startswith(b'diff --git '): active = None
        elif line.startswith(b'+++ b/'):
            active = line[len(b'+++ b/'):].decode().strip(); assert safe_member(active) and active not in changes; changes[active] = bytearray()
        elif active and line.startswith(b'+'): changes[active].extend(line[1:])
        elif active and line.startswith((b' ', b'-')): raise ValueError('New-file-only patch contains old/context lines')
    expected_new = {r['path'] for r in identity if r['milestone_a_new']}
    assert set(changes) == expected_new and len(changes) == 5
    for name, raw in changes.items(): assert bytes(raw) == (P / 'code' / name).read_bytes(), 'Patch reconstruction differs: ' + name
    commands = json.loads((P / 'COMMAND_INDEX.json').read_bytes())
    for row in commands:
        for kind in ['stdout','stderr']:
            path = P / 'logs' / row['label'] / (kind + '.log')
            assert sha(path.read_bytes()) == row[kind + '.log_sha256'], 'Reported command log hash differs'
    final_tests = (P / 'logs/03-adapter-final/stderr.log').read_text(encoding='utf-8')
    assert 'Ran 13 tests' in final_tests and final_tests.rstrip().endswith('OK')
    assert (P / 'RETURN_HIEN.md').read_bytes() == (INTAKE / 'hien/external-RETURN_HIEN.original.md').read_bytes()
    runs = []
    for name in ['success','missing-seed']:
        directory = P / 'runs' / name
        rows = parse_manifest((directory / 'checksums.sha256').read_bytes())
        for member, expected in rows: assert sha((directory / member).read_bytes()) == expected
        record = json.loads((directory / 'run.json').read_bytes())
        assert record['actual_case_executed'] is False and record['model_calls'] == 0 and record['neo4j_run'] is False
        runs.append({'id':name,'status':record['status'],'artifacts_verified':len(rows)})
    result = {'scope':'static byte/patch/log technical audit, not claimed human review or runtime re-execution',
              'manifest_files_verified':len(entries),'code_files_checked':len(identity),'new_files':sorted(expected_new),
              'old_candidate_byte_equal':True,'external_return_matches_zip':True,'reported_final_unit_tests':13,
              'command_logs_verified':len(commands),'reported_runs':runs,'human_final_diff_confirmation_received':False,
              'received_helpers_executed':False,'actual_p02_p03_executed':False,'model_calls':0}
    with (INTAKE / 'HIEN_A_STATIC_AUDIT.json').open('x',encoding='utf-8') as stream:
        json.dump(result,stream,ensure_ascii=False,indent=2);stream.write('\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
