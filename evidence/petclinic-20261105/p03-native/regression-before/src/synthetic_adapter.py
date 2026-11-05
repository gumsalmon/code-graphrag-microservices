"""Mốc A adapter: synthetic source only. Actual cases require a future gate runner.

The native graph is unchanged. Provenance/seed status and experimental syntax
observations live in separate sidecars; nothing imports to Neo4j or calls models.
"""
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
from pathlib import Path, PurePosixPath
import stat
import sys

from src.parser import DependencyGraphBuilder
from src.neo4j_importer import Neo4jGraphImporter
from src.response_survey import survey_source


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def overlap(a, b):
    return a == b or a in b.parents or b in a.parents


def no_links(path):
    for part in (path, *path.parents):
        try:
            attributes = getattr(part.lstat(), 'st_file_attributes', 0)
        except FileNotFoundError:
            continue
        if part.is_symlink() or attributes & getattr(stat, 'FILE_ATTRIBUTE_REPARSE_POINT', 0):
            raise ValueError('Symlink/junction path refused')


def write_json(path, value):
    with path.open('x', encoding='utf-8', newline='\n') as stream:
        json.dump(value, stream, indent=2, ensure_ascii=False)
        stream.write('\n')


def run_synthetic(manifest_path, output_path):
    manifest_path, output_path = Path(manifest_path).absolute(), Path(output_path).absolute()
    no_links(manifest_path)
    no_links(output_path)
    manifest_path = manifest_path.resolve(strict=True)
    input_root = manifest_path.parent
    output = output_path.resolve()
    if overlap(input_root, output):
        raise ValueError('Output must be outside input root and cannot contain it')
    if output.exists():
        raise ValueError('Output must be a new directory; never overwrite evidence')
    manifest_bytes = manifest_path.read_bytes()
    data = json.loads(manifest_bytes)
    if data.get('schema') != 'synthetic-integration-input/1' or data.get('kind') != 'synthetic_only':
        raise ValueError('Only synthetic input is authorized by this runner; no actual case support')
    if not isinstance(data.get('repository'), str) or not data['repository'].startswith('synthetic://'):
        raise ValueError('Synthetic repository identity required')
    if data.get('snapshot_kind') not in ('synthetic_dev', 'synthetic_variant'):
        raise ValueError('Explicit synthetic snapshot kind required')
    for key in ('revision', 'seed_id'):
        if not isinstance(data.get(key), str) or not data[key].strip():
            raise ValueError(f'Missing explicit {key}')
    if not isinstance(data.get('provenance'), dict) or not data['provenance']:
        raise ValueError('Provenance must be a nonempty object')
    sources, seen = [], set()
    if not isinstance(data.get('source_files'), list) or not data['source_files']:
        raise ValueError('Explicit Java source allowlist required')
    for entry in data['source_files']:
        name = entry['path']
        parts = PurePosixPath(name)
        if (not name or '\\' in name or ':' in name or parts.is_absolute() or
                '..' in parts.parts or parts.as_posix() != name or not name.endswith('.java') or name.casefold() in seen):
            raise ValueError('Unsafe or duplicate source member')
        seen.add(name.casefold())
        path = input_root / name
        no_links(path)
        path = path.resolve(strict=True)
        if input_root not in path.parents:
            raise ValueError('Source outside input root')
        raw = path.read_bytes()
        if sha(raw) != entry['sha256']:
            raise ValueError(f'Input hash mismatch: {name}')
        sources.append((name, path, raw))
    # Validate all source bytes/syntax before creating output.
    survey = [survey_source(raw, name) for name, _, raw in sources]
    output.mkdir(parents=True)
    record = dict(status='started', scope='synthetic_only', argv=sys.argv,
                  started_utc=datetime.now(timezone.utc).isoformat(),
                  manifest_sha256=sha(manifest_bytes), repository=data['repository'], revision=data['revision'],
                  snapshot_kind=data['snapshot_kind'], seed_id=data['seed_id'], provenance=data['provenance'],
                  input_files=[dict(path=n, sha256=sha(raw)) for n, _, raw in sources],
                  code_hashes={name: sha((Path(__file__).parent / name).read_bytes())
                               for name in ('parser.py', 'neo4j_importer.py', 'synthetic_adapter.py', 'response_survey.py')},
                  dependencies={name: importlib.metadata.version(name) for name in ('tree-sitter', 'tree-sitter-java')},
                  actual_case_executed=False, neo4j_run=False, model_calls=0)
    try:
        builder = DependencyGraphBuilder(repository=data['repository'], commit_sha=data['revision'])
        graph = builder.build_multi_file_graph([str(path) for _, path, _ in sources],
                                             snapshot_kind=data['snapshot_kind'], patch_id=data.get('patch_id'))
        # Existing parser paths may be normalized to repository-shaped aliases.
        # Bind aliases explicitly without rewriting the native graph's evidence.
        aliases = {}
        for name, path, raw in sources:
            for group in builder.parser.parse_source(raw.decode('utf-8'), str(path)):
                for item in group:
                    alias = item.file.replace('\\', '/')
                    if alias in aliases and aliases[alias] != name:
                        raise ValueError('Native source alias collision; no guessed source binding')
                    aliases[alias] = name
        record['native_source_map'] = aliases
        write_json(output / 'graph.native.json', graph)
        Neo4jGraphImporter().generate_cypher_script(graph, str(output / 'graph.synthetic.cypher'))
        write_json(output / 'response-survey.experimental.json', dict(
            schema='synthetic-response-survey-experimental/1', snapshot_kind=data['snapshot_kind'],
            revision=data['revision'], source_files=survey, shared_graph_contract_changed=False))
        if manifest_path.read_bytes() != manifest_bytes or any(path.read_bytes() != raw for _, path, raw in sources):
            raise ValueError('Input changed during extraction; run is invalid')
        record['seed_present_in_native_nodes'] = any(row['id'] == data['seed_id'] for row in graph['nodes'])
        if not record['seed_present_in_native_nodes']:
            raise ValueError('Seed absent from native nodes; no invented alias or implicit record method')
        record['status'] = 'synthetic_preparation_complete_not_actual_integration'
        record['input_unchanged'] = True
    except Exception as error:
        record.update(status='failed', error=f'{type(error).__name__}: {error}')
        raise
    finally:
        record['finished_utc'] = datetime.now(timezone.utc).isoformat()
        write_json(output / 'run.json', record)
        files = sorted(path for path in output.iterdir() if path.is_file())
        with (output / 'checksums.sha256').open('x', encoding='utf-8', newline='\n') as stream:
            for path in files:
                stream.write(f'{sha(path.read_bytes())}  {path.name}\n')
    return record
