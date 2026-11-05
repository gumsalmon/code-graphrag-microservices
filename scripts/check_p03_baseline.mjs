// Read-only consistency check; no Docker, HTTP, predictions, labels or scoring.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyManifest, verifyBuild } from './run_p03_baseline.mjs';
import { SERVICES } from './run_p02_baseline.mjs';
import { verifyP03Candidate } from './prepare_p03_inputs.mjs';
import { ROOT, filesUnder, json, treeHashes } from './run_p02_f03.mjs';
import { ensure, sha256, canonical } from '../pipeline/p03/preparation.mjs';
import { LABEL, JAVA_IMAGE, validateAuthorization } from '../pipeline/p03/baseline.mjs';
import { validateSupport } from '../pipeline/p02/f03-supplemental-audit.mjs';

export async function checkBaseline(runDirectory) {
  const directory = resolve(runDirectory), integrity = await verifyManifest(directory, ['groups']);
  const plan = await json(resolve(directory, 'plan.json')), input = await json(resolve(directory, 'inputs.json'));
  const authorization = await json(resolve(directory, 'authorization.json'));
  const candidate = await verifyP03Candidate(input.candidate_directory);
  const fixtureBytes = await readFile(resolve(candidate.directory, 'spec/fixture.candidate.v1.json')), fixture = JSON.parse(fixtureBytes);
  validateAuthorization(authorization, candidate, fixtureBytes);
  ensure(sha256(await readFile(resolve(directory, 'authorization.json'))) === input.authorization_sha256, 'Authorization hash differs');
  ensure(plan.groups.length === 2 && plan.groups.every(g => g.snapshot === 'baseline') && plan.input_locked === false, 'Not a baseline-only plan');
  ensure((await json(resolve(directory, 'preservation.json'))).protected_inputs_unchanged &&
    canonical(await json(resolve(directory, 'protected-before.json'))) === canonical(await json(resolve(directory, 'protected-after.json'))), 'Protected state differs');
  const result = await json(resolve(directory, 'result.json'));
  if (!input.runtime_requested) {
    ensure(result.runtime_executed === false && result.groups_completed === 0, 'Offline plan claims runtime');
    return { status: 'offline_baseline_plan_verified', ...integrity, runtime_executed: false };
  }
  const baseline = await verifyBuild(input.build_directory);
  ensure(sha256(await readFile(resolve(baseline.directory, 'build.json'))) === input.build_metadata_sha256 &&
    canonical(input.jars) === canonical(baseline.build.jars), 'Baseline build binding differs');
  const allIds = new Set(), networkIds = new Set(), configRecords = [], groups = [];
  for (const group of plan.groups) {
    const root = resolve(directory, 'groups', group.id); await verifyManifest(root);
    const identities = await json(resolve(root, 'identities.json')), observations = await json(resolve(root, 'observations/observations.json'));
    const network = JSON.parse(await readFile(resolve(root, 'network-identity.stdout.log'), 'utf8'));
    ensure(network.internal === true && network.labels[LABEL] === group.owner && !networkIds.has(network.id), 'Network isolation/reuse failure'); networkIds.add(network.id);
    ensure((await json(resolve(root, 'cleanup.json'))).complete, 'Incomplete group cleanup');
    for (const service of SERVICES) {
      const identity = identities[service];
      ensure(identity.image === JAVA_IMAGE && identity.labels[LABEL] === group.owner && !allIds.has(identity.id) &&
        !Object.keys(identity.ports ?? {}).length && identity.mounts.every(m => m.Type !== 'volume'), 'Application identity/isolation/reuse failure');
      allIds.add(identity.id);
      const jar = identity.mounts.filter(m => m.Destination === '/p02.jar');
      ensure(jar.length === 1 && jar[0].RW === false && resolve(jar[0].Source) === resolve(baseline.directory, baseline.build.jars[service].file), 'Wrong/mutable baseline JAR mount');
      ensure((await readFile(resolve(root, 'logs/' + service + '.exit.json'), 'utf8')).includes('"code": 0'), 'Missing application logs');
      const args = (await json(resolve(root, 'start-' + service + '.command.json'))).args;
      ensure(args.includes('--pull') && args[args.indexOf('--pull') + 1] === 'never' && !args.includes('--publish'), 'Unsafe startup args');
    }
    ensure(canonical(await treeHashes(resolve(root, 'config'))) === canonical(await treeHashes(resolve(baseline.directory, 'config'))), 'Effective native config files changed');
    const supportBodies = {};
    for (const name of ['config-visits', 'config-customers', 'config-gateway', 'discovery-registry']) {
      const meta = await json(resolve(root, 'setup', name + '.json')), raw = await readFile(resolve(root, 'setup', name + '.body'));
      ensure(meta.status === 200 && meta.error === null && meta.body_sha256 === sha256(raw), 'Invalid support raw'); supportBodies[name] = JSON.parse(raw);
    }
    validateSupport(fixture, supportBodies);
    configRecords.push(Object.fromEntries(['config-visits', 'config-customers', 'config-gateway'].map(name => [name, supportBodies[name]])));
    ensure(observations.status === 'baseline_fixture_verified' && observations.slots.length === 12 && observations.all_requests.length === 17 &&
      observations.reset_seed_owners === 10 && observations.reset_seed_pets === 13 && observations.mutated_executed === false, 'Wrong fixture/reset counts');
    ensure(canonical(observations.slots.map(row => row.id)) === canonical(fixture.requests.map(row => row.id)), 'Different fixture order');
    const rawBodies = {}, records = {};
    for (const ledger of observations.all_requests) {
      const meta = await json(resolve(root, 'observations', ledger.id + '.json')), raw = await readFile(resolve(root, 'observations', ledger.id + '.body'));
      ensure(meta.error === null && meta.status === ledger.status && meta.path === ledger.path && meta.method === ledger.method &&
        sha256(raw) === meta.body_sha256 && raw.length === meta.body_bytes && meta.body_file === ledger.id + '.body', 'Raw binding ' + group.id + ':' + ledger.id);
      if (meta.request_body_file) {
        const body = await readFile(resolve(root, 'observations', meta.request_body_file));
        ensure(sha256(body) === meta.request_body_sha256 && body.length === meta.request_body_bytes, 'Request body binding');
      }
      rawBodies[ledger.id] = raw; records[ledger.id] = meta;
    }
    const parse = name => JSON.parse(rawBodies[name]);
    const emptyId = observations.bindings.empty_owner_id, writeId = observations.bindings.write_owner_id;
    ensure(Number.isInteger(emptyId) && Number.isInteger(writeId) && emptyId !== writeId &&
      !fixture.seed_owner_ids.includes(emptyId) && !fixture.seed_owner_ids.includes(writeId), 'Write IDs were not new');
    const seed = parse('seed_owner_list');
    ensure(seed.length === 10 && canonical(seed.map(o => o.id).sort((a,b) => a-b)) === canonical(fixture.seed_owner_ids), 'Reset did not restore original owners');
    ensure(records.setup_empty_owner.status === 201 && parse('setup_empty_owner').id === emptyId &&
      parse('setup_empty_owner').pets.length === 0 && canonical(parse('setup_empty_owner')) === canonical(parse('setup_empty_readback')), 'Setup/readback not proven');
    for (const id of ['direct_populated', 'direct_no_visits', 'direct_empty_pets']) {
      const o = parse(id); ensure(records[id].status === 200 && Object.keys(o).sort().join(',') === 'address,city,firstName,id,lastName,pets,telephone' &&
        !Object.hasOwn(o, 'animals'), 'Mutation or incomplete Owner in baseline');
    }
    const gateway = parse('gateway_populated');
    ensure(records.gateway_populated.status === 200 && gateway.id === 6 && gateway.pets.reduce((n,p) => n+p.visits.length,0) === 4, 'Gateway fixture not populated');
    ensure(parse('direct_empty_pets').id === emptyId && parse('direct_empty_pets').pets.length === 0 &&
      parse('gateway_empty_pets').pets.length === 0, 'Empty fixture lost');
    ensure(canonical(parse('owner_list_control')) === canonical([...seed, parse('setup_empty_owner')]), 'List control changed beyond setup owner');
    ensure(records.create_control.status === 201 && parse('create_control').id === writeId && canonical(parse('create_control')) === canonical(parse('create_readback')),
      'Create/readback evidence differs');
    const updated = parse('update_readback'), expected = fixture.requests.find(r => r.id === 'update_control').body;
    ensure(records.update_control.method === 'PUT' && records.update_control.path === '/owners/' + writeId &&
      records.update_control.status === 204 && rawBodies.update_control.length === 0 && canonical(updated) === canonical({ id: writeId, pets: [], ...expected }), 'PUT/readback evidence differs');
    const expectedFiles = new Set(observations.all_requests.flatMap(row => [row.id+'.json', row.id+'.body',
      ...(records[row.id].request_body_file ? [records[row.id].request_body_file] : [])]));
    for (const file of await filesUnder(resolve(root, 'observations'))) ensure(expectedFiles.has(file) || /^ledger-\d\d.json$/.test(file) || file === 'observations.json', 'Unexpected raw observation file');
    groups.push({ id: group.id, fixture_slots: 12, primary_and_setup_requests: 17, reset_verified: true,
      observed_empty_owner_id: emptyId, observed_write_owner_id: writeId, missing_owner: observations.missing_owner_observations });
  }
  ensure(allIds.size === 10 && networkIds.size === 2 && canonical(configRecords[0]) === canonical(configRecords[1]), 'Group reset/config invariance differs');
  ensure(result.runtime_executed === true && result.groups_completed === 2 && result.source_mutated === false && result.fixture_slots === 24 && result.input_locked === false, 'Incomplete/overstated root result');
  return { status: 'baseline_records_verified_not_paired_impact', ...integrity, groups, unique_application_instances: allIds.size,
    effective_config_equal: true, mutated_executed: false, input_locked: false, labels_created: false, model_calls: 0 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    ensure(process.argv.length === 4 && process.argv[2] === '--run', 'Usage: --run P03_BASELINE_RUN');
    console.log(JSON.stringify(await checkBaseline(process.argv[3]), null, 2));
  } catch (error) { console.error('P03 baseline check failed: ' + error.message); process.exitCode = 1; }
}
