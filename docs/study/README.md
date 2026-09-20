# A machine reads the Hopper ledgers

The article prepared for the *Journal of the Text Encoding Initiative*, and the
scripts that draw its figures and tables.

- `article.tex` — the article; `sec-pace.tex` is its section on the pace, and
  `fig-*.tex` its figures. `article.pdf` and `article.txt` are built from it.
- `figures.mjs` — draws the four figures taken from the derived data, and drops
  nine more it still knows how to draw from the critical note this article grew
  out of.
- `tables.mjs` — writes `tables.tex`, from which `tables-subset.tex`, the
  article's Appendix B, is cut.
- `schemas.mjs` — the compositional schemas of the abandoned note, kept because
  `figures.mjs` reads it.
- `tei.mjs` — the submission: the article encoded in TEI against the
  journal's own schema, `tei_jtei`, and validated against it in both halves
  (RELAX NG with jing, Schematron with SchXslt on Saxon). `npm run article-tei`
  compiles each figure on its own, rasterises it to PNG at 300 dpi, writes
  `submission/article.xml` beside the PNGs and the sources, and fails on any
  error the journal's validator would report. `submission/` is not committed.

```bash
cd docs/study && node figures.mjs && node tables.mjs && tectonic article.tex
npm run article-tei
```

The fonts are Charter and Menlo, as installed on macOS; substitute in the
preamble on another system.

## The note this grew out of

*The Books Kept at 3 Washington Square North*, a book-length critical note on
the ledgers drafted on 13 September 2026, is **abandoned**. Its chapters were
removed on 20 September; git holds them. What survives is what the article
uses: the two generators above, and the figures they draw.

## Licence

The article and these sources are © 2026 Michel Hua, licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — an exception to the
repository's [`LICENSE`](../../LICENSE), which dedicates the software and the
generated data to the public domain under CC0.

The transcribed words of Josephine and Edward Hopper are © Heirs of Josephine
N. Hopper, licensed by Artists Rights Society (ARS), New York, and are quoted
for criticism and study. The photographs are the Whitney Museum's and are not
stored by this repository.
