# 03 — Architecture

> **PART HISTORICAL, PART LIVING.** This document was written BEFORE the port,
> so the sections about choosing a browser, rejecting alternatives and "the one
> real cost of porting" are a record of a decision already taken — read them
> for the reasoning, not for what exists. The file tree, the rule list and the
> screen sketch below have been corrected to match the code; `09-interface.md`
> is the current description of the screen and `10-state-of-the-project.md` is
> the current description of everything else.

## The interface: one HTML file, no build step

The target is a **single self-contained `.html` file**. Open it by
double-clicking. Send it to someone as a file or a link. Nothing to install,
no Python, no server, no `npm`, works on a phone.

Reasons specific to this project:

- **Real dials.** The dials are the game. A slider you drag and watch respond
  is a fundamentally different object from a number you type. This is the
  whole reason to leave the terminal.
- **Real charts.** Eight years of monthly data is 96 points across six series.
  That is a chart, and terminals are bad at charts.
- **`requestAnimationFrame` gives you the clock,** with a fixed-timestep
  accumulator on top so the tick sequence never depends on frame rate.
- **The `why` panel wants to be clickable.** Click a number → it expands into
  a waterfall of the terms that produced it. That interaction does not exist in
  a terminal; you get a separate `why` screen and a context switch instead.
- **Ghost runs need overlaid charts** — see `00-design-brief.md`. Not
  practical in a terminal, trivial here.
- **Distribution is the link.** The whole point of building this is that
  someone else looks at it.

### What was rejected, and why

| Option | Verdict |
|---|---|
| **Textual (the previous recommendation)** | Genuinely good, and right when the constraint was "must run in a terminal". That constraint is gone. Its main advantage — `set_interval` gives you the tick — is one line of JavaScript. Its `textual serve` mode gets you into a browser but with terminal-shaped widgets, which is the worst of both. |
| `rich` alone | No event loop, no input handling. Fine only if the sim stays turn-based. |
| `curses` / `blessed` / `urwid` | Terminal-only. Moot. |
| React + Vite + a chart library | The charts here are six line series and a scatter. That is ~120 lines of Canvas 2D. A build step, a `node_modules`, and a framework to render forty numbers is a bad trade, and it breaks the single-file property that makes this shareable. |
| Python model + FastAPI + web front end | The one serious alternative — see below. |
| pygame / desktop app | Distribution is worse than a link and the drawing is harder. No. |

### The one serious alternative: keep the model in Python

Run `econ_sandbox.py` behind a small FastAPI or Flask server and drive it from
a browser front end over websockets.

**Choose this if** the model is going to keep growing as a research artifact —
if you want NumPy, if you want to run 10,000 headless simulations to tune
coefficients, if the economics matters more than the sharing.

**Cost:** something has to be running for anyone to play. No link you can send.
Roughly an extra half day of plumbing, and a permanent deployment problem.

**Recommended: port to JavaScript.** The rules are already small pure functions
over a state dict, which translates almost line-for-line. The genuine downside
is stated plainly in the next section.

### The one real cost of porting: two copies of the parameters

`parameters.py` is not really code. It is a research bibliography that happens
to be executable — ranges, confidence levels and citations on every
coefficient, plus the `UNKNOWNS` block. That has to survive.

The rule: **`parameters.py` remains the authoritative, annotated record.** The
runtime values are generated from it into the HTML by a ~20-line script, so the
numbers cannot drift apart. Do not hand-maintain two lists of coefficients —
that is precisely how the prototype ended up with a `CONFIG` dict that
contradicts `START` on four values.

`econ_sandbox.py` itself is retired once the port passes its tests. Keep it in
git history, not in the directory.

---

## Screen layout

> Superseded by [`09-interface.md`](09-interface.md), which describes the built
> screen. The sketch below is the original design intent and is kept because
> the three notes under it are still the argument. It shows four dials; there
> are five, QE having been added when the lower bound was implemented.

Three columns on desktop, stacked on mobile. Dark by default.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  CRASH            Mar 2028 · Yr 3 Q1        ‹‹ ⏸ ▶ ▶▶ 3×         seed 40317  │
├────────────────────────────────┬──────────────────────┬──────────────────────┤
│                                │                      │                      │
│  Growth        +3.2%  ▁▂▃▅▆▆▇█ │      REGIME          │  IN THE PIPELINE     │
│  Inflation      5.8%  ▁▁▂▂▃▅▆▇ │   ┌────────┬──────┐  │                      │
│  Unemployment   3.4%  █▇▆▅▃▂▂▁ │   │        │  ●   │  │  rate +0.50pp        │
│  Govt debt        71% ▃▃▄▄▅▅▅▅ │   │        │ ╱    │  │  → investment        │
│  Approval          58 ▅▆▇█▇▆▆▅ │   ├────────┼──────┤  │  ▓▓▓▓▓░░░ 3 mo       │
│                                │   │        │      │  │                      │
│  ──────────────────────────    │   └────────┴──────┘  │  spend +2.0pp        │
│  Credit gap   +11.4pp  ⚠       │    OVERHEATING       │  → demand            │
│  Credibility     0.62  ⚠       │    heading up-right  │  ▓▓▓▓▓▓▓▓▓ LANDED    │
│                                │                      │                      │
│  ┌──────────────────────────┐  ├──────────────────────┤                      │
│  │  ╱╲    inflation         │  │  DIALS               │  ──────────────      │
│  │ ╱  ╲__╱                  │  │  Rate    3.00% ──●── │  ⚠ HYPERINFLATION    │
│  │╱ ·············· ghost run│  │  Tax    25.00% ───●─ │    in 4 months if     │
│  └──────────────────────────┘  │  Spend  22.00% ──●── │    this continues     │
│   click any number for `why`   │  Print   0.00% ●──── │                      │
└────────────────────────────────┴──────────────────────┴──────────────────────┘
```

Three things earn their place here and should not be cut for space:

**The pipeline panel** (right) is the most important widget on screen. Each
queued effect is a bar that fills as it approaches landing, then flashes. It
makes lag visible instead of mysterious. Without it, players think the model is
broken; with it, they learn to plan ahead.

**The ghost run** (dotted line on every chart) is your previous attempt on the
same seed. It converts every restart into a controlled experiment.

**The ending countdown** (bottom right) appears the moment a losing condition
starts running and disappears if you break it. Losing should feel like a clock
you failed to beat, not a trapdoor.

---

## File structure

```
crash/
├── index.html                  # THE DELIVERABLE. Everything inlined.
│
├── src/                        # authored source, concatenated into index.html
│   ├── params.js               #   generated from parameters.py — do not edit
│   ├── units.js                #   THE ONLY place annual↔monthly conversion
│   │                           #     happens. See "time aggregation" below.
│   ├── state.js                #   the State object, every variable from doc 01
│   ├── engine.js               #   tick(): runs RULES in order, records trace
│   ├── lags.js                 #   LagPipeline — queued effects, gamma kernels
│   ├── kernels.js              #   gamma weights; theta derived from the peak
│   ├── trace.js                #   records every term for the why panel
│   ├── rng.js                  #   seeded PRNG (mulberry32). NEVER Math.random
│   ├── invariants.js           #   stock-flow assertions, run every tick
│   ├── rules/
│   │   ├── index.js            #   RULES = [...]  ← the execution order
│   │   ├── supply.js           #   [A4] Cobb-Douglas, capital, potential output
│   │   ├── consumption.js      #   [A1] MPC, wealth effect, hand-to-mouth
│   │   ├── investment.js       #   [A2] user cost, accelerator, spread channel
│   │   ├── aggregate.js        #   [A3] C+I+G+NX → output gap. THE CENTRE.
│   │   ├── labour.js           #   employment, hiring momentum, Okun switch
│   │   ├── wages.js            #   wage PC, the kink, bunching at zero
│   │   ├── prices.js           #   inflation, expectations, credibility
│   │   ├── money.js            #   [A6] money supply, velocity, monetisation gate
│   │   ├── credit.js           #   asset prices, spreads, defaults, credit gap
│   │   ├── fiscal.js           #   yields, revenue, stabilisers, deficit, debt
│   │   ├── crisis.js           #   trough, recovery path, permanent scar
│   │   └── sentiment.js        #   confidence residual, approval
│   ├── game/
│   │   ├── clock.js            #   fixed-timestep accumulator, speed, pause
│   │   ├── dials.js            #   DIALS = [...] player controls + bounds
│   │   ├── events.js           #   EVENTS = [...] shocks
│   │   ├── endings.js          #   ENDINGS = [...] sustained-condition tests
│   │   ├── scenarios.js        #   starting states (calm, stagflation, bubble…)
│   │   └── session.js          #   run state, restart, seed, ghost run
│   └── ui/
│       ├── app.js              #   mounts widgets, binds keys, owns the loop
│       ├── styles.css
│       ├── chart.js            #   Canvas 2D line + area + scatter. No library.
│       └── widgets/
│           ├── gauge.js
│           ├── dial.js
│           ├── pipeline.js
│           ├── regime.js
│           └── why.js
│
├── tools/
│   ├── build.mjs               # concatenates src/ → index.html. Not a bundler.
│   ├── gen_params.py           # parameters.py → src/params.js
│   ├── serve.mjs               # `npm start`
│   ├── demo.mjs                # headless run, any scenario, any seed
│   └── audit/                  # sweeps and probes from the docs/07 audit
├── parameters.py               # THE RESEARCH RECORD. Ranges + citations.
├── docs/                       # these files — see docs/README.md
└── test/                       # node --test, no framework
    ├── harness.mjs             # shared: world(), advance(), compare(). Not a test.
    ├── params.test.js          # every P valid; kernels peak on the documented month
    ├── steady-state.test.js    # no input for 200 ticks → NOTHING drifts
    ├── conservation.test.js    # every identity balances every tick
    ├── determinism.test.js     # same seed → byte-identical 96-tick history
    ├── stability.test.js       # no eigenvalue > 1 around the steady state
    ├── multipliers.test.js     # assembled model lands inside published ranges
    ├── scenarios.test.js       # each scenario driven, in-regime and survivable
    ├── lags.test.js            # scheduled effects actually arrive; no rule
    │                           #   assigns to a transmitted driver
    ├── events.test.js          # no shock breaks an identity or gets overwritten
    ├── transmission.test.js    # every state-dependent conditional, plus sweeps
    ├── crisis.test.js          # the whole crash chain, including that it ENDS
    ├── validation.test.js      # reduced forms; the DEFERRED register, both ways
    ├── docs.test.js            # the living documents still match the code
    ├── bundle.test.js          # index.html builds and is self-contained
    └── ui-smoke.test.js        # every widget mounts; a full term plays
```

The four test files after `scenarios` were added by the `docs/07` audit, and
what they have in common is the shape of the thing they check. Every defect
that audit found was a statement about how a response CHANGES with the state —
not a level — and the 47-test suite that existed at the time checked levels.
See `08-post-audit-revisions.md`.

`build.mjs` exists only so you can work in real files instead of one 3,000-line
document. It is a concatenation, not a bundler — no dependencies, no
transpiling, no `node_modules`.

### Three cross-cutting rules the tests exist to enforce

**Time aggregation lives in one file.** The model runs monthly; almost every
published estimate is quarterly or annual. Dividing an annual coefficient by 12
is right for linear terms and **wrong for anything compounding or nonlinear**.
Every conversion routes through `units.js`, and nowhere else may contain a
bare `/12`.

**Stability is an engineering risk, not an economics one.** There are ~108
parameters and at least four reinforcing loops — credibility→κ→inflation→
credibility, credit→asset prices→collateral→credit, spread→investment→output→
defaults→spread, expectations→wages→prices→expectations. An assembled system
of that shape can be explosive, and it will not announce itself politely: it
will just diverge. `stability.test.js` linearises numerically around the steady
state and checks the spectral radius is below 1. Run it *before* tuning for
playability, not after.

**Invariants assert every tick, not at the end.** Debt accumulation matches the
deficit, capital matches its own law of motion, credit/GDP matches its flow.
Failing loudly on tick 3 beats debugging silent drift on tick 300.

---

## The four pieces that make it extensible

### 1. Rules are a list

```js
// src/rules/index.js — the 23 rules, in execution order
export const RULES = [
  updatePotentialOutput, updateCrisisRecovery,          // the ceiling, and the crash
  updateConsumption, updateInvestment, aggregateDemand, // demand
  updateEmployment, updateWages,                        // labour
  updateVelocity, updateMonetisation, updateInflation,  // money and prices
  updateExpectations, updateCredibility,
  updateDefaults, updateCreditGap, updateAssetPrices,   // credit and assets
  updateLeverage, updateCreditSpread, updateCrisisRisk,
  updateBondYield, updateAutoStabilisers, updateBudget, // government
  updateConfidence, updateApproval,                     // reads the world
];
```

**The order decides which reads are stale, and that is a modelling decision.**
Nobody had written down which ones until the audit; `index.js` now carries the
full list of deliberate one-month lags, with the reason for each and a note on
the one that was wrong. `tools/audit/07-producer-consumer-graph.mjs`
regenerates the graph — run it after any reorder.

Every rule has the same shape:

```js
export function updateInflation(s, trace) {
  // The slope itself depends on credibility. This is not a constant.
  const kappa = lerp(P.PHILLIPS_KAPPA_ANCHORED.value,
                     P.PHILLIPS_KAPPA_UNANCHORED.value,
                     1 - s.credibility);
  const terms = {
    'what people already expect':          s.expected_inflation,
    'demand above what we can make':       kappa * s.output_gap,
    'wage costs beyond productivity':      ulcPressure,
    'supply shocks (oil, war, shortages)': s.supply_shock,
    'money printing':                      s.monetisation_passthrough,
  };
  s.inflation = Math.max(-4, sum(terms));
  trace.record('inflation', terms, s.inflation, { slope: kappa });
}
```

*(Sketch, close to the real `rules/prices.js`. The import-price term in the
original version of this document is not there: v1 is closed by decision A5.
The printing term is gated by credibility AND slack inside `money.js` rather
than by a multiplier here — see defect 2 below.)*

Adding a mechanism = write one function, add one line to the list. Order in
the list *is* the causal order — which is itself documentation.

Note that the printing term arrives pre-gated. It is not optional decoration;
see defect 2 below.

### 2. Everything the player sees or triggers is data

`DIALS`, `EVENTS`, `ENDINGS`, `INDICATORS`, `SCENARIOS` are arrays of plain
objects. The UI generates itself from them. Adding a gauge, a shock, a scenario
or a way to lose never touches rendering code.

This is the one thing the prototype got completely right and it should survive
the port unchanged.

### 3. The trace is mandatory, not optional

Every rule writes its term breakdown to `Trace`. The `why` panel just reads it.
This costs almost nothing and it's the difference between a black box and a
teaching tool. **No rule may modify state without recording why.**

One rule the prototype broke and the port must not: **record the term *before*
you mutate the state it refers to.** `rule_debt` computes its "eroded by growth
+ inflation" line after reassigning `debt`, so the terms in the `why` panel
don't sum to the change being explained. A `why` panel whose numbers don't add
up is worse than no `why` panel.

### 4. Randomness is seeded, always

```js
// src/rng.js — mulberry32
export function makeRng(seed) { /* ... */ }
```

Ghost runs, the restart-same-seed learning loop, and `determinism.test.js` all
depend on this. A single stray `Math.random()` anywhere in `src/` silently
destroys all three. Lint for it.

---

## The lag pipeline

```js
class LagPipeline {
  // Deltas of a policy DRIVER, queued to land over a gamma kernel peaking at
  // LAGS_MONTHS[channel]. Peak, not onset — see doc 00.
  schedule(target, amount, channel, label, nowTick) {}
  collect(nowTick) {}   // landing this tick; called once per tick by the engine
  pending(nowTick) {}   // for the pipeline panel — what makes lag visible
}
```

**Targets are transmitted DRIVERS, not effect sizes, and this is the single
most important correction the audit made.** The pipeline originally scheduled
an *effect* into `s.consumption` and `s.investment` — fields the rules assign
from scratch a few lines later, so every scheduled effect was overwritten
before it could act. The model had no lags at all and nobody noticed for its
whole life.

A driver exists once. `policy_rate_demand` is the rate the demand side has
actually felt; kernels sum to 1, so scheduling the dial's delta walks the
transmitted field to the new value and stops there. No rule may assign to one,
the engine throws if anything schedules into a rule-owned field, and
`test/lags.test.js` greps every rule statically. An effect size, by contrast,
has to be estimated twice — once here and once in the rule — and then kept from
double-counting.

When the player drags the rate dial, nothing happens immediately except the
things that genuinely are immediate. Markets reprice in a month; the real
economy takes three quarters. That queue is both the mechanic and the lesson.

**Effects are humps, not steps.** `LAGS_MONTHS` gives the month of *peak*
effect; the kernel spreads the impulse around it. The prototype applied the
entire rate effect as one hard step at ~3 quarters, which is why it lost the
central lesson of doc 02. `UNKNOWNS['lag_shapes']` in `parameters.py` is honest
that the distributions are mostly undocumented — default to a gamma kernel
peaking at the documented month and label it judgement.

---

## Defects to fix before porting

Found by running `econ_sandbox.py` against these documents in August 2026. Fix
them in Python first, get `steady-state.test.js`'s equivalent passing, *then*
port. Porting them just moves them into a second language.

| # | Defect | Why it matters |
|---|---|---|
| 1 | **The model won't sit still.** `mood` starts at 70 but demand measures confidence against 60, so t=0 opens with a free +0.5% output gap. Mood settles at ~72, locking a permanent +0.6% gap; credit then grows 0.24pp/quarter against a trend that catches up at 2%/quarter, so `credit_gap → 12pp`. | Do-nothing crosses the 9pp BIS danger line unaided. Destroys the Bubble scenario. |
| 2 | **Printing isn't slack-dependent.** `k_print_inflation × printing` is added unconditionally, and printing also enters demand separately — double counting. Print 5%: 27.9% inflation at capacity, 20.7% with huge slack. | Doc 02's headline lesson is "printing into slack does mostly nothing". The model teaches the opposite. |
| 3 | **No monetary brake.** The gap term caps at `κ=0.20`, so max disinflation from a −10.8% gap is −2.2pp against +4.5pp from printing. Rate at 12% with `print 3` → inflation climbs monotonically past 13% and keeps going. | Violates the Taylor principle that `parameters.py:123` documents. The only cure is a dial, not a policy. |
| 4 | **The rate lever is ~4× too strong and ~8× too fast.** `k_rate = 1.2%` of gap per 1pp as a single step at ~3 quarters, vs `RATE_TO_OUTPUT = 0.30%` peaking at 12 months. A hike to 20% produces a −21% output gap and 16.7% unemployment, curing 9% inflation within a year. | Erases "you will be 18 months into hiking with nothing to show for it" — the thing doc 02 spends the most words on. Fixed by the gamma kernel plus the correct coefficient. |
| 5 | **Curing inflation destroys credibility.** `rule_credibility` uses `abs(inflation - target)`, so engineered deflation reads as a large miss and drives credibility to 0.00. | Beating inflation is punished identically to causing it. |
| 6 | **Housekeeping.** `cheap_money` incremented and never read; `rate_history` grows unbounded; `why` terms don't sum (see above); debt decays to 11% of GDP over a long run, making the debt ending unreachable; interest uses the policy rate because `bond_yield` doesn't exist, so the entire debt → yield → crowding-out chain from doc 02 is missing. | |

Symptom check: across 300 randomised playthroughs, 95% ended in hyperinflation
or being voted out, 1% in a financial crash, 1% survived. The crash chain that
got the most research is the rarest outcome in the game.

Also absent and specified in doc 02: hiring/firing asymmetry
(`HIRING_SPEED 0.25` vs `FIRING_SPEED 0.60` — unemployment currently adjusts
symmetrically), automatic stabilisers, asset prices, the wealth effect, credit
spreads, the ZLB, the transfers dial, and cost-push supply shocks (the oil
event pokes `expected_inflation` directly instead of entering as a price shock).

---

## Build order

Same discipline as before: the model has to be right before it's pretty.

**Revised after research pass 2.** The prototype is not repaired and then
ported — it is replaced. Defect 1 ("the model won't sit still") and the
handoff's A1–A4 ("the demand block was never written") turned out to be the
same problem: a model with an ad-hoc additive demand term has no equilibrium to
sit at, so the drift was a symptom. Patching it would have treated the symptom.
`econ_sandbox.py` is now a reference for the UI's *shape*, not a codebase.

| # | Step | Who | Status |
|---|---|---|---|
| 0 | Scaffold: folders, build, tests, gitignore | — | **done** |
| 1 | `units`, `rng`, `kernels`, `trace`, `state`, `lags`, `invariants`, `engine` | Claude | **done** — needed to verify the econ |
| 2 | **[A4]** `supply.js` — Cobb-Douglas, capital, potential output | Claude | **done**; resolved the open wage identity |
| 3 | **[A1–A3]** `consumption`, `investment`, `aggregate` | Claude | **done** |
| 4 | **Steady-state test green** — 200 ticks, nothing drifts | — | **done, exactly zero drift** |
| 5 | `prices`, `wages`, `labour`, `money` | Claude | **done** |
| 6 | `credit`, `fiscal`, `crisis` | Claude | **done** |
| 7 | Stability check | Claude | **done** — core block stable; debt loop divergent by design |
| 8 | `scenarios`, `endings`, `autopilot` (econ-consistent data) | Claude | **done** |
| 9 | `dials`, `events`, `indicators`, `clock`, `session` | Claude | **done** |
| 10 | UI: shell, gauges, dials, `chart.js`, pipeline + why panels | Claude | **done** |
| 11 | **Tune until each scenario is hard but winnable** | both | open-ended |

**Steps 1–10 are complete.** 41 tests at the time this table was written; 94
now, after the `docs/07` audit found fourteen defects that all 41 had passed —
see `08-post-audit-revisions.md`. The interface is a single
self-contained `index.html`: gauges, draggable dials with neutral markers,
three Canvas charts with ghost overlay, the live regime scatter, the pipeline
panel and the click-to-open `why` waterfall.

The UI is regression-tested without a browser. `test/dom-shim.mjs` is a ~120
line DOM implementation — enough to boot the app, mount every widget and catch
the failures that actually happen when wiring: a selector matching nothing, a
method called on null, a gauge whose `traceKey` names nothing.
`test/bundle.test.js` then runs the *built* `index.html`, because concatenating
modules into one scope can break in ways the module tests cannot see.

### What the finished model does

Under a Taylor-rule central bank over a full 96-month term:

| Scenario | Outcome |
|---|---|
| calm, overheating, recession, bubble | survives |
| stagflation | DEBT CRISIS at month 51 — the rule hikes to 12.4% and debt spirals |
| debt trap | DEBT CRISIS at month 46 |

With **no** policy response at all, overheating reaches hyperinflation at month
27 and stagflation at month 12. That is not a bug — it is the Taylor principle,
which `parameters.py` documents as requiring a response above 1.0 or inflation
is unstable. A fixed nominal rate against rising inflation is an ever-falling
real rate.

### Three things the build discovered

1. **The linearised stability test is blind to kinked loops.** Both the
   fire-sale and collateral terms sit at a `max(0, ...)` kink AT the steady
   state, so a credit-asset loop that goes vertical in a bubble reads as
   perfectly stable there. `test/scenarios.test.js` now runs each scenario for
   a full term as the backstop.
2. **Endings are load-bearing for the model, not just the game.** Several
   loops are deliberately unbalanced, so a losing position computed to
   Infinity around tick 73. The ending is what turns a numerical blowup into a
   lesson.
3. **Solving consumption as the accounting residual silently zeroed the fiscal
   multiplier.** Raising G mechanically cut C by the same amount. The average
   propensity to consume has to be a behavioural constant from the canonical
   baseline, never recomputed per scenario.

The interface is the easy part. It always was.
