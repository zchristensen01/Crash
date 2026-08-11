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
| Tests | **149** |
| Passing | **135** |
| Failing (regressions) | **0** |
| Open disagreements (`OPEN`) | **14** |
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

### 1. THE CRASH ARC: the unemployment cost of a banking crisis

*`test/crisis.test.js`*

MOVED BY THE A1 TRANSMISSION SPLIT, AND GATED ON PHASE 4.1. Unemployment now peaks +1.93pp against a published 2-5 for a banking crisis; it was inside the band before the split. The four other magnitudes in the crash arc — peak-to-trough, the month of the trough, the five-year loss against trend and the absence of a rebound — all still hold, which is why this is one assertion rather than the whole test. CRISIS_IMPULSE_AMPLIFICATION and CRISIS_SCAR_AMPLIFICATION are solved FROM this model to make the realised trough equal CRISIS_OUTPUT_TROUGH, so they absorb exactly this kind of change and Phase 4.1 re-solves them after Phases 2 and 3. Re-solving them before the demand block has stopped moving would mean doing it twice and believing the first answer. Note the shortfall is 0.07pp: this is a band edge, not a collapse.

**Measured on this run:**

```
unemployment peaked +1.93pp; a banking crisis costs 2-5
```

### 2. MEASURED: the model rebounds after year five and Cerra-Saxena say it should not

*`test/crisis.test.js`*

OPEN. Within the 96-month game the loss is right: -10.0% of trend at five years and -7.4% at eight. But run it to ten years and the model has recovered to -4.7%, because most of the five-year loss is a persistent OUTPUT GAP rather than lost capacity, and the gap eventually closes. Only the 3.2pp exogenous capacity cut is genuinely permanent. Cerra & Saxena find no significant rebound at ANY horizon. Closing this by inflating the exogenous scar is not available: it would push the five-year loss to -14% and the trough outside the published band, so the two ends of the arc cannot both be matched with one constant. What it actually says is that the model heals a demand gap faster than the data does — a statement about the demand block, and the same shape as the TAX_SHOCK_TO_GDP and austerity-paradox findings.

**Measured on this run:**

```
output recovered to -4.84% of trend at ten years, from -9.84% at five. That is a rebound.
```

### 3. E1: no permanent dial move diverges through an undeclared loop

*`test/divergence.test.js`*

FAILS BY DESIGN UNTIL PHASE 3.5. This is the guard whose absence let Section B survive three audits, and it is written before the fix so that the fix has something to turn green. Measured today: a permanent policy rate of 1.5% — a one-point cut from neutral, the most ordinary move in the game — sends asset/fundamental to 2.87e11 and the credit gap to +648 by month 480, and setting ASSET_PRICE_CREDIT_CHANNEL to 0 makes the same run settle at A/F 1.38 with a gap of -7.4. The loop is therefore isolated, not inferred. It is not in parameters.py UNBALANCED_LOOPS, though credit.js:200 asserts in a comment that it is deliberate. Phase 3.2 closes it.

### 4. E1 acceptance: a permanent 1pp cut reaches a finite credit gap and A/F

*`test/divergence.test.js`*

THE PHASE 3.5 GATE, stated as its own test so the general guard above cannot be satisfied by reclassifying the cause. Section B1's exact repro: calm, policy_rate -> 1.5 at month 0, nothing else, 480 ticks.

**Measured on this run:**

```
credit_to_gdp_gap is 6.314e+2 at month 480
```

### 5. US 2008-12: THE CRISIS IS ENTIRELY OFFSET BY THE RATE CUTS THAT FOLLOWED IT

*`test/episodes.test.js`*

STILL FAILS, AND PHASE 2 BARELY TOUCHED IT — which is itself the finding. Re-measured after the A1 transmission split and the derived rate ceiling: output troughs at -1.85% of trend (was -1.86; US: -5 to -7), unemployment rises +0.14pp peaking in month 9 (was +0.32pp; US: +5.0pp to 10.0% at month 22), inflation never goes below 2.25% (was 2.26; US: -2.1%), and government debt FALLS from 64% to 61% (was 60; US: 64 -> 100). Output is +3.55% of trend at month 6, BEFORE Lehman lands. THE UNEMPLOYMENT RESPONSE GOT SMALLER, not larger. WHY PHASE 2 DID NOT HELP HERE, and it is worth understanding: this episode is not a disinflation, it is a CRASH plus an easing, and the two Section A defects were both about tightening arriving too slowly. Making the rate arrive faster makes the EASING arrive faster too, so the 1.75pp of cuts delivered between months 2 and 11 now offset the crisis sooner rather than less. The asymmetry the brief identified is unchanged: the cut reaches asset prices on a 1-month kernel and now reaches borrowers on a 3-month one, while the crisis works through the credit and capital blocks over years. What is left is a demand block that heals too fast, which is the same statement as OPEN \#1 and TAX_SHOCK_TO_GDP, and it sits downstream of Section B rather than Section A. Re-measure after Phase 3.

**Measured on this run:**

```
unemployment rose 0.14pp, peaking in month 9; the US went 5.0 to 10.0. Output trough -1.85% of trend, inflation low 2.25%, debt 64 -> 61.
```

### 6. US 2021-23: THE DISINFLATION NEVER HAPPENS

*`test/episodes.test.js`*

MATERIALLY BETTER AFTER PHASE 2 AND STILL WRONG. Inflation now PEAKS inside the window — 20.54% at month 40, where before it had not peaked at all and was still climbing through 36.81% — and it is 10.41% at month 32 against 14.06% before (US: peaked 9.1% at month 17, 3.1% by month 32). The single biggest change is that the hike now reaches the economy: mechanism (1) in the old diagnosis was that the transmitted rate was 2.28% at month 30 while the DIAL had been at 5.25 since month 27, and that is gone — policy_rate_demand now tracks the dial within a quarter. WHAT IS LEFT IS MECHANISM (2), AND IT IS NOW THE WHOLE OF IT: credibility falls 0.85 -> 0.000 by month 31 purely from realised misses, which quadruples kappa and makes the process self-reinforcing exactly when the central bank most needs to be believed. A 5.25% funds rate against 20% expected inflation is deeply negative in real terms whatever the transmission speed. This is the forward-guidance / expectations channel the project has deferred three times, and after Phase 2 it is the largest single thing still missing from the monetary block — the reasoning in docs/12 that deferred it named the wrong defect, but Phase 2 has now removed that defect and the case for building it is what remains. Do not raise the transmission speed or lower kappa to close this.

**Measured on this run:**

```
inflation peaked at 20.54% in month 40 and was 10.41% at month 32; the US peaked at 9.1% in month 18 and was at 3.1% by month 32. Credibility bottomed at 0.000 in month 31.
```

### 7. UK 1979-83: THE RECESSION THAT PAID FOR IT NEVER ARRIVES

*`test/episodes.test.js`*

THE BIGGEST IMPROVEMENT OF PHASE 2, AND IT STILL FAILS ON THE PRICE. The TIMING is now right: inflation peaks in month 11 where the UK peaked in month 13, against month 60 before the A1 split — the disinflation now happens, and on roughly the historical timetable. It falls to 8.63% at four years, against 13.71% before (UK: 4.6%). The felt rate at month 12 went from 13.12% to 16.86% against a 17% MLR, which is the whole of why: Howe's budget is now actually contractionary in the model rather than nominally so. WHAT STILL FAILS IS THE PRICE, AND IT FAILS IN BOTH DIRECTIONS. The peak is 16.38% against a UK 21.9% — the model no longer overshoots into a late spiral, but it never reaches the historical peak either. And the recession is still absent: unemployment rises 0.64pp where the UK went 5.4 -> 11.9, so the sacrifice ratio is 0.38 point-years per pp against Ball 1994's 2-4 for this exact episode. A disinflation this cheap is not a disinflation anyone would recognise. That is a statement about the DEMAND BLOCK — the same finding as TAX_SHOCK_TO_GDP and the missing austerity paradox, where every real quantity moves too little for the price change that caused it. It is no longer a statement about transmission.

### 8. JAPAN: THE MODEL CANNOT HOLD A DEFLATION

*`test/episodes.test.js`*

UNCHANGED BY PHASE 2, AS EXPECTED, AND THE REASON MATTERS. Inflation is under 0.5% in 2 of 120 months; it leaves the deflation inside a year (1.28% at month 12, was 1.44%), passes target by month 36 (2.78%) and reaches 3.76% by month 60 (was 3.95%) with the policy rate on the floor throughout. Debt peaks at 91% where Japan passed 150%, because the inflation the model invents erodes it. PHASE 2 COULD NOT HAVE HELPED. Both Section A defects were about a TIGHTENING arriving too slowly, and Japan is a decade in which no tightening was attempted and the rate dial was against its LOWER bound the whole time — the one bound Phase 2.4 did not move, because the ELB is physics rather than layout. THE MISSING MECHANISM IS DOWNWARD DE-ANCHORING: updateExpectations pulls expectations back toward inflation_target from BELOW at the same rate as from above, so a central bank with credibility 0.7 that cannot reach 2% is not representable. Japan's problem was precisely that nobody believed the BoJ could get there. That is the same expectations channel US 2021-23 now points at, seen from the deflationary side, and after Phase 2 the two episodes agree on the diagnosis for the first time.

**Measured on this run:**

```
inflation was under 0.5% in 2 of 120 months and debt peaked at 91%. Japan: most of the decade, and past 150%. Model inflation at m12/m36/m60: 1.28 / 2.78 / 3.76.
```

### 9. MEASURED: the labour market has no lag behind output, and here it is

*`test/irf.test.js`*

OPEN AND DELIBERATELY NOT CLOSED. Unemployment peaks in the SAME month as output, and a -3pp external demand shock puts 38% of the eventual 36-month unemployment response into month ONE (du 0.4725 of 1.2456; 48% of the 12-month response). labour.js sets its Okun target from the CURRENT gap and closes it at FIRING_SPEED 0.60/month. Whether that is wrong depends on which claim you read: docs/02 Asymmetry 2 says "firms fire in WEEKS and hire over quarters", which the model delivers exactly — and the jobless-recovery half of it is real (du/dgap doubles from 0.198 to 0.391 over four years as output recovers and employment does not). What is missing is the DECISION lag: firms cut hours and wait a quarter before shedding heads. Adding it means a new smoothing parameter on the Okun target in the busiest rule in the model, and the only thing that pins its magnitude is the reduced-form peak month it would be tuned to reproduce. Left open, with the number printed, rather than tuned.

**Measured on this run:**

```
39% of the eventual unemployment response to a demand shock lands in the FIRST MONTH (0.4725 of 1.2244). Firms do not shed a third of the eventual job losses in month one.
```

### 10. THE SIGN FLIP THE DOCS PROMISED: how far away is it

*`test/multipliers.test.js`*

OPEN, AND THE SAME FINDING AS TAX_SHOCK_TO_GDP. Revenue rises at every playable gap and no plausible parameter draw changes that. Closed form: with revenue = tau + e*(tau/100)*gap, revenue falls only if +1pp of tax costs more than 3.11% of output at a zero gap or 2.87% at -6%. The model delivers 0.99%. The requirement drops to 1.76% only at the elasticity's high end (1.8) AND a -12% gap, which is the one corner where it lands inside Romer-Romer (2.0-3.0) at all. So the austerity paradox is absent BECAUSE the tax multiplier is small — one finding, not two, and the fix is a statement about the demand block rather than a coefficient to bend. docs/07 L4 proposed exactly this test and it was never written.

**Measured on this run:**

```
the sign flip needs +1pp of tax to cost 2.87% of output at a -6% gap; the model delivers 0.91%. Romer-Romer is 2.0-3.0.
```

### 11. A-TABLE: the knife-edge is the wealth channel, and it is still there

*`test/transmission.test.js`*

PHASE 3 CLOSES THIS. Measured as the steepest local sensitivity on a 0.25pp grid, |d inflation@m60 / d policy rate|: pre-A1 as built -366.7 at 7.75% (slope ratio 138x); post-A1 as built -149.2 at 6.25% (slope ratio 80x); post-A1 with no wealth channel -22.5 at 5.50% (slope ratio 19x). Splitting the transmission lag halved the knife-edge and moved it toward the Fisher point, but did not remove it. Switching WEALTH_EFFECT off removes 85% of what is left, which is the isolating experiment: the residual bifurcation is the asset-wealth channel, and that is Section B. The target below is not a picked number — it is what the model itself does with the offending channel switched off, re-measured on every run.

### 12. RATE_TO_INFLATION: the model is about half the published estimate

*`test/validation.test.js`*

KNOWN AND ARGUABLY CORRECT. A 1pp hike moves inflation ~0.12pp at 24 months against a published 0.2-0.4. This is the anchored Phillips slope doing exactly what docs/02 says it should: with kappa at 0.05 the demand channel barely moves prices, and real surges are supposed to come from supply shocks and unanchoring. The published range is estimated across regimes that include the unanchored 1970s. Do not raise kappa to close this.

**Measured on this run:**

```
model 0.123, literature 0.2-0.4
```

### 13. TAX_SHOCK_TO_GDP: the model is far below Romer-Romer

*`test/validation.test.js`*

KNOWN. A 1% of GDP tax rise costs ~0.33% of output over 30 months against a published 2.0-3.0. The Romer-Romer narrative multiplier is the largest in the literature and famously larger than structural models produce; the model also has a responding central bank and a crowding-out term that works in the opposite direction on a tax rise. Recorded rather than closed: reproducing 2.5 would mean roughly tripling the consumption response to disposable income, which the MPC evidence does not support.

**Measured on this run:**

```
model 0.492, literature 2-3
```

### 14. PRIVATE debt reprices instantly, and government debt no longer does

*`test/validation.test.js`*

RECORDED, NOT FIXED (docs/12, E1). credit.js computes the debt-service burden as private_credit * (policy_rate + credit_spread) / 100 — the DIAL, and the whole stock. That is exactly the error the government's interest bill carried until DEBT_AVERAGE_MATURITY_YEARS was added this pass: every mortgage and every corporate loan is floating-rate with no lag, so the default rate responds to a rate move the month it is announced. The asymmetry is now visible and odd — the state refinances over seven years while its households refinance overnight. Fixing it needs a private-debt maturity parameter with its own source (the fixed/floating mix differs enormously across countries, which is most of why the 2022 hiking cycle hurt the UK and Australia so much more than the US), so it is a modelling change rather than a keystroke. tools/lint.mjs holds the exception with a declared reason so it cannot be forgotten.

**Measured on this run:**

```
a 3pp hike moved the default rate 0.67538pp in its FIRST month. Borrowers do not all reprice in thirty days.
```

---

## EVERY TEST, BY FILE

`PASS` = the model matches the evidence. `OPEN` = a recorded disagreement,
with its number in the section above. `FAIL` = a regression.

### `unknown`

| | test | result |
|---|---|---|
| 1 | the rate the autopilot achieves stays in the dial's range and reaches both ends | PASS |
| 2 | the autopilot enforces no bounds of its own — the dial is the only one | PASS |
| 3 | a dial request the bounds refuse is reported, not swallowed | PASS |
| 4 | the truncation count makes a saturated benchmark visible in one number | PASS |
| 5 | the Taylor rule wins stagflation at the derived ceiling and loses at 20 | PASS |
| 6 | a truncation reaches the trace whether the player or the autopilot caused it | PASS |
| 7 | index.html has been built | PASS |
| 8 | the bundled page executes without throwing | PASS |
| 9 | no import or export keyword survived into the bundle | PASS |
| 10 | the page is self-contained — no external requests | PASS |
| 11 | invariants hold across 200 quiet ticks | PASS |
| 12 | invariants hold under a violent policy path | PASS |
| 13 | checkInvariants actually catches a broken book | PASS |
| 14 | a crash causes a recession, not just a haircut | PASS |
| 15 | the demand collapse fades but the scar does not | PASS |
| 16 | spending in the first year after a crash shrinks the permanent scar | PASS |
| 17 | waiting past the window costs you the discount | PASS |
| 18 | forced selling fires in the bubble, and then stops | PASS |
| 19 | THE DOOM LOOP: banks below the floor cut lending and widen spreads | PASS |
| 20 | a crash takes a real bite out of bank capital | PASS |
| 21 | defaulted debt leaves the credit stock | PASS |
| 22 | a crash is survivable and the economy is still playable afterwards | PASS |
| 23 | RECAPITALISATION IS A QUANTITY, NOT A GESTURE | PASS |
| 24 | THE CRASH ARC: every published magnitude at once | PASS |
| 26 | THE DECONVOLUTION CONSTANTS ARE MEASUREMENTS, and this re-measures them | PASS |
| 27 | the scar PHASES IN rather than landing on month one | PASS |
| 29 | WHEN CREDIT BITES BACK: the bust is deeper the bigger the boom was | PASS |
| 30 | no Math.random anywhere in src/ | PASS |
| 31 | no bare time conversion outside units.js | PASS |
| 32 | same seed produces an identical 96-tick history | PASS |
| 35 | every state field is documented in 01-variables.md | PASS |
| 36 | 01-variables.md does not document fields the model no longer has | PASS |
| 37 | every dial, gauge, scenario, shock and ending is named in the docs | PASS |
| 38 | every transmitted driver has a player-facing name | PASS |
| 39 | the docs index lists every file in docs/ | PASS |
| 40 | US 2008-12: the rate dial does reach its floor and stay there | PASS |
| 42 | US 2021-23: fiscal transfers plus a supply shock do produce an inflation | PASS |
| 44 | UK 1979-83: low credibility really does make inflation more expensive | PASS |
| 46 | JAPAN: own-currency debt held at home does not reprice, and foreign-held does | PASS |
| 48 | the Taylor principle IS satisfiable — but only by jumping, never by walking | PASS |
| 49 | THE ONE FINDING UNDERNEATH ALL FOUR: the bifurcation is gone | PASS |
| 50 | every event leaves the accounting identities intact | PASS |
| 51 | every event actually changes something that survives the tick | PASS |
| 52 | no event writes a pipeline target | PASS |
| 53 | full terms with shocks on and invariants armed, across every scenario | PASS |
| 54 | A WOBBLE IN A STRETCHED SYSTEM IS A DIFFERENT EVENT (docs/12 M3) | PASS |
| 55 | no event is invisible to the player | PASS |
| 56 | a temporary rate hike produces a HUMP, not a ramp | PASS |
| 57 | the ordering of the peaks is output, then unemployment, then inflation | PASS |
| 58 | the response scales with the size of the impulse and not with its sign | PASS |
| 59 | a cut is a weaker impulse than a hike, for as long as the impulse is live | PASS |
| 61 | the spending impulse is fast and the rate impulse is slow | PASS |
| 62 | QE and the rate dial have the same SHAPE and different sizes | PASS |
| 63 | a dial move reaches the transmitted driver and converges to the dial | PASS |
| 64 | markets reprice before borrowers, and both before capital spending | PASS |
| 65 | the output response to a rate move is LAGGED, not instant | PASS |
| 66 | the pipeline refuses to schedule into a field a rule owns | PASS |
| 67 | no rule assigns to a pipeline target | PASS |
| 68 | every declared pipeline target exists on a fresh state | PASS |
| 69 | the Taylor autopilot faces the same lags the player does | PASS |
| 70 | every dial either schedules a lag or is documented as immediate | PASS |
| 71 | recession multiplier lands in the published range | PASS |
| 72 | expansion multiplier lands in the published range | PASS |
| 73 | the multiplier is larger in a slump than in a boom | PASS |
| 74 | the same spending buys more OUTPUT with slack and more PRICES without | PASS |
| 75 | holding the rate fixed makes the multiplier much larger | PASS |
| 76 | THE QE LESSON: printing into slack with a credible CB barely bites | PASS |
| 77 | printing with no slack and no credibility goes straight to prices | PASS |
| 78 | printing buys real things when there is slack to buy them with | PASS |
| 79 | AUSTERITY LEAKS: a tax rise collects less than you legislated, and worse with slack | PASS |
| 81 | every parameter has a value inside its range | PASS |
| 82 | every parameter has a unit, a source and a known confidence level | PASS |
| 83 | the deleted double-count has not crept back | PASS |
| 84 | kernels are normalised and peak on the documented month | PASS |
| 85 | every fitted kernel shape has a lag entry | PASS |
| 86 | START satisfies the accounting identities | PASS |
| 87 | ROUND TRIP: the stance returns exactly, to nine decimal places | PASS |
| 88 | ROUND TRIP: the ECONOMY does not return, and the residue is real capital | PASS |
| 89 | HIKE-HOLD-CUT: no permanent ratchet, and the jobs cost outlasts the gain | PASS |
| 90 | STOP-GO: a symmetric-looking cycle is a persistent EASING, and it shows | PASS |
| 91 | a path and a held move are not the same thing, and the difference is measurable | PASS |
| 92 | every scenario starts internally consistent | PASS |
| 93 | the bubble scenario looks healthy on every gauge except the credit gap | PASS |
| 94 | the bubble hides for four years — the design promise | PASS |
| 95 | every scenario starts in, and stays a quarter in, its advertised regime | PASS |
| 96 | the recession scenario has the rate dial genuinely dead | PASS |
| 97 | no scenario produces absurd numbers inside a term | PASS |
| 98 | NEUTRAL ANCHORS ARE BUILT FROM NEUTRAL, in every scenario | PASS |
| 99 | debt_trap: the real economy responds to the yield at all | PASS |
| 100 | debt_trap: the benchmark central bank is no longer identical to doing nothing | PASS |
| 101 | debt_trap: THE DECISION — you cannot consolidate your way out alone | PASS |
| 102 | a hike does not bite the interest bill on impact | PASS |
| 103 | the core macro block is stable around the steady state | PASS |
| 104 | the debt loop diverges, but slowly enough to be playable | PASS |
| 105 | a one-off demand shock decays rather than compounding | PASS |
| 106 | 200 ticks of no input and nothing drifts | PASS |
| 107 | credibility rises when the target is hit, and slowly | PASS |
| 108 | the credit gap does not open on its own | PASS |
| 109 | a rate cut does more for OUTPUT with slack than at capacity | PASS |
| 110 | a cut is weaker than the equivalent hike | PASS |
| 111 | a cut-then-hike round trip leaves the stance where it started | PASS |
| 112 | THE LOWER BOUND: easing stops working as the rate approaches it | PASS |
| 113 | QE still works when the rate dial has run out of room | PASS |
| 114 | unemployment rises faster than it falls | PASS |
| 115 | SWEEP: more spending never raises unemployment, at any starting gap | PASS |
| 116 | SWEEP: no step changes in the response to a rate cut | PASS |
| 117 | the ONE cliff in the model is the capacity ceiling, and it is where it says | PASS |
| 118 | L5: HIKING AT THE LOWER BOUND MUST NOT RAISE OUTPUT | PASS |
| 119 | L3: the fiscal multiplier has no step in it as the rate falls to the bound | PASS |
| 120 | investment.js reads the rate DIAL only to display it | PASS |
| 121 | A-TABLE: the disinflation response is monotone and its threshold is where Fisher puts it | PASS |
| 123 | A-TABLE: the A1 split made the response curve measurably smoother | PASS |
| 124 | the TRANSMITTED Taylor response clears unity, not just the dial one | PASS |
| 125 | the whole UI boots without throwing | PASS |
| 126 | every shell container the app needs exists | PASS |
| 127 | a gauge mounts for every indicator | PASS |
| 128 | a dial mounts for every dial | PASS |
| 129 | every gauge can open a why panel with real terms | PASS |
| 130 | every gauge has a history series to draw | PASS |
| 131 | moving a dial schedules an effect instead of applying it | PASS |
| 132 | a session runs a full term without throwing | PASS |
| 133 | restarting on the same seed keeps the previous run as a ghost | PASS |
| 134 | the game starts paused, at 1x, with play as the visible action | PASS |
| 135 | pausing does not throw away the chosen speed | PASS |
| 136 | every gauge and every dial has a plain-English definition | PASS |
| 137 | every gauge can say whether it is getting worse | PASS |
| 138 | a passive calm run reaches the end of the term and is scored | PASS |
| 139 | a losing run reaches a named ending with a lesson | PASS |
| 140 | the DEFERRED register matches the code, in both directions | PASS |
| 141 | every recorded parameter conflict is still genuinely unresolved | PASS |
| 142 | RATE_TO_OUTPUT: 1pp of policy rate, held a year | PASS |
| 143 | AUTO_STABILISER_ABSORPTION: share of an income shock that never lands | PASS |
| 144 | a tax cut RAISES output, and does it through consumption | PASS |
| 145 | QE_TO_GDP: bond buying reaches output through the yield, and how much | PASS |
| 147 | CRISIS_OUTPUT_TROUGH: the realised peak-to-trough lands in the published range | PASS |

### `test/crisis.test.js`

> THE CRASH CHAIN. Rebuilt in docs/12: two published numbers were being used as structural inputs when they are OBSERVATIONS that already contain the model's own response, so the model reproduced that response on top of them and the crash came out 2.6x too deep.

| | test | result |
|---|---|---|
| 25 | THE CRASH ARC: the unemployment cost of a banking crisis | **OPEN** |
| 28 | MEASURED: the model rebounds after year five and Cerra-Saxena say it should not | **OPEN** |

### `test/divergence.test.js`

| | test | result |
|---|---|---|
| 33 | E1: no permanent dial move diverges through an undeclared loop | **OPEN** |
| 34 | E1 acceptance: a permanent 1pp cut reaches a finite credit gap and A/F | **OPEN** |

### `test/episodes.test.js`

> HISTORICAL EPISODES. The only tests here that can say the model is WRONG rather than merely self-consistent: they feed it the ACTUAL policy path of a real episode and check the arc. THE MODEL FAILS ALL FOUR AND FAILS THEM THE SAME WAY — read the last two entries in this section first. This is the most important block in the file.

| | test | result |
|---|---|---|
| 41 | US 2008-12: THE CRISIS IS ENTIRELY OFFSET BY THE RATE CUTS THAT FOLLOWED IT | **OPEN** |
| 43 | US 2021-23: THE DISINFLATION NEVER HAPPENS | **OPEN** |
| 45 | UK 1979-83: THE RECESSION THAT PAID FOR IT NEVER ARRIVES | **OPEN** |
| 47 | JAPAN: THE MODEL CANNOT HOLD A DEFLATION | **OPEN** |

### `test/irf.test.js`

> IMPULSE RESPONSE SHAPES. Move a dial, hold it a year, put it back, difference against an untouched baseline. This is what a published VAR IRF is, and it is the only experiment here that can produce a months-to-peak number — everything else in the project measures PERMANENT held moves, which cannot peak.

| | test | result |
|---|---|---|
| 60 | MEASURED: the labour market has no lag behind output, and here it is | **OPEN** |

### `test/multipliers.test.js`

> MULTIPLIERS, measured against published reduced forms that are NOT model terms. Where the model lands outside a range that is a finding, not a number to tune.

| | test | result |
|---|---|---|
| 80 | THE SIGN FLIP THE DOCS PROMISED: how far away is it | **OPEN** |

### `test/transmission.test.js`

> THE CONDITIONALS THE GAME EXISTS TO TEACH. Statements about how a response CHANGES with the state, so each needs two measurements or a sweep. Six of these ran backwards before the docs/07 audit and every one passed the suite of the day.

| | test | result |
|---|---|---|
| 122 | A-TABLE: the knife-edge is the wealth channel, and it is still there | **OPEN** |

### `test/validation.test.js`

> EVERY PUBLISHED VALIDATION TARGET is either asserted here or recorded as a todo with its measured value. Also checks that the DEFERRED register of deliberately unread parameters matches the code in BOTH directions.

| | test | result |
|---|---|---|
| 146 | RATE_TO_INFLATION: the model is about half the published estimate | **OPEN** |
| 148 | TAX_SHOCK_TO_GDP: the model is far below Romer-Romer | **OPEN** |
| 149 | PRIVATE debt reprices instantly, and government debt no longer does | **OPEN** |

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
    3 |  +0.05 |  +0.01 |  -0.01 |  +0.03 |  +0.02 |  -0.01 |  +0.86 |  +0.09 |  +0.01 | +0.000
    6 |  +0.19 |  +0.05 |  -0.05 |  +0.10 |  +0.08 |  -0.04 |  +2.01 |  +0.23 |  +0.09 | +0.000
   12 |  +0.48 |  +0.15 |  -0.16 |  +0.23 |  +0.21 |  -0.23 |  +4.35 |  +0.62 |  +0.47 | +0.000
   24 |  +0.98 |  +0.37 |  -0.33 |  +0.38 |  +0.50 |  -1.04 |  +9.07 |  +1.67 |  +1.00 | +0.000
   48 |  +2.06 |  +0.80 |  -0.58 |  +0.60 |  +1.13 |  -4.26 | +18.50 |  +4.19 |  +1.30 | +0.000

-- policy_rate  +1.00pp (a hike)
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  -0.00 |  -0.00 |  +0.00 |  -0.00 |  +0.00 |  +0.00 |  -0.19 |  -0.03 |  -0.00 | +0.000
    3 |  -0.07 |  -0.01 |  +0.02 |  -0.04 |  -0.02 |  +0.01 |  -0.84 |  -0.09 |  -0.01 | +0.000
    6 |  -0.25 |  -0.02 |  +0.09 |  -0.15 |  -0.08 |  +0.04 |  -1.90 |  -0.23 |  -0.13 | +0.000
   12 |  -0.58 |  -0.06 |  +0.21 |  -0.33 |  -0.21 |  +0.22 |  -3.83 |  -0.63 |  -0.65 | +0.000
   24 |  -1.10 |  -0.12 |  +0.37 |  -0.52 |  -0.45 |  +0.93 |  -7.06 |  -1.63 |  -1.41 | +0.000
   48 |  -1.93 |  -0.22 |  +0.55 |  -0.73 |  -0.85 |  +3.40 | -11.67 |  -3.70 |  -1.76 | +0.000

-- tax_rate     −1.00pp (a cut)
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  +0.01 |  +0.00 |  +0.00 |  +0.02 | +0.000
    3 |  +0.04 |  +0.01 |  -0.01 |  -0.00 |  +0.04 |  +0.05 |  +0.00 |  +0.00 |  +0.18 | +0.000
    6 |  +0.14 |  +0.04 |  -0.04 |  -0.01 |  +0.15 |  +0.20 |  +0.00 |  +0.00 |  +0.88 | +0.000
   12 |  +0.28 |  +0.10 |  -0.10 |  -0.07 |  +0.33 |  +0.57 |  +0.04 |  +0.02 |  +2.68 | +0.000
   24 |  +0.39 |  +0.18 |  -0.16 |  -0.19 |  +0.57 |  +1.24 |  +0.25 |  +0.07 |  +2.10 | +0.000
   48 |  +0.61 |  +0.33 |  -0.25 |  -0.22 |  +0.84 |  +2.19 |  +1.09 |  +0.28 |  +0.54 | +0.000

-- tax_rate     +1.00pp (a rise)
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  -0.01 |  +0.00 |  +0.00 |  -0.02 | +0.000
    3 |  -0.04 |  -0.00 |  +0.01 |  +0.00 |  -0.04 |  -0.05 |  -0.00 |  -0.00 |  -0.18 | +0.000
    6 |  -0.14 |  -0.01 |  +0.05 |  +0.01 |  -0.15 |  -0.20 |  -0.00 |  -0.00 |  -0.88 | +0.000
   12 |  -0.29 |  -0.03 |  +0.11 |  +0.06 |  -0.33 |  -0.59 |  -0.01 |  -0.02 |  -2.71 | +0.000
   24 |  -0.45 |  -0.06 |  +0.18 |  +0.13 |  -0.57 |  -1.33 |  -0.07 |  -0.08 |  -2.30 | +0.000
   48 |  -0.76 |  -0.10 |  +0.29 |  +0.09 |  -0.82 |  -2.51 |  -0.29 |  -0.27 |  -0.97 | +0.000

-- govt_spending +1.00pp
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +1.04 |  +0.16 |  -0.15 |  +0.00 |  +0.00 |  +0.05 |  +0.00 |  +0.00 |  +0.01 | +0.000
    3 |  +1.22 |  +0.30 |  -0.32 |  +0.03 |  +0.14 |  +0.11 |  +0.03 |  +0.02 |  +0.74 | +0.000
    6 |  +1.28 |  +0.41 |  -0.42 |  +0.05 |  +0.17 |  +0.12 |  +0.12 |  +0.06 |  +1.45 | +0.000
   12 |  +1.36 |  +0.54 |  -0.47 |  +0.03 |  +0.25 |  +0.05 |  +0.48 |  +0.16 |  +2.18 | +0.000
   24 |  +1.49 |  +0.69 |  -0.50 |  -0.00 |  +0.40 |  -0.30 |  +1.65 |  +0.45 |  +0.81 | +0.000
   48 |  +1.87 |  +0.88 |  -0.58 |  +0.04 |  +0.66 |  -1.51 |  +4.61 |  +1.23 |  +0.51 | +0.000

-- govt_spending −1.00pp
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  -1.04 |  -0.08 |  +0.23 |  +0.00 |  +0.00 |  -0.06 |  -0.00 |  -0.01 |  -0.04 | +0.000
    3 |  -1.22 |  -0.11 |  +0.40 |  -0.04 |  -0.13 |  -0.13 |  -0.01 |  -0.03 |  -0.79 | +0.000
    6 |  -1.31 |  -0.14 |  +0.46 |  -0.08 |  -0.17 |  -0.20 |  -0.04 |  -0.06 |  -1.58 | +0.000
   12 |  -1.48 |  -0.17 |  +0.50 |  -0.14 |  -0.26 |  -0.27 |  -0.14 |  -0.16 |  -2.59 | +0.000
   24 |  -1.74 |  -0.22 |  +0.56 |  -0.21 |  -0.40 |  -0.28 |  -0.44 |  -0.38 |  -1.75 | +0.000
   48 |  -2.23 |  -0.28 |  +0.64 |  -0.35 |  -0.61 |  +0.10 |  -1.11 |  -0.87 |  -1.60 | +0.000

-- money_printed  2.00pp
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +2.08 |  +0.28 |  -0.24 |  +0.00 |  +0.00 |  -0.05 |  +0.01 |  +0.01 |  +0.01 | -0.003
    3 |  +2.48 |  +0.53 |  -0.53 |  +0.09 |  +0.29 |  -0.26 |  +0.06 |  +0.03 |  +1.49 | -0.009
    6 |  +2.72 |  +0.74 |  -0.69 |  +0.21 |  +0.38 |  -0.69 |  +0.22 |  +0.09 |  +3.03 | -0.018
   12 |  +3.18 |  +1.02 |  -0.77 |  +0.40 |  +0.61 |  -1.79 |  +0.92 |  +0.27 |  +5.02 | -0.035
   24 |  +4.06 |  +1.43 |  -0.81 |  +0.64 |  +1.08 |  -4.54 |  +3.44 |  +0.81 |  +2.92 | -0.067
   48 |  +4.65 |  +2.15 |  -0.94 |  +0.98 |  +1.75 | -11.62 | +11.45 |  +2.43 |  -0.15 | -0.139

-- qe            10.0pp
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  -0.00 |  +0.00 |  +0.00 |  +0.00 | +0.000
    3 |  +0.01 |  +0.00 |  -0.00 |  +0.01 |  +0.00 |  -0.00 |  +0.08 |  +0.00 |  +0.00 | +0.000
    6 |  +0.04 |  +0.01 |  -0.01 |  +0.03 |  +0.01 |  -0.01 |  +0.39 |  +0.02 |  +0.02 | +0.000
   12 |  +0.14 |  +0.04 |  -0.05 |  +0.07 |  +0.06 |  -0.06 |  +1.18 |  +0.09 |  +0.12 | +0.000
   24 |  +0.30 |  +0.12 |  -0.11 |  +0.12 |  +0.15 |  -0.31 |  +2.77 |  +0.32 |  +0.31 | +0.000
   48 |  +0.63 |  +0.27 |  -0.21 |  +0.19 |  +0.34 |  -1.38 |  +5.76 |  +0.98 |  +0.39 | +0.000

==============================================================================
THE SAME MOVE, FROM DIFFERENT STARTING STATES (24 months on)
==============================================================================

-- rate −1pp
   start gap | Δoutput | Δinflat | Δunemp | share of the move that is OUTPUT
   ------------------------------------------------------------------------
       -8.28 |   +1.16 |   +0.12 |  -0.20 |     0.91
       -6.19 |   +1.16 |   +0.12 |  -0.20 |     0.91
       -4.07 |   +1.08 |   +0.10 |  -0.14 |     0.91
       -1.94 |   +1.02 |   +0.10 |  -0.19 |     0.91
       +0.00 |   +0.98 |   +0.37 |  -0.33 |     0.72
       +2.13 |   +1.08 |   +0.17 |  -0.05 |     0.87
       +4.29 |   +0.05 |   +0.22 |  -0.12 |     0.18
       +5.51 |   +0.05 |   +0.48 |  -0.13 |     0.09

-- spend +1pp
   start gap | Δoutput | Δinflat | Δunemp | share of the move that is OUTPUT
   ------------------------------------------------------------------------
       -8.28 |   +1.97 |   +0.23 |  -0.36 |     0.90
       -6.19 |   +1.96 |   +0.23 |  -0.36 |     0.90
       -4.07 |   +2.03 |   +0.22 |  -0.17 |     0.90
       -1.94 |   +1.61 |   +0.20 |  -0.39 |     0.89
       +0.00 |   +1.49 |   +0.69 |  -0.50 |     0.68
       +2.13 |   +1.38 |   +0.29 |  -0.07 |     0.83
       +4.29 |   -0.01 |   +0.47 |  -0.15 |    -0.01
       +5.51 |   -0.00 |   +2.42 |  -0.18 |    -0.00

-- print 2pp
   start gap | Δoutput | Δinflat | Δunemp | share of the move that is OUTPUT
   ------------------------------------------------------------------------
       -8.28 |   +3.95 |   +0.34 |  -0.73 |     0.92
       -6.19 |   +3.98 |   +0.38 |  -0.62 |     0.91
       -4.07 |   +4.03 |   +0.42 |  -0.54 |     0.91
       -1.94 |   +3.87 |   +0.92 |  -1.16 |     0.81
       +0.00 |   +4.06 |   +1.43 |  -0.81 |     0.74
       +2.13 |   +1.45 |   +1.02 |  -0.35 |     0.59
       +4.29 |   +0.07 |   +2.19 |  -0.45 |     0.03
       +5.51 |   +0.10 |  +19.68 |  -0.70 |     0.00

-- tax −1pp
   start gap | Δoutput | Δinflat | Δunemp | share of the move that is OUTPUT
   ------------------------------------------------------------------------
       -8.28 |   +0.75 |   +0.08 |  -0.14 |     0.90
       -6.19 |   +0.76 |   +0.08 |  -0.14 |     0.90
       -4.07 |   +0.77 |   +0.08 |  -0.14 |     0.91
       -1.94 |   +0.72 |   +0.08 |  -0.14 |     0.90
       +0.00 |   +0.39 |   +0.18 |  -0.16 |     0.68
       +2.13 |   +0.44 |   +0.09 |  -0.04 |     0.83
       +4.29 |   -0.02 |   +0.10 |  -0.05 |    -0.26
       +5.51 |   -0.02 |   +0.23 |  -0.06 |    -0.09

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
    1m OVERH gap+0.2 pi5.4 u4.4 d100 a64 cg+0.0
    6m OVERH gap+1.1 pi5.0 u4.7 d98 a61 cg+0.6
   12m OVERH gap+2.0 pi5.7 u4.4 d95 a59 cg+1.7
   24m OVERH gap+4.7 pi9.9 u4.1 d87 a64 cg+5.1
   48m OVERH gap+56.5 pi114.5 u1.5 d26 a0 cg+31.6
   ENDED: hyperinflation

overheating — Taylor-rule central bank
    1m OVERH gap+0.2 pi5.4 u4.4 d100 a64 cg+0.0
    6m OVERH gap+0.7 pi4.9 u4.7 d98 a61 cg+0.0
   12m OVERH gap+0.3 pi4.4 u4.8 d96 a60 cg-0.5
   24m OVERH gap-0.8 pi3.4 u5.3 d93 a60 cg-2.5
   48m GOLDI gap-0.9 pi2.3 u5.4 d93 a62 cg-4.9
   96m GOLDI gap-0.1 pi2.0 u5.1 d93 a64 cg-4.1

recession — you touch nothing
    1m RECES gap-8.9 pi0.2 u7.3 d100 a64 cg-0.1
    6m RECES gap-9.8 pi0.2 u7.0 d102 a61 cg-0.4
   12m RECES gap-8.7 pi0.4 u6.8 d105 a59 cg-0.8
   24m RECES gap-6.1 pi0.8 u6.3 d109 a64 cg-1.2
   48m GOLDI gap-1.1 pi1.6 u5.5 d113 a68 cg-0.1
   96m OVERH gap+5.6 pi3.8 u3.9 d104 a65 cg+8.1

recession — Taylor-rule central bank
    1m RECES gap-8.9 pi0.2 u7.3 d100 a64 cg-0.1
    6m RECES gap-9.8 pi0.2 u7.0 d102 a61 cg-0.3
   12m RECES gap-8.7 pi0.4 u6.8 d105 a59 cg-0.4
   24m RECES gap-5.9 pi0.8 u6.3 d109 a65 cg-0.1
   48m GOLDI gap-0.5 pi1.6 u5.3 d112 a69 cg+2.0
   96m GOLDI gap+1.0 pi2.6 u4.6 d109 a64 cg-1.8

stagflation — you touch nothing
    1m STAGF gap-3.5 pi12.4 u8.2 d100 a43 cg-0.0
    6m OVERH gap-2.0 pi16.9 u7.3 d97 a37 cg+0.7
   12m OVERH gap+2.6 pi22.9 u6.1 d90 a31 cg+3.5
   24m OVERH gap+21.9 pi57.6 u2.9 d64 a26 cg+17.5
   ENDED: hyperinflation

stagflation — Taylor-rule central bank
    1m STAGF gap-3.5 pi12.4 u8.2 d100 a43 cg-0.0
    6m OVERH gap-2.6 pi16.6 u7.4 d97 a37 cg-0.3
   12m OVERH gap-1.5 pi20.4 u7.1 d92 a31 cg-1.4
   24m OVERH gap-4.2 pi18.8 u7.3 d83 a33 cg-12.4
   48m STAGF gap-7.4 pi5.7 u8.0 d92 a31 cg-39.9
   96m GOLDI gap-1.1 pi1.9 u6.9 d136 a47 cg-22.5

debt_trap — you touch nothing
    1m GOLDI gap+0.0 pi2.0 u5.0 d140 a65 cg+0.0
    6m GOLDI gap-0.6 pi1.9 u5.2 d143 a63 cg-0.3
   12m GOLDI gap-1.1 pi1.9 u5.4 d146 a62 cg-0.9
   24m GOLDI gap-1.7 pi1.8 u5.6 d154 a62 cg-2.5
   48m GOLDI gap-2.9 pi1.6 u5.8 d174 a61 cg-6.1
   96m RECES gap-7.1 pi1.1 u6.4 d245 a58 cg-14.9
   ENDED: debt_crisis

debt_trap — Taylor-rule central bank
    1m GOLDI gap+0.0 pi2.0 u5.0 d140 a65 cg+0.0
    6m GOLDI gap-0.6 pi1.9 u5.2 d143 a63 cg-0.3
   12m GOLDI gap-1.0 pi1.9 u5.4 d146 a62 cg-0.8
   24m GOLDI gap-1.3 pi1.8 u5.5 d154 a63 cg-2.0
   48m GOLDI gap-1.5 pi1.8 u5.5 d171 a63 cg-3.8
   96m GOLDI gap-2.8 pi1.6 u5.8 d226 a62 cg-7.7
   ENDED: debt_crisis

bubble — you touch nothing
    1m GOLDI gap+1.3 pi2.5 u4.4 d100 a72 cg+6.0
    6m GOLDI gap+1.5 pi2.6 u4.5 d98 a70 cg+6.2
   12m GOLDI gap+1.6 pi2.7 u4.4 d95 a68 cg+6.9
   24m GOLDI gap+1.7 pi2.9 u4.4 d90 a71 cg+8.8
   48m GOLDI gap+1.6 pi2.9 u4.4 d79 a71 cg+11.6
   96m GOLDI gap+1.1 pi2.7 u4.6 d59 a71 cg+14.1

bubble — Taylor-rule central bank
    1m GOLDI gap+1.3 pi2.5 u4.4 d100 a72 cg+5.9
    6m GOLDI gap+1.4 pi2.5 u4.5 d98 a70 cg+6.0
   12m GOLDI gap+0.9 pi2.5 u4.6 d95 a68 cg+6.1
   24m GOLDI gap-0.3 pi2.1 u5.1 d91 a68 cg+5.8
   48m GOLDI gap-1.6 pi1.8 u5.5 d86 a69 cg+4.5
   96m GOLDI gap-2.4 pi1.6 u5.7 d79 a70 cg+3.2

==============================================================================
WHAT HAPPENS WITH NO DECISION FROM YOU — the automatic machinery
==============================================================================

-- a −5pp spending cut, and what the stabilisers do about it
   mo | Δoutput | Δmktinc | Δtaxrev | Δtransf | Δdispos | Δdeficit | Δstruct | absorbed
   ----------------------------------------------------------------------------------------
    1 |   -5.20 |   -5.00 |   -0.54 |   +0.36 |   -4.10 |   -4.10 |   -5.00 |     0.18
    3 |   -6.31 |   -6.06 |   -1.30 |   +0.66 |   -4.10 |   -3.06 |   -5.00 |     0.32
    6 |   -6.98 |   -6.66 |   -1.86 |   +0.78 |   -4.02 |   -2.39 |   -5.00 |     0.40
   12 |   -8.12 |   -7.67 |   -2.35 |   +0.91 |   -4.41 |   -1.81 |   -5.00 |     0.42
   24 |   -9.89 |   -9.12 |   -2.86 |   +1.09 |   -5.17 |   -1.13 |   -5.00 |     0.43

==============================================================================
SHOCKS — what each one does, measured, from a settled calm economy
==============================================================================

Oil price spike  (calm baseline, 12%/yr)
    1m out+0.0 pi+2.4 u+0.0 appr-4    6m out-0.3 pi+1.7 u+0.1 appr-6   12m out-0.1 pi+1.1 u+0.1 appr-5   24m out+0.2 pi+0.5 u-0.1 appr+1   48m out+0.5 pi+0.3 u-0.2 appr+0

Productivity boom  (calm baseline, 10%/yr)
    1m out+1.6 pi+0.0 u+0.0 appr+3    6m out+1.6 pi+0.0 u+0.0 appr+4   12m out+1.6 pi+0.0 u+0.0 appr+4   24m out+1.6 pi+0.0 u+0.0 appr+1   48m out+1.6 pi+0.0 u+0.0 appr+0

Bank wobble  (bubble baseline, 15%/yr)
    1m out-0.1 pi-0.0 u+0.0 appr-5    6m out-0.4 pi-0.1 u+0.1 appr-4   12m out-0.5 pi-0.2 u+0.1 appr-2   24m out-0.6 pi-0.2 u+0.1 appr-1   48m out-0.7 pi-0.3 u+0.2 appr-0

FINANCIAL CRISIS  (bubble baseline, crisis_prob)
    1m out-5.6 pi-0.7 u+0.8 appr-14    6m out-7.9 pi-1.1 u+1.6 appr-17   12m out-9.9 pi-1.4 u+1.9 appr-20   24m out-10.9 pi-1.7 u+1.9 appr-11   48m out-11.1 pi-1.6 u+1.7 appr-3

Export slump  (calm baseline, 12%/yr)
    1m out-1.2 pi-0.1 u+0.3 appr-4    6m out-1.1 pi-0.1 u+0.4 appr-4   12m out-0.9 pi-0.1 u+0.3 appr-3   24m out-0.6 pi-0.1 u+0.2 appr-1   48m out-0.3 pi-0.1 u+0.1 appr-0

==============================================================================
HOW LONG EACH LEVER TAKES — share of the 48-month response delivered by month N
==============================================================================
   lever                |    1    3    6    9   12   18   24   36   48
   ------------------------------------------------------------------
   policy_rate −1pp     | 0.00 0.02 0.09 0.16 0.23 0.36 0.48 0.73 1.00
   tax_rate −1pp        | 0.00 0.06 0.23 0.37 0.45 0.56 0.64 0.82 1.00
   govt_spending +1pp   | 0.56 0.65 0.69 0.71 0.73 0.76 0.80 0.89 1.00
   money_printed 2pp    | 0.45 0.53 0.58 0.64 0.68 0.78 0.87 0.97 1.00
   qe 10pp              | 0.00 0.01 0.07 0.14 0.22 0.35 0.48 0.73 1.00

   (1.00 = fully delivered. Above 1.00 means it overshoots and comes back.)

   How much of a rate move the economy has FELT (the kernel alone):
   mo   |    1    3    6    9   12   18   24   36   48     (pp of a 1.00pp cut)
   real | 0.05 0.50 0.93 1.00 1.00 1.00 1.00 1.00 1.00
   mkts | 0.50 0.94 1.00 1.00 1.00 1.00 1.00 1.00 1.00
```

---

## RAW TAP OUTPUT

The unedited test stream, for anything the parsing above missed.

```
TAP version 13
#   months the Taylor rule was refused its own request, of 96: calm 0, overheating 0, recession 31, stagflation 0, debt_trap 0, bubble 0
#   stagflation under the Taylor rule: ceiling 50 -> 5.69% @m48, 1.91% @m96 (refused 0/96); ceiling 20 -> 29.55% @m48, 1.02e+3% @m96 (refused 86/96)
# Subtest: the rate the autopilot achieves stays in the dial's range and reaches both ends
ok 1 - the rate the autopilot achieves stays in the dial's range and reaches both ends
  ---
  duration_ms: 4.074685
  ...
# Subtest: the autopilot enforces no bounds of its own — the dial is the only one
ok 2 - the autopilot enforces no bounds of its own — the dial is the only one
  ---
  duration_ms: 0.616745
  ...
# Subtest: a dial request the bounds refuse is reported, not swallowed
ok 3 - a dial request the bounds refuse is reported, not swallowed
  ---
  duration_ms: 0.219186
  ...
# Subtest: the truncation count makes a saturated benchmark visible in one number
ok 4 - the truncation count makes a saturated benchmark visible in one number
  ---
  duration_ms: 70.014675
  ...
# Subtest: the Taylor rule wins stagflation at the derived ceiling and loses at 20
ok 5 - the Taylor rule wins stagflation at the derived ceiling and loses at 20
  ---
  duration_ms: 10.375438
  ...
# Subtest: a truncation reaches the trace whether the player or the autopilot caused it
ok 6 - a truncation reaches the trace whether the player or the autopilot caused it
  ---
  duration_ms: 1.544565
  ...
# Subtest: index.html has been built
ok 7 - index.html has been built
  ---
  duration_ms: 0.374268
  ...
# Subtest: the bundled page executes without throwing
ok 8 - the bundled page executes without throwing
  ---
  duration_ms: 12.587044
  ...
# Subtest: no import or export keyword survived into the bundle
ok 9 - no import or export keyword survived into the bundle
  ---
  duration_ms: 1.809017
  ...
# Subtest: the page is self-contained — no external requests
ok 10 - the page is self-contained — no external requests
  ---
  duration_ms: 1.909919
  ...
# Subtest: invariants hold across 200 quiet ticks
ok 11 - invariants hold across 200 quiet ticks
  ---
  duration_ms: 24.104398
  ...
# Subtest: invariants hold under a violent policy path
ok 12 - invariants hold under a violent policy path
  ---
  duration_ms: 5.651142
  ...
# Subtest: checkInvariants actually catches a broken book
ok 13 - checkInvariants actually catches a broken book
  ---
  duration_ms: 0.429525
  ...
# Subtest: a crash causes a recession, not just a haircut
ok 14 - a crash causes a recession, not just a haircut
  ---
  duration_ms: 16.894376
  ...
# Subtest: the demand collapse fades but the scar does not
ok 15 - the demand collapse fades but the scar does not
  ---
  duration_ms: 37.277551
  ...
# Subtest: spending in the first year after a crash shrinks the permanent scar
ok 16 - spending in the first year after a crash shrinks the permanent scar
  ---
  duration_ms: 27.321108
  ...
# Subtest: waiting past the window costs you the discount
ok 17 - waiting past the window costs you the discount
  ---
  duration_ms: 23.399491
  ...
# Subtest: forced selling fires in the bubble, and then stops
ok 18 - forced selling fires in the bubble, and then stops
  ---
  duration_ms: 11.099683
  ...
# Subtest: THE DOOM LOOP: banks below the floor cut lending and widen spreads
ok 19 - THE DOOM LOOP: banks below the floor cut lending and widen spreads
  ---
  duration_ms: 3.824132
  ...
# Subtest: a crash takes a real bite out of bank capital
ok 20 - a crash takes a real bite out of bank capital
  ---
  duration_ms: 10.652123
  ...
# Subtest: defaulted debt leaves the credit stock
ok 21 - defaulted debt leaves the credit stock
  ---
  duration_ms: 5.841285
  ...
# Subtest: a crash is survivable and the economy is still playable afterwards
ok 22 - a crash is survivable and the economy is still playable afterwards
  ---
  duration_ms: 8.827241
  ...
# Subtest: RECAPITALISATION IS A QUANTITY, NOT A GESTURE
ok 23 - RECAPITALISATION IS A QUANTITY, NOT A GESTURE
  ---
  duration_ms: 21.390516
  ...
# Subtest: THE CRASH ARC: every published magnitude at once
ok 24 - THE CRASH ARC: every published magnitude at once
  ---
  duration_ms: 10.810047
  ...
# Subtest: THE CRASH ARC: the unemployment cost of a banking crisis
not ok 25 - THE CRASH ARC: the unemployment cost of a banking crisis # TODO MOVED BY THE A1 TRANSMISSION SPLIT, AND GATED ON PHASE 4.1. Unemployment now peaks +1.93pp against a published 2-5 for a banking crisis; it was inside the band before the split. The four other magnitudes in the crash arc — peak-to-trough, the month of the trough, the five-year loss against trend and the absence of a rebound — all still hold, which is why this is one assertion rather than the whole test. CRISIS_IMPULSE_AMPLIFICATION and CRISIS_SCAR_AMPLIFICATION are solved FROM this model to make the realised trough equal CRISIS_OUTPUT_TROUGH, so they absorb exactly this kind of change and Phase 4.1 re-solves them after Phases 2 and 3. Re-solving them before the demand block has stopped moving would mean doing it twice and believing the first answer. Note the shortfall is 0.07pp: this is a band edge, not a collapse.
  ---
  duration_ms: 11.019278
  location: '/home/ztchr/personal_projects/Crash/test/crisis.test.js:258:1'
  failureType: 'testCodeFailure'
  error: 'unemployment peaked +1.93pp; a banking crisis costs 2-5'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/crisis.test.js:273:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: THE DECONVOLUTION CONSTANTS ARE MEASUREMENTS, and this re-measures them
ok 26 - THE DECONVOLUTION CONSTANTS ARE MEASUREMENTS, and this re-measures them
  ---
  duration_ms: 9.6974
  ...
# Subtest: the scar PHASES IN rather than landing on month one
ok 27 - the scar PHASES IN rather than landing on month one
  ---
  duration_ms: 3.548395
  ...
# Subtest: MEASURED: the model rebounds after year five and Cerra-Saxena say it should not
not ok 28 - MEASURED: the model rebounds after year five and Cerra-Saxena say it should not # TODO OPEN. Within the 96-month game the loss is right: -10.0% of trend at five years and -7.4% at eight. But run it to ten years and the model has recovered to -4.7%, because most of the five-year loss is a persistent OUTPUT GAP rather than lost capacity, and the gap eventually closes. Only the 3.2pp exogenous capacity cut is genuinely permanent. Cerra & Saxena find no significant rebound at ANY horizon. Closing this by inflating the exogenous scar is not available: it would push the five-year loss to -14% and the trough outside the published band, so the two ends of the arc cannot both be matched with one constant. What it actually says is that the model heals a demand gap faster than the data does — a statement about the demand block, and the same shape as the TAX_SHOCK_TO_GDP and austerity-paradox findings.
  ---
  duration_ms: 11.345884
  location: '/home/ztchr/personal_projects/Crash/test/crisis.test.js:316:1'
  failureType: 'testCodeFailure'
  error: 'output recovered to -4.84% of trend at ten years, from -9.84% at five. That is a rebound.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/crisis.test.js:331:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: WHEN CREDIT BITES BACK: the bust is deeper the bigger the boom was
ok 29 - WHEN CREDIT BITES BACK: the bust is deeper the bigger the boom was
  ---
  duration_ms: 24.127566
  ...
# Subtest: no Math.random anywhere in src/
ok 30 - no Math.random anywhere in src/
  ---
  duration_ms: 3.75334
  ...
# Subtest: no bare time conversion outside units.js
ok 31 - no bare time conversion outside units.js
  ---
  duration_ms: 1.476983
  ...
# Subtest: same seed produces an identical 96-tick history
ok 32 - same seed produces an identical 96-tick history
  ---
  duration_ms: 23.586997
  ...
#   policy_rate    settles in [2, 3] of a declared [-0.75, 50]  (14/19 settings diverge)
#   tax_rate       settles in [22.75, 70] of a declared [0, 70]  (6/20 settings diverge)
#   govt_spending  settles in [20, 24] of a declared [0, 70]  (11/20 settings diverge)
#   money_printed  settles in [0, 0.5] of a declared [0, 15]  (11/14 settings diverge)
#   qe             settles in [0, 26.25] of a declared [0, 30]  (1/14 settings diverge)
#   1pp cut @m480: A/F = 1.323e+11, credit gap = 631.38, inflation = 5.482e+11
# Subtest: E1: no permanent dial move diverges through an undeclared loop
not ok 33 - E1: no permanent dial move diverges through an undeclared loop # TODO FAILS BY DESIGN UNTIL PHASE 3.5. This is the guard whose absence let Section B survive three audits, and it is written before the fix so that the fix has something to turn green. Measured today: a permanent policy rate of 1.5% — a one-point cut from neutral, the most ordinary move in the game — sends asset/fundamental to 2.87e11 and the credit gap to +648 by month 480, and setting ASSET_PRICE_CREDIT_CHANNEL to 0 makes the same run settle at A/F 1.38 with a gap of -7.4. The loop is therefore isolated, not inferred. It is not in parameters.py UNBALANCED_LOOPS, though credit.js:200 asserts in a comment that it is deliberate. Phase 3.2 closes it.
  ---
  duration_ms: 512.555486
  location: '/home/ztchr/personal_projects/Crash/test/divergence.test.js:171:1'
  failureType: 'testCodeFailure'
  error: |-
    3 permanent dial settings diverge over 480 ticks through a loop parameters.py's UNBALANCED_LOOPS does not declare:
        policy_rate = 1.5: output_gap reached 2.14e+2 at month 290, via bubble_credit_collateral (switching that loop off makes the same run bounded)
        tax_rate = 19.75: output_gap reached 2.09e+2 at month 213, via bubble_credit_collateral (switching that loop off makes the same run bounded)
        qe = 30: output_gap reached 2.15e+2 at month 290, via bubble_credit_collateral (switching that loop off makes the same run bounded)
    
    3 !== 0
    
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: 0
  actual: 3
  operator: 'strictEqual'
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/divergence.test.js:200:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.start (node:internal/test_runner/test:833:17)
    startSubtestAfterBootstrap (node:internal/test_runner/harness:296:17)
  ...
# Subtest: E1 acceptance: a permanent 1pp cut reaches a finite credit gap and A/F
not ok 34 - E1 acceptance: a permanent 1pp cut reaches a finite credit gap and A/F # TODO THE PHASE 3.5 GATE, stated as its own test so the general guard above cannot be satisfied by reclassifying the cause. Section B1's exact repro: calm, policy_rate -> 1.5 at month 0, nothing else, 480 ticks.
  ---
  duration_ms: 3.094172
  location: '/home/ztchr/personal_projects/Crash/test/divergence.test.js:208:1'
  failureType: 'testCodeFailure'
  error: 'credit_to_gdp_gap is 6.314e+2 at month 480'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/divergence.test.js:225:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async startSubtestAfterBootstrap (node:internal/test_runner/harness:296:3)
  ...
# Subtest: every state field is documented in 01-variables.md
ok 35 - every state field is documented in 01-variables.md
  ---
  duration_ms: 2.443614
  ...
# Subtest: 01-variables.md does not document fields the model no longer has
ok 36 - 01-variables.md does not document fields the model no longer has
  ---
  duration_ms: 0.384706
  ...
# Subtest: every dial, gauge, scenario, shock and ending is named in the docs
ok 37 - every dial, gauge, scenario, shock and ending is named in the docs
  ---
  duration_ms: 1.27229
  ...
# Subtest: every transmitted driver has a player-facing name
ok 38 - every transmitted driver has a player-facing name
  ---
  duration_ms: 0.223343
  ...
# Subtest: the docs index lists every file in docs/
ok 39 - the docs index lists every file in docs/
  ---
  duration_ms: 0.390261
  ...
# Subtest: US 2008-12: the rate dial does reach its floor and stay there
ok 40 - US 2008-12: the rate dial does reach its floor and stay there
  ---
  duration_ms: 15.069093
  ...
# Subtest: US 2008-12: THE CRISIS IS ENTIRELY OFFSET BY THE RATE CUTS THAT FOLLOWED IT
not ok 41 - US 2008-12: THE CRISIS IS ENTIRELY OFFSET BY THE RATE CUTS THAT FOLLOWED IT # TODO STILL FAILS, AND PHASE 2 BARELY TOUCHED IT — which is itself the finding. Re-measured after the A1 transmission split and the derived rate ceiling: output troughs at -1.85% of trend (was -1.86; US: -5 to -7), unemployment rises +0.14pp peaking in month 9 (was +0.32pp; US: +5.0pp to 10.0% at month 22), inflation never goes below 2.25% (was 2.26; US: -2.1%), and government debt FALLS from 64% to 61% (was 60; US: 64 -> 100). Output is +3.55% of trend at month 6, BEFORE Lehman lands. THE UNEMPLOYMENT RESPONSE GOT SMALLER, not larger. WHY PHASE 2 DID NOT HELP HERE, and it is worth understanding: this episode is not a disinflation, it is a CRASH plus an easing, and the two Section A defects were both about tightening arriving too slowly. Making the rate arrive faster makes the EASING arrive faster too, so the 1.75pp of cuts delivered between months 2 and 11 now offset the crisis sooner rather than less. The asymmetry the brief identified is unchanged: the cut reaches asset prices on a 1-month kernel and now reaches borrowers on a 3-month one, while the crisis works through the credit and capital blocks over years. What is left is a demand block that heals too fast, which is the same statement as OPEN \#1 and TAX_SHOCK_TO_GDP, and it sits downstream of Section B rather than Section A. Re-measure after Phase 3.
  ---
  duration_ms: 9.93491
  location: '/home/ztchr/personal_projects/Crash/test/episodes.test.js:136:1'
  failureType: 'testCodeFailure'
  error: 'unemployment rose 0.14pp, peaking in month 9; the US went 5.0 to 10.0. Output trough -1.85% of trend, inflation low 2.25%, debt 64 -> 61.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/episodes.test.js:159:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async startSubtestAfterBootstrap (node:internal/test_runner/harness:296:3)
  ...
# Subtest: US 2021-23: fiscal transfers plus a supply shock do produce an inflation
ok 42 - US 2021-23: fiscal transfers plus a supply shock do produce an inflation
  ---
  duration_ms: 7.388444
  ...
# Subtest: US 2021-23: THE DISINFLATION NEVER HAPPENS
not ok 43 - US 2021-23: THE DISINFLATION NEVER HAPPENS # TODO MATERIALLY BETTER AFTER PHASE 2 AND STILL WRONG. Inflation now PEAKS inside the window — 20.54% at month 40, where before it had not peaked at all and was still climbing through 36.81% — and it is 10.41% at month 32 against 14.06% before (US: peaked 9.1% at month 17, 3.1% by month 32). The single biggest change is that the hike now reaches the economy: mechanism (1) in the old diagnosis was that the transmitted rate was 2.28% at month 30 while the DIAL had been at 5.25 since month 27, and that is gone — policy_rate_demand now tracks the dial within a quarter. WHAT IS LEFT IS MECHANISM (2), AND IT IS NOW THE WHOLE OF IT: credibility falls 0.85 -> 0.000 by month 31 purely from realised misses, which quadruples kappa and makes the process self-reinforcing exactly when the central bank most needs to be believed. A 5.25% funds rate against 20% expected inflation is deeply negative in real terms whatever the transmission speed. This is the forward-guidance / expectations channel the project has deferred three times, and after Phase 2 it is the largest single thing still missing from the monetary block — the reasoning in docs/12 that deferred it named the wrong defect, but Phase 2 has now removed that defect and the case for building it is what remains. Do not raise the transmission speed or lower kappa to close this.
  ---
  duration_ms: 5.038731
  location: '/home/ztchr/personal_projects/Crash/test/episodes.test.js:200:1'
  failureType: 'testCodeFailure'
  error: 'inflation peaked at 20.54% in month 40 and was 10.41% at month 32; the US peaked at 9.1% in month 18 and was at 3.1% by month 32. Credibility bottomed at 0.000 in month 31.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/episodes.test.js:223:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: UK 1979-83: low credibility really does make inflation more expensive
ok 44 - UK 1979-83: low credibility really does make inflation more expensive
  ---
  duration_ms: 7.724175
  ...
# Subtest: UK 1979-83: THE RECESSION THAT PAID FOR IT NEVER ARRIVES
not ok 45 - UK 1979-83: THE RECESSION THAT PAID FOR IT NEVER ARRIVES # TODO THE BIGGEST IMPROVEMENT OF PHASE 2, AND IT STILL FAILS ON THE PRICE. The TIMING is now right: inflation peaks in month 11 where the UK peaked in month 13, against month 60 before the A1 split — the disinflation now happens, and on roughly the historical timetable. It falls to 8.63% at four years, against 13.71% before (UK: 4.6%). The felt rate at month 12 went from 13.12% to 16.86% against a 17% MLR, which is the whole of why: Howe's budget is now actually contractionary in the model rather than nominally so. WHAT STILL FAILS IS THE PRICE, AND IT FAILS IN BOTH DIRECTIONS. The peak is 16.38% against a UK 21.9% — the model no longer overshoots into a late spiral, but it never reaches the historical peak either. And the recession is still absent: unemployment rises 0.64pp where the UK went 5.4 -> 11.9, so the sacrifice ratio is 0.38 point-years per pp against Ball 1994's 2-4 for this exact episode. A disinflation this cheap is not a disinflation anyone would recognise. That is a statement about the DEMAND BLOCK — the same finding as TAX_SHOCK_TO_GDP and the missing austerity paradox, where every real quantity moves too little for the price change that caused it. It is no longer a statement about transmission.
  ---
  duration_ms: 6.374822
  location: '/home/ztchr/personal_projects/Crash/test/episodes.test.js:272:1'
  failureType: 'testCodeFailure'
  error: "inflation peaked in month 11 at 16.38% (UK: 21.9%) and was 8.63% at four years; unemployment rose 0.64pp; sacrifice ratio 0.38 against Ball's 2-4."
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/episodes.test.js:300:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: JAPAN: own-currency debt held at home does not reprice, and foreign-held does
ok 46 - JAPAN: own-currency debt held at home does not reprice, and foreign-held does
  ---
  duration_ms: 36.210339
  ...
# Subtest: JAPAN: THE MODEL CANNOT HOLD A DEFLATION
not ok 47 - JAPAN: THE MODEL CANNOT HOLD A DEFLATION # TODO UNCHANGED BY PHASE 2, AS EXPECTED, AND THE REASON MATTERS. Inflation is under 0.5% in 2 of 120 months; it leaves the deflation inside a year (1.28% at month 12, was 1.44%), passes target by month 36 (2.78%) and reaches 3.76% by month 60 (was 3.95%) with the policy rate on the floor throughout. Debt peaks at 91% where Japan passed 150%, because the inflation the model invents erodes it. PHASE 2 COULD NOT HAVE HELPED. Both Section A defects were about a TIGHTENING arriving too slowly, and Japan is a decade in which no tightening was attempted and the rate dial was against its LOWER bound the whole time — the one bound Phase 2.4 did not move, because the ELB is physics rather than layout. THE MISSING MECHANISM IS DOWNWARD DE-ANCHORING: updateExpectations pulls expectations back toward inflation_target from BELOW at the same rate as from above, so a central bank with credibility 0.7 that cannot reach 2% is not representable. Japan's problem was precisely that nobody believed the BoJ could get there. That is the same expectations channel US 2021-23 now points at, seen from the deflationary side, and after Phase 2 the two episodes agree on the diagnosis for the first time.
  ---
  duration_ms: 15.022685
  location: '/home/ztchr/personal_projects/Crash/test/episodes.test.js:357:1'
  failureType: 'testCodeFailure'
  error: 'inflation was under 0.5% in 2 of 120 months and debt peaked at 91%. Japan: most of the decade, and past 150%. Model inflation at m12/m36/m60: 1.28 / 2.78 / 3.76.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/episodes.test.js:379:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: the Taylor principle IS satisfiable — but only by jumping, never by walking
ok 48 - the Taylor principle IS satisfiable — but only by jumping, never by walking
  ---
  duration_ms: 7.081854
  ...
# Subtest: THE ONE FINDING UNDERNEATH ALL FOUR: the bifurcation is gone
ok 49 - THE ONE FINDING UNDERNEATH ALL FOUR: the bifurcation is gone
  ---
  duration_ms: 17.161499
  ...
# Subtest: every event leaves the accounting identities intact
ok 50 - every event leaves the accounting identities intact
  ---
  duration_ms: 12.958423
  ...
# Subtest: every event actually changes something that survives the tick
ok 51 - every event actually changes something that survives the tick
  ---
  duration_ms: 6.564451
  ...
# Subtest: no event writes a pipeline target
ok 52 - no event writes a pipeline target
  ---
  duration_ms: 3.594161
  ...
# Subtest: full terms with shocks on and invariants armed, across every scenario
ok 53 - full terms with shocks on and invariants armed, across every scenario
  ---
  duration_ms: 360.857566
  ...
# Subtest: A WOBBLE IN A STRETCHED SYSTEM IS A DIFFERENT EVENT (docs/12 M3)
ok 54 - A WOBBLE IN A STRETCHED SYSTEM IS A DIFFERENT EVENT (docs/12 M3)
  ---
  duration_ms: 5.369552
  ...
# Subtest: no event is invisible to the player
ok 55 - no event is invisible to the player
  ---
  duration_ms: 7.060562
  ...
# Subtest: a temporary rate hike produces a HUMP, not a ramp
ok 56 - a temporary rate hike produces a HUMP, not a ramp
  ---
  duration_ms: 23.860389
  ...
# Subtest: the ordering of the peaks is output, then unemployment, then inflation
ok 57 - the ordering of the peaks is output, then unemployment, then inflation
  ---
  duration_ms: 26.009515
  ...
# Subtest: the response scales with the size of the impulse and not with its sign
ok 58 - the response scales with the size of the impulse and not with its sign
  ---
  duration_ms: 39.617925
  ...
# Subtest: a cut is a weaker impulse than a hike, for as long as the impulse is live
ok 59 - a cut is a weaker impulse than a hike, for as long as the impulse is live
  ---
  duration_ms: 24.294695
  ...
# Subtest: MEASURED: the labour market has no lag behind output, and here it is
not ok 60 - MEASURED: the labour market has no lag behind output, and here it is # TODO OPEN AND DELIBERATELY NOT CLOSED. Unemployment peaks in the SAME month as output, and a -3pp external demand shock puts 38% of the eventual 36-month unemployment response into month ONE (du 0.4725 of 1.2456; 48% of the 12-month response). labour.js sets its Okun target from the CURRENT gap and closes it at FIRING_SPEED 0.60/month. Whether that is wrong depends on which claim you read: docs/02 Asymmetry 2 says "firms fire in WEEKS and hire over quarters", which the model delivers exactly — and the jobless-recovery half of it is real (du/dgap doubles from 0.198 to 0.391 over four years as output recovers and employment does not). What is missing is the DECISION lag: firms cut hours and wait a quarter before shedding heads. Adding it means a new smoothing parameter on the Okun target in the busiest rule in the model, and the only thing that pins its magnitude is the reduced-form peak month it would be tuned to reproduce. Left open, with the number printed, rather than tuned.
  ---
  duration_ms: 7.146271
  location: '/home/ztchr/personal_projects/Crash/test/irf.test.js:139:1'
  failureType: 'testCodeFailure'
  error: '39% of the eventual unemployment response to a demand shock lands in the FIRST MONTH (0.4725 of 1.2244). Firms do not shed a third of the eventual job losses in month one.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/irf.test.js:164:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: the spending impulse is fast and the rate impulse is slow
ok 61 - the spending impulse is fast and the rate impulse is slow
  ---
  duration_ms: 12.561267
  ...
# Subtest: QE and the rate dial have the same SHAPE and different sizes
ok 62 - QE and the rate dial have the same SHAPE and different sizes
  ---
  duration_ms: 17.202613
  ...
# Subtest: a dial move reaches the transmitted driver and converges to the dial
ok 63 - a dial move reaches the transmitted driver and converges to the dial
  ---
  duration_ms: 11.346619
  ...
# Subtest: markets reprice before borrowers, and both before capital spending
ok 64 - markets reprice before borrowers, and both before capital spending
  ---
  duration_ms: 4.561531
  ...
# Subtest: the output response to a rate move is LAGGED, not instant
ok 65 - the output response to a rate move is LAGGED, not instant
  ---
  duration_ms: 17.359652
  ...
# Subtest: the pipeline refuses to schedule into a field a rule owns
ok 66 - the pipeline refuses to schedule into a field a rule owns
  ---
  duration_ms: 0.632673
  ...
# Subtest: no rule assigns to a pipeline target
ok 67 - no rule assigns to a pipeline target
  ---
  duration_ms: 2.018955
  ...
# Subtest: every declared pipeline target exists on a fresh state
ok 68 - every declared pipeline target exists on a fresh state
  ---
  duration_ms: 0.217546
  ...
# Subtest: the Taylor autopilot faces the same lags the player does
ok 69 - the Taylor autopilot faces the same lags the player does
  ---
  duration_ms: 20.888966
  ...
# Subtest: every dial either schedules a lag or is documented as immediate
ok 70 - every dial either schedules a lag or is documented as immediate
  ---
  duration_ms: 3.223903
  ...
# Subtest: recession multiplier lands in the published range
ok 71 - recession multiplier lands in the published range
  ---
  duration_ms: 20.558938
  ...
# Subtest: expansion multiplier lands in the published range
ok 72 - expansion multiplier lands in the published range
  ---
  duration_ms: 12.383195
  ...
# Subtest: the multiplier is larger in a slump than in a boom
ok 73 - the multiplier is larger in a slump than in a boom
  ---
  duration_ms: 21.231599
  ...
# Subtest: the same spending buys more OUTPUT with slack and more PRICES without
ok 74 - the same spending buys more OUTPUT with slack and more PRICES without
  ---
  duration_ms: 22.781495
  ...
# Subtest: holding the rate fixed makes the multiplier much larger
ok 75 - holding the rate fixed makes the multiplier much larger
  ---
  duration_ms: 17.937049
  ...
# Subtest: THE QE LESSON: printing into slack with a credible CB barely bites
ok 76 - THE QE LESSON: printing into slack with a credible CB barely bites
  ---
  duration_ms: 6.32974
  ...
# Subtest: printing with no slack and no credibility goes straight to prices
ok 77 - printing with no slack and no credibility goes straight to prices
  ---
  duration_ms: 1.093142
  ...
# Subtest: printing buys real things when there is slack to buy them with
ok 78 - printing buys real things when there is slack to buy them with
  ---
  duration_ms: 11.778227
  ...
# Subtest: AUSTERITY LEAKS: a tax rise collects less than you legislated, and worse with slack
ok 79 - AUSTERITY LEAKS: a tax rise collects less than you legislated, and worse with slack
  ---
  duration_ms: 103.579347
  ...
# Subtest: THE SIGN FLIP THE DOCS PROMISED: how far away is it
not ok 80 - THE SIGN FLIP THE DOCS PROMISED: how far away is it # TODO OPEN, AND THE SAME FINDING AS TAX_SHOCK_TO_GDP. Revenue rises at every playable gap and no plausible parameter draw changes that. Closed form: with revenue = tau + e*(tau/100)*gap, revenue falls only if +1pp of tax costs more than 3.11% of output at a zero gap or 2.87% at -6%. The model delivers 0.99%. The requirement drops to 1.76% only at the elasticity's high end (1.8) AND a -12% gap, which is the one corner where it lands inside Romer-Romer (2.0-3.0) at all. So the austerity paradox is absent BECAUSE the tax multiplier is small — one finding, not two, and the fix is a statement about the demand block rather than a coefficient to bend. docs/07 L4 proposed exactly this test and it was never written.
  ---
  duration_ms: 15.502872
  location: '/home/ztchr/personal_projects/Crash/test/multipliers.test.js:248:1'
  failureType: 'testCodeFailure'
  error: 'the sign flip needs +1pp of tax to cost 2.87% of output at a -6% gap; the model delivers 0.91%. Romer-Romer is 2.0-3.0.'
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
ok 81 - every parameter has a value inside its range
  ---
  duration_ms: 1.842141
  ...
# Subtest: every parameter has a unit, a source and a known confidence level
ok 82 - every parameter has a unit, a source and a known confidence level
  ---
  duration_ms: 0.300783
  ...
# Subtest: the deleted double-count has not crept back
ok 83 - the deleted double-count has not crept back
  ---
  duration_ms: 0.092025
  ...
# Subtest: kernels are normalised and peak on the documented month
ok 84 - kernels are normalised and peak on the documented month
  ---
  duration_ms: 0.537483
  ...
# Subtest: every fitted kernel shape has a lag entry
ok 85 - every fitted kernel shape has a lag entry
  ---
  duration_ms: 0.165278
  ...
# Subtest: START satisfies the accounting identities
ok 86 - START satisfies the accounting identities
  ---
  duration_ms: 0.249864
  ...
# Subtest: ROUND TRIP: the stance returns exactly, to nine decimal places
ok 87 - ROUND TRIP: the stance returns exactly, to nine decimal places
  ---
  duration_ms: 38.240255
  ...
# Subtest: ROUND TRIP: the ECONOMY does not return, and the residue is real capital
ok 88 - ROUND TRIP: the ECONOMY does not return, and the residue is real capital
  ---
  duration_ms: 42.740238
  ...
# Subtest: HIKE-HOLD-CUT: no permanent ratchet, and the jobs cost outlasts the gain
ok 89 - HIKE-HOLD-CUT: no permanent ratchet, and the jobs cost outlasts the gain
  ---
  duration_ms: 18.835826
  ...
# Subtest: STOP-GO: a symmetric-looking cycle is a persistent EASING, and it shows
ok 90 - STOP-GO: a symmetric-looking cycle is a persistent EASING, and it shows
  ---
  duration_ms: 31.394294
  ...
# Subtest: a path and a held move are not the same thing, and the difference is measurable
ok 91 - a path and a held move are not the same thing, and the difference is measurable
  ---
  duration_ms: 13.206832
  ...
# Subtest: every scenario starts internally consistent
ok 92 - every scenario starts internally consistent
  ---
  duration_ms: 2.644421
  ...
# Subtest: the bubble scenario looks healthy on every gauge except the credit gap
ok 93 - the bubble scenario looks healthy on every gauge except the credit gap
  ---
  duration_ms: 0.437235
  ...
# Subtest: the bubble hides for four years — the design promise
ok 94 - the bubble hides for four years — the design promise
  ---
  duration_ms: 13.078081
  ...
# Subtest: every scenario starts in, and stays a quarter in, its advertised regime
ok 95 - every scenario starts in, and stays a quarter in, its advertised regime
  ---
  duration_ms: 8.204916
  ...
# Subtest: the recession scenario has the rate dial genuinely dead
ok 96 - the recession scenario has the rate dial genuinely dead
  ---
  duration_ms: 1.801086
  ...
# Subtest: no scenario produces absurd numbers inside a term
ok 97 - no scenario produces absurd numbers inside a term
  ---
  duration_ms: 61.733663
  ...
# Subtest: NEUTRAL ANCHORS ARE BUILT FROM NEUTRAL, in every scenario
ok 98 - NEUTRAL ANCHORS ARE BUILT FROM NEUTRAL, in every scenario
  ---
  duration_ms: 0.796305
  ...
# Subtest: debt_trap: the real economy responds to the yield at all
ok 99 - debt_trap: the real economy responds to the yield at all
  ---
  duration_ms: 3.680595
  ...
# Subtest: debt_trap: the benchmark central bank is no longer identical to doing nothing
ok 100 - debt_trap: the benchmark central bank is no longer identical to doing nothing
  ---
  duration_ms: 6.411782
  ...
# Subtest: debt_trap: THE DECISION — you cannot consolidate your way out alone
ok 101 - debt_trap: THE DECISION — you cannot consolidate your way out alone
  ---
  duration_ms: 24.362169
  ...
# Subtest: a hike does not bite the interest bill on impact
ok 102 - a hike does not bite the interest bill on impact
  ---
  duration_ms: 4.38478
  ...
# Subtest: the core macro block is stable around the steady state
ok 103 - the core macro block is stable around the steady state
  ---
  duration_ms: 26.302261
  ...
# Subtest: the debt loop diverges, but slowly enough to be playable
ok 104 - the debt loop diverges, but slowly enough to be playable
  ---
  duration_ms: 15.464235
  ...
# Subtest: a one-off demand shock decays rather than compounding
ok 105 - a one-off demand shock decays rather than compounding
  ---
  duration_ms: 7.679551
  ...
# Subtest: 200 ticks of no input and nothing drifts
ok 106 - 200 ticks of no input and nothing drifts
  ---
  duration_ms: 30.291765
  ...
# Subtest: credibility rises when the target is hit, and slowly
ok 107 - credibility rises when the target is hit, and slowly
  ---
  duration_ms: 19.594096
  ...
# Subtest: the credit gap does not open on its own
ok 108 - the credit gap does not open on its own
  ---
  duration_ms: 25.42943
  ...
#   disinflation curve @m60: 5%:259.3 6%:126.9 7%:5.5 8%:1.6 9%:-0.8 10%:-3.5 12%:-4.0
#   steepest -149.2pp of inflation per pp of policy, at 6.25%
#   steepest slope: as built -149.2 at 6.25%; wealth channel off -22.5 at 5.5%
#   stagflation m3->m12: inflation +6.58pp; response on the DIAL 1.91, TRANSMITTED 1.83 (0.37 before the A1 split); real rate felt at m12 -2.03% (-14.50 before)
# Subtest: a rate cut does more for OUTPUT with slack than at capacity
ok 109 - a rate cut does more for OUTPUT with slack than at capacity
  ---
  duration_ms: 34.817732
  ...
# Subtest: a cut is weaker than the equivalent hike
ok 110 - a cut is weaker than the equivalent hike
  ---
  duration_ms: 12.392298
  ...
# Subtest: a cut-then-hike round trip leaves the stance where it started
ok 111 - a cut-then-hike round trip leaves the stance where it started
  ---
  duration_ms: 7.507877
  ...
# Subtest: THE LOWER BOUND: easing stops working as the rate approaches it
ok 112 - THE LOWER BOUND: easing stops working as the rate approaches it
  ---
  duration_ms: 17.395798
  ...
# Subtest: QE still works when the rate dial has run out of room
ok 113 - QE still works when the rate dial has run out of room
  ---
  duration_ms: 19.650429
  ...
# Subtest: unemployment rises faster than it falls
ok 114 - unemployment rises faster than it falls
  ---
  duration_ms: 11.235875
  ...
# Subtest: SWEEP: more spending never raises unemployment, at any starting gap
ok 115 - SWEEP: more spending never raises unemployment, at any starting gap
  ---
  duration_ms: 60.5801
  ...
# Subtest: SWEEP: no step changes in the response to a rate cut
ok 116 - SWEEP: no step changes in the response to a rate cut
  ---
  duration_ms: 20.019152
  ...
# Subtest: the ONE cliff in the model is the capacity ceiling, and it is where it says
ok 117 - the ONE cliff in the model is the capacity ceiling, and it is where it says
  ---
  duration_ms: 3.271593
  ...
# Subtest: L5: HIKING AT THE LOWER BOUND MUST NOT RAISE OUTPUT
ok 118 - L5: HIKING AT THE LOWER BOUND MUST NOT RAISE OUTPUT
  ---
  duration_ms: 13.220465
  ...
# Subtest: L3: the fiscal multiplier has no step in it as the rate falls to the bound
ok 119 - L3: the fiscal multiplier has no step in it as the rate falls to the bound
  ---
  duration_ms: 345.037371
  ...
# Subtest: investment.js reads the rate DIAL only to display it
ok 120 - investment.js reads the rate DIAL only to display it
  ---
  duration_ms: 0.920908
  ...
# Subtest: A-TABLE: the disinflation response is monotone and its threshold is where Fisher puts it
ok 121 - A-TABLE: the disinflation response is monotone and its threshold is where Fisher puts it
  ---
  duration_ms: 39.299176
  ...
# Subtest: A-TABLE: the knife-edge is the wealth channel, and it is still there
not ok 122 - A-TABLE: the knife-edge is the wealth channel, and it is still there # TODO PHASE 3 CLOSES THIS. Measured as the steepest local sensitivity on a 0.25pp grid, |d inflation@m60 / d policy rate|: pre-A1 as built -366.7 at 7.75% (slope ratio 138x); post-A1 as built -149.2 at 6.25% (slope ratio 80x); post-A1 with no wealth channel -22.5 at 5.50% (slope ratio 19x). Splitting the transmission lag halved the knife-edge and moved it toward the Fisher point, but did not remove it. Switching WEALTH_EFFECT off removes 85% of what is left, which is the isolating experiment: the residual bifurcation is the asset-wealth channel, and that is Section B. The target below is not a picked number — it is what the model itself does with the offending channel switched off, re-measured on every run.
  ---
  duration_ms: 66.557494
  location: '/home/ztchr/personal_projects/Crash/test/transmission.test.js:358:1'
  failureType: 'testCodeFailure'
  error: "the live model's steepest response is 149.2pp of inflation per pp of policy, against 22.5 with WEALTH_EFFECT switched off. The wealth channel is contributing 6.6x the curvature of the rest of the model put together."
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/transmission.test.js:375:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: A-TABLE: the A1 split made the response curve measurably smoother
ok 123 - A-TABLE: the A1 split made the response curve measurably smoother
  ---
  duration_ms: 27.746901
  ...
# Subtest: the TRANSMITTED Taylor response clears unity, not just the dial one
ok 124 - the TRANSMITTED Taylor response clears unity, not just the dial one
  ---
  duration_ms: 2.713636
  ...
# Subtest: the whole UI boots without throwing
ok 125 - the whole UI boots without throwing
  ---
  duration_ms: 0.985819
  ...
# Subtest: every shell container the app needs exists
ok 126 - every shell container the app needs exists
  ---
  duration_ms: 0.477203
  ...
# Subtest: a gauge mounts for every indicator
ok 127 - a gauge mounts for every indicator
  ---
  duration_ms: 0.154629
  ...
# Subtest: a dial mounts for every dial
ok 128 - a dial mounts for every dial
  ---
  duration_ms: 0.099513
  ...
# Subtest: every gauge can open a why panel with real terms
ok 129 - every gauge can open a why panel with real terms
  ---
  duration_ms: 4.787501
  ...
# Subtest: every gauge has a history series to draw
ok 130 - every gauge has a history series to draw
  ---
  duration_ms: 5.419247
  ...
# Subtest: moving a dial schedules an effect instead of applying it
ok 131 - moving a dial schedules an effect instead of applying it
  ---
  duration_ms: 1.414458
  ...
# Subtest: a session runs a full term without throwing
ok 132 - a session runs a full term without throwing
  ---
  duration_ms: 16.311492
  ...
# Subtest: restarting on the same seed keeps the previous run as a ghost
ok 133 - restarting on the same seed keeps the previous run as a ghost
  ---
  duration_ms: 2.161072
  ...
# Subtest: the game starts paused, at 1x, with play as the visible action
ok 134 - the game starts paused, at 1x, with play as the visible action
  ---
  duration_ms: 0.475351
  ...
# Subtest: pausing does not throw away the chosen speed
ok 135 - pausing does not throw away the chosen speed
  ---
  duration_ms: 0.2368
  ...
# Subtest: every gauge and every dial has a plain-English definition
ok 136 - every gauge and every dial has a plain-English definition
  ---
  duration_ms: 0.141625
  ...
# Subtest: every gauge can say whether it is getting worse
ok 137 - every gauge can say whether it is getting worse
  ---
  duration_ms: 0.123317
  ...
# Subtest: a passive calm run reaches the end of the term and is scored
ok 138 - a passive calm run reaches the end of the term and is scored
  ---
  duration_ms: 9.163016
  ...
# Subtest: a losing run reaches a named ending with a lesson
ok 139 - a losing run reaches a named ending with a lesson
  ---
  duration_ms: 3.522067
  ...
# Subtest: the DEFERRED register matches the code, in both directions
ok 140 - the DEFERRED register matches the code, in both directions
  ---
  duration_ms: 12.643237
  ...
# Subtest: every recorded parameter conflict is still genuinely unresolved
ok 141 - every recorded parameter conflict is still genuinely unresolved
  ---
  duration_ms: 2.223469
  ...
# Subtest: RATE_TO_OUTPUT: 1pp of policy rate, held a year
ok 142 - RATE_TO_OUTPUT: 1pp of policy rate, held a year
  ---
  duration_ms: 21.529787
  ...
# Subtest: AUTO_STABILISER_ABSORPTION: share of an income shock that never lands
ok 143 - AUTO_STABILISER_ABSORPTION: share of an income shock that never lands
  ---
  duration_ms: 10.331646
  ...
# Subtest: a tax cut RAISES output, and does it through consumption
ok 144 - a tax cut RAISES output, and does it through consumption
  ---
  duration_ms: 22.364906
  ...
# Subtest: QE_TO_GDP: bond buying reaches output through the yield, and how much
ok 145 - QE_TO_GDP: bond buying reaches output through the yield, and how much
  ---
  duration_ms: 8.903077
  ...
# Subtest: RATE_TO_INFLATION: the model is about half the published estimate
not ok 146 - RATE_TO_INFLATION: the model is about half the published estimate # TODO KNOWN AND ARGUABLY CORRECT. A 1pp hike moves inflation ~0.12pp at 24 months against a published 0.2-0.4. This is the anchored Phillips slope doing exactly what docs/02 says it should: with kappa at 0.05 the demand channel barely moves prices, and real surges are supposed to come from supply shocks and unanchoring. The published range is estimated across regimes that include the unanchored 1970s. Do not raise kappa to close this.
  ---
  duration_ms: 7.46581
  location: '/home/ztchr/personal_projects/Crash/test/validation.test.js:131:1'
  failureType: 'testCodeFailure'
  error: 'model 0.123, literature 0.2-0.4'
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
ok 147 - CRISIS_OUTPUT_TROUGH: the realised peak-to-trough lands in the published range
  ---
  duration_ms: 14.684978
  ...
# Subtest: TAX_SHOCK_TO_GDP: the model is far below Romer-Romer
not ok 148 - TAX_SHOCK_TO_GDP: the model is far below Romer-Romer # TODO KNOWN. A 1% of GDP tax rise costs ~0.33% of output over 30 months against a published 2.0-3.0. The Romer-Romer narrative multiplier is the largest in the literature and famously larger than structural models produce; the model also has a responding central bank and a crowding-out term that works in the opposite direction on a tax rise. Recorded rather than closed: reproducing 2.5 would mean roughly tripling the consumption response to disposable income, which the MPC evidence does not support.
  ---
  duration_ms: 8.818883
  location: '/home/ztchr/personal_projects/Crash/test/validation.test.js:183:1'
  failureType: 'testCodeFailure'
  error: 'model 0.492, literature 2-3'
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
not ok 149 - PRIVATE debt reprices instantly, and government debt no longer does # TODO RECORDED, NOT FIXED (docs/12, E1). credit.js computes the debt-service burden as private_credit * (policy_rate + credit_spread) / 100 — the DIAL, and the whole stock. That is exactly the error the government's interest bill carried until DEBT_AVERAGE_MATURITY_YEARS was added this pass: every mortgage and every corporate loan is floating-rate with no lag, so the default rate responds to a rate move the month it is announced. The asymmetry is now visible and odd — the state refinances over seven years while its households refinance overnight. Fixing it needs a private-debt maturity parameter with its own source (the fixed/floating mix differs enormously across countries, which is most of why the 2022 hiking cycle hurt the UK and Australia so much more than the US), so it is a modelling change rather than a keystroke. tools/lint.mjs holds the exception with a declared reason so it cannot be forgotten.
  ---
  duration_ms: 3.306664
  location: '/home/ztchr/personal_projects/Crash/test/validation.test.js:198:1'
  failureType: 'testCodeFailure'
  error: 'a 3pp hike moved the default rate 0.67538pp in its FIRST month. Borrowers do not all reprice in thirty days.'
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
1..149
# tests 149
# suites 0
# pass 135
# fail 0
# cancelled 0
# skipped 0
# todo 14
# duration_ms 839.731515
```
