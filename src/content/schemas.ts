import type { ErModel } from '../components/ERDiagram.tsx';

/**
 * The six volumes as five relational schemas, drawn.
 *
 * Every entity, attribute and cardinality below was read off transcribed
 * leaves, and the `note` on an attribute quotes the leaf that establishes it.
 * That is the whole discipline of the file: an ER diagram is a claim about
 * what the records contain, it looks authoritative in exactly the way a table
 * of figures does, and one invented attribute would be indistinguishable from
 * a read one six months from now. Where a volume implies a table it never
 * rules, the box is dashed; where a join exists in fact but nothing enforces
 * it, the line is dashed. Those are the two things the books actually leave
 * implicit, and hiding either would flatter the schema.
 *
 * The vocabulary is ours and applied afterwards. She was keeping accounts.
 */

export interface FormField {
  id: string;
  label: string;
  /** Which column of the leaf this field writes into. */
  col: number;
  placeholder?: string;
  kind?: 'text' | 'select';
  options?: string[];
  /** Roughly how wide, in the form's twelve-column grid. */
  span?: number;
}

/**
 * One kind of line a leaf can carry.
 *
 * Book IV is why this is a list rather than a single row shape: a commission,
 * an item, a bill and a receipt are four different lines in one ruled block,
 * and the difference between the last two is only the colour of the pen.
 */
export interface LineKind {
  id: string;
  label: string;
  ink: 'black' | 'red';
  fields: FormField[];
  /** Words the leaf writes itself, by column — « rec'd by check », « forward ». */
  fixed?: [number, string][];
  hint?: string;
}

export interface LeafForm {
  /** Column headings. An empty string is a column the leaf never headed. */
  columns: string[];
  /** The `ledgertable` column spec this volume's transcriptions use. */
  spec: string;
  /** The header row as the transcriptions write it, `\add{}` and all. */
  headerRow: string;
  /** The block above the table: a work, a dealer, a plate. */
  head?: { id: string; label: string; placeholder?: string; hand: 'edward' | 'jo' }[];
  /**
   * The stationer's red rules — one at the left for the date, two at the right
   * dividing dollars from cents. Book IV alone comes ruled that way, and its
   * four columns are those rules and nothing else.
   */
  rules?: boolean;
  kinds: LineKind[];
  note: string;
}

export interface SchemaDef {
  id: string;
  tab: string;
  volumes: string;
  /** What one record in this volume is. */
  record: string;
  gist: string;
  /** What a person who normalises tables for a living would say about it. */
  normal: string;
  model: ErModel;
  form: LeafForm;
}

const bookI: SchemaDef = {
  id: 'book-i',
  tab: 'Book I',
  volumes: 'Book I — etchings, oils, watercolours',
  record: 'one plate, and every event in its life',
  gist:
    'The plate is the record and the events hang off it: submitted, refused, accepted, sold, ' +
    'reproduced. Edward wrote the two fields at the head — the title and the plate size — and ' +
    'nothing else on the leaf. Everything below them is hers, and it grows downward for as long ' +
    'as the plate goes on having a life, which for Evening Wind is thirty years.',
  normal:
    'Two of its five columns hold more than one value. « Mrs. Sterner - 30% out of 18 » is a ' +
    'buyer and a commission rate in one cell; « 12.60  Jan. 14, 1923 » is an amount and the day ' +
    'the cheque cleared. A parser has to split both, and splitting is where a price goes wrong.',
  model: {
    w: 780,
    h: 310,
    aria:
      'Book I drawn as two tables: a plate, keyed by its title, with none or many events hanging ' +
      'off it. Two of the event table’s columns are drawn again below as dashed boxes, because ' +
      'each holds two values in one cell.',
    entities: [
      {
        id: 'plate',
        title: 'PLATE',
        sub: 'one leaf',
        x: 20,
        y: 70,
        w: 250,
        attrs: [
          { name: 'title', key: 'pk', note: '« Evening Wind »', ink: 'edward' },
          { name: 'plate size', note: '« 7 x 8 3/8" »', ink: 'edward' },
          { name: 'reproduction', note: 'pasted on' },
        ],
      },
      {
        id: 'event',
        title: 'EVENT',
        sub: 'one ruled line',
        x: 400,
        y: 30,
        w: 350,
        attrs: [
          { name: 'date', note: '« Jan. 28, 21 »' },
          { name: 'disposition', note: 'A · R · Inv. · ?' },
          { name: 'exhibition', note: '« Bklyn. Soc. of Etchers »' },
          { name: 'sold to, and terms', note: '« Mrs. Sterner - 30% out of 18 »' },
          { name: 'received', note: '« 12.60  Jan. 14, 1923 »' },
        ],
      },
      {
        id: 'terms',
        title: 'BUYER + TERMS',
        x: 400,
        y: 215,
        w: 165,
        ghost: true,
        attrs: [{ name: 'who bought it' }, { name: 'the dealer’s share' }],
      },
      {
        id: 'receipt',
        title: 'AMOUNT + DAY',
        x: 585,
        y: 215,
        w: 165,
        ghost: true,
        attrs: [{ name: 'what came in' }, { name: 'when it cleared' }],
      },
    ],
    rels: [
      {
        from: 'plate',
        to: 'event',
        fromSide: 'r',
        toSide: 'l',
        fromCard: 'one',
        toCard: 'zero-many',
        label: 'every event in its life',
        labelAt: { x: 336, y: 84 },
      },
      {
        from: 'event',
        to: 'terms',
        fromSide: 'b',
        toSide: 't',
        fromAt: 0.24,
        fromCard: 'one',
        toCard: 'one',
        dashed: true,
      },
      {
        from: 'event',
        to: 'receipt',
        fromSide: 'b',
        toSide: 't',
        fromAt: 0.78,
        fromCard: 'one',
        toCard: 'one',
        dashed: true,
        label: 'one cell, two values',
        labelAt: { x: 600, y: 190 },
      },
    ],
  },
  form: {
    columns: ['Date', 'accepted / Refused', 'Exhibitions', 'Sold to, and terms', 'Received'],
    spec: 'Y{0.11}Y{0.09}Y{0.27}Y{0.22}Y{0.15}',
    headerRow: 'Date & \\add{accepted / Refused} & Exhibitions & Sold to, and terms & Received',
    head: [
      { id: 'title', label: 'Title', placeholder: 'Evening Wind', hand: 'edward' },
      { id: 'size', label: 'Plate size', placeholder: '7 x 8 3/8"', hand: 'edward' },
    ],
    note:
      'The disposition column is the one she wrote in abbreviations, and it is the only closed ' +
      'vocabulary anywhere in the six volumes: A for accepted, R for refused, Inv. for invited, ' +
      'and a bare question mark where the answer never came.',
    kinds: [
      {
        id: 'submitted',
        label: 'Sent to an exhibition',
        ink: 'black',
        hint: 'A plate goes out and comes back judged. Most lines on a Book I leaf are this one.',
        fields: [
          { id: 'date', label: 'Date', col: 0, placeholder: 'Jan. 28, 21', span: 3 },
          {
            id: 'disp',
            label: 'accepted / Refused',
            col: 1,
            kind: 'select',
            options: ['A', 'R', 'Inv.', '?', ''],
            span: 3,
          },
          {
            id: 'ex',
            label: 'Exhibition',
            col: 2,
            placeholder: 'Print Makers Ex., Los Angeles',
            span: 6,
          },
        ],
      },
      {
        id: 'sold',
        label: 'Sold',
        ink: 'black',
        hint: 'The terms and the receipt each go into one cell, exactly as she wrote them.',
        fields: [
          { id: 'date', label: 'Date', col: 0, placeholder: 'Feb. 27, 22', span: 3 },
          {
            id: 'disp',
            label: 'accepted / Refused',
            col: 1,
            kind: 'select',
            options: ['', 'A', 'R', 'Inv.'],
            span: 3,
          },
          { id: 'ex', label: 'Exhibition', col: 2, placeholder: 'Whitney Studio Club', span: 6 },
          {
            id: 'terms',
            label: 'Sold to, and terms',
            col: 3,
            placeholder: 'Mrs. Sterner - 30% out of 18',
            span: 6,
          },
          {
            id: 'recd',
            label: 'Received',
            col: 4,
            placeholder: '12.60  Jan. 14, 1923',
            span: 6,
          },
        ],
      },
      {
        id: 'noted',
        label: 'Noted',
        ink: 'black',
        hint: 'A reproduction, a gift, a prize — written across the exhibitions column.',
        fields: [
          { id: 'date', label: 'Date', col: 0, placeholder: 'June 1924', span: 3 },
          {
            id: 'ex',
            label: 'What happened',
            col: 2,
            placeholder: 'Reprod. in the Arts, article by Virgil Barker',
            span: 9,
          },
        ],
      },
    ],
  },
};

const bookII: SchemaDef = {
  id: 'book-ii',
  tab: 'Books II & III',
  volumes: 'Books II and III — the paintings',
  record: 'one painting, on one opening, with its sale',
  gist:
    'The painting is described before it is sold, and described at a length nothing else in the ' +
    'archive approaches: the light, the water, the pigments by maker. Then four unheaded columns ' +
    'at the foot record who bought it and for how much. Book III is the same shape with the ' +
    'running lists moved to the front, which is a change of access path and not of schema.',
  normal:
    'The description field is a paragraph, and the two hands are a column that was never ruled: ' +
    'the title and the sketch are his, everything under them hers, and only the ink says so. ' +
    'The single date is the join that cannot be made — it dates the sale, and the day the cheque ' +
    'came is simply not recorded.',
  model: {
    w: 780,
    h: 350,
    aria:
      'Books II and III drawn as a work table keyed by title, with at most one sale attached, and ' +
      'a dashed party table below it that this project keeps because the books do not.',
    entities: [
      {
        id: 'work',
        title: 'WORK',
        sub: 'one opening',
        x: 20,
        y: 40,
        w: 300,
        attrs: [
          { name: 'title', key: 'pk', note: '« The Long Leg. »', ink: 'edward' },
          { name: 'record sketch', note: 'in ink, above the prose', ink: 'edward' },
          { name: 'where', note: '« Provincetown in distance »' },
          { name: 'completed', note: '« Nov. 21, ’35 »' },
          { name: 'size', note: '« 20 x 30 1/4 »' },
          { name: 'description', note: 'a paragraph, sometimes two' },
          { name: 'pigments', note: '« Zinc white (Rembrandt…) »' },
        ],
      },
      {
        id: 'sale',
        title: 'SALE',
        sub: 'four unheaded columns',
        x: 440,
        y: 75,
        w: 310,
        attrs: [
          { name: 'buyer', key: 'fk', note: '« Mrs. Geo. H. Davis »' },
          { name: 'price and terms', note: '« 1200 - 1/3 - »' },
          { name: 'net', note: '« 800. »' },
          { name: 'date', note: '« Feb. 9, 1937. »' },
        ],
      },
      {
        id: 'party',
        title: 'PARTY',
        sub: 'ours, not hers',
        x: 440,
        y: 245,
        w: 310,
        ghost: true,
        attrs: [
          { name: 'name as written' },
          { name: 'declared the same as…' },
          { name: 'surname too weak to credit' },
        ],
      },
    ],
    rels: [
      {
        from: 'work',
        to: 'sale',
        fromSide: 'r',
        toSide: 'l',
        fromCard: 'one',
        toCard: 'zero-one',
        label: 'at most one, often none',
        labelAt: { x: 380, y: 112 },
      },
      {
        from: 'sale',
        to: 'party',
        fromSide: 'b',
        toSide: 't',
        fromCard: 'many',
        toCard: 'zero-one',
        dashed: true,
        label: 'resolved outside the book',
        labelAt: { x: 595, y: 221 },
      },
    ],
  },
  form: {
    columns: ['', '', '', ''],
    spec: 'Y{0.40}Y{0.16}Y{0.12}Y{0.16}',
    headerRow: ' & & & ',
    head: [
      { id: 'title', label: 'Title', placeholder: 'The Long Leg.', hand: 'edward' },
      { id: 'where', label: 'Where', placeholder: 'Provincetown in distance.', hand: 'jo' },
      { id: 'done', label: 'Completed', placeholder: 'Nov. 21, ’35', hand: 'jo' },
      { id: 'size', label: 'Size', placeholder: '20 x 30 1/4', hand: 'jo' },
      {
        id: 'desc',
        label: 'Description',
        placeholder: 'Sea dark blue, with long diagonal pattern made by strips of light…',
        hand: 'jo',
      },
      { id: 'pig', label: 'Pigments', placeholder: 'Zinc white (Rembrandt, colors, poppy oil.)', hand: 'jo' },
    ],
    note:
      'The four columns carry no headings on any leaf of either volume. Write the price as she ' +
      'wrote it — « 1200 - 1/3 - » is a price of 1200 with a third to the dealer — and put the ' +
      'arithmetic in the next column only because she did, never because it follows.',
    kinds: [
      {
        id: 'sold',
        label: 'Sold',
        ink: 'black',
        hint: 'One line, at the foot of the opening.',
        fields: [
          {
            id: 'buyer',
            label: 'Buyer',
            col: 0,
            placeholder: 'Mrs. Geo. H. Davis - has 2 grandsons,',
            span: 12,
          },
          { id: 'price', label: 'Price and terms', col: 1, placeholder: '1200 - 1/3 -', span: 4 },
          { id: 'net', label: 'Net', col: 2, placeholder: '800.', span: 4 },
          { id: 'date', label: 'Date', col: 3, placeholder: 'Feb. 9, 1937.', span: 4 },
        ],
      },
    ],
  },
};

const bookIV: SchemaDef = {
  id: 'book-iv',
  tab: 'Book IV',
  volumes: 'Book IV — the illustration commissions',
  record: 'one commission, from the order to the cheque',
  gist:
    'The pocket book tracks a thing through states rather than recording it once, and it is the ' +
    'only volume that does. A commission arrives, its drawings are itemised one line each, a ' +
    'bill is rendered, and a cheque settles it — four kinds of line inside one ruled block, ' +
    'distinguished by position and by the colour of the pen.',
  normal:
    'It has no primary key at all: nothing identifies a commission but where it sits on the leaf. ' +
    'And the settlement is many-to-many — from 1917 a single cheque collects several outstanding ' +
    'bills, sometimes across a leaf turn — with no join table anywhere. What stands in for one is ' +
    'a subtotal in small figures under the second bill, which is the only thing tying the two ends ' +
    'together.',
  model: {
    w: 790,
    h: 355,
    aria:
      'Book IV drawn as four tables — a commission, its items, its bills and the receipts — with a ' +
      'many-to-many relationship between bills and receipts, and a dashed line out to the client’s ' +
      'own filing system, which the order number points into.',
    entities: [
      {
        id: 'entry',
        title: 'COMMISSION',
        sub: 'no key',
        x: 20,
        y: 50,
        w: 250,
        attrs: [
          { name: 'position on the leaf', key: 'pk', note: 'the only key there is' },
          { name: 'date', note: '« Jan 3 »' },
          { name: 'client', note: '« Morse Dry Dock & Repair Co. »' },
          { name: 'order no.', key: 'fk', note: '« Order no. 10963 »' },
        ],
      },
      {
        id: 'item',
        title: 'ITEM',
        sub: 'one line each',
        x: 20,
        y: 230,
        w: 250,
        attrs: [
          { name: 'what was drawn', note: '« 1 two color drawing »' },
          { name: 'for what', note: '« Dry Dock Dial cover Jan. »' },
          { name: 'dollars', note: '« 35 »' },
          { name: 'cents', note: 'usually blank' },
        ],
      },
      {
        id: 'bill',
        title: 'BILL',
        sub: 'black',
        x: 340,
        y: 50,
        w: 200,
        attrs: [
          { name: 'date', note: '« " 4 »' },
          { name: 'amount', note: '« bill rendered »' },
        ],
      },
      {
        id: 'receipt',
        title: 'RECEIPT',
        sub: 'red',
        x: 340,
        y: 230,
        w: 200,
        attrs: [
          { name: 'date', note: '« Feb 7 »', ink: 'red' },
          { name: 'words', note: '« rec’d by check »', ink: 'red' },
          { name: 'amount', note: '« 70 »', ink: 'red' },
        ],
      },
      {
        id: 'client',
        title: 'THE CLIENT’S OWN FILES',
        x: 570,
        y: 0,
        w: 210,
        ghost: true,
        attrs: [{ name: 'order number', key: 'pk' }, { name: 'everything else' }],
      },
    ],
    rels: [
      {
        from: 'entry',
        to: 'item',
        fromSide: 'b',
        toSide: 't',
        fromCard: 'one',
        toCard: 'many',
        label: 'itemised',
        labelAt: { x: 178, y: 196 },
      },
      {
        from: 'entry',
        to: 'bill',
        fromSide: 'r',
        toSide: 'l',
        fromAt: 0.62,
        fromCard: 'one',
        toCard: 'zero-many',
        label: 'billed',
        labelAt: { x: 305, y: 108 },
      },
      {
        from: 'bill',
        to: 'receipt',
        fromSide: 'b',
        toSide: 't',
        fromCard: 'many',
        toCard: 'many',
        label: 'one cheque, several bills',
        labelAt: { x: 440, y: 178 },
      },
      {
        from: 'entry',
        to: 'client',
        fromSide: 't',
        toSide: 'l',
        fromAt: 0.5,
        fromCard: 'many',
        toCard: 'zero-one',
        dashed: true,
        label: 'a system she did not hold',
        labelAt: { x: 380, y: 30 },
      },
    ],
  },
  form: {
    columns: ['', '', '', ''],
    spec: 'lY{0.50}rr',
    headerRow: ' & & & ',
    rules: true,
    note:
      'Four columns, and not one of them was ever given a heading in fifty-four years: the red ' +
      'rules are the stationer’s. Switch to a receipt and the line turns red — that is the ' +
      'status field, and it is a second pen.',
    kinds: [
      {
        id: 'commission',
        label: 'Commission',
        ink: 'black',
        hint: 'The client and the day the work was ordered. The obligation now exists.',
        fields: [
          { id: 'date', label: 'Date', col: 0, placeholder: 'Jan 3', span: 4 },
          {
            id: 'client',
            label: 'Client',
            col: 1,
            placeholder: 'Morse Dry Dock & Repair Co.',
            span: 8,
          },
        ],
      },
      {
        id: 'item',
        label: 'Item',
        ink: 'black',
        hint: 'One drawing, one line, price at the right. Add as many as the commission ran to.',
        fields: [
          {
            id: 'what',
            label: 'What was drawn',
            col: 1,
            placeholder: '1 two color drawing',
            span: 12,
          },
          { id: 'dollars', label: 'Dollars', col: 2, placeholder: '35', span: 6 },
          { id: 'cents', label: 'Cents', col: 3, placeholder: '', span: 6 },
        ],
      },
      {
        id: 'bill',
        label: 'Bill rendered',
        ink: 'black',
        hint: 'Still black: a claim exists, and nothing has been paid.',
        fixed: [[1, 'bill rendered']],
        fields: [
          { id: 'date', label: 'Date', col: 0, placeholder: '" 4', span: 4 },
          { id: 'dollars', label: 'Dollars', col: 2, placeholder: '35', span: 4 },
          { id: 'cents', label: 'Cents', col: 3, placeholder: '', span: 4 },
        ],
      },
      {
        id: 'receipt',
        label: 'Received',
        ink: 'red',
        hint: 'In red — date, words and figure. One cheque may settle several bills at once.',
        fixed: [[1, 'rec’d by check']],
        fields: [
          { id: 'date', label: 'Date', col: 0, placeholder: 'Feb 7', span: 4 },
          { id: 'dollars', label: 'Dollars', col: 2, placeholder: '70', span: 4 },
          { id: 'cents', label: 'Cents', col: 3, placeholder: '', span: 4 },
        ],
      },
      {
        id: 'forward',
        label: 'Forward',
        ink: 'red',
        hint: 'One word, in red, marking a bill carried on to be collected with the next.',
        fixed: [[1, 'forward']],
        fields: [],
      },
    ],
  },
};

const bookV: SchemaDef = {
  id: 'book-v',
  tab: 'Book V',
  volumes: 'Book V — the drawings',
  record: 'one drawing, one loan, one receipt',
  gist:
    'The smallest of the six and the latest. A drawing gets a title, a size and a sketch; what ' +
    'happens to it is a loan to a travelling show or a sale. Two leaves at the front are ' +
    'thumb-cut A to Z for an index.',
  normal:
    'The index is the interesting field, because it is empty. She had the volume tabbed A to Z ' +
    'and wrote against not one letter, using the leaf as a table of contents instead — an access ' +
    'path declared, built into the paper, and never populated.',
  model: {
    w: 790,
    h: 305,
    aria:
      'Book V drawn as a drawing table with loans and sales hanging off it, and a thumb index ' +
      'joined to it by a dashed line because no letter of the index was ever written against.',
    entities: [
      {
        id: 'index',
        title: 'THUMB INDEX',
        sub: 'two leaves',
        x: 20,
        y: 115,
        w: 210,
        ghost: true,
        attrs: [
          { name: 'letter', key: 'pk', note: 'A–Z, cut into the edge' },
          { name: 'what is written there', note: 'nothing' },
        ],
      },
      {
        id: 'drawing',
        title: 'DRAWING',
        sub: 'one leaf',
        x: 300,
        y: 100,
        w: 240,
        attrs: [
          { name: 'title', key: 'pk', note: '« Houses on Skyline »', ink: 'edward' },
          { name: 'size', note: '« 12 x 18 »', ink: 'edward' },
          { name: 'record sketch', ink: 'edward' },
          { name: 'subject', note: '« Shacks »' },
        ],
      },
      {
        id: 'loan',
        title: 'LOAN',
        x: 590,
        y: 20,
        w: 190,
        attrs: [
          { name: 'to whom' },
          { name: 'exhibition' },
          { name: 'when' },
          { name: 'returned to studio' },
        ],
      },
      {
        id: 'salev',
        title: 'SALE',
        x: 590,
        y: 190,
        w: 190,
        attrs: [{ name: 'buyer', key: 'fk' }, { name: 'price' }, { name: 'date' }],
      },
    ],
    rels: [
      {
        from: 'index',
        to: 'drawing',
        fromSide: 'r',
        toSide: 'l',
        fromCard: 'zero-one',
        toCard: 'zero-many',
        dashed: true,
        label: 'never filled in',
        labelAt: { x: 266, y: 145 },
      },
      {
        from: 'drawing',
        to: 'loan',
        fromSide: 'r',
        toSide: 'l',
        fromAt: 0.28,
        fromCard: 'one',
        toCard: 'zero-many',
      },
      {
        from: 'drawing',
        to: 'salev',
        fromSide: 'r',
        toSide: 'l',
        fromAt: 0.8,
        fromCard: 'one',
        toCard: 'zero-one',
      },
    ],
  },
  form: {
    columns: ['Title', 'Buyer', 'Price', 'Date'],
    spec: 'Y{0.26}Y{0.30}Y{0.18}Y{0.14}',
    headerRow: '\\add{Title} & \\add{Buyer} & \\add{Price} & \\add{Date}',
    head: [
      { id: 'title', label: 'Title', placeholder: 'Houses on Skyline', hand: 'edward' },
      { id: 'size', label: 'Size', placeholder: '12 x 18', hand: 'edward' },
    ],
    note:
      'None of these four headings is written on the leaf. The transcriptions supply them in ' +
      '\\add{}, which is the apparatus saying out loud that the words are the editor’s and not ' +
      'the book’s.',
    kinds: [
      {
        id: 'sold',
        label: 'Sold',
        ink: 'black',
        fields: [
          { id: 'title', label: 'Title', col: 0, placeholder: 'Femme Endormie', span: 6 },
          { id: 'buyer', label: 'Buyer', col: 1, placeholder: 'Rehn Gal.', span: 6 },
          { id: 'price', label: 'Price', col: 2, placeholder: '150', span: 6 },
          { id: 'date', label: 'Date', col: 3, placeholder: 'July 8, 1957', span: 6 },
        ],
      },
      {
        id: 'lent',
        label: 'Lent',
        ink: 'black',
        hint: 'A loan writes where it went in the buyer’s column and leaves the price blank.',
        fields: [
          { id: 'title', label: 'Title', col: 0, placeholder: 'Femme Endormie in sanguine', span: 6 },
          {
            id: 'buyer',
            label: 'To whom',
            col: 1,
            placeholder: 'Boston Public Library — to travel in Europe',
            span: 6,
          },
          { id: 'date', label: 'When', col: 3, placeholder: 'Sept-Oct. 1956', span: 12 },
        ],
      },
    ],
  },
};

const dealers: SchemaDef = {
  id: 'dealers',
  tab: 'Dealers / Etchings',
  volumes: 'Dealers / Etchings — the second index',
  record: 'one dealer, and the prints that passed through them',
  gist:
    'Nothing in this volume is new. The prints Book I records plate by plate appear again ' +
    'arranged by whose hands they passed through — Keppel, Kraushaar, Kennedy, the Downtown ' +
    'Gallery, the Weyhe Book Shop — one dealer to a leaf, impressions running down it.',
  normal:
    'A secondary index over data held elsewhere, and the join back to Book I is by title alone. ' +
    'There is no key shared between the volumes and no constraint of any kind: « Kepple » on one ' +
    'leaf and « Keppel » on the next are the same man only because a reader says so.',
  model: {
    w: 800,
    h: 205,
    aria:
      'Dealers slash Etchings drawn as a dealer table with many consignments, joined back to Book ' +
      'I’s plate table by a dashed line, because the join is by title alone and nothing enforces it.',
    entities: [
      {
        id: 'dealer',
        title: 'DEALER',
        sub: 'one leaf each',
        x: 20,
        y: 80,
        w: 230,
        attrs: [
          { name: 'name', key: 'pk', note: '« Kepple » · « Keppel »' },
          { name: 'leaf', note: 'numbered from 51' },
        ],
      },
      {
        id: 'consign',
        title: 'CONSIGNMENT',
        x: 320,
        y: 40,
        w: 250,
        attrs: [
          { name: 'delivered', note: '« June 10, 22. »' },
          { name: 'price', note: '« $25 »' },
          { name: 'title', key: 'fk', note: '« Evening Wind »' },
          { name: 'sold, amt.', note: '« Jan. 3, 24  9. »' },
          { name: 'returned', note: '« Ret. Feb. 1926. »' },
        ],
      },
      {
        id: 'plateI',
        title: 'PLATE',
        sub: 'in Book I',
        x: 640,
        y: 80,
        w: 150,
        ghost: true,
        attrs: [{ name: 'title', key: 'pk' }, { name: 'its own events' }],
      },
    ],
    rels: [
      {
        from: 'dealer',
        to: 'consign',
        fromSide: 'r',
        toSide: 'l',
        fromCard: 'one',
        toCard: 'many',
      },
      {
        from: 'consign',
        to: 'plateI',
        fromSide: 'r',
        toSide: 'l',
        fromCard: 'many',
        toCard: 'zero-one',
        dashed: true,
        label: 'by title alone',
        labelAt: { x: 605, y: 84 },
      },
    ],
  },
  form: {
    columns: ['', '', '', 'Sold  Amt.', 'Returned'],
    spec: 'Y{0.18}Y{0.09}Y{0.30}Y{0.16}Y{0.12}',
    headerRow: ' & & & Sold \\quad Amt. & Returned',
    head: [{ id: 'dealer', label: 'Dealer', placeholder: 'Kepple', hand: 'jo' }],
    note:
      '« Sold  Amt.  Returned » is the only heading written on the leaf: the date, the price and ' +
      'the title stand in unheaded columns, and the transcriptions leave them so. The volume’s ' +
      'leaves are numbered from 51, because the book was begun in the middle of one already ' +
      'partly used.',
    kinds: [
      {
        id: 'out',
        label: 'Delivered',
        ink: 'black',
        hint: 'A print goes to the dealer at a price. The two right-hand columns stay empty until it moves.',
        fields: [
          { id: 'date', label: 'Delivered', col: 0, placeholder: 'June 10, 22.', span: 4 },
          { id: 'price', label: 'Price', col: 1, placeholder: '$25', span: 3 },
          { id: 'title', label: 'Title', col: 2, placeholder: 'Evening Wind', span: 5 },
        ],
      },
      {
        id: 'soldd',
        label: 'Sold',
        ink: 'black',
        hint: 'The date and the amount go into one cell together, as she wrote them.',
        fields: [
          { id: 'price', label: 'Price', col: 1, placeholder: '25', span: 3 },
          { id: 'title', label: 'Title', col: 2, placeholder: 'Night in the Park', span: 5 },
          { id: 'amt', label: 'Sold  Amt.', col: 3, placeholder: 'Jan. 3, 24  9.', span: 4 },
        ],
      },
      {
        id: 'back',
        label: 'Returned',
        ink: 'black',
        hint: 'Unsold, and back in the studio. The column alternates « Returned » and « Ret. ».',
        fields: [
          { id: 'price', label: 'Price', col: 1, placeholder: '25', span: 3 },
          { id: 'title', label: 'Title', col: 2, placeholder: 'Night Shadows', span: 5 },
          { id: 'ret', label: 'Returned', col: 4, placeholder: 'Ret. Feb. 1926.', span: 4 },
        ],
      },
    ],
  },
};

export const SCHEMAS: SchemaDef[] = [bookI, bookII, bookIV, bookV, dealers];

/**
 * This project's own schema, which is the one place a real foreign key is
 * enforced — and it is enforced at write time, by a build that refuses to
 * finish rather than by hope.
 */
export const ARCHIVE_MODEL: ErModel = {
  w: 850,
  h: 290,
  aria:
    'The archive’s own three tables: a ledger with many sheets, and a transcription covering ' +
    'twelve of them, joined by the sheet macro that names a resource and a leaf together.',
  entities: [
    {
      id: 'ledger',
      title: 'LEDGER',
      sub: 'six of them',
      x: 20,
      y: 65,
      w: 215,
      attrs: [
        { name: 'id', key: 'pk', note: '« book-iv »' },
        { name: 'accession', note: '« 96.211 »' },
        { name: 'the Whitney’s dating' },
        { name: 'sheets' },
      ],
    },
    {
      id: 'sheet',
      title: 'SHEET',
      sub: 'one photograph',
      x: 300,
      y: 30,
      w: 265,
      attrs: [
        { name: 'ref', key: 'pk', note: 'opaque, and stable' },
        { name: 'ledger', key: 'fk' },
        { name: 'seq', note: 'the order photographed' },
        { name: 'leaf', note: 'written on the paper — or null' },
        { name: 'kind', note: 'cover · leaf · verso · inserted' },
        { name: 'descriptor', note: 'the Whitney’s, verbatim' },
      ],
    },
    {
      id: 'tx',
      title: 'TRANSCRIPTION',
      sub: 'a batch',
      x: 655,
      y: 65,
      w: 180,
      attrs: [
        { name: 'ledger # batch', key: 'pk' },
        { name: 'the sheets read' },
        { name: 'the apparatus' },
        { name: 'keywords' },
      ],
    },
  ],
  rels: [
    {
      from: 'ledger',
      to: 'sheet',
      fromSide: 'r',
      toSide: 'l',
      fromCard: 'one',
      toCard: 'many',
    },
    {
      from: 'sheet',
      to: 'tx',
      fromSide: 'r',
      toSide: 'l',
      fromCard: 'many',
      toCard: 'zero-one',
      label: '\\sheet{ref}{leaf}',
      labelAt: { x: 610, y: 92 },
    },
  ],
};
