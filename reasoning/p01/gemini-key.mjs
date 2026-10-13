import { access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CREDENTIAL_FILE = resolve(REPO, 'handoff-out/credentials/gemini-api-key.clixml');

function checkedKey(key) {
  // Do not echo input or assume a vendor-specific prefix. Reject characters that
  // cannot safely represent this credential in an HTTP header, including masks.
  if (typeof key !== 'string' || !key || key.length > 4096 || !/^[\x21-\x7e]+$/.test(key) || /^\*+$/.test(key)) {
    throw new Error('Gemini key contains invalid characters or a masked preview; copy the actual key from AI Studio and configure it again');
  }
  return key;
}

export async function loadGeminiKey({ env = process.env, platform = process.platform, credentialFile = CREDENTIAL_FILE, readCredential } = {}) {
  if (env.GEMINI_API_KEY?.trim() && env.GOOGLE_API_KEY?.trim() && env.GEMINI_API_KEY.trim() !== env.GOOGLE_API_KEY.trim()) {
    throw new Error('GEMINI_API_KEY and GOOGLE_API_KEY differ; choose one credential explicitly');
  }
  for (const name of ['GEMINI_API_KEY', 'GOOGLE_API_KEY']) {
    if (typeof env[name] === 'string' && env[name].trim()) return { key: checkedKey(env[name].trim()), source: 'environment:' + name };
  }
  try { await access(credentialFile); } catch { return { key: null, source: 'not_configured' }; }
  if (platform !== 'win32') throw new Error('Windows-encrypted Gemini credential needs the same Windows user; use an environment key on other platforms');
  let key;
  try {
    key = readCredential ? await readCredential(credentialFile) : execFileSync('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', resolve(REPO, 'scripts/configure_gemini_key.ps1'), '-ReadForRunner'],
      { cwd: REPO, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 }).trim();
  } catch { throw new Error('Cannot load the local Gemini key safely; configure it under the Windows user that runs the CLI'); }
  return { key: checkedKey(key), source: 'windows_dpapi_local_file' };
}
