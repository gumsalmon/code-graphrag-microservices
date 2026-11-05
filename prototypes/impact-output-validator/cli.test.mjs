import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from './cli.mjs';
import { syntheticFixture } from './fixtures.mjs';

async function call(args) {
  const output = [], code = await main(args, item => output.push(item));
  return { code, output: output.join('\n') };
}
for (const [name, code, status] of [['mixed', 0, 'valid'], ['source-inferred', 0, 'valid'], ['invalid', 1, 'partial'], ['failure', 1, 'not_checked']])
  test(`CLI toy demo ${name} has explicit status and exit ${code}`, async () => {
    const result = await call(['demo', name]), report = JSON.parse(result.output);
    assert.equal(result.code, code); assert.equal(report.validation_status, status);
    assert.equal(report.applied_to_runtime, false); assert.equal(report.official_scoring_authorized, false);
  });
test('CLI rejects execution/retry/force/approval flags, missing/duplicate file options and unknown examples', async () => {
  for (const args of [[], ['execute'], ['demo', 'unknown'], ['demo', 'mixed', '--force'], ['demo', '--confirmed'],
    ['check', '--request', 'a', '--request', 'b'], ['check', '--attempt', 'a', '--force', 'b'], ['check', '--request', '--attempt', 'a', 'b']]) {
    const result = await call(args); assert.equal(result.code, 2); assert.equal(JSON.parse(result.output).issues[0].code, 'CLI_ARGUMENTS');
  }
});
test('CLI help is explicit about offline scope and separate authorization', async () => {
  const result = await call(['--help']); assert.equal(result.code, 0); assert.match(result.output, /not a runtime\/scorer integration/);
});
test('file mode checks JSON, preserves bytes, writes nothing, and catches duplicate keys before validation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'impact-validator-toy-'));
  const requestPath = join(directory, 'request.json'), attemptPath = join(directory, 'attempt.json');
  try {
    const data = syntheticFixture(), original = JSON.stringify(data.attempt);
    await writeFile(requestPath, JSON.stringify(data.request)); await writeFile(attemptPath, original);
    const result = await call(['check', '--attempt', attemptPath, '--request', requestPath]);
    assert.equal(result.code, 0); assert.equal(JSON.parse(result.output).validation_status, 'valid');
    assert.equal(await readFile(attemptPath, 'utf8'), original);
    assert.deepEqual((await readdir(directory)).sort(), ['attempt.json', 'request.json']);
    await writeFile(attemptPath, '{"payload":null,"payload":{}}');
    const duplicate = await call(['check', '--request', requestPath, '--attempt', attemptPath]);
    assert.equal(duplicate.code, 2); assert.equal(JSON.parse(duplicate.output).issues[0].code, 'DUPLICATE_JSON_KEY');
    await writeFile(attemptPath, 'SYNTHETIC_PRIVATE_TEXT_DO_NOT_ECHO');
    const invalid = await call(['check', '--request', requestPath, '--attempt', attemptPath]);
    assert.equal(invalid.code, 2); assert.ok(!invalid.output.includes('PRIVATE_TEXT_DO_NOT_ECHO'));
  } finally {
    // Only these two generated files in this exact mkdtemp directory are removed.
    for (const file of [requestPath, attemptPath]) await unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await rmdir(directory);
  }
});
test('unreadable inputs yield safe diagnostics, not stack traces or attempted model calls', async () => {
  const result = await call(['check', '--request', 'missing-synthetic-request.json', '--attempt', 'missing-synthetic-attempt.json']);
  assert.equal(result.code, 2); assert.equal(JSON.parse(result.output).issues[0].code, 'INPUT_READ_ERROR');
  assert.ok(!result.output.includes('ENOENT')); assert.ok(!result.output.includes('stack'));
});
