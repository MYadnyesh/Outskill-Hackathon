# Contributing to Prism

Team project for the Outskill Hackathon. Deadline: **Aug 21**. This doc is
the git/PR workflow; `docs/FEATURES.md` is what to actually build.

## One-time setup

```bash
git clone https://github.com/MYadnyesh/Outskill-Hackathon.git
cd Outskill-Hackathon
npm install
cp .env.example .env.local   # then fill in your keys, see below
```

Get a free Gemini key (no credit card) at https://aistudio.google.com/apikey
and put it in `.env.local` as `GEMINI_API_KEY`. `.env.local` is gitignored —
never commit real keys.

## Running it locally

Three ways, pick based on what you're working on:

- **UI-only work** (styling, layout, a new screen that doesn't need a real
  API response yet): `npm run dev`. Plain Vite, no backend — every request
  automatically falls back to the bundled demo data (see
  `src/mock/demoData.js`), so you don't need any keys at all.
- **Backend or full end-to-end work, no Vercel account**: `npm run dev:local`.
  Runs `scripts/dev-server.js` (a plain Node server that executes
  `api/analyze.js` directly) alongside Vite, wired together by the `/api`
  proxy in `vite.config.js`. Reads secrets from `.env.local`, no CLI login
  required — this is the easiest way to hit real Gemini locally.
- **Closest match to production**: `npm run dev:netlify` (runs `netlify dev`).
  Serves the Vite app and the real Netlify Function together on
  http://localhost:8888, routing `/api/analyze` exactly as the deploy does.
  Needs no login. This is the one to use before shipping anything that touches
  the endpoint.
- **Vercel-exact behavior**: `npm run dev:full` (runs `vercel dev`). The
  project still deploys to Vercel unchanged; this reproduces that runtime.

Before opening a PR that touches `/api` or `/lib`, run:
```bash
npm run test:api       # smoke-tests api/analyze.js directly, no CLI needed
node scripts/test-extract.js   # unit test for HTML parsing, no network needed
npm run build           # make sure the production build doesn't break
```

## Branches

- `main` is the deployed branch — every push to `main` auto-deploys on
  Netlify once it's connected (see README for the one-time import step).
  Don't push straight to `main`.
- Branch per feature, off `main`:
  ```bash
  git checkout main && git pull
  git checkout -b feature/<short-name>
  ```
  Suggested names matching `docs/FEATURES.md`'s sections:
  `feature/song-mode`, `feature/kid-mode`, `feature/library-polish`,
  `feature/backend-reliability`, `feature/design-qa`. Claim one by pushing
  to it / opening a draft PR early, so it's obvious to the rest of the team
  what's taken — this repo doesn't have a separate task board, the branch
  list *is* the task board.
- If two features genuinely need the same file (most likely
  `api/analyze.js` and `src/screens/Results.jsx` — see "ground rules" at
  the bottom of `docs/FEATURES.md`), keep your change there small and
  additive to minimize merge pain.

## Commits

Plain, present-tense, specific. No strict convention enforced, but roughly:

```
add song lyrics transform + gemini prompt
wire elevenlabs music client with null-audio fallback
fix quiz options not locking after first answer
```

Small, frequent commits beat one giant commit at the end — easier for
everyone else to see what's landed.

## Pull requests

1. Push your branch, open a PR into `main`.
2. Netlify will comment on the PR with a deploy preview link once the repo's
   connected (ask whoever set it up if you don't see one) — use it to
   sanity-check on a real deployed URL, not just localhost.
3. One other person reviews before merge if you can get someone — for a
   hackathon deadline, a quick "looks reasonable, doesn't break the build"
   is enough, this isn't a production review bar.
4. Squash or regular merge, either's fine. Delete the branch after merge.

## If something's broken and you don't know why

- Check `docs/FEATURES.md` first — it documents the exact contract every
  piece assumes (`POST /api/analyze`'s request/response shape). A lot of
  "why is this undefined" bugs come from a response shape drifting.
  If your response payload for reference: `demoTldr` / `demoSong` /
  `demoKid` in `src/mock/demoData.js` is the shape to match.
- If Gemini calls are failing, first check `.env.local` has
  `GEMINI_API_KEY` set and `npm run dev:local` or `npm run dev:netlify` (not
  plain `npm run dev`) is what's running — plain Vite never reaches the
  real API.
- If Gemini errors with a 404 on the model name, or with "malformed JSON"
  on real (non-trivial) pages: `lib/gemini.js`'s default model has already
  been bumped once (`gemini-2.5-flash` → `gemini-3.6-flash`, the old one
  was retired for new API keys) and its `thinkingConfig.thinkingBudget` is
  capped at `512` because uncapped thinking on the newer model can burn the
  whole `maxOutputTokens` budget on reasoning before writing any JSON,
  truncating the response. If this recurs on a future model swap, check
  `finishReason` / `usageMetadata.thoughtsTokenCount` in the raw Gemini
  response before assuming your own code broke it.
- **The Gemini free tier allows only 20 requests per day, per model.** Hit
  it and every transform returns `AI_ERROR`. `lib/gemini.js` handles this
  automatically: it walks a 5-model priority list and advances on 429/404/503,
  so each fallback buys another 20/day. A line like
  `[Prism] Gemini fell back to gemini-3.5-flash (gemini-3.6-flash unavailable)`
  in the server log is that working as intended, not a bug — but it does mean
  the preferred model's daily budget is gone. Override the list with
  `GEMINI_MODELS` (see `.env.example`) if you need different models. If you
  exhaust *every* model in the list, you're out until the quota resets.
- Ping the group chat rather than sitting stuck for more than ~20 minutes
  — the deadline's tight enough that unblocking each other fast matters
  more than everyone independently debugging the same class of issue.
