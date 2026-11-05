import core from '../../demo/p01/reasoning-core.js';

export const GEMINI_MODEL = 'gemini-3.8-flash';
export const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';

export class GeminiRunError extends Error {
  constructor(code, message, details = {}) { super(message); this.name = 'GeminiRunError'; this.code = code; this.details = details; }
}

export function buildGeminiRequest(request, { model = GEMINI_MODEL, maxOutputTokens = 8192, thinkingLevel = 'medium' } = {}) {
  if (model !== GEMINI_MODEL) throw new GeminiRunError('configuration', 'Only the approved gemini-3.8-flash model is enabled; no automatic substitution');
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 256 || maxOutputTokens > 16384) throw new GeminiRunError('configuration', 'Invalid Gemini output token limit');
  if (!['low', 'medium', 'high'].includes(thinkingLevel)) throw new GeminiRunError('configuration', 'Gemini 3.8 Flash supports low/medium/high thinking; minimal is not enabled');
  const schema = structuredClone(request.output_schema);
  // Inline our single non-recursive citation definition; preserve the same output contract.
  const inline = value => {
    if (Array.isArray(value)) return value.map(inline);
    if (!value || typeof value !== 'object') return value;
    if (value.$ref) {
      if (value.$ref !== '#/$defs/citation' || Object.keys(value).length !== 1) throw new GeminiRunError('schema', 'Unsupported schema reference');
      return inline(schema.$defs.citation);
    }
    return Object.fromEntries(Object.entries(value).filter(([name]) => name !== '$defs').map(([name, item]) => [name, inline(item)]));
  };
  const outputSchema = inline(schema);
  outputSchema.properties.method_predictions.items.properties.method_id.enum = request.context.method_universe
    .map(node => node.method_id).filter(id => id !== request.context.change.seed_id);
  return {
    systemInstruction: { parts: [{ text: request.system_prompt }] },
    contents: [{ role: 'user', parts: [{ text: core.canonical(request.context) }] }],
    generationConfig: {
      maxOutputTokens,
      thinkingConfig: { thinkingLevel: thinkingLevel.toUpperCase(), includeThoughts: false },
      // TextResponseFormat uses an enum, unlike the legacy responseMimeType.
      // Confirmed against the service's REST v1beta discovery schema.
      responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema: outputSchema } },
    },
  };
}

export function parseGeminiResponse(response) {
  if (!response || typeof response !== 'object' || response.error) throw new GeminiRunError('provider_error', 'Gemini returned a provider error; no prediction accepted');
  if (response.promptFeedback?.blockReason && response.promptFeedback.blockReason !== 'BLOCK_REASON_UNSPECIFIED') throw new GeminiRunError('blocked', 'Gemini blocked the prompt; no prediction accepted');
  if (!Array.isArray(response.candidates) || response.candidates.length !== 1) throw new GeminiRunError('candidate_count', 'Expected exactly one Gemini candidate');
  const candidate = response.candidates[0];
  if (candidate.safetyRatings?.some(rating => rating.blocked === true)) throw new GeminiRunError('blocked', 'Gemini candidate was blocked; no prediction accepted');
  if (candidate.finishReason !== 'STOP') throw new GeminiRunError('incomplete', 'Gemini did not finish normally; no truncated/blocked prediction accepted',
    { finish_reason: typeof candidate.finishReason === 'string' && /^[A-Z_]{1,60}$/.test(candidate.finishReason) ? candidate.finishReason : 'unknown' });
  if (candidate.content?.role !== 'model' || !Array.isArray(candidate.content.parts)) throw new GeminiRunError('content', 'Gemini response has no model content');
  const parts = candidate.content.parts;
  if (parts.some(part => Object.keys(part).some(key => !['text', 'thought', 'thoughtSignature'].includes(key)))) throw new GeminiRunError('unexpected_part', 'Gemini returned a non-text/tool part; nothing is executed');
  const texts = parts.filter(part => part.thought !== true).map(part => part.text);
  if (!texts.length || texts.some(text => typeof text !== 'string') || !texts.join('').trim()) throw new GeminiRunError('empty_output', 'Gemini returned no final JSON text');
  try { return JSON.parse(texts.join('')); } catch { throw new GeminiRunError('invalid_json', 'Gemini final output is not JSON; no repair or fallback'); }
}

async function readSafeProviderJson(response, apiKey, maxBytes) {
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error('response limit'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (text.includes(apiKey)) throw new Error('credential echo');
  const raw = JSON.parse(text);
  if (JSON.stringify(raw).includes(apiKey)) throw new Error('decoded credential echo');
  return raw;
}

export async function callGemini(request, { model = GEMINI_MODEL, apiKey, confirmSend = false, confirmFreeTier = false,
  maxOutputTokens = 8192, thinkingLevel = 'medium', timeoutMs = 60000, fetchImpl = globalThis.fetch } = {}) {
  await core.verifyRequest(request);
  if (confirmSend !== true) throw new GeminiRunError('configuration', 'Explicit confirmation to send this filtered context is required', { remote_calls: 0 });
  if (confirmFreeTier !== true) throw new GeminiRunError('configuration', 'Confirm the key belongs to a Free Tier project; the API cannot verify billing tier for you', { remote_calls: 0 });
  if (typeof apiKey !== 'string' || apiKey.length > 4096 || !/^[\x21-\x7e]+$/.test(apiKey) || /^\*+$/.test(apiKey)) throw new GeminiRunError('configuration', 'Configure a valid Gemini key locally; never paste it into chat or bundle', { remote_calls: 0 });
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) throw new GeminiRunError('configuration', 'Invalid Gemini timeout', { remote_calls: 0 });
  const payload = buildGeminiRequest(request, { model, maxOutputTokens, thinkingLevel });
  const started = performance.now();
  const telemetry = { provider: 'gemini_generate_content', endpoint: GEMINI_ENDPOINT, requested_model: model,
    api_revision: 'v1beta', generation_config: payload.generationConfig, elapsed_ms: null,
    retry_count: 0, remote_calls: 1, billing_tier: 'free_tier_user_confirmed_not_api_verified', estimated_cost: null };
  let response;
  try {
    response = await fetchImpl(GEMINI_ENDPOINT, { method: 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs) });
  } catch { throw new GeminiRunError('network', 'Gemini network error/timeout; no retry or fallback', { ...telemetry, remote_receipt_known: false }); }
  if (!response.ok) {
    let providerError = null;
    try {
      const body = await readSafeProviderJson(response, apiKey, 64 * 1024);
      if (body?.error && typeof body.error === 'object') {
        providerError = {
          code: Number.isInteger(body.error.code) ? body.error.code : null,
          status: typeof body.error.status === 'string' && /^[A-Z_]{1,80}$/.test(body.error.status) ? body.error.status : null,
          message: typeof body.error.message === 'string' ? body.error.message.slice(0, 2048) : null,
        };
      }
    } catch { /* Unreadable, oversized or secret-echoed diagnostics are withheld. */ }
    await response.body?.cancel().catch(() => {});
    throw new GeminiRunError('http', 'Gemini HTTP ' + response.status + '; check key, model access or Free Tier quota; no retry',
      { ...telemetry, elapsed_ms: Math.round(performance.now() - started), http_status: response.status,
        remote_receipt_known: true, provider_error: providerError, payload });
  }
  let raw;
  try {
    // Even an unexpectedly echoed key must not enter evidence files or error messages.
    raw = await readSafeProviderJson(response, apiKey, 2 * 1024 * 1024);
  } catch { throw new GeminiRunError('response_read', 'Gemini response could not be read safely within limits', { ...telemetry, http_status: response.status }); }
  const provenance = { ...telemetry, elapsed_ms: Math.round(performance.now() - started),
    returned_model: typeof raw.modelVersion === 'string' ? raw.modelVersion : null,
    provider_response_id: typeof raw.responseId === 'string' ? raw.responseId : null,
    usage: raw.usageMetadata ?? null, finish_reason: raw.candidates?.[0]?.finishReason ?? null };
  // Return raw evidence even when local validation fails, without accepting a prediction.
  try {
    if (raw.modelVersion !== undefined && (typeof raw.modelVersion !== 'string' || !/^(?:models\/)?gemini-3\.8-flash(?:-\d{3,})?$/.test(raw.modelVersion))) {
      throw new GeminiRunError('model_mismatch', 'Returned model differs from the selected Gemini family');
    }
    const prediction = parseGeminiResponse(raw);
    const validated = await core.validateResponse(prediction, request);
    return { payload, raw, prediction, validated, provenance };
  } catch (error) {
    throw new GeminiRunError(error.code ?? 'validation', 'Gemini response failed ' + (error.code ?? 'structural validation') + '; inspect the preserved provider evidence',
      { ...provenance, provider_response_preserved: true, payload, raw });
  }
}
