// netlify/functions/analyze.mjs
//
// Netlify Functions v2 entry point for POST /api/analyze.
//
// The real handler lives in api/analyze.js and is written to the Vercel
// (req, res) signature. Rather than fork it, this adapts a web-standard
// Request into that shape and collects the result back into a Response — the
// same trick scripts/dev-server.js already uses to run the handler as a plain
// Node server. One endpoint, one implementation, three ways to host it.
//
// Why Netlify: synchronous functions get a fixed 60s on every plan, where
// Vercel's ceiling depends on the plan (and can be 10s). Song mode takes
// 12-17s, so a 10s cap would fail it every time.

import handler from '../../api/analyze.js';

// Serves this function directly at /api/analyze instead of the default
// /.netlify/functions/analyze, so the frontend's fetch path is unchanged
// across all three hosting setups.
export const config = { path: '/api/analyze' };

export default async function analyze(request) {
  let body = {};
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.json();
    } catch {
      body = {}; // handler already rejects a missing/!invalid mode with a 400
    }
  }

  const headers = new Headers();
  let status = 200;
  let payload = null;

  // Minimal stand-in for the Node ServerResponse methods api/analyze.js uses.
  const res = {
    setHeader(name, value) {
      headers.set(name, value);
      return res;
    },
    status(code) {
      status = code;
      return res;
    },
    json(value) {
      headers.set('Content-Type', 'application/json');
      payload = JSON.stringify(value);
      return res;
    },
    end() {
      return res;
    },
  };

  try {
    await handler({ method: request.method, body }, res);
  } catch (err) {
    console.error('[Prism] unhandled error in analyze:', err);
    return Response.json(
      { status: 'error', code: 'UNKNOWN', message: 'Something went wrong.' },
      { status: 500 }
    );
  }

  // 204 (the CORS preflight) and 304 must not carry a body.
  const bodiless = status === 204 || status === 304;
  return new Response(bodiless ? null : payload, { status, headers });
}
