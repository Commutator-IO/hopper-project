# Contributing

Everything published here is a first machine pass over a hand of the 1920s. The
most valuable thing anyone can do is find where it is wrong.

## Report a reading

Every reading view carries a **Report a reading** button. It opens a prefilled
issue with the ledger, the batch, the sheet and its resource ref already in
place — which is exactly what one forgets to include and exactly what makes a
report actionable. Three numberings overlap in these books: "leaf 58" is
ambiguous across six volumes, and ref 18297 is not.

A misread price, a buyer's name got wrong, a date in the wrong year: those are
the reports worth most, because they are the ones that would otherwise be
cited.

## Transcribe a batch

```bash
npm install
npm run mirror -- book-i --batches 2   # twelve sheets, ten seconds apart
npm run tiles  -- book-i 14            # overlapping crops of one sheet
npm run dev
```

Then `/transcribe-hopper`, one batch per conversation. The skill says the rest,
including which models are permitted and why the file's header records the one
that read the sheets.

After a pass:

```bash
npm run render      # fails loudly on anything outside the subset
npm run records     # only after /record-hopper
npm run tei
npm run manifest
```

## What the tooling refuses, and why

`npm run render` is strict on purpose. Every one of these failures is invisible
in the output if it is allowed through:

| Refused | Because |
|---|---|
| a resource ref not in the archive | it would render perfectly and show nothing |
| a ref belonging to another volume | it would show the wrong photograph |
| a leaf number that disagrees with the Whitney's descriptor | a mistyped leaf moves an entry to another year |
| sheets out of the order the book is bound in | the photograph would turn backwards as the reader scrolls forward |
| a macro outside the permitted subset | a converter that accepts everything mangles what it does not understand |
| a file with no `\watermark{}` | it would claim, by silence, a legal status it does not have |

## House rules

- **Never fill a gap.** `\ill{}` stays. A guessed figure is a transaction that
  did not happen.
- **Never normalise.** Not a date, not a price, not a spelling, not a fraction.
- **Never complete a record from knowledge of Hopper.** Six months on, a field
  from a scholar's memory is indistinguishable from one that was read.
- **Never describe a sketch or a photograph.** It is one pane away.
- **Never catalogue the paper.** The Whitney has, and its descriptor is shown
  verbatim beside every sheet.
- **Never extend the LaTeX subset** without extending `scripts/render.mjs`,
  `scripts/tei.mjs` and `transcripts/preamble/hopper.sty` in the same commit.

## Declaring what no file can prove

`transcripts/status.json`, keyed `<ledger>#<batch>`:

```json
{ "book-i#1": "checked" }
```

Three values: `running`, `checked`, `skipped`. Everything else the site shows
is read off the files. Only tick `checked` if a person really has gone sheet by
sheet against the photograph — the site verifies nothing, and the value of the
mark is exactly the value of the honesty behind it.
