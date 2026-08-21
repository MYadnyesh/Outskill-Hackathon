// api/analyze.js  ->  POST /api/analyze
//
// The one endpoint the whole team builds against. Request/response contract
// is documented in docs/FEATURES.md#api-contract — treat that doc as the
// source of truth; this file is the reference implementation of it.
//
// Request:  { url: string, mode: 'tldr' | 'song' | 'kid' }
// Response: see buildErrorResponse / the per-mode branches below.
//
// Perf note ("very small time gap between scraping and output"): extraction
// and the AI call are the only two sequential steps, both have hard timeouts
// (see lib/extract.js and lib/gemini.js). All three modes call Gemini for
// real; song mode's ElevenLabs audio call runs after and is best-effort only
// (see lib/transforms/song.js).

import { extractFromUrl, ExtractError } from '../lib/extract.js';
import { transformTldr } from '../lib/transforms/tldr.js';
import { transformSong } from '../lib/transforms/song.js';
import { transformKid } from '../lib/transforms/kid.js';
import { GeminiError } from '../lib/gemini.js';

const VALID_MODES = new Set(['tldr', 'song', 'kid']);

function siteFromExtraction(extraction) {
  return {
    url: extraction.url,
    domain: extraction.domain,
    title: extraction.title,
    description: extraction.description,
    analyzedAt: new Date().toISOString(),
    stats: extraction.stats, // { readingTimeMinutes, headingCount, linkCount, contentType }
  };
}

function sendError(res, httpStatus, code, message) {
  res.status(httpStatus).json({ status: 'error', code, message });
}

export default async function handler(req, res) {
  // Minimal CORS so the endpoint is also curl/Postman-friendly during dev.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST.');

  const started = Date.now();
  const { url, mode } = req.body || {};

  if (!VALID_MODES.has(mode)) {
    return sendError(res, 400, 'INVALID_MODE', `mode must be one of: ${[...VALID_MODES].join(', ')}`);
  }

  // ---- 1. Extraction (real, for every mode — the shared header needs it) ----
  let extraction;
  try {
    extraction = await extractFromUrl(url);
  } catch (err) {
    if (err instanceof ExtractError) {
      const httpStatus = err.code === 'INVALID_URL' ? 400 : 502;
      return sendError(res, httpStatus, err.code, err.message);
    }
    console.error('Unexpected extraction error:', err);
    return sendError(res, 500, 'UNKNOWN', 'Something went wrong reading that page.');
  }

  const site = siteFromExtraction(extraction);

  // ---- 2. Mode-specific AI transform ----
  if (mode === 'tldr') {
    try {
      const tldr = await transformTldr(extraction);
      return res.status(200).json({
        status: 'ok',
        mode: 'tldr',
        site,
        tldr,
        timingMs: { extract: extraction.extractMs, total: Date.now() - started },
      });
    } catch (err) {
      if (err instanceof GeminiError) {
        console.error('Gemini error (tldr):', err.message);
        return sendError(res, 502, 'AI_ERROR', 'The AI summarizer is unavailable right now.');
      }
      console.error('Unexpected tldr error:', err);
      return sendError(res, 500, 'UNKNOWN', 'Something went wrong generating your TL;DR.');
    }
  }

  if (mode === 'song') {
    try {
      // Note: song audio is best-effort inside transformSong — a missing
      // ELEVENLABS_API_KEY or a failed compose yields audioUrl: null rather
      // than an error, so only a lyrics (Gemini) failure lands in the catch.
      const song = await transformSong(extraction);
      return res.status(200).json({
        status: 'ok',
        mode: 'song',
        site,
        song,
        timingMs: { extract: extraction.extractMs, total: Date.now() - started },
      });
    } catch (err) {
      if (err instanceof GeminiError) {
        console.error('Gemini error (song):', err.message);
        return sendError(res, 502, 'AI_ERROR', 'The AI songwriter is unavailable right now.');
      }
      console.error('Unexpected song error:', err);
      return sendError(res, 500, 'UNKNOWN', 'Something went wrong writing your song.');
    }
  }

  if (mode === 'kid') {
    try {
      const kid = await transformKid(extraction);
      return res.status(200).json({
        status: 'ok',
        mode: 'kid',
        site,
        kid,
        timingMs: { extract: extraction.extractMs, total: Date.now() - started },
      });
    } catch (err) {
      if (err instanceof GeminiError) {
        console.error('Gemini error (kid):', err.message);
        return sendError(res, 502, 'AI_ERROR', 'The AI storyteller is unavailable right now.');
      }
      console.error('Unexpected kid error:', err);
      return sendError(res, 500, 'UNKNOWN', 'Something went wrong writing your kid-friendly explanation.');
    }
  }
}
