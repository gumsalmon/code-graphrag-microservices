// Local Git blobs -> immutable P03 proposal. No app execution or external API.
import { readFile, writeFile, mkdir, readdir, lstat, realpath } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { SOURCE_PIN, CONFIG_PIN, PROTOCOL_SHA256, SOURCE_FILES, CONFIG_FILES, OWNER_RESOURCE, GATES, ensure,
  sha256, gitBlob, jsonText, canonical, buildCandidate } from '../pipeline/p03/preparation.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'handoff-out/p03-preparation');
const TOOLING = ['scripts/prepare_p03_inputs.mjs', 'pipeline/p03/preparation.mjs', 'pipeline/p03/preparation.test.mjs',
  'pipeline/p03/response_checks.py', 'pipeline/p03/response_checks_test.py', 'pipeline/p03/README.md'];
const SPECS = { scenario: 'spec/scenario.candidate.v0.1.0.json', fixture: 'spec/fixture.candidate.v1.json',
  scope: 'spec/scope.candidate.v1.json', inventory: 'draft/inventory.v1.json', universe: 'draft/evaluation_universe.draft.v1.json',
  plan: 'draft/runtime-plan.v1.json', audit: 'draft/source-audit.v1.json' };
const childEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|SYSTEMDRIVE|TEMP|TMP)$/i.test(key)));
childEnv.GIT_CONFIG_NOSYSTEM = '1'; childEnv.GIT_CONFIG_GLOBAL = process.platform === 'win32' ? 'NUL' : '/dev/null';
const git = (directory, args) => execFileSync('git', ['-c', 'safe.directory=' + directory.replaceAll('\\', '/'), '-c', 'core.fsmonitor=false',
  '--no-optional-locks', '-C', directory, ...args], { windowsHide: true, env: childEnv, timeout: 30000, maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
async function write(root, name, bytes) { const path = resolve(root, name); await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes, { flag: 'wx' }); }
function safePath(name) { return /^[A-Za-z0-9_./-]+$/.test(name) && !name.startsWith('/') && name.split('/').every(part => part !== '.' && part !== '..' && part !== ''); }
async function allFiles(root, prefix = '') {
  const result = [];
  for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
    const name = prefix + entry.name; ensure(safePath(name) && !entry.isSymbolicLink(), 'Unsafe path or link: ' + name);
    if (entry.isDirectory()) result.push(...await allFiles(root, name + '/')); else { ensure(entry.isFile(), 'Not a regular file: ' + name); result.push(name); }
  }
  return result.sort();
}

export async function verifyP03Candidate(runDirectory) {
  const root = await realpath(resolve(runDirectory)); ensure(!(await lstat(resolve(runDirectory))).isSymbolicLink(), 'Linked proposal root');
  const manifestBytes = await readFile(resolve(root, 'SHA256SUMS.txt')), listed = new Map();
  for (const line of manifestBytes.toString('utf8').trimEnd().split('\n')) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line); ensure(match && safePath(match[2]) && !listed.has(match[2]), 'Unsafe or duplicate manifest row');
    listed.set(match[2], match[1]);
  }
  const actual = await allFiles(root);
  ensure(canonical(actual) === canonical([...listed.keys(), 'SHA256SUMS.txt'].sort()), 'Unmanifested or missing file');
  for (const [name, digest] of listed) ensure(sha256(await readFile(resolve(root, name))) === digest, 'Checksum mismatch: ' + name);
  const sources = {}, config = {};
  for (const file of SOURCE_FILES) sources[file] = await readFile(resolve(root, 'input/app', file), 'utf8');
  for (const file of CONFIG_FILES) config[file] = await readFile(resolve(root, 'input/config', file), 'utf8');
  const protocol = await readFile(resolve(root, 'protocol/benchmark_protocol_v0.2.md'));
  const built = buildCandidate(sources, config, protocol);
  for (const [key, path] of Object.entries(SPECS)) ensure((await readFile(resolve(root, path), 'utf8')) === jsonText(built[key]), 'Derived candidate differs: ' + path);
  ensure((await readFile(resolve(root, 'spec/owner-response-rename.patch'), 'utf8')) === built.patch, 'Patch differs');
  ensure((await readFile(resolve(root, 'mutated/app', OWNER_RESOURCE), 'utf8')) === built.mutated, 'Applied mutation differs');
  const provenance = JSON.parse(await readFile(resolve(root, 'PROVENANCE.json'), 'utf8'));
  for (const key of ['source', 'config']) {
    const inputs = key === 'source' ? sources : config, pin = key === 'source' ? SOURCE_PIN : CONFIG_PIN;
    ensure(provenance[key].commit === pin && provenance[key].git_status_before === provenance[key].git_status_after, 'Source/config provenance changed');
    ensure(canonical(Object.keys(provenance[key].git_blob_ids).sort()) === canonical(Object.keys(inputs).sort()), 'Missing/extra source blob identity');
    for (const [file, text] of Object.entries(inputs)) ensure(gitBlob(text) === provenance[key].git_blob_ids[file], 'Git blob identity mismatch: ' + file);
  }
  ensure(canonical(provenance.gates) === canonical(GATES) && provenance.git_apply_check_exit_code === 0 && provenance.git_apply_exit_code === 0 &&
    provenance.patch_result_sha256 === sha256(built.mutated) && provenance.input_kind === 'exact_git_blobs_worktree_not_used', 'Wrong preparation provenance');
  const expectedFiles = [...Object.values(SPECS), 'spec/owner-response-rename.patch', 'mutated/app/' + OWNER_RESOURCE,
    ...SOURCE_FILES.map(file => 'input/app/' + file), ...CONFIG_FILES.map(file => 'input/config/' + file),
    'protocol/benchmark_protocol_v0.2.md', 'START_HERE.md', 'PROVENANCE.json', 'commands.json', ...TOOLING.map(file => 'tooling/' + file)].sort();
  ensure(canonical([...listed.keys()].sort()) === canonical(expectedFiles), 'Unexpected proposal artifact class');
  const commands = JSON.parse(await readFile(resolve(root, 'commands.json'), 'utf8'));
  ensure(commands.length === 2 && commands.every(row => row.exit_code === 0) && commands[0].args.includes('--check') &&
    commands.every(row => row.args.includes('--no-index')), 'Missing independent Git patch check/application');
  return { status: 'candidate_integrity_verified_not_input_lock', directory: root, manifest_files: listed.size,
    manifest_sha256: sha256(manifestBytes), scenario_sha256: sha256(jsonText(built.scenario)), ...built.scenario.bindings,
    source_files: SOURCE_FILES.length, config_files: CONFIG_FILES.length,
    eligible_entities: Object.fromEntries(['method', 'api', 'service'].map(level => [level, built.universe.eligible_entities.filter(row => row.level === level).length])),
    planned_counts: built.plan.planned_counts, applied_patch_matches_proposed_source: true, ...GATES };
}

export async function prepareP03Candidate({ sourceDirectory, configDirectory, protocolPath }) {
  const source = await realpath(resolve(sourceDirectory)), config = await realpath(resolve(configDirectory));
  const state = directory => git(directory, ['status', '--porcelain=v1', '--untracked-files=all']).toString('utf8');
  const before = { source: state(source), config: state(config) };
  // An untracked historical pilot log does not become an input: never read checkout files.
  const sources = {}, configs = {}, blobIds = { source: {}, config: {} };
  for (const [kind, directory, pin, paths, target] of [['source', source, SOURCE_PIN, SOURCE_FILES, sources], ['config', config, CONFIG_PIN, CONFIG_FILES, configs]]) {
    ensure(git(directory, ['rev-parse', pin + '^{commit}']).toString('utf8').trim() === pin, 'Pinned local commit missing');
    for (const file of paths) {
      const bytes = git(directory, ['show', pin + ':' + file]), oid = git(directory, ['rev-parse', pin + ':' + file]).toString('utf8').trim();
      ensure(gitBlob(bytes) === oid && Buffer.from(bytes.toString('utf8')).equals(bytes), 'Source bytes not exact UTF-8 Git blob');
      target[file] = bytes.toString('utf8'); blobIds[kind][file] = oid;
    }
  }
  const protocol = await readFile(resolve(protocolPath));
  ensure(sha256(protocol) === PROTOCOL_SHA256, 'Protocol v0.2 bytes differ; do not silently change protocol');
  const built = buildCandidate(sources, configs, protocol), runId = new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8);
  const directory = resolve(OUTPUT, runId); await mkdir(directory, { recursive: true });
  for (const file of SOURCE_FILES) await write(directory, 'input/app/' + file, sources[file]);
  for (const file of CONFIG_FILES) await write(directory, 'input/config/' + file, configs[file]);
  await write(directory, 'protocol/benchmark_protocol_v0.2.md', protocol);
  for (const [key, path] of Object.entries(SPECS)) await write(directory, path, jsonText(built[key]));
  await write(directory, 'spec/owner-response-rename.patch', built.patch);
  await write(directory, 'mutated/app/' + OWNER_RESOURCE, sources[OWNER_RESOURCE]);
  const patchPath = resolve(directory, 'spec/owner-response-rename.patch'), working = resolve(directory, 'mutated/app'), commands = [];
  for (const checkOnly of [true, false]) {
    const args = ['apply', '--no-index', ...(checkOnly ? ['--check'] : []), '--whitespace=error-all', patchPath];
    const stdout = git(working, args).toString('utf8'); commands.push({ program: 'git', args, cwd: working, exit_code: 0, stdout, timestamp: new Date().toISOString() });
  }
  ensure((await readFile(resolve(working, OWNER_RESOURCE), 'utf8')) === built.mutated, 'Git-applied result differs from builder proposal');
  await write(directory, 'commands.json', jsonText(commands));
  const after = { source: state(source), config: state(config) };
  ensure(before.source === after.source && before.config === after.config, 'Input checkout state changed');
  await write(directory, 'PROVENANCE.json', jsonText({ schema: 'p03-preparation-provenance/1', created_at: new Date().toISOString(),
    input_kind: 'exact_git_blobs_worktree_not_used', node: process.version, git: git(ROOT, ['--version']).toString('utf8').trim(),
    project_head: git(ROOT, ['rev-parse', 'HEAD']).toString('utf8').trim(), published_commit_for_this_preparation: null,
    prepared_by: 'Codex assisting Huy; not an annotator or reviewer decision',
    source: { commit: SOURCE_PIN, git_status_before: before.source, git_status_after: after.source, git_blob_ids: blobIds.source },
    config: { commit: CONFIG_PIN, git_status_before: before.config, git_status_after: after.config, git_blob_ids: blobIds.config },
    git_apply_check_exit_code: 0, git_apply_exit_code: 0, patch_result_sha256: sha256(built.mutated), gates: GATES }));
  await write(directory, 'START_HERE.md', await readFile(resolve(ROOT, 'benchmark/p03/PREPARATION_START_HERE.md')));
  for (const file of TOOLING) await write(directory, 'tooling/' + file, await readFile(resolve(ROOT, file)));
  const files = await allFiles(directory);
  await write(directory, 'SHA256SUMS.txt', (await Promise.all(files.map(async name => sha256(await readFile(resolve(directory, name))) + '  ' + name))).join('\n') + '\n');
  return verifyP03Candidate(directory);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [action, ...options] = process.argv.slice(2); let result;
    if (action === 'check') { ensure(options.length === 2 && options[0] === '--run', 'Usage: check --run DIRECTORY'); result = await verifyP03Candidate(options[1]); }
    else {
      ensure(action === 'prepare' && options.length === 6 && options[0] === '--source' && options[2] === '--config' && options[4] === '--protocol',
        'Usage: prepare --source LOCAL_SOURCE_GIT --config LOCAL_CONFIG_GIT --protocol PINNED_V02_FILE');
      result = await prepareP03Candidate({ sourceDirectory: options[1], configDirectory: options[3], protocolPath: options[5] });
    }
    console.log(jsonText(result));
  } catch (error) { console.error('P03 candidate failed: ' + error.message); process.exitCode = 1; }
}
