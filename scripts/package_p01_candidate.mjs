// Local, explicit allowlist of proposed source files; never stages/commits/pushes.
import { readFile, writeFile, readdir, mkdir, lstat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import core from '../demo/p01/reasoning-core.js';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = ['build_p01_demo.mjs', 'check_p01_demo_browser.mjs', 'check_p01_retrieval_run.mjs', 'configure_gemini_key.ps1',
  'run_p01_reasoning.mjs', 'run_p01_retrieval.mjs', 'run_p01_pipeline.mjs', 'check_p01_pipeline.mjs', 'package_p01_candidate.mjs'];
const EXPORTED_ROOT_FILES = ['README.md', 'PROJECT_CONTEXT.md', '.gitignore', '.gitattributes'];
export async function candidateFiles() {
  const paths = [...EXPORTED_ROOT_FILES, ...SCRIPTS.map(name => 'scripts/' + name)];
  async function visit(prefix) {
    for (const entry of await readdir(resolve(ROOT, prefix), { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('No symlink source allowed');
      const path = prefix + '/' + entry.name;
      if (entry.isDirectory()) {
        if (entry.name === '__pycache__') continue;
        await visit(path);
      } else {
        if (!/\.(mjs|js|py|md|html|css|txt)$/.test(entry.name) && entry.name !== 'Dockerfile') throw new Error('Unexpected publication file: ' + path);
        paths.push(path);
      }
    }
  }
  for (const prefix of ['demo/p01', 'reasoning/p01', 'pipeline/p01']) await visit(prefix);
  for (const file of paths) if ((await lstat(resolve(ROOT, file))).isSymbolicLink()) throw new Error('No symlink source allowed');
  return paths.sort();
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('No options; output always a new private candidate directory');
    const files = await candidateFiles();
    const id = new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8);
    const directory = resolve(ROOT, 'handoff-out/p01-candidate', id);
    await mkdir(resolve(directory, 'files'), { recursive: true });
    const inventory = [];
    for (const path of files) {
      const bytes = await readFile(resolve(ROOT, path));
      await mkdir(dirname(resolve(directory, 'files', path)), { recursive: true });
      await writeFile(resolve(directory, 'files', path), bytes, { flag: 'wx' });
      inventory.push({ path, bytes: bytes.length, sha256: await core.hash(bytes) });
    }
    const head = execFileSync('git', ['-c', 'safe.directory=' + ROOT.replaceAll('\\', '/'), 'rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    const scope = { schema: 'p01-publication-candidate/1', base_head: head, status: 'local_candidate_not_a_commit_not_pushed',
      inventory, excluded: ['handoff-out', 'credentials', 'model cache', 'Chroma database', 'raw Gemini responses', 'reviewer packages', 'unrelated handoff scripts', 'literature work'],
      ground_truth_approval: false, official_scoring: false };
    await writeFile(resolve(directory, 'publication-scope.json'), JSON.stringify(scope, null, 2) + '\n', { flag: 'wx' });
    await writeFile(resolve(directory, 'checksums.sha256'), inventory.map(item => item.sha256 + '  files/' + item.path).join('\n') + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ directory, source_files: inventory.length, bytes: inventory.reduce((sum, item) => sum + item.bytes, 0), status: scope.status }, null, 2));
  } catch (error) { console.error('Candidate packaging failed: ' + error.message); process.exitCode = 1; }
}
