# The jTEI article, and the note it grew out of

[`jtei/`](jtei/) holds the article prepared for the *Journal of the Text
Encoding Initiative* — the piece that is being submitted, and the only one
maintained here.

Beside it, `tex/` holds the LaTeX sources of *The Books Kept at 3 Washington
Square North*, a book-length critical note on the ledgers drafted from the
transcriptions on 13 September 2026. **It is abandoned.** Its built PDF is no
longer kept, the article no longer cites it, and nothing depends on it; the
sources stay because the figures, the tables and the compositional schemas in
them were written against the derived data and may be worth reusing.

- `jtei/` — the article, its figures and its tables.
- `tex/` — the abandoned note: one file per chapter; `tables.mjs` and
  `figures.mjs` regenerate `tables.tex` and `fig-*.tex` from
  `src/content/*.json`; `schemas.mjs` holds the compositional schemas.

The journal takes « a word-processor file format (OpenOffice, Microsoft Word,
RTF, etc.) or an XML format » and does not take PDF, so the file that is
actually submitted is built by `npm run docx`: it compiles each figure on its
own, rasterises it to PNG at 300 dpi, and converts the article with pandoc into
`jtei/submission/`, which is not committed. The result has to be read before it
is sent.

Rebuild either with [Tectonic](https://tectonic-typesetting.github.io/):

```bash
cd jtei && tectonic article.tex
```

The fonts are Charter and Helvetica Neue, as installed on macOS; substitute in
the preamble on another system.

## Licence

The article and these sources are © 2026 Michel Hua and licensed under
[Creative Commons Attribution 4.0 International (CC BY
4.0)](https://creativecommons.org/licenses/by/4.0/). This is an exception to
the repository's [`LICENSE`](../../LICENSE), which dedicates the software and
the generated data to the public domain under CC0 — those remain CC0.

The transcribed words of Josephine and Edward Hopper are © Heirs of Josephine
N. Hopper, licensed by Artists Rights Society (ARS), New York, and are quoted
for criticism and study. The photographs are the Whitney Museum's and are not
stored by this repository.
