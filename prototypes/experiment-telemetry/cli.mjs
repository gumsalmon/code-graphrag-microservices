// Demo-only stdout. No network, credentials, file input/output, subprocess or model selection.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { telemetryDemo } from './fixtures.mjs';

export function main(args, write = value => process.stdout.write(`${value}\n`)) {
  if (args.length === 1 && args[0] === '--help') {
    write('node prototypes/experiment-telemetry/cli.mjs demo [retry|overlap|missing]\nSynthetic clocks/usage only; no project performance, model calls, pricing or scoring.'); return 0;
  }
  if (args.length < 1 || args.length > 2 || args[0] !== 'demo' || !['retry', 'overlap', 'missing'].includes(args[1] ?? 'retry')) {
    write(JSON.stringify({ synthetic_only: true, error_code: 'CLI_ARGUMENTS', applied_to_runtime: false, official_scoring_authorized: false })); return 2;
  }
  write(JSON.stringify(telemetryDemo(args[1] ?? 'retry'), null, 2));
  // 0 means the demo recorder worked, not that every synthetic attempt succeeded.
  return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
