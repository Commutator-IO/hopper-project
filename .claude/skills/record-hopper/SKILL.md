---
name: record-hopper
description: Produces the record edition of a Hopper artist's ledger — a summary written for someone who has not met the material, then every entry of the transcription restated as a structured record (work, medium, size, date, price, buyer, dealer), which `npm run records` extracts to CSV and JSON-LD. Runs on the transcription that /transcribe-hopper produced, never on the photographs. Use when someone asks for the records, the structured data, the CSV, the catalogue reading or the second edition of a ledger, batch or book.
---

# The record edition

**Pin Opus 5 (`claude-opus-5`).** This pass reads typed LaTeX, not handwriting,
so it has none of the visual-attention constraint the transcription has — but
it is the pass that decides what a figure *means*, and a wrong decision here
travels into a CSV that somebody will join to a catalogue raisonné.

## What this produces

| File | Covers |
|---|---|
| `transcripts/<ledger>/batch-NN.rec.tex` | one batch |
| `transcripts/<ledger>/<ledger>.rec.tex` | the whole ledger, where the argument runs across batches |

**Take the whole ledger when the running totals do.** Book IV is one continuous
account from November 1913 to March 1967, its page totals carried forward
across every batch boundary; a record edition cut at sheet 12 would state
balances that are true of no leaf in the book. The etchings leaves of Book I
are the opposite case — one work to a leaf — and take the batch.

The site offers whichever exists; `npm run manifest` works it out from the
filename, so the choice is made by naming the file and nothing else has to
know.

## It works from the transcription, and never from the photograph

Two independent readings of the same hand would diverge and nothing would say
which was right. If a field is wrong here it is wrong in the `.tex`, and the
fix goes there — then this file is rebuilt.

The one thing this pass may do that the transcription may not is **join**: the
record for Evening Wind is spread over leaves 2, 3 and 5, and the record
edition puts it in one block. Joining is a claim, and where the join is not
certain the record says so.

## The shape of the file

```latex
\documentclass[11pt,a4paper]{article}
\input{../preamble/hopper}

\ledger{book-i}
\ledgertitle{Artist's ledger --- Book I}
\objectnumber{96.208}
\batch{1}
\sheets{1}{12}
\dating{1913--1963}
\watermark{Demonstration edition --- one reader's interpretation}

\begin{document}

\begin{summary}
Written for somebody who has not met the material...
\keywords{etchings, Frank K. M. Rehn, Frederick Keppel, print dealers, Brooklyn Society of Etchers, exhibition history}
\end{summary}

\section{Leaf 2}
\sheetrange{9}{10}

\begin{record}{Evening Wind}
\field{medium}{Etching}
\field{size}{7 x 8 3/8"}
\field{date}{1921}
\field{price}{\$30, reduced to \$25}
\field{dealer}{Frank K. M. Rehn}
\field{note}{Continues on leaf 3 and again at leaf 5; the three runs are
joined here and are separate on the leaves.}
\end{record}

\end{document}
```

The watermark differs from the transcription's, and deliberately: this edition
is allowed to depart from the leaf, so it declares that it is an
interpretation as well as a demonstration.

### The summary

Under `\begin{summary}`, and it is the one passage that is not a record. Write
it for somebody who has not met the material: what these leaves hold, what the
columns mean, which dealers and societies recur, what is unusual about this
run. Two to five paragraphs.

Close it with `\keywords{}` — comma-separated, and **the single source of the
ledger's tags**. `npm run manifest` extracts them and the archive page searches
on them. There is deliberately no tags file, so no tag can describe leaves
nobody has read. Six to twelve terms for a batch, more for a whole ledger:
dealers, exhibiting societies, media, places, the kind of transaction.

### The records

One `record` block per unit the leaf actually has — per work on the etchings
and paintings leaves, per payment in Book IV, per dealer in Dealers/Etchings.
The block's argument is the work's title **exactly as the leaf gives it**.

`\field{}` takes one of exactly these names, and `npm run records` warns and
skips anything else:

`title` `medium` `size` `date` `price` `buyer` `dealer` `exhibition` `note`

**Every field is absent when the leaf does not carry it.** Absent means the
field is not written at all, which becomes an empty cell in the CSV. It does
not mean zero, it does not mean a guess, and it never means the value from the
record above.

The apparatus travels into the fields and is understood there:
`\uncertain{16.66}` marks the whole record `uncertain` in the CSV's certainty
column; `\ill{}` marks it `partial`. That is why the marks must be kept rather
than resolved — the column that says how much to trust a row is built from
them.

## What not to do

- **Never complete a field from knowledge of Hopper.** Not the year of a plate,
  not a work's present owner, not a dealer's full name where the leaf gives
  initials. Six months on, a field that came from a scholar's memory is
  indistinguishable from one that was read. If you know something the leaf does
  not say, it belongs in `\field{note}` as a sentence that names itself as
  ours — not in a field a spreadsheet will treat as data.
- **Never normalise.** `date` takes "Fall 1923" as "Fall 1923". `price` takes
  "$18 - 50%" as it stands. `size` takes `7 x 8 3/8"`. Converting them is the
  consumer's business, and a consumer who wants the original after you have
  converted it has nothing to go back to.
- **Never total anything.** Book IV's leaves carry Jo Hopper's own carried-
  forward totals; transcribe them as records if they are records, and do not
  compute one of your own. A total this pass invented would be indistinguishable
  from one she wrote.
- **Never invent a title.** A leaf that records a transaction against no named
  work takes a record whose argument is a short description in square
  brackets — `[unnamed etching, leaf 44]` — and a `\field{note}` saying so.
- **Never drop a record because it is incomplete.** A row with a date and
  nothing else is a row; it goes in with one field.

## Then

```bash
npm run render      # the reading view; fails loudly on the subset
npm run records     # -> public/records/<ledger>.csv and .jsonld
npm run manifest    # tags, counts, and the Records tab
```

Read the CSV. Sort it by the certainty column and look at the `uncertain` rows
first: those are the readings a person should check, and the whole point of
carrying the apparatus this far is that the list exists.
