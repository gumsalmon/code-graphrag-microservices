import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import core from '../../demo/p01/reasoning-core.js';
import comparison from '../../demo/p01/comparison-core.js';
import { parseDataAsset } from '../../scripts/run_p01_reasoning.mjs';
import { readRun } from '../../scripts/package_p01_comparison.mjs';
import { syntheticComparison } from './comparison-fixture.mjs';

const reseal = ({ bundle_sha256, ...body }) => comparison.seal(body);

test('comparison retains rejected abstention and valid empty prediction without scores or provider authentication', async () => {
  const fixture = await syntheticComparison(); const inspection = await comparison.inspectPair(fixture);
  assert.equal(inspection.outcomes.vector.accepted, false);
  assert.equal(inspection.outcomes.vector.diagnostic, 'Citations required: method_prediction');
  assert.equal(inspection.outcomes.vector.validated, null);
  assert.equal(inspection.outcomes.graph_vector.accepted, true);
  assert.equal(inspection.outcomes.graph_vector.validated.method_predictions.length, 0);
  assert.equal(inspection.both_structurally_valid, false);
  assert.equal(inspection.quality_comparison_ready, false);
  assert.equal(inspection.provider_identity_verified, false);
  assert.equal(inspection.scoring_enabled, false);
});

test('checksum changes and extra approval fields are rejected', async () => {
  const fixture = await syntheticComparison(); fixture.entries.vector.run.usage.total++;
  await assert.rejects(comparison.inspectPair(fixture), /checksum/);
  const extra = await syntheticComparison(); extra.approved = true;
  await assert.rejects(comparison.inspectPair(extra), /Invalid fields/);
});

test('changing model, code revision or generation config for one side is not paired', async () => {
  for (const key of ['requested_model', 'git_head', 'generation_config_sha256']) {
    const fixture = await syntheticComparison();
    fixture.entries.graph_vector.run[key] = key === 'requested_model' ? 'other-model' : key === 'git_head' ? 'b'.repeat(40) : 'b'.repeat(64);
    await assert.rejects(comparison.inspectPair(await reseal(fixture)), /mismatch|Unpaired/);
  }
});

test('same JSON cannot turn a failed run into an accepted prediction', async () => {
  const fixture = await syntheticComparison(); fixture.entries.graph_vector.run.status = 'failed_no_prediction';
  const inspection = await comparison.inspectPair(await reseal(fixture));
  assert.equal(inspection.outcomes.graph_vector.accepted, false);
  assert.equal(inspection.outcomes.graph_vector.validated, null);
});

test('fake citation and added approval field are rejected without accepting a success metadata flag', async () => {
  for (const alter of [entry => { entry.response.summary.citations[0].quote = 'Not in the evidence'; },
    entry => { entry.response = { ...entry.response, ground_truth: true }; }]) {
    const fixture = await syntheticComparison(); alter(fixture.entries.graph_vector);
    const inspection = await comparison.inspectPair(await reseal(fixture));
    assert.equal(inspection.outcomes.graph_vector.accepted, false);
  }
});

test('null usage and HTTP failure remain missing, never zero or a fallback prediction', async () => {
  const fixture = await syntheticComparison(); const entry = fixture.entries.vector;
  entry.response = null; entry.run.usage = null; entry.run.returned_model = null;
  entry.run.http_status = 503; entry.run.error_code = 'http';
  const inspection = await comparison.inspectPair(await reseal(fixture));
  assert.equal(inspection.outcomes.vector.status, 'no_prediction');
  assert.equal(inspection.outcomes.vector.diagnostic, 'HTTP 503');
  assert.equal(fixture.entries.vector.run.usage, null);
});

test('v1 contexts cannot substitute for one side of the v2 comparison', async () => {
  const fixture = await syntheticComparison();
  const bundle = parseDataAsset(await readFile(new URL('../../demo/p01/data.js', import.meta.url), 'utf8'));
  fixture.entries.vector.request = await core.buildContext(bundle);
  await assert.rejects(comparison.inspectPair(await reseal(fixture)), /context mode/);
});

test('comparison source excerpts resolve to original viewer source; different source fails', async () => {
  const fixture = await syntheticComparison();
  const bundle = parseDataAsset(await readFile(new URL('../../demo/p01/data.js', import.meta.url), 'utf8'));
  await comparison.verifyViewerSources(fixture, bundle);
  const evidence = fixture.entries.vector.request.context.evidence.find(e => e.kind === 'source'); evidence.text += '// false';
  await assert.rejects(comparison.verifyViewerSources(fixture, bundle), /excerpt differs/);
});

test('run reader rejects source directories before looking for credentials or arbitrary files', async () => {
  await assert.rejects(readRun(new URL('../../demo/p01', import.meta.url).pathname), /private reasoning/);
});
