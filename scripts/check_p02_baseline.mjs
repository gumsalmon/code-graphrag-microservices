// Read-only artifact verification. Never starts a stack or turns observations into impact labels.
import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { verifyBuildRun } from './run_p02_baseline.mjs';
import { verifyP02Preparation } from './prepare_p02_inputs.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRIVATE = resolve(ROOT, 'handoff-out/p02-baseline');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (ok, message) => { if (!ok) throw new Error(message); };
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sourcePin = '3858f9c630cf989bb6809a86edf47c2be78dc9f1', configPin = '323993ce2519c6d02df63e08bf4458d123d3b611';
const TARGETS = { visits: ['visits-service', 8082], gateway: ['api-gateway', 8080], config: ['config-server', 8888], discovery: ['discovery-server', 8761] };

export function validateBaselineClaims(fixture, bodies, summary, result) {
  check(summary.status === 'baseline_fixture_ready' && result.status === 'baseline_feasibility_verified_not_paired_runtime' &&
    summary.post_executed === false && summary.full_matrix_executed === false && summary.mutated_executed === false && summary.impact_labels_created === false &&
    result.post_executed === false && result.full_matrix_executed === false && result.mutated_executed === false && result.universe_locked === false && result.labels_created === false &&
    result.model_calls === 0 && summary.remote_model_calls === 0, 'Baseline cannot approve mutation, labels, test or scoring');
  const ordered = rows => rows.sort((a, b) => a[0] - b[0]);
  const expected = ordered(fixture.seed_visits.map(row => [row.id, row.pet_id, row.date, row.description]));
  const actual = ordered((bodies.direct_omitted?.items ?? []).map(row => [row.id, row.petId, row.date, row.description]));
  check(equal(actual, expected), 'Baseline direct fixture differs from pinned SQL');
  const gateway = bodies.gateway_populated, empty = bodies.gateway_empty;
  check(gateway?.id === 6 && equal(gateway.pets.map(pet => pet.id).sort((a, b) => a - b), [7, 8]) &&
    gateway.pets.reduce((sum, pet) => sum + pet.visits.length, 0) === 4, 'Gateway setup lost populated data or returned fallback');
  check(equal(ordered(gateway.pets.flatMap(pet => pet.visits.map(row => [row.id, row.petId, row.date, row.description]))), expected) &&
    gateway.pets.every(pet => pet.visits.every(row => row.petId === pet.id)), 'Gateway visit content or per-pet assignment differs from SQL');
  check(empty?.id === 1 && equal(empty.pets.map(pet => pet.id), [1]) && empty.pets.every(pet => pet.visits.length === 0), 'Empty control wrong owner/pet/data');
  const properties = Object.assign({}, ...[...(bodies['config-visits']?.propertySources ?? [])].reverse().map(item => item.source));
  check(properties['spring.sql.init.data-locations'] === 'classpath*:db/hsqldb/data.sql' &&
    properties['spring.sql.init.schema-locations'] === 'classpath*:db/hsqldb/schema.sql', 'Runtime config is not pinned HSQLDB fixture setup');
  const applications = bodies['discovery-registry']?.applications?.application;
  check(Array.isArray(applications) && ['CUSTOMERS-SERVICE', 'VISITS-SERVICE', 'API-GATEWAY'].every(name => applications.some(app => {
    const instances = Array.isArray(app.instance) ? app.instance : [app.instance];
    return app.name === name && instances.some(instance => instance?.status === 'UP');
  })), 'Real consumer/provider service registrations not established');
  check(Object.values(summary.setup_assertions).every(value => value === true) && Object.values(result.setup_assertions).every(value => value === true), 'Unverified setup assertion');
  return { fixture_visits: actual.length, gateway_visits: gateway.pets.reduce((sum, pet) => sum + pet.visits.length, 0), independent_review: false, impact_labels_created: false };
}

export async function verifyBaseline(runDirectory) {
  const directory = resolve(runDirectory);
  check(directory.startsWith(PRIVATE + sep) && (await realpath(directory)).startsWith(await realpath(PRIVATE) + sep), 'Run must be inside private P02 baseline root');
  const seen = new Set();
  for (const line of (await readFile(resolve(directory, 'checksums.sha256'), 'utf8')).trim().split('\n')) {
    const match = /^([a-f0-9]{64})  ([A-Za-z0-9_./-]+)$/.exec(line);
    check(match && !match[2].split('/').includes('..') && !match[2].startsWith('/') && !seen.has(match[2]), 'Unsafe/duplicate baseline checksum entry');
    seen.add(match[2]); const file = resolve(directory, match[2]);
    check(!(await lstat(file)).isSymbolicLink() && await realpath(file) === file && hash(await readFile(file)) === match[1], 'Baseline bytes changed');
  }
  const actualFiles = [];
  async function visit(prefix = '') { for (const entry of await readdir(resolve(directory, prefix), { withFileTypes: true })) {
    check(!entry.isSymbolicLink(), 'Symlink evidence rejected'); const path = prefix + entry.name;
    if (entry.isDirectory()) await visit(path + '/'); else if (entry.name !== 'checksums.sha256') actualFiles.push(path);
  } } await visit();
  check(equal(actualFiles.sort(), [...seen].sort()) && !seen.has('failure.json'), 'Unmanifested/incomplete/failed baseline run');
  const json = async name => JSON.parse(await readFile(resolve(directory, name), 'utf8'));
  const inputs = await json('inputs.json'), result = await json('result.json'), summary = await json('observations/observations.json');
  check(inputs.source_commit === sourcePin && inputs.config_commit === configPin && inputs.mutated_execution === false && inputs.full_matrix_authorized_or_executed === false &&
    inputs.independent_universe_confirmation_received === false && inputs.model_calls === 0, 'Invalid baseline input scope');
  const build = await verifyBuildRun(inputs.build_directory), preparation = await verifyP02Preparation(inputs.preparation_directory);
  check(hash(await readFile(resolve(build.directory, 'build.json'))) === inputs.build_metadata_sha256 &&
    inputs.java_image === build.build.java_image && equal(inputs.jars, build.build.jars) && inputs.fixture_sha256 === preparation.fixture_sha256, 'Baseline/build/preparation lineage differs');
  const fixture = JSON.parse(await readFile(resolve(preparation.directory, 'spec/fixture.json'), 'utf8'));
  const requests = [...fixture.requests.filter(item => item.method === 'GET'),
    { id: 'config-visits', target: 'config', path: '/visits-service/docker' },
    { id: 'config-customers', target: 'config', path: '/customers-service/docker' },
    { id: 'config-gateway', target: 'config', path: '/api-gateway/docker' },
    { id: 'discovery-registry', target: 'discovery', path: '/eureka/apps' }];
  const bodies = {}, statuses = {};
  for (const request of requests) {
    const record = await json('observations/' + request.id + '.json');
    check(record.id === request.id && record.method === 'GET' && record.path === request.path && record.host === TARGETS[request.target][0] &&
      record.port === TARGETS[request.target][1] && record.error === null && record.body_file === request.id + '.body' && record.redirects_followed === false &&
      Number.isInteger(record.status) && record.status >= 100 && record.status <= 599, 'Invalid HTTP observation');
    const bytes = await readFile(resolve(directory, 'observations', record.body_file));
    check(hash(bytes) === record.body_sha256 && bytes.length === record.body_bytes && summary.status_by_request[request.id] === record.status, 'HTTP body/status differs from raw observation');
    statuses[request.id] = record.status; bodies[request.id] = JSON.parse(bytes.toString('utf8'));
  }
  for (const request of ['direct_omitted', 'gateway_populated', 'gateway_empty', 'config-visits', 'config-customers', 'config-gateway', 'discovery-registry'])
    check(statuses[request] === 200, 'Setup prerequisite was not HTTP 200');
  const verifiedClaims = validateBaselineClaims(fixture, bodies, summary, result);
  const cleanup = await json('cleanup.json');
  check(cleanup.network_removed === true && cleanup.containers.every(item => item.name.startsWith('p02-' + inputs.run_id.toLowerCase() + '-') &&
    (item.removed === true || item.already_absent === true)), 'Incomplete/non-owned cleanup');
  check(result.run_id === inputs.run_id && summary.fixture_requests_observed === 9 && summary.support_requests_observed === 4, 'Wrong baseline count/identity');
  return { directory, status: 'verified_baseline_only_not_paired_not_labeled', manifest_files: seen.size, build_manifest_files: build.manifest_files,
    fixture_requests: 9, support_requests: 4, ...verifiedClaims, full_matrix_executed: false, mutated_executed: false, model_calls: 0 };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    check(process.argv.length === 4 && process.argv[2] === '--run', 'Usage: --run PRIVATE_BASELINE_RUN');
    console.log(JSON.stringify(await verifyBaseline(process.argv[3]), null, 2));
  } catch (error) { console.error('P02 baseline verification failed: ' + error.message); process.exitCode = 1; }
}
