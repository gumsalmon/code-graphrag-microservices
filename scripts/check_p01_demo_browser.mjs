import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createDemoServer } from '../demo/p01/server.mjs';
import { once } from 'node:events';
import reasoningCore from '../demo/p01/reasoning-core.js';
import { randomUUID } from 'node:crypto';
import { parseDataAsset } from './run_p01_reasoning.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--response-file')) {
  throw new Error('Usage: node scripts/check_p01_demo_browser.mjs [--response-file PATH_TO_RESPONSE_JSON]');
}
// Optional local import test, never an API call or proof of provider identity.
const responseFile = args.length ? resolve(args[1]) : null;
const require = createRequire(import.meta.url);
const modulePath = process.env.P01_PLAYWRIGHT_MODULE || resolve(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(modulePath); }
const executablePath = process.env.P01_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const out = resolve(repo, 'handoff-out/p01-demo-qa-20261012', new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8));
await mkdir(out, { recursive: true });
const server = createDemoServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
const url = 'http://127.0.0.1:' + server.address().port;
const report = { url, output_directory: out, created_utc: new Date().toISOString(), checks: [], browser_errors: [], external_requests: [], screenshots: [] };
let browser;
const check = (name, assertion) => { assertion(); report.checks.push(name); };
const screenshot = async (page, name) => {
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: resolve(out, name), fullPage: true });
  report.screenshots.push(name);
};
const listen = page => {
  page.setDefaultTimeout(5000);
  page.on('pageerror', error => report.browser_errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.browser_errors.push(message.text()); });
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== url) report.external_requests.push(request.url()); });
};
try {
  browser = await playwright.chromium.launch({ executablePath, headless: true });
  report.browser_version = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(); listen(page);
  await page.goto(url);
  check('no fatal error on load', () => assert.equal(report.browser_errors.length, 0));
  assert.equal(await page.locator('#fatal-error').isVisible(), false);
  assert.equal(await page.locator('[data-node]').count(), 5);
  assert.equal(await page.locator('#candidate-count').innerText(), '2');
  await screenshot(page, 'graph-desktop.png');
  const edge = page.locator('[data-edge="0"]');
  await edge.focus(); await edge.press('Enter');
  assert.equal(await page.locator('#inspector-title').innerText(), 'INVOKES_API');
  assert.ok((await page.locator('#inspector-body').innerText()).includes('includeDetails'));
  await page.locator('.evidence-button').filter({ hasText: 'VisitResource.java' }).click();
  assert.ok((await page.locator('#source-caption').innerText()).includes('72–76'));
  await page.locator('[data-edge="1"] text').first().click();
  assert.equal(await page.locator('#inspector-title').innerText(), 'CALLS');
  await edge.locator('text').first().click();
  assert.equal(await page.locator('#inspector-title').innerText(), 'INVOKES_API');
  report.checks.push('edge keyboard selection, contract details and provider source evidence');
  await page.locator('[data-snapshot="baseline"]').click();
  assert.equal(await page.locator('#snapshot-state').innerText(), 'CONTRACT PHÙ HỢP');
  assert.ok((await page.locator('#inspector-body').innerText()).includes('Tham số còn thiếu\nKhông'));
  await page.locator('[data-snapshot="mutated"]').click();
  assert.ok((await page.locator('#snapshot-state').innerText()).includes('includeDetails'));
  report.checks.push('baseline/mutated snapshot toggles actual contracts');
  await page.locator('#show-all').uncheck();
  assert.equal(await page.locator('[data-node]').count(), 3);
  await page.locator('#show-all').check();
  assert.equal(await page.locator('[data-node]').count(), 5);
  await page.locator('[data-node]').filter({ hasText: 'read(int)' }).click();
  assert.ok((await page.locator('#inspector-body').innerText()).includes('Không tự suy ra nhãn'));
  report.checks.push('outside-query nodes toggle and overload distinction');
  await page.locator('#trace-button').click();
  await page.waitForFunction(() => !document.getElementById('trace-button').disabled);
  assert.equal(await page.locator('#inspector-title').innerText(), 'ApiGatewayController');
  report.checks.push('recorded seed-to-caller traversal animation');
  await page.locator('[data-page="change"]').click();
  assert.equal(await page.locator('.contract-cell').count(), 3);
  assert.ok((await page.locator('#patch-code').innerText()).includes('required=true'));
  await screenshot(page, 'change-desktop.png');
  const patchDownloadPromise = page.waitForEvent('download'); await page.locator('#download-patch').click();
  const patchDownload = await patchDownloadPromise;
  const patchBytes = await readFile(await patchDownload.path());
  assert.equal(createHash('sha256').update(patchBytes).digest('hex'), await page.evaluate(() => window.P01_DEMO_DATA.artifacts['technical-patch'].sha256));
  report.checks.push('patch view and byte-exact LF patch download');
  await page.locator('[data-page="runtime"]').click();
  assert.equal(await page.locator('[data-request]').count(), 7);
  assert.ok((await page.locator('[data-request="mutated_gateway"]').innerText()).includes('200\t0'));
  await page.locator('[data-request="mutated_direct_missing_parameter"] button').click();
  assert.ok((await page.locator('#runtime-detail').innerText()).includes('không quy thành 0'));
  await page.locator('[data-request="mutated_gateway"] button').click();
  assert.ok((await page.locator('#runtime-detail').innerText()).includes('"visits": []'));
  await screenshot(page, 'runtime-desktop.png');
  const runtimeDownloadPromise = page.waitForEvent('download'); await page.locator('#download-runtime').click();
  const runtimeDownload = await runtimeDownloadPromise;
  const runtimeBytes = await readFile(await runtimeDownload.path());
  assert.equal(createHash('sha256').update(runtimeBytes).digest('hex'), await page.evaluate(() => window.P01_DEMO_DATA.artifacts['runtime-requests'].sha256));
  await page.locator('#view-fallback').click();
  assert.ok((await page.locator('#source-code .highlight').allTextContents()).some(line => line.includes('new Visits(List.of())')));
  report.checks.push('7 HTTP records, absent-count distinction, original JSONL download and real fallback source');
  await page.locator('[data-page="provenance"]').click();
  assert.equal(await page.locator('.artifact-row').count(), 27);
  assert.ok((await page.locator('#provenance-body').innerText()).includes('TCP relay'));
  assert.ok((await page.locator('#provenance-body').innerText()).includes('pending_review'));
  await screenshot(page, 'provenance-desktop.png');
  report.checks.push('provenance, artifacts, environment limitations and review warning');
  await page.locator('[data-page="reasoning"]').click();
  await page.waitForFunction(() => document.getElementById('reasoning-status').textContent.includes('SẴN SÀNG'));
  assert.ok((await page.locator('#reasoning-result').innerText()).includes('Chưa có phản hồi'));
  await screenshot(page, 'reasoning-desktop.png');
  const reasoningDownloadPromise = page.waitForEvent('download'); await page.locator('#download-reasoning-request').click();
  const reasoningDownload = await reasoningDownloadPromise;
  const preparedRequest = JSON.parse(await readFile(await reasoningDownload.path(), 'utf8'));
  await reasoningCore.verifyRequest(preparedRequest);
  const nodeRequest = await reasoningCore.buildContext(parseDataAsset(await readFile(resolve(repo, 'demo/p01/data.js'), 'utf8')));
  assert.equal(preparedRequest.request_sha256, nodeRequest.request_sha256);
  assert.equal(preparedRequest.model, null); assert.equal(preparedRequest.context.limits.runtime_available, false);
  report.checks.push('offline reasoning request download matches prompt/schema/context hashes and has no chosen model');
  await page.locator('#reasoning-mode').selectOption('source_only');
  await page.waitForFunction(() => document.getElementById('reasoning-context-json').textContent.includes('"mode": "source_only"'));
  const sourceContext = JSON.parse(await page.locator('#reasoning-context-json').textContent());
  assert.equal(Object.hasOwn(sourceContext, 'graph'), false);
  await page.locator('#reasoning-mode').selectOption('graph_assisted');
  await page.locator('#reasoning-depth').selectOption('1');
  await page.waitForFunction(() => JSON.parse(document.getElementById('reasoning-context-json').textContent || '{}').limits?.max_logical_hops === 1);
  assert.equal(JSON.parse(await page.locator('#reasoning-context-json').textContent()).graph.candidate_paths.length, 1);
  await page.locator('#reasoning-depth').selectOption('2');
  await page.locator('#reasoning-budget').fill('1024'); await page.locator('#reasoning-budget').press('Tab');
  await page.waitForFunction(() => !document.getElementById('reasoning-error').hidden);
  assert.ok((await page.locator('#reasoning-error').innerText()).includes('no silent truncation'));
  assert.equal(await page.locator('#download-reasoning-request').isDisabled(), true);
  await page.locator('#reasoning-budget').fill('32768'); await page.locator('#reasoning-budget').press('Tab');
  await page.waitForFunction(() => !document.getElementById('download-reasoning-request').disabled);
  report.checks.push('reasoning controls: graph/source-only, hop depth and fail-closed byte budget');
  await page.locator('#reasoning-response-file').setInputFiles({ name: 'invalid-test-fixture.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await page.waitForFunction(() => document.getElementById('reasoning-result').textContent.includes('bị từ chối'));
  assert.equal(await page.locator('#download-reasoning-validation').isVisible(), false);
  report.checks.push('invalid imported response cannot create a validated-result download');
  // Synthetic response ONLY for UI validation tests; never saved as model/research evidence.
  const pathFixture = preparedRequest.context.graph.candidate_paths[0];
  const sourceFixture = preparedRequest.context.evidence.find(item => item.file?.endsWith('/VisitsServiceClient.java') && item.kind === 'source');
  const quoteFixture = sourceFixture.text.split('\n').find(line => line.includes('getVisitsForPets(')).trim();
  const responseFixture = { summary: { text: 'Synthetic UI fixture; not real LLM output.', citations: [{ evidence_id: sourceFixture.id, quote: quoteFixture }] },
    method_predictions: [{ method_id: pathFixture.method_id, dependency_status: 'reachable', dependency_path: pathFixture.method_path,
      logical_hops: 1, service_boundary_crossings: 1, behavioral_impact: 'unknown', requires_code_change: 'unknown',
      rationale: '<img src="https://example.invalid/leak" onerror="window.fixtureLeak=true"> This is literal test data.', citations: [{ evidence_id: sourceFixture.id, quote: quoteFixture }] }],
    uncertainties: ['Synthetic UI fixture, no provider or semantic correctness verified.'] };
  await page.locator('#reasoning-response-file').setInputFiles({ name: 'synthetic-ui-test-fixture.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(responseFixture)) });
  await page.waitForFunction(() => !document.getElementById('download-reasoning-validation').hidden);
  assert.ok((await page.locator('#reasoning-result').innerText()).includes('KHÔNG XÁC MINH PROVIDER/MODEL'));
  assert.equal(await page.locator('#reasoning-result img').count(), 0);
  assert.equal(await page.evaluate(() => window.fixtureLeak === true), false);
  await page.locator('#reasoning-result .evidence-button').first().click();
  assert.equal(await page.locator('[data-snapshot="baseline"]').getAttribute('aria-pressed'), 'true');
  assert.ok((await page.locator('#source-caption').innerText()).includes('42–42'));
  await page.locator('[data-page="reasoning"]').click();
  await page.locator('#reasoning-mode').selectOption('source_only');
  await page.waitForFunction(() => document.getElementById('reasoning-result').textContent.includes('Chưa có phản hồi'));
  assert.equal(await page.locator('#download-reasoning-validation').isVisible(), false);
  report.checks.push('synthetic imported response: escaped markup, unverified-provider notice, baseline source citation and context-change invalidation');
  if (responseFile) {
    const responseBytes = await readFile(responseFile);
    const importedResponse = JSON.parse(responseBytes.toString('utf8'));
    const expectedValidation = await reasoningCore.validateResponse(importedResponse, preparedRequest);
    await page.locator('#reasoning-mode').selectOption('graph_assisted');
    await page.waitForFunction(() => JSON.parse(document.getElementById('reasoning-context-json').textContent || '{}').mode === 'graph_assisted');
    await page.locator('#reasoning-response-file').setInputFiles(responseFile);
    await page.waitForFunction(() => !document.getElementById('download-reasoning-validation').hidden);
    assert.equal(await page.locator('.prediction-card').count(), expectedValidation.method_predictions.length);
    assert.deepEqual(await page.locator('.prediction-card .mono').allTextContents(), expectedValidation.method_predictions.map(item => item.method_id));
    assert.ok((await page.locator('#reasoning-result').innerText()).includes(importedResponse.summary.text));
    assert.ok((await page.locator('#reasoning-result').innerText()).includes('KHÔNG XÁC MINH PROVIDER/MODEL'));
    const validationDownloadPromise = page.waitForEvent('download');
    await page.locator('#download-reasoning-validation').click();
    const validationDownload = await validationDownloadPromise;
    assert.deepEqual(JSON.parse(await readFile(await validationDownload.path(), 'utf8')), expectedValidation);
    await screenshot(page, 'reasoning-imported-response-desktop.png');
    const sourceCitation = [...expectedValidation.summary.citations, ...expectedValidation.method_predictions.flatMap(item => item.citations)].find(item => item.kind === 'source');
    if (sourceCitation) {
      await page.locator('#reasoning-result .evidence-button').filter({ hasText: sourceCitation.evidence_id + ' ·' }).first().click();
      assert.equal(await page.locator('[data-snapshot="baseline"]').getAttribute('aria-pressed'), 'true');
      assert.ok((await page.locator('#source-caption').innerText()).includes(sourceCitation.line_start + '–' + sourceCitation.line_end));
      await page.locator('[data-page="reasoning"]').click();
    }
    report.imported_response = { file: responseFile, sha256: createHash('sha256').update(responseBytes).digest('hex'),
      method_predictions: importedResponse.method_predictions.length, provider_identity_verified_by_browser: false,
      semantic_correctness_verified: false, remote_calls: 0 };
    report.checks.push('optional local response import: exact method IDs, summary, validation download and baseline source citation; provider remains unverified in viewer');
  }
  for (const name of ['graph', 'change', 'reasoning', 'runtime', 'provenance']) {
    await page.locator('[data-page="' + name + '"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Desktop overflow: ' + name);
  }
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
  const mobile = await mobileContext.newPage(); listen(mobile); await mobile.goto(url);
  for (const name of ['graph', 'change', 'reasoning', 'runtime', 'provenance']) {
    await mobile.locator('[data-page="' + name + '"]').click();
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile overflow: ' + name);
    await screenshot(mobile, name + '-mobile.png');
  }
  await mobile.locator('[data-page="graph"]').click();
  await mobile.locator('[data-snapshot="baseline"]').click();
  assert.equal(await mobile.locator('#snapshot-state').innerText(), 'CONTRACT PHÙ HỢP');
  await mobile.evaluate(() => { document.querySelector('.graph-canvas').scrollLeft = 1000; });
  await mobile.locator('[data-node]').filter({ hasText: 'VisitResource' }).click();
  assert.equal(await mobile.locator('#inspector-title').innerText(), 'VisitResource');
  report.checks.push('390px mobile: 5 pages without page overflow, snapshot and graph taps');
  const offline = await context.newPage(); listen(offline);
  await offline.goto(pathToFileURL(resolve(repo, 'demo/p01/index.html')).href);
  assert.equal(await offline.locator('#fatal-error').isVisible(), false);
  assert.equal(await offline.locator('[data-node]').count(), 5);
  await offline.locator('[data-page="runtime"]').click();
  assert.equal(await offline.locator('[data-request]').count(), 7);
  await offline.locator('[data-page="reasoning"]').click();
  await offline.waitForFunction(() => document.getElementById('reasoning-status').textContent.includes('SẴN SÀNG'));
  assert.equal(await offline.locator('#download-reasoning-request').isDisabled(), false);
  report.checks.push('file:// opens original demo and prepares reasoning context without a server or Docker');
  const missing = await context.newPage();
  await missing.route('**/data.js', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '// intentionally missing test fixture' }));
  await missing.goto(url);
  assert.equal(await missing.locator('#fatal-error').isVisible(), true);
  assert.ok((await missing.locator('#fatal-error').innerText()).includes('Thiếu bundle'));
  await missing.close();
  report.checks.push('missing bundle shows a clear error rather than invented demo data');
  assert.deepEqual(report.browser_errors, []);
  assert.deepEqual(report.external_requests, []);
  report.checks.push('no browser errors or external requests');
  report.status = 'pass';
} catch (error) {
  report.status = 'fail'; report.error = error.stack; process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
  await writeFile(resolve(out, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
