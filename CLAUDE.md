# CLAUDE.md

Project brief for Claude Code sessions working in this repo. Read this
first; it points to the real docs rather than duplicating them.

## What this is

**Prism** — "One URL. Three ways to understand it." Paste a website, pick
one mode (TL;DR / Make a Song / Explain It to a Kid), get a real AI
transform of that page. Outskill Hackathon project, team of 5, deadline
**Aug 21**.

## Read before touching code

- **`docs/FEATURES.md`** — the implementation spec. All three modes are now
  built; what's left there is Library polish, backend reliability, and the
  design/accessibility pass. The Song and Kid sections are kept as built
  documentation of how those modes work. Don't re-derive any of it.
- **`CONTRIBUTING.md`** — branch naming, PR flow, local dev commands.
- **`README.md`** — project overview, quickstart, Vercel deploy steps.

## Current status

| Mode | Status |
|---|---|
| TL;DR | **Live** — real extraction (`lib/extract.js`) + real Gemini call (`lib/transforms/tldr.js`) |
| Make a Song | **Live** — Gemini lyrics (`lib/transforms/song.js`); audio via `lib/elevenlabs.js` when `ELEVENLABS_API_KEY` is set, simulated player otherwise |
| Explain Like I'm 5 | **Live** — Gemini explanation/story/facts/quiz (`lib/transforms/kid.js`) |

All three modes are built. TL;DR remains the reference pattern for any new
transform — copy its shape (`lib/transforms/tldr.js` + the `mode === 'tldr'`
branch in `api/analyze.js` + `src/screens/results/TldrContent.jsx`).

Remaining work is polish, not new modes: Library affordances, backend
reliability/caching, and a design + accessibility pass. All specced in
`docs/FEATURES.md`.

## Architecture map

```
api/analyze.js              POST url+mode -> result. The ONLY backend endpoint.
                              Written to the Vercel (req,res) signature; the
                              Netlify function and scripts/dev-server.js both
                              adapt it rather than forking it.
netlify/functions/analyze.mjs Netlify v2 adapter. Routes itself to /api/analyze
                              via `export const config = { path }`.
lib/extract.js               real server-side scraping (cheerio), no AI
lib/gemini.js                 thin Gemini REST client, generateJSON(prompt, schema)
lib/elevenlabs.js             thin ElevenLabs Music client, composeMusic(...).
                                Optional + paid; every failure is expected to be
                                swallowed by song.js into audioUrl: null.
lib/transforms/tldr.js        the reference transform — copy this pattern
lib/transforms/song.js        Gemini lyrics + best-effort ElevenLabs audio
lib/transforms/kid.js         Gemini explanation, story, fun facts, quiz

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
src/screens/                  Landing, Processing, Error, Results, Library,
                                About, HowItWorks (+ HeroArtifact, the hero SVG)
src/screens/results/          TldrContent / SongContent / KidContent, plus
                                useSongPlayback.js (owns the real-audio vs
                                simulated-playback branch so the player UI
                                doesn't have to care which it's in)
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
  `src/design-system/tokens.css`. No ad-hoc hex codes anywhere else — that
  discipline is what let the whole app switch from the old dark "Nocturne"
  theme to "Clay" by rewriting one file.
- **The design system is "Clay"** — see `DESIGN.md` (installed via
  `npx getdesign@latest add clay`). Cream canvas, near-black ink and CTAs,
  saturated feature cards. Display headings stay at weight 500 with negative
  letter-spacing; titles and buttons use `--fw-semibold` (600). Cycle the
  brand card colours and never repeat one adjacently.
- **Check contrast before adding a colour pairing.** Two of `DESIGN.md`'s own
  recommendations fail WCAG AA and are overridden in `tokens.css` (white on
  `--brand-pink` is 3.14:1, raw lavender on cream is 2.11:1). Measured ratios
  are noted inline there; keep that up if you add tones.
- **SVG icons, never emoji.** Emoji render differently per platform and carry
  no accessible name. The kit uses Phosphor throughout.
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
- **Deploy target is Netlify**, because its synchronous functions get a fixed
  60s on every plan while Vercel's ceiling is plan-dependent and can be 10s —
  song mode takes 12-17s. `api/analyze.js` stays host-agnostic so all three
  runners (Netlify, Vercel, local) share one implementation; if you change the
  handler's signature you must update `netlify/functions/analyze.mjs` and
  `scripts/dev-server.js` with it.
- **Never commit `.env.local`** or real API keys. `.env.example` documents
  what's needed.
- **Demo data must never stand in for a failed real request in a deployed
  build.** `getDemoResponse()` ignores the URL and always returns the canned
  "black holes" dataset, so substituting it renders a confident wrong answer
  (an Artificial Intelligence page comes back as a NASA black-holes summary).
  `src/api/client.js` gates the fallback behind `import.meta.env.DEV`, and
  `Results.jsx` shows a banner whenever `_demo` is set. Don't loosen either.
- **`lib/extract.js` fetches attacker-controlled URLs from inside our network.**
  Keep `assertPublicHost()` on every request *and* every redirect hop, and keep
  redirects manual — `redirect: 'follow'` silently reintroduces the SSRF.

## Commands

```bash
npm install
cp .env.example .env.local      # add GEMINI_API_KEY (free, no card: aistudio.google.com/apikey)

npm run dev                     # Vite only, no backend, mock data — UI work, no keys needed
npm run dev:local               # real /api (scripts/dev-server.js) + real frontend, no account needed
npm run dev:netlify             # netlify dev — closest match to the deployed target
npm run dev:full                # vercel dev — the Vercel equivalent (needs a login)

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
- `POST /v1/music` returns **raw audio bytes**, not a hosted URL, but the
  API contract specifies `audioUrl: string|null`. With no blob storage in
  this project, `lib/elevenlabs.js` base64-encodes the bytes into a `data:`
  URI so `audioUrl` stays a plain string an `<audio src>` accepts. Base64
  inflates ~1.33x and Vercel caps function responses around 4.5MB, which is
  why track length is capped at 60s. Real blob storage is the right fix if
  song audio ever becomes more than a demo.
- All three modes have now been exercised against the **live** Gemini API
  (Aug 21): real summaries, lyrics and kid explanations all returned and
  rendered. Kid mode's stricter `responseSchema` (`minItems`/`maxItems`/
  `minimum`/`maximum`) is accepted by the API, and `correctIndex` came back
  0-based and in range. **ElevenLabs is still unexercised** — the Music API
  needs a paid plan, so only its no-key fallback (`audioUrl: null`) has been
  confirmed, which is the path that matters most.
- **Gemini's free tier is capped at 20 requests/day PER MODEL.** This is the
  single most likely reason a working demo suddenly returns `AI_ERROR` for
  every mode. `generateJSON()` in `lib/gemini.js` walks a 5-model priority
  list and advances on 429 (quota) / 404 (retired) / 503 (overloaded), so
  each fallback buys another 20/day; the walk is nearly free because those
  rejections return in well under a second. Two deliberate properties worth
  not "fixing": the 20s timeout is a **total** budget across all attempts
  (so fallback can never widen the worst case), and request-level failures
  — a bad schema, a safety block — set `canFallback: false` so they fail
  fast instead of being retried against all five models. Configure via
  `GEMINI_MODEL` (preferred model only) or `GEMINI_MODELS` (whole list).
- **The model list leads with `-lite`, on purpose.** The full flash models are
  both the first to hit the 20/day cap and the worst hit under load — measured
  at 48-57s for a two-character prompt while `-lite` answered the same in under
  a second. Since the timeout is a shared budget, one model that slow starves
  every model behind it. Don't "upgrade" the order back to quality-first.
- **A slow model is worse than a dead one.** `gemini-3.7-flash` was measured
  returning 503 after **80 seconds** under load. Because the 20s timeout is a
  shared budget, one model that slow to refuse starves every fallback behind
  it. Two things guard against this: `DEFAULT_MODELS` is ordered by *observed
  reliability* (a fast `-lite` model sits second so a cold start reaches
  something working in one hop, and 3.7-flash is last), and failures are
  recorded in a `skipUntil` cooldown map — 10 min for a 429/404, 60s for a
  503/timeout — so the next request doesn't re-pay the same penalty. Don't
  reorder that list by nominal capability alone.
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
