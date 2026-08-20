// scripts/dev-server.js
//
// Minimal stand-in for `vercel dev` that needs no Vercel account/login.
// Runs api/analyze.js as a plain Node http server so contributors without
// the Vercel CLI set up can still exercise the real backend locally.
// Paired with the `/api` proxy in vite.config.js — start this, then
// `npm run dev` (or use the combined `npm run dev:local`), and requests
// to /api/analyze reach real Gemini instead of falling back to mock data.
//
// `vercel dev` (npm run dev:full) is still the higher-fidelity option if
// you already have the CLI authenticated — this is the zero-setup fallback.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from '../api/analyze.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal(path.join(__dirname, '..', '.env.local'));

const PORT = process.env.DEV_API_PORT || 3001;

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    req.body = raw ? JSON.parse(raw) : {};
  } catch {
    req.body = {};
  }

  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
    return res;
  };

  try {
    await handler(req, res);
  } catch (err) {
    console.error('[dev-server] unhandled error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'error', code: 'UNKNOWN', message: 'Local dev server error.' }));
  }
});

server.listen(PORT, () => {
  console.log(`[dev-server] api/analyze.js -> http://localhost:${PORT} (proxied by vite at /api)`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[dev-server] GEMINI_API_KEY is not set in .env.local — TL;DR calls will return AI_ERROR.');
  }
});
