/**
 * Paste into the browser console on a Whitney ResourceSpace collection page,
 * opened with `&per_page=500` so every sheet is on one page. Prints the
 * `harvest/collection-NNNN.txt` body for that ledger.
 *
 * A person runs this, in a browser, on a page they have open. It is not a
 * crawler and there is nothing here to run headless: see `harvest/README.md`
 * for why that distinction is kept.
 */
copy(
  [...document.querySelectorAll('div[id^="ResourceShell"]')]
    .map((el) => {
      const ref = el.id.replace('ResourceShell', '');
      // Field 108 is the Whitney's "File or Component Descriptor" — the one
      // that names the sheet ("Page 2 [\"Evening Wind\"]"). The `title`
      // attribute carries it whole; the visible text is truncated with an
      // ellipsis, and harvesting that would silently shorten a third of the
      // inventory.
      const d = el.querySelector('.ResourceTypeField108');
      return ref + '|' + ((d && d.getAttribute('title')) || '');
    })
    .join('\n'),
);
console.log('Copied. Sheet count:', document.querySelectorAll('div[id^="ResourceShell"]').length);
