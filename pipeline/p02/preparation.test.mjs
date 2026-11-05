import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
// Regression of frozen v1 artifacts, including their known F01/F02 limitations.
import { buildHistoricalP02InputsV1 as buildP02Inputs, sourceFiles, validatePinnedSources, validateVersionedSpecs, verifyP02Preparation } from '../../scripts/prepare_p02_inputs.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const specBytes = Object.fromEntries(await Promise.all(['scenario.json', 'fixture.json', 'scope.json', 'optional-query.patch'].map(async name =>
  [name, await readFile(new URL('../../benchmark/p02/preparation.v1/' + name, import.meta.url))])));
function syntheticInput() {
  const scenario = JSON.parse(specBytes['scenario.json']), fixture = JSON.parse(specBytes['fixture.json']), scope = JSON.parse(specBytes['scope.json']);
  const sources = Object.fromEntries(sourceFiles(scope, fixture).map(file => [file, 'Synthetic support text, not runtime or benchmark evidence\n']));
  for (const file of scope.files) {
    const name = file.class_fqn.split('.').at(-1);
    sources[file.file] = 'class ' + name + ' {\n    ' + name + '(Object dependency) {}\n' +
      file.methods.map(method => '    ' + method.anchor + '\n        return null;\n    }\n').join('\n') + '}\n';
  }
  sources[fixture.sql_files.visits_data] = fixture.seed_visits.map(row => `INSERT INTO visits VALUES (${row.id}, ${row.pet_id}, '${row.date}', '${row.description}');`).join('\n');
  sources[fixture.sql_files.customers_data] = [fixture.primary, fixture.auxiliary_empty].map(owner =>
    `INSERT INTO owners VALUES (${owner.owner_id}, 'Synthetic');\n` + owner.pet_ids.map(id => `INSERT INTO pets VALUES (${id}, 'Pet${id}', '2010-01-01', 1, ${owner.owner_id});`).join('\n')).join('\n');
  return { scenario, fixture, scope, sources, patch: specBytes['optional-query.patch'].toString('utf8') };
}

test('versioned input specs are byte-pinned and LF-preserved; no raw label files required', async () => {
  validateVersionedSpecs(specBytes);
  const attributes = await readFile(new URL('../../.gitattributes', import.meta.url), 'utf8');
  assert.match(attributes, /\/benchmark\/p02\/preparation\.v1\/\* text eol=lf/);
});
test('full bounded declaration census includes private helpers/setter, not just known callers', () => {
  const { inventory, universe } = buildP02Inputs(syntheticInput());
  assert.equal(inventory.entities.length, 15);
  assert.deepEqual(['method', 'api', 'service'].map(level => universe.eligible_entities.filter(entity => entity.level === level).length), [8, 3, 1]);
  assert.equal(inventory.excluded.length, 3);
  for (const name of ['joinIds(', 'setHostname(', 'addVisitsToOwner(', 'emptyVisitsForPets('])
    assert.ok(universe.eligible_entities.some(entity => entity.entity_id.includes(name)));
  assert.ok(inventory.entities.every(entity => !('polarity' in entity) && !('behavioral_impact' in entity)));
  assert.equal(universe.locked_for_labeling, false);
});
test('provider-only declaration substitution is reversible and preserves the entire handler body', () => {
  const input = syntheticInput(), before = structuredClone(input), built = buildP02Inputs(input);
  assert.deepEqual(input, before);
  assert.equal(built.mutated.replace(input.scenario.mutation.new_declaration, input.scenario.mutation.old_declaration), input.sources[input.scenario.mutation.file]);
  assert.ok(built.mutated.includes('required = false, defaultValue = "false"'));
});
test('seed method/API/service are excluded and aliases retain overload identity without approval', () => {
  const { universe } = buildP02Inputs(syntheticInput());
  assert.equal(universe.excluded_seeds.length, 3);
  assert.ok(universe.excluded_seeds.every(seed => !universe.eligible_entities.some(entity => entity.entity_id === seed.entity_id)));
  assert.equal(universe.aliases.filter(alias => alias.mutated_id.endsWith('#read(List<Integer>,boolean)')).length, 1);
  assert.ok(universe.eligible_entities.some(entity => entity.entity_id.endsWith('#read(int)')));
  assert.ok(universe.aliases.every(alias => alias.independently_confirmed === false));
});
test('40 request slots are a plan, not observations; writes are last and invalid inputs are separate', () => {
  const { matrix } = buildP02Inputs(syntheticInput());
  assert.equal(matrix.cases.length, 40);
  assert.equal(matrix.actual_remote_calls, 0);
  assert.ok(matrix.cases.every(item => item.actual_http_status === null && item.raw_response_file === null));
  for (const snapshot of ['baseline', 'mutated']) for (const repetition of [1, 2]) {
    const block = matrix.cases.filter(item => item.snapshot === snapshot && item.repetition === repetition);
    assert.equal(block.at(-1).method, 'POST');
    assert.match(block.find(item => item.id === 'direct_invalid').role, /out-of-valid-domain/);
    assert.ok(block.some(item => item.id === 'gateway_populated'));
  }
});
test('changed SQL visits or wrong owner-to-pet mapping cannot become the declared fixture', () => {
  for (const alter of [input => { input.fixture.seed_visits[0].description = 'Invented'; },
    input => { input.fixture.primary.owner_id = 1; }, input => { input.fixture.auxiliary_empty.pet_ids = [7]; }]) {
    const input = syntheticInput(); alter(input); assert.throws(() => buildP02Inputs(input), /Fixture|control/);
  }
});
test('missing and duplicate declarations or an incomplete census fail rather than silently shrink scope', () => {
  for (const alter of [input => { input.sources[input.scope.files[1].file] = ''; },
    input => { input.sources[input.scope.files[1].file] += input.scope.files[1].methods[0].anchor; },
    input => { input.scope.files[1].methods.pop(); }]) {
    const input = syntheticInput(); alter(input); assert.throws(() => buildP02Inputs(input), /declaration|census/);
  }
});
test('preparation refuses synthetic runtime completion, label acceptance and held-out test', () => {
  for (const alter of [input => { input.scenario.runtime.status = 'passed'; }, input => { input.scenario.labels.annotator = 'Invented'; },
    input => { input.scenario.evaluation_universe.locked = true; }, input => { input.scenario.split_intent = 'test'; },
    input => { input.scope.independent_inventory_confirmation_received = true; }]) {
    const input = syntheticInput(); alter(input); assert.throws(() => buildP02Inputs(input), /Preparation|Scope/);
  }
});
test('extra patch hunks or a changed default require a new version', () => {
  const input = syntheticInput(); input.patch += '\n@@ -1 +1 @@\n-a\n+b\n';
  assert.throws(() => buildP02Inputs(input), /Patch/);
  const second = syntheticInput(); second.scenario.mutation.new_declaration = second.scenario.mutation.new_declaration.replace('defaultValue = "false"', 'defaultValue = "true"');
  assert.throws(() => buildP02Inputs(second), /semantics/);
});
test('rehashing a modified spec/source cannot authenticate it as pinned input', () => {
  const altered = { ...specBytes, 'fixture.json': Buffer.from(specBytes['fixture.json'].toString('utf8').replace('owner6', 'owner9')) };
  assert.throws(() => validateVersionedSpecs(altered), /Versioned spec bytes changed/);
  assert.throws(() => validatePinnedSources(syntheticInput().sources), /Pinned Git source bytes differ/);
});
test('arbitrary/label source paths are rejected before an oracle getter is read', () => {
  const input = syntheticInput();
  Object.defineProperty(input.sources, 'labels.json', { enumerable: true, get() { throw new Error('oracle read'); } });
  assert.throws(() => buildP02Inputs(input), /Unexpected\/missing source/);
  const second = syntheticInput(); second.scope.support_files.push('../../credentials');
  assert.throws(() => sourceFiles(second.scope, second.fixture), /allowlist/);
});
test('checker refuses arbitrary run paths before opening source or credentials', async () => {
  await assert.rejects(verifyP02Preparation('.'), /private P02/);
});
test('checksum verifier rejects changed bytes, duplicate/traversal paths and unmanifested files', async () => {
  const parent = resolve(ROOT, 'handoff-out/p02-preparation'); await mkdir(parent, { recursive: true });
  const sha = createHash('sha256').update('x').digest('hex');
  for (const kind of ['bytes', 'duplicate', 'traversal', 'unmanifested']) {
    const directory = await mkdtemp(resolve(parent, 'test-'));
    try {
      await writeFile(resolve(directory, 'a.txt'), 'x');
      const manifest = kind === 'bytes' ? '0'.repeat(64) + '  a.txt\n' : kind === 'traversal' ? sha + '  ../outside\n' :
        sha + '  a.txt\n' + (kind === 'duplicate' ? sha + '  a.txt\n' : '');
      await writeFile(resolve(directory, 'checksums.sha256'), manifest);
      if (kind === 'unmanifested') await writeFile(resolve(directory, 'extra.txt'), 'x');
      await assert.rejects(verifyP02Preparation(directory), /checksum mismatch|Unsafe\/duplicate|Unmanifested/);
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
});
