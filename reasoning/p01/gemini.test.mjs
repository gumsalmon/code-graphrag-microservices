import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import core from '../../demo/p01/reasoning-core.js';
import { parseDataAsset } from '../../scripts/run_p01_reasoning.mjs';
import { buildGeminiRequest, parseGeminiResponse, callGemini, GEMINI_MODEL, GEMINI_ENDPOINT, GeminiRunError } from './gemini-adapter.mjs';
import { loadGeminiKey } from './gemini-key.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const request = await core.buildContext(parseDataAsset(await readFile(resolve(root, 'demo/p01/data.js'), 'utf8')));
const fixtureKey = 'fake-gemini-key-for-tests-only';
const options = { apiKey: fixtureKey, confirmSend: true, confirmFreeTier: true };

// Synthetic JSON/usage only for transport tests; never persisted as a model result.
function predictionFixture() {
  const source = request.context.evidence.find(item => item.kind === 'source' && item.file.endsWith('/VisitsServiceClient.java'));
  const quote = source.text.split('\n').find(line => line.includes('getVisitsForPets(')).trim();
  return { summary: { text: 'Synthetic Gemini transport fixture, not a real prediction.', citations: [{ evidence_id: source.id, quote }] },
    method_predictions: [], uncertainties: ['No real Gemini call in this fixture.'] };
}
function responseFixture(prediction = predictionFixture()) {
  return { modelVersion: GEMINI_MODEL, responseId: 'synthetic-response-id',
    candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: JSON.stringify(prediction) }] } }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, thoughtsTokenCount: 5, totalTokenCount: 35 } };
}
const transport = raw => async () => new Response(JSON.stringify(raw), { status: 200 });

test('Gemini keeps the exact approved model and fixed credential-free endpoint', () => {
  assert.equal(GEMINI_MODEL, 'gemini-3.8-flash');
  assert.equal(GEMINI_ENDPOINT, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
  assert.throws(() => buildGeminiRequest(request, { model: 'gemini-2.5-flash' }), /approved/);
  assert.ok(!GEMINI_ENDPOINT.includes('?key='));
});

test('REST payload uses current responseFormat JSON schema and documented thinking config, no deprecated sampling parameters', () => {
  const payload = buildGeminiRequest(request);
  assert.equal(payload.generationConfig.responseFormat.text.mimeType, 'APPLICATION_JSON');
  assert.equal(payload.generationConfig.maxOutputTokens, 8192);
  assert.deepEqual(payload.generationConfig.thinkingConfig, { thinkingLevel: 'MEDIUM', includeThoughts: false });
  for (const field of ['temperature', 'topP', 'topK', 'candidateCount', 'responseMimeType', 'responseJsonSchema']) assert.equal(Object.hasOwn(payload.generationConfig, field), false);
  assert.equal(Object.hasOwn(payload, 'tools'), false); assert.equal(Object.hasOwn(payload, 'cachedContent'), false);
});

test('provider translation does not change context/system prompt or original output schema', () => {
  const before = core.canonical(request);
  const payload = buildGeminiRequest(request);
  assert.equal(payload.systemInstruction.parts[0].text, request.system_prompt);
  assert.equal(payload.contents[0].parts[0].text, core.canonical(request.context));
  assert.equal(core.canonical(request), before);
  assert.ok(!JSON.stringify(payload.generationConfig.responseFormat.text.schema).includes('$ref'));
  assert.equal(payload.generationConfig.responseFormat.text.schema.properties.summary.additionalProperties, false);
  assert.equal(payload.generationConfig.responseFormat.text.schema.properties.method_predictions.items.properties.method_id.enum.length, 4);
});

test('all allowed thinking levels are explicit; minimal and bad token caps fail before network', () => {
  for (const level of ['low', 'medium', 'high']) assert.equal(buildGeminiRequest(request, { thinkingLevel: level }).generationConfig.thinkingConfig.thinkingLevel, level.toUpperCase());
  assert.throws(() => buildGeminiRequest(request, { thinkingLevel: 'minimal' }), /supports low\/medium\/high/);
  for (const cap of [0, 20000, 1.2]) assert.throws(() => buildGeminiRequest(request, { maxOutputTokens: cap }), /token limit/);
});

test('no network without send consent, Free Tier confirmation, a key and verified request', async () => {
  let calls = 0; const fetchImpl = async () => { calls++; throw new Error('must not run'); };
  await assert.rejects(callGemini(request, { fetchImpl }), /confirmation to send/);
  await assert.rejects(callGemini(request, { confirmSend: true, fetchImpl }), /Free Tier/);
  await assert.rejects(callGemini(request, { confirmSend: true, confirmFreeTier: true, fetchImpl }), /key locally/);
  const changed = structuredClone(request); changed.context_bytes++;
  await assert.rejects(callGemini(changed, { ...options, fetchImpl }), /checksum mismatch/);
  assert.equal(calls, 0);
});

test('credential is header-only; payload/provenance/endpoint contain no key', async () => {
  let calls = 0;
  const result = await callGemini(request, { ...options, fetchImpl: async (url, init) => {
    calls++; assert.equal(url, GEMINI_ENDPOINT); assert.equal(init.headers['x-goog-api-key'], fixtureKey);
    assert.ok(!init.body.includes(fixtureKey)); assert.equal(init.redirect, 'error');
    return new Response(JSON.stringify(responseFixture()), { status: 200 });
  } });
  assert.equal(calls, 1); assert.equal(result.provenance.remote_calls, 1); assert.equal(result.provenance.retry_count, 0);
  assert.ok(!JSON.stringify(result).includes(fixtureKey));
  assert.equal(result.validated.semantic_correctness_verified, false);
});

test('non-ASCII, control characters and masked keys fail before any provider call without leaking input', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw new Error('must not run'); };
  for (const key of ['synthetic-\u00e1-key', 'synthetic-\u2022-key', 'synthetic\nkey', '***', '']) {
    await assert.rejects(callGemini(request, { ...options, apiKey: key, fetchImpl }), error =>
      error.code === 'configuration' && error.details.remote_calls === 0 && (key === '' || !error.message.includes(key)));
  }
  assert.equal(calls, 0);
});

test('provider usage and returned model are recorded, not fabricated billing guarantees', async () => {
  const result = await callGemini(request, { ...options, fetchImpl: transport(responseFixture()) });
  assert.deepEqual(result.provenance.usage, { promptTokenCount: 10, candidatesTokenCount: 20, thoughtsTokenCount: 5, totalTokenCount: 35 });
  assert.equal(result.provenance.returned_model, GEMINI_MODEL);
  assert.equal(result.provenance.estimated_cost, null);
  assert.equal(result.provenance.billing_tier, 'free_tier_user_confirmed_not_api_verified');
  const raw = responseFixture(); delete raw.modelVersion; delete raw.usageMetadata;
  const missing = await callGemini(request, { ...options, fetchImpl: transport(raw) });
  assert.equal(missing.provenance.returned_model, null); assert.equal(missing.provenance.usage, null);
});

test('a different returned model fails and preserves safe provider evidence without a prediction', async () => {
  const raw = responseFixture(); raw.modelVersion = 'gemini-3.5-flash';
  await assert.rejects(callGemini(request, { ...options, fetchImpl: transport(raw) }), error =>
    error.code === 'model_mismatch' && error.details.raw.modelVersion === 'gemini-3.5-flash' && !Object.hasOwn(error.details, 'validated'));
});

test('split final text can be assembled; provider thought text never becomes prediction text', () => {
  const raw = responseFixture(); const text = raw.candidates[0].content.parts[0].text;
  raw.candidates[0].content.parts = [{ thought: true, text: 'Synthetic thought fixture; not model evidence.' },
    { text: text.slice(0, 20) }, { text: text.slice(20), thoughtSignature: 'synthetic-signature' }];
  assert.deepEqual(parseGeminiResponse(raw), predictionFixture());
});

test('MAX_TOKENS, safety refusal, recitation and abnormal completion fail closed', () => {
  for (const reason of ['MAX_TOKENS', 'SAFETY', 'RECITATION', 'UNEXPECTED_TOOL_CALL', undefined]) {
    const raw = responseFixture(); raw.candidates[0].finishReason = reason;
    assert.throws(() => parseGeminiResponse(raw), /did not finish normally/);
  }
  const blocked = responseFixture(); blocked.promptFeedback = { blockReason: 'SAFETY' };
  assert.throws(() => parseGeminiResponse(blocked), /blocked/);
  const candidate = responseFixture(); candidate.candidates[0].safetyRatings = [{ blocked: true }];
  assert.throws(() => parseGeminiResponse(candidate), /blocked/);
});

test('missing/multiple candidates, wrong role, empty output and tool calls are rejected', () => {
  for (const candidates of [[], undefined, [responseFixture().candidates[0], responseFixture().candidates[0]]]) {
    const raw = responseFixture(); raw.candidates = candidates;
    assert.throws(() => parseGeminiResponse(raw), /exactly one/);
  }
  const wrong = responseFixture(); wrong.candidates[0].content.role = 'user';
  assert.throws(() => parseGeminiResponse(wrong), /model content/);
  const empty = responseFixture(); empty.candidates[0].content.parts = [{ thought: true, text: 'fixture' }];
  assert.throws(() => parseGeminiResponse(empty), /no final JSON/);
  const tool = responseFixture(); tool.candidates[0].content.parts = [{ functionCall: { name: 'delete', args: {} } }];
  assert.throws(() => parseGeminiResponse(tool), /nothing is executed/);
});

test('invalid JSON is not repaired and invalid IDs/quotes fail the common validator', async () => {
  const json = responseFixture(); json.candidates[0].content.parts[0].text = '```json\n{}\n```';
  assert.throws(() => parseGeminiResponse(json), /not JSON/);
  const prediction = predictionFixture(); prediction.summary.citations[0].quote = 'invented source content';
  await assert.rejects(callGemini(request, { ...options, fetchImpl: transport(responseFixture(prediction)) }), error =>
    error.code === 'validation' && error.details.provider_response_preserved === true && Boolean(error.details.raw));
});

test('truncated provider response remains evidence, not an accepted prediction', async () => {
  const raw = responseFixture(); raw.candidates[0].finishReason = 'MAX_TOKENS';
  await assert.rejects(callGemini(request, { ...options, fetchImpl: transport(raw) }), error =>
    error.code === 'incomplete' && error.details.finish_reason === 'MAX_TOKENS' && Boolean(error.details.payload) && Boolean(error.details.raw));
});

test('HTTP 400/401/403/404/429 and network errors do not retry or expose echoed credentials', async () => {
  for (const status of [400, 401, 403, 404, 429]) {
    let calls = 0;
    await assert.rejects(callGemini(request, { ...options, fetchImpl: async () => {
      calls++; return new Response('secret echo ' + fixtureKey, { status });
    } }), error => error.details.http_status === status && !JSON.stringify(error.details).includes(fixtureKey));
    assert.equal(calls, 1);
  }
  await assert.rejects(callGemini(request, { ...options, fetchImpl: async () => { throw new Error(fixtureKey); } }), error =>
    error.code === 'network' && error.details.remote_receipt_known === false && !error.message.includes(fixtureKey));
});

test('HTTP diagnostics preserve safe bounded provider errors, never echoed credentials or fallback predictions', async () => {
  const body = { error: { code: 400, status: 'INVALID_ARGUMENT', message: 'Synthetic invalid enum fixture, not a live API result.' } };
  await assert.rejects(callGemini(request, { ...options, fetchImpl: async () => new Response(JSON.stringify(body), { status: 400 }) }), error => {
    assert.deepEqual(error.details.provider_error, body.error);
    assert.equal(error.details.payload.generationConfig.responseFormat.text.mimeType, 'APPLICATION_JSON');
    assert.equal(error.details.remote_calls, 1);
    assert.equal(error.details.retry_count, 0);
    assert.ok(Number.isInteger(error.details.elapsed_ms));
    assert.equal(Object.hasOwn(error.details, 'prediction'), false);
    return error.code === 'http';
  });
  for (const text of [JSON.stringify({ error: { message: fixtureKey } }),
    '{"error":{"message":"' + fixtureKey.replace('f', '\\u0066') + '"}}',
    JSON.stringify({ error: { message: 'x'.repeat(64 * 1024) } }), 'not JSON']) {
    await assert.rejects(callGemini(request, { ...options, fetchImpl: async () => new Response(text, { status: 400 }) }), error =>
      error.code === 'http' && error.details.provider_error === null && !JSON.stringify(error.details).includes(fixtureKey));
  }
});

test('oversized, malformed and credential-echoed success bodies never enter persisted raw evidence', async () => {
  for (const text of ['invalid JSON', 'x'.repeat(2 * 1024 * 1024 + 1), JSON.stringify({ echo: fixtureKey }), '{"echo":"' + fixtureKey.replace('f', '\\u0066') + '"}']) {
    await assert.rejects(callGemini(request, { ...options, fetchImpl: async () => new Response(text, { status: 200 }) }), error =>
      error.code === 'response_read' && !Object.hasOwn(error.details, 'raw') && !JSON.stringify(error.details).includes(fixtureKey));
  }
});

test('key loader uses an explicit environment key, detects conflicts and never reads encrypted fallback unnecessarily', async () => {
  let reads = 0;
  const readCredential = async () => { reads++; throw new Error('not used'); };
  assert.deepEqual(await loadGeminiKey({ env: { GEMINI_API_KEY: fixtureKey }, readCredential }), { key: fixtureKey, source: 'environment:GEMINI_API_KEY' });
  assert.equal((await loadGeminiKey({ env: { GOOGLE_API_KEY: fixtureKey }, readCredential })).source, 'environment:GOOGLE_API_KEY');
  await assert.rejects(loadGeminiKey({ env: { GEMINI_API_KEY: fixtureKey, GOOGLE_API_KEY: 'different-key' }, readCredential }), /choose one/);
  assert.equal(reads, 0);
});

test('key loader reports missing key, sanitizes decryption failures and requires Windows for DPAPI files', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'p01-gemini-key-test-'));
  const path = resolve(directory, 'synthetic-credential.clixml');
  try {
    const missing = await loadGeminiKey({ env: {}, credentialFile: path }); assert.equal(missing.key, null);
    await writeFile(path, '<synthetic test credential, not a key>');
    const loaded = await loadGeminiKey({ env: {}, platform: 'win32', credentialFile: path, readCredential: async () => fixtureKey });
    assert.equal(loaded.key, fixtureKey); assert.equal(loaded.source, 'windows_dpapi_local_file');
    await assert.rejects(loadGeminiKey({ env: {}, platform: 'linux', credentialFile: path }), /same Windows user/);
    await assert.rejects(loadGeminiKey({ env: {}, platform: 'win32', credentialFile: path, readCredential: async () => { throw new Error(fixtureKey); } }),
      error => !error.message.includes(fixtureKey) && error.message.includes('safely'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('key loader rejects malformed environment and saved values without revealing them', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'p01-gemini-key-format-test-'));
  const path = resolve(directory, 'synthetic-credential.clixml');
  try {
    await writeFile(path, '<synthetic test credential, not a key>');
    for (const key of ['synthetic-\u00e1-key', 'synthetic-\u2022-key', 'synthetic\nkey', '***']) {
      const rejectsSafely = error => error.message.includes('invalid characters') && !error.message.includes(key);
      await assert.rejects(loadGeminiKey({ env: { GEMINI_API_KEY: key } }), rejectsSafely);
      await assert.rejects(loadGeminiKey({ env: {}, platform: 'win32', credentialFile: path, readCredential: async () => key }), rejectsSafely);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('Windows SecureString CLIXML round trip encrypts a synthetic value without exposing plaintext', { skip: process.platform !== 'win32' }, () => {
  // No credential file or genuine key: exercise the same Windows serialization primitive in memory.
  const script = `$ErrorActionPreference='Stop';
    Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1') -ErrorAction Stop;
    Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Utility/Microsoft.PowerShell.Utility.psd1') -ErrorAction Stop;
    $geminiTestText='synthetic-dpapi-test-not-an-api-key';
    $geminiTestSecure=ConvertTo-SecureString $geminiTestText -AsPlainText -Force;
    $geminiTestXml=[System.Management.Automation.PSSerializer]::Serialize($geminiTestSecure);
    $geminiTestRestored=[System.Management.Automation.PSSerializer]::Deserialize($geminiTestXml);
    $geminiTestPointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($geminiTestRestored);
    try { $geminiTestSame=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($geminiTestPointer) -ceq $geminiTestText }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($geminiTestPointer) }
    @{roundtrip=$geminiTestSame;plaintext_in_xml=$geminiTestXml.Contains($geminiTestText)} | ConvertTo-Json -Compress`;
  const result = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
    { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 }));
  assert.equal(result.roundtrip, true); assert.equal(result.plaintext_in_xml, false);
});
