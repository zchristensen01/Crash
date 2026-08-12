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
| Tests | **165** |
| Passing | **149** |
| Failing (regressions) | **0** |
| Open disagreements (`OPEN`) | **16** |
| Linter | **clean** |

```
lint: clean (40 files, 6 checks)
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

STILL SHORT AFTER 4.1 RE-SOLVED THE IMPULSE CONSTANT. Unemployment peaks +1.91pp against a published 2-5 for a banking crisis, having been +1.93 before the re-solve and inside the band before Phase 2. Note the trough itself is now EXACTLY on target at -9.000% — so the output hole is the right depth and the labour market does not follow it down. That is Okun, and it is the same demand-block finding recorded on the five-year loss below. The four other magnitudes in the crash arc — peak-to-trough, the month of the trough, the five-year loss against trend and the absence of a rebound — all still hold, which is why this is one assertion rather than the whole test. CRISIS_IMPULSE_AMPLIFICATION and CRISIS_SCAR_AMPLIFICATION are solved FROM this model to make the realised trough equal CRISIS_OUTPUT_TROUGH, so they absorb exactly this kind of change and Phase 4.1 re-solves them after Phases 2 and 3. Re-solving them before the demand block has stopped moving would mean doing it twice and believing the first answer. Note the shortfall is 0.09pp: this is a band edge, not a collapse.

**Measured on this run:**

```
unemployment peaked +1.91pp; a banking crisis costs 2-5
```

### 2. THE CRASH ARC: the five-year loss against trend

*`test/crisis.test.js`*

PHASE 4.1 RAN, AND THIS IS WHAT IT FOUND. Output is -6.60% below trend at five years against CRISIS_HYSTERESIS_SCAR = 10, after CRISIS_IMPULSE_AMPLIFICATION was re-solved to 2.0461 (2.59 in the third audit, 2.1855 in 4.1, and again in 5.7 when the capital-units fix moved the trend this is measured against). It CANNOT be closed by re-solving CRISIS_SCAR_AMPLIFICATION: that lands at 1.06-1.26, outside its published [2.0, 4.5], and would make the exogenous capacity cut supply 7.9-9.5 of the 10 while the model supplies almost nothing — destroying the deconvolution the constant exists to be. Measured with no exogenous scar at all, the model used to produce 8.4% of the loss endogenously and now produces 3.82%. THE MODEL NO LONGER PROPAGATES A CRISIS; IT GETS HIT AND RECOVERS. That is a demand-block finding, it is the same one as the UK sacrifice ratio and TAX_SHOCK_TO_GDP, and it is not a calibration problem. Do not nudge either constant to move it — 4.2 records what they are. THE SECOND ASSERTION HERE IS OPEN \#1, AND IT MOVED THE OPPOSITE WAY TO THE PLAN'S HYPOTHESIS. docs/13 4.4 expects the too-fast rebound to be downstream of Section B, so fixing B should have slowed it. Measured, it sped up: output is back to -5.16% of trend by month 96 against a required -5. That is not a new defect — it is the same shallower crisis, since a crash that digs a 5.97% hole instead of a 10% one has less to climb out of. Both numbers should move together when the constant is re-solved, and if they do not, OPEN \#1 is a real finding about the demand block rather than a calibration artefact.

**Measured on this run:**

```
output is -6.60% below trend at five years, against CRISIS_HYSTERESIS_SCAR = 10
```

### 3. THE DECONVOLUTION CONSTANTS ARE MEASUREMENTS, and this re-measures them

*`test/crisis.test.js`*

HALF RE-SOLVED IN 4.1, AND THE HALF THAT WOULD NOT SOLVE IS THE FINDING. CRISIS_IMPULSE_AMPLIFICATION was re-solved 2.59 -> 2.1855 in 4.1 and 2.1855 -> 2.0461 in 5.7, and it reconciles: the realised trough is -9.000% against CRISIS_OUTPUT_TROUGH exactly, at month 12. CRISIS_SCAR_AMPLIFICATION was left at 3.14 on purpose. Re-solved against Cerra & Saxena it lands at 1.06-1.26, outside its published [2.0, 4.5], which would make the exogenous capacity cut 7.9 to 9.5 of the 10 and leave the model supplying almost nothing. THE POINT OF THIS CONSTANT IS A DECONVOLUTION — the model generates most of the observed loss endogenously and the exogenous cut is only the remainder — and forcing it there would load the missing propagation onto an exogenous constant, which is rule 4 and is the defect the deconvolution was built to remove. MEASURED, with CRISIS_HYSTERESIS_SCAR set to 0 so there is no exogenous scar at all: the model used to produce 8.4% of the 10 by itself and now produces 3.82% (this message said 3.22% until Phase 5 verification re-ran it, when both were 3.65 and had disagreed for four commits; 5.7 moved them together to 3.82). That is a demand-block finding and the fourth independent sighting of it, alongside the UK sacrifice ratio, TAX_SHOCK_TO_GDP and the missing austerity paradox. Re-solve when the demand block has been addressed.

**Measured on this run:**

```
the model now turns a 3.27pp exogenous capacity cut into a 6.60% loss against trend (2.30x), but CRISIS_SCAR_AMPLIFICATION says 3.14
```

### 4. MEASURED: the model rebounds after year five and Cerra-Saxena say it should not

*`test/crisis.test.js`*

RE-MEASURED IN PHASE 4.4, AND THE PLAN'S HYPOTHESIS FOR IT IS WRONG. docs/13 expected this to be downstream of Section B — "the 10-year recovery coincides with the credit/asset loop re-inflating" — so fixing B should have slowed it. THE CREDIT GAP IS NEGATIVE THROUGHOUT THE RECOVERY once the boom has unwound: +5.71 at m24, -0.79 at m60, -3.83 at m96, -4.61 at m120. It is a depressed credit stock closing on its trend from BELOW, not a new boom. Output against the pre-crisis trend now reads -10.00 (m12), -10.39 (m24), -6.60 (m60), -5.16 (m96), -4.51 (m120), troughing at -10.40 in month 22 and recovering 5.89pp. THE ISOLATING EXPERIMENT: switch OFF both the collateral channel and the wealth effect and the crisis is shallower (trough -6.43) but 2.49pp of it still comes back — 39% of the trough recovered with both amplifiers gone. So the rebound is not Section B at all. It is the demand block closing an output gap faster than the data says it should, which is the same finding as the UK 1979-83 sacrifice ratio, TAX_SHOCK_TO_GDP, the missing austerity paradox and the crisis propagation that would not re-solve in 4.1. One finding, five sightings. See open_items.md A2.

**Measured on this run:**

```
output recovered to -4.51% of trend at ten years, from -6.60% at five. That is a rebound.
```

### 5. US 2008-12: THE CRISIS IS ENTIRELY OFFSET BY THE RATE CUTS THAT FOLLOWED IT

*`test/episodes.test.js`*

STILL FAILS, AND PHASE 2 BARELY TOUCHED IT — which is itself the finding. Re-measured after the A1 transmission split and the derived rate ceiling: output troughs at -1.85% of trend (was -1.86; US: -5 to -7), unemployment rises +0.14pp peaking in month 9 (was +0.32pp; US: +5.0pp to 10.0% at month 22), inflation never goes below 2.25% (was 2.26; US: -2.1%), and government debt FALLS from 64% to 61% (was 60; US: 64 -> 100). Output is +3.55% of trend at month 6, BEFORE Lehman lands. THE UNEMPLOYMENT RESPONSE GOT SMALLER, not larger. WHY PHASE 2 DID NOT HELP HERE, and it is worth understanding: this episode is not a disinflation, it is a CRASH plus an easing, and the two Section A defects were both about tightening arriving too slowly. Making the rate arrive faster makes the EASING arrive faster too, so the 1.75pp of cuts delivered between months 2 and 11 now offset the crisis sooner rather than less. The asymmetry the brief identified is unchanged: the cut reaches asset prices on a 1-month kernel and now reaches borrowers on a 3-month one, while the crisis works through the credit and capital blocks over years. What is left is a demand block that heals too fast, which is the same statement as OPEN \#1 and TAX_SHOCK_TO_GDP, and it sits downstream of Section B rather than Section A. Re-measure after Phase 3.

**Measured on this run:**

```
unemployment rose 0.79pp, peaking in month 41; the US went 5.0 to 10.0. Output trough -3.52% of trend, inflation low 1.81%, debt 64 -> 69.
```

### 6. US 2021-23: THE DISINFLATION NEVER HAPPENS

*`test/episodes.test.js`*

MATERIALLY BETTER AFTER PHASE 2 AND STILL WRONG. Inflation now PEAKS inside the window — 20.54% at month 40, where before it had not peaked at all and was still climbing through 36.81% — and it is 10.41% at month 32 against 14.06% before (US: peaked 9.1% at month 17, 3.1% by month 32). The single biggest change is that the hike now reaches the economy: mechanism (1) in the old diagnosis was that the transmitted rate was 2.28% at month 30 while the DIAL had been at 5.25 since month 27, and that is gone — policy_rate_demand now tracks the dial within a quarter. WHAT IS LEFT IS MECHANISM (2), AND IT IS NOW THE WHOLE OF IT: credibility falls 0.85 -> 0.000 by month 31 purely from realised misses, which quadruples kappa and makes the process self-reinforcing exactly when the central bank most needs to be believed. A 5.25% funds rate against 20% expected inflation is deeply negative in real terms whatever the transmission speed. This is the forward-guidance / expectations channel the project has deferred three times, and after Phase 2 it is the largest single thing still missing from the monetary block — the reasoning in docs/12 that deferred it named the wrong defect, but Phase 2 has now removed that defect and the case for building it is what remains. Do not raise the transmission speed or lower kappa to close this.

**Measured on this run:**

```
inflation peaked at 13.63% in month 40 and was 8.67% at month 32; the US peaked at 9.1% in month 18 and was at 3.1% by month 32. Credibility bottomed at 0.000 in month 32.
```

### 7. UK 1979-83: THE RECESSION THAT PAID FOR IT NEVER ARRIVES

*`test/episodes.test.js`*

THE BIGGEST IMPROVEMENT OF PHASE 2, AND IT STILL FAILS ON THE PRICE. The TIMING is now right: inflation peaks in month 11 where the UK peaked in month 13, against month 60 before the A1 split — the disinflation now happens, and on roughly the historical timetable. It falls to 7.82% at four years, against 13.71% before (UK: 4.6%). The felt rate at month 12 went from 13.12% to 16.86% against a 17% MLR, which is the whole of why: Howe's budget is now actually contractionary in the model rather than nominally so. WHAT STILL FAILS IS THE PRICE, AND IT FAILS IN BOTH DIRECTIONS. The peak is 16.18% against a UK 21.9% — the model no longer overshoots into a late spiral, but it never reaches the historical peak either. And the recession is still absent: unemployment rises 0.65pp where the UK went 5.4 -> 11.9, so the sacrifice ratio is 0.36 point-years per pp against Ball 1994's 2-4 for this exact episode. A disinflation this cheap is not a disinflation anyone would recognise. That is a statement about the DEMAND BLOCK — the same finding as TAX_SHOCK_TO_GDP and the missing austerity paradox, where every real quantity moves too little for the price change that caused it. It is no longer a statement about transmission.

### 8. JAPAN: THE MODEL CANNOT HOLD A DEFLATION

*`test/episodes.test.js`*

UNCHANGED BY PHASE 2, AS EXPECTED, AND THE REASON MATTERS. Inflation is under 0.5% in 2 of 120 months; it leaves the deflation inside a year (1.28% at month 12, was 1.44%), passes target by month 36 (2.78%) and reaches 3.76% by month 60 (was 3.95%) with the policy rate on the floor throughout. Debt peaks at 91% where Japan passed 150%, because the inflation the model invents erodes it. PHASE 2 COULD NOT HAVE HELPED. Both Section A defects were about a TIGHTENING arriving too slowly, and Japan is a decade in which no tightening was attempted and the rate dial was against its LOWER bound the whole time — the one bound Phase 2.4 did not move, because the ELB is physics rather than layout. THE MISSING MECHANISM IS DOWNWARD DE-ANCHORING: updateExpectations pulls expectations back toward inflation_target from BELOW at the same rate as from above, so a central bank with credibility 0.7 that cannot reach 2% is not representable. Japan's problem was precisely that nobody believed the BoJ could get there. That is the same expectations channel US 2021-23 now points at, seen from the deflationary side, and after Phase 2 the two episodes agree on the diagnosis for the first time.

**Measured on this run:**

```
inflation was under 0.5% in 2 of 120 months and debt peaked at 91%. Japan: most of the decade, and past 150%. Model inflation at m12/m36/m60: 1.24 / 2.44 / 3.01.
```

### 9. MEASURED: the labour market has no lag behind output, and here it is

*`test/irf.test.js`*

OPEN AND DELIBERATELY NOT CLOSED. Unemployment peaks in the SAME month as output, and a -3pp external demand shock puts 38% of the eventual 36-month unemployment response into month ONE (du 0.4725 of 1.2456; 48% of the 12-month response). labour.js sets its Okun target from the CURRENT gap and closes it at FIRING_SPEED 0.60/month. Whether that is wrong depends on which claim you read: docs/02 Asymmetry 2 says "firms fire in WEEKS and hire over quarters", which the model delivers exactly — and the jobless-recovery half of it is real (du/dgap doubles from 0.198 to 0.391 over four years as output recovers and employment does not). What is missing is the DECISION lag: firms cut hours and wait a quarter before shedding heads. Adding it means a new smoothing parameter on the Okun target in the busiest rule in the model, and the only thing that pins its magnitude is the reduced-form peak month it would be tuned to reproduce. Left open, with the number printed, rather than tuned.

**Measured on this run:**

```
39% of the eventual unemployment response to a demand shock lands in the FIRST MONTH (0.4725 of 1.2012). Firms do not shed a third of the eventual job losses in month one.
```

### 10. THE SIGN FLIP THE DOCS PROMISED: how far away is it

*`test/multipliers.test.js`*

OPEN, AND THE SAME FINDING AS TAX_SHOCK_TO_GDP. Revenue rises at every playable gap and no plausible parameter draw changes that. Closed form: with revenue = tau + e*(tau/100)*gap, revenue falls only if +1pp of tax costs more than 3.11% of output at a zero gap or 2.87% at -6%. The model delivers 0.99%. The requirement drops to 1.76% only at the elasticity's high end (1.8) AND a -12% gap, which is the one corner where it lands inside Romer-Romer (2.0-3.0) at all. So the austerity paradox is absent BECAUSE the tax multiplier is small — one finding, not two, and the fix is a statement about the demand block rather than a coefficient to bend. docs/07 L4 proposed exactly this test and it was never written.

**Measured on this run:**

```
the sign flip needs +1pp of tax to cost 2.87% of output at a -6% gap; the model delivers 0.90%. Romer-Romer is 2.0-3.0.
```

### 11. the bubble does not deflate on its own before the term ends

*`test/scenarios.test.js`*

A LESSON-LEVEL CONSEQUENCE OF 3.1, AND NOT A DEFECT IN 3.1. docs/00 describes this scenario as eight years of every gauge saying you are brilliant while the one nobody watches climbs to ~14.5pp. It used to do exactly that — the credit gap rose monotonically 8.77 (m24), 11.63 (m48), 13.34 (m72), 14.10 (m96), with crisis probability reaching 10.36% and approval never leaving 70. It now PEAKS at 9.82 around month 48 and unwinds to 3.37 by month 96, with crisis probability falling from 6.35 to 0.22. The bet the player was knowingly taking now settles itself. THE CAUSE IS THAT THE SCENARIO WAS CALIBRATED AGAINST A DEFECT. Its 14.5pp gap was being produced by updateAssetPrices overshooting its own sourced semi-elasticity by 4.6x, which 3.1 fixed. The four-year promise above still holds (9.80pp at m48, over the BIS line, with every visible gauge healthy), so what is lost is the second half of the term. DO NOT CLOSE THIS BY RE-INFLATING THE WEALTH CHANNEL — that is rule 3, and the channel now matches its own literature. AND DO NOT RETUNE THE STARTING VECTOR EITHER, which is what this message used to recommend. Phase 4.3 measured the cause and it is D2, an already-known sourced defect: updateCreditTrend chases the stock at 0.20/year, a 41.6-month half-life, while its stated source is a one-sided HP filter at lambda=400,000 whose trend constant is 10-15 YEARS. The gauge mean-reverts 3-4x faster than the indicator it approximates, so it systematically under-reads persistent booms — the exact situation it exists for. At the sourced speed the gap climbs and STAYS: measured, m24/m48/m72/m96 = 10.29/13.99/14.20/10.34 at 0.06 per year and 10.44/14.37/14.82/11.14 at 0.05, against 8.39/9.80/7.99/3.37 as built. The design promise is ~14.5pp. PHASE 5.4 HAS NOW RUN, AND IT ONLY GOT PART OF THE WAY. The derivation from the stated lambda gives 0.127/year, not the 0.05-0.06 that would restore 14.5pp — which took the peak from 9.82 to 12.00 and the m96 gap from 3.37 to 6.20. Pushing further would be tuning to a target (rule 3), so it was not done. 5.2 THEN MOVED IT AGAIN, UPWARD, FOR AN UNRELATED REASON: giving private debt a maturity means a rate change reaches the debt-service burden over years, so the balancing leg of the credit loop (burden -> defaults -> spread -> real rate) arrives slower and the boom runs longer. Current path 9.16/11.65/11.05/7.08, peaking at 11.98 in month 58. The SHAPE is unchanged: it still peaks and unwinds inside the term. WHAT IS LEFT IS PROBABLY STRUCTURAL: the BIS trend is a LOCAL LINEAR trend carrying a slope state and this one is level-only, so it lags a growing credit stock permanently and no speed fixes that. See CREDIT_TREND_CATCHUP's note. 6.1 (the countercyclical buffer) is the other half of the answer, because a bubble the player cannot act on is a spectacle rather than a decision.

**Measured on this run:**

```
the credit gap peaked at 11.98pp in month 58 and had fallen to 7.08pp by the end of the term. The scenario exists to hold a hidden danger in front of the player for eight years; one that quietly resolves itself teaches that ignoring it works.
```

### 12. debt_trap: and the inflation price of escaping is visibly large

*`test/scenarios.test.js`*

MAGNITUDE MOVED BY 3.1, DIRECTION INTACT. Cutting the rate to the floor in debt_trap buys 2.49% inflation against 1.40% doing nothing — a +1.09pp price, where the bar was +1.5pp before the asset-price units were fixed. The wealth channel was applying a LEVEL semi-elasticity as a persistent growth rate and overshooting its own sourced value by 4.6x, so every inflationary consequence of an easing was correspondingly overstated. The lesson — that inflating your way out has a visible price — is asserted hard in the test above; this records HOW visible. Re-measure at Phase 4 and decide then whether +1.09pp reads as a decision to a player, rather than adjusting the threshold to whatever the model does.

**Measured on this run:**

```
cutting rates to the floor left inflation at 1.89% against 1.38% passive
```

### 13. A-TABLE: the knife-edge is the wealth channel, and it is still there

*`test/transmission.test.js`*

PHASE 3 CLOSES THIS. Measured as the steepest local sensitivity on a 0.25pp grid, |d inflation@m60 / d policy rate|: pre-A1 as built -366.7 at 7.75% (slope ratio 138x); post-A1 as built -149.2 at 6.25% (slope ratio 80x); post-A1 with no wealth channel -22.5 at 5.50% (slope ratio 19x). Splitting the transmission lag halved the knife-edge and moved it toward the Fisher point, but did not remove it. Switching WEALTH_EFFECT off removes 85% of what is left, which is the isolating experiment: the residual bifurcation is the asset-wealth channel, and that is Section B. The target below is not a picked number — it is what the model itself does with the offending channel switched off, re-measured on every run.

### 14. QE_TO_GDP: bond buying reaches output through the yield, and how much

*`test/validation.test.js`*

FELL BELOW ITS PUBLISHED RANGE WHEN 3.1 FIXED THE ASSET-PRICE UNITS. The model delivers 0.019% of GDP per 1% of GDP purchased against a published 0.02-0.15 — just under the bottom, where it used to sit inside. QE reaches output through the long yield and then through asset prices, and the asset leg was overshooting its own sourced semi-elasticity by 4.6x, so part of what used to satisfy this range was the unit error. QE_TO_GDP is `weak` in parameters.py, with the note that the real-economy effect is genuinely contested and some argue near-zero outside market dysfunction — 0.019 is comfortably inside that judgement even though it is outside the stated band. Recorded rather than closed: raising it means raising QE_TO_YIELD or the wealth channel, and the wealth channel has just been shown to have been wrong in the other direction.

**Measured on this run:**

```
model 0.019, literature 0.02-0.15
```

### 15. RATE_TO_INFLATION: the model is about half the published estimate

*`test/validation.test.js`*

RE-MEASURED IN PHASE 4.4. THE RESPONSE IS SLOW, NOT ABSENT, AND THE PLAN EXPECTED THE WRONG THING. docs/13 4.4 says the shortfall is "partly the lag burying the response beyond the 24-month window", so the A1 transmission split should have moved it. It did not: 0.1227pp at 24 months against the 0.122 recorded before. RE-MEASURED AFTER 5.7, AND IT HALVED: 0.0413 at 12 months, 0.0797 at 24, 0.1069 at 36, 0.1271 at 48, where 4.4 measured 0.0586 / 0.1227 / 0.1756 / 0.2192 and the 48-month figure was INSIDE the published band. That is not a regression in the rate channel. 5.7 fixed a unit error in the capital law of motion, so potential output now grows at the rate it is told to rather than decaying toward 0.93%/yr — a hike used to be measured against a ceiling that was itself sagging, which flattered the disinflation. AND THE HIKE ARM IS NOT THE CUT ARM: a 1pp CUT buys 0.0996 at 12 months and 0.4182 at 48, comfortably inside 0.2-0.4. monetaryEasingScale is why they differ and the published range is estimated across both directions, so this test measures the weaker half of an asymmetry on purpose. The window is doing as much of the disagreement as the model is. What is left is the anchored Phillips slope doing exactly what docs/02 says it should: with kappa at 0.05 the demand channel barely moves prices, and real surges are supposed to come from supply shocks and unanchoring. The published range is estimated across regimes that include the unanchored 1970s. The slowness no longer lives in the RATE — that arrives in a quarter now — it lives in the investment partial adjustment and the Phillips curve. Do not raise kappa to close this.

**Measured on this run:**

```
model 0.080, literature 0.2-0.4
```

### 16. TAX_SHOCK_TO_GDP: the model is far below Romer-Romer

*`test/validation.test.js`*

KNOWN. A 1% of GDP tax rise costs 0.487% of output over 30 months against a published 2.0-3.0. (This message said ~0.33% until Phase 5 verification re-ran it; the model has been at 0.487 since 3.1 and was 0.492 before, so 0.33 was never right in this pass.) The Romer-Romer narrative multiplier is the largest in the literature and famously larger than structural models produce; the model also has a responding central bank and a crowding-out term that works in the opposite direction on a tax rise. Recorded rather than closed: reproducing 2.5 would mean roughly tripling the consumption response to disposable income, which the MPC evidence does not support.

**Measured on this run:**

```
model 0.484, literature 2-3
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
| 14 | no demand component can leave the physically possible range, ever | PASS |
| 15 | the consumption bound is recorded as a trace term the player can see | PASS |
| 16 | the asset-price bound is on the LEVEL, so a spiral cannot outrun it | PASS |
| 17 | the bubble loop has gain below one AT EVERY OPERATING POINT, not just at rest | PASS |
| 18 | the loop's balancing counterpart is the debt-service burden, and it binds | PASS |
| 19 | credit/GDP integrates the impulse — the EMA is a filter, not a guard | PASS |
| 20 | a crash causes a recession, not just a haircut | PASS |
| 21 | the demand collapse fades but the scar does not | PASS |
| 22 | spending in the first year after a crash shrinks the permanent scar | PASS |
| 23 | waiting past the window costs you the discount | PASS |
| 24 | forced selling fires in the bubble, and then stops | PASS |
| 25 | THE DOOM LOOP: banks below the floor cut lending and widen spreads | PASS |
| 26 | a crash takes a real bite out of bank capital | PASS |
| 27 | defaulted debt leaves the credit stock | PASS |
| 28 | a crash is survivable and the economy is still playable afterwards | PASS |
| 29 | RECAPITALISATION IS A QUANTITY, NOT A GESTURE | PASS |
| 30 | THE CRASH ARC: every published magnitude at once | PASS |
| 34 | the scar PHASES IN rather than landing on month one | PASS |
| 36 | WHEN CREDIT BITES BACK: the bust is deeper the bigger the boom was | PASS |
| 37 | no Math.random anywhere in src/ | PASS |
| 38 | no bare time conversion outside units.js | PASS |
| 39 | same seed produces an identical 96-tick history | PASS |
| 40 | E1: no permanent dial move diverges through an undeclared loop | PASS |
| 41 | E1 acceptance: a permanent 1pp cut reaches a finite credit gap and A/F | PASS |
| 42 | every state field is documented in 01-variables.md | PASS |
| 43 | 01-variables.md does not document fields the model no longer has | PASS |
| 44 | every dial, gauge, scenario, shock and ending is named in the docs | PASS |
| 45 | every transmitted driver has a player-facing name | PASS |
| 46 | the docs index lists every file in docs/ | PASS |
| 47 | US 2008-12: the rate dial does reach its floor and stay there | PASS |
| 49 | US 2021-23: fiscal transfers plus a supply shock do produce an inflation | PASS |
| 51 | UK 1979-83: low credibility really does make inflation more expensive | PASS |
| 53 | JAPAN: own-currency debt held at home does not reprice, and foreign-held does | PASS |
| 55 | the Taylor principle IS satisfiable — but only by jumping, never by walking | PASS |
| 56 | THE ONE FINDING UNDERNEATH ALL FOUR: the bifurcation is gone | PASS |
| 57 | every event leaves the accounting identities intact | PASS |
| 58 | every event actually changes something that survives the tick | PASS |
| 59 | no event writes a pipeline target | PASS |
| 60 | full terms with shocks on and invariants armed, across every scenario | PASS |
| 61 | A WOBBLE IN A STRETCHED SYSTEM IS A DIFFERENT EVENT (docs/12 M3) | PASS |
| 62 | no event is invisible to the player | PASS |
| 63 | a temporary rate hike produces a HUMP, not a ramp | PASS |
| 64 | the ordering of the peaks is output, then unemployment, then inflation | PASS |
| 65 | the response scales with the size of the impulse and not with its sign | PASS |
| 66 | a cut is a weaker impulse than a hike, for as long as the impulse is live | PASS |
| 68 | the spending impulse is fast and the rate impulse is slow | PASS |
| 69 | QE and the rate dial have the same SHAPE and different sizes | PASS |
| 70 | a dial move reaches the transmitted driver and converges to the dial | PASS |
| 71 | markets reprice before borrowers, and both before capital spending | PASS |
| 72 | the output response to a rate move is LAGGED, not instant | PASS |
| 73 | the pipeline refuses to schedule into a field a rule owns | PASS |
| 74 | no rule assigns to a pipeline target | PASS |
| 75 | every declared pipeline target exists on a fresh state | PASS |
| 76 | the Taylor autopilot faces the same lags the player does | PASS |
| 77 | every dial either schedules a lag or is documented as immediate | PASS |
| 78 | recession multiplier lands in the published range | PASS |
| 79 | expansion multiplier lands in the published range | PASS |
| 80 | the multiplier is larger in a slump than in a boom | PASS |
| 81 | the same spending buys more OUTPUT with slack and more PRICES without | PASS |
| 82 | holding the rate fixed makes the multiplier much larger | PASS |
| 83 | THE QE LESSON: printing into slack with a credible CB barely bites | PASS |
| 84 | printing with no slack and no credibility goes straight to prices | PASS |
| 85 | printing buys real things when there is slack to buy them with | PASS |
| 86 | AUSTERITY LEAKS: a tax rise collects less than you legislated, and worse with slack | PASS |
| 88 | every START field is read by something, or is declared idle | PASS |
| 89 | the two depreciation rates are equal, as both their notes require | PASS |
| 90 | every parameter has a value inside its range | PASS |
| 91 | every parameter has a unit, a source and a known confidence level | PASS |
| 92 | the deleted double-count has not crept back | PASS |
| 93 | kernels are normalised and peak on the documented month | PASS |
| 94 | every fitted kernel shape has a lag entry | PASS |
| 95 | START satisfies the accounting identities | PASS |
| 96 | every constant solved from the model is declared, in both directions | PASS |
| 97 | ROUND TRIP: the stance returns exactly, to nine decimal places | PASS |
| 98 | ROUND TRIP: the ECONOMY does not return, and the residue is real capital | PASS |
| 99 | HIKE-HOLD-CUT: no permanent ratchet, and the jobs cost outlasts the gain | PASS |
| 100 | STOP-GO: a symmetric-looking cycle is a persistent EASING, and it shows | PASS |
| 101 | a path and a held move are not the same thing, and the difference is measurable | PASS |
| 102 | every scenario starts internally consistent | PASS |
| 103 | the bubble scenario looks healthy on every gauge except the credit gap | PASS |
| 104 | the bubble hides for four years — the design promise | PASS |
| 106 | every scenario starts in, and stays a quarter in, its advertised regime | PASS |
| 107 | the recession scenario has the rate dial genuinely dead | PASS |
| 108 | no scenario produces absurd numbers inside a term | PASS |
| 109 | NEUTRAL ANCHORS ARE BUILT FROM NEUTRAL, in every scenario | PASS |
| 110 | debt_trap: the real economy responds to the yield at all | PASS |
| 111 | debt_trap: the benchmark central bank is no longer identical to doing nothing | PASS |
| 112 | debt_trap: THE DECISION — you cannot consolidate your way out alone | PASS |
| 114 | THE LONG YIELD IS AN AVERAGE, so it carries inflation without double-counting | PASS |
| 115 | a hike does not bite the interest bill on impact | PASS |
| 116 | CHARACTERISATION: what each preset does over a full term, unattended | PASS |
| 117 | the core macro block is stable around the steady state | PASS |
| 118 | the debt loop diverges, but slowly enough to be playable | PASS |
| 119 | a one-off demand shock decays rather than compounding | PASS |
| 120 | 200 ticks of no input and nothing drifts | PASS |
| 121 | THE LEVEL: potential grows at potential_growth, and K/Y stays put | PASS |
| 122 | credibility rises when the target is hit, and slowly | PASS |
| 123 | the credit gap does not open on its own | PASS |
| 124 | a rate cut does more for OUTPUT with slack than at capacity | PASS |
| 125 | a cut is weaker than the equivalent hike | PASS |
| 126 | a cut-then-hike round trip leaves the stance where it started | PASS |
| 127 | THE LOWER BOUND: easing stops working as the rate approaches it | PASS |
| 128 | QE still works when the rate dial has run out of room | PASS |
| 129 | unemployment rises faster than it falls | PASS |
| 130 | SWEEP: more spending never raises unemployment, at any starting gap | PASS |
| 131 | SWEEP: no step changes in the response to a rate cut | PASS |
| 132 | the ONE cliff in the model is the capacity ceiling, and it is where it says | PASS |
| 133 | L5: HIKING AT THE LOWER BOUND MUST NOT RAISE OUTPUT | PASS |
| 134 | L3: the fiscal multiplier has no step in it as the rate falls to the bound | PASS |
| 135 | investment.js reads the rate DIAL only to display it | PASS |
| 136 | A-TABLE: the disinflation response is monotone and its threshold is where Fisher puts it | PASS |
| 138 | A-TABLE: the A1 split made the response curve measurably smoother | PASS |
| 139 | the TRANSMITTED Taylor response clears unity, not just the dial one | PASS |
| 140 | the whole UI boots without throwing | PASS |
| 141 | every shell container the app needs exists | PASS |
| 142 | a gauge mounts for every indicator | PASS |
| 143 | a dial mounts for every dial | PASS |
| 144 | every gauge can open a why panel with real terms | PASS |
| 145 | every gauge has a history series to draw | PASS |
| 146 | moving a dial schedules an effect instead of applying it | PASS |
| 147 | a session runs a full term without throwing | PASS |
| 148 | restarting on the same seed keeps the previous run as a ghost | PASS |
| 149 | the game starts paused, at 1x, with play as the visible action | PASS |
| 150 | pausing does not throw away the chosen speed | PASS |
| 151 | every gauge and every dial has a plain-English definition | PASS |
| 152 | every gauge can say whether it is getting worse | PASS |
| 153 | a passive calm run reaches the end of the term and is scored | PASS |
| 154 | a losing run reaches a named ending with a lesson | PASS |
| 155 | the DEFERRED register matches the code, in both directions | PASS |
| 156 | every recorded parameter conflict is still genuinely unresolved | PASS |
| 157 | RATE_TO_OUTPUT: 1pp of policy rate, held a year | PASS |
| 158 | AUTO_STABILISER_ABSORPTION: share of an income shock that never lands | PASS |
| 159 | a tax cut RAISES output, and does it through consumption | PASS |
| 162 | CRISIS_OUTPUT_TROUGH: the realised peak-to-trough lands in the published range | PASS |
| 164 | private debt reprices over YEARS, and the burden lands late | PASS |
| 165 | the debt-service burden reads the transmitted rate, not the dial | PASS |

### `test/crisis.test.js`

> THE CRASH CHAIN. Rebuilt in docs/12: two published numbers were being used as structural inputs when they are OBSERVATIONS that already contain the model's own response, so the model reproduced that response on top of them and the crash came out 2.6x too deep.

| | test | result |
|---|---|---|
| 31 | THE CRASH ARC: the unemployment cost of a banking crisis | **OPEN** |
| 32 | THE CRASH ARC: the five-year loss against trend | **OPEN** |
| 33 | THE DECONVOLUTION CONSTANTS ARE MEASUREMENTS, and this re-measures them | **OPEN** |
| 35 | MEASURED: the model rebounds after year five and Cerra-Saxena say it should not | **OPEN** |

### `test/episodes.test.js`

> HISTORICAL EPISODES. The only tests here that can say the model is WRONG rather than merely self-consistent: they feed it the ACTUAL policy path of a real episode and check the arc. THE MODEL FAILS ALL FOUR AND FAILS THEM THE SAME WAY — read the last two entries in this section first. This is the most important block in the file.

| | test | result |
|---|---|---|
| 48 | US 2008-12: THE CRISIS IS ENTIRELY OFFSET BY THE RATE CUTS THAT FOLLOWED IT | **OPEN** |
| 50 | US 2021-23: THE DISINFLATION NEVER HAPPENS | **OPEN** |
| 52 | UK 1979-83: THE RECESSION THAT PAID FOR IT NEVER ARRIVES | **OPEN** |
| 54 | JAPAN: THE MODEL CANNOT HOLD A DEFLATION | **OPEN** |

### `test/irf.test.js`

> IMPULSE RESPONSE SHAPES. Move a dial, hold it a year, put it back, difference against an untouched baseline. This is what a published VAR IRF is, and it is the only experiment here that can produce a months-to-peak number — everything else in the project measures PERMANENT held moves, which cannot peak.

| | test | result |
|---|---|---|
| 67 | MEASURED: the labour market has no lag behind output, and here it is | **OPEN** |

### `test/multipliers.test.js`

> MULTIPLIERS, measured against published reduced forms that are NOT model terms. Where the model lands outside a range that is a finding, not a number to tune.

| | test | result |
|---|---|---|
| 87 | THE SIGN FLIP THE DOCS PROMISED: how far away is it | **OPEN** |

### `test/scenarios.test.js`

> SCENARIOS. Each must be internally consistent, survivable by SOME policy, and DRIVEN rather than asserted.

| | test | result |
|---|---|---|
| 105 | the bubble does not deflate on its own before the term ends | **OPEN** |
| 113 | debt_trap: and the inflation price of escaping is visibly large | **OPEN** |

### `test/transmission.test.js`

> THE CONDITIONALS THE GAME EXISTS TO TEACH. Statements about how a response CHANGES with the state, so each needs two measurements or a sweep. Six of these ran backwards before the docs/07 audit and every one passed the suite of the day.

| | test | result |
|---|---|---|
| 137 | A-TABLE: the knife-edge is the wealth channel, and it is still there | **OPEN** |

### `test/validation.test.js`

> EVERY PUBLISHED VALIDATION TARGET is either asserted here or recorded as a todo with its measured value. Also checks that the DEFERRED register of deliberately unread parameters matches the code in BOTH directions.

| | test | result |
|---|---|---|
| 160 | QE_TO_GDP: bond buying reaches output through the yield, and how much | **OPEN** |
| 161 | RATE_TO_INFLATION: the model is about half the published estimate | **OPEN** |
| 163 | TAX_SHOCK_TO_GDP: the model is far below Romer-Romer | **OPEN** |

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
    1 |  +0.00 |  +0.00 |  -0.00 |  +0.00 |  +0.00 |  -0.00 |  +0.05 |  +0.00 |  +0.00 | +0.000
    3 |  +0.03 |  +0.01 |  -0.01 |  +0.03 |  +0.01 |  -0.00 |  +0.21 |  +0.01 |  +0.01 | +0.000
    6 |  +0.13 |  +0.03 |  -0.03 |  +0.09 |  +0.03 |  -0.02 |  +0.52 |  +0.06 |  +0.06 | +0.000
   12 |  +0.31 |  +0.10 |  -0.10 |  +0.20 |  +0.08 |  -0.13 |  +1.23 |  +0.29 |  +0.31 | +0.000
   24 |  +0.57 |  +0.22 |  -0.20 |  +0.30 |  +0.19 |  -0.58 |  +2.72 |  +1.00 |  +0.58 | +0.000
   48 |  +1.03 |  +0.42 |  -0.32 |  +0.40 |  +0.40 |  -2.20 |  +5.42 |  +2.78 |  +0.58 | +0.000

-- policy_rate  +1.00pp (a hike)
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  -0.00 |  -0.00 |  +0.00 |  -0.00 |  +0.00 |  +0.00 |  -0.05 |  -0.00 |  -0.00 | +0.000
    3 |  -0.05 |  -0.00 |  +0.01 |  -0.04 |  -0.01 |  +0.00 |  -0.20 |  -0.01 |  -0.01 | +0.000
    6 |  -0.18 |  -0.02 |  +0.06 |  -0.14 |  -0.03 |  +0.03 |  -0.46 |  -0.06 |  -0.10 | +0.000
   12 |  -0.42 |  -0.04 |  +0.15 |  -0.30 |  -0.08 |  +0.13 |  -0.93 |  -0.30 |  -0.47 | +0.000
   24 |  -0.72 |  -0.08 |  +0.25 |  -0.43 |  -0.18 |  +0.55 |  -1.73 |  -1.00 |  -0.92 | +0.000
   48 |  -1.15 |  -0.13 |  +0.34 |  -0.54 |  -0.33 |  +1.88 |  -2.88 |  -2.61 |  -1.00 | +0.000

-- tax_rate     −1.00pp (a cut)
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  +0.01 |  +0.00 |  +0.00 |  +0.02 | +0.000
    3 |  +0.04 |  +0.01 |  -0.01 |  -0.00 |  +0.04 |  +0.05 |  +0.00 |  +0.00 |  +0.18 | +0.000
    6 |  +0.14 |  +0.04 |  -0.04 |  -0.01 |  +0.15 |  +0.20 |  +0.00 |  +0.00 |  +0.88 | +0.000
   12 |  +0.28 |  +0.10 |  -0.10 |  -0.07 |  +0.33 |  +0.57 |  +0.01 |  +0.01 |  +2.69 | +0.000
   24 |  +0.39 |  +0.18 |  -0.15 |  -0.19 |  +0.56 |  +1.24 |  +0.07 |  +0.06 |  +2.09 | +0.000
   48 |  +0.56 |  +0.31 |  -0.23 |  -0.23 |  +0.80 |  +2.27 |  +0.32 |  +0.23 |  +0.49 | +0.000

-- tax_rate     +1.00pp (a rise)
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  -0.01 |  +0.00 |  +0.00 |  -0.02 | +0.000
    3 |  -0.04 |  -0.00 |  +0.01 |  +0.00 |  -0.04 |  -0.05 |  -0.00 |  -0.00 |  -0.18 | +0.000
    6 |  -0.14 |  -0.01 |  +0.05 |  +0.01 |  -0.15 |  -0.20 |  -0.00 |  -0.00 |  -0.89 | +0.000
   12 |  -0.29 |  -0.03 |  +0.11 |  +0.06 |  -0.33 |  -0.59 |  -0.00 |  -0.02 |  -2.72 | +0.000
   24 |  -0.45 |  -0.06 |  +0.18 |  +0.13 |  -0.57 |  -1.34 |  -0.02 |  -0.07 |  -2.30 | +0.000
   48 |  -0.75 |  -0.10 |  +0.29 |  +0.09 |  -0.81 |  -2.53 |  -0.07 |  -0.26 |  -0.94 | +0.000

-- govt_spending +1.00pp
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +1.05 |  +0.16 |  -0.15 |  +0.00 |  +0.00 |  +0.05 |  +0.00 |  +0.00 |  +0.01 | +0.000
    3 |  +1.23 |  +0.30 |  -0.32 |  +0.03 |  +0.14 |  +0.11 |  +0.01 |  +0.02 |  +0.74 | +0.000
    6 |  +1.29 |  +0.41 |  -0.42 |  +0.05 |  +0.17 |  +0.12 |  +0.03 |  +0.05 |  +1.45 | +0.000
   12 |  +1.36 |  +0.54 |  -0.47 |  +0.03 |  +0.24 |  +0.05 |  +0.15 |  +0.15 |  +2.18 | +0.000
   24 |  +1.45 |  +0.67 |  -0.49 |  -0.01 |  +0.35 |  -0.25 |  +0.55 |  +0.42 |  +0.74 | +0.000
   48 |  +1.67 |  +0.81 |  -0.53 |  +0.00 |  +0.50 |  -1.15 |  +1.54 |  +1.12 |  +0.32 | +0.000

-- govt_spending −1.00pp
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  -1.05 |  -0.08 |  +0.23 |  +0.00 |  +0.00 |  -0.06 |  -0.00 |  -0.01 |  -0.04 | +0.000
    3 |  -1.23 |  -0.11 |  +0.40 |  -0.04 |  -0.13 |  -0.13 |  -0.00 |  -0.02 |  -0.79 | +0.000
    6 |  -1.32 |  -0.13 |  +0.46 |  -0.08 |  -0.17 |  -0.20 |  -0.01 |  -0.06 |  -1.58 | +0.000
   12 |  -1.48 |  -0.17 |  +0.50 |  -0.14 |  -0.25 |  -0.27 |  -0.03 |  -0.15 |  -2.59 | +0.000
   24 |  -1.74 |  -0.22 |  +0.55 |  -0.20 |  -0.38 |  -0.29 |  -0.10 |  -0.36 |  -1.72 | +0.000
   48 |  -2.18 |  -0.28 |  +0.62 |  -0.32 |  -0.56 |  -0.00 |  -0.26 |  -0.85 |  -1.51 | +0.000

-- money_printed  2.00pp
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +2.09 |  +0.28 |  -0.24 |  +0.00 |  +0.00 |  -0.05 |  +0.00 |  +0.01 |  +0.01 | -0.003
    3 |  +2.50 |  +0.53 |  -0.53 |  +0.09 |  +0.28 |  -0.26 |  +0.01 |  +0.03 |  +1.49 | -0.009
    6 |  +2.73 |  +0.74 |  -0.69 |  +0.21 |  +0.37 |  -0.69 |  +0.06 |  +0.09 |  +3.04 | -0.018
   12 |  +3.19 |  +1.02 |  -0.77 |  +0.40 |  +0.58 |  -1.78 |  +0.28 |  +0.25 |  +5.01 | -0.035
   24 |  +3.97 |  +1.42 |  -0.81 |  +0.63 |  +0.97 |  -4.46 |  +1.12 |  +0.76 |  +2.77 | -0.067
   48 |  +4.75 |  +2.01 |  -0.87 |  +0.91 |  +1.49 | -11.03 |  +3.68 |  +2.21 |  +0.32 | -0.127

-- qe            10.0pp
   (starting output gap +0.00%)
   mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
   --------------------------------------------------------------------------------------------
    1 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  -0.00 |  +0.00 |  +0.00 |  +0.00 | +0.000
    3 |  +0.01 |  +0.00 |  -0.00 |  +0.01 |  +0.00 |  -0.00 |  +0.02 |  +0.00 |  +0.00 | +0.000
    6 |  +0.04 |  +0.01 |  -0.01 |  +0.03 |  +0.01 |  -0.01 |  +0.11 |  +0.02 |  +0.02 | +0.000
   12 |  +0.10 |  +0.03 |  -0.03 |  +0.07 |  +0.02 |  -0.05 |  +0.35 |  +0.09 |  +0.09 | +0.000
   24 |  +0.19 |  +0.08 |  -0.07 |  +0.10 |  +0.06 |  -0.23 |  +0.87 |  +0.33 |  +0.19 | +0.000
   48 |  +0.35 |  +0.15 |  -0.12 |  +0.14 |  +0.13 |  -0.94 |  +1.81 |  +0.94 |  +0.20 | +0.000

==============================================================================
THE SAME MOVE, FROM DIFFERENT STARTING STATES (24 months on)
==============================================================================

-- rate −1pp
   start gap | Δoutput | Δinflat | Δunemp | share of the move that is OUTPUT
   ------------------------------------------------------------------------
       -8.10 |   +0.76 |   +0.08 |  -0.13 |     0.91
       -6.06 |   +0.76 |   +0.07 |  -0.13 |     0.91
       -3.98 |   +0.69 |   +0.07 |  -0.11 |     0.91
       -1.90 |   +0.62 |   +0.06 |  -0.11 |     0.91
       +0.00 |   +0.57 |   +0.22 |  -0.20 |     0.72
       +1.98 |   +0.61 |   +0.12 |  -0.06 |     0.83
       +4.08 |   +0.04 |   +0.11 |  -0.06 |     0.29
       +5.27 |   +0.04 |   +0.21 |  -0.07 |     0.17

-- spend +1pp
   start gap | Δoutput | Δinflat | Δunemp | share of the move that is OUTPUT
   ------------------------------------------------------------------------
       -8.10 |   +1.97 |   +0.23 |  -0.36 |     0.90
       -6.06 |   +1.97 |   +0.23 |  -0.36 |     0.90
       -3.98 |   +2.05 |   +0.22 |  -0.15 |     0.90
       -1.90 |   +1.59 |   +0.20 |  -0.40 |     0.89
       +0.00 |   +1.45 |   +0.67 |  -0.49 |     0.68
       +1.98 |   +1.56 |   +0.33 |  -0.11 |     0.82
       +4.08 |   -0.01 |   +0.36 |  -0.15 |    -0.02
       +5.27 |   -0.00 |   +1.04 |  -0.16 |    -0.00

-- print 2pp
   start gap | Δoutput | Δinflat | Δunemp | share of the move that is OUTPUT
   ------------------------------------------------------------------------
       -8.10 |   +3.97 |   +0.34 |  -0.72 |     0.92
       -6.06 |   +4.01 |   +0.38 |  -0.58 |     0.91
       -3.98 |   +4.04 |   +0.42 |  -0.55 |     0.91
       -1.90 |   +3.85 |   +0.93 |  -1.15 |     0.81
       +0.00 |   +3.97 |   +1.42 |  -0.81 |     0.74
       +1.98 |   +1.90 |   +0.99 |  -0.34 |     0.66
       +4.08 |   +0.07 |   +1.79 |  -0.41 |     0.04
       +5.27 |   +0.09 |  +12.29 |  -0.51 |     0.01

-- tax −1pp
   start gap | Δoutput | Δinflat | Δunemp | share of the move that is OUTPUT
   ------------------------------------------------------------------------
       -8.10 |   +0.75 |   +0.08 |  -0.14 |     0.91
       -6.06 |   +0.77 |   +0.08 |  -0.14 |     0.91
       -3.98 |   +0.79 |   +0.08 |  -0.11 |     0.91
       -1.90 |   +0.71 |   +0.08 |  -0.14 |     0.90
       +0.00 |   +0.39 |   +0.18 |  -0.15 |     0.68
       +1.98 |   +0.43 |   +0.11 |  -0.06 |     0.80
       +4.08 |   -0.02 |   +0.09 |  -0.05 |    -0.31
       +5.27 |   -0.02 |   +0.19 |  -0.05 |    -0.13

==============================================================================
WHAT EACH PRESET DOES ON ITS OWN — no player input, no shocks
==============================================================================

calm — you touch nothing
    1m GOLDI gap+0.0 pi2.0 u5.0 d100 a64 cg+0.0
    6m GOLDI gap+0.0 pi2.0 u5.0 d100 a63 cg+0.0
   12m GOLDI gap+0.0 pi2.0 u5.0 d100 a61 cg+0.0
   24m GOLDI gap+0.0 pi2.0 u5.0 d100 a64 cg+0.0
   48m GOLDI gap+0.0 pi2.0 u5.0 d100 a65 cg+0.0
   96m GOLDI gap+0.0 pi2.0 u5.0 d100 a65 cg+0.0

calm — Taylor-rule central bank
    1m GOLDI gap+0.0 pi2.0 u5.0 d100 a64 cg+0.0
    6m GOLDI gap+0.0 pi2.0 u5.0 d100 a63 cg+0.0
   12m GOLDI gap+0.0 pi2.0 u5.0 d100 a61 cg+0.0
   24m GOLDI gap+0.0 pi2.0 u5.0 d100 a64 cg+0.0
   48m GOLDI gap+0.0 pi2.0 u5.0 d100 a65 cg+0.0
   96m GOLDI gap+0.0 pi2.0 u5.0 d100 a65 cg+0.0

overheating — you touch nothing
    1m OVERH gap+0.2 pi5.4 u4.4 d100 a64 cg+0.0
    6m OVERH gap+0.8 pi4.9 u4.7 d98 a61 cg+0.6
   12m OVERH gap+1.3 pi5.1 u4.6 d95 a60 cg+1.6
   24m OVERH gap+2.2 pi6.7 u4.3 d90 a63 cg+4.0
   48m OVERH gap+8.0 pi29.5 u3.6 d67 a52 cg+16.2
   96m OVERH gap+54.6 pi380.5 u1.5 d0 a0 cg+96.5
   ENDED: hyperinflation

overheating — Taylor-rule central bank
    1m OVERH gap+0.2 pi5.4 u4.4 d100 a64 cg+0.0
    6m OVERH gap+0.5 pi4.8 u4.8 d98 a61 cg+0.4
   12m OVERH gap+0.2 pi4.3 u4.9 d96 a60 cg+0.7
   24m OVERH gap-0.5 pi3.4 u5.2 d93 a61 cg-0.3
   48m GOLDI gap-0.6 pi2.4 u5.2 d92 a63 cg-3.0
   96m GOLDI gap-0.2 pi2.0 u5.1 d92 a65 cg-4.9

recession — you touch nothing
    1m RECES gap-8.9 pi0.2 u7.3 d100 a64 cg-0.1
    6m RECES gap-9.9 pi0.2 u7.0 d102 a61 cg-0.3
   12m RECES gap-8.9 pi0.4 u6.8 d105 a59 cg-0.7
   24m RECES gap-6.5 pi0.7 u6.4 d110 a64 cg-1.3
   48m GOLDI gap-2.3 pi1.4 u5.7 d115 a68 cg-1.3
   96m GOLDI gap+2.4 pi2.9 u4.3 d116 a67 cg+2.3

recession — Taylor-rule central bank
    1m RECES gap-8.9 pi0.2 u7.3 d100 a64 cg-0.1
    6m RECES gap-9.9 pi0.2 u7.0 d102 a61 cg-0.3
   12m RECES gap-8.9 pi0.4 u6.8 d105 a59 cg-0.5
   24m RECES gap-6.5 pi0.7 u6.4 d110 a64 cg-0.6
   48m GOLDI gap-2.3 pi1.4 u5.7 d115 a68 cg+0.4
   96m GOLDI gap+1.0 pi2.5 u4.6 d117 a66 cg-0.4

stagflation — you touch nothing
    1m STAGF gap-3.5 pi12.4 u8.2 d100 a43 cg-0.0
    6m OVERH gap-2.5 pi16.6 u7.4 d97 a37 cg+0.7
   12m OVERH gap+0.3 pi21.2 u6.7 d91 a31 cg+3.2
   24m OVERH gap+6.8 pi30.9 u5.3 d75 a41 cg+13.3
   ENDED: hyperinflation

stagflation — Taylor-rule central bank
    1m STAGF gap-3.5 pi12.4 u8.2 d100 a43 cg-0.0
    6m OVERH gap-2.9 pi16.5 u7.4 d97 a37 cg+0.5
   12m OVERH gap-2.0 pi19.9 u7.2 d92 a32 cg+1.4
   24m OVERH gap-3.4 pi18.5 u7.3 d84 a35 cg-0.4
   48m STAGF gap-5.4 pi7.9 u7.6 d87 a32 cg-16.9
   96m OVERH gap-1.3 pi3.2 u7.0 d120 a45 cg-30.6

debt_trap — you touch nothing
    1m GOLDI gap+0.0 pi2.0 u5.0 d140 a65 cg+0.0
    6m GOLDI gap-0.6 pi1.9 u5.2 d143 a63 cg-0.3
   12m GOLDI gap-1.1 pi1.9 u5.4 d146 a62 cg-1.0
   24m GOLDI gap-1.8 pi1.8 u5.6 d154 a62 cg-3.2
   48m GOLDI gap-3.0 pi1.6 u5.8 d174 a62 cg-8.5
   96m RECES gap-7.2 pi1.1 u6.4 d245 a59 cg-22.7
   ENDED: debt_crisis

debt_trap — Taylor-rule central bank
    1m GOLDI gap+0.0 pi2.0 u5.0 d140 a65 cg+0.0
    6m GOLDI gap-0.6 pi1.9 u5.2 d143 a63 cg-0.3
   12m GOLDI gap-1.0 pi1.9 u5.4 d146 a62 cg-1.0
   24m GOLDI gap-1.5 pi1.8 u5.5 d154 a63 cg-2.9
   48m GOLDI gap-2.0 pi1.7 u5.7 d172 a63 cg-6.9
   96m GOLDI gap-4.3 pi1.4 u5.9 d234 a61 cg-16.8
   ENDED: debt_crisis

bubble — you touch nothing
    1m GOLDI gap+1.3 pi2.5 u4.4 d100 a72 cg+6.0
    6m GOLDI gap+1.4 pi2.5 u4.5 d98 a70 cg+6.3
   12m GOLDI gap+1.3 pi2.6 u4.5 d95 a68 cg+7.2
   24m GOLDI gap+1.0 pi2.6 u4.6 d90 a70 cg+9.2
   48m GOLDI gap+0.1 pi2.2 u5.0 d82 a71 cg+11.7
   96m GOLDI gap-3.9 pi1.5 u5.8 d74 a69 cg+7.1

bubble — Taylor-rule central bank
    1m GOLDI gap+1.3 pi2.5 u4.4 d100 a72 cg+6.0
    6m GOLDI gap+1.3 pi2.5 u4.5 d98 a70 cg+6.3
   12m GOLDI gap+0.9 pi2.5 u4.6 d95 a68 cg+6.9
   24m GOLDI gap-0.1 pi2.2 u5.0 d91 a69 cg+7.5
   48m GOLDI gap-1.4 pi1.9 u5.5 d85 a70 cg+6.9
   96m GOLDI gap-3.7 pi1.5 u5.8 d80 a70 cg+3.7

==============================================================================
WHAT HAPPENS WITH NO DECISION FROM YOU — the automatic machinery
==============================================================================

-- a −5pp spending cut, and what the stabilisers do about it
   mo | Δoutput | Δmktinc | Δtaxrev | Δtransf | Δdispos | Δdeficit | Δstruct | absorbed
   ----------------------------------------------------------------------------------------
    1 |   -5.24 |   -5.00 |   -0.54 |   +0.36 |   -4.10 |   -4.10 |   -5.00 |     0.18
    3 |   -6.36 |   -6.06 |   -1.30 |   +0.66 |   -4.10 |   -3.06 |   -5.00 |     0.32
    6 |   -7.03 |   -6.66 |   -1.86 |   +0.78 |   -4.02 |   -2.40 |   -5.00 |     0.40
   12 |   -8.17 |   -7.64 |   -2.34 |   +0.90 |   -4.39 |   -1.83 |   -5.00 |     0.42
   24 |   -9.92 |   -9.02 |   -2.84 |   +1.07 |   -5.11 |   -1.22 |   -5.00 |     0.43

==============================================================================
SHOCKS — what each one does, measured, from a settled calm economy
==============================================================================

Oil price spike  (calm baseline, 12%/yr)
    1m out+0.0 pi+2.4 u+0.0 appr-4    6m out-0.3 pi+1.7 u+0.1 appr-6   12m out-0.2 pi+1.1 u+0.1 appr-5   24m out-0.0 pi+0.5 u+0.0 appr+1   48m out+0.1 pi+0.1 u-0.0 appr+0

Productivity boom  (calm baseline, 10%/yr)
    1m out+1.6 pi+0.0 u+0.0 appr+3    6m out+1.6 pi+0.0 u+0.0 appr+4   12m out+1.6 pi+0.0 u+0.0 appr+5   24m out+1.7 pi+0.0 u+0.0 appr+2   48m out+1.8 pi+0.0 u+0.0 appr+0

Bank wobble  (bubble baseline, 15%/yr)
    1m out-0.1 pi-0.0 u+0.0 appr-5    6m out-0.4 pi-0.1 u+0.1 appr-4   12m out-0.4 pi-0.1 u+0.2 appr-2   24m out-0.5 pi-0.1 u+0.1 appr-1   48m out-0.5 pi-0.0 u-0.0 appr-0

FINANCIAL CRISIS  (bubble baseline, crisis_prob)
    1m out-6.4 pi-0.6 u+0.8 appr-14    6m out-9.0 pi-0.9 u+1.6 appr-18   12m out-10.5 pi-1.1 u+1.8 appr-23   24m out-10.4 pi-1.1 u+1.4 appr-11   48m out-7.5 pi-0.6 u+0.7 appr+0

Export slump  (calm baseline, 12%/yr)
    1m out-1.2 pi-0.1 u+0.3 appr-4    6m out-1.1 pi-0.1 u+0.4 appr-4   12m out-0.9 pi-0.1 u+0.3 appr-3   24m out-0.6 pi-0.1 u+0.2 appr-1   48m out-0.3 pi-0.0 u+0.1 appr-0

==============================================================================
HOW LONG EACH LEVER TAKES — share of the 48-month response delivered by month N
==============================================================================
   lever                |    1    3    6    9   12   18   24   36   48
   ------------------------------------------------------------------
   policy_rate −1pp     | 0.00 0.03 0.12 0.22 0.30 0.43 0.56 0.78 1.00
   tax_rate −1pp        | 0.00 0.07 0.25 0.40 0.50 0.61 0.69 0.85 1.00
   govt_spending +1pp   | 0.63 0.74 0.77 0.80 0.81 0.84 0.87 0.93 1.00
   money_printed 2pp    | 0.44 0.53 0.58 0.62 0.67 0.76 0.84 0.96 1.00
   qe 10pp              | 0.00 0.02 0.10 0.20 0.28 0.42 0.55 0.78 1.00

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
#   months the Taylor rule was refused its own request, of 96: calm 0, overheating 0, recession 36, stagflation 0, debt_trap 0, bubble 0
#   stagflation under the Taylor rule: ceiling 50 -> 7.89% @m48, 3.16% @m96 (refused 0/96); ceiling 20 -> 19.25% @m48, 2.26e+1% @m96 (refused 86/96)
#   by ceiling, inflation @m96: 8:619.9 12:532.3 16:379.6 20:22.6
# Subtest: the rate the autopilot achieves stays in the dial's range and reaches both ends
ok 1 - the rate the autopilot achieves stays in the dial's range and reaches both ends
  ---
  duration_ms: 7.621064
  ...
# Subtest: the autopilot enforces no bounds of its own — the dial is the only one
ok 2 - the autopilot enforces no bounds of its own — the dial is the only one
  ---
  duration_ms: 0.444952
  ...
# Subtest: a dial request the bounds refuse is reported, not swallowed
ok 3 - a dial request the bounds refuse is reported, not swallowed
  ---
  duration_ms: 0.293903
  ...
# Subtest: the truncation count makes a saturated benchmark visible in one number
ok 4 - the truncation count makes a saturated benchmark visible in one number
  ---
  duration_ms: 78.489047
  ...
# Subtest: the Taylor rule wins stagflation at the derived ceiling and loses at 20
ok 5 - the Taylor rule wins stagflation at the derived ceiling and loses at 20
  ---
  duration_ms: 28.293988
  ...
# Subtest: a truncation reaches the trace whether the player or the autopilot caused it
ok 6 - a truncation reaches the trace whether the player or the autopilot caused it
  ---
  duration_ms: 1.365075
  ...
# Subtest: index.html has been built
ok 7 - index.html has been built
  ---
  duration_ms: 0.696348
  ...
# Subtest: the bundled page executes without throwing
ok 8 - the bundled page executes without throwing
  ---
  duration_ms: 15.865193
  ...
# Subtest: no import or export keyword survived into the bundle
ok 9 - no import or export keyword survived into the bundle
  ---
  duration_ms: 4.101583
  ...
# Subtest: the page is self-contained — no external requests
ok 10 - the page is self-contained — no external requests
  ---
  duration_ms: 3.744838
  ...
#   worst case over 240 months, all six scenarios: consumption 95.0 (overheating), investment 45.0 (overheating), govt_purchases 22.0 (calm)
#   worst asset/fundamental over 240 months, all six scenarios: 10.00 (overheating)
# Subtest: invariants hold across 200 quiet ticks
ok 11 - invariants hold across 200 quiet ticks
  ---
  duration_ms: 28.270617
  ...
# Subtest: invariants hold under a violent policy path
ok 12 - invariants hold under a violent policy path
  ---
  duration_ms: 7.384294
  ...
# Subtest: checkInvariants actually catches a broken book
ok 13 - checkInvariants actually catches a broken book
  ---
  duration_ms: 0.645969
  ...
# Subtest: no demand component can leave the physically possible range, ever
ok 14 - no demand component can leave the physically possible range, ever
  ---
  duration_ms: 112.521205
  ...
# Subtest: the consumption bound is recorded as a trace term the player can see
ok 15 - the consumption bound is recorded as a trace term the player can see
  ---
  duration_ms: 14.865926
  ...
# Subtest: the asset-price bound is on the LEVEL, so a spiral cannot outrun it
ok 16 - the asset-price bound is on the LEVEL, so a spiral cannot outrun it
  ---
  duration_ms: 78.773576
  ...
#   loop gain (96-month amplification of a credit_impulse shock):
#     steady state   excess credit growth   0.000  ->  gain 7.756e-3
#     1pp cut, 24m   excess credit growth   0.473  ->  gain 9.688e-3
#     1pp cut, 96m   excess credit growth   0.825  ->  gain 9.098e-3
#     2pp cut, 96m   excess credit growth   1.616  ->  gain 7.499e-3
#   2pp cut held 60 years: credit/GDP 281.6%, spread 2.17pp, default rate 1.05%, debt service 1.25x its baseline
#   permanent 1pp cut: credit/GDP 150.0 -> 159.7 (m96) -> 185.5 (m240) -> 223.0 (m480), impulse still 0.640
# Subtest: the bubble loop has gain below one AT EVERY OPERATING POINT, not just at rest
ok 17 - the bubble loop has gain below one AT EVERY OPERATING POINT, not just at rest
  ---
  duration_ms: 80.229898
  ...
# Subtest: the loop's balancing counterpart is the debt-service burden, and it binds
ok 18 - the loop's balancing counterpart is the debt-service burden, and it binds
  ---
  duration_ms: 24.388223
  ...
# Subtest: credit/GDP integrates the impulse — the EMA is a filter, not a guard
ok 19 - credit/GDP integrates the impulse — the EMA is a filter, not a guard
  ---
  duration_ms: 15.852243
  ...
# Subtest: a crash causes a recession, not just a haircut
ok 20 - a crash causes a recession, not just a haircut
  ---
  duration_ms: 21.008136
  ...
# Subtest: the demand collapse fades but the scar does not
ok 21 - the demand collapse fades but the scar does not
  ---
  duration_ms: 45.499052
  ...
# Subtest: spending in the first year after a crash shrinks the permanent scar
ok 22 - spending in the first year after a crash shrinks the permanent scar
  ---
  duration_ms: 28.821201
  ...
# Subtest: waiting past the window costs you the discount
ok 23 - waiting past the window costs you the discount
  ---
  duration_ms: 26.779674
  ...
# Subtest: forced selling fires in the bubble, and then stops
ok 24 - forced selling fires in the bubble, and then stops
  ---
  duration_ms: 8.657592
  ...
# Subtest: THE DOOM LOOP: banks below the floor cut lending and widen spreads
ok 25 - THE DOOM LOOP: banks below the floor cut lending and widen spreads
  ---
  duration_ms: 3.56957
  ...
# Subtest: a crash takes a real bite out of bank capital
ok 26 - a crash takes a real bite out of bank capital
  ---
  duration_ms: 12.136698
  ...
# Subtest: defaulted debt leaves the credit stock
ok 27 - defaulted debt leaves the credit stock
  ---
  duration_ms: 6.711653
  ...
# Subtest: a crash is survivable and the economy is still playable afterwards
ok 28 - a crash is survivable and the economy is still playable afterwards
  ---
  duration_ms: 12.850292
  ...
# Subtest: RECAPITALISATION IS A QUANTITY, NOT A GESTURE
ok 29 - RECAPITALISATION IS A QUANTITY, NOT A GESTURE
  ---
  duration_ms: 32.215095
  ...
# Subtest: THE CRASH ARC: every published magnitude at once
ok 30 - THE CRASH ARC: every published magnitude at once
  ---
  duration_ms: 15.857676
  ...
# Subtest: THE CRASH ARC: the unemployment cost of a banking crisis
not ok 31 - THE CRASH ARC: the unemployment cost of a banking crisis # TODO STILL SHORT AFTER 4.1 RE-SOLVED THE IMPULSE CONSTANT. Unemployment peaks +1.91pp against a published 2-5 for a banking crisis, having been +1.93 before the re-solve and inside the band before Phase 2. Note the trough itself is now EXACTLY on target at -9.000% — so the output hole is the right depth and the labour market does not follow it down. That is Okun, and it is the same demand-block finding recorded on the five-year loss below. The four other magnitudes in the crash arc — peak-to-trough, the month of the trough, the five-year loss against trend and the absence of a rebound — all still hold, which is why this is one assertion rather than the whole test. CRISIS_IMPULSE_AMPLIFICATION and CRISIS_SCAR_AMPLIFICATION are solved FROM this model to make the realised trough equal CRISIS_OUTPUT_TROUGH, so they absorb exactly this kind of change and Phase 4.1 re-solves them after Phases 2 and 3. Re-solving them before the demand block has stopped moving would mean doing it twice and believing the first answer. Note the shortfall is 0.09pp: this is a band edge, not a collapse.
  ---
  duration_ms: 14.531915
  location: '/home/ztchr/personal_projects/Crash/test/crisis.test.js:264:1'
  failureType: 'testCodeFailure'
  error: 'unemployment peaked +1.91pp; a banking crisis costs 2-5'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/crisis.test.js:283:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: THE CRASH ARC: the five-year loss against trend
not ok 32 - THE CRASH ARC: the five-year loss against trend # TODO PHASE 4.1 RAN, AND THIS IS WHAT IT FOUND. Output is -6.60% below trend at five years against CRISIS_HYSTERESIS_SCAR = 10, after CRISIS_IMPULSE_AMPLIFICATION was re-solved to 2.0461 (2.59 in the third audit, 2.1855 in 4.1, and again in 5.7 when the capital-units fix moved the trend this is measured against). It CANNOT be closed by re-solving CRISIS_SCAR_AMPLIFICATION: that lands at 1.06-1.26, outside its published [2.0, 4.5], and would make the exogenous capacity cut supply 7.9-9.5 of the 10 while the model supplies almost nothing — destroying the deconvolution the constant exists to be. Measured with no exogenous scar at all, the model used to produce 8.4% of the loss endogenously and now produces 3.82%. THE MODEL NO LONGER PROPAGATES A CRISIS; IT GETS HIT AND RECOVERS. That is a demand-block finding, it is the same one as the UK sacrifice ratio and TAX_SHOCK_TO_GDP, and it is not a calibration problem. Do not nudge either constant to move it — 4.2 records what they are. THE SECOND ASSERTION HERE IS OPEN \#1, AND IT MOVED THE OPPOSITE WAY TO THE PLAN'S HYPOTHESIS. docs/13 4.4 expects the too-fast rebound to be downstream of Section B, so fixing B should have slowed it. Measured, it sped up: output is back to -5.16% of trend by month 96 against a required -5. That is not a new defect — it is the same shallower crisis, since a crash that digs a 5.97% hole instead of a 10% one has less to climb out of. Both numbers should move together when the constant is re-solved, and if they do not, OPEN \#1 is a real finding about the demand block rather than a calibration artefact.
  ---
  duration_ms: 12.869701
  location: '/home/ztchr/personal_projects/Crash/test/crisis.test.js:287:1'
  failureType: 'testCodeFailure'
  error: 'output is -6.60% below trend at five years, against CRISIS_HYSTERESIS_SCAR = 10'
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
# Subtest: THE DECONVOLUTION CONSTANTS ARE MEASUREMENTS, and this re-measures them
not ok 33 - THE DECONVOLUTION CONSTANTS ARE MEASUREMENTS, and this re-measures them # TODO HALF RE-SOLVED IN 4.1, AND THE HALF THAT WOULD NOT SOLVE IS THE FINDING. CRISIS_IMPULSE_AMPLIFICATION was re-solved 2.59 -> 2.1855 in 4.1 and 2.1855 -> 2.0461 in 5.7, and it reconciles: the realised trough is -9.000% against CRISIS_OUTPUT_TROUGH exactly, at month 12. CRISIS_SCAR_AMPLIFICATION was left at 3.14 on purpose. Re-solved against Cerra & Saxena it lands at 1.06-1.26, outside its published [2.0, 4.5], which would make the exogenous capacity cut 7.9 to 9.5 of the 10 and leave the model supplying almost nothing. THE POINT OF THIS CONSTANT IS A DECONVOLUTION — the model generates most of the observed loss endogenously and the exogenous cut is only the remainder — and forcing it there would load the missing propagation onto an exogenous constant, which is rule 4 and is the defect the deconvolution was built to remove. MEASURED, with CRISIS_HYSTERESIS_SCAR set to 0 so there is no exogenous scar at all: the model used to produce 8.4% of the 10 by itself and now produces 3.82% (this message said 3.22% until Phase 5 verification re-ran it, when both were 3.65 and had disagreed for four commits; 5.7 moved them together to 3.82). That is a demand-block finding and the fourth independent sighting of it, alongside the UK sacrifice ratio, TAX_SHOCK_TO_GDP and the missing austerity paradox. Re-solve when the demand block has been addressed.
  ---
  duration_ms: 8.467232
  location: '/home/ztchr/personal_projects/Crash/test/crisis.test.js:322:1'
  failureType: 'testCodeFailure'
  error: 'the model now turns a 3.27pp exogenous capacity cut into a 6.60% loss against trend (2.30x), but CRISIS_SCAR_AMPLIFICATION says 3.14'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/crisis.test.js:356:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: the scar PHASES IN rather than landing on month one
ok 34 - the scar PHASES IN rather than landing on month one
  ---
  duration_ms: 3.450515
  ...
# Subtest: MEASURED: the model rebounds after year five and Cerra-Saxena say it should not
not ok 35 - MEASURED: the model rebounds after year five and Cerra-Saxena say it should not # TODO RE-MEASURED IN PHASE 4.4, AND THE PLAN'S HYPOTHESIS FOR IT IS WRONG. docs/13 expected this to be downstream of Section B — "the 10-year recovery coincides with the credit/asset loop re-inflating" — so fixing B should have slowed it. THE CREDIT GAP IS NEGATIVE THROUGHOUT THE RECOVERY once the boom has unwound: +5.71 at m24, -0.79 at m60, -3.83 at m96, -4.61 at m120. It is a depressed credit stock closing on its trend from BELOW, not a new boom. Output against the pre-crisis trend now reads -10.00 (m12), -10.39 (m24), -6.60 (m60), -5.16 (m96), -4.51 (m120), troughing at -10.40 in month 22 and recovering 5.89pp. THE ISOLATING EXPERIMENT: switch OFF both the collateral channel and the wealth effect and the crisis is shallower (trough -6.43) but 2.49pp of it still comes back — 39% of the trough recovered with both amplifiers gone. So the rebound is not Section B at all. It is the demand block closing an output gap faster than the data says it should, which is the same finding as the UK 1979-83 sacrifice ratio, TAX_SHOCK_TO_GDP, the missing austerity paradox and the crisis propagation that would not re-solve in 4.1. One finding, five sightings. See open_items.md A2.
  ---
  duration_ms: 10.133227
  location: '/home/ztchr/personal_projects/Crash/test/crisis.test.js:382:1'
  failureType: 'testCodeFailure'
  error: 'output recovered to -4.51% of trend at ten years, from -6.60% at five. That is a rebound.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/crisis.test.js:403:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: WHEN CREDIT BITES BACK: the bust is deeper the bigger the boom was
ok 36 - WHEN CREDIT BITES BACK: the bust is deeper the bigger the boom was
  ---
  duration_ms: 30.630678
  ...
# Subtest: no Math.random anywhere in src/
ok 37 - no Math.random anywhere in src/
  ---
  duration_ms: 3.584254
  ...
# Subtest: no bare time conversion outside units.js
ok 38 - no bare time conversion outside units.js
  ---
  duration_ms: 2.939286
  ...
# Subtest: same seed produces an identical 96-tick history
ok 39 - same seed produces an identical 96-tick history
  ---
  duration_ms: 36.822558
  ...
#   policy_rate    settles in [-0.75, 3.5] of a declared [-0.75, 50]  (10/19 settings diverge)
#   tax_rate       settles in [22.75, 70] of a declared [0, 70]  (4/20 settings diverge)
#   govt_spending  settles in [17, 24] of a declared [0, 70]  (9/20 settings diverge)
#   money_printed  settles in [0, 0.5] of a declared [0, 15]  (11/14 settings diverge)
#   qe             settles in [0, 30] of a declared [0, 30]  (0/14 settings diverge)
#   1pp cut @m480: A/F = 1.124e+0, credit gap = 12.99, inflation = 2.710e+0
# Subtest: E1: no permanent dial move diverges through an undeclared loop
ok 40 - E1: no permanent dial move diverges through an undeclared loop
  ---
  duration_ms: 599.289716
  ...
# Subtest: E1 acceptance: a permanent 1pp cut reaches a finite credit gap and A/F
ok 41 - E1 acceptance: a permanent 1pp cut reaches a finite credit gap and A/F
  ---
  duration_ms: 3.767567
  ...
# Subtest: every state field is documented in 01-variables.md
ok 42 - every state field is documented in 01-variables.md
  ---
  duration_ms: 3.081694
  ...
# Subtest: 01-variables.md does not document fields the model no longer has
ok 43 - 01-variables.md does not document fields the model no longer has
  ---
  duration_ms: 0.47143
  ...
# Subtest: every dial, gauge, scenario, shock and ending is named in the docs
ok 44 - every dial, gauge, scenario, shock and ending is named in the docs
  ---
  duration_ms: 1.825653
  ...
# Subtest: every transmitted driver has a player-facing name
ok 45 - every transmitted driver has a player-facing name
  ---
  duration_ms: 0.130889
  ...
# Subtest: the docs index lists every file in docs/
ok 46 - the docs index lists every file in docs/
  ---
  duration_ms: 0.411783
  ...
# Subtest: US 2008-12: the rate dial does reach its floor and stay there
ok 47 - US 2008-12: the rate dial does reach its floor and stay there
  ---
  duration_ms: 17.328856
  ...
# Subtest: US 2008-12: THE CRISIS IS ENTIRELY OFFSET BY THE RATE CUTS THAT FOLLOWED IT
not ok 48 - US 2008-12: THE CRISIS IS ENTIRELY OFFSET BY THE RATE CUTS THAT FOLLOWED IT # TODO STILL FAILS, AND PHASE 2 BARELY TOUCHED IT — which is itself the finding. Re-measured after the A1 transmission split and the derived rate ceiling: output troughs at -1.85% of trend (was -1.86; US: -5 to -7), unemployment rises +0.14pp peaking in month 9 (was +0.32pp; US: +5.0pp to 10.0% at month 22), inflation never goes below 2.25% (was 2.26; US: -2.1%), and government debt FALLS from 64% to 61% (was 60; US: 64 -> 100). Output is +3.55% of trend at month 6, BEFORE Lehman lands. THE UNEMPLOYMENT RESPONSE GOT SMALLER, not larger. WHY PHASE 2 DID NOT HELP HERE, and it is worth understanding: this episode is not a disinflation, it is a CRASH plus an easing, and the two Section A defects were both about tightening arriving too slowly. Making the rate arrive faster makes the EASING arrive faster too, so the 1.75pp of cuts delivered between months 2 and 11 now offset the crisis sooner rather than less. The asymmetry the brief identified is unchanged: the cut reaches asset prices on a 1-month kernel and now reaches borrowers on a 3-month one, while the crisis works through the credit and capital blocks over years. What is left is a demand block that heals too fast, which is the same statement as OPEN \#1 and TAX_SHOCK_TO_GDP, and it sits downstream of Section B rather than Section A. Re-measure after Phase 3.
  ---
  duration_ms: 12.819872
  location: '/home/ztchr/personal_projects/Crash/test/episodes.test.js:136:1'
  failureType: 'testCodeFailure'
  error: 'unemployment rose 0.79pp, peaking in month 41; the US went 5.0 to 10.0. Output trough -3.52% of trend, inflation low 1.81%, debt 64 -> 69.'
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
ok 49 - US 2021-23: fiscal transfers plus a supply shock do produce an inflation
  ---
  duration_ms: 8.741355
  ...
# Subtest: US 2021-23: THE DISINFLATION NEVER HAPPENS
not ok 50 - US 2021-23: THE DISINFLATION NEVER HAPPENS # TODO MATERIALLY BETTER AFTER PHASE 2 AND STILL WRONG. Inflation now PEAKS inside the window — 20.54% at month 40, where before it had not peaked at all and was still climbing through 36.81% — and it is 10.41% at month 32 against 14.06% before (US: peaked 9.1% at month 17, 3.1% by month 32). The single biggest change is that the hike now reaches the economy: mechanism (1) in the old diagnosis was that the transmitted rate was 2.28% at month 30 while the DIAL had been at 5.25 since month 27, and that is gone — policy_rate_demand now tracks the dial within a quarter. WHAT IS LEFT IS MECHANISM (2), AND IT IS NOW THE WHOLE OF IT: credibility falls 0.85 -> 0.000 by month 31 purely from realised misses, which quadruples kappa and makes the process self-reinforcing exactly when the central bank most needs to be believed. A 5.25% funds rate against 20% expected inflation is deeply negative in real terms whatever the transmission speed. This is the forward-guidance / expectations channel the project has deferred three times, and after Phase 2 it is the largest single thing still missing from the monetary block — the reasoning in docs/12 that deferred it named the wrong defect, but Phase 2 has now removed that defect and the case for building it is what remains. Do not raise the transmission speed or lower kappa to close this.
  ---
  duration_ms: 9.037235
  location: '/home/ztchr/personal_projects/Crash/test/episodes.test.js:200:1'
  failureType: 'testCodeFailure'
  error: 'inflation peaked at 13.63% in month 40 and was 8.67% at month 32; the US peaked at 9.1% in month 18 and was at 3.1% by month 32. Credibility bottomed at 0.000 in month 32.'
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
ok 51 - UK 1979-83: low credibility really does make inflation more expensive
  ---
  duration_ms: 9.105318
  ...
# Subtest: UK 1979-83: THE RECESSION THAT PAID FOR IT NEVER ARRIVES
not ok 52 - UK 1979-83: THE RECESSION THAT PAID FOR IT NEVER ARRIVES # TODO THE BIGGEST IMPROVEMENT OF PHASE 2, AND IT STILL FAILS ON THE PRICE. The TIMING is now right: inflation peaks in month 11 where the UK peaked in month 13, against month 60 before the A1 split — the disinflation now happens, and on roughly the historical timetable. It falls to 7.82% at four years, against 13.71% before (UK: 4.6%). The felt rate at month 12 went from 13.12% to 16.86% against a 17% MLR, which is the whole of why: Howe's budget is now actually contractionary in the model rather than nominally so. WHAT STILL FAILS IS THE PRICE, AND IT FAILS IN BOTH DIRECTIONS. The peak is 16.18% against a UK 21.9% — the model no longer overshoots into a late spiral, but it never reaches the historical peak either. And the recession is still absent: unemployment rises 0.65pp where the UK went 5.4 -> 11.9, so the sacrifice ratio is 0.36 point-years per pp against Ball 1994's 2-4 for this exact episode. A disinflation this cheap is not a disinflation anyone would recognise. That is a statement about the DEMAND BLOCK — the same finding as TAX_SHOCK_TO_GDP and the missing austerity paradox, where every real quantity moves too little for the price change that caused it. It is no longer a statement about transmission.
  ---
  duration_ms: 6.949077
  location: '/home/ztchr/personal_projects/Crash/test/episodes.test.js:272:1'
  failureType: 'testCodeFailure'
  error: "inflation peaked in month 11 at 16.18% (UK: 21.9%) and was 7.82% at four years; unemployment rose 0.65pp; sacrifice ratio 0.36 against Ball's 2-4."
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
ok 53 - JAPAN: own-currency debt held at home does not reprice, and foreign-held does
  ---
  duration_ms: 37.364704
  ...
# Subtest: JAPAN: THE MODEL CANNOT HOLD A DEFLATION
not ok 54 - JAPAN: THE MODEL CANNOT HOLD A DEFLATION # TODO UNCHANGED BY PHASE 2, AS EXPECTED, AND THE REASON MATTERS. Inflation is under 0.5% in 2 of 120 months; it leaves the deflation inside a year (1.28% at month 12, was 1.44%), passes target by month 36 (2.78%) and reaches 3.76% by month 60 (was 3.95%) with the policy rate on the floor throughout. Debt peaks at 91% where Japan passed 150%, because the inflation the model invents erodes it. PHASE 2 COULD NOT HAVE HELPED. Both Section A defects were about a TIGHTENING arriving too slowly, and Japan is a decade in which no tightening was attempted and the rate dial was against its LOWER bound the whole time — the one bound Phase 2.4 did not move, because the ELB is physics rather than layout. THE MISSING MECHANISM IS DOWNWARD DE-ANCHORING: updateExpectations pulls expectations back toward inflation_target from BELOW at the same rate as from above, so a central bank with credibility 0.7 that cannot reach 2% is not representable. Japan's problem was precisely that nobody believed the BoJ could get there. That is the same expectations channel US 2021-23 now points at, seen from the deflationary side, and after Phase 2 the two episodes agree on the diagnosis for the first time.
  ---
  duration_ms: 18.189543
  location: '/home/ztchr/personal_projects/Crash/test/episodes.test.js:375:1'
  failureType: 'testCodeFailure'
  error: 'inflation was under 0.5% in 2 of 120 months and debt peaked at 91%. Japan: most of the decade, and past 150%. Model inflation at m12/m36/m60: 1.24 / 2.44 / 3.01.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/episodes.test.js:397:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: the Taylor principle IS satisfiable — but only by jumping, never by walking
ok 55 - the Taylor principle IS satisfiable — but only by jumping, never by walking
  ---
  duration_ms: 8.356689
  ...
# Subtest: THE ONE FINDING UNDERNEATH ALL FOUR: the bifurcation is gone
ok 56 - THE ONE FINDING UNDERNEATH ALL FOUR: the bifurcation is gone
  ---
  duration_ms: 29.778511
  ...
# Subtest: every event leaves the accounting identities intact
ok 57 - every event leaves the accounting identities intact
  ---
  duration_ms: 19.926749
  ...
# Subtest: every event actually changes something that survives the tick
ok 58 - every event actually changes something that survives the tick
  ---
  duration_ms: 9.043148
  ...
# Subtest: no event writes a pipeline target
ok 59 - no event writes a pipeline target
  ---
  duration_ms: 3.357067
  ...
# Subtest: full terms with shocks on and invariants armed, across every scenario
ok 60 - full terms with shocks on and invariants armed, across every scenario
  ---
  duration_ms: 498.261152
  ...
# Subtest: A WOBBLE IN A STRETCHED SYSTEM IS A DIFFERENT EVENT (docs/12 M3)
ok 61 - A WOBBLE IN A STRETCHED SYSTEM IS A DIFFERENT EVENT (docs/12 M3)
  ---
  duration_ms: 7.486084
  ...
# Subtest: no event is invisible to the player
ok 62 - no event is invisible to the player
  ---
  duration_ms: 8.163968
  ...
# Subtest: a temporary rate hike produces a HUMP, not a ramp
ok 63 - a temporary rate hike produces a HUMP, not a ramp
  ---
  duration_ms: 27.061857
  ...
# Subtest: the ordering of the peaks is output, then unemployment, then inflation
ok 64 - the ordering of the peaks is output, then unemployment, then inflation
  ---
  duration_ms: 37.861265
  ...
# Subtest: the response scales with the size of the impulse and not with its sign
ok 65 - the response scales with the size of the impulse and not with its sign
  ---
  duration_ms: 40.061746
  ...
# Subtest: a cut is a weaker impulse than a hike, for as long as the impulse is live
ok 66 - a cut is a weaker impulse than a hike, for as long as the impulse is live
  ---
  duration_ms: 26.601937
  ...
# Subtest: MEASURED: the labour market has no lag behind output, and here it is
not ok 67 - MEASURED: the labour market has no lag behind output, and here it is # TODO OPEN AND DELIBERATELY NOT CLOSED. Unemployment peaks in the SAME month as output, and a -3pp external demand shock puts 38% of the eventual 36-month unemployment response into month ONE (du 0.4725 of 1.2456; 48% of the 12-month response). labour.js sets its Okun target from the CURRENT gap and closes it at FIRING_SPEED 0.60/month. Whether that is wrong depends on which claim you read: docs/02 Asymmetry 2 says "firms fire in WEEKS and hire over quarters", which the model delivers exactly — and the jobless-recovery half of it is real (du/dgap doubles from 0.198 to 0.391 over four years as output recovers and employment does not). What is missing is the DECISION lag: firms cut hours and wait a quarter before shedding heads. Adding it means a new smoothing parameter on the Okun target in the busiest rule in the model, and the only thing that pins its magnitude is the reduced-form peak month it would be tuned to reproduce. Left open, with the number printed, rather than tuned.
  ---
  duration_ms: 8.701287
  location: '/home/ztchr/personal_projects/Crash/test/irf.test.js:139:1'
  failureType: 'testCodeFailure'
  error: '39% of the eventual unemployment response to a demand shock lands in the FIRST MONTH (0.4725 of 1.2012). Firms do not shed a third of the eventual job losses in month one.'
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
ok 68 - the spending impulse is fast and the rate impulse is slow
  ---
  duration_ms: 15.854494
  ...
# Subtest: QE and the rate dial have the same SHAPE and different sizes
ok 69 - QE and the rate dial have the same SHAPE and different sizes
  ---
  duration_ms: 26.853484
  ...
# Subtest: a dial move reaches the transmitted driver and converges to the dial
ok 70 - a dial move reaches the transmitted driver and converges to the dial
  ---
  duration_ms: 20.157624
  ...
# Subtest: markets reprice before borrowers, and both before capital spending
ok 71 - markets reprice before borrowers, and both before capital spending
  ---
  duration_ms: 3.919669
  ...
# Subtest: the output response to a rate move is LAGGED, not instant
ok 72 - the output response to a rate move is LAGGED, not instant
  ---
  duration_ms: 18.164539
  ...
# Subtest: the pipeline refuses to schedule into a field a rule owns
ok 73 - the pipeline refuses to schedule into a field a rule owns
  ---
  duration_ms: 0.763689
  ...
# Subtest: no rule assigns to a pipeline target
ok 74 - no rule assigns to a pipeline target
  ---
  duration_ms: 1.711805
  ...
# Subtest: every declared pipeline target exists on a fresh state
ok 75 - every declared pipeline target exists on a fresh state
  ---
  duration_ms: 0.183536
  ...
# Subtest: the Taylor autopilot faces the same lags the player does
ok 76 - the Taylor autopilot faces the same lags the player does
  ---
  duration_ms: 24.374828
  ...
# Subtest: every dial either schedules a lag or is documented as immediate
ok 77 - every dial either schedules a lag or is documented as immediate
  ---
  duration_ms: 4.373085
  ...
# Subtest: recession multiplier lands in the published range
ok 78 - recession multiplier lands in the published range
  ---
  duration_ms: 26.808391
  ...
# Subtest: expansion multiplier lands in the published range
ok 79 - expansion multiplier lands in the published range
  ---
  duration_ms: 15.604324
  ...
# Subtest: the multiplier is larger in a slump than in a boom
ok 80 - the multiplier is larger in a slump than in a boom
  ---
  duration_ms: 27.951797
  ...
# Subtest: the same spending buys more OUTPUT with slack and more PRICES without
ok 81 - the same spending buys more OUTPUT with slack and more PRICES without
  ---
  duration_ms: 25.772869
  ...
# Subtest: holding the rate fixed makes the multiplier much larger
ok 82 - holding the rate fixed makes the multiplier much larger
  ---
  duration_ms: 20.391681
  ...
# Subtest: THE QE LESSON: printing into slack with a credible CB barely bites
ok 83 - THE QE LESSON: printing into slack with a credible CB barely bites
  ---
  duration_ms: 6.125671
  ...
# Subtest: printing with no slack and no credibility goes straight to prices
ok 84 - printing with no slack and no credibility goes straight to prices
  ---
  duration_ms: 1.729367
  ...
# Subtest: printing buys real things when there is slack to buy them with
ok 85 - printing buys real things when there is slack to buy them with
  ---
  duration_ms: 10.903756
  ...
# Subtest: AUSTERITY LEAKS: a tax rise collects less than you legislated, and worse with slack
ok 86 - AUSTERITY LEAKS: a tax rise collects less than you legislated, and worse with slack
  ---
  duration_ms: 117.396107
  ...
# Subtest: THE SIGN FLIP THE DOCS PROMISED: how far away is it
not ok 87 - THE SIGN FLIP THE DOCS PROMISED: how far away is it # TODO OPEN, AND THE SAME FINDING AS TAX_SHOCK_TO_GDP. Revenue rises at every playable gap and no plausible parameter draw changes that. Closed form: with revenue = tau + e*(tau/100)*gap, revenue falls only if +1pp of tax costs more than 3.11% of output at a zero gap or 2.87% at -6%. The model delivers 0.99%. The requirement drops to 1.76% only at the elasticity's high end (1.8) AND a -12% gap, which is the one corner where it lands inside Romer-Romer (2.0-3.0) at all. So the austerity paradox is absent BECAUSE the tax multiplier is small — one finding, not two, and the fix is a statement about the demand block rather than a coefficient to bend. docs/07 L4 proposed exactly this test and it was never written.
  ---
  duration_ms: 16.504263
  location: '/home/ztchr/personal_projects/Crash/test/multipliers.test.js:248:1'
  failureType: 'testCodeFailure'
  error: 'the sign flip needs +1pp of tax to cost 2.87% of output at a -6% gap; the model delivers 0.90%. Romer-Romer is 2.0-3.0.'
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
# Subtest: every START field is read by something, or is declared idle
ok 88 - every START field is read by something, or is declared idle
  ---
  duration_ms: 16.508489
  ...
# Subtest: the two depreciation rates are equal, as both their notes require
ok 89 - the two depreciation rates are equal, as both their notes require
  ---
  duration_ms: 0.250744
  ...
# Subtest: every parameter has a value inside its range
ok 90 - every parameter has a value inside its range
  ---
  duration_ms: 0.495672
  ...
# Subtest: every parameter has a unit, a source and a known confidence level
ok 91 - every parameter has a unit, a source and a known confidence level
  ---
  duration_ms: 0.2963
  ...
# Subtest: the deleted double-count has not crept back
ok 92 - the deleted double-count has not crept back
  ---
  duration_ms: 0.189162
  ...
# Subtest: kernels are normalised and peak on the documented month
ok 93 - kernels are normalised and peak on the documented month
  ---
  duration_ms: 0.50833
  ...
# Subtest: every fitted kernel shape has a lag entry
ok 94 - every fitted kernel shape has a lag entry
  ---
  duration_ms: 0.1312
  ...
# Subtest: START satisfies the accounting identities
ok 95 - START satisfies the accounting identities
  ---
  duration_ms: 0.185922
  ...
# Subtest: every constant solved from the model is declared, in both directions
ok 96 - every constant solved from the model is declared, in both directions
  ---
  duration_ms: 0.502322
  ...
# Subtest: ROUND TRIP: the stance returns exactly, to nine decimal places
ok 97 - ROUND TRIP: the stance returns exactly, to nine decimal places
  ---
  duration_ms: 41.530359
  ...
# Subtest: ROUND TRIP: the ECONOMY does not return, and the residue is real capital
ok 98 - ROUND TRIP: the ECONOMY does not return, and the residue is real capital
  ---
  duration_ms: 49.210197
  ...
# Subtest: HIKE-HOLD-CUT: no permanent ratchet, and the jobs cost outlasts the gain
ok 99 - HIKE-HOLD-CUT: no permanent ratchet, and the jobs cost outlasts the gain
  ---
  duration_ms: 28.431819
  ...
# Subtest: STOP-GO: a symmetric-looking cycle is a persistent EASING, and it shows
ok 100 - STOP-GO: a symmetric-looking cycle is a persistent EASING, and it shows
  ---
  duration_ms: 32.514522
  ...
# Subtest: a path and a held move are not the same thing, and the difference is measurable
ok 101 - a path and a held move are not the same thing, and the difference is measurable
  ---
  duration_ms: 23.955522
  ...
#   calm         GOLDILOCKS gap 0.00 cgap 0.00 u 5.00 debt 100
#   overheating  ENDED hyperinflation @m51
#   recession    GOLDILOCKS gap 2.44 cgap 2.26 u 4.29 debt 116
#   stagflation  ENDED hyperinflation @m23
#   debt_trap    ENDED debt_crisis @m73
#   bubble       GOLDILOCKS gap -3.93 cgap 7.08 u 5.80 debt 74
# Subtest: every scenario starts internally consistent
ok 102 - every scenario starts internally consistent
  ---
  duration_ms: 2.359027
  ...
# Subtest: the bubble scenario looks healthy on every gauge except the credit gap
ok 103 - the bubble scenario looks healthy on every gauge except the credit gap
  ---
  duration_ms: 0.205491
  ...
# Subtest: the bubble hides for four years — the design promise
ok 104 - the bubble hides for four years — the design promise
  ---
  duration_ms: 18.463988
  ...
# Subtest: the bubble does not deflate on its own before the term ends
not ok 105 - the bubble does not deflate on its own before the term ends # TODO A LESSON-LEVEL CONSEQUENCE OF 3.1, AND NOT A DEFECT IN 3.1. docs/00 describes this scenario as eight years of every gauge saying you are brilliant while the one nobody watches climbs to ~14.5pp. It used to do exactly that — the credit gap rose monotonically 8.77 (m24), 11.63 (m48), 13.34 (m72), 14.10 (m96), with crisis probability reaching 10.36% and approval never leaving 70. It now PEAKS at 9.82 around month 48 and unwinds to 3.37 by month 96, with crisis probability falling from 6.35 to 0.22. The bet the player was knowingly taking now settles itself. THE CAUSE IS THAT THE SCENARIO WAS CALIBRATED AGAINST A DEFECT. Its 14.5pp gap was being produced by updateAssetPrices overshooting its own sourced semi-elasticity by 4.6x, which 3.1 fixed. The four-year promise above still holds (9.80pp at m48, over the BIS line, with every visible gauge healthy), so what is lost is the second half of the term. DO NOT CLOSE THIS BY RE-INFLATING THE WEALTH CHANNEL — that is rule 3, and the channel now matches its own literature. AND DO NOT RETUNE THE STARTING VECTOR EITHER, which is what this message used to recommend. Phase 4.3 measured the cause and it is D2, an already-known sourced defect: updateCreditTrend chases the stock at 0.20/year, a 41.6-month half-life, while its stated source is a one-sided HP filter at lambda=400,000 whose trend constant is 10-15 YEARS. The gauge mean-reverts 3-4x faster than the indicator it approximates, so it systematically under-reads persistent booms — the exact situation it exists for. At the sourced speed the gap climbs and STAYS: measured, m24/m48/m72/m96 = 10.29/13.99/14.20/10.34 at 0.06 per year and 10.44/14.37/14.82/11.14 at 0.05, against 8.39/9.80/7.99/3.37 as built. The design promise is ~14.5pp. PHASE 5.4 HAS NOW RUN, AND IT ONLY GOT PART OF THE WAY. The derivation from the stated lambda gives 0.127/year, not the 0.05-0.06 that would restore 14.5pp — which took the peak from 9.82 to 12.00 and the m96 gap from 3.37 to 6.20. Pushing further would be tuning to a target (rule 3), so it was not done. 5.2 THEN MOVED IT AGAIN, UPWARD, FOR AN UNRELATED REASON: giving private debt a maturity means a rate change reaches the debt-service burden over years, so the balancing leg of the credit loop (burden -> defaults -> spread -> real rate) arrives slower and the boom runs longer. Current path 9.16/11.65/11.05/7.08, peaking at 11.98 in month 58. The SHAPE is unchanged: it still peaks and unwinds inside the term. WHAT IS LEFT IS PROBABLY STRUCTURAL: the BIS trend is a LOCAL LINEAR trend carrying a slope state and this one is level-only, so it lags a growing credit stock permanently and no speed fixes that. See CREDIT_TREND_CATCHUP's note. 6.1 (the countercyclical buffer) is the other half of the answer, because a bubble the player cannot act on is a spectacle rather than a decision.
  ---
  duration_ms: 13.327761
  location: '/home/ztchr/personal_projects/Crash/test/scenarios.test.js:62:1'
  failureType: 'testCodeFailure'
  error: 'the credit gap peaked at 11.98pp in month 58 and had fallen to 7.08pp by the end of the term. The scenario exists to hold a hidden danger in front of the player for eight years; one that quietly resolves itself teaches that ignoring it works.'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/scenarios.test.js:112:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: every scenario starts in, and stays a quarter in, its advertised regime
ok 106 - every scenario starts in, and stays a quarter in, its advertised regime
  ---
  duration_ms: 9.097493
  ...
# Subtest: the recession scenario has the rate dial genuinely dead
ok 107 - the recession scenario has the rate dial genuinely dead
  ---
  duration_ms: 2.978884
  ...
# Subtest: no scenario produces absurd numbers inside a term
ok 108 - no scenario produces absurd numbers inside a term
  ---
  duration_ms: 76.969088
  ...
# Subtest: NEUTRAL ANCHORS ARE BUILT FROM NEUTRAL, in every scenario
ok 109 - NEUTRAL ANCHORS ARE BUILT FROM NEUTRAL, in every scenario
  ---
  duration_ms: 0.86507
  ...
# Subtest: debt_trap: the real economy responds to the yield at all
ok 110 - debt_trap: the real economy responds to the yield at all
  ---
  duration_ms: 5.078861
  ...
# Subtest: debt_trap: the benchmark central bank is no longer identical to doing nothing
ok 111 - debt_trap: the benchmark central bank is no longer identical to doing nothing
  ---
  duration_ms: 8.569301
  ...
# Subtest: debt_trap: THE DECISION — you cannot consolidate your way out alone
ok 112 - debt_trap: THE DECISION — you cannot consolidate your way out alone
  ---
  duration_ms: 29.113076
  ...
# Subtest: debt_trap: and the inflation price of escaping is visibly large
not ok 113 - debt_trap: and the inflation price of escaping is visibly large # TODO MAGNITUDE MOVED BY 3.1, DIRECTION INTACT. Cutting the rate to the floor in debt_trap buys 2.49% inflation against 1.40% doing nothing — a +1.09pp price, where the bar was +1.5pp before the asset-price units were fixed. The wealth channel was applying a LEVEL semi-elasticity as a persistent growth rate and overshooting its own sourced value by 4.6x, so every inflationary consequence of an easing was correspondingly overstated. The lesson — that inflating your way out has a visible price — is asserted hard in the test above; this records HOW visible. Re-measure at Phase 4 and decide then whether +1.09pp reads as a decision to a player, rather than adjusting the threshold to whatever the model does.
  ---
  duration_ms: 13.014816
  location: '/home/ztchr/personal_projects/Crash/test/scenarios.test.js:306:1'
  failureType: 'testCodeFailure'
  error: 'cutting rates to the floor left inflation at 1.89% against 1.38% passive'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/scenarios.test.js:320:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: THE LONG YIELD IS AN AVERAGE, so it carries inflation without double-counting
ok 114 - THE LONG YIELD IS AN AVERAGE, so it carries inflation without double-counting
  ---
  duration_ms: 19.313139
  ...
# Subtest: a hike does not bite the interest bill on impact
ok 115 - a hike does not bite the interest bill on impact
  ---
  duration_ms: 4.559001
  ...
# Subtest: CHARACTERISATION: what each preset does over a full term, unattended
ok 116 - CHARACTERISATION: what each preset does over a full term, unattended
  ---
  duration_ms: 23.802539
  ...
# Subtest: the core macro block is stable around the steady state
ok 117 - the core macro block is stable around the steady state
  ---
  duration_ms: 34.365881
  ...
# Subtest: the debt loop diverges, but slowly enough to be playable
ok 118 - the debt loop diverges, but slowly enough to be playable
  ---
  duration_ms: 22.33207
  ...
# Subtest: a one-off demand shock decays rather than compounding
ok 119 - a one-off demand shock decays rather than compounding
  ---
  duration_ms: 12.232798
  ...
# Subtest: 200 ticks of no input and nothing drifts
ok 120 - 200 ticks of no input and nothing drifts
  ---
  duration_ms: 38.125007
  ...
# Subtest: THE LEVEL: potential grows at potential_growth, and K/Y stays put
ok 121 - THE LEVEL: potential grows at potential_growth, and K/Y stays put
  ---
  duration_ms: 22.842481
  ...
# Subtest: credibility rises when the target is hit, and slowly
ok 122 - credibility rises when the target is hit, and slowly
  ---
  duration_ms: 14.246295
  ...
# Subtest: the credit gap does not open on its own
ok 123 - the credit gap does not open on its own
  ---
  duration_ms: 35.10436
  ...
#   disinflation curve @m60: 5%:73.9 6%:36.5 7%:6.4 8%:3.6 9%:1.9 10%:0.6 12%:-1.9
#   steepest -40.4pp of inflation per pp of policy, at 5%
#   steepest slope: as built -40.4 at 5%; wealth channel off -20.9 at 5.75%
#   stagflation m3->m12: inflation +6.10pp; response on the DIAL 1.99, TRANSMITTED 1.94 (0.37 before the A1 split); real rate felt at m12 -1.81% (-14.50 before)
# Subtest: a rate cut does more for OUTPUT with slack than at capacity
ok 124 - a rate cut does more for OUTPUT with slack than at capacity
  ---
  duration_ms: 47.522431
  ...
# Subtest: a cut is weaker than the equivalent hike
ok 125 - a cut is weaker than the equivalent hike
  ---
  duration_ms: 15.40056
  ...
# Subtest: a cut-then-hike round trip leaves the stance where it started
ok 126 - a cut-then-hike round trip leaves the stance where it started
  ---
  duration_ms: 9.375289
  ...
# Subtest: THE LOWER BOUND: easing stops working as the rate approaches it
ok 127 - THE LOWER BOUND: easing stops working as the rate approaches it
  ---
  duration_ms: 30.646714
  ...
# Subtest: QE still works when the rate dial has run out of room
ok 128 - QE still works when the rate dial has run out of room
  ---
  duration_ms: 21.116408
  ...
# Subtest: unemployment rises faster than it falls
ok 129 - unemployment rises faster than it falls
  ---
  duration_ms: 15.14564
  ...
# Subtest: SWEEP: more spending never raises unemployment, at any starting gap
ok 130 - SWEEP: more spending never raises unemployment, at any starting gap
  ---
  duration_ms: 72.323895
  ...
# Subtest: SWEEP: no step changes in the response to a rate cut
ok 131 - SWEEP: no step changes in the response to a rate cut
  ---
  duration_ms: 24.774479
  ...
# Subtest: the ONE cliff in the model is the capacity ceiling, and it is where it says
ok 132 - the ONE cliff in the model is the capacity ceiling, and it is where it says
  ---
  duration_ms: 3.051966
  ...
# Subtest: L5: HIKING AT THE LOWER BOUND MUST NOT RAISE OUTPUT
ok 133 - L5: HIKING AT THE LOWER BOUND MUST NOT RAISE OUTPUT
  ---
  duration_ms: 14.258097
  ...
# Subtest: L3: the fiscal multiplier has no step in it as the rate falls to the bound
ok 134 - L3: the fiscal multiplier has no step in it as the rate falls to the bound
  ---
  duration_ms: 398.965101
  ...
# Subtest: investment.js reads the rate DIAL only to display it
ok 135 - investment.js reads the rate DIAL only to display it
  ---
  duration_ms: 1.43342
  ...
# Subtest: A-TABLE: the disinflation response is monotone and its threshold is where Fisher puts it
ok 136 - A-TABLE: the disinflation response is monotone and its threshold is where Fisher puts it
  ---
  duration_ms: 21.914787
  ...
# Subtest: A-TABLE: the knife-edge is the wealth channel, and it is still there
not ok 137 - A-TABLE: the knife-edge is the wealth channel, and it is still there # TODO PHASE 3 CLOSES THIS. Measured as the steepest local sensitivity on a 0.25pp grid, |d inflation@m60 / d policy rate|: pre-A1 as built -366.7 at 7.75% (slope ratio 138x); post-A1 as built -149.2 at 6.25% (slope ratio 80x); post-A1 with no wealth channel -22.5 at 5.50% (slope ratio 19x). Splitting the transmission lag halved the knife-edge and moved it toward the Fisher point, but did not remove it. Switching WEALTH_EFFECT off removes 85% of what is left, which is the isolating experiment: the residual bifurcation is the asset-wealth channel, and that is Section B. The target below is not a picked number — it is what the model itself does with the offending channel switched off, re-measured on every run.
  ---
  duration_ms: 65.424843
  location: '/home/ztchr/personal_projects/Crash/test/transmission.test.js:370:1'
  failureType: 'testCodeFailure'
  error: "the live model's steepest response is 40.4pp of inflation per pp of policy, against 20.9 with WEALTH_EFFECT switched off. The wealth channel is contributing 1.9x the curvature of the rest of the model put together."
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/transmission.test.js:387:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: A-TABLE: the A1 split made the response curve measurably smoother
ok 138 - A-TABLE: the A1 split made the response curve measurably smoother
  ---
  duration_ms: 23.068373
  ...
# Subtest: the TRANSMITTED Taylor response clears unity, not just the dial one
ok 139 - the TRANSMITTED Taylor response clears unity, not just the dial one
  ---
  duration_ms: 1.931147
  ...
# Subtest: the whole UI boots without throwing
ok 140 - the whole UI boots without throwing
  ---
  duration_ms: 2.148974
  ...
# Subtest: every shell container the app needs exists
ok 141 - every shell container the app needs exists
  ---
  duration_ms: 0.598769
  ...
# Subtest: a gauge mounts for every indicator
ok 142 - a gauge mounts for every indicator
  ---
  duration_ms: 0.220515
  ...
# Subtest: a dial mounts for every dial
ok 143 - a dial mounts for every dial
  ---
  duration_ms: 0.187738
  ...
# Subtest: every gauge can open a why panel with real terms
ok 144 - every gauge can open a why panel with real terms
  ---
  duration_ms: 6.064719
  ...
# Subtest: every gauge has a history series to draw
ok 145 - every gauge has a history series to draw
  ---
  duration_ms: 5.526647
  ...
# Subtest: moving a dial schedules an effect instead of applying it
ok 146 - moving a dial schedules an effect instead of applying it
  ---
  duration_ms: 0.592829
  ...
# Subtest: a session runs a full term without throwing
ok 147 - a session runs a full term without throwing
  ---
  duration_ms: 19.246964
  ...
# Subtest: restarting on the same seed keeps the previous run as a ghost
ok 148 - restarting on the same seed keeps the previous run as a ghost
  ---
  duration_ms: 4.355197
  ...
# Subtest: the game starts paused, at 1x, with play as the visible action
ok 149 - the game starts paused, at 1x, with play as the visible action
  ---
  duration_ms: 0.670412
  ...
# Subtest: pausing does not throw away the chosen speed
ok 150 - pausing does not throw away the chosen speed
  ---
  duration_ms: 0.34357
  ...
# Subtest: every gauge and every dial has a plain-English definition
ok 151 - every gauge and every dial has a plain-English definition
  ---
  duration_ms: 0.188149
  ...
# Subtest: every gauge can say whether it is getting worse
ok 152 - every gauge can say whether it is getting worse
  ---
  duration_ms: 0.162072
  ...
# Subtest: a passive calm run reaches the end of the term and is scored
ok 153 - a passive calm run reaches the end of the term and is scored
  ---
  duration_ms: 12.510704
  ...
# Subtest: a losing run reaches a named ending with a lesson
ok 154 - a losing run reaches a named ending with a lesson
  ---
  duration_ms: 4.269513
  ...
# Subtest: the DEFERRED register matches the code, in both directions
ok 155 - the DEFERRED register matches the code, in both directions
  ---
  duration_ms: 15.568046
  ...
# Subtest: every recorded parameter conflict is still genuinely unresolved
ok 156 - every recorded parameter conflict is still genuinely unresolved
  ---
  duration_ms: 3.263204
  ...
# Subtest: RATE_TO_OUTPUT: 1pp of policy rate, held a year
ok 157 - RATE_TO_OUTPUT: 1pp of policy rate, held a year
  ---
  duration_ms: 20.798779
  ...
# Subtest: AUTO_STABILISER_ABSORPTION: share of an income shock that never lands
ok 158 - AUTO_STABILISER_ABSORPTION: share of an income shock that never lands
  ---
  duration_ms: 13.700823
  ...
# Subtest: a tax cut RAISES output, and does it through consumption
ok 159 - a tax cut RAISES output, and does it through consumption
  ---
  duration_ms: 29.287189
  ...
# Subtest: QE_TO_GDP: bond buying reaches output through the yield, and how much
not ok 160 - QE_TO_GDP: bond buying reaches output through the yield, and how much # TODO FELL BELOW ITS PUBLISHED RANGE WHEN 3.1 FIXED THE ASSET-PRICE UNITS. The model delivers 0.019% of GDP per 1% of GDP purchased against a published 0.02-0.15 — just under the bottom, where it used to sit inside. QE reaches output through the long yield and then through asset prices, and the asset leg was overshooting its own sourced semi-elasticity by 4.6x, so part of what used to satisfy this range was the unit error. QE_TO_GDP is `weak` in parameters.py, with the note that the real-economy effect is genuinely contested and some argue near-zero outside market dysfunction — 0.019 is comfortably inside that judgement even though it is outside the stated band. Recorded rather than closed: raising it means raising QE_TO_YIELD or the wealth channel, and the wealth channel has just been shown to have been wrong in the other direction.
  ---
  duration_ms: 13.035162
  location: '/home/ztchr/personal_projects/Crash/test/validation.test.js:153:1'
  failureType: 'testCodeFailure'
  error: 'model 0.019, literature 0.02-0.15'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/validation.test.js:172:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: RATE_TO_INFLATION: the model is about half the published estimate
not ok 161 - RATE_TO_INFLATION: the model is about half the published estimate # TODO RE-MEASURED IN PHASE 4.4. THE RESPONSE IS SLOW, NOT ABSENT, AND THE PLAN EXPECTED THE WRONG THING. docs/13 4.4 says the shortfall is "partly the lag burying the response beyond the 24-month window", so the A1 transmission split should have moved it. It did not: 0.1227pp at 24 months against the 0.122 recorded before. RE-MEASURED AFTER 5.7, AND IT HALVED: 0.0413 at 12 months, 0.0797 at 24, 0.1069 at 36, 0.1271 at 48, where 4.4 measured 0.0586 / 0.1227 / 0.1756 / 0.2192 and the 48-month figure was INSIDE the published band. That is not a regression in the rate channel. 5.7 fixed a unit error in the capital law of motion, so potential output now grows at the rate it is told to rather than decaying toward 0.93%/yr — a hike used to be measured against a ceiling that was itself sagging, which flattered the disinflation. AND THE HIKE ARM IS NOT THE CUT ARM: a 1pp CUT buys 0.0996 at 12 months and 0.4182 at 48, comfortably inside 0.2-0.4. monetaryEasingScale is why they differ and the published range is estimated across both directions, so this test measures the weaker half of an asymmetry on purpose. The window is doing as much of the disagreement as the model is. What is left is the anchored Phillips slope doing exactly what docs/02 says it should: with kappa at 0.05 the demand channel barely moves prices, and real surges are supposed to come from supply shocks and unanchoring. The published range is estimated across regimes that include the unanchored 1970s. The slowness no longer lives in the RATE — that arrives in a quarter now — it lives in the investment partial adjustment and the Phillips curve. Do not raise kappa to close this.
  ---
  duration_ms: 11.352551
  location: '/home/ztchr/personal_projects/Crash/test/validation.test.js:180:1'
  failureType: 'testCodeFailure'
  error: 'model 0.080, literature 0.2-0.4'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/validation.test.js:208:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
#   a 3pp hike, default rate: m1 0.00125pp, m12 0.23397, m36 0.53521, m60 0.66026. Impact is 0.19% of the five-year response (0.67538pp before 5.2, off the DIAL and the whole stock). Repricing switched off: 0.03160pp, 25.4x.
# Subtest: CRISIS_OUTPUT_TROUGH: the realised peak-to-trough lands in the published range
ok 162 - CRISIS_OUTPUT_TROUGH: the realised peak-to-trough lands in the published range
  ---
  duration_ms: 15.146353
  ...
# Subtest: TAX_SHOCK_TO_GDP: the model is far below Romer-Romer
not ok 163 - TAX_SHOCK_TO_GDP: the model is far below Romer-Romer # TODO KNOWN. A 1% of GDP tax rise costs 0.487% of output over 30 months against a published 2.0-3.0. (This message said ~0.33% until Phase 5 verification re-ran it; the model has been at 0.487 since 3.1 and was 0.492 before, so 0.33 was never right in this pass.) The Romer-Romer narrative multiplier is the largest in the literature and famously larger than structural models produce; the model also has a responding central bank and a crowding-out term that works in the opposite direction on a tax rise. Recorded rather than closed: reproducing 2.5 would mean roughly tripling the consumption response to disposable income, which the MPC evidence does not support.
  ---
  duration_ms: 9.128431
  location: '/home/ztchr/personal_projects/Crash/test/validation.test.js:249:1'
  failureType: 'testCodeFailure'
  error: 'model 0.484, literature 2-3'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (file:///home/ztchr/personal_projects/Crash/test/validation.test.js:264:10)
    Test.runInAsyncScope (node:async_hooks:211:14)
    Test.run (node:internal/test_runner/test:934:25)
    Test.processPendingSubtests (node:internal/test_runner/test:633:18)
    Test.postRun (node:internal/test_runner/test:1045:19)
    Test.run (node:internal/test_runner/test:973:12)
    async Test.processPendingSubtests (node:internal/test_runner/test:633:7)
  ...
# Subtest: private debt reprices over YEARS, and the burden lands late
ok 164 - private debt reprices over YEARS, and the burden lands late
  ---
  duration_ms: 20.651728
  ...
# Subtest: the debt-service burden reads the transmitted rate, not the dial
ok 165 - the debt-service burden reads the transmitted rate, not the dial
  ---
  duration_ms: 1.399347
  ...
1..165
# tests 165
# suites 0
# pass 149
# fail 0
# cancelled 0
# skipped 0
# todo 16
# duration_ms 921.777552
```
