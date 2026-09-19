# The Books Kept at 3 Washington Square North — a critical note

A draft article on the Hopper ledgers and notebooks, written from this
edition's transcriptions and derived data, prepared as the ground for the article in
[`jtei/`](jtei/), which is the piece meant for the *Journal of the Text
Encoding Initiative*. It is an experiment in method with the Hopper corpus as its
occasion, and it says so on its first page.

The built PDF is not kept here: the note was a first experiment, and the
article in [`jtei/`](jtei/) is the piece meant for submission. The sources
remain, and the note rebuilds from them.

- `tex/` — the LaTeX sources, one file per chapter; `tables.mjs` and
  `figures.mjs` regenerate `tables.tex` and `fig-*.tex` from
  `src/content/*.json`; `schemas.mjs` holds the compositional schemas.

Rebuild with [Tectonic](https://tectonic-typesetting.github.io/) from `tex/`:

```bash
node tables.mjs && node figures.mjs && tectonic main.tex
```

The fonts are Charter and Helvetica Neue, as installed on macOS; substitute
in `main.tex` on another system.

## Licence

The note, its tables, its figures and these sources are © 2026 Michel Hua and
licensed under [Creative Commons Attribution 4.0 International (CC BY
4.0)](https://creativecommons.org/licenses/by/4.0/). This is an exception to
the repository's [`LICENSE`](../../LICENSE), which dedicates the software and
the generated data to the public domain under CC0 — those remain CC0, and the
tables and figures here are built from them. The transcribed words of
Josephine and Edward Hopper quoted in the note are © Heirs of Josephine N.
Hopper, licensed by Artists Rights Society (ARS), New York, and are quoted for
criticism and study; see [`transcripts/NOTICE`](../../transcripts/NOTICE).

The note was drafted by Claude Fable 5.1 under the direction of Michel Hua on
13 September 2026, from transcriptions read by Claude Opus 5 and Fable 5.1;
the front note states this in full.
