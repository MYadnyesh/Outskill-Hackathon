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
//   body:   { composition_plan, model_id }
//   -> 200 returns RAW AUDIO BYTES (not JSON, not a hosted URL)
//
// We send `composition_plan`, NOT `prompt`. Those two fields are mutually
// exclusive and they do different jobs: `prompt` is a *style* description, so
// lyrics pasted into it are treated as loose creative guidance. In practice
// that returned instrumental tracks, or vocals whose words and section order
// did not match the lyrics we were showing on screen. `composition_plan`
// carries the words per section (`sections[].lines`), which is what actually
// binds the audio to the displayed lyrics. `music_length_ms` applies only to
// the `prompt` form — with a plan, length comes from the section durations.
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

// Per-section limits from the composition_plan schema. A section shorter than
// MIN_SECTION_MS is rejected outright, so the whole-track budget has to be
// shared out in chunks no smaller than this.
const MIN_SECTION_MS = 3000;
const MAX_SECTION_MS = 120000;
const MAX_LINES_PER_SECTION = 30;
const MAX_LINE_CHARS = 200;

function clampLengthMs(ms) {
  if (!Number.isFinite(ms)) return MAX_LENGTH_MS;
  return Math.min(MAX_LENGTH_MS, Math.max(MIN_LENGTH_MS, Math.round(ms)));
}

// music_v2 and later take the chunk-based plan; music_v1 takes the
// section-based one. Anything unrecognised is treated as new rather than old,
// so a future model defaults to the current shape.
function usesChunkPlan(model) {
  return String(model || '').trim() !== 'music_v1';
}

/**
 * Turn a Prism song object into a composition_plan the Music API accepts.
 *
 * The section shape maps almost one-to-one onto ours: `section` becomes
 * `section_name` and `lines` stays `lines`. The only real work is dividing the
 * track budget between sections, since each one needs its own `duration_ms`
 * and none may fall below MIN_SECTION_MS.
 *
 * @param {{genre?: string, mood?: string, lyrics: {section: string, lines: string[]}[]}} song
 * @param {number} [totalMs] - track budget; clamped to [3000, 30000]
 * @returns {object} a composition_plan body
 */
export function buildCompositionPlan(song, totalMs, model = MODEL) {
  const sections = (song.lyrics || []).filter((s) => s && s.lines?.length);
  if (!sections.length) {
    throw new ElevenLabsError('Cannot build a composition plan with no lyric sections.');
  }

  // Every section needs at least MIN_SECTION_MS, so the floor for the whole
  // track is set by how many sections there are, not by the caller's request.
  const floorMs = sections.length * MIN_SECTION_MS;
  const budgetMs = Math.max(clampLengthMs(totalMs), floorMs);

  const totalLines = sections.reduce((n, s) => n + s.lines.length, 0) || 1;

  // Give each section time proportional to how much it has to sing, then hold
  // it inside the per-section bounds.
  const planSections = sections.map((s) => ({
    section_name: String(s.section || 'Section').slice(0, 100),
    positive_local_styles: [],
    negative_local_styles: [],
    duration_ms: Math.min(
      MAX_SECTION_MS,
      Math.max(MIN_SECTION_MS, Math.round((s.lines.length / totalLines) * budgetMs))
    ),
    lines: s.lines
      .slice(0, MAX_LINES_PER_SECTION)
      .map((line) => String(line).slice(0, MAX_LINE_CHARS)),
  }));

  // genre is one value, mood is a comma-joined pair ("Anthemic, driving").
  // The vocal styles are deliberate: without them the model is free to return
  // an instrumental, which is the failure this whole change exists to stop.
  const styles = [song.genre, ...String(song.mood || '').split(',')]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  const positive = [...styles, 'clear sung vocals', 'intelligible lyrics'];
  const negative = ['instrumental', 'spoken word', 'muffled vocals'];

  // The plan type is PAIRED TO THE MODEL — sending the wrong one is a 422
  // ("Invalid type of `composition_plan` used for model ..."), confirmed
  // against the live API:
  //   music_v1 -> MusicPrompt     { positive_global_styles, ..., sections[] }
  //   music_v2 -> CompositionPlan { chunks[] }
  // Both were accepted by the API in their correct pairing.
  if (usesChunkPlan(model)) {
    return {
      chunks: planSections.map((s) => ({
        // A chunk carries its lyrics in `text`; a bracketed section name is the
        // documented way to label the part.
        text: `[${s.section_name}]\n${s.lines.join('\n')}`,
        duration_ms: s.duration_ms,
        positive_styles: positive,
        negative_styles: negative,
        // Keep the generated audio tied to the words we supplied rather than
        // treating them as a loose theme — the entire point of this change.
        context_adherence: 'high',
      })),
    };
  }

  return {
    positive_global_styles: positive,
    negative_global_styles: negative,
    sections: planSections,
  };
}

/**
 * Compose a track from a composition plan (see buildCompositionPlan).
 *
 * @param {object} opts
 * @param {object} opts.compositionPlan - plan carrying the lyrics per section
 * @param {number} [opts.timeoutMs] - how long the caller can afford to wait
 * @returns {Promise<{ audioUrl: string, durationSeconds: number }>}
 * @throws {ElevenLabsError} on missing key, timeout, non-2xx, or empty body
 */
export async function composeMusic({ compositionPlan, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new ElevenLabsError('ELEVENLABS_API_KEY is not set.');
  }
  if (!compositionPlan?.sections?.length) {
    throw new ElevenLabsError('composeMusic requires a composition plan with sections.');
  }

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
        composition_plan: compositionPlan,
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

  // With a plan there is no music_length_ms to echo back, so the track length
  // is whatever the section durations add up to.
  const plannedMs = compositionPlan.sections.reduce((n, s) => n + (s.duration_ms || 0), 0);

  return {
    audioUrl: `data:audio/mpeg;base64,${buffer.toString('base64')}`,
    durationSeconds: Math.round(plannedMs / 1000),
  };
}
