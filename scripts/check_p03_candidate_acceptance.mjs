// Real proposal round-trip and tamper checks; no app execution or annotation.
import { cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { verifyP03Candidate } from './prepare_p03_inputs.mjs';
import { sha256, jsonText, OWNER_RESOURCE } from '../pipeline/p03/preparation.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ensure = (ok, message) => { if (!ok) throw new Error(message); };
async function files(root, prefix = '') {
  const result = [];
  for (const row of await readdir(resolve(root, prefix), { withFileTypes: true })) {
    if (row.isSymbolicLink()) throw new Error('Symlink is not an acceptance fixture');
    const name = prefix + row.name;
    if (row.isDirectory()) result.push(...await files(root, name + '/')); else if (name !== 'SHA256SUMS.txt') result.push(name);
  }
  return result.sort();
}
async function remanifest(root) {
  const rows = await Promise.all((await files(root)).map(async path => sha256(await readFile(resolve(root, path))) + '  ' + path));
  await writeFile(resolve(root, 'SHA256SUMS.txt'), rows.join('\n') + '\n');
}
export async function checkAcceptance(candidateDirectory) {
  const before = await verifyP03Candidate(candidateDirectory);
  const audit = resolve(ROOT, 'handoff-out/p03-preparation-audit', new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8));
  await mkdir(audit, { recursive: true }); const cases = [];
  const copy = async name => { const target = resolve(audit, name); await cp(before.directory, target, { recursive: true, errorOnExist: true, force: false }); return target; };
  const relocated = await copy('relocated');
  const command = [resolve(relocated, 'tooling/scripts/prepare_p03_inputs.mjs'), 'check', '--run', relocated];
  const result = spawnSync(process.execPath, command, { cwd: relocated, windowsHide: true, encoding: 'utf8', timeout: 30000 });
  await writeFile(resolve(audit, 'relocated.stdout.log'), result.stdout ?? ''); await writeFile(resolve(audit, 'relocated.stderr.log'), result.stderr ?? '');
  ensure(result.status === 0 && JSON.parse(result.stdout).input_locked === false, 'Portable packaged verifier failed');
  cases.push({ name: 'relocated_packaged_verifier', pass: true, command: [process.execPath, ...command], exit_code: result.status });
  const reject = async (name, edit, refreshManifest, expected) => {
    const directory = await copy(name); await edit(directory); if (refreshManifest) await remanifest(directory);
    let rejected = false, message = null;
    try { await verifyP03Candidate(directory); } catch (error) { message = error.message; rejected = expected.test(message); }
    ensure(rejected, 'Tamper accepted or wrong failure: ' + name + ': ' + message); cases.push({ name, pass: true, rejection: message });
  };
  await reject('source_byte_tamper', async root => {
    const path = resolve(root, 'input/app', OWNER_RESOURCE); await writeFile(path, await readFile(path, 'utf8') + '// tampered\n');
  }, false, /Checksum mismatch/);
  await reject('forged_input_lock_rehashed', async root => {
    const path = resolve(root, 'spec/scenario.candidate.v0.1.0.json'), value = JSON.parse(await readFile(path, 'utf8')); value.input_locked = true;
    await writeFile(path, jsonText(value));
  }, true, /Derived candidate differs/);
  await reject('reserialized_fixture_hash_rehashed', async root => {
    const fixture = JSON.parse(await readFile(resolve(root, 'spec/fixture.candidate.v1.json'), 'utf8'));
    const path = resolve(root, 'draft/evaluation_universe.draft.v1.json'), value = JSON.parse(await readFile(path, 'utf8'));
    value.fixture_sha256 = sha256(JSON.stringify(fixture)); await writeFile(path, jsonText(value));
  }, true, /Derived candidate differs/);
  await reject('unlisted_file', async root => { await writeFile(resolve(root, 'unexpected.json'), '{}\n'); }, false, /Unmanifested or missing/);
  const after = await verifyP03Candidate(before.directory);
  ensure(before.manifest_sha256 === after.manifest_sha256, 'Original proposal changed during acceptance checks');
  const report = { status: 'passed', audit_directory: audit, candidate_directory: before.directory, manifest_sha256: before.manifest_sha256,
    acceptance_checks: cases.length, cases, original_candidate_unchanged: true, runtime_executed: false, labels_created: false };
  await writeFile(resolve(audit, 'ACCEPTANCE.json'), jsonText(report), { flag: 'wx' }); return report;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { ensure(process.argv.length === 4 && process.argv[2] === '--run', 'Usage: --run P03_CANDIDATE'); console.log(jsonText(await checkAcceptance(process.argv[3]))); }
  catch (error) { console.error('P03 acceptance failed: ' + error.message); process.exitCode = 1; }
}
