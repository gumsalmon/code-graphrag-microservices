// Offline audit only. Writes a new evidence directory and new candidate package;
// never changes old artifacts, Git refs/index, application/DB/model or review decisions.
import { readFile, writeFile, readdir, lstat, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { sha256, jsonText } from './verify_p02_revision.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = (ok, message) => { if (!ok) throw new Error(message); };
const PROTECTED = ['benchmark/p02/preparation.v1', 'handoff-out/p02-preparation',
  'handoff-out/p02-team-handoff/20261015T111730650Z-5604cc22', 'handoff-out/p02-baseline',
  'benchmark/p01', 'src', 'prototypes', 'docs/contracts', 'docs/experiments'];
export async function snapshotProtected() {
  const result = [];
  for (const root of PROTECTED) {
    const rows = [];
    async function walk(path) {
      const st = await lstat(resolve(ROOT, path));
      if (st.isDirectory()) for (const name of (await readdir(resolve(ROOT, path))).sort()) await walk(path + '/' + name);
      else if (st.isFile()) rows.push(path + '  ' + sha256(await readFile(resolve(ROOT, path))));
      else throw new Error('Unsupported protected member: ' + path);
    }
    try { await walk(root); result.push({ root, files: rows.length, tree_sha256: sha256(rows.join('\n')) }); }
    catch (error) { if (error.code === 'ENOENT') result.push({ root, missing: true }); else throw error; }
  }
  return result;
}

export async function auditRevision(outputDirectory, sourceDirectory) {
  const output = resolve(outputDirectory);
  check(output.startsWith(resolve(ROOT, 'handoff-out/p02-input-revision-audit') + '\\') ||
    output.startsWith(resolve(ROOT, 'handoff-out/p02-input-revision-audit') + '/'), 'Use a dedicated revision-audit child directory');
  await mkdir(output, { recursive: true });
  const write = (name, data) => writeFile(resolve(output, name), typeof data === 'string' || Buffer.isBuffer(data) ? data : jsonText(data), { flag: 'wx' });
  const records = [];
  const run = async (id, args) => {
    const result = spawnSync(process.execPath, args, { cwd: ROOT, timeout: 60000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    const stdout = result.stdout ?? Buffer.alloc(0), stderr = result.stderr ?? Buffer.alloc(0);
    await write(id + '.stdout.log', stdout); await write(id + '.stderr.log', stderr);
    const record = { id, executable: process.execPath, args, cwd: ROOT, exit_code: result.status,
      signal: result.signal, error: result.error?.message ?? null, stdout_sha256: sha256(stdout), stderr_sha256: sha256(stderr) };
    records.push(record); await write(id + '.command.json', record);
    check(result.status === 0 && !result.error, 'Audit command failed; logs retained: ' + id);
    return stdout.toString('utf8');
  };
  const before = JSON.parse(await readFile(resolve(output, 'protected-before.json')));
  check(JSON.stringify(await snapshotProtected()) === JSON.stringify(before), 'Protected inputs already differ from the pre-edit snapshot');
  const tests = await run('regression-tests', ['--test', '--test-reporter=tap',
    'pipeline/p02/preparation.test.mjs', 'pipeline/p02/input-revision.test.mjs', 'pipeline/p02/runtime.test.mjs',
    'pipeline/p02/baseline-check.test.mjs', 'pipeline/p02/paired-plan.test.mjs', 'tasks/p02-handoff/handoff.test.mjs', 'pipeline/p01/closeout.test.mjs']);
  const preparation = JSON.parse(await run('prepare-v2', ['scripts/prepare_p02_inputs.mjs', 'prepare', '--source', sourceDirectory]));
  await run('check-v2', ['scripts/prepare_p02_inputs.mjs', 'check', '--run', preparation.directory]);
  await run('portable-check', [resolve(preparation.directory, 'verify_p02_revision.mjs')]);
  for (const id of ['20261015T094513750Z-601c985e', '20261015T095309937Z-d20ef94a'])
    await run('legacy-' + id, ['scripts/prepare_p02_inputs.mjs', 'check', '--run', 'handoff-out/p02-preparation/' + id]);
  for (const role of ['PHAT', 'HIEN']) await run('original-handoff-' + role.toLowerCase(), ['scripts/verify_p02_handoff.mjs', '--root',
    'handoff-out/p02-team-handoff/20261015T111730650Z-5604cc22/P02_' + role]);
  const after = await snapshotProtected(); await write('protected-after.json', after);
  check(JSON.stringify(after) === JSON.stringify(before), 'Protected data changed during audit');
  const result = { schema: 'p02-input-revision-audit/1', status: 'offline_checks_passed_pending_human_recheck',
    node: process.version, package: preparation, commands: records.length,
    tests: Number(/# tests (\d+)/.exec(tests)?.[1]), pass: Number(/# pass (\d+)/.exec(tests)?.[1]),
    fail: Number(/# fail (\d+)/.exec(tests)?.[1]), skipped: Number(/# skipped (\d+)/.exec(tests)?.[1]),
    protected_files_unchanged: after.reduce((sum, item) => sum + (item.files ?? 0), 0), protected_trees_unchanged: true,
    application_runtime_executed: false, model_calls: 0, independent_recheck_received: false,
    limitations: ['Initial unit failure retained separately: structuredClone converted Buffer to Uint8Array in the test snapshot; fixed test only',
      'Initial CLI invocation exposed a top-level-await import cycle; CLI was corrected before successful generation',
      'No labels, scope lock, runtime F03, production adapter change, commit, push or merge'] };
  check(result.tests > 0 && result.pass === result.tests && result.fail === 0 && result.skipped === 0, 'Incomplete regression suite');
  await write('result.json', result);
  const names = (await readdir(output)).filter(name => name !== 'SHA256SUMS.txt').sort();
  await write('SHA256SUMS.txt', (await Promise.all(names.map(async name => sha256(await readFile(resolve(output, name))) + '  ' + name))).join('\n') + '\n');
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    check(process.argv.length === 6 && process.argv[2] === '--out' && process.argv[4] === '--source', 'Usage: --out NEW_AUDIT_DIRECTORY --source CLEAN_PINNED_CLONE');
    console.log(jsonText(await auditRevision(process.argv[3], process.argv[5])));
  } catch (error) { console.error('P02 revision audit failed: ' + error.message); process.exitCode = 1; }
}
