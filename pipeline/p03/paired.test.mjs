import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validatePairedAuthorization, pairedPlan, requirePairedOwned, pairedArguments, validateSourceDelta, ARTIFACT_HASHES, AUTHORIZATION, LABEL } from './paired.mjs';
import { OWNER_RESOURCE } from './preparation.mjs';
const decision = JSON.parse(await readFile(AUTHORIZATION, 'utf8'));
const candidate = { manifest_sha256: decision.candidate_manifest_sha256 };
const proposal = await readFile(decision.proposal);
const artifacts = Object.fromEntries(await Promise.all(Object.keys(ARTIFACT_HASHES).map(async file => [file, await readFile(decision.candidate_directory + '/' + file)])));
test('D19 binds exact six reviewed artifacts and keeps separate scientific/model/Git gates closed', () => {
  assert.equal(validatePairedAuthorization(decision, candidate, proposal, artifacts), true);
});
test('baseline-only authority or widened rights cannot silently enter paired runner', () => {
  for (const changes of [{ decision_id: 'D18' }, { input_locked: false }, { baseline_repetitions: 1 }, { model_calls_authorized: true },
    { downloads_authorized: true }, { draft_annotation_authorized: true }, { evaluated_method_outputs_authorized: true }])
    assert.throws(() => validatePairedAuthorization({ ...decision, ...changes }, candidate, proposal, artifacts));
});
test('altered proposal, fixture or membership hashes fail closed', () => {
  assert.throws(() => validatePairedAuthorization(decision, candidate, Buffer.from('changed'), artifacts));
  for (const name of Object.keys(artifacts)) assert.throws(() => validatePairedAuthorization(decision, candidate, proposal, { ...artifacts, [name]: Buffer.from('changed') }));
});
test('four groups have fresh owners/names, paired snapshots and two repetitions', () => {
  const p = pairedPlan('toy-run'); assert.equal(p.groups.length, 4); assert.equal(p.planned_fixture_slots, 48);
  assert.equal(p.measurement_version, 2); assert.equal(p.readiness_policy, 'lifecycle_health_and_registry_not_business_response');
  assert.equal(new Set(p.groups.map(g => g.owner)).size, 4); assert.equal(new Set(p.groups.map(g => g.prefix)).size, 4);
  for (const rep of [1, 2]) assert.deepEqual(p.groups.filter(g => g.repetition === rep).map(g => g.snapshot), ['baseline', 'mutated']);
  assert.throws(() => pairedPlan('../unsafe'));
});
test('cleanup and shared container argument relabeling preserve ownership/isolation', () => {
  const resource = { name: 'p03p-toy-app', owner: 'toy' };
  requirePairedOwned(resource, 'toy', { [LABEL]: 'toy' });
  assert.throws(() => requirePairedOwned(resource, 'toy', { [LABEL]: 'other' }));
  assert.throws(() => requirePairedOwned({ name: 'foreign', owner: 'toy' }, 'toy', { [LABEL]: 'toy' }));
  const args = ['--pull', 'never', '--label', 'code-graphrag.p02-runtime=toy'];
  assert.ok(pairedArguments(args, 'toy').includes(LABEL + '=toy'));
  for (const unsafe of [['--pull', 'always'], [...args, '--publish'], [...args, '--privileged']]) assert.throws(() => pairedArguments(unsafe, 'toy'));
});
test('source delta permits only registered Customers handler, never consumer or stacked Visits mutation', () => {
  const before = { [OWNER_RESOURCE]: 'old', consumer: 'same', visits: 'same' };
  assert.deepEqual(validateSourceDelta(before, { ...before, [OWNER_RESOURCE]: 'new' }), [OWNER_RESOURCE]);
  for (const after of [before, { ...before, [OWNER_RESOURCE]: 'new', consumer: 'changed' }, { ...before, visits: 'changed' }])
    assert.throws(() => validateSourceDelta(before, after));
});
