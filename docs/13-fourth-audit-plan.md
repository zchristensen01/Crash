# 13 — Fourth audit: verification, corrections, and the implementation plan

> **This file is the plan. `TASKS.md` in the repo root is the checklist that
> tracks it.** The brief it is built from is `4th-audit-brief.md`.
>
> Phase 0 below is complete: every measurable claim in the brief was
> re-measured against the current tree before any of it was accepted. Three
> claims did not survive, and one of them changes the order of the work.
>
> **Each task, as it lands, is annotated in place with an "As built" block:
> what was measured, what was built, and where the plan turned out to be
> wrong.** Twenty-eight corrections so far. Corrections 4–9 were found while doing the
> work rather than in Phase 0 — including **Correction 7, which invalidates a
> Phase 0 table**, **Correction 10, in which I made the exact error the
> standing rule exists to prevent**, and **Correction 12, in which the number
> `docs/02` calls the most important single fact about this model was wrong for
> nine commits and the Phase 4 HARD GATE passed over it**. Neither the
> verification pass nor the auditor is above being re-verified.
> `TASKS.md` is the checklist; this file is the reasoning.

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

> ⚠️ **THE TABLE BELOW IS SUPERSEDED — see CORRECTION 7 under Phase 1.4.** Every
> "dial max 40" row was measured through `taylorRate`'s own hidden clamp at 25,
> so its effective ceiling was 25, not 40. The corrected figure for row 4 is
> **7.48, not 139.12**. The *conclusion* below — that the ceiling is the binding
> constraint — survives and gets stronger. The numbers do not. Do not quote them.

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
> the steady state**, and the loop's gain depends enormously on where you
> stand — measured in 3.2, a credit_impulse shock amplifies **0.0130× at the
> steady state and 315.52× two percentage points away**.
>
> ⚠️ **The kink named here was wrong and 3.2 corrected it.** This said the loop
> was gated by `excess = gap - 3.0` and `assetBoom 1.25`; those are at
> `credit.js:318-322` and gate the crash **meter**, not the loop. The real one
> is `Math.max(0, credit_growth_annual − nominalGrowth)`. It was **read, not
> measured** — the exact error the standing rule exists to prevent, committed
> by the pass that wrote the rule down. **The guard existed and was
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

**1.4 — Delete the asserted defeat in `autopilot.js:14`. — DONE**
*"It still loses the stagflation scenario, because no rule handles a supply
shock well."* A Taylor rule handles a one-off supply shock adequately in every
standard model; it loses here for the mechanical reasons in A1–A3, and the table
above shows it wins the moment the ceiling is lifted. Rule 6 pointing the other
way: a defeat written into a comment and read back as a design property. Replace
with the measurement.

> #### As built — the comment now carries the experiment, and a test pins it.
>
> The isolating experiment (rule 9): raise the rate dial's ceiling from 20 to 40
> and change **nothing else** — supply shock, 3% capacity loss, 9% opening
> inflation, smoothing and `TAYLOR_INFLATION` all identical.
>
> | arm | inflation @ m48 | @ m96 | months refused |
> |---|---|---|---|
> | as built (ceiling 20) | **242.34** | 22711.39 | 87/96 |
> | **ceiling 40, nothing else** | **7.48** | **−3.37** | 48/96 |
> | `TAYLOR_INFLATION` 1.0, ceiling 20 | 177.62 | 13905.74 | 89/96 |
> | no smoothing (ρ=0), ceiling 20 | 37.84 | **1871.40** | 92/96 |
> | no smoothing + ceiling 40 | 4.30 | 2.41 | 0/96 |
>
> **The shock never moved, so the shock was never what beat it.** A comment
> cannot be run, so the claim is pinned by a test that fails if either half of
> it stops being true.
>
> ### CORRECTION 7 — **Correction 1's table was measured through the hidden 25 clamp, and every "dial max 40" row in it is wrong.**
>
> Found while measuring 1.4, and it is a Phase 0 error. Re-run both ways:
>
> | configuration | with internal clamp 25 | without | Correction 1 says |
> |---|---|---|---|
> | dial max 20, A 0.5, ρ 0.85 | 242.34 | 242.34 | 242.34 ✅ |
> | dial max 40, A 0.5, ρ 0.85 | 139.12 | **7.48** | 139.12 ❌ |
> | dial max 40, A 1.5, ρ 0.85 | 8.92 | **−3.48** | 8.92 ❌ |
> | dial max 40, A 0.5, ρ 0 | 5.14 | **4.30** | 5.14 ❌ |
> | dial max 40, A 1.0, ρ 0.85 | 40.59 | — | 40.59 ❌ |
>
> Every figure reproduces to 2dp **with** the clamp. So when Phase 0 "raised the
> dial max to 40" it was still measuring an effective ceiling of **25**, because
> `taylorRate`'s own clamp bound before the dial's did. That is the same defect
> A2 describes, biting the person auditing it.
>
> **This strengthens Correction 1 rather than weakening it.** Correction 1
> concluded *"at dial max 40 both work, and comparably — the binding constraint
> is the ceiling"*. Measured properly, **raising the ceiling alone wins
> outright** (242.34 → 7.48): you need not touch the gain or the smoothing at
> all. The ceiling is not merely the binding constraint at m48, it is the whole
> of it. A2/2.4 get more important again.
>
> It also finishes off A3. *"The problem is delay, not gain"* was already
> unsupported; the corrected numbers say the problem is **neither** — at m48 it
> is the ceiling, and removing the smoothing alone leaves inflation at 1871% by
> m96. **Phase 2.4 must not use Correction 1's table.**

---

### PHASE 2 — SECTION A: THE TRANSMISSION LAG
*The largest defect. A1 is a modelling decision; everything else here is small
once it lands.*

**2.1 — Split the rate lag from the investment-response lag. — DONE**

> #### As built — and the shape differs from the one proposed below. See Correction 8.
>
> - `policy_rate_demand` now rides a new `rate_to_borrowing_cost` kernel,
>   peak 3 months, shape k=5 → **50% of pass-through by m3, 93% by m6**.
>   New sourced parameter `RATE_PASSTHROUGH_TO_BORROWERS` (3.0, [1,6],
>   moderate, ECB/BIS retail lending-rate pass-through).
> - The slow half became a **partial adjustment inside `updateInvestment`**:
>   investment closes `INVESTMENT_ADJUSTMENT_SPEED` (0.15, [0.08,0.30],
>   moderate, Kydland–Prescott time-to-build; Christiano–Eichenbaum–Evans) of
>   the gap to desired each month.
> - `LAGS_MONTHS.rate_to_investment` is **no longer scheduled anywhere**. It is
>   kept as what the model is now *measured against*, which is what rule 4
>   requires of a reduced form.
>
> ### CORRECTION 8 — the plan's proposed shape violates a rule `dials.js` already states.
>
> The plan says the investment response should become *"a new `PIPELINE_TARGETS`
> entry carrying the investment impulse, which `updateInvestment` adds"*. That
> schedules an **effect size**, and `applyDialChange`'s own header forbids it:
>
> > *"That is why these are level deltas and not effect sizes: an effect size
> > has to be estimated twice (once here, once in the rule) and the two then
> > have to be kept from double-counting. A driver only exists once."*
>
> Two further reasons, both decisive:
> 1. The pipeline is **event-driven** — it only fires on a dial move. The
>    investment response also has to lag its response to the **credit spread**,
>    the **sovereign premium** and **expected inflation**, none of which have a
>    dial event. A pipeline target could never lag those, so the channel would
>    be half-lagged and half-instant.
> 2. Scheduling at dial-move time **freezes the state-dependent scaling**
>    (`monetaryEasingScale`, the ZLB ramp) at the moment of the move.
>
> Partial adjustment lags the response uniformly across every driver, is
> structural rather than reduced-form, and leaves the steady state exact —
> `desired == investment` at rest, so the term is identically zero. **Verified:
> 200 calm ticks still give `output_gap 0.000000000`, `inflation 2.000000000`,
> `investment 22.500000000`.**
>
> #### THE RESULT, and it is the largest single effect measured in this pass.
>
> **The knife-edge moved to where the Fisher arithmetic says it belongs.**
> Section A's table, inflation at m60 from 8% inflation / 7% expected:
>
> | policy rate | brief (as built) | **after A1** | no wealth channel |
> |---|---|---|---|
> | 5% | 555.73 | 259.29 | 35.90 |
> | 6% | 443.10 | 126.86 | 14.50 |
> | **7%** | **326.00** | **5.53** | 5.31 |
> | 8% | 136.50 | 1.55 | 3.32 |
> | 9% | 1.76 | −0.80 | 1.90 |
> | 10% | −1.54 | −3.54 | 0.70 |
> | 12% | −4.00 | −4.00 | −1.71 |
>
> The stabilising threshold moves from **between 8% and 9%** to **between 6% and
> 7%** — `expected_inflation + neutral_real` = 7.5. This is exactly what the
> brief's A1(b) predicted, and it is now measured rather than argued.
>
> **The published IRF peak is reproduced, not imposed.** Neither parameter was
> chosen to hit it — one came from the pass-through literature, the other from
> the adjustment-cost literature — and the convolution lands on it:
>
> | hold | investment peak before | **after** | published |
> |---|---|---|---|
> | 6 months | m13 | **m9** | **9** |
> | 12 months | m17 | m14 | — |
>
> **`stagflation` under the Taylor rule: 242.34% → 29.55% at m48.** Still
> divergent by m96 (1020.91%), and the ceiling is still refused in 86 of 96
> months, which is Phase 2.4's brief.
>
> #### FOUR TESTS WHOSE PREMISES A1 CHANGED. Each re-measured, none relaxed.
>
> **`STOP-GO` was measuring the lag, not the stance.** It read the transmitted
> stance *at* month 96 and wanted ≈ −0.5, getting −0.407. That number was an
> artefact: on a 14.74-month kernel the transmitted rate carried a year of
> history at every instant and *looked* like an average. Now the instantaneous
> reading at m96 is **−0.000** — correct, the dial returned to baseline in month
> 85 — while the **average** transmitted stance over the 96 months is
> **exactly −0.500** against an average dial stance of −0.500, where it used to
> be −0.463. **The fix made the test's own comment true for the first time.**
> The credit gap, which is what the lesson is about, is unmoved: 5.15 → 5.17.
>
> **The peak-ordering test was reading an unstable statistic.** The inflation
> IRF is a flat plateau — argmax m17, but half its cumulative response has not
> arrived by m42. Across the split:
>
> | | argmax gap | centroid gap | median gap |
> |---|---|---|---|
> | before | 6 | 3.4 | 5 |
> | after | **2** | **3.2** | **5** |
>
> The lesson is intact and the argmax is noise, so the separation is now
> asserted on the median. The *ordering* is still asserted on the peaks.
>
> **"Markets feel a rate move faster than the real economy"** required markets
> to move >2× the real economy at 3 months. It passed only because the real
> economy was on a 14.74-month kernel — i.e. it was testing the defect. Rewritten
> as the three-stage claim the model now contains: markets reprice before
> borrowers, and both before capital spending.
>
> **UK 1979-83's inflation peak moved 20.39% → 16.38%** (UK RPI: 21.9%), because
> the hike now reaches borrowers — the felt rate at m12 goes 13.12 → 16.86. The
> disinflation works better (m48 inflation 56% → 47% of peak) and the peak
> matches history worse. The magnitude assertion moved to the episode's existing
> `todo`; the mechanism assertions are untouched and still pass.
>
> #### Left failing, deliberately
>
> **Crash-arc unemployment: +1.93pp against a published 2–5**, a 0.07pp
> shortfall. Split into its own `todo` so the four other crash magnitudes keep
> hard assertions. `CRISIS_IMPULSE_AMPLIFICATION` and `CRISIS_SCAR_AMPLIFICATION`
> are solved *from* this model and absorb exactly this; **Phase 4.1** re-solves
> them after Phase 3. Doing it now would mean doing it twice.
>
> **The 1pp-cut divergence is untouched** — A/F 2.873e11 → 1.323e11 at m480. The
> guard still fails and Section B is confirmed independent of Section A.
>
> ---
>
> *The plan's original text follows.*

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

**2.2 — Re-measure the A-table from the model itself. — DONE**
**ACCEPTANCE, restated (Correction 3):** the inflation-at-m60 response across
policy rates 5–12% must be **monotone**, and its **second difference must not
change sign more than once** — i.e. one smooth curve, no plateau-then-cliff.
Report the curve; do not assert a step size.

> #### As built — three tests in `test/transmission.test.js`, measured on a 0.25pp grid.
>
> **The curve, inflation at m60 from 8% inflation / 7% expected:**
>
> | 5% | 6% | 7% | 8% | 9% | 10% | 12% |
> |---|---|---|---|---|---|---|
> | 259.3 | 126.9 | **5.5** | 1.6 | −0.8 | −3.5 | −4.0 |
>
> **Monotone: yes**, at every one of the 29 grid points. The threshold bracket
> is asserted against Fisher rather than against a number — the model must
> stabilise by `expected_inflation + neutral_real` = 7.5% (it does, 3.1%) and
> must *not* already be stable at 5% (it is not, 259.3%).
>
> ### CORRECTION 9 — the stated acceptance criterion is ill-posed, and it passes for the wrong reason.
>
> "Second difference must not change sign more than once" is **grid-dependent**
> and noise-dominated. Measured on both grids:
>
> | grid | as built | wealth channel OFF |
> |---|---|---|
> | 1pp (5,6,…,10) | 1 sign change — **passes** | 0 — passes |
> | 0.25pp | **4** — fails | **10** — fails harder |
>
> The wealth-off curve is visibly the *smoothest* one in the project
> (35.9, 25.3, 14.5, 7.9, 5.3, 4.2, 3.3, 2.6, 1.9, 1.3, 0.7, 0.1, −0.5) and it
> scores **worst** on the criterion, because once the curve flattens its second
> differences are ~1e-2 and rounding flips their sign repeatedly. A criterion
> that ranks the smooth curve below the sharp one is measuring the wrong thing.
>
> **Correction 3's own summary was right and 2.2's restatement of it was not.**
> Correction 3 says *"monotonicity plus a **bounded second difference**"*; 2.2
> turned that into a sign-change count. The bounded version is the correct one,
> and the natural bounded measure is the **steepest local sensitivity**
> `|d inflation@m60 / d policy rate|`, which is what "knife-edge" means in the
> units the player experiences.
>
> #### The knife-edge, decomposed. A1 halved it; it is still there.
>
> | | steepest slope | at rate | slope ratio |
> |---|---|---|---|
> | pre-A1, as built | **−366.7** | 7.75% | 138× |
> | post-A1, as built | **−149.2** | 6.25% | 80× |
> | post-A1, wealth channel off | **−22.5** | 5.50% | 19× |
>
> A1 removed **59%** of the knife-edge and moved it 1.5pp toward the Fisher
> point. Switching `WEALTH_EFFECT` off removes **85% of what remains**. Together
> that is a 94% reduction, and it is the isolating experiment: **the residual
> bifurcation is the asset-wealth channel, which is Section B.**
>
> So 2.2's acceptance is recorded as a `todo` whose target is **not a picked
> number** — it is what the model itself does with the offending channel
> switched off, re-measured on every run. Phase 3 closes it. A third test guards
> against regression above 200pp/pp, which would mean the rate had been put back
> on the investment response kernel.

**2.3 — Record the effective transmitted Taylor response (0.37). — DONE**

> #### As built — `docs/02` gains a section, `TAYLOR_INFLATION` gains the number, and a test re-measures it every run.
>
> **The number has moved, because 2.1 moved it.** 0.37 was the *diagnosis*;
> recording it as the model's current behaviour would have been wrong within a
> day. Both are now on the record. Measured over months 3–12 of `stagflation`
> under the rule:
>
> | | inflation rose | transmitted rate rose | effective response | real rate felt @ m12 |
> |---|---|---|---|---|
> | before A1 | 9.92pp | 3.67pp | **0.37** | **−14.50%** |
> | after A1 | 6.58pp | 11.87pp | **1.80** | **−2.21%** |
>
> **The transmitted response has crossed unity**, so the Taylor principle now
> holds where it acts and not only where it is announced. That is the clearest
> single statement of what 2.1 bought, and it is a 4.9× move in the quantity the
> brief called the most important fact about the model's dynamics.
>
> Recorded in three places: a new section in `docs/02` ahead of its corrections
> list, `TAYLOR_INFLATION`'s note in `parameters.py`, and a test that prints both
> the dial response and the transmitted one on every run. The test asserts
> `transmitted > 1.0` — the principle itself — rather than a magnitude.
>
> **One measurement guard worth keeping.** The ratio is only meaningful over a
> window where inflation is *rising*; in `overheating` the same window has
> inflation falling and the "response" comes out at −3.90, which is arithmetic,
> not economics. The test asserts a positive denominator before reporting.
>
> ---
>
> *The plan's original text follows.*

**2.3 — Record the effective transmitted Taylor response (0.37).**
The Taylor principle is satisfied on the dial (1 + 0.5 = 1.5) and violated in
transmission: between months 3 and 12 of `stagflation`, inflation rises 9.92pp
while the felt rate rises 3.67pp. **Nothing anywhere records this and it is the
single most important fact about the model's dynamics.** Into `docs/02` and
`TAYLOR_INFLATION`'s note.

**2.4 — Choose the dial ceiling, derived rather than picked. — DONE**

> #### As built — `max: 20` becomes `max: 50`, derived as a FIXED POINT.
>
> **A ceiling that is too low creates its own requirement.** It refuses the
> rule, inflation runs, and the rate the rule then wants climbs further. So the
> requirement cannot be read off one run — it has to be solved for. Measured
> over **360 runs** (6 scenarios × 60 seeds, **events ON**, which is the game as
> actually played), the highest rate the rule ever asks for *given the ceiling
> it is operating under*:
>
> | ceiling | p90 request | p99 | max | runs left above 20% inflation at m96 |
> |---|---|---|---|---|
> | 20 | 246.0 | 7637.3 | 13117.6 | **51/360** |
> | 25 | 25.8 | 3375.5 | 7852.6 | 17/360 |
> | 30 | 27.8 | 1199.9 | 4044.2 | 14/360 |
> | 35 | 27.8 | 37.2 | 1328.0 | 4/360 |
> | 40 | 27.8 | 41.4 | 165.5 | 1/360 |
> | **50** | 27.8 | 45.4 | **50.7** | **0/360** |
> | 60 | 27.8 | 45.4 | 51.9 | 0/360 |
>
> **50 is the lowest value at which no run in the sample ends with the economy
> out of control**, and the distribution has converged by then — 60 buys
> nothing. The residual is stated rather than hidden: the single worst event
> sequence still asks for 50.7%, refused by 0.7pp once in 360 runs.
>
> **Without events the requirement is far lower** — 21.13 to stabilise
> `stagflation`, 27.84 never to be refused, and the six scenarios are
> bit-identical at any ceiling from 28 up. The whole gap between 28 and 50 is
> the shock tail, which is exactly what a rate ceiling exists for.
>
> #### THE RESULT: the Taylor rule now WINS `stagflation`.
>
> | | inflation @ m48 | @ m96 | months refused |
> |---|---|---|---|
> | ceiling 50 (derived) | **5.69** | **1.91** | **0/96** |
> | ceiling 20 (as it was) | 29.55 | 1020.91 | 86/96 |
>
> The supply shock, the capacity loss and the opening inflation are identical in
> both arms. **This closes A4 by measurement**: "no rule handles a supply shock
> well" was never true here — the rule was holding a dial it had run out of.
> `autopilot.js`'s header is now on its third version and says so, with both
> arms pinned by a test so it cannot rot again.
>
> **The upper bound has stopped binding anywhere.** The truncation counter is
> now 0/96 in five of six scenarios. What remains is `recession`'s **31/96
> against the LOWER bound**, which is physics rather than layout and is why QE
> exists.
>
> #### Knock-on corrections, all made
>
> Raising the ceiling moved the 2.3 numbers slightly, because the rule is no
> longer truncated: transmitted response **1.80 → 1.83**, real rate felt at m12
> **−2.21% → −2.03%**. Updated in `docs/02` and `TAYLOR_INFLATION`'s note.
> `docs/01`'s dial range updated 20 → 50. The A-table is unchanged: it sets the
> rate explicitly to at most 12%, so the ceiling never touched it.
>
> ---
>
> *The plan's original text follows.*

**2.4 — Choose the dial ceiling, derived rather than picked.**
The binding constraint is `max_expected_inflation + a positive real rate`. After
A1 the required ceiling falls sharply. Derive it, state the derivation, re-run
`stagflation`.

**2.5 — Re-run the four historical episodes and re-report. — DONE**
**2.6 — Rewrite `OPEN #6`'s message. — DONE (it is no longer an OPEN)**

> #### THE HEADLINE OF PHASE 2: `docs/12`'s largest finding is CLOSED.
>
> "THE ONE FINDING UNDERNEATH ALL FOUR: a bifurcation in the playable range"
> was a failing `todo`. It is now a **passing hard assertion**. From 8%
> inflation and 7% expected, rate moved in one step, inflation at m36:
>
> | | 6% | 6.5% | 7% | 7.5% | 8% | 9% | 12% | 15% |
> |---|---|---|---|---|---|---|---|---|
> | **now** | 11.71 | 7.61 | 5.40 | 4.54 | 3.83 | 2.65 | 0.26 | −1.48 |
> | before | — | — | **217.6** | — | — | **0.69** | — | — |
>
> And the same destination reached gradually, which used to flip the outcome:
>
> | 15% over | 0m | 6m | 12m | 18m | 24m | 36m |
> |---|---|---|---|---|---|---|
> | **now** | −1.48 | −0.80 | 0.68 | 2.48 | 4.84 | 16.26 |
> | before | 2.16 defl. | — | — | 12.12 | **250** | — |
>
> Both are smooth monotone curves. **Gradualism now costs inflation smoothly,
> which is the lesson, instead of falling off a cliff between 18 and 24 months.**
>
> **`docs/12` named the wrong mechanism, and this is the proof.** It wrote:
> *"demand responds to the REAL user cost, expectations are formed entirely
> from realised inflation, and the transmitted rate takes about three years to
> arrive"* — and concluded the missing forward-looking expectations channel was
> the defect. The first two clauses are **still true and untouched**. Only the
> third was fixed, and the knife-edge went with it. The standing rule of this
> pass, earning its place.
>
> **What remains is correct and must not be "fixed".** A peg below the Fisher
> point still diverges given long enough:
>
> | rate | m36 | m60 | m96 |
> |---|---|---|---|
> | 6% | 11.71 | 81.55 | 2036.23 |
> | 6.5% | 7.61 | 17.31 | 388.53 |
> | 7% | 5.40 | 3.92 | **0.17** |
> | 9% | 2.65 | −1.55 | −4.00 |
>
> The separatrix sits at **~6.75%** against expected inflation 7.0% + r* 0.5%.
> That is the Taylor principle, which the brief said explicitly must not be
> removed. What changed is that it is now **where the arithmetic puts it**
> rather than 1.5pp above it, and the approach is a curve rather than a cliff.
>
> #### The four episodes, re-measured. They no longer fail the same way.
>
> | episode | verdict | key numbers |
> |---|---|---|
> | **UK 1979-83** | **the big winner** | inflation peaks **m11** (UK: m13; was **m60**), 8.63% at 4y (was 13.71); felt rate at m12 **13.12 → 16.86** against a 17% MLR |
> | **US 2021-23** | materially better | now **peaks inside the window** (20.54% @ m40) where before it was still climbing; 10.41% at m32 (was 14.06) |
> | **JAPAN** | untouched | 1.28% at m12 (was 1.44). Phase 2 moved the **ceiling**; Japan spends a decade against the **floor** |
> | **US 2008-12** | untouched | trough −1.85% (was −1.86). It is a crash plus an **easing**, so faster transmission helps the easing too |
>
> **Two of the four now point at the same missing mechanism from opposite
> directions.** US 2021-23's remaining failure is *entirely* credibility
> collapsing to zero on realised misses; Japan's is expectations that cannot
> de-anchor *downward*. That agreement is new. It is also the honest case for
> **6.5 (forward guidance)** — `docs/12` deferred it for a reason that named
> the wrong defect, Phase 2 removed that defect, and what is left is the thing
> `docs/12` thought it was pointing at all along.
>
> **UK's residual failure has moved category.** It is no longer about
> transmission: the disinflation happens on time, it is just far too cheap
> (sacrifice ratio 0.38 against Ball's 2–4). That is the same statement as
> `TAX_SHOCK_TO_GDP` and the missing austerity paradox — every real quantity
> moves too little for the price change that caused it — and it is a demand-block
> finding.
>
> `TEST-RESULTS.md` regenerated: 149 tests, 135 pass, 0 fail, **14 open** (was
> 11 before this pass began, and the bifurcation is no longer among them).
>
> ---
>
> *The plan's original text follows.*

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

**3.1–3.5 — SECTION B. — ALL DONE. It was ONE unit error.**

> #### As built. The plan expected four fixes and a balancing term to build; 3.1 did the work and the balancing term already existed.
>
> **3.1 — the units. The arithmetic chose the option, not me.** The plan offered
> two repairs and said "derive and report; do not pick". Option (b) — keep the
> growth form and derive `ASSET_PRICE_MEANREVERSION` so the implied equilibrium
> equals the sourced semi-elasticity — requires **0.0852** against a published
> **[0.01, 0.05]**. 70% outside its own range, and outside at *every* point of
> the semi-elasticity's range too (0.0846 at A=3, 0.0858 at A=6). So option (a),
> for a measured reason.
>
> **The sharpest single fact in Phase 3:** the overshoot factor was
> `1 / (12 × MEANREVERSION)` — **a number that does not contain the
> semi-elasticity at all.** The model's asset-price response to interest rates
> was set by the mean-reversion parameter rather than by the elasticity that
> governs it. 4.59× at the central value, 9.2× at the bottom of the range.
>
> | permanent 1pp cut, asset index vs baseline | m12 | m24 | m48 | m96 | m180 | m480 |
> |---|---|---|---|---|---|---|
> | before | 4.1 | 8.6 | 18.2 | 38.0 | 65.6 | diverges |
> | after | 1.3 | 2.8 | 5.6 | 9.9 | 13.8 | 12.0 |
> | rate channel alone (credit channel off) | 0.94 | 1.80 | 3.15 | 4.80 | 5.83 | 5.70 |
>
> The residual against a sourced 4.60 is **not** a leftover unit error: at m180
> the real rate has fallen 1.28pp rather than 1.00, because a permanent cut
> raises expected inflation. Predicted 1.28 × 4.6 = 5.89 against an actual 5.83
> — agreement to 1%.
>
> **OPEN, measured and not tuned:** at 12 months the model delivers 0.94% of the
> 4.60% response. The equity leg is sourced *"cumulative ~1yr"* and housing
> *"2–5yr"*, and one mean-reversion speed cannot satisfy both — equity implies
> ~0.08 (outside the range), housing 0.028–0.038 (inside it). Left at 0.02.
>
> **3.2 — the gain, and THREE FALSE CLAIMS in `credit.js`.** Loop gain measured
> at four operating points rather than one:
>
> | | steady state | 1pp/24m | 1pp/96m | 2pp/96m |
> |---|---|---|---|---|
> | before the units fix | 0.0130 | 0.0169 | 0.0169 | **315.52** |
> | after | 0.0076 | 0.0097 | 0.0089 | 0.0071 |
>
> The pre-fix row is why this cannot be checked at rest: **stable at the steady
> state and explosive two percentage points away, four orders of magnitude
> apart.** Neither coefficient of the loop was touched.
>
> 1. *"it has no balancing counterpart — that is the whole point of it"* —
>    **false.** It has one, it is sourced, and it binds: credit → debt-service
>    burden → defaults (`DEFAULT_RATE_DSR`) → bank capital → spread → real rate
>    → back into the impulse. A permanent 2pp cut settles credit/GDP at **262%**
>    by m720 with the debt-service ratio 1.20× baseline. **The plan told me to
>    add this; it was already built and simply could not bind** while the asset
>    block overshot by 4.6×.
> 2. *"Both coefficients are weak/judgement in parameters.py"* — one was. `0.02`
>    and `0.4` were bare literals, now `CREDIT_COLLATERAL_FEEDBACK` and
>    `CREDIT_IMPULSE_RATE_SENSITIVITY`.
> 3. **The flagged read-not-measured claim, and the brief was right.** The EMA
>    comment describes a guard that is not there. An EMA of a sustained input
>    converges *to that input*: credit/GDP goes 150 → 161 → 188 → **222** under
>    a 1pp cut. It integrates exactly as it would without the EMA.
>
> **3.3 — consumption bounded**, to `[10, 95]`, which is `invariants.js` check
> 8's own band, so there is one number rather than two. In `overheating`,
> C went **431.66 → 95.00** and disposable income stopped going negative
> (−26.47 → 60.20). The invariant existed and never fired, because every
> long-horizon run sets `assertEveryTick: false` — **an invariant that only
> holds while you are watching is not a bound.**
>
> **3.4 — the asset clamp was a growth floor, not a bound.** `clamp(gPct, −30,
> 12)` bound for **48 consecutive months** in `stagflation` and A/F still
> reached **1534.67**. Bounded on the deviation now: worst A/F over 240 months
> across all six scenarios is **10.00**. The ceiling is derived from
> reachability — worst A/F a player can reach across 150 runs (events and
> endings on, dials slammed at random) is **2.20**, against 3–6× for Japan 1989
> and Nasdaq 2000.
>
> **3.5 — the guard went green on 3.1 alone.** A/F **2.873e11 → 1.12**, credit
> gap **647.89 → 6.79**. Phase 2 halved it (1.323e11) and did not fix it, which
> is how the two sections were confirmed independent.
>
> ### CORRECTION 10 — I made the error the standing rule exists to prevent.
>
> 1.1's comment said `stability.test.js` missed Section B because the loop is
> gated at the steady state by `excess = gap - 3.0` and `assetBoom 1.25`. **Those
> are at `credit.js:318-322`, they gate `updateCrisisProbability` — the crash
> METER, a display quantity — and have nothing to do with the loop.** The real
> kink is `Math.max(0, credit_growth_annual − nominalGrowth)`. I read it from
> the source instead of measuring it, and it survived a commit. The conclusion
> was right and the mechanism was wrong, which is exactly what `docs/12` did.
> Corrected, and the replacement is the four-point measurement above, which does
> not depend on naming the kink at all.
>
> ### CORRECTION 11 — `bubble` was calibrated against the defect, and 3.1 broke it.
>
> `docs/00` describes it as eight years of every gauge saying you are brilliant
> while the one nobody watches climbs to ~14.5pp. Measured across 3.1:
>
> | credit gap, no player input | m24 | m48 | m72 | m96 | crisis_prob m96 |
> |---|---|---|---|---|---|
> | before | 8.77 | 11.63 | 13.34 | **14.10** | 10.36% |
> | after | 8.39 | 9.80 | 7.99 | **3.37** | 0.22% |
>
> It now peaks at 9.82 around m48 and **unwinds**. A hidden danger that resolves
> itself teaches that ignoring it works. The four-year promise still passes
> (9.80 > 9), which is why nothing caught it — **nothing asserted anything about
> the half of the term where the payoff lives.** Now guarded as a `todo`.
> **Not closed by re-inflating the wealth channel** — rule 3, and the channel now
> matches its literature. The scenario is DATA; its starting vector is the thing
> to revisit (4.3), and 6.1 is the other half of the answer.
>
> ### Two bugs found by the new tests, both outside Section B
>
> - **The strict trace check compared floats at ~1e17 against an ABSOLUTE 1e-6
>   tolerance**, so cancellation noise tripped it in `debt_trap` at m189 — 115
>   months after a real game ends at m74. Now relative above 1e6, identical
>   below. Verified against six cases.
> - **`debt_trap` overflows `govt_debt` to Infinity at m191** after 7.27e+189.
>   Verified identical before and after Phase 3: the declared
>   `debt_service_spiral` plus double precision, not a defect. Skipped
>   explicitly with the reason.
>
> ---
>
> *The plan's original text follows.*

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

> #### As built — Phase 5 verification, before any 5.x work
>
> Four handover claims re-measured, not read. Three reproduce exactly: A/F at
> m480 under a permanent 1pp cut is **1.120e+0**; the bubble loop's gain is
> below one at all four operating points (**7.639e-3 / 9.741e-3 / 8.943e-3 /
> 7.108e-3**); the steady state after 200 calm ticks is `output_gap`
> **0.000000000**, `inflation` **2.000000000**, `consumption` **55.500000000**.
> `npm test` gives 160/143/0/17 with lint, `build --check` and
> `cause-effect --check` clean, and all 17 `todo`s fail (no stale passes).
>
> ### CORRECTION 12 — the number `docs/02` calls the most important fact about this model has been wrong since 3.1, and the HARD GATE did not catch it.
>
> The transmitted Taylor response is **1.96**. Bisected across the pass by
> checking out each commit, regenerating `params.js` and re-running
> `test/transmission.test.js`:
>
> | commit | | transmitted | real rate felt @m12 |
> |---|---|---|---|
> | `aa8febc` | 2.3, which recorded it | **1.80** | −2.21% |
> | `07342c0` | carry-forward | **1.83** | −2.03% |
> | `4fa7a9a` | **3.1, asset units** | **1.96** | **−1.77%** |
> | `3e49d40` … `HEAD` | 4.1 onward | 1.96 | −1.77% |
>
> Two things went wrong and they are different failures. **First, 2.3 and the
> carry-forward commit disagreed with each other** — 1.80 in
> `TAYLOR_INFLATION`'s note against 1.83 in `docs/02` — for one measurement,
> from the moment both were written. **Second, 3.1 moved it and neither was
> updated**, and Phase 4, whose entire job was *"re-measure everything"* and
> which is recorded as a green HARD GATE, went straight past. The brief written
> for the next auditor then carried 1.83 forward as fact.
>
> `test/transmission.test.js` prints the live value on every run and asserts
> only `> 1.0`. **A test that prints a number does not test the number written
> down somewhere else.** That is the same class as V1's stale bundle and 4.3's
> `docs/11` fingerprint, and the tripwire that would catch it does not exist:
> there is no `--check` over numbers quoted in prose.
>
> **The claim under it had also inverted, which is worse than being stale.**
> `TAYLOR_INFLATION`'s note and `docs/02` both said raising the coefficient
> "does not work anyway", citing 177.62% at m48 against 242.34%. Both figures
> were measured with transmission still broken and a dial ceiling of 20 — the
> economy hyperinflated either way, so the comparison was between two failures.
> Re-measured on the current tree:
>
> | `TAYLOR_INFLATION` | total response | `stagflation` @m48 | @m96 |
> |---|---|---|---|
> | 0.50 (as built) | 1.50 | 7.12% | 3.15% |
> | 1.00 (top of range) | 2.00 | **3.24%** | **1.42%** |
>
> The coefficient has plenty of traction now. The reason to leave it at 0.5 is
> **rule 4** — the defect was structural, fixing the structure fixed it, and
> moving a sourced coefficient to cover a structural error is the error the
> rule names. That argument is stronger than the one it replaces and it does
> not depend on a measurement that has expired. Both documents rewritten.
>
> #### The same class, four more times
>
> - **`open_items.md` A2's table**, the pass's headline finding, had two cells
>   that were copied rather than run: sacrifice ratio 0.38 (**0.35** since 3.1;
>   0.38 was the 2.5 value) and `TAX_SHOCK_TO_GDP` 0.46 (**0.487** since 3.1,
>   0.492 before — 0.46 matches no commit in this pass). In the document whose
>   header says *"Where a number is quoted it was measured, not read."* **The
>   finding survives untouched, which is precisely why nobody re-ran them.**
> - **Four stale numbers inside live `todo` messages**, which `report.mjs`
>   copies verbatim into `TEST-RESULTS.md`, so they are published: the tax
>   shock said 0.33; the UK episode said m11 / 8.63% / 16.38% / 0.64pp / 0.38
>   against m10 / 7.59% / 16.17% / 0.66pp / 0.35.
> - **`crisis.test.js` states one measurement as two different numbers** —
>   endogenous propagation with no exogenous scar, given as 3.22% in one `todo`
>   and 3.65% in the next. Re-measured with `CRISIS_HYSTERESIS_SCAR = 0`:
>   **3.6468%**. The same message cites `CRISIS_IMPULSE_AMPLIFICATION = 2.196`
>   — the value 4.1 explicitly rejected for failing to reconcile. It is 2.1855.
> - **`test/divergence.test.js`'s history table stopped at 3.1.** 5.4's slower
>   credit trend took the m480 gap **6.79 → 11.79** while A/F stayed at 1.12.
>   Row added with the reason, because a bare jump in a divergence guard's own
>   comment reads as a regression when it is arithmetic: the gap is credit
>   minus trend, and 5.4 slowed the trend.
>
> **The pattern, and it is the one this pass keeps rediscovering:** every
> generated artefact in this project now has a `--check`, and every number
> re-typed into prose has none. All five defects above are in prose. The three
> tripwires cover `index.html`, `docs/11` and `params.js`; nothing covers a
> sentence.

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

> #### As built — 5.8, the yield. Not in the plan at all: it was found by 5.1 and recorded as open_items A4.
>
> ### CORRECTION 20 — the plan has no task for the yield, and 5.1 cannot ship without one.
>
> `updateBondYield` read `expectedShort = s.policy_rate` under a term labelled
> *"expected path of the policy rate"*. A ten-year bond priced entirely on
> today's overnight rate, with **no Fisher effect anywhere**. Measured in
> `overheating` with the rate pegged at 1.0%, the yield went 1.45 → 0.73 →
> **0.00** while inflation ran 6.7 → 29.5 → **380.5**.
>
> **The repair is not the one the defect's name suggests, and that is why it
> was possible at all.** A4 records the trap precisely: `START`'s
> 3.25 = 2.5 + 0.75 already assumes the policy rate carries expected inflation,
> so bolting on a Fisher term double-counts under a responding central bank and
> forces a steady-state re-solve. Pricing the expected **average** short rate
> over the bond's life avoids it entirely:
>
> ```
> expectedShort = w · policy_rate + (1 − w) · (r* + expected_inflation)
> ```
>
> **At rest the two legs are the same number** — policy = r* + target = 2.5,
> anchor = 0.5 + 2.0 = 2.5 — so the yield is 3.25 **for any w**. The steady
> state is unmoved by construction and there is nothing to re-solve. Under a
> rule-following central bank the policy rate tracks the anchor and they agree,
> so nothing double-counts. Under a peg they diverge and the yield follows
> inflation at exactly **1 − w**, measured at 0.6100 against a structural
> 0.6100 to 1e-6.
>
> `YIELD_POLICY_RATE_WEIGHT` = 0.39, [0.21, 0.54], derived from a policy-rate
> reversion half-life of 3 years [1.5, 5] over a 10-year horizon, and the range
> is the half-life's rather than an interval on w.
>
> ### CORRECTION 21 — two tests were asserting the defect, and one of them conflated speed with size.
>
> `a hike does not bite the interest bill on impact` required the 10-year to
> move **> 2.5pp on a 3pp hike**, under a comment reading *"markets reprice
> fast"*. That is a claim about SPEED and the assertion was about SIZE, and
> nearly one-for-one pass-through is not what any bond market shows. Split in
> two: the response is immediate (m1 equals m6 to 0.02pp) and its size is the
> derived weight (**1.17pp = 0.39 × 3**).
>
> `JAPAN: own-currency debt held at home does not reprice` required the yield
> stay under 2.0%, which it did only because the yield was priced off a
> floored overnight rate. It now asserts the **risk premium** against the pure
> debt-level term, because the yield legitimately carries an inflation
> expectation this episode should not have: the model reaches 2.35% expected
> inflation by month 48 of a Japanese deflation, which is the known defect the
> very next test in that file records as a failing `todo`. **The ownership
> channel was never in question and is measured: 2.448pp of risk premium
> between 7% and 75% held abroad.**
>
> **Contained on purpose.** It does not reach private borrowers:
> `sovereign_premium_felt` passes on `max(0, risk_premium)`, and `risk_premium`
> is the debt, foreign and panic terms only. A government paying more because
> inflation is high is not a sovereign risk penalty on its companies, and
> folding it in would be a second, undeclared channel.
>
> ### CORRECTION 22 — 5.8 did NOT unblock 5.1, and A4 was never the blocker.
>
> This block claimed it did. 5.1 was then rebuilt on top of it and
> **`overheating` still stops hyperinflating: 3.83% against 380.50%.** The
> previous pass measured **3.13%** with the OLD yield. Both fail, so the
> missing Fisher term was never the cause — the fix stands on its own merits
> and on nothing else. The interest bill does now rise with inflation (average
> coupon 2.37 → 4.12 → 52.32 against 1.72 → 1.65 → 1.42), which was the right
> thing to want and the wrong thing to expect a scenario to hinge on.
>
> ### CORRECTION 23 — 5.1 is blocked on the DEMAND BLOCK, and the obvious diagnosis was refuted by measuring it.
>
> The arithmetic reproduces B5's recipe exactly — `apc_ss` **0.709265 →
> 0.692945**, `apc_bondholder` **0.561350**, steady state exact to 9dp, no new
> parameter — and the mechanism is right. What kills it:
>
> **Why the propensity must fall.** Recycling raises canonical household income
> 78.25 → **80.525** while consumption must stay 55.5, so the average propensity
> HAS to drop. There is no formulation that avoids it: more income at the same
> consumption *is* a lower propensity.
>
> **Why that breaks a scenario.** `apc_ss` is solved from the CANONICAL
> baseline — correctly, since solving it per scenario makes the fiscal
> multiplier structurally zero — but the interest transfer is not canonical.
> `overheating` opens with a coupon of 1.75 against 3.25, so it receives
> **1.22** where `apc_ss` was solved for 2.275. It takes the lower propensity
> without the compensating income, loses **0.57pp of consumption**, and its
> opening output gap moves **+0.2 → −0.44**.
>
> **The isolating experiment refuted the obvious hypothesis, which is why it
> was run.** The plausible story was dynamic — inflation erodes the debt, the
> transfer shrinks, household income falls, an inflation tax acting as a
> stabiliser. Measured by freezing the transfer at its opening level for 200
> months: **3.17% against 3.27% free.** Worth a tenth of a point. It is the
> one-off level cut, exactly as the previous pass measured and contrary to the
> story that fits best.
>
> **What is underneath it is A2.** `overheating` pegs the rate at 1.0% against
> 5–6% expected inflation and its entire design is that a Taylor-principle
> violation must diverge. A **−3.9% real rate held for two hundred months**
> moves investment 22.65 → 23.48 and the gap peaks at **+2.2** before falling
> back to 1.8% inflation. **The divergence was being carried by 2.27pp of
> household income the accounting says belongs to bondholders**, and once the
> accounting is right the demand block cannot produce it.
>
> Rule 6 says the same thing from the other side: `overheating`'s regime is
> **asserted, not driven**. It sets `unemployment: 3.5` and a low rate and
> relies on the demand identity — the exact defect docs/07 M6 found in
> `recession` and fixed there by giving it a driven balance-sheet story.
>
> **This reorders the audit.** A2 was "the strongest candidate for the next
> pass's central task"; it is now a blocker for a Phase 5 task. Order:
> **11.1 (A2) → re-derive `overheating`'s vector → 5.1 → 5.5's wiring.**

**5.2 — Private debt maturity (`TEST-RESULTS.md` #11).**
The whole private debt stock reprices the month the dial moves. A1 hands you the
machinery; the fixed/floating mix is the sourced parameter and is most of why
2022 hurt the UK and Australia far more than the US.

> #### As built — and the plan describes one defect where there were two.
>
> New `PRIVATE_DEBT_REPRICING_YEARS` = **3.0**, range [1.0, 8.0], confidence
> `weak` — deliberately the CROSS-COUNTRY spread rather than an estimation
> interval, because the quantity varies by an order of magnitude and that
> spread is the interesting fact. New state field `private_debt_rate`, walking
> toward `market_rate` at 1/3 a year exactly as `average_coupon` walks toward
> `yield_10y`. Steady state exact to 9dp; `dsr_ss` is consistent by
> construction because `newState` already sets `market_rate = policy_rate +
> credit_spread` in every scenario.
>
> ### CORRECTION 13a — the old line got TWO things wrong, and the bigger one is not the maturity.
>
> `dsr = private_credit * (s.policy_rate + s.credit_spread) / 100` reads the
> **DIAL**. That is a docs/12 L3 violation living under a `lint-allow-dial`
> exception whose stated reason was entirely about maturity. Decomposed by
> rebuilding each stage, the first-month move in the default rate after a 3pp
> hike:
>
> | | Δdefault, month 1 | |
> |---|---|---|
> | as built — dial, whole stock | **0.67538pp** | |
> | transmitted rate, whole stock | **0.03160pp** | the dial read was **21x** |
> | transmitted rate, 3-year stock | **0.00125pp** | maturity a further **25x** |
>
> **540x in total, and the plan would have bought 25 of it.** Fixing only the
> maturity would have left the debt-service burden answering the announcement
> rather than the transmission — every loan still repricing in one month, just
> three months later. Both are now fixed and the lint exception is deleted.
>
> The stock's catch-up after a 3pp hike: **2.8% at m1, 22.4% at m12, 43.1% at
> m24, 73.9% at m60**, crossing 50% at month 30 against a pure-exponential 25
> (the target is still moving).
>
> **The new-business rate is `market_rate`, not a second definition of one.**
> `updateInvestment` sets it one rule earlier and `updateCreditGap` already
> reads it as what borrowers pay. The obvious alternative — `policy_rate_demand
> + credit_spread`, the strict textual analogue of the old line — was rejected
> because it would give the same borrowers two different borrowing rates in
> adjacent rules and would silently exclude QE relief, which reaches a
> household exactly by letting it refinance.
>
> **THE `todo` IS NOW A PASSING ASSERTION, AND ITS OLD BAR WAS NOT RESTORED.**
> It required |Δdefault| < 1e-4 on impact — effectively zero — which asserts
> that NO private debt is floating-rate. Some of it is; that is the entire
> content of the parameter, and asserting zero would be asserting a different
> error. What is asserted instead is the shape: impact is **0.19%** of the
> five-year response, the burden at three years is **2.30x** the burden at one,
> and — the experiment that isolates it — setting the repricing time to one
> month brings the impact response back **25.4x**.
>
> **Not modelled, and recorded rather than fudged:** US-style prepayable fixed
> mortgages reprice fast when rates FALL (refinancing) and not at all when they
> rise (lock-in). One speed cannot carry that, the same way one
> `ASSET_PRICE_MEANREVERSION` cannot carry equity and housing (open_items B4).
>
> ### CORRECTION 13b — `docs/11` was far more stale than its fingerprint could show, and one of its sections still taught the defect Phase 2 removed.
>
> 4.3 built the fingerprint and regenerated **§2's six dial tables**. It did not
> touch §1, §3, §4, §5, §6 or §7, and `open_items` B1 recorded that. What B1
> did not say is how bad it was. Regenerating them for this task:
>
> - **§1's kernel table has never been regenerated since the document was
>   written** (`git log -L` on those lines returns exactly one commit, the one
>   that created the file). It read `0.01 / 0.05 / 0.48 / 1.00` for the share
>   of a rate cut the real economy has felt at 1 / 3 / 12 / 48 months. That is
>   the PRE-2.1 model, where the rate rode `rate_to_investment`. Measured:
>   **`0.05 / 0.50 / 0.93 / 1.00`**. The sentence under it — *"the real economy
>   is half way there at a year and still finishing at three. That gap is the
>   single most important thing the game has to teach"* — described a defect
>   that had been fixed six weeks of commits earlier.
> - **§5 said the Taylor rule loses `stagflation`**, both columns HYPERINFLATION
>   at 24 months. Measured: it **wins** — 18.5% at m24, 7.8% at m48, **GOLDI at
>   2.9% by m96**, having peaked at 20.3% in month 16, and it costs 128% of GDP
>   of debt and a term of approval to do it. That is 2.4's finding, and §5 was
>   still teaching its opposite.
> - **§7 still called the bifurcation "THE BIGGEST HOLE"** and quoted the 8–9%
>   knife-edge. 2.6 closed it; the knife-edge is 6–7%. §7 also carried the
>   crash arc as `−8.96% trough / +2.07pp unemployment / −9.98% of trend at 5yr`
>   against a measured **−8.95 / +1.85 / −6.23**, and had no mention of the
>   demand-block finding that is now the largest thing in the audit.
> - §3, §4 and §6's tables were all pre-Phase-2.
>
> All of §1 and §3–§7 rebuilt from `tools/cause-effect.mjs` and re-stamped
> (`86c1b104fab5561d`). **`open_items` B1 is closed.** The lesson is E4's: the
> fingerprint asserts the document was generated against this model, and six of
> its seven sections had never been generated at all.

> #### As built — 5.9, and the answer did not move.
>
> ### CORRECTION 24 — D1's own estimate of the threshold was wrong, and the ceiling was right.
>
> `open_items` D1 flagged that 2.4's `max: 50` was derived before 3.1 removed
> the wealth-channel overshoot, and estimated the stabilisation threshold had
> moved "from 20–25 to **18–20**". Re-measured: it is **20.00–20.25**
> (`stagflation` at m96 goes 22.65 → 8.70 across that quarter point). 2.4's
> 21.13 came DOWN slightly rather than into the teens.
>
> The full derivation re-run — six scenarios x 60 seeds, events ON, recording
> what the rule ASKS for — gives the same shape and the same answer:
>
> | ceiling | p90 | p99 | max | out of control at m96 |
> |---|---|---|---|---|
> | 20 | 22.1 | 153.1 | 165.3 | 41/360 |
> | 40 | 26.9 | 41.2 | 82.8 | 1/360 |
> | **50** | 26.9 | 44.5 | **51.4** | **0/360** |
> | 60 | 26.9 | 44.5 | 56.2 | 0/360 |
>
> **The tails are an order of magnitude smaller and the conclusion is
> identical.** The max request at a ceiling of 20 was 13117.6 and is 165.3.
> 50 is still the lowest ceiling with no run out of control; 60 still buys
> nothing; without events the six are still bit-identical from 28 up and the
> rule is still never refused above ~27.
>
> **A derivation that survives the model moving under it is worth more than one
> that was never checked**, which is the entire argument for having raised D1.
> Nothing changed in the code except the numbers in three comment blocks —
> `dials.js`, `autopilot.js` and `test/autopilot.test.js` were all still
> quoting 1020.91%, 29.55% and 5.49%, none of which the model produces.
>
> **A note on capturing the request.** `s.dial_truncated` is cleared at the END
> of the tick (Phase 1's V2 fix), so it cannot be read after `advance()`
> returns and a naive sweep silently reports the ceiling as the request. The
> re-run wraps the autopilot instead and records `taylorRate(s)` at source.
> Worth knowing before anyone measures a truncation again.

**5.3 — Lint check (f): numeric literals in `src/rules/`.**
The check the third pass was asked for and did not write. Flag every literal not
in {0, 1, 12, 100} and not already named. Triage each: promote to
`parameters.py` with range/confidence/source, or name it locally with an
explicit `judgement` comment. **Prioritise anything that decides an ENDING or a
GATE** — the `8` panic multiplier in `fiscal.js` and the `0.0015` credibility
erosion in `money.js` are the two that most need a source.

> #### As built — and the brief's counts do not survive.
>
> ### CORRECTION 14 — D3's literal counts were read, not run, and one is out by a factor of eight.
>
> The plan already flagged them as unverified and said to use the check's
> number. Here it is. Raw occurrences of a numeric literal outside {0, 1, 12,
> 100} in `src/rules/`:
>
> | file | brief (D3) | measured |
> |---|---|---|
> | `credit.js` | 23 | **21** |
> | `prices.js` | 16 | **10** |
> | `crisis.js` | 16 | **2** |
>
> **84 raw across 13 files; 71 actionable** once `trace.record(...)` scope is
> excluded (display, not arithmetic — the same carve-out check (e) already
> makes for dials) along with array indices. Now zero.
>
> #### The check
>
> `tools/lint.mjs` grows a sixth check with three ways to satisfy it, which are
> the plan's own triage: a `P.*` parameter; an UPPER_SNAKE name whose comment
> says `judgement`; or `// lint-allow-literal: <≥40 chars>`. Enforced in BOTH
> directions like `lint-allow-dial` and like `parameters.py`'s registers.
> **All three failure modes were verified to fire, and the third did not** —
> the stale-marker direction had a leftover condition that made it
> unreachable, so it was silently passing everything. Fixed and re-verified.
> A tripwire that cannot fail is worse than no tripwire, which is the same
> lesson as V1's stale bundle.
>
> #### The triage: 12 promoted, ~46 labelled
>
> Everything promoted decides a **gate or an ending**, which is the priority
> the plan sets. `updateCrisisRisk` — the function that decides whether the
> game's central event fires, and whose output 6.6 wants to put on screen —
> had **every number in it bare**: `CREDIT_GAP_WARNING`, `CREDIT_GAP_ONE_SD`,
> `CRISIS_PROB_SD_CAP`, `ASSET_BOOM_THRESHOLD`, `CRISIS_PROB_RZONE_UPLIFT`,
> `CRISIS_PROB_MAX`. Worth stating plainly: `CRISIS_PROB_PER_SD_CREDIT` is
> sourced and quoted **per standard deviation**, and the size of one SD was an
> undeclared `6.0` — a number that does as much to the crash meter as the
> sourced coefficient does, since halving it doubles the probability at any
> given gap. Then the debt-crisis trigger (`DEBT_SERVICE_PANIC_SHARE`,
> `BOND_YIELD_PANIC_SLOPE`) and the hyperinflation engine
> (`VELOCITY_FLIGHT_CONVEXITY`, `PRINTING_CREDIBILITY_EROSION`) — the two the
> plan names by hand.
>
> **THE FIND IS `DEFAULT_RATE_BASELINE`: the same `1.0` in FIVE PLACES.** The
> baseline term in `updateDefaults`, the zero point of the spread's
> loans-going-bad term, the zero point of write-offs, `newState`'s opening
> `default_rate`, and `loan_losses_ss`. The entire "only losses ABOVE normal
> times eat bank capital" design requires all five to be the same number, and
> nothing said so. **The check nearly missed it, and the reason is worth
> recording**: `1.0` was initially flagged only because the allow-set compared
> strings, so `1.0` and `1` looked different. Comparing numerically is
> obviously right — a check that flags one spelling and not the other is a
> check nobody trusts — and it also made this coefficient invisible. A
> coefficient whose value happens to be one is still a coefficient.
>
> The other ~46 are named locally with `judgement`. That is not a lesser
> outcome: labelling `SPREAD_W_LEVERAGE = 0.8` as judgement says something
> true and useful — four of `updateCreditSpread`'s six terms are judgement and
> two are sourced, and that spread sits inside `market_rate`, which is what
> every borrower pays. Promoting them would have meant inventing ranges.
>
> #### Behaviour-neutral, and measured rather than asserted
>
> All six scenarios x 96 months x 22 state fields, **byte-identical to 15
> significant figures**, before and after. Independently confirmed by
> `docs/11`'s 1464-number fingerprint not moving (`86c1b104fab5561d`). A
> refactor of this size that changed one number would be very hard to find
> later, which is why the check was run as a diff and not as a suite pass.

> #### As built — 5.18, and the class is now three deep.
>
> ### CORRECTION 27 — the `SOLVED_FROM_MODEL` register's only guard could not report drift.
>
> 4.2 built the register and made the point structurally rather than in prose:
> *"nothing can be solved from the model without declaring it; nothing can
> claim to be without being listed"*. Both directions are enforced. **What is
> not enforced is the register's central promise** — its header says the
> constants *"must be RE-SOLVED whenever the model changes"*.
>
> The only check on `CRISIS_IMPULSE_AMPLIFICATION` lived inside `THE
> DECONVOLUTION CONSTANTS ARE MEASUREMENTS`, a `todo` that **fails by design**
> because of its other half — `CRISIS_SCAR_AMPLIFICATION`, deliberately left
> unsolved (C2). So the constant that IS meant to reconcile could drift as far
> as it liked and the result read `not ok … # TODO` before and after,
> character for character.
>
> **It nearly bit, in this pass.** 5.7's capital-units fix moved the trend the
> trough is measured against and took the realised amplification to **2.1155
> against a declared 2.1855**. It was re-solved to 2.0461 only because the
> register was read and remembered — which is exactly the failure mode a
> register exists to remove.
>
> Split: the impulse assertion is now a HARD test and only the scar half stays
> `todo`. **It cannot fail on magnitude** — the constant is defined as whatever
> makes the trough equal `CRISIS_OUTPUT_TROUGH` — and that is the point. A
> consistency check that cannot report inconsistency is furniture.
>
> ### THE CLASS, AND IT IS NOW THREE DEEP
>
> A guard read as answering one question while structurally answering another:
>
> | guard | read as | actually answers |
> |---|---|---|
> | `docs/11` fingerprint (E9) | "the document's numbers are current" | "the model has not moved since somebody stamped" |
> | `SOLVED_FROM_MODEL` (E10) | "these are re-solved when the model changes" | "these are declared, in both directions" |
> | `s.dial_truncated` (E7) | "the UI reads it on the spot" | nothing reads it; it is null when the tick ends |
>
> Every register and tripwire in this project now deserves the question **what
> would have to be true for this to pass while the thing it guards is
> broken?** — asked deliberately rather than discovered.

> #### As built — 5.11, and the scope decision is the deliverable.
>
> ### CORRECTION 28 — the check's blind spot held a FOURTH copy of a number 5.3 had just promoted.
>
> 5.3 took `src/rules/` to zero undeclared literals and found, among other
> things, three copies of the BIS warning line — promoted to
> `CREDIT_GAP_WARNING`. `game/events.js` was outside the check's scope and kept
> the fourth: the bank wobble scaled its severity from a bare `3.0`. So the
> promotion in 5.3 left a copy behind, and nothing could have said so.
>
> **The scope decision is measured rather than assumed.** 253 literals sit
> outside `src/rules/`, and the total is the wrong number to act on:
>
> | | | | |
> |---|---|---|---|
> | `ui/chart.js` 53 | `game/scenarios.js` **49** | `game/indicators.js` 42 | `invariants.js` 21 |
> | `game/events.js` **16** | `game/dials.js` 12 | `ui/app.js` 10 | `game/endings.js` **7** |
>
> **In: `endings.js` and `events.js`** — the two files where a bare number
> decides what happens to the player. That is 5.3's own stated priority
> ("prioritise anything that decides an ENDING or a GATE") applied to the files
> 5.3 could not see.
>
> **NONE OF THE 22 WAS PROMOTED TO `parameters.py`, AND THAT IS THE POINT.** An
> ending threshold is a GAME DESIGN decision about when a run stops being
> instructive, not an estimate of anything in the world. `inflation > 25` with
> a range and a citation would dress a design choice as a measurement — the
> same error one level down that `SOLVED_FROM_MODEL` exists to prevent. They
> are named and labelled `judgement` where the decision lives, with the real
> numbers that inform them stated: Cagan's 50%/month, US 1933's 25%
> unemployment, and the debt-crisis CONJUNCTION, where 200% alone is Japan and
> a 12% yield alone is a periphery repricing, and only both together is the
> trap.
>
> **Out, each with the reason recorded in `tools/lint.mjs` so nobody
> re-derives it**: `ui/*` is presentation; `scenarios.js` is DATA — six
> starting VECTORS, where flagging every field would be noise and the real
> guard is the internal-consistency and regime tests that already exist;
> `indicators.js` is display thresholds; `invariants.js` is almost entirely
> float tolerances; `dials.js` is player-facing layout.
>
> **`test/` is a third scope and is NOT obviously safe to leave out**, which is
> worth saying plainly: 5.7 found a hardcoded `0.06` in `test/params.test.js`
> asserting the START vector against a depreciation rate the model did not use.
>
> Behaviour-neutral, measured against the pre-change tree rather than asserted:
> the same hash over 48 event-driven runs, `6023a38db911ed38` before and after.

**5.4 — Derive the credit trend speed (D2).**
`trendSpeed = 0.20` is an unnamed literal with a half-life of 41.6 months. The
stated source is a one-sided HP filter at λ = 400,000, whose trend time constant
is **10–15 years**. The crash meter mean-reverts 3–4× faster than the indicator
it approximates, so it systematically under-reads persistent booms — the exact
situation the gauge exists for. Derive, name, document. **A slower trend makes
the credit gap larger, which strengthens Phase 3's loop — so this comes after
Phase 3.**

> #### As built — 5.10, and D2 undercounted the copies.
>
> ### CORRECTION 25 — the bound was stated three times, not twice.
>
> `open_items` D2 recorded two duplications: `updateConsumption`'s `[10, 95]`
> against check 8, and `updateInvestment`'s `[2, 45]` against check 8. **The
> third is the `govt_spending` dial's own `min: 0, max: 70`**, which is check
> 8's `govt_purchases` band, because `govt_purchases` tracks that dial.
>
> Every copy carried a comment saying the numbers were *"taken from the
> invariant so there is one source"*. That is a description of intent with no
> mechanism behind it, and it is the same shape as `docs/01` describing dead
> `START` fields in prose (Correction 16) — a true sentence no test enforces.
> All three now read `DEMAND_BOUNDS`.
>
> **The relation matters in both directions and only equality is safe.** A rule
> clamp WIDER than the invariant that checks it makes the model throw on a
> state the model generated itself; NARROWER and the invariant can never fire,
> so the saturation it exists to catch becomes invisible — and saturation reads
> as stability on every summary statistic, which is check 8's whole reason for
> existing.
>
> Guarded by behaviour rather than by restatement: `stagflation` pins
> investment against its ceiling for **51 of 96 months** with invariants
> checked every tick, so a widened clamp throws there. Both drift modes
> verified to fire.
>
> **`tax_rate`'s dial also runs 0-70 and is deliberately left alone.** It is a
> different quantity that coincides on a number; wiring the two together
> because they look alike is exactly the error 5.5 refused and B2 made.

**5.5 — Fix the parameter record's two known defects (D4).**
`CREDIT_GAP_CRISIS_THRESHOLD`'s note claims it *"also serves as `leverage_max`"*
— it does not; `leverage_max` is a bare `1.35` in `state.js:172`. Wire it or
correct the note. And `HAND_TO_MOUTH_SHARE` is read **only to be printed into a
trace `extra`**, which satisfies the DEFERRED register's grep without doing any
work. Wire it or defer it — **and tighten the register so a trace-only read does
not count.**

> #### As built — the note is false, and the repair the task name suggests would have been a unit error.
>
> ### CORRECTION 15 — "wire it or correct the note" offers a repair that cannot be right.
>
> `CREDIT_GAP_CRISIS_THRESHOLD`'s note ended *"Also serves as `leverage_max`
> in the asset-price fire-sale term."* It never did — `leverage_max` was a bare
> `1.35` in `state.js:172` — and **the two could not have been the same number
> under any wiring**. `CREDIT_GAP_CRISIS_THRESHOLD` is **9 percentage points of
> credit/GDP above trend**; `leverage_max` is a **dimensionless ratio of debt
> to collateral**, both normalised to the scenario's own opening state. There
> is no conversion. Taking the "wire it" branch would have set a leverage gate
> to 9.0 — a gate the model can never reach — and it is the same class of error
> as B2's semi-elasticity: two quantities with the same *feel* and different
> *units*.
>
> Note corrected in place, with the false claim quoted and why it is false, and
> the literal promoted to its own **`FIRESALE_LEVERAGE_TRIGGER`** = 1.35,
> [1.15, 1.60], `judgement` — the third of the three fire-sale numbers to carry
> that label, which is itself worth seeing in one place.
>
> #### `HAND_TO_MOUTH_SHARE`: deferred, and the register now makes that the only
> #### available answer
>
> The plan says *"wire it or defer it — and tighten the register so a trace-only
> read does not count."* Both halves done, and the order matters: **the
> tightening is what makes the deferral honest.** The parameter was read once,
> at `consumption.js:104`, inside `trace.record`'s extras — printed and never
> multiplied by anything — which satisfied the register's grep while doing no
> work at all.
>
> `sourceOfRules()` now paren-matches `trace.record(...)` and `trace.note(...)`
> out of the source before deciding, which is the same carve-out
> `tools/lint.mjs` checks (e) and (f) already make. **Measured before making
> the change, `HAND_TO_MOUTH_SHARE` is the ONLY parameter in the model read
> solely inside a trace** — so the tightening catches exactly what it was aimed
> at and has no blast radius. The plan's warning was heeded and is worth
> restating: `RATE_PASSTHROUGH_TO_BORROWERS` and the `SS_*` anchors are
> untouched, because they are consumed in `parameters.py` and were never read
> from `src/` in the first place.
>
> Its `DEFERRED` entry carries **B5's recipe verbatim** — `apc_bondholder =
> (apc_ss − HAND_TO_MOUTH_SHARE) / (1 − HAND_TO_MOUTH_SHARE)`, `apc_ss`
> re-deriving to 0.692945 — so the design travels with the parameter rather
> than only with `open_items.md`. Both directions of the tightened register
> verified to fire.
>
> **Behaviour-neutral**: six scenarios x 96 months x 22 fields identical.
>
> #### Found on the way: check (f) has a blind spot, and this is how it showed
>
> `leverage_max` escaped 5.3's sweep because check (f) walks `src/rules/` only.
> **254 undeclared literals sit outside that scope** — `ui/chart.js` 53,
> `game/scenarios.js` **49**, `game/indicators.js` 42, `invariants.js` **21**,
> `game/events.js` 16, `game/dials.js` 13. Most of `ui/` is presentation and
> should stay out. The two that matter are `scenarios.js`, which is DATA the
> model is calibrated against, and `invariants.js`, which holds the bounds
> `updateConsumption` and `updateInvestment` duplicate on purpose (D2).
> Recorded as open_items E6 rather than swept here: it needs a scope decision
> and a triage the size of 5.3's.

> #### As built — 5.17, and the tripwire had a door in it.
>
> ### CORRECTION 26 — `docs/11`'s fingerprint could be defeated by running `--stamp`, which is how §1 and §3–§7 survived the hard gate.
>
> 4.3 built the fingerprint and called the staleness "now DETECTABLE, which is
> the part that mattered". It is detectable in one direction only. The hash
> covers **the model's measurements**, not **the document's contents**, so it
> answers *"has the model moved since somebody stamped?"* — and a stale table
> in a stamped document is invisible to it:
>
> ```
> sed -i 's/48 |  +1.03 |/48 |  +9.99 |/' docs/11-cause-and-effect.md
> node tools/cause-effect.mjs --check    # PASSED
> ```
>
> **This is the mechanism behind Correction 13b.** 4.3 regenerated §2, stamped,
> and `--check` stayed green for the whole audit while §1's kernel table
> described the pre-2.1 model, §5 said the Taylor rule loses `stagflation`, and
> §7 called the closed bifurcation the biggest hole. The guard was working
> exactly as designed. It had simply been designed to answer a different
> question from the one everyone read it as answering.
>
> **The tool's own comment considers two repairs and picks the weaker one for a
> good reason.** It weighs the fingerprint against fully generating the file
> and rejects generation because *"most of docs/11's value is the prose
> explaining each chain in the order it fires"*. Correct. **There is a third
> option: check the TABLES and leave the PROSE.** The tables are verbatim tool
> output; nothing about keeping the prose hand-written requires the tables to
> go unverified.
>
> `--check` now verifies all seven pasted tables cell by cell. `--write`
> rewrites the six that are verbatim and re-stamps — replacing a throwaway
> script that had been living in a scratchpad, which is the same class of
> hazard as a process that depends on someone remembering. §4's table is
> checked but never written, because its header is hand-widened for
> readability; the comparison is on NUMBERS, which go stale, not on formatting,
> which is the document's own business.
>
> **A bug in the first version is worth keeping.** `measuredTables()` captured
> `console.log` calls, but several sections print an entire block in ONE call,
> so a per-element `^--` match found nothing and every table was silently
> reported as "no longer measured". `fingerprint()` joins before matching and
> so never had to care — the same code shape, one of them load-bearing on a
> detail the other could ignore.
>
> **What is still uncovered is the prose**, and that is where every
> stale-number defect in this audit actually was. See E4 / task 5.12.

> #### As built — 5.20, and the door was in the other wall.
>
> ### CORRECTION 30 — 5.17's scope decision was wrong the same way 5.11's was, one task further on: "seven tables verified" meant seven ***fenced*** tables, and `docs/11` has twelve measured blocks.
>
> Found by carrying out the handoff's own spot-check — *falsify a cell in
> `docs/11` and confirm `--check` fails* — and choosing a cell in §3 rather
> than §2:
>
> ```
> sed -i 's/| −3.98% | +2.05 |/| −3.98% | +9.99 |/' docs/11-cause-and-effect.md
> node tools/cause-effect.mjs --check    # PASSED
> node tools/cause-effect.mjs --stamp
> node tools/cause-effect.mjs --check    # PASSED AGAIN
> ```
>
> That is Correction 26 reproduced character for character, in the tables
> Correction 26's fix did not reach. **The mechanism was closed and the scope
> was not.** `BLOCKS` enumerated the blocks to check as the ones inside ```
> fences — §2's six dial tables and §4 — and the success message said
> *"7 tables verified"*. Five measured blocks are markdown PIPE tables and were
> named nowhere: §1's kernel and response tables, §3's three state-dependence
> tables, §5's six preset paths, §6's shock table. The fingerprint cannot cover
> them, and not by accident: it hashes the MODEL, so it is silent precisely
> when the model sits still and the document drifts.
>
> **The document had drifted 58 cells while the fingerprint was correct.**
> `8f20248ce93b453a` was the right hash for the model on every day of it.
>
> | block | stale cells | moved by |
> |---|---|---|
> | §1 response table | **19** | 5.7's capital-units fix |
> | §5's five preset paths | **31** | 5.7, and 5.8's long yield feeding the interest bill |
> | §6 productivity boom and FINANCIAL CRISIS | **8** | 5.7 |
> | §1 kernel, §3's three tables | 0 | — |
>
> **The sharpest instance is a document contradicting itself four lines apart.**
> §5's `stagflation` table said the Taylor arm ends **GOLDILOCKS at 2.9%**; the
> prose immediately below said *"at month 96 the regime box still reads
> OVERHEATING at 3.2%"*. **Both sentences were written by 5.8.** The prose was
> updated because a human was reading it; the table was not, because nothing
> was. That is the whole argument for this task in one page of the document it
> is about.
>
> **WHY NOT JUST FENCE THE OTHER FIVE.** Because they are shaped: §5 shows four
> to six of the tool's rows and drops the credit gap where it is not the point,
> §6 names only the fields worth naming per shock, §3's `money_printed` drops a
> column. Pasting tool output over them would rewrite the document's editorial
> judgement in order to fix an arithmetic error. §4's precedent already draws
> the line in the right place — *the comparison is on NUMBERS, which go stale,
> not formatting, which is the document's business* — and this generalises it:
> **the document decides what to say, the model decides what the numbers are.**
> `docCells()` parses docs/11's own formats and requires the model's value for
> every cell the document chooses to show. `--write` splices the number over
> the stale token and leaves the bold, the `cg ` prefixes and the
> `→ HYPERINFLATION` tails exactly as written.
>
> §5's `identical` and `same` cells are checked as the claim they make — that
> the two arms agree at that month — rather than skipped for not being numbers.
>
> **COVERAGE IS DECLARED, BECAUSE AN UNPARSED CELL DISAGREES WITH NOTHING.**
> Ask the standing question of the new guard and the answer is immediate: it
> passes while the document is stale if the parser stops matching. A renamed
> heading, `| 24m |` becoming `| month 24 |`, and the cells beneath go unread —
> and unread cells report clean. That is E9, E10 and E7's shape for the fourth
> time. So `PIPE_BLOCKS` names the 21 blocks the document must state and
> `PIPE_CELLS` records the **453** cells found under them; a missing block is
> reported by name, a changed count reports the number to paste in if the edit
> was deliberate. The success line now reads *"7 fenced tables and 453 cells
> across 21 pipe tables verified"*, because a count nobody can see is a count
> nobody checks.
>
> **Nine failure modes, each broken deliberately and restored, none blessable
> by `--stamp`:** a §1 response cell, a §1 kernel cell, a §3 cell, a §5 number,
> a §5 REGIME word, a §5 `same` where the arms no longer agree, a §6 cell, a
> renamed §5 heading silencing a whole table, and a single silenced row.
>
> **The sixth did not fire on the first attempt, and it is the same defect one
> level up.** The mirror check derived its month key with
> `c.key.split('m /')[0]` from a key that is the bare month, producing `96mm`,
> so it filtered to nothing and every `identical`/`same` cell in §5 was
> silently unchecked — a guard reporting clean because it compared nothing.
> Caught only because the list of failure modes was actually executed rather
> than reasoned about. **That is the fourth time in this audit that writing the
> falsification down and running it found something reading the code did not.**
>
> **Four prose sentences restated cells this task repaired**, and were
> corrected with them rather than left to contradict the tables one line away:
> `overheating`'s *"debt is 4pp higher than the do-nothing arm at two years"*
> (3pp), `recession`'s 96m gap `+2.5 → +2.4` and credit gap `+2.5 → +2.3`, and
> `bubble`'s *"debt falls from 100 to 72"* (74). Nothing found those but
> reading them, which is precisely what E4 / task 5.12 is for — and 5.12 now
> has a mechanism to copy, because a per-cell check against a declared key is
> what a prose check would also have to be.
>
> **No rule and no parameter moved.** The fingerprint is unchanged, `npm test`
> is 168/152/0/16, and the steady state is exact to 9dp.

> #### As built — 5.21, and the block 5.20 left standing alone.
>
> ### CORRECTION 31 — `docs/11`'s own staleness flag understated it: the `debt_trap` policy table said only its do-nothing row had moved, four of five had, and one had changed OUTCOME while the prose drew a lesson from it.
>
> Once 5.20 had made every other numeric block in the document checkable, one
> was left that no tool produces: `debt_trap`'s five-row policy table, measured
> by hand for `docs/12`, pasted into §5, and flagged in place as *"NOT
> re-measured against the fourth audit's model — the do-nothing row alone has
> moved"*. **The flag was itself a read rather than a measurement.**
>
> | policy | doc m48 → measured | doc outcome → measured |
> |---|---|---|
> | nothing | 175 → **174** | DEBT CRISIS m71 → **m73** |
> | austerity, tax +4pp | 165 → **163** | DEBT CRISIS m82 → **m86** |
> | rate to the floor | 157 → **165** | ***survives*** → **DEBT CRISIS m95** |
> | both | 150 → **156** | survives, π2.3 gap +0.8 → **π1.2 gap −5.9** |
> | both, plus 30% QE | 144 → **154** | debt 127 at m96 → **172** |
>
> **THE DEEPER DEFECT IS THAT THE EXPERIMENT WAS NEVER WRITTEN DOWN.** "Rate to
> the floor" could mean the dial's −0.75 or a plain zero, applied on day one or
> after the player has watched a while, with events on or off. That is why
> nobody could tell whether the table had moved: **a number with no
> reproduction is the thing this document exists to not contain.** Every
> reading was run before concluding anything, and they agree — floor −0.75 at
> m0/m1 ends at m95, at m6 at m90; floor 0 at m0/m1 at m87, at m6 at m85. With
> events ON it is seed-dependent (4 of 5 survive), which is precisely why §5 is
> measured without them, and the events-off reading is the like-for-like one.
>
> The repair is the one the rest of the document already uses: a `policy`
> section in the tool, stating its convention in its own header, and a fenced
> block that `--write` rewrites and `--check` verifies. **`docs/11` now has no
> numeric block that a tool does not generate and check.**
>
> **THE PROSE WENT WITH IT, WHICH IS THE PART THAT MATTERED.** The sentence
> under the table drew its lesson from the row that flipped — *"Cutting the
> cost of the debt alone works but you inflate your way there and everyone can
> see it."* It does not work, and inflation at m96 is 1.9% rather than the 5.1%
> the row claimed. It now reads *"you cannot consolidate your way out, and you
> cannot cheapen your way out either"*: austerity alone buys 13 months, the
> rate alone 22, only the combinations survive, and the economy that survives
> is still carrying a −5.9 output gap and 184% debt after eight years. **The
> headline lesson was right and every number under it had drifted**, which is
> the signature of a document defect rather than a model finding — and the
> reason the fix must not touch the scenario (rule 3; 11.4 owns that vector).
>
> **`README.md` was carrying the over-claim this pair of tasks disproves:**
> *"Its numbers are generated by `node tools/cause-effect.mjs`, so they cannot
> drift from the model."* Until 5.20 that was false of five blocks and 58
> cells; until 5.21 the policy table was measured by hand. It now claims what
> is true — every TABLE is generated and checked on every `npm test`, the PROSE
> is not, and that is E4.
>
> Fingerprint `8f20248ce93b453a` → **`f1a8588676b42adf`**, 1464 → **1484**
> numbers: new measurement, not corrected measurement. No rule and no parameter
> moved; 168/152/0/16, steady state exact to 9dp.

**5.6 — `participation` and `gdp_growth_annual` (D5).** Confirmed: zero reads
anywhere in `src/`. Wire or defer.

> #### As built — the task names two and there are four, and wiring one of them found a unit error in the supply block.
>
> ### CORRECTION 16 — D5 names two dead START fields; there are four.
>
> Measured across `START`'s 36 fields: `gdp_growth_annual`, `participation`,
> **`current_account`** and **`fx_change`** are read by nothing in `src/`. The
> last two were found by counting, not by reading the task. `docs/01` already
> described them as idle in prose — which is exactly the failure mode this
> project keeps finding: a true statement in a document that no test enforces.
>
> **`gdp_growth_annual` is wired**, and from the expression that already
> existed. `pushHistory` computes `yoyGrowth(h.output)` into `history.growth`
> every tick, and the state field sat frozen at its START value one line away —
> two representations of one quantity, one of them never updated. Assigned from
> the history so they cannot drift. **`participation` deferred to 6.4**:
> wiring it is not a matter of reading the field, because participation is a
> share OF A WORKING-AGE POPULATION and this model has none — `labour_force` is
> 100 and constant, so there is nothing for 63% to be 63% of.
> `current_account` and `fx_change` deferred to the open economy (A5).
>
> **The structural fix is a `START_DEFERRED` register**, enforced in both
> directions by `test/params.test.js` exactly as `DEFERRED` and
> `SOLVED_FROM_MODEL` are. Both directions verified. The first version of the
> test was wrong and is worth recording: it counted mentions, but START's keys
> are SPREAD into `s`, so a field that is never explicitly assigned appears
> exactly once — as its only read — and the test flagged `capital_output_ratio`,
> `labour_share` and `term_premium`, all three properly wired.
>
> ### CORRECTION 17 — wiring the dead field immediately found a model defect, and it is the largest thing in Phase 5.
>
> `gdp_growth_annual` reads **1.056%** at the steady state against a
> `potential_growth` of 1.5. `supply.js:25` adds
> `annualToMonthlyFlow(s.investment)` — a **percent of potential output** — to
> `capital_stock`, a **level**. The investment flow feeding the capital stock
> is frozen at its month-zero value while potential grows away from 100. Same
> class as B2.
>
> | prediction | measured |
> |---|---|
> | K converges to a constant `I/δ` = 22.5/0.065 = **346.15** | **346.154** at m2400 |
> | growth decays to `gA = g·(1−α)` = **0.930%** | **0.9345%** at m1200, still falling |
> | K/Y falls from 3.0 | 2.89 (m96) · 2.66 (m240) · **2.05** (m600) |
>
> Isolated by scaling the flow by `potential_output`: growth returns to
> **1.493%** and K/Y to 2.83, and **the steady state stays exact to 9dp**.
>
> **Why nothing caught it, and this generalises.**
> `test/steady-state.test.js` checks `output_gap` (a ratio), `inflation` (a
> rate) and `consumption` (a percent of potential). **All three are invariant
> to this defect, because output and potential drift together.** The gate that
> exists to catch drift cannot see a common drift in the level, and the model
> had no real-growth number anywhere for anyone to look at — which is precisely
> what the dead field was.
>
> A second defect sits under it: `test/params.test.js`'s identity check
> hardcodes `0.06` against `DEPRECIATION_RATE = 0.065`, so the share that holds
> K/Y constant is **24.0**, not 22.5. A bare literal in a test, which is the
> class check (f) polices and does not cover.
>
> **Fixed in 5.7, as its own task with its own gate**, and two of the three
> predictions in this block turned out to be wrong in the useful direction.
>
> ### CORRECTION 18 — the blast radius was four quantities, not "every measurement".
>
> Correction 17 said the fix "moves every measurement in this audit". Measured
> across all six scenarios at m96, **only four moved**: `potential_output`,
> `capital_stock`, `gdp_growth_annual` and `approval`. Every ratio — output
> gap, inflation, unemployment, consumption, investment, debt, asset prices,
> credit gap, crisis probability — is identical to four decimals.
>
> **The model is almost entirely ratio-invariant, and that is the same fact as
> "nothing caught this for the model's whole life".** The one thing a player
> could have felt is `approval`, because it reads year-on-year REAL INCOME — a
> level — so it was the only channel through which a sagging ceiling reached
> the score.
>
> ### CORRECTION 19 — `investment_share` did not need re-deriving. The two depreciation rates needed equalising.
>
> Correction 17 said the share must go 22.5 → 24.0 because
> `DEPRECIATION_RATE = 0.065`. **The right reading is the opposite**, and both
> parameters say so themselves: `DEPRECIATION_RATE`'s note has always ended
> *"Keep them equal"*, and `SS_DEPRECIATION`'s says it *"Supersedes the old
> DEPRECIATION_RATE=0.065"*. A stated invariant that the values violated, in
> the file whose whole claim is that it is the authority — the retirement was
> decided and never applied. Equalised at **0.06**, which makes
> `(δ+g)·K/Y = (0.06+0.015)·3 = 0.225` and `investment_share = 22.5` correct as
> it stands. `test/params.test.js` now reads the parameter rather than a
> hardcoded 0.06, and a new test asserts the two are equal.
>
> **The invariant caught the fix on tick 2**, because `invariants.js` check 4
> carried the *same* unit error — which is precisely why it never caught the
> defect. Two copies of one wrong formula agree with each other perfectly.
>
> **Re-measured rather than left**, since a `SOLVED_FROM_MODEL` constant must
> be re-solved whenever the model changes: `CRISIS_IMPULSE_AMPLIFICATION`
> 2.1855 → **2.0461**, trough −9.000000 at month 12. Endogenous propagation
> 3.65 → **3.82**, UK sacrifice ratio 0.35 → **0.36**, `TAX_SHOCK_TO_GDP`
> 0.487 → **0.484**, transmitted Taylor response 1.96 → **1.94**, and
> `RATE_TO_INFLATION` at 24 months 0.1227 → **0.0797** — halved, because a hike
> used to be measured against a ceiling that was itself sagging.
>
> **`test/steady-state.test.js` gained the LEVEL assertion it never had.**

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
