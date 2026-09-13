// Generates LaTeX tables from src/content/*.json for the draft study.
import { readFileSync, writeFileSync } from 'node:fs';
const J = (p) => JSON.parse(readFileSync(`/Users/michel/Commutator/hopper-project/src/content/${p}`, 'utf8'));
const a = J('accounts.json'), f = J('formats.json'), m = J('materials.json'), s = J('streak.json');
const esc = (t) => String(t).replace(/&/g, '\\&').replace(/%/g, '\\%').replace(/\$/g, '\\$').replace(/#/g, '\\#').replace(/_/g, '\\_');
const money = (n) => n == null ? '' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = (n) => n == null ? '' : Math.round(n).toLocaleString('en-US');
let out = '';

// 1. Illustration years (1913-1925)
const ill = a.activities.find(x => x.key === 'illustration');
out += `% illustration\n\\begin{table}[htbp]\\centering\\small\n\\caption{Book IV, the illustration decade: what was charged and what was received, by year, as the transcribed leaves state it. Accrual at the leaf's own date column; a negative balance is a cheque with no charge line behind it.}\\label{tab:ill}\n\\begin{tabular}{lrrr}\\toprule Year & Charged & Received & Balance\\\\\\midrule\n`;
for (const y of ill.years) out += `${y.year} & ${money(y.accrued)} & ${money(y.received)} & ${money(y.outstanding)}\\\\\n`;
out += `\\midrule Total & ${money(ill.totals.accrued)} & ${money(ill.totals.collected)} & ${money(ill.totals.outstanding)}\\\\\\bottomrule\\end{tabular}\\end{table}\n\n`;

// 2. Cashbook (Book IV, art) years
const cb = a.activities.find(x => x.key === 'cashbook');
out += `% cashbook\n\\begin{longtable}{lrrr}\n\\caption{Book IV as a cash book for the pictures, 1920--1967: the charges the leaves itemise and the cheques they receipt, by year. The running balance is charged less received, cumulative; it is not a debt but the gap between what the gallery listed and what its cheques carried, most of it the dealer's third.}\\label{tab:cash}\\\\\\toprule Year & Charged & Received & Running balance\\\\\\midrule\\endfirsthead\n\\toprule Year & Charged & Received & Running balance\\\\\\midrule\\endhead\n`;
for (const y of cb.years) out += `${y.year} & ${money(y.accrued)} & ${money(y.received)} & ${money(y.outstanding)}\\\\\n`;
out += `\\midrule Total & ${money(cb.totals.accrued)} & ${money(cb.totals.collected)} & ${money(cb.totals.outstanding)}\\\\\\bottomrule\\end{longtable}\n\n`;

// 3. Art years (Books I, II, III, dealers)
out += `% art years\n\\begin{longtable}{lrrrrr}\n\\caption{The work books (Books I, II, III and Dealers/Etchings): sales dated in the leaf's own date column, by year. Gross is the price written; the commission is the dealer's share as the row states it; net is what was left. Only rows that put a price in one cell and a date in another are counted, so the etchings are largely absent.}\\label{tab:art}\\\\\\toprule Year & Sales & Gross & Commission & Net & Receipted\\\\\\midrule\\endfirsthead\n\\toprule Year & Sales & Gross & Commission & Net & Receipted\\\\\\midrule\\endhead\n`;
for (const y of a.years) out += `${y.year} & ${y.sales} & ${money0(y.gross)} & ${money0(y.commission)} & ${money0(y.net)} & ${money0(y.received)}\\\\\n`;
out += `\\bottomrule\\end{longtable}\n\n`;

// 4. Top works by net
out += `% top works\n\\begin{table}[htbp]\\centering\\small\n\\caption{The thirty sales at the highest prices among the rows that name a work, as the work books write them. Gross is the price; net is after the third.}\\label{tab:works}\n\\begin{tabular}{lrrll}\\toprule Work & Price & Net & Year & Volume\\\\\\midrule\n`;
for (const w of a.works.slice().sort((x, y) => y.gross - x.gross).slice(0, 30)) out += `${esc(w.title)} & ${money0(w.gross)} & ${money0(w.net)} & ${w.years.join(', ')} & ${w.ledgers.map(l => ({ 'book-i': 'I', 'book-ii': 'II', 'book-iii': 'III', 'dealers': 'D' }[l] || l)).join(', ')}\\\\\n`;
out += `\\bottomrule\\end{tabular}\\end{table}\n\n`;

// 5. Buyers
out += `% buyers\n\\begin{table}[htbp]\\centering\\small\n\\caption{Buyers, ranked by the net the rows credit to them, among parties the transcription tags as a person or a collection. A row is credited on the name or the surname; a bare surname shared by two parties is reported ambiguous and credited to nobody.}\\label{tab:buyers}\n\\begin{tabular}{lrrrl}\\toprule Buyer & Sales & Gross & Net & Years\\\\\\midrule\n`;
for (const b of a.parties.buyers.slice(0, 28)) out += `${esc(b.name)} & ${b.sales} & ${money0(b.gross)} & ${money0(b.net)} & ${b.first}${b.last !== b.first ? '--' + b.last : ''}\\\\\n`;
out += `\\bottomrule\\end{tabular}\\end{table}\n\n`;

// 6. Dealers
out += `% dealers\n\\begin{table}[htbp]\\centering\\small\n\\caption{Dealers, by the rows that name them beside a price in the work books. Book IV's Rehn cheques are not in this table.}\\label{tab:dealers}\n\\begin{tabular}{lrrrl}\\toprule Dealer & Sales & Gross & Net & Years\\\\\\midrule\n`;
for (const b of a.parties.dealers) out += `${esc(b.name)} & ${b.sales} & ${money0(b.gross)} & ${money0(b.net)} & ${b.first}${b.last !== b.first ? '--' + b.last : ''}\\\\\n`;
out += `\\bottomrule\\end{tabular}\\end{table}\n\n`;

// 7. Formats
out += `% formats\n\\begin{table}[htbp]\\centering\\small\n\\caption{The sizes Edward Hopper wrote in the title line, counted once per work heading: the twenty formats that recur. Height before width, as he wrote them; nothing is rounded.}\\label{tab:formats}\n\\begin{tabular}{lrp{7.5cm}}\\toprule Format (in.) & Works & Examples\\\\\\midrule\n`;
for (const z of f.sizes.slice(0, 20)) out += `${esc(z.label)} & ${z.count} & ${esc(z.works.slice(0, 3).join('; '))}\\\\\n`;
out += `\\bottomrule\\end{tabular}\\end{table}\n\n`;

// 8. Materials
out += `% materials\n\\begin{table}[htbp]\\centering\\small\n\\caption{The paint formula as the leaves state it, counted once per work: ${m.worksWithFormula} of ${m.works} work headings carry one. Years are the first and last a dated formula names the material.}\\label{tab:materials}\n\\begin{tabular}{llrl}\\toprule Group & Material & Works & Years\\\\\\midrule\n`;
for (const g of m.groups) for (const x of g.materials) out += `${esc(g.label)} & ${esc(x.name)} & ${x.works} & ${x.firstYear ? x.firstYear + '--' + x.lastYear : 'undated'}\\\\\n`;
out += `\\bottomrule\\end{tabular}\\end{table}\n\n`;

// 9. Streak: rows dated per year
out += `% streak\n\\begin{table}[htbp]\\centering\\footnotesize\n\\caption{Days on which the six ledgers record a transaction, and rows dated, by year: ${s.rowsDated} rows resolve to ${s.distinctDays} calendar days between ${s.span[0]} and ${s.span[1]}.}\\label{tab:streak}\n\\begin{tabular}{lrr@{\\hspace{2em}}lrr@{\\hspace{2em}}lrr}\\toprule Year & Days & Rows & Year & Days & Rows & Year & Days & Rows\\\\\\midrule\n`;
const ys = s.years; const n = Math.ceil(ys.length / 3);
for (let i = 0; i < n; i++) { const row = [0, 1, 2].map(k => ys[i + k * n]).map(y => y ? `${y[0]} & ${y[1]} & ${y[2]}` : ' & & '); out += row.join(' & ') + '\\\\\n'; }
out += `\\bottomrule\\end{tabular}\\end{table}\n\n`;

writeFileSync('/private/tmp/claude-501/-Users-michel-Commutator-hopper-project/66694244-1a45-46b1-b049-fa0dfbd64294/scratchpad/book/tables.tex', out);
console.log('written', out.length);
console.log('dow', s.dow, 'mon', s.mon, 'longestRun', s.longestRun);
