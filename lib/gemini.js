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

export class GeminiError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'GeminiError';
    this.cause = cause;
  }
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 12000;

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

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

  let res;
  try {
    res = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      throw new GeminiError('Gemini took too long to respond.', err);
    }
    throw new GeminiError('Could not reach Gemini.', err);
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new GeminiError(`Gemini API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const blockReason = json?.promptFeedback?.blockReason;
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
