import core from '../../demo/p01/reasoning-core.js';

export const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';

export function buildOpenAIRequest(request, { model, maxOutputTokens = 4096 } = {}) {
  if (typeof model !== 'string' || !model.trim() || model.length > 200 || /\s/.test(model)) throw new Error('An explicit model ID is required; no default model is selected');
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 256 || maxOutputTokens > 16384) throw new Error('Invalid output token limit');
  const schema = structuredClone(request.output_schema);
  schema.properties.method_predictions.items.properties.method_id.enum = request.context.method_universe
    .map(node => node.method_id).filter(id => id !== request.context.change.seed_id);
  return {
    model, store: false, max_output_tokens: maxOutputTokens,
    input: [{ role: 'system', content: request.system_prompt }, { role: 'user', content: core.canonical(request.context) }],
    text: { format: { type: 'json_schema', name: 'p01_method_prediction', strict: true, schema } },
  };
}

export function parseOpenAIResponse(response) {
  if (!response || response.status !== 'completed') throw new Error('Provider response did not complete; no prediction accepted');
  if (!Array.isArray(response.output)) throw new Error('Provider response has no output array');
  const content = response.output.filter(item => item.type === 'message' && item.role === 'assistant').flatMap(item => item.content ?? []);
  if (content.some(item => item.type === 'refusal')) throw new Error('Provider refused; no prediction accepted');
  const texts = content.filter(item => item.type === 'output_text').map(item => item.text);
  if (texts.length !== 1 || typeof texts[0] !== 'string') throw new Error('Expected one structured assistant response');
  try { return JSON.parse(texts[0]); } catch { throw new Error('Provider output is not JSON; no prediction accepted'); }
}

export async function callOpenAI(request, { model, apiKey, confirmSend = false, maxOutputTokens = 4096, timeoutMs = 60000, fetchImpl = globalThis.fetch } = {}) {
  await core.verifyRequest(request);
  if (confirmSend !== true) throw new Error('Explicit confirmation to send this context is required');
  if (typeof apiKey !== 'string' || !apiKey.trim() || apiKey.length > 512 || /[\r\n]/.test(apiKey)) throw new Error('Configure OPENAI_API_KEY locally; never include it in the request bundle');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) throw new Error('Invalid timeout');
  const payload = buildOpenAIRequest(request, { model, maxOutputTokens });
  let response;
  const started = performance.now();
  try {
    response = await fetchImpl(OPENAI_ENDPOINT, { method: 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs) });
  } catch { throw new Error('Provider network error/timeout; no retry or fallback prediction'); }
  if (!response.ok) throw new Error('Provider HTTP ' + response.status + '; no retry or fallback prediction');
  let text;
  try {
    const reader = response.body.getReader();
    const parts = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 2 * 1024 * 1024) { await reader.cancel(); throw new Error('Provider response exceeds byte limit'); }
      parts.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch { throw new Error('Provider response could not be read within limits'); }
  let raw;
  try { raw = JSON.parse(text); } catch { throw new Error('Provider returned invalid JSON'); }
  const prediction = parseOpenAIResponse(raw);
  const validated = await core.validateResponse(prediction, request);
  return { payload, raw, prediction, validated, provenance: {
    provider: 'openai_responses', endpoint: OPENAI_ENDPOINT, requested_model: model,
    returned_model: typeof raw.model === 'string' ? raw.model : null,
    provider_response_id: typeof raw.id === 'string' ? raw.id : null,
    usage: raw.usage ?? null, elapsed_ms: Math.round(performance.now() - started),
    estimated_cost: null, retry_count: 0, remote_calls: 1,
  } };
}
