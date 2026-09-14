import Hopper.Money
import Hopper.Buckets

/-!
# The reader's accounts, as data to be checked

The shapes the generator (`scripts/lean.mjs`) writes the reader's output into,
and the checks run over them. Nothing here reads a leaf: the rows are
`src/content/accounts.json`'s own, and the checks recompute from those rows
the figures the same file publishes.
-/

namespace Hopper

/-- A sum over a list. -/
def sumBy {α : Type} (f : α → Int) (l : List α) : Int :=
  l.foldl (fun s a => s + f a) 0

/-! ## The ninety-five rows that can be checked -/

/-- A row that states one price, one rate and one figure for what was left.
Money in `gross` is in cents; `written` is in sixtieths of a cent, so that
« 33 2/3 » is exact. -/
structure CheckedRow where
  ledger : String
  leaf : String
  ref : Nat
  gross : Int
  num : Int
  den : Int
  written : Int
  readerAgrees : Bool
  deriving Repr

namespace CheckedRow

/-- The rate is exact in sixtieths of a cent. -/
def rateExact (r : CheckedRow) : Bool := decide (0 < r.den ∧ 60 % r.den = 0)

def commission (r : CheckedRow) : Int := r.gross * r.num * (60 / r.den)

def net (r : CheckedRow) : Int := ofCents r.gross - r.commission

def agrees (r : CheckedRow) : Bool := within2c r.written r.net

/-- For a rate sixty divides, the commission is exact: `den` times it is the
price times the numerator, in sixtieths of a cent. -/
theorem commission_exact (r : CheckedRow) (h : r.rateExact = true) :
    r.den * r.commission = ofCents r.gross * r.num := by
  simp only [rateExact, decide_eq_true_eq] at h
  have h60 : r.den * (60 / r.den) = 60 := Int.mul_ediv_cancel' (Int.dvd_of_emod_eq_zero h.2)
  unfold commission ofCents
  rw [Int.mul_left_comm, h60, Int.mul_right_comm]

/-- How far what she wrote is from the arithmetic, in sixtieths of a cent. -/
def gap (r : CheckedRow) : Int := r.written - r.net

end CheckedRow

/-! ## The three activities -/

/-- A sale in the work books, counted once across volumes. `gross` and `net`
are in cents; `net` is the reader's own rounding of the exact net. -/
structure ArtRow where
  year : Int
  receiptYear : Option Int
  gross : Int
  num : Int
  den : Int
  net : Int
  deriving Repr

namespace ArtRow

def exactNet (r : ArtRow) : Int := ofCents r.gross - r.gross * r.num * (60 / r.den)

/-- The reader's net is the exact net to the nearest cent, and the rate is one
sixty divides. -/
def roundedAsReader (r : ArtRow) : Bool :=
  decide (0 < r.den ∧ 60 % r.den = 0) && r.net == roundCent r.exactNet

def bucket (r : ArtRow) : Bucket :=
  match r.receiptYear with
  | none => Bucket.silent r.net
  | some _ => Bucket.followed r.net

theorem bucket_holds (r : ArtRow) : r.bucket.Holds := by
  unfold bucket; cases r.receiptYear
  · exact Bucket.silent_holds _
  · exact Bucket.followed_holds _

end ArtRow

/-- A charge in the pocket book, in cents, dated at the leaf. -/
structure Charge where
  year : Int
  net : Int
  deriving Repr

/-- A cheque in the pocket book, in cents. -/
structure Receipt where
  year : Int
  amount : Int
  deriving Repr

/-- A year as the reader publishes it, in cents. -/
structure YearFigures where
  year : Int
  accrued : Int
  received : Int
  notRecorded : Int
  outstanding : Int
  deriving Repr

/-- An activity's totals as the reader publishes them, in cents. -/
structure Totals where
  accrued : Int
  collected : Int
  outstanding : Int
  notRecorded : Int
  deriving Repr, DecidableEq

def Totals.toBucket (t : Totals) : Bucket := ⟨t.accrued, t.collected, t.outstanding, t.notRecorded⟩

structure Published where
  rows : Nat
  years : List YearFigures
  totals : Totals
  deriving Repr

/-- The published years are in order, with no year twice. -/
def yearsOrdered : List YearFigures → Bool
  | a :: b :: rest => decide (a.year < b.year) && yearsOrdered (b :: rest)
  | _ => true

/-- The running balance: each year's `outstanding` is the last year's plus
what accrued less what was received. -/
def runningHolds (years : List YearFigures) : Bool :=
  (years.foldl (fun (acc : Int × Bool) y =>
    let run := acc.1 + y.accrued - y.received
    (run, acc.2 && run == y.outstanding)) (0, true)).2

/-- The totals are the sums of the years, and the last year's balance is the
total outstanding. -/
def totalsAreYearSums (p : Published) : Bool :=
  p.totals.accrued == sumBy (·.accrued) p.years + sumBy (·.notRecorded) p.years &&
  p.totals.collected == sumBy (·.received) p.years &&
  p.totals.notRecorded == sumBy (·.notRecorded) p.years &&
  p.totals.outstanding == sumBy (·.accrued) p.years - sumBy (·.received) p.years

def hasYear (years : List YearFigures) (y : Int) : Bool := years.any (·.year == y)

/-! ### The work books -/

def artYearOk (rows : List ArtRow) (y : YearFigures) : Bool :=
  y.accrued == sumBy (·.net) (rows.filter fun r => r.receiptYear.isSome && r.year == y.year) &&
  y.received == sumBy (·.net) (rows.filter fun r => r.receiptYear == some y.year) &&
  y.notRecorded == sumBy (·.net) (rows.filter fun r => r.receiptYear.isNone && r.year == y.year)

def artCertified (rows : List ArtRow) (p : Published) : Bool :=
  rows.length == p.rows &&
  rows.all ArtRow.roundedAsReader &&
  rows.all (fun r => hasYear p.years r.year && r.receiptYear.all (hasYear p.years)) &&
  yearsOrdered p.years && p.years.all (artYearOk rows) &&
  runningHolds p.years && totalsAreYearSums p

def artBuckets (rows : List ArtRow) : List Bucket := rows.map ArtRow.bucket

theorem artBuckets_hold (rows : List ArtRow) : ∀ b ∈ artBuckets rows, b.Holds := by
  intro b hb
  obtain ⟨r, _, rfl⟩ := List.mem_map.1 hb
  exact r.bucket_holds

/-! ### The pocket book -/

def bookYearOk (charges : List Charge) (receipts : List Receipt) (y : YearFigures) : Bool :=
  y.accrued == sumBy (·.net) (charges.filter (·.year == y.year)) &&
  y.received == sumBy (·.amount) (receipts.filter (·.year == y.year)) &&
  y.notRecorded == 0

def bookCertified (charges : List Charge) (receipts : List Receipt) (p : Published) : Bool :=
  charges.length == p.rows &&
  charges.all (fun c => hasYear p.years c.year) &&
  receipts.all (fun r => hasYear p.years r.year) &&
  yearsOrdered p.years && p.years.all (bookYearOk charges receipts) &&
  runningHolds p.years && totalsAreYearSums p

def bookBuckets (charges : List Charge) (receipts : List Receipt) : List Bucket :=
  charges.map (fun c => Bucket.charge c.net) ++ receipts.map (fun r => Bucket.receipt r.amount)

theorem bookBuckets_hold (charges : List Charge) (receipts : List Receipt) :
    ∀ b ∈ bookBuckets charges receipts, b.Holds := by
  intro b hb
  rcases List.mem_append.1 hb with h | h
  · obtain ⟨c, _, rfl⟩ := List.mem_map.1 h
    exact Bucket.charge_holds _
  · obtain ⟨r, _, rfl⟩ := List.mem_map.1 h
    exact Bucket.receipt_holds _

/-! ## The pencil sums -/

/-- A receipt in a year total's reach, by the sheet it is on. -/
structure Cheque where
  ref : Nat
  amount : Int
  deriving Repr, DecidableEq

/-- A year total Book IV writes for itself, the reader's receipts for that
year, and the receipts the total is declared to leave out. -/
structure PencilYear where
  year : Int
  leaf : String
  ref : Nat
  written : Int
  receipts : List Cheque
  omits : List Cheque
  deriving Repr

def PencilYear.reconciles (y : PencilYear) : Bool :=
  sumBy (·.amount) y.receipts == y.written + sumBy (·.amount) y.omits &&
  y.omits.all (fun o => y.receipts.contains o)

end Hopper
