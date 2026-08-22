# Prism

**One URL. Three ways to understand it.**

Paste a website. Pick a mode. Get a fast TL;DR, a full song written from the
page, or a kid-friendly explanation with a story and a quiz — one mode at a
time, real AI under the hood.

Built for the Outskill Hackathon.

<p>
  <img src="docs/screenshots/landing.png" width="720" alt="Prism landing screen" />
</p>
<p>
  <img src="docs/screenshots/results-tldr.png" width="720" alt="Prism TL;DR results screen" />
</p>

## Status

| Mode | Status |
|---|---|
| ⚡ TL;DR | **Live** — real extraction + real Gemini summary |
| 🎵 Make a Song | **Live** — real Gemini lyrics; real audio when an ElevenLabs key is set, simulated player otherwise |
| 🧸 Explain Like I'm 5 | **Live** — real Gemini explanation, story, fun facts, and quiz |

Landing, processing animation, error handling, save/share, the Library, and
the About and How-it-works pages all work today for every mode. Remaining work
is polish rather than new modes — Library affordances and backend caching, both
specced in [`docs/FEATURES.md`](docs/FEATURES.md).

## Tech stack

- **Frontend**: Vite + React, plain CSS (custom properties + CSS Modules,
  no utility framework) — the "Clay" design system lives in
  `src/design-system/`, implementing [`DESIGN.md`](DESIGN.md).
- **Backend**: Vercel serverless functions (`/api`), no separate server to
  run or host.
- **AI**: [Google Gemini](https://aistudio.google.com/apikey) (free tier,
  no card) for text — summaries, lyrics, kid explanations, quizzes. Real
  song *audio* uses [ElevenLabs Music](https://elevenlabs.io) (paid — see
  `docs/FEATURES.md#feature-make-a-song-mode`), with a graceful fallback to
  a simulated player when no key is configured.
- **Icons**: [Phosphor Icons](https://phosphoricons.com/).
- **Deployment**: [Vercel](https://vercel.com) — static frontend + `/api`
  functions, zero-config.

## Quickstart

```bash
git clone https://github.com/MYadnyesh/Outskill-Hackathon.git
cd Outskill-Hackathon
npm install
cp .env.example .env.local   # add your GEMINI_API_KEY
npm run dev                  # UI only, mock data, no keys needed
# or
npm run dev:local            # full stack, no Vercel account needed
# or
npm run dev:full             # full stack via `vercel dev` (needs a Vercel login)
```

Get a free Gemini key at https://aistudio.google.com/apikey — no credit
card required.

Full contributor workflow (branches, PRs, testing) is in
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## Deploying

**Netlify is the primary target.** Its synchronous functions get a fixed
**60 seconds on every plan**, including the free one. Song mode takes 12–17s
end to end, and Vercel's ceiling depends on the plan — it can be as low as 10s,
which would fail every song request. Netlify removes that variable.

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. Go to https://app.netlify.com/start and import it. `netlify.toml` already
   sets the build (`npm run build`) and publish directory (`dist`), so there's
   nothing to configure.
3. Under **Site configuration → Environment variables**, add `GEMINI_API_KEY`
   (plus `ELEVENLABS_API_KEY` for real song audio and `FIRECRAWL_API_KEY` for
   higher scrape limits). These are separate from your local `.env.local` —
   Netlify doesn't read that file.
4. Deploy. Every push to `main` auto-deploys; every PR gets a deploy preview.

`POST /api/analyze` is served by `netlify/functions/analyze.mjs`, which routes
itself with `export const config = { path: '/api/analyze' }` — no redirect
rules involved.

### Vercel still works
`vercel.json` and `api/analyze.js` are untouched, so the project deploys to
Vercel unchanged — the Netlify function is a thin adapter around the same
handler. If you go that route, check **Settings → Functions** for the duration
cap first: below 30s, song mode will time out.

## Project structure

```
api/analyze.js          the one backend endpoint (POST url+mode -> result)
lib/extract.js           real server-side URL scraping (cheerio)
lib/gemini.js             thin Gemini REST client
lib/elevenlabs.js         thin ElevenLabs Music client (optional, paid)
lib/transforms/tldr.js    TL;DR transform (the reference pattern)
lib/transforms/song.js    lyrics via Gemini + best-effort audio
lib/transforms/kid.js     explanation, story, fun facts, quiz
src/design-system/        tokens, base styles, shared component kit
src/state/AppState.jsx    the whole app's state machine
src/api/client.js         frontend -> backend, with mock-data fallback
src/mock/demoData.js      canned "black holes" dataset, all 3 modes
src/screens/              Landing, Processing, Error, Results, Library,
                          About, HowItWorks
src/screens/results/      per-mode content components + useSongPlayback
scripts/test-api.js       local smoke test for api/analyze.js (no CLI needed)
scripts/test-extract.js   unit test for HTML parsing (no network needed)
docs/FEATURES.md          remaining polish work + exact specs
DESIGN.md                 the Clay design spec the UI implements
```

## Design system

**"Clay"** — a warm, light interface adapted from [`DESIGN.md`](DESIGN.md),
installed with `npx getdesign@latest add clay`. A cream canvas (`#fffaf0`)
carries near-black ink type, solid near-black CTAs, and a six-colour set of
saturated feature cards (pink, teal, lavender, peach, ochre, mint) that do the
work most interfaces give to shadows. Display headlines run Inter 500 with
negative letter-spacing; titles and buttons use 600. Radius is generous — 12px
for controls, 16px for cards, 24px for feature cards.

Tokens are defined once in `src/design-system/tokens.css` — always pull from
there rather than hardcoding a colour or spacing value. Every colour pairing in
the palette is checked against WCAG AA (4.5:1 for text, 3:1 for UI boundaries);
two of `DESIGN.md`'s own recommendations fail that bar and are deliberately
overridden in the token file, with the measured ratios noted inline.

> Prism was previously a dark theme called "Nocturne". Because every component
> reads from tokens and no file hardcodes a colour, switching the whole app to
> Clay was a rewrite of `tokens.css` plus a handful of component fixes.

## Known limitations (by design, for now)

- No accounts, no real persistence beyond the current browser session (the
  Library resets on reload) — matches the hackathon scope.
- Song mode's *audio* needs a paid ElevenLabs plan. Without
  `ELEVENLABS_API_KEY` the lyrics still generate normally and the player
  falls back to simulated playback (`audioUrl: null`) — it never fails the
  request. Generated audio is returned as a base64 `data:` URI (the API
  hands back raw bytes and this project has no blob storage), which is why
  `lib/elevenlabs.js` caps track length at 30s.
- Google Fonts (Inter) requires normal internet access to load — it won't
  render in network-restricted sandboxes, only real browsers/deployments.
- `GEMINI_MODEL` defaults to `gemini-3.6-flash` (see `lib/gemini.js`) —
  `gemini-2.5-flash`, the old default, has been retired for new API keys.
  If you have `GEMINI_MODEL` pinned in your own `.env.local`, make sure
  it's a currently-available model or unset it to use the default.
