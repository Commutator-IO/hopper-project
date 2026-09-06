---
name: modernize-hopper
description: Writes the per-work notes that put a transcribed ledger row in the context of Hopper's career, the work itself, and what became of it. Use when someone asks to modernize, annotate, contextualise or explain a work named in the ledgers, or asks what a leaf's entry means, who a buyer was, or where a painting is now. Keyed to src/content/works.json; /transcribe-hopper produces the reading, this produces the context around it.
---

# Writing a work's note

**Runs on Fable 5.1, Fable 5 or Opus 5, and on nothing else** — the same rule
as `/transcribe-hopper`, for a different reason. Transcription needs sustained
visual attention. This needs sustained *restraint*: the failure here is not
misreading a figure, it is writing a fluent paragraph nobody can check.

## What this produces

One entry in `src/content/work-notes.json`, keyed exactly as
`src/content/works.json` keys its index:

```json
"tables for ladies": {
  "note": "...",
  "claims": [
    { "says": "The Metropolitan Museum of Art holds it, acquired 1931.",
      "source": "met-482493" }
  ],
  "written": "2026-09-06",
  "model": "claude-opus-5"
}
```

and, where the source is new, an entry in the file's `sources` block giving its
name and URL. **A claim whose `source` does not resolve is a build error**, not
a warning.

Then:

```bash
npm run works       # -> re-derives which works the ledgers name
npm run manifest    # tell the site which files now exist
```

## The one rule

**A note says what a named source says, and stops.**

This is not the usual caution about hallucination. It is the specific problem
this project exists to solve. The whole value of the archive is that a reader
can check a reading against the photograph on the same screen — the left pane
against the right. A note has no photograph. It is the only text on the site
that cannot be checked by looking, so it is the only text that has to carry its
source with it, in the way `src/content/life.json` already does for the
timeline:

> Every entry carries the source that says it and a link to that page; nothing
> here is written from memory, and where two sources disagree the entry says so
> rather than choosing quietly.

Hold to that and the note is worth having. Drop it and the note is worth less
than nothing, because it will be quoted with the archive's authority behind it.

### What that rules out

- **Anything you know about Hopper.** You know a great deal, and none of it is
  admissible unless a source you have actually retrieved in this session says
  it. Six months on, a sentence that came from a model's memory is
  indistinguishable from one that was checked.
- **Reading the picture.** « The composition isolates the figure » is criticism,
  it is unfalsifiable, and it competes with looking at the work — which the
  reader can do, from the link the index already carries.
- **Explaining the ledger row.** The row is on the sheet, transcribed, in the
  other pane. A note that paraphrases it has added nothing and doubled the
  chance of an error.
- **Influence, unless somebody stated it.** « Influenced the American realists »
  is the kind of sentence that sounds like scholarship and cites nothing. If a
  museum's own catalogue entry says a thing, quote it and cite it. If not, the
  note does not say it.

### What it admits

- **What the holding institution says**, retrieved from its API or its own
  page: accession year, medium, dimensions, credit line, the catalogue text.
- **What `life.json` already carries**, by source key, where a date makes the
  row legible — that Rehn took him on in November 1924 explains why the ledgers
  change shape at the end of that year.
- **What another sheet in this archive says**, cited as ledger and leaf. This
  is the strongest kind of note and the most under-used: Book I leaf 59 records
  Hills, South Truro sold to the Cleveland Museum in November 1931, and
  Cleveland's own catalogue says they hold it. Two independent records of one
  transaction, and the note's job is to point at both.

## The sequence

### 1. Pick a work that has something to say

```bash
node -e "const w=require('./src/content/works.json');
  console.log(w.index.filter(x=>x.held).map(x=>x.key).join('\n'))"
```

Start from `index`, not from `works`: `index` is the works the transcriptions
actually name, and a note on anything else annotates a leaf nobody has read.
Prefer works that are `held` — a holding is a source, and a work held nowhere
usually has nothing checkable to say about it yet.

**One work per note, and no note at all is a perfectly good outcome.** An empty
`work-notes.json` is a true statement about how much has been checked. A file
padded with unsourced paragraphs is a false one.

### 2. Retrieve, do not recall

Fetch the holding institution's record for the object id the index already
carries. The APIs are keyless and are the same three `scripts/works.mjs` uses:

| Source | API |
|---|---|
| The Metropolitan Museum of Art | `collectionapi.metmuseum.org` |
| Art Institute of Chicago | `api.artic.edu` |
| Cleveland Museum of Art | `openaccess-api.clevelandart.org` |

Read what comes back. If it says nothing beyond what `works.json` already has —
title, date, medium — then there is no note to write, and that is the answer.

### 3. Write it

Three sentences is a long note. The reader came for the sheet.

```json
"hills south truro": {
  "note": "Cleveland's catalogue dates the canvas 1930 and records it entering the collection in 1931, which is the sale Book I leaf 59 writes as « Cleveland Museum. Nov. 9, 31 » at 2000 less a third.",
  "claims": [
    { "says": "Cleveland Museum of Art holds it, dated 1930, accession 1931.2647.",
      "source": "cma-1931-2647" },
    { "says": "Book I leaf 59 records the sale to the Cleveland Museum, 9 November 1931.",
      "source": "ledger:book-i/59" }
  ]
}
```

A `source` is either a key in the file's `sources` block, or a `ledger:`
reference to a sheet in this archive — which the site resolves into a link to
that leaf, so a reader can go and look at the row.

### 4. Say what disagrees

Where the ledger and the museum differ — a year, a buyer, a title — **print the
disagreement**. Do not resolve it, and do not quietly prefer the museum because
it is an institution. Jo Hopper was in the room. The museum has the object.
Neither of those settles a date, and a note that says « the ledger writes 1931
and the museum's accession is 1932 » is worth more than either number alone.

## What not to do

- **Write a paragraph you could have written without looking anything up.**
- **Cite the ledger for something the ledger does not say**, on the grounds
  that it is obviously implied.
- **Use a note to correct a transcription.** If a reading looks wrong, the fix
  is in the `.tex` and it is `/transcribe-hopper`'s business. A note that
  contradicts the reading beside it makes both untrustworthy.
- **Let the note grow into an essay.** If there is that much to say, the source
  says it better and the link is already there.
- **Annotate a work the ledgers do not name.** The index is the boundary.
