import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseDryRunArguments, DRY_RUN_FILES, verifyDryRunManifest, verifyPairedDryRun } from '../../scripts/prepare_p02_paired_run.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url)), PRIVATE = resolve(ROOT, 'handoff-out/p02-paired-dry-run');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function fixture(callback) {
  await mkdir(PRIVATE, { recursive: true }); const directory = await mkdtemp(resolve(PRIVATE, 'synthetic-test-'));
  try {
    for (const name of DRY_RUN_FILES) { await mkdir(dirname(resolve(directory, name)), { recursive: true }); await writeFile(resolve(directory, name), 'Synthetic byte fixture, not a valid paired run.\n'); }
    const manifest = (await Promise.all(DRY_RUN_FILES.map(async name => hash(await readFile(resolve(directory, name))) + '  ' + name))).join('\n') + '\n';
    await writeFile(resolve(directory, 'checksums.sha256'), manifest); await callback(directory);
  } finally { await rm(directory, { recursive: true, force: true }); }
}
test('CLI accepts exactly dry-run/check and has no execution, host URL, force, retry or fake-confirmation switch', () => {
  assert.deepEqual(parseDryRunArguments(['dry-run', '--preparation', 'example']), { action: 'dry-run', directory: 'example' });
  assert.equal(parseDryRunArguments(['check', '--run', 'example']).action, 'check');
  for (const args of [[], ['run', '--preparation', 'x'], ['execute', '--run', 'x'], ['dry-run', '--base-url', 'http://localhost:8080'],
    ['dry-run', '--preparation', 'x', '--execute'], ['dry-run', '--preparation', 'x', '--force'], ['dry-run', '--preparation', 'x', '--confirmed', 'true'],
    ['dry-run', '--preparation', 'x', '--retry', '3']]) assert.throws(() => parseDryRunArguments(args), /Real execution is unavailable/);
});
test('byte verifier works offline but does not claim the synthetic byte fixture is semantically valid', async () => {
  await fixture(async directory => {
    const result = await verifyDryRunManifest(directory); assert.match(result.manifest_sha256, /^[a-f0-9]{64}$/);
    await assert.rejects(verifyPairedDryRun(directory), /JSON/);
  });
});
test('checker refuses arbitrary paths before reading inputs or credentials', async () => {
  await assert.rejects(verifyPairedDryRun('.'), /private P02 paired dry-run root/);
});
test('checksum verifier rejects byte edits, unmanifested labels and missing artifacts', async () => {
  for (const kind of ['bytes', 'extra', 'missing']) await fixture(async directory => {
    if (kind === 'missing') await rm(resolve(directory, 'plan.json'));
    else await writeFile(resolve(directory, kind === 'bytes' ? 'plan.json' : 'labels.json'), 'Synthetic altered input');
    await assert.rejects(verifyDryRunManifest(directory), /checksum mismatch|unmanifested/);
  });
});
test('duplicate/case-colliding/traversal/absolute/self-reference manifest paths are rejected', async () => {
  for (const name of ['plan.json', 'PLAN.JSON', '../outside', '/absolute', 'C:/key', 'input/../plan.json', 'checksums.sha256']) await fixture(async directory => {
    const file = resolve(directory, 'checksums.sha256'), text = await readFile(file, 'utf8');
    await writeFile(file, text + '0'.repeat(64) + '  ' + name + '\n');
    await assert.rejects(verifyDryRunManifest(directory), /Unsafe\/duplicate/);
  });
});
