---
name: tag-hopper
description: Writes or revises the `\keywords{}` line that closes a transcription — the single source of a ledger's tags on the site. Use when someone asks to tag a ledger or a batch, to fix its keywords, or to make a run of leaves findable.
---

# Tagging a ledger

**Pin Opus 5 (`claude-opus-5`).**

A ledger's tags have exactly one source: the `\keywords{}` line closing each of
its transcriptions. There is no tags file, and there must not be — a tag that
could be written without reading the leaves would eventually describe leaves
nobody has read.

So this skill never runs first. It runs on a batch that is already transcribed,
and it edits one line of it.

```latex
\keywords{etchings, Frank K. M. Rehn, Frederick Keppel, Weyhe, Brooklyn Society
of Etchers, Chicago Society of Etchers, print editions, exhibition history,
museum purchases, Carnegie Institute}
```

## What a tag is for

Somebody searching the archive page for a dealer, a society, a place or a kind
of transaction, and wanting to know which of five hundred sheets to open. Tags
are search keys, not a summary in miniature.

## The rules

- **Only what the leaves carry.** A dealer is a tag because his name is on a
  leaf. « American modernism » is not a tag: no leaf says it, and a tag nobody
  can point at is an assertion about Hopper wearing the clothes of an index.
- **Names as the leaves give them, expanded once.** `Frank K. M. Rehn`, not
  `Rehn`, so that a search for either finds it — but do not correct her
  spelling in the *transcription* to match. The tag may be the standard form;
  the transcription may not.
- **Six to twelve for a batch. Twenty to forty for a whole ledger.** A ledger
  of 161 sheets covering fifty-four years earns more keys than twelve leaves of
  etchings.
- **Include the kind of transaction**, because it is what distinguishes these
  volumes from one another: `museum purchases`, `gifts`, `commissions`,
  `illustration fees`, `reproduction rights`, `loans`.
- **Include places** where a run is tied to one: `Gloucester`, `South Truro`,
  `Charleston`, `Saltillo`.
- **No years.** The date range is metadata already, on the volume and on the
  site, and a keyword list of years crowds out the terms that do work.
- **No « Edward Hopper », no « Josephine Hopper ».** Every sheet in the archive
  would carry them.

## Then

```bash
npm run manifest
```

which re-extracts the line. Check the archive page: the tags appear on the
ledger, and searching one of them finds it.
