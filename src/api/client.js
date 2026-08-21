// src/api/client.js
//
// The ONLY place the frontend talks to the backend. Every screen goes
// through analyzeUrl() — never fetch('/api/...') directly from a component.
//
// Contract (see docs/FEATURES.md#api-contract for the full spec):
//   success -> { status: 'ok', mode, site, tldr? | song? | kid?, notImplemented? }
//   error   -> { status: 'error', code, message }
//
// If /api itself is unreachable (e.g. running `npm run dev` with plain Vite,
// no `vercel dev` and no backend), this transparently falls back to the
// bundled demo dataset so UI-only contributors are never blocked on having
// API keys configured.

import { getDemoResponse, DEMO_URL } from '../mock/demoData.js';

export const BROKEN_DEMO_URL = 'https://this-page-does-not-exist.prism-demo.invalid';
export const EXAMPLE_URLS = [
  { label: 'nasa.gov — Black Holes', url: DEMO_URL },
  { label: 'wikipedia.org — Artificial Intelligence', url: 'https://en.wikipedia.org/wiki/Artificial_intelligence' },
  { label: 'openai.com — Blog', url: 'https://openai.com/blog' },
  { label: 'a page that will fail (demo)', url: BROKEN_DEMO_URL, isBrokenDemo: true },
];

// Must sit ABOVE the platform's own ceiling (maxDuration: 30s in vercel.json)
// so the server always loses the race and we receive its real 504 rather than
// aborting first and having to guess what happened. Keep this > 30s.
const REQUEST_TIMEOUT_MS = 35000;

// Demo data is a DEV-ONLY convenience. `getDemoResponse()` ignores the URL and
// always returns the canned "black holes" dataset, so substituting it for a
// failed real request renders a confident, completely wrong answer — a page
// about Artificial Intelligence comes back as a NASA black-holes summary with
// nothing on screen saying so. That is acceptable while building UI with no
// backend running; it is never acceptable in a deployed build, where a real
// failure must surface as a real error. import.meta.env.DEV is true for
// `npm run dev` / `dev:local` and false in any production build.
const ALLOW_DEMO_FALLBACK = import.meta.env.DEV;

function demoResponse(mode) {
  // _demo is read by src/screens/Results.jsx to show a visible banner, so even
  // the legitimate dev-mode fallback is never mistaken for a real result.
  return { ...getDemoResponse(mode), _demo: true };
}

function transportError(code, message) {
  return { status: 'error', code, message };
}

function brokenDemoError() {
  return {
    status: 'error',
    code: 'FETCH_FAILED',
    message: 'The link might be broken, private, or blocking automated readers.',
  };
}

/**
 * @param {string} url
 * @param {'tldr'|'song'|'kid'} mode
 * @returns {Promise<object>} a response shaped per docs/FEATURES.md#api-contract
 */
export async function analyzeUrl(url, mode) {
  // The "broken" example chip is deliberately a non-resolving domain
  // (.invalid TLD), so it fails for real against the live backend too —
  // this also short-circuits it in demo/offline mode for the same result.
  if (url?.trim() === BROKEN_DEMO_URL) {
    return brokenDemoError();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, mode }),
    });
    clearTimeout(timeout);

    // Parse FIRST, status second. api/analyze.js deliberately pairs real
    // errors with non-2xx codes (AI_ERROR is a 502, FETCH_FAILED a 502,
    // INVALID_MODE a 400), so branching on the status code before reading the
    // body would swallow a perfectly good error envelope and — in dev — replace
    // a genuine "the AI is down" message with demo data. If it parses and
    // carries our `status` field, it IS the answer, whatever the code.
    let payload = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
    if (payload && (payload.status === 'ok' || payload.status === 'error')) {
      return payload;
    }

    // Past here the body is not our envelope, so this came from the platform
    // or the dev proxy rather than from the function.
    if (res.status === 504) {
      // Vercel killed the invocation at maxDuration.
      return transportError('TIMEOUT', 'That page took too long to transform. Try a shorter page.');
    }
    if (res.status === 404 || res.status === 502 || res.status === 503) {
      // No route (plain `vite dev`) or the dev proxy's target is down — i.e.
      // there is no backend at all, which is exactly what demo data is for.
      if (ALLOW_DEMO_FALLBACK) return demoResponse(mode);
      return transportError('AI_ERROR', 'The service is unavailable right now. Please try again.');
    }
    return transportError('UNKNOWN', 'Got an unreadable response from the server.');
  } catch (err) {
    clearTimeout(timeout);

    if (err?.name === 'AbortError') {
      return transportError('TIMEOUT', 'That took too long. Try again, or try a shorter page.');
    }

    // A genuine network-level failure. In dev that usually just means no
    // backend is running, which is exactly what demo data is for.
    if (ALLOW_DEMO_FALLBACK) {
      console.warn('[Prism] /api/analyze unreachable, using bundled demo data instead:', err?.message);
      return demoResponse(mode);
    }
    return transportError('FETCH_FAILED', 'Could not reach the server. Check your connection and try again.');
  }
}
