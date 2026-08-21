// lib/elevenlabs.js
//
// Thin, dependency-free wrapper around the ElevenLabs Music API, mirroring
// lib/gemini.js's shape: one typed error class, one hard timeout, one
// exported function.
//
// Requires a PAID ElevenLabs plan — the Music API is not on the free tier.
// Put the key in .env.local as ELEVENLABS_API_KEY (see .env.example).
//
// IMPORTANT for callers: every failure here is a thrown ElevenLabsError, and
// lib/transforms/song.js is expected to swallow it and fall back to
// `audioUrl: null` rather than failing the whole request. Song mode must
// still return lyrics when audio generation is unavailable — see
// docs/FEATURES.md#feature-make-a-song-mode.
//
// API shape (verified against the docs 2026-08-21):
//   POST https://api.elevenlabs.io/v1/music?output_format=<fmt>
//   header: xi-api-key
//   body:   { prompt, music_length_ms, model_id }
//   -> 200 returns RAW AUDIO BYTES (not JSON, not a hosted URL)
// Because the response is bytes and we have no blob storage in this project,
// the audio is returned as a base64 data: URI so the frontend can drop it
// straight into an <audio src>. That keeps the response self-contained at the
// cost of ~1.33x size inflation, which is why MAX_LENGTH_MS is conservative.

export class ElevenLabsError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'ElevenLabsError';
    this.cause = cause;
  }
}

const API_URL = 'https://api.elevenlabs.io/v1/music';
const MODEL = process.env.ELEVENLABS_MUSIC_MODEL || 'music_v2';
const OUTPUT_FORMAT = 'mp3_44100_128';

// Music generation is much slower than a text call. The caller passes the time
// it can actually spare (see lib/transforms/song.js) because the whole request
// has to land inside vercel.json's maxDuration; a fixed timeout longer than
// that ceiling could never fire before the platform killed the invocation, so
// the request would die instead of degrading to audioUrl: null.
const DEFAULT_TIMEOUT_MS = 20000;

// The API accepts 3000-600000ms. We cap far below that for two reasons: the
// audio comes back as bytes we inline as base64 against a ~4.5MB serverless
// response ceiling, and every extra second of track is roughly a third of a
// second of generation latency we have to fit in the budget. 30s of 128kbps
// mp3 is ~0.5MB -> ~0.6MB base64.
const MIN_LENGTH_MS = 3000;
const MAX_LENGTH_MS = 30000;

function clampLengthMs(ms) {
  if (!Number.isFinite(ms)) return MAX_LENGTH_MS;
  return Math.min(MAX_LENGTH_MS, Math.max(MIN_LENGTH_MS, Math.round(ms)));
}

/**
 * Compose a track from a natural-language style prompt.
 *
 * @param {object} opts
 * @param {string} opts.prompt - style/lyric prompt describing the track to generate
 * @param {number} [opts.lengthMs] - desired length; clamped to [3000, 30000]
 * @param {number} [opts.timeoutMs] - how long the caller can afford to wait
 * @returns {Promise<{ audioUrl: string, durationSeconds: number }>}
 * @throws {ElevenLabsError} on missing key, timeout, non-2xx, or empty body
 */
export async function composeMusic({ prompt, lengthMs, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new ElevenLabsError('ELEVENLABS_API_KEY is not set.');
  }

  const musicLengthMs = clampLengthMs(lengthMs);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${API_URL}?output_format=${OUTPUT_FORMAT}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        music_length_ms: musicLengthMs,
        model_id: MODEL,
      }),
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      throw new ElevenLabsError('ElevenLabs took too long to compose the track.', err);
    }
    throw new ElevenLabsError('Could not reach ElevenLabs.', err);
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new ElevenLabsError(`ElevenLabs API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) {
    throw new ElevenLabsError('ElevenLabs returned an empty audio body.');
  }

  return {
    audioUrl: `data:audio/mpeg;base64,${buffer.toString('base64')}`,
    durationSeconds: Math.round(musicLengthMs / 1000),
  };
}
