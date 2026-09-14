# The accounts, certified

Lean 4 proofs of two things: that what
[`src/content/accounts.json`](../src/content/accounts.json) publishes about money
follows from its own rows (issue
[#26](https://github.com/Commutator-IO/hopper-project/issues/26)); and that Book
IV's reader decides every transcribed row as the rules of
[`docs/book-iv-method.md`](../docs/book-iv-method.md) say it must, with those rules
stated as functions and their properties proved for every input (issue
[#27](https://github.com/Commutator-IO/hopper-project/issues/27)).

```bash
npm run lean            # regenerate lean/Hopper/Data/ from accounts.json
cd lean && lake build   # prove it; fails on any warning, so on any sorry
```

No dependency beyond Lean itself. Every figure in the ledgers is dollars and
cents, and every commission is a third, a quarter, a tenth or fifteen per cent;
in sixtieths of a cent all of them are whole numbers, including « 33 2/3 ». So
the arithmetic is exact in `Int`, `omega` proves the general lemmas, and the
kernel checks the data (`decide +kernel`, never `native_decide`). The accounts
take about ten seconds; the reader, which the kernel runs over all 3,281 rows of
Book IV, about two and a half minutes.

## What is proved

| | Where | Statement |
|---|---|---|
| The three buckets | `Certificate` §1 | For each activity: the reader's rounding of every net; each published year recomputed from the rows; the running balance; the totals as sums of the years; and `accrued = collected + outstanding + notRecorded`, proved from the rows rather than read off the totals. `Buckets.grouped_holds`: the invariant survives any grouping. |
| The dealer's third | `Money` | For every price: the third truncated to the cent is never over the exact third and never under it by more than two thirds of a cent; rounding to the cent is idempotent; any figure written to the nearest cent, a truncated third, or the net after one, passes the reader's two-cent test; a slip of a third of a dollar never does. `CheckedRow.commission_exact` for any rate sixty divides. |
| The checkable rows | `Certificate` §3 | The rows where a price, a rate and a written figure stand together: as many as the reader counts, as many agree, the ones that do not are the ones it names in its order, and row by row Lean's verdict is the reader's. |
| The pencil sums | `Certificate` §4 | For each year total declared in [`pencil-sums.json`](pencil-sums.json), the reader's receipts for the year equal the written total plus what the book is declared to leave out, to the cent. |

## Book IV's reader

`Hopper/BookIV.lean` states the reader's four passes as functions: `readRows` (the
year carried, the phrase a figure inherits, the title a bare price takes, the
« Expenses » block, the ink before the words), `dropRubbed` (a doubtful figure the
next row repeats plainly is its draft), `rule`/`dispose` (every figure's
disposition, with what has been itemised since the last settlement), and
`collapseInstalments` (a picture charged more than once, paid in parts, is charged
once at its price). What a row's words *are* — « rec'd by check », « bill »,
« less », a ditto — is recognised by the regular expressions in
`scripts/accounts.mjs` and arrives as data; everything decided from them is decided
here.

| | Where | Statement |
|---|---|---|
| Every row once | `BookIVTheorems` §1, `ReaderCertificate` | The disposition pass keeps every row, in order; on the volume, every row is decided exactly once. |
| No double commission | §2 | `disposeRows_noDoubleCommission`: a bill is charged only where nothing has been itemised since the last settlement, for any rows. |
| Subtotals | §3 | `rule_subtotal`, `rule_subtotal_of`: a figure is a subtotal exactly when the answering line or the arithmetic of the lines above says so. |
| « less » is never a charge | §4 | `less_never_charged`: a row whose words are « less », and not a cheque, a bill or a ditto of a cheque, is never charged, under any state. |
| A rubbed receipt counts once | §5 | `rule_rubbedReceipt`, `receipt_after_rubbedReceipt`: it is the net, and the receipt written again below it is the receipt. |
| Instalments | §6 | `keeper_max`, `mem_collapseInstalments`: a collapsed charge belongs to a title charged twice, is not the charge at the price, is no larger, and its words say it is an instalment. `collapseFast_eq`: the grouping the kernel uses is the rule's. |
| Years | §7 | `enterBatch_gap`, `rule_noYear`: across a gap between batches the year is not carried, and a figure with no year is reported unread. |
| The reader, as run | `ReaderCertificate` | `reads_as_reader`, `rule_disposes_as_reader`: on all 3,281 rows the model keeps the same rows, of the same kind, in the same year, and decides the same disposition as `scripts/accounts.mjs`; `counts_as_published`: its counters are counts of those decisions. |
| 1921 | `ReaderCertificate` | `leaf53_books_1921_under_1920`: leaf 53's year line reads 1920 over entries of 1921, the next line reads 1922, every row between is booked under 1920 and none under 1921. The rule is applied as written; the defect is the line. This theorem is meant to fail once the line is corrected at source. |

`lean/book-iv-rows.json` is written by `npm run accounts`: each row's cells and
recognised words, and what the reader decided. `scripts/lean.mjs` turns it into
`Hopper/Data/BookIV.lean`.

## What is not

A reading. Whether a leaf says « 16.66 » is a question for the photograph; what
is certified is that, given what the transcription says, the arithmetic the
edition prints follows. A figure misread consistently in the rows and the sums
would pass.

## Files

- `Hopper/Money.lean`, `Buckets.lean`, `Accounts.lean`, `Certificate.lean` — written by hand.
- `Hopper/Data/*.lean` — generated by [`scripts/lean.mjs`](../scripts/lean.mjs), which decides no verdict: it refuses a figure it cannot put into Lean exactly and leaves every comparison to Lean. CI regenerates them and fails if they differ.
- `book-iv-rows.json` — generated by `npm run accounts`: Book IV's rows as the reader saw them and what it decided.
- `pencil-sums.json` — hand-declared; the generator fails if a declared total is not on the sheet it names, or a declared omission is not one of the year's receipts.
