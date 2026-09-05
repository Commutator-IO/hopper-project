---
name: transcribe-hopper
description: Transcribes a batch of twelve digitised sheets from the Edward and Josephine Hopper artist's ledgers (Whitney Museum of American Art, 96.208–96.213) into clean LaTeX with a critical apparatus — what was read, what was guessed, what is illegible, and whose hand wrote it. Use whenever someone asks to transcribe, read, decipher or put into LaTeX any sheets of the Hopper ledgers, or names a volume (Book I to Book V, Dealers/Etchings), a batch, a leaf or a resource ref. There is one edition and this skill produces it; /tag-hopper revises the keywords line that closes it. Also covers revisions — correcting a reading, filling a skipped sheet.
---

# Transcribing a batch from the Hopper ledgers

**Runs on Fable 5.1, Fable 5 or Opus 5, and on nothing else.** The model is not
inherited from whatever the session happens to be on: reading forty ruled lines
of a 1920s hand off twelve page images at once is a sustained-visual-attention
task before it is anything else, and a pass on a model nobody chose produces a
file whose provenance is an accident.

- **Fable 5.1 (`claude-fable-5-1`)** — permitted.
- **Fable 5 (`claude-fable-5`)** — permitted.
- **Opus 5 (`claude-opus-5`)** — permitted; what the first batch of Book I was
  read with.
- **Anything else** — stop, say which model the session is on, and do not
  transcribe.

**The header comment must record the model actually used**, in the form the
existing files use:

```
% Pass: Opus 5 (claude-opus-5), 2026-09-05 - first pass, unchecked against the
% sheets by a human.
```

Report the model in the closing message too, so the choice is visible without
opening the file.

**Comparing models.** A run made to compare models re-transcribes a batch that
already has a transcription and must not overwrite it: work on a branch
(`git switch -c fable-book-i-1`) so the two readings can be diffed and one
discarded. Say what the comparison showed — disagreements over a figure, a
passage one model guessed and the other flagged — and do not declare a winner
from a single batch.

## What this produces

For **one batch of twelve sheets**, one file:

| File | Contents |
|---|---|
| `transcripts/<ledger>/batch-NN.tex` | The transcription — the sheets as written, with the apparatus |

There is **no second edition**, and that is deliberate. The Grothendieck
workbench this method comes from carries a modernised reading beside each
transcription, because a page of 1962 mathematics is genuinely hard to read in
1962's notation. A ledger needs no such pass: Jo Hopper's English is plain, her
columns are already a table, and « 30 - 1/3 » means today what it meant in
1927. So the transcription is the edition, and the `\keywords{}` line that tags
a ledger lives in it.

Then:

```bash
npm run render      # -> the reading view the site's left pane shows; fails loudly
npm run tei         # -> a TEI P5 file per transcription
npm run pdf         # -> the PDF the download row offers (needs a LaTeX engine)
npm run manifest    # tell the site which files now exist
```

**Two things govern everything below.**

**An invented figure is a transaction that did not happen.** This is the
difference between a ledger and a manuscript of prose, and it is not a
difference of degree. A guessed word in a letter is a bad reading. A guessed
figure here is a sale, at a price nobody paid, to a buyer who never bought —
and it will be cited, because a table looks like data in a way that prose does
not. `\ill{}` exists so that never happens. Use it.

**No summary opens the transcription, and no normalisation creeps into it.**
Somebody reading it wants the sheets. The one thing in the file that is not on
the paper is the `\keywords{}` line at the end, and it earns its place: a
reader looking for Keppel needs some way in, and a tag written by whoever read
the sheets is the only kind that cannot describe unread ones.

**One batch per pass, one batch per conversation.** Past twelve of these leaves
the quality of reading degrades towards the end with nothing to signal it, and
a transcription whose weakening point is unknown cannot be used.

## Before anything: what these sheets are

### Two people wrote them, and the whole documentary value is in telling them apart

The book says so itself. On the inside front cover of Book I, in Jo Hopper's
hand:

> Recorded by Jo N Hopper (Mrs. Edward Hopper) at time each work is finished,
> or before it leaves studio. Drawings in the 3 books done by Edward Hopper.

So: Edward drew the work and wrote its title and its size. Josephine wrote
everything else — the descriptions, the anecdotes about people he would not
discuss, the dates, the prices, the buyers, the columns, the running totals,
the corrections in red pencil. Later hands, curatorial and unidentified, added
to the leaves after 1967.

Every passage takes `\hand{edward|jo|later|unidentified}{…}`.
**`unidentified` is the right answer far more often than confidence suggests**,
and it is not a failure. A vocabulary without it pushes every doubtful
attribution onto `jo`, who wrote most of the words and would therefore absorb
every mistake.

### Three numbering systems overlap

1. **The Hoppers' own leaf numbers**, written on the paper — what a citation
   cites, and what the site prints.
2. **The Whitney's sequence of photographs**, which counts covers, versos,
   loose insertions and the odd opening shot whole. This is what a batch is cut
   from.
3. **The ResourceSpace resource ref** — 16853 — which is in no order at all and
   is the sheet's only address.

`\sheet{16853}{2}` carries the third and the first. `npm run render` checks
both against `src/content/catalogue.ts` and **fails on a disagreement**,
because a mistyped leaf number moves an entry to another year and nothing
downstream would notice.

A sheet with no number written on it — a cover, a flyleaf, an index, a loose
insertion — takes an empty second argument: `\sheet{16761}{}`. About one sheet
in nine. That is not a defect in the record; nobody wrote a number on them.

### The record for one work runs across several leaves

Evening Wind occupies leaf 2, then continues on leaf 3, and its plate size is
repeated at the head of leaf 5 where the next work's record continues. The
entries were laid down over thirty-five years in three or four inks. **Do not
merge them and do not reorder them.** Where a leaf carries a run that plainly
continues another, say so in `\note{}` and leave the leaves as they are.

### The dates are frequently out of order, and that is the page

On Book I leaf 4, "Feb. 8, 1925" stands below "Oct. 12, 25", and a sale of 1926
is receipted "Jan. 3, 1924". Both are as written. **Never reorder a table into
chronological sequence**, and never correct a year that looks wrong: flag it in
`\note{}` if it is worth flagging, and leave it.

### Nothing is normalised, ever

- "Fall 1923" stays "Fall 1923". Do not convert it to a date.
- "Les Deux Pigeon" and "Les Poillus" stay misspelled: the misspelling is
  Hopper's and is how the entry is found. So does "Vicery Atkins & Torey",
  "Kepple" where the line spells it that way, and "caracatures".
- Prices are as written — `$18`, `16 2/3`, `30 - 1/3`. **Never converted, never
  totalled, and never adjusted for inflation.**
- A commission written `25 - 1/3` means a price of 25 with a third to the
  dealer. Transcribe the notation, not the arithmetic.

**Vulgar fractions are written out**: `16 2/3`, `22 1/2`, `43 1/3`. The leaf
sets them as a raised numerator over a lowered denominator; the numerals are
the data and the typography is not, and a macro for it would be one more thing
to get wrong on every line.

### The rights notice is not optional

The ledgers are © Heirs of Josephine N. Hopper, licensed by the Artists Rights
Society; the Whitney records the object rights as transferred to the Museum. A
transcription reproduces Josephine Hopper's text. Every file therefore carries:

```latex
\watermark{Demonstration edition}
```

`npm run render` **refuses to build a file without it**. A file that omitted it
would claim, by silence, a status it does not have.

### Carry the Whitney's own metadata, verbatim

```latex
\ledger{book-i}
\ledgertitle{Artist's ledger --- Book I}
\objectnumber{96.208}
\batch{1}
\sheets{1}{12}
\dating{1913--1963}
```

`\dating{}` is the Whitney's range **for the volume**, copied as it stands —
never narrowed to the years this batch happens to cover, and never inferred.

## The sequence

### 1. Get the sheets, then read them through before writing a line

```bash
npm run mirror -- book-i --batches 1
```

Twelve sheets, ten seconds apart — the Whitney's `robots.txt` asks for a
ten-second crawl delay and `mirror` honours it. Two minutes is the correct cost
of this and not a defect. Files land in `archives/`, outside `public/` so a
build can never carry them, and git-ignored so a commit never can.

Then cut whichever sheets are dense into tiles:

```bash
npm run tiles -- book-i 9 --grid 2x3
```

This writes `archives/tiles/book-i/9/` — overlapping crops at twice size, plus
`tiles.json` with the rectangles. It exists because choosing crop rectangles is
not reading: the difference between 16.66 and 16.60 is a few dozen pixels, and
a pass that spends its attention on coordinates has less left for the hand.
**Tile any leaf carrying a ruled table.** The whole-sheet view is enough for
covers and prose and is not enough for a column of figures.

Read `references/hand.md` in the same breath. It carries what earlier passes
learned about these two hands — the abbreviations, the strokes that mislead,
the marks that are not letters at all. It narrows a field of candidates and
settles nothing: where the sheet will not support what it suggests, the sheet
wins and `\ill{}` stands.

Make one complete pass producing nothing, and note:

- **Which sheets carry writing and which do not.** A blank leaf, or a sheet
  photographed only to record that something came loose, simply does not
  appear — no placeholder, no note. The gap in the sequence is the record.
- **Which sheets duplicate another.** The Whitney photographed several openings
  whole *and* each of their leaves separately. Transcribe the individual
  leaves; give the opening a `\sheet{}` and a `\note{}` saying what it is.
  Transcribing the same words twice would double every figure downstream.
- **What is pasted on.** Clippings cover text. Note *what* they cover before
  you start, because a covered line is `\ill{}` and a reader must be told it is
  under paper rather than absent.
- **The columns of this batch.** A leaf's ruling changes from book to book and
  sometimes within one. Fix the column headings once for the batch and hold to
  them.

### 2. Transcribe

`\sheet{ref}{leaf}` at the start of each sheet, in the order the book is bound.
`npm run render` **fails if two sheets are out of order**, because a transcript
that jumps back turns the photograph backwards while the reader scrolls
forward, and that reads as a bug in the site rather than a defect in the file.

In priority order:

1. **The ruled table is the document.** Jo Hopper ruled her columns herself; a
   table transcribed as prose has transcribed nothing. Use `ledgertable`.
2. **Uncertainty is marked, not resolved.** `\ill{}` for what cannot be read,
   `\uncertain{…}` for a reading offered and doubted. Never guess a figure,
   a date, a name or a price.
3. **Her prose stays, and it is the best of the archive.** Where Jo Hopper
   stops ruling and writes three sentences about who is in the picture and what
   they are thinking, that is content, and it is transcribed like everything
   else.
4. **What is struck out stays**, as `\struck{…}`. She struck a great deal — a
   price revised, a buyer who withdrew, an exhibition that fell through — and
   a crossing-out is often the more interesting half of an entry.
5. **Her underlining is `\emph{}`, not `\uncertain{}`.** She underlines her own
   headings. Underlining is reserved for a doubtful reading, because a reader
   must be able to tell the two apart at a glance and they cannot both be
   underlines.

#### The apparatus

| Macro | Use |
|---|---|
| `\sheet{16853}{2}` | this sheet begins — ref, then the leaf number written on the paper (empty if none) |
| `\ill{}` | illegible, or under a clipping — **never guessed** |
| `\uncertain{16.66}` | a reading offered, and flagged as doubtful |
| `\add{s}` | an editorial addition: an expanded abbreviation, an implied dollar sign |
| `\struck{$18}` | struck out in the book |
| `\note{…}` | the transcriber's note — **ours** |
| `\marginal{…}` | a note written in the margin of the book — **theirs** |
| `\hand{jo}{…}` | whose hand |
| `\sketch{…}` | Edward Hopper's ink record drawing stands here |
| `\clipping{…}` | something printed and pasted to the leaf |
| `\work{Evening Wind}` | a work's block opens, under the title exactly as the leaf gives it |

`\note{}` and `\marginal{}` are not interchangeable: the first is ours, the
second is theirs.

`\note{}` is the easiest macro to overuse. It is for something a reader of the
record needs — "the clipping covers the price column for these rows", "leaf 3
continues leaf 2 without repeating the title", "these two entries are out of
order on the leaf". It is **not** for "stain on the paper", "torn at the
fore-edge", "photographed at an angle". Those belong to the Whitney, and the
Whitney's own descriptor is shown verbatim beside every sheet on the site.

`\sketch{}` takes **what is inscribed on or beside the sketch** — a title, a
dimension — and never a description of the drawing. The drawing is one pane
away at the resolution the Whitney publishes, and prose about it competes with
looking at it. Leave the argument empty where nothing is written.

#### The work links write themselves

A `\work{…}` heading picks up a **see the work** link automatically, from
`src/content/works.json`, whenever the Met or the Art Institute holds a work
under that title. **Never put a URL in a transcription**, and never adjust a
title so that it will match — the title is what the leaf says, and a title that
does not match simply gets no link.

The lookup takes the title as written, strips the apparatus, and stops at a
measurement, so `\work{Evening Wind\quad 7 x 8 3/8"}` finds Evening Wind. A
title that is genuinely unread finds nothing: on Book I leaf 4 the plate's name
is under a clipping, so the transcription reads `\work{Night in \ill{}}` and
links nothing. **Do not reach for leaf 1's index to fill it in** — the blank is
correct, because nothing was read there.

#### The permitted LaTeX subset

`scripts/render.mjs` understands a subset, **deliberately**: a converter that
accepted everything would silently mangle what it did not understand, and a
silently mangled ledger is a table of numbers that look right.

Allowed: `\section` `\subsection` · paragraphs separated by a blank line ·
`\emph` `\textbf` `\textit` `\texttt` · `\quad` `\qquad` · `\\` for a line
break · `itemize` `enumerate` `quote` · `ledgertable` · `\keywords` · the ten
macros above.

The only escapes spelt with a non-letter are `\%` `\$` `\&` `\#` `\_`,
`\\` for a line break, and `\ ` for a space. **TeX's spacing commands are
refused** — no `\,`, no `\;`, no `\!`. Use `\quad` where a gap is needed
and a plain space otherwise: a plate is `7"x8 3/8"`.

Not allowed, and this is not an oversight: **mathematics**. There is none in
these books. A fraction is written `2/3`.

Stepping outside makes rendering fail loudly, naming the file, the line and the
construct. Extending the subset means extending `scripts/render.mjs`,
`scripts/tei.mjs` and `transcripts/preamble/hopper.sty` **in the same commit**.

#### The ledger table

```latex
\begin{ledgertable}{Y{0.12}lY{0.34}Y{0.22}}{Date & accepted / Refused & Exhibitions & Received}
Jan. 28, 21 & A & Print Makers Ex., Los Angeles & \ill{} \\
Nov. 10, 21 & R & Bklyn. Soc. of Etchers & \uncertain{12.60} \\
\end{ledgertable}
```

- The first argument is the column specification; the second is the header row.
- **Any column that can hold a sentence takes `Y{fraction}`**, a wrapping
  column that many hundredths of the measure wide. `l`, `r` and `c` are for
  dates, figures and short names *and their headings* — « accepted / Refused »
  is longer than any cell beneath it and will overflow a column sized for
  « Inv. ». Leave about 0.03 of the measure per column for the gutters: five columns can
  share 0.85, six can share 0.80. Getting it wrong is not a guessing game —
  `npm run pdf` reports the overfull box and how many points too wide.
- This is not typographic fussiness. A table of `l` columns is set to its
  natural width, which can be wider than the page, and **TeX issues no warning
  at all** because nothing asked the row to fit — the first compile of Book I
  produced a page whose right-hand column ran off the paper with a clean log.
  `npm run pdf` now refuses to finish on an overfull box, and a fixed-width
  column is what makes that check able to see anything.
- A cell she left blank is **left blank**. A cell that cannot be read takes
  `\ill{}`. The two are different and the difference matters.
- A `&` inside a cell must be escaped `\&` — the splitter respects the escape,
  and respects braces, so `\struck{Hopper \& Pop Hart}` survives intact.
- A block macro cannot live inside a cell. A marginal note beside a row goes
  after the table, as `\marginal{}`.
- Where the column headings are not written on the leaf, supply them in
  `\add{}` and say so in a `\note{}`. Inventing a heading silently is inventing
  a claim about what the column means.

### 3. Close with the keywords, then check

The last thing in the file, before `\end{document}`:

```latex
\keywords{etchings, Frank K. M. Rehn, Frederick Keppel, Brooklyn Society of
Etchers, museum purchases, exhibition history}
```

Comma-separated, and **the single source of the ledger's tags** — there is no
tags file, so no tag can describe sheets nobody has read. Six to twelve terms
for a batch: dealers, exhibiting societies, media, places, the kind of
transaction. No years (the date range is metadata already) and no "Edward
Hopper" (every sheet would carry it). `/tag-hopper` revises the line.

```bash
npm run render && npm run tei && npm run manifest
```

Then read the rendered view **beside the photograph**, on the site. That is
precisely the gesture this project exists to allow, and it is the only check
worth anything: scrolling the transcript turns the sheet.

Two mechanical checks before the human one:

- every `\ill{}` should be one you can point at — either genuinely illegible,
  or under a clipping. An `\ill{}` used because a cell was empty is a lie in
  the safe direction, and it still misreports the leaf;
- read the last table in the file first. Attention degrades towards the end of
  a pass, and the last table is where a dropped `&` shows up as a whole column
  shifted left;
- `npm run pdf` must print no overfull box. It fails if it finds one, and it
  names the lines: widen a `Y{}` column, or narrow its neighbour.

## What not to do

- **Fill a gap.** An illegible figure stays `\ill{}`. Always.
- **Guess a buyer, a dealer, a date or a price** from the entries around it.
- **Reorder a table** into chronological sequence.
- **Normalise a spelling, a price, a fraction or a date.**
- **Describe a sketch or a photograph.** Transcribe what is written on it.
- **Catalogue the paper.** The Whitney has, and its descriptor is on the site.
- **Complete an entry from knowledge of Hopper.** Six months on, a field that
  came from a scholar's memory is indistinguishable from one that was read.
- **Transcribe an opening that duplicates two leaves you have already
  transcribed.** Give it a `\note{}`.
- **Extend the LaTeX subset without extending the three files that define it.**

## Revising a batch

Corrections go in the `.tex`, never in the HTML, the PDF or the TEI, which are
derived and rebuilt.

`transcripts/status.json` carries the three states no file can prove —
`running`, `checked`, `skipped`, keyed `<ledger>#<batch>`. Only tick `checked`
if a person really has gone sheet by sheet against the photograph. The site
verifies nothing; it is a declaration, and it is reviewable in a diff.
