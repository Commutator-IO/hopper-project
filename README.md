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

| Page | Contents |
|---|---|
| [`/`](https://hopper.commutator.io/) | What these books are, and the six ways in |
| [`/etchings/`](https://hopper.commutator.io/etchings/) | **The Etchings** — Book I opened plate by plate, 1915–1928 *(our grouping)* |
| [`/paintings/`](https://hopper.commutator.io/paintings/) | **The Paintings** — Book II entire, 1907–1962 *(the archive's grouping)* |
| [`/late-work/`](https://hopper.commutator.io/late-work/) | **The Late Work** — Book III entire, 1924–1967 *(the archive's grouping)* |
| [`/accounts/`](https://hopper.commutator.io/accounts/) | **The Account Book** — Book IV entire: every payment received, 1913–1967 *(the archive's grouping)* |
| [`/dealers/`](https://hopper.commutator.io/dealers/) | **Dealers and Prints** — the two thin books filed by dealer *(our grouping)* |
| [`/apparatus/`](https://hopper.commutator.io/apparatus/) | **Jo Hopper's Apparatus** — the leaves that record no work at all *(our grouping)* |
| [`/archive/`](https://hopper.commutator.io/archive/) | All six ledgers, in the Whitney's order, searchable |
| [`/method/`](https://hopper.commutator.io/method/) | How the reading is done, what it costs, what it does not claim |

Three of the six reproduce a volume exactly and three are threads drawn across
the archive by us. Each page says which at its head, because citing "the
Apparatus" does not commit you to the same thing as citing 96.208.

**Jo Hopper's Apparatus is the one to look at first if you only look at one.**
Scattered through three volumes, its leaves read as clerical residue: an index,
a *Whereabouts* list, running tallies of prizes and museum purchases, eight
leaves of reviews cross-referenced in both directions, a Gifts page, a
chronology on a back flyleaf. Taken together they are the most interesting
document in the archive, because they are not a record of Edward Hopper's work
but of Josephine Hopper's — she is the one who decided what about a painting
was worth writing down, and these are the leaves where that decision is visible.

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
difference between 16.66 and 16.60 is a few dozen pixels.

## Transcription

Two editions, one skill each, run in order — plus a third for the ledger's
tags. All under `.claude/skills/`. They accept Fable 5.1, Fable 5 or Opus 5 and
**refuse any other model**, and each file's header records the one that read the
sheets, so a batch's provenance stays a fact about the file rather than about
whichever model happened to be selected.

| Skill | Produces |
|---|---|
| [`/transcribe-hopper`](.claude/skills/transcribe-hopper/SKILL.md) | the transcription — the sheets as written, with the apparatus and the two hands kept apart |
| [`/record-hopper`](.claude/skills/record-hopper/SKILL.md) | the record edition — a summary, then every entry as a structured record |
| [`/tag-hopper`](.claude/skills/tag-hopper/SKILL.md) | the ledger's tags — the `\keywords{}` line closing the summary |

```bash
npm run render      # transcripts/*.tex → the reading views the left pane shows
npm run records     # the record edition → CSV and JSON-LD
npm run tei         # → a TEI P5 file per transcription
npm run pdf         # → the PDFs the download buttons offer
npm run manifest    # tell the site which files now exist
```

The `.tex` under `transcripts/` is the source of record and the only thing
versioned. HTML, PDF, TEI and CSV are derived, and rebuilt.

**One batch is transcribed so far — Book I, batch 1: twelve sheets from the
front cover to leaf 5, read under Opus 5 on 5 September 2026, with its record
edition and twenty-seven extracted records.** None of it has been checked sheet
by sheet by a person.

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

### The record edition, and why it is not a translation

The Grothendieck workbench gives each manuscript a *modernised reading* — the
mathematics restated in current notation. A ledger wants something else,
because it is already a table: the record edition restates each entry as a
structured record — title, medium, size, date, price, buyer, dealer,
exhibition — which `npm run records` extracts to `public/records/<ledger>.csv`
and a JSON-LD file whose every row links back to the Whitney's record for the
sheet it was read from.

Every field is **empty when the leaf does not carry it**. Empty is not zero,
not a guess, and never the value from the row above. A `certainty` column
carries `read`, `partial` or `uncertain`, built from the apparatus marks, so
that anyone building on this can sort the shaky rows to the top — which is the
whole reason for carrying the marks that far.

Nothing is normalised: "Fall 1923" stays "Fall 1923", `7 x 8 3/8"` stays as
written, prices are never converted and never adjusted, and "Les Deux Pigeon"
and "Les Poillus" stay misspelled because the misspelling is Hopper's and is
how the entry is found.

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
| `src/content/books.json` | The six reading books, generated from spans and then edited by hand |
| `transcripts/status.json` | The three states no file can prove — `running`, `checked`, `skipped` |
| `src/components/FacsimilePane.tsx` | The right pane: the Whitney's image, zoomable, sheet-anchored |
| `src/components/TranscriptPane.tsx` | The left pane: the transcript in its own frame, reporting the sheet being read |
| `scripts/catalogue.mjs` | `harvest/` → typed data, with every inference made out loud |
| `scripts/mirror.mjs` | Downloads sheets for transcription — not for reading |
| `scripts/tiles.mjs` | Cuts a sheet into overlapping crops, so a figure can be looked at |
| `scripts/render.mjs` | LaTeX subset → the reading view, and the checks that make it strict |
| `scripts/records.mjs` | The record edition → CSV and JSON-LD |
| `scripts/tei.mjs` | The transcription → TEI P5 |

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
needed to browse the archive or to read a transcript beside its sheet.

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
