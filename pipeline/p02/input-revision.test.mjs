import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { buildP02Inputs, buildHistoricalP02InputsV1, sourceFiles, validateVersionedSpecs } from '../../scripts/prepare_p02_inputs.mjs';
import { V1, SCENARIO, UNIVERSE, HISTORY, PROPOSAL, sha256, jsonText, validateRevisionRelations, verifyP02Revision, safeMember } from '../../scripts/verify_p02_revision.mjs';

const spec = Object.fromEntries(await Promise.all(['scenario.json', 'fixture.json', 'scope.json', 'optional-query.patch'].map(async name =>
  [name, await readFile(new URL('../../benchmark/p02/preparation.v1/' + name, import.meta.url))])));
const currentScenario = JSON.parse(await readFile(new URL('../../benchmark/p02/preparation.v2/scenario.json', import.meta.url)));
function syntheticInput() {
  const fixture = JSON.parse(spec['fixture.json']), scope = JSON.parse(spec['scope.json']);
  const sources = Object.fromEntries(sourceFiles(scope, fixture).map(file => [file, 'Synthetic test support only\n']));
  for (const file of scope.files) {
    const name = file.class_fqn.split('.').at(-1);
    sources[file.file] = 'class ' + name + ' {\n    ' + name + '(Object dependency) {}\n' +
      file.methods.map(method => '    ' + method.anchor + '\n        return null;\n    }\n').join('\n') + '}\n';
  }
  sources[fixture.sql_files.visits_data] = fixture.seed_visits.map(row => `INSERT INTO visits VALUES (${row.id}, ${row.pet_id}, '${row.date}', '${row.description}');`).join('\n');
  sources[fixture.sql_files.customers_data] = [fixture.primary, fixture.auxiliary_empty].map(owner =>
    `INSERT INTO owners VALUES (${owner.owner_id}, 'Synthetic');\n` + owner.pet_ids.map(id => `INSERT INTO pets VALUES (${id}, 'Pet${id}', '2010-01-01', 1, ${owner.owner_id});`).join('\n')).join('\n');
  return { scenario: structuredClone(currentScenario), fixture, fixtureBytes: spec['fixture.json'], scope, sources, patch: spec['optional-query.patch'].toString('utf8') };
}
function syntheticBundle() {
  const input = syntheticInput(), old = buildHistoricalP02InputsV1({ ...input, scenario: JSON.parse(spec['scenario.json']) });
  const proposal = structuredClone(old.universe);
  for (const alias of proposal.aliases) alias.evidence_refs = alias.evidence_refs.map(path => path === 'spec/optional-query.patch' ? V1 + 'optional-query.patch' : 'input/app/' + path);
  const files = Object.fromEntries(Object.entries(spec).map(([name, bytes]) => [V1 + name, bytes]));
  files[HISTORY] = Buffer.from(jsonText(old.universe)); files[PROPOSAL] = Buffer.from(jsonText(proposal));
  input.scenario.input_revision.supersedes_universe_sha256 = sha256(files[HISTORY]);
  input.scenario.input_revision.phat_f02_proposal_sha256 = sha256(files[PROPOSAL]);
  const built = buildP02Inputs(input);
  files[SCENARIO] = Buffer.from(jsonText(input.scenario)); files[UNIVERSE] = Buffer.from(jsonText(built.universe));
  files['draft/inventory.v1.json'] = Buffer.from(jsonText(built.inventory)); files['draft/request-plan.v1.json'] = Buffer.from(jsonText(built.matrix));
  for (const [file, text] of Object.entries(input.sources)) files['input/app/' + file] = Buffer.from(text);
  return { input, old, built, files };
}
function alterJson(files, name, change) { const value = JSON.parse(files[name]); change(value); files[name] = Buffer.from(jsonText(value)); }

test('F01 regression: a single fixture produces both historical and raw hashes, but v2 binds raw bytes', () => {
  const input = syntheticInput(), built = buildP02Inputs(input), old = buildHistoricalP02InputsV1({ ...input, scenario: JSON.parse(spec['scenario.json']) });
  assert.equal(sha256(input.fixtureBytes), '2a319f48c2d31894718228539c3743396e3d3e5ad04579985f6d2588bb324191');
  assert.equal(sha256(jsonText(input.fixture)), '2a837540d0316d290401a1485ddeeb86a62a6f06447ccd75aa976fc2c5c8168a');
  assert.equal(old.universe.fixture_sha256, sha256(jsonText(input.fixture)));
  assert.equal(built.universe.fixture_sha256, sha256(input.fixtureBytes));
  validateVersionedSpecs(spec);
});
test('new builder rejects v1 instead of silently generating another defective historical run', () => {
  const input = syntheticInput(); input.scenario = JSON.parse(spec['scenario.json']);
  assert.throws(() => buildP02Inputs(input), /historical only/);
});
test('fixture bytes cannot be omitted or replaced with JSON reserialization/CRLF', () => {
  for (const replacement of [undefined, Buffer.from(jsonText(JSON.parse(spec['fixture.json']))), Buffer.from(spec['fixture.json'].toString().replaceAll('\n', '\r\n'))]) {
    const input = syntheticInput(); input.fixtureBytes = replacement;
    assert.throws(() => buildP02Inputs(input), /fixture bytes/i);
  }
});
test('a fixture object must describe the exact shipped bytes even if SQL is also changed', () => {
  const input = syntheticInput(); input.fixture.seed_visits[0].description = 'Changed';
  assert.throws(() => buildP02Inputs(input), /Fixture object differs/);
});
test('v2 does not mutate inputs or change census, seeds, matrix, code snapshot or alias identity', () => {
  const input = syntheticInput(), before = { ...structuredClone(input), fixtureBytes: Buffer.from(input.fixtureBytes) }, { old, built } = syntheticBundle(); buildP02Inputs(input);
  assert.deepEqual(input, before);
  assert.deepEqual(built.inventory, old.inventory); assert.deepEqual(built.matrix, old.matrix);
  assert.equal(built.mutated, old.mutated); assert.equal(built.universe.mutated_snapshot_id, old.universe.mutated_snapshot_id);
  for (const field of ['eligible_entities', 'excluded_seeds', 'exclusions', 'projection_policy', 'logical_hop_limit']) assert.deepEqual(built.universe[field], old.universe[field]);
  for (let i = 0; i < 15; i++) for (const key of ['baseline_id', 'mutated_id', 'canonical_id', 'independently_confirmed'])
    assert.deepEqual(built.universe.aliases[i][key], old.universe.aliases[i][key]);
});
test('F02 repairs exactly 29 refs to four package-root files; proposal filename is not an adopted v3', () => {
  const { files, built } = syntheticBundle(), result = validateRevisionRelations(files);
  assert.equal(result.changed_evidence_refs, 29); assert.equal(result.aliases, 15);
  const refs = built.universe.aliases.flatMap(alias => alias.evidence_refs);
  assert.equal(new Set(refs).size, 4); assert.equal(refs.filter(path => path === V1 + 'optional-query.patch').length, 13);
  assert.ok(refs.every(path => files[path])); assert.equal(result.scenario_version, '0.1.1');
});
test('independent relationship checker catches the original serialized-fixture bug', () => {
  const { files, old } = syntheticBundle(); alterJson(files, UNIVERSE, value => { value.fixture_sha256 = old.universe.fixture_sha256; });
  assert.throws(() => validateRevisionRelations(files), /F01/);
});
test('independent relationship checker rejects missing refs, wrong roots and incomplete F02 adoption', () => {
  for (const mode of ['missing', 'root', 'old_ref']) {
    const { files } = syntheticBundle();
    if (mode === 'missing') delete files[V1 + 'optional-query.patch'];
    else alterJson(files, UNIVERSE, value => {
      if (mode === 'root') value.evidence_root.relative_path = 'draft';
      else value.aliases[0].evidence_refs[1] = 'spec/optional-query.patch';
    });
    assert.throws(() => validateRevisionRelations(files), /Missing artifact|evidence root|F02/);
  }
});
test('ref-only proposal cannot silently change identity, fixture, exclusions or projection', () => {
  for (const mutate of [value => { value.fixture_sha256 = '0'.repeat(64); }, value => { value.aliases[0].canonical_id += '-changed'; },
    value => { value.projection_policy = 'automatic'; }]) {
    const { files } = syntheticBundle(); alterJson(files, PROPOSAL, mutate);
    assert.throws(() => validateRevisionRelations(files), /Revision input binding|proposal changes/);
  }
});
test('v2 cannot add human confirmation, polarity, a lock, or scoring approval', () => {
  for (const mutate of [value => { value.locked_for_labeling = true; }, value => { value.official_scoring_authorized = true; },
    value => { value.independently_confirmed_by = 'Invented'; }, value => { value.aliases[0].independently_confirmed = true; },
    value => { value.eligible_entities[0].polarity = 'negative'; }]) {
    const { files } = syntheticBundle(); alterJson(files, UNIVERSE, mutate);
    assert.throws(() => validateRevisionRelations(files), /Universe changed|No human/);
  }
});
test('revision preserves F03 as missing and cannot claim execution in the request plan', () => {
  const { files, input } = syntheticBundle(); assert.match(input.scenario.input_revision.f03_status, /missing_unresolved/);
  alterJson(files, 'draft/request-plan.v1.json', value => { value.actual_remote_calls = 40; value.cases[0].actual_http_status = 200; });
  assert.throws(() => validateRevisionRelations(files), /not runtime evidence/);
  const second = syntheticInput(); second.scenario.input_revision.historical_runtime_evidence_reclassified = true;
  assert.throws(() => buildP02Inputs(second), /Invalid candidate revision/);
});
test('scenario version bump cannot conceal a change to the selected mutation or split', () => {
  for (const mutate of [value => { value.split_intent = 'test'; }, value => { value.mutation.consumer_unchanged = false; }]) {
    const { files } = syntheticBundle(); alterJson(files, SCENARIO, mutate);
    assert.throws(() => validateRevisionRelations(files), /Scenario changed/);
  }
});
test('portable names reject traversal, drives, backslashes and misleading relative roots', () => {
  for (const path of ['../x', '/x', 'C:/x', 'a\\b', 'a//b', './x', 'a/../x']) assert.equal(safeMember(path), false);
  assert.equal(safeMember(V1 + 'optional-query.patch'), true);
});
test('filesystem checker rejects duplicate, case-colliding, traversal, tampered and unlisted files', async () => {
  for (const kind of ['duplicate', 'case', 'traversal', 'bytes', 'unlisted']) {
    const directory = await mkdtemp(resolve(tmpdir(), 'p02-revision-test-'));
    try {
      await writeFile(resolve(directory, 'a.txt'), 'x'); const hash = sha256('x');
      let manifest = hash + '  a.txt\n';
      if (kind === 'duplicate') manifest += hash + '  a.txt\n';
      if (kind === 'case') manifest += hash + '  A.txt\n';
      if (kind === 'traversal') manifest = hash + '  ../a.txt\n';
      if (kind === 'bytes') manifest = '0'.repeat(64) + '  a.txt\n';
      if (kind === 'unlisted') await writeFile(resolve(directory, 'extra.txt'), 'x');
      await writeFile(resolve(directory, 'SHA256SUMS.txt'), manifest);
      await assert.rejects(verifyP02Revision(directory), /Unsafe\/duplicate|Missing\/unmanifested|Checksum mismatch/);
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
});
test('rehashing a synthetic replacement package cannot authenticate the frozen inputs', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'p02-revision-test-'));
  try {
    await writeFile(resolve(directory, 'a.txt'), 'x'); await writeFile(resolve(directory, 'SHA256SUMS.txt'), sha256('x') + '  a.txt\n');
    await assert.rejects(verifyP02Revision(directory), /Frozen input pin mismatch/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
