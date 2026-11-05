// Acceptance checks on explicit local dry-run artifacts. Keeps all deliberately damaged copies for diagnosis.
import { readFile, writeFile, mkdir, mkdtemp, copyFile, realpath } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { DRY_RUN_FILES, verifyPairedDryRun } from './prepare_p02_paired_run.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRIVATE = resolve(ROOT, 'handoff-out/p02-paired-dry-run');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (ok, message) => { if (!ok) throw new Error(message); };
async function manifest(directory) {
  await writeFile(resolve(directory, 'checksums.sha256'), (await Promise.all(DRY_RUN_FILES.map(async name =>
    hash(await readFile(resolve(directory, name))) + '  ' + name))).join('\n') + '\n');
}
export async function testPairedArtifacts(runDirectory) {
  const original = await verifyPairedDryRun(runDirectory);
  check(await realpath(PRIVATE) === PRIVATE, 'No junction QA output root');
  const directory = await mkdtemp(resolve(PRIVATE, 'acceptance-'));
  const definitions = [
    { id: 'enable_execution', file: 'plan.json', change: data => { data.state.real_execution_enabled = true; }, expected: /Derived dry-run artifact differs/ },
    { id: 'fake_http_success', file: 'simulation.json', change: data => { data.actual_http_requests = 40; }, expected: /Derived dry-run artifact differs/ },
    { id: 'fake_runtime_completion', file: 'summary.json', change: data => { data.runtime_matrix_completed = true; }, expected: /Derived dry-run artifact differs/ },
    { id: 'fake_human_confirmation', file: 'inputs.json', change: data => { data.independent_input_confirmation_received = true; }, expected: /Wrong input state/ },
    { id: 'hide_cleanup_failure', file: 'fault-simulations.json', change: data => { data.scenarios.at(-1).trace.groups[0].synthetic_errors = []; }, expected: /Derived dry-run artifact differs/ },
    { id: 'replace_frozen_fixture', file: 'input/fixture.json', change: data => { data.seed_visits[0].description = 'Synthetic altered fixture'; }, expected: /Copied pinned input\/code differs/ },
    { id: 'skip_final_post', file: 'plan.json', change: data => { data.groups[0].slots.at(-1).request.method = 'GET'; }, expected: /Derived dry-run artifact differs/ },
    { id: 'outside_preparation_root', file: 'inputs.json', change: data => { data.preparation_directory = ROOT; }, expected: /private P02 preparation root/ },
    { id: 'replace_code_snapshot', file: 'code/paired-plan.mjs', append: '\n// Synthetic tamper, not a valid implementation snapshot.\n', expected: /Copied pinned input\/code differs/ },
    { id: 'unmanifested_label', file: 'labels.json', extra: true, expected: /unmanifested/ },
    { id: 'bad_byte_checksum', file: 'plan.json', append: '\n', skip_rehash: true, expected: /checksum mismatch/ }
  ];
  const results = [];
  for (const definition of definitions) {
    const clone = resolve(directory, definition.id, basename(original.directory)); await mkdir(clone, { recursive: true });
    for (const name of [...DRY_RUN_FILES, 'checksums.sha256']) {
      await mkdir(dirname(resolve(clone, name)), { recursive: true }); await copyFile(resolve(original.directory, name), resolve(clone, name));
    }
    // Same run basename keeps lineage valid. Prove the untouched copy passes before each deliberate mutation.
    await verifyPairedDryRun(clone);
    const target = resolve(clone, definition.file);
    if (definition.extra) await writeFile(target, '{}\n', { flag: 'wx' });
    else if (definition.append !== undefined) await writeFile(target, Buffer.concat([await readFile(target), Buffer.from(definition.append)]));
    else { const value = JSON.parse(await readFile(target, 'utf8')); definition.change(value); await writeFile(target, JSON.stringify(value, null, 2) + '\n'); }
    if (!definition.skip_rehash && !definition.extra) await manifest(clone);
    let rejected = null;
    try { await verifyPairedDryRun(clone); } catch (error) { rejected = error.message; }
    check(rejected && definition.expected.test(rejected), 'Expected rejection did not occur: ' + definition.id);
    results.push({ id: definition.id, baseline_clone_verified_before_tamper: true, checksum_recomputed: !definition.skip_rehash && !definition.extra,
      expected_rejection: rejected, mutated_copy_retained: clone });
  }
  const after = await verifyPairedDryRun(original.directory);
  check(after.manifest_sha256 === original.manifest_sha256, 'Original dry-run changed during negative acceptance checks');
  const report = { schema: 'p02-paired-dry-acceptance/1', status: 'all_deliberate_tampers_rejected', original_run: original.directory,
    original_manifest_sha256: original.manifest_sha256, original_unchanged_and_valid: true, cases: results.length, results,
    actual_http_requests: 0, actual_application_starts: 0, actual_cleanup_operations: 0, actual_post_requests: 0, model_calls: 0,
    new_labels: 0, runtime_matrix_completed: false, output_directory: directory };
  await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); return report;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    check(process.argv.length === 4 && process.argv[2] === '--run', 'Usage: --run PRIVATE_P02_PAIRED_DRY_RUN');
    console.log(JSON.stringify(await testPairedArtifacts(process.argv[3]), null, 2));
  } catch (error) { console.error('P02 paired dry-run acceptance failed: ' + error.message); process.exitCode = 1; }
}
