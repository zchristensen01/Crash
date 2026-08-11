# 00 — Design Brief

## What this is

A real-time economy simulator that runs in a browser. Time runs continuously.
You hold a handful of policy dials. Numbers move according to equations you can
open up and inspect. You either survive your term or you break the country.

The point is not to win. The point is that after twenty failed runs you
understand *why* central bankers look tired.

It ships as a single HTML file with no install, no build step and no server —
open it, or send someone a link. See `03-architecture.md`.

---

## The core loop

```
time ticks (1 tick = 1 month)
   ↓
each tick, the model runs its rules in a fixed order
   ↓
gauges animate, charts extend by one point, the regime dot moves
   ↓
you watch, and occasionally drag a dial
   ↓
your dial change enters a LAG PIPELINE — it lands months later
   ↓
consequences arrive after you've forgotten what you did
   ↓
either you keep it stable for 8 years, or something snaps
```

The lag is the entire game. Without it this is a calculator. With it, it's a
genuine skill: you are steering a ship that responds three minutes after you
turn the wheel.

---

## Time

| Speed | Meaning |
|---|---|
| Paused | think, read the `why` panel, plan |
| 1× | 1 month per 2 seconds |
| 3× | 1 month per 0.7s |
| 10× | 1 month per 0.2s — for cruising through calm periods |

Auto-pause triggers on: any event firing, any gauge entering a danger band,
and any ending. You should never lose because you blinked.

**Design rule:** speed changes the wall-clock rate only. It never changes the
math. One tick is always one month.

This is not a stylistic preference — it's an implementation constraint. The
simulation runs on a fixed-timestep accumulator, decoupled from the render
frame. Frames may drop, tabs may background, machines may be slow; the
sequence of ticks is identical regardless. A model whose results depend on
your frame rate is not a model.

---

## Win / lose

**Term length:** 96 ticks (8 years). Survive it and you're scored.

**Endings (you lose):**

| Ending | Trigger | The lesson |
|---|---|---|
| Hyperinflation | inflation > 25% for 6 straight months | Expectations became self-fulfilling |
| Depression | unemployment > 14% for 12 months | Demand collapse feeds itself |
| Debt crisis | debt > 200% GDP **and** bond yield > 12% | Interest costs became the budget |
| Financial crash | probabilistic, driven by the credit-to-GDP gap (3.5pp of annual crisis risk per SD of excess credit) | Leverage built up while every other gauge looked fine |
| Voted out | approval ≤ 5 | People vote on feelings, not five-year plans |

Every one of these is a **sustained condition**, not an instantaneous trip. One
bad month is not a collapse, and a game that ends on a single spike teaches
you to fear noise instead of trends. Each ending needs a visible countdown on
screen once its condition starts running — "hyperinflation in 4 months" — so
the player can see the clock they're racing.

**Score if you survive:** average approval, minus time spent in each danger
band, minus total misery (inflation + unemployment) accumulated.

**Restart** is instant and reuses the same seed by default, so you can retry
the exact same run and try a different policy. That's the learning mechanism —
A/B testing your own decisions against an identical world. It only works if
the world is genuinely identical, which means every random draw comes from a
seeded generator, never the platform's default one.

---

## What makes it teach instead of just entertain

1. **The `why` panel.** Click any number on screen and it opens into the exact
   terms that produced it, each with its own contribution, as a waterfall. The
   terms sum to the total in front of you. Nothing is hidden behind a black
   box.

2. **The pipeline panel.** A live queue of what you've done that hasn't landed
   yet: "rate cut of 1.5pp — 2 months until it peaks on investment." Items
   slide toward the present and flash when they land. This is the most
   important widget on screen; without it players conclude the model is broken.

3. **Ghost runs.** Restart on the same seed and your previous run stays on the
   charts as a faint line behind the current one. Every chart becomes a direct
   comparison of two policies against an identical world. This is the single
   biggest thing the interactive build buys over a terminal readout, and it is
   the mechanism by which anyone actually learns from a failed run.

4. **Scenario mode.** Pre-set starting conditions that put you in a famous
   corner: 1970s stagflation, 2008 balance-sheet recession, 2021 post-shock
   inflation, Japan's liquidity trap. Each one is unwinnable by the obvious
   move.

5. **Regime readout.** A live dot moving through the four-quadrant box from
   `02-causal-map.md`, trailing its recent path, because knowing which box
   you're in tells you which dial is even relevant.

6. **Confidence is visible.** Every parameter carries a confidence level and a
   citation (see `parameters.py`). Where the evidence is weak or contested, the
   UI says so and shows the range rather than a single confident number. The
   disagreement is part of the lesson, not an embarrassment to hide.

---

## Honest note on accuracy

This model is built on mainstream New Keynesian macro — the framework most
central banks actually use. It is a defensible default, not settled truth.
Places where serious economists disagree, and which should be exposed as
toggles in config:

- **How much printing money causes inflation.** In this model it depends on
  slack. Monetarists would say the link is tighter and more mechanical. MMT
  would say the constraint is real resources, not the debt number, and that
  the model over-weights bond-market discipline. Both critiques change one
  coefficient.
- **How fast wages adjust downward.** Classical models assume they fall and
  clear the market. This model assumes they're sticky, which is why recessions
  linger. That single assumption is most of the Keynes-vs-classical argument.
- **Whether government borrowing crowds out private investment.** The model
  says yes, mildly, via bond yields. The size of that effect is genuinely
  contested and near zero when the economy has slack.
- **Multiplier sizes.** The fiscal multiplier is somewhere between 0.5 and 2.0
  depending on conditions and whose paper you read. The model varies it with
  slack, which is the consensus-ish position — but Ramey & Zubairy (2018) find
  multipliers below 1.0 regardless of slack, disputing the state-dependence
  outright. Show the range.

## Post-research revisions

Four things changed after the literature pass. Recorded here so the reasoning
isn't lost:

1. **The Phillips slope is two numbers, not one** (κ ≈ 0.05 anchored, 0.20
   unanchored). The first draft used 0.6 — roughly twelve times too steep,
   which taught a pre-1990 world. Credibility became a state variable as a
   result, and the model got *more* dramatic rather than less: it can sit calm
   for years and then spiral.
2. **Crash risk is now the credit-to-GDP gap**, a real BIS indicator with a
   published hit rate, replacing an invented fragility composite.
3. **The financial accelerator was overstated.** It amplifies investment
   significantly but total output only modestly. The fire-sale/deleveraging
   spiral is the actual crisis engine.
4. **Lags were roughly half as long as they should be.** Partly a labelling
   problem — "months until visible" versus months to peak. All lag figures now
   mean peak, and match `parameters.py`.

## Post-research revisions — pass 2

Seven more, from the second literature pass (`04-research-brief.md`). All are
now in `parameters.py`. Three of them overturn things these documents
previously stated as settled:

1. **Printing money must be gated, not applied.** Inflation pass-through is
   `credibility × slack`, a smooth 0→1 ramp. Anchored with slack gives ~0 —
   which is why QE after 2008 didn't cause hyperinflation. Unanchored and hot
   gives ~1. The prototype applied it unconditionally and therefore taught the
   opposite. Highest-priority fix in the model.
2. **The crash needs a one-sided fire-sale term.** `max(0, leverage −
   threshold)` only bites on the way down. Without it, booms and busts are
   symmetric and no bubble is teachable.
3. **The wage-price spiral is rare** — Alvarez et al. (IMF 2022) find that of
   79 episodes of accelerating wages *and* prices since the 1960s, only a
   small minority kept accelerating after eight quarters. It is demoted from
   the default inflation engine to a switch-gated regime.
4. **Downward wage rigidity was double-counted.** A hard 0% floor *and* a 0.20
   strength multiplier encode one friction twice. Modelled once now, as
   bunching at zero. `CLASSICAL_WAGE_CORRECTION_STRENGTH` is deleted.
5. **Bond yields go nonlinear on currency and ownership, not on the debt
   level.** That's the only way one equation gives both Japan (very high debt,
   low yields, sustained) and a periphery repricing. Adds a `foreign_share`
   state variable.
6. **Cuts are weaker than hikes** (~1.5:1, Tenreyro & Thwaites) and **Okun's β
   is state-dependent** (0.45 normally, 0.15–0.23 under labour hoarding). Both
   are switches. "Pushing on a string" turns out to be evidence, not folklore.
7. **Confidence is near-decoration.** Only the fundamentals-orthogonal residual
   is causal and its incremental power is small. The first pass called approval
   and confidence "not really economics" and found nothing; that was a search
   error, not a finding — economic voting is a mature field, and unemployment
   hurts voters ~1.7× more than inflation (Di Tella, MacCulloch & Oswald 2001).

**One of these changes how the game is played.** Voters weight the
election-year economy far more heavily than earlier years (Achen & Bartels).
In a fixed-term game that makes "let it burn until year 7, then reflate" a
viable strategy. That is a real lesson about democratic incentives, not an
exploit to patch out.

**And one changes what losing means.** Financial crises leave a permanent
~10% output scar with no rebound (Cerra & Saxena 2008). A crash is therefore
not a setback you recover from — it moves the trend line down for good. Prompt
recapitalisation roughly halves it. Surviving a crash should be a distinct,
harder game rather than a reset.

## Implementation audit — August 2026

The prototype (`econ_sandbox.py`) was run against these documents and diverged
from them in ways that inverted several of the intended lessons. The full
findings and fixes live in `03-architecture.md`; the short version is that six
defects have to be fixed *before* the model is ported, because porting them
just moves them into a second language:

- The model does not sit still. Left alone, it drifts to a permanent +0.6%
  output gap and the credit gap climbs to ~12pp — past the BIS danger line —
  with the player asleep. That breaks the Bubble scenario, the best teaching
  tool in the set.
- Printing money is not slack-dependent, so the QE lesson produces the
  opposite of the intended result.
- The rate lever is roughly 4× too strong and 8× too fast, which erases the
  "you will be 18 months in with nothing to show for it" lesson — the thing
  `02-causal-map.md` spends the most words on.

Where a number in these docs disagrees with `parameters.py`, the parameters
file wins. It carries the ranges, confidence levels and sources; these
documents carry the explanation. Where the *prototype* disagrees with either,
the prototype is wrong.

---

## A later audit, and where to read what happened next

The six defects above are the ones found in the PYTHON PROTOTYPE, before the
port. They were fixed. The ported model was then audited against these same
documents in its own right (`06-model-audit-brief.md`), and that pass found
fourteen more — six of which again inverted a lesson this brief says the game
exists to teach, and all fourteen of which passed the 47-test suite that
existed at the time.

That is the pattern worth carrying forward: **a model can be self-consistent,
sit at an exact steady state, produce sensible arcs and pass every test it has,
and still teach the opposite of what it is for.** What the second audit added
was tests shaped for the actual failure mode — comparisons and sweeps rather
than levels, because every finding was a statement about how a response
*changes* with the state.

- `07-model-audit-findings.md` — what was wrong, measured, with reproductions
- `08-post-audit-revisions.md` — what changed and why, in this section's style
- `10-state-of-the-project.md` — what exists today and what is still missing
