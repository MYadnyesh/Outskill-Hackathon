# CLAUDE.md

Project brief for Claude Code sessions working in this repo. Read this
first; it points to the real docs rather than duplicating them.

## What this is

**Prism** — "One URL. Three ways to understand it." Paste a website, pick
one mode (TL;DR / Make a Song / Explain It to a Kid), get a real AI
transform of that page. Outskill Hackathon project, team of 5, deadline
**Aug 21**.

## Read before touching code

- **`docs/FEATURES.md`** — the actual implementation spec for everything
  not yet built (Song mode, Kid mode, Library polish, backend reliability,
  design QA). If your task is one of those, the file/data-shape/UI spec is
  already written there. Don't re-derive it from scratch.
- **`CONTRIBUTING.md`** — branch naming, PR flow, local dev commands.
- **`README.md`** — project overview, quickstart, Vercel deploy steps.

## Current status

| Mode | Status |
|---|---|
| TL;DR | **Live** — real extraction (`lib/extract.js`) + real Gemini call (`lib/transforms/tldr.js`) |
| Make a Song | Shared shell only — shows a "coming soon" placeholder. Spec: `docs/FEATURES.md#feature-make-a-song-mode` |
| Explain Like I'm 5 | Shared shell only — shows a "coming soon" placeholder. Spec: `docs/FEATURES.md#feature-explain-it-to-a-kid-mode` |

TL;DR is the reference pattern — copy its shape (`lib/transforms/tldr.js`
+ the `mode === 'tldr'` branch in `api/analyze.js` +
`src/screens/results/TldrContent.jsx`) when building Song/Kid.

## Architecture map

```
api/analyze.js              POST url+mode -> result. The ONLY backend endpoint.
lib/extract.js               real server-side scraping (cheerio), no AI
lib/gemini.js                 thin Gemini REST client, generateJSON(prompt, schema)
lib/transforms/tldr.js        the one finished transform — copy this pattern
lib/transforms/song.js        NOT YET BUILT — see docs/FEATURES.md
lib/transforms/kid.js         NOT YET BUILT — see docs/FEATURES.md
lib/elevenlabs.js             NOT YET BUILT — real song audio client

src/design-system/            tokens.css (colors/type/spacing/shadow), base.css,
                                components/ (Button, Pill, Card, TextField,
                                SegmentedControl, TopNav, SelectableCard,
                                IconBadge, Divider) — a shared kit, reuse it
src/state/AppState.jsx        the whole state machine. startTransform(url, mode)
                                is the one entry point that triggers a transform.
src/api/client.js             frontend -> backend fetch, falls back to
                                src/mock/demoData.js when /api is unreachable
src/mock/demoData.js          canned "black holes" dataset, all 3 modes,
                                shaped exactly like a real API response —
                                use it as your fixture when building UI
src/screens/                  Landing, Processing, Error, Results, Library
scripts/test-api.js           smoke test for api/analyze.js, no Vercel CLI needed
scripts/test-extract.js       unit test for HTML parsing, no network needed
scripts/dev-server.js         runs api/analyze.js as a plain Node server —
                                no Vercel account needed, paired with the
                                /api proxy in vite.config.js (npm run dev:local)
```

## API contract (condensed — full version in `docs/FEATURES.md`)

```
POST /api/analyze
  body: { url: string, mode: 'tldr' | 'song' | 'kid' }

  success: { status: 'ok', mode, site: {...}, tldr?|song?|kid?: {...}, notImplemented?: true }
  error:   { status: 'error', code, message }
```

Never change this shape without checking `docs/FEATURES.md` and the team —
the frontend, the mock data, and every in-progress branch assume it.

## Hard rules

- **Design tokens only.** Every color/spacing/radius/shadow comes from
  `src/design-system/tokens.css`. No ad-hoc hex codes, no font weight past
  500 (medium is the heaviest weight anywhere, including headings).
- **Reuse the component kit** (`src/design-system/components/`) instead of
  hand-rolling a new button/card/input.
- **Don't drive-by refactor shared files** — `design-system/`,
  `AppState.jsx`, `src/api/client.js` — while working on a feature branch.
  If one genuinely needs to change, keep the diff small and flag it to the
  team first (see "ground rules" at the bottom of `docs/FEATURES.md`).
- **Song mode's real audio must degrade gracefully.** If
  `ELEVENLABS_API_KEY` is unset or the call fails, return `audioUrl: null`
  — never throw. The player UI is required to fall back to a simulated
  player either way.
- **Never commit `.env.local`** or real API keys. `.env.example` documents
  what's needed.

## Commands

```bash
npm install
cp .env.example .env.local      # add GEMINI_API_KEY (free, no card: aistudio.google.com/apikey)

npm run dev                     # Vite only, no backend, mock data — UI work, no keys needed
npm run dev:local               # real /api (scripts/dev-server.js) + real frontend, no Vercel account
npm run dev:full                # vercel dev — same, but via the actual Vercel CLI (needs a login)

npm run build                   # production build, must stay clean
npm run test:api                # smoke-tests api/analyze.js directly
node scripts/test-extract.js    # unit test for HTML parsing
```

## Known limitations worth knowing before you debug something that isn't a bug

- This project was originally scaffolded in a network-sandboxed
  environment (package registries only, no route to Gemini, ElevenLabs, or
  arbitrary websites) — so the real extraction/Gemini path could only be
  verified there via static fixtures and mocked error paths, not a live
  end-to-end call. If something in `lib/extract.js` or `lib/gemini.js`
  behaves oddly against a *real* URL, it hasn't necessarily been seen
  before — treat it as a genuine bug report, not a "did I break this"
  question.
- No accounts, no persistence beyond the browser session (Library resets
  on reload) — intentional, matches hackathon scope.
- Real song *audio* requires a paid ElevenLabs plan — there's currently no
  free/reliable API that produces real sung vocals from lyrics. This is a
  real cost decision, not an oversight; see `docs/FEATURES.md` for the
  fallback behavior when no key is present.
- `lib/gemini.js`'s default model was `gemini-2.5-flash`; that's now
  retired for new API keys and the default is `gemini-3.6-flash`. That
  model does internal "thinking" by default, which — uncapped — was
  burning the entire `maxOutputTokens` budget on reasoning before writing
  any JSON (`finishReason: MAX_TOKENS`, truncated/malformed output) on
  real, non-trivial page content. Fixed by pinning
  `generationConfig.thinkingConfig.thinkingBudget` to `512` in
  `generateJSON()`. If a future model swap reintroduces malformed-JSON
  errors that only show up on real (not toy) prompts, check
  `usageMetadata.thoughtsTokenCount` / `finishReason` in the raw Gemini
  response before assuming the caller's code is wrong.
