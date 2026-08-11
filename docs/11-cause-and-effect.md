# 11 — Cause and Effect

> **LIVING DOCUMENT, and the only one whose numbers are generated.** Every
> table here comes from `node tools/cause-effect.mjs`, which runs the model and
> prints them. Re-run it after any change to a rule and paste the output back
> in. A document that claims to say what a model does, written by reading the
> model, is how `docs/07` ended up finding fourteen defects.

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
| `tax_rate` −1pp | 0.00 | 0.05 | 0.17 | 0.24 | 0.29 | 0.39 | 0.51 | 0.76 | 1.00 |
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
 1 |  +0.00 |  +0.00 |  -0.00 |  +0.00 |  +0.00 |  -0.08 |  +0.19 |  +0.03 |  +0.00
 3 |  +0.05 |  +0.01 |  -0.01 |  +0.02 |  +0.02 |  -0.25 |  +0.85 |  +0.09 |  +0.01
 6 |  +0.16 |  +0.04 |  -0.04 |  +0.07 |  +0.08 |  -0.52 |  +1.95 |  +0.18 |  +0.08
12 |  +0.43 |  +0.14 |  -0.14 |  +0.20 |  +0.20 |  -1.14 |  +4.12 |  +0.44 |  +0.41
24 |  +0.98 |  +0.37 |  -0.32 |  +0.40 |  +0.48 |  -2.76 |  +8.57 |  +1.29 |  +1.01
48 |  +2.12 |  +0.81 |  -0.59 |  +0.67 |  +1.12 |  -7.45 | +18.01 |  +3.82 |  +1.38
```

**The chain, in the order it fires:**

1. `policy_rate` moves. Nothing else moves this month.
2. **[1 month]** `policy_rate_markets` lands → the real rate falls → asset
   prices start climbing. This is why assets are the fastest column in the
   table: +2 index points by month 6, +18 by month 4.
3. **[same tick]** the 10-year yield falls with the policy rate → interest cost
   falls → the deficit and then the debt fall. Debt is the *second* fastest
   thing to respond to a rate cut, and almost nobody expects that.
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
 1 |  -0.00 |  -0.00 |  +0.00 |  -0.00 |  +0.00 |  +0.08 |  -0.19 |  -0.03 |  -0.00
 6 |  -0.19 |  -0.02 |  +0.07 |  -0.11 |  -0.08 |  +0.53 |  -1.90 |  -0.18 |  -0.11
12 |  -0.51 |  -0.05 |  +0.19 |  -0.28 |  -0.20 |  +1.15 |  -3.83 |  -0.45 |  -0.54
24 |  -1.09 |  -0.12 |  +0.37 |  -0.53 |  -0.44 |  +2.76 |  -7.05 |  -1.27 |  -1.41
48 |  -1.94 |  -0.22 |  +0.55 |  -0.73 |  -0.86 |  +7.16 | -11.66 |  -3.35 |  -1.78
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
- **Debt rises when you hike.** +7pp over four years, from the interest bill.
  Fighting inflation and paying down debt are not the same lever.

### `tax_rate` −1.00pp — a cut

```
mo | output | inflat | unemp  | invest | consum | debt   | apprv
 3 |  +0.03 |  +0.01 |  -0.01 |  -0.01 |  +0.04 |  +0.05 |  +0.18
 6 |  +0.10 |  +0.03 |  -0.03 |  -0.05 |  +0.14 |  +0.20 |  +0.86
12 |  +0.18 |  +0.07 |  -0.07 |  -0.15 |  +0.32 |  +0.61 |  +2.58
24 |  +0.31 |  +0.15 |  -0.13 |  -0.23 |  +0.55 |  +1.42 |  +2.01
48 |  +0.61 |  +0.33 |  -0.25 |  -0.19 |  +0.83 |  +2.63 |  +0.61
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
12 |  +1.34 |  +0.54 |  -0.47 |  +0.01 |  +0.26 |  +0.03 |  +2.21
24 |  +1.48 |  +0.69 |  -0.50 |  -0.01 |  +0.40 |  -0.31 |  +0.76
48 |  +1.90 |  +0.89 |  -0.59 |  +0.07 |  +0.67 |  -1.58 |  +0.55
```

**The fastest lever you have.** +1.04 of output in the first month, because
government purchases *are* demand — there is nothing to transmit. Everything
after that is the multiplier: income → consumption → income.

**Debt FALLS after two years.** Spending 1pp more leaves debt 1.58pp lower at
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
12 |  +3.49 |  +1.08 |  -0.79 |  +0.60 |  +0.68 |  -1.94 |  +5.64 | -0.035
24 |  +4.36 |  +1.48 |  -0.80 |  +0.79 |  +1.18 |  -4.91 |  +3.06 | -0.067
48 |  +4.72 |  +2.24 |  -0.96 |  +1.08 |  +1.77 | -12.62 |  -0.37 | -0.151
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
| −8.4% | +1.15 | +0.11 | −0.20 | **0.91** |
| −6.3% | +1.08 | +0.11 | −0.19 | 0.91 |
| −4.2% | +1.02 | +0.10 | −0.13 | 0.91 |
| −2.0% | +0.99 | +0.10 | −0.19 | 0.91 |
| 0.0% | +0.98 | +0.37 | −0.32 | 0.73 |
| +2.3% | +1.07 | +0.15 | −0.04 | 0.88 |
| **+4.4%** | **+0.04** | +0.23 | −0.12 | **0.16** |
| +5.6% | +0.05 | +0.52 | −0.13 | 0.08 |

### `govt_spending` +1pp

| start gap | Δoutput | Δinflation | Δunemp | output share |
|---|---|---|---|---|
| −8.4% | +2.08 | +0.24 | −0.38 | **0.90** |
| −4.2% | +2.16 | +0.23 | −0.17 | 0.90 |
| −2.0% | +1.62 | +0.20 | −0.40 | 0.89 |
| 0.0% | +1.48 | +0.69 | −0.50 | 0.68 |
| +2.3% | +1.24 | +0.28 | −0.07 | 0.82 |
| **+4.4%** | **−0.01** | +0.51 | −0.15 | **−0.03** |
| +5.6% | +0.00 | +3.25 | −0.22 | 0.00 |

### `money_printed` 2pp

| start gap | Δoutput | Δinflation | output share |
|---|---|---|---|
| −8.4% | +4.11 | +0.36 | **0.92** |
| −4.2% | +4.21 | +0.45 | 0.90 |
| −2.0% | +4.06 | +1.02 | 0.80 |
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
   deficit *improves* from −4.10 to −0.96 as the economy shrinks around it,
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
| 48m | **187% inflation → HYPERINFLATION** | GOLDI −1.6 / 2.6 / 5.6 / 105 / 61 |
| 96m | — | GOLDI −0.2 / 2.0 / 5.1 / 107 / 64 |

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
| 12m | RECES −9.1 / 0.3 / 6.9 / 106 / 59 | RECES −9.1 / 0.3 / 6.9 / 105 / 59 |
| 24m | RECES −5.9 / 0.8 / 6.3 / 110 / 67 | RECES −5.8 / 0.8 / 6.3 / 109 / 67 |
| 48m | GOLDI −0.7 / 1.6 / 5.4 / 115 / 70 | GOLDI +0.4 / 1.8 / 5.0 / 112 / 72 |
| 96m | **OVERH +5.9 / 4.0 / 3.8 / 106 / 64 / cg +9.4** | GOLDI +0.9 / 2.6 / 4.6 / 127 / 64 |

**The Taylor rule is almost useless here and that is the trap working.** The
two arms are nearly identical for four years, because the rate is already at
the floor and `monetaryEasingScale` has scaled what little room is left toward
zero. The economy heals on its own over five years — through mean reversion in
asset prices, the crisis drag decaying, and banks rebuilding capital — and it
costs 15pp of debt to do it.

**And then look at 96 months with no input:** the credit gap is at +9.4, past
the BIS danger line, and the regime box says OVERHEATING. *Do nothing after a
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
| 12m | GOLDI +0.0 / 2.0 / 5.0 / **149** / 62 | identical |
| 24m | GOLDI +0.0 / 2.0 / 5.0 / **162** / 64 | identical |
| 48m | **debt 228 → DEBT CRISIS** | identical |

**The real economy is completely inert and the Taylor arm is byte-identical to
doing nothing.** Only one number moves: debt compounds from 140 to 228 in four
years and the ending fires. Interest costs grow faster than the economy, the
foreign share triples the risk premium above the threshold, and the panic term
engages once interest eats a quarter of revenue.

Mechanically honest, and the weakest scenario in the set as a *game* — see §7.

### `bubble` — every visible gauge healthy, credit 6pp above trend

| | no input |
|---|---|
| 1m | GOLDI +1.5 / 2.5 / 4.4 / 100 / 72 / **cg +6.0** |
| 12m | GOLDI +1.9 / 2.8 / 4.4 / 95 / 68 / **cg +7.0** |
| 24m | GOLDI +1.8 / 2.9 / 4.4 / 89 / 70 / **cg +8.9** |
| 48m | GOLDI +1.7 / 3.0 / 4.4 / 77 / 71 / **cg +11.8** |
| 96m | GOLDI +1.2 / 2.8 / 4.5 / 56 / 71 / **cg +14.5** |

**Eight years in GOLDILOCKS.** Inflation never leaves the 2.5–3.0 band,
unemployment sits at 4.4%, approval never drops below 68, and debt *falls* from
100 to 56. Every gauge on the headline row says you are doing a wonderful job.

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
| **Bank wobble** (bubble) | out −0.2, appr −5 | out −0.1, appr −3 | out −0.1 | out −0.1 |
| **FINANCIAL CRISIS** (bubble) | out −11.8, u +1.5 | out −24.6, u +3.2, appr −38 | out −25.3, u +3.3 | out −24.1, u +3.0 |
| **Export slump** | out −1.2, u +0.3 | out −1.2, u +0.4 | out −0.9 | out −0.5 |
| **Confidence slump** | ~0 | out −0.1 | ~0 | ~0 |

**The oil shock is the only one that is genuinely stagflationary:** inflation
+2.4 on impact *and* output −0.2, because the cost-push shock is also a real
income cut. Approval takes the worst of both.

**The productivity boom is the one free lunch** — permanently more output with
no inflation at all. It is the only shock whose effect does not decay.

**The financial crisis is the whole crash chain firing at once,** and it is
where the model is furthest from the literature — see §7.

**Two shocks barely do anything, and that is a finding rather than a design
choice.** `bank_wobble` costs 0.2pp of output; `confidence_slump` costs
essentially nothing, because confidence enters consumption only through the
fundamentals-orthogonal residual at a coefficient of 0.1, and the confidence
EMA pulls it back within months. Research pass 2 concluded confidence is ~80%
an echo of fundamentals and deliberately made this channel tiny; the honest
consequence is that one of the six shocks is invisible to the player.

---

## 7. Where these numbers are wrong, or weak

Written down because a cause-and-effect manual that only lists the parts that
work is marketing.

**The crash is about 2.6× too deep.** Measured trough −24% of output, against a
published −6 to −15. `CRISIS_OUTPUT_TROUGH` is a REDUCED FORM being used as a
STRUCTURAL SHOCK: −9% is the *observed* peak-to-trough fall, which already
contains the multiplier, and `crisis.js` feeds it in as an exogenous demand
impulse that the model then multiplies again. `CRISIS_HYSTERESIS_SCAR`
compounds it by landing as an immediate 10% cut to potential when Cerra-Saxena
measure divergence from *trend* over years. This is the same class of error as
decision A3, it is tracked by a `todo` test that prints the measured value
every run, and fixing it means separating the impulse from the observation —
not shrinking a number.

**`debt_trap` is not really a scenario yet.** The real economy is inert, the
benchmark central bank changes literally nothing, and the only mechanism is
compound interest. It teaches one true thing (interest costs can outrun the
economy) and offers no interesting decision, because nothing you do with rates,
tax or spending is visible against a 228% debt trajectory in four years.

**`confidence_slump` and `bank_wobble` are close to invisible.** See §6.

**Two dials have no state-dependent story.** `tax_rate` and `qe` behave nearly
identically at every starting gap; only the rate, spending and printing carry
the conditional the game is about.

**Everything here is a permanent, held move from a settled state.** Real policy
is a path, and the model has never been measured against one. There is no test
of what happens when you hike, hold for a year, then cut — the sequencing that
the game is actually made of. That is the single biggest hole in this document.
