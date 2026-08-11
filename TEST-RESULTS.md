# TEST RESULTS — CRASH

> **GENERATED FILE.** Regenerate with `node tools/report.mjs`. Do not hand-edit.
> Everything below is the output of running the model, not a description of it.

This file exists so the full measured behaviour of the model can be read in one
place, including the parts that disagree with published evidence. It is written
to be readable cold, by someone who has never seen the project.

---

## How to read this

The model is a monthly macroeconomic simulation: 23 rules, ~126 sourced
parameters, five policy dials, 96 monthly ticks. Every parameter carries a
plausible range, a confidence level and a citation.

**There are three kinds of result below, and the third is the important one.**

| | meaning |
|---|---|
| `PASS` | the model does what the evidence says it should |
| `FAIL` | a genuine regression. There should be none. |
| `OPEN` | **a measured disagreement with published evidence, recorded rather than tuned away.** The message carries the number. |

The `OPEN` entries are the substance of this file. The project's standing rule
is that where the model disagrees with the literature, that is a *finding to
surface, not a coefficient to move* — so each disagreement is written as a test
that fails by design and prints its measured value on every run. A result file
that only showed the passing parts would be marketing.

---

## Summary

| | |
|---|---|
| Tests | **136** |
| Passing | **125** |
| Failing (regressions) | **0** |
| Open disagreements (`OPEN`) | **11** |
| Linter | **clean** |

```
lint: clean (40 files, 5 checks)
```

---

## THE HEADLINE FINDING

Fed the actual policy paths of US 2008-12, US 2021-23, UK 1979-83 and Japan
1995-2005, **the model fails all four historical episodes, and it fails them the
same way.**

**It does not disinflate gradually. It either stabilises or diverges, with a
two-percentage-point knife-edge between them and nothing in between** — and real
economies live in between. Measured, from 8% inflation and 7% expected, moving
the policy rate in one step:

| policy rate | inflation at month 60 |
|---|---|
| 5% | 471.7% |
| 7% | **217.6%** |
| 9% | **0.69%** |
| 15% | -4.00% |

And the *path* to a destination flips the outcome as surely as the destination:
15% reached immediately produces deflation; the same 15% reached over 24 months
produces 250%.

**The mechanism.** Demand responds to the REAL user cost; expectations are formed
entirely from realised inflation; and the transmitted policy rate takes about
three years to arrive. So expectations respond to inflation faster than the
transmitted rate responds to the dial, the real rate moves the WRONG WAY when
inflation rises, and the loop is positive unless the nominal move clears the
whole distance at once. Credibility compounds it: it falls only on realised
misses, so it collapses exactly when it is most needed and quadruples the
Phillips slope on the way down.

This is the next piece of work and it comes before anything else. The acceptance
test is already written — see `test/episodes.test.js`, "a bifurcation in the
playable range".

---

## OPEN DISAGREEMENTS — the full text of every one

These are the model telling you where it is wrong. Each is a test that fails by
design and prints its measured value. **This is the section to send to somebody
who wants to judge whether the model is behaving correctly.**

### 1. MEASURED: the model rebounds after year five and Cerra-Saxena say it should not

*`test/crisis.test.js`*

OPEN. Within the 96-month game the loss is right: -10.0% of trend at five years and -7.4% at eight. But run it to ten years and the model has recovered to -4.7%, because most of the five-year loss is a persistent OUTPUT GAP rather than lost capacity, and the gap eventually closes. Only the 3.2pp exogenous capacity cut is genuinely permanent. Cerra & Saxena find no significant rebound at ANY horizon. Closing this by inflating the exogenous scar is not available: it would push the five-year loss to -14% and the trough outside the published band, so the two ends of the arc cannot both be matched with one constant. What it actually says is that the model heals a demand gap faster than the data does — a statement about the demand block, and the same shape as the TAX_SHOCK_TO_GDP and austerity-paradox findings.

**Measured on this run:**

```
output recovered to -4.67% of trend at ten years, from -9.98% at five. That is a rebound.
```

### 2. US 2008-12: THE CRISIS IS ENTIRELY OFFSET BY THE RATE CUTS THAT FOLLOWED IT

*`test/episodes.test.js`*

THE MODEL DOES NOT PRODUCE THE GREAT RECESSION, and the reason is the opposite of what you would guess. Fed with the actual policy path, output troughs at -1.86% of trend (US: -5 to -7), unemployment rises +0.32pp to 5.13% at month 10 (US: +5.0pp to 10.0% at month 22), inflation never goes below 2.26% (US: -2.1%), and government debt FALLS from 64% to 60% (US: 64 -> 100). The 1.75pp of rate cuts delivered between months 2 and 11 produce a boom that more than cancels a financial crisis: output is +3.83% of trend at month 6, BEFORE Lehman lands. So this is not the crash being too weak — test/crisis.test.js shows the crash arc is right in isolation — it is the monetary channel being too strong relative to it. Note also that debt falling through a crisis is arithmetically impossible in the data and points at the same place: see THE ONE FINDING UNDERNEATH ALL FOUR.

**Measured on this run:**

```
unemployment rose 0.32pp, peaking in month 10; the US went 5.0 to 10.0. Output trough -1.86% of trend, inflation low 2.26%, debt 64 -> 60.
```

### 3. US 2021-23: THE DISINFLATION NEVER HAPPENS

*`test/episodes.test.js`*

THE HARD ONE THE AUDIT BRIEF FLAGGED, and it fails much harder than expected. Inflation does not peak inside the 40-month window at all: it is still rising at month 40, at 36.81%, having passed 14.06% at month 32 when US CPI was 3.1%. A funds rate taken to 5.25% by month 27 does not stop it. Two mechanisms are responsible and both are visible in the path. (1) The transmitted rate is 2.28% at month 30 and 4.10% at month 40 while the DIAL has been at 5.25 since month 27 — the real economy never feels the hike, so the REAL rate stays deeply negative and demand keeps rising. (2) Credibility falls 0.851 -> 0.000 by month 29 purely from realised misses, which quadruples kappa and makes the process self-reinforcing. Unemployment peaks at 5.81% (US: never above 4.0), so the sacrifice ratio question the brief asked cannot even be posed — the model never buys the disinflation at any price. Do not raise the transmission speed or lower kappa to close this: see THE ONE FINDING UNDERNEATH ALL FOUR.

**Measured on this run:**

```
inflation peaked at 36.81% in month 40 and was 14.06% at month 32; the US peaked at 9.1% in month 18 and was at 3.1% by month 32. Credibility bottomed at 0.000 in month 29.
```

### 4. UK 1979-83: THE RECESSION THAT PAID FOR IT NEVER ARRIVES

*`test/episodes.test.js`*

The disinflation is not bought, so the price is not paid. Inflation peaks at 20.39% but in month 60, not month 13, and is still 13.71% at month 48 — 67% of its peak, against a UK figure of 4.6%. Unemployment rises +0.50pp to 6.68% where the UK went 5.4 -> 11.9, so the measured sacrifice ratio is 0.29 point-years per pp against Ball 1994's 2-4 for this exact episode. THE REASON IS INSTRUCTIVE AND IS NOT A COEFFICIENT: a 17% MLR against 16.8% expected inflation is a REAL rate of roughly zero, so the model correctly reads Howe's budget as barely contractionary. What is missing is what made it contractionary in fact — an announced regime change that moved expectations ahead of the outturn. The model has no channel for that at all: credibility falls 0.189 -> 0.000 and never recovers, because it responds only to realised inflation.

### 5. JAPAN: THE MODEL CANNOT HOLD A DEFLATION

*`test/episodes.test.js`*

Inflation is under 0.5% in 2 of 120 months. It leaves the deflation inside a year (1.44% at month 12), passes target at month 24 and reaches 3.95% by month 60 with the policy rate on the floor the whole time. Debt never exceeds 90% — Japan passed 150% — because the inflation the model invents erodes it. THE MISSING MECHANISM IS DOWNWARD DE-ANCHORING: updateExpectations pulls expectations back toward inflation_target from BELOW at the same rate as from above, so a central bank with credibility 0.7 that cannot reach 2% is not representable. Japan's problem was precisely that nobody believed the BoJ could get there. This is the same absence as the other three episodes, seen from the deflationary side.

**Measured on this run:**

```
inflation was under 0.5% in 2 of 120 months and debt peaked at 90%. Japan: most of the decade, and past 150%. Model inflation at m12/m36/m60: 1.44 / 2.99 / 3.95.
```

### 6. THE ONE FINDING UNDERNEATH ALL FOUR: a bifurcation in the playable range

*`test/episodes.test.js`*

THE LARGEST FINDING IN docs/12, AND THE AUDIT BRIEF DID NOT ANTICIPATE IT. The model does not disinflate GRADUALLY — it either stabilises or diverges, with a knife-edge between them and nothing in the middle, and real economies live in the middle. Measured, from 8% inflation and 7% expected, with the rate moved in ONE step: to 7% -> inflation reaches 217.6% by month 60; to 9% -> it falls to 0.69%. Two percentage points of policy separate hyperinflation from success. Worse, the SAME destination reached gradually flips the outcome: 15% immediately -> 2.16% deflation at month 36; 15% over 18 months -> 12.12%; 15% over 24 months -> 250%. THE MECHANISM: demand responds to the REAL user cost, expectations are formed entirely from realised inflation, and the transmitted rate takes about three years to arrive. So expected_inflation responds to inflation faster than policy_rate_demand responds to the dial, the real rate moves the WRONG WAY when inflation rises, and the loop is positive unless the nominal move is large enough to clear the whole distance at once. Credibility compounds it: it falls only on realised misses, so it collapses exactly when it is most needed and quadruples kappa on the way down. This is docs/07 L6's defect class — a discontinuity inside the range the player occupies — at the largest scale it appears anywhere in the model, and it explains all four episode failures at once. WHAT IT MEANS FOR SECTION 5: the audit brief recommends forward guidance as a depth feature. This upgrades it from a nice-to-have to a prerequisite — every historical disinflation was won by moving expectations AHEAD of the outturn, and there is no channel for that here. It is also why Section 5 was NOT built in this pass: an announcement effect bolted onto a process that diverges under the real Volcker path would be decoration on a defect.

**Measured on this run:**

```
a 7% policy rate leaves inflation at 25.22% and a 9% rate at 4.61% after three years. Two points of policy cannot separate hyperinflation from success — that is a bifurcation, not a response curve.
```

### 7. MEASURED: the labour market has no lag behind output, and here it is

*`test/irf.test.js`*

OPEN AND DELIBERATELY NOT CLOSED. Unemployment peaks in the SAME month as output, and a -3pp external demand shock puts 38% of the eventual 36-month unemployment response into month ONE (du 0.4725 of 1.2456; 48% of the 12-month response). labour.js sets its Okun target from the CURRENT gap and closes it at FIRING_SPEED 0.60/month. Whether that is wrong depends on which claim you read: docs/02 Asymmetry 2 says "firms fire in WEEKS and hire over quarters", which the model delivers exactly — and the jobless-recovery half of it is real (du/dgap doubles from 0.198 to 0.391 over four years as output recovers and employment does not). What is missing is the DECISION lag: firms cut hours and wait a quarter before shedding heads. Adding it means a new smoothing parameter on the Okun target in the busiest rule in the model, and the only thing that pins its magnitude is the reduced-form peak month it would be tuned to reproduce. Left open, with the number printed, rather than tuned.

**Measured on this run:**

```
37% of the eventual unemployment response to a demand shock lands in the FIRST MONTH (0.4725 of 1.2761). Firms do not shed a third of the eventual job losses in month one.
```

### 8. THE SIGN FLIP THE DOCS PROMISED: how far away is it

*`test/multipliers.test.js`*

OPEN, AND THE SAME FINDING AS TAX_SHOCK_TO_GDP. Revenue rises at every playable gap and no plausible parameter draw changes that. Closed form: with revenue = tau + e*(tau/100)*gap, revenue falls only if +1pp of tax costs more than 3.11% of output at a zero gap or 2.87% at -6%. The model delivers 0.99%. The requirement drops to 1.76% only at the elasticity's high end (1.8) AND a -12% gap, which is the one corner where it lands inside Romer-Romer (2.0-3.0) at all. So the austerity paradox is absent BECAUSE the tax multiplier is small — one finding, not two, and the fix is a statement about the demand block rather than a coefficient to bend. docs/07 L4 proposed exactly this test and it was never written.

**Measured on this run:**

```
the sign flip needs +1pp of tax to cost 2.87% of output at a -6% gap; the model delivers 0.96%. Romer-Romer is 2.0-3.0.
```

### 9. RATE_TO_INFLATION: the model is about half the published estimate

*`test/validation.test.js`*

KNOWN AND ARGUABLY CORRECT. A 1pp hike moves inflation ~0.12pp at 24 months against a published 0.2-0.4. This is the anchored Phillips slope doing exactly what docs/02 says it should: with kappa at 0.05 the demand channel barely moves prices, and real surges are supposed to come from supply shocks and unanchoring. The published range is estimated across regimes that include the unanchored 1970s. Do not raise kappa to close this.

**Measured on this run:**

```
model 0.122, literature 0.2-0.4
```

### 10. TAX_SHOCK_TO_GDP: the model is far below Romer-Romer

*`test/validation.test.js`*

KNOWN. A 1% of GDP tax rise costs ~0.33% of output over 30 months against a published 2.0-3.0. The Romer-Romer narrative multiplier is the largest in the literature and famously larger than structural models produce; the model also has a responding central bank and a crowding-out term that works in the opposite direction on a tax rise. Recorded rather than closed: reproducing 2.5 would mean roughly tripling the consumption response to disposable income, which the MPC evidence does not support.

**Measured on this run:**

```
model 0.460, literature 2-3
```

### 11. PRIVATE debt reprices instantly, and government debt no longer does

*`test/validation.test.js`*

RECORDED, NOT FIXED (docs/12, E1). credit.js computes the debt-service burden as private_credit * (policy_rate + credit_spread) / 100 — the DIAL, and the whole stock. That is exactly the error the government's interest bill carried until DEBT_AVERAGE_MATURITY_YEARS was added this pass: every mortgage and every corporate loan is floating-rate with no lag, so the default rate responds to a rate move the month it is announced. The asymmetry is now visible and odd — the state refinances over seven years while its households refinance overnight. Fixing it needs a private-debt maturity parameter with its own source (the fixed/floating mix differs enormously across countries, which is most of why the 2022 hiking cycle hurt the UK and Australia so much more than the US), so it is a modelling change rather than a keystroke. tools/lint.mjs holds the exception with a declared reason so it cannot be forgotten.

**Measured on this run:**

```
a 3pp hike moved the default rate 0.67540pp in its FIRST month. Borrowers do not all reprice in thirty days.
```

---

## EVERY TEST, BY FILE

`PASS` = the model matches the evidence. `OPEN` = a recorded disagreement,
with its number in the section above. `FAIL` = a regression.

### `unknown`

| | test | result |
|---|---|---|
| 1 | index.html has been built | PASS |
| 2 | the bundled page executes without throwing | PASS |
| 3 | no import or export keyword survived into the bundle | PASS |
| 4 | the page is self-contained — no external requests | PASS |
| 5 | invariants hold across 200 quiet ticks | PASS |
| 6 | invariants hold under a violent policy path | PASS |
| 7 | checkInvariants actually catches a broken book | PASS |
| 8 | a crash causes a recession, not just a haircut | PASS |
| 9 | the demand collapse fades but the scar does not | PASS |
| 10 | spending in the first year after a crash shrinks the permanent scar | PASS |
| 11 | waiting past the window costs you the discount | PASS |
| 12 | forced selling fires in the bubble, and then stops | PASS |
| 13 | THE DOOM LOOP: banks below the floor cut lending and widen spreads | PASS |
| 14 | a crash takes a real bite out of bank capital | PASS |
| 15 | defaulted debt leaves the credit stock | PASS |
| 16 | a crash is survivable and the economy is still playable afterwards | PASS |
| 17 | RECAPITALISATION IS A QUANTITY, NOT A GESTURE | PASS |
| 18 | THE CRASH ARC: every published magnitude at once | PASS |
| 19 | THE DECONVOLUTION CONSTANTS ARE MEASUREMENTS, and this re-measures them | PASS |
| 20 | the scar PHASES IN rather than landing on month one | PASS |
| 22 | WHEN CREDIT BITES BACK: the bust is deeper the bigger the boom was | PASS |
| 23 | no Math.random anywhere in src/ | PASS |
| 24 | no bare time conversion outside units.js | PASS |
| 25 | same seed produces an identical 96-tick history | PASS |
| 26 | every state field is documented in 01-variables.md | PASS |
| 27 | 01-variables.md does not document fields the model no longer has | PASS |
| 28 | every dial, gauge, scenario, shock and ending is named in the docs | PASS |
| 29 | every transmitted driver has a player-facing name | PASS |
| 30 | the docs index lists every file in docs/ | PASS |
| 31 | US 2008-12: the rate dial does reach its floor and stay there | PASS |
| 33 | US 2021-23: fiscal transfers plus a supply shock do produce an inflation | PASS |
| 35 | UK 1979-83: low credibility really does make inflation more expensive | PASS |
| 37 | JAPAN: own-currency debt held at home does not reprice, and foreign-held does | PASS |
| 39 | the Taylor principle IS satisfiable — but only by jumping, never by walking | PASS |
| 41 | every event leaves the accounting identities intact | PASS |
| 42 | every event actually changes something that survives the tick | PASS |
| 43 | no event writes a pipeline target | PASS |
| 44 | full terms with shocks on and invariants armed, across every scenario | PASS |
| 45 | A WOBBLE IN A STRETCHED SYSTEM IS A DIFFERENT EVENT (docs/12 M3) | PASS |
| 46 | no event is invisible to the player | PASS |
| 47 | a temporary rate hike produces a HUMP, not a ramp | PASS |
| 48 | the ordering of the peaks is output, then unemployment, then inflation | PASS |
| 49 | the response scales with the size of the impulse and not with its sign | PASS |
| 50 | a cut is a weaker impulse than a hike, for as long as the impulse is live | PASS |
| 52 | the spending impulse is fast and the rate impulse is slow | PASS |
| 53 | QE and the rate dial have the same SHAPE and different sizes | PASS |
| 54 | a dial move reaches the transmitted driver and converges to the dial | PASS |
| 55 | markets feel a rate move faster than the real economy | PASS |
| 56 | the output response to a rate move is LAGGED, not instant | PASS |
| 57 | the pipeline refuses to schedule into a field a rule owns | PASS |
| 58 | no rule assigns to a pipeline target | PASS |
| 59 | every declared pipeline target exists on a fresh state | PASS |
| 60 | the Taylor autopilot faces the same lags the player does | PASS |
| 61 | every dial either schedules a lag or is documented as immediate | PASS |
| 62 | recession multiplier lands in the published range | PASS |
| 63 | expansion multiplier lands in the published range | PASS |
| 64 | the multiplier is larger in a slump than in a boom | PASS |
| 65 | the same spending buys more OUTPUT with slack and more PRICES without | PASS |
| 66 | holding the rate fixed makes the multiplier much larger | PASS |
| 67 | THE QE LESSON: printing into slack with a credible CB barely bites | PASS |
| 68 | printing with no slack and no credibility goes straight to prices | PASS |
| 69 | printing buys real things when there is slack to buy them with | PASS |
| 70 | AUSTERITY LEAKS: a tax rise collects less than you legislated, and worse with slack | PASS |
| 72 | every parameter has a value inside its range | PASS |
| 73 | every parameter has a unit, a source and a known confidence level | PASS |
| 74 | the deleted double-count has not crept back | PASS |
| 75 | kernels are normalised and peak on the documented month | PASS |
| 76 | every fitted kernel shape has a lag entry | PASS |
| 77 | START satisfies the accounting identities | PASS |
| 78 | ROUND TRIP: the stance returns exactly, to nine decimal places | PASS |
| 79 | ROUND TRIP: the ECONOMY does not return, and the residue is real capital | PASS |
| 80 | HIKE-HOLD-CUT: no permanent ratchet, and the jobs cost outlasts the gain | PASS |
| 81 | STOP-GO: a symmetric-looking cycle is a persistent EASING, and it shows | PASS |
| 82 | a path and a held move are not the same thing, and the difference is measurable | PASS |
| 83 | every scenario starts internally consistent | PASS |
| 84 | the bubble scenario looks healthy on every gauge except the credit gap | PASS |
| 85 | the bubble hides for four years — the design promise | PASS |
| 86 | every scenario starts in, and stays a quarter in, its advertised regime | PASS |
| 87 | the recession scenario has the rate dial genuinely dead | PASS |
| 88 | no scenario produces absurd numbers inside a term | PASS |
| 89 | NEUTRAL ANCHORS ARE BUILT FROM NEUTRAL, in every scenario | PASS |
| 90 | debt_trap: the real economy responds to the yield at all | PASS |
| 91 | debt_trap: the benchmark central bank is no longer identical to doing nothing | PASS |
| 92 | debt_trap: THE DECISION — you cannot consolidate your way out alone | PASS |
| 93 | a hike does not bite the interest bill on impact | PASS |
| 94 | the core macro block is stable around the steady state | PASS |
| 95 | the debt loop diverges, but slowly enough to be playable | PASS |
| 96 | a one-off demand shock decays rather than compounding | PASS |
| 97 | 200 ticks of no input and nothing drifts | PASS |
| 98 | credibility rises when the target is hit, and slowly | PASS |
| 99 | the credit gap does not open on its own | PASS |
| 100 | a rate cut does more for OUTPUT with slack than at capacity | PASS |
| 101 | a cut is weaker than the equivalent hike | PASS |
| 102 | a cut-then-hike round trip leaves the stance where it started | PASS |
| 103 | THE LOWER BOUND: easing stops working as the rate approaches it | PASS |
| 104 | QE still works when the rate dial has run out of room | PASS |
| 105 | unemployment rises faster than it falls | PASS |
| 106 | SWEEP: more spending never raises unemployment, at any starting gap | PASS |
| 107 | SWEEP: no step changes in the response to a rate cut | PASS |
| 108 | the ONE cliff in the model is the capacity ceiling, and it is where it says | PASS |
| 109 | L5: HIKING AT THE LOWER BOUND MUST NOT RAISE OUTPUT | PASS |
| 110 | L3: the fiscal multiplier has no step in it as the rate falls to the bound | PASS |
| 111 | investment.js reads the rate DIAL only to display it | PASS |
| 112 | the whole UI boots without throwing | PASS |
| 113 | every shell container the app needs exists | PASS |
| 114 | a gauge mounts for every indicator | PASS |
| 115 | a dial mounts for every dial | PASS |
| 116 | every gauge can open a why panel with real terms | PASS |
| 117 | every gauge has a history series to draw | PASS |
| 118 | moving a dial schedules an effect instead of applying it | PASS |
| 119 | a session runs a full term without throwing | PASS |
| 120 | restarting on the same seed keeps the previous run as a ghost | PASS |
| 121 | the game starts paused, at 1x, with play as the visible action | PASS |
| 122 | pausing does not throw away the chosen speed | PASS |
| 123 | every gauge and every dial has a plain-English definition | PASS |
| 124 | every gauge can say whether it is getting worse | PASS |
| 125 | a passive calm run reaches the end of the term and is scored | PASS |
| 126 | a losing run reaches a named ending with a lesson | PASS |
| 127 | the DEFERRED register matches the code, in both directions | PASS |
| 128 | every recorded parameter conflict is still genuinely unresolved | PASS |
| 129 | RATE_TO_OUTPUT: 1pp of policy rate, held a year | PASS |
| 130 | AUTO_STABILISER_ABSORPTION: share of an income shock that never lands | PASS |
| 131 | a tax cut RAISES output, and does it through consumption | PASS |
| 132 | QE_TO_GDP: bond buying reaches output through the yield, and how much | PASS |
| 134 | CRISIS_OUTPUT_TROUGH: the realised peak-to-trough lands in the published range | PASS |

### `test/crisis.test.js`

> THE CRASH CHAIN. Rebuilt in docs/12: two published numbers were being used as structural inputs when they are OBSERVATIONS that already contain the model's own response, so the model reproduced that response on top of them and the crash came out 2.6x too deep.

| | test | result |
|---|---|---|
| 21 | MEASURED: the model rebounds after year five and Cerra-Saxena say it should not | **OPEN** |

### `test/episodes.test.js`

> HISTORICAL EPISODES. The only tests here that can say the model is WRONG rather than merely self-consistent: they feed it the ACTUAL policy path of a real episode and check the arc. THE MODEL FAILS ALL FOUR AND FAILS THEM THE SAME WAY — read the last two entries in this section first. This is the most important block in the file.

| | test | result |
|---|---|---|
| 32 | US 2008-12: THE CRISIS IS ENTIRELY OFFSET BY THE RATE CUTS THAT FOLLOWED IT | **OPEN** |
| 34 | US 2021-23: THE DISINFLATION NEVER HAPPENS | **OPEN** |
| 36 | UK 1979-83: THE RECESSION THAT PAID FOR IT NEVER ARRIVES | **OPEN** |
| 38 | JAPAN: THE MODEL CANNOT HOLD A DEFLATION | **OPEN** |
| 40 | THE ONE FINDING UNDERNEATH ALL FOUR: a bifurcation in the playable range | **OPEN** |

### `test/irf.test.js`

> IMPULSE RESPONSE SHAPES. Move a dial, hold it a year, put it back, difference against an untouched baseline. This is what a published VAR IRF is, and it is the only experiment here that can produce a months-to-peak number — everything else in the project measures PERMANENT held moves, which cannot peak.

| | test | result |
|---|---|---|
| 51 | MEASURED: the labour market has no lag behind output, and here it is | **OPEN** |

### `test/multipliers.test.js`

> MULTIPLIERS, measured against published reduced forms that are NOT model terms. Where the model lands outside a range that is a finding, not a number to tune.

| | test | result |
|---|---|---|
| 71 | THE SIGN FLIP THE DOCS PROMISED: how far away is it | **OPEN** |

### `test/validation.test.js`

> EVERY PUBLISHED VALIDATION TARGET is either asserted here or recorded as a todo with its measured value. Also checks that the DEFERRED register of deliberately unread parameters matches the code in BOTH directions.

| | test | result |
|---|---|---|
| 133 | RATE_TO_INFLATION: the model is about half the published estimate | **OPEN** |
| 135 | TAX_SHOCK_TO_GDP: the model is far below Romer-Romer | **OPEN** |
| 136 | PRIVATE debt reprices instantly, and government debt no longer does | **OPEN** |

---

## WHAT THE MODEL ACTUALLY DOES WHEN YOU TOUCH SOMETHING

Generated by `node tools/cause-effect.mjs`. This is the model being run, not a
description of it. Every dial moved from a settled economy; the same move from
eight different starting states; what each scenario does on its own and under a
rule-following central bank; what every shock does; and how long each lever takes.

**Conventions that matter, and both were established the hard way:**

- The output gap is set with a standing **external demand shock**, never with the
  policy rate — setting the state with the lever under test confounds the two,
  and it silently means "a recession the central bank chose not to fight".
- A dial is moved through `applyDialChange`, always, because that is where the
  transmission lag is scheduled. Assigning to the dial directly moves the setting
  and nothing else.

```

==============================================================================
DIALS — a standard move, from a settled calm economy, no policy response
==============================================================================

-- policy_rate  −1.00pp (a cut)
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +0.00 |  +0.00 |  -0.00 |  +0.00 |  +0.00 |  -0.00 |  +0.19 |  +0.03 |  +0.00 | +0.000
    3 |  +0.05 |  +0.01 |  -0.01 |  +0.02 |  +0.02 |  -0.01 |  +0.85 |  +0.09 |  +0.01 | +0.000
    6 |  +0.16 |  +0.04 |  -0.04 |  +0.07 |  +0.08 |  -0.04 |  +1.95 |  +0.18 |  +0.08 | +0.000
   12 |  +0.43 |  +0.14 |  -0.14 |  +0.20 |  +0.20 |  -0.21 |  +4.12 |  +0.44 |  +0.41 | +0.000
   24 |  +0.98 |  +0.37 |  -0.32 |  +0.40 |  +0.48 |  -0.99 |  +8.57 |  +1.29 |  +1.01 | +0.000
   48 |  +2.12 |  +0.81 |  -0.59 |  +0.67 |  +1.12 |  -4.25 | +18.01 |  +3.82 |  +1.38 | +0.000

-- policy_rate  +1.00pp (a hike)
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  -0.00 |  -0.00 |  +0.00 |  -0.00 |  +0.00 |  +0.00 |  -0.19 |  -0.03 |  -0.00 | +0.000
    3 |  -0.06 |  -0.00 |  +0.02 |  -0.03 |  -0.02 |  +0.01 |  -0.84 |  -0.09 |  -0.01 | +0.000
    6 |  -0.19 |  -0.02 |  +0.07 |  -0.11 |  -0.08 |  +0.04 |  -1.90 |  -0.18 |  -0.11 | +0.000
   12 |  -0.51 |  -0.05 |  +0.19 |  -0.28 |  -0.20 |  +0.20 |  -3.83 |  -0.45 |  -0.54 | +0.000
   24 |  -1.11 |  -0.12 |  +0.37 |  -0.54 |  -0.44 |  +0.88 |  -7.05 |  -1.27 |  -1.43 | +0.000
   48 |  -2.02 |  -0.23 |  +0.57 |  -0.78 |  -0.87 |  +3.41 | -11.67 |  -3.41 |  -1.86 | +0.000

-- tax_rate     −1.00pp (a cut)
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  +0.01 |  +0.00 |  +0.00 |  +0.02 | +0.000
    3 |  +0.03 |  +0.01 |  -0.01 |  -0.01 |  +0.04 |  +0.05 |  +0.00 |  +0.00 |  +0.18 | +0.000
    6 |  +0.10 |  +0.03 |  -0.03 |  -0.05 |  +0.14 |  +0.20 |  +0.00 |  +0.00 |  +0.86 | +0.000
   12 |  +0.17 |  +0.07 |  -0.07 |  -0.15 |  +0.32 |  +0.60 |  +0.03 |  +0.01 |  +2.58 | +0.000
   24 |  +0.29 |  +0.14 |  -0.12 |  -0.24 |  +0.55 |  +1.36 |  +0.17 |  +0.05 |  +1.99 | +0.000
   48 |  +0.56 |  +0.31 |  -0.24 |  -0.22 |  +0.81 |  +2.44 |  +0.87 |  +0.21 |  +0.58 | +0.000

-- tax_rate     +1.00pp (a rise)
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  -0.01 |  +0.00 |  +0.00 |  -0.02 | +0.000
    3 |  -0.03 |  -0.00 |  +0.01 |  +0.01 |  -0.04 |  -0.05 |  -0.00 |  -0.00 |  -0.18 | +0.000
    6 |  -0.10 |  -0.01 |  +0.04 |  +0.04 |  -0.14 |  -0.20 |  -0.00 |  -0.00 |  -0.87 | +0.000
   12 |  -0.20 |  -0.02 |  +0.08 |  +0.13 |  -0.32 |  -0.61 |  -0.01 |  -0.01 |  -2.61 | +0.000
   24 |  -0.39 |  -0.05 |  +0.16 |  +0.17 |  -0.55 |  -1.41 |  -0.05 |  -0.06 |  -2.20 | +0.000
   48 |  -0.78 |  -0.11 |  +0.31 |  +0.06 |  -0.82 |  -2.60 |  -0.27 |  -0.25 |  -1.05 | +0.000

-- govt_spending +1.00pp
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +1.04 |  +0.16 |  -0.15 |  +0.00 |  +0.00 |  +0.05 |  +0.00 |  +0.00 |  +0.01 | +0.000
    3 |  +1.33 |  +0.32 |  -0.34 |  +0.13 |  +0.15 |  +0.10 |  +0.03 |  +0.02 |  +0.78 | +0.000
    6 |  +1.32 |  +0.43 |  -0.44 |  +0.07 |  +0.18 |  +0.11 |  +0.13 |  +0.06 |  +1.54 | +0.000
   12 |  +1.33 |  +0.54 |  -0.47 |  +0.01 |  +0.26 |  +0.02 |  +0.50 |  +0.16 |  +2.21 | +0.000
   24 |  +1.48 |  +0.69 |  -0.50 |  -0.01 |  +0.40 |  -0.31 |  +1.67 |  +0.46 |  +0.76 | +0.000
   48 |  +1.90 |  +0.89 |  -0.59 |  +0.07 |  +0.67 |  -1.54 |  +4.63 |  +1.24 |  +0.55 | +0.000

-- govt_spending −1.00pp
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  -1.04 |  -0.08 |  +0.23 |  +0.00 |  +0.00 |  -0.06 |  -0.00 |  -0.01 |  -0.04 | +0.000
    3 |  -1.38 |  -0.12 |  +0.44 |  -0.17 |  -0.14 |  -0.12 |  -0.01 |  -0.03 |  -0.84 | +0.000
    6 |  -1.45 |  -0.15 |  +0.50 |  -0.19 |  -0.19 |  -0.17 |  -0.05 |  -0.07 |  -1.74 | +0.000
   12 |  -1.58 |  -0.18 |  +0.53 |  -0.21 |  -0.28 |  -0.21 |  -0.15 |  -0.17 |  -2.82 | +0.000
   24 |  -1.86 |  -0.24 |  +0.58 |  -0.28 |  -0.43 |  -0.16 |  -0.47 |  -0.41 |  -1.83 | +0.000
   48 |  -2.37 |  -0.30 |  +0.66 |  -0.41 |  -0.65 |  +0.34 |  -1.18 |  -0.91 |  -1.68 | +0.000

-- money_printed  2.00pp
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +2.08 |  +0.28 |  -0.24 |  +0.00 |  +0.00 |  -0.05 |  +0.01 |  +0.01 |  +0.01 | -0.003
    3 |  +2.83 |  +0.57 |  -0.55 |  +0.40 |  +0.32 |  -0.27 |  +0.06 |  +0.03 |  +1.59 | -0.009
    6 |  +3.06 |  +0.79 |  -0.72 |  +0.48 |  +0.43 |  -0.74 |  +0.24 |  +0.10 |  +3.42 | -0.018
   12 |  +3.49 |  +1.08 |  -0.79 |  +0.60 |  +0.68 |  -1.92 |  +0.98 |  +0.28 |  +5.64 | -0.035
   24 |  +4.36 |  +1.48 |  -0.80 |  +0.79 |  +1.18 |  -4.80 |  +3.64 |  +0.84 |  +3.06 | -0.067
   48 |  +4.72 |  +2.24 |  -0.96 |  +1.08 |  +1.77 | -12.14 | +12.03 |  +2.53 |  -0.37 | -0.151

-- qe            10.0pp
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  -0.00 |  +0.00 |  +0.00 |  +0.00 | +0.000
    3 |  +0.04 |  +0.01 |  -0.01 |  +0.03 |  +0.00 |  -0.00 |  +0.08 |  +0.00 |  +0.01 | +0.000
    6 |  +0.11 |  +0.03 |  -0.03 |  +0.08 |  +0.02 |  -0.02 |  +0.39 |  +0.02 |  +0.06 | +0.000
   12 |  +0.19 |  +0.07 |  -0.07 |  +0.11 |  +0.07 |  -0.09 |  +1.20 |  +0.09 |  +0.22 | +0.000
   24 |  +0.35 |  +0.14 |  -0.13 |  +0.15 |  +0.16 |  -0.40 |  +2.84 |  +0.34 |  +0.33 | +0.000
   48 |  +0.69 |  +0.30 |  -0.23 |  +0.22 |  +0.36 |  -1.56 |  +5.92 |  +1.02 |  +0.41 | +0.000

==============================================================================
THE SAME MOVE, FROM DIFFERENT STARTING STATES (24 months on)
==============================================================================

-- rate −1pp
   start gap | Δoutput | Δinflat | Δunemp | share of the move that is OUTPUT
   ------------------------------------------------------------------------
       -8.63 |   +1.16 |   +0.12 |  -0.20 |     0.91
       -6.45 |   +1.17 |   +0.12 |  -0.20 |     0.91
       -4.26 |   +1.13 |   +0.11 |  -0.18 |     0.91
       -2.03 |   +1.05 |   +0.10 |  -0.19 |     0.91
       +0.00 |   +0.98 |   +0.37 |  -0.32 |     0.73
       +2.25 |   +1.07 |   +0.15 |  -0.04 |     0.88
       +4.42 |   +0.04 |   +0.23 |  -0.12 |     0.16
       +5.59 |   +0.05 |   +0.52 |  -0.13 |     0.08

-- spend +1pp
   start gap | Δoutput | Δinflat | Δunemp | share of the move that is OUTPUT
   ------------------------------------------------------------------------
       -8.63 |   +2.08 |   +0.24 |  -0.38 |     0.90
       -6.45 |   +2.07 |   +0.24 |  -0.38 |     0.90
       -4.26 |   +2.14 |   +0.23 |  -0.20 |     0.90
       -2.03 |   +1.65 |   +0.20 |  -0.39 |     0.89
       +0.00 |   +1.48 |   +0.69 |  -0.50 |     0.68
       +2.25 |   +1.24 |   +0.28 |  -0.07 |     0.82
       +4.42 |   -0.01 |   +0.51 |  -0.15 |    -0.03
       +5.59 |   +0.00 |   +3.25 |  -0.22 |     0.00

-- print 2pp
   start gap | Δoutput | Δinflat | Δunemp | share of the move that is OUTPUT
   ------------------------------------------------------------------------
       -8.63 |   +4.17 |   +0.36 |  -0.76 |     0.92
       -6.45 |   +4.21 |   +0.41 |  -0.67 |     0.91
       -4.26 |   +4.27 |   +0.45 |  -0.58 |     0.90
       -2.03 |   +4.15 |   +1.01 |  -1.22 |     0.80
       +0.00 |   +4.36 |   +1.48 |  -0.80 |     0.75
       +2.25 |   +1.35 |   +1.09 |  -0.36 |     0.55
       +4.42 |   +0.11 |   +4.01 |  -0.49 |     0.03
       +5.59 |   +0.27 |  +31.04 |  -1.52 |     0.01

-- tax −1pp
   start gap | Δoutput | Δinflat | Δunemp | share of the move that is OUTPUT
   ------------------------------------------------------------------------
       -8.63 |   +0.80 |   +0.08 |  -0.15 |     0.90
       -6.45 |   +0.81 |   +0.09 |  -0.15 |     0.90
       -4.26 |   +0.83 |   +0.09 |  -0.15 |     0.91
       -2.03 |   +0.75 |   +0.08 |  -0.14 |     0.90
       +0.00 |   +0.29 |   +0.14 |  -0.12 |     0.68
       +2.25 |   +0.34 |   +0.07 |  -0.03 |     0.84
       +4.42 |   -0.03 |   +0.08 |  -0.04 |    -0.74
       +5.59 |   -0.03 |   +0.20 |  -0.05 |    -0.20

==============================================================================
WHAT EACH PRESET DOES ON ITS OWN — no player input, no shocks
==============================================================================

calm — you touch nothing
    1m GOLDI gap+0.0 pi2.0 u5.0 d100 a64 cg+0.0
    6m GOLDI gap+0.0 pi2.0 u5.0 d100 a63 cg+0.0
   12m GOLDI gap+0.0 pi2.0 u5.0 d100 a61 cg+0.0
   24m GOLDI gap+0.0 pi2.0 u5.0 d100 a63 cg+0.0
   48m GOLDI gap+0.0 pi2.0 u5.0 d100 a64 cg+0.0
   96m GOLDI gap+0.0 pi2.0 u5.0 d100 a64 cg+0.0

calm — Taylor-rule central bank
    1m GOLDI gap+0.0 pi2.0 u5.0 d100 a64 cg+0.0
    6m GOLDI gap+0.0 pi2.0 u5.0 d100 a63 cg+0.0
   12m GOLDI gap+0.0 pi2.0 u5.0 d100 a61 cg+0.0
   24m GOLDI gap+0.0 pi2.0 u5.0 d100 a63 cg+0.0
   48m GOLDI gap+0.0 pi2.0 u5.0 d100 a64 cg+0.0
   96m GOLDI gap+0.0 pi2.0 u5.0 d100 a64 cg+0.0

overheating — you touch nothing
    1m OVERH gap+1.0 pi5.6 u4.2 d100 a64 cg+0.1
    6m OVERH gap+1.8 pi5.4 u4.4 d97 a61 cg+0.6
   12m OVERH gap+2.8 pi6.6 u4.3 d94 a59 cg+1.9
   24m OVERH gap+7.0 pi14.5 u3.8 d84 a61 cg+6.1
   48m OVERH gap+86.1 pi187.4 u1.5 d4 a0 cg+37.5
   ENDED: hyperinflation

overheating — Taylor-rule central bank
    1m OVERH gap+1.0 pi5.6 u4.2 d100 a64 cg+0.0
    6m OVERH gap+1.4 pi5.3 u4.5 d97 a61 cg+0.1
   12m OVERH gap+1.0 pi5.1 u4.6 d95 a60 cg+0.1
   24m OVERH gap-0.8 pi4.2 u5.3 d92 a59 cg-1.2
   48m GOLDI gap-1.6 pi2.6 u5.6 d91 a61 cg-5.3
   96m GOLDI gap-0.2 pi2.0 u5.1 d93 a64 cg-5.2

recession — you touch nothing
    1m RECES gap-8.8 pi0.2 u7.3 d100 a64 cg-0.1
    6m RECES gap-10.9 pi0.1 u7.3 d103 a61 cg-0.4
   12m RECES gap-9.1 pi0.3 u6.9 d105 a59 cg-0.8
   24m RECES gap-6.0 pi0.8 u6.3 d110 a66 cg-1.3
   48m GOLDI gap-0.8 pi1.6 u5.4 d114 a69 cg-0.2
   96m OVERH gap+5.8 pi3.9 u3.9 d103 a64 cg+8.3

recession — Taylor-rule central bank
    1m RECES gap-8.8 pi0.2 u7.3 d100 a64 cg-0.1
    6m RECES gap-10.9 pi0.1 u7.3 d103 a61 cg-0.3
   12m RECES gap-9.0 pi0.3 u6.9 d105 a59 cg-0.6
   24m RECES gap-5.8 pi0.8 u6.2 d109 a66 cg-0.5
   48m GOLDI gap-0.3 pi1.7 u5.3 d112 a69 cg+1.7
   96m GOLDI gap+0.9 pi2.6 u4.6 d109 a63 cg-1.0

stagflation — you touch nothing
    1m STAGF gap-3.0 pi12.5 u8.2 d100 a43 cg-0.0
    6m OVERH gap-0.4 pi17.7 u7.1 d96 a37 cg+0.7
   12m OVERH gap+6.3 pi26.3 u5.6 d89 a30 cg+3.9
   24m OVERH gap+38.3 pi88.6 u1.7 d51 a1 cg+19.7
   ENDED: hyperinflation

stagflation — Taylor-rule central bank
    1m STAGF gap-3.0 pi12.5 u8.2 d100 a43 cg-0.0
    6m OVERH gap-1.1 pi17.4 u7.2 d97 a37 cg-0.2
   12m OVERH gap+2.2 pi23.8 u6.0 d90 a31 cg+0.0
   24m OVERH gap+7.8 pi35.3 u5.1 d72 a35 cg+0.9
   ENDED: hyperinflation

debt_trap — you touch nothing
    1m GOLDI gap+0.0 pi2.0 u5.0 d140 a65 cg+0.0
    6m GOLDI gap-1.4 pi1.9 u5.5 d143 a63 cg-0.3
   12m GOLDI gap-1.6 pi1.8 u5.6 d147 a62 cg-1.0
   24m GOLDI gap-2.2 pi1.7 u5.7 d155 a62 cg-2.7
   48m GOLDI gap-3.5 pi1.5 u5.8 d175 a61 cg-6.4
   96m RECES gap-8.7 pi0.9 u6.7 d252 a57 cg-15.7
   ENDED: debt_crisis

debt_trap — Taylor-rule central bank
    1m GOLDI gap+0.0 pi2.0 u5.0 d140 a65 cg+0.0
    6m GOLDI gap-1.3 pi1.9 u5.5 d143 a63 cg-0.3
   12m GOLDI gap-1.5 pi1.8 u5.5 d147 a62 cg-0.8
   24m GOLDI gap-1.5 pi1.8 u5.5 d154 a63 cg-2.0
   48m GOLDI gap-1.6 pi1.7 u5.6 d172 a63 cg-3.7
   96m GOLDI gap-3.1 pi1.6 u5.8 d227 a61 cg-7.5
   ENDED: debt_crisis

bubble — you touch nothing
    1m GOLDI gap+1.5 pi2.5 u4.4 d100 a72 cg+6.0
    6m GOLDI gap+1.9 pi2.7 u4.4 d97 a70 cg+6.2
   12m GOLDI gap+1.9 pi2.8 u4.4 d95 a68 cg+7.0
   24m GOLDI gap+1.8 pi2.9 u4.4 d89 a70 cg+8.9
   48m GOLDI gap+1.7 pi3.0 u4.4 d78 a71 cg+11.8
   96m GOLDI gap+1.2 pi2.8 u4.5 d58 a71 cg+14.5

bubble — Taylor-rule central bank
    1m GOLDI gap+1.5 pi2.5 u4.4 d100 a72 cg+5.9
    6m GOLDI gap+1.7 pi2.6 u4.4 d97 a70 cg+6.0
   12m GOLDI gap+1.2 pi2.6 u4.5 d95 a68 cg+6.3
   24m GOLDI gap-0.4 pi2.2 u5.1 d91 a68 cg+6.3
   48m GOLDI gap-2.1 pi1.8 u5.7 d86 a68 cg+4.4
   96m GOLDI gap-2.2 pi1.6 u5.7 d79 a71 cg+2.9

==============================================================================
WHAT HAPPENS WITH NO DECISION FROM YOU — the automatic machinery
==============================================================================

-- a −5pp spending cut, and what the stabilisers do about it
   mo | Δoutput | Δmktinc | Δtaxrev | Δtransf | Δdispos | Δdeficit | Δstruct | absorbed
   ----------------------------------------------------------------------------------------
    1 |   -5.20 |   -5.00 |   -0.54 |   +0.36 |   -4.10 |   -4.10 |   -5.00 |     0.18
    3 |   -7.23 |   -6.93 |   -1.44 |   +0.74 |   -4.75 |   -2.84 |   -5.00 |     0.32
    6 |   -7.87 |   -7.49 |   -2.10 |   +0.88 |   -4.51 |   -2.06 |   -5.00 |     0.40
   12 |   -8.83 |   -8.28 |   -2.56 |   +0.98 |   -4.74 |   -1.51 |   -5.00 |     0.43
   24 |  -10.44 |   -9.55 |   -3.01 |   +1.14 |   -5.40 |   -0.91 |   -5.00 |     0.43

==============================================================================
SHOCKS — what each one does, measured, from a settled calm economy
==============================================================================

Oil price spike  (calm baseline, 12%/yr)
    1m out+0.0 pi+2.4 u+0.0 appr-4    6m out-0.2 pi+1.7 u+0.1 appr-6   12m out-0.0 pi+1.1 u+0.0 appr-5   24m out+0.2 pi+0.6 u-0.1 appr+1   48m out+0.5 pi+0.3 u-0.2 appr+0

Productivity boom  (calm baseline, 10%/yr)
    1m out+1.6 pi+0.0 u+0.0 appr+3    6m out+1.6 pi+0.0 u+0.0 appr+4   12m out+1.6 pi+0.0 u+0.0 appr+4   24m out+1.6 pi+0.0 u+0.0 appr+1   48m out+1.6 pi+0.0 u+0.0 appr+0

Bank wobble  (bubble baseline, 15%/yr)
    1m out-0.8 pi-0.1 u+0.1 appr-5    6m out-0.5 pi-0.2 u+0.1 appr-4   12m out-0.6 pi-0.2 u+0.1 appr-3   24m out-0.6 pi-0.2 u+0.2 appr-1   48m out-0.8 pi-0.3 u+0.2 appr-0

FINANCIAL CRISIS  (bubble baseline, crisis_prob)
    1m out-6.3 pi-0.8 u+0.9 appr-14    6m out-8.9 pi-1.2 u+1.8 appr-18   12m out-10.8 pi-1.6 u+2.0 appr-22   24m out-11.4 pi-1.8 u+2.0 appr-11   48m out-11.3 pi-1.7 u+1.7 appr-3

Export slump  (calm baseline, 12%/yr)
    1m out-1.2 pi-0.1 u+0.3 appr-4    6m out-1.3 pi-0.1 u+0.5 appr-4   12m out-0.9 pi-0.1 u+0.4 appr-3   24m out-0.6 pi-0.1 u+0.2 appr-0   48m out-0.3 pi-0.1 u+0.1 appr-0

==============================================================================
HOW LONG EACH LEVER TAKES — share of the 48-month response delivered by month N
==============================================================================
   lever                |    1    3    6    9   12   18   24   36   48
   ------------------------------------------------------------------
   policy_rate −1pp     | 0.00 0.02 0.08 0.14 0.20 0.33 0.46 0.72 1.00
   tax_rate −1pp        | 0.00 0.06 0.18 0.26 0.31 0.40 0.52 0.77 1.00
   govt_spending +1pp   | 0.55 0.70 0.69 0.69 0.70 0.74 0.78 0.89 1.00
   money_printed 2pp    | 0.44 0.60 0.65 0.69 0.74 0.83 0.92 0.96 1.00
   qe 10pp              | 0.00 0.06 0.16 0.22 0.28 0.39 0.51 0.75 1.00

   (1.00 = fully delivered. Above 1.00 means it overshoots and comes back.)

   How much of a rate move the economy has FELT (the kernel alone):
   mo   |    1    3    6    9   12   18   24   36   48     (pp of a 1.00pp cut)
   real | 0.01 0.05 0.18 0.33 0.48 0.71 0.86 0.97 1.00
   mkts | 0.50 0.94 1.00 1.00 1.00 1.00 1.00 1.00 1.00
```

---

## RAW TAP OUTPUT

The unedited test stream, for anything the parsing above missed.

```
TAP version 13
# Subtest: index.html has been built
ok 1 - index.html has been built
  ---
  duration_ms: 0.477642
  ...
# Subtest: the bundled page executes without throwing
ok 2 - the bundled page executes without throwing
  ---
  duration_ms: 13.885678
  ...
# Subtest: no import or export keyword survived into the bundle
ok 3 - no import or export keyword survived into the bundle
  ---
  duration_ms: 2.697913
  ...
# Subtest: the page is self-contained — no external requests
ok 4 - the page is self-contained — no external requests
  ---
  duration_ms: 2.454852
  ...
# Subtest: invariants hold across 200 quiet ticks
ok 5 - invariants hold across 200 quiet ticks
  ---
  duration_ms: 22.212359
  ...
# Subtest: invariants hold under a violent policy path
ok 6 - invariants hold under a violent policy path
  ---
  duration_ms: 5.562171
  ...
# Subtest: checkInvariants actually catches a broken book
ok 7 - checkInvariants actually catches a broken book
  ---
  duration_ms: 0.45055
  ...
# Subtest: a crash causes a recession, not just a haircut
ok 8 - a crash causes a recession, not just a haircut
  ---
  duration_ms: 15.55727
  ...
# Subtest: the demand collapse fades but the scar does not
ok 9 - the demand collapse fades but the scar does not
  ---
  duration_ms: 36.645933
  ...
# Subtest: spending in the first year after a crash shrinks the permanent scar
ok 10 - spending in the first year after a crash shrinks the permanent scar
  ---
  duration_ms: 22.040118
  ...
# Subtest: waiting past the window costs you the discount
ok 11 - waiting past the window costs you the discount
  ---
  duration_ms: 19.256349
  ...
# Subtest: forced selling fires in the bubble, and then stops
ok 12 - forced selling fires in the bubble, and then stops
  ---
  duration_ms: 6.880738
  ...
# Subtest: THE DOOM LOOP: banks below the floor cut lending and widen spreads
ok 13 - THE DOOM LOOP: banks below the floor cut lending and widen spreads
  ---
  duration_ms: 3.183212
  ...
# Subtest: a crash takes a real bite out of bank capital
ok 14 - a crash takes a real bite out of bank capital
  ---
  duration_ms: 10.527955
  ...
# Subtest: defaulted debt leaves the credit stock
ok 15 - defaulted debt leaves the credit stock
  ---
  duration_ms: 4.838477
  ...
# Subtest: a crash is survivable and the economy is still playable afterwards
ok 16 - a crash is survivable and the economy is still playable afterwards
  ---
  duration_ms: 9.080836
  ...
# Subtest: RECAPITALISATION IS A QUANTITY, NOT A GESTURE
ok 17 - RECAPITALISATION IS A QUANTITY, NOT A GESTURE
  ---
  duration_ms: 21.992234
  ...
# Subtest: THE CRASH ARC: every published magnitude at once
ok 18 - THE CRASH ARC: every published magnitude at once
  ---
  duration_ms: 11.38083
  ...
# Subtest: THE DECONVOLUTION CONSTANTS ARE MEASUREMENTS, and this re-measures them
ok 19 - THE DECONVOLUTION CONSTANTS ARE MEASUREMENTS, and this re-measures them
  ---
  duration_ms: 12.588165
  ...
# Subtest: the scar PHASES IN rather than landing on month one
ok 20 - the scar PHASES IN rather than landing on month one
  ---
  duration_ms: 2.974376
  ...
# Subtest: MEASURED: the model rebounds after year five and Cerra-Saxena say it should not
not ok 21 - MEASURED: the model rebounds after year five and Cerra-Saxena say it should not # TODO OPEN. Within the 96-month game the loss is right: -10.0% of trend at five years and -7.4% at eight. But run it to ten years and the model has recovered to -4.7%, because most of the five-year loss is a persistent OUTPUT GAP rather than lost capacity, and the gap eventually closes. Only the 3.2pp exogenous capacity cut is genuinely permanent. Cerra & Saxena find no significant rebound at ANY horizon. Closing this by inflating the exogenous scar is not available: it would push the five-year loss to -14% and the trough outside the published band, so the two ends of the arc cannot both be matched with one constant. What it actually says is that the model heals a demand gap faster than the data does — a statement about the demand block, and the same shape as the TAX_SHOCK_TO_GDP and austerity-paradox findings.
  ---
  duration_ms: 6.669007
  location: '/home/ztchr/personal_projects/Crash/test/crisis.test.js:299:1'
  failureType: 'testCodeFailure'
  error: 'output recovered to -4.67% of trend at ten years, from -9.98% at five. That is a rebound.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/crisis.test.js:314:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: WHEN CREDIT BITES BACK: the bust is deeper the bigger the boom was
ok 22 - WHEN CREDIT BITES BACK: the bust is deeper the bigger the boom was
  ---
  duration_ms: 25.332711
  ...
# Subtest: no Math.random anywhere in src/
ok 23 - no Math.random anywhere in src/
  ---
  duration_ms: 2.740906
  ...
# Subtest: no bare time conversion outside units.js
ok 24 - no bare time conversion outside units.js
  ---
  duration_ms: 0.966832
  ...
# Subtest: same seed produces an identical 96-tick history
ok 25 - same seed produces an identical 96-tick history
  ---
  duration_ms: 26.370733
  ...
# Subtest: every state field is documented in 01-variables.md
ok 26 - every state field is documented in 01-variables.md
  ---
  duration_ms: 1.996545
  ...
# Subtest: 01-variables.md does not document fields the model no longer has
ok 27 - 01-variables.md does not document fields the model no longer has
  ---
  duration_ms: 0.516282
  ...
# Subtest: every dial, gauge, scenario, shock and ending is named in the docs
ok 28 - every dial, gauge, scenario, shock and ending is named in the docs
  ---
  duration_ms: 1.397892
  ...
# Subtest: every transmitted driver has a player-facing name
ok 29 - every transmitted driver has a player-facing name
  ---
  duration_ms: 0.106443
  ...
# Subtest: the docs index lists every file in docs/
ok 30 - the docs index lists every file in docs/
  ---
  duration_ms: 0.341487
  ...
# Subtest: US 2008-12: the rate dial does reach its floor and stay there
ok 31 - US 2008-12: the rate dial does reach its floor and stay there
  ---
  duration_ms: 14.532678
  ...
# Subtest: US 2008-12: THE CRISIS IS ENTIRELY OFFSET BY THE RATE CUTS THAT FOLLOWED IT
not ok 32 - US 2008-12: THE CRISIS IS ENTIRELY OFFSET BY THE RATE CUTS THAT FOLLOWED IT # TODO THE MODEL DOES NOT PRODUCE THE GREAT RECESSION, and the reason is the opposite of what you would guess. Fed with the actual policy path, output troughs at -1.86% of trend (US: -5 to -7), unemployment rises +0.32pp to 5.13% at month 10 (US: +5.0pp to 10.0% at month 22), inflation never goes below 2.26% (US: -2.1%), and government debt FALLS from 64% to 60% (US: 64 -> 100). The 1.75pp of rate cuts delivered between months 2 and 11 produce a boom that more than cancels a financial crisis: output is +3.83% of trend at month 6, BEFORE Lehman lands. So this is not the crash being too weak — test/crisis.test.js shows the crash arc is right in isolation — it is the monetary channel being too strong relative to it. Note also that debt falling through a crisis is arithmetically impossible in the data and points at the same place: see THE ONE FINDING UNDERNEATH ALL FOUR.
  ---
  duration_ms: 9.71618
  location: '/home/ztchr/personal_projects/Crash/test/episodes.test.js:112:1'
  failureType: 'testCodeFailure'
  error: 'unemployment rose 0.32pp, peaking in month 10; the US went 5.0 to 10.0. Output trough -1.86% of trend, inflation low 2.26%, debt 64 -> 60.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/episodes.test.js:128:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async startSubtestAfterBootstrap (node:internal/test_runner/harness:296:3)
  ...
# Subtest: US 2021-23: fiscal transfers plus a supply shock do produce an inflation
ok 33 - US 2021-23: fiscal transfers plus a supply shock do produce an inflation
  ---
  duration_ms: 7.704007
  ...
# Subtest: US 2021-23: THE DISINFLATION NEVER HAPPENS
not ok 34 - US 2021-23: THE DISINFLATION NEVER HAPPENS # TODO THE HARD ONE THE AUDIT BRIEF FLAGGED, and it fails much harder than expected. Inflation does not peak inside the 40-month window at all: it is still rising at month 40, at 36.81%, having passed 14.06% at month 32 when US CPI was 3.1%. A funds rate taken to 5.25% by month 27 does not stop it. Two mechanisms are responsible and both are visible in the path. (1) The transmitted rate is 2.28% at month 30 and 4.10% at month 40 while the DIAL has been at 5.25 since month 27 — the real economy never feels the hike, so the REAL rate stays deeply negative and demand keeps rising. (2) Credibility falls 0.851 -> 0.000 by month 29 purely from realised misses, which quadruples kappa and makes the process self-reinforcing. Unemployment peaks at 5.81% (US: never above 4.0), so the sacrifice ratio question the brief asked cannot even be posed — the model never buys the disinflation at any price. Do not raise the transmission speed or lower kappa to close this: see THE ONE FINDING UNDERNEATH ALL FOUR.
  ---
  duration_ms: 5.252777
  location: '/home/ztchr/personal_projects/Crash/test/episodes.test.js:169:1'
  failureType: 'testCodeFailure'
  error: 'inflation peaked at 36.81% in month 40 and was 14.06% at month 32; the US peaked at 9.1% in month 18 and was at 3.1% by month 32. Credibility bottomed at 0.000 in month 29.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/episodes.test.js:187:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: UK 1979-83: low credibility really does make inflation more expensive
ok 35 - UK 1979-83: low credibility really does make inflation more expensive
  ---
  duration_ms: 5.91965
  ...
# Subtest: UK 1979-83: THE RECESSION THAT PAID FOR IT NEVER ARRIVES
not ok 36 - UK 1979-83: THE RECESSION THAT PAID FOR IT NEVER ARRIVES # TODO The disinflation is not bought, so the price is not paid. Inflation peaks at 20.39% but in month 60, not month 13, and is still 13.71% at month 48 — 67% of its peak, against a UK figure of 4.6%. Unemployment rises +0.50pp to 6.68% where the UK went 5.4 -> 11.9, so the measured sacrifice ratio is 0.29 point-years per pp against Ball 1994's 2-4 for this exact episode. THE REASON IS INSTRUCTIVE AND IS NOT A COEFFICIENT: a 17% MLR against 16.8% expected inflation is a REAL rate of roughly zero, so the model correctly reads Howe's budget as barely contractionary. What is missing is what made it contractionary in fact — an announced regime change that moved expectations ahead of the outturn. The model has no channel for that at all: credibility falls 0.189 -> 0.000 and never recovers, because it responds only to realised inflation.
  ---
  duration_ms: 4.688731
  location: '/home/ztchr/personal_projects/Crash/test/episodes.test.js:231:1'
  failureType: 'testCodeFailure'
  error: "inflation peaked in month 60 at 20.39% and was 13.71% at four years; unemployment rose 0.50pp; sacrifice ratio 0.29 against Ball's 2-4."
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/episodes.test.js:251:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: JAPAN: own-currency debt held at home does not reprice, and foreign-held does
ok 37 - JAPAN: own-currency debt held at home does not reprice, and foreign-held does
  ---
  duration_ms: 31.109219
  ...
# Subtest: JAPAN: THE MODEL CANNOT HOLD A DEFLATION
not ok 38 - JAPAN: THE MODEL CANNOT HOLD A DEFLATION # TODO Inflation is under 0.5% in 2 of 120 months. It leaves the deflation inside a year (1.44% at month 12), passes target at month 24 and reaches 3.95% by month 60 with the policy rate on the floor the whole time. Debt never exceeds 90% — Japan passed 150% — because the inflation the model invents erodes it. THE MISSING MECHANISM IS DOWNWARD DE-ANCHORING: updateExpectations pulls expectations back toward inflation_target from BELOW at the same rate as from above, so a central bank with credibility 0.7 that cannot reach 2% is not representable. Japan's problem was precisely that nobody believed the BoJ could get there. This is the same absence as the other three episodes, seen from the deflationary side.
  ---
  duration_ms: 13.131949
  location: '/home/ztchr/personal_projects/Crash/test/episodes.test.js:307:1'
  failureType: 'testCodeFailure'
  error: 'inflation was under 0.5% in 2 of 120 months and debt peaked at 90%. Japan: most of the decade, and past 150%. Model inflation at m12/m36/m60: 1.44 / 2.99 / 3.95.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/episodes.test.js:321:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: the Taylor principle IS satisfiable — but only by jumping, never by walking
ok 39 - the Taylor principle IS satisfiable — but only by jumping, never by walking
  ---
  duration_ms: 6.650039
  ...
# Subtest: THE ONE FINDING UNDERNEATH ALL FOUR: a bifurcation in the playable range
not ok 40 - THE ONE FINDING UNDERNEATH ALL FOUR: a bifurcation in the playable range # TODO THE LARGEST FINDING IN docs/12, AND THE AUDIT BRIEF DID NOT ANTICIPATE IT. The model does not disinflate GRADUALLY — it either stabilises or diverges, with a knife-edge between them and nothing in the middle, and real economies live in the middle. Measured, from 8% inflation and 7% expected, with the rate moved in ONE step: to 7% -> inflation reaches 217.6% by month 60; to 9% -> it falls to 0.69%. Two percentage points of policy separate hyperinflation from success. Worse, the SAME destination reached gradually flips the outcome: 15% immediately -> 2.16% deflation at month 36; 15% over 18 months -> 12.12%; 15% over 24 months -> 250%. THE MECHANISM: demand responds to the REAL user cost, expectations are formed entirely from realised inflation, and the transmitted rate takes about three years to arrive. So expected_inflation responds to inflation faster than policy_rate_demand responds to the dial, the real rate moves the WRONG WAY when inflation rises, and the loop is positive unless the nominal move is large enough to clear the whole distance at once. Credibility compounds it: it falls only on realised misses, so it collapses exactly when it is most needed and quadruples kappa on the way down. This is docs/07 L6's defect class — a discontinuity inside the range the player occupies — at the largest scale it appears anywhere in the model, and it explains all four episode failures at once. WHAT IT MEANS FOR SECTION 5: the audit brief recommends forward guidance as a depth feature. This upgrades it from a nice-to-have to a prerequisite — every historical disinflation was won by moving expectations AHEAD of the outturn, and there is no channel for that here. It is also why Section 5 was NOT built in this pass: an announcement effect bolted onto a process that diverges under the real Volcker path would be decoration on a defect.
  ---
  duration_ms: 7.818999
  location: '/home/ztchr/personal_projects/Crash/test/episodes.test.js:348:1'
  failureType: 'testCodeFailure'
  error: 'a 7% policy rate leaves inflation at 25.22% and a 9% rate at 4.61% after three years. Two points of policy cannot separate hyperinflation from success — that is a bifurcation, not a response curve.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/episodes.test.js:393:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: every event leaves the accounting identities intact
ok 41 - every event leaves the accounting identities intact
  ---
  duration_ms: 12.806781
  ...
# Subtest: every event actually changes something that survives the tick
ok 42 - every event actually changes something that survives the tick
  ---
  duration_ms: 6.358459
  ...
# Subtest: no event writes a pipeline target
ok 43 - no event writes a pipeline target
  ---
  duration_ms: 3.408179
  ...
# Subtest: full terms with shocks on and invariants armed, across every scenario
ok 44 - full terms with shocks on and invariants armed, across every scenario
  ---
  duration_ms: 358.842572
  ...
# Subtest: A WOBBLE IN A STRETCHED SYSTEM IS A DIFFERENT EVENT (docs/12 M3)
ok 45 - A WOBBLE IN A STRETCHED SYSTEM IS A DIFFERENT EVENT (docs/12 M3)
  ---
  duration_ms: 5.395248
  ...
# Subtest: no event is invisible to the player
ok 46 - no event is invisible to the player
  ---
  duration_ms: 6.787388
  ...
# Subtest: a temporary rate hike produces a HUMP, not a ramp
ok 47 - a temporary rate hike produces a HUMP, not a ramp
  ---
  duration_ms: 21.364821
  ...
# Subtest: the ordering of the peaks is output, then unemployment, then inflation
ok 48 - the ordering of the peaks is output, then unemployment, then inflation
  ---
  duration_ms: 13.179641
  ...
# Subtest: the response scales with the size of the impulse and not with its sign
ok 49 - the response scales with the size of the impulse and not with its sign
  ---
  duration_ms: 39.621888
  ...
# Subtest: a cut is a weaker impulse than a hike, for as long as the impulse is live
ok 50 - a cut is a weaker impulse than a hike, for as long as the impulse is live
  ---
  duration_ms: 20.219453
  ...
# Subtest: MEASURED: the labour market has no lag behind output, and here it is
not ok 51 - MEASURED: the labour market has no lag behind output, and here it is # TODO OPEN AND DELIBERATELY NOT CLOSED. Unemployment peaks in the SAME month as output, and a -3pp external demand shock puts 38% of the eventual 36-month unemployment response into month ONE (du 0.4725 of 1.2456; 48% of the 12-month response). labour.js sets its Okun target from the CURRENT gap and closes it at FIRING_SPEED 0.60/month. Whether that is wrong depends on which claim you read: docs/02 Asymmetry 2 says "firms fire in WEEKS and hire over quarters", which the model delivers exactly — and the jobless-recovery half of it is real (du/dgap doubles from 0.198 to 0.391 over four years as output recovers and employment does not). What is missing is the DECISION lag: firms cut hours and wait a quarter before shedding heads. Adding it means a new smoothing parameter on the Okun target in the busiest rule in the model, and the only thing that pins its magnitude is the reduced-form peak month it would be tuned to reproduce. Left open, with the number printed, rather than tuned.
  ---
  duration_ms: 7.763922
  location: '/home/ztchr/personal_projects/Crash/test/irf.test.js:109:1'
  failureType: 'testCodeFailure'
  error: '37% of the eventual unemployment response to a demand shock lands in the FIRST MONTH (0.4725 of 1.2761). Firms do not shed a third of the eventual job losses in month one.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/irf.test.js:134:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: the spending impulse is fast and the rate impulse is slow
ok 52 - the spending impulse is fast and the rate impulse is slow
  ---
  duration_ms: 12.498262
  ...
# Subtest: QE and the rate dial have the same SHAPE and different sizes
ok 53 - QE and the rate dial have the same SHAPE and different sizes
  ---
  duration_ms: 18.893768
  ...
# Subtest: a dial move reaches the transmitted driver and converges to the dial
ok 54 - a dial move reaches the transmitted driver and converges to the dial
  ---
  duration_ms: 13.861951
  ...
# Subtest: markets feel a rate move faster than the real economy
ok 55 - markets feel a rate move faster than the real economy
  ---
  duration_ms: 2.723526
  ...
# Subtest: the output response to a rate move is LAGGED, not instant
ok 56 - the output response to a rate move is LAGGED, not instant
  ---
  duration_ms: 16.143547
  ...
# Subtest: the pipeline refuses to schedule into a field a rule owns
ok 57 - the pipeline refuses to schedule into a field a rule owns
  ---
  duration_ms: 0.495554
  ...
# Subtest: no rule assigns to a pipeline target
ok 58 - no rule assigns to a pipeline target
  ---
  duration_ms: 1.193772
  ...
# Subtest: every declared pipeline target exists on a fresh state
ok 59 - every declared pipeline target exists on a fresh state
  ---
  duration_ms: 0.182408
  ...
# Subtest: the Taylor autopilot faces the same lags the player does
ok 60 - the Taylor autopilot faces the same lags the player does
  ---
  duration_ms: 21.458435
  ...
# Subtest: every dial either schedules a lag or is documented as immediate
ok 61 - every dial either schedules a lag or is documented as immediate
  ---
  duration_ms: 3.180912
  ...
# Subtest: recession multiplier lands in the published range
ok 62 - recession multiplier lands in the published range
  ---
  duration_ms: 21.873998
  ...
# Subtest: expansion multiplier lands in the published range
ok 63 - expansion multiplier lands in the published range
  ---
  duration_ms: 11.455601
  ...
# Subtest: the multiplier is larger in a slump than in a boom
ok 64 - the multiplier is larger in a slump than in a boom
  ---
  duration_ms: 20.696974
  ...
# Subtest: the same spending buys more OUTPUT with slack and more PRICES without
ok 65 - the same spending buys more OUTPUT with slack and more PRICES without
  ---
  duration_ms: 16.182775
  ...
# Subtest: holding the rate fixed makes the multiplier much larger
ok 66 - holding the rate fixed makes the multiplier much larger
  ---
  duration_ms: 12.474514
  ...
# Subtest: THE QE LESSON: printing into slack with a credible CB barely bites
ok 67 - THE QE LESSON: printing into slack with a credible CB barely bites
  ---
  duration_ms: 5.474393
  ...
# Subtest: printing with no slack and no credibility goes straight to prices
ok 68 - printing with no slack and no credibility goes straight to prices
  ---
  duration_ms: 0.832185
  ...
# Subtest: printing buys real things when there is slack to buy them with
ok 69 - printing buys real things when there is slack to buy them with
  ---
  duration_ms: 10.625565
  ...
# Subtest: AUSTERITY LEAKS: a tax rise collects less than you legislated, and worse with slack
ok 70 - AUSTERITY LEAKS: a tax rise collects less than you legislated, and worse with slack
  ---
  duration_ms: 98.566127
  ...
# Subtest: THE SIGN FLIP THE DOCS PROMISED: how far away is it
not ok 71 - THE SIGN FLIP THE DOCS PROMISED: how far away is it # TODO OPEN, AND THE SAME FINDING AS TAX_SHOCK_TO_GDP. Revenue rises at every playable gap and no plausible parameter draw changes that. Closed form: with revenue = tau + e*(tau/100)*gap, revenue falls only if +1pp of tax costs more than 3.11% of output at a zero gap or 2.87% at -6%. The model delivers 0.99%. The requirement drops to 1.76% only at the elasticity's high end (1.8) AND a -12% gap, which is the one corner where it lands inside Romer-Romer (2.0-3.0) at all. So the austerity paradox is absent BECAUSE the tax multiplier is small — one finding, not two, and the fix is a statement about the demand block rather than a coefficient to bend. docs/07 L4 proposed exactly this test and it was never written.
  ---
  duration_ms: 15.688718
  location: '/home/ztchr/personal_projects/Crash/test/multipliers.test.js:248:1'
  failureType: 'testCodeFailure'
  error: 'the sign flip needs +1pp of tax to cost 2.87% of output at a -6% gap; the model delivers 0.96%. Romer-Romer is 2.0-3.0.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/multipliers.test.js:264:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: every parameter has a value inside its range
ok 72 - every parameter has a value inside its range
  ---
  duration_ms: 1.853629
  ...
# Subtest: every parameter has a unit, a source and a known confidence level
ok 73 - every parameter has a unit, a source and a known confidence level
  ---
  duration_ms: 0.291419
  ...
# Subtest: the deleted double-count has not crept back
ok 74 - the deleted double-count has not crept back
  ---
  duration_ms: 0.162997
  ...
# Subtest: kernels are normalised and peak on the documented month
ok 75 - kernels are normalised and peak on the documented month
  ---
  duration_ms: 0.471475
  ...
# Subtest: every fitted kernel shape has a lag entry
ok 76 - every fitted kernel shape has a lag entry
  ---
  duration_ms: 0.150891
  ...
# Subtest: START satisfies the accounting identities
ok 77 - START satisfies the accounting identities
  ---
  duration_ms: 0.182406
  ...
# Subtest: ROUND TRIP: the stance returns exactly, to nine decimal places
ok 78 - ROUND TRIP: the stance returns exactly, to nine decimal places
  ---
  duration_ms: 33.904485
  ...
# Subtest: ROUND TRIP: the ECONOMY does not return, and the residue is real capital
ok 79 - ROUND TRIP: the ECONOMY does not return, and the residue is real capital
  ---
  duration_ms: 39.935511
  ...
# Subtest: HIKE-HOLD-CUT: no permanent ratchet, and the jobs cost outlasts the gain
ok 80 - HIKE-HOLD-CUT: no permanent ratchet, and the jobs cost outlasts the gain
  ---
  duration_ms: 27.319117
  ...
# Subtest: STOP-GO: a symmetric-looking cycle is a persistent EASING, and it shows
ok 81 - STOP-GO: a symmetric-looking cycle is a persistent EASING, and it shows
  ---
  duration_ms: 27.055379
  ...
# Subtest: a path and a held move are not the same thing, and the difference is measurable
ok 82 - a path and a held move are not the same thing, and the difference is measurable
  ---
  duration_ms: 12.532779
  ...
# Subtest: every scenario starts internally consistent
ok 83 - every scenario starts internally consistent
  ---
  duration_ms: 1.516019
  ...
# Subtest: the bubble scenario looks healthy on every gauge except the credit gap
ok 84 - the bubble scenario looks healthy on every gauge except the credit gap
  ---
  duration_ms: 0.133592
  ...
# Subtest: the bubble hides for four years — the design promise
ok 85 - the bubble hides for four years — the design promise
  ---
  duration_ms: 13.350744
  ...
# Subtest: every scenario starts in, and stays a quarter in, its advertised regime
ok 86 - every scenario starts in, and stays a quarter in, its advertised regime
  ---
  duration_ms: 8.71555
  ...
# Subtest: the recession scenario has the rate dial genuinely dead
ok 87 - the recession scenario has the rate dial genuinely dead
  ---
  duration_ms: 1.861286
  ...
# Subtest: no scenario produces absurd numbers inside a term
ok 88 - no scenario produces absurd numbers inside a term
  ---
  duration_ms: 47.839407
  ...
# Subtest: NEUTRAL ANCHORS ARE BUILT FROM NEUTRAL, in every scenario
ok 89 - NEUTRAL ANCHORS ARE BUILT FROM NEUTRAL, in every scenario
  ---
  duration_ms: 0.527994
  ...
# Subtest: debt_trap: the real economy responds to the yield at all
ok 90 - debt_trap: the real economy responds to the yield at all
  ---
  duration_ms: 2.872414
  ...
# Subtest: debt_trap: the benchmark central bank is no longer identical to doing nothing
ok 91 - debt_trap: the benchmark central bank is no longer identical to doing nothing
  ---
  duration_ms: 5.936719
  ...
# Subtest: debt_trap: THE DECISION — you cannot consolidate your way out alone
ok 92 - debt_trap: THE DECISION — you cannot consolidate your way out alone
  ---
  duration_ms: 24.578983
  ...
# Subtest: a hike does not bite the interest bill on impact
ok 93 - a hike does not bite the interest bill on impact
  ---
  duration_ms: 2.733245
  ...
# Subtest: the core macro block is stable around the steady state
ok 94 - the core macro block is stable around the steady state
  ---
  duration_ms: 25.957103
  ...
# Subtest: the debt loop diverges, but slowly enough to be playable
ok 95 - the debt loop diverges, but slowly enough to be playable
  ---
  duration_ms: 16.587181
  ...
# Subtest: a one-off demand shock decays rather than compounding
ok 96 - a one-off demand shock decays rather than compounding
  ---
  duration_ms: 9.23636
  ...
# Subtest: 200 ticks of no input and nothing drifts
ok 97 - 200 ticks of no input and nothing drifts
  ---
  duration_ms: 28.578183
  ...
# Subtest: credibility rises when the target is hit, and slowly
ok 98 - credibility rises when the target is hit, and slowly
  ---
  duration_ms: 16.177687
  ...
# Subtest: the credit gap does not open on its own
ok 99 - the credit gap does not open on its own
  ---
  duration_ms: 28.683264
  ...
# Subtest: a rate cut does more for OUTPUT with slack than at capacity
ok 100 - a rate cut does more for OUTPUT with slack than at capacity
  ---
  duration_ms: 33.697001
  ...
# Subtest: a cut is weaker than the equivalent hike
ok 101 - a cut is weaker than the equivalent hike
  ---
  duration_ms: 13.689505
  ...
# Subtest: a cut-then-hike round trip leaves the stance where it started
ok 102 - a cut-then-hike round trip leaves the stance where it started
  ---
  duration_ms: 6.550109
  ...
# Subtest: THE LOWER BOUND: easing stops working as the rate approaches it
ok 103 - THE LOWER BOUND: easing stops working as the rate approaches it
  ---
  duration_ms: 18.565238
  ...
# Subtest: QE still works when the rate dial has run out of room
ok 104 - QE still works when the rate dial has run out of room
  ---
  duration_ms: 12.176035
  ...
# Subtest: unemployment rises faster than it falls
ok 105 - unemployment rises faster than it falls
  ---
  duration_ms: 10.111124
  ...
# Subtest: SWEEP: more spending never raises unemployment, at any starting gap
ok 106 - SWEEP: more spending never raises unemployment, at any starting gap
  ---
  duration_ms: 62.216202
  ...
# Subtest: SWEEP: no step changes in the response to a rate cut
ok 107 - SWEEP: no step changes in the response to a rate cut
  ---
  duration_ms: 20.312636
  ...
# Subtest: the ONE cliff in the model is the capacity ceiling, and it is where it says
ok 108 - the ONE cliff in the model is the capacity ceiling, and it is where it says
  ---
  duration_ms: 3.094996
  ...
# Subtest: L5: HIKING AT THE LOWER BOUND MUST NOT RAISE OUTPUT
ok 109 - L5: HIKING AT THE LOWER BOUND MUST NOT RAISE OUTPUT
  ---
  duration_ms: 12.211729
  ...
# Subtest: L3: the fiscal multiplier has no step in it as the rate falls to the bound
ok 110 - L3: the fiscal multiplier has no step in it as the rate falls to the bound
  ---
  duration_ms: 328.843724
  ...
# Subtest: investment.js reads the rate DIAL only to display it
ok 111 - investment.js reads the rate DIAL only to display it
  ---
  duration_ms: 0.825585
  ...
# Subtest: the whole UI boots without throwing
ok 112 - the whole UI boots without throwing
  ---
  duration_ms: 0.968536
  ...
# Subtest: every shell container the app needs exists
ok 113 - every shell container the app needs exists
  ---
  duration_ms: 0.435503
  ...
# Subtest: a gauge mounts for every indicator
ok 114 - a gauge mounts for every indicator
  ---
  duration_ms: 0.166981
  ...
# Subtest: a dial mounts for every dial
ok 115 - a dial mounts for every dial
  ---
  duration_ms: 0.129192
  ...
# Subtest: every gauge can open a why panel with real terms
ok 116 - every gauge can open a why panel with real terms
  ---
  duration_ms: 3.801372
  ...
# Subtest: every gauge has a history series to draw
ok 117 - every gauge has a history series to draw
  ---
  duration_ms: 4.530903
  ...
# Subtest: moving a dial schedules an effect instead of applying it
ok 118 - moving a dial schedules an effect instead of applying it
  ---
  duration_ms: 0.467514
  ...
# Subtest: a session runs a full term without throwing
ok 119 - a session runs a full term without throwing
  ---
  duration_ms: 14.65726
  ...
# Subtest: restarting on the same seed keeps the previous run as a ghost
ok 120 - restarting on the same seed keeps the previous run as a ghost
  ---
  duration_ms: 2.678258
  ...
# Subtest: the game starts paused, at 1x, with play as the visible action
ok 121 - the game starts paused, at 1x, with play as the visible action
  ---
  duration_ms: 0.392545
  ...
# Subtest: pausing does not throw away the chosen speed
ok 122 - pausing does not throw away the chosen speed
  ---
  duration_ms: 0.259452
  ...
# Subtest: every gauge and every dial has a plain-English definition
ok 123 - every gauge and every dial has a plain-English definition
  ---
  duration_ms: 0.150626
  ...
# Subtest: every gauge can say whether it is getting worse
ok 124 - every gauge can say whether it is getting worse
  ---
  duration_ms: 0.144031
  ...
# Subtest: a passive calm run reaches the end of the term and is scored
ok 125 - a passive calm run reaches the end of the term and is scored
  ---
  duration_ms: 9.071424
  ...
# Subtest: a losing run reaches a named ending with a lesson
ok 126 - a losing run reaches a named ending with a lesson
  ---
  duration_ms: 3.178889
  ...
# Subtest: the DEFERRED register matches the code, in both directions
ok 127 - the DEFERRED register matches the code, in both directions
  ---
  duration_ms: 11.674977
  ...
# Subtest: every recorded parameter conflict is still genuinely unresolved
ok 128 - every recorded parameter conflict is still genuinely unresolved
  ---
  duration_ms: 2.294565
  ...
# Subtest: RATE_TO_OUTPUT: 1pp of policy rate, held a year
ok 129 - RATE_TO_OUTPUT: 1pp of policy rate, held a year
  ---
  duration_ms: 17.517972
  ...
# Subtest: AUTO_STABILISER_ABSORPTION: share of an income shock that never lands
ok 130 - AUTO_STABILISER_ABSORPTION: share of an income shock that never lands
  ---
  duration_ms: 10.615853
  ...
# Subtest: a tax cut RAISES output, and does it through consumption
ok 131 - a tax cut RAISES output, and does it through consumption
  ---
  duration_ms: 22.176824
  ...
# Subtest: QE_TO_GDP: bond buying reaches output through the yield, and how much
ok 132 - QE_TO_GDP: bond buying reaches output through the yield, and how much
  ---
  duration_ms: 8.408083
  ...
# Subtest: RATE_TO_INFLATION: the model is about half the published estimate
not ok 133 - RATE_TO_INFLATION: the model is about half the published estimate # TODO KNOWN AND ARGUABLY CORRECT. A 1pp hike moves inflation ~0.12pp at 24 months against a published 0.2-0.4. This is the anchored Phillips slope doing exactly what docs/02 says it should: with kappa at 0.05 the demand channel barely moves prices, and real surges are supposed to come from supply shocks and unanchoring. The published range is estimated across regimes that include the unanchored 1970s. Do not raise kappa to close this.
  ---
  duration_ms: 5.670047
  location: '/home/ztchr/personal_projects/Crash/test/validation.test.js:131:1'
  failureType: 'testCodeFailure'
  error: 'model 0.122, literature 0.2-0.4'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/validation.test.js:142:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: CRISIS_OUTPUT_TROUGH: the realised peak-to-trough lands in the published range
ok 134 - CRISIS_OUTPUT_TROUGH: the realised peak-to-trough lands in the published range
  ---
  duration_ms: 12.188832
  ...
# Subtest: TAX_SHOCK_TO_GDP: the model is far below Romer-Romer
not ok 135 - TAX_SHOCK_TO_GDP: the model is far below Romer-Romer # TODO KNOWN. A 1% of GDP tax rise costs ~0.33% of output over 30 months against a published 2.0-3.0. The Romer-Romer narrative multiplier is the largest in the literature and famously larger than structural models produce; the model also has a responding central bank and a crowding-out term that works in the opposite direction on a tax rise. Recorded rather than closed: reproducing 2.5 would mean roughly tripling the consumption response to disposable income, which the MPC evidence does not support.
  ---
  duration_ms: 6.378419
  location: '/home/ztchr/personal_projects/Crash/test/validation.test.js:183:1'
  failureType: 'testCodeFailure'
  error: 'model 0.460, literature 2-3'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/validation.test.js:195:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: PRIVATE debt reprices instantly, and government debt no longer does
not ok 136 - PRIVATE debt reprices instantly, and government debt no longer does # TODO RECORDED, NOT FIXED (docs/12, E1). credit.js computes the debt-service burden as private_credit * (policy_rate + credit_spread) / 100 — the DIAL, and the whole stock. That is exactly the error the government's interest bill carried until DEBT_AVERAGE_MATURITY_YEARS was added this pass: every mortgage and every corporate loan is floating-rate with no lag, so the default rate responds to a rate move the month it is announced. The asymmetry is now visible and odd — the state refinances over seven years while its households refinance overnight. Fixing it needs a private-debt maturity parameter with its own source (the fixed/floating mix differs enormously across countries, which is most of why the 2022 hiking cycle hurt the UK and Australia so much more than the US), so it is a modelling change rather than a keystroke. tools/lint.mjs holds the exception with a declared reason so it cannot be forgotten.
  ---
  duration_ms: 2.68126
  location: '/home/ztchr/personal_projects/Crash/test/validation.test.js:198:1'
  failureType: 'testCodeFailure'
  error: 'a 3pp hike moved the default rate 0.67540pp in its FIRST month. Borrowers do not all reprice in thirty days.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/validation.test.js:220:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
1..136
# tests 136
# suites 0
# pass 125
# fail 0
# cancelled 0
# skipped 0
# todo 11
# duration_ms 650.129376
```
