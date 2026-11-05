// Read-only CLI. No subprocess, network, Docker, provider, scorer, or filesystem writes.
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validateSyntheticAttempt, parseSyntheticJson, SyntheticJsonError, VALIDATOR_ID, CONTRACT_ID } from './validator.mjs';
import { syntheticFixture } from './fixtures.mjs';

const help = `Synthetic-only draft validator (not a runtime/scorer integration)
  node prototypes/impact-output-validator/cli.mjs demo [mixed|invalid|failure|source-inferred]
  node prototypes/impact-output-validator/cli.mjs check --request FILE.json --attempt FILE.json
Exit: 0=completed/valid toy; 1=partial/invalid/failed/not-run toy; 2=input/CLI error.
Reports go to stdout; no files are written. No semantic, label or scoring approval is granted.`;

async function readJson(path) {
  if ((await stat(path)).size > 1_048_576) throw new SyntheticJsonError('JSON_SIZE', '', 'Input exceeds 1 MiB.');
  return parseSyntheticJson(await readFile(path, 'utf8'));
}

export async function main(args, write = value => process.stdout.write(`${value}\n`)) {
  try {
    if (args.length === 1 && ['--help', '-h'].includes(args[0])) { write(help); return 0; }
    let data;
    if (args[0] === 'demo' && args.length <= 2 && ['mixed', 'invalid', 'failure', 'source-inferred'].includes(args[1] ?? 'mixed'))
      data = syntheticFixture(args[1] ?? 'mixed');
    else if (args[0] === 'check' && args.length === 5) {
      const options = new Map();
      for (let index = 1; index < args.length; index += 2) {
        if (!['--request', '--attempt'].includes(args[index]) || options.has(args[index]) || !args[index + 1] || args[index + 1].startsWith('--'))
          throw new SyntheticJsonError('CLI_ARGUMENTS', '', 'Use exactly one --request and one --attempt file.');
        options.set(args[index], args[index + 1]);
      }
      data = { request: await readJson(options.get('--request')), attempt: await readJson(options.get('--attempt')) };
    } else throw new SyntheticJsonError('CLI_ARGUMENTS', '', help);
    const report = validateSyntheticAttempt(data.request, data.attempt);
    write(JSON.stringify(report, null, 2));
    return report.input_status !== 'valid' ? 2 : report.validation_status === 'valid' && report.execution_status === 'completed' ? 0 : 1;
  } catch (error) {
    write(JSON.stringify({ validator_id: VALIDATOR_ID, contract_id: CONTRACT_ID, synthetic_only: true,
      applied_to_runtime: false, production_ready: false, validation_status: 'not_checked',
      semantic_correctness_verified: false, ground_truth_accepted: false, official_scoring_authorized: false,
      issues: [{ code: error instanceof SyntheticJsonError ? error.code : 'INPUT_READ_ERROR',
        path: error instanceof SyntheticJsonError ? error.path : '',
        message: error instanceof SyntheticJsonError ? error.message : 'Cannot read JSON input; file contents and credentials are not echoed.' }] }, null, 2));
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
