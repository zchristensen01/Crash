# 02 — The Causal Map

This is the actual content of the game. Everything else is presentation, and
this document survives any change of interface unaltered — it describes
economics, not screens. If a rewrite of the UI ever forces an edit here,
something has gone wrong.

Two places where the interactive build does change what's *possible* to teach,
flagged inline below: the lag pipeline (Part 1) becomes a visible animated
queue rather than a mysterious delay, and the four-regime box (Part 4) becomes
a live moving dot rather than a label.

Notation: `→` causes. `↑` increases. `↓` decreases. `[3m]` = lands 3 months
later. `⟲` = feedback loop that amplifies itself.

---

## PART 1 — The four dials and their dominoes

### DIAL 1: Interest rate ↓ (a cut)

**Immediate (0–1 month)**
```
policy_rate ↓
  → market_rate ↓
  → bond_yield ↓ → govt interest_cost ↓
  → savings pay less → money moves into stocks/housing → asset_prices ↑
  → currency ↓ → imports cost more → inflation ↑ (small, ~0.2pp)
```

**Short (2–9 months)**
```
market_rate ↓
  → business investment ↑            [4m lag, ≈1.2% of GDP per 1pp cut]
  → household borrowing ↑            [3m lag]
  → asset_prices ↑ → people feel richer → consumption ↑   (wealth effect)
  → currency ↓ → exports ↑           [6m lag]
```

**Medium (9–24 months)**
```
demand ↑
  → IF output_gap < 0:  output ↑, unemployment ↓, inflation barely moves   ← the good case
  → IF output_gap ≥ 0:  output flat, prices ↑                              ← the bad case
  → unemployment ↓ → wage_growth ↑ → consumption ↑ ⟲
  → inflation ↑ → expected_inflation ↑ → wage demands ↑ → inflation ↑ ⟲   ← THE SPIRAL
```

**Correction from pass 2: the spiral is rare, and must be gated.** This
document previously treated the wage-price spiral as the model's default
inflation engine. Alvarez et al. (IMF WP22/221, 2022; *Economica* 2024)
identify 79 episodes since the 1960s of accelerating prices *and* rising
nominal wages — and find only a small minority kept accelerating after eight
quarters. Wages and prices usually restabilise on their own.

So the spiral is a **switch-gated regime**, not the baseline: it can
self-sustain only when credibility is below ~0.5, expectations have gone
backward-looking, *and* both wages and prices have accelerated in at least
three of the last four quarters. Otherwise it fizzles. This makes the model
*more* dramatic, not less — the spiral becomes a cliff you can fall off rather
than a slope you're always on.

**Long (2–5 years)**
```
sustained cheap money
  → capital_stock ↑ → potential_output ↑          ← genuinely good
  → private_debt ↑ → leverage ↑ → fragility ↑     ← genuinely bad
  → asset_prices ↑ → borrow against assets → buy more assets ⟲   ← the bubble loop
```

**The single most important conditional in the whole model:** a rate cut when
there's slack creates jobs. The identical cut at full employment creates only
inflation. Same action, opposite result. Everything hinges on `output_gap`.

> **Correction from the audit pass (docs/07 F5, L2).** The `IF output_gap < 0 /
> IF output_gap ≥ 0` above is the right lesson stated as the wrong mechanism,
> and stating it as a binary is what stopped anyone noticing the model had it
> backwards. What the model does — and what the evidence supports — is a
> CONTINUOUS SHIFT IN THE SPLIT. The same cut buys 91% output and 9% prices at a
> −3% gap, and 71/29 at potential. There is no switch at zero.
>
> There is exactly one hard switch, and it is at `MAX_CAPACITY_OVERHEAT` (+4%),
> not at 0: demand above what can physically be produced cannot become output at
> all, so it goes entirely to prices. That cliff is real and it is where "output
> flat, prices ↑" actually lives.
>
> Read the two together and the lesson survives intact: stimulus into slack is
> mostly jobs, stimulus into a hot economy is mostly prices, and stimulus into
> an economy already at the ceiling is *only* prices. It is a dial, not a
> switch, right up until the ceiling.

---

### The inflation slope is not one number

The research pass changed this materially and it's worth stating on its own,
because the draft version of this document got it wrong.

Demand pressure converts to inflation through a coefficient (κ) in the
Phillips curve. That coefficient is **not a constant** — it depends on whether
people still believe the central bank will hit its target:

| Condition | κ | What it feels like |
|---|---|---|
| Expectations anchored | **0.05** | A 3% output gap adds ~0.15pp of inflation. Almost nothing. |
| Expectations unanchored | **0.20** | The same gap adds 0.6pp, and expectations then feed on it. |

Sources: Cleveland Fed time-varying estimates and Fed FEDS 2024 for the
anchored slope (the reduced-form slope fell from ~0.12 in the 1970s to ~0.04
recently); Hazell et al. and IMF WP 2023/100 for the unanchored case.

Three consequences for the model:

1. **Overheating alone barely causes inflation any more.** You can run the
   economy hot for years with a credible central bank and see very little.
   That is not a modelling error — it's what actually happened from the 1990s
   through 2019, and it's why "low unemployment causes inflation" stopped
   being useful advice.
2. **Real inflation surges come from supply shocks and unanchoring,** not from
   the gap term. Code them as the main sources.
3. **Credibility must be a state variable.** It's the switch between the two
   worlds. It falls fast when inflation misses badly and rebuilds slowly —
   which is the whole reason central bankers are so obsessive about it, and
   why they hike into visible pain rather than waiting for proof.

This is also what makes the model dramatic rather than dull: it can sit placid
for years and then spiral once credibility breaks.

---

### DIAL 2: Interest rate ↑ (a hike)

Not a mirror image. The asymmetries are real and worth encoding:

```
policy_rate ↑
  → investment ↓                     [4m]  — works reliably
  → asset_prices ↓ → wealth effect reverses → consumption ↓   [2m]
  → anyone who borrowed cheap is now stressed → defaults ↑    [6m]
       → banks take losses → credit_spread ↑ → lending ↓ even more ⟲
  → hiring_momentum ↓ → firing ↑     [6–9m]  — SLOWER than hiring was
  → inflation ↓                      [12–18m] — the slowest link of all
  → bond_yield ↑ → govt interest_cost ↑ → deficit ↑ → debt ↑
```

**Asymmetry 1:** cutting is pushing a string. If people are scared, cheap money
doesn't make them borrow. Hiking is pulling a rope — it always works, sometimes
too well.

*Pass 2 turned this from folklore into a coefficient.* Tenreyro & Thwaites
(AEJ: Macro 2016) find monetary policy is measurably less powerful in
recessions, especially for durables and business investment; Barnichon &
Matthes find contractionary shocks raise unemployment more than expansionary
shocks lower it. Code cuts at **1/1.5 of the effect of hikes**, and weaken cuts
further when the economy is already in recession.

**Asymmetry 2:** unemployment rises faster than it falls. Firms fire in weeks,
hire over quarters. So a hike that overshoots takes years to undo.

**Asymmetry 3:** inflation is the *last* thing to respond. You will be 12–18
months into a hiking cycle, watching unemployment climb and inflation still
elevated, being told you've failed. This is why central bankers talk about
credibility so much — it's the only thing that shortens the lag.

---

### DIAL 3: Tax rate

**Tax ↓**
```
disposable income ↑
  → consumption ↑                    [3m, MPC 0.22 at 4% unemployment,
                                          0.40 at 8% — Sokolova 2023 meta]
  → demand ↑ → (slack? output ↑ : prices ↑)
  → tax_revenue ↓ → deficit ↑ → debt ↑ [1m]
      → bond_yield ↑ (~3bp per 1pp of debt/GDP)
      → market_rate ↑ → investment ↓  (crowding out, ~33 cents per $1 of
                                       deficit — CBO. NEAR ZERO under slack
                                       or at the ZLB, and commonly overstated
                                       in public argument)
      → interest_cost ↑ → less room for anything else
```

**Tax ↑**
```
disposable income ↓ → consumption ↓ → output ↓ → unemployment ↑
tax_revenue ↑ → deficit ↓ → debt ↓ → bond_yield ↓
  BUT: raising taxes into a recession collects markedly LESS than you
       legislated, because you are taxing a smaller economy. +3pp of tax
       yields +2.30pp of revenue at a zero gap and +1.96pp at a -6% gap —
       23% and 35% of the rise lost respectively, rising to 46% at -15%.
       ← the austerity paradox, at the strength this model actually has.
```

> **CORRECTED AGAINST MEASUREMENT (docs/12 L2).** This block used to say
> "revenue may not rise at all", and both this document and the tax dial's own
> help text promised the player a sign reversal. **The model does not produce
> one at any playable gap, and neither does the literature it is built from.**
>
> The arithmetic is closed-form. With `revenue = τ + AUTOSTAB_TAX_ELASTICITY ·
> (τ/100) · gap`, revenue falls only if `+1pp` of tax costs more than **3.11%**
> of output at a zero gap, or **2.87%** at −6%. The model delivers **0.99%**.
> Reaching the sign flip needs a tax multiplier at or above the top of
> Romer–Romer (2.0–3.0), which is already the largest in the literature and is
> already recorded as an open disagreement by `TAX_SHOCK_TO_GDP`'s `todo` test.
> Only in the far corner of the joint parameter space — elasticity at its high
> end of 1.8 *and* a −12% gap — does the requirement (1.76) fall inside
> Romer–Romer at all.
>
> So the two findings are one finding, and nobody had connected them: **the
> austerity paradox is missing because the tax multiplier is small.** That is a
> statement about the model's demand block, not a coefficient to bend.
> `test/multipliers.test.js` asserts the leak, which is real, and prints the
> multiplier the sign reversal would require.
>
> `docs/08` §2 records this as fixed when market income stopped being a
> constant. It was not: that change created the gradient (23% → 46% across the
> gap range) and could not create the sign flip. The test `docs/07` L4 proposed
> to catch exactly this — `revenueChange(-6,+3) < revenueChange(0,+3)*0.5` —
> was never written; it measures 1.96 against a threshold of 1.15 and fails.

**Timing rule that falls out of this:** cut taxes in a downturn, raise them in
a boom. Politically this is exactly backwards from what's easy, which is why
almost nobody does it.

---

### DIAL 4: Government spending

```
govt_spending ↑
  → demand ↑ IMMEDIATELY [0–1m]   ← the fastest lever you have. This is why
                                    fiscal policy is the crisis tool.
  → income ↑ → consumption ↑ [3m]  (multiplier, same slack-dependence as tax)
  → employment ↑
  → deficit ↑ → debt ↑ → bond_yield ↑ → crowding out
  → IF spending is investment (infrastructure, education):
        potential_output ↑ [3–10 years]   ← pays for itself, eventually
     IF spending is consumption (transfers, salaries):
        no capacity effect                ← still useful in a slump, just doesn't compound
```

Worth splitting the spending dial in two eventually: `govt_investment` vs
`govt_consumption`. Only one of them raises the ceiling.

**Contested — the draft version of this document stated it as settled.** The
claim that multipliers are much larger in recessions (~1.5) than expansions
(~0.5) comes from Auerbach & Gorodnichenko and the IMF, and it's the standard
view. But Ramey & Zubairy (2018) find multipliers below 1.0 *regardless of
slack*, directly disputing the state-dependence. Code the state-dependent
version, but show the player the range rather than one confident number —
that disagreement is itself the honest lesson.

---

### DIAL 5: Printing money

```
money_printed ↑
  → govt spends without taxing or borrowing → debt DOESN'T rise  ← looks free
  → money_supply ↑
  → IF output_gap < −2% (lots of slack):
        mostly nothing. Money sits idle. Inflation barely moves.
        ← this is why QE after 2008 didn't cause hyperinflation, despite
          everyone predicting it would
  → IF output_gap > 0 (no slack):
        more money, same goods → price_level ↑ hard
  → expected_inflation ↑ → velocity ↑ → people spend faster to beat price rises
        → effectively more money still → inflation ↑ ⟲   ← the hyperinflation loop
  → currency ↓ → imports cost more → inflation ↑ ⟲
  → cb_credibility ↓ → every future policy costs more to achieve
```

**The honest answer to "why can't we just print money":** you can, and
sometimes you should. The constraint isn't the money — it's real goods and
labour. Printing when factories sit idle puts them to work. Printing when
everyone's already employed just raises prices. The inflation is a tax; it
falls hardest on savers and people on fixed incomes, and nobody voted for it.

> **Correction from the audit pass (docs/07 L3).** "Puts them to work" only
> means anything if the printed money BUYS something, and for the model's whole
> life it did not: `money_printed` reduced the deficit and reached demand
> nowhere else. Since reduced deficits crowd investment IN, and crowding out is
> switched off by slack, the dial did nothing with idle factories and worked at
> full employment — the exact inverse of this paragraph.
>
> Printing is now monetised SPENDING. It appears twice in the budget identity
> and cancels, which is what "spends without taxing or borrowing" means: you get
> the goods, the debt does not rise. The `credibility × slack` gate still
> governs the direct pass-through to prices on top of that, and velocity
> multiplies it once expected inflation clears the flight threshold — the ⟲ in
> the chain above, which was computed and ignored.

---

## PART 2 — How the economy corrects itself without you

This is the half people miss. Encode these or the game will feel like the
economy only ever does what you tell it.

**Self-correction 1 — the price brake**
```
demand > capacity → prices ↑ → real incomes ↓ → demand ↓
```
Automatic. Slow. Painful. Works.

**Self-correction 2 — the investment response**
```
demand high → profits ↑ → firms build capacity → potential_output ↑ → prices ease
```
Takes years, but it's how booms turn into genuine growth instead of pure inflation.

**Self-correction 3 — automatic stabilisers**
```
recession → incomes fall → tax_revenue falls automatically
         → more people on benefits → transfers rise automatically
         → deficit widens with no decision from you
         → that deficit cushions the fall
```
The OECD (Maravalle & Rawdanowicz 2020) puts absorption at **~60% of the shock
on impact** — around 80% in Germany and the Netherlands, under 40% in Spain,
Slovakia, Japan and Greece. Micro estimates are lower: Dolls, Fuest & Peichl
find 38% (EU) and 32% (US) for an income shock, 47% and 34% for an
unemployment shock. Channels in order of size: progressive income tax
(largest), unemployment benefits (most timely and targeted), other transfers.

Code it as `disposable_income −= 0.6 × market_income_shock`. Make it visible in
the `why` panel — most people have no idea it exists.

**Self-correction 4 — the wage floor (weak)**
> **Pass-2 correction, read this before coding the block below.** The
> instruction that follows — a hard 0% floor *and* ~20% of textbook strength —
> counts one friction twice. Model it **once**, as a share of workers (0.14)
> whose nominal wage cannot fall in a given period, with the rest adjusting
> freely. `CLASSICAL_WAGE_CORRECTION_STRENGTH` has been deleted from
> `parameters.py`; do not reintroduce it.

```
unemployment high → wages should fall → hiring becomes cheap → employment ↑
```
Classical theory says this clears the market. In practice **12–16% of workers
see zero nominal wage change in a normal year** (US ECI and CPS; FRBSF 2013;
Fed FEDS 2016), rising in slumps — people don't accept pay cuts and contracts
don't reset. So this mechanism barely works, which is why recessions linger
instead of self-curing. Model it at ~20% of textbook strength and put a hard
floor at 0% nominal wage change. That weakness *is* the argument for
intervention.

**Self-correction 5 — the debt brake**
```
debt ↑ → bond_yield ↑ → interest_cost ↑ → less fiscal room → forced consolidation
```

---

## PART 3 — The crash chain

Crashes aren't random. They're a loop with no natural brake, and the gauges
look great right up until they don't.

**The measurable version.** Don't invent a fragility score — there's a real
indicator with a real hit rate. Track private credit as a share of GDP, minus
its own slow trend:

```
credit_gap = (private_credit / GDP) − trend
```

Use a one-sided HP filter with λ = 400,000 on quarterly data (Borio & Lowe
2002). An exponential moving average with a very long half-life approximates
it well enough for a game.

| Gap above trend | Meaning |
|---|---|
| < 3pp | Normal |
| 3pp | Lower warning threshold — catches ~76% of crises over 3 years, with more false alarms |
| **9pp** | **BIS optimal threshold — captures ~66% of crises.** Basel III maxes the countercyclical buffer here |
| > 15pp | Historically extreme (Ireland, Spain pre-2008) |

Crisis probability rises roughly **3.5pp per standard deviation of excess
credit growth** (Schularick & Taylor 2012; Greenwood-Hanson-Shleifer put it at
2.6–5.3pp). GHS also found a combined credit *and* asset-price boom preceded
64% of crises — credit-financed bubbles are far more dangerous than
equity-only ones. Note that extrapolating that 3.5pp figure far beyond ~2
standard deviations is doing more than the source supports; cap it.

**The mechanism:**

```
cheap money, sustained
  → borrowing ↑ → asset_prices ↑
  → assets worth more → borrow MORE against them → buy more assets ⟲
  → credit_gap ↑ ↑ (no self-correction in this loop — that's the whole problem)
  → and growth, inflation, jobs and public mood all look FINE the entire time

then ANY shock lands:
  → asset_prices ↓
  → borrowers underwater → defaults ↑
  → banks take losses → banks stop lending
  → credit_spread ↑ hard → investment collapses → output ↓
  → unemployment ↑ → more defaults → more bank losses ⟲   ← the doom loop
```

**One correction to the draft version of this document:** don't code a large
output amplification here. Estimated models (Christensen & Dib 2008) find the
financial accelerator significant for **investment and demand** but
"relatively minor" for **total output**. The genuinely dangerous, genuinely
unbalanced loop is the fire-sale/deleveraging spiral (Shleifer & Vishny 2011):
forced selling at dislocated prices drives prices down, which forces more
selling. That's the crisis engine, not the accelerator.

Financial-crisis recessions are deeper and recoveries slower than normal ones
(Jordà, Schularick & Taylor, "When Credit Bites Back").

**Pass 2 quantified the aftermath, and it changes what losing means.** Peak-to-
trough output falls ~9% (Reinhart & Rogoff), the climb back takes ~5 years, and
— the part that matters — Cerra & Saxena (AER 2008) find **no significant
rebound**: roughly **10% of output is lost permanently** for a banking crisis
(~5% balance-of-payments, ~15% twin). Output doesn't cycle back; the trend line
moves down and stays there.

Two design consequences. A crash should not be a game-over screen — it should
be a *playable, permanently harder* state, which is what makes the credit gap
worth watching in the first place. And prompt recapitalisation roughly halves
the scar, which gives the post-crash phase a real decision in it rather than
just waiting.

**Why the Fed does what it does, in one place:**

- It cuts to zero to break the doom loop. Speed matters more than precision.
- It acts as lender of last resort — lends freely to solvent banks so a panic
  doesn't turn a liquidity problem into an insolvency problem.
- If rates are already at zero, that dial is dead. That's the zero lower
  bound, and it's the entire reason QE was invented.
- It hikes *into* visible pain during inflation because waiting for proof
  means waiting 18–24 months, by which point expectations have unanchored, κ
  has quadrupled, and the cure costs far more.

---

## PART 4 — The four regimes

Show this on screen at all times. It tells the player which dial is even
relevant.

In the interactive build this is not a label reading "OVERHEATING" — it is a
scatter plot with inflation on one axis and the output gap on the other, a dot
for where you are now, and a fading trail of the last two years. The trail is
the point: it shows you the *direction you are travelling*, which is the thing
that decides whether a hike is late or early. A static label can only tell you
where you are, and where you are is the least useful of the two.

```
                    INFLATION LOW          INFLATION HIGH
                 ┌──────────────────────┬──────────────────────┐
  UNEMPLOYMENT   │   GOLDILOCKS         │   OVERHEATING        │
  LOW            │   Do nothing.        │   Hike. Tighten      │
                 │   Seriously.         │   fiscal. Take the   │
                 │                      │   pain early.        │
                 ├──────────────────────┼──────────────────────┤
  UNEMPLOYMENT   │   RECESSION          │   STAGFLATION        │
  HIGH           │   Cut rates. Spend.  │   NO GOOD ANSWER.    │
                 │   Both dials point   │   Dials point in     │
                 │   the same way.      │   OPPOSITE           │
                 │                      │   directions.        │
                 └──────────────────────┴──────────────────────┘
```

Three of these boxes have an answer. One doesn't. Stagflation is where every
tool you have makes one problem worse while fixing the other — you're choosing
which group of people to hurt. Usually caused by a supply shock (oil, war,
pandemic) that cuts capacity and raises prices at the same time.

Make the game put the player there at least once. It's the most honest thing
in the whole design.

---

## PART 5 — Quick sign matrix

Fast reference for coding. `+` = rises, `−` = falls, `~` = depends on slack.
Bracketed number is **months to PEAK effect** — the draft version of this table
used "months until visible," which ran roughly half as long and understated
every lag. These now match `parameters.py`.

| Action | Output | Unemp | Inflation | Debt | Assets | Credit gap |
|---|---|---|---|---|---|---|
| Rate ↓ | +[12] | −[18] | +[24] | −[1] | +[1] | +[36] |
| Rate ↑ | −[12] | +[18] | −[24] | +[1] | −[1] | −[36] |
| Tax ↓ | ~[3] | −[6] | ~[9] | +[1] | + | + |
| Tax ↑ | −[3] | +[6] | −[9] | −[1] | − | − |
| Spend ↑ | +[3] | −[6] | ~[9] | +[1] | + | + |
| Spend ↓ | −[3] | +[6] | −[9] | −[1] | − | − |
| Print ↑ | ~[3] | ~[6] | +[2] | −[0] | + | + |

Two things this table can't show that matter as much as the signs:

- **The lags are asymmetric.** Firms fire fast and hire slowly (roughly 0.6
  versus 0.25 in the model). Overshooting a hike takes years to undo.
- **Rate → inflation at 24 months is the slowest link in the entire model.**
  You will be a year and a half into a hiking cycle, watching unemployment
  climb with inflation still elevated, being told you've failed. That is the
  normal experience of doing this correctly.

The `~` cells are where the real learning is. Same lever, opposite outcome,
depending only on whether there was slack.

---

## THE MOST IMPORTANT SINGLE FACT ABOUT THIS MODEL'S DYNAMICS

**The Taylor principle is about the rate the economy FEELS, not the rate on the
dial, and until the fourth audit those were different numbers.**

The rule announces a response to inflation of `1 + TAYLOR_INFLATION = 1.5`,
comfortably above the unity the principle requires. What the economy felt was
something else entirely. Measured over months 3–12 of `stagflation` under the
rule, before the fourth audit's A1 split:

```
inflation rose        9.92pp
the transmitted rate rose  3.67pp
                      -----------
effective response         0.37     <- far below unity
```

**The dial satisfied the Taylor principle and transmission violated it.** That
is the whole mechanism behind the bifurcation `docs/12` found and attributed to
a missing expectations channel. A rule can be above unity on paper and below it
in effect, and only the effect stabilises anything.

The cause was structural, not a coefficient: `policy_rate_demand` — the rate
borrowers pay — was scheduled on `rate_to_investment`, the published impulse
response *of investment* to a monetary shock, mean lag 14.74 months. A price was
being delayed by a quantity's response time, and `updateInvestment` then applied
the rate elasticity to that already-lagged rate, using the same reduced form
twice.

Split into a fast pass-through (`RATE_PASSTHROUGH_TO_BORROWERS`, ~1 quarter) and
a slow spending decision (`INVESTMENT_ADJUSTMENT_SPEED`), the same measurement
now gives:

```
effective response         1.94     <- above unity
real rate felt at m12    -1.81%     (was -14.50%)
```

`test/transmission.test.js` re-measures this on every run, so it cannot go
quiet again. **It did not stop the number going stale in this document.** 2.3
recorded 1.80 and this section recorded 1.83 — two documents citing the same
measurement with different numbers — and then 3.1's asset-units fix moved the
real value to 1.96 while Phase 4's "re-measure everything" gate passed over
both. Corrected in Phase 5 verification. A test that prints a number is not a
test that the number written elsewhere is still right.

**Raising `TAYLOR_INFLATION` was never the answer, but not for the reason
originally given here.** The claim used to be that the coefficient is powerless
— measured at 177.62% at month 48 against 242.34% as built. Both of those
numbers were taken while transmission was still broken, when the economy
hyperinflated either way. Re-measured after Phases 2–4, raising it to 1.0 (the
top of its sourced range) takes `stagflation` under the rule from **7.12% to
3.24% at month 48** and **3.15% to 1.42% at month 96**. The coefficient has
plenty of traction now. The reason to leave it alone is that the defect *was*
transmission, fixing transmission fixed it, and moving a sourced coefficient to
cover a structural error is the reduced-form-as-structural-input error.

---

## THE BUBBLE LOOP, AND WHAT ITS GAIN ACTUALLY IS

Part 1's DIAL 1 chain contains the loop this document draws as
`asset_prices ↑ → borrow against assets → buy more assets ⟲`. It is real and it
still runs. Two things about it were wrong in the code and are worth stating
here, because the map implied neither.

**The rate → asset-price link is a LEVEL response, not a growth rate.**
`ASSET_PRICE_RATE_SEMIELAST_*` blend to 4.6% of asset price per pp of real
rate. That was applied as a persistent monthly growth rate, so the equilibrium
sat wherever growth and mean reversion balanced — an overshoot of
`1 / (12 × ASSET_PRICE_MEANREVERSION)`, **a factor that does not contain the
semi-elasticity at all**. The model's asset response to interest rates was
being set by the mean-reversion parameter rather than by the elasticity that
governs it: 4.59× too large. The real rate now sets a *target* deviation from
fundamental which prices approach at `ASSET_PRICE_MEANREVERSION`, so the
long-run response equals the sourced number by construction.

**The loop has a balancing counterpart, and `credit.js` used to deny it.**
It is the debt-service burden: more credit raises debt service, which raises
defaults (`DEFAULT_RATE_DSR`), which eats bank capital, which widens the
spread, which raises the real market rate and suppresses credit growth. Add it
to Part 2's self-corrections — it is the fifth one, and it was invisible
because it could not bind while the asset leg was overshooting.

Measured after both fixes, amplification of a credit shock over 96 months:
**0.0076 at the steady state and 0.0071 two percentage points from it**, where
before it was 0.0130 and **315.52**. The loop is stable, and — this is the part
worth keeping — *a gain measured only at the steady state would have said so
in both cases*.

---

## Corrections from the audit pass

`docs/07` measured every chain above against the code. Six of them ran
backwards. What changed in the model is in `docs/08`; what changed in THIS
DOCUMENT is here, because a map that disagrees with the territory is worse than
no map.

1. **The slack conditional is a split, not a switch** (DIAL 1, and the `~` cells
   in the matrix above). Corrected inline. The only true switch is the capacity
   ceiling at +4%.
2. **Printing is spending** (DIAL 5). Corrected inline.
3. **Tax → assets does not exist, in either direction.** The matrix gives
   `Tax ↓ → assets +` and `Tax ↑ → assets −`. Measured, both directions move
   the index by less than 0.06 points on a base of 100 — numerical residue, not
   a channel. Fiscal policy reaches asset prices only through inflation and the
   real rate, and weakly. Treat the two cells as unmodelled rather than wrong.
4. **"Months to PEAK effect" now means something again.** With the lag pipeline
   discarded, every impulse response was monotone through 48 months and no
   bracketed number in the matrix was reproducible. They are back, because the
   transmitted drivers carry the kernels. Rate → assets is a separate, faster
   chain (1 month) from rate → investment (9 months), as the doc says. Rate →
   household borrowing is NOT separate: credit demand rides the same
   transmitted rate as investment. An honest simplification, recorded here
   rather than implied.
5. **Asymmetry 2 is a speed, not a size.** "Unemployment rises faster than it
   falls" was inverted 3:1 by a one-sided Okun switch. Okun's β is now
   symmetric in the size of the gap and the asymmetry lives in the hiring and
   firing speeds, which is where the evidence is.
6. **Self-correction 1, the price brake, was never built** — and building it is
   what makes a supply shock stagflationary rather than merely inflationary.
   Self-correction 3, the automatic stabilisers, absorbed 15% of a shock against
   the 60% stated here; they now absorb ~43%, inside the OECD/micro range, and
   fire with the documented 3-month and 1-month lags.

Still deferred, and now flagged as such in `parameters.py` rather than looking
like oversights: the `govt_investment` / `govt_consumption` split (DIAL 4), the
currency channel and everything else in the open economy (decision A5), and
hysteresis in ordinary non-crisis recessions.
