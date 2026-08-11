<!-- cause-effect-fingerprint: 5133ba7bc882334a (1464 numbers) -->
# 11 — Cause and Effect

> **LIVING DOCUMENT, and the only one whose numbers are generated.** Every
> table here comes from `node tools/cause-effect.mjs`, which runs the model and
> prints them. Re-run it after any change to a rule and paste the output back
> in. A document that claims to say what a model does, written by reading the
> model, is how `docs/07` ended up finding fourteen defects.
>
> **REGENERATED AFTER THE FOURTH AUDIT, AND NOW CHECKED.** This document went
> TWO FULL PASSES STALE — every number in it predated the transmission split,
> the derived rate ceiling, the closed bifurcation and the asset-price units
> fix — and nothing detected that, because nothing could. It carries a
> FINGERPRINT of every number the tool measures, `npm test` verifies it, and
> the failure names the tool to re-run. The fingerprint does not claim the
> prose is right; it claims the document was written against a model that
> produced exactly these numbers.
>
> **The largest movers in the fourth audit.** Asset prices respond about a
> third as much to a rate cut (+1.23 index points at a year against +4.12),
> because the semi-elasticity was a LEVEL response being applied as a
> persistent growth rate and overshot its own sourced value by 4.6x. The rate
> the economy feels now arrives in a quarter rather than over a year, so
> investment moves earlier and by less at any given month. Output at a year is
> +0.30 against +0.43.
>
> **From `docs/12`, still true:** the crash is no longer 2.6x too deep (§6), and
> **debt no longer responds quickly to the policy rate** — the whole stock used
> to reprice every month, and §2's claim that "debt is the second fastest thing
> to respond to a rate cut" was an artefact of that defect rather than a
> result. `confidence_slump` no longer exists as a separate shock. `debt_trap`
> is a different scenario.

`02-causal-map.md` says what the chains are *meant* to be. This says what
actually happens, with numbers, when you touch something. It is the operator's
manual: pull this, and here is what moves, in what order, on what timescale, by
how much.

Two things to know before reading any table:

**The dial is not the stance.** Moving a dial changes the setting instantly and
schedules the *consequence* into a lag kernel. `policy_rate_demand` is what the
real economy has actually felt so far. This is the whole mechanic and the
pipeline panel exists to show it.

**Everything below is a PERMANENT move, held.** These are not impulses that
reverse. A permanent change in the stance has a permanent effect, so most
responses keep accumulating for years rather than peaking and returning.

---

## 1. How long each lever takes

Two different lags, and conflating them is how the audit brief ended up
measuring the capacity ceiling and calling it a lower bound.

**The kernel** — how much of a 1pp rate cut has reached the PRICE borrowers
pay:

| month | 1 | 3 | 6 | 9 | 12 | 18 | 24 | 36 | 48 |
|---|---|---|---|---|---|---|---|---|---|
| real economy (`policy_rate_demand`) | 0.05 | **0.50** | 0.93 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| markets (`policy_rate_markets`) | 0.50 | 0.94 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

> **THIS TABLE READ 0.01 / 0.05 / 0.48 / 1.00 UNTIL THE FOURTH AUDIT'S PHASE 5,
> AND THE SENTENCE UNDER IT SAID THE OPPOSITE OF WHAT IT NOW SAYS.** It was
> written before 2.1 and never regenerated: the rate itself used to ride
> `rate_to_investment`, the published impulse response *of investment*, mean
> lag 14.74 months. A price was being delayed by a quantity's response time.
> The rate now arrives on `rate_to_borrowing_cost` — half of it in a quarter —
> and **the slow half did not disappear, it moved to where the decision is**,
> as a partial adjustment on investment (`INVESTMENT_ADJUSTMENT_SPEED`). Read
> the two tables in that order: the price lands fast, the spending does not.

Markets reprice in a month and borrowers in a quarter. What still takes years
is the **response** — share of the eventual 48-month output move delivered by
month N:

| lever | 1 | 3 | 6 | 9 | 12 | 18 | 24 | 36 | 48 |
|---|---|---|---|---|---|---|---|---|---|
| `policy_rate` −1pp | 0.00 | 0.03 | 0.13 | 0.22 | 0.30 | 0.44 | 0.56 | 0.79 | 1.00 |
| `tax_rate` −1pp | 0.00 | 0.07 | 0.25 | 0.40 | 0.50 | 0.61 | 0.69 | 0.85 | 1.00 |
| `govt_spending` +1pp | **0.64** | 0.75 | 0.78 | 0.80 | 0.82 | 0.85 | 0.87 | 0.93 | 1.00 |
| `money_printed` 2pp | **0.45** | 0.53 | 0.58 | 0.63 | 0.68 | 0.77 | 0.85 | 0.97 | 1.00 |
| `qe` 10pp | 0.00 | 0.02 | 0.11 | 0.20 | 0.29 | 0.43 | 0.56 | 0.79 | 1.00 |

The two fiscal levers that *buy things* deliver most of their effect in the
first month. Everything that works through a price — the rate, the tax rate, QE
— delivers almost nothing in the first quarter, **and that is now a statement
about how slowly firms and households act on a price that has already changed,
not about how slowly the price changes.** That is the whole argument for fiscal
policy being the crisis tool, and it falls out of the model rather than being
asserted anywhere. It is also why you will be told you have failed long before
you have.

---

## 2. What each dial does

From a settled calm economy, no policy response, no shocks. Units: output,
investment, consumption, debt and the credit gap in percentage points of
potential output; inflation and unemployment in percentage points; assets as an
index (100 = start); approval in points.

### `policy_rate` −1.00pp — a cut

```
mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
--------------------------------------------------------------------------------------------
 1 |  +0.00 |  +0.00 |  -0.00 |  +0.00 |  +0.00 |  -0.00 |  +0.05 |  +0.00 |  +0.00 | +0.000
 3 |  +0.03 |  +0.01 |  -0.01 |  +0.03 |  +0.01 |  -0.01 |  +0.21 |  +0.01 |  +0.01 | +0.000
 6 |  +0.13 |  +0.03 |  -0.03 |  +0.09 |  +0.03 |  -0.04 |  +0.52 |  +0.06 |  +0.06 | +0.000
12 |  +0.31 |  +0.10 |  -0.10 |  +0.20 |  +0.08 |  -0.17 |  +1.23 |  +0.29 |  +0.31 | +0.000
24 |  +0.57 |  +0.22 |  -0.20 |  +0.30 |  +0.19 |  -0.75 |  +2.72 |  +1.00 |  +0.58 | +0.000
48 |  +1.03 |  +0.42 |  -0.32 |  +0.40 |  +0.40 |  -2.82 |  +5.42 |  +2.78 |  +0.58 | +0.000
```

**The chain, in the order it fires:**

1. `policy_rate` moves. Nothing else moves this month.
2. **[1 month]** `policy_rate_markets` lands → the real rate falls → asset
   prices start climbing. This is why assets are the fastest column in the
   table: +0.52 index points by month 6, +5.42 by month 48. THIS IS A THIRD OF
   WHAT IT USED TO BE (+1.95 and +18.01) — see the header.
3. **[slow — and this changed in `docs/12`]** the 10-year yield falls with the
   policy rate immediately, but **the rate the government actually PAYS does
   not**: only 1/`DEBT_AVERAGE_MATURITY_YEARS` of the stock refinances each
   year. Debt is −0.17 at a year and −2.82 at four. Before `docs/12` this read
   −1.14 and −7.45, and this document used to claim debt was "the second
   fastest thing to respond to a rate cut, and almost nobody expects that".
   Nobody expects it because it is not true: the whole stock was repricing
   every month.
4. **[the rate arrives in a quarter; the SPENDING takes longer]**
   `policy_rate_demand` lands on `rate_to_borrowing_cost` — 50% of the
   pass-through by month 3, 93% by month 6 — → `user_cost` falls → firms *want*
   to invest more. What they actually spend closes
   `INVESTMENT_ADJUSTMENT_SPEED` of the gap each month, because capital
   spending is planned, ordered and built. **The two together reproduce the
   published 9-month peak of investment's response rather than assuming it.**
   Before the fourth audit the RATE itself rode that 9-month kernel, which
   applied the same reduced form twice. **Damped by `monetaryEasingScale`:** a
   cut transmits at 1/1.5 of a hike, less again in a recession, and toward zero
   at the lower bound.
5. **[same tick]** higher output → higher household market income → higher
   consumption → higher output. This is the multiplier, and it is why the
   consumption column overtakes the investment column by month 48.
6. **[slow]** rising asset prices → wealth effect → more consumption; and
   cheaper credit → the credit impulse → the credit gap opens. **+2.78pp of
   credit gap after four years from a single 1pp cut.** Cheap money held for a
   term is how the bubble scenario happens to you by accident. The loop this
   runs through has a measured gain of 0.0078 at rest and 0.0075 two points
   from it; before the asset-price fix the second of those was 315.52.
7. **[slowest]** inflation. +0.10pp at a year, +0.42 at four. The anchored
   Phillips slope is 0.05, so demand barely moves prices — see the note in §6.

### `policy_rate` +1.00pp — a hike

```
mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
--------------------------------------------------------------------------------------------
 1 |  -0.00 |  -0.00 |  +0.00 |  -0.00 |  +0.00 |  +0.00 |  -0.05 |  -0.00 |  -0.00 | +0.000
 3 |  -0.05 |  -0.00 |  +0.01 |  -0.04 |  -0.01 |  +0.01 |  -0.20 |  -0.01 |  -0.01 | +0.000
 6 |  -0.18 |  -0.02 |  +0.06 |  -0.14 |  -0.03 |  +0.04 |  -0.46 |  -0.06 |  -0.10 | +0.000
12 |  -0.42 |  -0.04 |  +0.15 |  -0.30 |  -0.08 |  +0.18 |  -0.93 |  -0.30 |  -0.47 | +0.000
24 |  -0.72 |  -0.08 |  +0.25 |  -0.43 |  -0.18 |  +0.72 |  -1.73 |  -1.00 |  -0.92 | +0.000
48 |  -1.16 |  -0.13 |  +0.34 |  -0.54 |  -0.33 |  +2.50 |  -2.88 |  -2.62 |  -1.01 | +0.000
```

**Not a mirror image, and the asymmetries are the lesson:**

- **A hike costs more output than a cut buys.** −0.72 against +0.57 at two
  years. Pulling a rope, not pushing a string.
- **The cost lands before the benefit.** Unemployment is +0.15 at a year and
  approval −0.47, while inflation has fallen 0.04pp. At two years unemployment
  is +0.25, approval −0.92, inflation −0.08. *You will be a year and a half
  into a hiking cycle, watching unemployment climb with inflation barely
  moved, being told you have failed.* That is the normal experience of doing
  this correctly, and the table is what it looks like.
- **Debt rises when you hike, but SLOWLY.** +0.18pp at a year and +2.50pp over
  four, from the interest bill arriving as the stock refinances. Fighting
  inflation and paying down debt are not the same lever — and the bill for
  fighting inflation lands years after the decision, which is worse. These were
  +1.15 and +7.16 before `docs/12` gave the debt a maturity.

### `tax_rate` −1.00pp — a cut

```
mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
--------------------------------------------------------------------------------------------
 1 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  +0.01 |  +0.00 |  +0.00 |  +0.02 | +0.000
 3 |  +0.04 |  +0.01 |  -0.01 |  -0.00 |  +0.04 |  +0.05 |  +0.00 |  +0.00 |  +0.18 | +0.000
 6 |  +0.14 |  +0.04 |  -0.04 |  -0.01 |  +0.15 |  +0.20 |  +0.00 |  +0.00 |  +0.88 | +0.000
12 |  +0.28 |  +0.10 |  -0.10 |  -0.07 |  +0.33 |  +0.57 |  +0.01 |  +0.01 |  +2.69 | +0.000
24 |  +0.39 |  +0.18 |  -0.15 |  -0.19 |  +0.56 |  +1.24 |  +0.07 |  +0.06 |  +2.09 | +0.000
48 |  +0.56 |  +0.31 |  -0.23 |  -0.23 |  +0.80 |  +2.25 |  +0.32 |  +0.23 |  +0.49 | +0.000
```

1. **[peaks 3 months]** `tax_rate_effective` lands — withholding and settlement
   take a quarter to catch up with legislation.
2. Disposable income rises → consumption rises, slowly, because households
   respond to *permanent* income and `yd_permanent` closes only 5% of the gap
   a month.
3. **Investment FALLS.** The deficit widens → crowding out → −0.19 at two
   years, against +0.56 of consumption. A tax cut is a transfer from
   businesses to households before it is a stimulus.
4. **Approval spikes and then fades** — +2.69 at a year, +0.49 at four. Voters
   weight the recent economy heavily (`APPROVAL_HORIZON`), so a tax cut is
   worth most in the year you make it. That is a real lesson about democratic
   incentives, not an exploit.

### `govt_spending` +1.00pp

```
mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
--------------------------------------------------------------------------------------------
 1 |  +1.05 |  +0.16 |  -0.15 |  +0.00 |  +0.00 |  +0.05 |  +0.00 |  +0.00 |  +0.01 | +0.000
 3 |  +1.23 |  +0.30 |  -0.32 |  +0.03 |  +0.14 |  +0.11 |  +0.01 |  +0.02 |  +0.74 | +0.000
 6 |  +1.29 |  +0.41 |  -0.42 |  +0.05 |  +0.17 |  +0.12 |  +0.03 |  +0.05 |  +1.45 | +0.000
12 |  +1.36 |  +0.54 |  -0.47 |  +0.03 |  +0.24 |  +0.05 |  +0.15 |  +0.15 |  +2.18 | +0.000
24 |  +1.45 |  +0.67 |  -0.49 |  -0.01 |  +0.35 |  -0.27 |  +0.55 |  +0.42 |  +0.74 | +0.000
48 |  +1.67 |  +0.81 |  -0.53 |  +0.00 |  +0.50 |  -1.28 |  +1.54 |  +1.12 |  +0.32 | +0.000
```

**The fastest lever you have.** +1.05 of output in the first month, because
government purchases *are* demand — there is nothing to transmit. Everything
after that is the multiplier: income → consumption → income.

**Debt FALLS after two years.** Spending 1pp more leaves debt 1.28pp lower at
four years, because the extra output raises the tax take and inflation erodes
the stock faster than the borrowing adds to it. That is only true at this
starting debt level, this yield and this multiplier — but it is a real and
counterintuitive result, and it is the model's version of "you can grow out of
it".

### `money_printed` 2.00pp

```
mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
--------------------------------------------------------------------------------------------
 1 |  +2.09 |  +0.28 |  -0.24 |  +0.00 |  +0.00 |  -0.05 |  +0.00 |  +0.01 |  +0.01 | -0.003
 3 |  +2.50 |  +0.53 |  -0.53 |  +0.09 |  +0.28 |  -0.26 |  +0.01 |  +0.03 |  +1.49 | -0.009
 6 |  +2.73 |  +0.74 |  -0.69 |  +0.21 |  +0.37 |  -0.69 |  +0.06 |  +0.09 |  +3.04 | -0.018
12 |  +3.19 |  +1.02 |  -0.77 |  +0.40 |  +0.58 |  -1.78 |  +0.28 |  +0.25 |  +5.01 | -0.035
24 |  +3.97 |  +1.42 |  -0.81 |  +0.63 |  +0.97 |  -4.50 |  +1.12 |  +0.76 |  +2.77 | -0.067
48 |  +4.75 |  +2.01 |  -0.87 |  +0.91 |  +1.49 | -11.29 |  +3.68 |  +2.21 |  +0.32 | -0.127
```

**Printing is spending.** It buys things in `aggregate.js` and cancels on the
financing side of the budget, so purchases rise and debt does not. Which is why
this column looks like a free lunch: +3.5 output, −0.8 unemployment, −1.9pp of
debt and +5.6 approval at a year.

**The price is in the last column and it is slow.** Credibility falls 0.0015
per pp printed per month — 0.035 at a year, 0.15 at four. Nothing happens until
it crosses `MONETISATION_CREDIBILITY_GATE` (0.5), and then the direct
pass-through to inflation switches on and the Phillips slope quadruples. Keep
printing and you eventually open the gate you were relying on being shut.
Approval has already turned negative by month 48 while every other column still
looks good.

**Held at 3pp or more from the calm baseline, this reaches hyperinflation
inside eight years.** 2pp does not. There is a cliff and it is not signposted.

### `qe` 10.0pp

```
mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib
--------------------------------------------------------------------------------------------
 1 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  +0.00 |  -0.00 |  +0.00 |  +0.00 |  +0.00 | +0.000
 3 |  +0.01 |  +0.00 |  -0.00 |  +0.01 |  +0.00 |  -0.00 |  +0.02 |  +0.00 |  +0.00 | +0.000
 6 |  +0.04 |  +0.01 |  -0.01 |  +0.03 |  +0.01 |  -0.01 |  +0.11 |  +0.02 |  +0.02 | +0.000
12 |  +0.10 |  +0.03 |  -0.03 |  +0.07 |  +0.02 |  -0.05 |  +0.35 |  +0.09 |  +0.09 | +0.000
24 |  +0.19 |  +0.08 |  -0.07 |  +0.10 |  +0.06 |  -0.23 |  +0.87 |  +0.33 |  +0.19 | +0.000
48 |  +0.35 |  +0.15 |  -0.12 |  +0.14 |  +0.13 |  -0.95 |  +1.81 |  +0.94 |  +0.20 | +0.000
```

Deliberately weak per pound — 3.5 basis points off the yield per 1% of GDP
purchased, so 10% of GDP buys 35bp. Ten percent of GDP of bond buying does
about a third of what one percentage point of rate cut does.

**Its whole value is that it works when the rate dial does not.** The rate's
effect is scaled toward zero as you approach the lower bound; QE's is not. At
the floor, one more 0.25pp cut is worth less than QE is.

---

## 3. The same move, from different starting states

24 months on, the gap set by a standing external demand shock. **This is where
the game is.** The last column is the share of the total move that arrived as
output rather than prices.

### `policy_rate` −1pp

| start gap | Δoutput | Δinflation | Δunemp | output share |
|---|---|---|---|---|
| −8.10% | +0.76 | +0.08 | −0.13 | 0.91 |
| −6.06% | +0.76 | +0.07 | −0.13 | 0.91 |
| −3.98% | +0.69 | +0.07 | −0.11 | 0.91 |
| −1.90% | +0.63 | +0.06 | −0.11 | 0.91 |
| +0.00% | +0.57 | +0.22 | −0.20 | 0.72 |
| +1.98% | +0.61 | +0.12 | −0.06 | 0.83 |
| +4.08% | +0.04 | +0.11 | −0.06 | 0.29 |
| +5.27% | +0.04 | +0.21 | −0.07 | 0.17 |

### `govt_spending` +1pp

| start gap | Δoutput | Δinflation | Δunemp | output share |
|---|---|---|---|---|
| −8.10% | +1.97 | +0.23 | −0.36 | 0.90 |
| −6.06% | +1.97 | +0.23 | −0.36 | 0.90 |
| −3.98% | +2.05 | +0.22 | −0.15 | 0.90 |
| −1.90% | +1.60 | +0.20 | −0.40 | 0.89 |
| +0.00% | +1.45 | +0.67 | −0.49 | 0.68 |
| +1.98% | +1.56 | +0.33 | −0.11 | 0.82 |
| +4.08% | −0.01 | +0.36 | −0.15 | −0.02 |
| +5.27% | −0.00 | +1.04 | −0.16 | −0.00 |

### `money_printed` 2pp

| start gap | Δoutput | Δinflation | output share |
|---|---|---|---|
| −8.10% | +3.97 | +0.34 | 0.92 |
| −6.06% | +4.01 | +0.38 | 0.91 |
| −3.98% | +4.05 | +0.42 | 0.91 |
| −1.90% | +3.85 | +0.93 | 0.81 |
| +0.00% | +3.97 | +1.42 | 0.74 |
| +1.98% | +1.90 | +0.99 | 0.66 |
| +4.08% | +0.07 | +1.79 | 0.04 |
| +5.27% | +0.09 | +12.29 | 0.01 |

**Read all three together and this is the game in one page:**

1. **With slack, roughly 90% of any stimulus arrives as output.** All three
   levers, across the whole slack range. This is the good case and it is
   robust.
2. **At potential, the share drops to about 70%.** Not a switch — a slide.
   `02-causal-map.md`'s "IF gap < 0 … IF gap ≥ 0" binary is the right lesson
   stated as the wrong mechanism, and the correction is recorded there.
3. **Above +4% there is a hard cliff.** `MAX_CAPACITY_OVERHEAT`. Demand above
   what can physically be produced cannot become output at all, so it goes
   entirely to prices — printing into an economy already at the ceiling buys
   **+31pp of inflation and 0.27 of output**. This is the one true switch in
   the model and it is where "output flat, prices ↑" actually lives.
4. **The fiscal multiplier is larger with slack** (2.1 at −8%, 1.2 at +2%) and
   the monetary one is roughly flat until the ceiling. Ramey & Zubairy dispute
   that the fiscal state-dependence exists at all; the model codes the standard
   view and `parameters.py` shows the range.

**Two wrinkles worth knowing about,** because they are visible in the tables
and they are not noise:

- **The `unemployment` column is bumpier than the others.** There are two kinks
  near the baseline — the wage Phillips curve steepens below 5% unemployment,
  and Okun's β ramps with the size of the gap — so the jobs response is not
  monotone in the gap the way the output response is. The output/price split is
  the robust pattern; read the unemployment column as directional.
- **The gap-zero row shows more inflation than its neighbours** for every
  lever. That is the wage kink: at exactly 5% unemployment, a boost pushes you
  below it and the steep branch of the wage curve engages.

---

## 4. What happens with no decision from you

A −5pp spending cut, and the automatic machinery's response. Nobody touches a
dial after the first month.

```
mo | Δoutput | Δmkt income | Δtax rev | Δtransfers | Δdisposable | Δdeficit | Δstructural | absorbed
 1 |   -5.24 |       -5.00 |    -0.54 |      +0.36 |       -4.10 |    -4.10 |       -5.00 |     0.18
 3 |   -6.36 |       -6.06 |    -1.30 |      +0.66 |       -4.10 |    -3.06 |       -5.00 |     0.32
 6 |   -7.03 |       -6.66 |    -1.86 |      +0.78 |       -4.02 |    -2.40 |       -5.00 |     0.40
12 |   -8.17 |       -7.64 |    -2.34 |      +0.90 |       -4.39 |    -1.82 |       -5.00 |     0.42
24 |   -9.92 |       -9.02 |    -2.84 |      +1.07 |       -5.11 |    -1.17 |       -5.00 |     0.43
```

Four things are happening without anyone deciding anything:

1. **Progressive tax revenue falls automatically** — the largest stabiliser
   channel, −2.8pp by two years, lagged 3 months for withholding.
2. **Unemployment benefits rise automatically** — the most *timely* channel,
   +0.36pp in the first month.
3. **Together they absorb 43% of the income shock.** Market income falls 9.0pp;
   disposable income falls only 5.1pp. `AUTO_STABILISER_ABSORPTION` says the
   OECD aggregate is ~60% with micro estimates of 32–47%; 43% is inside the
   range and `test/validation.test.js` checks it.
4. **The headline deficit and the fiscal stance say opposite things.** The
   deficit *improves* from −4.10 to −1.17 as the economy shrinks around it,
   while the structural deficit sits at exactly −5.00 the whole time. Reading
   the headline number as your fiscal stance is a real-world mistake that this
   model will let you make and then punish you for.

Also automatic, and visible in §2: inflation erodes the real debt stock every
month; capital depreciates and is rebuilt by investment; credibility rebuilds
slowly whenever inflation is on target; and asset prices mean-revert toward
fundamental.

---

## 5. The presets — what you inherit, and what it does on its own

The left column is with **no player input at all**. The right is under the
**Taylor-rule benchmark** — what a rule-following central bank would have done,
which is also what the game scores you against. Format:
`regime gap/inflation/unemployment/debt/approval/credit-gap`.

### `calm` — everything at the solved steady state

| | no input | Taylor |
|---|---|---|
| 12m | GOLDI +0.0 / 2.0 / 5.0 / 100 / 61 / +0.0 | identical |
| 96m | GOLDI +0.0 / 2.0 / 5.0 / 100 / 65 / +0.0 | identical |

**Nothing drifts, in either arm, for eight years.** That is the milestone test
and it is load-bearing — a model that will not sit still is unplayable. The
trap is boredom: you stimulate for no reason and create the next problem.

### `overheating` — inflation 6%, unemployment 3.5%, rates far too low

| | no input | Taylor |
|---|---|---|
| 12m | OVERH +1.3 / 5.1 / 4.6 / 95 / 60 / +1.6 | OVERH +0.2 / 4.3 / 4.9 / 96 / 60 / +0.7 |
| 24m | OVERH +2.2 / 6.7 / 4.3 / 89 / 63 / +4.0 | OVERH −0.5 / 3.4 / 5.2 / 93 / 61 / −0.3 |
| 48m | OVERH +8.0 / **29.5** / 3.6 / 64 / 52 / +16.2 | GOLDI −0.6 / 2.4 / 5.2 / 92 / 63 / −3.0 |
| 96m | +54.6 / **380.5** → **HYPERINFLATION** | GOLDI −0.2 / 2.0 / 5.1 / 93 / 65 / −4.9 |

Left alone this is a Taylor-principle violation and it must diverge: a fixed
nominal rate against rising inflation means a falling real rate, which feeds
demand, which feeds inflation. **The scenario is a countdown, not a state.**

The benchmark fixes it — and note the cost: unemployment rises from 4.4% to
5.2%, debt is 4pp higher than the do-nothing arm at two years, and it takes
four years. Inflation is still 4.3% at a year, when unemployment has already
started climbing. The trap is exactly that: you will be told you failed long
before it works.

> **The unattended arm survives about a year longer than it used to.** It
> reached 187% at month 48 and ended there; it now reaches 29.5% at 48 and
> 380.5% at 96. The countdown is slower because Phase 3 removed the
> asset-price overshoot that was feeding it, and 5.2 gave the private debt
> stock a maturity, so the debt-service leg arrives over years.

### `recession` — a crash six months ago, rates on the floor

| | no input | Taylor |
|---|---|---|
| 1m | RECES −8.9 / 0.2 / 7.3 / 100 / 64 / −0.1 | same |
| 12m | RECES −8.9 / 0.4 / 6.8 / 105 / 59 / −0.7 | RECES −8.9 / 0.4 / 6.8 / 105 / 59 / −0.5 |
| 24m | RECES −6.5 / 0.7 / 6.4 / 109 / 64 / −1.3 | RECES −6.5 / 0.7 / 6.4 / 109 / 64 / −0.6 |
| 48m | GOLDI −2.3 / 1.4 / 5.7 / 114 / 68 / −1.3 | GOLDI −2.3 / 1.4 / 5.7 / 114 / 68 / +0.4 |
| 96m | GOLDI +2.5 / 2.9 / 4.3 / 111 / 68 / **cg +2.5** | GOLDI +1.1 / 2.5 / 4.6 / 112 / 66 / −0.2 |

**The Taylor rule is almost useless here and that is the trap working.** The
two arms are nearly identical for four years, because the rate is already at
the floor and `monetaryEasingScale` has scaled what little room is left toward
zero. The economy heals on its own over five years — through mean reversion in
asset prices, the crisis drag decaying, and banks rebuilding capital — and it
costs 15pp of debt to do it.

**And then look at 96 months with no input:** the gap is +2.5, inflation 2.9%
and the credit gap +2.5 and still climbing, against a Taylor arm that holds
both near zero. *Do nothing after a recession for long enough and you start
building the next bubble.* Nobody designed that; it falls out of cheap money
held too long.

> **This used to end the term in OVERHEATING at a +8.3 credit gap.** Phase 3's
> asset-price fix took most of it out — 4.3 measured the new ending as
> GOLDILOCKS at +3.15, and 5.4's slower credit trend brought it back to +2.5.
> The direction survives; the size does not, and open_items A2 is the reason
> to expect more of that.

### `stagflation` — 9% inflation, 8.5% unemployment, capacity down 3%

| | no input | Taylor |
|---|---|---|
| 1m | STAGF −3.5 / 12.4 / 8.2 / 100 / 43 | same |
| 6m | OVERH −2.5 / 16.6 / 7.4 / 97 / 37 | OVERH −2.9 / 16.5 / 7.4 / 97 / 37 |
| 12m | OVERH +0.3 / 21.2 / 6.7 / 91 / 31 | OVERH −2.0 / 19.9 / 7.2 / 92 / 32 |
| 24m | +6.8 / **30.9** → **HYPERINFLATION** | OVERH −3.4 / 18.5 / 7.3 / 84 / 35 |
| 48m | — | STAGF −5.5 / **7.8** / 7.6 / 88 / 32 |
| 96m | — | **GOLDI −1.6 / 2.9 / 7.1 / 128 / 45** |

> **THE BENCHMARK USED TO LOSE THIS ONE AND NOW WINS IT, AND THAT IS THE
> LARGEST SINGLE CHANGE IN THIS DOCUMENT.** This table said HYPERINFLATION in
> *both* columns at 24 months. Two things moved it, and neither was a
> coefficient. The fourth audit's A1 split found the Taylor rule was
> announcing a response of 1.5 and transmitting 0.37 — above unity on the dial
> and below it in effect — because the policy rate was being delayed by
> investment's response time. It transmits **1.94** now. And 2.4 derived the
> rate ceiling as a fixed point: at the old `max: 20` the rule was refused its
> own request in 87 of 96 months and lost anyway.

**The rule wins, and the bill is enormous.** Inflation still peaks at 20.3% in
month 16 before
it turns, unemployment sits at 7.6% four years in, approval falls to 31, and
the debt reaches 128% of GDP paying for it — because the rate the state is
borrowing at is the rate the rule just set. The credit gap at −31 is a private
sector that has stopped borrowing altogether. **It takes eight years and it
costs a term.**

You get about a quarter in the STAGFLATION box before the answer becomes
obvious and expensive. Beating it needs a Volcker move — a large, immediate
hike, accepted as costing jobs — and the approval column tells you what that
costs politically: 43 → 32 while inflation is still rising.

### `debt_trap` — debt 140%, yield 7%, 60% foreign-held, growth 1%

| | no input | Taylor |
|---|---|---|
| 12m | GOLDI −1.1 / 1.9 / 5.4 / 146 / 62 | GOLDI −1.0 / 1.9 / 5.4 / 146 / 62 |
| 24m | GOLDI −1.8 / 1.8 / 5.6 / 154 / 62 | GOLDI −1.5 / 1.8 / 5.5 / 154 / 63 |
| 48m | GOLDI −3.0 / 1.6 / 5.8 / 174 / 62 | GOLDI −2.0 / 1.7 / 5.6 / 172 / 63 |
| 96m | RECES −7.3 / 1.1 / 6.4 / **246** → **DEBT CRISIS** | GOLDI −4.0 / 1.5 / 5.8 / **228** → **DEBT CRISIS** |

**REBUILT IN `docs/12` M2, and it used to be provably inert:** the Taylor arm
was byte-identical to doing nothing over 48 months — max |debt difference|
exactly 0.00e+0 — because `output_gap` sat at 0.000000 and inflation at 2.0 for
the whole run, so the rule-following central bank had nothing to react to.

The cause was not scenario design. **The sovereign yield was read in exactly
two places: the government's own interest bill, and the debt-crisis ending.** A
country could carry a 7% yield with 60% of its debt held abroad and the private
economy would not notice. Two mechanisms restore the loop that *is* a debt trap,
and both are defects in their own right:

- `SOVEREIGN_TO_CORPORATE_PASSTHROUGH` — the sovereign risk premium is a floor
  under everybody else's borrowing costs. **One-sided**, because every cited
  estimate is a *ceiling*: a low-debt state does not hand its companies a
  discount, it just stops charging them a penalty.
- `DEBT_AVERAGE_MATURITY_YEARS` — only the maturing slice reprices.

**The decision it now contains, and none of it was there before.** The table
below was measured for `docs/12` and has NOT been re-measured against the
fourth audit's model — the do-nothing row alone has moved (debt 175 → 174 at
m48, the ending from month 71 to month 73). Treat the ORDERING as the finding
and re-run the rows before quoting any of them (open_items B1):

| policy | debt m48 | outcome |
|---|---|---|
| nothing | 175 | DEBT CRISIS, month 71 |
| austerity, tax +4pp | 165 | DEBT CRISIS, month 82 — *delayed, not avoided* |
| rate to the floor | 157 | **survives**, at 5.1% inflation and a +6.8 gap |
| both | 150 | **survives**, inflation 2.3, gap +0.8 |
| both, plus 30% QE | 144 | **survives**, debt back to 127 by month 96 |

**You cannot consolidate your way out.** Austerity alone buys eleven months and
costs 11pp of output gap, and still loses. Cutting the cost of the debt alone
works but you inflate your way there and everyone can see it. The answer is
both, and that is a real decision with a real price.

### `bubble` — every visible gauge healthy, credit 6pp above trend

| | no input |
|---|---|
| 1m | GOLDI +1.3 / 2.5 / 4.4 / 100 / 72 / **cg +6.0** |
| 12m | GOLDI +1.3 / 2.6 / 4.5 / 95 / 68 / **cg +7.2** |
| 24m | GOLDI +1.0 / 2.6 / 4.6 / 90 / 70 / **cg +9.2** |
| 48m | GOLDI +0.1 / 2.2 / 5.0 / 81 / 71 / **cg +11.7** |
| 96m | GOLDI −3.9 / 1.5 / 5.8 / 72 / 69 / **cg +7.1** |

**Eight years in GOLDILOCKS.** Inflation never leaves the 1.5–2.6 band,
unemployment stays between 4.4% and 5.8%, approval never drops below 68, and
debt *falls* from 100 to 72. Every gauge on the headline row says you are doing
a wonderful job.

The credit gap goes 6.0 → 11.7 by year four, past the 9pp BIS line and into
territory `docs/02` calls historically extreme. It is invisible on every other
gauge.

> **AND THEN IT UNWINDS, WHICH IS THE INVERSE OF THE POINT.** By month 96 the
> gap has fallen back to +7.1. This scenario was calibrated against the
> asset-price unit error that 3.1 fixed: it used to climb monotonically to
> +14.5. 5.4 recovered part of it by deriving the credit trend's speed from
> the filter it claims to be — the m48 peak went 9.8 → 11.7 — and the rest is
> structural: the BIS trend carries a slope state and this one does not, so it
> lags a growing credit stock permanently. **A hidden danger that resolves
> itself teaches that ignoring it works.** Tracked as open_items A1, guarded
> by a failing `todo` in `test/scenarios.test.js`, and the other half of the
> answer is a macroprudential dial the player can actually pull (task 6.1).

This is still the best teaching tool in the set for the first four years, and
it only works because the healthy numbers really are healthy —
`test/scenarios.test.js` asserts all four of them, including the regime label,
for four years.

---

## 6. Shocks

Measured against the same baseline with the shock suppressed. `calm` unless
noted.

| Shock | 1m | 6m | 12m | 24m |
|---|---|---|---|---|
| **Oil price spike** | π +2.4, appr −4 | out −0.3, π +1.7, appr −6 | out −0.2, π +1.1, appr −5 | π +0.5, appr +1 |
| **Productivity boom** | out +1.6, appr +3 | out +1.6 | out +1.6, appr +4 | out +1.6 |
| **Bank wobble** (bubble) | out −0.1, appr −5 | out −0.4, appr −4 | out −0.4, u +0.2 | out −0.5 |
| **FINANCIAL CRISIS** (bubble) | out −6.0, u +0.8 | out −8.6, u +1.6, appr −18 | out −10.1, u +1.7 | out −10.0, u +1.3 |
| **Export slump** | out −1.2, u +0.3 | out −1.1, u +0.4 | out −0.9, u +0.3 | out −0.6 |

`confidence_slump` was **deleted** in `docs/12` and its confidence leg folded
into `export_slump`. It moved output by 0.17pp at `CONFIDENCE_INDEP_PREDICTIVE`'s
central value and 0.34pp at the top of its contested range — invisible either
way, and inflating a contested coefficient to make an event detectable is the
one thing this project does not do. Confidence being an echo of fundamentals is
the *finding*; attaching it to a shock that has fundamentals behind it is what
that finding actually implies.

**The oil shock is the only one that is genuinely stagflationary:** inflation
+2.4 on impact and output −0.3 by six months, because the cost-push shock is
also a real income cut. Approval takes the worst of both.

**The productivity boom is the one free lunch** — permanently more output with
no inflation at all. It is the only shock whose effect does not decay.

**The financial crisis is the whole crash chain firing at once,** and it is
where the model is furthest from the literature — see §7.

**`bank_wobble` is now state-dependent, and that is the lesson.** It used to
cost 0.19pp of output in `bubble` and 0.28pp in `calm` — *identical* at every
capital position, because a flat −1.0pp hit to a ratio that rebuilds toward 13%
never reached `BANK_CAPITAL_MINIMUM` and so never armed the delever trigger. It
now scales on the credit gap, and in `bubble` costs 0.5pp of output at two
years against roughly a third of that at trend credit, by taking bank capital
below the floor and arming the quantity leg of the doom loop for the first
time. (The −0.28/−0.93 pair quoted here through `docs/12` was measured before
Phase 3; the mechanism is unchanged and the magnitudes are not.) Baron, Verner &
Xiong: most bank distress *without* a preceding credit boom passes with little
real damage, and the same distress after one predicts severe outcomes.

---

## 7. Where these numbers are wrong, or weak

Written down because a cause-and-effect manual that only lists the parts that
work is marketing.

**The crash's DEPTH is fixed and its PROPAGATION is not.** It measured −24% of
output against a published −6 to −15; it now troughs at **−9.00% of the
pre-crisis level in month 12**. But `CRISIS_IMPULSE_AMPLIFICATION` is *defined*
as the constant that makes that true (`parameters.py`'s `SOLVED_FROM_MODEL`
register), so the trough is a consistency check and not evidence. What IS
evidence is everything the constants do not pin: unemployment peaks at
**+1.91pp against a published 2–5**, and output is **6.60% below trend at five
years against `CRISIS_HYSTERESIS_SCAR` = 10**. Measured with the exogenous scar
switched off entirely, the model generates **3.82** of that 10 by itself,
against 8.4 before this audit. **The model no longer propagates a crisis; it
gets hit and recovers.** `docs/12` §2 has the derivation and open_items A2 has
the diagnosis. Two things had to be separated to get
there, and neither was a magnitude:

1. **Both published numbers were reduced forms** being fed in as structural
   inputs, so the model reproduced its own response on top of them. Each is now
   divided by the model's own measured amplification of it.
2. **They are measured against different baselines** — `CRISIS_OUTPUT_TROUGH`
   is peak-to-trough in *levels*, `CRISIS_HYSTERESIS_SCAR` is against *trend*
   years later. Comparing both to one baseline (which this document did) makes
   a permanent loss look *deeper* than the trough it followed, and that is what
   made the two look mutually contradictory.

**What is still open:** run past the game's horizon and the model rebounds —
−6.60% of trend at five years, −5.16% at eight, −4.51% at ten, where Cerra &
Saxena find no significant rebound at any horizon. Recorded as a `todo`. The
fourth audit's 4.4 switched the collateral channel and the wealth effect BOTH
off and **2.49pp of the trough still came back — 39% of it, with both
amplifiers gone.** The rebound is not the credit loop re-inflating; it is the
demand block, which is the same finding as the missing propagation above.

**`debt_trap` was not really a scenario. It is now.** See §5 — the cause was
that the sovereign yield reached nothing outside the government's own books.

**Two dials have no state-dependent story.** `tax_rate` and `qe` behave nearly
identically at every starting gap; only the rate, spending and printing carry
the conditional the game is about.

**Everything in §2 and §3 is still a permanent, held move from a settled
state,** but paths are now tested — `test/paths.test.js`, built in `docs/12`.
Three results worth knowing:

- **A cut-then-hike round trip returns the stance to 0.000000000 exactly**, and
  the economy does *not* return: capital and potential output stay permanently
  higher at twenty years while the output *gap* decays. That residue is
  hysteresis of the correct kind — cheap money got capital built, and a stock
  that has been built does not un-build.
- **A stop-go cycle that looks symmetric is a persistent easing.** Alternating
  −1pp/+1pp on a twelve-month cycle leaves the dial a point below baseline half
  the time: an average dial stance of −0.500pp, transmitting to **−0.500pp
  exactly**, opening the credit gap **+3.5pp** over eight years. The
  *increments* cancel; the *level* does not. This is exactly how the recession
  scenario builds the next bubble. (Before the A1 split the transmitted figure
  was −0.407 and it was an artefact: the rate rode a 14.74-month kernel, so an
  instantaneous reading carried a year of history and impersonated an average.)
- **A hike-hold-cut round trip is not free in jobs.** Firing is 2.4× faster
  than hiring, so the cumulative unemployment cost exceeds the cumulative gain.

**THE BIFURCATION THIS SECTION USED TO CALL "THE BIGGEST HOLE" IS CLOSED.**
It said: *"the model does not disinflate gradually — it either stabilises or
diverges, with a two-percentage-point knife-edge between them"*, and `docs/12`
attributed it to a missing forward-looking expectations channel. **The
attribution was wrong.** It was a transmission lag applied to the wrong
quantity: the policy rate was being delayed by `rate_to_investment`, an
estimated impulse response *of investment*, so the Taylor rule announced a
response to inflation of 1.5 and transmitted **0.37**. Splitting the lag
(`RATE_PASSTHROUGH_TO_BORROWERS` for the price, `INVESTMENT_ADJUSTMENT_SPEED`
for the spending) took the transmitted response to **1.94** and closed it
without touching expectations at all. The knife-edge moved from 8–9% to
**6–7%**, which is where Fisher puts it, and `test/episodes.test.js`'s
bifurcation test is now a passing assertion rather than a failing `todo`.

**WHAT IS ACTUALLY THE BIGGEST HOLE, and it is in neither the brief nor the
plan: the demand block moves too little.** One finding, five sightings — the UK
1979-83 sacrifice ratio is **0.36** against Ball's 2–4; `TAX_SHOCK_TO_GDP` is
**0.484** against Romer-Romer's 2–3; the austerity paradox is absent at every
playable gap; endogenous crisis propagation is **3.82** against a former 8.4;
and 39% of the crash trough recovers with both amplifiers switched off. Every
real quantity moves too little for the price change that caused it. It is why
`CRISIS_SCAR_AMPLIFICATION` could not be re-solved inside its own range. See
`open_items.md` A2.
