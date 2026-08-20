# Prism — feature implementation guide

This is the source of truth for what's left to build, exactly how it plugs
into what already exists, and the data shapes everything must match. If
you're picking up a feature from here, you shouldn't need to touch anything
outside the files your section names.

Deadline: **Aug 21**. Ship small, working PRs — a feature at 80% that's
merged beats a feature at 100% still sitting on your laptop.

## What's already built (don't rebuild this)

- **Shared shell**: nav, landing (URL input + example chips + mode picker),
  the processing animation, the error screen, the results shared header
  (site summary card, save/share), and the Library screen. All working,
  all wired to real state.
- **TL;DR mode**: fully real, end to end — `lib/extract.js` scrapes the
  submitted URL server-side, `lib/transforms/tldr.js` sends it to Gemini,
  `src/screens/results/TldrContent.jsx` renders it. Use this as the
  reference pattern for Song and Kid mode.
- **Design system**: `src/design-system/` — tokens, base styles, and a
  component kit (`Button`, `Pill`, `Card`, `TextField`, `SegmentedControl`,
  `TopNav`, `SelectableCard`, `IconBadge`, `Divider`). Reuse these; don't
  hand-roll new buttons/cards.
- **State machine**: `src/state/AppState.jsx` — `landing → processing →
  results | error`, plus `library`. `startTransform(url, mode)` is the one
  entry point; `refreshResult()` re-runs the current result in place
  (used by TL;DR's Regenerate button).
- **Mock data**: `src/mock/demoData.js` has the full canned NASA "black
  holes" dataset for all three modes (`demoTldr`, `demoSong`, `demoKid`),
  shaped exactly like a real API response. `src/api/client.js` falls back
  to it automatically whenever `/api` isn't reachable — so you can build UI
  against realistic data with zero backend running.

## Architecture recap

- **Frontend**: Vite + React, plain CSS with custom properties + CSS
  Modules per component (no Tailwind). Deployed to Vercel as a static
  build.
- **Backend**: Vercel serverless functions under `/api`. One function so
  far: `api/analyze.js`. `POST /api/analyze` is the *only* endpoint the
  frontend calls — never add a new fetch target without a very good reason.
- **Local dev, two modes**:
  - `npm run dev` — Vite only. No `/api`, so every request falls back to
    mock data. Good for pure UI work, needs no API keys.
  - `npm run dev:full` (= `vercel dev`, needs `npm i -g vercel` once) —
    runs the real frontend *and* `/api` together on one port, reading
    secrets from `.env.local`. Use this to test a real transform.
- **Env vars** (put in `.env.local`, never commit it — see `.env.example`):
  - `GEMINI_API_KEY` — required for any real AI call. Free, no card, at
    https://aistudio.google.com/apikey
  - `ELEVENLABS_API_KEY` — only needed once Song mode's real audio is
    wired up. Requires a paid ElevenLabs plan (Music API isn't on the free
    tier) — https://elevenlabs.io

## API contract — `POST /api/analyze`

```
Request:  { url: string, mode: 'tldr' | 'song' | 'kid' }

Success:  {
  status: 'ok',
  mode: 'tldr' | 'song' | 'kid',
  site: {
    url, domain, title, description, analyzedAt,
    stats: { readingTimeMinutes, headingCount, linkCount, contentType }
  },
  tldr?: { summary, takeaways: string[], topics: string[], mainTopic },
  song?: { title, genre, mood, description, durationSeconds, audioUrl: string|null,
           lyrics: [{ section, lines: string[] }] },
  kid?:  { simpleExplanation, story: string[], funFacts: string[],
           quiz: [{ question, options: string[], correctIndex }] },
  notImplemented?: true,   // mode has no real transform wired up yet
  timingMs?: { extract, total }
}

Error:    { status: 'error', code, message }
  codes: INVALID_URL | FETCH_FAILED | TIMEOUT | BLOCKED | EMPTY |
         INVALID_MODE | AI_ERROR | UNKNOWN
```

`site` is always populated for every mode (extraction runs first, shared by
all three). Only the field matching `mode` is populated — don't rely on the
others being present.

Do not change this shape without posting in the team channel first — the
frontend, the mock data, and everyone's in-progress branches all assume it.

---

## Feature: Make a Song mode

**Files you'll touch:**
- `lib/elevenlabs.js` — new file, ElevenLabs Music client (mirror the style
  of `lib/gemini.js`: typed error class, timeout, one exported function).
- `lib/transforms/song.js` — new file, mirror `lib/transforms/tldr.js`:
  build a Gemini prompt + schema that returns `{ title, genre, mood,
  description, lyrics: [{section, lines}] }` sectioned Verse/Chorus/Bridge.
  Then optionally call `lib/elevenlabs.js` with the lyrics + a style prompt
  built from `genre`/`mood` to get `audioUrl` (`durationSeconds` should come
  back from ElevenLabs too, or estimate from lyric length if not).
  **If `ELEVENLABS_API_KEY` isn't set or the call fails, return
  `audioUrl: null` — do not throw.** The player UI must degrade to the
  simulated player, per the original product spec. This is the most
  important rule in this section.
- `api/analyze.js` — add an `if (mode === 'song') { ... }` branch mirroring
  the existing `tldr` branch (try/catch, same error mapping).
- `src/screens/results/SongContent.jsx` — new file, the actual UI.
- `src/screens/Results.jsx` — swap `mode === 'tldr' ? ... : <ComingSoon />`
  for a real branch once `SongContent` exists.

**ElevenLabs specifics**: the exact request/response shape wasn't fully
verified against live docs while this was written — read
https://elevenlabs.io/docs/eleven-api/guides/cookbooks/music before you
start, it may have moved. What's confirmed: it's `music.compose(...)`
style, takes a prompt (build one from genre/mood/description) and/or a
composition plan that can carry lyrics, and needs a paid plan for API
access (not the free tier). Get your own key at elevenlabs.io if the
team's shared one isn't in `.env.local` yet.

**UI spec** (`SongContent.jsx`, using the mock shape in
`demoData.js#demoSong` as your fixture):
- Two-column layout (song meta + player on the left, full lyrics on the
  right), stacks to one column on mobile.
- Kicker "MAKE A SONG", song title (large), a genre + mood line, one-line
  description.
- `SegmentedControl` for Pop / Rap / Lo-fi / Rock — demo-only per the
  original spec, just updates the displayed genre label, doesn't
  regenerate.
- Player card: animated vertical-bar waveform/equalizer (bars pulse only
  while playing — pure CSS, no audio analysis needed), a seekable progress
  bar (click to seek), elapsed/duration labels, restart + play/pause
  (larger primary icon button) + copy-lyrics controls.
  - **If `song.audioUrl` is set**: wire an actual `<audio>` element to it;
    play/pause/seek control the real element; waveform bars can still be
    decorative (or drive off `getByteFrequencyData` via the Web Audio API
    if you want to go further, not required).
  - **If `song.audioUrl` is `null`**: fully simulated — a `setInterval`
    driving elapsed time up to `durationSeconds`, waveform bars just pulse
    on a CSS animation. Build a small `useSongPlayback(song)` hook that
    returns `{ isPlaying, elapsed, duration, toggle, seek, restart }` and
    internally branches on `audioUrl` — the player component itself
    shouldn't care which mode it's in.
- Lyrics panel: sectioned by the `section` field (Verse/Chorus/Bridge),
  accent-colored kicker per section (reuse `Card`'s `.kicker` style),
  line-by-line, scrollable if long.
- Block-width "Save song" button (reuse the existing save/library wiring
  from `useAppState()` — see how `TldrContent.jsx` does it).
- No album art / image placeholder anywhere in this mode, per spec.

---

## Feature: Explain It to a Kid mode

**Files you'll touch:**
- `lib/transforms/kid.js` — new file, mirror `lib/transforms/tldr.js`.
  One Gemini call, schema returning `{ simpleExplanation, story: string[],
  funFacts: string[], quiz: [{question, options: string[], correctIndex}] }`.
  Write the prompt explicitly for a 5-7 year old audience: short sentences,
  no jargon, warm tone, but the *presentation* should stay premium (that's
  a UI concern, not a prompt concern — don't ask Gemini for "cartoonish").
  Quiz: ask for exactly 3 questions, 3 options each, and be strict in the
  schema about `correctIndex` being an integer 0-2.
- `api/analyze.js` — add the `mode === 'kid'` branch, same pattern as song.
- `src/screens/results/KidContent.jsx` — new file.
- `src/screens/Results.jsx` — wire it in next to Song's branch.

**UI spec** (fixture: `demoData.js#demoKid`):
- Kicker "EXPLAIN IT TO A KID", headline "Let's make this super easy",
  subhead noting it's written for 5-7 year-olds with grown-ups reading
  along.
- "Simple explanation" `Card` — lightbulb icon (Phosphor `Lightbulb`) +
  heading + the one-paragraph explanation.
- "A Little Story" `Card` — heading + the `story` array as 2-4 short
  paragraphs, single column, no image placeholder.
- "Fun facts" — heading with a star icon (Phosphor `Star`), 3-5 small fact
  cards in a responsive grid (reuse the `.statCard`-style pattern from
  `TldrContent.module.css` for visual consistency, or lift it into a
  shared component if you end up needing it in a third place).
- "Mini quiz" `Card` — brain icon (Phosphor `Brain`) heading, an optional
  score `Pill` once complete (e.g. "2 / 3 correct"). Each question: prompt
  + 3 answer `Button`s (`variant="secondary"`).
  - **Answers are one-shot**: once a question is answered, lock it —
    track answered state per-question in local component state, not
    global — clicking a different option after answering does nothing.
  - Correct pick → filled accent check icon on that option. Wrong pick →
    neutral X icon on the chosen option, AND reveal the right answer with
    a dashed accent outline (`border: 2px dashed var(--accent)`).
  - Compute the score `Pill` from how many of the 3 are answered correctly
    once all 3 are answered.

---

## Feature: Library polish

The Library screen (`src/screens/Library.jsx`) works — empty state,
populated grid, click-to-reopen — but is intentionally minimal. Ideas,
roughly in priority order:
- A remove/unsave affordance directly on each library card (there's already
  `unsaveResult(id)` in `AppState.jsx` — the id format is
  `` `${site.url}::${mode}` ``), with a confirm-on-hover or a small "×"
  icon button that doesn't trigger the card's own click-to-open.
- Empty-state and populated-state responsive check at 375px width.
- Sort/filter by mode once there's enough saved content to make it useful
  (don't over-build this — the spec doesn't ask for it, use judgment on
  whether it's worth the time before the deadline).
- Verify keyboard navigation: library cards are `<button>`s, should already
  be tab-reachable — just confirm the focus ring (`:focus-visible`) looks
  right against `--surface-1`.

## Feature: Backend reliability & performance

This is about hardening `lib/extract.js` / `lib/gemini.js` /
`api/analyze.js`, not building new UI. The product requirement is "very
small time gap between scraping and output generation" — concretely:
- Profile real latency once real Gemini calls are flowing (`timingMs` is
  already returned by the API — log it, or surface it in a dev-only debug
  corner of the UI).
- `lib/extract.js`'s main-content selection (`article` → `main` → `body`)
  is intentionally simple. Sites that render content client-side via JS
  (many SPAs) will come back nearly empty — cheerio doesn't execute JS.
  Decide whether that's acceptable for the demo or whether it's worth a
  headless-rendering fallback (expensive, probably out of scope before the
  21st — use judgment).
- Consider a short in-memory cache (`Map<url+mode, response>` with a TTL)
  in the serverless function so re-submitting the same demo URL during a
  live demo doesn't re-spend a Gemini call or wait on a real fetch. Note
  serverless functions are not guaranteed to stay warm between requests —
  this is a nice-to-have, not a real cache layer.
- Double check `FETCH_TIMEOUT_MS` (8s) and Gemini's `TIMEOUT_MS` (12s) in
  `lib/extract.js` / `lib/gemini.js` are sane once you're seeing real
  numbers — tune down if real latency is much lower.
- **Known sandbox limitation**: this project was scaffolded in an
  environment whose outbound network was allowlisted to package registries
  only, so live extraction and live Gemini calls could not be fully
  end-to-end tested there. `lib/extract.js`'s HTML-parsing logic *is*
  covered by `scripts/test-extract.js` against a static fixture (network-
  free), and `scripts/test-api.js` exercises the route's error handling.
  Whoever runs this locally with real internet access first should do a
  quick sanity pass against a few real URLs and report back if anything's
  off.

## Feature: Design QA & accessibility pass

- Audit every screen against `src/design-system/tokens.css` — no ad-hoc
  hex colors, no font weights past 500, no radius values outside the
  `--radius-*` tokens.
- Confirm `:focus-visible` (2px solid accent, 2px offset) shows up
  correctly on every interactive element, including inside the quiz once
  Kid mode lands.
- Confirm disabled states hit 45% opacity (see `.is-disabled` / `[disabled]`
  in `src/design-system/base.css`).
- Full responsive pass at 375px, 768px, 1024px, 1440px on every screen,
  including whichever of Song/Kid mode is furthest along.
- Verify Google Fonts (Inter) actually loads in a real deployed preview —
  it could not be tested from the sandboxed dev environment this project
  was built in (that network had no route to fonts.googleapis.com), so
  this needs a first check on Vercel or a normal laptop.

---

## Ground rules for not colliding

- One feature = one branch = one file set, per the sections above. If your
  branch needs to touch a file outside your section (e.g. everyone touches
  `api/analyze.js` and `src/screens/Results.jsx`), keep that diff tiny and
  additive — one new `if` branch, one new ternary arm — so merges stay
  trivial.
- Don't reformat or refactor shared files (`design-system/`, `AppState.jsx`,
  `client.js`) as a drive-by while working on your feature. Open a separate
  PR if something there genuinely needs to change, and flag it to the team
  first.
- Keep `src/mock/demoData.js` in sync in spirit if you change a response
  shape — the mock is what unblocks everyone else while your real
  transform is still in progress.
