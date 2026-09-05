# The harvest — the one step a machine here does not do

`scripts/catalogue.mjs` reads these six files and writes
`src/content/catalogue.ts`. They are the Whitney's own listing of the six
ledgers, one line per digitised sheet:

```
16853|Page 2 ["Evening Wind"]
```

— the ResourceSpace **resource ref**, then the Whitney's **file or component
descriptor** for that sheet, verbatim.

## Why they are checked in rather than fetched

Whitney's ResourceSpace serves its **images** to anyone: `download.php` answers
a plain `GET` from any origin, echoes whatever `Origin` it is sent, honours
range requests, and checks no referer. That is measured, not assumed, and it is
what lets this site show a sheet without storing one.

Its **HTML pages** are another matter. `search.php` and `view.php` sit behind a
JavaScript bot-check that a script would have to impersonate a browser to pass.
This project does not do that. So the listing is taken **by a person, in a
browser they are already entitled to use**, with the snippet in
[`../scripts/harvest.js`](../scripts/harvest.js), and the result is committed —
which also means the inventory this site rests on is reviewable in a diff
rather than re-derived on every build.

`robots.txt` asks for a ten-second crawl delay and disallows `/filestore`.
Nothing here touches `/filestore`, and `npm run mirror` sleeps ten seconds
between sheets.

## Re-harvesting

Open each collection with every sheet on one page:

| File | Collection |
|---|---|
| `collection-1052.txt` | [Book I](https://resourcespace.whitney.org/pages/search.php?search=%21collection1052&per_page=500&order_by=collection&sort=ASC) |
| `collection-1064.txt` | [Book II](https://resourcespace.whitney.org/pages/search.php?search=%21collection1064&per_page=500&order_by=collection&sort=ASC) |
| `collection-1085.txt` | [Book III](https://resourcespace.whitney.org/pages/search.php?search=%21collection1085&per_page=500&order_by=collection&sort=ASC) |
| `collection-1097.txt` | [Book IV](https://resourcespace.whitney.org/pages/search.php?search=%21collection1097&per_page=500&order_by=collection&sort=ASC) |
| `collection-1111.txt` | [Book V](https://resourcespace.whitney.org/pages/search.php?search=%21collection1111&per_page=500&order_by=collection&sort=ASC) |
| `collection-1112.txt` | [Dealers/Etchings](https://resourcespace.whitney.org/pages/search.php?search=%21collection1112&per_page=500&order_by=collection&sort=ASC) |

Paste `scripts/harvest.js` into the console, copy what it prints, replace the
file, then `npm run catalogue`. The order of the lines **is** the order of the
sheets in the book, so do not sort them.
