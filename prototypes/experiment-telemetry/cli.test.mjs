import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { main } from './cli.mjs';

for (const name of ['retry', 'overlap', 'missing']) test(`CLI ${name} produces explicitly synthetic, unapproved telemetry with zero actual remote calls`, () => {
  const output = [], exit = main(['demo', name], value => output.push(value)), result = JSON.parse(output[0]);
  assert.equal(exit, 0); assert.equal(result.synthetic_only, true); assert.equal(result.actual_remote_calls, 0);
  assert.equal(result.official_scoring_authorized, false); assert.equal(result.applied_to_runtime, false);
  assert.equal(result.impact_metrics, null);
});
test('CLI help and default demo do not request keys, credentials, setup or external services', () => {
  const help = [], result = []; assert.equal(main(['--help'], value => help.push(value)), 0);
  assert.match(help[0], /Synthetic clocks\/usage only/); assert.equal(main(['demo'], value => result.push(value)), 0);
  assert.equal(JSON.parse(result[0]).attempts.length, 2);
});
test('CLI refuses run/execute/check/force/model/approval flags rather than opening new gates', () => {
  for (const args of [[], ['execute'], ['run'], ['check', 'private.json'], ['demo', 'unknown'], ['demo', 'retry', '--force'], ['demo', '--model'], ['demo', '--approved']]) {
    const output = []; assert.equal(main(args, value => output.push(value)), 2);
    assert.equal(JSON.parse(output[0]).error_code, 'CLI_ARGUMENTS');
  }
});
test('CLI has no environment, filesystem-content, network, subprocess or write access implementation', async () => {
  const source = await readFile(new URL('./cli.mjs', import.meta.url), 'utf8');
  assert.ok(!/process\.env|readFile|writeFile|fetch\s*\(|child_process|exec\s*\(/.test(source));
});
