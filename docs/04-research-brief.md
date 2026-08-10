# 04 — Research Brief

## What this is

A second research pass. The first one (recorded in `parameters.py`) produced 52
well-sourced coefficients and was a success. It also left 14 entries in
`UNKNOWNS` and — more seriously — answered several questions in prose when the
model needs an **equation**.

This brief exists to close that gap. It is written to be handed to a deep
research agent or worked through by a person with journal access.

**The single most important instruction:** for every question below, the
deliverable is a *functional form with named parameters*, not a paragraph
describing what is known. "Direction is clear but no quantified equation was
returned" is the failure mode this pass is designed to eliminate. If the
literature genuinely will not support an equation, say so explicitly and
propose a defensible functional form labelled `judgement`, with the reasoning
shown. A labelled guess is usable. A paragraph is not.

Read `01-variables.md` and `02-causal-map.md` first. They define what the
equations have to connect to.

---

## Rules of engagement

**Source quality, in order of preference**

1. Meta-analyses and systematic reviews (this is how `MPC_BASE` and
   `MIN_WAGE_OWN_WAGE_ELASTICITY` were settled — prefer them wherever they exist)
2. Central bank working papers and published model documentation (BoE, Fed,
   ECB, BIS, IMF) — these are written by people who had to make the thing run
3. Peer-reviewed empirical papers with a stated identification strategy
4. Textbook/consensus statements — acceptable for functional *form*, weak for
   magnitude

**Scope.** Advanced economies, post-1990 where the relationship is known to
have shifted (Phillips slope, exchange-rate pass-through, Okun's beta). Flag
clearly when evidence is drawn from emerging markets or high-inflation
episodes, because several of these relationships are known to differ by regime
and the model needs to know which world a number came from.

**On disagreement.** Do not average away a real dispute. If credible
economists disagree about the *sign* or the *mechanism*, mark it `contested`,
give both camps with their leading citations, and state which one the model
should code as its default and why. The disagreement is a feature of this
project — see the honest-note section of `00-design-brief.md`.

**State the identification strategy.** A number from a narrative-identified
study and a number from an unconditional regression are not the same kind of
number. Say which it is.

**Report units obsessively.** Per year or per quarter. Percent or percentage
point. Level or change. Most modelling bugs enter here.

---

## Required output format

Every answered question returns two things.

**1. The parameters**, in the exact shape `parameters.py` already uses, so they
paste straight in:

```python
ASSET_PRICE_RATE_SEMI_ELASTICITY = P(
    0.0, 0.0, 0.0, "% change in real asset prices per 1pp fall in the real rate",
    "moderate", "Author Year, Journal; second source",
    "Identification: ... . Advanced economies, 1990-2019. Differs in EMs "
    "because ... . Contested by X, who find ... .")
```

**2. The equation**, as a code block, with every symbol defined and every
parameter cross-referenced to the block above:

```
asset_prices[t] = asset_prices[t-1] * (1 + g[t])

g[t] =  -A * (real_rate[t] - neutral_real_rate)      # discount-rate channel
        + B * expected_earnings_growth[t]            # cash-flow channel
        + C * credit_growth[t]                       # leverage channel
        - D * max(0, leverage[t] - leverage_max)     # fire-sale term
```

Where a relationship is nonlinear, conditional or regime-switching — several
below are — return the **switch condition explicitly**, not a description of
it. `if credibility < X: use form 2` is codeable. "Escalates once credibility
drops" is not.

State the intended **timestep**. The model runs monthly. Most macro estimates
are quarterly or annual; give the conversion, and say whether the relationship
survives it.

---

# TIER 1 — Blocks the build

Nothing can be written until these exist. Doc 01 specifies 42 state variables;
26 currently have no equation and no home. These seven questions cover the
ones carrying doc 02's headline mechanisms.

### 1.1 The asset price equation

*Already flagged in `UNKNOWNS['asset_price_equation']` as needing its own pass.*

**Why it blocks everything:** `asset_prices` drives the wealth effect (a term
in consumption) *and* the collateral loop that generates every bubble in
`02-causal-map.md` Part 3. Two headline mechanisms, one missing equation. It is
the highest-value single item in this brief.

**Needed:** a monthly law of motion for a combined equity+housing index, with
separate identified coefficients for (a) the real interest rate / discount
channel, (b) the credit-growth or collateral channel, (c) mean reversion toward
some fundamental anchor, and (d) the fire-sale/forced-selling term that makes
the crash asymmetric. Housing and equities behave differently enough that a
justified weighting of the two is part of the answer.

**Acceptance:** must be able to generate a credit-financed bubble that inflates
over ~5 years and deflates over ~1, without hand-tuned scripting. If the
equation can only do symmetric booms and busts, it has not answered the
question.

### 1.2 The bond yield level equation

**Why:** `DEBT_TO_YIELD` gives a *slope* (3bp per 1pp of debt/GDP) but there is
no equation for the yield **level**. Without one there is no interest cost, no
crowding out, no debt-crisis ending, and no debt brake — Self-correction 5 in
doc 02 simply does not exist. The prototype charges interest at the policy
rate, which is wrong in exactly the situation that matters.

**Needed:** 10-year nominal yield as a function of expected short rates
(policy path), a term premium, expected inflation, debt/GDP, the deficit, and
a nonlinear risk premium that switches on at high debt. Specifically required:
**what makes a yield go nonlinear.** Advanced economies sit at 100%+ debt/GDP
with low yields for decades and then reprice suddenly. Return the condition
under which the linear term breaks down — currency denomination, foreign-held
share, central bank purchases, whatever the evidence supports.

**Acceptance:** must reproduce both Japan (very high debt, low yields,
sustained) and a periphery-style repricing. A model that cannot represent both
will teach that high debt is either always fine or always fatal, and both are
wrong.

### 1.3 The credit spread equation

**Why:** `credit_spread` is the transmission belt of the doom loop in doc 02
Part 3 — bank losses widen spreads, spreads collapse investment, output falls,
defaults rise. Without it the crash is a game-over screen rather than a
mechanism.

**Needed:** corporate/household spread over the policy rate as a function of
leverage, asset prices, bank capital, defaults and output. Include the default
rate's own equation — what share of borrowers goes bad, as a function of debt
service burden and unemployment. Include how bank capital (`bank_capital_ratio`
already in `START`) absorbs losses and when it forces deleveraging.

**Relevant existing parameters:** `BANK_CAPITAL_TO_LOAN_RATE`,
`BANK_CAPITAL_TO_GDP`, `FINANCIAL_ACCELERATOR_STRENGTH` (note the warning
attached to that last one — do not let this become a large output multiplier).

### 1.4 Lag kernel shapes

*Already flagged in `UNKNOWNS['lag_shapes']`.*

**Why:** `LAGS_MONTHS` gives the month of peak effect for 19 channels. It gives
no distribution. For a real-time simulator the shape matters as much as the
peak: a step function and a hump with the same peak produce completely
different games, and the prototype's step function is defect 4 in
`03-architecture.md`.

**Needed:** for the four channels that matter most — `rate_to_investment`,
`rate_to_output`, `rate_to_inflation`, `spending_to_output` — the actual
impulse response shape from published VAR/DSGE work. Onset month, peak month,
month at which half the effect has landed, and the month by which it has
decayed. A fitted gamma or beta kernel with stated parameters is the ideal
answer.

**Also needed:** do the shapes differ by *sign*? Doc 02's Asymmetry 1 claims
cutting is "pushing a string" and hiking is "pulling a rope". Is there evidence
for asymmetric monetary transmission, and if so, how much?

### 1.5 Employment adjustment asymmetry

**Why:** `HIRING_SPEED = 0.25` and `FIRING_SPEED = 0.60` sit in `parameters.py`
as **bare floats with no `P()` wrapper, no range and no citation** — the only
two numbers in the file without provenance. Doc 02 calls this asymmetry "most
of why monetary policy is hard." It deserves better than a guess.

**Needed:** evidence on labour adjustment speed asymmetry — job destruction vs
job creation rates over the cycle (Davis & Haltiwanger and successors), how
fast unemployment rises in a downturn vs falls in a recovery, and whether this
is best modelled as asymmetric adjustment speeds, a nonlinear Okun relationship,
or a hiring-momentum state variable. Doc 01 posits `hiring_momentum` as a state
variable; confirm or reject that as the right representation.

**Note:** `OKUN_BETA` is well sourced but its note records real instability
(−0.45 US, −0.15 Japan, −0.23 euro area post-Covid from labour hoarding). Is
Okun's beta itself state-dependent, and on what?

### 1.6 The wage equation and the nominal floor

**Why:** `wage_level` and `wage_growth` are in doc 01 with no equation.
`WAGE_RIGIDITY_SHARE` (0.14) and `CLASSICAL_WAGE_CORRECTION_STRENGTH` (0.20,
`judgement`) exist but nothing connects them. Self-correction 4 — the argument
for intervention — cannot be modelled without this.

**Needed:** a wage Phillips curve of the form `Δw = f(expected inflation,
unemployment gap, productivity)` with identified coefficients, plus the
mechanism for downward nominal rigidity. Specifically: is DNWR best modelled as
a hard floor at 0%, as a fraction of workers at exactly zero, or as a
distribution that bunches at zero? Doc 02 asks for both a hard floor and a 20%
strength multiplier, which may be double-counting the same friction — resolve
that.

**Also needed:** the wage-price spiral. Under what conditions does
`wages → prices → wages` actually become self-sustaining? Recent work
(Alvarez et al., IMF 2022 on wage-price spirals) suggests it is rarer than
assumed. This matters because it is the model's main inflation-spiral engine.

### 1.7 An internally consistent baseline

**Why:** this is defect 1 in `03-architecture.md`. The prototype does not sit
still — left alone it drifts to a permanent +0.6% output gap and a 12pp credit
gap. Fixing that is not a coding problem; it requires a set of starting values
that are *mutually consistent* — a genuine steady state where every rule's
output equals its input.

**Needed:** for a representative mid-size advanced economy, a coherent
long-run equilibrium vector: potential growth, r\*, natural unemployment,
inflation at target, the implied policy rate, term premium and 10y yield,
steady-state credit/GDP and its growth rate, debt/GDP consistent with the
deficit and nominal growth, capital/output ratio consistent with the
depreciation rate and investment share, and the labour share.

**Acceptance:** the returned vector must satisfy the standard accounting
identities — `debt` stable when `deficit = debt × (nominal growth)`,
`K` stable when `I = δK`, credit/GDP stable when credit growth equals nominal
GDP growth. Show the arithmetic. If `START` in `parameters.py` violates any of
these, say which and give the corrected value.

**Note:** `EFFECTIVE_LOWER_BOUND = -0.75` is also an unsourced bare constant.
Confirm or correct it while you're here.

---

# TIER 2 — Blocks the intended lessons

The model runs without these. It just doesn't teach what it claims to.

### 2.1 Velocity

*Already flagged in `UNKNOWNS['velocity_dynamics']`.*

`M×V = P×Y` is an identity, but V is endogenous and the first pass found no
usable equation. V is precisely what breaks the naive
printing-money-causes-inflation story, so the model cannot teach the printing
lesson honestly without it.

**Needed:** an equation for velocity as a function of nominal interest rates,
inflation expectations and perceived monetary stability. Include the flight-
from-money regime: at what inflation rate does velocity start rising sharply,
and how fast? That nonlinearity is the hyperinflation loop.

### 2.2 Deficit monetisation — the model's central nonlinearity

*Already flagged in `UNKNOWNS['deficit_monetisation_in_advanced_economies']`,
which itself calls this "the model's key nonlinearity and also its central
lesson."*

The first pass established the qualitative answer: strong pass-through in
EM/high-inflation settings, near-zero in advanced economies with slack and
anchored expectations. That is correct and useless to code.

**Needed:** the conditional function itself. `inflation_from_printing =
f(money_printed, output_gap, credibility, debt_level)` with the switch
conditions stated numerically. At what combination of credibility and slack
does pass-through go from ~0 to ~1? Is the transition smooth or a threshold?

**This is defect 2 in `03-architecture.md`** — the prototype applies printing to
inflation unconditionally, which inverts the QE lesson. It is the highest-
priority Tier 2 item.

### 2.3 Credibility dynamics

**Why:** credibility is the switch between κ=0.05 and κ=0.20 — doc 02 calls it
the difference between a toy and a model that teaches something. But *how fast
it moves* is entirely invented. The prototype uses `credibility_decay = 0.02`
and `credibility_repair = 0.010` per quarter, with no source, and those two
numbers decide the entire pace of the game.

**Needed:** empirical work on inflation expectation anchoring — how it is
measured (survey dispersion, breakeven sensitivity to data surprises,
long-horizon forecast responsiveness), how fast it deteriorates during an
inflation miss, and how long it takes to rebuild. The Volcker disinflation and
the 2021–2024 episode are the two obvious natural experiments; what do they
imply about the asymmetry between losing and regaining credibility?

**Also needed:** `expectation_speed = 0.30` per quarter is likewise unsourced.
What is the actual adaptive/rational weighting in expectation formation, and
does it shift with the level of inflation?

### 2.4 Crisis recovery

*Already flagged in `UNKNOWNS['crisis_recovery_path']`.*

The first pass documented what stops a crisis qualitatively — lender of last
resort, deposit insurance, recapitalisation, time. It returned no recovery
function, so a crash is currently a game-over screen rather than a phase you
play through.

**Needed:** the shape of post-financial-crisis recoveries. Jordà, Schularick &
Taylor's "When Credit Bites Back" establishes that they are deeper and slower;
quantify it — output path relative to trend, years to recovery, whether
potential output is permanently scarred and by how much (hysteresis). Plus the
policy response function: how much does prompt recapitalisation shorten it?

**Design consequence:** if scarring is real and large, surviving a crash needs
to be a distinct, harder game state rather than a reset.

### 2.5 Automatic stabilisers — the implementation

**Why:** `AUTO_STABILISER_ABSORPTION` (0.60) is well sourced, and doc 02 says
"code it as `disposable_income -= 0.6 × market_income_shock`". But there is no
`transfers`, no `tax_revenue` and no `deficit` state variable, so there is
nothing to route it through.

**Needed:** the decomposition into codeable pieces — the progressive tax
elasticity to income, the benefit-uptake elasticity to unemployment, and the
timing of each. Doc 02 says progressive income tax is the largest channel and
unemployment benefits the most timely; turn that ordering into two coefficients
and two lags.

---

# TIER 3 — Currently invented, and the docs admit it

`UNKNOWNS['sentiment_confidence_approval']` says "ZERO empirical basis was
returned for any of these... they are not really economics."

**That conclusion should be challenged.** These are well-studied in political
science and applied macro; they were probably searched for as economics and
therefore not found. Re-run them against the right literature.

### 3.1 Approval — the economic voting literature

`approval` is the player's health bar and it is entirely fabricated. But
economic voting is a large, mature field: Lewis-Beck & Stegmaier's reviews,
Hibbs on the weighted-income-growth model, Achen & Bartels on myopic
retrospection.

**Needed:** the relative weight voters place on unemployment vs inflation
(the "misery index" weighting is testable, and the answer is not 1:1), the
time horizon voters actually respond to — Bartels' finding that only the
election-year economy matters is directly relevant to a fixed-term game — and
the typical magnitude of approval response to a 1pp move in each.

**Design consequence:** if voters are genuinely myopic, "fix it in year 7"
becomes a viable and deeply cynical strategy, which is a real lesson.

### 3.2 Confidence indices

`consumer_confidence` and `business_confidence` drive consumption and
investment in doc 02 but have no equation.

**Needed:** what actually moves the Michigan / Conference Board / equivalent
indices, and — the harder question — whether they carry *independent*
predictive power for consumption beyond fundamentals. Carroll, Fuhrer & Wilcox
1994 and Ludvigson 2004 are the standard references and are somewhat
skeptical. If confidence is mostly an echo of fundamentals, say so and the
model should treat it as near-decoration rather than a causal channel.

### 3.3 Scenario starting vectors

`01-variables.md` section H specifies six scenarios; the numbers there are
stated as design defaults, not historical calibrations.

**Needed:** actual historical values for the four named in
`00-design-brief.md` — 1970s stagflation, 2008 balance-sheet recession, 2021
post-shock inflation, Japan's liquidity trap — as complete starting vectors in
the model's variables. Where a scenario cannot be represented in the model's
current state space, say which variable is missing.

**Acceptance:** each vector must be internally consistent by the same tests as
question 1.7.

---

# TIER 4 — Do not research yet

These are in `UNKNOWNS` but correspond to dials the game does not have. They
matter only if the dial set expands beyond rate/tax/spend/print. Listed so
they aren't lost:

`wealth_tax_macro_effects` · `fertility_response_to_family_policy` ·
`retirement_age_magnitude` · `union_coverage_and_regulation_effects` ·
`capital_controls` · `employment_protection_to_unemployment_level` (first pass
concluded: code as ~0 on the level — accept and move on) ·
`reserve_requirements_advanced` (first pass concluded: defunct in advanced
economies, drop the lever — accept and move on) ·
`forward_guidance_magnitude` (partially absorbed into question 2.3)

---

## What not to research

- **Anything already marked `strong` in `parameters.py`.** Okun, the Taylor
  coefficients, MPC, wage rigidity share, tariff pass-through, energy-to-CPI,
  the credit gap threshold, auto-stabiliser absorption. These are settled for
  this project's purposes. Re-litigating them wastes the pass.
- **Better point estimates for things already marked `contested`.** The spread
  *is* the finding — fiscal multipliers, immigration wage effects. Do not go
  looking for the true value; there isn't one.
- **General surveys of macroeconomics.** Every question here is a request for a
  specific number or a specific functional form.

---

## Deliverable

One markdown document, structured by the question numbers above. For each:

- [ ] The parameters, in `P(...)` form, ready to paste into `parameters.py`
- [ ] The equation, as a code block, symbols defined, timestep stated
- [ ] Switch conditions written numerically where the relationship is
      conditional or nonlinear
- [ ] Confidence level from the existing five-point scale
- [ ] Citations with identification strategy noted
- [ ] Explicit statement where no defensible number exists, plus a labelled
      `judgement` fallback so the model can still be built

Plus one summary section: **which of these findings change the design**, in the
style of the "Post-research revisions" section of `00-design-brief.md`. The
first pass changed four things and recorded why; that record turned out to be
the most useful part of the exercise. Do it again.

Anything that contradicts the current docs should say so loudly. Where a
number here disagrees with `parameters.py`, this brief's successor wins and
`parameters.py` gets updated — the file is the record, not the authority.
