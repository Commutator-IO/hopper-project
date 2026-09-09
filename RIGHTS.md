# Rights, in three statements

Three kinds of thing are in this repository and they have three different
statuses. A single licence file cannot say all three, and one that tries says
the wrong thing about at least two of them.

This document is the map. The operative texts are [`LICENSE`](LICENSE) for the
first two statements and [`transcripts/NOTICE`](transcripts/NOTICE) for the
third.

| What | Where | Status |
|---|---|---|
| 1. The software | `scripts/`, `src/` except `src/content/`, `tei/`, the workflow, the configs | CC0 1.0 — public domain |
| 2. The generated data and metadata | `src/content/`, `public/transcripts/*.xml`, `harvest/`, `CITATION.cff`, `codemeta.json` | CC0 1.0 — public domain, database rights included |
| 3. The transcribed text | the bodies of `\hand{}` and `\work{}`, and the quoted matter inside the ruled tables, in `transcripts/**.tex` | **Not ours.** © Heirs of Josephine N. Hopper, licensed by Artists Rights Society (ARS), New York |

The third row is a carve-out **by content and not by path**, because a `.tex`
file is genuinely mixed. Everything in it that is not one of those three things
— every `\note{}`, every `\marginal{}` gloss, the `\keywords{}` lines, the hand
attributions, every `\uncertain{}`, and the LaTeX that carries them — is the
maintainers' own editorial work and falls under statement 1.

---

## 1. The software

`scripts/`, `src/` other than `src/content/`, `tei/hopper.odd`, the GitHub
workflow, the TypeScript and Vite configuration, and this documentation.

**CC0 1.0 Universal.** Take it, fork it, sell it, relicense it, and no
attribution is required. Attribution is welcome and is not a condition.

## 2. The generated data and metadata

`src/content/*.json` and `src/content/catalogue.ts` — `works.json`,
`accounts.json`, `formats.json`, `materials.json`, `manifest.json`,
`timeline.json` and the rest — the TEI files under `public/transcripts/`, the
Whitney's listing as retrieved under `harvest/`, and the citation metadata at
the root.

**CC0 1.0 Universal, and this is a separate statement rather than a repetition
of the first one**, for two reasons.

**The reason it can be given away.** Prices, dates, dimensions, buyers' names,
accession numbers and exhibition records are *facts*. Facts carry no copyright
in any jurisdiction this project has looked at. These files are the
maintainers' own compilations of facts read off the sheets, and the compilation
is ours even where nothing in it is. **The accounts pages therefore stand on
firmer ground than the reading panes** — which is the reverse of what the
question usually assumes, and it is worth saying plainly.

**The reason it needs saying separately.** A database can attract rights of its
own where copyright does not reach: the European Union's *sui generis* database
right protects the investment in assembling a collection, whatever the status
of what is in it. CC0 waives that too, expressly. A statement that only
mentioned copyright would leave a reuser in the EU to work out whether the
database right had been waived, and the answer is that it has.

One qualification, and it is the same one as statement 3. The TEI files under
`public/transcripts/` are *derived from the transcriptions* and carry the
transcribed text inside them. The dedication reaches the encoding, the header,
the structure and the apparatus. It does not reach the words the Hoppers wrote,
wherever they appear.

## 3. The transcribed text

The sheets are the **Edward and Josephine Hopper artist's ledgers**, Whitney
Museum of American Art, 96.208 to 96.213 — gifts of Lloyd Goodrich and museum
purchases.

> © Heirs of Josephine N. Hopper, licensed by Artists Rights Society (ARS),
> New York. The Whitney records the object rights as transferred to the
> Museum.

Josephine Hopper died in 1968, so her text is in copyright in the United States
and in the European Union for some years yet. **No permission to reproduce it
has been sought from ARS or from anyone else, and none has been granted.**
These are unauthorised working documents, and each one says so on its own face:
the rights line is printed in the title block of every rendered file and
repeated as a watermark on every page of every PDF, and `npm run render` will
not build a file that omits it.

CC0 does not, and cannot, reach this text. Nobody can dedicate to the public
domain what they do not hold.

**If you hold or represent these rights**, open an issue at
<https://github.com/Commutator-IO/hopper-project/issues>, or write to the
repository owner, and say what you would like changed. A request to remove or
restrict any part of the transcriptions will be acted on rather than argued
with.

Nothing of the archive itself is stored here. The facsimiles are the Whitney's
images, served from the Whitney's own server to the reader's browser; the
`.gitignore` has a line whose only job is to keep them out of a commit.

---

## Why CC0, and whether it was ever chosen

It began as a default. The initial commit (`9b6bce3`, 5 September 2026) added a
bare CC0 1.0 file over the whole repository, `transcripts/` included, with no
discussion anywhere of the choice — the commit contains that file and nothing
else. Three lines of README away, the same repository said the transcriptions
reproduce Josephine Hopper's text and are unauthorised working documents. Both
could not be true.

It has since been chosen twice, deliberately.

**The narrowing (`163eda8`, 8 September 2026, issue #17.)** The scope header
went above the CC0 text, `transcripts/NOTICE` was written, and the carve-out
was made by content rather than by path. The reasoning recorded there is the
one that still holds: the licence file is the half a reuser actually reads, it
is what every automated scanner reads, and **a false grant cannot be
un-relied-upon afterwards.**

**The reaffirmation (issue #16, 10 September 2026.)** With the licensing split
into the three statements above, the alternative was on the table: a software
licence such as MIT or BSD-2 on statement 1, which is what most digital-
humanities repositories use, and CC0 or CC-BY on statement 2. It was not taken,
and the reason is that neither of the things those licences buy is wanted here.

- **Attribution as a condition** is the main thing a permissive licence adds
  over CC0. This project cannot ask for it with a straight face while
  statement 3 stands: a corpus that reproduces someone else's text without
  permission is in no position to impose terms on the tooling that reads it.
  Credit is asked for in the README and left there.
- **A warranty disclaimer** is the other. CC0 carries one in section 4(b), and
  the code here is a static-site build with no dependents.

What CC0 buys instead is that a reuser has nothing to comply with, which
matters for a corpus whose *whole* point is that somebody else can check the
reading. A licence that made the tooling awkward to reuse would be an obstacle
in exactly the place the project claims to want none.

**What none of this does is get permission.** That is a different piece of
work, it means approaching ARS, and it wants a lawyer rather than a commit.
Stating the position accurately is not a substitute for it, and is not offered
as one.
