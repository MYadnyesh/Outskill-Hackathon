// lib/transforms/song.js
//
// Make a Song mode — mirrors lib/transforms/tldr.js's pattern: one prompt,
// one strict responseSchema, one small shaping function.
//
// Two stages, and only the FIRST is allowed to fail the request:
//   1. Gemini writes the lyrics + song metadata (required).
//   2. ElevenLabs optionally renders real audio (best-effort).
// Per docs/FEATURES.md#feature-make-a-song-mode, if ELEVENLABS_API_KEY isn't
// set or the compose call fails for any reason, this returns audioUrl: null
// instead of throwing — the player UI degrades to its simulated mode. That is
// the most important rule in this file.

import { generateJSON } from '../gemini.js';
import { composeMusic } from '../elevenlabs.js';

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: {
      type: 'STRING',
      description: 'A short, evocative song title (2-5 words). Not the page title verbatim.',
    },
    genre: {
      type: 'STRING',
      description: 'A single musical genre that fits the subject, e.g. "Synth-pop", "Indie folk", "Lo-fi hip hop".',
    },
    mood: {
      type: 'STRING',
      description: 'Two mood adjectives separated by a comma, e.g. "Anthemic, driving".',
    },
    description: {
      type: 'STRING',
      description: 'One sentence describing the song, under 15 words.',
    },
    lyrics: {
      type: 'ARRAY',
      description:
        'The full song, 4 to 6 sections in performance order. Use a repeated Chorus. Sections must be labelled Verse 1 / Chorus / Verse 2 / Bridge etc.',
      items: {
        type: 'OBJECT',
        properties: {
          section: {
            type: 'STRING',
            description: 'Section label, e.g. "Verse 1", "Chorus", "Bridge".',
          },
          lines: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: '3 to 5 sung lines. One lyric line per array entry, no trailing punctuation needed.',
          },
        },
        required: ['section', 'lines'],
      },
    },
  },
  required: ['title', 'genre', 'mood', 'description', 'lyrics'],
};

// Rough stand-in for a real track length when ElevenLabs isn't in play — it
// only drives the simulated player's clock, so it just has to feel plausible.
const SECONDS_PER_LINE = 4.5;
const MIN_DURATION_S = 60;
const MAX_DURATION_S = 300;

function estimateDurationSeconds(lyrics) {
  const lineCount = lyrics.reduce((total, section) => total + section.lines.length, 0);
  const estimate = Math.round(lineCount * SECONDS_PER_LINE);
  return Math.min(MAX_DURATION_S, Math.max(MIN_DURATION_S, estimate));
}

// ElevenLabs takes a natural-language style prompt. The docs also describe a
// composition_plan object that can carry lyrics section-by-section, but its
// exact nested shape is less stable than the plain prompt field, so we inline
// the lyrics here instead — fewer moving parts to break on an API revision.
function buildStylePrompt({ title, genre, mood, description, lyrics }) {
  const lyricBlock = lyrics
    .map((section) => `[${section.section}]\n${section.lines.join('\n')}`)
    .join('\n\n');

  return `A ${genre} song titled "${title}". Mood: ${mood}. ${description}
Sing these lyrics:

${lyricBlock}`;
}

export async function transformSong({ title, description, domain, mainText }) {
  const prompt = `You are Prism, a tool that turns web pages into original songs.

Page title: ${title}
Domain: ${domain}
Meta description: ${description || '(none)'}

Page content (may be truncated):
"""
${mainText}
"""

Write an original song that teaches what this page is about. Ground every lyric in
the content above — do not invent facts not supported by the text. Make the chorus
memorable and repeat it. Return ONLY the fields defined by the response schema.`;

  const data = await generateJSON({ prompt, schema: SCHEMA, temperature: 0.9, maxOutputTokens: 2000 });

  const lyrics = Array.isArray(data.lyrics)
    ? data.lyrics
        .filter((section) => section && Array.isArray(section.lines))
        .slice(0, 6)
        .map((section) => ({
          section: String(section.section || '').trim(),
          lines: section.lines.map((line) => String(line || '').trim()).filter(Boolean),
        }))
        .filter((section) => section.lines.length > 0)
    : [];

  const song = {
    title: String(data.title || '').trim(),
    genre: String(data.genre || '').trim(),
    mood: String(data.mood || '').trim(),
    description: String(data.description || '').trim(),
    durationSeconds: estimateDurationSeconds(lyrics),
    audioUrl: null,
    lyrics,
  };

  // ---- Best-effort real audio. Never allowed to fail the request. ----
  try {
    const { audioUrl, durationSeconds } = await composeMusic({
      prompt: buildStylePrompt(song),
      lengthMs: song.durationSeconds * 1000,
    });
    song.audioUrl = audioUrl;
    song.durationSeconds = durationSeconds; // real track length wins over the estimate
  } catch (err) {
    // Expected whenever ELEVENLABS_API_KEY is unset (the common case — the
    // Music API needs a paid plan). Log and carry on with audioUrl: null so
    // the player falls back to its simulated mode.
    console.warn('[Prism] song audio unavailable, using simulated player:', err?.message);
  }

  return song;
}
