import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOptions, buildArguments, serviceArguments, verifyBuildRun, SERVICES } from '../../scripts/run_p02_baseline.mjs';

test('runtime CLI requires explicit input paths and refuses mutation/scoring/provider/options', () => {
  assert.equal(parseOptions(['build', '--source', 'source', '--config', 'config', '--maven-home', 'maven', '--maven-repository', 'repo']).action, 'build');
  assert.equal(parseOptions(['baseline', '--build-run', 'build', '--preparation', 'prep']).action, 'baseline');
  for (const args of [['mutated'], ['score'], ['baseline'], ['baseline', '--build-run', 'x', '--preparation', 'y', '--force'],
    ['baseline', '--build-run', 'x', '--build-run', 'y', '--preparation', 'z'], ['build', '--provider', 'gemini']]) assert.throws(() => parseOptions(args));
});
test('build uses offline Maven, no network, read-only cache/distro and neutral settings, no implicit tests or downloads', () => {
  const args = buildArguments({ name: 'p02-test', runId: 'test', source: '/run/source', mavenHome: '/cache/maven', repository: '/cache/repo', javaImage: 'sha256:' + 'a'.repeat(64) });
  assert.equal(args[args.indexOf('--network') + 1], 'none');
  assert.equal(args[args.indexOf('--pull') + 1], 'never');
  assert.ok(args.includes('-o'));
  assert.ok(args.includes('-Dmaven.test.skip=true'));
  assert.ok(args.includes('type=bind,source=/cache/repo,target=/maven-repository,readonly'));
  assert.ok(args.includes('type=bind,source=/cache/maven,target=/opt/maven,readonly'));
  assert.equal(args[args.indexOf('--settings') + 1], '/settings.xml');
  assert.equal(args[args.indexOf('--global-settings') + 1], '/settings.xml');
  assert.ok(!args.some(arg => /GEMINI|OPENAI|docker\.sock|--publish/.test(arg)));
});
test('runtime services use rebuilt mounted JARs, no published ports, immutable filesystem and no credentials', () => {
  for (const service of SERVICES) {
    const args = serviceArguments({ name: 'p02-test-' + service, runId: 'test', network: 'p02-private', service, javaImage: 'sha256:' + 'a'.repeat(64), jar: '/build/' + service + '.jar', config: '/config-pin' });
    assert.ok(args.includes('--read-only'));
    assert.ok(args.includes('type=bind,source=/build/' + service + '.jar,target=/p02.jar,readonly'));
    assert.ok(args.includes('/p02.jar'));
    assert.ok(!args.some(arg => /--publish|docker\.sock|GEMINI|OPENAI/.test(arg)));
    assert.ok(args.includes('--management.tracing.enabled=false'));
    if (service === 'config-server') {
      assert.ok(args.includes('--spring.profiles.active=native'));
      assert.ok(args.includes('type=bind,source=/config-pin,target=/config,readonly'));
    } else assert.ok(args.includes('--spring.config.import=configserver:http://config-server:8888'));
  }
});
test('unknown/GenAI service cannot be started through service argument construction', () => {
  for (const service of ['genai-service', 'admin-server', 'unknown']) assert.throws(() => serviceArguments({ service }), /Unknown service/);
});
test('baseline cannot read arbitrary build paths as evidence', async () => {
  await assert.rejects(verifyBuildRun('.'), /private P02 build root/);
});
