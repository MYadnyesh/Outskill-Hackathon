// scripts/test-api.js
//
// Local smoke test for api/analyze.js that doesn't require the Vercel CLI —
// useful in restricted sandboxes/CI. It calls the handler directly with
// fake (req, res) objects. Run with: npm run test:api
//
// If GEMINI_API_KEY isn't set, the 'tldr' and 'song' cases are expected to
// fail with AI_ERROR — that's a PASS for this script (it proves error handling
// works), not a real failure. Set GEMINI_API_KEY in your shell to test the
// real path.
//
// Song mode's audio is separate: with a GEMINI_API_KEY but no
// ELEVENLABS_API_KEY, song mode should still return 200 with full lyrics and
// `audioUrl: null` — audio is best-effort and must never fail the request.

import handler from '../api/analyze.js';

function fakeReq(body) {
  return { method: 'POST', body };
}

function fakeRes() {
  const res = {
    _status: 200,
    _json: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(payload) {
      this._json = payload;
      return this;
    },
    end() {
      return this;
    },
    setHeader() {},
  };
  return res;
}

async function run(label, body) {
  const req = fakeReq(body);
  const res = fakeRes();
  const start = Date.now();
  await handler(req, res);
  const ms = Date.now() - start;
  console.log(`\n=== ${label} (${ms}ms, HTTP ${res._status}) ===`);
  console.log(JSON.stringify(res._json, null, 2).slice(0, 1200));
}

const cases = [
  ['TL;DR on a real page', { url: 'https://en.wikipedia.org/wiki/Black_hole', mode: 'tldr' }],
  ['song mode (lyrics; audio best-effort)', { url: 'https://en.wikipedia.org/wiki/Black_hole', mode: 'song' }],
  ['kid mode (not implemented stub)', { url: 'https://en.wikipedia.org/wiki/Black_hole', mode: 'kid' }],
  ['broken URL -> error state', { url: 'https://this-domain-does-not-exist-prism-demo.invalid', mode: 'tldr' }],
  ['invalid mode -> 400', { url: 'https://example.com', mode: 'bogus' }],
];

for (const [label, body] of cases) {
  try {
    await run(label, body);
  } catch (err) {
    console.error(`\n=== ${label} threw ===`, err);
  }
}
