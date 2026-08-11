# 07 — Model Audit Findings

Answer to `06-model-audit-brief.md`. Everything below was produced by running
the model. No finding is reported without the command that reproduces it.

> **STATUS: every finding here is closed.** What changed and why is recorded in
> `08-post-audit-revisions.md`; each fix carries a regression test named after
> the finding. Two things are deliberately left open and say so:
> `RATE_TO_INFLATION` and `TAX_SHOCK_TO_GDP` disagree with published reduced
> forms, and `ENERGY_TO_CPI` disagrees with the oil event by exactly 10× —
> all three are registered rather than tuned away.
>
> **This document is kept in the past tense on purpose.** It describes the
> model as it was, because the measurements are the evidence for the changes,
> and a fixed defect with no record of what it looked like is a defect waiting
> to be reintroduced. The probes in `tools/audit/` have been updated to run
> against the current code, so they now print the *fixed* behaviour next to the
> numbers quoted here.

**Headline:** the model is self-consistent and does not explode, and that is
still not evidence it is right. Six of the causal chains the game exists to
teach currently run backwards, and one shared root cause explains four of
them. Separately, **38.8% of real 8-year sessions terminate with a thrown
accounting error** before the player reaches the end of the term.

`npm test` — 47 pass. None of the findings below is caught by any of them.

---

## How to reproduce

Every probe is checked in under `tools/audit/`, one file per finding group,
with an index in `tools/audit/README.md`. No arguments, no state:

```
node tools/audit/10-state-dependence.mjs
```

Where a finding below cites `p10.mjs` it means `tools/audit/10-*.mjs`.

`tools/audit/h.mjs` is the shared harness. It exposes `ctx(overrides, seed)` →
`{s, trace, pipeline, rng}` and `step(c, n, opts)`. Default opts are
`{events:false, assertEveryTick:false, endings:false}` so a probe measures the
mechanism rather than the ending.

Two experimental conventions used throughout, both of which matter:

- **`net_exports` is the clean gap instrument.** It is additive in
  `aggregate.js` and read by nothing else in `src/rules/`, so setting it moves
  the output gap without touching the deficit, the tax base, disposable income
  or the policy rate. Every state-dependence table below uses it. Setting the
  gap with the policy rate instead — which the existing tests do — confounds
  the gap with the lever being measured.
- **Off the exact steady state the model has no resting point.** A "settled"
  state at any non-neutral rate is a waypoint on a drifting path, not a
  regime. Where drift matters I say so.

---

# SECTION 1 — Findings that invert a lesson the game exists to teach

Six findings, grouped by root cause. Four of them share two causes.

---

## L1. Every effect scheduled into the lag pipeline is discarded before it can act

**What is wrong, in one sentence.** `updateConsumption` and `updateInvestment`
assign `s.consumption` and `s.investment` from scratch, so the amounts the
engine deposits from `LagPipeline.collect()` at the top of the tick are
overwritten a few lines later and never reach demand.

**Evidence.** Schedule an absurd amount and see whether anything moves
(`p12.mjs`):

```
=== the pipeline, direct: schedule an ABSURD amount and see if anything moves ===
  after 24 months with 1000pp of GDP scheduled into demand:
    Δoutput 4.197669   Δconsumption 0.000000   Δinvestment 0.000000
    Δcapital 33.5200
```

`Δconsumption` and `Δinvestment` are *exactly* zero. The output move is entirely
an artefact: `updatePotentialOutput` runs at position 1 and reads `s.investment`
before `updateInvestment` at position 3 overwrites it, so the landed amount
leaks into the capital stock — the one channel it was never meant to touch.

Second reproduction, the realistic one (`p1-pipeline.mjs`). A −1pp rate move
made the correct way, via `applyDialChange`, against the same move made by
assigning `s.policy_rate` directly with no scheduling at all:

```
pipeline pending immediately after a -1pp rate move:
  { label: 'rate -1.00pp', target: 'investment',  monthsToPeak:  9, totalAmount: 1 }
  { label: 'rate -1.00pp', target: 'consumption', monthsToPeak: 12, totalAmount: 0.1667 }

Δoutput, with scheduling      m1 0.3467   m12 1.4214   m36 2.7041
Δoutput, no scheduling at all m1 0.3466   m12 1.4164   m36 2.6946

DIFFERENCE the pipeline made to output at m=36: 9.442e-3     (0.35% of the response)
DIFFERENCE the pipeline made to capital at m=36: 7.208e-2
```

Coverage of the channel system:

```
KERNEL CHANNELS defined:   21
KERNEL CHANNELS scheduled:  4   (rate_to_investment, rate_to_output,
                                 spending_to_output, tax_to_consumption)
KERNEL CHANNELS with any effect on the model: 0
```

**Which is wrong.** The code. `docs/02` Part 5 and `src/game/dials.js` both
describe a lagged transmission system; `src/lags.js` and `src/kernels.js`
implement one faithfully; `src/rules/` then ignores it.

**Severity: inverts a lesson.** Three lessons, in fact.

1. *Policy acts with long and variable lags, and you will be told you failed
   before it works.* This is the stated reason the pipeline panel exists —
   `src/ui/widgets/pipeline.js` opens with "THE MOST IMPORTANT WIDGET ON
   SCREEN". The panel shows the player a queue of pending effects, with
   fraction-landed bars and "peaks in 9 mo" countdowns, for effects that will
   never arrive. Measured, 24% of the eventual 12-month output response to a
   rate cut has already landed in month 1 and 65% by month 3.
2. *Cuts are weaker than hikes.* See L2 below — `signAsymmetry` is applied only
   on the discarded path.
3. *A spending increase raises income, which raises consumption.* The
   `delta * 0.4` induced-consumption leg scheduled in `dials.js:91` is the only
   income→consumption link the model has, and it is discarded. (See L4 — even
   if it landed, `disposable_income` would still not depend on output.)

**The fix.** Choose one convention and make the rules obey it.

- *Option A (smaller change):* rules compute a **target** and the landed
  pipeline amount is an **additive deviation** carried in its own state field
  (`s.consumption_lagged`, `s.investment_lagged`) that the rule adds rather
  than clobbers. The engine then deposits into those fields, not into
  `s.consumption`/`s.investment`.
- *Option B (cleaner):* delete the contemporaneous rate term from
  `investment.js` and route *all* rate transmission through the pipeline, so
  there is exactly one path and it has the documented shape.

Do not do both without removing one of them — the scheduled amount (1.0pp of
investment per 1pp of rate) and the contemporaneous term (0.3375pp on impact,
1.25pp by month 12 through the accelerator) are the same channel measured two
ways, and adding them is a 2× double count.

**The test that would have caught it.** In `test/lags.test.js` (new):

```js
test('a scheduled effect actually reaches demand', () => {
  const s = newState(); const pipeline = new LagPipeline();
  run(s, 12, { pipeline, events: false, assertEveryTick: false });
  const base = newState(); const p2 = new LagPipeline();
  run(base, 12, { pipeline: p2, events: false, assertEveryTick: false });
  pipeline.schedule('consumption', 5, 'spending_to_output', 'probe', s.tick);
  run(s, 24, { pipeline, events: false, assertEveryTick: false });
  run(base, 24, { pipeline: p2, events: false, assertEveryTick: false });
  assert.ok(s.consumption - base.consumption > 1,
    'a 5pp scheduled consumption effect moved consumption by ' +
    (s.consumption - base.consumption).toFixed(6));
});
```

---

## L2. A rate cut is strongest at full employment and weakest in a slump

**What is wrong.** The output response to a −1pp cut *rises* monotonically as
slack disappears — 0.94pp at a −6% gap, 2.04pp at a 0% gap. `docs/02` calls the
opposite "the single most important conditional in the whole model", and
`aggregate.js:15-21` claims to be where it lives.

**Evidence** (`p10.mjs`, gap set with `net_exports`, both arms identical,
24 months):

| starting gap | Δoutput | Δinflation | Δunemployment | output share |
|---|---|---|---|---|
| −6.02 | **0.938** | 0.095 | −0.151 | 0.91 |
| −4.02 | 0.962 | 0.097 | −0.154 | 0.91 |
| −3.01 | 0.975 | 0.098 | −0.156 | 0.91 |
| −2.01 | 1.048 | 0.120 | −0.376 | 0.90 |
| −1.10 | 1.623 | 0.239 | −0.575 | 0.87 |
| 0.00 | **2.039** | 0.892 | −0.715 | 0.70 |
| +1.46 | 2.155 | 1.067 | −0.754 | 0.67 |
| +3.00 | 0.438 | 6.390 | −1.171 | 0.06 |

**Root cause.** Two amplifiers, both switched *off* by slack:

1. `investment.js:45-48` — `const slack = clamp(-s.output_gap / 2, 0, 1)` and
   `crowding = -CROWDING_OUT * deficitExcess * (1 - slack)`. A rate cut raises
   output → raises the automatic-stabiliser tax take → shrinks the deficit →
   *crowds investment in*. With slack ≥ 2pp that term is identically zero.
2. `wages.js:27-28` — the wage Phillips kink at `u < 5`. Below the kink, wage
   growth and then inflation rise, which lowers `user_cost = market_rate −
   expected_inflation` and buys a second round of investment. Above the kink
   nothing happens.

So the model's state dependence is real and structural — it just points the
wrong way, because both structural amplifiers are gated on *absence* of slack.

**Which is wrong.** The code. The doc is right and is also what the literature
says.

**Severity: inverts a lesson.** The player who runs the game's central
experiment — cut into a slump, cut into a boom — learns that stimulus works
better when you least need it.

**The fix.** The crowding-out term is doing far more work than
`CROWDING_OUT`'s note supports ("commonly overstated"). It is currently the
*only* structural amplifier on any demand lever. Two things need to happen:
give the model a real income→consumption channel (L4) so demand levers have a
multiplier that is *increasing* in slack via `MPC_UNEMPLOYMENT_SLOPE`, and cap
the crowding-out term's share of any lever's total response.

**The test.** `test/multipliers.test.js`, using `net_exports` to set the gap:

```js
test('a rate cut does more for output with slack than at capacity', () => {
  const slack = cutResponse(-3), hot = cutResponse(0);
  assert.ok(slack.dOutput > hot.dOutput,
    `cut moved output ${slack.dOutput} with a -3% gap vs ${hot.dOutput} at capacity`);
});
```

---

## L3. Printing money does nothing when there is slack, and works when there isn't

**What is wrong.** `docs/02` DIAL 5: "IF output_gap < −2% (lots of slack):
mostly nothing… IF output_gap > 0 (no slack): more money, same goods →
price_level ↑ hard." The model does the reverse. With slack, printing 2% of GDP
moves output by −0.03pp; at capacity it moves output by +1.37pp. And the
monetisation pass-through — the mechanism the whole block exists for — is
**exactly zero in both cases**.

**Evidence** (`p10.mjs`, `money_printed = 2`, 24 months):

| starting gap | Δoutput | Δinflation | pass-through | slack factor in crowding |
|---|---|---|---|---|
| −6.02 | **−0.034** | −0.124 | 0.000 | 1.00 |
| −4.02 | −0.023 | −0.083 | 0.000 | 1.00 |
| −3.01 | −0.017 | −0.062 | 0.000 | 1.00 |
| −2.01 | −0.000 | −0.041 | 0.000 | 1.00 |
| −1.10 | 0.737 | 0.073 | 0.000 | 0.55 |
| 0.00 | **1.365** | 0.633 | 0.000 | 0.00 |
| +1.46 | 1.495 | 0.859 | 0.000 | 0.00 |
| +3.00 | 0.402 | 8.176 | 1.277 | 0.00 |

**Root cause: the print dial's only route into demand is the deficit.**
`money_printed` appears in exactly three places — `updateMoneySupply` (writes
`money_supply`, which is read by nothing, see M6), `updateMonetisation` (the
pass-through and the credibility erosion) and `updateBudget` (`'paid for by
printing': -s.money_printed`). Printing therefore *shrinks the deficit*, which
*reduces crowding out*, which raises investment — and that term is switched off
by slack, exactly as in L2. Measured directly (`p9.mjs`):

```
  no print  deficit 3.500 (ss 3.500)  excess  0.000  slack 0.00  crowding term 0.0000
  print 2   deficit 1.500 (ss 3.500)  excess -2.000  slack 0.00  crowding term 0.6600
```

`0.66 = CROWDING_OUT × 2`. That is the entire mechanism by which money printing
stimulates the economy in this model.

**The money block contributes nothing for four years.** Printing 5% of GDP at
the calm baseline (`p12.mjs`):

```
  m   Δinfl  passthrough  Δgap   kappa*gap  credibility  Δinvestment
   6   0.812        0.000  2.211      0.165        0.838        2.420
  12   1.213        0.000  2.389      0.192        0.799        2.712
  24   1.906        0.000  2.782      0.254        0.726        3.214
  36   2.941        0.000  3.464      0.396        0.556        3.882
  48  42.121        5.000 17.450      3.490        0.000       16.649
```

Inflation reaches +2.9pp with `monetisation_passthrough` still at 0.000. The
gate only opens at month ~48, once credibility has been eroded to zero by the
`-0.0015 * money_printed` term — by which point the run is already gone.

The gate is a *product* of two factors that are each zero in any normal state:
`MONETISATION_SLACK_GATE = 1`, so any slack ≥ 1pp closes it completely; and
`MONETISATION_CREDIBILITY_GATE = 0.5` against a calm credibility of 0.91, so
`credFactor = clamp((0.5 − 0.91)/0.5, 0, 1) = 0`. Pass-through is structurally
unreachable except after inflation has already destroyed credibility. The money
channel cannot *cause* inflation; it can only amplify inflation something else
caused.

**Which is wrong.** The code. `docs/00` calls the monetisation gate the
"highest-priority fix in the model", and `money.js:63` repeats it. The gate is
implemented correctly and is then bypassed by a channel nobody intended.

**Severity: inverts a lesson.** This is the specific defect the prototype had
(defect 2), fixed in the money block and reintroduced through the fiscal block.

**The fix.** Printing must be a *financing* choice that funds something, per
the doc's "govt spends without taxing or borrowing". At present
`Δgovt_purchases = 0.000` when the print dial moves (`p8.mjs`) — nothing is
bought. Either (a) the print dial adds to `govt_purchases` and *also* removes
the borrowing, so it enters demand directly and the slack gate then decides
whether it becomes output or prices; or (b) it stays a pure financing switch
and the crowding-out route is neutralised so the dial has no demand effect at
all until the pass-through gate opens.

**The test.**

```js
test('printing into slack raises output more than printing at capacity', () => {
  assert.ok(printResponse(-3).dOutput > printResponse(0).dOutput);
});
test('printing at capacity raises prices more than printing into slack', () => {
  assert.ok(printResponse(0).dInflation > printResponse(-3).dInflation);
});
```

---

## L4. Household income does not depend on output, so there is no multiplier and no austerity paradox

**What is wrong.** `fiscal.js:86` — `s.disposable_income = 100 - s.tax_revenue
+ s.transfers`. The `100` is *potential* output, held constant. Household market
income is therefore the same in a boom and a depression.

**Evidence** (`p2.mjs`):

```
  calm     output 103.887  gap  0.000  u 5.000  disposable_income 78.250  C 55.500
  rate 9%  output  95.796  gap -7.364  u 6.336  disposable_income 81.020  C 52.769
```

In a −7.4% output gap, household disposable income is **2.77pp higher** than at
full employment, because the stabilisers fire against a shock the model never
delivers.

Three consequences, each measured:

**(a) Automatic-stabiliser absorption is 0.15, not 0.60** (`p6.mjs` — a −5pp
spending shock, with `AUTOSTAB_*_ELASTICITY` zeroed for the counterfactual):

```
  output fall WITH stabilisers    -5.5658   (Δdisposable income  1.9895)
  output fall WITHOUT stabilisers -6.5759   (Δdisposable income  0.0000)
  absorption = 0.1536    target 0.60 [0.38 - 0.80], confidence: strong
```

**(b) The existing stabiliser test is vacuous.** `multipliers.test.js:93`
applies `hit.consumption -= 5` and runs one tick — but `updateConsumption`
recomputes consumption from scratch, so the shock is discarded and the test's
"absorbed" comes out at exactly 1.0 (`p2.mjs`):

```
  base C after 1 tick 55.500000000
  hit  C after 1 tick 55.500000000   (shock of -5 applied first)
  "absorbed" = 1 - 0.000000000/5 = 1.000000000       assertion: >0.2 and <=1.0  PASS
```

**(c) The austerity paradox is structurally impossible.** With
`tax_revenue = tax_rate + AUTOSTAB_TAX_ELASTICITY*(tax_rate/100)*output_gap`,

```
  d(revenue)/d(tax_rate) = 1 + 1.3*gap/100  ->  negative only when gap < -77%
```

Measured, +3pp of tax into a −7.4% gap raises revenue by **+2.007pp**
(`p3.mjs`). `docs/02` DIAL 3 says "Encode it; it's real and counterintuitive",
and the dial's own help text in `dials.js:28` promises it to the player.

**Which is wrong.** The code, on all three counts.

**Severity: inverts a lesson** (recessions make households richer; austerity
always works) **and breaks a mechanism** (no income–expenditure multiplier).

**The fix.** Market income must be actual output, not potential:

```js
const marketIncome = 100 * (s.output / s.potential_output);   // or 100 + s.output_gap
s.disposable_income = marketIncome - s.tax_revenue + s.transfers;
```

Doing this alone will change the multipliers and the steady state, so it has to
land together with a re-check of `apc_ss` and `test/steady-state.test.js`. It
is the single change with the largest number of downstream fixes attached to it:
it restores the multiplier, gives the stabilisers a shock to absorb, makes the
austerity paradox possible, and gives `docs/02` Self-correction 1 (the price
brake) something to act on.

**The tests.**

```js
test('household income falls when output falls', () => {
  assert.ok(atGap(-4).disposable_income < atGap(0).disposable_income);
});
test('stabilisers absorb 38-80% of a demand shock', () => {
  const a = absorption(); const p = P.AUTO_STABILISER_ABSORPTION;
  assert.ok(a >= p.low && a <= p.high, `absorbed ${a}`);
});
test('raising tax into a deep recession does not raise revenue cleanly', () => {
  assert.ok(revenueChange(-6, +3) < revenueChange(0, +3) * 0.5);
});
```

---

## L5. Unemployment falls three times faster than it rises

**What is wrong.** `docs/02` Asymmetry 2: "unemployment rises faster than it
falls. Firms fire in weeks, hire over quarters. So a hike that overshoots takes
years to undo." `labour.js:15` repeats it. Measured, the reverse is true by a
factor of three.

**Evidence** (`p11.mjs`, symmetric ±3pp demand shocks from a zero gap):

| month | u after −3 demand | u after +3 demand | rise | fall | rise/fall |
|---|---|---|---|---|---|
| 1 | 5.360 | 4.494 | 0.360 | 0.506 | 0.711 |
| 6 | 5.642 | 3.346 | 0.642 | 1.654 | 0.388 |
| 24 | 5.604 | 2.930 | 0.604 | 2.070 | **0.292** |

**Root cause.** `FIRING_SPEED 0.6` vs `HIRING_SPEED 0.25` controls the *speed of
approach*, and that part works — the rise is complete by month 6 while the fall
is still growing at month 24. But the *target* is set by
`target_u = u* − beta*gap`, and `beta` switches at `output_gap < -2.0` from
`OKUN_BETA 0.45` to `OKUN_LABOUR_HOARDING 0.20`. A −3pp shock gets `beta = 0.20`
(target 5.6); a +3pp shock gets `beta = 0.45` (target 3.65). The asymmetric
target overwhelms the asymmetric speed.

**Which is wrong.** Neither, exactly — both switches are separately correct and
sourced. The composition is wrong. Labour hoarding genuinely flattens Okun in a
downturn, and that genuinely means unemployment rises *less* than Okun would
predict; but the model then lets the boom side run at full β with no
counterpart, so an equal-sized boom produces a 3× larger employment swing.

**Severity: inverts a lesson.** "Overshooting a hike takes years to undo" is the
argument for hiking early and gently, and the model teaches that overshooting
is cheap.

**The fix.** Either apply hoarding symmetrically (a labour-hoarding regime that
flattens β in *both* directions, which is what hoarding physically means — you
keep staff *and* you do not immediately hire when demand returns), or move the
asymmetry out of β entirely and into the adjustment speed, which is where the
Davis–Haltiwanger evidence actually lives. Also see L6: the switch is a hard
discontinuity at exactly −2.0 and needs to be a ramp regardless.

**The test.**

```js
test('unemployment rises faster than it falls for a symmetric shock', () => {
  const { rise, fall } = symmetricShock(3, 24);
  assert.ok(rise / fall > 1.0, `rise/fall = ${(rise / fall).toFixed(2)}`);
});
```

---

## L6. Government spending raises unemployment across a 1pp band of starting gaps

**What is wrong.** The labour-hoarding switch is a hard discontinuity at
`output_gap = -2.0`. Stimulus that carries the gap up across it doubles Okun's
β, which raises the target unemployment rate by more than the extra demand
lowers it.

**Evidence** (`p11.mjs`, +1pp of government spending, 24 months):

| starting gap | Δunemployment | Δoutput | β base | β shocked |
|---|---|---|---|---|
| −3.41 | −0.201 | 1.106 | 0.20 | 0.20 |
| −3.21 | −0.201 | 1.107 | 0.20 | 0.20 |
| **−3.01** | **+0.293** | 1.075 | 0.20 | 0.45 |
| −2.81 | +0.270 | 1.000 | 0.20 | 0.45 |
| −2.61 | +0.245 | 0.929 | 0.20 | 0.45 |
| −2.41 | +0.219 | 0.864 | 0.20 | 0.45 |
| −2.21 | +0.191 | 0.804 | 0.20 | 0.45 |
| −2.01 | −0.334 | 0.766 | 0.45 | 0.45 |

**Which is wrong.** The code. The switch is a modelling convenience;
`OKUN_LABOUR_HOARDING`'s note describes a regime, not a step function at a
specific gap.

**Severity: inverts a lesson.** −2% to −3% is the ordinary recession the player
spends most of the game in. In that band the game teaches that fiscal stimulus
costs jobs.

**The fix.** Replace the switch with a smooth blend, e.g.
`beta = lerp(OKUN_BETA, OKUN_LABOUR_HOARDING, clamp(-gap/4, 0, 1))`. Sweep the
whole gap range afterwards, not just the endpoints.

**The test.** A monotonicity sweep, which is the general form of the check this
model most needs:

```js
test('more spending never raises unemployment at any starting gap', () => {
  for (let g = -6; g <= 2; g += 0.2) {
    const d = spendingResponse(g, +1, 24);
    assert.ok(d.dUnemp <= 0, `gap ${g}: +1pp G moved unemployment ${d.dUnemp}`);
  }
});
```

---

## L7. A financial crisis costs almost no jobs, because its demand trough is computed and discarded

**What is wrong.** `crisis.js` computes `s.crisis_drag` — the ~9% peak-to-trough
demand collapse from `CRISIS_OUTPUT_TROUGH` — every tick of a crisis, and
**nothing in the codebase reads it**. The only thing that reaches the rest of
the model is `s.scar`, which cuts *potential* output. Since unemployment tracks
the output *gap*, cutting potential and actual together leaves employment almost
untouched.

**Evidence** (`p4.mjs`, `financial_crisis` fired at month 24):

```
  month  Δoutput  Δpotential  Δgap   Δunemp  Δinfl  crisis_drag  scar
      1   -3.197       0.000 -3.112   0.373 -0.235        8.662 10.271
      2  -12.967     -10.291 -2.892   0.496 -0.241        8.336 10.271
      6  -12.147     -10.355 -1.929   0.708 -0.224        7.151 10.271
     12  -11.880     -10.408 -1.574   0.735 -0.232        5.682 10.271
     24  -11.666     -10.491 -1.241   0.577 -0.218        3.587 10.271
     60  -11.344     -10.655 -0.701   0.323 -0.132        0.902 10.271
```

Peak unemployment cost of THE CRASH: **+0.735pp**. The trough that should be
driving it runs 8.66 → 0.90 and is read by no rule (`grep -rn crisis_drag src`
returns only the write in `crisis.js` and the initialisation in `state.js`).

Related: `recap_promptness` is set to `0` by `events.js` and read by
`crisis.js`, and nothing anywhere can raise it. The "prompt recapitalisation
halves the scar" decision — described in `docs/02` as "what gives the
post-crash phase a real decision instead of just waiting" — has no lever.

**Which is wrong.** The code.

**Severity: inverts a lesson.** The scenario's whole promise is "growth, jobs
and inflation all looked fine right up until now". After the crash, jobs still
look fine, and inflation *falls* by 0.24pp. The crash is a quiet, permanent
haircut rather than a recession.

**The fix.** `crisis_drag` has to enter demand. It is a transitory demand shock,
so it belongs as a term in `aggregateDemand` (or as a negative addition to
`consumption` and `investment` split by their shares), decaying on the existing
`tau`. Add a recapitalisation control — a one-off spending commitment in the
first year that sets `recap_promptness` — or delete `RECAP_RECOVERY_MULTIPLIER`
and say the decision is deferred.

**The test.**

```js
test('a financial crisis produces a recession, not just a haircut', () => {
  const { dUnemp, dGap } = crisisResponse(24);
  assert.ok(dUnemp > 2.0, `crisis raised unemployment only ${dUnemp}pp`);
  assert.ok(dGap < -4.0, `crisis moved the output gap only ${dGap}pp`);
});
```

---

## L8. Cuts are stronger than hikes, not weaker

**What is wrong.** `signAsymmetry` in `kernels.js:26` implements
Tenreyro & Thwaites correctly (cuts at 1/1.5 ≈ 0.67 of a hike) and is called
from exactly one place — `dials.js:78`, on the discarded pipeline path (L1).
What survives is symmetric on impact and then asymmetric in the wrong direction.

**Evidence** (`p2.mjs`, ±1pp from a settled calm baseline):

```
  m= 1  cut 0.347  hike -0.347  |cut|/|hike| = 1.000    (doc says 0.67)
  m= 6  cut 1.118  hike -0.863  |cut|/|hike| = 1.294
  m=12  cut 1.421  hike -1.028  |cut|/|hike| = 1.382
  m=24  cut 2.030  hike -1.305  |cut|/|hike| = 1.555
```

The emergent asymmetry comes from the same two amplifiers as L2: the cut opens
the crowding-in term and pushes unemployment below the wage kink; the hike
closes both.

**Severity: inverts a lesson.** "Pushing on a string versus pulling a rope" is
listed in `docs/00` pass-2 revisions as one of the seven things the research
pass upgraded from folklore to a coefficient. The model teaches the folklore
backwards.

**The fix.** Falls out of L1. Once the pipeline lands, `signAsymmetry` applies.
The emergent counter-asymmetry from crowding-in still needs bounding (L2).

**The test.**

```js
test('a cut is weaker than the equivalent hike', () => {
  const r = Math.abs(cut(1, 12)) / Math.abs(hike(1, 12));
  assert.ok(r < 0.85, `|cut|/|hike| = ${r.toFixed(3)}, expected ~1/1.5`);
});
```

---

# SECTION 2 — Findings that break a mechanism

## M1. 38.8% of shipped 8-year sessions terminate with a thrown accounting error

`events.js` `export_slump` does `s.consumption -= 1.2`. Events fire *after* the
rules, so `aggregateDemand` has already set `s.output_gap` from the old
consumption, and `checkInvariants` — which `session.js:55` runs with
`assertEveryTick: true` — fails on identity 1 immediately.

```
  export_slump then checkInvariants ->
    invariant 'output = C+I+G+NX' violated at tick 6: -1.200000000 != 0.000000000
```

Frequency, 200 seeds per scenario, `run(s, 96, { seed, assertEveryTick: true })`
(`p5.mjs`):

| scenario | sessions ending in a thrown model error |
|---|---|
| calm | 127/200 = **64%** |
| recession | 98/200 = 49% |
| bubble | 93/200 = 47% |
| debt_trap | 73/200 = 37% |
| overheating | 47/200 = 24% |
| stagflation | 27/200 = 14% |
| **overall** | **465/1200 = 38.8%** |

`session.js:56` catches it into `session.error` and stops the clock, so the
player's game ends mid-term with an engine message.

It was never caught because every conservation test passes `events: false`.

**Severity: breaks a mechanism** — arguably worse, since it is a hard stop in
the shipped build. **The invariant is right and must not be relaxed.**

**Fix.** An event that changes a demand component must go through the same route
a dial does, and land before `aggregateDemand` next tick — schedule it, or
apply events *before* the rules rather than after. The shock also currently
evaporates: `C right after the event 54.300000; C after the next tick
55.500000`, because `updateConsumption` overwrites it. Both halves are the same
bug as L1.

**Test.** `test/conservation.test.js`: run 96 ticks with `events: true` across
50 seeds and assert no throw; and one test per event that mutates state, firing
it and then calling `checkInvariants`.

---

## M2. There is no zero lower bound, and the behaviour the brief read as one is the capacity cap

The brief's F6 concluded the ZLB damping "is right — but emergent". It is
neither. The rate transmission carries **no dependence on the level of the
rate**, provably. From a single common state, changing only `policy_rate` and
stepping one tick (`p5.mjs`):

| rate level | Δinvestment, 1 tick | Δoutput, 1 tick |
|---|---|---|
| 10 | 0.084375 | 0.087745 |
| 4 | 0.084375 | 0.087745 |
| 2.5 | 0.084375 | 0.087745 |
| 0 | 0.084375 | 0.087745 |
| −0.5 | 0.084375 | 0.087745 |
| −0.74 | 0.084375 | 0.087745 |

Bit-identical, because `investment.js:35` is
`-investment_share * (INVESTMENT_RATE_ELASTICITY/100) * Δuser_cost`
= `-22.5 × 0.015 × Δr`, linear and level-free.

The real mechanism is `MAX_OVERHEAT = 4.0` in `aggregate.js:24`. Holding the
rate fixed and varying only the gap:

| gap | Δinvestment | Δoutput |
|---|---|---|
| −4 … +3.9 | 0.084375 | 0.087745 |
| +4.2 | 0.084375 | **0** |
| +6 | 0.084375 | **0** |

The brief's F6 numbers (0.499 at 2.5%, 0.035 at −0.5%) came from settled states
whose *gaps* differed: a low fixed rate drives the economy above the +4 cap, so
output stops responding to any demand lever. It correlates with the rate only
because low rates produce hot economies in this model.

The one rate-level switch that does exist — `atELB` in `investment.js:46` —
switches crowding out *off* at the bound, which makes fiscal policy *stronger*
there. That is correct economics and it is the opposite of a ZLB on the rate
lever.

**Fix.** Implement `ZLB_RATE_EFFECTIVENESS` (0, strong confidence — "rate cuts
do almost nothing") as a multiplier on the rate term when
`policy_rate` approaches `SS_ELB`, ramping over roughly the last 0.75pp. Note
this is the parameter `docs/02` calls "the entire reason QE was invented", and
QE is also absent (M7).

**Test.** The table above, as an assertion that the response at −0.5% is under
25% of the response at 4%.

---

## M3. The money block is decorative: M·V ≠ P·Y and nothing reads P, W, M or V

Set `price_level = 1e4`, `wage_level = 1e4`, `money_supply = 1e6`,
`velocity = 9` and run 60 ticks (`p2.mjs`):

```
  variables that differ after 60 ticks: NONE
```

across `output, output_gap, inflation, unemployment, consumption, investment,
govt_debt, asset_prices, credit_spread, approval, credibility,
expected_inflation, private_credit, wage_growth`.

The identity is not closed and drifts (`p6.mjs`, 120 ticks):

```
  money identity  max |M*V - P*Y| = 4.15e+0
  final: M=141.834 V=1.000 MV=141.834   P=122.120 Y=1.1275 PY=137.687
```

`velocity` sits at exactly 1.000 in every normal state — the flight term needs
`expected_inflation > 20`, and the interest term is netted against
`velocity_v0` at the baseline. So `UNKNOWNS['velocity_dynamics']`'s claim that
velocity "is exactly what breaks the naive printing-money-causes-inflation
story" is not true of this implementation. Velocity breaks nothing; the
credibility×slack gate does all of that work.

**Fix — recommendation: delete, do not implement.** Closing `M·V = P·Y` means
either solving `V` residually (making it an accounting artefact with no
behaviour) or letting `M` drive `P` (which is the quantity-theory story the
whole design is built to *refute*). `price_level` has one genuine use — real
versus nominal display, and real debt erosion — but debt erosion is already
handled correctly in the linear convention in `updateBudget`. Keep
`price_level` for display, delete `wage_level`, `money_supply` and `velocity`,
and rewrite the `UNKNOWNS` entry to say the model resolves the question through
credibility and slack rather than through velocity.

If instead the decision is to keep them, they need a live consumer and an
invariant, and `VELOCITY_FLIGHT_THRESHOLD` needs to be reachable.

---

## M4. The fire-sale term — "the crisis engine" — never fires in any scenario

`credit.js:40` gates forced selling on `leverage > leverage_max = 1.35`.
Measured over 96 months in every scenario (`p9.mjs`):

| scenario | max leverage | months with forced selling |
|---|---|---|
| calm | 1.000 | 0 |
| overheating | 0.983 | 0 |
| recession | 0.996 | 0 |
| stagflation | 0.986 | 0 |
| debt_trap | 1.018 | 0 |
| **bubble** | **0.754** | 0 |

The bubble scenario — "THE BEST TEACHING TOOL IN THE SET" — is the *furthest*
from the threshold of any of the six, because `leverage = (credit/credit_ss) /
(assets/fundamental)` and the scenario sets `asset_prices: 160` against
`credit_ss = START.private_credit_gdp = 150` with `private_credit: 156`. Rich
collateral flatters leverage, which the scenario blurb correctly predicts — but
by ~35%, permanently, so the gate is unreachable rather than merely comfortable.

The brief's section E already found the term reads as zero at the steady state.
It is zero everywhere in the playable space.

**Fix.** `leverage_max = 1.35` was chosen against a normalised baseline of 1.0
that scenarios do not start at. Either normalise leverage per-scenario at
`newState` time (so every scenario starts at 1.0 and the threshold means the
same thing everywhere), or express the threshold in terms of the credit gap and
the asset gap directly, which is what the Greenwood–Hanson–Shleifer R-zone
evidence is actually about.

**Test.** A scenario-level assertion that at least one scenario can reach forced
selling within a term under a plausible policy path, plus a unit test that
drives leverage past the threshold and asserts asset prices fall faster than
the mean-reversion term alone would produce.

---

## M5. The doom loop has no forced-selling trigger and bank capital never binds

`BANK_CAPITAL_DELEVER_TRIGGER` is unused. Bank capital enters the model at
exactly one point — `-0.15 * (bank_capital_ratio - 13)` in the credit spread —
and `credit.js:108` rebuilds it toward 13 at `0.02` per month. Measured minimum
over 96 months of the bubble scenario: **13.012**. Banks never cut lending;
`BANK_CAPITAL_TO_LOAN_RATE = 13bp` per 1pp of capital is replaced by an invented
`0.15`.

`credit.js:112` claims "THE DOOM LOOP needs no extra scripting". It does: the
loop as written is spread → investment → output → defaults → spread, with no
quantity channel and no capital constraint, and it is comfortably stable.

**Fix.** Implement the trigger: below `BANK_CAPITAL_TO_GDP`'s regulatory
minimum, banks cut credit supply (a negative term on `credit_growth_annual`),
which is what arms the loop. Replace the `0.15` with
`BANK_CAPITAL_TO_LOAN_RATE / 100`.

---

## M6. The `recession` scenario is never in recession; the `bubble` scenario is visibly overheating

With no player input (`p6.mjs`):

```
  recession    1m: gap  1.1 pi 0.9 u 7.9 | 6m: gap 1.3 pi 1.5 u 4.8 | 12m: gap 1.9 pi 2.3 u 4.2
  bubble       1m: gap  2.4 pi 2.7 u 4.1 | 6m: gap 3.3 pi 3.4 u 3.6 | 48m: gap 3.2 pi 4.7 u 3.6
```

- **recession**: the output gap is *positive from month 1* and unemployment is
  back under 5% by month 6. `scenarios.js:11` states the rule this breaks —
  "A regime also has to be DRIVEN, not asserted" — and then asserts
  `unemployment: 9.0` with a stimulative 0.5% policy rate and nothing producing
  a negative gap. The scenario's trap ("the rate dial is already dead") is
  never tested.
- **bubble**: `regime()` returns OVERHEATING from roughly month 3
  (`inflation > 3.0`), rising to 4.7% by year 4. The scenario's premise —
  "every visible gauge is healthy, only the credit gap is warning you" — is
  false for the most visible gauge on the screen. The scenario comment
  explicitly says the rate starts at neutral *so that* this does not happen.

And under the Taylor benchmark the game scores the player against (`p10.mjs`):

```
  m   creditGap  crisisProb%  assets/fund  inflation  rate
    1       5.92         2.73         1.58       2.69   2.54
   24       5.14         1.25         1.25       2.43   3.66
   48       3.94         0.55         1.11       2.16   2.93
   96       2.03         0.00         1.03       2.01   2.54
```

The bubble deflates on its own if you follow the rule. With no policy it does
not crash either — it reaches hyperinflation around month 72. There is no path
through the bubble scenario on which the credit gap is the binding lesson.

**Fix.** Drive the recession scenario with a negative demand condition (a
`net_exports` or confidence shock, or a lower `investment_share`) rather than
asserting unemployment. For the bubble, the credit boom needs to be able to
*outrun* the monetary response — which is a real property of credit booms and
is what makes macroprudential policy a separate instrument.

**Test.** `test/scenarios.test.js` already checks the accounting identity of
each starting vector; add a regime assertion — each scenario must still be in
its advertised regime after 12 months of no policy, and after 12 months under
the Taylor rule.

---

## M7. Missing mechanisms named in the docs but absent in code

Beyond the brief's list, verified absent by grep and by measurement:

| Mechanism | Named in | Status |
|---|---|---|
| forced bank deleveraging | `docs/02` Part 3 | absent (M5) |
| `business_confidence` | `docs/01` | absent entirely |
| `fiscal_space`, `misery` (derived) | `docs/01` | absent (`misery` exists only as a scoring accumulator in `session.js`) |
| QE as a lever | `docs/02` Part 3 | absent; `QE_TO_YIELD`, `QE_TO_GDP` and the `qe_to_yield` kernel all idle |
| `govt_investment` / `govt_consumption` split | `docs/02` DIAL 4 | absent |
| hysteresis in ordinary recessions | `UNKNOWNS` | absent — `scar` is written only by `crisis.js` |
| crisis demand trough | `docs/02` Part 3 | computed, discarded (L7) |
| income–expenditure multiplier | implied throughout | absent (L4) |
| ZLB effectiveness | `docs/02` Part 3 | absent (M2) |
| energy → CPI derivation | `ENERGY_TO_CPI` | hardcoded `2.4` in `events.js:23` |
| tax → investment | `CORPORATE_TAX_RATE_TO_GDP` | absent; there is only one tax dial |
| currency / exchange-rate channel | `docs/02` DIAL 1 | **correctly absent.** `grep -rniE "currency|exchange|erpt" src` returns nothing outside `params.js`. Decision A5's deferral is clean and complete — no half-references. |

---

## M8. The model is not validated against its own validation targets

`FISCAL_MULT_*` are used in `multipliers.test.js`. The other reduced-form
targets are not checked anywhere. Measured (`p12.mjs`):

| target | literature | model | ratio |
|---|---|---|---|
| `RATE_TO_OUTPUT` (1pp rate, 1 year) | 0.3% [0.2–0.6] | 1.032% | **3.4×** |
| `RATE_TO_INFLATION` (1pp rate) | 0.3pp [0.2–0.4] | 0.115pp | 0.38× |
| `TAX_SHOCK_TO_GDP` (1% of GDP, 2–3 yr) | 2.5% [2–3] | 0.229% | **0.09×** |
| `PERSONAL_TAX_RATE_TO_GDP` (1pp cut, ~3 qtr) | +0.45% | **−0.047%** | wrong sign |

The last one is worth its own line. `PERSONAL_TAX_RATE_TO_GDP`'s note says a
personal tax cut "Moves consumption, not investment". Decomposed (`p13.mjs`):

```
  m   Δoutput   ΔC      ΔI      Δdeficit  Δcrowding-term
   3  -0.1570  0.2039 -0.3512     1.078          -0.3297
   9  -0.0497  0.3379 -0.3604     1.078          -0.3518
  12  -0.0062  0.3878 -0.3582     1.079          -0.3560
  24   0.1257  0.5123 -0.3211     1.096          -0.3618
```

At the calm baseline a tax cut moves *investment more than consumption*, in the
wrong direction, and total output is negative for the first twelve months. The
sign is correct once there is slack (`p14.mjs`: +0.295 at a −3% gap, 6 months),
because the crowding-out term is gated — the same root cause as L2 and L3.

**Fix.** Add `test/validation.test.js` covering every parameter whose unit
string ends in `VALIDATION TARGET`, asserting the model lands inside `[low,
high]`. Per the standing rule, a failure there is a finding to surface, not a
coefficient to move — but right now nothing surfaces it at all.

---

## M9. No impulse response has a peak

`docs/02` Part 5's bracketed numbers are months-to-peak, and `dials.js:19`
promises the player "about a year to move output and TWO to move inflation".
Measured for a +1pp hike (`p11.mjs`):

| month | Δinflation | Δoutput | Δunemployment |
|---|---|---|---|
| 1 | −0.028 | −0.351 | +0.091 |
| 12 | −0.115 | −1.040 | +0.400 |
| 24 | −0.153 | −1.319 | +0.465 |
| 48 | −0.194 | −1.798 | +0.556 |

Monotone throughout; the largest response within 48 months is at month 48. A
*permanent* lever change producing a permanent level shift is defensible, but
then the doc's "months to PEAK effect" table describes something the model
cannot produce, and the pipeline kernels that were supposed to produce those
shapes are the ones L1 discards.

**Fix.** Falls out of L1. Once landed effects survive, the kernel shape governs
the transient. The doc's table should then be re-measured and corrected against
the model rather than the other way round.

---

## M10. `chaos: true` is a no-op, so the "violent policy path" test runs a quiet path

`test/conservation.test.js:19` passes `{ assertEveryTick: true, chaos: true,
events: false }`. `grep -rn chaos src` returns nothing. The test is a duplicate
of the one above it with 96 ticks instead of 200.

**Fix.** Implement `opts.chaos` (a seeded random walk over the four dials
through `applyDialChange`), or delete the flag and write the dial-slamming loop
in the test itself. Given L1 and M1, this test is exactly the one that would
have caught both.

---

## M11. Ten state fields are created lazily, and one of them is live-fragile

Confirmed absent from `newState()` (`p8.mjs`): `mpc_effective`, `market_rate`,
`user_cost`, `okun_beta_effective`, `loan_losses`, `credit_impulse`,
`risk_premium`, `interest_cost`, `fired_event`, `ending_counters`.

The brief asked whether rule ordering makes this safe. **It does not, in one
case.** `updateBondYield` runs at position 19 and reads `s.interest_cost`, which
`updateBudget` writes at position 21:

```
  newState().interest_cost = undefined
  interestShare = undefined/24.75 = NaN     (share > 0.25) -> false
```

The panic term is zero on tick 0 only because `NaN > 0.25` evaluates to false.
Any refactor that flips that comparison, or takes a `Math.max` of it, produces
NaN on tick 0.

The other nine are safe under the current order (`credit_impulse` is explicitly
guarded with `|| 0`; the rest are written before any reader).

**Fix.** Declare all ten in `newState()` with explicit zeros. It costs ten lines
and removes a class of error the project has already been bitten by.

**Test.** `test/determinism.test.js`: assert that every field read by any rule
exists on a fresh `newState()`.

---

## M12. The full producer/consumer graph — 24 cross-tick reads, none documented

Built by static analysis over the 24 rules (`p7-graph.mjs`). Each row is a rule
reading a value that a *later* rule in the same tick overwrites, so it sees last
tick's value:

| # | rule | reads | written later by |
|---|---|---|---|
| 1 | updatePotentialOutput | `investment` | 3. updateInvestment |
| 1 | updatePotentialOutput | `scar` | 22. updateCrisisRecovery |
| 2 | updateConsumption | `unemployment` | 5. updateEmployment |
| 2 | updateConsumption | `disposable_income` | 20. updateAutoStabilisers |
| 2 | updateConsumption | `asset_prices` | 13. updateAssetPrices |
| 2 | updateConsumption | `confidence_residual` | 23. updateConfidence |
| 3 | updateInvestment | `credit_spread` | 16. updateCreditSpread |
| 3 | updateInvestment | `expected_inflation` | 11. updateExpectations |
| 3 | updateInvestment | `output_gap` | 4. aggregateDemand |
| 3 | updateInvestment | `deficit` | 21. updateBudget |
| 6 | updateWages | `expected_inflation` | 11. updateExpectations |
| 6 | updateWages | `inflation` | 10. updateInflation |
| 6 | updateWages | `credibility` | 8. updateMonetisation, 12. updateCredibility |
| 7 | updateMoneySupply | `inflation` | 10. updateInflation |
| 9 | updateVelocity | `expected_inflation` | 11. updateExpectations |
| 10 | updateInflation | `expected_inflation` | 11. updateExpectations |
| 13 | updateAssetPrices | `credit_growth_annual` | 17. updateCreditGap |
| 13 | updateAssetPrices | `leverage` | 14. updateLeverage |
| 14 | updateLeverage | `private_credit` | 17. updateCreditGap |
| 15 | updateDefaults | `private_credit` | 17. updateCreditGap |
| 15 | updateDefaults | `credit_spread` | 16. updateCreditSpread |
| 19 | updateBondYield | `govt_debt` | 21. updateBudget |
| 19 | updateBondYield | `interest_cost` | 21. updateBudget |
| 19 | updateBondYield | `tax_revenue` | 20. updateAutoStabilisers |

Most are a defensible one-month information lag. Three deserve a decision:

- **#4 `updateConsumption` ← `disposable_income`** (the brief's example).
  Defensible — households respond with a lag — but currently accidental. Make it
  explicit: rename the read to `s.disposable_income_lagged` or move
  `updateAutoStabilisers` ahead of `updateConsumption` and add an explicit
  one-month delay. Either way it should be a decision in the docstring.
- **#10 `updateInflation` ← `expected_inflation`.** Correct and important —
  this tick's inflation must use *prior* expectations, or the Phillips curve is
  simultaneous. Worth stating so nobody "fixes" it.
- **#17 `updateAssetPrices` ← `credit_growth_annual`.** Not defensible.
  `excessCredit = max(0, credit_growth_annual[t−1] − (potential_growth +
  inflation[t]))`, and since `credit_growth_annual[t−1] = potential_growth +
  inflation[t−1] + impulse[t−1]`, the "borrowing against rising collateral"
  term is algebraically `max(0, inflation[t−1] − inflation[t] + impulse[t−1])`.
  A one-sided *disinflation* term is riding inside the collateral channel. It
  reads exactly zero at the steady state (`p4.mjs`), which is why nothing has
  noticed. Fix by moving `updateCreditGap` ahead of `updateAssetPrices`, or by
  comparing against the same tick's nominal growth explicitly.

`rules/index.js` should carry this table, or a pointer to it. Its own docstring
also says "23 rules"; `RULES.length` is 24.

---

## M13. Identity coverage

`invariants.js` checks output, budget, debt accumulation and bounds. The three
uncovered identities, measured over 120 ticks (`p6.mjs`):

| identity | max residual | verdict |
|---|---|---|
| capital law of motion `K = (1−δ)K′ + I′` | 5.68e−14 | holds — **add it**, it is free |
| credit stock vs its own flow | 0.00e+0 | holds — **add it**, it is free |
| money identity `M·V = P·Y` | 4.15e+0 | **fails** — see M3 |

Also missing and worth adding: a plausibility band on each demand component
individually (`consumption` in [20, 90], `investment` in [2, 45] — the latter
is already clamped in the rule and so should be asserted, not silently bounded).

---

# SECTION 3 — Idle, cosmetic and hygiene

## Unused parameters — the verdict table the brief asked for

46 of 108 parameters are never read in `src/` (comments stripped). That matches
the brief's count exactly. Verdicts:

| Group | Count | Members | Verdict |
|---|---|---|---|
| **Validation targets** | 16 | `FISCAL_MULT_{EXPANSION,NORMAL,RECESSION}`, `RATE_TO_{OUTPUT,INFLATION}`, `TAX_SHOCK_TO_GDP`, `TAX_MULT_{ACCOMMODATIVE,TIGHT}`, `TRANSFER_MULT_{EXPANSION,RECESSION}`, `GOVT_INVESTMENT_MULT_{IMPACT,MEDIUM}`, `CORPORATE_TAX_RATE_TO_GDP`, `PERSONAL_TAX_RATE_TO_GDP`, `BANK_CAPITAL_TO_GDP`, `AUTO_STABILISER_ABSORPTION` | **Keep, and start using them.** Idle by design is only true if something validates against them; only `FISCAL_MULT_*` does. Add `test/validation.test.js` (M8). Four of the five checked so far fail. |
| **Consumed via `START`** | 10 | `SS_{CREDIT_GDP,DEPRECIATION,K_OVER_Y,LABOUR_SHARE,NAIRU,POLICY_RATE,POTENTIAL_GROWTH,R_STAR,TERM_PREMIUM,YIELD_10Y}` | **Keep, document.** Add a test asserting each `START` field equals its `SS_*` parameter, so the indirection cannot silently break. |
| **Deferred levers, no dial** | 10 | `EDUCATION_RETURN`, `PUBLIC_RD_TO_PRODUCTIVITY`, `HOUSING_SUPPLY_ELASTICITY`, `IMMIGRATION_{SUBSTITUTION_ELASTICITY,WAGE_EFFECT}`, `MIN_WAGE_{BITE_THRESHOLD,OWN_WAGE_ELASTICITY}`, `TARIFF_{PASSTHROUGH,TO_GDP}`, `VAT_TO_CPI` | **Keep, flag.** Add a `deferred: true` field in `parameters.py` and have `gen_params.py` emit it. |
| **Open economy, deferred by A5** | 2 | `ERPT_CPI`, `ERPT_IMPORT_PRICES` | **Keep, flag deferred.** The deferral is clean (M7). |
| **Missing mechanisms** | 8 | `ZLB_RATE_EFFECTIVENESS`, `AUTOSTAB_TAX_LAG`, `AUTOSTAB_BENEFIT_LAG`, `BANK_CAPITAL_DELEVER_TRIGGER`, `BANK_CAPITAL_TO_LOAN_RATE`, `QE_TO_YIELD`, `QE_TO_GDP`, `ENERGY_TO_CPI` | **Implement.** Each is a mechanism, not a number: M2, L1/stabiliser lags, M5, M5, QE (M7), and `events.js`'s hardcoded 2.4. |

Also idle in effect though not by the grep: `MONETARY_ASYMMETRY_RATIO` is read
only by `signAsymmetry`, which is called only from the discarded pipeline path
(L8).

Seventeen of the 21 declared kernel channels are never scheduled at all; the
other four are scheduled and discarded.

## Parameters used in a way their unit does not support

The brief's one exception to "do not re-research parameters". Two cases:

1. **`WEALTH_EFFECT = 0.04`, unit "cents of consumption per $1 of housing
   wealth".** `consumption.js:36` applies it to `(asset_prices −
   asset_fundamental)`, which is a difference in *index points*, and the result
   is read as *percent of potential output*. A 20-point rise in the index
   becomes +0.80pp of GDP of consumption (`p5.mjs`). The correct application of
   a 4c/$1 MPC to a 20% rise in an asset stock worth ~5× GDP would be ~4% of
   GDP. The number happens to land in a plausible band, but by coincidence: the
   unit conversion is missing, and a future change to the index scale would move
   the wealth effect by the same factor with nothing to catch it.
2. **`AUTOSTAB_BENEFIT_ELASTICITY = −3`, unit "elasticity of
   unemployment-benefit spending to the number unemployed".** Benefit spending
   *rises* when unemployment rises, so the elasticity is positive; the stored
   value is negative and `fiscal.js:81` negates it back
   (`-P.AUTOSTAB_BENEFIT_ELASTICITY.value * 0.1 * extraUnemployed`). Two
   compensating sign errors, plus an invented `0.1` that converts an elasticity
   into a level coefficient with no derivation.

## Double counting (section C of the brief)

- **The credit spread hits investment twice, in the same function.**
  `investment.js` has `d(rateTerm)/d(spread) = −22.5 × 0.015 = −0.3375` through
  `user_cost`, *plus* `finance = −FINANCIAL_ACCELERATOR_STRENGTH × (spread −
  spread_ss) = −0.30`. The same regressor with two coefficients; the accelerator
  adds **89%** on top of the user-cost channel. In BGG the external finance
  premium *is* the spread, so this is one channel counted twice. Note the
  parameter's own warning: "DO NOT code a large output multiplier here".
- **Asset prices reach demand through three routes.** A pure +20 asset shock,
  nothing else changed (`p5.mjs`): `ΔC +0.80` (wealth effect), `ΔI +0.60`
  (through the collateral term in the spread → user cost → investment, twice
  over per the point above), and `Δprivate_credit +1.15` at 24 months, which
  feeds back into asset prices via `ASSET_PRICE_CREDIT_CHANNEL`. Total output
  response **+1.13pp for a 20% asset move**, against a doc that says the
  accelerator should be "relatively minor for total output".
- **The confidence residual adds nothing.** Measured at exactly 0.0 in steady
  state and −0.0236 in the recession scenario, contributing **−0.0024pp** to
  consumption. Not a double count — a rounding error. Either delete the channel
  or state in the docstring that it is numerically inert by design.

## Fields written and read by nothing

`crisis_drag` (L7), `risk_premium`, `mpc_effective`, `okun_beta_effective`,
`labour_productivity`, `wage_level`, plus `price_level`, `money_supply` and
`velocity` (M3). `mpc_effective`, `okun_beta_effective` and `risk_premium` are
plausibly wanted by the `why` panel — if so, wire them; if not, delete them.

## Behaviour away from the steady state (section E)

Full-range sweeps, 96 months, dial moved at month 12 (`p6.mjs`, `p9.mjs`,
`p10.mjs`). Endings are on in the version that matters, and **every extreme
setting terminates in a named ending rather than a numerical blowup** — that
part works:

| dial | value | outcome |
|---|---|---|
| policy_rate | 0 / 1 | hyperinflation @ m62 / m86 |
| policy_rate | 6 / 8 / 12 / 20 | debt_crisis @ m93 / m69 / m49 / m35 |
| govt_spending | 26 / 30 / 70 | hyperinflation @ m63 / m37 / m25 |
| money_printed | 3 / 5 / 15 | hyperinflation @ m94 / m62 / m31 |
| tax_rate | 10 / 70 | debt_crisis @ m39 / voted_out @ m18 |

With endings *off* the model reaches `Infinity` in `govt_debt` at policy rates
≥ 8, so the endings are load-bearing for numerical sanity, not only for
narrative. That is a design decision worth writing down.

The gradient near neutral is very steep. Eight-year inflation as a function of a
permanent rate setting:

| rate | 2.0 | 1.9 | 1.8 | 1.7 | 1.6 | 1.5 | 1.4 | 1.35 | 1.31 | 1.25 |
|---|---|---|---|---|---|---|---|---|---|---|
| inflation @96m | 3.17 | 3.45 | 3.76 | 4.10 | 4.58 | 5.44 | 9.17 | 15.23 | 24.39 | 43.94 |

The hyperinflation ending crosses at **1.3071%**, 1.19pp below neutral — five
dial steps. This is the Taylor principle biting with a fixed nominal rate, which
is correct economics and is documented as intended in `autopilot.js`. What is
not documented is how little warning the player gets: the inflation gauge reads
4.6% at rate 1.6 and 43.9% at rate 1.25, a difference of just over one dial
step in the region where the reading still looks survivable. That is a
legibility decision, not a bug — but it should be a decision.

Non-monotonicities found and their causes:

- **`Δunemployment` flips sign** for +1pp of spending across gaps −3.0 to −2.2
  (L6, the Okun switch).
- **The fiscal multiplier is U-shaped in the gap**, not monotone: 1.11 at −4,
  dipping to 0.77 at −2 and 0.72 at −1.1, back to 0.97 at 0 (L2's crowding gate
  colliding with the Okun switch).
- **The output response dies at exactly `output_gap = +4`** (M2, `MAX_OVERHEAT`).
  This is also where `docs/02`'s "IF output_gap ≥ 0: output flat, prices ↑"
  actually happens — at +4, not at 0. Measured:

  | gap set | output/potential − 1 | inflation |
  |---|---|---|
  | 0 | 0.000% | 2.00 |
  | +3 | 3.00% | 3.91 |
  | +5.9 | **4.00%** | 6.93 |
  | +19.6 | **4.00%** | 36.38 |
  | +50.1 | **4.00%** | 129.42 |

## Answers to the brief's seeded findings

| | Verdict |
|---|---|
| **F1** 46 unused parameters | **Confirmed**, count exact. Verdict table above. |
| **F2** `price_level`/`wage_level` dead; is `M·V=P·Y` enforced? | **Confirmed and extended.** `money_supply` and `velocity` are dead too; the identity is not enforced and drifts to 4.15. Recommendation: delete rather than implement (M3). |
| **F3** ten lazily-created fields | **Confirmed.** The ordering is safe for nine; `interest_cost` is read on tick 0 as `undefined` and survives only because `NaN > 0.25` is false (M11). |
| **F4** three sign anomalies | **Partly refuted.** The tax→assets moves are numerical residue (+0.059 and +0.027 on an index of 100), not a channel with a sign — the doc's tax→assets arrow does not exist in code at all. `print UP → output +` is **confirmed and much worse than the brief suggests**: it is the whole of L3. |
| **F5** the conditional lives in prices, not the output/prices split | **Confirmed, and now measured at realistic gaps.** For spending the output response stays in a 0.72–1.11 band from a −6% gap to +1.5% while the inflation response varies ~5× (0.091 → 0.665). It is not visible at −2% to −4% in the way the doc describes; the real switch is the +4 capacity cap. For the *rate* the conditional is not merely absent but inverted (L2). |
| **F6** the ZLB damping is emergent but right | **Refuted.** There is no rate-level dependence anywhere — the response is bit-identical from 10% to −0.74%. The brief's measurement was picking up `MAX_OVERHEAT` (M2). |

## Per-dial transmission completeness (section A)

`✓` implemented with the right sign; `~` present but wrong shape, lag or
magnitude; `✗` absent.

### Rate

| Chain (docs/02 DIAL 1–2) | | Where / note |
|---|---|---|
| `→ market_rate` | ✓ | `investment.js:28`, instant |
| `→ bond_yield → interest_cost` | ✓ | `fiscal.js:26-49`, `fiscal.js:101` |
| `→ asset_prices [1m]` | ~ | `credit.js:32` — a permanent *growth-rate* shift, not a 1-month level shift; +0.38%/mo for a 1pp cut, still climbing at month 12. No kernel. |
| `→ currency → import prices` | ✗ | Deliberate (A5), and clean |
| `→ investment [4m, peak 9m]` | ~ | Instantaneous. Scheduled kernel discarded (L1) |
| `→ household borrowing [3m]` | ~ | Not a separate chain; continuous via `credit_impulse` |
| `→ wealth effect → consumption [2m]` | ✓ | `consumption.js:36`, 1-tick lag |
| `→ defaults [6m]` | ~ | Instant, via DSR; no lag |
| `→ bank losses → spread → lending ⟲` | ~ | Spread rises; no lending cut, capital never binds (M5) |
| `→ hiring_momentum ↓ → firing [6–9m]` | ~ | Speed right, magnitude inverted (L5) |
| `→ inflation [peak 24m]` | ~ | No peak; 0.115pp at 12m vs 0.3 target (M8, M9) |
| cut = 1/1.5 × hike | ✗ | Inverted, 1.38× (L8) |
| ZLB | ✗ | Absent (M2) |

### Tax

| Chain | | Where / note |
|---|---|---|
| `disposable income → consumption [3m]`, MPC 0.22→0.40 | ✓ | `consumption.js`, state-dependent MPC works |
| `→ tax_revenue → deficit → debt [1m]` | ✓ | `fiscal.js` |
| `→ bond_yield (~3bp/1pp)` | ✓ | `fiscal.js:30` |
| `→ crowding out, ~33c, ≈0 under slack/ELB` | ~ | Implemented — and dominates the dial, flipping its sign for 12 months at zero gap (M8) |
| austerity paradox | ✗ | Structurally impossible (L4) |
| personal rate moves C not I | ✗ | Inverted: ΔI −0.36 vs ΔC +0.34 at 9m |

### Spend

| Chain | | Where / note |
|---|---|---|
| `→ demand ↑ immediately [0–1m]` | ✓ | `govt_purchases` in `aggregate.js` |
| `→ income ↑ → consumption [3m]` | ✗ | Scheduled and discarded (L1); and no income channel exists to carry it (L4) |
| `→ employment ↑` | ✓ | with the −2.0 discontinuity (L6) |
| `→ deficit → debt → yield → crowding out` | ✓ | |
| `govt_investment` vs `govt_consumption` | ✗ | Not built |

### Print

| Chain | | Where / note |
|---|---|---|
| financing choice, debt does not rise | ~ | Cuts the deficit, but funds nothing — `Δgovt_purchases = 0.000` |
| `→ money_supply ↑` | ~ | Written; read by nothing (M3) |
| slack → mostly nothing | ✗ | Inverted (L3) |
| no slack → prices ↑ hard | ~ | Prices rise, but through the gap, not through money |
| `→ expected_inflation → velocity ⟲` | ✗ | Velocity is inert; threshold unreachable |
| `→ credibility ↓` | ✓ | `money.js:91` |

## One thing that works exactly as designed

Credibility. Hiking into 6% inflation from a 1% rate (`p11.mjs`):

```
  m   inflation  credibility  unemployment  approval
   1       5.69       0.4220          4.43      60.9
   6       4.30       0.3780          5.56      59.1
  24       2.76       0.4242          5.88      59.2
  48       1.50       0.4976          5.63      60.6
```

Credibility falls while the disinflation is being paid for and rebuilds slowly
afterwards, never fully recovering inside four years. That is the 3:1 asymmetry
working, and it is the opposite of the prototype's defect 3 ("beating inflation
destroys your credibility" — here it damages it, temporarily, and then it
repairs). The signed-miss fix in `prices.js:105` holds up.

---

# Post-audit revisions — what changes the design

In the style of `00-design-brief.md`. Six things, and the reasoning.

**1. The lag pipeline is either the model's spine or it is a decoration, and
right now it is a decoration.** This is the largest single finding and it is
not primarily an economics bug — it is an architecture bug with economic
consequences. The design decision to make: does policy transmission live in the
kernels (declarative, visible in the pipeline panel, matching the doc's
months-to-peak table) or in the contemporaneous rule terms (currently the case,
undocumented, instant)? Both is not an option; adding them double-counts. The
recommendation is **kernels**, because the lag panel is the mechanic the design
brief singles out as the thing that makes the game teach rather than merely
simulate, and because the alternative means rewriting `docs/02` Part 5, the
dial help text, and the pipeline widget's reason for existing.

**2. The crowding-out term is load-bearing and should not be.** It is currently
the only structural amplifier attached to any demand lever, and because it is
gated on the absence of slack it single-handedly inverts three of the game's
central conditionals (rate cuts, printing, tax cuts). `CROWDING_OUT`'s own note
says the channel is "commonly overstated in public argument"; in this model it
is the dominant channel. The fix is not to shrink the coefficient — the value is
sourced. The fix is to give the demand block the multiplier it is missing
(revision 3) so crowding out is one term among several rather than the only one.

**3. Household income must depend on output.** `disposable_income = 100 −
tax + transfers` is a one-line simplification with the widest blast radius of
anything found: no income–expenditure multiplier, stabiliser absorption at 0.15
against a strong-confidence target of 0.60, an austerity paradox that is
algebraically impossible, no price brake, and a recession in which households
get richer. Changing it will move the steady state and the multipliers and will
require `apc_ss` and `test/steady-state.test.js` to be re-derived. It should be
done as its own pass, before anything else in this list is tuned, because
every multiplier measured in this report will change when it lands.

**4. A crash has to hurt in the labour market, or the credit gap is not worth
watching.** The permanent scar is implemented and correct; the transitory
trough is computed and thrown away, so a financial crisis costs 0.7pp of
unemployment. Combined with the fire-sale term being unreachable in every
scenario (M4) and the doom loop having no forced-selling trigger (M5), the
entire crash chain — the thing `docs/02` Part 3 spends the most words on — is
currently a one-off level cut to potential output. This is the finding that most
directly undermines what the bubble scenario is for.

**5. Scenarios need an acceptance test on their own premise, not just on their
accounting.** `test/scenarios.test.js` verifies each starting vector satisfies
the budget identity, which is why the recession scenario passes while never
being in recession and the bubble scenario passes while visibly overheating from
month three. A scenario is a claim about what the player will see; it should be
tested as one. The rule `scenarios.js` already states — "A regime also has to be
DRIVEN, not asserted" — is right and is not enforced.

**6. The endings are load-bearing for numerical stability, and that should be
written down rather than discovered.** With endings on, every extreme dial
setting terminates in a named lesson. With them off, `govt_debt` reaches
`Infinity`. `endings.js` says the endings turn a blowup into a lesson; what the
sweep shows is stronger — they are the model's only upper bound in a large part
of the state space. Any headless analysis that disables endings is running an
unbounded system, which is worth a warning in `engine.js`.

**And one thing not to change.** The steep gradient below the neutral rate — 8-
year inflation going from 4.6% to 43.9% across roughly one dial step — is the
Taylor principle, and it is correct. It is unforgiving, and the temptation will
be to soften it. The honest fix is legibility, not damping: the model knows it
is on a divergent path long before the inflation gauge shows it, and the regime
plot's trail (`docs/02` Part 4) is the right place to say so.
