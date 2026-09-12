import { useState } from 'react';
import type { Facet, Tag } from '../lib/types.ts';

/**
 * The facets, in reading order, with the heading each gets.
 *
 * The order is an argument about the archive rather than an alphabet: what the
 * work is, where it was made, who sold it, who bought it, where it came to
 * rest, and last what the leaves themselves do. A reader looking for the
 * museums should not have to read past the places to find them, which is the
 * whole complaint the flat list earned.
 */
export const FACET_LABEL: Record<Facet, string> = {
  medium: 'Medium',
  place: 'Places',
  work: 'Works',
  person: 'People',
  dealer: 'Dealers',
  collection: 'Collections',
  society: 'Societies and exhibitions',
  publication: 'Publications',
  prize: 'Prizes',
  feature: 'On the leaves',
};
export const FACET_ORDER = Object.keys(FACET_LABEL) as Facet[];

/**
 * One facet's tags, capped.
 *
 * Book I names a hundred and ten terms across six batches, and shown whole
 * they pushed « Read a batch » a full screen below the fold — reading a batch
 * being the thing the page is for. Capping restores that order without hiding
 * anything: the count is on the button, and the group opens in place.
 */
export function FacetGroup({
  heading,
  list,
  picked,
  onPick,
  title,
}: {
  heading: string | null;
  list: Tag[];
  picked: string | null;
  onPick: ((tag: string | null) => void) | null;
  title?: (t: Tag) => string;
}) {
  const [all, setAll] = useState(false);
  const CAP = 8;
  // A chosen tag stays visible even when its group is closed, so the page
  // never shows a filter in force with nothing selected to explain it.
  const shown = all || list.length <= CAP ? list : list.slice(0, CAP);
  const hidden = list.length - shown.length;
  const spill =
    hidden > 0 && picked && !shown.some((t) => t.tag === picked)
      ? list.filter((t) => t.tag === picked)
      : [];

  return (
    <div className="flex flex-wrap content-start items-start gap-1.5">
      {heading && (
        <span className="w-full text-[10.5px] uppercase tracking-wider text-ink-400">{heading}</span>
      )}
      {[...shown, ...spill].map((t) => {
        const on = picked === t.tag;
        const label = title
          ? title(t)
          : `Written in ${t.batches.length === 1 ? 'batch' : 'batches'} ${t.batches.join(', ')}`;
        // Where nothing can be narrowed the term is not a button. A control
        // that looks pressable and answers with the same list every time is
        // worse than a word, and a notebook's one keywords line covers the
        // whole file — see `TagCloud`.
        if (!onPick) {
          return (
            <span
              key={t.tag}
              title={label}
              className="rounded-full bg-brand-50 px-2 py-0.5 text-[11.5px] text-brand-700"
            >
              {t.tag}
            </span>
          );
        }
        return (
          <button
            key={t.tag}
            onClick={() => onPick(on ? null : t.tag)}
            title={label}
            className={
              'rounded-full px-2 py-0.5 text-[11.5px] transition ' +
              (on ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700 hover:bg-brand-100')
            }
          >
            {t.tag}
          </button>
        );
      })}
      {hidden > 0 && (
        <button
          onClick={() => setAll(true)}
          className="rounded-full px-2 py-0.5 text-[11.5px] text-ink-500 underline decoration-ink-300 underline-offset-2 hover:text-ink-800"
        >
          + {hidden} more
        </button>
      )}
      {all && list.length > CAP && (
        <button
          onClick={() => setAll(false)}
          className="rounded-full px-2 py-0.5 text-[11.5px] text-ink-500 underline decoration-ink-300 underline-offset-2 hover:text-ink-800"
        >
          fewer
        </button>
      )}
    </div>
  );
}

/** Whether any tag in the list declared no facet. */
export const hasUnplaced = (tags: Tag[]) => tags.some((t) => t.facet === null);

/**
 * A ledger's or a notebook's terms, grouped by facet.
 *
 * Two shapes, because the two documents tag differently and pretending
 * otherwise would misreport one of them. A ledger has a `\keywords{}` line per
 * batch and its terms declare a facet, so the groups are headed and a term is
 * a filter that narrows the sheets below to its batches. A notebook has one
 * line at the end of one file, and its terms declare nothing — so every term
 * would fall under « Not placed », and every term would select the same
 * sheets. Heading a single pile is noise and a filter that cannot narrow is a
 * lie about what a click does, so where nothing is placed the headings and the
 * buttons both go.
 */
export function TagCloud({
  tags,
  picked,
  onPick,
  title,
}: {
  tags: Tag[];
  picked: string | null;
  onPick: ((tag: string | null) => void) | null;
  title?: (t: Tag) => string;
}) {
  const grouped = [
    ...FACET_ORDER.map((f) => [f, tags.filter((t) => t.facet === f)] as const),
    ['none', tags.filter((t) => t.facet === null)] as const,
  ].filter(([, list]) => list.length > 0);

  // Every term unplaced: one ungrouped, unheaded run.
  if (grouped.length === 1 && grouped[0][0] === 'none') {
    return <FacetGroup heading={null} list={tags} picked={picked} onPick={onPick} title={title} />;
  }

  return (
    <div className="grid items-start gap-x-8 gap-y-3 sm:grid-cols-2">
      {grouped.map(([facet, list]) => (
        <FacetGroup
          key={facet}
          heading={facet === 'none' ? 'Not placed' : FACET_LABEL[facet as Facet]}
          list={list}
          picked={picked}
          onPick={onPick}
          title={title}
        />
      ))}
    </div>
  );
}
