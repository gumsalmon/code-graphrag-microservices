// Portable integrity verifier, not an authenticator or research approval.
// Never edits/rebases evidence. Archive/content-secret scanning is a separate
// packaging check. --smoke executes only the fixed local Node checks below;
// it is not a sandbox for a package received from an untrusted sender.
import { createReadStream } from 'node:fs';
import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import { resolve, dirname, sep, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const MANIFEST = 'SHA256SUMS.txt';
const METADATA = 'META/transfer.json';
const check = (ok, message) => { if (!ok) throw new Error(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sha = value => createHash('sha256').update(value).digest('hex');
const shaPattern = /^[a-f0-9]{64}$/;

export function safeTransferPath(name, { prefix = false } = {}) {
  if (typeof name !== 'string' || !name || /[\\:\x00-\x1f\x7f]/u.test(name) || name.startsWith('/')) return false;
  const value = prefix && name.endsWith('/') ? name.slice(0, -1) : name;
  return value.length > 0 && value.split('/').every(part => part && part !== '.' && part !== '..' &&
    !/[. ]$/u.test(part) && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(part));
}

export function sensitiveTransferPath(name) {
  const parts = name.toLowerCase().split('/');
  if (parts.some(part => ['.git', '.ssh', '.aws', '.azure', '.kube', '.gnupg', 'credentials', 'secrets'].includes(part))) return true;
  const base = parts.at(-1);
  return base.startsWith('.env') || /\.(?:clixml|dpapi|pem|key|pfx|p12|jks|keystore)$/u.test(base) ||
    /^(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)(?:\.|$)/u.test(base) ||
    /^(?:provider-response\.json|credentials\.json|application_default_credentials\.json|private[-_]key(?:\..*)?)$/u.test(base);
}

export const isHistoricalManifestPath = name => name !== MANIFEST &&
  (/^(?:sha256sums\.txt|archives\.sha256)$/iu.test(posix.basename(name)) || /checksums\.sha256$/iu.test(posix.basename(name)));

function parseManifest(bytes, label) {
  const lines = bytes.toString('utf8').split(/\r?\n/);
  // Historical PowerShell-generated manifests can end with multiple newlines.
  // Preserve their bytes; tolerate only trailing empty lines, not interior ones.
  while (lines.at(-1) === '') lines.pop();
  const entries = new Map(), folded = new Set();
  for (const line of lines) {
    const match = /^([a-f0-9]{64})  (.+)$/u.exec(line);
    check(match && safeTransferPath(match[2]) && !folded.has(match[2].toLowerCase()), 'Unsafe/duplicate/malformed manifest entry: ' + label);
    folded.add(match[2].toLowerCase()); entries.set(match[2], match[1]);
  }
  return entries;
}

async function digestFile(file) {
  const digest = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(file)) { digest.update(chunk); bytes += chunk.length; }
  return { sha256: digest.digest('hex'), bytes };
}

export const READ_ONLY_SMOKE_CHECKS = Object.freeze([
  { id: 'p02-input-revision', script: 'scripts/verify_p02_revision.mjs', option: '--root',
    path: 'handoff-out/p02-input-revision/20261018T065307839Z-719da955' },
  { id: 'p01-fresh-pipeline', script: 'scripts/check_p01_pipeline.mjs', option: '--run',
    path: 'handoff-out/p01-pipeline/20261015T082522708Z-0539ac7d' },
  { id: 'p01-retrieval', script: 'scripts/check_p01_retrieval_run.mjs', option: '--run',
    path: 'handoff-out/p01-retrieval/20261012T151104176Z-89ba55ec' },
  ...['PHAT', 'HIEN'].map(role => ({ id: 'p02-original-' + role.toLowerCase(), script: 'scripts/verify_p02_handoff.mjs', option: '--root',
    path: 'handoff-out/p02-team-handoff/20261015T111730650Z-5604cc22/P02_' + role }))
]);

function smokeChecks(root, actual, omissions) {
  // Do not inherit NODE_OPTIONS, provider credentials, credential-file paths,
  // or other task-specific environment settings into the child processes.
  const env = { NODE_DISABLE_COLORS: '1' };
  for (const key of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'LANG']) if (process.env[key]) env[key] = process.env[key];
  return READ_ONLY_SMOKE_CHECKS.map(item => {
    const omitted = omissions.filter(value => value.path.startsWith(item.path + '/'));
    if (omitted.length) return { id: item.id, status: 'skipped', path: item.path,
      reason: 'Original checker requires intentionally omitted artifacts; retained historical manifest is checked separately',
      omitted_paths: omitted.map(value => value.path) };
    if (![...actual.keys()].some(name => name.startsWith(item.path + '/'))) return {
      id: item.id, status: 'skipped', reason: 'Canonical evidence directory is absent from this profile', path: item.path
    };
    check(actual.has(item.script), 'Smoke checker missing: ' + item.script);
    const args = [item.script, item.option, item.path];
    const result = spawnSync(process.execPath, args, { cwd: root, env, windowsHide: true, timeout: 60000,
      encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    check(result.status === 0 && !result.error, 'Read-only smoke failed: ' + item.id + '; ' + (result.error?.message ?? result.stderr).slice(0, 2000));
    let report;
    try { report = JSON.parse(result.stdout); } catch { throw new Error('Smoke returned invalid JSON: ' + item.id); }
    check(report && typeof report === 'object' && !Array.isArray(report), 'Smoke returned no report: ' + item.id);
    return { id: item.id, status: 'passed', command: [process.execPath, ...args], exit_code: result.status, report };
  });
}

export async function verifyProjectTransfer(rootDirectory, { smoke = false } = {}) {
  check(typeof smoke === 'boolean', 'smoke must be Boolean');
  const requested = resolve(rootDirectory);
  check(!(await lstat(requested)).isSymbolicLink(), 'Symlink package root is not allowed');
  const root = await realpath(requested), actual = new Map(), names = new Set();
  async function visit(prefix = '') {
    for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
      const name = prefix + entry.name;
      check(safeTransferPath(name) && !names.has(name.toLowerCase()), 'Unsafe/case-colliding package path: ' + name);
      names.add(name.toLowerCase());
      check(!sensitiveTransferPath(name), 'Sensitive path is forbidden: ' + name);
      const file = resolve(root, name), stat = await lstat(file);
      check(!stat.isSymbolicLink() && (await realpath(file)).startsWith(root + sep), 'Symlink/escaped package member: ' + name);
      if (stat.isDirectory()) await visit(name + '/');
      else { check(stat.isFile(), 'Nonregular package member: ' + name); actual.set(name, { file, bytes: stat.size }); }
    }
  }
  await visit();
  check(actual.has(MANIFEST) && actual.has(METADATA), 'Missing root manifest or transfer metadata');
  const manifestBytes = await readFile(resolve(root, MANIFEST));
  const manifest = parseManifest(manifestBytes, MANIFEST);
  check(!manifest.has(MANIFEST) && same([...manifest.keys()].sort(), [...actual.keys()].filter(name => name !== MANIFEST).sort()), 'Root manifest has missing/unlisted/self-referenced files');
  let totalBytes = 0;
  for (const [name, info] of actual) {
    const digest = await digestFile(info.file); Object.assign(info, digest); totalBytes += digest.bytes;
    if (name !== MANIFEST) check(digest.sha256 === manifest.get(name), 'Checksum mismatch: ' + name);
  }
  check(actual.get(METADATA).bytes <= 128 * 1024 * 1024, 'Transfer metadata is unexpectedly large');
  const metadata = JSON.parse(await readFile(resolve(root, METADATA), 'utf8'));
  check(metadata.schema === 'code-graphrag-project-transfer/1' && ['full', 'ai-starter'].includes(metadata.profile) &&
    metadata.status === 'snapshot_not_research_approval', 'Invalid transfer metadata schema/profile/status');
  for (const flag of ['git_directory_included', 'api_credentials_included', 'research_approval', 'official_scoring_authorized'])
    check(metadata[flag] === false, 'Transfer cannot authorize or include: ' + flag);
  check(/^[a-f0-9]{40}$/u.test(metadata.source_head) && typeof metadata.source_branch === 'string' && metadata.source_branch.length > 0,
    'Missing source HEAD/branch provenance');
  check(Array.isArray(metadata.files) && Array.isArray(metadata.omissions) && Array.isArray(metadata.historical_manifests), 'Missing file/omission/history inventory');
  const declared = new Set();
  for (const item of metadata.files) {
    check(item && safeTransferPath(item.path) && !declared.has(item.path.toLowerCase()) && item.path !== MANIFEST && item.path !== METADATA &&
      shaPattern.test(item.sha256) && Number.isSafeInteger(item.bytes) && item.bytes >= 0, 'Invalid transfer file entry');
    declared.add(item.path.toLowerCase());
    const info = actual.get(item.path);
    check(info && info.sha256 === item.sha256 && info.bytes === item.bytes, 'File inventory differs: ' + item.path);
  }
  check(same(metadata.files.map(item => item.path).sort(), [...actual.keys()].filter(name => ![MANIFEST, METADATA].includes(name)).sort()),
    'Transfer file inventory has missing/unlisted files');
  const omittedNames = new Set();
  for (const item of metadata.omissions) {
    check(item && safeTransferPath(item.path, { prefix: true }) && !omittedNames.has(item.path.toLowerCase()) &&
      typeof item.reason === 'string' && item.reason.trim().length > 0 && (item.sha256 === undefined || shaPattern.test(item.sha256)), 'Invalid/duplicate omission entry');
    omittedNames.add(item.path.toLowerCase());
  }
  const omissionFor = name => metadata.omissions.find(item => item.path === name || item.path.endsWith('/') && name.startsWith(item.path));
  const history = new Map();
  for (const item of metadata.historical_manifests) {
    check(item && safeTransferPath(item.path) && isHistoricalManifestPath(item.path) && !history.has(item.path) && actual.has(item.path) &&
      Number.isSafeInteger(item.verified) && item.verified >= 0 && Number.isSafeInteger(item.omitted) && item.omitted >= 0, 'Invalid historical manifest declaration');
    check(item.base_directory === undefined || item.base_directory === '.' || safeTransferPath(item.base_directory), 'Unsafe historical manifest base');
    history.set(item.path, item);
  }
  const discovered = [...actual.keys()].filter(isHistoricalManifestPath).sort();
  check(same([...history.keys()].sort(), discovered), 'Historical manifest inventory has missing/unlisted manifests');
  let historicalVerified = 0, historicalMissing = 0;
  const historyReports = [];
  for (const name of discovered) {
    const entries = parseManifest(await readFile(resolve(root, name)), name);
    let verified = 0, omitted = 0;
    const base = history.get(name).base_directory ?? posix.dirname(name);
    for (const [member, expected] of entries) {
      const target = base === '.' ? member : base + '/' + member;
      check(safeTransferPath(target), 'Historical manifest escapes root: ' + name);
      if (actual.has(target)) {
        check(actual.get(target).sha256 === expected, 'Historical checksum mismatch: ' + target); verified++;
      } else {
        const omission = omissionFor(target);
        check(omission && (omission.path !== target || omission.sha256 === undefined || omission.sha256 === expected), 'Historical file missing without matching explicit omission: ' + target);
        if (omission.original_references !== undefined) check(Array.isArray(omission.original_references) &&
          omission.original_references.some(ref => ref && ref.manifest === name && ref.sha256 === expected),
          'Copied historical origin/hash is not declared: ' + target);
        omitted++;
      }
    }
    check(history.get(name).verified === verified && history.get(name).omitted === omitted, 'Historical manifest counts differ: ' + name);
    historicalVerified += verified; historicalMissing += omitted;
    historyReports.push({ path: name, base_directory: base, verified, omitted, original_bytes_preserved: true });
  }
  const smokeReports = smoke ? smokeChecks(root, actual, metadata.omissions) : [];
  return { schema: 'code-graphrag-transfer-verification/1', root, profile: metadata.profile,
    status: 'snapshot_integrity_verified_not_research_approval', files_verified: manifest.size, total_regular_files: actual.size,
    total_bytes: totalBytes, root_manifest_sha256: sha(manifestBytes), historical_manifests: historyReports,
    historical_files_verified: historicalVerified, historical_missing_count: historicalMissing,
    smoke_requested: smoke, smoke_checks: smokeReports, remote_calls: 0,
    credentials_loaded: false, git_operations_performed: false, docker_operations_performed: false,
    original_evidence_rewritten: false, independent_review_completed: false, ground_truth_accepted: false,
    input_locked: false, final_test_locked: false, official_scoring_authorized: false,
    limitations: ['Package-provided hashes detect transfer corruption, not independently authenticated origin',
      'Sensitive-path guard is not a content or nested-archive secret scan',
      'Historical omissions are explicit missing artifacts, not successful full-run verification',
      'No absolute provenance paths are rewritten; old contract/baseline/closeout checks are not run'] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2); let root, smoke = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--root' && root === undefined && args[i + 1] && !args[i + 1].startsWith('--')) root = args[++i];
      else if (args[i] === '--smoke' && !smoke) smoke = true;
      else throw new Error('Usage: node verify_project_transfer.mjs --root DIRECTORY [--smoke]');
    }
    check(root !== undefined, 'Usage: node verify_project_transfer.mjs --root DIRECTORY [--smoke]');
    console.log(JSON.stringify(await verifyProjectTransfer(root, { smoke }), null, 2));
  } catch (error) { console.error('Project transfer verification failed: ' + error.message); process.exitCode = 1; }
}
