# Preservation

The sharpest question anyone can ask about this corpus is not about its
licensing or its schema. It is this:

> This is a working transcription of a hand nobody else has published, and it
> exists in exactly one place, under one account, on one platform.

That is true as of 10 September 2026, and this document is what is being done
about it and what is not.

---

## What would survive what

| If this goes | What is lost | What survives |
|---|---|---|
| `hopper.commutator.io` — one DNS record | every citation that names the site | the repository, and the GitHub Pages URL under `commutator-io.github.io` |
| the GitHub account | the repository, the issues, the history, the site | the Zenodo deposit — **once there is one** — and any clone |
| this project entirely | the readings, the apparatus, the hand attributions | the sheets, which are the Whitney's and are not ours to lose |

The last row is the one worth holding onto. **Nothing of the archive is at risk
here**, because nothing of the archive is here: the facsimiles are served from
the Whitney's own server to the reader's browser and never enter a commit. What
this project can lose is the *reading* — the transcriptions, the `\note{}`
observations, and above all the hand attributions, which are the one part
nobody could reconstruct from the photographs without doing the whole work
again.

## The deposit

**Zenodo, a DOI per release**, chosen 10 September 2026 (issue #16).

Zenodo was chosen over Software Heritage as the primary deposit because the
thing being preserved is a *corpus* that has versions people will want to cite,
not only source code that wants archiving. A DOI resolves, is what a reference
manager and a journal expect, and gives the two identifiers a corpus of this
kind needs:

- a **concept DOI**, which always resolves to the newest version and is what
  `CITATION.cff` carries;
- a **version DOI** per release, which is what a reader quoting a specific
  reading should cite, because a reading can change and the citation should say
  which one was seen.

### When a release is cut

**One release per batch.** A batch is the unit of the work, the unit a citation
already names, and the unit at which the corpus meaningfully changes: twelve
more sheets are read, or a reading is corrected. Cutting a release on a
schedule instead would mean a citation could name a version in which nothing
relevant to it had happened, or — worse — miss the version in which a reading
was corrected.

The forty-four batches already transcribed are one release, not forty-four:
they were read before any of this existed and there is no honest way to
retrofit versions to them. From the next batch on, one each.

### Setting it up

This is the part a person has to do, and it has an order.

1. **Link the repository** at <https://zenodo.org/account/settings/github/>, and
   switch it on. This authorises Zenodo to receive a release; nothing is
   deposited yet.
2. **Cut the first release.** `.zenodo.json` is already in the repository, so
   the deposit takes this project's own metadata rather than whatever Zenodo
   infers from a tarball. Tag it with the version `npm run citation` reports —
   the date of the most recent transcription pass, `v2026.09.09` at the time of
   writing.
   ```bash
   gh release create v2026.09.09 --title "The Hopper ledgers, 2026-09-09" --generate-notes
   ```
3. **Take the concept DOI** — the one Zenodo shows as *« Cite all versions »*,
   not the version DOI — and put it in `CONCEPT_DOI` in
   `scripts/citation.mjs`. Then `npm run citation`, and `CITATION.cff`,
   `codemeta.json` and `.zenodo.json` all carry it.
4. **Say so in the README**, under How to cite.

Until step 3, `CITATION.cff` carries **no DOI at all** rather than a
placeholder. A citation file with a DOI that resolves to nothing is a worse
failure than one with none, because the reader has no way to tell which they
have.

### Software Heritage as well

Not set up, and worth doing once the above is: it archives the repository
itself — history, issues, the lot — where Zenodo archives a snapshot of a
release. A save can be requested at <https://archive.softwareheritage.org/save/>
without any account, and the SWHID it returns can go in `codemeta.json`. It is a
second copy under a second institution, which is the whole argument for it.

## What is deliberately not preserved

**The facsimiles.** They are the Whitney's images, and mirroring them would be
both a rights problem and a claim to hold something this project does not hold.
`npm run mirror` writes them into `archives/` for a transcriber to read, and
`.gitignore` has a line whose only job is to keep them out of a commit.

The consequence has to be stated rather than hidden: **a reader who has only
this deposit cannot check the readings.** They can read the transcription, see
what was marked illegible, see which hand was attributed and by which pass — and
to see the sheet they must go to the Whitney, which is where the `ref` in every
citation points. That is a real limit on the corpus's self-sufficiency, and it
is the right trade: the alternative is a copy of somebody else's archive, kept
in step by nobody.

## What preservation does not fix

The transcriptions are a **first machine pass, unchecked against the sheets by a
person**. Depositing them with a DOI makes them citable; it does not make them
an edition, and every file says so on its own face. A deposit that quietly
raised the status of what it deposits would be worse than no deposit.

See also [`fair.md`](fair.md), which assesses this against the FAIR principles
and records the two places the corpus deliberately does not comply.
