// Offline byte/source/isolation audit; no Docker/HTTP/model or ground-truth generation.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyBuild, verifyManifest } from './run_p03_baseline.mjs';
import { readPairedInputs } from './run_p03_paired.mjs';
import { ROOT, json, treeHashes } from './run_p02_f03.mjs';
import { SERVICES } from './run_p02_baseline.mjs';
import { ensure, sha256, canonical } from '../pipeline/p03/preparation.mjs';
import { LABEL, JAVA_IMAGE, validateSourceDelta } from '../pipeline/p03/paired.mjs';
import { validateSupport } from '../pipeline/p02/f03-supplemental-audit.mjs';
export async function checkPaired(directory) {
  directory = resolve(directory); const integrity = await verifyManifest(directory, ['groups', 'mutated-build']);
  const input = await json(resolve(directory, 'inputs.json')), data = await readPairedInputs(input.candidate_directory);
  ensure(input.input_locked && input.authorization_sha256 === data.decision_sha256 &&
    sha256(await readFile(resolve(directory, 'authorization.json'))) === data.decision_sha256, 'Different authority');
  ensure((await json(resolve(directory, 'preservation.json'))).protected_inputs_unchanged &&
    canonical(await json(resolve(directory, 'protected-before.json'))) === canonical(await json(resolve(directory, 'protected-after.json'))), 'Protected evidence changed');
  const plan = await json(resolve(directory, 'plan.json')), result = await json(resolve(directory, 'result.json'));
  ensure(plan.groups.length === 4 && plan.input_locked && plan.planned_fixture_slots === 48 && plan.measurement_version === 2 &&
    plan.readiness_policy === 'lifecycle_health_and_registry_not_business_response', 'Wrong paired plan/readiness policy');
  if (!input.runtime_requested) { ensure(!result.runtime_executed && result.groups_completed === 0, 'Offline plan claims runtime'); return { ...integrity, runtime_executed: false }; }
  const baseline = await verifyBuild(input.baseline_directory), mutatedDirectory = resolve(directory, 'mutated-build');
  await verifyManifest(mutatedDirectory, ['source', 'patch-git']); const mutated = await json(resolve(mutatedDirectory, 'build.json'));
  ensure(mutated.baseline_build_sha256 === input.baseline_build_sha256 && sha256(await readFile(resolve(baseline.directory, 'build.json'))) === input.baseline_build_sha256 &&
    mutated.authorization_sha256 === data.decision_sha256 && (await json(resolve(mutatedDirectory, 'cleanup.json'))).complete, 'Mutated build binding/cleanup differs');
  const before = await json(resolve(mutatedDirectory, 'source-before.json')), after = await json(resolve(mutatedDirectory, 'source-after-build.json'));
  validateSourceDelta(before, after); ensure(canonical(after) === canonical(await treeHashes(resolve(mutatedDirectory, 'source'))), 'Mutated source changed after build');
  ensure(sha256(await readFile(resolve(mutatedDirectory, mutated.customers_jar.file))) === mutated.customers_jar.sha256, 'Changed mutated JAR');
  const containerIds = new Set(), networkIds = new Set(), effectiveConfigs = {}, overrides = {};
  for (const group of plan.groups) {
    const root = resolve(directory, 'groups', group.id); await verifyManifest(root);
    const identities = await json(resolve(root, 'identities.json')), network = JSON.parse(await readFile(resolve(root, 'network-identity.stdout.log'), 'utf8'));
    ensure(network.internal && network.labels[LABEL] === group.owner && !networkIds.has(network.id), 'Network identity/reuse'); networkIds.add(network.id);
    ensure((await json(resolve(root, 'cleanup.json'))).complete, 'Group cleanup incomplete');
    ensure(canonical(await treeHashes(resolve(root, 'config'))) === canonical(await treeHashes(resolve(baseline.directory, 'config'))), 'Config bytes changed');
    for (const service of SERVICES) {
      const identity = identities[service];
      ensure(identity.labels[LABEL] === group.owner && identity.image === JAVA_IMAGE && !containerIds.has(identity.id) &&
        !Object.keys(identity.ports ?? {}).length && identity.mounts.every(m => m.Type !== 'volume'), 'Application isolation/reuse differs'); containerIds.add(identity.id);
      const jar = identity.mounts.filter(m => m.Destination === '/p02.jar');
      const expected = group.snapshot === 'mutated' && service === 'customers-service' ? resolve(mutatedDirectory, mutated.customers_jar.file) : resolve(baseline.directory, baseline.build.jars[service].file);
      ensure(jar.length === 1 && !jar[0].RW && resolve(jar[0].Source) === expected, 'Wrong/mutable snapshot JAR');
      const args = (await json(resolve(root, 'start-' + service + '.command.json'))).args;
      ensure(args.includes('--pull') && args[args.indexOf('--pull') + 1] === 'never' && !args.includes('--publish'), 'Unsafe startup');
      const override = canonical(args.slice(args.indexOf('-jar') - 2));
      if (overrides[service]) ensure(overrides[service] === override, 'Runtime overrides differ'); else overrides[service] = override;
      ensure((await json(resolve(root, 'logs/' + service + '.exit.json'))).code === 0, 'Missing app logs');
    }
    const support = {};
    for (const name of ['config-visits', 'config-customers', 'config-gateway', 'discovery-registry']) {
      const raw = await readFile(resolve(root, 'setup', name + '.body')), meta = await json(resolve(root, 'setup', name + '.json'));
      ensure(meta.status === 200 && meta.error === null && meta.body_sha256 === sha256(raw), 'Support binding'); support[name] = JSON.parse(raw);
      if (name !== 'discovery-registry') {
        const value = canonical(support[name]); if (effectiveConfigs[name]) ensure(value === effectiveConfigs[name], 'Effective config differs'); else effectiveConfigs[name] = value;
      }
    }
    validateSupport(data.fixture, support);
    for (const service of ['customers-service', 'visits-service', 'api-gateway']) {
      const readiness = await json(resolve(root, 'ready-' + service + '/readiness.json'));
      ensure(readiness.measurement_version === 2 && readiness.path === '/actuator/health' &&
        readiness.business_response_shape_used_as_readiness === false, 'Business-response readiness leaked into measurement');
    }
    const registered = await json(resolve(root, 'ready-registry/readiness.json'));
    ensure(registered.target === 'registered' && registered.measurement_version === 2, 'Missing independent registry readiness');
    const observations = await json(resolve(root, 'observations/paired-observations.json'));
    ensure(observations.snapshot === group.snapshot && observations.slots.length === 12 && observations.all_requests.length === 17 &&
      observations.reset_seed_owners === 10 && observations.reset_seed_pets === 13 && !observations.labels_created, 'Fixture/reset/annotation state differs');
  }
  ensure(result.runtime_executed && result.groups_completed === 4 && result.fixture_slots === 48 && !result.labels_created && result.model_calls === 0, 'Run completion state differs');
  return { ...integrity, runtime_executed: true, groups: 4, unique_app_containers: containerIds.size, fresh_networks: networkIds.size,
    fixture_slots: 48, config_and_consumer_bindings_verified: true, labels_created: false, model_calls: 0 };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { ensure(process.argv.length === 4 && process.argv[2] === '--run', 'Usage: --run PRIVATE_PAIRED_RUN'); console.log(JSON.stringify(await checkPaired(process.argv[3]), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
