import Hopper.BookIVRaw
import Hopper.BookIVTheorems
import Hopper.Data.BookIV

/-!
# The reader's certificate

That the model of `Hopper.BookIV` decides every transcribed row of Book IV as
`scripts/accounts.mjs` did, and so that the general theorems of
`Hopper.BookIVTheorems` are theorems about what the edition counted.

The kernel evaluates the reader once, in `certified`; everything else here is
derived from that by proof. Evaluating it in separate theorems would run the
reader once for each, since the kernel keeps nothing between them.
-/

namespace Hopper.ReaderCertificate
open Hopper.BookIV

def raw : List Raw := Data.BookIV.raw
def rows : List Loose := decodeAll raw 0

/-- Every picture key fits the kernel's grouping. -/
def keysBounded : Bool :=
  (chargesOf (disposedOf rows)).all fun c => c.key.all (· < 2 ^ keyBits)

/-- Leaf 53's year line, and the rows under it until the volume states a year again. -/
def yearLine1920 : Option Loose := rows.find? fun l => l.ref == 16505 && l.dateYear == some 1920

def nextYearLine (i : Nat) : Option Loose := rows.find? fun l => i < l.idx && l.dateYear.isSome

def leaf53Check : Bool :=
  match yearLine1920 with
  | none => false
  | some line =>
    match nextYearLine line.idx with
    | none => false
    | some next =>
      next.dateYear == some 1922 &&
      (readRows rows).pushed.all (fun p =>
        !(line.idx < p.loose.idx && p.loose.idx < next.idx) || p.year == some 1920) &&
      (readRows rows).pushed.all (fun p => p.year != some 1921)

/-- The whole certificate, evaluated once. -/
theorem certified :
    (coversAll rows &&
      readsAsReader (readRows rows).pushed.reverse (raw.filter (·.jsKind.isSome)) &&
      dispsAgree (dispositions rows) raw &&
      keysBounded &&
      leaf53Check) = true := by
  decide +kernel

/-! ## What follows from it -/

theorem certified_parts :
    coversAll rows = true ∧
    readsAsReader (readRows rows).pushed.reverse (raw.filter (·.jsKind.isSome)) = true ∧
    dispsAgree (dispositions rows) raw = true ∧ keysBounded = true ∧ leaf53Check = true := by
  have h := certified
  simp only [Bool.and_eq_true] at h
  exact ⟨h.1.1.1.1, h.1.1.1.2, h.1.1.2, h.1.2, h.2⟩

/-- Every row is decided exactly once: by the reading, as a draft, or by its disposition. -/
theorem every_row_once : coversAll rows = true := certified_parts.1

/-- The rows kept while reading are the rows the reader kept, each of the same
kind, in the same year, with the same title and the same words. -/
theorem reads_as_reader :
    readsAsReader (readRows rows).pushed.reverse (raw.filter (·.jsKind.isSome)) = true :=
  certified_parts.2.1

/-- Every row's disposition is the reader's. -/
theorem disposes_as_reader : dispositions rows = raw.map (·.jsDisp) :=
  dispsAgree_eq certified_parts.2.2.1

/-- The grouping the kernel used is the rule's, on these charges. -/
theorem dispositions_eq_spec : dispositions rows = dispositionsSpec rows := by
  have hb := certified_parts.2.2.2.1
  simp only [keysBounded, List.all_eq_true] at hb
  have hbound : ∀ c ∈ chargesOf (disposedOf rows), ∀ k, c.key = some k → k < 2 ^ keyBits := by
    intro c hc k hk
    have := hb c hc
    simpa [hk] using this
  simp only [dispositions, dispositionsSpec, collapseFast_eq _ hbound]

/-- So the rule, as stated, decides every row as the reader did. -/
theorem rule_disposes_as_reader : dispositionsSpec rows = raw.map (·.jsDisp) := by
  rw [← dispositions_eq_spec, disposes_as_reader]

/-- The reader's published counters are counts of its dispositions — which are Lean's. -/
theorem counts_as_published :
    countRaw Disp.isCharge raw 0 = Data.BookIV.claimed.charges ∧
    countRaw (fun d => d == .receipt || d == .wordlessReceipt) raw 0 = Data.BookIV.claimed.receipts ∧
    countRaw (· == .subtotal) raw 0 = Data.BookIV.claimed.subtotals ∧
    countRaw (· == .deduction) raw 0 = Data.BookIV.claimed.deductions ∧
    countRaw (fun d => d == .netRestated || d == .rubbedReceipt) raw 0 = Data.BookIV.claimed.nets ∧
    countRaw (fun d => d == .carriedSum || d == .carriedForward) raw 0 = Data.BookIV.claimed.carried ∧
    countRaw (· == .struck) raw 0 = Data.BookIV.claimed.struck ∧
    countRaw (· == .wordlessReceipt) raw 0 = Data.BookIV.claimed.wordless ∧
    countRaw (fun d => d == .rubbedDraft || d == .rubbedReceipt) raw 0 = Data.BookIV.claimed.rubbed ∧
    countRaw (· == .pencilSum) raw 0 = Data.BookIV.claimed.pencil ∧
    countRaw (· == .instalment) raw 0 = Data.BookIV.claimed.instalments := by
  decide +kernel

theorem charges_as_published :
    ((dispositions rows).filter Disp.isCharge).length = Data.BookIV.claimed.charges := by
  rw [disposes_as_reader, ← counts_as_published.1, countRaw_eq]; simp

/-- Leaf 53's year line reads 1920 over entries of January to March 1921, and the
next year the volume writes is 1922. The rule carries the year a line states, so
every row between the two lines is booked under 1920, and no row the reader keeps
is dated 1921. The reader applies the rule as written; the defect is the line, and
it is to be corrected in `transcripts/book-iv/batch-05.tex`, at which point this
theorem will fail and must be restated. -/
theorem leaf53_books_1921_under_1920 : leaf53Check = true := certified_parts.2.2.2.2

end Hopper.ReaderCertificate
