# 06 — Model Audit Brief

> **ANSWERED AND CLOSED.** This brief was carried out: the findings are in
> `07-model-audit-findings.md`, with a checked-in reproduction for each under
> `tools/audit/`, and every one is fixed — see `08-post-audit-revisions.md`.
> Kept as the record of what was asked for, because the SHAPE of the
> instruction turned out to matter as much as the answer: "measure, don't
> read", "the tests are a floor, not a ceiling", and "do not tune to make
> something pass" are why the pass found six inverted lessons instead of six
> tidy explanations.

## What this is

An instruction to tear the implemented model apart and find where it does not
do what these documents claim it does.

The previous passes were **research** (find the numbers) and **construction**
(write the code). This one is **verification**: does every causal chain in
`02-causal-map.md` actually exist in `src/rules/`, does every lever reach
everything it should reach, is any state variable computed and then quietly
ignored, and is any mechanism missing entirely?

The model currently passes 47 tests, sits at an exact steady state, and
produces sensible scenario arcs. **That is not evidence that it is right.** It
is evidence that it is self-consistent and does not explode. A model can be
both of those and still teach the wrong thing, which is exactly what happened
to the prototype: it passed its own smell tests while inverting three of the
lessons it was built to deliver.

---

## Ground rules

**Measure, don't read.** Every claim in this brief was produced by running the
model, not by reading it. Do the same. `01-variables.md` and `02-causal-map.md`
describe the *intent*; `src/rules/` is what actually happens; where they
disagree, that disagreement is your finding. Never report "the code appears
to…" — run it and say what it did.

**The tests are a floor, not a ceiling.** 47 passing tests did not catch any of
the findings seeded below. If a defect you find is not caught by an existing
test, the fix includes a test that would have caught it.

**Do not tune to make something pass.** Where the model disagrees with the
literature, that is a finding to surface, not a coefficient to adjust — see
`FISCAL_MULT_*` in `parameters.py`, which are deliberately validation targets
rather than model terms. This project has a standing rule against tuning to a
dramatic target, and it has been broken before.

**Do not relax an invariant.** `src/invariants.js` throws on accounting
identity failures. If one fires, a rule is wrong. The invariant is never the
thing to change.

**Do not re-research parameters.** `parameters.py` is settled for this purpose
and carries confidence levels and citations. This audit is about wiring,
coverage and logic, not magnitudes. The one exception: if a parameter is being
used in a way its unit or note does not support, say so loudly.

### How to run things

```
npm test                    47 tests
npm run demo <scenario>     headless run, any of the six scenarios
npm run demo bubble 42 taylor
npm start                   the browser build
```

Useful entry points: `run(state, months, opts)` in `src/engine.js` takes
`{ events:false, assertEveryTick:false, autopilot }`; `applyDialChange` in
`src/game/dials.js` is the only correct way to move a dial, because it is what
schedules into the lag pipeline.

---

## Findings already measured — start here, then go further

These were produced during a first pass. They are starting points, not the
answer. For each: confirm it, determine whether it matters, and decide what
should happen.

### F1. 46 of 108 parameters are never read by any rule

Some are legitimately idle — the reduced-form multipliers are validation
targets, `SS_*` values are consumed through `START`, and the deferred levers
(immigration, minimum wage, tariffs, education, R&D, housing) have no dial yet.

But several are not idle by design, and each implies a missing mechanism:

| Unused | Confidence | What its absence means |
|---|---|---|
| `ZLB_RATE_EFFECTIVENESS` | strong | The zero lower bound is not explicitly modelled |
| `AUTO_STABILISER_ABSORPTION` | strong | The 0.60 aggregate the stabilisers must reproduce is never checked |
| `AUTOSTAB_TAX_LAG`, `AUTOSTAB_BENEFIT_LAG` | moderate | Stabilisers fire instantly; the documented 3-month and 1-month lags are not applied |
| `ENERGY_TO_CPI` | strong | The oil event hardcodes a number rather than deriving it |
| `BANK_CAPITAL_DELEVER_TRIGGER` | judgement | Forced deleveraging — the doom loop's engine — is not implemented |
| `QE_TO_YIELD`, `QE_TO_GDP` | moderate/weak | There is no QE lever at all |
| `CORPORATE_TAX_RATE_TO_GDP`, `PERSONAL_TAX_RATE_TO_GDP` | moderate | Tax moves consumption only; it never touches investment |
| `GOVT_INVESTMENT_MULT_*` | moderate | Spending is not split into investment vs consumption |
| `BANK_CAPITAL_TO_LOAN_RATE` | moderate | Bank capital affects spreads via an invented coefficient instead |

**Your job:** for each, decide *implement it*, *delete it*, or *document why it
is deliberately idle* — and say which. A parameter file where 43% of entries do
nothing is a file nobody can trust at a glance.

### F2. Two state variables are computed every tick and never read

`price_level` and `wage_level` are written and never consumed by anything.
They are dead ends. Either something should depend on them — a real price
level matters for the money identity, for debt erosion in real terms, and for
anything the UI wants to express in levels rather than rates — or they should
go.

**Look specifically for whether `M·V = P·Y` is enforced anywhere.** `money_supply`
and `velocity` are both computed. If nothing closes that identity, then the
entire money block is decorative, and `UNKNOWNS['velocity_dynamics']`'s claim
that velocity is "exactly what breaks the naive printing-money-causes-inflation
story" is not actually true of this implementation.

### F3. Ten state fields are created lazily by rules, not declared in `newState`

`mpc_effective`, `market_rate`, `user_cost`, `okun_beta_effective`,
`loan_losses`, `credit_impulse`, `risk_premium`, `interest_cost`,
`fired_event`, `ending_counters`.

Any rule that reads one of these *before* the rule that produces it has run
gets `undefined`, and `undefined` in arithmetic yields `NaN` that then
propagates silently until an invariant catches it several rules later. The
rule ordering currently makes this safe. **Verify that claim** — check the
producer/consumer order for each — and then decide whether the fragility
should be removed by declaring them in `newState`.

### F4. The sign matrix mostly holds, with three anomalies

Shocking each dial and comparing against `02-causal-map.md` Part 5:

| Action | Model | Doc expects | Anomaly |
|---|---|---|---|
| tax UP | assets **+** | assets − | Defensible via lower deficit → lower yields → higher asset prices, but it contradicts the doc |
| tax DOWN | assets **0**, credit **0** | assets +, credit + | Asymmetric with tax UP, which is suspicious |
| print UP | output **+** | output ~ (slack-dependent) | At the calm baseline with no slack, printing should mostly raise prices, not output |

For each: is the model wrong, or is the doc wrong? Both are possible and both
have happened before. Fix whichever is wrong and record it.

### F5. The two headline conditionals work, but not the way the doc describes

`02-causal-map.md` says the same lever produces opposite *results* depending on
slack. Measured, +1pp of government spending:

| | starting gap | Δoutput | Δinflation |
|---|---|---|---|
| with slack | −14.3% | +1.06 | +0.137 |
| at capacity | 0.0% | +0.96 | +0.546 |

The output response is nearly identical; the *inflation* response differs 4×.
So the conditionality lives entirely in prices, not in the output/prices split
the doc describes ("IF output_gap < 0: output ↑ … IF output_gap ≥ 0: output
flat, prices ↑"). **Is that the right model?** Argue it either way, but the
document and the code should not describe different mechanisms.

Also note the slack case required a −14.3% output gap to produce. Check whether
the conditionality is visible at realistic gaps of −2% to −4%, because if it
only appears at implausible extremes the player will never encounter it.

### F6. The lower bound damps the rate lever, but nothing implements it

A 0.25pp cut moves output 0.499 at a 2.5% policy rate and 0.035 at −0.5%. So the
behaviour is right — but `ZLB_RATE_EFFECTIVENESS` is unused, meaning this is
*emergent* from some other mechanism rather than modelled.

**Find out which mechanism, and whether it is the right one.** Emergent
behaviour that happens to look correct is the most dangerous kind, because
nothing pins it in place and the next coefficient change can silently remove
it. `02-causal-map.md` calls the ZLB "the entire reason QE was invented".

---

## Where to look that has not been examined at all

### A. Per-dial transmission completeness

For each of the four dials, walk `02-causal-map.md` Part 1 line by line and
confirm every arrow exists in code, with the right sign, magnitude and lag.
Produce a table: chain → implemented / partial / absent → where.

Known-suspicious starting points:

- **Rate:** the doc lists a currency channel (`→ currency ↓ → imports cost
  more → inflation ↑`). v1 is closed-economy by decision A5, so this is
  deliberately absent — confirm the deferral is complete and that nothing half
  references it.
- **Rate:** `rate → household borrowing [3m]` and `rate → asset prices [1m]`
  are separate chains in the doc. Are they separate in code?
- **Tax:** the doc's austerity paradox ("raise taxes into a recession and
  revenue may not rise at all") should FALL OUT of the structural block. Test
  it: raise tax 3pp in a deep recession and check whether revenue actually
  rises. If it does rise cleanly, the paradox is not being reproduced.
- **Spend:** the doc explicitly asks for a `govt_investment` vs
  `govt_consumption` split, because only one raises the ceiling. Not built.
- **Print:** confirm printing is modelled as a FINANCING choice (it reduces
  the deficit) rather than a spending choice, and that this matches the doc's
  "govt spends without taxing or borrowing".

### B. Rule ordering and within-tick simultaneity

`src/rules/index.js` runs 23 rules in sequence. Some read this tick's values,
some last tick's, purely as a consequence of position in the list. That is a
modelling decision that nobody has audited.

Specific: `updateConsumption` runs before `updateAutoStabilisers`, so
consumption uses **last tick's** disposable income. Is that intended? It is
defensible (households respond with a lag) but it should be deliberate and
documented, not incidental.

Build the full producer/consumer graph. Flag every case where a rule reads a
value that a later rule in the same tick overwrites.

### C. Double counting

Decision A3 removed one instance (reduced-form multipliers alongside a
structural demand block). Look for others. Candidates:

- Does the wealth effect in `consumption.js` and the collateral channel in
  `credit.js` both capture "asset prices make people borrow and spend"?
- Does `FINANCIAL_ACCELERATOR_STRENGTH` in `investment.js` overlap with the
  spread term already in `user_cost`?
- Does the confidence residual add anything the fundamentals have not already
  added?

### D. Identity coverage

`invariants.js` checks output, budget, debt accumulation and bounds. It does
not check: the capital law of motion, credit/GDP against its own flow, the
money identity, or that demand components stay individually plausible. Add
what is missing, and check whether anything currently violates them.

### E. Behaviour away from the steady state

The stability test linearises *at* the steady state, and a first pass already
found that blind to kinked loops — both the fire-sale and collateral terms sit
at a `max(0, …)` kink there and read as exactly zero.

Sweep the state space: for each scenario, and for policy settings across each
dial's full range, run a full term and look for non-monotonic responses, sign
flips, or runaway paths. A lever that helps at +1pp and hurts at +2pp is either
a genuine nonlinearity worth teaching or a bug, and you need to say which.

### F. Missing mechanisms named in the docs but absent in code

Non-exhaustive; find the rest:

- forced bank deleveraging (the doom loop has no forced-selling trigger)
- `business_confidence` (doc 01 lists it; only `consumer_confidence` exists)
- `fiscal_space` and `misery` (doc 01 lists them as derived; nothing computes them)
- QE as a lever
- the `govt_investment` / `govt_consumption` split
- hysteresis in ordinary (non-crisis) recessions — `UNKNOWNS` flags it as open

---

## What to produce

A markdown report, structured by finding, each with:

- [ ] **What is wrong**, in one sentence
- [ ] **The evidence** — the exact command or snippet you ran and its output.
      No finding without a reproduction.
- [ ] **Which is wrong, the code or the doc**, and why
- [ ] **Severity**: inverts a lesson / breaks a mechanism / cosmetic / idle
- [ ] **The fix**, and the test that would have caught it

Rank by severity, and put anything that **inverts a lesson the game exists to
teach** at the top, in its own section. That category is what this project
cares about above everything else — the prototype passed all its own checks
while teaching that printing money always causes inflation, that a rate hike
cures inflation in nine months, and that beating inflation destroys your
credibility.

Finish with a short section in the style of `00-design-brief.md`'s
"Post-research revisions": **which of these findings change the design**, and
what the reasoning was. That record has been the most useful artefact each
previous pass produced.

---

## Reading order for someone new

1. `00-design-brief.md` — what the game is and what it must teach
2. `02-causal-map.md` — the causal chains you are auditing against
3. `05-handoff.md` — what two research passes changed and why
4. `parameters.py` — the numbers, with confidence and citations
5. `src/rules/index.js` — the execution order, which is itself the model's
   causal order
6. `03-architecture.md` §Defects — the six defects found in the prototype,
   because the same classes of error will recur
