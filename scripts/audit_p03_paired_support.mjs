// Recheck all six support GETs per group against raw bytes and pinned fixture.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { json, write } from './run_p02_f03.mjs';
import { canonical, sha256, ensure } from '../pipeline/p03/preparation.mjs';

const [run, output] = process.argv.slice(2);
ensure(run && output && process.argv.length === 4, 'Usage: RUN_DIRECTORY NEW_OUTPUT_DIRECTORY');
const input = await json(resolve(run, 'inputs.json'));
const fixture = await json(resolve(input.candidate_directory, 'spec/fixture.candidate.v1.json'));
const expected = fixture.seed_visits.map(v => [v.id, v.pet_id, v.date, v.description]).sort((a, b) => a[0] - b[0]);
const paths = {
  'config-visits': '/visits-service/docker', 'config-customers': '/customers-service/docker',
  'config-gateway': '/api-gateway/docker', 'discovery-registry': '/eureka/apps',
  'pet7-before': '/owners/6/pets/7/visits', 'pet8-before': '/owners/6/pets/8/visits'
};
const groups = [];
for (const group of (await json(resolve(run, 'plan.json'))).groups) {
  const directory = resolve(run, 'groups', group.id, 'setup'), bodies = {}, records = [];
  for (const [name, path] of Object.entries(paths)) {
    const meta = await json(resolve(directory, name + '.json'));
    const raw = await readFile(resolve(directory, name + '.body'));
    ensure(meta.id === name && meta.method === 'GET' && meta.path === path && meta.status === 200 && meta.error === null &&
      meta.body_file === name + '.body' && meta.body_bytes === raw.length && meta.body_sha256 === sha256(raw), 'Support raw binding: ' + group.id + '/' + name);
    bodies[name] = JSON.parse(raw);
    records.push({ id: name, method: meta.method, path, status: meta.status, body_sha256: meta.body_sha256 });
  }
  const actual = [...bodies['pet7-before'], ...bodies['pet8-before']]
    .map(v => [v.id, v.petId, v.date, v.description]).sort((a, b) => a[0] - b[0]);
  const setup = await json(resolve(directory, 'setup.json'));
  ensure(canonical(actual) === canonical(expected) && canonical(setup.seed_visit_tuples) === canonical(expected) &&
    setup.fresh_seed_only && setup.support_requests === 6 && setup.real_registry_up, 'Visit/reset support differs');
  groups.push({ id: group.id, requests: records, raw_seed_visit_tuples: actual });
}
ensure(groups.length === 4, 'Expected four groups');
await write(output, 'SUPPORT_RAW_AUDIT.json', { scope: 'raw support GET byte/metadata and seed visit tuple verification',
  supersedes_count_only_summary: 'SUPPORT_SUMMARY.json', groups, support_requests_verified: 24, labels_created: false, model_calls: 0 });
console.log(JSON.stringify({ groups: groups.length, support_requests_verified: 24, seed_visits_per_group: expected.length, labels_created: false }));
