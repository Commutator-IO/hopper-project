import Hopper.BookIV

/-!
# What Book IV's rules guarantee

The properties `docs/book-iv-method.md` states in prose, proved of the model in
`Hopper.BookIV` for every input — not only the transcribed leaves. The
certificate in `Hopper.ReaderCertificate` then proves that the model decides
every transcribed row as `scripts/accounts.mjs` does, so what is proved here is
true of what the edition actually counted.
-/

namespace Hopper.BookIV

/-! ## 1. Every row receives exactly one disposition -/

theorem disposeRows_rows (s : CState) (b rows : List Pushed) :
    (disposeRows s b rows).map Prod.fst = rows := by
  induction rows generalizing s b with
  | nil => rfl
  | cons r rest ih =>
    rcases hf : (Rule.next s (rule s b r rest.head?)).force with ⟨x, y, z⟩
    simp [disposeRows, dispose, hf, ih]

/-! ## 2. No commission is counted twice -/

/-- The charges itemised since the last settlement, after a disposition: a cheque,
a wordless cheque, a bill restating the items or a bill charged in their stead
closes the run; an itemised charge adds to it; nothing else touches it. -/
def sinceAfter (k : Nat) : Disp → Nat
  | .receipt | .wordlessReceipt | .billRestating | .chargeBill => 0
  | .chargeItem | .chargeBare => k + 1
  | _ => k

theorem Rule.next_since (s : CState) (k : Rule) : (k.next s).since = sinceAfter s.since k.disp := by
  cases k <;> rfl

theorem ruleAfterDeduction_chargeBill {s : CState} {b : List Pushed} {r : Pushed}
    {n : Option Pushed} {a : Int} (h : ruleAfterDeduction s b r n a = .chargeBill) :
    s.since = 0 := by
  unfold ruleAfterDeduction at h
  split at h
  · cases h
  split at h
  · cases h
  split at h
  · cases h
  split at h
  · cases h
  split at h
  · rename_i hBillSince _ hBill
    simp only [Bool.and_eq_true, beq_iff_eq, decide_eq_true_eq, not_and] at hBillSince hBill
    have := hBillSince hBill
    omega
  split at h <;> cases h

theorem rule_chargeBill {s : CState} {b : List Pushed} {r : Pushed} {n : Option Pushed}
    (h : rule s b r n = .chargeBill) : s.since = 0 := by
  unfold rule at h
  split at h
  · cases h
  rename_i a _
  split at h; · cases h
  split at h; · cases h
  split at h
  · split at h <;> cases h
  split at h; · cases h
  split at h; · cases h
  split at h; · cases h
  split at h; · cases h
  split at h; · cases h
  exact ruleAfterDeduction_chargeBill h

/-- A bill is charged only where nothing has been itemised since the last
settlement — so a run of itemised charges is never counted again as its bill. -/
def noDoubleCommission : Nat → List Disp → Bool
  | _, [] => true
  | k, d :: ds => (d != .chargeBill || k == 0) && noDoubleCommission (sinceAfter k d) ds

theorem disposeRows_noDoubleCommission (s : CState) (b rows : List Pushed) :
    noDoubleCommission s.since ((disposeRows s b rows).map Prod.snd) = true := by
  induction rows generalizing s b with
  | nil => rfl
  | cons r rest ih =>
    rcases hf : (Rule.next s (rule s b r rest.head?)).force with ⟨x, y, z⟩
    have hsince : x = sinceAfter s.since (rule s b r rest.head?).disp := by
      have := CState.force_eq (Rule.next s (rule s b r rest.head?))
      rw [hf] at this
      have h2 := Rule.next_since s (rule s b r rest.head?)
      rw [← this] at h2
      exact h2
    simp only [disposeRows, dispose, hf, List.map_cons, noDoubleCommission, Bool.and_eq_true]
    refine ⟨?_, ?_⟩
    · by_cases hd : (rule s b r rest.head?).disp = .chargeBill
      · have hk : rule s b r rest.head? = .chargeBill := by
          revert hd; cases rule s b r rest.head? <;> simp [Rule.disp]
        simp [hd, rule_chargeBill hk]
      · simp [hd]
    · have := ih ⟨x, y, z⟩ (r :: b)
      simpa [hsince] using this

/-! ## 3. A subtotal is recovered from what answers it and from the arithmetic -/

theorem rule_subtotal {s : CState} {b : List Pushed} {r : Pushed} {n : Option Pushed}
    (h : rule s b r n = .subtotal) : ∃ a, r.amount = some a ∧ subtotalTest r b n a = true := by
  unfold rule at h
  split at h
  · cases h
  rename_i a _
  refine ⟨a, by assumption, ?_⟩
  split at h; · cases h
  split at h; · cases h
  split at h
  · split at h <;> cases h
  split at h; · cases h
  split at h; · cases h
  split at h; · cases h
  split at h; · cases h
  split at h; · cases h
  unfold ruleAfterDeduction at h
  split at h
  · assumption
  repeat (split at h <;> try cases h)

/-- And conversely: a bare figure with a year, outside a deduction, that the
arithmetic or the line answering it marks as a sum, is a subtotal. -/
theorem rule_subtotal_of {s : CState} {b : List Pushed} {r : Pushed} {n : Option Pushed} {a : Int}
    (ha : r.amount = some a) (hy : r.year.isSome = true) (hk : r.kind = .bare)
    (hd : s.deducting = false) (ht : subtotalTest r b n a = true) :
    rule s b r n = .subtotal := by
  have hy' : r.year ≠ none := by cases h : r.year <;> simp_all
  simp [rule, ruleAfterDeduction, ha, hy', hk, hd, ht]

/-! ## 4. A « less » line is never a charge -/

theorem rule_of_deduction {s : CState} {b : List Pushed} {r : Pushed} {n : Option Pushed}
    (hk : r.kind = .deduction) :
    rule s b r n = .noFigure ∨ rule s b r n = .noYear ∨ rule s b r n = .deduction := by
  unfold rule
  split
  · left; rfl
  · right
    by_cases hy : r.year.isNone = true
    · left; simp [hy]
    · right; simp [hy, hk]

theorem rule_of_pencil {s : CState} {b : List Pushed} {r : Pushed} {n : Option Pushed}
    (hk : r.kind = .pencil) :
    rule s b r n = .noFigure ∨ rule s b r n = .noYear ∨ rule s b r n = .pencil := by
  unfold rule
  split
  · left; rfl
  · right
    by_cases hy : r.year.isNone = true
    · left; simp [hy]
    · right; simp [hy, hk]

/-- A row whose words are a « less » line — and not a cheque, a bill, or a ditto
standing for a cheque — is read as a deduction, or, where its figure is in
pencil, as a sum. -/
theorem classify_less {s : AState} {l : Loose} {amount : Option Int} {later : Bool}
    (h1 : l.wDeduction = true) (h2 : l.wReceipt = false) (h3 : l.wBill = false)
    (h4 : l.wDittoTailed = false) :
    (classify s l amount later).kind = .deduction ∨ (classify s l amount later).kind = .pencil := by
  have hown : ownKind s l = .deduction := by simp [ownKind, h1, h2, h3, h4]
  simp only [classify, hown]
  cases amount <;> cases l.inkRed <;> cases l.inkPencil <;> simp

/-- So, under any state and whatever surrounds it, such a row is never charged. -/
theorem less_never_charged {s : AState} {l : Loose} {amount : Option Int} {later : Bool}
    {st : CState} {b : List Pushed} {n : Option Pushed} {y : Option Int} {t : Bool} {body : Body}
    (h1 : l.wDeduction = true) (h2 : l.wReceipt = false) (h3 : l.wBill = false)
    (h4 : l.wDittoTailed = false) :
    (rule st b ⟨l, amount, (classify s l amount later).kind, y, t, body⟩ n).disp.isCharge = false := by
  rcases classify_less (s := s) (amount := amount) (later := later) h1 h2 h3 h4 with hk | hk
  · rcases rule_of_deduction (s := st) (b := b) (n := n)
      (r := ⟨l, amount, (classify s l amount later).kind, y, t, body⟩) hk with h | h | h <;>
      simp [h, Rule.disp, Disp.isCharge]
  · rcases rule_of_pencil (s := st) (b := b) (n := n)
      (r := ⟨l, amount, (classify s l amount later).kind, y, t, body⟩) hk with h | h | h <;>
      simp [h, Rule.disp, Disp.isCharge]

/-! ## 5. A receipt rubbed out on the net's row counts once -/

theorem rule_rubbedReceipt {s : CState} {b : List Pushed} {r : Pushed} {n : Option Pushed}
    (h : rule s b r n = .rubbedReceipt) :
    ∃ a nr, r.amount = some a ∧ n = some nr ∧ nr.kind = .receipt ∧ nr.ref = r.ref ∧
      nr.amount = some a ∧ s.deducting = true ∧ s.netRestated = false := by
  unfold rule at h
  split at h
  · cases h
  rename_i a ha
  split at h; · cases h
  split at h; · cases h
  split at h
  · split at h
    · rename_i hr
      simp only [rubbedTest, Bool.and_eq_true, Bool.not_eq_true'] at hr
      obtain ⟨⟨hd, hn⟩, hany⟩ := hr
      cases n with
      | none => simp at hany
      | some nr =>
        simp only [Option.any_some, Bool.and_eq_true, beq_iff_eq] at hany
        exact ⟨a, nr, ha, rfl, hany.1.1, hany.1.2, hany.2, hd, hn⟩
    · cases h
  split at h; · cases h
  split at h; · cases h
  split at h; · cases h
  split at h; · cases h
  split at h; · cases h
  unfold ruleAfterDeduction at h
  repeat (split at h <;> try cases h)

/-- The row after it, the receipt written again, is then a receipt: the net is
now written, so it cannot be taken for another draft. -/
theorem receipt_after_rubbedReceipt {s : CState} {b : List Pushed} {r nr : Pushed}
    {n2 : Option Pushed} (h : rule s b r (some nr) = .rubbedReceipt) (hy : nr.year.isSome = true) :
    rule (Rule.rubbedReceipt.next s) (r :: b) nr n2 = .receipt := by
  obtain ⟨a, nr', _, hn, hk, _, hamt, _, _⟩ := rule_rubbedReceipt h
  cases hn
  have hy' : nr.year.isNone = false := by cases hyr : nr.year <;> simp_all
  simp [rule, Rule.next, rubbedTest, hamt, hy', hk]

/-! ## 6. A picture paid in parts is charged once, at its price -/

theorem keeper_mem {g : List ChargeRow} {k : ChargeRow} (h : keeper g = some k) : k ∈ g := by
  cases g with
  | nil => cases h
  | cons c cs =>
    simp only [keeper, Option.some.injEq] at h
    subst h
    suffices ∀ (a : ChargeRow) (l : List ChargeRow), a ∈ c :: cs → (∀ x ∈ l, x ∈ c :: cs) →
        l.foldl (fun a b => if b.gross > a.gross then b else a) a ∈ c :: cs from
      this c cs (List.mem_cons_self ..) (fun x hx => List.mem_cons_of_mem _ hx)
    intro a l ha hl
    induction l generalizing a with
    | nil => exact ha
    | cons x xs ih =>
      simp only [List.foldl_cons]
      apply ih
      · split
        · exact hl x (List.mem_cons_self ..)
        · exact ha
      · exact fun y hy => hl y (List.mem_cons_of_mem _ hy)

theorem keeper_max {g : List ChargeRow} {k : ChargeRow} (h : keeper g = some k) :
    ∀ c ∈ g, c.gross ≤ k.gross := by
  cases g with
  | nil => cases h
  | cons c cs =>
    simp only [keeper, Option.some.injEq] at h
    subst h
    have key : ∀ (a : ChargeRow) (l : List ChargeRow),
        a.gross ≤ (l.foldl (fun a b => if b.gross > a.gross then b else a) a).gross ∧
        ∀ x ∈ l, x.gross ≤ (l.foldl (fun a b => if b.gross > a.gross then b else a) a).gross := by
      intro a l
      induction l generalizing a with
      | nil => simp
      | cons x xs ih =>
        simp only [List.foldl_cons, List.mem_cons, forall_eq_or_imp]
        split
        · rename_i hgt
          obtain ⟨h1, h2⟩ := ih x
          exact ⟨by omega, h1, h2⟩
        · rename_i hle
          obtain ⟨h1, h2⟩ := ih a
          exact ⟨h1, by omega, h2⟩
    intro x hx
    rcases List.mem_cons.1 hx with rfl | hx
    · exact (key x cs).1
    · exact (key c cs).2 x hx

/-- A collapsed charge is a charge of a title charged at least twice, it is not
the charge at the price, the charge at the price is at least as large, and the
words say it is an instalment — its own entry, or a payment on account deducted
where the price is charged. -/
theorem mem_collapseInstalments {cs : List ChargeRow} {i : Nat}
    (h : i ∈ collapseInstalments cs) :
    ∃ c ∈ cs, c.idx = i ∧ ∃ k kp, c.key = some k ∧
      keeper (cs.filter (·.key == some k)) = some kp ∧
      2 ≤ (cs.filter (·.key == some k)).length ∧ c.idx ≠ kp.idx ∧
      (c.instWords = true ∨ kp.payWords = true) ∧ c.gross ≤ kp.gross := by
  simp only [collapseInstalments, List.mem_filterMap] at h
  obtain ⟨c, hc, hsome⟩ := h
  refine ⟨c, hc, ?_⟩
  cases hk : c.key with
  | none => simp [hk] at hsome
  | some k =>
    simp only [hk] at hsome
    cases hkp : keeper (cs.filter (·.key == some k)) with
    | none => simp [hkp] at hsome
    | some kp =>
      simp only [hkp] at hsome
      split at hsome
      · rename_i hcond
        simp only [Option.some.injEq] at hsome
        simp only [Bool.and_eq_true, decide_eq_true_eq, bne_iff_ne, ne_eq, Bool.or_eq_true] at hcond
        obtain ⟨⟨hlen, hne⟩, hw⟩ := hcond
        have hmem : c ∈ cs.filter (·.key == some k) := by simp [hc, hk]
        exact ⟨hsome, k, kp, rfl, hkp, hlen, hne, hw, keeper_max hkp c hmem⟩
      · cases hsome

/-! ### The grouping the kernel uses is the rule's -/

theorem lookup_build (f i k : Nat) (cs : List ChargeRow) :
    lookupTrie f i k (buildTrie f i cs) =
      cs.filter fun c => (List.range f).all fun j => (c.key.getD 0).testBit (i + j) == k.testBit (i + j) := by
  induction f generalizing i cs with
  | zero => simp only [buildTrie, lookupTrie, List.range_zero, List.all_nil]; exact (List.filter_eq_self.2 (by simp)).symm
  | succ f ih =>
    simp only [buildTrie, lookupTrie]
    split
    · rename_i hk
      rw [ih, List.filter_filter]
      apply List.filter_congr
      intro c _
      simp only [keyBit, List.range_succ_eq_map, List.all_cons, List.all_map, Function.comp_def]
      simp [hk, Nat.add_assoc, Nat.add_comm 1, Bool.and_comm]
    · rename_i hk
      rw [ih, List.filter_filter]
      apply List.filter_congr
      intro c _
      simp only [keyBit, List.range_succ_eq_map, List.all_cons, List.all_map, Function.comp_def]
      simp [hk, Nat.add_assoc, Nat.add_comm 1, Bool.and_comm]

theorem bits_eq_iff {x y f : Nat} (hx : x < 2 ^ f) (hy : y < 2 ^ f) :
    ((List.range f).all fun j => x.testBit (0 + j) == y.testBit (0 + j)) = true ↔ x = y := by
  constructor
  · intro h
    apply Nat.eq_of_testBit_eq
    intro j
    by_cases hj : j < f
    · simp only [List.all_eq_true, List.mem_range, Nat.zero_add, beq_iff_eq] at h
      exact h j hj
    · have hf : 2 ^ f ≤ 2 ^ j := Nat.pow_le_pow_right (by decide) (by omega)
      rw [Nat.testBit_lt_two_pow (by omega), Nat.testBit_lt_two_pow (by omega)]
  · rintro rfl; simp

theorem lookup_build_key (f k : Nat) (cs : List ChargeRow) (hk : k < 2 ^ f)
    (hcs : ∀ c ∈ cs, ∀ k', c.key = some k' → k' < 2 ^ f) (hsome : ∀ c ∈ cs, c.key.isSome = true) :
    lookupTrie f 0 k (buildTrie f 0 cs) = cs.filter (·.key == some k) := by
  rw [lookup_build]
  apply List.filter_congr
  intro c hc
  obtain ⟨k', hk'⟩ := Option.isSome_iff_exists.1 (hsome c hc)
  have := bits_eq_iff (x := k') (y := k) (hcs c hc k' hk') hk
  simp only [hk', Option.getD_some]
  have e : (some k' == some k) = decide (k' = k) := by
    cases hkk : decide (k' = k) <;> simp_all
  rw [e]
  cases h : ((List.range f).all fun j => k'.testBit (0 + j) == k.testBit (0 + j))
  · have hne : k' ≠ k := fun heq => by rw [this.2 heq] at h; cases h
    simp [hne]
  · simp [this.1 h]

theorem filterMap_congr' {α β : Type} {f g : α → Option β} :
    ∀ {l : List α}, (∀ x ∈ l, f x = g x) → l.filterMap f = l.filterMap g
  | [], _ => rfl
  | x :: xs, h => by
    simp only [List.filterMap_cons, h x (List.mem_cons_self ..),
      filterMap_congr' (fun y hy => h y (List.mem_cons_of_mem _ hy))]

theorem collapseFast_eq (cs : List ChargeRow)
    (hbound : ∀ c ∈ cs, ∀ k, c.key = some k → k < 2 ^ keyBits) :
    collapseFast cs = collapseInstalments cs := by
  unfold collapseFast collapseInstalments
  apply filterMap_congr'
  intro c hc
  cases hk : c.key with
  | none => rfl
  | some k =>
    have hkb : k < 2 ^ keyBits := hbound c hc k hk
    have hgroup : lookupTrie keyBits 0 k (buildTrie keyBits 0 (cs.filter (·.key.isSome))) =
        cs.filter (·.key == some k) := by
      rw [lookup_build_key keyBits k _ hkb
        (fun d hd k' hk' => hbound d (List.mem_filter.1 hd).1 k' hk')
        (fun d hd => by simpa using (List.mem_filter.1 hd).2), List.filter_filter]
      apply List.filter_congr
      intro d _
      cases hd : d.key <;> simp
    simp only [hgroup]

/-! ## 7. The year carries across a batch only where the batches abut -/

theorem enterBatch_gap {s : AState} {b p : Nat} (hp : s.prevBatch = some p) (hb : b ≠ p)
    (hn : b ≠ p + 1) : (enterBatch s b).year = none := by
  have hp' : (closeSheet s).prevBatch = some p := by
    unfold closeSheet; split <;> simp_all
  have hb' : p ≠ b := fun h => hb h.symm
  simp [enterBatch, hp, hp', hb', hn]

theorem enterBatch_abuts {s : AState} {p : Nat} (hp : s.prevBatch = some p) :
    (enterBatch s (p + 1)).year = (closeSheet s).year := by
  have hp' : (closeSheet s).prevBatch = some p := by
    unfold closeSheet; split <;> simp_all
  simp [enterBatch, hp, hp']

/-- And a figure with no year carried to it is reported unread, never counted. -/
theorem rule_noYear {s : CState} {b : List Pushed} {r : Pushed} {n : Option Pushed} {a : Int}
    (ha : r.amount = some a) (hy : r.year = none) : rule s b r n = .noYear := by
  simp [rule, ha, hy]

end Hopper.BookIV
