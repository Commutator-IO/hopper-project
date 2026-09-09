# FAIR, and where this corpus deliberately is not

Assessed against the FAIR Guiding Principles (Wilkinson et al., 2016) on
10 September 2026, at 499 of 504 sheets transcribed.

Two of the fifteen principles are **not met and will not be**, and both fail for
the same reason: the objects are not ours. Saying so is the point of doing the
assessment — a compliance table with nothing in the last column is a table
nobody checked.

Legend: **yes** · **partly** · **no, deliberately** · **not yet**

---

## Findable

| | Principle | | Where it stands |
|---|---|---|---|
| F1 | Globally unique, persistent identifier | **not yet** | A DOI is set up but not minted; see [`preservation.md`](preservation.md). Internally the ResourceSpace `ref` is the unique address of every sheet, and it is the museum's, not ours. |
| F2 | Rich metadata | **yes** | Each TEI file carries the source object, its accession number, the model and date of the pass that read it, the hands, the rights and the facets. `CITATION.cff` and `codemeta.json` describe the corpus and the software. |
| F3 | Metadata explicitly include the data's identifier | **yes** | Every `<pb>` carries `facs` — the resolvable Whitney URL — and `xml:id="sheet-<ref>"`. |
| F4 | Registered in a searchable resource | **not yet** | Follows from F1. GitHub and the site are indexed; neither is a registry. |

## Accessible

| | Principle | | Where it stands |
|---|---|---|---|
| A1 | Retrievable by identifier over a standard protocol | **yes** | HTTPS, static, no authentication, no API key, no rate limit. |
| A1.1 | Protocol open, free, universally implementable | **yes** | HTTPS and plain files. |
| A1.2 | Protocol allows authentication where necessary | n/a | Nothing here is authenticated. |
| A2 | Metadata remain available when the data are gone | **partly** | Every citation keeps its object clause — leaf, ref, institution, accession — which stays true whatever happens to this site. It survives *this project*. Whether it survives the platform is F1's question. |

## Interoperable

| | Principle | | Where it stands |
|---|---|---|---|
| I1 | A formal, shared, broadly applicable language | **yes** | TEI P5, validated against the Consortium's own RELAX NG at a pinned version, with the customisation declared in `tei/hopper.odd` and enforced in CI. Fifty-five elements out of six hundred, all of them used. |
| I2 | Vocabularies that themselves follow FAIR | **partly** | The facets are published as a `<taxonomy>` in every file and closed in the ODD — declared, versioned, machine-readable. They are *ours*, not an external authority: no AAT, no VIAF, no Getty ULAN alignment. That is a real gap and a plausible next piece of work. |
| I3 | Qualified references to other data | **partly** | Every sheet points at the Whitney's record; works are matched to institutional records in `work-notes.json` where they are known. The links are URLs, not typed relations. |

## Reusable

| | Principle | | Where it stands |
|---|---|---|---|
| R1 | Richly described with accurate, relevant attributes | **yes** | And with the *negative* attributes, which is rarer: what was illegible, what was doubtful, what could not be attributed to a hand, and what the reader refused to parse. |
| R1.1 | A clear and accessible usage licence | **partly, and honestly** | Three statements in [`RIGHTS.md`](../RIGHTS.md). The software and the generated data are CC0. **The transcribed text is not licensed at all** — see below. |
| R1.2 | Detailed provenance | **yes** | Model and date per batch, in the file, in the TEI header, on the site and in the citation. Every derived file names the script that wrote it, and CI rebuilds the derived files and fails if they have drifted. |
| R1.3 | Meets domain-relevant community standards | **yes** | TEI P5 with a published ODD; CFF and CodeMeta for the metadata. |

---

## The two non-compliances, stated rather than hidden

### The facsimiles are not ours to make accessible

FAIR asks that data be retrievable. **The images are not in this corpus and
never will be.** They are the Whitney's; they are served from the Whitney's own
server directly to the reader's browser, and `.gitignore` has a line whose only
job is to keep them out of a commit.

The consequence is real: a reader holding only a deposit of this corpus cannot
check a reading against the sheet it came from. They can see what was
transcribed, what was marked illegible, and which pass did it — and for the
image they must go to the museum, which is exactly where the `ref` in every
citation points.

This is the right failure. The alternative is a copy of somebody else's archive
that nobody keeps in step, which would be less FAIR and not more: two divergent
copies of a photograph is worse for reuse than one canonical copy at its
holding institution.

### The transcribed text carries no licence, because it cannot

R1.1 asks for a clear licence. The clearest true statement here is that **there
isn't one**: the text is © Heirs of Josephine N. Hopper, licensed by Artists
Rights Society (ARS), New York, and no permission to reproduce it has been
sought or granted. The transcriptions are unauthorised working documents and say
so on their own face — in the title block of every rendered file and as a
watermark on every page of every PDF.

Declaring CC0 over that text would score better on this line and would be a
false grant, and **a false grant cannot be un-relied-upon afterwards**. So the
line reads *partly*, and `RIGHTS.md` says why.

The figures are a separate and much simpler matter, and they go the other way:
prices, dates, dimensions, buyers and accession numbers are facts, facts carry
no copyright, and the compilations of them under `src/content/` are CC0 without
qualification, database rights included. **The accounts pages stand on firmer
ground than the reading panes**, which is the reverse of what the question
usually assumes.

---

## What would move the needle, in order

1. **Mint the DOI.** F1, F4 and half of A2 turn on it, and the setup is four
   steps in [`preservation.md`](preservation.md).
2. **Align the facets to an external vocabulary** — AAT for medium, VIAF or
   ULAN for people and dealers, TGN for places. This is the honest gap in I2 and
   it is the one piece of work here that would let somebody else's data join
   with this.
3. **Type the references.** I3 is URLs where it could be qualified relations.

---

## Reference

Wilkinson, M. D., Dumontier, M., Aalbersberg, I. J., *et al.* (2016). The FAIR
Guiding Principles for scientific data management and stewardship. *Scientific
Data* 3, 160018. <https://doi.org/10.1038/sdata.2016.18>
