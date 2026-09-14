/-!
# The three buckets

`scripts/accounts.mjs` splits every sum of money into what was collected, what
is still owed, and what the row does not say either way, and asserts in a
comment that `accrued = collected + outstanding + notRecorded` at every level.
This file makes the assertion a theorem: each row's contribution satisfies it,
and addition, summation and grouping preserve it.
-/

namespace Hopper

structure Bucket where
  accrued : Int
  collected : Int
  outstanding : Int
  notRecorded : Int
  deriving DecidableEq, Repr

namespace Bucket

def Holds (b : Bucket) : Prop :=
  b.accrued = b.collected + b.outstanding + b.notRecorded

instance (b : Bucket) : Decidable b.Holds :=
  inferInstanceAs (Decidable (_ = _))

def zero : Bucket := ⟨0, 0, 0, 0⟩

def add (a b : Bucket) : Bucket :=
  ⟨a.accrued + b.accrued, a.collected + b.collected,
    a.outstanding + b.outstanding, a.notRecorded + b.notRecorded⟩

def sum (l : List Bucket) : Bucket := l.foldr add zero

theorem zero_holds : zero.Holds := by
  simp [Holds, zero]

theorem add_holds {a b : Bucket} (ha : a.Holds) (hb : b.Holds) : (add a b).Holds := by
  simp only [Holds, add] at *; omega

theorem sum_holds : ∀ l : List Bucket, (∀ b ∈ l, b.Holds) → (sum l).Holds
  | [], _ => zero_holds
  | b :: l, h =>
    add_holds (h b (List.mem_cons_self ..))
      (sum_holds l fun x hx => h x (List.mem_cons_of_mem _ hx))

/-- The invariant survives aggregation: however the rows are grouped — by
year, by volume, by activity — the sum of the group sums holds. -/
theorem grouped_holds (groups : List (List Bucket))
    (h : ∀ g ∈ groups, ∀ b ∈ g, b.Holds) : (sum (groups.map sum)).Holds := by
  apply sum_holds
  intro b hb
  obtain ⟨g, hg, rfl⟩ := List.mem_map.1 hb
  exact sum_holds g (h g hg)

/-! ## What a row can be -/

/-- A sale whose row states a receipt: accrued, and collected. -/
def followed (net : Int) : Bucket := ⟨net, net, 0, 0⟩
/-- A sale whose row says nothing of a receipt: accrued, and not recorded. -/
def silent (net : Int) : Bucket := ⟨net, 0, 0, net⟩
/-- A charge in the pocket book: accrued, and owed until a cheque answers it. -/
def charge (net : Int) : Bucket := ⟨net, 0, net, 0⟩
/-- A cheque in the pocket book: collected, and taken off what is owed. -/
def receipt (amount : Int) : Bucket := ⟨0, amount, -amount, 0⟩

theorem followed_holds (n : Int) : (followed n).Holds := by simp only [Holds, followed]; omega
theorem silent_holds (n : Int) : (silent n).Holds := by simp only [Holds, silent]; omega
theorem charge_holds (n : Int) : (charge n).Holds := by simp only [Holds, charge]; omega
theorem receipt_holds (n : Int) : (receipt n).Holds := by simp only [Holds, receipt]; omega

end Bucket
end Hopper
