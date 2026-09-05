# The books Edward Hopper drew his paintings into, and Josephine Hopper priced

**A reading and transcription workbench for the six artist's ledgers at the
Whitney Museum of American Art — 504 digitised sheets, 1907 to 1967.**

→ **[hopper.commutator.io](https://hopper.commutator.io)**

## The point

After Hopper finished a work he meant to sell, he drew it small at the head of
a leaf — bold strokes and close cross-hatching, made for the record and not for
anyone to see. The books were ordinary ledgers from Woolworth's; Book I still
carries the label, *Herald Square Account Book No. 2041, made expressly for
F. W. Woolworth Co.*

Josephine Nivison Hopper wrote everything else. The inside front cover of
Book I says so, in her hand:

> Recorded by Jo N Hopper (Mrs. Edward Hopper) at time each work is finished,
> or before it leaves studio. Drawings in the 3 books done by Edward Hopper.

She logged the date, the size, the price, the buyer, every exhibition the work
went to and whether the jury took it, the dealer's commission, and the date the
cheque cleared — and, for the paintings, long particular descriptions that
invent anecdotes for pictures her husband would not discuss. Leaf 2 of Book I
carries thirty-one ruled lines under one etching, running from a Los Angeles
print jury in January 1921 to a Kennedy Galleries sale in June 1956.

The Whitney has digitised all six volumes and published them, sheet by sheet,
with a full catalogue record for each. What it cannot do is put the reading
**beside** the sheet. This site does one thing: it shows the transcription of a
sheet next to the Whitney's own photograph of it, so that scrolling the
transcript turns the photograph and any reading can be checked against the hand
it came out of, on one screen, without a second window.

## The site

The archive's organisation is the site's organisation. The Hoppers filed their
work in six books and numbered them; the Whitney accessioned those six as
96.208 to 96.213 and digitised them in order. There is **no thematic
regrouping anywhere here** — an earlier version of this project offered six
reading "books", three of them threads drawn across the volumes by us, each
having to announce at its head whose grouping it was. That was honest and it
was still a second organisation laid over one that already had an author, and
it meant every URL named something the museum could not be asked about.

| Page | Contents |
|---|---|
| [`/`](https://hopper.commutator.io/) | What these books are |
| [`/book-i/`](https://hopper.commutator.io/book-i/) | **Book I** · 96.208 · 1913–1963 — the etchings plate by plate, and the running lists behind them |
| [`/book-ii/`](https://hopper.commutator.io/book-ii/) | **Book II** · 96.209 · 1907–1962 — the paintings, one to an opening, with the record sketches |
| [`/book-iii/`](https://hopper.commutator.io/book-iii/) | **Book III** · 96.210 · 1924–1967 — the late work, and the lists kept in front of it |
| [`/book-iv/`](https://hopper.commutator.io/book-iv/) | **Book IV** · 96.211 · 1913–1967 — every payment received, without a gap, for fifty-four years |
| [`/book-v/`](https://hopper.commutator.io/book-v/) | **Book V** · 96.212 · 1953–1963 — an index, loans, drawings, and the Rehn receipts of 1953 |
| [`/dealers/`](https://hopper.commutator.io/dealers/) | **Dealers/Etchings** · 96.213 · 1921–1951 — indexed by dealer rather than by work |
| [`/archive/`](https://hopper.commutator.io/archive/) | All 504 sheets, searchable across the six |
| [`/timeline/`](https://hopper.commutator.io/timeline/) | Hopper's life beside the dated leaves — every entry sourced |
| [`/method/`](https://hopper.commutator.io/method/) | How the reading is done, what it costs, what it does not claim |

Every volume page links to the Whitney's own catalogue record for the object,
so a citation from here is a citation the museum can answer.

**Book IV is the one to open if you only open one.** It is a pocket book, 7½ by
4¾ inches, with no sketches and no anecdote: one column of dates, one of payers
and one of sums, kept without a gap from 15 November 1913 to 23 March 1967. Its
first decade is all illustration work — *Adventure*, *Everybody's*, the *Wells
Fargo Messenger*, Morse Dry Dock — which is the part of Hopper's working life
the paintings books do not record at all. It is also the only volume the
Whitney dated leaf by leaf, which is what lets the timeline point into it.

## The timeline

Reading a dated leaf, one keeps wanting to know what year it is *in*: that the
Rehn entries begin in November 1924 because Rehn took him on that autumn, that
the etchings stop because the printmaking did, that Book IV's last entry is
three months before he died. None of that is on the sheets, and looking it up
breaks the reading. So [`/timeline/`](https://hopper.commutator.io/timeline/)
holds it, under two rules:

- **every event names the source that states it**, linked, and nothing is
  written from memory. Where two sources disagree — the date he took the top
  floor at 3 Washington Square North is the live case — the disagreement is
  printed rather than settled by quietly picking one;
- **the link into the archive is derived, never asserted.** A year lists the
  sheets whose *own Whitney descriptor* names it, which in practice means
  Book IV. A volume's date range is not spread over its leaves to make the
  page look fuller.

It is a reminder for reading these ledgers and not a biography. Gail Levin's is
the biography, and it was written from these very books.

## Nothing of the archive is stored, anywhere

Not one sheet, not in the repository and not on any disk of ours. The facsimile
pane points an `<img>` straight at the Whitney's own file, fetched as it is
looked at, and `.gitignore` refuses `*.jpg` outright.

That is simpler than it might have been, and the simplicity was **measured**
rather than assumed. This project is adapted, nearly whole, from a workbench
built for the Grothendieck fonds at Montpellier, where the equivalent pane
needs a deployed Node process on its own hostname — Montpellier sends
`X-Frame-Options: SAMEORIGIN`, no CORS headers, and a certificate that expired
in December 2025, so a browser cannot fetch its scans at all.

Four things were measured about `resourcespace.whitney.org/pages/download.php`
on 5 September 2026:

- **it answers a cross-origin `GET`, and echoes whatever `Origin` it is sent**
  into `Access-Control-Allow-Origin` — a request from this site came back with
  `Access-Control-Allow-Origin: https://hopper.commutator.io`;
- **its certificate is current** (Let's Encrypt, to 12 October 2026), so
  nothing has to be waived to talk to it;
- **no referer check** — a `GET` with a foreign `Referer` returns `200`;
- **`Range` is honoured**, `206` with a correct `Content-Range`.

The only restriction in force is `Content-Security-Policy: frame-ancestors
'self'`, which forbids putting the response in an `<iframe>` — and an image
belongs in an `<img>`, which that header does not govern. So there is no relay
here and there should not be: it would be a hop between a reader and a museum,
for nothing. If the Whitney ever restricts `Origin`, the fix is the relay the
parent project already has, and `/method/` says what it would have to do.

**The largest size the Whitney publishes is `pre`: 1292 × 2000, about 3 MB** —
roughly 170 ppi across a 7½-inch leaf. It is enough; Jo Hopper's figures are
legible at it, which was the first thing checked before any of this was built.
`scr`, `lpr`, `hpr` and the original are not public — they answer `200` with
the login page as `text/html`, which is worth knowing, because a naive mirror
of them fills a directory with 43 KB files named `.jpg`. Whoever wants the
2239 × 3465 original asks the Whitney.

### The one thing a machine here does not do

The Whitney's **images** are open. Its **HTML pages** — `search.php`,
`view.php` — sit behind a JavaScript bot-check, and this project does not
impersonate a browser to get past it. So the inventory is harvested by a person
in a browser they already have open, with the twelve-line snippet in
[`scripts/harvest.js`](scripts/harvest.js), and the result is committed to
[`harvest/`](harvest/README.md).

That is a real cost and it buys something: the inventory this whole site rests
on is reviewable in a diff, rather than re-derived silently on every build.
`npm run catalogue` turns those six files into `src/content/catalogue.ts`.

`robots.txt` asks for a ten-second crawl delay and disallows only `/filestore`,
which nothing here touches. `npm run mirror` sleeps ten seconds between sheets,
so a twelve-sheet batch takes two minutes. That is the correct cost and not a
defect.

### Mirroring, which reading does not need

Only a transcription pass needs sheets on disk — twelve at once, so they can be
looked at together and cropped without a round trip per glance.

```bash
npm run mirror -- book-i --batches 1
npm run tiles  -- book-i 9 --grid 2x3
```

Files land in `archives/`, outside `public/` so a build can never carry them,
and git-ignored so a commit never can. `tiles` cuts a sheet into overlapping
crops at twice size, because choosing crop rectangles is not reading: the
difference between 16.66 and 16.60 is a few dozen pixels. It needs ImageMagick
and has no fallback — macOS `sips` silently ignores a crop offset and returns
the centre of the image, which is worse than no tool at all.

## Transcription

**One edition**, and that is worth saying plainly because the project this
method comes from carries two. Grothendieck's manuscripts get a second pass
that restates the mathematics in current notation, and it is real work: a page
of 1962 mathematics is genuinely hard to read in 1962's notation. A ledger
needs no such pass. Jo Hopper's English is plain, her columns are already a
table, and « 30 – 1/3 » means today exactly what it meant in 1927. A second
edition here would have been a second artifact to keep in step, paying for
itself in nothing — so a file is `batch-NN.tex`, with no register in its name.

Two skills under `.claude/skills/`. They accept Fable 5.1, Fable 5 or Opus 5
and **refuse any other model**, and each file's header records the one that
read the sheets, so a batch's provenance stays a fact about the file rather
than about whichever model happened to be selected.

| Skill | Produces |
|---|---|
| [`/transcribe-hopper`](.claude/skills/transcribe-hopper/SKILL.md) | the transcription — the sheets as written, with the apparatus and the two hands kept apart |
| [`/tag-hopper`](.claude/skills/tag-hopper/SKILL.md) | the ledger's tags — the `\keywords{}` line closing a transcription |

```bash
npm run works       # → the verified museum links (external APIs; not run in CI)
npm run render      # transcripts/*.tex → the reading views the left pane shows
npm run tei         # → a TEI P5 file per transcription
npm run pdf         # → the PDFs the download buttons offer
npm run manifest    # tell the site which files now exist
```

The `.tex` under `transcripts/` is the source of record and the only thing
versioned. HTML, PDF and TEI are derived, and rebuilt.

**Two batches are transcribed so far — Book I, batches 1 and 2: twenty-four
sheets from the front cover to leaf 16, read under Opus 5 on 5 September
2026.** Batch 1 is the front matter, Jo Hopper's index and the first two
etchings; batch 2 is the etchings proper — Night Shadows, East Side Interior,
The Cat Boat, The Rail Road, The Locomotive, The Monhegan Boat — six plates
across eleven leaves, with about four hundred ruled entries between them. None
of it has been checked sheet by sheet by a person.

### The critical apparatus is the point

`transcripts/preamble/hopper.sty` defines the macros, and they carry the whole
honesty of the exercise:

| Macro | Meaning |
|---|---|
| `\sheet{16853}{2}` | this sheet begins — the resource ref, then the leaf number written on the paper. This is what turns the photograph as the transcript is scrolled |
| `\ill{}` | illegible, or under a clipping — **never guessed** |
| `\uncertain{16.66}` | a reading offered, and flagged as doubtful |
| `\add{…}` | an editorial addition — an expanded abbreviation, an implied dollar sign |
| `\struck{$18}` | struck out in the book. She struck a great deal, and a crossing-out is often the more interesting half of an entry |
| `\note{…}` | the transcriber's note — **ours** |
| `\marginal{…}` | a note written in the margin of the book — **theirs** |
| `\hand{edward\|jo\|later\|unidentified}{…}` | whose hand wrote it |
| `\sketch{…}` | Edward Hopper's ink record drawing stands here |
| `\clipping{…}` | something printed and pasted to the leaf |
| `ledgertable` | the ruled columns |

**A guessed figure is a sale that did not happen.** That is the difference
between a ledger and a manuscript of prose, and it is not a difference of
degree: an invented word in a letter is a bad reading, and an invented price
here is a transaction, at a price nobody paid, to a buyer who never bought —
which will be cited, because a table looks like data in a way that prose does
not.

**`\hand{}` has no counterpart in the project this method comes from, and it is
the most important macro here.** These books were written by two people and
annotated by more; a transcription that flattens them has destroyed the
archive's chief documentary value, which is that it records two working lives
and the division of labour between them. `unidentified` is a permitted answer
and is the right one far more often than confidence suggests.

`scripts/render.mjs` accepts a **restricted subset** of LaTeX, deliberately,
and fails loudly outside it. It also refuses: a resource ref that is not in the
archive, a ref belonging to another volume, a leaf number that disagrees with
the Whitney's own descriptor, sheets transcribed out of order, and a file with
no `\watermark{}`. Every one of those failures is invisible in the output if it
is allowed through.

### The TEI export

`npm run tei` writes `batch-NN.en.xml` beside each transcription's HTML and the
download row offers it as **TEI**. It is produced from the `.tex` alone,
mechanically, and re-reads no sheet: the macros map one to one onto TEI's own
elements — `\ill{}` to `<gap reason="illegible"/>`, `\uncertain{}` to
`<unclear>`, `\add{}` to `<supplied>`, `\struck{}` to `<del>`, `\sheet{}` to
`<pb>` with a `facs` link to the Whitney's record, `ledgertable` to a TEI
`<table>`.

The reason a TEI export is worth making for *these* documents in particular is
`<handNote>`. TEI has carried the notion of a hand since P3, so a file
deposited elsewhere keeps the distinction between Edward's writing and
Josephine's — which is the one part of the transcription that could not be
reconstructed from the photographs by somebody else. Every file is checked
well-formed with `xmllint` when it is installed.

## The repository

| Path | Role |
|---|---|
| `harvest/` | The Whitney's listing, taken in a browser and committed — 504 lines |
| `src/content/catalogue.ts` | The archive — 6 ledgers, 504 sheets — generated, never hand-edited |
| `src/content/works.json` | Where a work named on a leaf can be looked at — generated, every URL retrieved |
| `src/content/life.json` | The timeline — every event with the source that states it |
| `src/content/work-aliases.json` | The title identifications that are ours, each with how far to trust it |
| `transcripts/status.json` | The three states no file can prove — `running`, `checked`, `skipped` |
| `src/components/FacsimilePane.tsx` | The right pane: the Whitney's image, zoomable, sheet-anchored |
| `src/components/TranscriptPane.tsx` | The left pane: the transcript in its own frame, reporting the sheet being read |
| `scripts/catalogue.mjs` | `harvest/` → typed data, with every inference made out loud |
| `scripts/mirror.mjs` | Downloads sheets for transcription — not for reading |
| `scripts/tiles.mjs` | Cuts a sheet into overlapping crops, so a figure can be looked at |
| `scripts/render.mjs` | LaTeX subset → the reading view, and the checks that make it strict |
| `scripts/tei.mjs` | The transcription → TEI P5 |
| `scripts/works.mjs` | Queries the Met and the Art Institute for works the ledgers name |

### Why the transcript pane is an iframe

The reading view carries a complete stylesheet of its own, so that a transcript
reads as a document rather than as a panel of an application. Dropped into this
Tailwind page it would fight everything; scoped by hand it would no longer be
the same stylesheet, and the screen and the PDF would stop coming from one
source. A same-origin frame keeps it whole and still lets the parent watch it
scroll — which is the entire mechanism by which reading the transcript turns
the photograph.

## Running it

```bash
npm install && npm run dev
```

`xmllint` is optional (it checks the TEI); a LaTeX engine with `fontspec` is
needed only to compile transcript PDFs (`brew install tectonic`). Neither is
needed to browse the archive or to read a transcript beside its sheet — the
deploy builds the PDFs with a pinned Tectonic and offers them for download.

`npm run pdf` **fails on an overfull box**, because a line running past the
right margin in a transcription hides content. That check is why ruled tables
declare prose columns as `Y{0.34}` rather than `l`: a table of natural-width
columns overflows the page while TeX stays completely silent, which is how
Book I's first compile produced a truncated table with a clean log.

## Credit and limits

The sheets are from the **Edward and Josephine Hopper artist's ledgers**,
Whitney Museum of American Art, 96.208–96.213 — gifts of Lloyd Goodrich and
museum purchases. **© Heirs of Josephine N. Hopper, licensed by Artists Rights
Society (ARS), New York**; the Whitney records the object rights as transferred
to the Museum. The transcriptions here reproduce Josephine Hopper's text and
are unauthorised working documents; every file says so on its own face, and
`npm run render` refuses to build one that does not.

Gail Levin catalogued Hopper's work from these very books and wrote his
biography from them. That makes the prior on any "discovery" here very strong
and very specific: most of what a first pass finds surprising is in Levin
already. Nothing on this site may claim priority, and a candidate nobody has
checked against her says so rather than implying otherwise by silence.

No transcription here is an edition. A machine pass over a hand of the 1920s
produces a reading, checkable against the photograph on the same screen. That
is its whole value, and its whole claim.
