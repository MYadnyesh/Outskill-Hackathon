# Mode button artwork

Drop the three illustrated buttons here with these **exact** filenames:

| File | Mode | Button reads |
|---|---|---|
| `tldr.jpeg` | TL;DR | "TOO LONG, DO NOT READ" |
| `song.jpeg` | Make a Song | "MAKE IT AS A SONG" |
| `kid.jpeg` | Explain Like I'm 5 | "EXPLAIN LIKE I'M 5 YEAR OLD" |

The current art is `.jpeg`. If you swap to another format, update the `art:`
paths in the `MODES` array in `src/screens/Landing.jsx` to match — the
filename and extension there must be exact.

**Nothing breaks if these are missing.** `SelectableCard` falls back to the
icon + text card, so the picker keeps working until the files land.

Wide and short suits the layout — the images render full-width in the card at
roughly a 3:1 ratio. Keep them under ~200 KB each; they load on first paint.
