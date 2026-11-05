import test from 'node:test';
import assert from 'node:assert/strict';
import { CENSUS, SOURCE_FILES, OWNER_RESOURCE, OLD_METHOD, SQL, GATES,
  buildMutation, buildFixture, validateExplicitCensus, gitBlob } from './preparation.mjs';

// Synthetic declarations/data test preparation safeguards, not PetClinic behavior.
function syntheticSources() {
  const sources = Object.fromEntries(SOURCE_FILES.map(file => [file, 'synthetic support\n']));
  for (const file of CENSUS) sources[file.file] = file.methods.map(item => item.anchor + '\n    }').join('\n') + '\n';
  sources[OWNER_RESOURCE] = 'import java.util.List;\nimport java.util.Optional;\n\n' + sources[OWNER_RESOURCE].replace(OLD_METHOD.split('\n')[0] + '\n    }', OLD_METHOD);
  sources[SQL.customers_data] = Array.from({ length: 10 }, (_, n) => `INSERT INTO owners VALUES (${n + 1}, 'A', 'B', 'C', 'D', '000');`).join('\n') + '\n' +
    [1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 10, 10].map((owner, n) => `INSERT INTO pets VALUES (${n + 1}, 'P', '2010-01-01', 1, ${owner});`).join('\n') + '\n';
  sources[SQL.visits_data] = [7, 8, 8, 7].map((pet, n) => `INSERT INTO visits VALUES (${n + 1}, ${pet}, '2013-01-01', 'synthetic visit');`).join('\n');
  return sources;
}

test('candidate preparation grants no runtime, draft label, output or scientific gate', () => {
  assert.ok(Object.values(GATES).every(value => value === false));
  assert.equal(GATES.input_locked, false); assert.equal(GATES.candidate_selected_by_huy, false);
});
test('source census includes every declared top-level method, even helpers and setters', () => {
  const sources = syntheticSources(); validateExplicitCensus(sources);
  assert.equal(CENSUS.flatMap(file => file.methods).length, 27);
  assert.ok(CENSUS.some(file => file.methods.some(method => method.signature === 'setHostname(String)')));
  assert.ok(CENSUS.some(file => file.methods.some(method => method.signature === 'getPetsInternal()')));
});
test('extra explicit method cannot silently disappear from candidate coverage', () => {
  const sources = syntheticSources(); sources[CENSUS[1].file] += '    public String overlooked() {\n    }\n';
  assert.throws(() => validateExplicitCensus(sources), /incomplete/);
});
test('nested builder and constructor are declared exclusions, not extra top-level methods', () => {
  const sources = syntheticSources(); sources[CENSUS[3].file] += '        public OwnerDetails build() {\n        }\n';
  sources[CENSUS[2].file] += '    public CustomersServiceClient(WebClient.Builder webClientBuilder) {\n    }\n';
  validateExplicitCensus(sources);
});
test('boundary proposal leaves all other method bodies intact and changes only one patch path', () => {
  const source = syntheticSources()[OWNER_RESOURCE], built = buildMutation(source);
  assert.ok(built.mutated.includes('response.put("animals", owner.getPets());'));
  assert.ok(built.mutated.includes('public Optional<Map<String, Object>> findOwner('));
  assert.equal((built.patch.match(/^diff --git /gm) ?? []).length, 1);
  for (const method of CENSUS[0].methods.filter(item => !item.seed)) assert.ok(built.mutated.includes(method.anchor + '\n    }'));
  assert.equal((built.patch.match(/^@@ /gm) ?? []).length, 2);
});
test('ambiguous source and CRLF are rejected instead of patched heuristically', () => {
  const source = syntheticSources()[OWNER_RESOURCE];
  assert.throws(() => buildMutation(source + OLD_METHOD + '\n'), /non-unique/);
  assert.throws(() => buildMutation(source.replaceAll('\n', '\r\n')), /exact LF/);
});
test('fixture distinguishes no visits from no pets and never assumes created owner ID', () => {
  const fixture = buildFixture(syntheticSources());
  assert.deepEqual(fixture.primary.pet_ids, [7, 8]);
  assert.equal(fixture.no_visits_control.is_owner_without_pets, false);
  assert.equal(fixture.empty_pets_setup.resolved_id, null);
  assert.equal(fixture.empty_pets_setup.runtime_authorized, false);
  assert.equal(fixture.empty_pets_setup.expected_id_must_not_be_assumed, true);
});
test('unexpected empty-pet seed or missing visit cannot silently satisfy fixture assumptions', () => {
  const sources = syntheticSources();
  sources[SQL.customers_data] = sources[SQL.customers_data].replace("INSERT INTO pets VALUES (1, 'P', '2010-01-01', 1, 1);", '');
  assert.throws(() => buildFixture(sources), /Seed census changed/);
  const sources2 = syntheticSources(); sources2[SQL.visits_data] = '';
  assert.throws(() => buildFixture(sources2), /Visit fixture differs/);
});
test('matrix writes occur after main GETs and readbacks cannot be omitted', () => {
  const fixture = buildFixture(syntheticSources());
  assert.equal(fixture.requests.length, 12);
  assert.equal(fixture.requests.filter(row => row.method === 'GET').length, 10);
  assert.deepEqual(fixture.requests.slice(-2).map(row => row.method), ['POST', 'PUT']);
  assert.ok(fixture.requests.slice(-2).every(row => row.readback_required));
  assert.equal(fixture.requests.at(-2).binds, 'write_owner_id');
  assert.ok(fixture.requests.at(-1).path.includes('{write_owner_id}'));
  assert.equal(fixture.execution_policy.automatic_execution, false);
});
test('Git object identity is bound to raw bytes including final newline', () => {
  assert.equal(gitBlob(Buffer.alloc(0)), 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
  assert.notEqual(gitBlob('source\n'), gitBlob('source\r\n'));
  assert.notEqual(gitBlob('source\n'), gitBlob('source'));
});
