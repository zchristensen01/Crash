# 08 — Post-audit revisions

What the `06` audit brief asked for, what `07` found, and what changed as a
result. Written in the style of `00-design-brief.md`'s "Post-research
revisions", because that record has been the most useful artefact each pass
produced.

Every finding in `07` is closed. The two that are deliberately *not* closed are
recorded as such, in code, with a test that fails loudly if anyone quietly
closes them.

```
before   47 tests, 0 failures
after    89 tests, 0 failures, 2 documented `todo` disagreements
```

The `todo`s are not a way of hiding failures. They are two places where the
model disagrees with a published reduced form, and this project's standing rule
is that a disagreement is a finding to surface rather than a coefficient to
adjust. Both print their measured value on every test run.

---

## The eight things that changed the model

### 1. The lag pipeline now carries drivers, not effects

**Was:** `applyDialChange` scheduled an *effect size* into `s.consumption` and
`s.investment`, and `updateConsumption` / `updateInvestment` assigned those
fields from scratch a few lines later. Every scheduled effect was overwritten
before it could act. Scheduling 1000pp of GDP into demand moved output by zero.
0 of 21 kernel channels affected anything.

**Now:** the pipeline schedules the *delta of a policy driver* into a dedicated
transmitted field — `policy_rate_demand`, `policy_rate_markets`,
`tax_rate_effective`, `qe_stock` — that no rule may assign to. Kernels are
normalised to sum to 1, so the transmitted field walks to the dial's new value
and stops.

**Why this shape and not the other one.** An effect size has to be estimated
twice, once in `dials.js` and once in the rule, and then the two have to be
kept from double-counting; the old code had both, at 1.0pp and 0.34pp per 1pp
of rate, and only avoided the double count by accident, by throwing one away. A
driver exists once. It is also the only version that can be *checked*: the
transmitted rate must converge to the dial, and `test/lags.test.js` asserts it.

Consequences that fell out for free: `signAsymmetry` reaches the model, so cuts
are weaker than hikes rather than 1.38× stronger; the pipeline panel now shows
things that are genuinely still coming; and the Taylor autopilot faces the same
transmission lag the player does, because it goes through `applyDialChange` like
everyone else.

**Guard:** `engine.js` throws if anything schedules into a field a rule owns,
and a static test greps every rule for assignments to a pipeline target.

### 2. Household income is what the economy produced

**Was:** `disposable_income = 100 - tax_revenue + transfers`. The `100` is
*potential* output, held constant. One line, and it removed the
income–expenditure multiplier entirely, left the automatic stabilisers with no
shock to absorb (measured absorption 0.15 against a strong-confidence 0.60),
made the austerity paradox algebraically impossible, and made households 2.8pp
*richer* in a 7% recession.

**Now:** `market_income = 100 × output / potential_output`. At the steady state
output equals potential, so the value is unchanged and the steady state does not
move — `test/steady-state.test.js` still shows zero drift over 200 ticks.

This is the change with the widest blast radius in the whole pass. Every
multiplier in `07` was measured before it and none of them survive it.

### 3. Crowding out reads the cyclically-adjusted primary deficit

**Was:** it read the headline deficit. So any demand expansion raised output,
raised the tax take, shrank the deficit, and *crowded investment back in* — an
amplifier that switches off exactly when there is slack, because the term is
multiplied by `(1 - slack)`. It was the only structural amplifier any demand
lever had, and it single-handedly inverted three conditionals: rate cuts were
2.2× stronger at capacity than with slack, printing did nothing with slack and
worked at capacity, and a tax cut lowered output for its first fifteen months.

**Now:** the cyclical component (the stabilisers doing their job) and the
interest bill (a transfer, and doc 02's own separate chain) are both stripped
out, and what remains reaches investment through a first-order lag on the
`rate_to_investment` timescale — because crowding out is the yield channel, and
the yield channel is not instant.

Measured after: a rate cut buys 91% output / 9% prices with slack and 71/29 at
capacity; the fiscal multiplier runs 2.1 at a −5% gap and 0.69 at +1.4%.

### 4. Printing money buys things

**Was:** the print dial reduced the deficit and nothing else. It reached demand
only by crowding investment in, which is why it did nothing when there was
slack — the exact inverse of DIAL 5. Meanwhile `monetisation_passthrough` was
exactly zero for four years at every gap, because the gate is a product of two
factors that are each zero in any normal state.

**Now:** printed money is monetised *spending*. It enters demand in
`aggregate.js` and cancels on the financing side of the budget identity, which
is precisely "govt spends without taxing or borrowing": you get the goods, the
debt does not rise. The slack ceiling then decides whether that becomes output
or prices, and the credibility×slack gate still governs the direct inflation
pass-through on top.

### 5. Okun's β is a ramp, symmetric in the size of the gap

**Was:** a hard switch at `output_gap < -2`. Two findings, one cause. Stimulus
that carried the gap up across −2 doubled β and *raised* unemployment, for
every starting gap between −3.0 and −2.2 — the ordinary recession the player
spends most of the game in. And an equal-sized boom moved employment three
times further than a slump, inverting "firms fire in weeks and hire over
quarters".

**Now:** `lerp(OKUN_BETA, OKUN_LABOUR_HOARDING, |gap| / OKUN_HOARDING_GAP)`.
Symmetric, because firms that hold staff through a trough do not hire hard in
the recovery either, and at very low unemployment the labour-supply constraint
flattens Okun again. With β symmetric, the asymmetry lives entirely in
`FIRING_SPEED` vs `HIRING_SPEED`, which is where Davis & Haltiwanger's evidence
actually is. Measured rise/fall is now 1.6 on impact.

The same treatment was applied to the recession damping in
`monetaryEasingScale`, which had the identical step at gap = −1.5.

### 6. The crash chain exists

Four separate pieces were missing, and together they meant a financial crisis
cost 0.7pp of unemployment:

- **`crisis_drag`** — the ~9% demand collapse — was computed every tick and
  read by nothing. Only the permanent scar reached the model, and a scar cuts
  potential and actual output together, so the *gap* barely moved. It is now a
  term in `aggregateDemand`.
- **`recap_promptness`** was set to 0 and nothing could raise it. Recapitalising
  a banking system is a fiscal operation, so the game does not need a separate
  dial: extra spending inside `RECAP_WINDOW_MONTHS` of a crash is read as the
  response, and the scar stays open to revision for that window instead of being
  fixed on the first tick.
- **The fire sale never fired**, in any scenario, over a full term — leverage
  anchored its numerator on the canonical `START` while its denominator moved
  with the scenario, which put the bubble at 0.75 against a 1.35 gate. Both
  anchors now come from the scenario's own start, so leverage is 1.0 everywhere
  and the gate means the same thing in all six.
- **Bank capital never fell below 13.01%**, because `BANK_CAPITAL_DELEVER_TRIGGER`
  is stated in points *below the regulatory minimum* and the minimum had never
  been given a value. `BANK_CAPITAL_MINIMUM` supplies it; below the floor banks
  cut lending, which is the quantity leg of the doom loop.

Making the gate reachable then exposed the thing that had been hiding behind it:
**an unbalanced loop still has to end.** Asset prices are in leverage's
denominator, so forced selling raises leverage, which sells harder, forever —
the first working version drove the index to its floor with leverage at 36 and
left it there. Two additions fix that without softening the bust: defaulted debt
now leaves the credit stock, and forced selling draws on a finite
`FIRESALE_TOTAL_CAPACITY`, because the distressed holders doing the selling run
out. A crash now takes output down 10pp, unemployment up 2pp, bottoms in about a
year and recovers over five, leaving a permanent scar.

### 7. The price brake

`docs/02` Self-correction 1: "demand > capacity → prices ↑ → real incomes ↓ →
demand ↓". It was not in the model. `supply_shock` entered the Phillips curve
and nothing else, so an oil shock was purely inflationary — and the stagflation
scenario boomed straight out of its own regime, unemployment falling from 8% to
4.5% in six months while inflation climbed.

A cost-push shock raises prices without raising anybody's income, which is a
real income cut by definition. `SUPPLY_SHOCK_INCOME_LOSS` subtracts it from
disposable income. This is what makes a supply shock STAGflationary rather than
merely inflationary, and it is why the oil-shock event now has teeth.

Found while fixing the scenarios, not by the audit. Worth noting: the audit
found what it was looking for, and this was underneath.

### 8. Neutral is r\* + target, not wherever the scenario starts

`policy_rate_ss` and `market_real_rate_ss` were both built from
`s.policy_rate` — the scenario's *opening* rate. So a scenario opening at 10%
against 7% expected inflation declared its own stance neutral, then computed a
real user cost 5pp below that reference, and the tightest starting policy in
the set read as a large monetary easing. Also found while fixing the scenarios.

Anchors that mix a rate with `inflation_target` must be built from neutral.
`apc_ss`, `credit_ss` and `bank_capital_ss` are the same class of decision, and
each one now says in a comment which convention it uses and why.

---

## What changed in the game

**A fifth dial: QE.** Implementing the lower bound left the rate dial with a
dead zone and nothing behind it, and `docs/02` calls the ZLB "the entire reason
QE was invented". It buys bonds, pushes the whole curve down through
`QE_TO_YIELD`, spends nothing, and works at the bound. It is deliberately weak
per pound — the literature median is about 50bp for a full programme — which is
its own lesson.

**Two scenarios were rebuilt**, because both failed the rule `scenarios.js`
already states: a regime has to be DRIVEN, not asserted.

- *Recession* asserted `unemployment: 9.0` with a stimulative 0.5% rate and
  nothing producing a demand shortfall, so its output gap was positive from
  month one and unemployment was under 5% by month six. It was never in
  recession and its trap — that the rate dial is already dead — was never
  tested. It is now a balance-sheet recession: a crash six months ago, its
  demand collapse still unwinding, assets 30% below fundamental, spreads wide,
  banks near their floor, and the rate already at zero. It holds a −9% gap for
  two years and heals over five.
- *Bubble* claimed every visible gauge stayed healthy while inflation crossed
  3% by month three and reached 4.7% by year four. It now runs on cheap money
  (1pp below neutral, which is what feeds a credit boom) offset by a tight
  budget — which is not a contrivance: Ireland and Spain both ran fiscal
  surpluses through their housing booms and both read it as prudence. Inflation
  holds at 2.6–2.7% for the whole build-up while the credit gap crosses the 9pp
  BIS line in year four.
- *Stagflation* got a real capacity loss (`scar: 3`, and a natural rate that
  rises with it) instead of an asserted unemployment rate. It holds its box for
  a quarter and then reflates, which is not a defect — see below.

---

## What we decided NOT to change

**The two parameter disagreements.** `RATE_TO_INFLATION` (model 0.12 against a
published 0.2–0.4) and `TAX_SHOCK_TO_GDP` (0.33 against 2.0–3.0) are recorded
as `todo` tests that print their measured values. The first is the anchored
Phillips slope doing exactly what `docs/02` says it should; the second is
Romer–Romer, the largest tax multiplier in the literature. Closing either would
mean moving a coefficient to fit a target, which is the one thing this project
keeps telling itself not to do.

**`ENERGY_TO_CPI`.** The parameter says 0.04pp of headline CPI per 10% energy
rise, which makes the oil event's ~60% spike worth 0.24pp. `events.js` has
always used 2.4pp — exactly 10× more. Energy is roughly 7% of an
advanced-economy CPI basket, so 0.04 looks like a transcription error for 0.4,
which would give 2.4 exactly. That is a research question, not a wiring one, so
it is registered in `parameters.py` `CONFLICTS` and the event points at the
entry. A test asserts it is still unresolved, so it cannot be forgotten.

**Stagflation does not stay stagflationary.** Holding that box for a year would
require the model to be stable at 9% inflation with a passive central bank, and
the Taylor principle says it must not be. The player gets roughly one quarter of
"no good answer" before the answer becomes obvious and expensive. The regime
test checks arrival and one quarter, not a year, for exactly this reason.

**The steep gradient below the neutral rate.** Eight-year inflation goes from
4.6% to 43.9% across about one dial step, and the temptation will be to soften
it. It is the Taylor principle and it is correct. The honest fix is legibility,
not damping.

**`govt_investment` vs `govt_consumption`.** `docs/02` asks for the split and
it is still not built — it is a change to the dial surface rather than a defect,
and it touches every scenario's accounting. Both `GOVT_INVESTMENT_MULT_*`
parameters are registered as validation targets for a deferred lever, so the
register says so out loud.

---

## What now stops this recurring

Every finding in `07` shares one property: **none of them could be caught by
looking at a single point.** They are statements about how a response changes
with the state, and the 47-test suite checked levels.

| Guard | What it catches |
|---|---|
| `test/lags.test.js` | anything scheduled into the pipeline that does not arrive; any rule that assigns to a transmitted driver; a transmitted rate that stops converging |
| `test/events.test.js` | an event that breaks an identity, gets overwritten, or writes a policy driver; and full 96-month terms with shocks on and invariants armed, which is the configuration the shipped game runs and the one no test used |
| `test/transmission.test.js` | every state-dependent conditional, plus two SWEEPS across the gap range. Three separate findings were a step function in the middle of the playable range; a two-point comparison cannot see one |
| `test/crisis.test.js` | the whole crash chain, including that the bust ENDS |
| `test/validation.test.js` | the `DEFERRED` register, enforced in both directions — a parameter that nothing reads must be listed with a reason, and one that is listed must not be read |
| `src/invariants.js` | four more identities: the capital law of motion, credit stock-flow, the price level against cumulative inflation, and per-component demand bounds so a rule that saturates against a clamp says so instead of reading as stable |

The register is the piece worth keeping longest. `07` F1 found 46 of 108
parameters unread with no way to tell "not built yet" from "quietly dropped".
Wiring one up now forces you to delete its entry; dropping one forces you to
justify it.
