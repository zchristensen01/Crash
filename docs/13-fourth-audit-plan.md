# 13 — Fourth audit: verification, corrections, and the implementation plan

> **This file is the plan. `TASKS.md` in the repo root is the checklist that
> tracks it.** The brief it is built from is `4th-audit-brief.md`.
>
> Phase 0 below is complete: every measurable claim in the brief was
> re-measured against the current tree before any of it was accepted. Three
> claims did not survive, and one of them changes the order of the work.
>
> Nothing after Phase 0 has been started.

---

## PHASE 0 — VERIFICATION (COMPLETE)

The brief's own gate: *"If the A-table does not reproduce, everything below is
unfounded and you should say so loudly."*

### It reproduces. All of it.

Driven headlessly with `events:false, endings:false, assertEveryTick:false`,
seed 1, scenario overrides through `newState`, dials through `applyDialChange`.

| claim | brief | measured | |
|---|---|---|---|
| Section A decomposition, 28 cells | see brief | **identical to 2dp in all 28** | ✅ |
| `rate_to_investment` kernel mean lag | 14.74 months | 14.74 | ✅ |
| kernel cumulative by m12 / m24 | 0.477 / 0.858 | 0.477 / 0.858 | ✅ |
| dial max vs autopilot internal clamp | 20 vs 25 | 20 vs 25 | ✅ |
| `stagflation` + Taylor, m12/24/36 | 23.84 / 35.30 / 96.33 | identical | ✅ |
| effective transmitted Taylor response | 0.37 | 0.37 | ✅ |
| B1 divergence, m96 / m240 / m480 | 1.380 / 1.861 / 2.9e11 | 1.380 / 1.861 / 2.87e11 | ✅ |
| B1 with `ASSET_PRICE_CREDIT_CHANNEL=0` | +18.48 / −7.41 | +18.48 / −7.41 | ✅ |
| B2 asset path from a 1pp cut | 4.1 / 8.6 / 18.2 / 38.0 / 65.6 | identical | ✅ |
| B3 `overheating` table, m12–m60 | see brief | identical | ✅ |
| B3 `WEALTH_EFFECT=0` at m60 | 87% / +20 | 87.09 / +20.2 | ✅ |
| D1 interest not recycled | 2.27pp / 4.19pp | 2.27pp / 4.19pp | ✅ |
| A4 comment, B4 clamp, D2 literal, D4, D5 | present | all confirmed present | ✅ |

**So the brief's central re-diagnosis stands and I accept it.** The bifurcation
is not primarily an expectations defect. `docs/12` measured one thing and
reasoned from it to a mechanism it had not isolated — the brief's closing
instruction (*"if you cannot switch a channel off and watch the finding change,
you have found a symptom, not a cause"*) is a fair description of that error and
it is now a standing rule here.

### CORRECTION 1 — A3's conclusion is not supported by A3's own numbers. **This reorders the work.**

The brief writes:

> Raising `TAYLOR_INFLATION` from 0.5 to 1.5 barely helps (242 → 138, still
> divergent) while removing the *smoothing* takes it to 38 and removing the
> *lag* takes it to 7. **That is the proof that the problem is delay, not gain.**

Every number in that table is correct. **The `+` prefixes are not cumulative
where they appear to be** — rows 3 and 4 are single changes from the baseline,
rows 2 and 5 are cumulative. Compared like with like, at a common dial ceiling:

| dial max | `TAYLOR_INFLATION` | ρ | inflation @ m48 | gap |
|---|---|---|---|---|
| 20 | 0.5 | 0.85 | 242.34 | +96.0 |
| **20** | **1.5** | 0.85 | **137.86** | +50.7 |
| **20** | 0.5 | **0** | **37.84** | +8.7 |
| 40 | 0.5 | 0.85 | 139.12 | +49.3 |
| **40** | **1.5** | 0.85 | **8.92** | **−11.0** |
| **40** | 0.5 | **0** | **5.14** | **−6.2** |
| 40 | 1.0 | 0.85 | 40.59 | +8.4 |

**At dial max 20 nothing works. At dial max 40 both work, and comparably.** The
binding constraint is the **ceiling**, not the choice between gain and delay.

The brief's *instruction* — "do not reach for the coefficient" — survives, but
for a reason it does not give: `TAYLOR_INFLATION`'s sourced range is
**[0.5, 1.0]** and 1.5 is outside it. At the top of its own range (1.0, dial max
40) inflation lands at 40.59 — much better, still elevated. So the coefficient
is not available as a fix, and that is a *sourcing* constraint, not a dynamics
one.

**Consequence: A2 is not a footnote to A1.** It is a one-line silent-truncation
bug that dominates the `stagflation` result, and it blocks clean measurement of
everything else because the dial pegs at its maximum in month 12 and every
subsequent number is measured against a saturated instrument. **It moves to
Phase 1.**

### CORRECTION 2 — D3's specific `prices.js` finding overstates itself

The brief claims the excess-scaling on the expectations weight is *"a hidden
5.6× convex amplifier"* where *"the parameter note documents a linear one"*, and
that this is `docs/07` L6's defect class.

Measured monthly weight against excess inflation:

| excess inflation | 0 | 1 | 2 | 4 | 10 |
|---|---|---|---|---|---|
| monthly weight | 0.112 | 0.132 | 0.152 | 0.196 | 0.370 |

The brief's 0.632 is correct **only at the 0.95 ceiling**, which needs 14.4pp of
excess inflation (i.e. 16.4% inflation) to reach. Across the playable range the
amplifier is ~3.3× over 10pp, smooth and monotone — **not a step, and not a
discontinuity in the middle of the range**, which is what L6's defect class
actually is. And the convexity it objects to is `quarterlyToMonthly(w, true)`,
which is the *correct* conversion for an adjustment speed and is documented as
such in `units.js`.

**What is genuinely worth recording:** the excess-scaling is applied to the
quarterly weight *before* the conversion rather than after, so the amplifier
compounds with the conversion's own curvature. That is a modelling choice nobody
has stated. **Demoted from a defect to a documentation task.**

### CORRECTION 3 — A1's acceptance criterion is unachievable as written

> The last column must be reproduced by the model itself: monotone, **no step
> greater than ~1pp of inflation per 1pp of policy** across 5–12%.

The brief's own best arm fails this: 72.68 → 16.80 is a **55.88pp** step for 1pp
of policy. A response curve running from +72 to −3 across 7pp of policy cannot
have 1pp steps. **Restated below as monotonicity plus a bounded second
difference**, which is what "no knife-edge" actually means.

### Two things to verify before acting on them (flagged, not yet checked)

- **B1's claim that `credit.js:218`'s EMA comment "describes a guard that is not
  there".** The reasoning is plausible and the divergence is real, but the
  specific claim about the comment was read, not measured. Check it before
  quoting it.
- **D3's literal counts** (credit 23, prices 16, crisis 16, …) were read. The
  lint check will produce the real count; use that number, not the brief's.

---

## THE PLAN

Ten phases. **The gates are the point** — several phases exist only to make the
next one measurable, and three of them are tests written to fail before anything
is fixed.

---

### PHASE 1 — GUARDS AND THE SILENT TRUNCATION
*Nothing here changes behaviour except one clamp. All of it exists to make
Phase 2 measurable, and two of the three are tests that should fail today.*

**1.1 — The divergence guard (`E1`). Write it first; watch it fail. — DONE**
Under any single permanent dial move inside that dial's own declared range, no
state variable may diverge over 480 ticks. Twenty lines. It is the only reason
Section B survived three audits, and it is the class of guard this project uses
everywhere else. *It will fail immediately — that is the point. Leave it failing
until Phase 3.*

> #### As built — `test/divergence.test.js`, two `todo` tests, both failing.
>
> **CORRECTION 4 — the guard as worded cannot ever be green, and that is not a
> Phase 3 problem.** Measured before writing it: of 87 permanent dial settings
> across the five declared ranges, **43 diverge over 480 ticks.** Three separate
> reasons, and only one of them is a defect:
>
> - **Levels that are supposed to compound.** `price_level` is cumulative
>   inflation *by invariant 6*; forty years at 10% is 45×. Same for `govt_debt`,
>   `deficit`, `potential_output`, `output`.
> - **`debt_service_spiral`**, which is in `parameters.py` `UNBALANCED_LOOPS`
>   with no balancing counterpart on purpose. `stability.test.js` already
>   excludes `govt_debt` from its core block for this reason.
> - **A pegged nominal rate below neutral is Fisher-unstable**, and
>   `autopilot.js` says so in as many words: *"A scenario blowing up with no
>   policy is the model being RIGHT."*
>
> A permanent `money_printed = 15% of GDP` held for forty years **must**
> hyperinflate. So the guard is over **stationary quantities** — ratios and
> rates the model itself defines as having a resting value — and it asserts only
> that **no divergence is caused by a loop `UNBALANCED_LOOPS` does not declare.**
>
> **Every divergence is attributed by an isolating experiment, inside the test**
> (rule 9): re-run with `ASSET_PRICE_CREDIT_CHANNEL = 0`, and re-run with
> `govt_debt` pinned. Whichever switch-off makes the path bounded is the cause.
> Neither ⇒ the nominal peg, which is economics.
>
> **What it catches today — 2 settings, both through the undeclared bubble loop:**
>
> | setting | first breach | with the loop off |
> |---|---|---|
> | `policy_rate = 1.5` (a 1pp cut) | `output_gap` 211 @ m283 | bounded |
> | `qe = 30` | `output_gap` 211 @ m278 | bounded |
>
> **CORRECTION 5 — B1's attribution is right at 1.5 and wrong as a general
> claim.** The brief says the divergence *"is specifically the credit →
> collateral → credit loop"*. It switched the channel off at **one** rate.
> Swept and bisected to 4 decimal places (rule 2), the channel **moves the
> frontier, it does not create it**:
>
> | `ASSET_PRICE_CREDIT_CHANNEL` | permanent peg diverges below | settles at 1.5? |
> |---|---|---|
> | 0.15 (as built) | **1.5777** | **no** — A/F 2.87e11 |
> | 0 | **0.9398** | yes — A/F 1.38, gap −7.41 |
>
> So the loop costs the model exactly **0.638pp of stable range**. Below 0.94
> the model diverges either way and that is the Fisher arithmetic, not the
> bubble. The debt spiral closes the window from above at **3.0868**, so the
> rate dial's whole stable window is **[1.578, 3.087] — 1.51pp wide, out of a
> declared 20.75pp.**
>
> **The measured frontier, and it is the most quotable number of this phase:**
>
> | dial | declared range | settles in | diverges |
> |---|---|---|---|
> | `policy_rate` | [−0.75, 20] | **[1.578, 3.087]** | 13/19 |
> | `tax_rate` | [0, 70] | [22.75, 70] | 7/20 |
> | `govt_spending` | [0, 70] | **[20, 24]** | 11/20 |
> | `money_printed` | [0, 15] | [0, 0.5] | 11/14 |
> | `qe` | [0, 30] | [0, 26.25] | 1/14 |
>
> **The rate dial has a 20.75pp declared range and a 1.51pp window in which the
> model has a steady state at all.** Most of that is the debt spiral above and
> the Fisher peg below, both legitimate — but nothing anywhere records it, and
> `govt_spending`'s ±2pp window is narrower still. (The sweep's grid brackets
> the frontier at [1.844, 3.0]; the bisected values are the exact ones.)
>
> **Why `stability.test.js` missed Section B, which is the finding worth
> keeping.** It computes the spectral radius of the core block's Jacobian **at
> the steady state**. There `credit_to_gdp_gap = 0` and `A/F = 1`, and the
> credit→collateral→credit loop is switched off *by its own thresholds*
> (`excess = gap - 3.0`, `assetBoom 1.25`). **The guard existed and was
> evaluated at the one point in the state space where the loop it needed to see
> cannot fire.** A linearisation around a resting point cannot find a loop that
> only closes once you have left it. That is why this guard sweeps rather than
> differentiates, and it is a defect class worth naming: *a stability test
> evaluated only at the fixed point.*
>
> **A 9-point sweep is not enough and that nearly cost the finding.** An even
> grid over the rate dial steps from −0.75 to 1.84 and straight over 1.5. The
> whole of B1 sits in a 0.1pp band between 1.5 (runs away) and 1.6 (settles).
> The guard therefore also tries ±0.25, ±0.5, ±1, ±2 and ±5 from each dial's
> own starting point — the moves a player actually makes.
>
> **A later pass must not go green by adding the bubble loop to the register.**
> 3.2 permits declaring it only with a demonstration that loop gain is below
> one, and a loop with gain below one does not diverge. Stated in the test.

**1.2 — Make the autopilot's clamp and the dial's max agree, and assert it. — DONE**
`autopilot.js:35` clamps to 25; `dials.js:16` clamps to 20; `applyDialChange`
silently truncates. Fix the *inconsistency* now (assert neither is ever tighter
than the other, in either direction) and defer the choice of the final number to
2.4, when A1 has landed and the requirement is measurable rather than guessed.

> #### As built — `taylorRate` reads `DIALS`; `test/autopilot.test.js`, 2 tests.
>
> **CORRECTION 6 — A2's inconsistency is real but it is not a live defect, and
> the brief's framing of it is wrong.** The brief says the rule *"silently asks
> for up to 25% and can never get more than 20%"*, implying policy is being lost.
> Measured: replacing the internal `25` with the dial's own `20` changes
> **nothing at all** — max path difference **0.00e+0** on `policy_rate`,
> `inflation`, `output_gap` and `unemployment` across **all six scenarios over
> 96 months.**
>
> The reason is structural, not lucky. `taylorRate`'s smoothing term is
> `rho * s.policy_rate + (1 - rho) * desired`, and `s.policy_rate` is what
> `applyDialChange` has *already truncated*. So the higher internal ceiling
> cannot persist for even one month — it is overwritten by the truncated value
> on the next call. **It was a lie the code told about itself, not a leak.**
> That is precisely why it survived: nothing it did could be measured.
>
> This does not weaken A2's *conclusion*, which is about the ceiling of 20 being
> too low, and that stands untouched. It relocates the defect: the number is
> wrong, the duplication was only ever a trap for the next reader.
>
> **A better number than the brief's for the ceiling problem.** The brief says
> the dial *"pegs at its maximum in month 12 and stays there"*. Measured across
> the full term, `stagflation` under the Taylor rule sits pegged at 20 for
> **87 of its 96 months — 91% of the game.** Every A-table figure measured with
> the autopilot on is therefore read off a saturated instrument, which is the
> Phase 0 argument for moving A2 forward, now with a number on it.
>
> **The assertion is in both directions and that is the point.** "The rule must
> not ask for more than the dial can give" is satisfiable by clamping the rule
> to 5%, which is a far worse bug wearing a passing test. So the test sweeps 250
> states and requires the rule both to stay inside `[min, max]` *and* to reach
> both ends of it. A second, static test fails if the clamp contains a numeric
> literal at all. Verified against the old code: both fail, the first with
> *"taylorRate asked for 20.68% ... the dial is [−0.75, 20]"*.
>
> Pinning them to each other rather than to a number is what lets **2.4 move the
> ceiling by editing `dials.js` alone.**

**1.3 — A trace/telemetry assertion that a dial request was truncated. — DONE**
Nothing anywhere reports it today. Cheap, and it is what would have surfaced 1.2
without an audit.

> #### As built — `s.dial_truncated`, `s.dial_truncated_count`, a trace note, 2 tests.
>
> **THIS TASK OVERTURNED PART OF 1.2, AND THE WAY IT DID IS THE FINDING.**
>
> 1.2's obvious repair — have `taylorRate` clamp to the dial's *own* bounds read
> from `DIALS`, one source of truth — is **wrong**, and 1.3 is what proved it.
> With that clamp in place `applyDialChange` receives a value that is already in
> range, so it never truncates, so the telemetry never fires: **the truncation
> count went to 0 in all six scenarios while the saturation was completely
> unchanged.** Deduplicating the bound moved the defect somewhere even less
> visible than where it started.
>
> So the bounds are now enforced in exactly **one** place. `taylorRate` returns
> an **unbounded request**; `applyDialChange` applies the dial's range and
> reports what it refused. All three arrangements — `25`, the dial's max, no
> clamp — produce an **identical path** (0.00e+0 across all six scenarios over
> 96 months). Only the third says anything.
>
> **What that made visible, none of which anything in the project reported:**
>
> | scenario | months of 96 the Taylor rule was refused its own request |
> |---|---|
> | `stagflation` | **87** — the ceiling |
> | `recession` | **30** — the effective lower bound |
> | the other four | 0 |
>
> `recession`'s 30 is a second finding the brief does not have. The scenario
> opens with the rate on the floor and a large negative gap, so the rule asks to
> go *below* the ELB and cannot. **The ELB binding for 30 months is one of the
> lessons the game exists to teach** — `dials.js` says so in the rate dial's own
> help text — and it was as silent as the ceiling. Both are now asserted.
>
> The trace note carries the requested path, which was previously unobtainable:
> `stagflation` asks for 20.93% at m10, 23.34% by m17.
>
> **A note on the record:** the `dial_truncated` record is per-month and cleared
> by the tick, not by the next accepted move, so a player who pushes the rate
> into its stop and then adjusts spending is still told about the rate. Only the
> most recent truncation in a month is kept; the count keeps all of them.
> Surfacing it on screen is Phase 8.5's job, not this one.

**1.4 — Delete the asserted defeat in `autopilot.js:14`.**
*"It still loses the stagflation scenario, because no rule handles a supply
shock well."* A Taylor rule handles a one-off supply shock adequately in every
standard model; it loses here for the mechanical reasons in A1–A3, and the table
above shows it wins the moment the ceiling is lifted. Rule 6 pointing the other
way: a defeat written into a comment and read back as a design property. Replace
with the measurement.

---

### PHASE 2 — SECTION A: THE TRANSMISSION LAG
*The largest defect. A1 is a modelling decision; everything else here is small
once it lands.*

**2.1 — Split the rate lag from the investment-response lag. `*** START HERE ***`**

The defect: `dials.js:132` schedules `policy_rate_demand` on the
`rate_to_investment` kernel, whose source is *"SVAR mediation; Bauer-Swanson"* —
an estimated **impulse response of investment to a monetary shock**. That is the
response of a *quantity* to a *rate*. The code uses it as the lag on **the rate
itself**, and `updateInvestment` then converts that already-lagged rate into an
investment response. **Rule 4, live, in the busiest channel in the model.**

The shape, which must keep `docs/07` L1 closed:

- `policy_rate_demand` becomes a **fast** driver on a bank pass-through kernel
  (~1 quarter), which is what the retail pass-through literature measures.
- The 9-month investment response moves to a **new `PIPELINE_TARGETS` entry
  carrying the investment impulse**, which `updateInvestment` **adds** and never
  assigns. Adding rather than assigning is what keeps L1 closed and is the whole
  reason that discipline exists.
- New parameter `RATE_PASSTHROUGH_TO_BORROWERS` with range, confidence and
  source. Cite the pass-through literature (ECB/BIS retail rate pass-through);
  do not invent it.

**Note the interaction with `TEST-RESULTS.md` #11** (private debt reprices
instantly): A1 builds exactly the machinery that finding needs. Do them together
— see 5.1.

**2.2 — Re-measure the A-table from the model itself.**
**ACCEPTANCE, restated (Correction 3):** the inflation-at-m60 response across
policy rates 5–12% must be **monotone**, and its **second difference must not
change sign more than once** — i.e. one smooth curve, no plateau-then-cliff.
Report the curve; do not assert a step size.

**2.3 — Record the effective transmitted Taylor response (0.37).**
The Taylor principle is satisfied on the dial (1 + 0.5 = 1.5) and violated in
transmission: between months 3 and 12 of `stagflation`, inflation rises 9.92pp
while the felt rate rises 3.67pp. **Nothing anywhere records this and it is the
single most important fact about the model's dynamics.** Into `docs/02` and
`TAYLOR_INFLATION`'s note.

**2.4 — Choose the dial ceiling, derived rather than picked.**
The binding constraint is `max_expected_inflation + a positive real rate`. After
A1 the required ceiling falls sharply. Derive it, state the derivation, re-run
`stagflation`.

**2.5 — Re-run the four historical episodes and re-report.**
`TEST-RESULTS.md` #2, #3, #4 and #5 all sit downstream of this phase. Do not
touch the episode tests themselves — they are good tests. Re-run and rewrite
their `todo` messages against what the model then does.

**2.6 — Rewrite `OPEN #6`'s message.**
The test ("a bifurcation in the playable range") is a good test and the
assertion should stay. Its stated *mechanism* and its stated *remedy* (forward
guidance) are both wrong. Replace with Section A's decomposition.

---

### PHASE 3 — SECTION B: THE ASSET–CREDIT LOOP
*Independent of Phase 2 and roughly equal in size. **B2 before B1** — fixing the
units changes the gain, so doing B1 first means solving for the wrong number.*

**3.1 — Fix the asset-price semi-elasticity's units (B2).**
`ASSET_PRICE_RATE_SEMIELAST_*` blend to 4.6% of asset price per pp of real rate
— a **level** semi-elasticity, which is what the cited literature estimates.
`updateAssetPrices` applies it as a **persistent growth rate**. The only level
anchor is mean reversion, and solving the two against each other gives an
implied equilibrium level response of **19.2% per pp**. The model hits the
sourced 4.6% at month 12 and then keeps going: +38.0% by m96, +65.6% by m180.

**Same unit-error class `docs/07` already caught once in this exact channel** —
`consumption.js:37` records `WEALTH_EFFECT` being applied to index points with
the conversion missing, *"right only by coincidence"*. Same channel, one level
up, still open.

Two options; pick one and say why:
(a) apply it to the **level** — a target `A/F` implied by the real rate,
approached on a stated time constant; or
(b) keep the growth form and **derive** `ASSET_PRICE_MEANREVERSION` so the
implied equilibrium level response equals the sourced semi-elasticity.
Derive and report; do not pick.

**3.2 — Give the credit↔collateral loop a balancing term, or state its gain (B1).**
A permanent 1pp cut has **no steady state**: `A/F` reaches 2.87 × 10¹¹ by month
480. Setting `ASSET_PRICE_CREDIT_CHANNEL = 0` makes it bounded, so it is
specifically the **credit → collateral → credit** loop.

**Do not shrink `WEALTH_EFFECT` or `ASSET_PRICE_CREDIT_CHANNEL`** — rule 3, and
both sit inside their published ranges. Either promote `0.02` and `−0.4` to
sourced parameters and demonstrate loop gain < 1 at the central values, or add
the missing balancing counterpart. **A debt-service or loan-to-income constraint
is the natural one and has real literature behind it.**

*First verify the flagged claim about `credit.js:218`'s EMA comment.*

**3.3 — Bound consumption physically (B3).**
`updateInvestment` clamps to `[2, 45]` with an explicit note that no economy
invests more than ~45% of output. `updateConsumption` has **no bound at all**,
and in `overheating` households consume **315% of potential output while their
disposable income is 4.2** — every penny of it the wealth term. Bound it, and
record the bound as a trace term so the player can see it bite.

**3.4 — Replace the +12%/month asset growth clamp (B4).**
A clamp on the *rate of change* of a *compounding level* is a growth **floor** in
a spiral, not a bound: 1.12⁶⁰ = 897×, which is exactly the 100 → 7953 observed.
If the intent is legibility, bound the **level** or the deviation `A/F`.

**3.5 — Turn the Phase 1.1 divergence guard green.**
**ACCEPTANCE:** a permanent 1pp cut must reach a finite `credit_to_gdp_gap` and
a finite `A/F` by month 480; and its asset-price level response must be
reconcilable with `ASSET_PRICE_RATE_SEMIELAST_*`, or the discrepancy recorded as
an OPEN with the number printed.

---

### PHASE 4 — RE-MEASURE EVERYTHING. **HARD GATE.**
*Every magnitude in the project moves after Phases 2 and 3. Nothing past this
line starts until this is green.*

**4.1 — Re-solve `CRISIS_IMPULSE_AMPLIFICATION` and `CRISIS_SCAR_AMPLIFICATION`.**
Both were solved *from this model* to make the realised crash trough equal
`CRISIS_OUTPUT_TROUGH`. Both absorb the demand-block defects in Section B, so
**both will move.** They must be re-solved, not carried forward.

**4.2 — Say out loud what those two constants are.**
The brief's best unrecorded structural observation: **the crash's headline
magnitude is now pinned by construction and is no longer independent evidence
about the model.** The acceptance test cannot fail on magnitude because the
constant is defined as whatever makes it pass. They are **calibration
constants, not measurements of the world**, and the test that re-measures them
is a consistency check, not a validation. Into `parameters.py` and `docs/10`.

**4.3 — Regenerate `cause-effect`, `report`, the IRF harness, the paths tests,
and re-report the eleven OPENs.**

**4.4 — Re-measure OPEN #1 and #9.**
#1 ("the model rebounds after year five") is suspect and probably downstream of
B — the 10-year recovery coincides with the credit/asset loop re-inflating.
#9 (`RATE_TO_INFLATION` half the published estimate) is partly the lag burying
the response beyond the 24-month window.

---

### PHASE 5 — CORRECTNESS AND HYGIENE
*Cheap, independent of each other, and 5.3 protects the one thing that makes
this project different from everything else in the field.*

**5.1 — Recycle government interest income to households (D1).**
`interest_cost` is subtracted in `updateBudget` and appears in **no income
term**, so 2.27pp of household income vanishes in `calm` and 4.19pp in
`debt_trap`. This is *the* reason high debt is survivable in Japan: you owe it to
your own citizens and debt service is a transfer, not a destruction. The model
has the `foreign_share` switch on the **yield** side and still not on the
**income** side, so it teaches exactly half the lesson the variable exists for.
**Japan episode #5 cannot be reproduced without it.**
Fix: `disposable_income += (1 - foreign_share) * interest_cost`, as its own trace
term. No new parameter. Re-derive `apc_ss` and the START tax rate explicitly, and
check the steady state to 9 decimal places afterwards.

**5.2 — Private debt maturity (`TEST-RESULTS.md` #11).**
The whole private debt stock reprices the month the dial moves. A1 hands you the
machinery; the fixed/floating mix is the sourced parameter and is most of why
2022 hurt the UK and Australia far more than the US.

**5.3 — Lint check (f): numeric literals in `src/rules/`.**
The check the third pass was asked for and did not write. Flag every literal not
in {0, 1, 12, 100} and not already named. Triage each: promote to
`parameters.py` with range/confidence/source, or name it locally with an
explicit `judgement` comment. **Prioritise anything that decides an ENDING or a
GATE** — the `8` panic multiplier in `fiscal.js` and the `0.0015` credibility
erosion in `money.js` are the two that most need a source.

**5.4 — Derive the credit trend speed (D2).**
`trendSpeed = 0.20` is an unnamed literal with a half-life of 41.6 months. The
stated source is a one-sided HP filter at λ = 400,000, whose trend time constant
is **10–15 years**. The crash meter mean-reverts 3–4× faster than the indicator
it approximates, so it systematically under-reads persistent booms — the exact
situation the gauge exists for. Derive, name, document. **A slower trend makes
the credit gap larger, which strengthens Phase 3's loop — so this comes after
Phase 3.**

**5.5 — Fix the parameter record's two known defects (D4).**
`CREDIT_GAP_CRISIS_THRESHOLD`'s note claims it *"also serves as `leverage_max`"*
— it does not; `leverage_max` is a bare `1.35` in `state.js:172`. Wire it or
correct the note. And `HAND_TO_MOUTH_SHARE` is read **only to be printed into a
trace `extra`**, which satisfies the DEFERRED register's grep without doing any
work. Wire it or defer it — **and tighten the register so a trace-only read does
not count.**

**5.6 — `participation` and `gdp_growth_annual` (D5).** Confirmed: zero reads
anywhere in `src/`. Wire or defer.

---

### PHASE 6 — WHAT TO ADD
*All of it after Phase 4's gate, because every acceptance number here moves.*

**6.1 — A macroprudential dial: the countercyclical capital buffer (D6a).**
The strongest single addition available, and Phase 3 makes it **more** attractive:
the bubble's lesson is that monetary policy cannot lean against a credit boom
without wrecking the economy, and B1 shows the credit loop is the model's
strongest amplifier — so the player currently has **no answer to the model's most
powerful mechanism**. Basel III keys the CCyB to the credit-to-GDP gap the model
already computes and displays. Wiring it deletes `BANK_CAPITAL_TO_GDP` from
DEFERRED and uses `LAGS_MONTHS.bank_capital_to_lending`, one of 17
declared-but-unscheduled channels.
**ACCEPTANCE:** in `bubble`, raising the buffer in year one must end the term
with materially lower credit gap and crisis probability at a measurable and
modest output cost — and the same move in year six must be measurably too late.

**6.2 — HISTORICAL SCENARIOS: play the moment. (NEW — requested.)**
A scenario picker that drops the player into the exact economic position of a
real historical moment, some months before the break, so they can watch it play
out or try to change it.

**Why this is cheap and why it belongs here:** `test/episodes.test.js` already
contains sourced, internally-consistent starting vectors for **US 2008-12, US
2021-23, UK 1979-83 and Japan 1995-2005**, each with its actual policy path. The
work is promoting those vectors from test fixtures into playable
`SCENARIOS` entries and building the picker — the economics is already written
and already tested.

**Design constraints, and they are not optional:**
- **Start before the break, not at it.** The 2008 vector begins in January 2008
  with Lehman at month 9. The whole value is the months where every gauge looks
  fine and the credit gap does not.
- **The historical policy path is available as a GHOST**, on the same seed, so
  the player can see what was actually done against what they did. The
  machinery exists — same-seed ghost runs already work.
- **Label them honestly.** Each is a mid-size representative economy pointed at
  a historical starting vector; it is *not* the United States. The model has no
  exchange rate, no distribution, no balance sheets. Say so on the screen.
- **Gate on Phase 4.** Today the model reproduces none of these episodes. A
  scenario that opens on 2008 and produces a boom teaches the opposite of the
  thing it exists to teach. **This is why the task sits here and not earlier.**
- Candidates beyond the four: 1929 (needs the open economy and a banking
  panic — likely out of reach), 1997 Asia and 1992 ERM (both need the open
  economy, decision A5), 2010–12 euro periphery (**reachable now** — the
  sovereign-yield channel and `foreign_share` were built in `docs/12`).

**6.3 — Separate housing from equities (D6c).**
`HOUSING_SUPPLY_ELASTICITY` (0.5–3.0, strong, Saiz 2010) sits deferred. *"Your
rate cut raised house prices 20% and that is why the under-35s are furious"* is
a first-order lesson the model can nearly deliver. **Phase 3.1 means the housing
leg needs its units fixed anyway — do them together.**

**6.4 — Demographics (D6b).** `participation` is the natural hook (5.6).
Age-related spending rises ~1.5–2pp of GDP per decade (OECD *Pensions at a
Glance*; EC *Ageing Report*). One slow state variable, one sourced parameter,
and it gives `debt_trap` a second driven mechanism.

**6.5 — Forward guidance / expectations. DEFER AGAIN, and now for the right
reason.** `docs/12` deferred it because *"an announcement effect bolted onto a
process that diverges under the real Volcker path would be decoration on a
defect"*. **That reasoning is right and the conclusion is right; the defect it
named is the wrong one.** Section A is the defect. Re-derive the case after
Phases 2 and 4 — once the real rate the economy feels responds to the dial in a
quarter rather than a year, a large part of what looked like a missing
expectations channel will already be there.

---

### PHASE 7 — VALIDATION

**7.1 — Uncertainty propagation (E2). Now urgent rather than nice-to-have.**
126 parameters, ~29 soft. Sample every non-DEFERRED parameter from a triangular
distribution over [low, value, high], N = 500, seeded; re-run six named lessons
per draw; report a robustness percentage. **Add a seventh check: what fraction
of draws diverge at all inside 96 ticks.** With a knife-edge in the playable
range and a loop gain near one, that is the single most informative thing the
model could tell you about itself. Also the data source for 8.8's bands.

**7.2 — Step-size independence (E3).** Instrument the maximum per-tick
fractional change of every state variable across all six scenarios; report the
top ten. Only if something exceeds ~0.15/tick is sub-stepping justified.
**Phase 3 guarantees this will find something.**

---

### PHASE 8 — INTERFACE
*Ordered by value per unit of cost, not by the brief's numbering.*

**8.1 — Display `crisis_prob`.** Computed every tick, shown nowhere. *"Annual
chance of a crash: 6%"* beside the credit gap turns the bubble from a number
going up into **a bet the player is knowingly taking**. Highest value on this
list relative to cost.
**8.2 — Add an output-gap gauge.** The model's central variable has no gauge;
`growth` (YoY) is shown instead and is noisier and less decision-relevant. The
regime box uses the gap; the gauge row does not.
**8.3 — Display `price_level`** as *"prices since you took office: +14%"*. Free
— computed and already pinned by an invariant. Teaches that falling inflation is
not falling prices.
**8.4 — Real wage growth** (`wage_growth − inflation`). The question voters
actually answer, and the missing legible link to approval.
**8.5 — Make every recorded trace reachable (F1).** 27 trace keys recorded, 7
reachable. `yield_10y` has seven terms and explains the entire debt-crisis
ending. Ideally by making the terms inside the why panel themselves clickable.
**8.6 — The pipeline panel as a timeline, not a list (F6).** The kernel SHAPE is
the whole lesson and is currently invisible. **After Phase 2 this becomes more
important, not less** — the shape will have changed and the player needs to see
it.
**8.7 — Project the line forward (F5).** Deterministic model: run 24 months
ahead with dials frozen, draw it faintly, label it *"if you do nothing"*.
**8.8 — Confidence bands (F8)** where a parameter is weak/contested/judgement.
Source: 7.1.
**8.9 — Dial history / decision ledger (F9)** on the charts' x-axis.
**8.10 — The remaining unshown values (F10):** `business_confidence`,
`fiscal_space`, `misery`, `risk_premium`, `labour_productivity`.
**8.11 — Accessibility (F11).** Genuinely undone: no visible focus ring on the
dials, no `prefers-reduced-motion`, no contrast audit, no text alternative for
the canvas charts, never tested on a phone.

---

### PHASE 9 — IS IT A GAME

**9.1 — The published forecast.** At the start of each year the player publishes
a one-year-ahead forecast for inflation and unemployment. It creates a stake in
months 1–11, which currently have none; it converts the lag from the game's
central frustration into its central **skill**; and it is the honest home for
forward guidance. Modal at months 0/12/24/…, two numbers, a scoreboard line, one
sourced credibility coefficient.
**ACCEPTANCE:** an accurate-forecast run ends with measurably higher credibility
and therefore a flatter Phillips curve than an inaccurate one on the same seed.

**9.2 — Two named advisors who disagree.** Surface the `contested` parameters as
two sourced advisors arguing about the current move
(Auerbach-Gorodnichenko vs Ramey-Zubairy on the fiscal multiplier is the obvious
first pair), then use the same-seed ghost run to show which one the world turned
out to favour. **It invents no opinions — the disagreement is already in the
file.**

**DO NOT** build press, cabinet or opposition characters that state anything the
model does not compute. A commentary layer may only quote true model numbers
**selectively** — an opposition quoting the improving headline deficit while the
structural deficit is unchanged is honest AND teaches `docs/11` §4's best lesson.
**Bias in selection, never in fabrication.**

---

### PHASE 10 — DOCUMENTATION
*Throughout, not at the end. `docs/10` has now lagged the code by a full pass,
which is the failure mode `docs/README` already records once.*

| file | what it needs |
|---|---|
| `docs/10` | **Rewrite wholesale.** It predates `docs/12` entirely. |
| `docs/11` | Regenerate every number after Phases 2–4. |
| `TEST-RESULTS.md` | Regenerate; rewrite OPEN #6's message (2.6). |
| `docs/02` | The 0.37 effective response (2.3); the interest-income leg (5.1); re-measured months-to-peak after 2.1; macropru chain if 6.1 lands; a "Corrections from this pass" section. |
| `docs/01` | Every new state field, or `docs.test.js` fails. |
| `docs/00` | A fourth "Post-research revisions" section. |
| `docs/09` | The new gauges and panels from Phase 8. |
| `README.md` | Says **121 parameters** (actual 126) and **95 tests, three `todo`** (actual 136, eleven). |
| `parameters.py` | `RATE_PASSTHROUGH_TO_BORROWERS`, the derived trend constant, macropru bounds, every literal promoted in 5.3, the two crisis-constant notes (4.2), and `CREDIT_GAP_CRISIS_THRESHOLD`'s false note. |
| `docs/14` | The new report. |

---

## THE STANDING RULE THIS PASS ADDS

**When you state a mechanism, state the experiment that isolates it.** If you
cannot switch a channel off and watch the finding change, you have found a
symptom, not a cause. `docs/12` measured a real bifurcation and attributed it to
a channel it had never switched off; the attribution was wrong and it would have
cost this pass a feature build aimed at the wrong defect.
