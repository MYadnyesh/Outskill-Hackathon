# Mode button artwork

Drop the three illustrated buttons here with these **exact** filenames:

| File | Mode | Button reads |
|---|---|---|
| `tldr.png` | TL;DR | "TOO LONG, DO NOT READ" |
| `song.png` | Make a Song | "MAKE IT AS A SONG" |
| `kid.png` | Explain Like I'm 5 | "EXPLAIN LIKE I'M 5 YEAR OLD" |

`.png` with transparency is what the current art uses. If you'd rather use
`.jpg` or `.webp`, update the `art:` paths in `src/screens/Landing.jsx`.

**Nothing breaks if these are missing.** `SelectableCard` falls back to the
icon + text card, so the picker keeps working until the files land.

Wide and short suits the layout — the images render full-width in the card at
roughly a 3:1 ratio. Keep them under ~200 KB each; they load on first paint.
