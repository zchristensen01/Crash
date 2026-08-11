# 11 — Cause and Effect

> **LIVING DOCUMENT, and the only one whose numbers are generated.** Every
> table here comes from `node tools/cause-effect.mjs`, which runs the model and
> prints them. Re-run it after any change to a rule and paste the output back
> in. A document that claims to say what a model does, written by reading the
> model, is how `docs/07` ended up finding fourteen defects.
>
> **REGENERATED AFTER `docs/12`.** That pass moved most numbers here and
> deleted two claims outright. The two largest movers: the crash is no longer
> 2.6x too deep (§6), and **debt no longer responds quickly to the policy
> rate** — the whole stock used to reprice every month, and §2's claim that
> "debt is the second fastest thing to respond to a rate cut" was an artefact
> of that defect rather than a result. `confidence_slump` no longer exists as a
> separate shock. `debt_trap` is a different scenario.

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

**The kernel** — how much of a 1pp rate cut the economy has felt at all:

| month | 1 | 3 | 6 | 9 | 12 | 18 | 24 | 36 | 48 |
|---|---|---|---|---|---|---|---|---|---|
| real economy (`policy_rate_demand`) | 0.01 | 0.05 | 0.18 | 0.33 | **0.48** | 0.71 | 0.86 | 0.97 | 1.00 |
| markets (`policy_rate_markets`) | 0.50 | 0.94 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

Markets reprice in a month. The real economy is half way there at a year and
still finishing at three. That gap is the single most important thing the game
has to teach and it is why you will be told you have failed long before you
have.

**The response** — share of the eventual 48-month output move delivered by
month N:

| lever | 1 | 3 | 6 | 9 | 12 | 18 | 24 | 36 | 48 |
|---|---|---|---|---|---|---|---|---|---|
| `policy_rate` −1pp | 0.00 | 0.02 | 0.08 | 0.14 | 0.20 | 0.33 | 0.46 | 0.72 | 1.00 |
| `tax_rate` −1pp | 0.00 | 0.06 | 0.18 | 0.26 | 0.31 | 0.40 | 0.52 | 0.77 | 1.00 |
| `govt_spending` +1pp | **0.55** | 0.70 | 0.69 | 0.69 | 0.70 | 0.74 | 0.78 | 0.89 | 1.00 |
| `money_printed` 2pp | **0.44** | 0.60 | 0.65 | 0.69 | 0.74 | 0.83 | 0.92 | 0.96 | 1.00 |
| `qe` 10pp | 0.00 | 0.06 | 0.16 | 0.22 | 0.28 | 0.39 | 0.51 | 0.75 | 1.00 |

The two fiscal levers that *buy things* deliver half their effect in the first
month. Everything that works through a price — the rate, the tax rate, QE —
delivers almost nothing in the first quarter. **That is the whole argument for
fiscal policy being the crisis tool**, and it falls out of the model rather
than being asserted anywhere.

---

## 2. What each dial does

From a settled calm economy, no policy response, no shocks. Units: output,
investment, consumption, debt and the credit gap in percentage points of
potential output; inflation and unemployment in percentage points; assets as an
index (100 = start); approval in points.

### `policy_rate` −1.00pp — a cut

```
mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv
 1 |  +0.00 |  +0.00 |  -0.00 |  +0.00 |  +0.00 |  -0.00 |  +0.19 |  +0.03 |  +0.00
 3 |  +0.05 |  +0.01 |  -0.01 |  +0.02 |  +0.02 |  -0.01 |  +0.85 |  +0.09 |  +0.01
 6 |  +0.16 |  +0.04 |  -0.04 |  +0.07 |  +0.08 |  -0.04 |  +1.95 |  +0.18 |  +0.08
12 |  +0.43 |  +0.14 |  -0.14 |  +0.20 |  +0.20 |  -0.21 |  +4.12 |  +0.44 |  +0.41
24 |  +0.98 |  +0.37 |  -0.32 |  +0.40 |  +0.48 |  -0.99 |  +8.57 |  +1.29 |  +1.01
48 |  +2.12 |  +0.81 |  -0.59 |  +0.67 |  +1.12 |  -4.25 | +18.01 |  +3.82 |  +1.38
```

**The chain, in the order it fires:**

1. `policy_rate` moves. Nothing else moves this month.
2. **[1 month]** `policy_rate_markets` lands → the real rate falls → asset
   prices start climbing. This is why assets are the fastest column in the
   table: +2 index points by month 6, +18 by month 4.
3. **[slow — and this changed in `docs/12`]** the 10-year yield falls with the
   policy rate immediately, but **the rate the government actually PAYS does
   not**: only 1/`DEBT_AVERAGE_MATURITY_YEARS` of the stock refinances each
   year. Debt is −0.21 at a year and −4.25 at four. This used to read −1.14 and
   −7.45, and this document used to claim debt was "the second fastest thing to
   respond to a rate cut, and almost nobody expects that". Nobody expects it
   because it is not true: the whole stock was repricing every month.
4. **[peaks 9 months]** `policy_rate_demand` lands → `user_cost` falls →
   investment rises. **Damped by `monetaryEasingScale`:** a cut transmits at
   1/1.5 of a hike, less again in a recession, and toward zero at the lower
   bound.
5. **[same tick]** higher output → higher household market income → higher
   consumption → higher output. This is the multiplier, and it is why the
   consumption column overtakes the investment column by month 48.
6. **[slow]** rising asset prices → wealth effect → more consumption; and
   cheaper credit → the credit impulse → the credit gap opens. **+3.8pp of
   credit gap after four years from a single 1pp cut.** Cheap money held for a
   term is how the bubble scenario happens to you by accident.
7. **[slowest]** inflation. +0.14pp at a year. The anchored Phillips slope is
   0.05, so demand barely moves prices — see the note in §6.

### `policy_rate` +1.00pp — a hike

```
mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv
 1 |  -0.00 |  -0.00 |  +0.00 |  -0.00 |  +0.00 |  +0.00 |  -0.19 |  -0.03 |  -0.00
 6 |  -0.19 |  -0.02 |  +0.07 |  -0.11 |  -0.08 |  +0.04 |  -1.90 |  -0.18 |  -0.11
12 |  -0.51 |  -0.05 |  +0.19 |  -0.28 |  -0.20 |  +0.20 |  -3.83 |  -0.45 |  -0.54
24 |  -1.11 |  -0.12 |  +0.37 |  -0.54 |  -0.44 |  +0.88 |  -7.05 |  -1.27 |  -1.43
48 |  -2.02 |  -0.23 |  +0.57 |  -0.78 |  -0.87 |  +3.41 | -11.67 |  -3.41 |  -1.86
```

**Not a mirror image, and the asymmetries are the lesson:**

- **A hike costs more output than a cut buys.** −1.09 against +0.98 at two
  years. Pulling a rope, not pushing a string.
- **The cost lands before the benefit.** Unemployment is +0.19 at a year and
  approval −0.54, while inflation has fallen 0.05pp. At two years unemployment
  is +0.37, approval −1.41, inflation −0.12. *You will be a year and a half
  into a hiking cycle, watching unemployment climb with inflation barely
  moved, being told you have failed.* That is the normal experience of doing
  this correctly, and the table is what it looks like.
- **Debt rises when you hike, but SLOWLY.** +0.20pp at a year and +3.41pp over
  four, from the interest bill arriving as the stock refinances. Fighting
  inflation and paying down debt are not the same lever — and the bill for
  fighting inflation lands years after the decision, which is worse. These were
  +1.15 and +7.16 before `docs/12` gave the debt a maturity.

### `tax_rate` −1.00pp — a cut

```
mo | output | inflat | unemp  | invest | consum | debt   | apprv
 3 |  +0.03 |  +0.01 |  -0.01 |  -0.01 |  +0.04 |  +0.05 |  +0.18
 6 |  +0.10 |  +0.03 |  -0.03 |  -0.05 |  +0.14 |  +0.20 |  +0.86
12 |  +0.17 |  +0.07 |  -0.07 |  -0.15 |  +0.32 |  +0.60 |  +2.58
24 |  +0.29 |  +0.14 |  -0.12 |  -0.24 |  +0.55 |  +1.36 |  +1.99
48 |  +0.56 |  +0.31 |  -0.24 |  -0.22 |  +0.81 |  +2.44 |  +0.58
```

1. **[peaks 3 months]** `tax_rate_effective` lands — withholding and settlement
   take a quarter to catch up with legislation.
2. Disposable income rises → consumption rises, slowly, because households
   respond to *permanent* income and `yd_permanent` closes only 5% of the gap
   a month.
3. **Investment FALLS.** The deficit widens → crowding out → −0.23 at two
   years, against +0.55 of consumption. A tax cut is a transfer from
   businesses to households before it is a stimulus.
4. **Approval spikes and then fades** — +2.58 at a year, +0.61 at four. Voters
   weight the recent economy heavily (`APPROVAL_HORIZON`), so a tax cut is
   worth most in the year you make it. That is a real lesson about democratic
   incentives, not an exploit.

### `govt_spending` +1.00pp

```
mo | output | inflat | unemp  | invest | consum | debt   | apprv
 1 |  +1.04 |  +0.16 |  -0.15 |  +0.00 |  +0.00 |  +0.05 |  +0.01
 3 |  +1.33 |  +0.32 |  -0.34 |  +0.13 |  +0.15 |  +0.10 |  +0.78
12 |  +1.33 |  +0.54 |  -0.47 |  +0.01 |  +0.26 |  +0.02 |  +2.21
24 |  +1.48 |  +0.69 |  -0.50 |  -0.01 |  +0.40 |  -0.31 |  +0.76
48 |  +1.90 |  +0.89 |  -0.59 |  +0.07 |  +0.67 |  -1.54 |  +0.55
```

**The fastest lever you have.** +1.04 of output in the first month, because
government purchases *are* demand — there is nothing to transmit. Everything
after that is the multiplier: income → consumption → income.

**Debt FALLS after two years.** Spending 1pp more leaves debt 1.54pp lower at
four years, because the extra output raises the tax take and inflation erodes
the stock faster than the borrowing adds to it. That is only true at this
starting debt level, this yield and this multiplier — but it is a real and
counterintuitive result, and it is the model's version of "you can grow out of
it".

### `money_printed` 2.00pp

```
mo | output | inflat | unemp  | invest | consum | debt   | apprv  | credib
 1 |  +2.08 |  +0.28 |  -0.24 |  +0.00 |  +0.00 |  -0.05 |  +0.01 | -0.003
 6 |  +3.06 |  +0.79 |  -0.72 |  +0.48 |  +0.43 |  -0.74 |  +3.42 | -0.018
12 |  +3.49 |  +1.08 |  -0.79 |  +0.60 |  +0.68 |  -1.92 |  +5.64 | -0.035
24 |  +4.36 |  +1.48 |  -0.80 |  +0.79 |  +1.18 |  -4.80 |  +3.06 | -0.067
48 |  +4.72 |  +2.24 |  -0.96 |  +1.08 |  +1.77 | -12.14 |  -0.37 | -0.151
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
mo | output | inflat | unemp  | invest | debt   | assets
 6 |  +0.11 |  +0.03 |  -0.03 |  +0.08 |  -0.12 |  +0.39
12 |  +0.19 |  +0.07 |  -0.07 |  +0.11 |  -0.36 |  +1.20
24 |  +0.35 |  +0.14 |  -0.13 |  +0.15 |  -0.96 |  +2.84
48 |  +0.69 |  +0.30 |  -0.23 |  +0.22 |  -2.68 |  +5.92
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
| −8.6% | +1.16 | +0.12 | −0.20 | **0.91** |
| −6.5% | +1.17 | +0.12 | −0.20 | 0.91 |
| −4.3% | +1.13 | +0.11 | −0.18 | 0.91 |
| −2.0% | +1.05 | +0.10 | −0.19 | 0.91 |
| 0.0% | +0.98 | +0.37 | −0.32 | 0.73 |
| +2.3% | +1.07 | +0.15 | −0.04 | 0.88 |
| **+4.4%** | **+0.04** | +0.23 | −0.12 | **0.16** |
| +5.6% | +0.05 | +0.52 | −0.13 | 0.08 |

### `govt_spending` +1pp

| start gap | Δoutput | Δinflation | Δunemp | output share |
|---|---|---|---|---|
| −8.6% | +2.08 | +0.24 | −0.38 | **0.90** |
| −4.3% | +2.14 | +0.23 | −0.20 | 0.90 |
| −2.0% | +1.65 | +0.20 | −0.39 | 0.89 |
| 0.0% | +1.48 | +0.69 | −0.50 | 0.68 |
| +2.3% | +1.24 | +0.28 | −0.07 | 0.82 |
| **+4.4%** | **−0.01** | +0.51 | −0.15 | **−0.03** |
| +5.6% | +0.00 | +3.25 | −0.22 | 0.00 |

### `money_printed` 2pp

| start gap | Δoutput | Δinflation | output share |
|---|---|---|---|
| −8.6% | +4.17 | +0.36 | **0.92** |
| −4.3% | +4.27 | +0.45 | 0.90 |
| −2.0% | +4.15 | +1.01 | 0.80 |
| 0.0% | +4.36 | +1.48 | 0.75 |
| +2.3% | +1.35 | +1.09 | 0.55 |
| **+4.4%** | **+0.11** | **+4.01** | 0.03 |
| +5.6% | +0.27 | **+31.04** | 0.01 |

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
 1 |   -5.20 |       -5.00 |    -0.54 |      +0.36 |       -4.10 |    -4.10 |       -5.00 |     0.18
 3 |   -7.23 |       -6.93 |    -1.44 |      +0.74 |       -4.75 |    -2.85 |       -5.00 |     0.32
 6 |   -7.87 |       -7.49 |    -2.10 |      +0.88 |       -4.51 |    -2.09 |       -5.00 |     0.40
12 |   -8.83 |       -8.28 |    -2.56 |      +0.98 |       -4.74 |    -1.55 |       -5.00 |     0.43
24 |  -10.44 |       -9.55 |    -3.01 |      +1.14 |       -5.40 |    -0.96 |       -5.00 |     0.43
```

Four things are happening without anyone deciding anything:

1. **Progressive tax revenue falls automatically** — the largest stabiliser
   channel, −3.0pp by two years, lagged 3 months for withholding.
2. **Unemployment benefits rise automatically** — the most *timely* channel,
   +0.36pp in the first month.
3. **Together they absorb 43% of the income shock.** Market income falls 9.6pp;
   disposable income falls only 5.4pp. `AUTO_STABILISER_ABSORPTION` says the
   OECD aggregate is ~60% with micro estimates of 32–47%; 43% is inside the
   range and `test/validation.test.js` checks it.
4. **The headline deficit and the fiscal stance say opposite things.** The
   deficit *improves* from −4.10 to −0.91 as the economy shrinks around it,
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
| 96m | GOLDI +0.0 / 2.0 / 5.0 / 100 / 64 / +0.0 | identical |

**Nothing drifts, in either arm, for eight years.** That is the milestone test
and it is load-bearing — a model that will not sit still is unplayable. The
trap is boredom: you stimulate for no reason and create the next problem.

### `overheating` — inflation 6%, unemployment 3.5%, rates far too low

| | no input | Taylor |
|---|---|---|
| 12m | OVERH +2.8 / 6.6 / 4.3 / 94 / 59 / +1.9 | OVERH +1.0 / 5.1 / 4.6 / 99 / 60 / +0.1 |
| 24m | OVERH +7.0 / 14.5 / 3.8 / 84 / 61 / +6.1 | OVERH −0.8 / 4.2 / 5.3 / 101 / 59 / −1.2 |
| 48m | **187% inflation → HYPERINFLATION** | GOLDI −1.6 / 2.6 / 5.6 / 91 / 61 |
| 96m | — | GOLDI −0.2 / 2.0 / 5.1 / 93 / 64 |

Left alone this is a Taylor-principle violation and it must diverge: a fixed
nominal rate against rising inflation means a falling real rate, which feeds
demand, which feeds inflation. **The scenario is a countdown, not a state.**

The benchmark fixes it — and note the cost: unemployment rises from 3.5% to
5.6%, approval falls, debt rises 7pp, and it takes four years. Inflation is
still 5.1% at a year, when unemployment has already started climbing. The trap
is exactly that: you will be told you failed long before it works.

### `recession` — a crash six months ago, rates on the floor

| | no input | Taylor |
|---|---|---|
| 1m | RECES −8.8 / 0.2 / 7.3 / 100 / 64 | same |
| 12m | RECES −9.1 / 0.3 / 6.9 / 105 / 59 | RECES −9.0 / 0.3 / 6.9 / 105 / 59 |
| 24m | RECES −6.0 / 0.8 / 6.3 / 110 / 66 | RECES −5.8 / 0.8 / 6.2 / 109 / 66 |
| 48m | GOLDI −0.8 / 1.6 / 5.4 / 114 / 69 | GOLDI −0.3 / 1.7 / 5.3 / 112 / 69 |
| 96m | **OVERH +5.8 / 3.9 / 3.9 / 103 / 64 / cg +8.3** | GOLDI +0.9 / 2.6 / 4.6 / 109 / 63 |

**The Taylor rule is almost useless here and that is the trap working.** The
two arms are nearly identical for four years, because the rate is already at
the floor and `monetaryEasingScale` has scaled what little room is left toward
zero. The economy heals on its own over five years — through mean reversion in
asset prices, the crisis drag decaying, and banks rebuilding capital — and it
costs 15pp of debt to do it.

**And then look at 96 months with no input:** the credit gap is at +8.3, close
to the BIS danger line, and the regime box says OVERHEATING. *Do nothing after a
recession for long enough and you build the next bubble.* Nobody designed that;
it falls out of cheap money held too long.

### `stagflation` — 9% inflation, 8.5% unemployment, capacity down 3%

| | no input | Taylor |
|---|---|---|
| 1m | STAGF −3.0 / 12.5 / 8.2 / 100 / 43 | same |
| 6m | OVERH −0.4 / 17.7 / 7.1 / 96 / 37 | OVERH −1.1 / 17.4 / 7.2 / 100 / 37 |
| 12m | OVERH +6.3 / 26.3 / 5.6 / 89 / 30 | OVERH +2.2 / 23.8 / 6.0 / 102 / 31 |
| 24m | **HYPERINFLATION** | **HYPERINFLATION** |

**The benchmark loses this one too**, which is the point. A 5% policy rate
against 7% expected inflation is a deeply negative real rate; the rule takes
15 months to move decisively and the transmission takes another nine. By then
expectations have run.

You get about a quarter in the STAGFLATION box before the answer becomes
obvious and expensive. Beating it needs a Volcker move — a large, immediate
hike, accepted as costing jobs — and the approval column tells you what that
costs politically: 45 → 30 within a year while inflation is still rising.

### `debt_trap` — debt 140%, yield 7%, 60% foreign-held, growth 1%

| | no input | Taylor |
|---|---|---|
| 12m | GOLDI −1.6 / 1.8 / 5.6 / 147 / 62 | GOLDI −1.5 / 1.8 / 5.5 / 147 / 62 |
| 24m | GOLDI −2.2 / 1.7 / 5.7 / 155 / 62 | GOLDI −1.5 / 1.8 / 5.5 / 154 / 63 |
| 48m | GOLDI −3.5 / 1.5 / 5.8 / 175 / 61 | GOLDI −1.6 / 1.7 / 5.6 / 172 / 63 |
| 96m | RECES −8.7 / 0.9 / 6.7 / **252** → **DEBT CRISIS** | GOLDI −3.1 / 1.6 / 5.8 / **227** → **DEBT CRISIS** |

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

**The decision it now contains, and none of it was there before:**

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
| 1m | GOLDI +1.5 / 2.5 / 4.4 / 100 / 72 / **cg +6.0** |
| 12m | GOLDI +1.9 / 2.8 / 4.4 / 95 / 68 / **cg +7.0** |
| 24m | GOLDI +1.8 / 2.9 / 4.4 / 89 / 70 / **cg +8.9** |
| 48m | GOLDI +1.7 / 3.0 / 4.4 / 77 / 71 / **cg +11.8** |
| 96m | GOLDI +1.2 / 2.8 / 4.5 / 58 / 71 / **cg +14.5** |

**Eight years in GOLDILOCKS.** Inflation never leaves the 2.5–3.0 band,
unemployment sits at 4.4%, approval never drops below 68, and debt *falls* from
100 to 58. Every gauge on the headline row says you are doing a wonderful job.

The credit gap goes 6.0 → 14.5, past the 9pp BIS line in year four and into
territory `docs/02` calls historically extreme. Annual crisis probability rises
from 2.7% to about 6%; over eight years that is roughly a one-in-three chance
of the crash arriving, and it is invisible on every other gauge.

This is the best teaching tool in the set and it only works because the healthy
numbers really are healthy — `test/scenarios.test.js` asserts all four of them,
including the regime label, for four years.

---

## 6. Shocks

Measured against the same baseline with the shock suppressed. `calm` unless
noted.

| Shock | 1m | 6m | 12m | 24m |
|---|---|---|---|---|
| **Oil price spike** | π +2.4, appr −4 | out −0.2, π +1.7, appr −6 | π +1.1, appr −5 | out +0.2, π +0.6 |
| **Productivity boom** | out +1.6 | out +1.6 | out +1.6, appr +4 | out +1.6 |
| **Bank wobble** (bubble) | out −0.8, appr −5 | out −0.5, appr −4 | out −0.6 | out −0.6 |
| **FINANCIAL CRISIS** (bubble) | out −6.3, u +0.9 | out −8.9, u +1.8, appr −18 | out −10.8, u +2.0 | out −11.4, u +2.0 |
| **Export slump** | out −1.2, u +0.3 | out −1.3, u +0.5 | out −0.9, u +0.4 | out −0.6 |

`confidence_slump` was **deleted** in `docs/12` and its confidence leg folded
into `export_slump`. It moved output by 0.17pp at `CONFIDENCE_INDEP_PREDICTIVE`'s
central value and 0.34pp at the top of its contested range — invisible either
way, and inflating a contested coefficient to make an event detectable is the
one thing this project does not do. Confidence being an echo of fundamentals is
the *finding*; attaching it to a shock that has fundamentals behind it is what
that finding actually implies.

**The oil shock is the only one that is genuinely stagflationary:** inflation
+2.4 on impact *and* output −0.2, because the cost-push shock is also a real
income cut. Approval takes the worst of both.

**The productivity boom is the one free lunch** — permanently more output with
no inflation at all. It is the only shock whose effect does not decay.

**The financial crisis is the whole crash chain firing at once,** and it is
where the model is furthest from the literature — see §7.

**`bank_wobble` is now state-dependent, and that is the lesson.** It used to
cost 0.19pp of output in `bubble` and 0.28pp in `calm` — *identical* at every
capital position, because a flat −1.0pp hit to a ratio that rebuilds toward 13%
never reached `BANK_CAPITAL_MINIMUM` and so never armed the delever trigger. It
now scales on the credit gap: −0.28pp at trend credit, −0.93pp in a mature
bubble, where it takes bank capital from 13.3% to **9.8%**, below the floor,
arming the quantity leg of the doom loop for the first time. Baron, Verner &
Xiong: most bank distress *without* a preceding credit boom passes with little
real damage, and the same distress after one predicts severe outcomes.

---

## 7. Where these numbers are wrong, or weak

Written down because a cause-and-effect manual that only lists the parts that
work is marketing.

**The crash is fixed.** It measured −24% of output against a published −6 to
−15; it now troughs at **−8.96% of the pre-crisis level in month 14**, with
unemployment +2.07pp and output 9.98% below the pre-crisis *trend* at five
years. `docs/12` §2 has the derivation. Two things had to be separated to get
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
−10.0% of trend at five years, −7.4% at eight, −4.7% at ten, where Cerra &
Saxena find no significant rebound at any horizon. Recorded as a `todo`.

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
  the time: an average −0.5pp stance, transmitting to −0.407pp, opening the
  credit gap +5.1pp over eight years. The *increments* cancel; the *level* does
  not. This is exactly how the recession scenario builds the next bubble.
- **A hike-hold-cut round trip is not free in jobs.** Firing is 2.4× faster
  than hiring, so the cumulative unemployment cost exceeds the cumulative gain.

**THE BIGGEST HOLE IS NOW SOMEWHERE ELSE, and it is much larger.** The four
historical episode tests added in `docs/12` all fail, and they fail the same
way: **the model does not disinflate gradually — it either stabilises or
diverges, with a two-percentage-point knife-edge between them.** From 8%
inflation, a 7% policy rate reaches 217% and a 9% rate reaches 0.69%; the same
15% destination reached over 24 months explodes where reaching it immediately
does not. See `test/episodes.test.js` and `docs/12` §1.
