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

### A2. The demand block moves too little, and it is one finding seen four ways — `OPEN`
The most important thing in this audit and it is not in the original brief.

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
These are not five findings; they are one, in the demand block, and it is not a
calibration problem. It is why `CRISIS_SCAR_AMPLIFICATION` could not be
re-solved (see C2), **and since A6 it is a blocker for a Phase 5 task rather
than a candidate for the next pass.**

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

Re-stamped at `86c1b104fab5561d`. The remaining known-unverified block is
**`debt_trap`'s five-row policy table in §5**, which was measured for `docs/12`
and is flagged in place as not re-run — the do-nothing row alone has moved
(ending month 71 → 73).

### B2. `debt_trap` overflows `govt_debt` to Infinity at month 191 — `DELIBERATE`
After reaching 7.27e+189. Verified identical before and after Phase 3, so it is
not new. It is the *declared* `debt_service_spiral` plus double precision giving
out, 117 months after the debt-crisis ending would have ended a real game at
month 74. Skipped explicitly in the conservation sweep with the reason attached.
Only worth attention if endings are ever disabled in a shipped configuration.

### B3. Unemployment does not follow output down in a crash — `OPEN`
The crash trough is now **exactly** on target (−9.0000% against
`CRISIS_OUTPUT_TROUGH`) while unemployment peaks at **+1.86pp against a
published 2–5**. So the output hole is the right depth and the labour market
does not follow it into it. That is Okun, and it is probably the same finding as
A2 seen from the labour side. `TEST-RESULTS.md` OPEN on the output→employment
lag is related.

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
It went back on the shelf only because it rides on 5.1, which A4 blocks. **When
A4 lands, 5.5 gets this for free.** Do not invent a different wiring.

**5.5 HAS NOW RUN, and it made the deferral honest rather than accidental.**
The parameter was read in exactly one place — `consumption.js:104`, inside
`trace.record`'s extras — so the DEFERRED register's grep called it wired while
it did no work. The register now paren-matches `trace.record(...)` and
`trace.note(...)` out of the source before deciding, and `HAND_TO_MOUTH_SHARE`
is **the only parameter in the model that read solely inside a trace**, so the
tightening caught what it was aimed at and nothing else. The recipe above is
copied verbatim into its `DEFERRED` entry, so it travels with the parameter
rather than only with this file.

### B7. `business_confidence` compares a user cost against a real interest rate — `OPEN`, and 8.10 would ship it
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

### B8. Two monetary validation targets are measured on ONE arm of a deliberately asymmetric channel — `OPEN`
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

### C2. `CRISIS_SCAR_AMPLIFICATION` not re-solved — `DELIBERATE`
It re-solves to 1.06–1.26, outside its published [2.0, 4.5]. Forcing it there
would make the exogenous capacity cut supply 9.5 of Cerra-Saxena's 10 while the
model supplies almost nothing — destroying the deconvolution the constant exists
to be, and imposing the observed reduced form as a structural input. **The
refusal is the finding**, and it is A2. Re-solve when the demand block is fixed,
not before.

---

## D. Things I changed that a later phase must re-verify

### D1. The rate ceiling of 50 predates the Phase 3 fix — `WATCH`
2.4 derived `max: 50` as a fixed point over 360 runs with events on. That was
measured **before** 3.1 removed the wealth-channel overshoot, and the model is
now much less explosive: at a ceiling of 20 the Taylor rule *survives*
stagflation (5.49% at m96) where it used to reach 1020.91%. The A2 finding
survives — the threshold moved from 20–25 to **18–20**, and the rule is still
refused 39/96 months at 20 against 0/96 at 50 — but **the derivation itself
should be re-run.** Noted in `test/autopilot.test.js`.

### D2. Two bounds are stated twice — `WATCH`
`updateConsumption` clamps to `[10, 95]` and `invariants.js` check 8 asserts the
same band; `updateInvestment` clamps to `[2, 45]` and check 8 asserts that too.
Deliberate belt-and-braces, and the numbers were deliberately taken from the
invariant so there is one source. But they are still two copies: **move one and
the other must move.** A candidate for Phase 5.3's literal sweep.

### D5. `stagflation` under the Taylor rule now ends OVERHEATING, not GOLDILOCKS — `WATCH`
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

### E6. Lint check (f) walks `src/rules/` only, and 254 literals sit outside it — `OPEN`
5.3 took `src/rules/` from 71 undeclared numeric literals to zero. Everywhere
else in `src/` is unpoliced, and that is how `leverage_max`'s bare `1.35`
survived to be found by 5.5 instead:

```
node tools/lint.mjs      # clean — and it never looks at src/game/ or src/ui/
```

| file | literals |
|---|---|
| `src/ui/chart.js` | 53 |
| `src/game/scenarios.js` | **49** |
| `src/game/indicators.js` | 42 |
| `src/invariants.js` | **21** |
| `src/game/events.js` | 16 |
| `src/game/dials.js` | 13 |
| everything else | 60 |

Most of `ui/` is presentation and does not want a source. **The two that
matter are `scenarios.js` and `invariants.js`**: the first is DATA the model is
calibrated against and whose vectors 4.3 had to re-derive, and the second holds
the bounds that `updateConsumption` and `updateInvestment` deliberately
duplicate (D2). `game/events.js` and `game/endings.js` decide what happens to
the player. Extending the check needs a scope decision — probably `src/game/`
in and `src/ui/` out — and a triage the size of 5.3's.

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

### E4. Every generated artefact has a `--check`; every number re-typed into prose has none — `OPEN`
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

### E3. Generated artefacts are gitignored, so staleness is local-only — `WATCH`
`index.html` and `src/params.js` are both generated and both gitignored. That is
the right call, but it means every clone regenerates them and no reviewer ever
sees them in a diff. The two `--check` tripwires exist for this reason; if a
third generated artefact appears, it needs one too.

---

## F. Not started

- **4.3 is now complete.** All six vectors re-measured; five are fine or
  improved (`overheating` and `stagflation` give the player longer — m34→m51 and
  m17→m23 — and `recession`'s spurious end-of-term boom shrank from OVERHEATING
  at a +8.30 credit gap to GOLDILOCKS at +3.15). Only `bubble` regressed, and
  its cause is now diagnosed as D2 rather than the vector. Guarded by a new
  full-term characterisation test in `test/scenarios.test.js`.
- **4.4** — OPEN #1 and #9. #9 is already measured and **the plan's expectation
  for it is wrong**: A1 did not move the 24-month figure (0.1227 against 0.122),
  but the response is slow rather than absent — 0.0586 at 12m, 0.1227 at 24m,
  0.1756 at 36m, **0.2192 at 48m, inside the published 0.2–0.4.** Its `todo`
  message still carries the old text.
- **Phase 5** — 5.1 is blocked (A4). 5.2–5.6 untouched.
- **Phases 6–10** — untouched.
- **Two claims flagged READ-NOT-MEASURED in `docs/13` Phase 0:** the
  `credit.js:218` EMA comment was checked in 3.2 and **the brief was right**.
  **D3's numeric-literal counts have still never been checked** — Phase 5.3
  must count against the tree, not quote the brief.
