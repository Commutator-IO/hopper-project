# The data model

What a ledger, a sheet, a leaf, a batch, a work, a row and a keyword are here,
and how they relate. Until this document existed the model was recoverable only
by reading `scripts/catalogue.mjs`, `scripts/manifest.mjs` and `src/lib/types.ts`
— which is to say it was recoverable by us and by nobody else.

Nothing below is a design. Every one of these units is something the archive or
the books already have; where this project invented one, the entry says so and
says why.

```
ledger ─┬─ sheet ──── leaf?          the archive's units
        └─ batch ──── transcription  the reading's units
                       ├─ work?
                       ├─ row
                       ├─ hand
                       ├─ note / marginal
                       └─ keyword
```

---

## The archive's units

### Ledger

One of the six books the Hoppers kept. This is the archive's own unit of
classification and the site's top-level organisation; there is **no thematic
regrouping anywhere here**, because a second organisation laid over one that
already has an author means every URL names something the museum cannot be
asked about.

| Field | What it is |
|---|---|
| `id` | `book-i` … `book-v`, `dealers`. This site's slug, and the URL. |
| `objectNumber` | The Whitney's accession number for the physical volume — 96.208 to 96.213. |
| `collection` | ResourceSpace's featured-collection id, which the harvest file is named after. |
| `whitneyWork` | The record for the volume on whitney.org. |
| `date`, `medium`, `dimensions`, `credit` | The museum's own fields, verbatim. |
| `about` | What the volume is, in a paragraph, written from its own sheets. Ours. |
| `sheets` | How many photographs the digitisation holds. Counted, never declared. |

Defined in `scripts/catalogue.mjs`; generated into `src/content/catalogue.ts`,
which CI rebuilds and compares so it cannot drift from `harvest/`.

### Sheet

**One digitised image.** The smallest thing the archive names, and therefore
the smallest thing this site can point at.

A sheet is not a leaf and not an opening. The Whitney photographed rectos,
versos, the occasional opening whole, the loose sheets tucked between leaves and
the envelope Book IV arrived in. Each got its own resource.

| Field | What it is |
|---|---|
| `ref` | ResourceSpace's resource id. **The only unique address in the archive.** |
| `seq` | Position in the digitised book, 1-based. Every sheet has one. |
| `leaf` | The number written on the paper, where the descriptor gives one — `null` for about one sheet in nine. |
| `spread` | The second leaf, where one photograph caught an opening. |
| `kind` | `cover`, `front-matter`, `leaf`, `verso`, `inserted`. |
| `quoted` | The words the museum's descriptor puts in quotation marks. |
| `years` | The years the descriptor names. Almost always empty; Book IV is why it exists. |
| `descriptor` | The Whitney's File or Component Descriptor, verbatim and unshortened. |

### Leaf

**The number the Hoppers wrote on the paper.** Not an entity of its own —
it is a field on a sheet — but it is the number a reader of the photograph can
actually see, so it is half of every citation.

**The three numberings agree nowhere**, and that is the fact this model exists
to keep straight:

- the **leaf** is written on the object and is what the book calls itself;
- the **sequence** counts photographs, so covers and versos shift it;
- the **ref** is in no order at all and names exactly one image.

« Leaf 58 » names six different things across the six volumes, and three inside
Book I alone — refs 18297, 17062 and 17411. **Ref 18297 names one thing.** So a
citation from this site prints both, and `src/lib/cite.ts` is the single place
that builds one.

---

## The reading's units

### Batch

**Twelve consecutive sheets**, by position in the digitised book. Batch *k* of a
ledger covers sheets `12(k−1)+1` to `12k`, and the last batch of a volume is
short.

This is the one unit here that the archive does not have — it is ours, and it
exists because a transcription pass has to be a size somebody can finish and a
reader can re-check. Twelve is not arbitrary and it is not the number the
method came with: the parent project reads twenty pages at a time, and twenty
pages of prose is a different thing from twenty ledger leaves, each a ruled
table forty lines deep in which every line carries a date, a place, a price and
a fraction, and any one of them is wrong if it is guessed.

A batch is also **the unit a citation names** and the unit a release is cut on.
One `.tex` file per batch, `batch-NN.tex`, and no register in the name because
[there is one edition](#one-edition-and-why).

Defined in `src/lib/batches.ts` and `.claude/skills/transcribe-hopper/`.

### Transcription

One `.tex` file under `transcripts/<ledger>/batch-NN.tex`. **The source of
record.** Everything else in the repository is derived from these and is
rebuilt: the HTML, the PDF, the TEI, the tag index, the accounts, the timeline.

Its header comment carries the `Pass:` line — the model that read the sheets and
the date — which travels into the TEI header, the site, and the citation
metadata, so provenance stays a fact about the file rather than about the
repository that happens to hold it.

The apparatus inside it:

| Macro | Means | In TEI |
|---|---|---|
| `\sheet{ref}{leaf}` | which photograph the following lines came off | `<pb facs n xml:id>` |
| `\work{…}` | this leaf records one work, and this is its title as written | `<div type="work">` with `<head type="work">` |
| `\hand{jo}{…}` | whose writing this is | `<seg hand="#jo">` |
| `\ill{}` | illegible, and **never conjectured** | `<gap reason="illegible"/>` |
| `\uncertain{…}` | read, doubtfully | `<unclear>` |
| `\add{…}` | supplied by the transcriber | `<supplied>` |
| `\struck{…}` | struck out on the leaf | `<del>` |
| `\note{…}` | the transcriber's observation | `<note type="editorial">` |
| `\marginal{…}` | something written in the margin, and where it stands | `<note place="margin">` |
| `\sketch{…}` | Edward Hopper's ink record drawing | `<figure type="record-sketch">` |
| `\clipping{…}` | a cutting pasted to the leaf | `<figure type="clipping">` |
| `\ink{red}{…}` | the ink a cell is written in — red, pencil or blue; black is unmarked | `<hi rend="ink-red">` |
| `\ruledoff` at a row's head | a rule drawn above this row's figure | `<row rend="rule-above">` |
| `ledgertable` | the ruled columns | `<table>`/`<row>`/`<cell>` |
| `\keywords{…}` | the batch's tags | `<term>` in `<textClass>` |

The mapping is one to one and mechanical. A difference between a `.tex` and its
`.xml` is a bug, not a judgement.

### Work

A leaf of the paintings books is organised around **one work**: Edward Hopper's
record sketch of the finished canvas, and opposite it Jo Hopper's description,
size, date, price and buyer. `\work{}` declares it, and the rows that follow
belong to it until the next `\work{}` or the next leaf.

A leaf that is a running list rather than a work's record — Book I leaves 60 to
63 — declares none, and its rows attach to the leaf with no work. The readers
are given the last work declared elsewhere as a *carried* value they may use or
ignore; on a running-list leaf it names a work the row has nothing to do with,
so a consumer that wants it has to ask.

### Row

One ruled line of a `ledgertable`, as cells. **The columns are the stationer's
and not the writer's**, and no heading is written above any of them anywhere in
Book IV, so they are left unheaded in the transcription too.

What a row *means* is not encoded — it is read, by `scripts/accounts.mjs`, from
the words and the position, and every rule it uses is written down where it is
applied. The transcription says what is on the line; it does not say whether the
line is a charge, a receipt, a subtotal or a sum carried, because the leaf does
not say either.

### Hand

**Which of the two people wrote a passage.** Josephine Nivison Hopper wrote
almost every word in the six volumes over fifty-four years — really four or five
hands of her own, and the differences are datable — and Edward Hopper drew the
record sketches and wrote the dimensions.

This is the one part of the transcription that **could not be reconstructed from
the photographs by somebody else** without doing the whole work again. It is why
the TEI export exists: `<handNote>` and `@hand` carry the attributions out of
this repository and into a format that outlives it.

A batch attributes to nobody rather than guessing, and says so in a `\note{}`.

### Keyword

One `\keywords{}` line closes each transcription and is the single source of
that batch's tags. A term may declare a **facet** — `dealer: Frank K. M. Rehn`
— from a closed set of ten: `medium`, `place`, `work`, `person`, `dealer`,
`collection`, `society`, `publication`, `prize`, `feature`.

The set is closed and deliberately small. The point of facetting is that a
reader can find the museums without reading past the places; a vocabulary that
grows a facet per term is the flat list again with extra punctuation.

A term declaring no facet is a tag and not a classification, and the facet is
then *absent* rather than empty — which is a different statement and is kept as
one all the way into the TEI.

The facets are declared in `scripts/lib/ledger.mjs` and published as a
`<taxonomy>` in every TEI file's header. `tei/hopper.odd` closes the value list,
and `npm run tei:validate` refuses a facet outside it.

---

## Two things the model deliberately does not have

### One edition, and why

The method this project comes from carries two editions of every text: the
transcription, and a modernised reading that restates the mathematics in current
notation. A ledger needs no such pass. Jo Hopper's English is plain, her columns
are already a table, and « 30 - 1/3 » means today exactly what it meant in 1927.

So the transcription **is** the edition, and a file is `batch-NN.tex` with no
register in its name. What the abbreviations mean is a separate question, and it
is answered in the glossary on [`/method/`](https://hopper.commutator.io/method/)
rather than by expanding them in the text — expanding them would be
normalisation, and normalisation is the thing the transcription refuses.

### No copy of the archive

There is no `image` entity, and there never will be. The facsimiles are the
Whitney's, served from the Whitney's own server to the reader's browser. The
`.gitignore` has a line whose only job is to keep them out of a commit, and
`src/lib/batches.ts` records the four measurements that make the direct request
possible.

Nothing of the archive passes through this repository at any point.
