# 10 — State of the project

> **LIVING DOCUMENT, and the one to read first if you are new.** Everything
> else in `docs/` is either the design (`00`–`03`), a dated record of a
> research or audit pass (`04`–`08`), or reference (`01`, `09`). This file says
> what exists today, what it does, what is known to be wrong, and what is
> deliberately not built.
>
> Last verified against the code on the commit that added it. The numbers below
> come from `npm run check`, not from memory.

---

## What it is

A real-time macroeconomic sandbox that runs in a browser. You are the
government and the central bank of a mid-size advanced economy for eight years.
Time runs continuously; you hold five policy dials; every number on screen can
be clicked to show the exact arithmetic that produced it. You either survive
the term or you break the country.

The point is not to win. The point is that after twenty failed runs you
understand why central bankers look tired.

**What makes it different from the other economy games:** the numbers are
sourced. `parameters.py` is a research bibliography that happens to be
executable — 121 coefficients, each with a plausible range, a confidence level
and a citation. Where the literature genuinely disagrees, the parameter says
`contested` and the disagreement is preserved rather than averaged away. Where
the model disagrees with a published estimate, a test says so on every run
rather than a coefficient being quietly nudged.

## Current state, in numbers

| | |
|---|---|
| Model | 23 rules, ~4,100 lines of dependency-free JavaScript |
| Parameters | 121, of which 41 are registered as deliberately unread |
| Tests | 95 — 92 pass, 0 fail, 3 documented `todo` disagreements, ~0.4 s |
| Deliverable | one self-contained `index.html`, 324 kB, no CDN, no `node_modules` |
| Docs | 13 files, ~44,000 words |
| Runtime deps | none. Node 20+ to build and test, Python 3 to regenerate parameters |

## What works

**The model sits still.** 200 ticks of no input and nothing drifts. That is the
milestone test and it is load-bearing: a model that will not sit still is
unplayable, and every bug you find later is that bug.

**The accounting closes every tick.** Eight identities are asserted on every
one of them — output, the budget, debt accumulation, the capital law of motion,
credit stock-flow, the price level against cumulative inflation, hard bounds,
and per-component demand plausibility. An invariant failing is always a rule
bug; it is never the thing to relax.

**Policy transmission is lagged, and the lag is visible.** Moving a dial
schedules the change into a kernel that peaks at the documented month, and the
pipeline panel shows what is in flight. Markets reprice in a month; the real
economy takes three quarters.

**The conditionals point the right way.** A rate cut with slack buys 91%
output and 9% prices; the same cut at capacity buys 71/29. The fiscal
multiplier runs about 2.0 at a −5% gap and 0.69 at +1.4%. Printing into slack
buys real output; printing at capacity buys prices. Cuts are weaker than hikes.
Easing stops working near the lower bound, and QE still works there. All of
these ran backwards before the `07` audit, and each now has a named test.

**The crash chain is real.** A financial crisis takes output down ~10pp and
unemployment up ~2pp, bottoms in about a year, recovers over five, and leaves a
permanent scar. Spending in the first year halves the scar. Forced selling
fires, and then stops, because the distressed sellers run out. Banks below their
capital floor cut lending.

**Six scenarios, each driven rather than asserted,** and each still in its
advertised regime a quarter in. The bubble holds every visible gauge in the
healthy band for four years while the credit gap crosses the BIS danger line.

**Determinism.** Same seed, byte-identical 96-month history. Ghost runs and
same-seed restarts depend on it and a test greps for `Math.random`.

## What is known to be imperfect

Ordered by how much it matters, and none of it hidden.

### Open disagreements with the literature

Recorded as `todo` tests that print their measured value on every run:

| | Model | Published | Why it is not being closed |
|---|---|---|---|
| `RATE_TO_INFLATION` | 0.12pp | 0.2–0.4 | The anchored Phillips slope doing exactly what `docs/02` says it should. The published range spans regimes including the unanchored 1970s |
| `TAX_SHOCK_TO_GDP` | 0.33% | 2.0–3.0 | Romer–Romer is the largest tax multiplier in the literature and famously larger than structural models produce |

And one parameter conflict, in `parameters.py` `CONFLICTS`:

| | |
|---|---|
| `ENERGY_TO_CPI` | Says 0.04pp of CPI per 10% energy rise, which makes the oil event's 60% spike worth 0.24pp. The event uses 2.4pp. Exactly 10×, and 0.04 looks like a transcription error for 0.4. Needs the source, not a keystroke |

And one magnitude error found while writing `11-cause-and-effect.md`, tracked
the same way:

| | Model | Published | |
|---|---|---|---|
| `CRISIS_OUTPUT_TROUGH` | −24% | −6 to −15 | A REDUCED FORM USED AS A STRUCTURAL SHOCK. −9% is the *observed* peak-to-trough fall, which already contains the multiplier; `crisis.js` feeds it in as an exogenous demand impulse and the model multiplies it again. `CRISIS_HYSTERESIS_SCAR` compounds it by landing as an immediate cut to potential when Cerra-Saxena measure divergence from *trend* over years. Same class of error as decision A3 |

### Structural absences

These bound what the game can teach. Each is registered in `parameters.py`
`DEFERRED` so it reads as a decision rather than an oversight.

1. **The open economy** (decision A5). No currency, no trade, no import prices.
   That rules out sudden stops, currency crises and imported inflation — three
   of the most common ways a real country breaks. 4 parameters idle.
2. **No distribution.** One representative household. The game's best line is
   "you are choosing which group of people to hurt", and the model cannot
   represent the groups.
3. **Expectations are entirely adaptive.** No forward guidance, no announcement
   effects, no reason credibility is worth anything *before* it is tested.
4. **No household or firm balance sheets.** A bank capital ratio and an
   aggregate credit stock, and that is all. Debt-service distribution — where
   mortgage resets and refinancing walls live — is absent.
5. **`govt_investment` vs `govt_consumption`** is unbuilt, though `docs/02`
   DIAL 4 asks for it. Only one of them raises the ceiling, and that is the
   lesson.
6. **Smaller deferred levers:** corporate tax, immigration, minimum wage,
   tariffs, education, R&D, housing supply.
7. **Hysteresis in ordinary recessions.** Flagged open in `UNKNOWNS`; the
   evidence is about crises.
8. **Demographics and labour force are constant.**

### Validation that has not been done

This is the honest answer to "is it accurate". Six reduced forms are checked at
a single horizon; that is the floor, not the ceiling.

1. **No historical episode test.** `UNKNOWNS['validation_target_paths']` says it
   out loud: the research passes gave starting vectors but no target *paths*.
   Feeding the model the actual policy path of US 2008–12, US 2021–23, Japan
   1995–2005 or UK 1979–83 and checking it produces the qualitative arc is the
   highest-value thing left, and nothing else substitutes for it.
2. **No uncertainty propagation.** Every parameter carries `low`/`high` and
   nothing runs the model across them. The whole model is currently one draw
   from a wide joint distribution. A Monte Carlo would say which lessons are
   robust and which are artefacts of a point estimate — and it is exactly what
   "show the range rather than pretending to a point estimate" implies.
3. **No impulse-response shapes.** Published VAR IRFs give a whole curve; the
   validation suite checks one point on it.
4. **No step-size independence check.** The model is a monthly forward-Euler
   integration and nobody has verified the answers are not partly an artefact
   of the discretisation.
5. **No global stability map.** `stability.test.js` linearises at the steady
   state; the audit added two sweeps over the gap; there is no systematic map
   of the state space.

### Interface gaps

Detailed in `09-interface.md`. The largest: **the `why` panel only opens from
the seven headline gauges**, while every rule records a trace — so
`investment`, `credit_spread`, `asset price change`, `deficit`, `wage_growth`,
`velocity` and the rest are all computed, all explained, and all unreachable.
That is the cheapest large win available.

Also: confidence levels are not rendered as bands anywhere, despite `docs/01`
asking for it and 29 of 121 parameters being `weak`, `contested` or
`judgement`. And the accessibility work listed in `09` is genuinely undone, not
merely unpolished.

### Engineering

No CI, no lint, no type checking, no coverage. The type checking matters more
than it sounds: JSDoc plus `tsc --checkJs` would have caught the ten undeclared
state fields statically, before they needed an audit to find.

## What "accurate" can and cannot mean here

Worth stating plainly, because it is the thing most likely to be
misunderstood.

Macroeconomics has no ground truth to be accurate *to*. The Phillips slope fell
by a factor of three between the 1970s and now. `OKUN_BETA` is marked
`contested` and ranges 0.15–0.55 across credible estimates. Auerbach &
Gorodnichenko and Ramey & Zubairy disagree about whether the state-dependent
fiscal multiplier exists at all. A model that reproduced any single published
number exactly would be fitting one study, not being right.

So the bar this project can actually clear, and mostly does:

- **Right sign** on every documented chain.
- **Right conditional** — the response changes with the state in the direction
  the evidence says, which is where six of the audit's findings were.
- **Magnitude inside a published range**, or a test that says why not.
- **Every disagreement stated**, in the parameter file, in a test, or both.
- **Every identity closes**, every tick, or it throws.

What it will never be is a forecasting tool. It is a teaching instrument whose
claim is that its causal structure and its magnitudes are defensible and
sourced — and, unusually, that it tells you where they are not.

## Reading order

1. `10-state-of-the-project.md` — this file
2. `00-design-brief.md` — what the game is and what it must teach
3. `11-cause-and-effect.md` — what every input actually does, measured
4. `02-causal-map.md` — the causal chains, with the audit's corrections inline
5. `01-variables.md` — every state variable, current
6. `09-interface.md` — the screen, current
7. `08-post-audit-revisions.md` — what the last pass changed and why
8. `parameters.py` — the numbers, with confidence and citations
9. `src/rules/index.js` — the execution order, which is itself the causal order

`03-architecture.md` §Defects, `04`, `05`, `06` and `07` are the historical
record. Read them when you want to know why something is the way it is, not
what it currently does.
