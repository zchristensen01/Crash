# 12 — Third audit: what was wrong, what changed, and the one thing that matters

> Ordered by severity, and the first section is the one to read. Every number
> below was produced by running the model. Where a finding is recorded rather
> than fixed, it is a `todo` test that prints its measured value on every run,
> so it shows up in `npm test` output and cannot quietly be forgotten.
>
> `npm test` before this pass: 95 tests, 92 pass, 3 `todo`.
> After: **136 tests, 125 pass, 0 fail, 11 `todo`**, plus a linter.

---

## THE HEADLINE, IN ONE PARAGRAPH

Five things inverted a lesson the game exists to teach, and all five are fixed
with a regression test each. The crash was 2.6× too deep and is now inside the
published band on all four acceptance criteria. `debt_trap` was provably inert
and is now the most interesting scenario in the set.

**And then the historical episode tests were built, and they are the reason to
read this document.** Fed the actual policy path of US 2008–12, US 2021–23, UK
1979–83 and Japan 1995–2005, **the model fails all four, and it fails them the
same way.** It does not disinflate *gradually*. It either stabilises or
diverges, with a two-percentage-point knife-edge between them and nothing in
between — and real economies live in between. That is a larger finding than
anything in the audit brief, it explains all four failures at once, and it is
why I did not build Section 5.

---

# SECTION 1 — FINDINGS THAT INVERT A LESSON

## L1. Recapitalisation rewarded a one-month gesture over a year-long programme

`crisis.js` read `extra` as the **current spending rate** and took a running
`Math.max` over it, while `RECAP_FULL_RESPONSE`'s unit string is "pp of GDP of
extra public spending in year one" — a **cumulative** quantity, TARP-sized
because that is what TARP was.

```
+5pp for  1 month  -> recap 1.000, scar 5.111   (0.42 pp-yr actually spent)
+5pp for 12 months -> recap 1.000, scar 5.111   (5.00 pp-yr)
+1pp for 12 months -> recap 0.200, scar 9.199   (1.00 pp-yr)
```

A gesture costing 0.42pp-years bought the full 50% scar reduction; a programme
costing 2.4× more bought 20%. **Fixed** by integrating the rate (`extra/12`
per tick, via `units.annualToMonthlyFlow`) into a new `recap_spent` stock in
pp-**years**, and comparing *that* against the parameter. Now:

```
+5pp for  1 month  -> recap 0.083, scar 9.796
+5pp for 12 months -> recap 1.000, scar 5.111
+1pp for 12 months -> recap 0.200, scar 9.199
```

More money always buys more. `test/crisis.test.js` → *"RECAPITALISATION IS A
QUANTITY, NOT A GESTURE"*, which asserts the ordering and that
`recap_promptness` is exactly money-spent over the parameter.

## L3. Crowding out switched off at a hard step, on the dial

`investment.js` gated crowding out on `s.policy_rate <= SS_ELB + 0.26` — three
defects in one line, as the brief said. Reproduced exactly (the brief's "dial"
column is the **absolute setting**, not a delta):

```
dial  0.00 -> transmitted 2.4818, atELB false
dial -0.49 -> transmitted 2.4783, atELB TRUE
dial -0.75 -> transmitted 2.4764, atELB TRUE
```

**The cost, measured.** Sweeping the settled policy rate with the output gap
held at zero by an offsetting `net_exports` shock — the gap must *not* be set
with the lever under test, and my first attempt at this sweep did exactly that
and read the capacity ceiling instead:

| rate | multiplier, old rule | multiplier, new |
|---|---|---|
| −0.40 | 1.3921 | 1.8566 |
| −0.50 | **1.9978** | 1.8962 |

**The fiscal multiplier jumped 44% across a single 0.1pp dial click.** Now it
ramps over `ZLB_EFFECTIVE_BAND` on `policy_rate_demand`: monotone, largest step
0.041 instead of 0.606.

## L5. **NEW, and worse than L3: hiking at the lower bound raised output**

The brief said `monetaryEasingScale` "correctly ramps over `ZLB_EFFECTIVE_BAND`"
and used it as the model for fixing L3. **It ramps over the band but on the
DIAL**, so it had the same instantaneity defect — and the consequence is a
straight lesson inversion.

From `recession`, which opens at a 0.00% rate, which is exactly where a player
meets this:

```
month | transmitted | room(dial) | room(transmitted)
    1 |      0.0073 |      1.000 |             0.505
```

`room` jumps 0.500 → 1.000 the month the slider moves, while the economy has
felt 0.007pp. All the suppressed easing counts at once:

| hike | dY m1 | m3 | m6 | m12 |
|---|---|---|---|---|
| +1.00pp, before | **+0.08** | **+0.08** | +0.00 | −0.17 |
| +1.00pp, after | +0.00 | −0.02 | −0.08 | −0.22 |

**A hike raised output for two quarters**, in the one regime — at the bound, in
a recession — where the game most needs the player to understand that the rate
dial has run out of room. It never showed up because it only bites within
`ZLB_EFFECTIVE_BAND` of the floor: the `recession` scenario, the post-crash
state, and Japan.

`room` now reads `policy_rate_demand`, which is also the better economics: the
term multiplies the stance the economy has **already felt**, so it is asking
whether the interest-rate channel is dead at the rates facing borrowers, not
how much room the central bank has left. It gives the better story too — the
first part of a cut toward the floor works and the last part does not.

**`s.policy_rate` is now read nowhere in `investment.js` except to display it**,
and `tools/lint.mjs` enforces that across all of `src/rules/`.

## L2. The austerity paradox: the promise is false and cannot be made true

Reproduced (labelling rows by the *achieved* gap):

| gap | Δrevenue | Δoutput | leak |
|---|---|---|---|
| 0 | +2.298 | −2.20% | 23.4% |
| −6 | +1.962 | −2.51% | 34.6% |
| −12 | +1.732 | −2.59% | 42.3% |

Revenue rises at every playable gap. **The verdict is (a), and it is closed
form.** With `revenue = τ + e·(τ/100)·gap`, revenue falls only if +1pp of tax
costs more than **3.11%** of output at a zero gap or **2.87%** at −6%. The
model delivers **0.99%**. Only at the elasticity's high end (1.8) *and* a −12%
gap does the requirement (1.76) land inside Romer–Romer at all.

**So the two open findings are one finding, and nobody had connected them: the
austerity paradox is missing because the tax multiplier is small.** That is
already recorded as `TAX_SHOCK_TO_GDP`'s `todo`.

**Also confirmed: `docs/07` L4's proposed test was never written.**
`revenueChange(-6,+3) < revenueChange(0,+3)*0.5` measures 1.962 against a
threshold of 1.149 — it would have failed on the day it was proposed, and
`docs/08` §2's claim that this was fixed when market income stopped being a
constant is wrong. That change created the *gradient*; it could not create the
sign flip.

**Changed:** the dial help text and `docs/02` DIAL 3 now promise the leak,
which is real and counterintuitive, instead of a sign reversal that is neither.
`test/multipliers.test.js` asserts the leak grows with slack and prints the
multiplier the sign flip would require.

## L4. The IRF harness, and why `docs/02`'s bracket numbers should not be imposed

Reproduced with the temporary-impulse experiment (+1pp held 12 months then
reverted; the brief's "output" column is `d(output_gap)`, which then matches
exactly):

```
output_gap   peak -0.564 at month 17   (doc says 12)
unemployment peak +0.233 at month 17   (doc says 18)
inflation    peak -0.073 at month 22   (doc says 24; LAGS_MONTHS says 18)
```

**Built:** `irf()` in `test/harness.mjs` and `test/irf.test.js` — 7 tests
asserting hump shape, peak ordering, scaling in the impulse size, the
cut/hike asymmetry along the whole path, and that spending is fast where the
rate is slow. This is what `docs/07` M9 was looking for and could not find,
because it was measuring **permanent** moves, which cannot peak by construction.

**Decision on the lag: do not impose it.** `rate_to_output: 12` and
`rate_to_unemployment: 18` in `LAGS_MONTHS` are wired to nothing — they are
**reduced forms**, the observed peak of a whole economy's response. The model
derives 17 by convolving the one structural lag it has (`rate_to_investment`,
peak 9) with the multiplier and the capital stock. Imposing 12 on top would be
feeding an observation in as a structural input, which is this project's rule 4
and is exactly the error Section 2 is about.

**On the missing output→employment lag I partly disagree with the brief.** The
model has no lag: a −3pp demand shock puts 38% of the eventual unemployment
response into month **one**. But `docs/02` Asymmetry 2 says *"firms fire in
WEEKS and hire over quarters"*, and firing in weeks is what the model does. The
jobless-recovery half is real too — du/dgap doubles from 0.198 to 0.391 over
four years as output recovers and employment does not. What is genuinely
missing is the **decision** lag (firms cut hours and wait a quarter before
shedding heads), and adding it means a new smoothing parameter in the busiest
rule in the model whose only anchor would be the reduced-form peak month it was
tuned to reproduce. Left open with the number printed.

---

# SECTION 2 — THE CRASH, FIXED

Reproduced exactly: trough −23.54% at m13; drag-only −15.15%; scar +
balance-sheet −15.23%; scar 10.221 at m1 *and* at m12; impact multiplier 1.323.

**A third channel the brief did not decompose.** Switching each piece off
*before* any tick runs (`crisis_months = 1` kills the drag; `potential_at_crisis
= 0` kills the scar — switching off *after* the tick contaminates month one,
which is what my first attempt did):

| | trough | at m60 |
|---|---|---|
| balance sheet alone (`asset_prices ×0.7`, `spread +3.0`) | −5.99% @m39 | −5.83% |
| demand drag alone | −6.62% @m3 | −3.72% |
| drag + balance sheet | −11.18% @m14 | −8.36% |

The balance-sheet channel alone nearly exhausts the published budget, and
**the model produces 8.4pp of permanent loss with no exogenous scar at all**,
from capital destruction, a contracted credit stock and a gap that has not
closed at five years.

### The fix: three things, none of them a smaller number

**1. Both published numbers are reduced forms.** Each is now divided by the
model's own measured amplification of it — `CRISIS_IMPULSE_AMPLIFICATION` (2.59)
and `CRISIS_SCAR_AMPLIFICATION` (3.14), both labelled `judgement` because they
describe *this model* rather than the world, both solved rather than read off,
and both re-measured by a test that fails if they drift.

The amplification is **not constant in the impulse size** — 1.68× at the old
9pp impulse because investment hit its floor clamp and saturated, 2.59× at the
deconvolved 3.47pp. That nonlinearity is why it had to be solved.

**2. The scar phases in.** It landed in full on month one — a horizon
measurement turned into a contribution to the trough. It now grows on the same
time constant the drag decays on, `12·CRISIS_YEARS_TO_RECOVER/ln 10`, which is
not a convenience: **the scar is the part of the collapse that never came back,
so the two have to be the same clock.**

**3. THE ONE THE BRIEF MISSED: the two observations use different baselines.**
`CRISIS_OUTPUT_TROUGH` is peak-to-trough against the pre-crisis **level**.
`CRISIS_HYSTERESIS_SCAR` is against the pre-crisis **trend**, years later. At
1.5% trend growth, −10% of trend at 60 months is only −2.2% of the level.
Comparing both to one baseline — which `docs/11` did, and which the brief's
acceptance criteria did — makes a permanent loss look **deeper than the trough
it followed**, and drove my first solver to the end of its bracket trying to
satisfy two mutually contradictory targets.

### Acceptance: all four

| | measured | required |
|---|---|---|
| peak-to-trough, vs level | **−8.96%** | −6 to −15 |
| trough month | **14** | 9–18 |
| unemployment peak | **+2.07pp** | +2 to +5 |
| vs trend at 60 months | **−9.98%** | ≈ −10 |
| prompt recap vs passive scar | **50.0%** | ≈ halves |

The `todo` on `CRISIS_OUTPUT_TROUGH` is now a **real assertion**.

### Two things that fell out

**JST's "When Credit Bites Back" is reproduced without being coded.** The bust
is deeper and longer the bigger the boom was — and this is the source
`CRISIS_OUTPUT_TROUGH` already cites, whose central claim nothing tested:

| scenario | credit gap | trough | month | u peak |
|---|---|---|---|---|
| `bubble` | +8.9 | −8.96% | 14 | +2.07 |
| `calm` | 0.0 | −6.85% | 3 | +1.33 |
| `recession` | −1.2 | −1.21% | 1 | +0.63 |

**Still open:** past the game's horizon the model rebounds — −10.0% of trend at
five years, −7.4% at eight, −4.7% at ten — where Cerra & Saxena find no
significant rebound at any horizon. Inflating the exogenous scar to close it is
not available: it would push the five-year loss to −14% and the trough outside
the published band. Recorded as a `todo`.

---

# SECTION 3 — ANCHOR AND SCENARIO DEFECTS

## M1. `velocity_v0` was built from the scenario's opening rate

Reproduced exactly (wedges 0.000 / −0.0088 / −0.0148 / +0.0145 / −0.0059).
Anchored on `policy_rate_ss`. The same policy now buys the same velocity
multiplier (1.0520 at a 12% rate) in every scenario.

**Test written as a perturbation, so it catches the next one:** rebuild each
scenario with a different opening policy rate, and nothing that means "neutral"
may move. That formulation would have caught `velocity_v0` in `docs/08`.

## M2. `debt_trap` was inert because the sovereign yield reached nothing

Reproduced: max |debt difference| between the no-input and Taylor arms over 48
months = **0.00e+0**.

**The cause was not scenario design.** `yield_10y` was read in exactly two
places — the government's own interest bill and the debt-crisis ending. A
country could carry a 7% yield with 60% of its debt held abroad and the private
economy would not notice. The loop that *is* a debt trap did not exist.

Two mechanisms, both defects in their own right:

- **`SOVEREIGN_TO_CORPORATE_PASSTHROUGH` (0.6, contested).** The sovereign risk
  premium is a floor under everybody else's borrowing costs. It passes the
  **risk premium, not the yield** — the yield also contains the expected policy
  rate, which arrives separately through `policy_rate_demand`. And it is
  **one-sided**, because every cited estimate is a *ceiling*: coded two-sided it
  created a loop with no counterpart in `bubble` (debt below baseline → negative
  premium → subsidised borrowing → more investment → more revenue → less debt),
  which pushed the bubble's year-3 inflation from 2.97% to 3.04% and broke that
  scenario's design promise. A cheap sovereign does not hand its companies a
  discount; it stops charging them a penalty.
- **`DEBT_AVERAGE_MATURITY_YEARS` (7.0, strong).** The whole stock used to
  reprice every month. Only the maturing slice does.

**Acceptance, partly met, and I am reporting the miss.** The brief's exact pair
— tax +4pp versus spend +2pp — differs by **8.0pp** of debt at m48, not >15pp.
That is arithmetically hard for those two moves *because of L2*: +4pp of tax
collects ~+2.4pp at the resulting gap. More importantly they are the wrong two
levers. The scenario's actual decision is now between consolidating the primary
balance and cutting the **cost** of the debt, and there the spread is 25.7pp
and one arm survives:

| policy | debt m48 | outcome |
|---|---|---|
| nothing | 175 | DEBT CRISIS m71 |
| austerity, tax +4pp | 165 | DEBT CRISIS m82 — delayed, not avoided |
| rate to the floor | 157 | survives, at 5.1% inflation |
| both | 150 | **survives**, inflation 2.3 |

**You cannot consolidate your way out.** That is a real lesson and it was not
there before.

### A consequence: one of `docs/11`'s results was an artefact

"Debt is the *second* fastest thing to respond to a rate cut, and almost nobody
expects that." Nobody expects it because it is not true — it was the whole
stock repricing monthly. Debt at 12/48 months after a 1pp cut: −1.14/−7.45
before, **−0.21/−4.25** now.

## M3. Two of the invisible shocks

**`bank_wobble` is now state-dependent**, on the credit gap — the model's own
fragility gauge, the one `crisis_prob` already reads, rather than a new one:

| state | credit gap | capital → min | d(output) |
|---|---|---|---|
| `calm` | 0.0 | 13.00 → 12.01 | −0.28pp |
| `bubble` m36 | 10.5 | 13.32 → **9.83** | −0.73pp |
| `bubble` m96 | 14.5 | 12.95 → **8.94** | −0.93pp |

In a stretched system it now takes capital **below `BANK_CAPITAL_MINIMUM`**,
arming the quantity leg of the doom loop for the first time. Baron, Verner &
Xiong: bank distress without a preceding boom mostly passes; after one it
predicts severe outcomes. **The state-dependence is the lesson**, and it is
another reason the credit gap is the gauge worth watching.

**`confidence_slump` is deleted, not inflated.** Re-measured at the top of
`CONFIDENCE_INDEP_PREDICTIVE`'s contested [0, 0.2] range: **−0.336pp**, against
−0.168 at the central value. Its confidence leg is folded into `export_slump`,
which is the faithful representation of research pass 2's own conclusion —
confidence is ~80% an echo of fundamentals, so it belongs attached to a shock
that has fundamentals behind it. `test/events.test.js` now enforces a standing
bar: **no event may be invisible to the player.**

---

# SECTION 4 — VALIDATION

## V1. Historical episodes — and the finding that dominates this report

`test/episodes.test.js`. Four episodes, actual policy paths, arcs asserted in
bands. **Five assertions pass. Five are recorded disagreements with measured
numbers. Nothing was tuned.**

| episode | model | reality |
|---|---|---|
| **US 2008–12** | u +0.32pp to 5.13% @m10; output −1.86% of trend; inflation low 2.26%; **debt 64 → 60** | +5.0pp to 10.0% @m22; −5 to −7%; −2.1%; 64 → 100 |
| **US 2021–23** | inflation still rising at m40, at **36.8%**; 14.1% at m32 | peaked 9.1% @m18; 3.1% at m32 |
| **UK 1979–83** | peak 20.4% at **m60**; 13.7% at m48; u +0.50pp; sacrifice ratio **0.29** | 21.9% @m13; 4.6%; u +6.5pp; Ball: 2–4 |
| **Japan 1995–2005** | inflation <0.5% in **2 of 120** months; 3.95% by m60; debt never above 90 | most of the decade; debt past 150% |

What *does* pass is worth having: the policy shapes are right, QE keeps working
after the rate dial stops, low credibility genuinely makes disinflation more
expensive (kappa on its unanchored branch within six months), and —
**`BOND_YIELD_FOREIGN_MULTIPLIER` is finally tested**, which is the entire
reason that parameter exists and nothing had ever exercised it. At 140% of GDP
the yield is **2.70%** with 7% held abroad and **5.15%** with 75%.

### THE ONE FINDING UNDERNEATH ALL FOUR

The model does not disinflate gradually. **It either stabilises or diverges,
with a knife-edge between them.** From 8% inflation and 7% expected, moving the
rate in one step:

| rate | inflation at m60 |
|---|---|
| 5% | 471.7% |
| 7% | **217.6%** |
| 9% | **0.69%** |
| 15% | −4.00% |

**Two percentage points of policy separate hyperinflation from success.** And
the *path* to a destination flips the outcome as surely as the destination:

| 15% reached over | inflation at m36 | at m60 |
|---|---|---|
| 0 months | −2.16% | −4.00% |
| 12 months | 4.13% | −4.00% |
| 18 months | 12.12% | 5.93% |
| 24 months | **37.53%** | **250.03%** |

**The mechanism.** Demand responds to the real user cost; expectations are
formed entirely from realised inflation; the transmitted rate takes about three
years to arrive. So `expected_inflation` responds to inflation faster than
`policy_rate_demand` responds to the dial, the real rate moves the **wrong way**
when inflation rises, and the loop is positive unless the nominal move clears
the whole distance at once. Credibility compounds it: it falls only on realised
misses, so it collapses exactly when it is most needed (0.851 → 0.000 by month
29 in the 2021 episode) and quadruples kappa on the way down.

This is `docs/07` L6's defect class — a discontinuity inside the range the
player occupies — at the largest scale it appears anywhere in the model.

## V3. Policy paths

`test/paths.test.js`, 5 tests, all passing.

- **The round trip returns the stance to 0.000000000 exactly.**
  `investment.js`'s claim that scaling the *stance* rather than the *increment*
  prevents a ratchet is correct and is now locked in.
- **The residue is genuine hysteresis, and `docs/11`'s open question is
  answered.** Run to 240 months: the capital stock and potential output stay
  permanently higher while the output *gap* decays. Six months of cheap money
  got capital built, and a stock that has been built does not un-build.
- **A stop-go cycle that looks symmetric is a persistent easing.** This is the
  trap my own first test walked into, and it is the same trap the game sets for
  the player: alternating −1pp/+1pp on a twelve-month cycle leaves the dial a
  point below baseline *half the time*. Average stance −0.5pp, transmitting to
  −0.407pp, opening the credit gap +5.1pp over eight years. The increments
  cancel; the level does not.
- **Hike-hold-cut is not free in jobs.** Firing is 2.4× faster than hiring, so
  the cumulative unemployment cost exceeds the cumulative gain.

---

# SECTION 7 — ENGINEERING

## E1. `tools/lint.mjs`, wired into `npm test`

Five zero-dependency static checks, each naming the finding it prevents:

(a) every `s.<field>` a rule reads exists in `newState()` — `docs/07` M11;
(b) no `Math.random` in `src/`;
(c) no bare `/ 12` outside `units.js`;
(d) no rule assigns to a `PIPELINE_TARGETS` field — `docs/07` L1;
(e) **no rule reads a DIAL where a transmitted driver exists** — L3 and L5 above.

**Verified against a negative control**: a deliberately defective rule
containing all five mistakes is caught with all five messages.

Check (e) found four dial reads. Three are legitimate and now carry a declared
`// lint-allow-dial:` reason — bond markets pricing the announced rate path,
money demand as a portfolio choice, and voters resenting the announced tax rate
rather than the effective one. **Markers are enforced in both directions**, like
`parameters.py`'s `DEFERRED`: a marker on a line that no longer reads a dial is
itself a failure.

The fourth is a real defect, recorded not fixed:

**`credit.js` reprices the entire PRIVATE debt stock instantly** —
`private_credit * (policy_rate + credit_spread) / 100`, the dial, the whole
stock. Exactly the error the government's interest bill carried until this pass.
Every mortgage and corporate loan is floating-rate with no lag, so the default
rate responds the month a rate move is announced. The asymmetry is now visible
and odd: the state refinances over seven years while its households refinance
overnight. Fixing it needs a private-debt maturity parameter with its own source
— the fixed/floating mix differs enormously across countries, which is most of
why 2022 hurt the UK and Australia far more than the US.

---

# WHAT I DELIBERATELY DID NOT BUILD

**Section 5 (depth) and Section 6 (the game).** Not for lack of time, and I
want to be precise about the reason.

The brief's own gate says: *"Do not start Section 5 until [V1 and V3] are
green."* V1 is emphatically not green. It is a wall of measured disagreements
with one common cause, and that cause is **the absence of a forward-looking
expectations channel** — which is precisely what Section 5 proposed to build.

That looks like an argument *for* building it, and it is — later. It is an
argument against building it *now*, for one reason: **an announcement effect
bolted onto a process that diverges under the real Volcker path would be
decoration on a defect.** The 1979 episode is the clearest case. A 17% MLR
against 16.8% expected inflation is a real rate of roughly zero, so the model
correctly reads Howe's budget as barely contractionary. What made it
contractionary in fact was an announced regime change that moved expectations
ahead of the outturn — and if you add that channel to a model whose expectations
loop is *already* positive and knife-edged, you will get a mechanism that
appears to work because it is papering over the instability rather than fixing
it. You would then have tuned an announcement coefficient against the episode
tests, which is rule 3.

**The order I would now recommend, and it is different from the brief's:**

1. Fix the expectations/transmission instability. It is one finding with one
   acceptance test already written (`test/episodes.test.js` → *"a bifurcation
   in the playable range"*). Likely candidates: a forward-looking term in
   `updateExpectations` so the real rate can move the right way; credibility
   responding to the policy *stance* and not only to realised misses; and
   possibly a faster demand-side transmission, though that one should be
   measured before it is assumed.
2. *Then* Section 5, on a stable base, where the announcement channel can be
   coded small and gated as the forward-guidance puzzle requires.
3. Then Section 6.

I also did not build **V2 (Monte Carlo)**, **V4 (IRF paths in `docs/11`)**,
**V5 (step-size)** or the **Section 7 interface work**. V2 in particular is
worth doing next after the stability fix, and it would now be much more
informative: with a knife-edge in the playable range, a Monte Carlo over the
joint parameter distribution would tell you what fraction of the space is on
the divergent side, which is a question this model badly needs answered.

---

# WHAT I THINK IS WRONG IN THE BRIEF

The brief measured nine things and read everything else, and it was right about
the reading almost everywhere. Five places it was not:

**1. The brief's model for fixing L3 was itself defective.** It says to ramp
crowding out "on the same band and the same driver as `monetaryEasingScale`,
which correctly ramps". `monetaryEasingScale` ramps over the band but reads the
**dial**, so following that instruction literally would have reproduced the
instantaneity half of the bug in the fix for it. That is L5, and it was the
larger of the two.

**2. The Section 2 acceptance criteria mix two baselines.** "Trough in
[−6,−15]% of output" and "output at month 60 still below the pre-crisis trend by
roughly the scar" are measured against different things, and if you read both
against the same baseline — which every measurement in `docs/11` and in the
brief did — they are mutually contradictory, because the permanent loss is
deeper than the trough. This is the same class of error the section is about,
one level up.

**3. L4's diagnosis is half right.** "The model has no output→employment lag at
all" is true of the peak months, but `docs/02` Asymmetry 2's actual words are
"firms fire in **weeks** and hire over quarters", and the model does fire in
weeks and does have the jobless recovery. What is missing is the *decision* lag,
which is a narrower and more defensible claim. And the `[12]`/`[18]`/`[24]`
brackets are reduced forms that rule 4 forbids importing.

**4. M2's prescription would not have fixed `debt_trap`.** All three candidates
the brief offers are scenario-level changes. The actual cause is model-level:
`yield_10y` is read in two places, neither of them in the private economy. Any
of the three would have produced a scenario that moves without producing the
mechanism that makes a debt trap a trap.

**5. The brief's overall priority is inverted by its own instrument.** Sections
1–3 are eight lesson-level defects, all real and all now fixed. Section 4 V1 is
listed fourth. But V1 is the only item that could have found the bifurcation,
and the bifurcation is larger than all eight put together — it is why the model
cannot reproduce any historical episode, and it makes several of the magnitudes
in Sections 1–3 provisional. If I ran this pass again I would build the episode
tests **first**, before touching anything, and let them order the work.

One smaller thing: the brief's L2 numbers do not reproduce exactly (it reports
+2.296/+2.006/+1.817/+1.625; I get +2.298/+2.061/+1.962/+1.847 labelling rows by
achieved gap, and +1.950/+1.703/+1.401 labelling by nominal shock size). The
*finding* reproduces under both readings — revenue rises at every gap, the
gradient is real, the sign never turns — so I did not chase the difference
further.

---

## Reading order for whoever is next

1. `test/episodes.test.js` — the last two tests. Everything else is downstream.
2. This file, Section 4 V1.
3. `docs/11-cause-and-effect.md`, regenerated.
4. `docs/10-state-of-the-project.md`, which needs updating against all of the
   above and has not been touched in this pass.
