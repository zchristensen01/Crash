# 05 — Handoff

> **Editor's note — 10 Aug 2026.** This document is preserved verbatim below.
> It was written against the docs as they stood *before* the same-day rewrite,
> so four things in it are stale. Corrections, in order of how badly they'd
> mislead someone:
>
> 1. **The interface decision changed.** §0 says "real-time terminal
>    simulator" and §1 describes `03-architecture.md` as the "Textual choice".
>    Both are out of date. The target is now a **single self-contained HTML
>    file** — no install, no server, no build step. Textual was right when the
>    constraint was "must run in a terminal"; that constraint was dropped. See
>    the rejected-alternatives table in `03-architecture.md`. Do not build a TUI.
> 2. **Docs 00–03 were rewritten** on 10 Aug 2026. §1's "Current" status refers
>    to the previous versions. `04-research-brief.md` and this file are the only
>    ones written after the rewrite.
> 3. **The pass-2 research report is not in this repository.** §1 lists it as an
>    asset and §4 (A4) says `SS_K_OVER_Y` (3.0), `SS_DEPRECIATION` (0.06) and
>    `SS_LABOUR_SHARE` (0.62) "now exist" — they do not appear in
>    `parameters.py`, which is byte-identical to its pre-pass-2 state at 52
>    parameters. The functional forms, kernel parameters and steady-state vector
>    described throughout §3 and §4 exist only in that missing report. **It has
>    to be recovered before `parameters.py` can be updated.**
> 4. **§1 understates the prototype's condition.** "Model is a simplification of
>    the docs" is generous. Six defects were found by running it — see the
>    defects table in `03-architecture.md`. Three of them invert the lesson they
>    were built to teach.
>
> **One synthesis this document and the architecture doc arrive at separately.**
> `03-architecture.md` records defect 1 as "the model won't sit still" and §4
> below records A1–A4 as "the demand block was never written." These are the
> same problem. A model with an ad-hoc additive demand term has no equilibrium
> to sit at, so the drift is a symptom. Patching the `mood` constant would have
> treated the symptom. **Defect 1 is closed by building A1–A4, not before.**
>
> **Two decisions taken on §4's open questions**, recorded here so they aren't
> re-opened:
>
> - **A5 (exchange rate): v1 is a closed economy.** `fx_change` is pinned to
>   zero, net exports are a constant, and the FX block is stubbed with the
>   signature it will eventually need. `ERPT_IMPORT_PRICES` and `ERPT_CPI` are
>   *retained but unused*, flagged as awaiting A5. Rationale: FX is an entire
>   subsystem (UIP, import share, J-curve) and the doc-02 lessons that depend on
>   it are minor terms — currency pass-through contributes ~0.2pp of inflation
>   on a rate cut. The cost of deferring is one small term; the cost of building
>   it now is delaying the assembly milestone the whole project is waiting on.
>   Reversible.
> - **A3 (the double-counting trap): the structural block wins.** Build
>   `C + I + G + NX` from A1/A2/A4 properly. The reduced-form multipliers —
>   `FISCAL_MULT_*`, `TAX_MULT_*`, `TRANSFER_MULT_*`,
>   `PERSONAL_TAX_RATE_TO_GDP`, `TAX_SHOCK_TO_GDP` — are then **not model terms
>   at all**. They become **validation targets in `scenarios.test.js`**: shock
>   government spending by 1% of GDP in a recession state, and assert the
>   assembled model produces a multiplier inside the published 1.0–2.5 range.
>   This resolves the trap §4 Tier C flags, and it converts the project's
>   best-sourced contested parameters from a liability into the test suite.
>   Where the assembled model lands *outside* the published range, that is a
>   finding worth surfacing rather than tuning away.

---

**For the next AI or contributor picking this up.** Read this before anything
else. It records what is settled, what two research passes changed, what is
still open, and — most importantly — the things neither research brief thought
to ask for.

---

## 0. What this project is

A real-time terminal simulator of a national economy, built to teach
macroeconomic cause and effect to someone starting from zero. Time runs
continuously (1 tick = 1 month), the player holds policy dials, effects arrive
on lags, and you either survive your term or break the country.

The design goal is **accuracy in direction and relative magnitude, plus honesty
about uncertainty**. It is more damaging for the model to confidently teach a
wrong relationship than to say "economists disagree, here is the range."

---

## 1. Current assets

| File | What it is | Status |
|---|---|---|
| `econ_sandbox.py` | Single-file playable prototype, quarterly, 4 dials | Runs; model is a simplification of the docs |
| `parameters.py` | 52 sourced parameters + 14 documented unknowns | Authoritative for numbers |
| `00-design-brief.md` | Game shape, win/lose, time, honest-note section | Current |
| `01-variables.md` | 42 state variables, types, starting values, scenarios | Current |
| `02-causal-map.md` | The domino map — chains, self-correction, crash, regimes | Current |
| `03-architecture.md` | File structure, Textual choice, build order | Current |
| `04-research-brief.md` | Second-pass research brief (Tiers 1–4) | Executed |
| Pass-2 research report | Functional forms for Tiers 1–3 | **Not yet folded into the docs or parameters.py** |

**Immediate outstanding task:** the pass-2 results exist only as a report. They
need to be merged into `parameters.py` and the docs. Nothing else should start
before that.

---

## 2. Settled — do not re-research

Re-litigating these wastes a pass. Marked `strong` or resolved:

**Behavioural core:** Okun β = 0.45 (state-dependent, see §3), Taylor rule
(1.5 / 0.5, smoothing 0.85), MPC 0.35 rising ~4.5pp per 1pp unemployment,
wage rigidity share 0.14, auto-stabiliser absorption 0.60.

**Monetary:** rate→output −0.3%/1pp at ~12mo, rate→inflation −0.3pp at ~24mo,
ELB −0.75% (confirmed), lag kernel shapes (gamma parameters given in pass 2).

**Fiscal:** Romer-Romer tax shock 2–3% GDP, crowding out 33 cents/$1 and
near-zero under slack, debt→yield ~3bp per 1pp.

**Crisis:** credit-to-GDP gap thresholds (3pp / 9pp), 3.5pp crisis probability
per SD, crisis trough ~9%, recovery ~5yr, permanent scar ~10% for a banking
crisis.

**Other:** tariff pass-through ~1.0, energy→CPI, minimum wage OWE −0.13,
immigration wage −0.044, housing supply elasticity 0.5–3.0, education return 9%.

**Permanently contested — the spread IS the answer, stop looking for a point
estimate:** fiscal multipliers (0.5–2.5, and Ramey-Zubairy dispute the
state-dependence itself), immigration wage effects (Borjas vs Card/Peri),
house-price rate semi-elasticity (1.2 to 8 across credible methods), r\* (−0.7
to +1.6 across models).

---

## 3. What pass 2 changed — seven design revisions

1. **Deficit monetisation must be gated.** The prototype applies printing to
   inflation unconditionally, which *inverts* the QE lesson. Correct form:
   `passthrough = credibility_factor × slack_factor`, a smooth 0→1 ramp.
   Anchored + slack ⇒ ~0. Unanchored + hot ⇒ ~1. Highest-priority fix.
2. **Asset prices need a one-sided fire-sale term.** `max(0, leverage −
   leverage_max)` only bites on the downside. Without it, booms and busts are
   symmetric and no bubble can be taught.
3. **The wage-price spiral is rare.** Alvarez et al. (IMF 2022): of 79
   accelerating episodes since the 1960s, only a small minority spiralled
   further after eight quarters. Demote from default engine to switch-gated
   regime (`credibility < 0.5` AND backward-looking expectations).
4. **DNWR was double-counted.** A hard 0% floor *and* a 0.20 strength
   multiplier model the same friction twice. Model it once as bunching-at-zero
   (share 0.14) and **delete `CLASSICAL_WAGE_CORRECTION_STRENGTH`**.
5. **Bond-yield nonlinearity is currency- and ownership-driven, not
   level-driven.** This is the only way one equation reproduces both Japan
   (high debt, low yields, sustained) and a periphery repricing. Requires a new
   `foreign_share` state variable.
6. **Monetary transmission is asymmetric by sign** (~1.5:1 hikes vs cuts,
   Tenreyro-Thwaites) **and Okun's β is state-dependent** (0.45 normal, 0.15–
   0.23 under labour hoarding). Both are switches, not constants.
   `hiring_momentum` is confirmed as the right labour representation.
7. **Confidence is near-decoration.** Only the fundamentals-orthogonal residual
   is causal, and its incremental predictive power is small (Carroll-Fuhrer-
   Wilcox 1994; Ludvigson 2004). Do not make it a major driver.

---

## 4. What is still open — and neither brief asked for it

**This is the important section.** Both research briefs assumed the core demand
block was already specified. It is not. The passes produced excellent
*peripheral* equations (asset prices, yields, spreads, crisis dynamics) while
the engine at the centre remains unwritten.

### Tier A — blocks assembly. Nothing runs without these.

**A1. The consumption function has never been assembled.**
`MPC_BASE`, `MPC_UNEMPLOYMENT_SLOPE`, `WEALTH_EFFECT` and
`HAND_TO_MOUTH_SHARE` all exist as isolated parameters. There is no equation
combining disposable income, wealth, credit constraints and the hand-to-mouth
share into a consumption path. Pass 1 gave `C = a + MPC·YD + θ·wealth` as a
sketch and never returned to it.

**A2. The investment function has never been assembled.**
Same problem. `INVESTMENT_RATE_ELASTICITY` (1.5% per 1pp) exists; the
accelerator on output is mentioned in prose; `FINANCIAL_ACCELERATOR_STRENGTH`
feeds it from the spread side. No assembled equation, no user-cost-of-capital
formulation, no link to the capital stock.

**A3. Output determination — how C + I + G + NX becomes the output gap.**
The single largest hole. There is no specification of how demand components
aggregate, how the multiplier is implemented, or how demand meets the supply
constraint. The prototype uses an ad-hoc additive `demand_pressure` term. Every
lever's effect routes through this and it has never been specified.

**A4. The production function and potential output.**
`SS_K_OVER_Y` (3.0), `SS_DEPRECIATION` (0.06), `SS_LABOUR_SHARE` (0.62) and
`DEPRECIATION_RATE` now exist — the ingredients for a Cobb-Douglas
`Y* = A·K^α·L^(1−α)` — but nobody has written it, and nothing connects
investment → capital stock → potential output. The prototype grows capacity at
a flat 0.5%/quarter, which makes government investment and R&D levers
meaningless.

**A5. The exchange rate has no equation at all.**
`ERPT_IMPORT_PRICES` (0.5) and `ERPT_CPI` (0.15) exist — pass-through
coefficients with nothing to pass through. No UIP condition, no FX
determination, no net-exports equation, no import share, no J-curve
implementation. Either build it or explicitly declare the model closed-economy
and delete the ERPT parameters.

**A6. Money supply determination.**
`M·V = P·Y` needs M. Pass 2 delivered the velocity equation, but nothing says
how M is determined — QE, deficit monetisation, and bank credit creation all
feed it and none are wired. The printing lesson depends on this closing.

### Tier B — dangling symbols

Pass-2 equations reference variables that have no equation of their own. Each
is a small hole that will stop a build cold:

| Symbol | Appears in | Status |
|---|---|---|
| `expected_earnings_growth` | 1.1 asset prices (coefficient B) | Coefficient never estimated, variable never defined |
| `fundamental[j][t]` | 1.1 mean-reversion anchor | Undefined — what IS the fundamental value? |
| `panic[t]` | 1.2 bond yield | Declared, never specified |
| `labour_productivity[t]` | 1.5 employment | No equation; ties to A4 |
| `productivity_growth[t]` | 1.6 wage equation | Same |
| `recovery` (loss given default) | 1.3 credit spread | Never given a value |
| `leverage_ss`, `DSR_ss`, `capital_min` | 1.3 | Steady-state anchors not specified |
| `stock_returns[t]` | 3.2 confidence | Circular with 1.1 unless ordered carefully |

### Tier C — worth knowing, not blocking

- **Hysteresis in ordinary recessions**, not just financial crises. Cerra-Saxena
  covers crises; whether a garden-variety recession permanently scars potential
  output is contested and would change how punishing the game feels.
- **Expectations of growth**, distinct from inflation expectations. Feeds
  investment and asset prices; currently absent.
- **Fiscal multiplier vs. structural demand block.** If you build A1–A3
  properly, the reduced-form multipliers in `parameters.py` will **double-count**
  the same channels. Decide which representation wins before coding. Nobody has
  flagged this and it is a live trap.
- **Interaction of the ELB with low credibility.** If you are at the lower bound
  *and* expectations are unanchored, you have no working tools. This is the real
  nightmare scenario and the model should be able to represent it.
- **Validation targets.** Pass 2 gave scenario starting vectors but no target
  paths. Without "the model should reproduce roughly X over Y years", there is
  no way to know if the assembled system is right.

---

## 5. Known modelling traps

**Time aggregation.** The model runs monthly; nearly every estimate is
quarterly or annual. Dividing an annual coefficient by 12 is correct for linear
terms and **wrong for anything nonlinear or compounding**. Pass 2 gave
conversions for individual channels but no general rule. Write one, in one
place, and route every conversion through it.

**Stability.** There are now ~70 parameters and at least four reinforcing
loops (credibility→κ→inflation→credibility; credit→asset prices→collateral→
credit; spread→investment→output→defaults→spread; expectations→wages→prices→
expectations). Nobody has checked whether the assembled system is stable. It
can very easily be explosive. Before tuning for playability, run the linearised
system and check that no eigenvalue exceeds 1 in modulus around the steady
state. This is an engineering risk, not an economics one, and it will not
announce itself politely — it will just diverge.

**Stock-flow consistency at runtime.** Pass 2 delivered a steady-state vector
that satisfies the identities. There is still no *runtime* invariant check.
Assert every tick: sectoral balances sum to zero, debt accumulation matches the
deficit, `K` matches its own law of motion. Failing loudly on tick 3 beats
debugging silent drift on tick 300.

**Judgement parameters masquerading as findings.** The fire-sale coefficient,
the asset credit channel, mean reversion, and the recap multiplier are all
`judgement` — calibrated to produce desired behaviour, not measured. They are
tuning dials. Keep them visibly labelled so a future contributor does not treat
them as evidence.

---

## 6. The honest recommendation

**Stop researching. Start assembling.**

Two passes have produced roughly 70 parameters, a full causal map, and a
prototype that is a simplification of the design rather than an implementation
of it. The gaps identified in §4 are not research gaps — A1 through A4 are
*standard textbook equations* whose parameters are already in hand. They were
missed because both briefs asked about policy levers and exotic mechanisms
while assuming the boring centre was covered.

A third research pass would find little. What is needed is:

1. Fold pass-2 results into `parameters.py`
2. Write A1–A4 from standard forms using existing parameters
3. Decide the exchange-rate question (A5) — build it or declare closed-economy
4. Fill the Tier B dangling symbols, most of which resolve once A4 exists
5. Assemble, run the steady-state test for 200 ticks
6. Check stability
7. *Then* tune for playability

Step 5 is the real milestone. Everything before it is preparation and
everything after it is refinement.

---

## 7. Standing conventions

**Parameter format.** `P(value, low, high, unit, confidence, source, note)`.
Confidence scale: `strong` / `moderate` / `weak` / `contested` / `judgement`.
Every parameter carries units. Most modelling bugs enter through units.

**Document hierarchy.** `parameters.py` is the record for numbers; the markdown
docs are the explanation. Where they disagree, the parameters file wins — but
it is the record, not the authority: newer sourced research supersedes it and
the file gets updated.

**On disagreement.** Never average away a real dispute. Mark it `contested`,
give both camps, state which the model codes as default and why. Showing the
player that economists disagree is a feature of this project, not a failure.

**On the teaching goal.** Every mechanism should be inspectable. The `why`
panel showing each term's contribution is not a nice-to-have — it is the
difference between a black box and a teaching tool. No rule may modify state
without recording why.
