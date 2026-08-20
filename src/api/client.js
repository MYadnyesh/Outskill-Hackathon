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

const REQUEST_TIMEOUT_MS = 20000;

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

    // A 404 here means there's no /api route at all (plain `vite dev`) —
    // fall back rather than surfacing a confusing raw 404.
    if (res.status === 404) {
      return { ...getDemoResponse(mode), _demo: true };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    clearTimeout(timeout);
    console.warn('[Prism] /api/analyze unreachable, using bundled demo data instead:', err?.message);
    return { ...getDemoResponse(mode), _demo: true };
  }
}
