// Temporary, explicitly synthetic saved runs. Never a provider/research receipt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import core from '../../demo/p01/reasoning-core.js';
import { syntheticComparison } from './comparison-fixture.mjs';
import { buildGeminiRequest } from './gemini-adapter.mjs';
import { readRun } from '../../scripts/package_p01_comparison.mjs';

const root = resolve('handoff-out/p01-reasoning');
async function savedFixture(key, action) {
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(resolve(root, 'SYNTHETIC-GUARD-TEST-'));
  try {
    const entry = (await syntheticComparison()).entries[key];
    const raw = { candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(entry.response) }] }, finishReason: 'STOP' }],
      modelVersion: 'gemini-3.8-flash', responseId: 'SYNTHETIC-NOT-A-RECEIPT', usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, thoughtsTokenCount: 1, totalTokenCount: 3 } };
    const run = { ...entry.run, generation_config: buildGeminiRequest(entry.request).generationConfig,
      usage: raw.usageMetadata, finish_reason: 'STOP' };
    const files = { 'request.json': entry.request, 'run.json': run, 'provider-request.json': buildGeminiRequest(entry.request),
      'provider-response.json': raw, 'code-provenance.json': { git_head: run.git_head, code_is_uncommitted: false, code_files_sha256: run.code_files_sha256 } };
    if (key === 'graph_vector') {
      files['response.json'] = entry.response;
      files['validated.json'] = await core.validateResponse(entry.response, entry.request);
    }
    const save = async () => {
      const manifest = [];
      for (const [name, object] of Object.entries(files)) {
        const text = JSON.stringify(object, null, 2) + '\n';
        await writeFile(resolve(directory, name), text);
        manifest.push(await core.hash(text) + '  ' + name);
      }
      await writeFile(resolve(directory, 'checksums.sha256'), manifest.join('\n') + '\n');
    };
    await save(); await action({ directory, files, save });
  } finally {
    assert.ok(relative(root, directory).startsWith('SYNTHETIC-GUARD-TEST-'));
    await rm(directory, { recursive: true, force: true }); // Only the exact mkdtemp test directory.
  }
}

test('saved accepted run reconstructs original provider payload, JSON, validation and token metadata', async () => {
  await savedFixture('graph_vector', async ({ directory }) => {
    const entry = await readRun(directory);
    assert.equal(Object.keys(entry.artifact_checksums).length, 7);
    assert.equal(entry.run.usage.total, 3);
    assert.equal(entry.response.summary.text, 'SYNTHETIC UI TEST ONLY; not a provider prediction.');
  });
});

test('saved rejected JSON remains raw-only and is never silently dropped or repaired', async () => {
  await savedFixture('vector', async ({ directory }) => {
    const entry = await readRun(directory);
    assert.equal(Object.keys(entry.artifact_checksums).length, 5);
    assert.equal(entry.run.status, 'failed_no_prediction');
    assert.deepEqual(entry.response.method_predictions[0].citations, []);
  });
});

test('changed bytes and unmanifested evidence are rejected', async () => {
  await savedFixture('graph_vector', async ({ directory, save }) => {
    await writeFile(resolve(directory, 'request.json'), '{}');
    await assert.rejects(readRun(directory), /Checksum mismatch/);
    await save(); await writeFile(resolve(directory, 'unmanifested.json'), '{}');
    await assert.rejects(readRun(directory), /Unmanifested evidence/);
  });
});

test('duplicate and path-traversal manifest entries are rejected', async () => {
  await savedFixture('graph_vector', async ({ directory, save }) => {
    const manifest = await readFile(resolve(directory, 'checksums.sha256'), 'utf8');
    await writeFile(resolve(directory, 'checksums.sha256'), manifest + manifest.split('\n')[0] + '\n');
    await assert.rejects(readRun(directory), /Unsafe\/duplicate/);
    await save(); await writeFile(resolve(directory, 'checksums.sha256'), 'a'.repeat(64) + '  ../request.json\n');
    await assert.rejects(readRun(directory), /Unsafe\/duplicate/);
  });
});

test('even rehashed provider payload or usage cannot differ from saved request and raw receipt', async () => {
  await savedFixture('graph_vector', async ({ directory, files, save }) => {
    files['provider-request.json'].contents[0].parts[0].text = 'changed'; await save();
    await assert.rejects(readRun(directory), /payload\/config differs/);
    files['provider-request.json'] = buildGeminiRequest(files['request.json']);
    files['run.json'].usage = { totalTokenCount: 999 }; await save();
    await assert.rejects(readRun(directory), /metadata differs/);
  });
});

test('a failed run cannot acquire a synthetic accepted response even with a new checksum', async () => {
  await savedFixture('vector', async ({ directory, files, save }) => {
    files['response.json'] = {}; await save();
    await assert.rejects(readRun(directory), /must not contain an accepted prediction/);
  });
});
