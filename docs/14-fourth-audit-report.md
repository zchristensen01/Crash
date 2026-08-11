# 14 — Fourth audit: Phase 5, and what verifying Phases 0–4 turned up

> **This is the report `docs/13` asked for.** It covers one session: verifying
> the fourth audit's own work, then Phase 5 (5.2, 5.3, 5.5, 5.6 built; 5.1
> still blocked; 5.4 already done). `docs/13` is the plan and carries an "As
> built" block under every task; `TASKS.md` is the checklist; `open_items.md`
> is everything not fixed. This file is the argument.
>
> **Ranked by severity, and the inversions come first.** Every number here was
> measured on the tree, and every claim carries the command that reproduces it.
>
> Suite at the end of this pass: **162 tests, 146 pass, 0 fail, 16 `todo`**
> (was 160/143/0/17 — 5.2 closed one and added two). lint clean at six checks,
> `index.html` current, `docs/11` current and re-stamped, steady state exact to
> nine decimals, divergence guard green. 144 parameters.

---

## 0. WHAT INVERTED A LESSON THE GAME EXISTS TO TEACH

**All three are the same defect: a document still teaching the model Phase 2
and Phase 3 removed.** None is in the code. Every one would have been read by
the next person as a current statement about the model.

### 0.1 `docs/11` §5 said the Taylor rule LOSES `stagflation`. It wins.

The operator's manual's preset table read **HYPERINFLATION in both columns at
24 months** — do nothing, or follow the rule, and the economy dies either way.
That is the exact opposite of what 2.4 established.

```
node tools/cause-effect.mjs | sed -n '/stagflation — Taylor/,/^$/p'
```

| | m24 | m48 | m96 |
|---|---|---|---|
| the document said | **HYPERINFLATION** | — | — |
| measured | OVERH 18.5% | STAGF **7.8%** | **GOLDI 2.9%** |

The rule wins, peaking at 20.3% in month 16, and it costs 128% of GDP of debt
and a term of approval to do it. **A player reading that table would conclude
the benchmark is unbeatable in the one scenario built to show that a
sufficiently determined central bank beats inflation.** Rewritten, with what
changed it (the A1 transmission split and 2.4's derived ceiling) and what it
costs.

### 0.2 `TAYLOR_INFLATION`'s note and `docs/02` both said raising the coefficient "does not work anyway". It works.

Both cited *177.62% at m48 against 242.34%*. **Both figures were measured while
transmission was still broken and the dial ceiling was 20** — the economy
hyperinflated either way, so the comparison was between two failures and could
not show a coefficient doing anything.

| `TAYLOR_INFLATION` | total response | `stagflation` @m48 | @m96 |
|---|---|---|---|
| 0.50 (as built) | 1.50 | 7.12% | 3.15% |
| 1.00 (top of range) | 2.00 | **3.24%** | **1.42%** |

The conclusion — leave it at 0.5 — is still right, and the *reason* had to be
replaced. It is not that the coefficient is powerless; it is that the defect
was structural, fixing the structure fixed it, and moving a sourced coefficient
to cover a structural error is rule 4. **That argument is stronger than the one
it replaces and it does not expire.**

### 0.3 `docs/11` §7 still called the closed bifurcation "THE BIGGEST HOLE".

2.6 flipped that test from a failing `todo` to a passing assertion and
`docs/12`'s largest finding closed with it. §7 still described it as the
dominant open problem and quoted the 8–9% knife-edge (it is 6–7%). Replaced
with what is actually the biggest hole — the demand block, `open_items` A2 —
and with the crash arc re-measured (`−8.95 / +1.85pp / −6.23%` against a stated
`−8.96 / +2.07 / −9.98`).

---

## 1. WHAT I FOUND WRONG

### 1.1 The capital law of motion treats a share as a level — `open_items` A5

**The biggest model defect found in this pass**, and it was found by wiring a
dead field that had been sitting in `START` since the model was written.

`supply.js:25` adds `annualToMonthlyFlow(s.investment)` to `capital_stock`.
`s.investment` is a **percent of potential output** — this project's stated
convention for every flow, written at the top of `state.js`: *"potential_output
is the only level."* `capital_stock` is a level. So the investment flow feeding
the capital stock is **frozen at its month-zero value** while potential output
grows away from 100.

Three quantitative predictions follow, and all three land:

| prediction | measured |
|---|---|
| K converges to a CONSTANT `I/δ` = 22.5/0.065 = **346.15** | **346.154** at m2400 |
| growth decays to `gA = g·(1−α)` = **0.930%** | **0.9345%** at m1200, still falling |
| K/Y falls without bound from 3.0 | 2.89 (m96) · 2.66 (m240) · **2.05** (m600) |

```
node -e "import('./test/harness.mjs').then(h=>{const w=h.world({});h.advance(w,600);
  console.log(w.s.capital_stock/w.s.output, w.s.gdp_growth_annual)})"
```

**The isolating experiment**: change the line to
`annualToMonthlyFlow(s.investment / 100 * s.potential_output)`. Growth returns
to **1.493%**, K/Y to **2.83**, and the steady state stays exact to nine
decimals — so the repair is compatible with the gate.

**Why nothing caught it, and this is the part that generalises.**
`test/steady-state.test.js` checks `output_gap` (a ratio), `inflation` (a rate)
and `consumption` (a percent of potential). **All three are invariant to this
defect, because output and potential drift together.** The gate that exists to
catch drift cannot see a common drift in the level. And the model had no
real-growth number anywhere for anyone to look at — which is precisely what the
dead field was.

A second defect sits under it: `test/params.test.js`'s identity check hardcodes
`0.06` against `DEPRECIATION_RATE = 0.065`, so the share that holds K/Y
constant is **24.0**, not 22.5. A bare literal in a test — the class check (f)
polices, and (f) does not cover `test/`.

**Not fixed**, deliberately: see §3.1.

### 1.2 The most important number in `docs/02` has been wrong since 3.1 — Correction 12

`docs/02` calls the transmitted Taylor response *"the most important single
fact about this model's dynamics"*. It is **1.96**. The document said 1.83 and
`TAYLOR_INFLATION`'s note said 1.80.

```
node --test test/transmission.test.js 2>&1 | grep "stagflation m3"
```

Bisected by checking out each commit, regenerating `params.js` and re-running:

| commit | | transmitted | real rate felt @m12 |
|---|---|---|---|
| `aa8febc` | 2.3, which recorded it | 1.80 | −2.21% |
| `07342c0` | carry-forward | 1.83 | −2.03% |
| `4fa7a9a` | **3.1, asset units** | **1.96** | **−1.77%** |

**Two separate failures.** 2.3 and the carry-forward commit disagreed with
*each other* from the moment both were written — one measurement, two numbers.
Then 3.1 moved the real value and neither was updated, and **Phase 4, whose
entire job was "re-measure everything" and which is recorded as a green HARD
GATE, went straight past.** The brief written for the next auditor then carried
1.83 forward as fact.

`test/transmission.test.js` prints the live value on every run and asserts only
`> 1.0`. **A test that prints a number does not test the number written down
somewhere else.**

### 1.3 `docs/11` was far more stale than its fingerprint could show — Correction 13b

4.3 regenerated §2's six dial tables, stamped a fingerprint over all 1464
measured numbers, and wired `--check` into `npm test`. `open_items` B1 recorded
that §1 and §3–§7 were unchecked. **What B1 did not say is that three of them
taught the opposite of what the model does** (§0 above), and that one had never
been regenerated at all:

```
git log --oneline -L 58,64:docs/11-cause-and-effect.md    # one commit: the one that created the file
```

**§1's kernel table predates the whole fourth audit.** It read
`0.01 / 0.05 / 0.48 / 1.00` for the share of a rate cut the real economy has
felt at 1 / 3 / 12 / 48 months — the pre-2.1 model, where the rate rode
`rate_to_investment`, an impulse response *of investment*, mean lag 14.74
months. Measured: **`0.05 / 0.50 / 0.93 / 1.00`**. The sentence under it —
*"the real economy is half way there at a year and still finishing at three.
That gap is the single most important thing the game has to teach"* — described
a defect that had been fixed dozens of commits earlier.

All of §1 and §3–§7 rebuilt and re-stamped (`86c1b104fab5561d`). **`open_items`
B1 is closed.**

### 1.4 `open_items.md`'s own headline table had cells that were never measured

The document whose header reads *"Where a number is quoted it was measured, not
read"* had two wrong cells in **A2, the pass's central finding**:

```
node --test test/episodes.test.js  2>&1 | grep -o "sacrifice ratio [0-9.]*"
node --test test/validation.test.js 2>&1 | grep -o "model [0-9.]*, literature 2-3"
```

| | said | measured |
|---|---|---|
| UK 1979-83 sacrifice ratio | 0.38 | **0.35** since 3.1 (0.38 was the 2.5 value) |
| `TAX_SHOCK_TO_GDP` | 0.46 | **0.487** since 3.1, 0.492 before |

0.46 matches no commit anywhere in this pass. **The finding is unharmed** —
every cell still misses its literature by the same order — **which is exactly
why nobody re-ran them.** Four more stale numbers were found inside live `todo`
messages, which `report.mjs` publishes verbatim into `TEST-RESULTS.md`;
`crisis.test.js` stated one measurement as 3.22% in one message and 3.65% in
the next (measured: **3.6468%**), and cited
`CRISIS_IMPULSE_AMPLIFICATION = 2.196` — the value 4.1 explicitly *rejected*.

### 1.5 5.2's defect was two defects, and the plan names the smaller one

`updateDefaults` computed the debt-service burden as
`private_credit * (policy_rate + credit_spread) / 100`. The plan describes this
as a maturity problem. It is also a **dial read** — a docs/12 L3 violation,
living under a `lint-allow-dial` exception whose stated reason was entirely
about maturity. Decomposed by rebuilding each stage:

| | Δdefault rate, month 1, after a 3pp hike | |
|---|---|---|
| as built — the dial, the whole stock | **0.67538pp** | |
| the transmitted rate, the whole stock | **0.03160pp** | the dial read was **21x** |
| the transmitted rate, a 3-year stock | **0.00125pp** | maturity a further **25x** |

**540x in total, and the plan would have bought 25 of it.** Fixing only the
maturity leaves the burden answering the announcement rather than the
transmission: every loan still repricing in one month, just three months later.

### 1.6 The brief's literal counts are out by a factor of eight — Correction 14

D3 was flagged read-not-measured in Phase 0 and the plan said to use the
check's number. Here it is: **84 raw occurrences, 71 actionable** across 11
files, now zero.

| file | brief (D3) | measured |
|---|---|---|
| `credit.js` | 23 | 21 |
| `prices.js` | 16 | 10 |
| `crisis.js` | 16 | **2** |

### 1.7 `CREDIT_GAP_CRISIS_THRESHOLD`'s note named a repair that would have been a unit error — Correction 15

The note ended *"Also serves as `leverage_max` in the asset-price fire-sale
term."* It never did, and **the two could not have been the same number under
any wiring**: `CREDIT_GAP_CRISIS_THRESHOLD` is 9 **percentage points of
credit/GDP above trend**; `leverage_max` is a **dimensionless debt-to-collateral
ratio**. Taking the task's "wire it" branch would have set a leverage gate to
9.0 — unreachable — and it is B2's error again: two quantities with the same
feel and different units.

### 1.8 The registers had two blind spots, and both were occupied

- **`HAND_TO_MOUTH_SHARE` was read in exactly one place, inside a
  `trace.record` call.** Printed, never multiplied by anything — satisfying the
  `DEFERRED` register's grep while doing no work. Measured before changing
  anything, it is the *only* parameter in the model read solely inside a trace.
- **Nothing covered `START` at all.** `DEFERRED` guards `P` entries; a
  starting-vector field could be carried, documented in `docs/01`, and read by
  nothing with no test noticing. **Four of START's 36 fields were dead**, and
  task 5.6 names two of them. `current_account` and `fx_change` were found by
  counting.

---

## 2. WHAT I BUILT, AND WHY THAT SHAPE

### 2.1 Private debt maturity: `market_rate`, not a second definition of one

`PRIVATE_DEBT_REPRICING_YEARS` = 3.0, [1.0, 8.0], `weak`, with a new state
field `private_debt_rate` walking toward the new-business rate exactly as
`average_coupon` walks toward `yield_10y`.

**The obvious alternative was `policy_rate_demand + credit_spread`** — the
strict textual analogue of the line being replaced. It is worse for two
reasons: it would give the same borrowers two different borrowing rates in
adjacent rules, when `updateInvestment` sets `market_rate` one rule earlier and
`updateCreditGap` already reads it as what borrowers pay; and it would silently
exclude QE relief, which reaches a household exactly by letting it refinance.

**The range is the cross-country spread, not an estimation interval**, and the
confidence says so. A sweep over [1, 8] is a sweep over *which country is
this* — which is most of why 2022 hurt Australia and the UK more than the US.
Pretending to a tighter interval would have been a fiction of precision.

**The `todo` became a passing assertion, and its old bar was not restored.** It
demanded `|Δdefault| < 1e-4` on impact — effectively zero — which asserts that
*no* private debt is floating-rate. Some of it is; that is the entire content
of the parameter, and asserting zero would be asserting a different error. What
is asserted instead is the shape the maturity structure produces (impact is
0.19% of the five-year response; the burden at three years is 2.30x the burden
at one) **plus the experiment that isolates it**: set the repricing time to one
month and the impact response comes back 25.4x.

### 2.2 Lint check (f): three ways to satisfy it, and 12 promotions chosen by what they decide

The check offers a `P.*` parameter, an UPPER_SNAKE name whose comment says
`judgement`, or a declared `// lint-allow-literal:` exception — the plan's own
triage. Enforced in both directions like `lint-allow-dial`.

**Everything promoted decides a gate or an ending**, which is the priority the
plan sets. `updateCrisisRisk` — the function that decides whether the game's
central event fires, and whose output 6.6 wants on screen — had *every number
in it bare*. Worth stating plainly: `CRISIS_PROB_PER_SD_CREDIT` is sourced and
quoted **per standard deviation**, and the size of one SD was an undeclared
`6.0`. That does as much to the crash meter as the sourced coefficient does,
since halving it doubles the probability at any gap.

**The find is `DEFAULT_RATE_BASELINE`: the same `1.0` in five places** — the
baseline default term, the zero point of the spread's loans-going-bad term, the
zero point of write-offs, `newState`'s opening `default_rate`, and
`loan_losses_ss`. The whole *"only losses ABOVE normal times eat bank capital"*
design requires all five to agree, and nothing said so.

**And the check nearly missed it.** The allow-set initially compared strings,
so `1.0` and `1` looked like different numbers. Comparing numerically is
obviously right — a check that flags one spelling and not the other is a check
nobody trusts — and it also made this coefficient invisible. **A coefficient
whose value happens to be one is still a coefficient.**

The other ~46 are named locally with `judgement`. That is not a lesser outcome:
labelling `SPREAD_W_LEVERAGE = 0.8` as judgement says something true and
useful — four of `updateCreditSpread`'s six terms are judgement and two are
sourced, and that spread is inside `market_rate`, which is what every borrower
pays. Promoting them would have meant inventing ranges.

**Behaviour-neutral, measured rather than asserted**: all six scenarios × 96
months × 22 state fields byte-identical to 15 significant figures, and
independently confirmed by `docs/11`'s fingerprint not moving. A refactor of
this size that changed one number would be very hard to find later, which is
why it was checked as a diff rather than as a suite pass.

### 2.3 Two registers tightened, and a third built

- **`DEFERRED` now strips `trace.record(...)` and `trace.note(...)`** by paren
  matching before deciding what counts as a read — the same carve-out lint
  checks (e) and (f) already make. The plan's warning was heeded:
  `RATE_PASSTHROUGH_TO_BORROWERS` and the `SS_*` anchors are untouched, because
  they are consumed in `parameters.py` and were never read from `src/` at all.
- **`START_DEFERRED` is new**, enforced in both directions by
  `test/params.test.js` exactly as `DEFERRED` and `SOLVED_FROM_MODEL` are.
- **`FIRESALE_LEVERAGE_TRIGGER`** gives the fire-sale gate its own number, so
  the false note could be corrected without wiring the wrong parameter to it.

**The first version of the START test was wrong and the failure is worth
keeping.** It counted mentions — but START's keys are *spread* into `s`, so a
field that is never explicitly assigned appears exactly once, as its only read.
It flagged `capital_output_ratio`, `labour_share` and `term_premium`, all three
properly wired. Wired now means *read somewhere, or assigned by something*.

### 2.4 `gdp_growth_annual`, wired from the expression that already existed

`pushHistory` computes `yoyGrowth(h.output)` into `history.growth` every tick,
and the state field sat frozen at its START value one line away — two
representations of one quantity, one of them never updated. Assigned from the
history so there is one source, the way `updateConsumption`'s bounds are taken
from `invariants.js`. It reads 0 for twelve months by construction, which is
honest: there is no year-on-year growth rate until there has been a year.

**That one line found §1.1.**

---

## 3. WHAT I DELIBERATELY DID NOT BUILD

### 3.1 The capital-units fix

It is a two-word change and I have measured what it does. **It moves potential
output in every scenario, so it moves every measurement in this audit** — the
six starting vectors, all of `docs/11`, `CRISIS_IMPULSE_AMPLIFICATION` (solved
against a trough measured relative to potential), and `investment_share`
itself, which must be re-derived from 22.5 to **24.0** once
`DEPRECIATION_RATE = 0.065` is used instead of the test's hardcoded 0.06.

That is a Phase-3-sized task with its own gate, not a line inside 5.6. Shipping
it here would have meant a commit whose stated scope was "wire two dead fields"
and whose effect was to invalidate the audit's measurements. Recorded as A5.

### 3.2 5.1, still

Blocked on A4 exactly as handed over, and I did not attempt a workaround. The
mechanism is right, the arithmetic works and the steady state closes — and with
no Fisher term in `updateBondYield` the interest bill *falls* in an inflation,
so recycling it hands households less income exactly when inflation is highest.
Measured last pass: `overheating` stopped hyperinflating. **A lesson inversion
is not a smaller problem than a missing income term.** A4 first.

### 3.3 Promoting the credit-spread weights

Four of `updateCreditSpread`'s six terms are judgement. I labelled them and did
not promote them, because promoting means inventing a range and this project's
whole claim is that it does not. Recorded as E5, with the observation that
makes it matter: that spread is inside `market_rate`, and since 5.2 it also
sets the rate the entire private debt stock walks toward.

### 3.4 Extending check (f) beyond `src/rules/`

`leverage_max`'s bare 1.35 escaped 5.3 because check (f) walks `src/rules/`
only. **254 undeclared literals sit outside that scope** — `ui/chart.js` 53,
`game/scenarios.js` 49, `game/indicators.js` 42, `invariants.js` 21. Most of
`ui/` is presentation and should stay out. The two that matter are
`scenarios.js`, which is DATA the model is calibrated against, and
`invariants.js`, which holds the bounds `updateConsumption` and
`updateInvestment` duplicate on purpose. Extending it needs a scope decision
and a triage the size of 5.3's. Recorded as E6.

---

## 4. WHAT IS WRONG IN THE DOCUMENTS

### 4.1 In the brief

- **The transmitted Taylor response is 1.96, not 1.83.** The brief's own
  spot-check number is stale, inherited from `docs/02`.
- **`TAX_SHOCK_TO_GDP` is 0.487, not 0.46**, and the UK sacrifice ratio is
  **0.35, not 0.38** — the brief's A2 summary carries `open_items`' stale cells.
- **D3's literal counts are wrong**, `crisis.js` by a factor of eight. The plan
  already flagged them; now they are measured.
- **"5.2's new parameter is the STOCK repricing speed"** understates it. The
  dial read was 21x of the defect and the maturity 25x; a repair that fixed only
  the stock would have left the burden answering the announcement.
- **"5.6 — wire or defer `participation` and `gdp_growth_annual`"** names two of
  four dead START fields.

### 4.2 In `docs/13`

- **Correction 12's class was not anticipated anywhere.** The plan built three
  tripwires for generated artefacts and none for a number re-typed into prose,
  and every defect in §1.2–§1.4 is in prose.
- **Phase 4 is recorded as a green HARD GATE and it was not one.** *"Re-measure
  everything"* passed over a wrong number in `docs/02`'s headline section, a
  `docs/11` section that had never been regenerated, and an `open_items` table
  written the same week. The gate checked that the tests pass; it did not check
  that the documents say what the model does.
- **5.5's task text — "wire it or correct the note" — offers a repair that
  cannot be right.** Recorded as Correction 15, because the wrong branch is the
  one a hurried reader takes.

### 4.3 In `open_items.md`

- **A2's table was read, not measured** (§1.4), in the document that promises
  the opposite. Corrected, and the correction is left visible rather than
  silently patched.
- **A1's numbers were two revisions behind.** The `bubble` credit gap is now
  9.16 / 11.65 / 11.05 / **7.08**, peaking at 11.98 in month 58 — 5.2 moved it
  up again, because a slower debt-service leg means the credit loop's balancing
  counterpart arrives later and the boom runs longer. The shape is unchanged:
  it still peaks and unwinds inside the term, which is the inverse of the design.
- **B1 understated itself** and is now closed (§1.3).
- **B5's instruction "do not invent a different wiring" was right** and is now
  enforced by carrying the recipe into the parameter's own `DEFERRED` entry, so
  it travels with the parameter rather than only with that file.

---

## 5. THE ONE-SENTENCE VERSION

Every generated artefact in this project has a `--check` and every number
re-typed into prose has none — so the code is now in better repair than the
documents that describe it, and this pass spent more effort correcting
statements about the model than changing the model. The exception is
`open_items` A5, where a field that had been dead since the model was written
was wired in a two-line change and immediately showed that the economy's
capacity has been growing at 0.93% a year while every document says 1.5%.
