// Produces a dry-run design and synthetic traces, never a paired runtime run.
import { readFile, writeFile, mkdir, readdir, lstat, realpath } from 'node:fs/promises';
import { resolve, dirname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { verifyP02Preparation } from './prepare_p02_inputs.mjs';
import { buildPairedPlan, simulatePairedPlan, exerciseFailurePaths, summarizeDryRun, canonical, jsonText } from '../pipeline/p02/paired-plan.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRIVATE = resolve(ROOT, 'handoff-out/p02-paired-dry-run');
const check = (ok, message) => { if (!ok) throw new Error(message); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const COPY_INPUTS = Object.freeze({ 'input/scenario.json': 'spec/scenario.json', 'input/fixture.json': 'spec/fixture.json',
  'input/scope.json': 'spec/scope.json', 'input/optional-query.patch': 'spec/optional-query.patch', 'input/request-plan.v1.json': 'request-plan.v1.json' });
const CODE = Object.freeze({ 'code/paired-plan.mjs': 'pipeline/p02/paired-plan.mjs', 'code/prepare_p02_paired_run.mjs': 'scripts/prepare_p02_paired_run.mjs',
  'code/prepare_p02_inputs.mjs': 'scripts/prepare_p02_inputs.mjs' });
const FILES = Object.freeze(['inputs.json', 'plan.json', 'simulation.json', 'fault-simulations.json', 'summary.json', 'README.md', ...Object.keys(COPY_INPUTS), ...Object.keys(CODE)].sort());
export const DRY_RUN_FILES = FILES;
const README = '# P02 paired dry-run — không phải runtime evidence\n\n' +
  'Đây là kế hoạch 4 nhóm độc lập × 10 request (36 GET + 4 POST dự kiến) và trace state-machine tổng hợp. Không khởi động app/Docker, không áp mutation, không gửi HTTP/POST, không đọc API key, không gọi model và không tạo nhãn.\n\n' +
  'plan.json mô tả yêu cầu cách ly, fixture, thứ tự và đường dẫn evidence tương lai; những file response trong plan chưa tồn tại. simulation.json chỉ có bước mô phỏng, không có HTTP status/body giả. fault-simulations.json giữ 8 ca lỗi được tiêm tổng hợp, kể cả lỗi chính + log + cleanup.\n\n' +
  'Check exit 0 chỉ xác nhận byte, lineage và tính nhất quán của dry-run; không xác nhận độc lập universe, không chứng minh Docker cleanup/DB reset thực tế. Summary luôn runtime_matrix_completed=false, actual_http_requests=0, labels_created=false.\n\n' +
  'CLI chỉ có dry-run và check. Không có --execute, base URL, adapter thực thi, retry hay tùy chọn bỏ gate. Runtime paired/POST thật cần implementation riêng, đầu vào được Phát/Huy chốt và build/provenance đúng pin; không sửa flag để giả vượt gate.\n\n' +
  'Bản kiểm này cần preparation gốc trong workspace và cùng code version ghi trong inputs/code snapshot; không phải ZIP portability checker. Không thực thi các code snapshot dưới code/. Giữ bản gốc, mọi lần chạy sinh thư mục mới.\n';

async function readPreparation(directory) {
  const verified = await verifyP02Preparation(directory), inputBytes = {};
  for (const [target, source] of Object.entries(COPY_INPUTS)) inputBytes[target] = await readFile(resolve(verified.directory, source));
  const codeBytes = {};
  for (const [target, source] of Object.entries(CODE)) codeBytes[target] = await readFile(resolve(ROOT, source));
  const bindings = { patch_sha256: verified.patch_sha256, fixture_sha256: verified.fixture_sha256,
    universe_draft_sha256: verified.universe_draft_sha256, request_plan_sha256: hash(inputBytes['input/request-plan.v1.json']),
    preparation_manifest_sha256: hash(await readFile(resolve(verified.directory, 'checksums.sha256'))) };
  return { verified, inputBytes, codeBytes, bindings, scenario: JSON.parse(inputBytes['input/scenario.json']), fixture: JSON.parse(inputBytes['input/fixture.json']),
    matrix: JSON.parse(inputBytes['input/request-plan.v1.json']) };
}
function derive(source, runId) {
  const plan = buildPairedPlan({ ...source, runId }), simulation = simulatePairedPlan(plan), faults = exerciseFailurePaths(plan);
  return { 'plan.json': plan, 'simulation.json': simulation, 'fault-simulations.json': faults, 'summary.json': summarizeDryRun(plan, simulation, faults) };
}
async function write(directory, name, value) {
  check(FILES.includes(name) || name === 'checksums.sha256', 'Output outside dry-run allowlist');
  const file = resolve(directory, name); await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.isBuffer(value) || typeof value === 'string' ? value : jsonText(value), { flag: 'wx' });
}
async function walk(directory, prefix = '') {
  const names = [];
  for (const entry of await readdir(resolve(directory, prefix), { withFileTypes: true })) {
    const name = prefix + entry.name; check(!entry.isSymbolicLink(), 'No symlink/junction evidence');
    if (entry.isDirectory()) names.push(...await walk(directory, name + '/')); else { check(entry.isFile(), 'Only regular artifacts'); names.push(name); }
  }
  return names.sort();
}
export async function verifyDryRunManifest(runDirectory) {
  const directory = resolve(runDirectory);
  check(directory.startsWith(PRIVATE + sep), 'Run must be inside private P02 paired dry-run root');
  check(await realpath(directory) === directory && !(await lstat(directory)).isSymbolicLink() &&
    (await realpath(directory)).startsWith(await realpath(PRIVATE) + sep), 'Symlink/junction or external run not allowed');
  const actual = await walk(directory);
  check(canonical(actual) === canonical([...FILES, 'checksums.sha256'].sort()), 'Missing or unmanifested dry-run artifacts');
  const entries = new Map(), folded = new Set(), text = await readFile(resolve(directory, 'checksums.sha256'), 'utf8');
  for (const line of text.trimEnd().split('\n')) {
    const match = /^([a-f0-9]{64})  ([A-Za-z0-9_./-]+)$/.exec(line);
    check(match && FILES.includes(match[2]) && !folded.has(match[2].toLowerCase()), 'Unsafe/duplicate checksum member');
    entries.set(match[2], match[1]); folded.add(match[2].toLowerCase());
  }
  check(canonical([...entries.keys()].sort()) === canonical(FILES), 'Incomplete dry-run checksum manifest');
  for (const [name, expected] of entries) {
    const file = resolve(directory, name);
    check(await realpath(file) === file && !(await lstat(file)).isSymbolicLink() && hash(await readFile(file)) === expected, 'Dry-run checksum mismatch: ' + name);
  }
  return { directory, manifest_sha256: hash(Buffer.from(text)) };
}

export function parseDryRunArguments(args) {
  check(args.length === 3 && typeof args[2] === 'string' && args[2].length > 0 &&
    (args[0] === 'dry-run' && args[1] === '--preparation' || args[0] === 'check' && args[1] === '--run'),
  'Usage: dry-run --preparation PRIVATE_P02_PREPARATION | check --run PRIVATE_P02_PAIRED_DRY_RUN. Real execution is unavailable.');
  return { action: args[0], directory: args[2] };
}

export async function preparePairedDryRun(preparationDirectory) {
  const source = await readPreparation(preparationDirectory);
  await mkdir(PRIVATE, { recursive: true }); check(await realpath(PRIVATE) === PRIVATE, 'Private output root cannot be a symlink/junction');
  const runId = new Date().toISOString().replace(/[-:.]/g, '').toLowerCase() + '-' + randomUUID().slice(0, 8);
  const directory = resolve(PRIVATE, runId); await mkdir(directory);
  try {
    for (const [name, bytes] of Object.entries({ ...source.inputBytes, ...source.codeBytes })) await write(directory, name, bytes);
    await write(directory, 'inputs.json', { schema: 'p02-paired-dry-inputs/1', run_id: runId, mode: 'dry_run_only',
      created_at: new Date().toISOString(), node_version: process.version, platform: process.platform, preparation_directory: source.verified.directory,
      preparation_verified: source.verified, bindings: source.bindings,
      input_sha256: Object.fromEntries(Object.entries(source.inputBytes).map(([name, bytes]) => [name, hash(bytes)])),
      code_sha256: Object.fromEntries(Object.entries(source.codeBytes).map(([name, bytes]) => [name, hash(bytes)])),
      evaluated_system_outputs_read: false, credentials_read: false, independent_input_confirmation_received: false, runtime_executed: false });
    for (const [name, value] of Object.entries(derive(source, runId))) await write(directory, name, value);
    await write(directory, 'README.md', README);
    const after = await readPreparation(source.verified.directory);
    check(canonical(source.bindings) === canonical(after.bindings) && Object.keys(source.codeBytes).every(name =>
      hash(source.codeBytes[name]) === hash(after.codeBytes[name])), 'Preparation or code changed during dry-run; preserve incomplete output');
    await write(directory, 'checksums.sha256', (await Promise.all(FILES.map(async name => hash(await readFile(resolve(directory, name))) + '  ' + name))).join('\n') + '\n');
    return await verifyPairedDryRun(directory);
  } catch (error) { throw new Error(error.message + '; incomplete dry-run retained at ' + directory); }
}

export async function verifyPairedDryRun(runDirectory) {
  const checked = await verifyDryRunManifest(runDirectory), readJson = async name => JSON.parse(await readFile(resolve(checked.directory, name), 'utf8'));
  const inputs = await readJson('inputs.json');
  const source = await readPreparation(inputs.preparation_directory);
  const expectedInputs = { schema: 'p02-paired-dry-inputs/1', run_id: basename(checked.directory), mode: 'dry_run_only',
    created_at: inputs.created_at, node_version: inputs.node_version, platform: inputs.platform, preparation_directory: source.verified.directory,
    preparation_verified: source.verified, bindings: source.bindings,
    input_sha256: Object.fromEntries(Object.entries(source.inputBytes).map(([name, bytes]) => [name, hash(bytes)])),
    code_sha256: Object.fromEntries(Object.entries(source.codeBytes).map(([name, bytes]) => [name, hash(bytes)])),
    evaluated_system_outputs_read: false, credentials_read: false, independent_input_confirmation_received: false, runtime_executed: false };
  check(typeof inputs.created_at === 'string' && Number.isFinite(Date.parse(inputs.created_at)) && typeof inputs.node_version === 'string' &&
    typeof inputs.platform === 'string' && canonical(inputs) === canonical(expectedInputs), 'Wrong input state, lineage or current code version');
  for (const [name, bytes] of Object.entries({ ...source.inputBytes, ...source.codeBytes }))
    check((await readFile(resolve(checked.directory, name))).equals(bytes), 'Copied pinned input/code differs: ' + name);
  const derived = derive(source, inputs.run_id);
  for (const [name, expected] of Object.entries(derived)) check(canonical(await readJson(name)) === canonical(expected), 'Derived dry-run artifact differs: ' + name);
  check(await readFile(resolve(checked.directory, 'README.md'), 'utf8') === README, 'Dry-run limitations note differs');
  return { directory: checked.directory, ...derived['summary.json'], manifest_files: FILES.length, manifest_sha256: checked.manifest_sha256,
    preparation_manifest_unchanged: true, semantic_check_scope: 'pinned_preparation_and_current_code_not_runtime_or_human_review' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseDryRunArguments(process.argv.slice(2));
    console.log(jsonText(options.action === 'dry-run' ? await preparePairedDryRun(options.directory) : await verifyPairedDryRun(options.directory)));
  } catch (error) { console.error('P02 paired dry-run failed: ' + error.message); process.exitCode = 1; }
}
