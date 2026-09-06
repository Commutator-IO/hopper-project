# Book V — the record drawings, and what they match

Derived from `transcripts/book-v/batch-01.tex` and `batch-02.tex` by walking the
`\sketch{}` and `\work{}` macros in order, then read back against the sheets.
Rebuild the machine-readable half with the extractor in this directory's history;
the two right-hand columns below are editorial and are not derived.

**Twenty-four record drawings, on eight of the volume's fifteen leaves.** Every
one is Edward Hopper's, in ink, in a ruled box down the left of the leaf. None
of the three receipts leaves (51, 52, 53) carries a drawing of any kind.

A drawing is titled in one of two ways, and the difference is worth keeping:

- **under the box** — a pencil caption giving a title and a measurement, in the
  form leaves 1, 3, 5 and 15 use throughout;
- **in the entry beside it** — no caption but a measurement, with the work named
  in Jo Hopper's ink sale line to the right. Leaves 11 and 13 do this.

Three leaves title nothing at all: on leaf 7 and leaf 9 the drawings carry only a
measurement, a medium and, in five cases, Edward's inscription to her.

## The drawings

| Leaf | Ref | Title | Titled | Measurement | Inscribed |
|---|---|---|---|---|---|
| 1 | 16775 | Houses on Skyline | under the box | 12 x 18 | |
| 1 | 16775 | Rocky Field with Trees | under the box | 12 x 18 | |
| 1 | 16775 | Two Big Trees | under the box | 12 x 18 | |
| 1 | 16775 | Double House, Gloucester | under the box | 12 x 18 | |
| 3 | 18017 | House with Field in Front | under the box | 12 x 18 | |
| 3 | 18017 | House and Trees, Gloucester | under the box | 12 x 18 | |
| 3 | 18017 | Willow Trees and Houses | under the box | 12 x 18 | |
| 3 | 18017 | House near Eastham | under the box | 10 1/2 x 16 | |
| 5 | 16689 | Field and Houses Eastham | under the box | 10 1/2 x 16 | |
| 5 | 16689 | Drawing of Cats | under the box | 14 1/2 x 13 1/2 | |
| 7 | 17426 | *untitled* | — | 15 x 22, conté crayon, black | |
| 7 | 17426 | *untitled* | — | 5 x 7, conté crayon black | To Josie / E. H. |
| 7 | 17426 | *untitled* | — | 7 1/2 x 9 1/2, pen and ink | For Jo / Edward Hopper |
| 9 | 17499 | *untitled* | — | 10 x 13 7/8 | For Jo / Edward Hopper |
| 9 | 17499 | *untitled* | — | 15 1/2 x 18 | To Jo from E. Hopper |
| 9 | 17499 | *untitled* | — | 15 1/2 x 18 | For Jo / Edward Hopper |
| 11 | 18161 | *untitled* | — | 22 x 15 | To Jo. from E. Hopper |
| 11 | 18161 | Charleston House 1929 | in the entry | 22 x 15 | Edward Hopper |
| 11 | 18161 | House on Cape Cod near Eastham | in the entry | 22 x 15 | Edward Hopper |
| 13 | 16409 | Cows | in the entry | 22 x 15 | Edward Hopper |
| 15 | 17084 | My Roof | under the box | 12 x 19 | |
| 15 | 17084 | Gloucester Boats *at wharf* | under the box | 12 x 18 | |
| 15 | 17084 | Gloucester House | under the box | 11 3/4 x 18 | |
| 15 | 17084 | Near Eastham | under the box | 10 3/8 x 16 | |

## Named in Book V, with no drawing

The contrast is the point of the list. These are works the volume records a sale
for and never drew, so nothing in the archive shows what they look like.

| Leaf | Ref | Named | Note |
|---|---|---|---|
| 5 | 16689 | Street Scene | written onto the ruling where a drawing would be |
| 5 | 16689 | Houses at Gloucester | as above; no measurement given for either |
| 6 | 18118 | Cemetary at Gloucester | the unidentified-drawings table |
| 6 | 18118 | Horse + Carriage | *Mexico* interlined |
| 6 | 18118 | Vermont Road | twice, the second an erased repetition |
| 6 | 18118 | Vermont Trees I | |
| 6 | 18118 | Vermont Trees II ? | her query mark |
| 6 | 18118 | Banks of White River | |
| 6 | 18118 | Nudes | |
| 6 | 18118 | House near Eastham | struck through, marked *Paid* — see below |
| 6 | 18118 | Two Nudes — Man + Woman | |
| 13 | 16409 | Nudes / Nude | the second block, sold as a pair for 300 |
| 51–53 | — | the etchings | about forty rows; none is a drawing |

## Two things this list turns up

**A title on two leaves with two buyers.** *House near Eastham* is drawn on leaf
3 and sold there to Hillstrom on 2 June 1959 at 150 less a third, over a struck
and illegible name; leaf 6 lists the same title struck through against Wm.
Ziegler and marked *Paid*, with no price and no date. Neither leaf is corrected
from the other, and the drawing on leaf 3 is the only picture of either.

**The index cannot see leaves 6, 51, 52 or 53.** `scripts/works.mjs` builds its
index from `\work{}` headings, and on those four leaves every title is a cell in
a `ledgertable` — which is the right markup, because those leaves are lists and
not a work's block. The effect is that about forty etching titles on leaves 51 to
53 — *East Side Interior*, *Evening Wind*, *Night Shadows*, *The Locomotive*,
*Cat Boat*, *American Landscape*, *Girl on a Bridge*, *Les Deux Pigeons*, *House
by a River*, *Aux Fortifications* among them, most of which are held and already
carry notes — are not linked to Book V anywhere on the site. Book V's own
purchase record for them is invisible to a reader who arrives by title.

That is a decision about the index rather than about the transcription, and it
has not been made here: the alternative is to teach `works.mjs` to read table
cells, which would also pick up Book I's list leaves. Changing the markup to suit
the index would misdescribe the leaves.
