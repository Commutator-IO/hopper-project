import Hopper.BookIV

/-!
# Book IV's rows as data, and the reader run over them

The shape `scripts/lean.mjs` writes each row in — its cells and words as a bit
field, and beside them what `scripts/accounts.mjs` decided — and the four passes
of `Hopper.BookIV` put together into one disposition a row.
-/

namespace Hopper.BookIV

/-- A row as generated: the reader's inputs, then the reader's outputs. -/
structure Raw where
  batch : Nat
  ref : Nat
  pencil : Option Int
  read : Option Int
  dateYear : Option Int
  bodyYear : Option Int
  bits : Nat
  jsKind : Option Kind
  jsYear : Option Int
  /-- titled, then the five `Body` flags. -/
  jsBody : Nat
  jsDisp : Disp
  key : Option Nat
  /-- instWords, payWords. -/
  entry : Nat
  deriving Repr

/-- The reader's published counters. -/
structure Claims where
  charges : Nat
  receipts : Nat
  subtotals : Nat
  deductions : Nat
  nets : Nat
  carried : Nat
  struck : Nat
  wordless : Nat
  rubbed : Nat
  pencil : Nat
  instalments : Nat
  deriving Repr

def Raw.decode (r : Raw) (idx : Nat) : Loose :=
  let b := r.bits.testBit
  ⟨idx, r.batch, r.ref, r.pencil, r.read, r.dateYear, r.bodyYear,
    b 0, b 1, b 2, b 3, b 4, b 5, b 6, b 7, b 8, b 9, b 10, b 11, b 12, b 13, b 14,
    b 15, b 16, b 17, b 18, b 19, b 20, b 21, b 22, b 23, b 24,
    r.key, r.entry.testBit 0, r.entry.testBit 1⟩

def decodeAll : List Raw → Nat → List Loose
  | [], _ => []
  | r :: rs, i => r.decode i :: decodeAll rs (i + 1)

/-! ## The passes together -/

def chargeRowOf (p : Pushed) : ChargeRow :=
  ⟨p.loose.idx, p.amount.getD 0, p.loose.entryKey, p.loose.entryInst, p.loose.entryPay⟩

/-- One disposition a row, in order: dropped while reading, dropped as a draft,
or disposed of — and a charge collapsed into its picture's price is an
instalment. -/
def assemble : List Loose → List (Nat × Disp) → List Nat → List (Pushed × Disp) → List Nat →
    List Disp
  | [], _, _, _, _ => []
  | l :: ls, dropped, gone, cs, coll =>
    if (dropped.head?.map (·.1)) == some l.idx then
      (dropped.head?.map (·.2)).getD .text :: assemble ls dropped.tail gone cs coll
    else if gone.head? == some l.idx then .rubbedDraft :: assemble ls dropped gone.tail cs coll
    else if (cs.head?.map (·.1.loose.idx)) == some l.idx then
      if coll.head? == some l.idx then .instalment :: assemble ls dropped gone cs.tail coll.tail
      else (cs.head?.map (·.2)).getD .text :: assemble ls dropped gone cs.tail coll
    else .text :: assemble ls dropped gone cs coll

/-- Every row is found exactly once: by the passes in order, with nothing left over. -/
def covered : List Loose → List (Nat × Disp) → List Nat → List (Pushed × Disp) → Bool
  | [], dropped, gone, cs => dropped.isEmpty && gone.isEmpty && cs.isEmpty
  | l :: ls, dropped, gone, cs =>
    if (dropped.head?.map (·.1)) == some l.idx then covered ls dropped.tail gone cs
    else if gone.head? == some l.idx then covered ls dropped gone.tail cs
    else if (cs.head?.map (·.1.loose.idx)) == some l.idx then covered ls dropped gone cs.tail
    else false

/-- The charges the disposition pass leaves, as the instalment pass reads them. -/
def chargesOf (disposed : List (Pushed × Disp)) : List ChargeRow :=
  disposed.filterMap fun (p, d) => if d.isCharge then some (chargeRowOf p) else none

def dropOf (ls : List Loose) : List Pushed × List Nat := dropRubbed (readRows ls).pushed.reverse

def disposedOf (ls : List Loose) : List (Pushed × Disp) :=
  disposeRows ⟨0, false, false⟩ [] (dropOf ls).1

/-- The whole reader: every row's disposition, in order — with the instalments
grouped as the kernel groups them. -/
def dispositions (ls : List Loose) : List Disp :=
  assemble ls (readRows ls).dropped.reverse (dropOf ls).2 (disposedOf ls)
    (collapseFast (chargesOf (disposedOf ls)))

/-- The same, with the instalments grouped as the rule states it. -/
def dispositionsSpec (ls : List Loose) : List Disp :=
  assemble ls (readRows ls).dropped.reverse (dropOf ls).2 (disposedOf ls)
    (collapseInstalments (chargesOf (disposedOf ls)))

/-- Every row found exactly once while assembling them. -/
def coversAll (ls : List Loose) : Bool :=
  covered ls (readRows ls).dropped.reverse (dropOf ls).2 (disposedOf ls)

/-! ## Against the reader's own decisions -/

def Pushed.bodyBits (p : Pushed) : Nat :=
  (if p.titled then 1 else 0) + (if p.body.empty then 2 else 0) +
  (if p.body.restated then 4 else 0) + (if p.body.paidOnAcct then 8 else 0) +
  (if p.body.netCheck then 16 else 0) + (if p.body.yearTotal then 32 else 0)

/-- The rows kept while reading, against the rows the reader kept: the same
rows, of the same kind, in the same year, with the same title and words. -/
def readsAsReader : List Pushed → List Raw → Bool
  | [], [] => true
  | p :: ps, r :: rs =>
    r.jsKind == some p.kind && r.jsYear == p.year && r.jsBody == p.bodyBits &&
      readsAsReader ps rs
  | _, _ => false

/-- The dispositions, against the reader's, row by row. Written so that the
kernel reads it as a loop: a list compared with `=` is a recursion as deep as
the list. -/
def dispsAgree : List Disp → List Raw → Bool
  | [], [] => true
  | d :: ds, r :: rs => d == r.jsDisp && dispsAgree ds rs
  | _, _ => false

theorem dispsAgree_eq : ∀ {ds : List Disp} {rs : List Raw},
    dispsAgree ds rs = true → ds = rs.map (·.jsDisp)
  | [], [], _ => rfl
  | d :: ds, r :: rs, h => by
    simp only [dispsAgree, Bool.and_eq_true, beq_iff_eq] at h
    simp [h.1, dispsAgree_eq h.2]
  | [], _ :: _, h => by simp [dispsAgree] at h
  | _ :: _, [], h => by simp [dispsAgree] at h

/-- How many of the reader's dispositions satisfy `p`, counted as a loop whose
count is evaluated at every row. -/
def countRaw (p : Disp → Bool) : List Raw → Nat → Nat
  | [], n => n
  | r :: rs, n => if n == n then countRaw p rs (if p r.jsDisp then n + 1 else n) else n

theorem countRaw_eq (p : Disp → Bool) : ∀ (rs : List Raw) (n : Nat),
    countRaw p rs n = n + ((rs.map (·.jsDisp)).filter p).length
  | [], n => by simp [countRaw]
  | r :: rs, n => by
    simp only [countRaw, beq_self_eq_true, ite_true, List.map_cons, List.filter_cons]
    rw [countRaw_eq p rs]
    split <;> simp_all <;> omega

end Hopper.BookIV
