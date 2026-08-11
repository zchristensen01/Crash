# 13 — FOURTH AUDIT BRIEF

You are taking over CRASH, a browser-based macroeconomic sandbox: 96 monthly ticks,
five policy dials, 23 rules whose order IS the causal order, 126 sourced parameters,
one self-contained index.html, no dependencies.

This brief supersedes the unsent third brief. It folds in three things:
  (i)  what the third pass (`docs/12`) actually landed, and what it did not;
  (ii) what `TEST-RESULTS.md` says, re-read against the code;
  (iii) **a re-diagnosis of the headline finding, which is misattributed.**

READ FIRST, IN THIS ORDER
  docs/12-third-audit.md            what the last pass changed and what it left open
  TEST-RESULTS.md                   11 OPEN disagreements, 4 failed historical episodes
  docs/10-state-of-the-project.md   (STALE — `docs/12` never updated it. Read with care.)
  docs/11-cause-and-effect.md       what every input measurably does
  docs/00-design-brief.md           what the game must teach
  docs/02-causal-map.md             the chains it is meant to contain
  parameters.py                     126 coefficients, each with range/confidence/citation
  src/rules/index.js                the rule order

Then run: `npm test`, `npm run demo bubble 42 taylor`, `node tools/cause-effect.mjs`,
`node tools/report.mjs`.

GROUND RULES. Each has been broken before and cost a rewrite.
 1. MEASURE, DON'T READ. Never "the code appears to" — run it and say what it did.
 2. STATE DEPENDENCE NEEDS TWO MEASUREMENTS. Sweep ranges.
 3. NEVER TUNE TO A TARGET. A disagreement with the literature is a finding to
    surface, not a coefficient to move.
 4. A REDUCED FORM IS NOT A STRUCTURAL INPUT. **Section A1 below is a live
    violation of this rule and it is the largest defect in the model.**
 5. NEVER RELAX AN INVARIANT.
 6. A REGIME MUST BE DRIVEN, NOT ASSERTED. **Section A4 is the mirror image:
    a LOSS is asserted in a comment rather than diagnosed.**
 7. A DIAL ONLY MOVES THROUGH applyDialChange.
 8. Anything you add needs a parameter with range, confidence and source, or an
    explicit `judgement` label.

---

## HOW THE FINDINGS BELOW WERE PRODUCED, AND WHAT THAT MEANS FOR TRUST

Everything in Sections A and B was **measured**, by reconstructing the module tree
and driving the model headlessly with `events:false, endings:false,
assertEveryTick:false, seed 1`, scenario overrides applied through
`newState(SCENARIOS[k].overrides)` and dials moved through `applyDialChange`.

Part 0 reproduces exactly: 200 calm ticks leave `output_gap 0.000000000`,
`inflation 2.000000000`, `unemployment 5.000000000`, `govt_debt 100.000000000`,
`credit_to_gdp_gap 0.000000000`.

Sections C onward are **read**, not measured, and are flagged as such. Reproduce
before acting on any of them.

---

# SECTION A — THE HEADLINE FINDING IS MISATTRIBUTED. THIS IS THE WHOLE PASS.

`docs/12` and `TEST-RESULTS.md` both lead with:

> The model does not disinflate gradually. It either stabilises or diverges, with a
> two-percentage-point knife-edge between them and nothing in between. THE MECHANISM:
> demand responds to the REAL user cost, expectations are formed entirely from
> realised inflation, and the transmitted rate takes about three years to arrive […]
> The absence of a forward-looking expectations channel […] is the next piece of work.

**Half of that is right and the conclusion drawn from it is wrong.** The
Taylor-principle instability under a *pegged* nominal rate is correct economics and
must not be "fixed". But the *knife-edge*, the *2pp width*, and the *hyperinflationary
magnitudes* are not properties of the expectations block. They are produced by four
specific, separable defects, each of which is measurable and fixable, and none of
which is an expectations channel.

**Decomposition. From 8% inflation and 7% expected, rate moved in one step,
inflation at month 60:**

| policy rate | as built | instant rate transmission | no wealth channel | both |
|---|---|---|---|---|
| 5% | 555.73 | 346.89 | 126.43 | **72.68** |
| 6% | 443.10 | 145.22 | 108.42 | **16.80** |
| 7% | **326.00** | **2.74** | 76.89 | **3.92** |
| 8% | 136.50 | −0.73 | 32.87 | **1.74** |
| 9% | **1.76** | −4.00 | 5.50 | **0.14** |
| 10% | −1.54 | −4.00 | 2.48 | −1.13 |
| 12% | −4.00 | −4.00 | −0.61 | −3.16 |

Read the last column. **72.68 → 16.80 → 3.92 → 1.74 → 0.14 → −1.13 → −3.16 is a
response curve.** It is monotone, smooth, and has no knife-edge anywhere in it. The
bifurcation is not in the model's economics; it is in two of its implementation
choices, and removing either one alone already halves it.

Repro: build the harness described above, then

```
for r in 5 6 7 8 9 10 12: run 60 ticks from
  {inflation:8, expected_inflation:7, credibility:0.5, policy_rate:2.5, yield_10y:3.25}
  arm 1: applyDialChange(policy_rate → r) at m0
  arm 2: set policy_rate = policy_rate_demand = policy_rate_markets = r at m0
  arm 3: arm 1 with P.WEALTH_EFFECT.value = 0
  arm 4: arm 2 with P.WEALTH_EFFECT.value = 0
```

---

## A1. THE TRANSMISSION LAG IS ON THE RATE, NOT ON THE RESPONSE, AND THE KERNEL IT USES IS A REDUCED FORM. *** START HERE ***

`game/dials.js:132` — `pipeline.schedule('policy_rate_demand', delta, 'rate_to_investment', …)`

`LAGS_MONTHS.rate_to_investment = 9`, sourced in `parameters.py:1276` to
*"SVAR mediation (arXiv 2509.05284); Bauer-Swanson"* — i.e. it is **the estimated
impulse response of investment to a monetary shock**. That is the response of a
quantity to a rate. The code uses it as the lag on **the rate itself**, and then
`updateInvestment` converts that already-lagged rate into an investment response,
which then passes through the multiplier, the capital stock and potential output.

**The kernel's mean lag is 14.74 months** (cumulative 0.477 by m12, 0.858 by m24).
So the model convolves a 14.7-month lag with the investment equation, and `docs/12`
L4 measured the consequence without naming it: output peaks at 17 months where the
doc says 12, and `docs/12` concluded *the doc table was wrong*. The doc table is a
reduced form and should not be imposed — that part is right — but the reason the
model produces 17 is that it is applying a reduced form twice. **This is rule 4,
live, in the busiest channel in the model.**

**Three consequences, all of them large:**

**(a) The real rate the economy feels is stale by more than a year, while
expectations are current.** That is precisely the wedge `docs/12` diagnosed as an
expectations defect. It is not. In reality a borrower's rate reprices off today's
policy rate within weeks; the lag is in the *spending decision*, not in the *price of
credit*. The model has put the lag on the price.

**(b) It moves the knife-edge by two full percentage points.** With the rate felt
instantly, the stabilising threshold sits between 6% and 7% — i.e. at
`expected_inflation + neutral_real`, exactly where the Fisher arithmetic says it
should. As built it sits between 8% and 9%, because the player must overshoot by
~2pp to compensate for a year in which the economy feels nothing while expectations
keep climbing. **The "2pp knife-edge" IS the mean lag, converted into policy space.**

**(c) It is why a Taylor rule cannot stabilise `stagflation`.** See A2–A4.

**FIX SHAPE, and it is a modelling decision, not a keystroke.** Do not simply delete
the lag — `docs/07` L1 built the transmitted-driver discipline for good reason and it
must survive. The shape that respects it:

- `policy_rate_demand` becomes a **fast** driver — a bank pass-through kernel of
  roughly one quarter, which is what the pass-through literature actually measures
  (ECB/BIS retail rate pass-through; new lending reprices in 1–3 months, the stock
  more slowly, which is a *separate* parameter and connects to the private-maturity
  OPEN in `TEST-RESULTS.md` #11).
- The 9-month `rate_to_investment` response moves to where it belongs: a new
  PIPELINE_TARGET carrying the *investment impulse*, which `updateInvestment` **adds**
  and never assigns. Adding rather than assigning is what keeps `docs/07` L1 closed.
- New parameter with range, confidence and source: `RATE_PASSTHROUGH_TO_BORROWERS`
  (months). Do not invent it — cite the pass-through literature.

**ACCEPTANCE.** Re-run the A-table above. The last column must be reproduced by the
model itself: monotone, no step greater than ~1pp of inflation per 1pp of policy
across 5–12%. Then re-run the four episodes; #2, #3, #4 and #5 in `TEST-RESULTS.md`
all sit downstream of this.

---

## A2. THE POLICY RATE DIAL'S CEILING IS BELOW THE RATE THE MODEL'S OWN AUTOPILOT ASKS FOR

`game/dials.js:16` — `max: 20`.
`game/autopilot.js:34` — `return clamp(smoothed, P.SS_ELB.value, 25)`.

`applyDialChange` then clamps to the dial's own max. **So the Taylor rule silently
asks for up to 25% and can never get more than 20%, and nothing anywhere reports that
it was truncated.**

Measured, `stagflation` with the Taylor autopilot on:

```
 mo |    pi |    Eπ |  dial | felt  | REAL FELT | gap
 12 | 23.84 | 23.29 | 20.00 |  8.78 |    -14.50 |  +2.19
 24 | 35.30 | 34.62 | 20.00 | 16.21 |    -18.41 |  +7.83
 36 | 96.33 | 91.56 | 20.00 | 19.16 |    -72.40 | +36.12
```

The dial pegs at its maximum in month 12 and stays there. **Once expected inflation
exceeds ~19%, no setting of the rate dial can produce a positive real rate, so the
game is unwinnable — not by design, but by a UI bound.** Volcker reached 20% against
~14% CPI; the model can generate 24% inflation inside a year, and then hands the
player a dial that cannot answer it.

**FIX:** raise the dial ceiling, and derive the number rather than picking it — the
binding constraint is `max_expected_inflation + a positive real rate`. Note the
interaction: if A1 lands, the required ceiling falls sharply, so **do A1 first and
re-measure before choosing.** Add an assertion that `taylorRate`'s internal clamp is
never tighter than the dial's, in either direction, so this cannot recur silently.

---

## A3. THREE MULTIPLICATIVE DELAYS SIT BETWEEN INFLATION AND THE REAL RATE, WHERE THE LITERATURE HAS ONE

`TAYLOR_SMOOTHING = 0.85` (dial closes 15% of the gap to desired per month,
half-life ~4.3 months) stacks on top of A1's 14.7-month kernel, which stacks on top of
A2's ceiling. Measured attribution, `stagflation`, Taylor autopilot, inflation at
month 48:

| configuration | inflation @ m48 | output gap | real rate felt |
|---|---|---|---|
| as built (Taylor 0.5, ρ 0.85, dial max 20) | **242.34** | +96.0 | −213.1 |
| + dial max raised to 40 | 139.12 | +49.3 | −108.5 |
| + `TAYLOR_INFLATION` 1.5 instead of 0.5 | 137.86 | +50.7 | −112.0 |
| + no smoothing (ρ = 0) | 37.84 | +8.7 | −16.5 |
| + no smoothing AND dial max 40 | **5.14** | −6.2 | **+5.8** |
| INSTANT transmission only (ρ 0.85, max 20) | **7.32** | −4.4 | **+2.6** |

Two readings, both worth having:

- **`stagflation` is winnable by a rule-following central bank.** Either fixing A1,
  or fixing A2 and A3 together, stabilises it. As built it is not.
- **Raising `TAYLOR_INFLATION` from 0.5 to 1.5 barely helps** (242 → 138, still
  divergent) while removing the *smoothing* takes it to 38 and removing the *lag*
  takes it to 7. That is the proof that the problem is delay, not gain. Do not
  reach for the coefficient.

**The Taylor principle is satisfied on the dial (1 + 0.5 = 1.5) and violated in
transmission.** Measured: between months 3 and 12 inflation rises 9.92pp while the
felt rate rises 3.67pp — an effective response of **0.37**, far below unity. State
that number in `docs/02` and in `parameters.py`'s `TAYLOR_INFLATION` note; it is the
most important single fact about this model's dynamics and nothing currently records it.

---

## A4. THE AUTOPILOT ASSERTS ITS OWN LOSS INSTEAD OF DIAGNOSING IT

`game/autopilot.js:14` — *"It demonstrates the rule is not magic. It still loses the
stagflation scenario, because no rule handles a supply shock well."*

A Taylor rule handles a one-off supply shock adequately in every standard model. It
loses here for the mechanical reasons in A1–A3, and A3's table shows it wins the
moment any one of them is relaxed. **Rule 6 says a regime must be driven, not
asserted. This is the same error pointing the other way: a defeat has been written
into a comment and read back as a design property.** That comment has been protecting
the defect. Delete it or replace it with the measurement.

---

# SECTION B — THE ASSET–CREDIT LOOP HAS GAIN ABOVE ONE AND THE MODEL HAS NO EQUILIBRIUM ANYWHERE EXCEPT EXACTLY NEUTRAL

This is the amplifier in Section A's table, and it is a second, independent defect.

## B1. A permanent 1pp rate cut has no steady state

Repro: `calm`, `applyDialChange(policy_rate → 1.5)` at m0, nothing else, run long.

| | asset/fundamental | credit gap | credit impulse |
|---|---|---|---|
| m96 | 1.380 | +9.97 | 1.675 |
| m180 | 1.656 | +21.13 | — |
| m240 | 1.861 | +29.41 | 3.140 |
| m360 | **356,566** | — | — |
| m480 | 2.9 × 10¹¹ | +647.89 | 6.0 × 10¹¹ |

A **2pp** cut diverges by month ~180. Inside the 96-month term it looks like good
teaching (cheap money → credit boom → 6.5%/yr crisis probability, and that part is
genuinely nice). Outside it, there is no equilibrium at all.

**Isolated.** Setting `ASSET_PRICE_CREDIT_CHANNEL = 0` makes it bounded: credit gap
peaks and returns (+18.48 at m240, −7.41 at m480), asset/fundamental settles at 1.40.
So the divergence is specifically the **credit → collateral → credit** loop:
`updateAssetPrices`'s `collateral = ASSET_PRICE_CREDIT_CHANNEL * excessCredit`
multiplied by `updateCreditGap`'s `collateralFeedback = 0.02 * (asset/fundamental − 1) * 100`.

`credit.js:200` is honest that this is a tuning dial — *"their product is the gain of
the bubble loop, and it has no balancing counterpart — that is the whole point of
it"* — but it is calibrated **above one**, not merely high. And `credit.js:218`'s
claim that the EMA prevents ratcheting (*"Without this the impulse integrates and
credit/GDP has no finite equilibrium under any sustained policy"*) is false as
written: the EMA smooths the impulse but `credit_growth_annual = nominalGrowth +
impulse`, so `private_credit`/GDP still integrates it. **The comment describes a
guard that is not there.**

## B2. The asset-price semi-elasticity is applied as a growth rate, and the model delivers 4× its own sourced parameter

`ASSET_PRICE_RATE_SEMIELAST_EQUITY` (4) and `_HOUSING` (5) blend to **4.6% of asset
price per pp of real rate** — a *level* semi-elasticity, which is what the cited
literature estimates. `updateAssetPrices` applies it as
`discount = annualToMonthlyFlow(-A * (realRate - neutral))`, i.e. as a **persistent
growth rate**. The only level anchor is
`reversion = -ASSET_PRICE_MEANREVERSION * 100 * log(A/F)`, and solving
`0.02·100·ln(A/F) = 4.6·Δr/12` gives an equilibrium level response of **19.2% per pp**.

Measured, permanent 1pp cut, asset index vs an untouched baseline:

```
m12  +4.1%     m24  +8.6%     m48 +18.2%     m96 +38.0%     m180 +65.6%
```

The sourced number is 4.6%. The model reaches it at month 12 and then keeps going.
**This is the same unit-error class `docs/07` already caught once in this exact
channel** — the note in `consumption.js:37` records WEALTH_EFFECT being applied to
index points with the conversion missing, "right only by coincidence". Same channel,
one level up, still open.

## B3. Consumption is unbounded, and in a spiral it is ~100% wealth effect

`updateInvestment` clamps investment to `[2, 45]` with an explicit note that no
economy invests more than ~45% of output. `updateConsumption` has **no bound at all**.

Measured, `overheating`, no player input:

```
mo | gap    | C      | I     | assets | market income | disposable income | inflation
12 |   2.79 |  56.75 | 24.04 |    123 |         102.8 |              79.8 |     6.60
24 |   7.03 |  58.90 | 26.13 |    171 |         104.0 |              79.5 |    14.50
36 |  30.80 |  69.85 | 38.95 |    524 |         104.0 |              72.2 |    64.45
48 |  86.10 | 119.10 | 45.00 |   2041 |         104.0 |              56.3 |   187.41
60 | 282.80 | 315.80 | 45.00 |   7953 |         104.0 |               4.2 |   492.98
```

Households consume **315% of potential output while their disposable income is 4.2**.
Every penny of it is the wealth term. `MAX_CAPACITY_OVERHEAT` correctly caps `output`
but `output_gap` is deliberately uncapped so the excess spills into prices — which is
right — and the result is `kappa · 282.8` entering `updateInflation` every month.

**`WEALTH_EFFECT = 0` takes `overheating` from 493% inflation at m60 to 87%, and the
gap from +283 to +20.** The wealth channel is the divergence engine, not the
expectations block.

## B4. The +12%/month clamp on asset growth is not a bound

`credit.js:83` — `boundedG = clamp(gPct, -30, 12)`, with a note saying the model
"must spiral legibly". A clamp on the *rate of change* of a *compounding level* is a
growth floor in a spiral, not a bound: 1.12⁶⁰ = 897×, which is exactly the 100 → 7953
observed above. If the intent is legibility, bound the level or the deviation
`A/F`, not the monthly move.

## B5. WHAT TO DO, AND WHAT NOT TO DO

Do **not** shrink `WEALTH_EFFECT` or `ASSET_PRICE_CREDIT_CHANNEL` to make the numbers
smaller — that is rule 3, and both sit inside their published ranges. The defects are
structural:

1. **Fix the semi-elasticity's units** (B2). Either apply it to the *level* — a
   target `A/F` implied by the real rate, approached on a stated time constant — or
   keep the growth form and derive `ASSET_PRICE_MEANREVERSION` so the implied
   equilibrium level response equals the sourced semi-elasticity. Derive it and
   report what it does; do not pick it.
2. **Give the credit↔collateral loop a balancing term or state its gain.** Either
   promote `0.02` and `−0.4` to sourced parameters and demonstrate loop gain < 1 at
   the central values, or add the missing counterpart (a debt-service or
   loan-to-income constraint is the natural one and has real literature behind it).
   Add a permanent test: **under any single permanent dial move within the dial's own
   range, no state variable may diverge over 480 ticks.** That test would have caught
   this on the day it was written.
3. **Bound consumption physically**, as investment already is, and record the bound
   as a trace term so the player can see it bite.

**ACCEPTANCE:** re-run B1. A permanent 1pp cut must reach a finite `credit_to_gdp_gap`
and a finite `A/F` by month 480. A permanent 1pp cut's asset-price level response at
its own horizon must be reconcilable with `ASSET_PRICE_RATE_SEMIELAST_*`, or the
discrepancy must be recorded as an OPEN with the number printed.

---

# SECTION C — RE-READING THE ELEVEN `OPEN` FINDINGS AGAINST SECTIONS A AND B

`TEST-RESULTS.md` is an unusually honest artefact and most of it should stand. But
five of the eleven are downstream of A and B and must not be worked on directly.

| # | finding | verdict |
|---|---|---|
| 2, 3, 4, 5 | the four historical episodes | **Downstream of A1–A3.** Do not touch the episode tests. Re-run them after A lands and re-report. The US 2008 result — "1.75pp of cuts produce a boom that more than cancels a financial crisis, output +3.83% of trend at m6" — is A1 read backwards: the cut's *level* effect on asset prices arrives on a 1-month kernel (`rate_to_asset_prices`) while its cost arrives on a 14.7-month one, so easing is fast and tightening is slow **by construction**. |
| 6 | "a bifurcation in the playable range" | **Re-diagnosed. See Section A.** The test is a good test; its stated mechanism is wrong and its stated remedy (forward guidance) is wrong. Keep the assertion, rewrite the message. |
| 1 | "the model rebounds after year five" | **Suspect, and probably downstream of B.** The claim is "the model heals a demand gap faster than the data does". The measured 10-year recovery to −4.67% coincides with the credit/asset loop re-inflating (B1: +9.97 credit gap by m96 from far less stimulus than a post-crisis policy path). Re-measure after B. |
| 7 | no output→employment lag | **Honest, leave open.** `docs/12`'s narrowing of the claim to a *decision* lag is better than the brief's original framing and I agree with it. |
| 9 | RATE_TO_INFLATION half the published estimate | **Honest, leave open** — but re-measure after A1. The measured 0.122 is partly the lag burying the response beyond the 24-month window. |
| 10 | TAX_SHOCK_TO_GDP far below Romer-Romer | **Honest, leave open.** `docs/12` L2's closed-form link between this and the missing austerity paradox is the best piece of analysis in that document. |
| 8 | the austerity sign flip | **Honest, leave open.** Same finding as #10, correctly identified as such. |
| 11 | private debt reprices instantly | **Real, and now the more urgent half.** A1's fix hands you the machinery. Do it in the same pass. |

**One structural consequence nobody has recorded.** `docs/12` closed the crash by
introducing `CRISIS_IMPULSE_AMPLIFICATION` (2.59) and `CRISIS_SCAR_AMPLIFICATION`
(3.14), both *solved from this model* to make the realised trough equal
`CRISIS_OUTPUT_TROUGH`. That was the right call and the derivation is well documented.
But it means **the crash's headline magnitude is now pinned by construction and is no
longer independent evidence about the model** — the acceptance test cannot fail on
magnitude, because the constant is defined as whatever makes it pass. Both constants
absorb the demand-block defects in Section B, so **both will move when B lands, and
must be re-solved.** Say this out loud in `parameters.py` and in `docs/10`: they are
calibration constants, not measurements of the world, and the test that re-measures
them is a consistency check, not a validation.

---

# SECTION D — STILL OUTSTANDING. These were in the unsent brief and remain undone.

Verified against the current tree, not read from the previous brief.

## D1. GOVERNMENT INTEREST INCOME STILL LEAVES THE MODEL ENTIRELY
`fiscal.js:154` — `disposable_income = market_income - tax_revenue + transfers - supply_cost`.
`interest_cost` is subtracted in `updateBudget` and appears in no income term.

Measured at month 12:

```
calm        debt 100.0  coupon 3.25  interest  3.25% of GDP  foreign_share 0.30
            -> 2.27pp of household income vanishing (2.9% of disposable income)
debt_trap   debt 146.9  coupon 7.16  interest 10.46% of GDP  foreign_share 0.60
            -> 4.19pp vanishing (5.4% of disposable income)
```

This is THE reason high debt is survivable in Japan: you owe it to your own citizens
and debt service is a transfer, not a destruction. The model has the `foreign_share`
switch on the YIELD side (`BOND_YIELD_FOREIGN_MULTIPLIER`, and `docs/12` finally
tested it) and still does not have it on the INCOME side, so it teaches exactly half
the lesson the variable exists for. Japan episode #5 cannot be reproduced without it.

**FIX:** `disposable_income += (1 - foreign_share) * interest_cost`, as its own trace
term. No new parameter. Re-derive `apc_ss` and the START tax rate explicitly rather
than tuning, exactly as `docs/08` §2 describes for market income, and check the
steady state to 9 decimal places afterwards.

## D2. THE CREDIT TREND CATCHES UP 3–4× FASTER THAN THE FILTER IT CLAIMS TO BE
`credit.js:253` — `trendSpeed = annualRateToMonthlyLinear(0.20)`, half-life 41.6
months, still an unnamed literal. The stated source is a one-sided HP filter at
λ = 400,000 (Borio & Lowe 2002), whose trend time constant is 10–15 **years**. The
crash meter mean-reverts far faster than the indicator it approximates, so it
systematically under-reads persistent booms — the exact situation the gauge exists
for. Derive the equivalent constant, name it, put the derivation in its note, and
re-measure the bubble's 96-month path. Do not pick a number that makes the bubble
look good. **Note this interacts with B: a slower trend makes the credit gap larger,
which makes the loop in B1 stronger. Do B first.**

## D3. SOURCING HYGIENE — THE PROJECT'S CENTRAL CLAIM IS AT RISK HERE
`docs/12` built `tools/lint.mjs` with five checks, but its check (e) is *"no rule
reads a DIAL where a transmitted driver exists"* — a good check, and not the one the
brief asked for. **The numeric-literal check was never written.** Rough count of
numeric literals in `src/rules/`: aggregate 3, consumption 6, credit 23, crisis 16,
fiscal 10, investment 15, labour 12, money 10, prices 16, sentiment 11, supply 6,
wages 2.

Confirmed live and genuinely behavioural, not clamps:

```
prices.js      0.15 excess-scaling on the expectations weight — see the note below
               0.5 credibility discount; 0.08 pull-to-target; 0.5 ULC weight;
               2.0 spiral doubling; -4 deflation floor
credit.js      0.02 collateral feedback and -0.4 credit impulse — SECTION B's loop gain
               0.20 trend speed (D2); ONE_SD 6.0; excess = gap - 3.0;
               assetBoom 1.25; R-zone 0.6; EMA 0.85/0.15; clamps (-25,12), (-30,12)
fiscal.js      INTEREST_PANIC_SHARE 0.25 (named) and the panic multiplier 8 (not) —
               these two decide when the debt-crisis ending fires
money.js       0.0015 credibility erosion per pp printed — the entire fuse on the
               monetisation gate; 0.002 flight convexity; 0.1 adjustment speed
investment.js  accelerator 0.15 on the output gap
state.js:172   leverage_max = 1.35, the fire-sale gate
labour.js      target unemployment floor 1.5
consumption.js yd_permanent adjustment 0.05
sentiment.js   the entire confidence and business-confidence equation
```

Write lint check (f): flag every numeric literal in `src/rules/` not in {0, 1, 12,
100} and not already a named constant. Triage each: promote to `parameters.py` with
range/confidence/source, or name it locally with an explicit `judgement` comment.
**Prioritise anything that decides an ENDING or a GATE** — the `8` panic multiplier
and the `0.0015` erosion are the two that most need a source. Five minutes of tooling
protecting the one thing that makes this project different from everything else in
the field.

**One specific finding inside this.** `prices.js:63` —
`wQ = clamp(EXPECTATION_ADAPTIVE_WEIGHT * (1 + 0.15 * excess), 0, 0.95)` then
`w = quarterlyToMonthly(wQ, true) * (1 - credibility*0.5)`. The excess-scaling is
applied to the *quarterly* weight and then run through the convex conversion
`1 − (1−w)^(1/3)`, which takes the monthly weight from 0.112 at wQ = 0.30 to **0.632**
at the 0.95 ceiling. The parameter note documents a linear amplifier; the code has a
5.6× convex one. That is not the cause of Section A, but it is a hidden nonlinearity
in the middle of the playable range and `docs/07` L6 established that as a defect class.

## D4. TWO SPECIFIC DEFECTS IN THE PARAMETER RECORD ITSELF — BOTH STILL PRESENT
- `CREDIT_GAP_CRISIS_THRESHOLD`'s note (`params.js:287`) still claims it *"also serves
  as leverage_max in the asset-price fire-sale term"*. It does not: `leverage_max` is a
  bare `1.35` at `state.js:172` and the threshold is 9.0. Wire it or correct the note.
- `HAND_TO_MOUTH_SHARE` is still read only to be printed into a trace `extra` at
  `consumption.js:57`. It affects nothing. That satisfies the DEFERRED register's grep
  without doing any work — a loophole in a guard this project is right to be proud of.
  Either wire it into the MPC properly or list it in DEFERRED, **and tighten the
  register's check so a trace-only read does not count.**

## D5. STILL UNREAD, STILL NOT IN DEFERRED
`participation` (63.0) and `gdp_growth_annual` (1.5) are in START and read by nothing
anywhere in `src/`. Either wire them or move them to a documented deferred list.

## D6. WHAT TO ADD — RANKED, AND ALL OF IT AFTER A AND B

**D6a. A MACROPRUDENTIAL DIAL — THE COUNTERCYCLICAL CAPITAL BUFFER.** Still the
strongest single addition available, and Section B makes it *more* attractive, not
less: the bubble scenario's lesson is that monetary policy cannot lean against a
credit boom without wrecking the economy, and B1 shows the credit loop is the model's
strongest amplifier, so the player has no answer to the model's most powerful
mechanism. Basel III keys the CCyB to the credit-to-GDP gap the model already
computes and displays. `BANK_CAPITAL_TO_LOAN_RATE` is now read (`credit.js:180`);
`BANK_CAPITAL_TO_GDP` is still idle and wiring the dial deletes it from DEFERRED.
`LAGS_MONTHS.bank_capital_to_lending` (12 months) is one of 17 declared-but-unscheduled
channels and is the right one. **ACCEPTANCE:** in `bubble`, raising the buffer in year
one must end the term with materially lower credit gap and crisis probability at a
measurable and modest output cost, and the same move in year six must be measurably
too late.

**D6b. DEMOGRAPHICS.** `participation` is the natural hook (D5). Age-related spending
rises ~1.5–2pp of GDP per decade (OECD *Pensions at a Glance*; EC *Ageing Report*).
One slow state variable, one sourced parameter, and it gives `debt_trap` a second
driven mechanism.

**D6c. SEPARATE HOUSING FROM EQUITIES.** `HOUSING_SUPPLY_ELASTICITY` (0.5–3.0,
strong, Saiz 2010) sits deferred. *"Your rate cut raised house prices 20% and that is
why the under-35s are furious"* is a first-order lesson the model can nearly deliver
already — and B2 means the housing leg needs its units fixed anyway, so do them together.

**D6d. EXPECTATIONS / FORWARD GUIDANCE — DEFER AGAIN, FOR A DIFFERENT REASON.**
`docs/12` deferred this because *"an announcement effect bolted onto a process that
diverges under the real Volcker path would be decoration on a defect"*. That reasoning
is right and the conclusion is right, but the defect it names is the wrong one.
**Section A is the defect.** Build it after A and B, and re-derive the case then —
because once the real rate the economy feels responds to the dial in a quarter rather
than a year, a large part of what looked like a missing expectations channel will
already be there.

**D6e. STILL DEFERRED, and say so rather than leaving them looking like oversights:**
the open economy (decision A5, still the largest structural absence — no sudden stops,
currency crises or imported inflation); the govt_investment/govt_consumption split
(both `GOVT_INVESTMENT_MULT_*` are registered); corporate tax
(`CORPORATE_TAX_RATE_TO_GDP` exists and moves investment rather than consumption);
hysteresis in ordinary recessions; **distribution** — the argument against building it
first is unchanged and `docs/12` did not contest it. Note that D6c is the cheap partial.

---

# SECTION E — VALIDATION

**E1. THE MISSING TEST THAT WOULD HAVE CAUGHT SECTION B.** Under any single permanent
dial move inside that dial's own declared range, no state variable may diverge over
480 ticks. Write it first; it is cheap, it is the class of guard this project already
uses everywhere else, and it is the only reason B1 went unseen through three audits.

**E2. UNCERTAINTY PROPAGATION — now urgent rather than nice-to-have.** 126 parameters,
~29 soft (weak/contested/judgement). Build `tools/monte-carlo.mjs`: sample every
parameter not in DEFERRED from a triangular distribution over [low, value, high],
N = 500, seeded; re-run six named lessons per draw and report a robustness percentage.
**Add a seventh check: what fraction of draws diverge at all inside 96 ticks.** With a
knife-edge in the playable range and a loop gain near one, that number is the single
most informative thing the model could tell you about itself. The widest live ranges
will drive it: `ASSET_WEALTH_TO_GDP` (0.5–5.0), `WAGE_PC_SLOPE` (0.1–1.2),
`ASSET_PRICE_FIRESALE` (0.03–0.2), `ASSET_PRICE_MEANREVERSION` (0.01–0.05),
`ASSET_PRICE_CREDIT_CHANNEL` (0.05–0.3), `BANK_DELEVER_STRENGTH` (1–6),
`CREDIBILITY_DECAY` (0.02–0.1), `FIRESALE_REFILL_MONTHS` (24–96),
`VELOCITY_FLIGHT_THRESHOLD` (10–40). The output is also the data source for U8's
confidence bands.

**E3. STEP-SIZE INDEPENDENCE.** Unchanged and still not done. Instrument the maximum
per-tick fractional change of every state variable across all six scenarios and report
the top ten. Only if something exceeds ~0.15/tick is a sub-stepping refactor justified;
say which variables and why. **Section B guarantees this will now find something.**

**E4. THE EPISODES AND THE PATHS ARE BUILT AND GOOD.** `test/episodes.test.js`,
`test/irf.test.js`, `test/paths.test.js` and `test/multipliers.test.js` are the best
work in the project. Do not rewrite them. Re-run and re-report after A and B; every
magnitude in them will move.

---

# SECTION F — INTERFACE. Untouched by the last pass; all of it still open.

**F1.** 27 trace keys recorded every tick; 7 reachable from a gauge. The 20 orphans,
with term counts: capital_stock(2) potential_output(2) consumption(4) investment(5)
wage_growth(4) velocity(3) money-printing→inflation(4) expected_inflation(3)
default_rate(4) asset-price-change(4) leverage(2) credit_spread(6) crisis_prob(2)
yield_10y(7) tax_revenue(2) transfers(2) disposable_income(4) deficit(6)
structural_deficit(3) consumer_confidence(2). `yield_10y` has seven terms and explains
the entire debt-crisis ending. Make every recorded trace reachable — ideally by making
the terms inside the why panel themselves clickable.

**F2. DISPLAY `crisis_prob`.** Computed every tick, shown nowhere. *"Annual chance of
a crash: 6%"* beside the credit gap turns the bubble from a number going up into a bet
the player is knowingly taking. Highest value on this list relative to cost.

**F3. DISPLAY `price_level`** as *"prices since you took office: +14%"*. Free — it is
computed and already pinned by an invariant. Teaches that falling inflation is not
falling prices.

**F4. REAL WAGE GROWTH** (`wage_growth − inflation`). The question voters actually
answer, and the missing legible link to approval.

**F5. PROJECT THE LINE FORWARD.** The model is deterministic — run it 24 months ahead
with dials frozen and draw it faintly ahead of the current point, labelled *"if you do
nothing"*. Makes the pipeline a consequence rather than a queue.

**F6. THE PIPELINE PANEL SHOULD BE A TIMELINE, NOT A LIST.** The kernel SHAPE is the
whole lesson and is currently invisible. `docs/00` calls this the most important widget
on screen; it is the least expressive. **After A1 this becomes more important, not
less**, because the shape will have changed and the player needs to see that.

**F7. ADD AN OUTPUT-GAP GAUGE.** The model's central variable has no gauge; `growth`
(YoY) is shown instead and is noisier and less decision-relevant. The regime box uses
the gap; the gauge row does not.

**F8. CONFIDENCE BANDS** where a parameter is weak/contested/judgement. `docs/01` asks
for it; E2 is the natural source.

**F9. DIAL HISTORY / DECISION LEDGER**, on the charts' x-axis, so a post-mortem is
possible.

**F10.** Also computed and never displayed: `business_confidence`, `fiscal_space`,
`misery`, `risk_premium`, `labour_productivity`.

**F11. ACCESSIBILITY** (`docs/09`) is genuinely undone: no visible focus ring on the
dials, no `prefers-reduced-motion`, no contrast audit, no text alternative for the
canvas charts, never tested on a phone.

---

# SECTION G — IS IT A GAME. Still nobody's work.

Answer the honest question first: what is the moment-to-moment tension, and is there
any? The `bubble` scenario is genuinely great design — eight years of every gauge
saying you are brilliant while the one nobody watches climbs to 14.5pp — because it
has a hidden variable with a delayed catastrophic payoff. Nothing else has that shape.
D6a (macropru) is the cheapest way to give it a decision instead of a spectacle, and
F2 is the cheapest way to make the bet visible.

**PROPOSAL, SMALLEST VERSION FIRST: THE PUBLISHED FORECAST.** At the start of each
year the player publishes a one-year-ahead forecast for inflation and unemployment.
It creates a stake in months 1–11, which currently have none; it converts the lag from
the game's central frustration into its central SKILL; and it is the honest home for
forward guidance. Modal at months 0/12/24/…, two numbers, a scoreboard line, one
sourced credibility coefficient. **ACCEPTANCE:** an accurate-forecast run ends with
measurably higher credibility and therefore a flatter Phillips curve than an
inaccurate one on the same seed.

**RUNNER-UP, and the one most native to this project:** surface the `contested`
parameters as two named, sourced advisors who disagree about the current move
(Auerbach-Gorodnichenko vs Ramey-Zubairy on the fiscal multiplier is the obvious first
pair), then use the same-seed ghost run to show which one the world turned out to
favour. It invents no opinions — the disagreement is already in the file.

**DO NOT** build press, cabinet or opposition characters that state anything the model
does not compute. A commentary layer may only quote true model numbers SELECTIVELY —
an opposition quoting the improving headline deficit while the structural deficit is
unchanged is honest AND teaches `docs/11` §4's best lesson. Bias in selection, never in
fabrication.

---

# SECTION H — DOCUMENTATION. `docs/12` skipped most of this and said so.

`docs/12`'s own closing line: *"docs/10-state-of-the-project.md, which needs updating
against all of the above and has not been touched in this pass."* It still hasn't.

| file | what it needs |
|---|---|
| `README.md` | Says **121 parameters** (actual: 126) and **95 tests, three `todo`** (actual: 136, eleven). Must list `docs/13`; `test/docs.test.js` asserts every file in the directory is listed. |
| `docs/00` | A fourth "Post-research revisions" section: what THIS pass changed about the design and why. That record has been the most useful artefact every previous pass produced. |
| `docs/01` | Every new state field, or `docs.test.js` fails: the investment-impulse driver (A1), the recycled interest term (D1), the macropru dial and its transmitted driver, any demographic state, any housing split. Correct the `leverage_max` entry once it is named. |
| `docs/02` | (i) Part 5's bracketed months-to-peak numbers must be re-measured against the IRF harness *after* A1 — they will move again. (ii) Add the interest-income leg to the DIAL 1 and DIAL 2 chains and to Self-correction 5. (iii) Add the macroprudential chain if D6a lands. (iv) **Add the effective transmitted Taylor response (0.37) from A3 — nothing anywhere records it.** (v) A new "Corrections from this pass" section at the foot; do not delete the originals, mark them. |
| `docs/09` | New gauges (F2, F3, F4, F7), the projection (F5), the pipeline timeline (F6), the ledger (F9), confidence bands (F8). |
| `docs/10` | **Rewrite wholesale.** It predates `docs/12` entirely. The crash entry, the open-disagreements table, the structural-absences list and the validation-not-done list all changed twice. Update parameter count, test count, DEFERRED count, file size. Add anything E2 shows to be an artefact of a point estimate. |
| `docs/11` | REGENERATE EVERY NUMBER via `node tools/cause-effect.mjs`. Every table moves after A and B. |
| `TEST-RESULTS.md` | Regenerate via `node tools/report.mjs`. Rewrite the OPEN #6 message per Section A — the test is right, the diagnosis in it is not. |
| `parameters.py` | New: `RATE_PASSTHROUGH_TO_BORROWERS`, the derived credit-trend constant, the macropru bounds, the demographic drift, plus every literal promoted under D3. Fix `CREDIT_GAP_CRISIS_THRESHOLD`'s false note. Delete DEFERRED entries as D6a/D6c wire them. **Add a note to `CRISIS_IMPULSE_AMPLIFICATION` and `CRISIS_SCAR_AMPLIFICATION` recording that they are calibration constants that must be re-solved whenever the demand block changes — and re-solve them.** |
| `docs/13` | This file, annotated with what you found. |
| `docs/14` | THE NEW REPORT. See below. |

---

# ORDER OF WORK, AND THE GATES

1. **Reproduce Part 0 and the Section A decomposition table.** Do not proceed past a
   disagreement. If the A-table does not reproduce, everything below is unfounded and
   you should say so loudly.
2. **E1 first** — the divergence guard. It is twenty lines and it is the test whose
   absence let Section B survive three audits. Write it, watch it fail, then fix.
3. **Section A, all four together.** They interact and they change every magnitude
   downstream. A1 is the modelling decision; A2 and A3 are small once A1 is settled.
4. **Section B.** B2 (units) before B1 (loop gain) — fixing the units changes the gain.
5. **Re-run and re-report everything.** `tools/cause-effect.mjs`, `tools/report.mjs`,
   the four episodes, the IRF harness, the paths tests, and **re-solve the two crisis
   amplification constants.** Do not start Section D6 until this is green.
6. **D1 and D2**, then **D3 and D4** (they are cheap and they protect the central claim).
7. **D6a (macropru)**, then one of D6b/D6c properly.
8. **Section G, one design change, smallest version.**
9. **Sections E2/E3 and F as capacity allows.**
10. **Section H throughout, not at the end.** `docs/10` has now lagged the code by a
    full pass, which is the failure mode `docs/README` already records once.

---

# WHAT TO PRODUCE

`docs/14-<name>.md`, containing:
- what you found wrong, each with the command that reproduces it
- what you built, and why that shape rather than the obvious alternative
- what you deliberately did NOT build, and why
- **what you think is wrong in THIS brief.** Sections A and B were measured on the
  current code and the numbers are in the tables; Sections C onward mix measurement
  with reading, and D6, F and G are entirely judgement. That is where the errors will be.

Rank by severity. Put anything that INVERTS A LESSON the game exists to teach at the
top in its own section.

**And one instruction that is new.** `docs/12` was an excellent document and it got
the largest finding in the project wrong — not by measuring badly, but by measuring
one thing and reasoning from it to a mechanism it had not measured. The bifurcation
was real; "the absence of a forward-looking expectations channel" was a hypothesis
written up as a conclusion, and it would have cost the next pass a feature build
aimed at the wrong defect. **When you state a mechanism, state the experiment that
isolates it.** If you cannot switch a channel off and watch the finding change, you
have found a symptom, not a cause.