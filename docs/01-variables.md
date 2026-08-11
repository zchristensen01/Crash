# 01 — Variables

Everything the model tracks. This document is renderer-agnostic — it describes
the model's state, not the screen. `09-interface.md` describes the screen.

> **LIVING DOCUMENT.** Unlike `00`, `04`, `05`, `06` and `07`, this one is meant
> to describe the model *as it is now*, not as it was at some pass. It went
> badly stale before the audit — it listed dials that were not dials, a
> `neutral_rate` of 3.0% that is actually a `neutral_real_rate` of 0.5%, and
> two variables that had been deleted. `test/docs.test.js` now asserts that
> every field `newState()` produces appears somewhere in this file, and that
> nothing here has been deleted from the model. If you add a state field, this
> file fails until you document it.

Three kinds:

- **STOCK** — accumulates over time. Has a level. Changes slowly. (debt, capital)
- **FLOW** — a rate per period. (GDP, spending, investment)
- **RATE/INDEX** — a ratio or price. (interest rate, inflation, price level)

Mixing these up is the single most common modelling bug. Debt is a stock;
deficit is a flow; adding a flow to a stock requires dividing by ticks per year.

**THE UNIT CONVENTION THAT MAKES THE IDENTITIES CLOSE:** every demand
component, tax, transfer and flow is carried as a **percent of potential
output**, not as a level. `potential_output` is the only level. So
`C + I + G = 100` exactly at the steady state and the accounting is readable at
a glance. Rates are **annualised percents** throughout, because that is how
they are reported; conversion to monthly happens inside rules, via `units.js`,
never in state.

`START` in `parameters.py` is the authoritative set of starting values. The
numbers below are what it currently produces.

---

## A. Real economy — what actually gets made

| Variable | Kind | Start | Notes |
|---|---|---|---|
| `potential_output` | STOCK | 100.0 | The hard ceiling. Everything else is noise around this. |
| `output` | FLOW | 100.0 | Actual production. Capped at potential × (1 + `MAX_CAPACITY_OVERHEAT`/100). |
| `output_gap` | RATE | 0.0 | `C+I+G+printed+NX−drag − 100`. **UNCAPPED** — prices.js reads this, so demand that cannot become output flows into prices instead of vanishing. |
| `capital_stock` | STOCK | 300.0 | Machines, buildings. `K[t] = (1−δ)K[t−1] + I[t−1]` |
| `labour_force` | STOCK | 100.0 | Constant in v1 — no demographics dialled |
| `employment` | STOCK | 95.0 | `labour_force × (1 − u/100)` |
| `tfp` | INDEX | 0.68 | Total factor productivity. Solved so Y\* = 100 at the start |
| `alpha` | RATE | 0.38 | Capital's share = 1 − `labour_share` |
| `labour_productivity` | INDEX | 1.05 | Output per employed worker. Display only |
| `productivity_growth` | RATE | 1.5% | Resolved in supply.js as potential growth |
| `potential_growth` | RATE | 1.5% | Annual trend growth |
| `capital_output_ratio` | RATE | 3.0 | K/Y, annual |
| `investment_share` | FLOW | 22.5% | The steady-state share, `(δ+g)×K/Y`. Not the same as `investment` |
| `labour_share` | RATE | 0.62 | Labour's share of income |
| `gdp_growth_annual` | RATE | 1.5% | Carried in START; display |
| `participation` | RATE | 63% | Carried in START; not yet a mechanism |
| `tick` | STOCK | 0 | Months elapsed |

**Why potential_output matters more than anything:** it's the answer to "why
can't we just print money." You can hand everyone a million dollars. You cannot
hand them a million loaves of bread that don't exist.

## B. Demand components

All as % of potential output, all summing to the output gap.

| Variable | Kind | Start | Notes |
|---|---|---|---|
| `consumption` | FLOW | 55.5 | Behavioural, not a residual. Solved from `apc_ss × disposable_income` |
| `investment` | FLOW | 22.5 | Clamped to [2, 45] — no economy invests more than ~45% of output |
| `govt_purchases` | FLOW | 22.0 | Tracks the spend dial. Lands immediately: the fastest lever |
| `net_exports` | FLOW | 0.0 | Zero at rest (v1 is closed, decision A5), but the home of external demand shocks. Decays on `FOREIGN_DEMAND_SHOCK_HALFLIFE` |
| `crisis_drag` | FLOW | 0.0 | The transitory demand collapse of a financial crisis. Subtracted from demand |
| `apc_ss` | RATE | 0.709 | Average propensity to consume, a BEHAVIOURAL CONSTANT from the canonical baseline. Deriving it per scenario makes the fiscal multiplier structurally zero |
| `yd_permanent` | FLOW | 78.25 | Permanent income: a slow adjustment toward current disposable income |
| `mpc_effective` | RATE | 0.35 | Monthly MPC out of transitory income. Rises with unemployment |

## C. Labour

| Variable | Kind | Start | Notes |
|---|---|---|---|
| `unemployment` | RATE | 5.0% | |
| `natural_unemployment` | RATE | 5.0% | The floor. Push below and wages accelerate |
| `wage_growth` | RATE | 3.5% | = target 2.0 + productivity 1.5. Above that is inflationary |
| `ulc_growth` | RATE | 2.0% | Unit labour costs: wage growth minus productivity. This is what pressures prices |
| `hiring_momentum` | STATE | 0.0 | Builds while hiring, collapses the moment firing starts |
| `okun_beta_effective` | RATE | 0.45 | The Okun coefficient actually in use. A RAMP in \|output_gap\|, not a switch |
| `spiral_active` | STATE | false | The wage-price spiral gate. Rare by design — all three conditions or it fizzles |

## D. Prices and money

| Variable | Kind | Start | Notes |
|---|---|---|---|
| `inflation` | RATE | 2.0% | Annualised. Floored at −4% |
| `expected_inflation` | RATE | 2.0% | **The dangerous one.** Once unanchored, everything gets harder |
| `inflation_target` | RATE | 2.0% | |
| `credibility` | INDEX | 0.85 | 0–1. Falls ~3× faster than it rebuilds |
| `kappa_effective` | RATE | 0.05 | The Phillips slope in use. `lerp(anchored, unanchored, 1 − credibility)` |
| `price_level` | INDEX | 100.0 | Cost of living since you took office. **Display only**, and pinned to cumulative inflation by an invariant |
| `supply_shock` | FLOW | 0.0 | pp of cost-push inflation. Decays 15%/month |
| `supply_cost` | FLOW | 0.0 | The same shock as a REAL INCOME LOSS. This is docs/02's price brake, and it is what makes a supply shock stagflationary rather than merely inflationary |
| `velocity` | INDEX | 1.0 | Pinned at 1 until expected inflation clears `VELOCITY_FLIGHT_THRESHOLD`; past it, flight from money multiplies the monetisation pass-through |
| `velocity_v0` | RATE | 0.015 | The baseline that makes velocity stationary at the start |
| `money_printed` | FLOW | 0.0% | **DIAL.** Monetised spending: it buys things AND does not add to debt |
| `monetisation_passthrough` | FLOW | 0.0 | pp of inflation from printing. `credibility × slack × velocity`, and zero in any ordinary state |

`credibility` is not decoration — it is the switch that sets the Phillips slope
κ (0.05 anchored, 0.20 unanchored) and decides whether expectations drift back
to target on their own or chase whatever inflation just did. It is the
difference between a central bank that can talk inflation down and one that has
to crush the economy to prove a point.

## E. Policy dials, and what the economy actually feels

**The dial is what you SET. The transmitted driver is what the economy has
FELT so far.** `applyDialChange` schedules the difference into the lag pipeline
on that channel's kernel; the engine walks the transmitted field toward the
dial. No rule may assign to a transmitted driver, and the engine throws if
anything tries to schedule into a field a rule owns.

| Dial | Start | Range | Transmitted as | Peak |
|---|---|---|---|---|
| `policy_rate` | 2.5% | −0.75 to 20 | `policy_rate_demand` | 9 months |
| " | | | `policy_rate_markets` | 1 month |
| `tax_rate` | 24.75% | 0 to 70 | `tax_rate_effective` | 3 months |
| `govt_spending` | 22.0% | 0 to 70 | *(immediate — it IS demand)* | 0 |
| `money_printed` | 0.0% | 0 to 15 | *(immediate — it IS spending)* | 0 |
| `qe` | 0.0% | 0 to 30 | `qe_stock` | 2 months |

`transfers` is **not** a dial. It moves automatically with unemployment; that
is half the point of the automatic-stabiliser block.

## F. Money, credit and assets

| Variable | Kind | Start | Notes |
|---|---|---|---|
| `market_rate` | RATE | 4.0% | What firms actually pay = transmitted rate + spread − QE relief |
| `user_cost` | RATE | 8.5% | `market_rate − expected_inflation + depreciation`. What investment responds to |
| `credit_spread` | RATE | 1.5pp | Over the policy rate. Widens in fear, collapses in booms |
| `neutral_real_rate` | RATE | 0.5% | r\*. Neutral NOMINAL is r\* + target = 2.5% |
| `term_premium` | RATE | 0.75pp | |
| `yield_10y` | RATE | 3.25% | Policy + term premium − QE + risk premium |
| `average_coupon` | RATE | 3.25% | The rate actually PAID on the outstanding debt stock. Walks toward `yield_10y` as 1/`DEBT_AVERAGE_MATURITY_YEARS` of it refinances each year. The whole stock used to reprice instantly (docs/12 M2) |
| `sovereign_premium_felt` | RATE | 0.0 | The share of the government's risk premium that private borrowers pay, via `SOVEREIGN_TO_CORPORATE_PASSTHROUGH`. The sovereign yield used to reach nothing outside the government's own books |
| `risk_premium` | RATE | 0.0 | The debt-driven part of the yield. Display |
| `qe_rate_relief` | RATE | 0.0 | pp taken off the whole curve by bond buying |
| `private_credit_gdp` | STOCK | 150% | The scenario's starting credit level. Seeds `private_credit`, `credit_trend` and `credit_ss` |
| `private_credit` | STOCK | 150% | Household + business borrowing, % of GDP |
| `credit_trend` | STOCK | 150% | Its own very slow trend. The gap is the crash meter |
| `credit_to_gdp_gap` | RATE | 0.0pp | **THE CRASH METER.** Warning 3pp, BIS danger line 9pp |
| `credit_impulse` | FLOW | 0.0 | Credit demand as a fading flow, not a ratcheting level |
| `credit_growth_annual` | RATE | 3.5% | Nominal growth + impulse + forced deleveraging |
| `write_offs` | FLOW | 0.0 | Defaulted debt leaving the credit stock. What finally ENDS a deleveraging spiral |
| `asset_prices` | INDEX | 100.0 | A REAL index — stationary at rest. Stocks and housing combined |
| `asset_fundamental` | INDEX | 100.0 | What mean reversion pulls toward, and what the wealth effect measures against |
| `leverage` | RATE | 1.0 | Debt against what backs it, normalised to 1.0 at the scenario's own start |
| `leverage_max` | RATE | 1.35 | The fire-sale gate: 35% above where you began |
| `fire_sale_spent` | STOCK | 0.0 | How much of `FIRESALE_TOTAL_CAPACITY` the forced sellers have used. Forced selling is done by someone, and they run out |
| `default_rate` | RATE | 1.0% | Baseline + debt-service burden + unemployment |
| `loan_losses` | FLOW | 0.0 | `default × LGD × loans`. Only losses above the baseline eat capital |
| `bank_capital_ratio` | RATE | 13% | |
| `bank_capital_shortfall` | RATE | 0.0 | Distance below `BANK_CAPITAL_MINIMUM`. Positive means banks are cutting lending — the quantity leg of the doom loop |

## G. Government

| Variable | Kind | Start | Notes |
|---|---|---|---|
| `tax_revenue` | FLOW | 24.75% | Effective rate + the progressive stabiliser, both lagged |
| `autostab_tax` | FLOW | 0.0 | The progressive-tax stabiliser leg, lagged `AUTOSTAB_TAX_LAG` |
| `autostab_benefit` | FLOW | 0.0 | The unemployment-benefit leg, lagged `AUTOSTAB_BENEFIT_LAG`. Most timely channel in the model |
| `transfers` | FLOW | 3.0% | Base plus the benefit stabiliser |
| `market_income` | FLOW | 100.0 | **What the economy actually produced**, `100 × output/potential`. Writing a constant here is what removed the multiplier |
| `disposable_income` | FLOW | 78.25 | market income − tax + transfers − supply cost |
| `deficit` | FLOW | 3.5% | spending + printed + transfers + interest − revenue − printed |
| `structural_deficit` | FLOW | 0.25% | Cyclically adjusted AND primary. The fiscal STANCE |
| `structural_deficit_felt` | FLOW | 0.25% | The same, lagged — crowding out is the yield channel and is not instant |
| `govt_debt` | STOCK | 100% | |
| `interest_cost` | FLOW | 3.25% | `debt × yield`. Watch this one |
| `fiscal_space` | INDEX | 100 | 100 → 0 as interest eats a quarter of revenue. Display |
| `foreign_share` | RATE | 0.30 | **The Japan-vs-periphery switch.** Yields go nonlinear on ownership, not on the level |

## H. Crisis state

| Variable | Kind | Start | Notes |
|---|---|---|---|
| `crisis_active` | STATE | false | |
| `crisis_prob` | RATE | 0.0 | ANNUAL probability from the credit gap, capped past ~2 SD |
| `crisis_months` | STOCK | 0 | |
| `transitory_shock` | FLOW | 0.0 | Peak-to-trough demand fall, ~9%. Decays into `crisis_drag` |
| `scar` | STOCK | 0.0 | **Permanent** capacity loss, PHASED IN over `CRISIS_YEARS_TO_RECOVER`. Output does not cycle back |
| `scar_target` | STOCK | 0.0 | Where `scar` is headed. Revisable for `RECAP_WINDOW_MONTHS`, then fixed. Split from `scar` because the scar used to land in full on month one (docs/12 §2) |
| `recap_promptness` | RATE | 0.0 | 0–1. Earned by spending inside `RECAP_WINDOW_MONTHS` of a crash, and it halves the scar |
| `recap_spent` | STOCK | 0.0 | pp-**years** of GDP injected since the crash. `recap_promptness` is this over `RECAP_FULL_RESPONSE`. A quantity, not a rate — comparing the rate let a one-month gesture beat a year-long programme (docs/12 L1) |
| `potential_at_crisis` | STOCK | 100 | Snapshotted when the crash lands |
| `crisis_spending_baseline` | FLOW | 22.0 | Also snapshotted, so a same-month response still counts |

## I. Sentiment

| Variable | Kind | Start | Notes |
|---|---|---|---|
| `consumer_confidence` | INDEX | 60 | Mostly an echo of fundamentals |
| `confidence_residual` | INDEX | 0.0 | The part fundamentals do NOT explain. **Only this feeds consumption**, and only weakly |
| `business_confidence` | INDEX | 60 | Order books and the cost of credit, not jobs and food. Display |
| `approval` | INDEX | 65 | Your health bar. Unemployment hurts ~1.7× more than inflation |
| `approval_base` | INDEX | 65 | |
| `misery` | INDEX | 7.0 | inflation + unemployment. Display ONLY — approval deliberately does not use a 1:1 misery index, because Di Tella et al. reject that weighting |

**Corrected after research pass 2.** An earlier version of this document said
`approval` and both confidence indices have "zero empirical basis". That was a
search error, not a finding: economic voting (Hibbs; Achen & Bartels) and
consumer sentiment (Carroll-Fuhrer-Wilcox; Ludvigson) are mature, well
identified fields. The coefficients are sourced in `parameters.py` §10.

## J. Steady-state anchors

Rules compare against these, never against raw levels — a risk premium on the
debt LEVEL would add 3pp to the yield at the steady state and nothing would
balance. Three different conventions are in use, and which one applies is a
decision each time:

| Anchor | Convention | Why |
|---|---|---|
| `policy_rate_ss`, `market_real_rate_ss` | **NEUTRAL** (r\* + target) | Neutral is a fact about the economy, not about where a scenario opens. Taking these from `s.policy_rate` made a scenario starting at 10% declare its own stance neutral |
| `apc_ss`, `bank_capital_ss` | **CANONICAL** (`START`) | Behavioural constants. Deriving `apc_ss` per scenario makes the fiscal multiplier structurally zero; deriving `bank_capital_ss` per scenario means a damaged banking system has redefined "healthy" to mean "damaged" |
| `credit_ss`, `asset_prices_ss`, `deficit_ss`, `structural_deficit_ss`, `tax_rate_ss`, `credit_spread_ss`, `transfers_base`, `dsr_ss`, `loan_losses_ss`, `leverage_ss` | **SCENARIO'S OWN START** | Stationarity anchors: they exist so a scenario does not immediately drift away from the state it was handed |

## K. Bookkeeping

| Variable | Notes |
|---|---|
| `fired_event` | The shock that landed this month, or null |
| `ending_counters` | Months-so-far per ending. A broken condition resets its counter, which is what makes the on-screen countdown beatable |
| `history` | Capped ring buffers for the charts and year-over-year |
| `labour_hoarding_policy` | Optional override: `false` disables the Okun hoarding ramp |
| `current_account`, `fx_change` | Carried in START for the deferred open economy. No rule reads them |

---

## L. Derived danger meters

| Variable | Formula | Meaning |
|---|---|---|
| `credit_to_gdp_gap` | private credit/GDP − its own slow trend | **The crash meter.** Warning 3pp, BIS danger line 9pp |
| `crisis_prob` | ~3.5pp per SD of excess credit, capped at 2.5 SD, +60% in the R-zone | Annual probability, not a vibe |
| `misery` | inflation + unemployment | Displayed, not used to drive approval |
| `fiscal_space` | 100 × (1 − interest/revenue ÷ 0.25) | Room before debt service crowds everything out |
| `regime` | quadrant from (inflation, unemployment vs natural) | Which of four boxes you are in |

An earlier draft had a `fragility` score built from a weighted blend of
leverage, cheap-money duration, debt and overheating. That was invented. The
credit-to-GDP gap replaces it — it is the BIS early-warning indicator, it has a
published hit rate (~66% of crises at 9pp), and it has the property that makes
it worth teaching: **it is the only gauge that warns you.**

---

## M. Starting scenarios

Each is a different set of the values above. **A regime has to be DRIVEN, not
asserted** — setting `unemployment: 9` does nothing, because the labour rule
pulls unemployment to its Okun target within months. Three of these six had to
be rebuilt for exactly that reason; see `08-post-audit-revisions.md`.

| Scenario | How it is driven | The trap |
|---|---|---|
| **Calm** | everything at the solved steady state | Boredom → you stimulate for no reason |
| **Overheating** | rate 1pp, inflation 6%, credibility 0.60 | Hiking hurts before it helps |
| **Recession** | a crash six months ago: `crisis_active`, assets 30% below fundamental, spread 4pp, banks at 11%, rate on the floor | The rate dial is already dead. Fiscal is the only lever, and it is the one that raises debt |
| **Stagflation** | a real 3% capacity loss (`scar`), a natural rate that rose with it, and a standing cost-push shock | No dial fixes both. You get about a quarter before the answer becomes obvious and expensive |
| **Debt trap** | debt 140%, yield 7%, foreign share 0.60, growth 1% | Interest costs grow faster than the economy |
| **Bubble** | cheap money (1pp below neutral) offset by a tight budget, assets 80% above fundamental, credit gap already 6pp | Every visible gauge stays healthy for four years while the credit gap crosses the BIS line |

The Bubble scenario is the best teaching tool in the set, and it only works if
inflation, unemployment and approval all stay in the "nothing is wrong" band the
whole time. `test/scenarios.test.js` asserts that, including the regime label —
an unasserted promise is not a promise.

**On the Bubble's ending.** An earlier version of this document said "and you
still die in four years". The research does not support that certainty:
Schularick & Taylor put crisis risk at ~3.5pp per standard deviation of excess
credit, so even a large gap means roughly 5–14% *annual* risk. Over an
eight-year term that is a serious compounding gamble, not a death sentence.
Coding it as certain death would mean tuning to a dramatic target rather than
reporting what the evidence says.
