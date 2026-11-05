// Portable recipient-side verifier; copied unchanged as verify_package.mjs. No Git, Docker, keys or network.
import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const check = (ok, message) => { if (!ok) throw new Error(message); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function safeMember(name) {
  return typeof name === 'string' && /^[A-Za-z0-9_.@/-]+$/.test(name) && !name.startsWith('/') && !name.split('/').some(part => !part || part === '.' || part === '..');
}
export function phatRawBaseline(name) {
  if (/^observations\/[^/]+\.(body|json)$/.test(name)) return name !== 'observations/observations.json';
  if (/^ready-[a-z-]+\/readiness-\d+\.(body|json)$/.test(name) || /^logs\/[a-z-]+\.log$/.test(name) || name.startsWith('config/')) return true;
  return ['inputs.json', 'cleanup.json'].includes(name) || /^[a-z-]+\.(command|exit)\.json$/.test(name) || /^[a-z-]+\.stderr\.log$/.test(name) ||
    /^(start-[a-z-]+|network-create|config-extract)\.stdout\.log$/.test(name);
}
export function permittedForPhat(name) {
  const exact = ['START_HERE.md', 'AI_PROMPT.txt', 'RETURN_TEMPLATE.md', 'ACKNOWLEDGEMENT_TEMPLATE.md', 'SOURCE_NOTES_TEMPLATE.md',
    'PROJECT_CONTEXT.md', 'PACKAGE_CONTENTS.md', 'PORTABLE_PATHS.md', 'INPUT_PROVENANCE.json', 'PACKAGE_INDEX.json', 'VERIFY_PACKAGE.ps1', 'verify_package.mjs',
    'tasks/P02_P04_TASK_PACKETS.md', 'tasks/P02_P04_EXECUTION_PLAN.md', 'tasks/P02_P04_RESEARCH_REGISTER.json',
    'benchmark/p02/README.md', 'pipeline/p02/README.md', 'benchmark/protocol/benchmark_protocol_v0.2.md',
    'benchmark/p02/preparation.v1/scenario.json', 'benchmark/p02/preparation.v1/fixture.json', 'benchmark/p02/preparation.v1/scope.json', 'benchmark/p02/preparation.v1/optional-query.patch',
    'draft/inventory.v1.json', 'draft/evaluation_universe.draft.v1.json', 'draft/request-plan.v1.json',
    'provenance/build.json', 'provenance/build-original-checksums.sha256', 'provenance/baseline-original-checksums.sha256',
    'provenance/maven-build.command.json', 'provenance/maven-build.exit.json', 'provenance/maven-build.stdout.log', 'provenance/maven-build.stderr.log'];
  if (exact.includes(name)) return true;
  if (name.startsWith('input/app/') || name.startsWith('input/config/')) return !/(^|\/)\.git(\/|$)|(^|\/)target(\/|$)/.test(name);
  return name.startsWith('evidence/baseline/') && phatRawBaseline(name.slice('evidence/baseline/'.length));
}
export async function verifyPackage(rootDirectory) {
  const root = await realpath(resolve(rootDirectory));
  const entries = new Map(), folded = new Set();
  for (const line of (await readFile(resolve(root, 'SHA256SUMS.txt'), 'utf8')).trim().split(/\r?\n/)) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    check(match && safeMember(match[2]) && match[2] !== 'SHA256SUMS.txt' && !folded.has(match[2].toLowerCase()), 'Unsafe/duplicate manifest member');
    folded.add(match[2].toLowerCase()); entries.set(match[2], match[1]);
  }
  const actual = [];
  async function visit(prefix = '') { for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
    check(!entry.isSymbolicLink(), 'Symlink/reparse-point evidence not allowed'); const name = prefix + entry.name;
    if (entry.isDirectory()) await visit(name + '/'); else if (name !== 'SHA256SUMS.txt') actual.push(name);
  } } await visit();
  check(JSON.stringify(actual.sort()) === JSON.stringify([...entries.keys()].sort()), 'Missing or unmanifested files');
  for (const [name, expected] of entries) {
    const file = resolve(root, name), real = await realpath(file);
    check(real.startsWith(root + sep) && !(await lstat(file)).isSymbolicLink() && hash(await readFile(file)) === expected, 'File differs: ' + name);
  }
  const metadata = JSON.parse(await readFile(resolve(root, 'PACKAGE_INDEX.json'), 'utf8'));
  check(metadata.schema === 'p02-team-handoff/1' && ['HIEN', 'PHAT'].includes(metadata.role) && metadata.official_scoring_authorized === false &&
    metadata.human_acknowledgement_received === false && metadata.independent_universe_confirmation_received === false && metadata.contains_accepted_labels === false &&
    metadata.contains_model_predictions === false, 'Invalid handoff state');
  if (metadata.role === 'PHAT') check([...entries.keys()].every(permittedForPhat), 'Phat package includes material outside source-first evidence allowlist');
  return { role: metadata.role, files_verified: entries.size, manifest_sha256: hash(await readFile(resolve(root, 'SHA256SUMS.txt'))),
    status: 'bytes_verified_not_a_research_approval', network_calls: 0 };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    check(process.argv.length === 2 || process.argv.length === 4 && process.argv[2] === '--root', 'Usage: node verify_package.mjs [--root DIRECTORY]');
    console.log(JSON.stringify(await verifyPackage(process.argv[3] ?? dirname(fileURLToPath(import.meta.url))), null, 2));
  } catch (error) { console.error('Package verification failed: ' + error.message); process.exitCode = 1; }
}
