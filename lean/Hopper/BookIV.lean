/-!
# Book IV's reader, as a semantics

`scripts/accounts.mjs` reads Book IV in four passes, and `docs/book-iv-method.md`
states their rules in prose. This file states them as functions.

**What is taken as given.** A row arrives with its cells already read: the
figure in the money columns, the year a date cell or description states, the
ink, whether the figure is struck or doubtful, whether a rule is drawn above
it, and which of the reader's word patterns the description matches — « rec'd
by check », « bill », « less », « from preceding page », a ditto, « total ».
Recognising those words is reading, and stays with the regular expressions in
JavaScript. Everything that is then *decided* about the row — what kind of line
it is, which year it belongs to, whether it is a charge, a receipt, a subtotal,
a deduction, a net restated, a sum carried, a draft, or one instalment of a
picture — is decided here.

**The passes.**

* `readRows` — the year carried, the settlement phrase a figure inherits, the
  title a bare price takes, the « Expenses » block, the ink before the words.
* `dropRubbed` — a doubtful figure the row below repeats plainly is its draft.
* `disposeRows` — the disposition of every figure, in order, with what has
  been itemised since the last settlement.
* `collapseInstalments` — a picture charged more than once, paid in parts, is
  charged once at its largest figure.
-/

namespace Hopper.BookIV

inductive Kind
  | receipt | bill | deduction | carry | item | bare | pencil
  deriving DecidableEq, Repr

/-- What the reader makes of a row. -/
inductive Disp
  /-- A year on a line of its own. -/
  | yearLine
  /-- A figure wholly struck out: never a charge, never a receipt. -/
  | struck
  /-- No figure: a client's line, a title, a heading. -/
  | text
  /-- A doubtful figure the row below repeats plainly: the draft of that row. -/
  | rubbedDraft
  /-- A figure standing after a gap in the transcribed batches, with no year to carry to it. -/
  | unread
  /-- A figure in pencil: a sum, never a charge. -/
  | pencilSum
  | receipt
  /-- A receipt written on the net's row and written again below: the net. -/
  | rubbedReceipt
  /-- A « less » line, whichever of the deduction or the net it names. -/
  | deduction
  /-- « from preceding page »: a page total carried to the head of a leaf. -/
  | carriedForward
  /-- What a deduction leaves, restated before the cheque. -/
  | netRestated
  /-- A figure ruled off under the lines it sums. -/
  | subtotal
  /-- A sum at the foot of a leaf or a year, with nothing unsettled above it. -/
  | carriedSum
  /-- A bill after itemised charges: it restates them. -/
  | billRestating
  /-- A figure repeated under the charge it answers, with no word of its own. -/
  | wordlessReceipt
  | chargeItem
  /-- An itemised charge whose description column is blank. -/
  | chargeBare
  /-- A bill with nothing itemised since the last settlement: the charge itself. -/
  | chargeBill
  /-- A charge collapsed into the same picture's charge at its price. -/
  | instalment
  deriving DecidableEq, Repr

def Disp.isCharge : Disp → Bool
  | .chargeItem | .chargeBare | .chargeBill => true
  | _ => false

/-! ## The row as it arrives -/

/-- A row of Book IV with its cells read and its words recognised. -/
structure Loose where
  idx : Nat
  batch : Nat
  ref : Nat
  /-- The year a pencil marginal writes for this sheet, if one does. -/
  pencil : Option Int
  /-- The figure in the money columns, in cents, where there is one to read. -/
  read : Option Int
  dateYear : Option Int
  bodyYear : Option Int
  working : Bool
  money : Bool
  struck : Bool
  rubbed : Bool
  ruled : Bool
  inkRed : Bool
  inkPencil : Bool
  dateEmpty : Bool
  bodyEmpty : Bool
  bodyDashes : Bool
  bodyIsYear : Bool
  wReceipt : Bool
  wDittoTailed : Bool
  wBill : Bool
  wDeduction : Bool
  wPaidOnAcct : Bool
  wCarry : Bool
  wDitto : Bool
  wDittoHeadedOrAnd : Bool
  wLetters : Bool
  wExpenses : Bool
  wRestated : Bool
  wNetCheck : Bool
  wYearTotal : Bool
  wTotalOnly : Bool
  /-- For a charge: its picture's title reduced to a key, and whether its entry
  says it is an instalment or deducts a payment on account. -/
  entryKey : Option Nat
  entryInst : Bool
  entryPay : Bool
  deriving Repr

/-- The words of the description as the later passes test them: the row's own,
or — where a bare price took the title above it — the title's with its own
appended. -/
structure Body where
  empty : Bool
  restated : Bool
  paidOnAcct : Bool
  netCheck : Bool
  yearTotal : Bool
  deriving DecidableEq, Repr

structure Pushed where
  loose : Loose
  amount : Option Int
  kind : Kind
  year : Option Int
  titled : Bool
  body : Body
  deriving Repr

def Pushed.ref (p : Pushed) : Nat := p.loose.ref

/-! ## Pass 1: reading the rows -/

structure AState where
  year : Option Int
  prevBatch : Option Nat
  sheet : Option Nat
  sheetPencil : Option Int
  openPhrase : Option Kind
  deductedSinceReceipt : Bool
  expensing : Bool
  /-- The rows kept so far, the last one first. -/
  pushed : List Pushed
  /-- What was decided about each loose row, the last one first. -/
  dropped : List (Nat × Disp)

def AState.init : AState := ⟨none, none, none, none, none, false, false, [], []⟩

/-- Leaving a sheet: a year written in pencil on it takes effect as its rows run out. -/
def closeSheet (s : AState) : AState :=
  match s.sheet, s.sheetPencil with
  | some _, some y => { s with year := some y }
  | _, _ => s

/-- Entering a batch. The year carries across the boundary only where the
batches abut; everything else about a settlement starts again. -/
def enterBatch (s : AState) (b : Nat) : AState :=
  if s.prevBatch == some b then s
  else
    let s := closeSheet s
    let year := match s.prevBatch with
      | some p => if b == p + 1 then s.year else none
      | none => s.year
    { s with year := year, prevBatch := some b, sheet := none, sheetPencil := none,
             openPhrase := none, deductedSinceReceipt := false, expensing := false }

def enterSheet (s : AState) (l : Loose) : AState :=
  if s.sheet == some l.ref then s
  else { closeSheet s with sheet := some l.ref, sheetPencil := l.pencil, expensing := false }

/-- The title a bare price takes: the nearest line above it on the sheet, back to
the last bill or cheque, that is an unpriced item — provided nothing above it
there has a figure. -/
def findTitle (ref : Nat) : List Pushed → Option Pushed → Option Pushed
  | [], title => title
  | p :: ps, title =>
    if p.ref != ref || p.kind == .receipt || p.kind == .bill then title
    else if p.amount.isSome then none
    else if title.isNone && !(p.kind == .bare && !p.loose.money) then
      if p.kind != .item || p.loose.money then none else findTitle ref ps (some p)
    else findTitle ref ps title

/-- What kind of line the words make a row, before the ink and the phrase it may
inherit are considered. -/
def ownKind (s : AState) (l : Loose) : Kind :=
  let previous := s.pushed.head?
  let prevKind := previous.map (·.kind)
  let sameSheet := previous.any (·.ref == l.ref)
  if l.wReceipt || (l.wDittoTailed && prevKind == some .receipt && sameSheet) then .receipt
  else if l.wBill then .bill
  else if l.wDeduction || (l.wPaidOnAcct && s.deductedSinceReceipt) then .deduction
  else if l.wCarry then .carry
  else if l.wDitto && previous.isSome then (previous.map (·.kind)).getD .bare
  else if prevKind == some .deduction && sameSheet && l.wDittoHeadedOrAnd then .deduction
  else if l.wLetters then .item
  else .bare

def bodyOf (l : Loose) (title : Option Pushed) : Body :=
  match title with
  | some t =>
    ⟨false, t.loose.wRestated, t.loose.wPaidOnAcct, t.loose.wNetCheck && l.bodyDashes,
      (t.loose.wYearTotal && l.bodyEmpty) || (t.loose.wTotalOnly && l.bodyIsYear)⟩
  | none => ⟨l.bodyEmpty, l.wRestated, l.wPaidOnAcct, l.wNetCheck, l.wYearTotal⟩

/-- What the words, the phrase still open above, the title a bare price takes,
the « Expenses » block and the ink make of a row. -/
structure Classified where
  own : Kind
  title : Option Pushed
  expensing : Bool
  deducted : Bool
  kind : Kind
  openPhrase : Option Kind

def classify (s : AState) (l : Loose) (amount : Option Int) (later : Bool) : Classified :=
  let own := ownKind s l
  let title :=
    if own == .bare && amount.isSome && s.openPhrase.isNone && later
    then findTitle l.ref s.pushed none else none
  let expensing :=
    if (l.wExpenses || own == .deduction) && amount.isNone then true
    else if own == .receipt then false else s.expensing
  let deducted :=
    if own == .receipt then false else if own == .deduction then true
    else s.deductedSinceReceipt
  let restates := l.wNetCheck || l.wRestated
  let byWords :=
    if expensing && amount.isSome && !restates && (own == .item || title.isSome) then Kind.deduction
    else if amount.isSome && (own == .item || own == .bare) && s.openPhrase.isSome then
      s.openPhrase.getD own
    else if title.isSome then .item else own
  -- The ink, where the leaf records it. Red says « received » whatever stands
  -- beside it, and from leaf 157 nothing does. Pencil says « a sum » only of a
  -- bare figure or one the writer ruled off: a whole entry can be written in
  -- pencil — leaf 89's last is — and its charge is a charge for all that the
  -- medium changed.
  let byInk : Option Kind :=
    if amount.isNone then none
    else if l.inkRed then some .receipt
    else if l.inkPencil && (own == .bare || l.ruled) then some .pencil else none
  let contradicts :=
    (byInk == some .receipt && (own == .bill || own == .deduction)) ||
    (byInk == some .pencil && own == .receipt)
  let kind := if byInk.isSome && !contradicts then byInk.getD byWords else byWords
  let openPhrase :=
    if amount.isSome then none
    else if own == .item || own == .bare then s.openPhrase else some own
  ⟨own, title, expensing, deducted, kind, openPhrase⟩

/-- One loose row. `later` says whether a later row of the same batch and sheet
has a figure to read. -/
def readRow (s : AState) (l : Loose) (later : Bool) : AState :=
  let s := enterSheet (enterBatch s l.batch) l
  let amount := if l.working then none else l.read
  if amount.isSome && l.struck then { s with dropped := (l.idx, .struck) :: s.dropped }
  else
    let stated := match l.dateYear with
      | some y => some y
      | none => if l.dateEmpty && amount.isNone then l.bodyYear else none
    let s := match stated with
      | some y => { s with year := some y }
      | none => s
    if stated.isSome && (l.bodyYear.isSome || (l.bodyEmpty && amount.isNone)) then
      { s with dropped := (l.idx, .yearLine) :: s.dropped }
    else
      let c := classify s l amount later
      let row : Pushed := ⟨l, amount, c.kind, s.year, c.title.isSome, bodyOf l c.title⟩
      { s with openPhrase := c.openPhrase, deductedSinceReceipt := c.deducted,
               expensing := c.expensing, pushed := row :: s.pushed }

/-- For each row, whether a later row of the same batch and sheet has a figure to
read — read from the end, keeping the sheets seen to carry one. `rev` is the rows
last first; the result comes out in the original order. Written as a loop that
takes its accumulator apart at every row, so that the kernel evaluates as it
goes rather than building the whole computation first. -/
def laterLoop : List Loose → List (Nat × Nat) → List Bool → List Bool
  | [], _, out => out
  | l :: rev, seen, out =>
    match seen.contains (l.batch, l.ref) with
    | true => laterLoop rev seen (true :: out)
    | false =>
      if l.read.isSome then laterLoop rev ((l.batch, l.ref) :: seen) (false :: out)
      else laterLoop rev seen (false :: out)

def laterFlags (ls : List Loose) : List Bool := laterLoop ls.reverse [] []

/-- The same state, with every scalar field evaluated. The kernel evaluates
lazily: a field carried forward unchanged is a reference to the previous row's
state, and after three thousand rows it is three thousand references deep.
Comparing each field with itself makes the kernel evaluate it now, while the
reference is one row long. It changes nothing about the value. -/
def AState.force (s : AState) : AState :=
  if s.year == s.year && s.prevBatch == s.prevBatch && s.sheet == s.sheet &&
      s.sheetPencil == s.sheetPencil && s.openPhrase == s.openPhrase &&
      s.deductedSinceReceipt == s.deductedSinceReceipt && s.expensing == s.expensing &&
      s.pushed.head?.isSome == s.pushed.head?.isSome && s.dropped.head?.isSome == s.dropped.head?.isSome
  then s else s

theorem AState.force_eq (s : AState) : s.force = s := by
  unfold AState.force; split <;> rfl

/-- Reading every row in order. -/
def readLoop : AState → List Loose → List Bool → AState
  | s, l :: ls, f :: fs =>
    match (readRow s l f).force with
    | ⟨a, b, c, d, e, g, h, i, j⟩ => readLoop ⟨a, b, c, d, e, g, h, i, j⟩ ls fs
  | s, _, _ => s

def readRows (ls : List Loose) : AState :=
  closeSheet (readLoop AState.init ls (laterFlags ls))

/-! ## Pass 2: the rubbed-out drafts -/

def Pushed.rubbed (p : Pushed) : Bool := p.amount.isSome && p.loose.rubbed

/-- Whether a doubtful row is the draft of the row after it: the row after it is
plain, on the same sheet, and carries the same figure. -/
def draftOf (r n : Pushed) : Bool :=
  r.rubbed && !n.rubbed && n.ref == r.ref && n.amount.isSome && n.amount == r.amount

/-- Settle the doubtful rows waiting (nearest first) against the row that has
come after them: each is dropped while it is the draft of the row now after it;
the first that is not stays, and so does every one before it, since each of
those is now followed by a doubtful row. Returns the rows kept, in order, and
the rows dropped. -/
def settle (n : Pushed) : List Pushed → List Pushed × List Nat
  | [] => ([], [])
  | r :: rs =>
    if draftOf r n then
      match settle n rs with
      | (kept, gone) => (kept, r.loose.idx :: gone)
    else ((r :: rs).reverse, [])

/-- The rows in order, with a doubtful figure dropped where the row after it on
the same sheet repeats it plainly — read from the front, holding the doubtful
rows until the row after them arrives. -/
def dropLoop : List Pushed → List Pushed → List Pushed → List Nat → List Pushed × List Nat
  | [], waiting, kept, gone => (kept.reverseAux waiting.reverse, gone.reverse)
  | r :: rs, waiting, kept, gone =>
    if r.rubbed then dropLoop rs (r :: waiting) kept gone
    else
      match settle r waiting with
      | (stay, dropped) =>
        dropLoop rs [] (r :: (stay.reverse ++ kept)) (dropped ++ gone)

def dropRubbed (rows : List Pushed) : List Pushed × List Nat := dropLoop rows [] [] []

/-! ## Pass 3: the dispositions -/

structure CState where
  /-- Charges itemised since the last bill or cheque closed a run. -/
  since : Nat
  /-- A « less » line is working a subtotal down to a cheque. -/
  deducting : Bool
  /-- The net that deduction leaves has been written. -/
  netRestated : Bool
  deriving DecidableEq, Repr

/-- Whether `target` is the sum of a leading run (of at least `least` priced
lines) of the items directly above, read upwards. -/
def sumsRun (target : Int) (least : Nat) : List Pushed → Int → Nat → Bool
  | [], _, _ => false
  | p :: ps, acc, lines =>
    if p.kind != .item then false
    else match p.amount with
      | none => sumsRun target least ps acc lines
      | some a =>
        if lines + 1 ≥ least && acc + a == target then true
        else sumsRun target least ps (acc + a) (lines + 1)

def firstFigure : List Pushed → Option Pushed
  | [] => none
  | p :: ps => if p.amount.isSome then some p else firstFigure ps

/-- The rule for a bare figure ruled off under what it sums. -/
def subtotalTest (r : Pushed) (before : List Pushed) (next : Option Pushed) (a : Int) : Bool :=
  let answer := next.map (·.kind)
  let repeatedByCheque := answer == some .receipt && (next.bind (·.amount)) == some a
  let underPricedItem := before.head?.any fun p => p.kind == .item && p.amount.isSome
  r.kind == .bare &&
    (r.loose.ruled || answer == some .bill || answer == some .deduction ||
      answer == some .carry ||
      (answer == some .receipt && sumsRun a 1 before 0 0) ||
      (r.body.empty && repeatedByCheque && underPricedItem) ||
      (r.body.empty && answer == some .item && sumsRun a 2 before 0 0))

/-- Which of the reader's rules a row falls under. -/
inductive Rule
  | noFigure | noYear | pencil | rubbedReceipt | receipt | deduction | carryForward
  | netUnderDeduction | paymentOnAccount | netCheck
  | subtotal | carriedSum | billRestating | wordlessReceipt | chargeBill | chargeBare | chargeItem
  deriving DecidableEq, Repr

def Rule.disp : Rule → Disp
  | .noFigure => .text
  | .noYear => .unread
  | .pencil => .pencilSum
  | .rubbedReceipt => .rubbedReceipt
  | .receipt => .receipt
  | .deduction | .paymentOnAccount => .deduction
  | .carryForward => .carriedForward
  | .netUnderDeduction | .netCheck => .netRestated
  | .subtotal => .subtotal
  | .carriedSum => .carriedSum
  | .billRestating => .billRestating
  | .wordlessReceipt => .wordlessReceipt
  | .chargeBill => .chargeBill
  | .chargeBare => .chargeBare
  | .chargeItem => .chargeItem

/-- What each rule does to the state: a cheque or a bill closes a run, a charge
adds to it, a « less » line opens a deduction, a net restated is noted, and a
figure that is none of those ends the deduction. -/
def Rule.next (s : CState) : Rule → CState
  | .noFigure | .noYear | .pencil | .carryForward | .paymentOnAccount => s
  | .rubbedReceipt | .netUnderDeduction | .netCheck => { s with netRestated := true }
  | .receipt => { s with since := 0, deducting := false }
  | .deduction => { s with deducting := true, netRestated := false }
  | .subtotal | .carriedSum => { s with deducting := false }
  | .billRestating | .wordlessReceipt | .chargeBill => { s with since := 0, deducting := false }
  | .chargeBare | .chargeItem => { s with since := s.since + 1, deducting := false }

/-- A receipt written on the net's row: under a deduction whose net is not yet
written, with the same figure repeated as a receipt on the next row of the sheet. -/
def rubbedTest (s : CState) (r : Pushed) (next : Option Pushed) (a : Int) : Bool :=
  s.deducting && !s.netRestated &&
    (next.any fun n => n.kind == .receipt && n.ref == r.ref && n.amount == some a)

/-- A sum carried at the foot of a leaf or a year: an empty bare figure or a
« total », with nothing itemised since the last settlement and no bill or cheque
answering it on the same sheet. -/
def carriedTest (s : CState) (r : Pushed) (next : Option Pushed) : Bool :=
  let answersHere := next.bind fun n => if n.ref == r.ref then some n.kind else none
  (if r.kind == .bare then r.body.empty else r.body.yearTotal) && s.since == 0 &&
    answersHere != some .bill && answersHere != some .receipt

/-- The red receipt with its words gone: a bare, undated, undescribed figure
repeating to the cent the priced line above it on the same sheet. -/
def wordlessTest (r : Pushed) (before : List Pushed) (a : Int) : Bool :=
  r.kind == .bare && r.body.empty && r.loose.dateEmpty &&
    ((firstFigure before).any fun p =>
      p.ref == r.ref && (p.kind == .item || p.kind == .bare) && p.amount == some a)

/-- The rules for a figure that is not a pencil sum, a receipt, a deduction, a
page carried forward, or part of a deduction working down to its cheque. -/
def ruleAfterDeduction (s : CState) (before : List Pushed) (r : Pushed) (next : Option Pushed)
    (a : Int) : Rule :=
  if subtotalTest r before next a then .subtotal
  else if carriedTest s r next then .carriedSum
  else if r.kind == .bill && s.since > 0 then .billRestating
  else if wordlessTest r before a then .wordlessReceipt
  else if r.kind == .bill then .chargeBill
  else if r.kind == .bare then .chargeBare
  else .chargeItem

/-- The rule a row falls under. `before` is the rows above it, nearest first. -/
def rule (s : CState) (before : List Pushed) (r : Pushed) (next : Option Pushed) : Rule :=
  match r.amount with
  | none => .noFigure
  | some a =>
    if r.year.isNone then .noYear
    else if r.kind == .pencil then .pencil
    else if r.kind == .receipt then (if rubbedTest s r next a then .rubbedReceipt else .receipt)
    else if r.kind == .deduction then .deduction
    else if r.kind == .carry then .carryForward
    else if s.deducting && ((r.kind == .bare && r.body.empty) || r.body.restated) then
      .netUnderDeduction
    else if s.deducting && r.body.paidOnAcct then .paymentOnAccount
    else if s.deducting && r.body.netCheck then .netCheck
    else ruleAfterDeduction { s with deducting := false } before r next a

/-- One figure's disposition, and the state after it. -/
def dispose (s : CState) (before : List Pushed) (r : Pushed) (next : Option Pushed) :
    CState × Disp :=
  let k := rule s before r next
  (k.next s, k.disp)

/-- As `AState.force`. -/
def CState.force (s : CState) : CState :=
  if s.since == s.since && s.deducting == s.deducting && s.netRestated == s.netRestated
  then s else s

theorem CState.force_eq (s : CState) : s.force = s := by
  unfold CState.force; split <;> rfl

def disposeRows : CState → List Pushed → List Pushed → List (Pushed × Disp)
  | _, _, [] => []
  | s, before, r :: rest =>
    match dispose s before r rest.head? with
    | (s', d) =>
      match s'.force with
      | ⟨a, b, c⟩ => (r, d) :: disposeRows ⟨a, b, c⟩ (r :: before) rest

/-! ## Pass 4: one picture, paid in parts -/

/-- A charge, with the words of its entry as the reader recognises them: the
picture's title reduced to a key, whether the entry says « on account »,
« balance » or « part payment », and whether it deducts a payment on account. -/
structure ChargeRow where
  idx : Nat
  gross : Int
  key : Option Nat
  instWords : Bool
  payWords : Bool
  deriving Repr, DecidableEq

/-- The first charge at the largest figure. -/
def keeper : List ChargeRow → Option ChargeRow
  | [] => none
  | c :: cs => some (cs.foldl (fun a b => if b.gross > a.gross then b else a) c)

/-- The charges collapsed: a title charged more than once is one picture, charged
at its largest figure; another charge of it is collapsed where that entry says
it is an instalment, or the one at the price deducts a payment on account. -/
def collapseInstalments (cs : List ChargeRow) : List Nat :=
  cs.filterMap fun c =>
    match c.key with
    | none => none
    | some k =>
      let group := cs.filter (·.key == some k)
      match keeper group with
      | some keep =>
        if group.length ≥ 2 && c.idx != keep.idx && (c.instWords || keep.payWords)
        then some c.idx else none
      | none => none

/-! ### The same grouping, for the kernel

`collapseInstalments` states the rule: each charge's picture is found by
filtering every charge for its key, which is as clear as it is quadratic. The
kernel checks the transcribed volume with `collapseFast`, which finds a picture's
charges by the bits of its key — the charges split once by each bit, a leaf of
the split holding the charges whose keys agree on every bit — and
`Hopper.BookIVTheorems.collapseFast_eq` proves the two the same for every key
below `2 ^ keyBits`. -/

inductive KeyTrie
  | leaf (cs : List ChargeRow)
  | node (zero one : KeyTrie)

def keyBit (i : Nat) (c : ChargeRow) : Bool := (c.key.getD 0).testBit i

def buildTrie : Nat → Nat → List ChargeRow → KeyTrie
  | 0, _, cs => .leaf cs
  | f + 1, i, cs =>
    .node (buildTrie f (i + 1) (cs.filter fun c => !keyBit i c))
      (buildTrie f (i + 1) (cs.filter fun c => keyBit i c))

def lookupTrie : Nat → Nat → Nat → KeyTrie → List ChargeRow
  | 0, _, _, .leaf cs => cs
  | f + 1, i, k, .node z o =>
    if k.testBit i then lookupTrie f (i + 1) k o else lookupTrie f (i + 1) k z
  | _, _, _, _ => []

/-- Picture keys are below `2 ^ keyBits`; the certificate checks that they are. -/
def keyBits : Nat := 12

def collapseFast (cs : List ChargeRow) : List Nat :=
  let trie := buildTrie keyBits 0 (cs.filter (·.key.isSome))
  cs.filterMap fun c =>
    match c.key with
    | none => none
    | some k =>
      let group := lookupTrie keyBits 0 k trie
      match keeper group with
      | some keep =>
        if group.length ≥ 2 && c.idx != keep.idx && (c.instWords || keep.payWords)
        then some c.idx else none
      | none => none

end Hopper.BookIV
