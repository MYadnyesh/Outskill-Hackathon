// lib/transforms/kid.js
//
// Explain It to a Kid mode — mirrors lib/transforms/tldr.js's pattern: one
// prompt, one strict responseSchema, one small shaping function. Writes for
// a 5-7 year old audience (short sentences, no jargon, warm tone); the
// "premium" presentation is a UI concern, handled in KidContent.jsx, not here.

import { generateJSON } from '../gemini.js';

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    simpleExplanation: {
      type: 'STRING',
      description:
        'One short paragraph (2-4 sentences) explaining the page\'s main idea to a 5-7 year old. Short words, no jargon, warm tone.',
    },
    story: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description:
        '2 to 4 short paragraphs telling a simple, imaginative story (with a character or two) that illustrates the main idea, written for a 5-7 year old.',
    },
    funFacts: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: '3 to 5 short, surprising fun facts from the page, each one sentence, kid-friendly.',
    },
    quiz: {
      type: 'ARRAY',
      minItems: 3,
      maxItems: 3,
      description: 'Exactly 3 quiz questions testing the story/facts above.',
      items: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          options: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            minItems: 3,
            maxItems: 3,
            description: 'Exactly 3 short answer options.',
          },
          correctIndex: {
            type: 'INTEGER',
            minimum: 0,
            maximum: 2,
            description: 'Index (0, 1, or 2) of the correct option in the options array.',
          },
        },
        required: ['question', 'options', 'correctIndex'],
      },
    },
  },
  required: ['simpleExplanation', 'story', 'funFacts', 'quiz'],
};

export async function transformKid({ title, description, domain, mainText }) {
  const prompt = `You are Prism, a tool that turns web pages into simple explanations for young children.

Page title: ${title}
Domain: ${domain}
Meta description: ${description || '(none)'}

Page content (may be truncated):
"""
${mainText}
"""

Explain this page's main idea to a 5-7 year old: short sentences, everyday words, no
jargon, a warm and encouraging tone. Then tell a short, simple story (2-4 short
paragraphs, with a character or two) that illustrates the idea. Then list a few fun
facts. Then write exactly 3 quiz questions (3 options each) that check understanding
of the story and facts. Be accurate to the content above only — do not invent facts
not supported by the text. Return ONLY the fields defined by the response schema.`;

  const data = await generateJSON({ prompt, schema: SCHEMA, temperature: 0.6, maxOutputTokens: 1800 });

  // The schema asks for exactly 3 options and a correctIndex of 0-2, but the
  // model's output is not trusted to honour it. A question is only usable if
  // it has at least two options AND a correctIndex that points at one of them
  // *after* slicing. Anything else is dropped rather than defaulted: guessing
  // an index would silently mark the wrong answer correct, and keeping an
  // unanswerable question would stop the score from ever completing.
  const quiz = Array.isArray(data.quiz)
    ? data.quiz
        .filter((q) => q && Array.isArray(q.options))
        .slice(0, 3)
        .map((q) => ({
          question: String(q.question || '').trim(),
          options: q.options.map((o) => String(o || '').trim()).slice(0, 3),
          correctIndex: q.correctIndex,
        }))
        .filter(
          (q) =>
            q.options.length >= 2 &&
            Number.isInteger(q.correctIndex) &&
            q.correctIndex >= 0 &&
            q.correctIndex < q.options.length
        )
    : [];

  return {
    simpleExplanation: String(data.simpleExplanation || '').trim(),
    story: Array.isArray(data.story) ? data.story.filter(Boolean).slice(0, 4) : [],
    funFacts: Array.isArray(data.funFacts) ? data.funFacts.filter(Boolean).slice(0, 5) : [],
    quiz,
  };
}
