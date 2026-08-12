# OPEN ITEMS

Things found during the fourth audit that are **not fixed**, **not finished**,
or **not understood**. Kept separate from `TASKS.md`, which tracks the plan:
this is the list of things that would otherwise only exist in my head.

Ranked by severity within each section. Every entry states how to reproduce it.
Where a number is quoted it was measured, not read.

**Status key:** `OPEN` nobody has looked · `PARTIAL` started, not finished ·
`DELIBERATE` decided against, reason given · `WATCH` fine now, will break later

---

## A. Things that invert or weaken a lesson the game exists to teach

### A1. `bubble` no longer produces its designed regime — `OPEN`
The scenario `docs/00` calls the best teaching tool in the set. Its credit gap
used to climb monotonically for eight years while every visible gauge stayed
healthy. It now **peaks at 11.98pp in month 58 and unwinds to 7.08 by month
96**, with crisis probability falling from 8.07% to 2.38%.

```
node --test test/scenarios.test.js    # the todo carries both paths
```

| credit gap, no player input | m24 | m48 | m72 | m96 | crisis_prob m96 |
|---|---|---|---|---|---|
| before Phase 3 | 8.77 | 11.63 | 13.34 | **14.10** | 10.36% |
| after 3.1 | 8.39 | 9.80 | 7.99 | **3.37** | 0.22% |
| after 5.4 | 8.86 | 12.00 | 11.10 | **6.20** | — |
| **now** (after 5.2) | 9.16 | 11.65 | 11.05 | **7.08** | 2.38% |

> 5.2's private-debt maturity moved it again, and upward: a rate change now
> reaches the debt-service burden over years, so the balancing leg of the
> credit loop (burden → defaults → spread → real rate) arrives slower and the
> boom runs longer. **The shape of the problem is unchanged** — it still peaks
> and unwinds inside the term, which is the inverse of the design.

The scenario was **calibrated against the asset-price unit error** that 3.1
fixed. Nothing about the fix is wrong. A hidden danger that resolves itself
teaches that ignoring it works, which is the inverse of the point.

**DIAGNOSED IN 4.3, and it is not the vector.** The cause is **D2**, an
already-known sourced defect: `updateCreditTrend` chases the stock at 0.20/year
(41.6-month half-life) while its stated source is a one-sided HP filter at
λ = 400,000, whose trend constant is **10–15 years**. The gauge mean-reverts
3–4× faster than the indicator it approximates, so it under-reads persistent
booms — the exact situation it exists for. Measured, bubble's credit gap by
trend catch-up speed:

| annual speed | m24 | m48 | m72 | m96 |
|---|---|---|---|---|
| 0.20 (as built) | 8.39 | 9.80 | 7.99 | **3.37** |
| 0.06 (sourced) | 10.29 | 13.99 | 14.20 | **10.34** |
| 0.05 (sourced) | 10.44 | 14.37 | 14.82 | **11.14** |

**5.4 has now run and only got part of the way.** The derivation from the
stated lambda gives 0.127/year, not the 0.05–0.06 that would restore 14.5pp:
peak gap 9.82 → **12.00**, m96 3.37 → **6.20** (and 5.2 carried it a little
further, to a 11.98 peak and 7.08 at m96, for a reason that has nothing to do
with the trend filter). Pushing further would be tuning
to a target. What remains is probably structural — the BIS trend carries a slope
state and this one does not, so it lags a growing credit stock permanently and
no choice of speed fixes it. Must not be closed by re-inflating the wealth channel
(rule 3, and the channel matches its literature) **nor by retuning the starting
vector**, which is what this entry previously recommended. Phase 6.1 is the
other half: a bubble the player cannot act on is a spectacle, not a decision.

### A2. The demand block moves too little — `OPEN`, and **11.1 refuted the claim that it is one finding**
The most important thing in this audit and it is not in the original brief.

> **11.1 HAS RUN. THE OBSERVATION BELOW STANDS AND THE UNIFICATION DOES NOT.**
> This entry has said since Phase 4 that the sightings "are not five findings;
> they are one, in the demand block". Measured, they respond to the demand
> block's own principal speed **in opposite directions**, so they cannot share
> a single cause located there. The full diagnosis is at the foot of this
> entry; the table and the sightings are unchanged and still all miss.

| | model | literature |
|---|---|---|
| UK 1979-83 sacrifice ratio | **0.36** | Ball 1994: 2–4 |
| `TAX_SHOCK_TO_GDP` | **0.484** | Romer-Romer: 2–3 |
| austerity paradox | absent at every playable gap | — |
| endogenous crisis propagation | **3.82** | was 8.4 of Cerra-Saxena's 10 |
| post-crisis rebound | **39%** of the trough, both amplifiers off | Cerra-Saxena: none |

> Re-measured after **5.7**, which fixed the capital law of motion and so moved
> the trend every one of these is measured against. The propagation figure
> IMPROVED (3.65 → 3.82) and the rebound share FELL (46% → 39%): the demand
> block generates slightly more of the loss and gives slightly less of it back.
> **The finding is unchanged in size and direction** — every cell still misses
> its literature by the same order.

> **The first two cells were wrong when this table was written, and this
> document is the one that promises "measured, not read".** It said 0.38 and
> 0.46. Measured: 0.38 was the sacrifice ratio at 2.5 and 3.1 moved it to
> **0.35**; `TAX_SHOCK_TO_GDP` has been **0.487** since 3.1 and was 0.492
> before — it has never been 0.46 anywhere in this pass, and the number was
> copied from the brief rather than run. Corrected in Phase 5 verification.
> Reproduce:
> ```
> node --test test/episodes.test.js  2>&1 | grep -o "sacrifice ratio [0-9.]*"
> node --test test/validation.test.js 2>&1 | grep -o "model [0-9.]*, literature 2-3"
> ```
> **The finding is unharmed** — every cell still misses its literature by the
> same order — which is exactly why nobody re-ran them.

**A SIXTH SIGHTING, FOUND BY 5.1's SECOND ATTEMPT, AND IT IS THE ONE THAT
BREAKS SOMETHING.** `overheating` pegs the policy rate at 1.0% against 5-6%
expected inflation — a real rate of **−3.9%** — and its whole design is that a
Taylor-principle violation MUST diverge. Held for two hundred months:

| month | real rate | output gap | investment |
|---|---|---|---|
| 1 | −3.90 | −0.44 | 22.65 |
| 48 | −2.25 | +1.38 | 23.36 |
| 96 | −2.22 | +2.08 | 23.48 |
| 200 | −1.76 | +1.77 | 23.32 |

**A deeply negative real rate held for seventeen years moves investment by
0.8pp of GDP and the output gap peaks at +2.2 before falling back.** The
scenario converges to 1.8% inflation instead of diverging. It only ever
diverged because the model was destroying 2.27pp of household income a month —
see A6. Every other sighting is a number outside a published range; this one is
a scenario that cannot teach its own lesson.

**Every real quantity moves too little for the price change that caused it.**
That much is measured and unchanged. It is why `CRISIS_SCAR_AMPLIFICATION`
could not be re-solved (see C2), **and since A6 it blocks a Phase 5 task rather
than being a candidate for the next pass.**

---

#### 11.1 — THE DIAGNOSIS

**1. THE INCOME-EXPENDITURE LOOP DOES CLOSE. Nobody had checked.** The plan
asks whether it closes at all within a term. Held to convergence, a 1pp tax
rise costs:

| months | 12 | 30 | 60 | 120 | 240 | 480 |
|---|---|---|---|---|---|---|
| % of output | 0.273 | **0.484** | 0.781 | 1.091 | **1.272** | 1.275 |

`TAX_SHOCK_TO_GDP` is measured at **30 months**, where the model has delivered
**38% of its own converged value**. The loop is not broken; it is slow.

> Measure this in RATIOS, not levels. `dOutput` as a level keeps rising to
> month 600 purely because potential grows — 5.7's lesson, and it will mislead
> anyone who repeats this sweep.

**2. THE PERMANENT-INCOME SPEED CONTROLS THE HORIZON AND NOT THE SIZE.**
`yd_permanent` closes 5% of the gap to current income each month — a **19-month
mean lag**. Sweeping it:

| speed | tax @30m | tax @240m |
|---|---|---|
| 0.025 | 0.190 | 1.24 |
| **0.05** (shipped) | **0.484** | **1.272** |
| 0.10 | 0.829 | 1.330 |
| 0.20 | 1.082 | 1.350 |
| 1.00 (no smoothing) | 1.210 | 1.361 |

The 30-month figure moves **2.5×**; the converged figure moves **7%**. So the
disagreement splits cleanly: **most of the gap at the measured horizon is
speed, and a residual gap in SIZE survives removing the smoothing entirely** —
1.36 against Romer-Romer's 2.0–3.0. The size residual is `apc_ss` and the tax
base, both sourced, and closing it is rule 3.

**3. AND HERE IS THE REFUTATION. The same sweep moves the other sightings the
WRONG WAY.**

| `YD_PERMANENT_SPEED` | 0.025 | **0.05** | 0.10 | 0.20 | 1.00 | wanted |
|---|---|---|---|---|---|---|
| `TAX_SHOCK_TO_GDP` @30m | 0.190 | **0.484** | 0.829 | 1.082 | 1.210 | **higher** ✅ rises |
| austerity paradox @−6% gap | 0.611 | **0.901** | 1.240 | 1.484 | 1.595 | **2.866** ✅ rises, never arrives |
| UK sacrifice ratio | 0.38 | **0.36** | 0.33 | 0.33 | 0.33 | **higher** ❌ falls |
| post-crisis rebound | 30.3% | **38.7%** | 46.0% | 50.3% | 57.1% | **lower** ❌ rises |
| endogenous propagation | 3.37 | **3.82** | 3.64 | 3.13 | 2.76 | **higher** ❌ peaks here |

**Only the two tax measurements improve as the demand block gets faster** —
and they are the same measurement at two starting gaps, both taken at 30
months, which is why `multipliers.test.js` already says *"the austerity paradox
is absent BECAUSE the tax multiplier is small — one finding, not two"*. Even
with the smoothing gone entirely it reaches 1.595 against the **2.866** a sign
flip needs, so the horizon axis does not deliver the paradox either. The
sacrifice ratio and the rebound improve as the demand block gets *slower*. And endogenous
propagation is a **hump whose maximum is the shipped value** — measured either
side at 0.0125 / 0.025 / 0.05 / 0.075 / 0.10 / 0.20 / 1.00 it reads 2.72 /
3.37 / **3.82** / 3.80 / 3.64 / 3.13 / 2.76, so it cannot be improved by moving
this parameter in *either* direction.

**No value of it improves all four.** The steady state is exact at every point
in the sweep, so this is not an artefact of a broken configuration.

**WHAT THAT MEANS.** A2's five sightings sit on at least **two different axes**
that this parameter trades off against each other:

- **a HORIZON axis** — the tax multiplier, and anything else measured inside
  three years, is short because the multiplier takes ~20 years to converge and
  38% of it has arrived by month 30;
- **a PERSISTENCE axis** — the sacrifice ratio, the crisis propagation and the
  rebound are short because the economy heals *too fast*, and they want the
  demand block **slower**, not faster. **This is A2's live half and it is now
  task 11.6.**

> **11.2 THEN SPLIT THE PERSISTENCE AXIS AGAIN.** The UK sacrifice ratio is not
> a demand-block finding at all: it is the **Okun hoarding ramp**, and turning
> that off moves it **0.36 → 0.61**, a 69% improvement, where the entire
> demand-block sweep moved it 0.38 → 0.33 the wrong way. Two of A2's five
> sightings — the sacrifice ratio and the crash unemployment of B3 — are one
> mechanism in the labour block. **Endogenous propagation is now the only
> sighting with no identified mechanism**; it gets worse under both levers. See
> **B3** for the table and task **11.7** for the decision.

They are in tension through the one parameter that most obviously governs
"how much does the demand block move". **So there is no single demand-block
fix, and the next pass should stop looking for one.** The remaining candidates
are on the persistence axis and are not in the consumption function:
hysteresis, the Phillips slope's anchoring, and Okun (B3).

```
node --test test/validation.test.js 2>&1 | grep "literature 2.0-3.0"
# and sweep P.YD_PERMANENT_SPEED, which 11.1 promoted so this is reproducible
```

**WHAT 11.1 DID NOT ESTABLISH, stated so nobody reads more into it.**

- **It did not measure the persistence axis, only that it exists and points
  the other way.** Which mechanism is short — hysteresis, the Phillips curve's
  anchoring, or Okun — is untested. That is **11.6**, and 11.2 first.
- **The austerity-paradox sweep has a confound.** The starting gap is set with
  a standing external demand shock, and the same shock produces a different gap
  at each speed (−5.34 at 0.025 to −7.37 at 1.00), because consumption's
  response to the shock is what the sweep is changing. The direction is
  unambiguous and the movement is 2.6×, but the rows are not a clean
  same-state comparison the way the other four are. Re-run it with the gap
  pinned per speed before quoting the numbers precisely.
- **It says nothing about whether 0.05 is the right value.** The sweep shows
  what the parameter does, not where it belongs. Its range is now recorded and
  7.1's Monte Carlo is the task that samples it.
- **It does not unblock 11.3.** The model has not moved — the value shipped
  unchanged and the behaviour hash is unmoved — so there is nothing to
  re-solve `CRISIS_SCAR_AMPLIFICATION` against, and re-solving now would pin it
  to a demand block 11.6 is about to move.

**`YD_PERMANENT_SPEED` IS NOW A PARAMETER**, overturning 5.3's decision to
leave it a local literal on the grounds that its range "would be a fiction of
precision". Measured, it is first-order for four headline validation outcomes
at once and could not be swept without editing `src/rules/consumption.js` —
which is how this diagnosis had to be done. Range **[0.0164, 0.0769]** derived
from the one-to-five-year mean lag its own comment already cited; value
unchanged at 0.05, behaviour hash `7e517207065edb1c` unmoved. The comment also
called 13 months the **mean lag**: 13.5 months is the half-life and the mean
lag is 19.

### A3. A rate cut buys LESS inflation the hotter the economy — `OPEN`, undiagnosed
Below the capacity ceiling, the inflation response to a 1pp cut **falls** as the
output gap rises, then jumps at the ceiling:

```
node -e "…" # see the sweep in test/transmission.test.js's capacity-cliff test
```

| starting gap | 0.00 | 0.97 | 1.98 | 3.02 | **4.08** | 4.74 | 5.27 |
|---|---|---|---|---|---|---|---|
| Δinflation from a 1pp cut | 0.105 | 0.085 | 0.061 | 0.033 | **0.055** | 0.058 | 0.066 |

**Verified pre-existing** — the shape is identical before and after Phase 3, so
it is not something this pass introduced. But it is backwards on its face: a cut
into a hotter economy should buy more inflation, and between a zero gap and +3
it buys a third as much. Nobody has explained it. It also made the capacity-cliff
test a coin toss for as long as it has existed — that test passed by 0.004 and
failed by 0.006 across an unrelated change.

### A5. The capital law of motion treated a share as a level — `FIXED in 5.7`
`supply.js:25` added `annualToMonthlyFlow(s.investment)` — a **percent of
potential output** — to `capital_stock`, a **level**, so the investment flow
feeding the capital stock was frozen at its month-zero value while potential
grew away from 100. Same class as B2. Three predictions, all measured before
the fix: K converged to a constant `I/δ` = 346.15 (measured 346.154 at m2400);
long-run potential growth decayed to `gA = g·(1−α)` = 0.930% (measured 0.9345%
at m1200); K/Y fell 3.0 → 2.05 by m600.

**Fixed, and a second defect under it fixed with it.** `DEPRECIATION_RATE` was
0.065 against `SS_DEPRECIATION`'s 0.06 — while `DEPRECIATION_RATE`'s own note
ended *"Keep them equal"* and `SS_DEPRECIATION`'s said it *"supersedes the old
0.065"*. A stated invariant that the two values violated. Equalised at 0.06,
which is what makes `START.investment_share = 22.5` correct: `(δ+g)·K/Y =
(0.06+0.015)·3 = 0.225`. **This is why `investment_share` did NOT need
re-deriving to 24.0, as this entry previously said it would.**

```
node -e "import('./test/harness.mjs').then(h=>{const w=h.world({});h.advance(w,200);
  console.log(w.s.capital_stock/w.s.output, w.s.gdp_growth_annual)})"
```
Now K/Y **2.999923** and growth **1.5107%** against a stated 1.5.

**THE BLAST RADIUS WAS MUCH SMALLER THAN THIS ENTRY PREDICTED, and that is
itself the finding.** It said the fix "moves every measurement in this audit".
Measured across all six scenarios at m96, **only four quantities moved**:
`potential_output`, `capital_stock`, `gdp_growth_annual` and `approval`. Every
ratio — output gap, inflation, unemployment, consumption, investment, debt,
asset prices, credit gap, crisis probability — is identical to four decimals.
**The model is almost entirely ratio-invariant, which is exactly why nothing
caught the defect for its whole life**, and `approval` is the one place a
player could have felt it: it reads year-on-year REAL INCOME, a level, so
incomes now grow at the rate the model says they grow at.

What did move, and was re-measured rather than left: `CRISIS_IMPULSE_AMPLIFICATION`
re-solved **2.1855 → 2.0461** (compulsory — it is in `SOLVED_FROM_MODEL`),
trough −9.000 at month 12; endogenous propagation 3.65 → **3.82**; the UK
sacrifice ratio 0.35 → **0.36**; `TAX_SHOCK_TO_GDP` 0.487 → **0.484**; the
transmitted Taylor response 1.96 → **1.94**; `RATE_TO_INFLATION` at 24 months
0.1227 → **0.0797**, which halved because a hike used to be measured against a
sagging ceiling. `docs/11` regenerated and re-stamped.

**`test/steady-state.test.js` could not see any of this** and now can: it
gained a LEVEL assertion — potential grows at `potential_growth`, and K/Y stays
where START solved it — because every quantity it checked was a ratio, a rate,
or a percent of potential, and all of them are invariant when output and
potential drift together.

### A7. `overheating`'s central lesson sits 0.6pp from a bifurcation — `OPEN`, and **11.5 refuted this entry's mechanism: it is NOT the capacity ceiling**
Found while diagnosing A6 and it explains it. `overheating`'s design promise is
that a Taylor-principle violation MUST diverge. Measured, that promise rests on
a knife-edge. Sweeping a standing demand shift `d` through `net_exports` — which
is additive in `aggregate.js` and read by nothing else, so it moves the gap and
nothing else — and reading inflation at month 96, unattended:

| `d` (pp) | −0.57 | −0.54 | −0.51 | **−0.48** | −0.45 | −0.40 | 0 |
|---|---|---|---|---|---|---|---|
| inflation @m96 | 3.57 | 3.76 | **4.05** | **39.20** | 76.73 | 137.91 | 380.50 |

**A 0.03pp change in standing demand moves month-96 inflation by 35 percentage
points, and there is nothing in between.** The scenario opens at an output gap
of **+0.152**, so its entire margin is about **0.6pp of demand**.

**THE ISOLATING EXPERIMENT NAMES THE MECHANISM: it is `MAX_CAPACITY_OVERHEAT`,
the one hard switch in the model.** Peak output gap over the term:

```
d = −0.51   peak gap  2.177   never reaches the ceiling   ->  4.05%
d = −0.48   peak gap 10.348   through the ceiling         -> 39.20%
```

`MAX_CAPACITY_OVERHEAT` is 4, and `docs/02` already says this is the model's
only genuine discontinuity: *"demand above what can physically be produced
cannot become output at all, so it goes entirely to prices."* The scenario
diverges if and only if the gap climbs past +4 inside the term.

**This is `docs/12`'s bifurcation in the OTHER DIRECTION, and it is still
open.** Phase 2 closed the disinflationary one — the policy-rate knife-edge
that moved from 8–9% to the Fisher point at 6–7% — by splitting the
transmission lag. Nobody has measured the inflationary one. It is not the same
defect (that one was a lag applied to the wrong quantity; this one is a real
threshold behaving as designed), but it has the same shape and the same
consequence: a scenario that either explodes or converges with nothing between.

**Why it matters beyond `overheating`.** It is why **A6** kills 5.1 — the
0.57pp of consumption that recycling costs lands almost exactly on the edge —
and it is the same threshold **A3** sees from the side (*"a rate cut buys LESS
inflation the hotter the economy, then jumps at the ceiling"*). And **A2** is
why the margin is so thin: with a demand block this weak, a −3.9% real rate
takes the whole term to move the gap 2pp, so reaching +4 was always marginal.

**Do not close this by widening the margin.** Re-deriving `overheating`'s
vector so it opens further from the edge is legitimate and is what rule 6
requires (A6), but it does not remove the bifurcation — it moves the scenario
away from it.

---

#### 11.5 — THE DIAGNOSIS, AND THE MECHANISM ABOVE IS WRONG

The sweep reproduces exactly — 3.57 / 3.76 / **4.05** / **39.20** / 76.73 /
137.91 / 380.50, peaks 2.177 vs 10.348 — through 5.7, 5.8 and 5.13. It is
robust. **The attribution is not.**

**1. IT IS A TRUE BIFURCATION, not a finite-horizon artefact.** Read at m96 you
cannot tell an explosion from a slow one. Run to m900:

| `d` | m96 | m200 | m400 | m900 |
|---|---|---|---|---|
| −0.60 | 3.42 | 3.16 | 2.30 | **1.99** |
| −0.52 | 3.92 | 3.58 | 2.37 | **2.02** |
| −0.4916 | 16.50 | 863.72 | 2947.98 | **8159.18** |
| −0.48 | 39.20 | 976.22 | 3061.00 | **8272.94** |

One side returns to target, the other runs away — **linearly, at about 10pp of
inflation per month**, not explosively. And the m96 reading is a LAGGING
indicator of the edge: bisecting on m96 puts it at −0.4915 and bisecting on the
long run puts it at **−0.51150**.

**2. IT IS NOT `MAX_CAPACITY_OVERHEAT`. Sweeping the ceiling does not move the
edge at all:**

| ceiling | 2 | 3 | 4 | 6 | 10 | **none** |
|---|---|---|---|---|---|---|
| edge `d*` | −0.4912 | −0.4915 | −0.4915 | −0.4915 | −0.4915 | **−0.4915** |

and on the long-run bisection, **as built −0.51150 and with no ceiling at all
−0.51150 — identical to six significant figures.** This entry says the scenario
"diverges if and only if the gap climbs past `MAX_CAPACITY_OVERHEAT`". That was
a CORRELATION: divergent runs pass through 4 on the way up. Remove the ceiling
and they still diverge, from the same starting point.

**3. IT IS THE TAYLOR-PRINCIPLE VIOLATION — which is the scenario's own
lesson.** A pegged nominal rate against rising inflation is a falling real
rate, and that loop is unstable. Let the rate respond and the edge moves from
−0.51 to somewhere between **+1 and +3**:

| `d` | −0.60 | −0.51 | 0 | +1 | +3 |
|---|---|---|---|---|---|
| peg, m900 | 1.99 | **7528** | 8782 | 9044 | 9372 |
| Taylor rule, m900 | 1.86 | **1.91** | 2.02 | 6.90 | **8769** |

**4. Un-anchoring widens the unstable region but does not create it.** Pin
`PHILLIPS_KAPPA_UNANCHORED` to the anchored value and the edge moves −0.51150 →
**−0.37135** — about 23% of the 0.6pp margin — and the bifurcation is still
there.

**SO THE QUESTION THIS ENTRY POSES IS AIMED AT THE WRONG OBJECT.** "Whether a
hard ceiling is the right shape, or a steep ramp" cannot matter here: the
ceiling's shape is irrelevant to this bifurcation, and softening it would not
remove the knife-edge. **An unstable fixed point has a separatrix. That is not
a defect — it is what a Taylor-principle violation IS**, and teaching it is the
scenario's entire purpose.

**WHAT IS ACTUALLY WRONG IS THE SCENARIO'S STARTING POINT**, and that is A6's
job, not a modelling question: `overheating` opens 0.6pp from a separatrix, so
any change anywhere in the demand block can flip its lesson — which is exactly
what killed 5.1. Re-deriving the vector is legitimate (rule 6) and is the fix.

**THE CEILING IS STILL REAL AND STILL DOES THINGS.** A3 — *a rate cut buys less
inflation the hotter the economy, then jumps at the ceiling* — is a genuine
ceiling effect on the marginal response, and 11.5 says nothing about it. What
is refuted is only this entry's claim that the ceiling causes `overheating`'s
bifurcation.

```
node -e "..."   # sweep externalDemand through overheating to m900, and
                 # sweep MAX_CAPACITY_OVERHEAT: the edge does not move
```

### A6. 5.1 IS BLOCKED ON THE DEMAND BLOCK, NOT ON THE YIELD — `OPEN`
Recycling the government's interest bill to households is right, the plan asks
for it (D1), the arithmetic works and the steady state closes exactly. It was
reverted in the third audit's follow-up and **reverted again here**, and the
second attempt found the real reason.

**Why apc_ss must fall, and why that is the whole problem.** Adding
`(1 − foreign_share) · interest_cost` to disposable income raises household
income at the canonical baseline from 78.25 to **80.525**. Consumption must
still be 55.5, so the average propensity has to fall — from **0.709265 to
0.692945** — solved so `apc_ss·(YD − interest) + apc_bondholder·interest =
55.5`, with `apc_bondholder = (apc_ss − HAND_TO_MOUTH_SHARE)/(1 −
HAND_TO_MOUTH_SHARE) = 0.561350`. Both figures reproduce the recipe in B5
exactly. There is no way to avoid the cut: more income at the same consumption
IS a lower propensity.

**And apc_ss is canonical while the interest transfer is not.** `overheating`
opens with a coupon of 1.75 against the canonical 3.25, so it receives **1.22**
of recycled interest against the 2.275 that apc_ss was solved for. It takes the
lower propensity without the compensating income and loses **0.57pp of
consumption**, which moves its opening output gap from **+0.2 to −0.44**. That
is correct economics — an economy whose government pays its savers less has
less household income — and it is fatal to the scenario.

```
node -e "import('./test/harness.mjs').then(async h=>{const {SCENARIOS}=await import('./src/game/scenarios.js');
  const w=h.world({assert:false,overrides:SCENARIOS.overheating.overrides});h.advance(w,200);
  console.log(w.s.inflation)})"      # 380.50 as shipped; 3.83 with 5.1 applied
```

**THE ISOLATING EXPERIMENT REFUTED THE OBVIOUS HYPOTHESIS.** The plausible
story was dynamic: inflation erodes the debt, so the transfer shrinks, so
income falls — an inflation tax acting as a stabiliser. Measured by holding the
transfer frozen at its opening level for 200 months, `overheating` reaches
**3.17%** against **3.27%** free. The shrinking transfer is worth a tenth of a
point. **It is the one-off level cut, exactly as the previous pass measured**
(interest channel alone 510 → 494; the lower apc_ss alone 510 → 66).

**WHAT IS ACTUALLY UNDERNEATH IT: A2.** `overheating` pegs the rate at 1.0%
against 5–6% expected inflation and its design promise is that a
Taylor-principle violation must diverge. With the income error removed, a
**−3.9% real rate held for two hundred months** moves investment 22.65 → 23.48
and the output gap peaks at **+2.2** before falling back to 1.8% inflation. The
scenario's divergence was being carried by 2.27pp of household income the
accounting says belongs to bondholders. **Once the accounting is right, the
demand block is too weak to produce the divergence.**

**Rule 6 states the same thing from the other side: `overheating`'s regime is
ASSERTED, not DRIVEN.** It sets `unemployment: 3.5` and a low rate and relies
on the demand identity for a positive gap — the exact defect docs/07 M6 found
in `recession` and fixed by giving it a driven balance-sheet story.
`overheating` survived because the old income error was doing the driving.

**The order is therefore A2 → re-derive `overheating`'s vector → 5.1**, and
5.5's `HAND_TO_MOUTH_SHARE` wiring rides on 5.1 as before. Do not attempt 5.1
again before A2, and do not close it by re-tuning `overheating` to hyperinflate
— that is rule 3 applied to a scenario instead of a coefficient.

### A4. The bond yield had no expected-inflation term — `FIXED in 5.8`, and it UNBLOCKS 5.1
`updateBondYield` read `expectedShort = s.policy_rate` for a term labelled
*"expected path of the policy rate"*, so a ten-year bond was a one-day bond
with a term premium bolted on. Fine while the central bank follows the Taylor
principle — the policy rate then contains inflation — and absurd the moment the
rate is pegged, which is what several scenarios do.

Measured in `overheating`, policy rate pegged at 1.0%, no player input:

| month | inflation | yield BEFORE | yield NOW | coupon BEFORE | coupon NOW |
|---|---|---|---|---|---|
| 24 | 6.73 | 1.45 | **4.68** | 1.72 | **2.37** |
| 48 | 29.46 | 0.73 | **17.71** | 1.65 | **4.12** |
| 96 | 380.50 | **0.00** | **227.15** | 1.42 | **52.32** |

**THE FIX IS NOT A FISHER TERM, and that is what made it possible.** This entry
recorded the trap: `START`'s 3.25 = 2.5 + 0.75 already assumes the policy rate
carries expected inflation, so ADDING expected inflation double-counts under a
responding central bank and forces a steady-state re-solve. Pricing the
expected **average** short rate over the bond's life has no such problem:

```
expectedShort = w · policy_rate + (1 − w) · (r* + expected_inflation)
```

At the steady state both legs are 2.5, so the yield is 3.25 **for any w** and
the steady state is unmoved by construction — verified exact to nine decimals.
Under a rule-following central bank the policy rate tracks the anchor and they
agree, so nothing is double-counted. Under a peg they diverge and the yield
follows inflation, at exactly **1 − w = 0.6100** per point (measured to 1e-6).

`YIELD_POLICY_RATE_WEIGHT` = 0.39, [0.21, 0.54], derived from a policy-rate
reversion half-life of 3 years [1.5, 5] over a 10-year horizon:
`w = (1 − e^(−λT))/(λT)`, `λ = ln2/H`.

```
node --test test/scenarios.test.js 2>&1 | grep "LONG YIELD IS AN AVERAGE"
```

**Two tests were asserting the old defect and were rewritten to test their own
mechanisms rather than a contaminated level:**
- `a hike does not bite the interest bill on impact` required the 10-year to
  move **> 2.5pp on a 3pp hike** — very nearly one-for-one, which no bond
  market shows. It now asserts the two claims separately: the response is
  IMMEDIATE (m1 equals m6 to 0.02pp) and its SIZE is the derived weight
  (1.17pp = 0.39 × 3). The old bar conflated speed with magnitude.
- `JAPAN: own-currency debt held at home does not reprice` required the yield
  stay under 2.0%. It now asserts the **risk premium** against the pure
  debt-level term, because the yield legitimately carries an inflation
  expectation this episode should not have — the model reaches 2.35% expected
  inflation by month 48 of a Japanese deflation, which is the known defect the
  very next test records as a failing `todo`. The ownership channel is intact
  and measured: 2.448pp of risk premium between 7% and 75% held abroad.

**WHAT IT DELIBERATELY DOES NOT DO:** it does not reach private borrowers.
`sovereign_premium_felt` passes on `max(0, risk_premium)`, and `risk_premium`
is the debt, foreign and panic terms only. A government paying more because
inflation is high is not a sovereign risk penalty on its companies.

**IT DID NOT UNBLOCK 5.1, AND THIS ENTRY WAS WRONG TO SAY IT WOULD.** The
fix is right on its own merits and the interest bill now rises with inflation
(coupon 2.37 → 4.12 → 52.32 against 1.72 → 1.65 → 1.42 before). But 5.1 was
rebuilt on top of it and **`overheating` still stops hyperinflating** — 3.83%
against 380.50%. Measured on both sides: the previous pass recorded 3.13% with
the old yield, this pass measures 3.83% with the new one. **Both fail, so the
missing Fisher term was never the cause.** See **A6** for what is.

---

## B. Things I found and did not chase

### B1. `docs/11`'s prose is only verified for section 2 — `CLOSED in 5.2`
4.3 regenerated all six dial tables and updated the numbers quoted in **§2's**
rate-cut chain, and left §1 and §3–§7 unchecked. **5.2 regenerated all of them,
and three were not merely stale — they taught the opposite of what the model
now does.** See docs/13 Correction 13b.

- **§1's kernel table had never been regenerated since the document was
  created** (`git log -L 58,64:docs/11-cause-and-effect.md` returns one
  commit). It read 0.01 / 0.05 / 0.48 / 1.00 for the share of a rate cut the
  real economy has felt at 1 / 3 / 12 / 48 months — the pre-2.1 model.
  Measured: **0.05 / 0.50 / 0.93 / 1.00**.
- **§5 said the Taylor rule loses `stagflation` to hyperinflation at m24.** It
  wins: 7.8% at m48 and GOLDILOCKS at 2.9% by m96.
- **§7 still called the closed bifurcation "THE BIGGEST HOLE"**, quoted the
  8–9% knife-edge (it is 6–7%) and did not mention the demand block at all.

> **TWO CORRECTIONS TO THIS ENTRY, both made in 5.20 when the cells it
> describes were finally checked by a tool.** It says §5 now shows the Taylor
> rule winning `stagflation` at *"7.8% at m48 and GOLDILOCKS at 2.9% by m96"*.
> Measured: **7.9% at m48, and OVERHEATING at 3.2% at m96** — the m96 cell was
> stale in the table when this was written, and the rule wins more slowly than
> either number said. And the claim below that the do-nothing row *alone* has
> moved is wrong: **four of the five rows have, and one has changed its
> outcome.** See **E13**.

Re-stamped at `86c1b104fab5561d`. The remaining known-unverified block is
**`debt_trap`'s five-row policy table in §5**, which was measured for `docs/12`
and was flagged in place as not re-run. **E13 re-ran it and 5.21 gave it a
producer, so `docs/11` now has no numeric block that a tool does not generate
and check.**

### B2. `debt_trap` overflows `govt_debt` to Infinity at month 191 — `DELIBERATE`
After reaching 7.27e+189. Verified identical before and after Phase 3, so it is
not new. It is the *declared* `debt_service_spiral` plus double precision giving
out, 117 months after the debt-crisis ending would have ended a real game at
month 74. Skipped explicitly in the conservation sweep with the reason attached.
Only worth attention if endings are ever disabled in a shipped configuration.

### B3. Unemployment does not follow output down in a crash — `OPEN`, **diagnosed in 11.2, and it is NOT A2**
The crash trough is now **exactly** on target (−9.0000% against
`CRISIS_OUTPUT_TROUGH`) while unemployment peaks at **+1.91pp against a
published 2–5**. So the output hole is the right depth and the labour market
does not follow it into it.

> **THIS ENTRY GUESSED "probably the same finding as A2 seen from the labour
> side". IT IS NOT.** It is the Okun hoarding ramp, and one switch isolates it.

**THE ISOLATING EXPERIMENT, and the model already contained the switch.**
`updateEmployment` lerps `beta` from `OKUN_BETA` (0.45) toward
`OKUN_LABOUR_HOARDING` (0.20) along `stretch = |output_gap| / OKUN_HOARDING_GAP`,
clamped to 1. Turning the ramp off:

| | peak unemployment | trough | `beta` at the trough |
|---|---|---|---|
| as built | **+1.910pp** | −9.000% | **0.2000** |
| hoarding ramp off | **+3.862pp** | −8.660% | 0.4500 |

**With the ramp off the model lands inside the published 2–5.** The whole
disagreement is this one term.

**AND THE RAMP IS SATURATED FROM THE FIRST MONTH OF THE CRASH.**
`OKUN_HOARDING_GAP` is 4; the crash gap is −5.24 at m1 and −8.48 by m18, so
`stretch` is pinned at 1 and `beta` is a CONSTANT 0.200 for the entire episode.
There is no ramp during a crash — there is a floor, and the model sits on it.

```
m 1  gap -5.24  beta 0.200      m12  gap -8.41  beta 0.200
m 6  gap -7.15  beta 0.200      m24  gap -8.34  beta 0.200
```

**THE DEEPER PROBLEM IS THAT THE REGIME IS ASSERTED BY THE GAP, AND ITS OWN
SOURCE SAYS IT NEEDS A POLICY.** `OKUN_LABOUR_HOARDING`'s note states the
switch condition: *"a sharp output fall **combined with short-time-work or
job-retention policy support**"*. The code implements the first half and
ignores the second — there is no job-retention policy in the model and no way
to express one — so **a banking crisis with no furlough scheme gets full
hoarding because the hole is deep**. Bigger shock, less labour-market response,
without bound. That is rule 6: a regime driven by nothing, asserted by a
magnitude. And `OKUN_HOARDING_GAP` is `judgement`, sourced *"Shape assumption,
not an estimate"*, and its own note ends **"TUNING DIAL."**

**AND IT IS NOT ONLY B3 — THE UK SACRIFICE RATIO IS THE SAME MECHANISM.**
Measured with the ramp off model-wide:

| | as built | ramp off | wanted |
|---|---|---|---|
| crash unemployment peak | +1.910pp | **+3.862pp** | 2–5 ✅ **in band** |
| UK 1979-83 sacrifice ratio | 0.36 | **0.61** | 2–4 ✅ **+69%** |
| post-crisis rebound | 38.7% | **35.2%** | lower ✅ |
| endogenous propagation | 3.82 | **2.98** | higher ❌ |
| steady state | exact | **exact** (0 / 2.0 / 5.0) | — |

**The sacrifice ratio moves 69% on this one switch** — further, and in the
RIGHT direction, than the whole of 11.1's demand-block sweep managed (which
moved it 0.38 → 0.33, the wrong way). That makes sense the moment it is said
out loud: the sacrifice ratio is *excess unemployment point-years per point of
disinflation*, so a labour market that does not follow output cannot produce
one. **Two of A2's five sightings are the Okun hoarding ramp, and neither is
the demand block.**

So the map after 11.1 and 11.2 is three groups, not one finding and not two:

| axis | sightings | lever |
|---|---|---|
| HORIZON | `TAX_SHOCK_TO_GDP`, austerity paradox | the demand block's speed (11.1) |
| **OKUN** | **UK sacrifice ratio, crash unemployment** | **the hoarding ramp (11.2)** |
| unexplained | endogenous propagation | worsens under both |

**NOT FIXED HERE, AND DELIBERATELY.** Reshaping the ramp so unemployment lands
in 2–5 is rule 3. The fix is a decision with a measured blast radius: the
trough moves (−9.000 → −8.660), so **`CRISIS_IMPULSE_AMPLIFICATION` must be
re-solved** (`SOLVED_FROM_MODEL`); the six-scenario behaviour hash moves
`7e517207065edb1c → 912f980c1cdbeab8`; and **propagation gets worse**, so this
is a trade and not a free win. Tracked as task **11.7**.

`TEST-RESULTS.md`'s OPEN on the output→employment lag is related.

### B4. One mean-reversion speed cannot satisfy both asset legs — `OPEN`
`ASSET_PRICE_MEANREVERSION` is one number serving two sourced horizons: equity
is *"cumulative ~1yr"*, housing *"2–5yr"*. Equity implies ~0.08 (outside the
published [0.01, 0.05]); housing implies 0.028–0.038 (inside it). Left at the
published 0.02 and recorded rather than tuned. Consequence: the model delivers
**0.94% of a 4.60% level response at 12 months** — correct in the long run,
slow to get there. Phase 6.3 (separate housing from equities) is the real fix.

### B5. `HAND_TO_MOUTH_SHARE`'s wiring is designed and measured but not shipped — `PARTIAL`, now formally DEFERRED
Task 5.5 asks for it to be wired or deferred, because it is currently read only
to be printed into a trace — satisfying the DEFERRED register's grep without
doing any work. **5.1 designed the wiring and it is correct**: interest income
accrues to bondholders, who by definition hold assets and are not hand-to-mouth,
so it is consumed at

```
apc_bondholder = (apc_ss − HAND_TO_MOUTH_SHARE) / (1 − HAND_TO_MOUTH_SHARE)
```

with no new parameter and the steady state closing exactly (`apc_ss` re-derived
to 0.692945 by solving `C = apc_ss·(YD − interest) + apc_bondholder·interest`).
**It rides on task 5.1**, which A4 was thought to block and **A6** actually
blocks. Do not invent a different wiring.

**5.5 HAS NOW RUN, and it made the deferral honest rather than accidental.**
The parameter was read in exactly one place — `consumption.js:104`, inside
`trace.record`'s extras — so the DEFERRED register's grep called it wired while
it did no work. The register now paren-matches `trace.record(...)` and
`trace.note(...)` out of the source before deciding, and `HAND_TO_MOUTH_SHARE`
is **the only parameter in the model that read solely inside a trace**, so the
tightening caught what it was aimed at and nothing else. The recipe above is
copied verbatim into its `DEFERRED` entry, so it travels with the parameter
rather than only with this file.

### B7. `business_confidence` compared a user cost against a real interest rate — `FIXED in 5.13`
Found while labelling the sentiment weights in 5.3 and measured in 5.8's
follow-up. The gauge is declared `60` in `state.js` and in `docs/01`, and it
settles at **exactly 48.000** on tick one of a perfect steady state and stays
there for two hundred months:

```
node -e "import('./test/harness.mjs').then(h=>{const w=h.world({});h.advance(w,200);
  console.log(w.s.business_confidence, w.s.user_cost - w.s.market_real_rate_ss)})"
```

The whole 12-point gap is one term:
`BIZ_W_USER_COST × (user_cost − market_real_rate_ss)` = `2.0 × 6.000`, and
**6.000 is exactly `DEPRECIATION_RATE × 100`**. `user_cost` is
`market_rate − expected_inflation + δ·100` — a user cost OF CAPITAL — and
`market_real_rate_ss` is `neutral_real_rate + credit_spread_ss`, a real
interest rate with no depreciation in it. They are not the same kind of
quantity, so the gauge reads a permanent wedge that is pure units.

`consumer_confidence` settles at exactly its neutral 60, which is what makes
the 48 visible as an error rather than a choice.

**Not urgent and not harmless.** Nothing reads `business_confidence` — it is a
pure gauge — but `docs/09` gap 5 lists it as computed-and-never-displayed and
**task 8.10 exists to display it**. Showing a business-confidence reading of 48
at a flawless steady state would be a gauge that lies at rest, which is the
`price_level` invariant's whole argument one file over. Fix before 8.10, not
after: either compare `user_cost` against a steady-state USER COST, or drop
depreciation from the term.

**FIXED in 5.13, AND THE RIGHT ANCHOR ALREADY EXISTED ONE FILE OVER.**
`updateInvestment` had always measured its stance against a local `userCostSS`
built from neutral — so the model held **two anchors for one quantity** and the
gauge used the wrong one. The repair is not a corrected expression but a single
number: **`s.user_cost_ss`** now sits in `state.js` beside `market_real_rate_ss`
and `policy_rate_ss`, and both rules read it. 5.10's `DEMAND_BOUNDS` pattern —
equality made structural rather than intended.

`business_confidence` now reads **exactly 60.000000000** at rest. Guarded in
`steady-state.test.js` against BOTH gauges, because `consumer_confidence`
agreeing with its own declaration is the control that made the 48 legible;
plus the structural fact underneath, `user_cost == user_cost_ss` at rest.
Verified to fire — restoring the old comparison reports *"business_confidence
is declared 60 and reads 48.000000"*.

**Behaviour-neutral everywhere else, measured:** six scenarios × 96 months × 22
fields hash `7e517207065edb1c` before and after. Investment is bit-identical.

**Found on the way:** `docs/01` gave `user_cost` a default of **8.5%** — the
pre-5.7 depreciation rate, in a LIVING document. The whole column was checked
rather than the one row: **98 numeric defaults, 5 disagree, 4 of them
legitimate rounding** (`tfp` 0.68 vs 0.6799943, `labour_productivity` 1.05 vs
1.0526, `apc_ss` 0.709 vs 0.70927, `velocity_v0` 0.015 vs 0.014816). One real
staleness and four false positives, so no guard was built — the same arithmetic
that made 5.12 reject its sweep.

### B8. Two monetary validation targets were measured on ONE arm of a deliberately asymmetric channel — `FIXED in 5.14`, and this entry named the wrong mechanism
`MONETARY_ASYMMETRY_RATIO = 1.5` makes cuts transmit at 1/1.5 of hikes, on
purpose and with a source. Both monetary validation tests shock the model with
a **hike** and negate. Measured on both arms:

| target | published | hike arm (the test) | cut arm |
|---|---|---|---|
| `RATE_TO_OUTPUT` @12m | 0.2–0.6 | 0.4154 | 0.3074 |
| `RATE_TO_INFLATION` @24m | 0.2–0.4 | **0.0795** | **0.2230** |

```
node --test test/validation.test.js 2>&1 | grep "literature 0.2-0.4"
```

**For `RATE_TO_INFLATION` the choice of arm decides the verdict**: the hike arm
is a fifth of the published floor and the cut arm is inside the band.
`RATE_TO_OUTPUT` passes either way, so nobody had reason to look.

**This is not licence to switch arms** — that would be tuning to pass, and the
hike arm's shortfall is real. But the published estimates are generally
identified across both directions, so comparing a one-sided model measurement
against a two-sided estimate is not like-for-like, and the `todo` should say so
rather than reporting a single number. Recorded in the message; the right fix
is to measure the average of the two arms and state the asymmetry separately.
Related to A2: the hike arm is the weak-response direction, so this is the
demand-block finding showing up in the measurement protocol.

**FIXED in 5.14 — AND THE SENTENCE ABOVE ABOUT `monetaryEasingScale` IS
WRONG.** Both targets now measure both arms and assert the AVERAGE, reporting
each arm and their ratio. `RATE_TO_OUTPUT` averages **0.3614** (inside 0.2–0.6,
as it was on either arm). `RATE_TO_INFLATION` averages **0.1513** against
0.2–0.4 — **still a `todo`**, which is the point: averaging removes the arm as
the decider and does not close the gap.

**THE ARMS DO NOT DIFFER BECAUSE OF `monetaryEasingScale`.** This entry and the
test message both said so. Sweeping the starting gap:

| starting gap `d` | −6 | −4 | −2 | **0** | +2 |
|---|---|---|---|---|---|
| hike / cut | 1.138 | 1.000 | 1.115 | **0.357** | 0.984 |

The asymmetry exists at **exactly one starting point**, and the validation
harness settles to it. Isolated by making the kink unreachable:

```
WAGE_PC_KINK = 5 :  hike 0.0795 / cut 0.2230 / ratio 0.357
WAGE_PC_KINK = 0 :  hike 0.0795 / cut 0.0616 / ratio 1.292
```

The hike arm does not move by a single digit — it never reaches the kink — and
the cut arm collapses, flipping the asymmetry into the direction
`monetaryEasingScale` actually implies, cuts WEAKER. **So the cut arm's 0.2230
is one kink crossing:** it is the only arm that goes from below potential to
above it, taking unemployment under `WAGE_PC_KINK` and onto the steep branch of
the wage curve. `docs/11` §3 already records that the gap-zero row shows more
inflation than its neighbours for EVERY lever, for this reason.

**This entry warned that switching arms would be tuning to pass. It would have
been worse than that** — it would have reported a kink crossing as the model's
response to easing. The warning was right and its reason was not.

The mechanism is pinned by a hard test rather than a sentence: it asserts the
hike arm does not move when the kink is removed, and that the kink explains
more than 80% of the gap between the arms. Measured **113%**. Verified to fire.

`RATE_TO_OUTPUT`'s asymmetry is the genuine one — **1.351 with the kink, 1.361
without**, against a declared 1.5, because `MONETARY_ASYMMETRY_RATIO` scales
the easing channel while the other routes from the rate to output are
symmetric.

Across horizons the two-armed average runs **0.0704 / 0.1513 / 0.2170 /
0.2722** at 12 / 24 / 36 / 48 months, entering the published band at three
years — 4.4's "the window is doing as much of the disagreement as the model
is", now measured on both sides. The residual is still A2.

### B6. `debt_trap` was already fragile before 5.1 touched it — `OPEN`
While measuring the D1 revert, two of `debt_trap`'s own tests were seen to sit
on very thin margins — *"the real economy responds to the yield at all"* passed
on an output gap of 0.63 and failed at −0.11 under a change that was not aimed
at it. A scenario whose central claim survives on a tenth of a percentage point
is one that will keep breaking. Worth re-deriving its vector deliberately rather
than discovering it again. Related to 4.3's scenario sweep, which passed it.

---

## C. Deliberate omissions — decided against, with reasons

### C1. Forward guidance / expectations — `DELIBERATE`, and the case has changed
Still deferred per the plan, **but the reason it was deferred is gone.**
`docs/12` deferred it as "decoration on a defect"; Phase 2 removed that defect.
Two of the four historical episodes now point at this same missing mechanism
**from opposite directions** — US 2021-23's credibility collapsing to 0.000 on
realised misses, and Japan's inability to de-anchor *downward*. That agreement
is new. It is now the largest single thing missing from the monetary block.

### C3. Three starting-vector fields are carried, documented and read by nothing — `DELIBERATE`
5.6 was asked to wire or defer two dead `START` fields and **measured four**.
`gdp_growth_annual` was wired; the other three are deferred, each for a reason
that is about the model not existing rather than about effort:

| field | deferred to | why |
|---|---|---|
| `participation` | **6.4** (demographics) | it is a share of a working-age population and the model has no population, so there is nothing for 63% to be 63% of |
| `current_account` | the open economy | no task, no phase — decision A5 in `docs/00` |
| `fx_change` | the open economy | same |

**They cannot go quietly dead**, which is the part that matters: 5.6 added a
`START_DEFERRED` register enforced in BOTH directions by `test/params.test.js`,
exactly as `DEFERRED` and `SOLVED_FROM_MODEL` are. Nothing may sit unread in
`START` without being listed, and nothing may be listed while something reads
it. Before that register, `DEFERRED` covered `P` entries and **nothing covered
`START`**, so a field could be carried, documented and read by nothing with no
test noticing — which is how these three survived.

Recorded here because they appear nowhere else in this file: two of the three
have no task and no phase, so the coverage invariant in `TASKS.md` cannot see
them.

### C2. `CRISIS_SCAR_AMPLIFICATION` not re-solved — `DELIBERATE`
It re-solves to 1.06–1.26, outside its published [2.0, 4.5]. Forcing it there
would make the exogenous capacity cut supply 9.5 of Cerra-Saxena's 10 while the
model supplies almost nothing — destroying the deconvolution the constant exists
to be, and imposing the observed reduced form as a structural input. **The
refusal is the finding**, and it is A2. Re-solve when the demand block is fixed,
not before.

---

## D. Things I changed that a later phase must re-verify

### D1. The rate ceiling of 50 predated the Phase 3 fix — `CLOSED in 5.9, and 50 survived`
2.4 derived `max: 50` as a fixed point over 360 runs with events on, **before**
3.1 removed the wealth-channel overshoot. Re-run on the current model — six
scenarios x 60 seeds, events ON, recording what the rule ASKS for rather than
what it gets, since `s.dial_truncated` is cleared at the end of the tick:

| ceiling | p90 request | p99 | max | runs out of control at m96 |
|---|---|---|---|---|
| 20 | 22.1 | 153.1 | 165.3 | 41/360 |
| 25 | 25.6 | 139.2 | 157.3 | 17/360 |
| 30 | 26.9 | 117.5 | 156.2 | 9/360 |
| 35 | 26.9 | 37.0 | 118.8 | 3/360 |
| 40 | 26.9 | 41.2 | 82.8 | 1/360 |
| **50** | 26.9 | 44.5 | **51.4** | **0/360** |
| 60 | 26.9 | 44.5 | 56.2 | 0/360 |

**Same shape as 2.4's table, same answer, and tails an order of magnitude
smaller** — the max request at a ceiling of 20 was 13117.6 and is 165.3, which
is Phase 3 plus 5.7 and 5.8. 50 is still the lowest ceiling at which no run
ends out of control and the request distribution has converged by then; 60
still buys nothing. The residual moved slightly and is stated: the single worst
event sequence now asks for **51.4%**, so it is refused by 1.4pp once in 360
runs, against 50.7% and 0.7pp before.

Without events the requirement reproduces 2.4's almost exactly: the six
scenarios are **bit-identical at any ceiling from 28 up**, the rule is never
refused above **26.92**, and `stagflation` stabilises between **20.00 and
20.25** (inflation at m96 goes 22.65 → 8.70 across that quarter point).

**This entry's own estimate was slightly wrong.** It said the threshold moved
to "18–20"; measured, it is 20.00–20.25, and 2.4's 21.13 moved down rather than
into the teens. The A2 finding is intact — the rule is still refused 86/96
months at a ceiling of 20 against 0/96 at 50, and `stagflation` still ends at
22.65% against 3.16%.

```
node --test test/autopilot.test.js 2>&1 | grep "by ceiling"
```

### D2. Two bounds were stated twice — `FIXED in 5.10, and it was THREE copies`
`updateConsumption` clamped to `[10, 95]` and `invariants.js` check 8 asserted
the same band; `updateInvestment` clamped to `[2, 45]` and check 8 asserted that
too. **This entry missed a third: the `govt_spending` dial's own `min: 0,
max: 70` is check 8's `govt_purchases` band**, because `govt_purchases` tracks
that dial.

Each copy carried a comment saying the numbers were "taken from the invariant
so there is one source" — **a description of intent with no mechanism behind
it.** All three now read `DEMAND_BOUNDS`, exported from `invariants.js`.

**Why it is not tidiness.** If a rule's clamp is ever WIDER than the invariant
that checks it, the rule produces a value the invariant rejects and the model
throws on a state it generated itself. If it is NARROWER, the invariant can
never fire and the saturation it exists to catch is invisible. Equality is the
only safe relation, and it is now structural rather than aspirational.

Guarded by a test that exercises it rather than restating it: `stagflation`
pins investment against its ceiling for **51 of 96 months** with invariants
checked every tick. Both drift modes verified to fire — a wider rule clamp
throws `investment = 45.050 outside [2, 45] at tick 46`, and a dial ceiling
moved to 80 fails the equality directly.

**`tax_rate`'s dial also runs 0-70 and is deliberately NOT wired to this.** It
is a different quantity that coincides on a number, and merging them because
they look alike is the class of error B2 and 5.5 both were.

### D5. `stagflation` under the Taylor rule now ends OVERHEATING### D5. `stagflation` under the Taylor rule now ends OVERHEATING, not GOLDILOCKS — `WATCH`
5.8 gave the long yield an expected-inflation leg, so the state borrows at a
higher rate through a disinflation. At month 96 the rule-following arm now
reads **OVERHEATING at 3.2%** where it read GOLDILOCKS at 2.9%, with debt
120% against 128%.

**The lesson is intact and this is a slower win, not a loss** — the unattended
arm hyperinflates at 673%. But the regime LABEL is what the player reads, and
"the benchmark central bank ends the term still overheating" is a different
sentence from "the benchmark wins". Worth deciding deliberately rather than
discovering: it lands in **5.9**, which re-derives the rate ceiling, and in
`docs/11` §5, which is already updated.

### D4. `PRIVATE_DEBT_REPRICING_YEARS` is one number for a ten-fold spread — `WATCH`
5.2's parameter is 3.0 years with a range of [1, 8] that is deliberately the
CROSS-COUNTRY spread, not an estimation interval: a sweep over it is a sweep
over "which country is this". Two consequences a later phase should not
rediscover.

**It is asymmetric in reality and one speed cannot carry that.** US-style
prepayable fixed mortgages reprice fast when rates FALL (refinancing) and not
at all when they rise (lock-in). Same shape as B4's single
`ASSET_PRICE_MEANREVERSION` serving two asset legs.

**It is now the largest single lever on how much a hiking cycle hurts**, and
nothing in the game surfaces it. Measured, a 3pp hike's default-rate response
at 12 months: 0.457pp at 1 year of repricing, 0.234 at 3, 0.141 at 8.
`test/validation.test.js` compares 3 years against instant repricing but does
NOT sweep the range; 7.1's Monte Carlo should.

### D3. The trace tolerance is now relative above 1e6 — `WATCH`
Was an absolute 1e-6, which fired on floating-point cancellation rather than on
a bug when terms reach ~1e17. Now `max(1e-6, 1e-12 × scale)` — identical below
1e6, so no strictness is lost anywhere real. Verified against six cases
including three genuine mismatches. Flagged only because relaxing a guard is the
kind of change that deserves a second reader.

---

## E. Process and tooling hazards

### E1. `npm run params` could emit a `params.js` that did not match `parameters.py` — `FIXED`
The worst thing found in this pass, and it was found by accident. Python
validates its bytecode cache on the source's mtime **in whole seconds**, so two
edits to `parameters.py` inside one second leave a stale `.pyc` that looks
valid. Measured: a parameter restored from a backup one second after being
edited produced a `params.js` still carrying the *edited* value, and the entire
suite ran green against numbers that existed in no source file.

Fixed with `sys.dont_write_bytecode` in `tools/gen_params.py` and verified
against the repro. **Recorded because the class matters**: this project's whole
claim is that `parameters.py` is the authority, and for an unknown period any
generated artefact could silently disagree with it. Earlier passes' measurements
were taken on a tree with this hazard live.

### E2. `npm run check` and `npm test` had drifted apart — `FIXED`
`test` gained `build --check` and `cause-effect --check`; `check` did not, so
the command whose name promises the most was checking the least. Now aligned.

### E10. The `SOLVED_FROM_MODEL` register's only guard lived inside a failing `todo` — `FIXED in 5.18`
Found by checking whether the other guards had E9's shape, and one did.

The register's own header says its constants **"must be RE-SOLVED whenever the
model changes"**. Nothing enforced it. The only check on
`CRISIS_IMPULSE_AMPLIFICATION` sat in `THE DECONVOLUTION CONSTANTS ARE
MEASUREMENTS`, which **fails by design** because of its other half —
`CRISIS_SCAR_AMPLIFICATION`, deliberately left unsolved (C2). So the constant
that IS supposed to be re-solved and IS supposed to reconcile could drift
arbitrarily far, and the result read `not ok … # TODO` before and after,
character for character.

**It is not hypothetical.** 5.7 fixed the capital law of motion, which moved
the trend the trough is measured against and took the realised amplification to
**2.1155 against a declared 2.1855**. It was re-solved to 2.0461 only because
the register was read and remembered — which is precisely the failure mode a
register exists to remove, and the same shape as the fingerprint that could be
defeated by `--stamp`.

Split: the impulse assertion is now its own **hard** test, so drift reports;
only the scar half stays `todo`. Verified — setting the constant to 2.4461
fails it.

```
node --test test/crisis.test.js 2>&1 | grep "SOLVED_FROM_MODEL"
```

**The test cannot fail on magnitude** — the constant is defined as whatever
makes the trough equal `CRISIS_OUTPUT_TROUGH` — and that is the point. It is a
CONSISTENCY check, and a consistency check that cannot report inconsistency is
furniture.

**THE CLASS IS THE FINDING, and it was three deep.** A guard read as answering
one question while structurally answering another: `docs/11`'s fingerprint
(E9), this register (E10), and `s.dial_truncated`'s "both paths have to work"
(E7).

**THE REST OF THE ESTATE WAS THEN INTERROGATED WITH THE SAME QUESTION — *what
would have to be true for this to pass while the thing it guards is broken?* —
AND ALL OF IT FIRES.** Each was broken deliberately and the guard checked:

| guard | broken by | fires |
|---|---|---|
| lint (a) undeclared state field | a rule reads `s.a_field_that_does_not_exist` | ✅ |
| lint (b) `Math.random` in `src/` | one call added | ✅ |
| lint (c) bare `/ 12` outside `units.js` | one divisor added | ✅ |
| lint (d) a rule assigns a transmitted driver | `s.policy_rate_demand = 1` | ✅ |
| lint (e) a rule reads a dial unmarked | `s.policy_rate * 2` | ✅ |
| lint (f) undeclared literal | all three modes, 5.3 | ✅ |
| `build --check` | one character edited into `index.html` | ✅ |
| `docs.test.js`, both directions | a new undocumented field; a doc entry for a deleted field | ✅ |
| `DEFERRED`, both directions | 5.5 | ✅ |
| `START_DEFERRED`, both directions | 5.6 | ✅ |
| `CONFLICTS` | a rule made to read `ENERGY_TO_CPI` | ✅ |
| `cause-effect --check` tables | a falsified cell, before and after `--stamp` | ✅ |

So the three failures above are the whole of it, and the estate is otherwise
sound. **What remains uncovered is not a broken guard but an absent one: the
numbers quoted in PROSE (E4).** Every stale-number defect this audit found was
in prose, and nothing checks prose.

> **AND A THIRD QUESTION, WHICH E15 CAME THROUGH [11.2].** Every row asks *does
> this guard fire?* and the note below adds *does it cover what it appears to
> cover?* Lint check (a) passes both: it fires on an injected undeclared field,
> and it walks every rule file. **Its declared-set was wrong** — it counted
> `s.field === x` as a declaration of `field`, so a field the model only ever
> compared was declared by the act of reading it. No firing test can reveal
> that, because the guard fires correctly on every input it classifies
> correctly. **So: does it fire, does it cover the target, and IS ITS OWN INPUT
> RIGHT?** The third is the one that needs the guard's subject exercised rather
> than the guard inspected — E15 was found by using `labour_hoarding_policy`,
> not by reading `lint.mjs`.

> **THE INTERROGATION ABOVE ASKED ONE QUESTION AND NOT THE OTHER, AND E12 CAME
> THROUGH THE GAP.** Every row asks *does this guard fire?* — break the thing,
> watch it go red. The last row is `cause-effect --check` and it fires
> perfectly, on a falsified cell, before and after `--stamp`. What no row asks
> is *does this guard cover what it appears to cover?* The table check fired on
> every cell it knew about and knew about seven of docs/11's twelve blocks, so
> the honest entry in that row would have been **✅ for §2 and §4, and nothing
> at all for §1, §3, §5 and §6**. A guard can be perfectly sound and still be
> pointed at part of the target. **Both questions have to be asked of every
> guard**, and the second one is now the reason `cause-effect --check` prints
> its coverage — 7 fenced tables and 453 cells across 21 pipe tables — instead
> of a bare count of what it happens to have been given.

### E13. `docs/11`'s `debt_trap` policy table had no producer, and a row's OUTCOME had flipped — `FIXED in 5.21`
The one numeric block E12 did not close, because it is the one block no tool
produces. Five rows measured for `docs/12`, pasted into §5, and flagged in
place as *"NOT re-measured against the fourth audit's model"* — with the caveat
that *"the do-nothing row alone has moved"*. **Four of the five have moved, and
`rate to the floor` no longer survives.**

Re-run with the convention the rest of §5 uses — no events, policy applied at
month 0, endings on, 96 months:

| policy | doc: debt m48 | measured | doc: outcome | measured |
|---|---|---|---|---|
| nothing | 175 | **174** | DEBT CRISIS m71 | DEBT CRISIS **m73** |
| austerity, tax +4pp | 165 | **163** | DEBT CRISIS m82 | DEBT CRISIS **m86** |
| rate to the floor | 157 | **165** | **survives**, 5.1% inflation, +6.8 gap | **DEBT CRISIS m95** |
| both | 150 | **156** | survives, inflation 2.3, gap +0.8 | survives, **inflation 1.2, gap −5.9** |
| both, plus 30% QE | 144 | **154** | survives, debt back to **127** by m96 | survives, debt **172** |

**The flip is not a methodology artefact.** `docs/12` never recorded the
experiment, so it was re-run under every natural reading of "rate to the
floor", and all of them end in a debt crisis:

| floor | applied | outcome |
|---|---|---|
| −0.75 (the dial's min) | m0 / m1 | DEBT CRISIS m95 |
| −0.75 | m6 | DEBT CRISIS m90 |
| 0 | m0 / m1 | DEBT CRISIS m87 |
| 0 | m6 | DEBT CRISIS m85 |

With events ON it is seed-dependent — 4 of 5 seeds survive — but the rest of §5
is measured with events OFF, so the deterministic reading is the like-for-like
one and it is unanimous.

**THE PROSE UNDER THE TABLE IS THE PART THAT MISLEADS.** It says *"Cutting the
cost of the debt alone works but you inflate your way there and everyone can
see it."* Measured, cutting the rate alone **does not work**, and inflation at
m96 is **1.9%**, not the 5.1% the row claims. The ordering has also swapped
between the two middle rows: austerity now leaves less debt at m48 (163) than
rate-to-the-floor (165), where the document has 165 against 157.

**The headline lesson survives and is stronger.** *"You cannot consolidate your
way out … the answer is both"* still holds — both singles now fail and only the
combinations survive. That is why this is a document defect rather than a model
finding: the conclusion is right and every number under it is wrong.

**THE REAL DEFECT IS THAT IT HAS NO PRODUCER.** Every other number in docs/11
comes from `tools/cause-effect.mjs` and is now checked cell by cell (E12). This
one was measured by hand for a previous audit, has no recorded experiment, and
therefore cannot be re-run by anybody who was not there. **A number with no
reproduction is the thing this document exists to not contain.** Task 5.21
gives it a section in the tool so it is generated and checked like the rest.

**FIXED in 5.21.** `tools/cause-effect.mjs` gained a `policy` section that
states the experiment and measures all five rows; the table in §5 is now a
fenced block, rewritten by `--write` and checked by `--check` like §2's and
§4's. The document's own flag — *"has NOT been re-measured"* — is gone, because
it is now re-measured on every `npm test`.

```
node tools/cause-effect.mjs policy
```

The prose was rewritten with it: *"cutting the cost of the debt alone works"*
became **"you cannot consolidate your way out, and you cannot cheapen your way
out either"**, which is what the rows now say. Austerity alone buys 13 months,
rate-to-the-floor 22, and only the combinations survive — the surviving economy
is still at a −5.9 gap with debt at 184% after eight years. Falsification
verified to fire before and after `--stamp`, and repaired by `--write`.

**The fingerprint moved `8f20248ce93b453a → f1a8588676b42adf`** and the number
count 1464 → **1484**, because the section is new measurement rather than a
correction to old measurement.

### E9. `docs/11`'s fingerprint could be defeated by running `--stamp` — `FIXED in 5.17`
The tripwire hashed **the model's measurements**, not **the document's
contents**, so it answered *"has the model moved since someone last stamped?"*
and not *"does this document contain the model's numbers?"* Falsifying a table
cell and running `--stamp` left `--check` perfectly happy.

**That is exactly how the document stayed stale through a HARD GATE.** 4.3
regenerated §2, stamped, and `--check` was green for the rest of the audit
while §1's kernel table still described the pre-2.1 model and §5 still said the
Taylor rule loses `stagflation` (Correction 13b). The guard worked as built and
could not have caught any of it.

The tool's comment weighed two options — fingerprint versus generating the
whole file — and picked the fingerprint because *"most of docs/11's value is
the prose"*. That reasoning was right and is kept. **The third option it did
not consider is what shipped: CHECK the tables, leave the prose.**

`--check` now verifies all seven pasted tables cell by cell, and `--write`
rewrites the six that are verbatim tool output and re-stamps — replacing the
throwaway scratchpad script the splicing had been done with. §4's is checked
but not written, because its header is hand-widened for readability; the
comparison is on NUMBERS, which is what goes stale, not on formatting, which is
the document's own business.

Both defeats verified to fire after the fix:

```
sed -i 's/48 |  +1.03 |/48 |  +9.99 |/' docs/11-cause-and-effect.md
node tools/cause-effect.mjs --stamp && node tools/cause-effect.mjs --check   # now FAILS
node tools/cause-effect.mjs --write                                          # repairs it
```

**WHAT IS STILL UNCOVERED, and it is the same gap E4 names:** the numbers
quoted inline in §2's chains and throughout §5 and §7 are prose. Nothing checks
them. Every stale-number defect this audit found was in prose.

> **AND THE SENTENCE ABOVE UNDERSTATED IT BY FIVE TABLES.** "All seven pasted
> tables" meant all seven ***fenced*** tables. docs/11 has **twelve** measured
> blocks; the other five are markdown pipe tables and were not prose. They were
> uncovered, and three of them were stale. See **E12**, found in the Phase 5
> handoff verification.

### E12. The table check covered the FENCED tables, and docs/11 has five more — `FIXED in 5.20`
Found by taking the handover's instruction literally — *falsify a cell in
`docs/11` and confirm `--check` fails* — and picking a cell in §3 rather than
in §2. **It did not fail.** `--stamp` then re-blessed the falsified document
and `--check` passed again, which is **E9 exactly, unchanged**, in the tables
E9's fix did not reach.

```
sed -i 's/| −3.98% | +2.05 |/| −3.98% | +9.99 |/' docs/11-cause-and-effect.md
node tools/cause-effect.mjs --check     # passed
node tools/cause-effect.mjs --stamp
node tools/cause-effect.mjs --check     # passed again
```

**The scope decision was the defect, not the mechanism.** 5.17 enumerated the
blocks to check as the ones inside ``` fences — §2's six dial tables and §4 —
and reported *"7 tables verified"*, which reads as *docs/11's tables are
verified* and means *seven of its twelve are*. The other five are markdown pipe
tables: §1's kernel and response tables, §3's three state-dependence tables,
§5's six preset paths and §6's shock table. Nothing checked any of them, and
the fingerprint cannot — it hashes the MODEL, so it is silent whenever the
model sits still and the document drifts, which is precisely what happened.

**IT WAS NOT HYPOTHETICAL: 58 CELLS WERE STALE.** The fingerprint
(`8f20248ce93b453a`) was correct and unmoved the whole time.

| block | stale cells | moved by |
|---|---|---|
| §1 response table | **19** | 5.7's capital-units fix |
| §5 `overheating` / `recession` / `stagflation` / `debt_trap` / `bubble` | **31** | 5.7, and 5.8's long yield feeding the interest bill |
| §6 productivity boom and FINANCIAL CRISIS | **8** | 5.7 |
| §1 kernel, §3's three tables | 0 | — |

**The worst of them is a document that contradicts itself four lines apart.**
§5's `stagflation` table said the Taylor arm ends **GOLDILOCKS at 2.9%**; the
prose immediately below it said *"at month 96 the regime box still reads
OVERHEATING at 3.2%"*. Both were written in 5.8. The prose was updated because
somebody read it; the table was not, because nothing did. It is now `OVERH −1.3
/ 3.2 / 7.0 / 120 / 45`, and the two agree.

**THE FIX IS PER-CELL, NOT PER-TABLE, AND THAT IS THE DESIGN POINT.** These
five cannot simply be fenced and pasted: §5 shows 4–6 of the tool's rows and
drops the credit gap where it is not the point, §6 names only the fields worth
naming per shock, §3's `money_printed` drops a column. That shaping is the
document's job — §4's precedent already says *numbers* go stale and
*formatting* is the document's business. So `docCells()` parses docs/11's own
formats and, for every cell the document chooses to show, requires the model's
value for that cell. **The document decides what to say; the model decides what
the numbers are.** `--write` splices the model's value over the stale number
and leaves the bold, the `cg` prefixes and the `→ HYPERINFLATION` tails intact.

`identical` and `same` in §5 are checked as what they are — a claim that the
two arms agree at that month — rather than skipped as prose.

**COVERAGE IS NOW DECLARED, BECAUSE AN UNPARSED CELL DISAGREES WITH NOTHING.**
The obvious way for this guard to fail is for the parser to stop matching, and
a silent parse reports clean — the same shape as E9, E10 and E7. So
`PIPE_BLOCKS` lists the 21 blocks the document is expected to state and
`PIPE_CELLS` records the 453 cells found under them; a missing block is named,
and a changed count says which number to paste in if the edit was deliberate.
`--check` now reports *"7 fenced tables and 453 cells across 21 pipe tables
verified"* rather than a bare table count.

**Nine failure modes verified to fire, each broken deliberately and restored**
— a §1 response cell, a §1 kernel cell, a §3 cell, a §5 number, a §5 REGIME
word, a §5 `same` where the arms no longer agree, a §6 cell, a §5 heading
renamed so a whole table stops parsing, and a single row silenced. None can be
blessed by `--stamp`. **The sixth of those did not fire on the first attempt**
— the mirror check derived the month key as `96mm` and so compared nothing —
which is this entry's own defect one level up, and is why the list is nine and
not seven.

**STILL UNCOVERED, and now it really is only prose (E4 / 5.12):** four prose
sentences restated cells this task repaired and were corrected with them
(`overheating`'s "4pp higher than the do-nothing arm" → 3pp, `recession`'s 96m
gap and credit gap, `bubble`'s "debt falls from 100 to 72" → 74). Nothing
found those but reading; that is exactly what 5.12 is for.

### E8. `TEST-RESULTS.md` was never byte-stable, and carried a hand-typed count — `FIXED in 5.16`
Found when checking whether the committed artefact matched a fresh run, for the
purpose it exists for: handing the audit record to someone else.

**It matched, and it did not.** Regenerating on an idle machine produced **334
differing lines and not one of them was a measurement** — every one was a
`duration_ms` wall-clock timing pasted in with the raw TAP stream. For an
artefact whose whole job is to be COMPARED ACROSS PASSES, that means you cannot
tell *the model moved* from *the machine was busy* by diffing it, and every
regeneration dirties the working tree for nothing.

Stripped, in both forms. The first fix caught only the per-test
`  duration_ms: 3.94` and missed the summary `# duration_ms 845.7`, leaving the
file stable except for one line — **worse than unstable, because it looks
stable until you diff it.** Verified byte-identical across two consecutive
runs.

**And the header carried a hand-typed parameter count.** It read *"~126 sourced
parameters"*; the model has **145**. In the one file whose own header promises
*"the output of running the model, not a description of it"*. Now counted from
`P` and `RULES` at generation time.

```
node tools/report.mjs && cp TEST-RESULTS.md /tmp/a && node tools/report.mjs && diff /tmp/a TEST-RESULTS.md
```

### E7. `s.dial_truncated` is null everywhere anything could read it, and a comment said otherwise — `FIXED in 5.15`
Found by 5.9's re-derivation, which it caught out first. Two halves.

**The claim is false.** `engine.js` says of the truncation record: *"The state
field is what the UI reads on the spot; this is what the why panel reads
afterwards, and both paths have to work."* Measured:

```
node -e "…"   # applyDialChange -> {requested:55, applied:50}; after tick() -> null
```

The field is cleared at the END of the tick — correctly, for the reason V2
established — so it is `null` by the time `tick()` returns and anything outside
the engine could look at it. **Nothing in `src/ui/` or `src/game/` reads it at
all** (grep: the only readers are the engine's own trace note, inside the same
tick, and the tests). So there is one path, not two, and the surviving record
is `dial_truncated_count`, which is cumulative and is not cleared.

This is 8.5's territory — *"make every recorded trace reachable"* already notes
the truncation note is player-facing and currently invisible — but the comment
asserting a UI path that does not exist is the part that will mislead someone.

**And it is a measurement trap that already worked.** Sweeping the rate ceiling
in 5.9 means recording what the rule ASKS for. Reading `s.dial_truncated` after
`advance()` returns gives null, and the natural fallback — read the applied
`s.policy_rate` instead — **silently reports the ceiling as the request**. The
first run of that sweep produced a max request exactly equal to every candidate
ceiling (20.0, 25.0, 30.0 …), which looks plausible and is meaningless. The
correct approach is to wrap the autopilot and record `taylorRate(s)` at source.

Anyone measuring a truncation needs to know this before they start, which is
why it is here and not only in a commit message.

**FIXED in 5.15 — the comment is corrected, and a TEST keeps it corrected.**
Reproduced first: the field holds `{key, requested: 999, applied: 50, at: 0}`
immediately after `applyDialChange` and is **`null` the moment `tick()`
returns**, with `engine.js`'s trace note the only reader anywhere in `src/`.

This entry asked for "the comment or the read, but not neither". **The read is
8.5's job and remains 8.5's job**; `engine.js` now says what is true — one
reader, `dial_truncated_count` as the durable half, and the measurement trap
spelled out with 5.9's sweep as the worked example.

**The structural half is what stops it recurring.** A test walks all of `src/`
and asserts the transient field has exactly THREE sites: `state.js` declares
it, `dials.js` writes it (rule 7 — only `applyDialChange` may apply a bound),
`engine.js` reads it. Anything else fails, and the failure says: *if this is
8.5 adding the UI read, that is the right change — correct `engine.js`'s
comment and delete this test in the same commit.* So the comment and the code
cannot drift apart again, which was the whole complaint.

```
node --test test/autopilot.test.js 2>&1 | grep "transient truncation"
```

Verified to fire by adding a read to `src/ui/app.js`. `dial_truncated_count` is
deliberately NOT covered — the UI reading that is the point of it existing.

### E11. A player-facing gauge held copies FIVE and SIX of a promoted parameter, and named a threshold it did not use — `FIXED in 5.19`
**5.11's scope decision was wrong for this file, one task after making it.**
5.11 classified `game/indicators.js` as "display thresholds and formatting" and
left it out of check (f). Its own header opens *"The band thresholds are
economics"*, which is correct.

Measured, the credit-gap gauge held a bare `3` in **both** its `verdict` and
its `band` — the BIS warning line, i.e. `CREDIT_GAP_WARNING`, which 5.3
promoted after finding three copies in `src/rules/` and 5.11 found a fourth in
`events.js`. **Copies five and six, in the file the player actually looks at.**

**And worse than a copy.** The danger line was hardcoded in player-facing PROSE
as *"PAST THE 9pp DANGER LINE"* and *"9pp is the BIS line"*, while the `band`
beside it read `CREDIT_GAP_CRISIS_THRESHOLD`. Move that parameter and the gauge
would colour itself against the new value and tell the player the old one — a
display disagreeing with its own threshold, which is the `price_level`
invariant's argument aimed at the screen. Same for the inflation gauge's "2% is
the goal" against `SS_INFLATION_TARGET`.

**THE GUARD IS A TEST, NOT A LINT RULE, AND THAT IS THE DECISION WORTH
RECORDING.** The file's other 24 literals are verdict cuts, chart ranges and
trend epsilons — a data table of display bands, like `scenarios.js`. Naming
them all would wreck the one file whose job is legibility, and check (f) would
have caught the 24 that are fine while missing the point. What matters is not
that a number is bare; it is that **a number the model also holds is written
out twice**. So the guard asserts the equality — the 5.10 `DEMAND_BOUNDS`
pattern — by walking the band function across its boundaries and comparing
where it changes against the parameters.

Both failure modes verified: a seventh hardcoded copy is caught
(`turns from ok to warn at 3.500000pp, but CREDIT_GAP_WARNING is 3`), and a
parameter moving while the prose does not is caught (`does not contain 8`).

### E6. Lint check (f) walked `src/rules/` only — `PARTIAL: the two files that decide the player's fate are in`
5.3 took `src/rules/` to zero undeclared literals and left everything else
unpoliced, which is how `leverage_max`'s bare 1.35 survived to be found by 5.5.
**253 sit outside it**, and the breakdown is what the scope decision needed:

| | | | |
|---|---|---|---|
| `ui/chart.js` 53 | `game/scenarios.js` **49** | `game/indicators.js` 42 | `invariants.js` 21 |
| `game/events.js` **16** | `game/dials.js` 12 | `ui/app.js` 10 | `game/session.js` 9 |
| `game/endings.js` **7** | and 34 more across rng, engine, units, state, clock, trace, widgets | | |

**5.11 added `game/endings.js` and `game/events.js`** — the two files where a
bare number decides WHAT HAPPENS TO THE PLAYER, which is 5.3's own stated
priority. 22 literals triaged; all named and labelled `judgement`, none
promoted, and the reasoning is in place: **an ending threshold is a game-design
decision about when the run stops being instructive, not an estimate of
anything in the world.** Putting `inflation > 25` in `parameters.py` with a
range and a citation would dress a design choice as a measurement.

**It found a fourth copy of a number 5.3 had promoted.** `events.js`'s bank
wobble scaled its severity from a bare `3.0` — the BIS warning line, i.e.
`CREDIT_GAP_WARNING`, which 5.3 promoted out of `credit.js` after finding three
copies. This file was outside the check's scope and kept the fourth. Now wired.

**STILL OUT, each for a stated reason** (in `tools/lint.mjs`, so nobody
re-derives it): `ui/*` is presentation; **`game/scenarios.js` is DATA** — six
starting vectors, where flagging every field would be noise and the real guard
is the internal-consistency and regime tests; `game/indicators.js` is display
thresholds; `invariants.js` is almost entirely float tolerances; `game/dials.js`
is player-facing layout; `engine`/`rng`/`units` are algorithmic.

**`test/` is a third scope and is NOT obviously safe to leave out** — 5.7 found
a hardcoded `0.06` in `test/params.test.js` asserting the START vector against
a depreciation rate the model did not use.

### E5. `updateCreditSpread` is two-thirds judgement, and it is inside the rate borrowers pay — `OPEN`
Surfaced by 5.3's literal sweep rather than fixed by it. Four of the six terms
in the credit spread are judgement with no source — the weights on leverage
(0.8), on collateral (0.5), on realised defaults (0.3) and the 30%/month
adjustment speed — against two that are sourced (`CREDIT_SPREAD_UNEMP`,
`BANK_CAPITAL_TO_LOAN_RATE`). They are now labelled rather than bare, which is
all 5.3 promised.

Why it matters more than most judgement blocks: `credit_spread` is a term in
`market_rate`, which is what every private borrower pays, and since 5.2 it also
sets the rate the whole private debt STOCK walks toward. It is the largest
remaining unsourced block in the credit chain.

```
node tools/lint.mjs                       # clean; the labels are in credit.js
grep -n "judgement, the three unsourced" src/rules/credit.js
```
Not chased because promoting them would mean inventing ranges. A Monte Carlo
over the judgement set (7.1) is the honest next step.

### E4. Every generated artefact has a `--check`; every number re-typed into prose has none — `PARTIAL: the register landed in 5.12, two quantities cannot join it`
Found by Phase 5 verification, which turned up **five** stale prose numbers and
**one inverted claim** in one afternoon of re-measuring — see docs/13
Correction 12. The worst was the transmitted Taylor response: `docs/02` calls it
*"the most important single fact about this model's dynamics"*, it has been
**1.96** since 3.1, and the document said 1.83 while `TAYLOR_INFLATION`'s note
said 1.80. Two documents, one measurement, two wrong numbers, past a HARD GATE
whose stated job was to re-measure everything.

`test/transmission.test.js` prints the live value on every run and asserts only
`> 1.0`. **A test that prints a number does not test the number written down
somewhere else.** The three tripwires this pass added — `build --check`,
`cause-effect --check`, `sys.dont_write_bytecode` — cover `index.html`,
`docs/11` and `params.js`. Nothing covers a sentence, and every defect found in
this verification was in a sentence.

Reproduce the class:
```
node --test test/transmission.test.js 2>&1 | grep "stagflation m3"
grep -n "1\.83" docs/02-causal-map.md          # was 1.83
```
Not obviously fixable by a tool: prose numbers have no schema. The cheapest
partial guard would be a convention — quote a number in prose ONLY with the
command that regenerates it beside it — which `open_items.md` already claims to
follow and did not.

**THE TWO OBVIOUS SWEEPS WERE MEASURED BEFORE DESIGNING ANYTHING, AND BOTH ARE
DEAD ENDS.** Recorded so 5.12 does not re-derive them:

| sweep | sites | disagree | verdict |
|---|---|---|---|
| `` `PARAM_NAME` `` followed by a number within 60 chars, all of `docs/` + `README` + `TASKS` + `open_items` | 97 | **55** | unusable — nearly all false positives |
| the same, restricted to the LIVING documents (`01`, `02`, `09`, `11`, `README`) and requiring the number to be adjacent | **1** | 0 | finds nothing |

The 55 are month numbers and history: `` `TAYLOR_INFLATION` `` followed by 48
is *"at m48"*, `` `RATE_TO_INFLATION` `` followed by 24 is *"@24m"*, and
`docs/07`, `08`, `10`, `12` and `13` are dated artefacts that `docs/README`
explicitly permits to describe the past. **A checker that fires 55 times on a
clean tree trains you to ignore it**, which is worse than no checker.

**So the class that actually goes stale is not parameter values — it is
MEASURED QUANTITIES re-typed into prose**, and that is why the heuristic finds
nothing. Every instance this audit caught is one: the transmitted Taylor
response (1.83 / 1.80 against 1.96), A2's sacrifice ratio and
`TAX_SHOCK_TO_GDP` cells, the four `todo` messages `report.mjs` publishes
verbatim, and the four sentences in `docs/11` §5 that 5.20 had to correct
alongside the cells they restate. None of them sits next to a parameter name.

**The shape that does work is already in the tree twice.** 5.19 made a
player-facing gauge interpolate `CREDIT_GAP_WARNING` instead of writing "9pp",
and 5.20 made `docs/11`'s cells checkable by giving every measurement a
declared key. The generalisation for prose is the same move: **a register of
the headline measurements, each naming the files that quote it, with the test
that measures the quantity asserting those files carry the current value.** It
needs no heuristic and has no false positives, because the citation is
declared rather than guessed.

**BUILT IN 5.12 — `test/citations.mjs` — AND IT CAUGHT SIX STALE NUMBERS ON
ITS FIRST RUN.** `citedIn(label, text, sites)`; the anchor must share a line
with the number, which turns the convention this entry asked for into
something enforceable: *a bare number in prose is checkable by nothing and
should not be written*. Three quantities, eight sites:

| quantity | measured | cited in |
|---|---|---|
| transmitted Taylor response | **1.94** | `docs/02`, `TAYLOR_INFLATION`'s note |
| UK 1979-83 sacrifice ratio | **0.36** | A2 above, TASKS Phase 11, its own `todo` |
| `TAX_SHOCK_TO_GDP` measured | **0.484** | A2 above, TASKS Phase 11, its own `todo` |

```
node --test test/episodes.test.js test/validation.test.js test/transmission.test.js
```

**What it found the moment it ran.** `TASKS.md`'s Phase 11 table was the
**pre-5.7 copy of A2's table above** — 0.35 / 0.487 / 3.65 / 46% against
0.36 / 0.484 / 3.82 / 39%. 5.7 re-measured all four cells and updated this
document and not that one: **the same table, in two files, four
disagreements.** And `validation.test.js` **disagreed with itself** — its
`todo` said a tax rise costs 0.487% of output while the assertion three lines
below it printed 0.484, in one test's output, with `report.mjs` publishing the
`todo` verbatim.

**The checks are HARD tests.** Both the sacrifice ratio and `TAX_SHOCK_TO_GDP`
are measured inside `todo`s that fail by design, so a citation check living
there would read `not ok … # TODO` whether the documents were current or not —
**E10 again**, and 5.18's split is the precedent. Each measurement was also
pulled into a single local helper so the `todo` and the citation test compute
it once.

**A missing anchor is a FAILURE, not a skip**, because the way this guard fails
is the anchor silently ceasing to match. Both modes verified.

**WHAT IS STILL OPEN, and it is E14:** two of A2's five cells — endogenous
crisis propagation and the post-crisis rebound — are produced by nothing at
all, so there was no measurement to register them against.

### E15. Lint check (a) counted `s.field === x` as a DECLARATION of `field` — `FIXED in 11.2`
The check exists because docs/07 M11 found ten state fields that rules read and
`newState` never declared, each one a silent NaN. It builds a set of declared
fields by matching `s.<field>\s*=` — **and `===` starts with `=`**, so a field
the model only ever COMPARED was declared by the act of reading it. The check
was disarmed by exactly the syntax it should have been suspicious of.

```
/\bs\.([a-z_][a-z0-9_]*)\s*=/  matches  s.labour_hoarding_policy === false
```

**It had exactly one victim across the whole tree, and it was a real one.**
Measured: `labour_hoarding_policy` is the only field in `src/` matched solely
by a comparison. It is read by `updateEmployment` to disable the Okun hoarding
ramp, **written by nothing**, and documented in `docs/01` as *"Optional
override: `false` disables the Okun hoarding ramp"* — a control with no source,
which is E7's shape, hidden behind a guard hole, which is E9/E10/E12's.

Fixed with `=(?!=)`. Both directions verified: a genuinely undeclared field
still fires, and the comparison-only field fires now and did not before.
`labour_hoarding_policy` is declared `true` in `state.js` rather than deleted,
because switching hoarding off is the only way to isolate the Okun ramp and
11.2's diagnosis needed exactly that. Behaviour-neutral — the read is
`=== false` and `undefined` and `true` both fail it; hash `7e517207065edb1c`
unmoved.

**This is the fifth guard in this audit found answering a different question
from the one it is read as answering** (E7, E9, E10, E12, E15), and the second
found by using the guard's subject rather than by inspecting the guard.

### E14. Two of A2's five cells were quoted four times each and produced by nothing — `FIXED in 5.22`
Found by 5.12 while building the citation register: they could not be
registered, because there was nothing to register them against.

**`endogenous crisis propagation = 3.82` and `post-crisis rebound = 39%` are
computed by no code in this repository.** They are quoted in
`crisis.test.js`'s `todo` messages, in a `params.test.js` comment, in A2's
table above and in `TASKS.md`'s Phase 11 table — four places each — and every
one of them is a copy of a measurement somebody took out-of-band and typed in.

```
grep -rn "3\.82" test/ open_items.md TASKS.md     # four sites, no producer
grep -rn "CRISIS_HYSTERESIS_SCAR.value = " test/   # nothing sets it to 0
```

**This is 5.21's defect, in the audit's most important table.** `debt_trap`'s
policy table was hand-measured for `docs/12`, could not be re-run because its
experiment was never written down, and had drifted four rows and one outcome
by the time anyone looked. These two cells are in the same position, and they
are two of the five sightings that constitute **A2 — the largest finding in
this audit**. The other three are measured by tests and are now registered.

The experiments are named in prose and have to be turned into code:
propagation is measured with `CRISIS_HYSTERESIS_SCAR` set to 0 so there is no
exogenous scar at all; the rebound with the collateral channel and the wealth
effect both switched off. **Do not copy 3.82 or 39% into a test to make it
pass** — measure, and if the measurement disagrees with them, that is the
finding and A2's table moves.

**FIXED in 5.22, AND THEY REPRODUCE.** `endogenousPropagation()` and
`reboundShare()` in `crisis.test.js`, each stating its experiment in its own
header, each a HARD test rather than an addition to the `todo` that quotes it
(E10 again — those `todo`s fail by design):

| | measured | was quoted as |
|---|---|---|
| propagation, `CRISIS_HYSTERESIS_SCAR = 0` | **3.8202%** | 3.82 |
| rebound trough, both amplifiers off | **−6.4266** at m21 | −6.43 |
| …comes back by m120 | **2.4861pp** | 2.49 |
| …share of the trough | **38.68%** | 39% |

**Nothing had drifted, and that is not the point.** `debt_trap`'s policy table
looked fine too, and was wrong in four rows and one outcome. Eight citation
sites are registered, so the next time the demand block moves — which is what
11.1 exists to do — these two cells cannot go quiet.

```
node --test test/crisis.test.js 2>&1 | grep MEASURED
```

### E3. Generated artefacts are gitignored, so staleness is local-only — `WATCH`
`index.html` and `src/params.js` are both generated and both gitignored. That is
the right call, but it means every clone regenerates them and no reviewer ever
sees them in a diff. The two `--check` tripwires exist for this reason; if a
third generated artefact appears, it needs one too.

---

## F. What is carried out of Phase 5

> **THIS SECTION WAS FOUR CLAIMS STALE WHEN IT WAS REWRITTEN**, in the document
> whose header promises *"where a number is quoted it was measured, not read"*.
> It said `5.1 is blocked (A4)` — **Correction 22 overturned that**, A4 was
> never the blocker; `5.2–5.6 untouched` — 5.2 through 5.22 have all shipped;
> `D3's numeric-literal counts have still never been checked` — **5.3 checked
> them and the brief was wrong** (credit 21 not 23, prices 10 not 16, crisis 2
> not 16); and that 4.4's `todo` message *"still carries the old text"*, which
> V6 rewrote. A section describing what is undone is the one place staleness is
> hardest to see, because nothing it claims is testable. It is now the phase
> handoff and should be rewritten at each one.

### 5.1 — the only Phase 5 task that did not ship. `OPEN`, and it cannot close in this phase.

**Built twice, measured twice, reverted twice**, in the third audit's follow-up
and again here on top of 5.8. The mechanism is right, the plan asks for it
(D1), the arithmetic closes the steady state exactly to 9dp, and it is still
not shippable — see **A6** for the diagnosis and the isolating experiment that
refuted the obvious hypothesis, and **B5** for the wiring it carries with it.

**THE IMPLEMENTATION IS IN NO COMMIT.** Both `5.1 …reverted` commits
(`4103920`, `c372597`) touch documentation only — the build was done in the
working tree, measured, and reverted before committing. Do not go looking for
it in the history; there is nothing there. **What survives is the recipe**, and
it survives in four places on purpose:

| | where |
|---|---|
| the arithmetic and why `apc_ss` must fall | **A6** above |
| the bondholder wiring | **B5** above |
| the same recipe travelling with the parameter | `HAND_TO_MOUTH_SHARE`'s `DEFERRED` entry in `parameters.py` |
| the measured before/after | `TASKS.md` 5.1 |

`apc_ss` **0.709265 → 0.692945**; `apc_bondholder = (apc_ss −
HAND_TO_MOUTH_SHARE) / (1 − HAND_TO_MOUTH_SHARE)` = **0.561350**; no new
parameter. A third attempt should rebuild from that rather than re-derive it.

**THE ORDER IS FIXED AND THE REASON IS NOT PREFERENCE.**

```
11.1 (A2)  →  re-derive `overheating`'s starting vector  →  5.1  →  5.5's wiring
```

`apc_ss` is canonical and the interest transfer is not: `overheating` opens
with a coupon of 1.75 against the canonical 3.25, so it takes the lower
propensity with 1.22 of interest instead of 2.275, loses 0.57pp of consumption,
and its opening gap moves +0.2 → −0.44. With the accounting right the demand
block cannot produce the divergence the scenario exists to teach — which is A2,
and which is why 5.1 waits on 11.1 rather than the other way round.

**Do not close it by re-tuning `overheating` to hyperinflate.** That is rule 3
applied to a scenario instead of a coefficient, and it would bury the finding
that motivates the whole of Phase 11. Rule 6 says the same thing from the other
side: that scenario's regime would be **asserted, not driven**.

**When 11.1 lands, `apc_ss` must be re-solved before 5.1 is re-attempted** —
the demand block moving changes the propensity the recipe above was solved
against.

### Everything else Phase 5 deferred, and where it lives

| deferred | entry | task |
|---|---|---|
| `HAND_TO_MOUTH_SHARE`'s wiring | **B5** | rides on 5.1 |
| numbers quoted in PROSE, beyond the three registered in 5.12 | **E4** | 5.12 (partial) |
| lint check (f) outside `src/rules/`, `game/endings.js` and `game/events.js` | **E6** | 5.11 (partial) |
| `updateCreditSpread`'s four unsourced weights, and the wider judgement set | **E5** | 7.4 |
| `participation`, `current_account`, `fx_change` | **C3** | 6.4 / the open economy |
| `CRISIS_SCAR_AMPLIFICATION` | **C2** | 11.3, after 11.1 |

### Phases not started

**6, 7, 8, 9 and 11 are untouched**, and 10 is partial. Phase 6 was unblocked
by the Phase 4 gate and 6.6 by 5.4 — but **read A7 before 6.1**:
`overheating`'s central lesson sits 0.6pp of demand from a bifurcation at
`MAX_CAPACITY_OVERHEAT`, and 6.1's macroprudential dial is calibrated against
scenario paths that move if 11.5 changes that threshold's shape. Doing 6.1
before 11.1 means calibrating a dial twice.

**The two claims `docs/13` Phase 0 flagged as READ, NOT MEASURED are both
settled.** `credit.js:218`'s EMA comment was measured in 3.2 and the brief was
right. D3's numeric-literal counts were measured in 5.3 and **the brief was
wrong** — credit 21 not 23, prices 10 not 16, and crisis **2 not 16**, an
eightfold overstatement.
