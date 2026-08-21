// lib/gemini.js
//
// Thin, dependency-free wrapper around the Gemini REST API (no @google/generative-ai
// SDK — keeps the serverless function bundle small, which matters for cold-start
// latency and our "small time gap" requirement).
//
// Get a free key with no credit card at https://aistudio.google.com/apikey
// and put it in .env.local as GEMINI_API_KEY (see .env.example).
//
// Usage pattern every transform (tldr.js, and the song/kid ones a teammate
// will add) should follow:
//
//   import { generateJSON } from '../gemini.js';
//   const data = await generateJSON({ prompt, schema });
//
// generateJSON asks Gemini for structured JSON output directly (responseSchema),
// so callers get a parsed object back, not a string to regex out of markdown.
//
// MODEL FALLBACK: the free tier caps generate_content at 20 requests per day
// PER MODEL, so a single hard-coded model silently becomes a dead demo after 20
// transforms. generateJSON therefore walks a list of models and advances to the
// next one whenever the current one says "not for you" — quota exhausted (429),
// retired (404), or overloaded (503). Configure with either:
//   GEMINI_MODEL   — override just the preferred model (kept for back-compat)
//   GEMINI_MODELS  — comma-separated full priority list, overrides everything
// Because the cap is per model, each fallback buys another 20 requests/day.

export class GeminiError extends Error {
  constructor(message, cause, { canFallback = false } = {}) {
    super(message);
    this.name = 'GeminiError';
    this.cause = cause;
    // True when the failure is about THIS model rather than the request itself,
    // so trying a different model is worth it. A malformed schema or a safety
    // block would fail identically everywhere, so those set this false.
    this.canFallback = canFallback;
  }
}

// Verified available on a fresh free-tier key (2026-08-21). Ordered strongest
// first; the -lite entries are the deep fallbacks that keep a demo alive after
// the flash models' daily quotas are gone.
const DEFAULT_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
];

function resolveModels() {
  const explicit = process.env.GEMINI_MODELS;
  if (explicit) {
    const list = explicit.split(',').map((m) => m.trim()).filter(Boolean);
    if (list.length) return list;
  }
  const preferred = process.env.GEMINI_MODEL;
  if (!preferred) return DEFAULT_MODELS;
  // Preferred model first, then the rest of the defaults as fallbacks.
  return [preferred, ...DEFAULT_MODELS.filter((m) => m !== preferred)];
}

const MODELS = resolveModels();
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Index of the model we last got a real answer from. Once a model is known to
// be exhausted/retired we stop paying its ~0.5s rejection on every later call.
// Process-scoped on purpose: serverless instances are short-lived, and a dev
// server restart is the natural way to re-check a model whose quota has reset.
let modelCursor = 0;

// Measured against the live API on a large page (en.wikipedia.org/wiki/Black_hole,
// ~8 min read): song 10.4s, kid 11.7s, tldr exceeded 12s and aborted. The old
// 12s budget sat right on top of real latency, so a normal request could fail.
//
// This is a TOTAL budget across every model attempt, not per attempt — that way
// adding fallback can never widen the worst case. Quota/retired rejections come
// back in well under a second, so a fallback chain costs almost nothing, while a
// genuine timeout consumes the budget and correctly stops the walk.
//
// It has to stay inside two ceilings:
//   FETCH_TIMEOUT_MS (8s, lib/extract.js) + TIMEOUT_MS <= maxDuration (30s, vercel.json)
//   FETCH_TIMEOUT_MS + TIMEOUT_MS <= REQUEST_TIMEOUT_MS (src/api/client.js)
// 8 + 20 = 28s clears the Vercel ceiling, and client.js was raised to 30s to
// match. If the frontend gave up first it would silently swap in demo data, so
// these three numbers must be changed together.
const TIMEOUT_MS = 20000;

// Below this there isn't enough time left for a fresh model to answer, so stop
// walking and report the failure rather than burning the caller's remaining budget.
const MIN_ATTEMPT_MS = 2500;

/**
 * @param {object} opts
 * @param {string} opts.prompt - full prompt text (system + user framing combined)
 * @param {object} [opts.schema] - a Gemini responseSchema (JSON-schema-ish) to force
 *   structured output. Strongly recommended for anything the UI will render directly.
 * @param {number} [opts.temperature]
 * @param {number} [opts.maxOutputTokens]
 * @returns {Promise<any>} parsed JSON (if schema given) or raw string
 */
export async function generateJSON({ prompt, schema, temperature = 0.6, maxOutputTokens = 1024 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError('GEMINI_API_KEY is not set. Add it to .env.local (see .env.example).');
  }

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens,
      // Uncapped thinking on this model can burn the entire maxOutputTokens
      // budget on internal reasoning before writing any JSON, leaving the
      // response truncated (finishReason: MAX_TOKENS, empty/partial text).
      // A fixed budget keeps latency predictable and guarantees room for output.
      thinkingConfig: { thinkingBudget: 512 },
      ...(schema
        ? { responseMimeType: 'application/json', responseSchema: schema }
        : {}),
    },
  };

  const deadline = Date.now() + TIMEOUT_MS;
  let lastError;

  // Start at the last model that actually answered, then walk forward. Models
  // before the cursor are already known to be exhausted or retired.
  for (let i = modelCursor; i < MODELS.length; i++) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;

    try {
      const result = await callModel({ model: MODELS[i], apiKey, body, schema, timeoutMs: remaining });
      if (i !== modelCursor) {
        console.warn(`[Prism] Gemini fell back to ${MODELS[i]} (${MODELS[modelCursor]} unavailable).`);
        modelCursor = i; // stick with what works for the rest of this process
      }
      return result;
    } catch (err) {
      lastError = err;
      // Not a "this model won't serve you" problem — another model would fail
      // the same way, so surface it now instead of burning the budget.
      if (!(err instanceof GeminiError) || !err.canFallback) throw err;
    }
  }

  throw lastError || new GeminiError('No Gemini model was available.');
}

/** One attempt against one model. Throws GeminiError; sets canFallback when another model might work. */
async function callModel({ model, apiKey, body, schema, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      // Out of budget — a different model wouldn't have time either.
      throw new GeminiError('Gemini took too long to respond.', err);
    }
    throw new GeminiError('Could not reach Gemini.', err);
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    // 429 daily/rate quota, 404 model retired for new keys, 503 model overloaded —
    // all specific to this model, so the next one in the list is worth a shot.
    const canFallback = res.status === 429 || res.status === 404 || res.status === 503;
    throw new GeminiError(
      `Gemini API error (${res.status}) on ${model}: ${errText.slice(0, 300)}`,
      undefined,
      { canFallback }
    );
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const blockReason = json?.promptFeedback?.blockReason;
    // A safety block is about the prompt, not the model — don't shop it around.
    throw new GeminiError(
      blockReason ? `Gemini blocked this request (${blockReason}).` : 'Gemini returned an empty response.'
    );
  }

  if (!schema) return text;

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new GeminiError('Gemini returned malformed JSON.', err);
  }
}
