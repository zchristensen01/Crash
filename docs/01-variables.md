# 01 — Variables

Everything the model tracks. This document is renderer-agnostic — it describes
the model's state, not the screen. Section I at the end maps each variable to
how it appears in the interface.

Three kinds:

- **STOCK** — accumulates over time. Has a level. Changes slowly. (debt, capital)
- **FLOW** — a rate per period. (GDP, spending, investment)
- **RATE/INDEX** — a ratio or price. (interest rate, inflation, price level)

Mixing these up is the single most common modelling bug. Debt is a stock;
deficit is a flow; adding a flow to a stock requires dividing by ticks per year.

---

## A. Real economy — what actually gets made

| Variable | Kind | Start | Healthy | Notes |
|---|---|---|---|---|
| `potential_output` | STOCK | 100.0 | grows ~2%/yr | The hard ceiling. Everything else is noise around this. |
| `output` | FLOW | 100.0 | ≈ potential | Actual production |
| `output_gap` | RATE | 0.0 | −1% to +1% | `(output/potential) − 1`. **The most important number in the model.** |
| `capital_stock` | STOCK | 300.0 | grows | Machines, buildings. Feeds potential_output |
| `productivity` | INDEX | 1.0 | slow ↑ | Output per worker-hour |
| `labour_force` | STOCK | 100.0 | slow ↑ | Population able to work |

**Why potential_output matters more than anything:** it's the answer to "why
can't we just print money." You can hand everyone a million dollars. You
cannot hand them a million loaves of bread that don't exist.

---

## B. Labour

| Variable | Kind | Start | Healthy | Notes |
|---|---|---|---|---|
| `unemployment` | RATE | 5.0% | 4–6% | |
| `natural_unemployment` | RATE | 5.0% | — | The floor. Push below and wages spiral |
| `wage_level` | INDEX | 100.0 | — | |
| `wage_growth` | RATE | 3.0% | ≈ inflation + productivity | Above that = inflationary |
| `hiring_momentum` | STATE | 0.0 | — | Firms hire slowly, fire fast. Asymmetry lives here |

---

## C. Prices

| Variable | Kind | Start | Healthy | Notes |
|---|---|---|---|---|
| `price_level` | INDEX | 100.0 | — | |
| `inflation` | RATE | 2.0% | 1.5–3% | Annualised |
| `expected_inflation` | RATE | 2.0% | anchored at 2 | **The dangerous one.** Once unanchored, everything gets harder |
| `cb_credibility` | INDEX | 0.85 | > 0.7 | 0–1. Falls fast, rebuilds slowly |

`cb_credibility` is not decoration — it is the switch that sets the Phillips
slope κ (0.05 anchored, 0.20 unanchored) and decides whether expectations drift
back to target on their own or chase whatever inflation just did. It is the
difference between a central bank that can talk inflation down and one that has
to crush the economy to prove a point. Code it before anything else in this
section.

---

## D. Money and credit

| Variable | Kind | Start | Healthy | Notes |
|---|---|---|---|---|
| `policy_rate` | RATE | 3.0% | — | **DIAL** |
| `neutral_rate` | RATE | 3.0% | — | Neither stimulates nor restricts. Drifts slowly |
| `market_rate` | RATE | 4.5% | — | What people actually pay = policy + spread |
| `credit_spread` | RATE | 1.5% | 1–2% | Widens in fear, collapses in booms |
| `money_supply` | STOCK | 100.0 | — | |
| `velocity` | INDEX | 1.0 | ~1 | How fast money changes hands. Rises with inflation fear |
| `private_debt` | STOCK | 150% | < 180% | Household + business borrowing |
| `credit_trend` | STOCK | 150% | — | Slow trend of the above. Gap between them is the crash meter |
| `asset_prices` | INDEX | 100.0 | — | Stocks and housing combined |
| `leverage` | RATE | 1.0 | < 1.4 | `private_debt / asset_prices` |

---

## E. Government

| Variable | Kind | Start | Healthy | Notes |
|---|---|---|---|---|
| `tax_rate` | RATE | 25% | — | **DIAL** |
| `govt_spending` | FLOW | 22% GDP | — | **DIAL** |
| `transfers` | FLOW | 3% GDP | — | **DIAL**. Unemployment benefits etc. Rises automatically in recession |
| `money_printed` | FLOW | 0% GDP | 0 | **DIAL** |
| `tax_revenue` | FLOW | derived | — | Falls automatically in recession |
| `deficit` | FLOW | derived | < 3% GDP | |
| `govt_debt` | STOCK | 60% GDP | < 90% | |
| `bond_yield` | RATE | 3.5% | — | Rises with debt, deficit, and inflation |
| `interest_cost` | FLOW | derived | < 2% GDP | `debt × bond_yield`. Watch this one |

---

## F. Sentiment

| Variable | Kind | Start | Healthy | Notes |
|---|---|---|---|---|
| `consumer_confidence` | INDEX | 60 | > 50 | Drives consumption |
| `business_confidence` | INDEX | 60 | > 50 | Drives investment |
| `approval` | INDEX | 65 | > 30 | Your health bar |

---

## G. Derived danger meters (displayed, never set directly)

| Variable | Formula | Meaning |
|---|---|---|
| `credit_gap` | `(private_credit/GDP) − trend`, one-sided HP filter λ=400,000 | **The crash meter.** Warning at 3pp, BIS danger line at 9pp |
| `crisis_prob` | ~3.5pp per SD of excess credit growth, capped | Annual probability, not a vibe |
| `misery` | inflation + unemployment | The number voters feel |
| `regime` | quadrant from (inflation, output_gap) | Which of four boxes you're in |
| `fiscal_space` | function of debt, yield, growth | How much room you have to spend |

The draft version of this document had a `fragility` score built from a
weighted blend of leverage, cheap-money duration, debt and overheating. That
was invented. The credit-to-GDP gap replaces it — it's the BIS early-warning
indicator, it has a published hit rate (~66% of crises at the 9pp threshold),
and it has the property that makes it worth teaching: **it is the only gauge
that warns you.** Growth, inflation, unemployment and public mood all look
healthy through the entire build-up.

---

## H. Starting scenarios

Each is just a different set of the values above.

| Scenario | Setup | The trap |
|---|---|---|
| **Calm** | everything at healthy defaults | Boredom → you stimulate for no reason |
| **Overheating** | gap +3%, inflation 6%, unemployment 3.5% | Hiking hurts before it helps |
| **Recession** | gap −4%, unemployment 9%, inflation 0.5%, rate 0.5% | Rates already near zero — the dial doesn't work |
| **Stagflation** | inflation 9%, unemployment 8%, potential just fell 3% | No dial fixes both |
| **Debt trap** | debt 140%, yield 7%, growth 1% | Interest costs grow faster than the economy |
| **Bubble** | credit_gap already at 6pp, asset_prices 160, everything else fine | The gauges all look great |

The Bubble scenario is the best teaching tool in the set. Every visible number
is healthy — only the credit gap is warning you.

**Corrected after implementation.** This paragraph used to end "and you still
die in four years". The research does not support that certainty: Schularick &
Taylor put crisis risk at ~3.5pp per standard deviation of excess credit, so
even a large gap means roughly 5–14% *annual* risk. Over an eight-year term
that is a serious compounding gamble, not a death sentence. Coding it as
certain death would mean tuning to a dramatic target rather than reporting
what the evidence says — which is the specific failure this project keeps
warning itself about. The scenario teaches that you are running a risk you
cannot see on any other gauge. That is enough.

**Note on starting values:** the numbers in the tables above are the readable
explanation of what each variable means. **`START` in `parameters.py` is the
authoritative set**, and after research pass 2 it is no longer a collection of
plausible-looking readings — it is a *solved* steady state where every
accounting identity closes exactly:

| | Value | Why that value |
|---|---|---|
| potential growth | 1.5%/yr | OECD growth accounting; was 2.0 |
| natural unemployment | 5.0% | OECD NAIRU; was 4.5 |
| policy rate | 2.5% | = r\* 0.5 + target 2.0 |
| 10y yield | 3.25% | = policy 2.5 + term premium 0.75; was 3.5 |
| govt debt | 100% GDP | IMF Fiscal Monitor; was 75 |
| deficit | 3.5% GDP | = debt × nominal growth. The debt-stabilising level |
| tax rate | 24.75% GDP | **Solved, not chosen** — the only value holding debt at 100% |
| investment share | 22.5% GDP | = (δ + g) × K/Y. The textbook δK gives 18%, which is the zero-growth case and shrinks K/Y every tick |

That tax rate is the clearest example of why this matters. It looks like an
odd number; it is the only one that makes the government budget consistent
with the debt level, the yield and nominal growth simultaneously. The old
value of 25.0% drifted, and that drift was one half of why the prototype could
not sit still.

**One identity does not yet close, and it is flagged rather than papered
over.** Steady-state wage growth should equal target inflation plus
productivity growth (2.0 + 1.5 = 3.5%), but `START` says 3.0%. Resolving it
requires the production function's decomposition — how much of potential
growth is labour-augmenting versus capital deepening — which is question A4.
See the `[OPEN]` marker in `parameters.py` section 2.

**Six state variables were added by pass 2:**

| Variable | Kind | Start | Why it exists |
|---|---|---|---|
| `foreign_share` | RATE | 0.30 | Fraction of govt debt held abroad. **The Japan-vs-periphery switch** — yields go nonlinear on ownership and currency, not on the debt level |
| `supply_shock` | FLOW | 0.0 | pp of cost-push inflation. Required by the 1970s and 2021 scenarios; without it a supply shock has to be faked by poking expectations |
| `velocity` | INDEX | 1.0 | Closes `M·V = P·Y`. The reason printing money doesn't mechanically cause inflation |
| `asset_prices` | INDEX | 100.0 | Drives the wealth effect *and* the collateral loop |
| `leverage` | RATE | 1.0 | `private_debt / asset_prices`. Gates the fire-sale term |
| `hiring_momentum` | STATE | 0.0 | Confirmed by pass 2 as the right representation of slow recoveries |

The prototype's `CONFIG` dict disagreed with `START` on at least four values.
That was a bug, not a variant, and `CONFIG` is deleted in the rebuild. There is
one authoritative set of starting values and it lives in `parameters.py`.

---

## I. How these appear on screen

Not every variable is a gauge. Putting all forty on screen is the same as
putting none there. Four tiers:

| Tier | Variables | Treatment |
|---|---|---|
| **Headline** | growth, inflation, unemployment, govt debt, approval | Always visible. Big number, bar, live sparkline, plain-English verdict. |
| **The two that matter and nobody watches** | `credit_gap`, `cb_credibility` | Always visible, visually separated from the headline row. These are the gauges that see trouble coming, and the whole design rests on the player learning to read them. |
| **Dials** | `policy_rate`, `tax_rate`, `govt_spending`, `money_printed` | Draggable sliders with the current value, the bound, and a marker showing neutral/base. Dragging schedules into the lag pipeline; it does not apply instantly. |
| **Everything else** | the remaining ~30 | Not on the main screen. Reachable through the `why` panel, which is where a variable earns its place: it appears as a *term* in the equation that produced a headline number. |

That last row is the important one. `expected_inflation`, `velocity`,
`hiring_momentum` and `credit_spread` are not decoration to be crammed into a
sidebar — they are the explanation of why the headline moved, and they should
be discovered by clicking the headline, not scanned in a wall of digits.

**Stocks and flows must look different.** A stock has a level and a history —
draw it as a filled area. A flow is a rate this period — draw it as a bar or a
line. A rate/index is a level with no mass — plain line. Mixing these up on
screen teaches the same confusion the intro of this document warns about.

**Anything with weak or contested confidence renders its range.** A number the
literature genuinely disagrees about should show as a band, not a point, with
the citation on hover. `approval` and both confidence indices have *zero*
empirical basis (see `UNKNOWNS` in `parameters.py`) and the UI should say so —
they are a game mechanic wearing an economics costume, and pretending otherwise
is the one dishonest thing this project could do.
