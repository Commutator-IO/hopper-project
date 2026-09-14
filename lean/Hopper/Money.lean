/-!
# Money, counted exactly

Every figure in the ledgers is written in dollars and cents, and every
commission taken from one is a vulgar fraction of the price: a third, a
quarter, a tenth, fifteen per cent. Josephine Hopper writes the result either
to the cent (« 16.66 », « 16.67 ») or as the fraction itself (« 16 2/3 »).

Counted in sixtieths of a cent, every one of those is a whole number, because
sixty is divisible by every denominator the leaves use — 3, 4, 10 and 20. So
nothing here needs the rationals: an `Int` of sixtieths is exact, `omega`
proves the general lemmas, and the kernel checks the data. That is also why
this project has no dependency beyond Lean itself.
-/

namespace Hopper

/-- A sum of money, in sixtieths of a cent. Written `Int` in the statements
below, because `omega` works on `Int` as it is spelled. -/
abbrev Money := Int

/-- Cents, as money. -/
def ofCents (c : Int) : Int := c * 60

/-- The nearest cent, a half cent rounded up. The reader rounds each net to
the cent before it adds anything, and no net on a transcribed leaf falls on a
half cent (the generator refuses one that does), so the tie rule is never
exercised. -/
def roundCent (x : Int) : Int := (x + 30) / 60

theorem roundCent_within_half_cent (x : Int) :
    x - 30 < ofCents (roundCent x) ∧ ofCents (roundCent x) ≤ x + 30 := by
  unfold ofCents roundCent; omega

theorem roundCent_ofCents (c : Int) : roundCent (ofCents c) = c := by
  unfold ofCents roundCent; omega

/-- Rounding to the cent is idempotent: a figure already written to the cent
is not moved by rounding it again. -/
theorem roundCent_idempotent (x : Int) :
    roundCent (ofCents (roundCent x)) = roundCent x :=
  roundCent_ofCents _

/-! ## The dealer's third -/

/-- The exact third of `p` cents. -/
def exactThird (p : Int) : Int := p * 20

/-- A third of `p` cents, truncated to the cent — « 16.66 » on twenty-five
dollars, « 1016.66 » on 3050. -/
def thirdToCent (p : Int) : Int := p / 3

/-- The truncated third is never over the exact third, and never under it by
more than two thirds of a cent. -/
theorem thirdToCent_under (p : Int) :
    exactThird p - 40 ≤ ofCents (thirdToCent p) ∧
      ofCents (thirdToCent p) ≤ exactThird p := by
  unfold exactThird ofCents thirdToCent; omega

/-- Truncating a whole number of thirds gives it back. -/
theorem thirdToCent_of_multiple (q : Int) : thirdToCent (3 * q) = q := by
  unfold thirdToCent; omega

/-- The bound the issue asks for, two cents either way, as a corollary. -/
theorem thirdToCent_within_two_cents (p : Int) :
    ofCents (thirdToCent p) - exactThird p < 120 ∧
      exactThird p - ofCents (thirdToCent p) < 120 := by
  unfold exactThird ofCents thirdToCent; omega

/-! ## The reader's test -/

/-- The reader's comparison of a figure she wrote with the arithmetic: the
two agree when they are less than two cents apart. -/
def within2c (written exact : Int) : Bool :=
  decide (written - exact < 120 ∧ exact - written < 120)

/-- Any figure written to the nearest cent passes the test. -/
theorem rounded_writing_agrees (x : Int) :
    within2c (ofCents (roundCent x)) x = true := by
  unfold within2c ofCents roundCent; simp only [decide_eq_true_eq]; omega

/-- So does a commission truncated to the cent. -/
theorem truncated_third_agrees (p : Int) :
    within2c (ofCents (thirdToCent p)) (exactThird p) = true := by
  unfold within2c ofCents thirdToCent exactThird; simp only [decide_eq_true_eq]; omega

/-- And so does the net she writes after a truncated third: the price less
the third to the cent, against the exact two thirds. -/
theorem net_after_truncated_third_agrees (p : Int) :
    within2c (ofCents (p - thirdToCent p)) (p * 40) = true := by
  unfold within2c ofCents thirdToCent; simp only [decide_eq_true_eq]; omega

/-- A figure a third of a dollar out never passes: the test catches « 33 2/3 »
written for « 33 1/3 ». -/
theorem third_of_a_dollar_disagrees (x : Int) :
    within2c (x + 2000) x = false := by
  unfold within2c; simp only [decide_eq_false_iff_not]; omega

end Hopper
