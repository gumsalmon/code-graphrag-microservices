import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateBaselineClaims, verifyBaseline } from '../../scripts/check_p02_baseline.mjs';
const fixture = JSON.parse(await readFile(new URL('../../benchmark/p02/preparation.v1/fixture.json', import.meta.url), 'utf8'));

function synthetic() {
  const rows = fixture.seed_visits.map(row => ({ id: row.id, petId: row.pet_id, date: row.date, description: row.description }));
  const bodies = { direct_omitted: { items: structuredClone(rows) }, gateway_populated: { id: 6, pets: [7, 8].map(id => ({ id, visits: rows.filter(row => row.petId === id) })) },
    gateway_empty: { id: 1, pets: [{ id: 1, visits: [] }] },
    'config-visits': { propertySources: [{ source: { 'spring.sql.init.data-locations': 'classpath*:db/hsqldb/data.sql', 'spring.sql.init.schema-locations': 'classpath*:db/hsqldb/schema.sql' } }] },
    'discovery-registry': { applications: { application: ['CUSTOMERS-SERVICE', 'VISITS-SERVICE', 'API-GATEWAY'].map(name => ({ name, instance: [{ status: 'UP' }] })) } } };
  const flags = { post_executed: false, full_matrix_executed: false, mutated_executed: false, setup_assertions: { fixture: true } };
  return { bodies, summary: { ...flags, status: 'baseline_fixture_ready', impact_labels_created: false, remote_model_calls: 0 },
    result: { ...flags, status: 'baseline_feasibility_verified_not_paired_runtime', universe_locked: false, labels_created: false, model_calls: 0 } };
}
test('baseline checks source-derived fixture but never approves labels or impact', () => {
  const { bodies, summary, result } = synthetic(), checked = validateBaselineClaims(fixture, bodies, summary, result);
  assert.equal(checked.fixture_visits, 4); assert.equal(checked.gateway_visits, 4); assert.equal(checked.independent_review, false);
});
test('matching counts cannot hide different visits or wrong per-pet assignment', () => {
  for (const alter of [data => { data.bodies.gateway_populated.pets[0].visits[0].description = 'Wrong'; },
    data => { data.bodies.gateway_populated.pets[0].visits[0].petId = 8; }, data => { data.bodies.direct_omitted.items[0].id = 999; }]) {
    const data = structuredClone(synthetic()); alter(data); assert.throws(() => validateBaselineClaims(fixture, data.bodies, data.summary, data.result), /differs|assignment/);
  }
});
test('HTTP 200 empty fallback is not a populated baseline', () => {
  const data = synthetic(); data.bodies.gateway_populated.pets.forEach(pet => { pet.visits = []; });
  assert.throws(() => validateBaselineClaims(fixture, data.bodies, data.summary, data.result), /lost populated/);
});
test('different DB config and absent real discovery registrations cannot pass setup verification', () => {
  for (const alter of [data => { data.bodies['config-visits'].propertySources = []; }, data => { data.bodies['discovery-registry'].applications.application.pop(); }]) {
    const data = synthetic(); alter(data); assert.throws(() => validateBaselineClaims(fixture, data.bodies, data.summary, data.result), /config|registrations/);
  }
});
test('baseline evidence cannot be relabeled as full matrix, mutation or accepted ground truth', () => {
  for (const alter of [data => { data.summary.full_matrix_executed = true; }, data => { data.result.mutated_executed = true; },
    data => { data.result.universe_locked = true; }, data => { data.result.labels_created = true; }, data => { data.summary.post_executed = true; }]) {
    const data = synthetic(); alter(data); assert.throws(() => validateBaselineClaims(fixture, data.bodies, data.summary, data.result), /cannot approve/);
  }
});
test('verifier refuses arbitrary baseline paths without reading a key or running Docker', async () => {
  await assert.rejects(verifyBaseline('.'), /private P02 baseline root/);
});
