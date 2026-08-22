// lib/transforms/tldr.js
//
// TL;DR mode — the only fully-implemented AI transform this session.
// Pattern to copy for song.js / kid.js (see docs/FEATURES.md): one prompt,
// one strict responseSchema, one small shaping function. Keep the prompt
// short — every extra input token is latency on the "small time gap" budget.

import { generateJSON } from '../gemini.js';

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: {
      type: 'STRING',
      description: '3-5 sentence plain-English summary of the page, written for someone in a hurry.',
    },
    takeaways: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: '3 to 6 short, standalone key-takeaway sentences.',
    },
    topics: {
      type: 'ARRAY',
      description:
        '3 to 6 topics the page covers. Each one gets a short label AND a single ' +
        'sentence explaining what the page actually says about it — a bare tag ' +
        'tells the reader nothing they could not guess from the title.',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Short topic label, 1-3 words.' },
          note: {
            type: 'STRING',
            description:
              'One sentence (under 20 words) on what this page says about the topic. ' +
              'Specific to this page, not a dictionary definition.',
          },
        },
        required: ['name', 'note'],
      },
    },
    mainTopic: {
      type: 'STRING',
      description: 'The single best 2-4 word phrase describing what this page is fundamentally about.',
    },
  },
  required: ['summary', 'takeaways', 'topics', 'mainTopic'],
};

export async function transformTldr({ title, description, domain, mainText }) {
  const prompt = `You are Prism, a tool that turns web pages into fast, accurate summaries.

Page title: ${title}
Domain: ${domain}
Meta description: ${description || '(none)'}

Page content (may be truncated):
"""
${mainText}
"""

Write a TL;DR for someone who wants the important stuff in seconds. Be accurate to
the content above only — do not invent facts not supported by the text. Return ONLY
the fields defined by the response schema.`;

  const data = await generateJSON({ prompt, schema: SCHEMA, temperature: 0.4, maxOutputTokens: 1500 });

  return {
    summary: String(data.summary || '').trim(),
    takeaways: Array.isArray(data.takeaways) ? data.takeaways.filter(Boolean).slice(0, 6) : [],
    // Tolerates the old plain-string shape as well as the current
    // {name, note} objects, so a Library entry saved before this change
    // still renders instead of throwing.
    topics: Array.isArray(data.topics)
      ? data.topics
          .map((t) => (typeof t === 'string' ? { name: t, note: '' } : t))
          .filter((t) => t && String(t.name || '').trim())
          .map((t) => ({ name: String(t.name).trim(), note: String(t.note || '').trim() }))
          .slice(0, 6)
      : [],
    mainTopic: String(data.mainTopic || '').trim(),
  };
}
