// src/mock/demoData.js
//
// Canned "What Are Black Holes?" (nasa.gov) dataset from the product spec.
// Shaped EXACTLY like a real /api/analyze response for each mode, so it
// works as:
//   1. an offline fallback when the frontend can't reach /api at all
//      (e.g. someone running `npm run dev` without `vercel dev`/keys), and
//   2. the reference shape for whoever implements lib/transforms/song.js
//      and lib/transforms/kid.js — build your UI against this first, then
//      swap the real API response in; the shape should not change.
//
// tldr is also mirrored by the real, working lib/transforms/tldr.js — the
// two should stay in sync in spirit (same fields), even though this one is
// static and that one is AI-generated.

export const DEMO_URL = 'https://www.nasa.gov/black-holes';

const site = {
  url: DEMO_URL,
  domain: 'nasa.gov',
  title: 'What Are Black Holes?',
  description:
    "NASA's explainer on how black holes form, what the event horizon means, and how astronomers spot the invisible.",
  analyzedAt: new Date(0).toISOString(), // caller should overwrite with "just now" at render time
  stats: {
    readingTimeMinutes: 4,
    headingCount: 6,
    linkCount: 12,
    contentType: 'Article',
  },
};

export const demoTldr = {
  status: 'ok',
  mode: 'tldr',
  site: { ...site, stats: { ...site.stats, mainTopic: 'Black holes' } },
  tldr: {
    summary:
      "Black holes form when massive stars collapse under their own gravity, packing enormous mass into an incredibly small space. Nothing that crosses the event horizon — not even light — can escape, which is what makes them invisible. Supermassive black holes sit at the centers of most galaxies, including our own Milky Way. Because they can't be seen directly, astronomers detect them indirectly, by watching how their gravity bends light and pulls on nearby stars and gas.",
    takeaways: [
      'Black holes form when massive stars collapse under their own gravity.',
      'Nothing past the event horizon escapes, not even light.',
      'Supermassive black holes sit at the centers of galaxies.',
      "They're detected indirectly, via their gravitational pull on nearby matter.",
    ],
    topics: ['Black holes', 'Gravity', 'Event horizon', 'Astrophysics', 'Galaxies'],
    mainTopic: 'Black holes',
  },
  timingMs: { extract: 0, total: 0 },
};

export const demoSong = {
  status: 'ok',
  mode: 'song',
  site,
  song: {
    title: 'Point of No Return',
    genre: 'Synth-pop',
    mood: 'Anthemic, driving',
    description: "A synth-pop anthem about gravity's one-way door.",
    durationSeconds: 192, // 3:12
    audioUrl: null, // real audio drops in here once lib/transforms/song.js is wired up (ElevenLabs Music)
    lyrics: [
      {
        section: 'Verse 1',
        lines: [
          'Star burns out, it has nowhere to hide',
          'Falling in on itself, collapsing inside',
          'Gravity wins, there\'s no holding the line',
          'Crushing down to a point out of space and time',
        ],
      },
      {
        section: 'Chorus',
        lines: [
          "This is the point of no return",
          'Past the edge is a lesson you learn',
          'Light goes in but it never comes back',
          "Point of no return, there's no other track",
        ],
      },
      {
        section: 'Verse 2',
        lines: [
          'Look at the center, you can\'t see it clear',
          'Just the pull on the stars that are dancing near',
          'Millions of miles and it still holds tight',
          "An invisible hand in the middle of the night",
        ],
      },
      { section: 'Chorus', lines: [
        "This is the point of no return",
        'Past the edge is a lesson you learn',
        'Light goes in but it never comes back',
        "Point of no return, there's no other track",
      ] },
      {
        section: 'Bridge',
        lines: [
          'Every galaxy keeps one at its heart',
          'An engine of dark pulling systems apart',
          "We can't see it, but we know that it's there",
          'Written in starlight bent through the air',
        ],
      },
    ],
  },
  timingMs: { extract: 0, total: 0 },
};

export const demoKid = {
  status: 'ok',
  mode: 'kid',
  site,
  kid: {
    simpleExplanation:
      "A black hole is like the strongest vacuum in space. It pulls everything nearby toward it — even light — and nothing that gets too close can ever pull away again.",
    story: [
      "Rosie the Rocket loved flying past sleepy old stars on her way to school. One star, Big Red, had been shining for billions of years and was getting very, very tired.",
      'One night, Big Red ran out of energy and started to fall in on itself — smaller, and smaller, and smaller, until it was tinier than a marble but heavier than a mountain.',
      "Rosie flew close to say goodnight, but felt a strange, powerful pull. \"Careful!\" called Professor Comet. \"That's not a star anymore — it's a black hole. Get too close, and not even you can fly away.\"",
      'Rosie zoomed to a safe distance and watched in wonder. She couldn\'t see the black hole at all — just the swirl of space dust dancing around the invisible, powerful point where Big Red used to be.',
    ],
    funFacts: [
      'The nearest known black hole is about 1,500 light-years away from Earth.',
      "Black holes don't actually 'suck' things in — you have to get very close before you can't escape.",
      'A supermassive black hole lives at the center of our own galaxy, the Milky Way.',
      'Time appears to slow down for anything falling toward a black hole.',
      'Scientists took the first-ever photo of a black hole in 2019.',
    ],
    quiz: [
      {
        question: 'What happens when something gets too close to a black hole?',
        options: ['It bounces away safely', 'It gets pulled toward it', 'It turns into a star'],
        correctIndex: 1,
      },
      {
        question: 'Can light escape from inside a black hole?',
        options: ['Yes, easily', 'Only sunlight', 'No, not even light can escape'],
        correctIndex: 2,
      },
      {
        question: 'Where do supermassive black holes usually live?',
        options: ['At the center of galaxies', 'Inside our sun', 'On the moon'],
        correctIndex: 0,
      },
    ],
  },
  timingMs: { extract: 0, total: 0 },
};

export function getDemoResponse(mode) {
  if (mode === 'song') return demoSong;
  if (mode === 'kid') return demoKid;
  return demoTldr;
}
