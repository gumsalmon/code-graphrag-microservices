import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateSyntheticAttempt, parseSyntheticJson, CONTRACT_ID } from './validator.mjs';
import { syntheticFixture } from './fixtures.mjs';

const check = data => validateSyntheticAttempt(data.request, data.attempt);
const codes = report => report.issues.map(item => item.code);
const records = data => data.attempt.payload.assessments;
const method = data => records(data)[0];
const pure = data => records(data).find(item => item.level === 'service');
const api = data => records(data).find(item => item.level === 'api');
const evidence = data => ({ evidence_id: data.request.evidence[0].id, quote: data.request.evidence[0].text });
const clone = value => structuredClone(value);

test('mixed toy validates, retains all three levels, and never grants semantic/lineage/label/scoring approval', () => {
  const result = check(syntheticFixture());
  assert.equal(result.contract_id, CONTRACT_ID); assert.equal(result.input_status, 'valid');
  assert.equal(result.execution_status, 'completed'); assert.equal(result.validation_status, 'valid');
  assert.deepEqual(result.issues, []); assert.equal(result.records.length, 4);
  for (const field of ['applied_to_runtime', 'production_ready', 'semantic_correctness_verified', 'lineage_verified',
    'ground_truth_accepted', 'official_scoring_authorized', 'score_export_created']) assert.equal(result[field], false);
  assert.equal(result.pending_decisions.length, 8);
  assert.equal(result.coverage.method.eligible, 3); assert.equal(result.coverage.method.returned_distinct_valid, 2);
  assert.equal(result.coverage.method.not_returned, 1); assert.equal(result.coverage.service.behavioral_unknown, 1);
  assert.ok(result.records.filter(item => item.path_check).every(item => item.path_check.kind === 'matches_supplied_graph'));
});

test('deterministic validation does not mutate deeply frozen request or raw attempt', () => {
  const data = syntheticFixture(), before = JSON.stringify(data);
  const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } };
  freeze(data); assert.deepEqual(check(data), check(data)); assert.equal(JSON.stringify(data), before);
});

const invalidRecords = [
  ['wrong overload is not fuzzy-matched', data => { method(data).entity_id = method(data).entity_id.replace('(int)', '(String)'); }, 'OUT_OF_SCOPE_ID'],
  ['snapshot substitution is not automatic', data => { method(data).entity_id = method(data).entity_id.replace('@toy-baseline', '@toy-mutated'); }, 'OUT_OF_SCOPE_ID'],
  ['whitespace is not silently trimmed from raw ID', data => { method(data).entity_id += ' '; }, 'OUT_OF_SCOPE_ID'],
  ['wrong level does not reuse a Method ID', data => { method(data).level = 'api'; }, 'OUT_OF_SCOPE_ID'],
  ['unknown level remains malformed rather than guessed', data => { method(data).level = 'class'; }, 'LEVEL'],
  ['non-string entity ID is retained and rejected', data => { method(data).entity_id = 42; }, 'ENTITY_ID'],
  ['seed Method cannot enter propagated impact records', data => { method(data).entity_id = data.request.seed_method_id; }, 'SEED_ASSESSMENT'],
  ['seed API cannot enter propagated impact records', data => { api(data).entity_id = data.request.registry.find(item => item.level === 'api' && item.seed).entity_id; }, 'SEED_ASSESSMENT'],
  ['seed-owning Service remains excluded even for pure unknown', data => { pure(data).entity_id = data.request.registry.find(item => item.level === 'service' && item.seed).entity_id; }, 'SEED_ASSESSMENT'],
  ['support source membership is not universe membership', data => { data.request.registry.find(item => item.entity_id === method(data).entity_id).in_universe = false; }, 'OUT_OF_SCOPE_ID'],
  ['assessment in an unsupported level is diagnosed', data => { data.request.supported_levels = ['method', 'api']; }, 'UNSUPPORTED_LEVEL'],
  ['missing required fields are diagnosed', data => { delete method(data).rationale; }, 'MISSING_FIELD'],
  ['extra model claims of acceptance are rejected', data => { method(data).ground_truth_accepted = true; }, 'UNEXPECTED_FIELD'],
  ['Boolean behavior cannot replace prediction vocabulary', data => { method(data).behavioral_impact = true; }, 'ENUM'],
  ['rationale is mandatory for pure abstention', data => { pure(data).rationale = ' \t'; }, 'RATIONALE'],
  ['assumptions cannot contain blank strings', data => { method(data).assumptions = [' ']; }, 'STRING_VALUE'],
  ['required repair needs a registered strategy', data => { method(data).requires_code_change = 'required'; }, 'REPAIR_STRATEGY'],
  ['unknown repair cannot carry a hidden strategy', data => { method(data).repair_strategy_id = 'toy-request-registered-repair'; }, 'REPAIR_STRATEGY'],
  ['wrong strategy is not accepted for optional repair', data => { method(data).requires_code_change = 'optional'; method(data).repair_strategy_id = 'invented-strategy'; }, 'REPAIR_STRATEGY'],
  ['reachable plus behavior unknown is not pure abstention', data => { method(data).behavioral_impact = 'unknown'; method(data).citations = []; }, 'CITATION_COUNT'],
  ['pure unknown still validates citation ID', data => { pure(data).citations = [{ evidence_id: 'MISSING', quote: 'some unknown quote' }]; }, 'UNKNOWN_EVIDENCE_ID'],
  ['pure unknown still validates exact quote', data => { pure(data).citations = [{ evidence_id: 'TOY-E01', quote: 'fabricated quote text' }]; }, 'QUOTE_MISMATCH'],
  ['too-short quote is rejected', data => { method(data).citations[0].quote = 'return'; }, 'QUOTE_LENGTH'],
  ['internal spaces do not satisfy eight non-whitespace characters', data => { data.request.evidence[0].text = 'a       b'; method(data).citations[0].quote = 'a       b'; }, 'QUOTE_LENGTH'],
  ['overlong quote is rejected', data => { method(data).citations[0].quote = 'x'.repeat(2401); }, 'QUOTE_LENGTH'],
  ['quote case is not normalized', data => { method(data).citations[0].quote = method(data).citations[0].quote.toUpperCase(); }, 'QUOTE_MISMATCH'],
  ['CRLF quote is not silently made equal to LF evidence', data => { data.request.evidence[0].text = 'return remote.\nread(id);'; method(data).citations[0].quote = 'return remote.\r\nread(id);'; }, 'QUOTE_MISMATCH'],
  ['citation cannot supply trusted provenance fields', data => { method(data).citations[0].source_sha256 = 'made-up'; }, 'UNEXPECTED_FIELD'],
  ['citation cap is checked', data => { method(data).citations = Array.from({ length: 31 }, () => evidence(data)); }, 'CITATION_COUNT'],
  ['unknown uses null counts rather than zero', data => { pure(data).logical_hops = 0; }, 'UNESTABLISHED_PATH'],
  ['unestablished dependency cannot retain a witness', data => { method(data).dependency_status = 'not_established'; }, 'UNESTABLISHED_PATH'],
  ['API ID cannot be used as a Method witness node', data => { api(data).dependency_path[0] = api(data).entity_id; }, 'PATH_METHOD_ID'],
  ['witness ends at the actual seed', data => { method(data).dependency_path[1] = records(data)[1].entity_id; }, 'PATH_SEED'],
  ['witness anchor must match the declared Method', data => { method(data).entity_id = records(data)[1].entity_id; }, 'PATH_ANCHOR'],
  ['API witness starts at registered handler', data => { api(data).dependency_path = clone(method(data).dependency_path); api(data).logical_hops = 1; }, 'PATH_ANCHOR'],
  ['Service witness starts inside the declared Service', data => { Object.assign(pure(data), { dependency_status: 'reachable', dependency_path: [data.request.seed_method_id, method(data).entity_id], logical_hops: 1, service_boundary_crossings: 1, citations: [evidence(data)] }); }, 'PATH_ANCHOR'],
  ['containment does not add a logical hop', data => { api(data).logical_hops = 3; }, 'LOGICAL_HOPS'],
  ['boundary count is checked independently from hop count', data => { api(data).service_boundary_crossings = 2; }, 'BOUNDARY_COUNT'],
  ['witness is directed, not an undirected graph path', data => { data.request.path_validation.logical_edges[1] = { ...data.request.path_validation.logical_edges[1], caller: data.request.seed_method_id, callee: method(data).entity_id }; }, 'GRAPH_EDGE_MISSING'],
  ['missing graph edge does not become graph-verified', data => { data.request.path_validation.logical_edges = []; }, 'GRAPH_EDGE_MISSING'],
  ['path cycles are rejected', data => { method(data).dependency_path.splice(1, 0, method(data).entity_id); method(data).logical_hops = 2; }, 'PATH_CYCLE'],
  ['more than three hops are not shortened', data => { method(data).dependency_path = Array(5).fill(method(data).entity_id); method(data).logical_hops = 4; }, 'PATH_LENGTH'],
  ['malformed assessment is retained by index rather than crashing', data => { records(data)[0] = null; }, 'OBJECT_REQUIRED'],
];
for (const [name, mutate, expected] of invalidRecords) test(name, () => {
  const data = syntheticFixture(); mutate(data); const result = check(data);
  assert.ok(codes(result).includes(expected), JSON.stringify(result.issues));
  assert.ok(['partial', 'invalid'].includes(result.validation_status));
  assert.equal(result.score_export_created, false);
});

test('all 36 dependency/behavior/repair combinations require citations except pure unknown', () => {
  for (const dependency of ['reachable', 'not_established', 'unknown']) for (const behavior of ['likely', 'unlikely', 'unknown'])
    for (const repair of ['required', 'optional', 'not_established', 'unknown']) {
      const data = syntheticFixture(), item = method(data);
      Object.assign(item, { dependency_status: dependency, behavioral_impact: behavior, requires_code_change: repair,
        repair_strategy_id: ['required', 'optional'].includes(repair) ? 'toy-request-registered-repair' : null, citations: [] });
      if (dependency !== 'reachable') Object.assign(item, { dependency_path: [], logical_hops: null, service_boundary_crossings: null });
      const pureUnknown = dependency === 'unknown' && behavior === 'unknown' && repair === 'unknown';
      assert.equal(check(data).records[0].issues.some(entry => entry.code === 'CITATION_COUNT'), !pureUnknown);
    }
});

test('pure unknown may include a valid citation and is never mapped to a Boolean negative', () => {
  const data = syntheticFixture(); pure(data).citations = [evidence(data)]; const report = check(data);
  assert.equal(report.validation_status, 'valid'); assert.equal(report.coverage.service.entities[0].status, 'unknown');
  assert.equal(Object.hasOwn(report.records[3], 'predicted_impacted'), false);
});
test('repair claim is independent of behavioral unknown and can reference a registered strategy', () => {
  const data = syntheticFixture(); method(data).behavioral_impact = 'unknown'; method(data).requires_code_change = 'optional';
  method(data).repair_strategy_id = 'toy-request-registered-repair'; assert.equal(check(data).validation_status, 'valid');
});
test('Service witness can be valid without projecting Method likely into Service behavior', () => {
  const data = syntheticFixture(); Object.assign(pure(data), { dependency_status: 'reachable',
    dependency_path: clone(method(data).dependency_path), logical_hops: 1, service_boundary_crossings: 1, citations: [evidence(data)] });
  const report = check(data); assert.equal(report.validation_status, 'valid'); assert.equal(report.coverage.service.behavioral_unknown, 1);
});
test('sparse payload creates omissions, never automatic API/Service projection or negatives', () => {
  const data = syntheticFixture(); data.attempt.payload.assessments = [method(data)]; const report = check(data);
  assert.equal(report.validation_status, 'valid'); assert.equal(report.records.length, 1);
  assert.equal(report.coverage.method.not_returned, 2); assert.equal(report.coverage.api.not_returned, 1);
  assert.equal(report.coverage.service.entities[0].status, 'not_returned');
});
test('unsupported levels are distinct from not_returned and unknown', () => {
  const data = syntheticFixture(); data.request.supported_levels = ['method'];
  data.attempt.payload.assessments = records(data).filter(item => item.level === 'method'); const report = check(data);
  assert.equal(report.validation_status, 'valid'); assert.equal(report.coverage.api.state, 'unsupported_level');
  assert.equal(report.coverage.api.not_returned, null); assert.equal(report.coverage.service.entities[0].status, 'unsupported_level');
});
test('empty assessments with a valid summary is sparse output, not invented negatives', () => {
  const data = syntheticFixture(); data.attempt.payload.assessments = []; const report = check(data);
  assert.equal(report.validation_status, 'valid'); assert.equal(report.coverage.method.not_returned, 3);
});
test('source-inferred paths are shape-checked but never labeled graph-verified', () => {
  const report = check(syntheticFixture('source-inferred')); assert.equal(report.validation_status, 'valid');
  assert.ok(report.records.filter(item => item.path_check).every(item => item.path_check.kind === 'source_inferred_not_graph_verified'));
});
test('failed witness validation never labels the path as matching supplied graph', () => {
  const data = syntheticFixture(); data.request.path_validation.logical_edges = [];
  const report = check(data); assert.equal(report.records[0].path_check.kind, 'invalid_witness');
  assert.ok(report.records.every(item => item.path_check?.kind !== 'matches_supplied_graph'));
});
test('registered aliases resolve exactly and preserve raw IDs and binding evidence', () => {
  const data = syntheticFixture(), canonical = method(data).entity_id;
  data.request.aliases.push({ level: 'method', raw_id: 'toy-declared-client-alias', canonical_id: canonical, evidence_id: 'TOY-E01' });
  method(data).entity_id = 'toy-declared-client-alias'; method(data).dependency_path[0] = 'toy-declared-client-alias';
  const report = check(data); assert.equal(report.validation_status, 'valid'); assert.equal(report.records[0].canonical_id, canonical);
  assert.equal(report.records[0].raw_id, 'toy-declared-client-alias'); assert.equal(report.records[0].identity_resolution, 'declared_alias');
  assert.equal(report.records[0].alias_evidence_id, 'TOY-E01');
});
test('identical duplicates quarantine every copy rather than multiplying coverage', () => {
  const data = syntheticFixture(); records(data).push(clone(method(data))); const report = check(data);
  assert.equal(report.records[0].status, 'invalid'); assert.equal(report.records.at(-1).status, 'invalid');
  assert.equal(codes(report).filter(code => code === 'DUPLICATE_CANONICAL_ID').length, 2);
  assert.equal(report.coverage.method.returned_distinct_valid, 1); assert.equal(report.coverage.method.invalid, 1);
  assert.equal(report.coverage.method.not_returned, 1);
});
test('conflicting alias/canonical duplicates quarantine even an individually valid favorable record', () => {
  const data = syntheticFixture(), canonical = method(data).entity_id;
  data.request.aliases.push({ level: 'method', raw_id: 'toy-alias', canonical_id: canonical, evidence_id: 'TOY-E01' });
  const duplicate = clone(method(data)); duplicate.entity_id = 'toy-alias'; duplicate.behavioral_impact = 'unlikely'; records(data).push(duplicate);
  const report = check(data); assert.equal(codes(report).filter(code => code === 'CONFLICTING_DUPLICATE').length, 2);
  assert.equal(report.records[0].status, 'invalid'); assert.equal(report.records.at(-1).status, 'invalid');
});
test('partially invalid record is not silently reclassified as not_returned', () => {
  const data = syntheticFixture(); method(data).citations[0].quote = 'invented missing source text'; const report = check(data);
  assert.equal(report.validation_status, 'partial'); assert.equal(report.coverage.method.entities[0].status, 'invalid');
  assert.equal(report.coverage.method.not_returned, 1); assert.equal(report.records[0].raw_id, method(data).entity_id);
});

const badRequests = [
  ['real-run input is refused', data => { data.request.synthetic_only = false; }, 'SYNTHETIC_ONLY'],
  ['real repository identifier is refused', data => { data.request.repository_id = 'spring-petclinic'; }, 'TOY_ID_REQUIRED'],
  ['contract revision drift is refused', data => { data.request.contract_id += '-changed'; }, 'CONTRACT_VERSION'],
  ['registry snapshot mismatch is an input error', data => { data.request.registry[0].entity_id = data.request.registry[0].entity_id.replace('@toy-baseline', '@toy-other'); }, 'REGISTRY_ID'],
  ['ambiguous registry is an input error', data => { data.request.registry.push(clone(data.request.registry[0])); }, 'DUPLICATE_REGISTRY_ID'],
  ['seed cannot be put into eligible universe', data => { data.request.registry.find(item => item.seed).in_universe = true; }, 'REGISTRY_SCOPE'],
  ['seed Method must exist', data => { data.request.seed_method_id = 'missing'; }, 'SEED_METHOD'],
  ['API handler binding must be from the same service', data => { data.request.registry.find(item => item.level === 'api' && !item.seed).handler_id = data.request.seed_method_id; }, 'API_HANDLER_BINDING'],
  ['seed-owning Service must be excluded', data => { data.request.registry.find(item => item.level === 'service' && item.seed).seed = false; }, 'SEED_SERVICE'],
  ['request API identity cannot contain query values', data => { data.request.registry.find(item => item.level === 'api').entity_id += '?flag=true'; }, 'REGISTRY_ID'],
  ['gRPC IDs are not silently accepted by an HTTP-only draft profile', data => { data.request.registry.find(item => item.level === 'api').entity_id = 'toy-repository@toy-baseline::consumer::grpc /toy.Service/Method'; }, 'REGISTRY_ID'],
  ['duplicate evidence IDs are not last-wins', data => { data.request.evidence.push(clone(data.request.evidence[0])); }, 'DUPLICATE_EVIDENCE_ID'],
  ['evidence snapshot mismatch is an input error', data => { data.request.evidence[0].snapshot_id = 'toy-other'; }, 'EVIDENCE_BINDING'],
  ['alias without registered evidence is not accepted', data => { data.request.aliases.push({ level: 'method', raw_id: 'toy-alias', canonical_id: method(data).entity_id, evidence_id: 'missing' }); }, 'ALIAS_BINDING'],
  ['alias cannot shadow another canonical ID', data => { data.request.aliases.push({ level: 'method', raw_id: records(data)[1].entity_id, canonical_id: method(data).entity_id, evidence_id: 'TOY-E01' }); }, 'AMBIGUOUS_ALIAS'],
  ['containment edges are not logical Method edges', data => { data.request.path_validation.logical_edges[0].type = 'CONTAINS'; }, 'LOGICAL_EDGE'],
  ['source-only mode cannot secretly claim a supplied graph', data => { data.request.path_validation.kind = 'source_inferred'; }, 'SOURCE_MODE_HAS_GRAPH'],
  ['duplicate level support declarations are refused', data => { data.request.supported_levels.push('method'); }, 'DUPLICATE_INPUT'],
  ['request cannot inject labels or expected impacts', data => { data.request.ground_truth = []; }, 'UNEXPECTED_FIELD'],
];
for (const [name, mutate, expected] of badRequests) test(name, () => {
  const data = syntheticFixture(); mutate(data); const result = check(data);
  assert.equal(result.input_status, 'invalid'); assert.equal(result.validation_status, 'not_checked');
  assert.equal(result.coverage, null); assert.ok(codes(result).includes(expected), JSON.stringify(result.issues));
});

test('malformed JSON values for every request/assessment field yield diagnostics, never crashes', () => {
  for (const value of [null, false, 7, '', [], {}]) {
    assert.doesNotThrow(() => validateSyntheticAttempt(value, value));
    for (const name of Object.keys(syntheticFixture().request)) {
      const data = syntheticFixture(); data.request[name] = clone(value); assert.doesNotThrow(() => check(data), `${name}:${JSON.stringify(value)}`);
    }
    for (const name of Object.keys(method(syntheticFixture()))) {
      const data = syntheticFixture(); method(data)[name] = clone(value); assert.doesNotThrow(() => check(data), `${name}:${JSON.stringify(value)}`);
    }
  }
});
test('failed execution retains its own state, null coverage counts and no successful empty prediction', () => {
  const data = syntheticFixture('failure'), report = check(data);
  assert.equal(report.execution_status, 'failed'); assert.equal(report.validation_status, 'not_checked');
  assert.deepEqual(report.execution_failure, { input_pointer: '/attempt/execution/failure', stage: 'provider', code: 'SYNTHETIC_UNAVAILABLE', http_status: 503 });
  assert.equal(report.coverage.method.state, 'execution_failed'); assert.equal(report.coverage.method.returned_distinct_valid, null);
  assert.ok(report.coverage.method.entities.every(item => item.status === 'execution_failed')); assert.deepEqual(report.records, []);
  data.attempt.payload = syntheticFixture().attempt.payload;
  assert.equal(check(data).validation_status, 'invalid'); assert.ok(codes(check(data)).includes('NONCOMPLETED_PAYLOAD'));
});
test('not_run is not an empty successful result', () => {
  const data = syntheticFixture('failure'); data.attempt.execution.status = 'not_run'; data.attempt.execution.failure = null;
  const report = check(data); assert.equal(report.validation_status, 'not_checked'); assert.equal(report.coverage.api.state, 'not_run');
});
test('all-invalid and globally malformed payloads never receive completed/valid or omission-based coverage', () => {
  for (const mutate of [data => { data.attempt.payload = null; }, data => { data.attempt.payload.summary.citations = []; },
    data => { data.attempt.payload.assessments = [null]; }, data => { data.attempt.payload.accepted = true; }]) {
    const data = syntheticFixture(); mutate(data); const report = check(data);
    assert.equal(report.validation_status, 'invalid'); assert.equal(report.coverage.method.state, 'invalid_run');
    assert.equal(report.coverage.method.not_returned, null);
  }
});
test('model-supplied validation approval and measured usage cannot enter the toy attempt', () => {
  const data = syntheticFixture(); data.attempt.validation = { ground_truth_accepted: true };
  data.attempt.execution.usage = { total_tokens: 0 }; const report = check(data);
  assert.equal(report.validation_status, 'invalid'); assert.ok(codes(report).includes('UNEXPECTED_FIELD'));
  assert.ok(codes(report).includes('SYNTHETIC_EXECUTION')); assert.equal(report.ground_truth_accepted, false);
});
test('summary always needs evidence, even for all-abstention assessments', () => {
  const data = syntheticFixture(); data.attempt.payload.assessments = [pure(data)]; data.attempt.payload.summary.citations = [];
  assert.ok(codes(check(data)).includes('CITATION_COUNT'));
});
test('input without a usable summary quote is a preparation error, never pressure to fabricate citations', () => {
  for (const evidence of [[], [{ id: 'TOY-E01', snapshot_id: 'toy-baseline', text: 'a       b' }],
    [{ id: 'TOY-E01', snapshot_id: 'toy-baseline', text: ('a' + ' '.repeat(2400)).repeat(8) }]]) {
    const data = syntheticFixture(); data.request.evidence = evidence; const report = check(data);
    assert.equal(report.input_status, 'invalid'); assert.equal(report.validation_status, 'not_checked');
    assert.ok(codes(report).includes('NO_CITABLE_EVIDENCE'));
  }
  const data = syntheticFixture(); for (const item of data.request.evidence) item.text = ' '.repeat(2401) + item.text;
  assert.equal(check(data).validation_status, 'valid');
});

test('JSON parser accepts standard nested/escaped Unicode values and LF/CRLF formatting', () => {
  for (const source of ['{"a":[1,{"b":"escaped \\\" text"},null,true]}', '{\r\n"a":1\r\n}', '[]', '42', 'null', '"text"', '{"__proto__":{"x":1}}'])
    assert.deepEqual(parseSyntheticJson(source), JSON.parse(source));
});
test('JSON parser rejects duplicate decoded keys, including Unicode escapes and nested arrays', () => {
  for (const source of ['{"a":1,"a":2}', '{"summary":1,"\\u0073ummary":2}', '{"a":[{"id":1,"id":2}]}'])
    assert.throws(() => parseSyntheticJson(source), error => error.code === 'DUPLICATE_JSON_KEY');
});
test('JSON parser reports escaped JSON-pointer paths without echoing invalid source text', () => {
  assert.throws(() => parseSyntheticJson('{"a/b~c":1,"a/b~c":2}'), error => error.path === '/a~1b~0c');
  assert.throws(() => parseSyntheticJson('SYNTHETIC_PRIVATE_TEXT_DO_NOT_ECHO'), error => error.code === 'JSON_SYNTAX' && !error.message.includes('PRIVATE_TEXT'));
});
test('JSON parser rejects oversized input and excessive nesting', () => {
  assert.throws(() => parseSyntheticJson(' '.repeat(1_048_577)), error => error.code === 'JSON_SIZE');
  assert.throws(() => parseSyntheticJson('['.repeat(66) + '0' + ']'.repeat(66)), error => error.code === 'JSON_DEPTH');
});
test('prototype has no production import/export bridge or I/O in validation core', async () => {
  const core = await readFile(new URL('./validator.mjs', import.meta.url), 'utf8');
  assert.ok(!/from ['"]node:|\bfetch\s*\(|\bprocess\.|writeFile|child_process|spawn\s*\(/.test(core));
  assert.ok(!core.includes('predicted_impacted:')); assert.ok(!core.includes('labels.v3'));
});

test('multiple source mappings to the same handler remain distinct API IDs', () => {
  const data = syntheticFixture(), original = data.request.registry.find(item => item.level === 'api' && !item.seed);
  const second = { ...original, entity_id: original.entity_id.replace('/items/{id}', '/items/by-id/{id}') };
  data.request.registry.push(second); const assessment = clone(api(data)); assessment.entity_id = second.entity_id; records(data).push(assessment);
  const report = check(data); assert.equal(report.validation_status, 'valid'); assert.equal(report.coverage.api.returned_distinct_valid, 2);
});
test('same method name with a distinct overload is never coalesced with an existing Method', () => {
  const data = syntheticFixture(), original = data.request.registry.find(item => item.entity_id === records(data)[1].entity_id);
  const overload = { ...original, entity_id: original.entity_id.replace('(int)', '(String)') }; data.request.registry.push(overload);
  const item = clone(records(data)[1]); item.entity_id = overload.entity_id; records(data).push(item);
  const report = check(data); assert.equal(report.validation_status, 'valid'); assert.equal(report.coverage.method.returned_distinct_valid, 3);
});
test('API path wildcard/variable remain literal mapping IDs, not concrete request URLs', () => {
  const data = syntheticFixture(), entity = data.request.registry.find(item => item.level === 'api' && !item.seed);
  entity.entity_id = entity.entity_id.replace('/items/{id}', '/items/**'); api(data).entity_id = entity.entity_id;
  assert.equal(check(data).validation_status, 'valid'); api(data).entity_id = entity.entity_id.replace('**', '123');
  assert.ok(codes(check(data)).includes('OUT_OF_SCOPE_ID'));
});
test('three-hop witness is accepted without claiming minimum-hop or whole-Service behavior', () => {
  const data = syntheticFixture(), helper = data.request.registry.find(item => item.entity_id === records(data)[1].entity_id);
  data.request.path_validation.logical_edges.push({ caller: helper.entity_id, callee: api(data).dependency_path[0], type: 'CALLS' });
  const item = records(data)[1]; Object.assign(item, { dependency_status: 'reachable',
    dependency_path: [helper.entity_id, ...api(data).dependency_path], logical_hops: 3, service_boundary_crossings: 1 });
  assert.equal(check(data).validation_status, 'valid');
});
test('execution shape mutations are diagnostic and cannot become successful empty predictions', () => {
  for (const value of [null, [], {}, false, 7]) {
    const data = syntheticFixture(); data.attempt.execution = value;
    const report = check(data); assert.equal(report.validation_status, 'invalid'); assert.notEqual(report.execution_status, 'completed');
  }
  const data = syntheticFixture(); data.attempt.execution.actual_remote_calls = 1;
  assert.ok(codes(check(data)).includes('SYNTHETIC_EXECUTION'));
});
test('failure diagnostics retain the pointer/code but do not copy arbitrary failure messages', () => {
  const data = syntheticFixture('failure'); data.attempt.execution.failure.message = 'SYNTHETIC_PRIVATE_TEXT_DO_NOT_ECHO';
  const report = check(data); assert.equal(report.execution_failure.code, 'SYNTHETIC_UNAVAILABLE');
  assert.ok(!JSON.stringify(report).includes('PRIVATE_TEXT_DO_NOT_ECHO'));
});
test('request and record array limits produce errors without truncating to favorable records', () => {
  const data = syntheticFixture(); data.attempt.payload.assessments = Array(1001).fill(method(data));
  assert.equal(check(data).validation_status, 'invalid'); assert.ok(codes(check(data)).includes('ARRAY_REQUIRED'));
  data.request.registry = Array(1001).fill(data.request.registry[0]); assert.equal(check(data).input_status, 'invalid');
});
test('JSON duplicate guard agrees with native parsing on deterministic generated standard JSON', () => {
  let state = 731;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state; };
  const atoms = ['quote"slash\\', 'a/b~c', 'Tiếng Việt', '\r\n\t', '', null, true, false, 2.5, -12];
  function value(depth) {
    const choose = random() % (depth ? 3 : 1);
    if (choose === 0) return atoms[random() % atoms.length];
    if (choose === 1) return Array.from({ length: random() % 5 }, () => value(depth - 1));
    return Object.fromEntries(Array.from({ length: random() % 5 }, (_, index) => [String(index) + atoms[random() % 5], value(depth - 1)]));
  }
  for (let index = 0; index < 200; index++) {
    const source = JSON.stringify(value(5), null, index % 3); assert.deepEqual(parseSyntheticJson(source), JSON.parse(source));
  }
});
