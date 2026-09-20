// Generates the figures of the critical note: empty frames for works at the
// proportions of the size in Edward Hopper's hand (images not reproduced), and
// the site's drawings redrawn from the same JSON. Every figure is signed.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SCHEMAS } from './schemas.mjs';
const C = '/Users/michel/Commutator/hopper-project/src/content/';
const J = (p) => JSON.parse(readFileSync(C + p, 'utf8'));
const esc = (t) => String(t).replace(/&/g, '\\&').replace(/%/g, '\\%').replace(/#/g, '\\#').replace(/_/g, '\\_');
const SIGN = 'Drawn by Claude Fable~5.1, 13 September 2026';
const gen = (f) => J(f).generated?.slice(0, 10) ?? 'undated';
const out = {};

// ------------------------------------------------------------ frames
// [slug, title as the leaf heads it, height, width (inches), size as written, museum, accession, url, ledger citation, note]
const WORKS = [
  ['evening-wind', 'Evening Wind', 7, 8.375, '7 x 8 3/8"', 'The Metropolitan Museum of Art', '25.31.7', 'https://www.metmuseum.org/art/collection/search/366211', 'Book I, leaf 2, ref 16853', 'etching, 1921'],
  ['night-shadows', 'Night Shadows', 7, 8.375, '7"x8 3/8"', 'The Metropolitan Museum of Art', '25.31.2', 'https://www.metmuseum.org/art/collection/search/366206', 'Book I, leaf 6, ref 16548', 'etching, 1921'],
  ['east-side-interior', 'East Side Interior', 8, 10, '8"x10"', 'The Metropolitan Museum of Art', '25.31.1', 'https://www.metmuseum.org/art/collection/search/366204', 'Book I, leaf 8, ref 17539', 'etching, 1922'],
  ['house-by-a-railroad', 'House by a Railroad', 24, 29, '24 x 29', 'The Museum of Modern Art', '3.1930', 'https://www.moma.org/collection/works/78330', 'Book I, leaf 52, ref 18056', 'oil, 1925; catalogued as House by the Railroad'],
  ['automat', 'The Automat', 28, 36, '28 x 36"', 'Des Moines Art Center', '1958.2', 'https://desmoinesartcenter.org/wp-content/uploads/2022/04/cc-hopper.pdf', 'Book I, leaf 54; Dealers, leaf 56', 'oil, 1927'],
  ['railroad-sunset', 'Railroad Sunset', 29, 48, '29 x 48', 'Whitney Museum of American Art', 'work 5874', 'https://whitney.org/collection/works/5874', 'Book I, leaf 58, ref 18297', 'oil, 1929; « A real beauty this one. »'],
  ['tables-for-ladies', 'Tables for Ladies', 48, 60, '4 x 5 ft.', 'The Metropolitan Museum of Art', 'Hearn Fund, 1931', 'https://www.metmuseum.org/art/collection/search/487695', 'Book I, leaf 59, ref 16991', 'oil, 1930'],
  ['nighthawks', 'Night Hawks', 33, 60, '33 x 60', 'Art Institute of Chicago', '1942.51', 'https://www.artic.edu/artworks/111628', 'Book II, leaf 95, ref 17982', 'oil, finished 21 January 1942; catalogued as Nighthawks'],
  ['rooms-by-the-sea', 'Rooms by the Sea', 29, 40, '29 x 40', 'Yale University Art Gallery', '1961.18.29', 'https://lux.collections.yale.edu/view/object/63bdda22-a6be-413d-9a35-5e2649c14c21', 'Book III, leaf 41, ref 18347', 'oil, September 1951; alias « The Jumping Off Place »'],
  ['office-in-a-small-city', 'Office in a Small City', 28, 40, '28 x 40', 'The Metropolitan Museum of Art', '53.183', 'https://www.metmuseum.org/art/collection/search/488730', 'Book III, leaf 49, ref 18028', 'oil, September 1953'],
  ['south-carolina-morning', 'South Carolina Morning', 30, 40, '30 x 40', 'Whitney Museum of American Art', '67.13', 'https://whitney.org/collection/works/789', 'Book III, leaf 53, ref 18558', 'oil, 1955; « Dinah »'],
  ['second-story-sunlight', 'Second Story Sunlight', 40, 50, '40" x 50"', 'Whitney Museum of American Art', '60.54', 'https://whitney.org/collection/works/873', 'Book III, leaf 73, ref 17872', 'oil, 25 August to 15 September 1960; « Toots »'],
  ['a-woman-in-the-sun', 'A Woman in the Sun', 40, 60, '40 x 60 inches', 'Whitney Museum of American Art', '84.31', 'https://whitney.org/collection/works/1337', 'Book III, leaf 75, ref 17107', 'oil, October 1961; « the WISE TRAMP »'],
  ['saltillo-mansion', 'Saltillo Mansion', 25.125, 19.625, '25 1/8" x 19 5/8"', 'The Metropolitan Museum of Art', '45.157.2', 'https://www.metmuseum.org/art/collection/search/488165', 'Book III, leaf 101, ref 17944', 'watercolour, August 1943'],
  ['cape-cod-bay', 'Cape Cod Bay', 20, 28, '20 x 28', 'Whitney Museum of American Art', 'work 6829', 'https://whitney.org/collection/works/6829', 'Book III, leaf 125, ref 16620', 'watercolour, 1965; the last work leaf photographed'],
];
const BY = Object.fromEntries(WORKS.map((w) => [w[0], w]));
// One scale for the canvases: 60 inches = 9.6 cm. The etchings get their own (10 in = 4 cm) and say so.
const frame = (w, cmPerIn, x0 = 0, y0 = 0) => {
  const [slug, title, h, wd, size] = w;
  const W = wd * cmPerIn, H = h * cmPerIn;
  const sch = SCHEMAS[slug];
  if (sch) return `\\begin{scope}[shift={(${x0},${y0})},x=${W.toFixed(3)}cm,y=${H.toFixed(3)}cm]\\clip (0,0) rectangle (1,1);${sch}\\end{scope}
\\draw[black!70,line width=0.5pt] (${x0},${y0}) rectangle (${x0 + W},${y0 + H});
\\node[anchor=north,font=\\tiny,text=black!60] at (${x0 + W / 2},${y0 - 0.05}) {${esc(title)}, ${esc(size)}};`;
  return `\\draw[fill=black!4,draw=black!60,line width=0.5pt] (${x0},${y0}) rectangle (${x0 + W},${y0 + H});
\\node[align=center,text=black!55,font=\\scriptsize] at (${x0 + W / 2},${y0 + H / 2}) {${esc(title)}\\\\${esc(size)}\\\\\\tiny image not reproduced};`;
};
const frameCaption = (ws, scaleNote) => ws.map((w) => `\\textbf{${esc(w[1])}}, ${esc(w[9])}, ${esc(w[4])} as the leaf writes it (${esc(w[8])}). ${esc(w[5])}, ${esc(w[6])}: \\url{${w[7]}}.`).join(' ') + ` ${scaleNote} ` + (ws.some((w) => SCHEMAS[w[0]]) ? 'The drawings are schemas of the composition in its main masses only, at the proportions of the size in Edward Hopper\'s hand, made from the leaf\'s description and from general knowledge of the picture; nothing is traced and no detail is drawn, and they are not reproductions. The pictures themselves are at the museums\' own pages.' : 'The frames are drawn to the proportions of the size in Edward Hopper\'s hand; the images are not reproduced here and can be seen at the museums\' own pages.') + ` ${SIGN}, from the transcriptions and \\texttt{works.json} (${gen('works.json')}).`;
const figFrames = (name, slugs, cmPerIn, scaleNote, label) => {
  const ws = slugs.map((s) => BY[s]);
  const MAXW = 14.6; let x = 0, y = 0, rowH = 0; const parts = [];
  for (const w of ws) {
    const W = w[3] * cmPerIn, H = w[2] * cmPerIn;
    if (x > 0 && x + W > MAXW) { x = 0; y -= rowH + 0.9; rowH = 0; }
    parts.push(frame(w, cmPerIn, x, y)); x += W + 0.5; rowH = Math.max(rowH, H);
  }
  out[name] = `\\begin{figure}[htbp]\\centering
\\begin{tikzpicture}
${parts.join('\n')}
\\end{tikzpicture}
\\caption{${frameCaption(ws, scaleNote)}}\\label{fig:${label}}
\\end{figure}
`;
};
const CANVAS = 8 / 60;
figFrames('fig-etchings', ['evening-wind', 'night-shadows', 'east-side-interior'], 0.4, 'Scale: ten inches to four centimetres, four times the scale of the canvases in the other figures.', 'etchings');
figFrames('fig-book-i-oils', ['house-by-a-railroad', 'automat', 'railroad-sunset'], CANVAS, 'Scale: sixty inches to eight centimetres, the scale of every canvas frame in this note.', 'bookioils');
figFrames('fig-tables-for-ladies', ['tables-for-ladies'], CANVAS, 'Scale: sixty inches to eight centimetres.', 'tables');
figFrames('fig-nighthawks', ['nighthawks'], CANVAS, 'Scale: sixty inches to eight centimetres.', 'nighthawks');
figFrames('fig-rooms-office', ['rooms-by-the-sea', 'office-in-a-small-city'], CANVAS, 'Scale: sixty inches to eight centimetres; the two 28-by-40 and 29-by-40 formats of the studio pictures of 1949 to 1954.', 'roomsoffice');
figFrames('fig-late-formats', ['south-carolina-morning', 'second-story-sunlight', 'a-woman-in-the-sun'], CANVAS, 'Scale: sixty inches to eight centimetres; the three formats of the last decade, 30 by 40, 40 by 50 and 40 by 60.', 'late');
figFrames('fig-watercolours', ['saltillo-mansion', 'cape-cod-bay'], CANVAS, 'Scale: sixty inches to eight centimetres; an upright Mexican sheet of 1943 beside a Cape watercolour of 1965 on the full imperial sheet.', 'watercolours');

// ------------------------------------------------------------ formats scatter
const F = J('formats.json');
{
  const pts = 'w h n\n' + F.sizes.map((s) => `${s.width} ${s.height} ${s.count}`).join('\n');
  const labels = F.sizes.filter((s) => s.count >= 6).map((s) => `\\node[font=\\tiny,anchor=west,text=black!70] at (axis cs:${s.width + 0.6},${s.height}) {${esc(s.label)}};`).join('\n');
  out['fig-formats-scatter'] = `\\begin{figure}[htbp]\\centering
\\begin{tikzpicture}
\\begin{axis}[width=12.5cm,height=9.5cm,xmin=0,xmax=65,ymin=0,ymax=65,xlabel={width, in inches as written},ylabel={height, in inches},grid=both,grid style={black!10},tick label style={font=\\footnotesize},label style={font=\\footnotesize},axis line style={black!50}]
\\addplot[black!30,thick,domain=0:65] {x};
\\addplot[scatter,only marks,mark=*,scatter/use mapped color={draw=black!70,fill=black!25},visualization depends on={\\thisrow{n} \\as \\n},scatter/@pre marker code/.append style={/tikz/mark size={sqrt(\\n)*1.6pt}},point meta=\\thisrow{n}] table[x=w,y=h] {
${pts}
};
${labels}
\\end{axis}
\\end{tikzpicture}
\\caption{Every format, plotted: width across, height up, one dot to a format and its area standing for how many works were made at it, ${F.formats} formats from ${F.counted} work headings that state a size. The diagonal is where a picture would be square; ${F.byOrientation[0].works} of the ${F.counted} works lie below it, ${F.byOrientation[1].works} above, none on it. The etching plates are in the corner, the watercolour sheets through the middle, the late oils at the top right. After the Technique tab of hopper.commutator.io. ${SIGN}, from \\texttt{formats.json} (${gen('formats.json')}).}\\label{fig:scatter}
\\end{figure}
`;
}
// ------------------------------------------------------------ eight formats to one scale
{
  const top = F.sizes.slice(0, 8);
  const u = 0.088; // cm per inch
  const parts = [];
  top.forEach((s, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x0 = col * 3.85, y0 = -row * 4.1;
    const W = s.width * u, H = s.height * u;
    parts.push(`\\draw[fill=black!6,draw=black!60] (${x0.toFixed(2)},${y0.toFixed(2)}) rectangle (${(x0 + W).toFixed(2)},${(y0 + H).toFixed(2)});
\\node[anchor=north,font=\\tiny,align=center] at (${(x0 + W / 2).toFixed(2)},${(y0 - 0.1).toFixed(2)}) {${esc(s.label)}\\\\${s.count} works};`);
  });
  out['fig-formats-eight'] = `\\begin{figure}[htbp]\\centering
\\begin{tikzpicture}
${parts.join('\n')}
\\end{tikzpicture}
\\caption{The eight formats he came back to, drawn to one scale and to their real proportions, so that a watercolour half-sheet stands beside a five-foot canvas; each is labelled with the number of work headings read at that size. After the Technique tab. ${SIGN}, from \\texttt{formats.json} (${gen('formats.json')}).}\\label{fig:eight}
\\end{figure}
`;
}
// ------------------------------------------------------------ materials succession
const M = J('materials.json');
{
  const rows = [];
  for (const g of M.groups) for (const m of g.materials) if (m.firstYear) rows.push({ name: m.name, group: g.label, years: m.years, first: m.firstYear });
  rows.sort((a, b) => a.first - b.first);
  const lo = 1929, hi = 1967, x = (y) => ((y - lo) / (hi - lo)) * 11;
  const ROW = 0.42;
  const parts = [];
  for (let i = 0; i < rows.length; i++) {
    const y = -i * ROW;
    parts.push(`\\node[anchor=east,font=\\scriptsize] at (-0.2,${y.toFixed(2)}) {${esc(rows[i].name)}};`);
    parts.push(`\\draw[black!12] (0,${y.toFixed(2)}) -- (11,${y.toFixed(2)});`);
    for (const [yr, n] of Object.entries(rows[i].years)) parts.push(`\\fill[black!70] (${x(+yr).toFixed(2)},${y.toFixed(2)}) circle (${(0.05 + 0.035 * Math.sqrt(n)).toFixed(3)});`);
  }
  const H = -(rows.length - 1) * ROW;
  for (let yr = 1930; yr <= 1965; yr += 5) parts.push(`\\draw[black!25] (${x(yr).toFixed(2)},0.25) -- (${x(yr).toFixed(2)},${(H - 0.25).toFixed(2)}); \\node[font=\\tiny,anchor=north] at (${x(yr).toFixed(2)},${(H - 0.3).toFixed(2)}) {${yr}};`);
  out['fig-materials'] = `\\begin{figure}[htbp]\\centering
\\begin{tikzpicture}
${parts.join('\n')}
\\end{tikzpicture}
\\caption{A succession, not a preference: each material against the years the leaves date it to, earliest first, one dot to a year and its size standing for how many works that year names it. Rembrandt colours and zinc white in poppy oil at the start; Winsor \\& Newton and flake white in linseed oil and turpentine from the middle 1940s; the canvas turning from National to Herga and the priming from double to single across the 1950s. Only the ${M.dated} works dated by the leaf itself are plotted. After the Technique tab. ${SIGN}, from \\texttt{materials.json} (${gen('materials.json')}).}\\label{fig:materials}
\\end{figure}
`;
}
// ------------------------------------------------------------ money by year
const A = J('accounts.json');
{
  const art = A.years.map((y) => `(${y.year},${y.net.toFixed(0)})`).join(' ');
  const cb = A.activities.find((a) => a.key === 'cashbook').years.map((y) => `(${y.year},${y.received.toFixed(0)})`).join(' ');
  const ill = A.activities.find((a) => a.key === 'illustration').years.map((y) => `(${y.year},${y.received.toFixed(0)})`).join(' ');
  out['fig-money'] = `\\begin{figure}[htbp]\\centering
\\begin{tikzpicture}
\\begin{axis}[width=13cm,height=8cm,xmin=1912,xmax=1968,ymin=0,ymax=42000,xlabel={year},ylabel={dollars, as written},grid=major,grid style={black!10},tick label style={font=\\footnotesize},label style={font=\\footnotesize},axis line style={black!50},legend style={font=\\scriptsize,at={(0.03,0.97)},anchor=north west,draw=none},scaled y ticks=false,y tick label style={/pgf/number format/fixed,/pgf/number format/1000 sep={,}},x tick label style={/pgf/number format/1000 sep=}]
\\addplot[ybar,bar width=2.2pt,fill=black!70,draw=none,area legend] coordinates {${cb}};
\\addlegendentry{Book IV, the cheques receipted, by year}
\\addplot[thick,black,mark=*,mark size=1.1pt] coordinates {${art}};
\\addlegendentry{Books I, II, III and Dealers, net of the third, by year of sale}
\\addplot[ybar,bar width=2.2pt,fill=black!25,draw=none,area legend] coordinates {${ill}};
\\addlegendentry{Book IV, illustration receipts, 1913--1925}
\\end{axis}
\\end{tikzpicture}
\\caption{The money, three ways: what the pocket book receipts each year from 1920 (dark bars), what the work books state as the net of sales dated in that year (line), and the illustration receipts of the first decade (pale bars). The two art series are not the same number and should not be: one is the dealer's cheques as they arrived, the other the studio's record of what left. Every figure is a floor, read from the transcribed rows under the rules of the accounts chapter. After the Accounts tab of hopper.commutator.io. ${SIGN}, from \\texttt{accounts.json} (${gen('accounts.json')}).}\\label{fig:money}
\\end{figure}
`;
}
// ------------------------------------------------------------ days recorded: year x month matrix
const S = J('streak.json');
{
  const grid = {};
  for (const [iso] of S.days) { const y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1; grid[y] ??= Array(12).fill(0); grid[y][m] += 1; }
  const years = Object.keys(grid).map(Number).sort();
  const cw = 0.42, ch = 0.2;
  const parts = [];
  const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  MONTHS.forEach((m, i) => parts.push(`\\node[font=\\tiny] at (${(i * cw + cw / 2).toFixed(2)},0.18) {${m}};`));
  years.forEach((y, r) => {
    const yy = -(r + 1) * ch;
    if (y % 5 === 0) parts.push(`\\node[font=\\tiny,anchor=east] at (-0.1,${(yy + ch / 2).toFixed(2)}) {${y}};`);
    grid[y].forEach((n, i) => { const shade = n === 0 ? 0 : Math.min(85, 15 + n * 9); parts.push(`\\fill[black!${shade.toFixed(0)}] (${(i * cw + 0.02).toFixed(2)},${(yy + 0.02).toFixed(2)}) rectangle (${((i + 1) * cw - 0.02).toFixed(2)},${(yy + ch - 0.02).toFixed(2)});`); });
  });
  const dow = S.dow.map((n, i) => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]} ${n}`).join(', ');
  out['fig-days'] = `\\begin{figure}[htbp]\\centering
\\begin{tikzpicture}
${parts.join('\n')}
\\end{tikzpicture}
\\caption{The days the six books record, one row to a year from ${years[0]} to ${years[years.length - 1]} and one cell to a month, the darker the more days that month carry an entry: ${S.distinctDays} days in all, from ${S.rowsDated} dated rows. A dense cell is a month of transactions, not of painting; the hollow every summer is the Cape, with the dealers behind them in New York. By day of the week: ${dow}, Sunday a sixth of a weekday. After the calendar of the Timeline tab, which draws every day; this draws every month. ${SIGN}, from \\texttt{streak.json} (${gen('streak.json')}).}\\label{fig:days}
\\end{figure}
`;
}
// ------------------------------------------------------------ travels
const T = J('travels.json');
{
  const P = Object.fromEntries(T.places.map((p) => [p.key, p]));
  const proj = (p, x0, y0, sx, lonMin, latMin) => [((p.lon - lonMin) * sx + x0).toFixed(2), ((p.lat - latMin) * sx / 0.79 + y0).toFixed(2)];
  const draw = (graph, style, x0, sx, lonMin, latMin, labelled) => {
    const parts = []; const seen = new Set();
    for (const m of T.moves.filter((m) => m.graph === graph)) {
      const a = proj(P[m.from], x0, 0, sx, lonMin, latMin), b = proj(P[m.to], x0, 0, sx, lonMin, latMin);
      parts.push(`\\draw[${style},-{Stealth[length=3pt]}] (${a[0]},${a[1]}) to[bend left=8] (${b[0]},${b[1]});`);
      for (const k of [m.from, m.to]) if (!seen.has(k)) { seen.add(k); const c = proj(P[k], x0, 0, sx, lonMin, latMin); parts.push(`\\fill[black] (${c[0]},${c[1]}) circle (1.1pt);`); if (labelled.has(k)) parts.push(`\\node[font=\\tiny,anchor=${labelled.get(k)},inner sep=1.5pt] at (${c[0]},${c[1]}) {${esc(P[k].short)}};`); }
    }
    return parts.join('\n');
  };
  const lab = new Map([['washington-square', 'east'], ['gloucester', 'south west'], ['south-truro', 'west'], ['two-lights', 'south west'], ['chicago', 'south'], ['charleston', 'west'], ['richmond', 'west'], ['las-vegas', 'north'], ['los-angeles', 'west'], ['san-francisco', 'west'], ['portland', 'west'], ['mexico-city', 'east'], ['saltillo', 'east'], ['monterrey', 'east'], ['oaxaca', 'east'], ['guanajuato', 'east'], ['el-paso', 'north east'], ['santa-fe', 'north'], ['grand-teton', 'north'], ['yellowstone', 'north east'], ['st-louis', 'south'], ['cleveland', 'south'], ['pacific-palisades', 'south west'], ['boston', 'east']]);
  const sx = 13 / 58; // lon -124..-66 across 13 cm
  const body = draw('notebook', 'black!80,line width=0.6pt', 0, sx, -124, 16, lab) + '\n' + draw('typescript', 'black!40,dashed,line width=0.5pt', 0, sx, -124, 16, lab);
  out['fig-travels'] = `\\begin{figure}[htbp]\\centering
\\begin{tikzpicture}
\\draw[black!20] (0,0) rectangle (${(58 * sx).toFixed(2)},${((49 - 16) * sx / 0.79).toFixed(2)});
${body}
\\end{tikzpicture}
\\caption{Where the black notebook and the Provincetown typescripts put the Hoppers, drawn at true relative position from coordinates retrieved from OpenStreetMap: solid arrows are Josephine Hopper's year chronicle and her list « To get this straight » of the Mexican journeys, one arrow per leg in the order she wrote them, each year starting from 3 Washington Square North; dashed arrows are the 1941 « Grand Tour of the West » and the 1946 Mexico journey as Madeleine Larson's typescripts give them day by day. It is the order two records fall in, not an itinerary; the ledgers, which record what left the studio and not where anybody was, cannot draw this. After the Timeline tab. ${SIGN}, from \\texttt{travels.json} (${gen('travels.json')}); coordinates © OpenStreetMap contributors, ODbL 1.0.}\\label{fig:travels}
\\end{figure}
`;
}
// Beside this script, where the article reads them from. They were once
// written into a scratch directory of the session that made them, which meant
// the figures could not be regenerated by anybody else — and they went stale:
// the day count in fig-days was a day out for a week before anyone looked.
for (const [k, v] of Object.entries(out))
  writeFileSync(resolve(import.meta.dirname, `${k}.tex`), v);
console.log(Object.keys(out).join(' '));
