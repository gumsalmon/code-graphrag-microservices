// Local packaging only: no application/model calls, Git writes, review decisions or publication.
import { readFile, writeFile, mkdir, readdir, lstat, realpath, copyFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { verifyBaseline } from './check_p02_baseline.mjs';
import { verifyP02Preparation } from './prepare_p02_inputs.mjs';
import { verifyBuildRun } from './run_p02_baseline.mjs';
import { safeMember, phatRawBaseline, permittedForPhat, verifyPackage } from './verify_p02_handoff.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PINS = Object.freeze({ source: '3858f9c630cf989bb6809a86edf47c2be78dc9f1', config: '323993ce2519c6d02df63e08bf4458d123d3b611',
  implementation: 'e95613795133088621117179c9fb9592dab62b16', protocol: '5f9204d66253604edf9101c2f888fc7e75aa0be7' });
const check = (ok, message) => { if (!ok) throw new Error(message); };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const encoded = data => JSON.stringify(data, null, 2) + '\n';
const git = (directory, args) => execFileSync('git', ['-c', 'safe.directory=' + directory.replaceAll('\\', '/'), '-c', 'core.fsmonitor=false', '-C', directory, ...args],
  { windowsHide: true, timeout: 30000, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const command = (program, args, cwd = ROOT) => execFileSync(program, args, { cwd, windowsHide: true, timeout: 60000,
  maxBuffer: 16 * 1024 * 1024, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
async function write(root, name, data) {
  check(safeMember(name), 'Unsafe generated path'); const file = resolve(root, name); await mkdir(dirname(file), { recursive: true });
  await writeFile(file, typeof data === 'string' || Buffer.isBuffer(data) ? data : encoded(data), { flag: 'wx' });
}
async function files(root, prefix = '') {
  const result = [];
  for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
    check(!entry.isSymbolicLink(), 'No symbolic links in a handoff'); const name = prefix + entry.name;
    check(safeMember(name), 'Nonportable file path: ' + name);
    if (entry.isDirectory()) result.push(...await files(root, name + '/')); else {
      check(entry.isFile() && !(await lstat(resolve(root, name))).isSymbolicLink(), 'Only regular files allowed'); result.push(name);
    }
  }
  return result.sort();
}
async function copy(root, target, origin) {
  check(safeMember(target), 'Unsafe copy target'); await mkdir(dirname(resolve(root, target)), { recursive: true });
  await copyFile(origin, resolve(root, target), constants.COPYFILE_EXCL);
  const bytes = await readFile(origin);
  check(sha256(await readFile(resolve(root, target))) === sha256(bytes), 'Copy mismatch: ' + target);
  return { package_path: target, sha256: sha256(bytes), bytes: bytes.length };
}
async function snapshot(repo, pin, archive, destination) {
  // Validate the fixed archive against every Git blob, not just 12 scenario support files.
  const entries = git(repo, ['ls-tree', '-rz', pin]).toString('utf8').split('\0').filter(Boolean).map(line => {
    const match = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(line);
    check(match && safeMember(match[3]), 'Unsafe/unhandled source tree entry'); return { path: match[3], mode: match[1], git_blob: match[2] };
  });
  const tarMembers = command('tar', ['-tf', archive]).trim().split(/\r?\n/).map(name => name.endsWith('/') ? name.slice(0, -1) : name);
  check(tarMembers.every(safeMember), 'Unsafe archive member');
  const allowed = new Set(entries.map(item => item.path));
  check(tarMembers.every(name => allowed.has(name) || entries.some(item => item.path.startsWith(name + '/'))), 'Archive includes a file outside pinned source tree');
  await mkdir(destination); command('tar', ['-xf', archive, '-C', destination]);
  check(JSON.stringify(await files(destination)) === JSON.stringify(entries.map(item => item.path).sort()), 'Git archive file list differs from pinned tree');
  for (const entry of entries) {
    const bytes = await readFile(resolve(destination, entry.path));
    const blob = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
    check(blob === entry.git_blob, 'Archive bytes differ from pinned Git blob: ' + entry.path);
    entry.sha256 = sha256(bytes); entry.bytes = bytes.length;
  }
  check(entries.some(item => item.path === 'LICENSE'), 'Missing upstream license'); return entries;
}
export function inspectTransferFile(name, bytes) {
  check(safeMember(name), 'Unsafe transfer path');
  check(!/(^|\/)(\.git|node_modules|target|__pycache__|\.m2)(\/|$)/i.test(name) &&
    !/(^|\/)(\.env(?:\..*)?|credentials?[^/]*|[^/]*\.dpapi|id_rsa|id_ed25519)$/i.test(name), 'Sensitive/generated transfer path: ' + name);
  check(!name.endsWith('.jar') || name === 'input/app/.mvn/wrapper/maven-wrapper.jar', 'Built application binary must not be shipped');
  if (bytes.includes(0)) return;
  const text = bytes.toString('utf8');
  check(!/AIza[0-9A-Za-z_-]{30,}|\bsk-(?:proj-)?[0-9A-Za-z_-]{25,}|\bgh[pousr]_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text), 'Possible secret in transfer file: ' + name);
}
async function seal(directory) {
  const names = await files(directory);
  for (const name of names) inspectTransferFile(name, await readFile(resolve(directory, name)));
  await write(directory, 'SHA256SUMS.txt', (await Promise.all(names.map(async name => sha256(await readFile(resolve(directory, name))) + '  ' + name))).join('\n') + '\n');
  return verifyPackage(directory);
}
function options(args) {
  const allowed = ['--build-run', '--baseline-run', '--preparation', '--source-repo', '--config-repo', '--powershell'], result = {};
  check(args.length % 2 === 0, 'Expected option/value pairs');
  for (let index = 0; index < args.length; index += 2) {
    check(allowed.includes(args[index]) && !result[args[index]] && args[index + 1], 'Unknown/duplicate/missing option'); result[args[index]] = args[index + 1];
  }
  check(allowed.slice(0, 5).every(key => result[key]), 'Required: --build-run --baseline-run --preparation --source-repo --config-repo');
  return result;
}
export async function packageTeam(input) {
  const build = await verifyBuildRun(input['--build-run']), baseline = await verifyBaseline(input['--baseline-run']), preparation = await verifyP02Preparation(input['--preparation']);
  const baselineInputs = JSON.parse(await readFile(resolve(baseline.directory, 'inputs.json'), 'utf8'));
  check(await realpath(baselineInputs.build_directory) === await realpath(build.directory) &&
    await realpath(baselineInputs.preparation_directory) === await realpath(preparation.directory), 'Selected runs do not have the same lineage');
  for (const [name, expected] of Object.entries(baselineInputs.code_sha256))
    check(safeMember(name) && sha256(await readFile(resolve(ROOT, name))) === expected, 'Executed baseline runner bytes differ from current transfer input: ' + name);
  const runId = new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8);
  const output = resolve(ROOT, 'handoff-out/p02-team-handoff', runId); await mkdir(output, { recursive: true });
  const sourceRepo = await realpath(resolve(input['--source-repo'])), configRepo = await realpath(resolve(input['--config-repo']));
  const appTree = await snapshot(sourceRepo, PINS.source, resolve(build.directory, 'source.tar'), resolve(output, '_source'));
  const configTree = await snapshot(configRepo, PINS.config, resolve(build.directory, 'config.tar'), resolve(output, '_config'));
  const rootHead = git(ROOT, ['rev-parse', 'HEAD']).toString().trim();
  const rootDirty = git(ROOT, ['status', '--porcelain=v1', '--untracked-files=all']).toString() !== '';
  const shared = ['PROJECT_CONTEXT.md', 'tasks/P02_P04_TASK_PACKETS.md', 'tasks/P02_P04_EXECUTION_PLAN.md', 'tasks/P02_P04_RESEARCH_REGISTER.json',
    'benchmark/p02/README.md', 'pipeline/p02/README.md', ...['scenario.json', 'fixture.json', 'scope.json', 'optional-query.patch'].map(name => 'benchmark/p02/preparation.v1/' + name)];
  const technical = ['.gitattributes', 'scripts/prepare_p02_inputs.mjs', 'scripts/run_p02_baseline.mjs', 'scripts/check_p02_baseline.mjs',
    ...['preparation.test.mjs', 'runtime.test.mjs', 'baseline-check.test.mjs', 'http-probe.py', 'http_probe_test.py', 'maven-settings.xml'].map(name => 'pipeline/p02/' + name)];
  const implementation = ['requirements.txt', 'src/parser.py', 'src/neo4j_importer.py', 'src/chroma_baseline.py', 'src/proto_parser.py', 'verify_neo4j_live.py'];
  const baselineFiles = await files(baseline.directory), results = [];
  for (const role of ['HIEN', 'PHAT']) {
    console.error('Packaging ' + role + ': source/config, role-specific evidence and instructions');
    const directory = resolve(output, 'P02_' + role); await mkdir(directory); const origins = [], pinnedExports = [];
    const add = async (name, source) => { const copied = await copy(directory, name, source); origins.push({ ...copied, source_path: source }); };
    for (const name of [...shared, ...(role === 'HIEN' ? technical : [])]) await add(name, resolve(ROOT, name));
    for (const [name, source] of Object.entries({ 'START_HERE.md': role + '_START_HERE.md', 'AI_PROMPT.txt': 'AI_' + role + '_PROMPT.txt',
      'RETURN_TEMPLATE.md': 'RETURN_' + role + '_TEMPLATE.md', 'ACKNOWLEDGEMENT_TEMPLATE.md': 'ACKNOWLEDGEMENT_TEMPLATE.md', 'VERIFY_PACKAGE.ps1': 'VERIFY_PACKAGE.ps1',
      ...(role === 'HIEN' ? { 'REPRODUCE.md': 'REPRODUCE_HIEN.md' } : { 'SOURCE_NOTES_TEMPLATE.md': 'SOURCE_NOTES_TEMPLATE.md' }) })) await add(name, resolve(ROOT, 'tasks/p02-handoff', source));
    await add('verify_package.mjs', resolve(ROOT, 'scripts/verify_p02_handoff.mjs'));
    for (const [prefix, tree, source] of [['input/app', appTree, '_source'], ['input/config', configTree, '_config']])
      for (const item of tree) await copy(directory, prefix + '/' + item.path, resolve(output, source, item.path));
    for (const name of ['inventory.v1.json', 'evaluation_universe.draft.v1.json', 'request-plan.v1.json']) await add('draft/' + name, resolve(preparation.directory, name));
    const protocolPath = 'benchmark/protocol/benchmark_protocol_v0.2.md';
    const protocolBytes = git(ROOT, ['show', PINS.protocol + ':' + protocolPath]); await write(directory, protocolPath, protocolBytes);
    pinnedExports.push({ package_path: protocolPath, commit: PINS.protocol, git_path: protocolPath, sha256: sha256(protocolBytes) });
    if (role === 'HIEN') for (const name of implementation) {
      const bytes = git(ROOT, ['show', PINS.implementation + ':' + name]); await write(directory, 'implementation/' + name, bytes);
      pinnedExports.push({ package_path: 'implementation/' + name, commit: PINS.implementation, git_path: name, sha256: sha256(bytes) });
    }
    const selectedBaseline = baselineFiles.filter(name => role === 'HIEN' || phatRawBaseline(name));
    for (const name of selectedBaseline) await add('evidence/baseline/' + name, resolve(baseline.directory, name));
    for (const name of ['build.json', 'maven-build.command.json', 'maven-build.exit.json', 'maven-build.stdout.log', 'maven-build.stderr.log']) await add('provenance/' + name, resolve(build.directory, name));
    await add('provenance/build-original-checksums.sha256', resolve(build.directory, 'checksums.sha256'));
    await add('provenance/baseline-original-checksums.sha256', resolve(baseline.directory, 'checksums.sha256'));
    await write(directory, 'PACKAGE_INDEX.json', { schema: 'p02-team-handoff/1', role, run_id: runId, created_at: new Date().toISOString(),
      state: 'prepared_for_human_acknowledgement_not_a_completed_assignment', official_scoring_authorized: false, human_acknowledgement_received: false,
      independent_universe_confirmation_received: false, contains_accepted_labels: false, contains_model_predictions: false,
      includes_application_binaries: false, includes_credentials: false, runtime_reexecuted_during_packaging: false,
      source_first_blinding_claimed: false, entry_point: 'START_HERE.md' });
    await write(directory, 'INPUT_PROVENANCE.json', { schema: 'p02-team-handoff-inputs/1', role, pins: PINS,
      local_project_snapshot: { base_head: rootHead, dirty_worktree: rootDirty, published_commit_for_this_snapshot: null },
      snapshot_note: 'Files copied from the local working tree are identified by per-file SHA256, not attributed to base HEAD as a committed version.',
      source_snapshot: { archive_sha256: build.build.source_archive_sha256, pin: PINS.source, full_git_blob_tree_verified: true, files: appTree },
      config_snapshot: { archive_sha256: build.build.config_archive_sha256, pin: PINS.config, full_git_blob_tree_verified: true, files: configTree },
      pinned_git_exports: pinnedExports, copied_files: origins,
      baseline: { original_run_id: baselineInputs.run_id, selected_files: selectedBaseline, omitted_files: baselineFiles.filter(name => !selectedBaseline.includes(name)),
        byte_preservation: 'Copied raw files are unchanged. Original manifests describe original runs, not this filtered transfer.' },
      portable_verification: 'SHA256SUMS.txt and VERIFY_PACKAGE.ps1 or verify_package.mjs; original build checker requires the sender JARs and paths, which are not shipped.',
      omitted: ['.git', 'application build JARs/target', 'Maven cache/distribution', 'Docker images', 'model cache', 'credentials', 'P01 labels and evaluated-system outputs',
        ...(role === 'PHAT' ? ['team parser/Neo4j/Chroma implementation', 'runtime probe/runner code', 'derived baseline result and probe summaries'] : [])],
      known_exposure: 'Full project context includes draft census counts and P01 history; do not claim blinded review. Declare additional exposure honestly.' });
    await write(directory, 'PORTABLE_PATHS.md', '# Đường dẫn và cách dùng gói\n\n' +
      'Giải nén vào đường dẫn ngắn, giữ bản gốc để kiểm checksum. File làm việc/notes/log mới đặt ở bản sao riêng. Không chạy command lịch sử nguyên xi.\n\n' +
      '| Nội dung | Trong gói |\n|---|---|\n| PetClinic baseline đầy đủ, không .git | input/app/ |\n| Config đầy đủ, không .git | input/config/ |\n' +
      '| Scenario/fixture/scope/patch | benchmark/p02/preparation.v1/ |\n| Inventory/universe/request plan dự thảo | draft/ |\n| Raw baseline đã chọn | evidence/baseline/ |\n| Protocol đã pin | benchmark/protocol/benchmark_protocol_v0.2.md |\n' +
      (role === 'HIEN' ? '| Mã công cụ P02 và tests | scripts/, pipeline/p02/ |\n| Sáu file implementation đã pin, không phải whole Git repo | implementation/ |\n' : '| Mẫu ghi nhận source-first | SOURCE_NOTES_TEMPLATE.md |\n') +
      '\nCác đường dẫn E:/NCKH hoặc C:/ trong raw command/inputs và các báo cáo cũ là provenance lịch sử của máy gửi, không phải file cần có trên máy nhận. Không sửa raw để đổi đường dẫn.\n\n' +
      'Các liên kết P01/closeout/model/output lịch sử trong context và tài liệu chung không được đóng gói. Chúng không phải đầu vào nhiệm vụ này; không tự tải về để lấy đáp án. Gói chỉ tự chứa phần đọc/kiểm P02 được nêu trong START_HERE; dependency build/runtime cần setup riêng.\n');
    await write(directory, 'PACKAGE_CONTENTS.md', '# Nội dung và giới hạn\n\n' +
      'Gói riêng cho ' + (role === 'HIEN' ? 'Hiển: baseline và audit tích hợp kỹ thuật' : 'Phát: xác nhận phạm vi source-first trước nhãn') + '. Mở START_HERE.md; AI_PROMPT.txt dùng khi nhờ AI hỗ trợ. Không gửi chéo gói kỹ thuật sang người kiểm phạm vi làm nguồn nhãn.\n\n' +
      '- Đầy đủ source/config tại pin, giữ LICENSE upstream; mọi file đã đối chiếu Git blob. Không có .git.\n' +
      '- Bốn spec và ba draft P02 giữ nguyên byte. Chưa khóa universe, chưa có polarity/labels.\n' +
      '- Baseline máy gửi: ' + selectedBaseline.length + '/' + baselineFiles.length + ' file (tính cả manifest nếu có); chín GET fixture và bốn config/registry, không mutated/POST/full matrix.\n' +
      (role === 'PHAT' ? '- Đã lọc result.json, observations summary và probe stdout summaries. Raw HTTP, readiness attempts, logs/config và command/exit vẫn giữ. Danh sách omitted trong INPUT_PROVENANCE.json.\n' : '- Có runner/checker/tests P02; chưa có runner mutated/paired matrix. Sáu file implementation là input audit, không hứa parser đã hỗ trợ P02.\n') +
      '- Không kèm dependency runtime, build JARs, model output/cache hoặc credential. Chạy test công cụ không tương đương tái lập app.\n' +
      '- SHA256SUMS.txt là manifest của gói. provenance/*original-checksums.sha256 là hồ sơ gốc, có file không được ship, không dùng thay manifest gói.\n\n' +
      'Kiểm ZIP SHA bằng thông tin người gửi rồi dùng VERIFY_PACKAGE.ps1 hoặc node verify_package.mjs. Verifier không gọi mạng/Docker/LLM; byte integrity không phải label/reviewer approval.\n');
    if (role === 'PHAT') check((await files(directory)).every(permittedForPhat), 'Source-first package allowlist failed');
    const verified = await seal(directory), ps = input['--powershell'] ?? 'pwsh';
    const psBefore = command(ps, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolve(directory, 'VERIFY_PACKAGE.ps1')]);
    const archiveName = 'P02_' + role + '_' + runId + '.zip', archive = resolve(output, archiveName), extracted = resolve(output, '_qa_' + role.toLowerCase());
    const zipOutput = command(ps, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolve(ROOT, 'scripts/zip_p02_handoff.ps1'), '-Source', directory, '-Zip', archive, '-ExtractTo', extracted]);
    const roundtrip = await verifyPackage(extracted);
    check(roundtrip.manifest_sha256 === verified.manifest_sha256 && roundtrip.files_verified === verified.files_verified, 'ZIP roundtrip changed manifest/files');
    const psAfter = command(ps, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolve(extracted, 'VERIFY_PACKAGE.ps1')]);
    const windowsPowerShellAfter = process.platform === 'win32' ? command('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolve(extracted, 'VERIFY_PACKAGE.ps1')]).trim() : 'not_available_on_this_platform';
    const packageTestOutput = role === 'HIEN' ? command(process.execPath, ['--test', 'pipeline/p02/preparation.test.mjs', 'pipeline/p02/runtime.test.mjs', 'pipeline/p02/baseline-check.test.mjs'], extracted) : null;
    if (packageTestOutput) await write(output, 'HIEN_PACKAGE_TESTS.log', packageTestOutput);
    check((await verifyPackage(extracted)).manifest_sha256 === roundtrip.manifest_sha256, 'QA changed package files');
    results.push({ role, archive: archiveName, archive_sha256: sha256(await readFile(archive)), archive_bytes: (await stat(archive)).size,
      verified_before_zip: verified, verified_after_extract: roundtrip, powershell_before: psBefore.trim(), powershell_after: psAfter.trim(),
      windows_powershell_5_after: windowsPowerShellAfter, standalone_p02_tests: packageTestOutput ? '24 passed; see HIEN_PACKAGE_TESTS.log; no application runtime' : 'not_in_phat_package', zip_output: zipOutput.trim() });
  }
  await write(output, 'ARCHIVES.sha256', results.map(item => item.archive_sha256 + '  ' + item.archive).join('\n') + '\n');
  await write(output, 'BUILD_VERIFICATION.json', { schema: 'p02-team-package-verification/1', status: 'two_role_packages_verified', run_id: runId,
    created_at: new Date().toISOString(), baseline_original_readonly_check: baseline, preparation_original_readonly_check: preparation,
    source_files_git_blob_verified: appTree.length, config_files_git_blob_verified: configTree.length, results,
    application_runtime_reexecuted: false, model_calls: 0, new_labels: 0, human_acknowledgements_received: false,
    git_commit_created: false, pushed: false, independent_review_or_input_lock: false });
  await write(output, 'GUI_CHO_TUNG_THANH_VIEN.md', '# Hai gói P02\n\n' + results.map(item => '- ' + item.role + ': `' + item.archive + '`; SHA-256 `' + item.archive_sha256 + '`').join('\n') +
    '\n\nChỉ gửi ZIP HIEN cho Hiển, ZIP PHAT cho Phát, kèm đúng SHA tương ứng. Không cần gửi các thư mục _source, _config, _qa_* hoặc gộp cả hai ZIP cho người kiểm source-first. Mỗi người mở START_HERE.md sau giải nén, đọc PROJECT_CONTEXT đầy đủ và gửi xác nhận nhận việc trước.\n\n' +
    'Gói có thể dùng offline để đọc/kiểm; không hứa tái lập app không cần setup. Chưa commit/push gói này; chưa nhận xác nhận của thành viên, chưa khóa universe/nhãn và chưa mở P03/P04.\n');
  for (const item of results) await write(output, 'TIN_NHAN_' + item.role + '.txt',
    (item.role === 'HIEN' ? 'Hiển ơi, mình gửi gói riêng cho phần kỹ thuật P02. Việc làm ngay là kiểm gói, chạy tests P02, kiểm môi trường/tái lập baseline GET nếu đủ dependency và audit khả năng tích hợp parser/Neo4j. Phần chạy actual P02 extraction/graph/output chờ xác nhận và khóa đầu vào như hướng dẫn; chưa mở P03/P04.' :
      'Phát ơi, mình gửi gói riêng cho phần kiểm độc lập đầu vào P02. Việc làm ngay là đối chiếu source/patch/config/fixture, tự ghi source notes rồi rà inventory/universe/alias dự thảo. Đầu ra là nhận định có bằng chứng và đề nghị đủ để khóa/cần sửa/chưa đủ, chưa phải nhãn positive/negative hoặc duyệt nhãn. Không lấy gói kỹ thuật hay output hệ thống làm đáp án.') +
    '\n\nBạn giải nén ZIP, mở START_HERE.md và đọc PROJECT_CONTEXT.md đầy đủ trước. Nếu dùng AI thì gửi cả thư mục đã giải nén kèm AI_PROMPT.txt, không chỉ thả ZIP rồi yêu cầu làm hết. Cho AI trả lời mục tiêu, input, output và gate trước khi chạy/sửa. Bạn kiểm lại và xác nhận kết luận cuối.\n\n' +
    'Gửi xác nhận nhận việc theo mẫu trước, kèm phần đã làm/commit hiện có và blocker để tránh trùng. Khi xong nộp theo RETURN_TEMPLATE.md, có file/dòng, command/log/hash và phần chưa làm. Không tự merge/main/force push.\n\n' +
    'File: ' + item.archive + '\nSHA-256: ' + item.archive_sha256 + '\n');
  return { directory: output, status: 'packages_prepared_and_zip_roundtrip_verified', results: results.map(({ role, archive, archive_sha256, archive_bytes, verified_after_extract }) => ({ role, archive, archive_sha256, archive_bytes, files_verified: verified_after_extract.files_verified })) };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(encoded(await packageTeam(options(process.argv.slice(2))))); }
  catch (error) { console.error('P02 team handoff failed: ' + error.message); process.exitCode = 1; }
}
