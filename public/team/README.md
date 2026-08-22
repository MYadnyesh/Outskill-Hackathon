# Contributor photos

Drop headshots here with these **exact** filenames:

| File | Person |
|---|---|
| `yadnyesh.jpg` | Yadnyesh M |
| `danica.jpg` | Danica |
| `ari.jpg` | Ari |
| `indronil.jpg` | Indronil |
| `celine.jpg` | Celine |

**Square images.** They render in a 56px circle with `object-fit: cover`, so
anything non-square gets centre-cropped. 400×400 is plenty.

Using `.png` or `.webp` instead? Update the `photo:` paths in the `TEAM` array
at the top of `src/screens/About.jsx`.

**Nothing breaks if these are missing.** A missing or broken photo falls back
to the initial-letter avatar automatically.

## Adding a bio

Same `TEAM` array — add a `bio` field to any entry and it renders under the
role. See Ari's entry for the shape.
