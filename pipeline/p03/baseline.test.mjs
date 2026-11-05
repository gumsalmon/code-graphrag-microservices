import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { baselinePlan, validateAuthorization, CANDIDATE_HASH, LABEL, requireOwned, relabelArguments } from './baseline.mjs';
import { serviceArguments, buildArguments } from '../../scripts/run_p02_baseline.mjs';

const fixture = await readFile(new URL('../../handoff-out/p03-preparation/20261024T190227112Z-a8e852db/spec/fixture.candidate.v1.json', import.meta.url));
const decision = JSON.parse(await readFile(new URL('../../benchmark/p03/decisions/SELECTION_BASELINE_2026-10-28.json', import.meta.url)));
const candidate = { manifest_sha256: CANDIDATE_HASH };
test('D18 selects exact frozen bytes without input lock', () => {
  assert.equal(validateAuthorization(decision, candidate, fixture), true);
  for (const changed of [{ input_locked: true }, { mutated_runtime_authorized: true }, { decision_maker: 'AI' }, { fixture_sha256: '0'.repeat(64) }])
    assert.throws(() => validateAuthorization({ ...decision, ...changed }, candidate, fixture));
  assert.throws(() => validateAuthorization(decision, candidate, Buffer.concat([fixture, Buffer.from('\n')])));
});
test('plan contains exactly two baseline groups and correct distinct fixture/write counts', () => {
  const plan = baselinePlan('20261028-test', candidate);
  assert.deepEqual(plan.groups.map(g => g.snapshot), ['baseline', 'baseline']);
  assert.equal(new Set(plan.groups.map(g => g.owner)).size, 2);
  assert.equal(plan.planned_fixture_slots, 24);
  assert.equal(plan.fixture_post_requests + plan.fixture_put_requests + plan.additional_empty_owner_setup_posts, 6);
  assert.equal(plan.input_locked, false);
  assert.throws(() => baselinePlan('../other', candidate));
});
test('shared service options become owned private P03 resources', () => {
  const args = relabelArguments(serviceArguments({ name: 'p03b-test-app', runId: 'r1', network: 'p03b-test-net',
    service: 'customers-service', javaImage: 'sha256:local', jar: 'C:/private/app.jar', config: 'C:/private/config' }), 'r1');
  assert.ok(args.includes(LABEL + '=r1'));
  assert.ok(args.includes('--read-only'));
  assert.ok(args.includes('--cap-drop'));
  assert.throws(() => relabelArguments([...args, '--publish', '8081:8081'], 'r1'));
});
test('build stays offline and cache/settings read only', () => {
  const args = relabelArguments(buildArguments({ name: 'p03b-build', runId: 'r1', source: 'C:/run/source',
    mavenHome: 'C:/cache/maven', repository: 'C:/cache/repository', javaImage: 'sha256:local' }), 'r1');
  assert.equal(args[args.indexOf('--network') + 1], 'none');
  assert.ok(args.includes('-o'));
  assert.ok(args.includes('-Dmaven.test.skip=true'));
  assert.ok(args.includes('type=bind,source=C:/cache/repository,target=/maven-repository,readonly'));
});
test('cleanup rejects mismatched prefix and ownership labels', () => {
  assert.equal(requireOwned({ name: 'p03b-example', owner: 'r1' }, 'r1', { [LABEL]: 'r1' }), true);
  for (const [resource, labels] of [[{ name: 'p02-example', owner: 'r1' }, { [LABEL]: 'r1' }],
    [{ name: 'p03b-example', owner: 'r1' }, { [LABEL]: 'r2' }]])
    assert.throws(() => requireOwned(resource, 'r1', labels));
});
