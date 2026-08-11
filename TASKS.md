# TASKS

Tracker for the fourth audit. Full detail, reasoning and acceptance criteria:
**`docs/13-fourth-audit-plan.md`**. Source brief: `4th-audit-brief.md`.

**Anything found and NOT fixed, not finished, or not understood is in
[`open_items.md`](open_items.md)** — concerns, deliberate omissions, things a
later phase must re-verify, and tooling hazards. Read it before trusting a
number from any document.

`[ ]` todo `[~]` in progress `[x]` done `[-]` deliberately not doing

---

## Phase 0 — Verification

- [x] Reproduce Part 0 (200 calm ticks, zero drift)
- [x] Reproduce the Section A decomposition table (28 cells)
- [x] Verify A1 kernel mean lag, A2 dial ceiling, A3 effective response
- [x] Verify B1 divergence, B2 asset units, B3 unbounded consumption
- [x] Verify D1 interest income, and the D2/D3/D4/D5 code claims
- [x] Record corrections to the brief (3 found, 1 reorders the work)

## Phase 1 — Guards and the silent truncation

- [x] 1.1 Divergence guard: no state variable may diverge over 480 ticks
      `test/divergence.test.js`, 2 `todo` tests, both failing until Phase 3.5.
      43/87 permanent dial settings diverge; 2 through the undeclared bubble
      loop, isolated by switch-off. See docs/13 Corrections 4 and 5.
- [x] 1.2 Make the autopilot clamp and the dial max agree, and assert it
      `test/autopilot.test.js` asserts the achieved rate stays in the dial's
      range and reaches both ends. Behaviour-neutral: 0.00e+0 path difference
      across all six scenarios. See docs/13 Correction 6. NOTE: 1.3 revised
      the implementation — the bound now lives ONLY in `applyDialChange`.
- [x] 1.3 Report when a dial request is truncated
      `s.dial_truncated` + `s.dial_truncated_count` + a trace note, written
      only by `applyDialChange`. Measured: the Taylor rule is refused in 87/96
      months of `stagflation` (ceiling) and 30/96 of `recession` (the ELB).
- [x] 1.4 Delete the asserted defeat in `autopilot.js:14`
      Replaced with the isolating experiment and pinned by a test. Ceiling 20
      -> 242.34% @m48; ceiling 40, shock unchanged -> 7.48%. Uncovered
      **Correction 7**: Phase 0's Correction 1 table was measured through the
      hidden 25 clamp, so every "dial max 40" row in it is wrong. 2.4 must not
      use it.

### Phase 1 verification (after the fact)

- [x] V1 `index.html` staleness guard — `tools/build.mjs --check`, wired into
      `npm test`. `test/bundle.test.js` was running a bundle three commits
      behind `src/` and passing.
- [x] V2 The truncation trace note never fired for a PLAYER move — the engine
      cleared the record at the start of the tick, before `trace.note` saw it.
      Cleared at the END now; test covers both movers.

## Phase 2 — Section A: the transmission lag

- [x] 2.1 Split the rate lag from the investment-response lag
      `rate_to_borrowing_cost` kernel (3m peak) + partial adjustment in
      `updateInvestment`. New params `RATE_PASSTHROUGH_TO_BORROWERS`,
      `INVESTMENT_ADJUSTMENT_SPEED`. Knife-edge moved from 8–9% to 6–7%;
      investment IRF peak 13 -> 9 months, matching the published value;
      stagflation 242.34% -> 29.55% at m48. See docs/13 Correction 8.
- [x] 2.2 Re-measure the A-table from the model itself
      3 tests in `test/transmission.test.js`. Curve is monotone at all 29 grid
      points; threshold now brackets the Fisher point. **Correction 9**: the
      stated "second difference sign changes" criterion is grid-dependent and
      ranks the smoothest curve worst — replaced by steepest local
      sensitivity. Knife-edge -366.7 -> -149.2pp/pp (A1), -22.5 with the
      wealth channel off. Residual is Section B; `todo` until Phase 3.
- [x] 2.3 Record the effective transmitted Taylor response (0.37)
      Into `docs/02` (new section), `TAYLOR_INFLATION`'s note, and a test.
      2.1 moved it: **0.37 -> 1.80**, and it now clears unity. Real rate felt
      at m12 of stagflation: -14.50% -> -2.21%.
- [x] 2.4 Derive the dial ceiling
      `max: 20` -> `max: 50`, derived as a FIXED POINT over 360 runs with
      events on. **The Taylor rule now WINS stagflation**: 5.69% @m48,
      1.91% @m96, refused 0/96 — against 29.55% / 1020.91% / 86-96 at a
      ceiling of 20. Closes A4 by measurement.
- [x] 2.5 Re-run the four historical episodes and re-report
      All four `todo` messages rewritten against measured numbers. UK 1979-83
      is the big winner (peak m60 -> m11, against the UK's m13). US 2021 and
      Japan now point at the SAME missing mechanism from opposite directions.
      US 2008 untouched — it is a crash plus an easing.
- [x] 2.6 Rewrite OPEN #6's message — **it is no longer an OPEN**
      The bifurcation test flipped from failing `todo` to passing assertion.
      `docs/12`'s largest finding is closed, and by fixing transmission rather
      than expectations — the mechanism it named was wrong.

## Carried findings — things later phases must not rediscover

Recorded here and against the individual tasks. Nine corrections to the plan so
far; all live in `docs/13` as "As built" blocks under the task that produced them.

| # | correction | where it bites |
|---|---|---|
| 4 | E1 as worded can never be green — the model has levels that must compound and two loops that must diverge | 1.1, 3.5 |
| 5 | B1's attribution is right at 1.5 and wrong in general: the credit channel MOVES the divergence frontier by 0.638pp, it does not create it | 3.2 |
| 6 | A2's clamp inconsistency was behaviour-neutral (0.00e+0) — a lie the code told about itself, not a leak | closed |
| 7 | **Phase 0's own Correction 1 table is wrong** — every "dial max 40" row was measured through a hidden clamp at 25 | closed, but shows Phase 0 is not above re-verification |
| 8 | The plan's shape for A1 violates a rule `dials.js` already states (an effect size is not a driver) | closed |
| 9 | 2.2's acceptance criterion is grid-dependent and ranks the smoothest curve worst | closed |

**Two claims docs/13 flagged as READ, NOT MEASURED are still unverified:**
`credit.js:218`'s EMA comment (needed by **3.2**) and D3's numeric-literal
counts (needed by **5.3**). Neither has been checked. Do not quote either.

**The standing rule earned its place twice, and the second time it caught me.**
`docs/12` measured a real bifurcation and attributed it to the expectations
block; Phase 2 closed it by fixing transmission and never touched expectations.
Then **1.1's own comment named the wrong kink** for why `stability.test.js`
missed Section B — it cited the crash meter's thresholds, which gate a display
quantity, when the real one is `Math.max(0, credit_growth_annual −
nominalGrowth)`. Read from the source instead of measured, and it survived a
commit. 3.2 corrected it with the 4-operating-point measurement, which does not
depend on naming the kink at all. When you state a mechanism, state the
experiment that isolates it.

## Phase 3 — Section B: the asset–credit loop

- [x] 3.1 Fix the asset-price semi-elasticity's units
      **Option (a), and the arithmetic chose it, not me.** Option (b) needs
      `ASSET_PRICE_MEANREVERSION = 0.0852` against a published `[0.01, 0.05]` —
      70% outside, and outside at every point of the semi-elasticity's own
      range too. The rate now sets a TARGET deviation approached at
      MEANREVERSION; equilibrium equals the sourced semi-elasticity by
      construction.
      **The overshoot factor was `1 / (12 * MEANREVERSION)` — a number that does
      not contain the semi-elasticity at all.** The model's asset response to
      rates was set by the mean-reversion parameter, not by the elasticity that
      governs it. 4.59x at the central value; 9.2x at the bottom of the range.
      **This alone closed the divergence guard** (see 3.5). Seven downstream
      tests moved; all re-measured, none tuned.
      **OPEN, measured:** at 12 months the model delivers 0.94% of a 4.60%
      level response — the equity leg's source says "cumulative ~1yr" and
      housing's says 2–5yr, and a single mean-reversion speed cannot satisfy
      both (equity implies ~0.08, outside the range; housing implies
      0.028–0.038, inside it). Left at the published 0.02 and recorded.

- [x] 3.2 Give the credit↔collateral loop a balancing term, or state its gain
      **STATED, and the balancing term turned out to already exist.** Loop gain
      measured at four operating points, not one: 0.0076 / 0.0097 / 0.0089 /
      0.0071 at 96 months. Pre-3.1 it was 0.0130 at the steady state and
      **315.52 two percentage points away** — the state dependence a Jacobian
      at the fixed point cannot see, now measured rather than argued.
      **THREE CLAIMS IN `credit.js` WERE FALSE, all three corrected:** the loop
      "has no balancing counterpart" (it has one — debt service -> defaults via
      `DEFAULT_RATE_DSR` -> capital -> spread -> real rate, and a 2pp cut
      settles credit/GDP at 263% with the burden 1.20x baseline); "both
      coefficients are in parameters.py" (one was); and the EMA comment
      (**the flagged read-not-measured claim — CONFIRMED FALSE**: credit/GDP
      goes 150 -> 161 -> 188 -> 222 under a 1pp cut, so it integrates exactly
      as before; the EMA is a filter, the debt-service term is the guard).
      `0.02` and `0.4` promoted to `CREDIT_COLLATERAL_FEEDBACK` and
      `CREDIT_IMPULSE_RATE_SENSITIVITY`. New `test/credit-loop.test.js`.
      **I ALSO GOT A MECHANISM WRONG IN 1.1 AND CORRECTED IT HERE** — see the
      carried-findings note.

- [x] 3.3 Bound consumption physically
      Clamped to `[10, 95]` — **invariants.js check 8's own band**, so there is
      one number rather than two — with the bound recorded as a trace term the
      way investment's always was. Measured in `overheating` with no player
      input: C went **431.66 -> 95.00** at m96 and the output gap 398.66 ->
      62.00; disposable income no longer goes negative (-26.47 -> 60.20).
      **Found a real bug on the way:** the strict trace check compared floats
      at ~1e17 against an ABSOLUTE 1e-6 tolerance, so cancellation noise tripped
      it in `debt_trap` at m189. Tolerance is now relative above 1e6 and
      identical below it.

- [x] 3.4 Replace the +12%/month asset growth clamp
      Bound the **deviation `A/F`** to `[0.05, 10]`, not the monthly move — a
      clamp on the rate of change of a compounding level is a growth FLOOR once
      a spiral runs. Measured: it bound for 48 consecutive months in
      `stagflation` and A/F still reached **1534.67**; now 10.00. Traced as a
      term, like investment's and consumption's.
      **The ceiling is derived from reachability, not picked:** worst A/F a
      player can reach across 150 runs (6 scenarios x 25 seeds, events and
      endings on, dials slammed at random) is **2.20**; Japan 1989 and Nasdaq
      2000 are 3-6x on generous measures. 10 is 4.5x past anything the game
      can produce. Removing the growth clamp changes nothing a player sees — it
      bound 0 months in four scenarios and only post-ending in the other two.

- [x] 3.5 Turn the divergence guard green — **closed by 3.1 alone**
      Both tests are hard passes; the `todo` markers are gone and the messages
      now record what closed it. A permanent 1pp cut: A/F **2.873e11 -> 1.12**,
      credit gap **647.89 -> 6.79**. Phase 2 halved it (1.323e11) and did not
      fix it, which is how the two sections were confirmed independent.
      Done ahead of 3.3/3.4 because leaving false numbers in a passing test is
      the staleness this pass keeps finding elsewhere. **Re-verify after 3.4.**

## Phase 4 — Re-measure everything **(HARD GATE)**

- [x] 4.1 Re-solve the two crisis amplification constants
      **HALF RE-SOLVED, AND THE HALF THAT WOULD NOT SOLVE IS THE FINDING.**
      `CRISIS_IMPULSE_AMPLIFICATION` **2.59 -> 2.1855** (inside [1.8, 3.4]);
      the realised trough is now **-9.0000%** against CRISIS_OUTPUT_TROUGH
      exactly, at month 15. Solved against `test/crisis.test.js`'s own harness,
      which settles 24 months — solving against a 36-month settle gave 2.196
      and would not have reconciled.
      `CRISIS_SCAR_AMPLIFICATION` **LEFT AT 3.14 DELIBERATELY.** It re-solves to
      1.06–1.26, outside its published [2.0, 4.5], which would make the
      exogenous capacity cut supply 7.9–9.5 of Cerra-Saxena's 10 while the
      model supplies almost nothing — destroying the deconvolution the constant
      exists to be, and imposing the observed reduced form as a structural
      input (rule 4).
      **THE REAL MEASUREMENT: endogenous crisis propagation fell from 8.4% to
      3.65%.** The model no longer propagates a crisis; it gets hit and
      recovers. Fourth independent sighting of the same demand-block finding.

- [x] 4.2 Record that they are calibration constants, not measurements
      **Made structural, not prose.** New `SOLVED_FROM_MODEL` register in
      `parameters.py`, enforced in BOTH directions like `DEFERRED` — by the
      Python validator at import time and by `test/params.test.js`. Nothing can
      be solved from the model without declaring it; nothing can claim to be
      without being listed; and a registered constant must be labelled
      `judgement`. Verified both failure modes fire.
      The point stated in `docs/10`, in the register's own header and on
      `crisis.test.js`'s crash-arc test: **that test cannot fail on magnitude**,
      because the constant is whatever makes it pass. What IS evidence is the
      residual — the model's endogenous share of the published loss, **8.4% ->
      3.65%**. 10.1's rewrite of `docs/10` must carry this section forward.

- [x] 4.3 Regenerate cause-effect, report, IRF, paths
      `docs/11` regenerated — all six dial tables replaced from fresh
      measurements, and the numbers quoted in the prose updated with them.
      `TEST-RESULTS.md` regenerated.
      **The staleness is now DETECTABLE, which is the part that mattered.**
      `docs/11` carries a fingerprint of all 1464 measured numbers;
      `tools/cause-effect.mjs --check` is wired into `npm test` and fails with
      the tool to re-run. Verified it catches a one-parameter change.
      **Found a real build defect on the way:** `npm run params` could emit a
      `src/params.js` that did not match `parameters.py`, because Python
      validates its bytecode cache on mtime in WHOLE SECONDS. Two edits inside
      one second left a stale `.pyc` that looked valid. Fixed with
      `sys.dont_write_bytecode`, verified against the repro.
      **All six starting vectors re-measured.** Five fine or improved:
      `overheating` m34->m51 and `stagflation` m17->m23 before they end
      unattended, `recession`'s end-of-term boom shrank from OVERHEATING at a
      +8.30 credit gap to GOLDILOCKS at +3.15, `calm` and `debt_trap` unchanged.
      Only `bubble` regressed — and **its cause is D2, not the vector**, so the
      fix is 5.4. New full-term characterisation test guards all six.

- [x] 4.4 Re-measure OPEN #1 and OPEN #9 — **the plan was wrong about both**
      **#1 is NOT downstream of Section B.** The plan expected the rebound to be
      "the credit/asset loop re-inflating". Measured, the credit gap is
      **negative throughout the recovery** (-6.40 m24, -8.26 m60, -4.70 m96,
      -2.82 m120) and never re-inflates above trend. Isolating test: with the
      collateral channel AND the wealth effect both off, the crisis is
      shallower (trough -6.19 against -10.17) but **2.83pp still comes back —
      46% of the trough recovered with both amplifiers gone.** It is the demand
      block, i.e. open_items A2 again.
      **#9's response is slow, not absent.** A1 did not move the 24-month figure
      (0.1227 against 0.122) as the plan expected. But: 0.0586 @12m, 0.1227
      @24m, 0.1756 @36m, **0.2192 @48m — inside the published 0.2-0.4.** The
      window is doing as much of the disagreement as the model is.

**PHASE 4 GATE: GREEN.** 160 tests, 143 pass, 0 fail, 17 todo. lint clean,
`index.html` current, `docs/11` current, steady state exact to 9dp, divergence
guard green. Phase 6 is unblocked.

## Phase 5 — Correctness and hygiene

- [ ] 5.1 Recycle government interest income to households
- [ ] 5.2 Private debt maturity
      **THE MACHINERY EXISTS NOW:** 2.1 added the `rate_to_borrowing_cost`
      kernel and `RATE_PASSTHROUGH_TO_BORROWERS`, whose note already draws the
      distinction this task needs — that parameter is the NEW-BUSINESS rate,
      and the stock of existing loans reprices far more slowly. The new
      parameter is the stock repricing speed, and it is a separate source.
- [ ] 5.3 Lint check (f): numeric literals in `src/rules/`
      **Phase 2 added no new numeric literals to `src/rules/`** (verified by
      diff against the pass's start) — both new coefficients went through
      `parameters.py`. Count against the current tree, not the brief's numbers,
      which docs/13 already flags as read-not-measured.
- [ ] 5.4 Derive the credit trend speed — **NOW ALSO FIXES A LESSON REGRESSION**
      4.3 measured this as the cause of `bubble` losing its design promise. At
      the sourced HP-filter speed (0.05-0.06/year) the credit gap climbs to
      14.0-14.8pp and STAYS, against 9.80 peaking and unwinding to 3.37 as
      built. The design promise is ~14.5pp. Unblocked: the plan required this
      to come after Phase 3, which is done.
- [ ] 5.5 Fix `CREDIT_GAP_CRISIS_THRESHOLD`'s note and `HAND_TO_MOUTH_SHARE`
      **WATCH ONE THING WHEN TIGHTENING THE REGISTER:** 2.1 added
      `RATE_PASSTHROUGH_TO_BORROWERS` to `DEFERRED` with the reason "consumed
      via `LAGS_MONTHS`" — it is read in `parameters.py` to build the kernel,
      not in `src/`. That is a legitimate consumption, the same shape as the
      `SS_*` anchors' "consumed via START", and a tightening aimed at
      trace-only reads must not break it.
- [ ] 5.6 Wire or defer `participation` and `gdp_growth_annual`

## Phase 6 — What to add

- [ ] 6.1 Macroprudential dial: the countercyclical capital buffer
      **NOW HALF OF AN ANSWER TO A LIVE REGRESSION.** 3.1 left the `bubble`
      scenario deflating on its own: the credit gap peaks at 9.82pp around m48
      and unwinds to 3.37 by m96, where it used to climb monotonically to
      14.10. A bubble the player cannot act on was already a spectacle rather
      than a decision; one that resolves itself teaches that ignoring it
      works. See the `todo` in `test/scenarios.test.js`.
- [ ] 6.2 **Historical scenarios: play the moment**
- [ ] 6.3 Separate housing from equities
- [ ] 6.4 Demographics
- [ ] 6.6 **THE WEDGE — let the player watch a bubble inflate** *(new, requested)*
      **What is missing.** `credit_to_gdp_gap` is a gauge, so a bubble is
      technically visible. But `crisis_prob` is computed every tick and shown
      NOWHERE, and `asset_prices`/`asset_fundamental` are shown nowhere either —
      so A/F, the actual bubble measure, is invisible. There is not even a
      history buffer for it.
      **The shape: two lines and the space between them.** Chart
      `asset_prices` against `asset_fundamental` — *what things cost* against
      *what they are worth* — and shade the gap. The shaded wedge IS the
      bubble, opening and closing in front of you. Next to it, `crisis_prob` as
      "annual chance of a crash: 6%".
      **Why this rather than another gauge.** A gauge reading `+9.8pp` is an
      abstraction; a widening wedge labelled *"houses cost 53% more than they
      are worth"* is a story, and it is the same number. And `crisis_prob`
      converts a line going up into **a bet the player is knowingly taking**,
      which is the difference between a spectacle and a decision.
      **Keep the trap.** Put it on a panel the player must choose to open, not
      in the headline row. `bubble`'s whole design is that every visible gauge
      says you are brilliant; a wedge on the front page destroys it.
      **The payoff: show it in the post-mortem.** When the crash lands, replay
      the wedge you were ignoring. The same-seed ghost machinery already exists,
      so "here is what year-one action would have done" pairs with 6.1.
      **Cost:** two history buffers (`asset_prices`, `asset_fundamental` — both
      need `docs/01` entries or `docs.test.js` fails), one chart, one readout.
      No new parameters, no model change.
      **BLOCKED ON 5.4, AND THIS IS NOT OPTIONAL.** The credit-gap gauge is
      currently a broken bubble detector — it mean-reverts 3–4x faster than the
      HP filter it claims to approximate and under-reads persistent booms,
      which is the exact situation it exists for. Building a bubble display on
      it now would ship a display of a defect. 5.4 fixes it and also restores
      `bubble`'s own design promise.
      **One design question left open on purpose:** showing `asset_fundamental`
      is arguably *too* honest — real policymakers are never told the
      fundamental, and the hard thing about bubbles is that you cannot tell one
      from a boom while you are inside it. Deliberately NOT modelling that
      uncertainty: a knowingly unreliable gauge would undercut the one claim
      this project makes, that its numbers are honest. Teach the mechanism
      live; teach the epistemics in the post-mortem.

- [-] 6.5 Forward guidance — deferred again, but THE CASE HAS CHANGED
      **NEW EVIDENCE FROM 2.5, and it strengthens the eventual build.** Two of
      the four episodes now point at this same missing mechanism from OPPOSITE
      directions: US 2021-23's remaining failure is entirely credibility
      collapsing to 0.000 on realised misses, and Japan's is expectations that
      cannot de-anchor DOWNWARD. That agreement did not exist before Phase 2.
      `docs/12` deferred this because it would be "decoration on a defect" —
      Phase 2 has now removed that defect, so the reasoning that justified the
      deferral no longer applies and only the Phase 4 gate does. Still deferred
      here; re-derive after Phase 4 as the plan says, with this evidence.

## Phase 7 — Validation

- [ ] 7.1 Uncertainty propagation (Monte Carlo)
- [ ] 7.2 Step-size independence
      Phase 3 guarantees this finds something. Note also that 2.1 added a new
      per-tick smoother — `INVESTMENT_ADJUSTMENT_SPEED` closes 15% of the gap
      per month — so `investment` is now a partial-adjustment state and belongs
      in the instrumented set.

## Phase 8 — Interface

- [ ] 8.1 Display `crisis_prob` — **see 6.6**, which is the fuller version of this
- [ ] 8.2 Add an output-gap gauge
- [ ] 8.3 Display `price_level`
- [ ] 8.4 Real wage growth
- [ ] 8.5 Make every recorded trace reachable
      **The count in the plan (27 keys, 7 reachable) is out of date: there are
      31 now.** 1.3 added a dial-truncation note carrying the requested rate,
      the applied rate and the running count — that one is player-facing and
      currently invisible. 2.1 also changed `investment`'s trace terms to
      "what it was spending" + "still catching up to last month's decision".
- [ ] 8.6 The pipeline panel as a timeline, not a list
- [ ] 8.7 Project the line forward
- [ ] 8.8 Confidence bands
- [ ] 8.9 Dial history / decision ledger
- [ ] 8.10 The remaining unshown values
- [ ] 8.11 Accessibility

## Phase 9 — Is it a game

- [ ] 9.1 The published forecast
- [ ] 9.2 Two named advisors who disagree

## Phase 10 — Documentation (throughout, not at the end)

- [ ] 10.1 Rewrite `docs/10` wholesale
      **CARRY FORWARD the section 4.2 added** — "Two numbers in this model are
      not evidence, and one of them is the crash". It is the only place the
      epistemic status of the crash magnitude is written down for a reader.
- [ ] 10.2 Regenerate `docs/11` — **THE MOST STALE FILE IN THE REPO.** Not
      touched since the third audit (a2b7ce0). Every number predates Phase 2.
- [ ] 10.3 Regenerate `TEST-RESULTS.md`
- [ ] 10.4 Update `docs/02`
      **PARTLY DONE:** 2.3 added a new section, "THE MOST IMPORTANT SINGLE FACT
      ABOUT THIS MODEL'S DYNAMICS", carrying the 0.37 → 1.83 transmitted Taylor
      response. STILL OUTSTANDING: Part 5's bracketed months-to-peak
      (re-measure after Phase 3), the interest-income leg from 5.1, the
      macropru chain if 6.1 lands, and the "Corrections from this pass"
      section.
- [ ] 10.5 Update `docs/01`
      **PARTLY DONE:** the `policy_rate` row now reads 3 months and −0.75 to 50,
      with a note on where the slow half of the lag went; `dial_truncated` and
      `dial_truncated_count` are documented in section K. Anything Phase 3
      and 6 add still needs it — `docs.test.js` fails until they do.
- [ ] 10.6 Add `docs/00`'s fourth revisions section
- [ ] 10.7 Update `docs/09`
- [ ] 10.8 Fix `README.md`'s counts
      **DONE ONCE ALREADY** (121→128 parameters, "95 tests, three todo"→"145
      tests, fourteen todo"). Both have drifted again since — currently 128
      parameters and 149 tests, 14 todo. Redo at the end rather than chasing
      it, and note the README does not yet mention `tools/build.mjs --check`.
- [ ] 10.9 Update `parameters.py`
      **PARTLY DONE:** `RATE_PASSTHROUGH_TO_BORROWERS` and
      `INVESTMENT_ADJUSTMENT_SPEED` added with range/confidence/source;
      `TAYLOR_INFLATION`'s note now carries the transmitted-response finding;
      `INVESTMENT_RATE_ELASTICITY`'s note records that its peak is produced
      rather than imposed. STILL OUTSTANDING: the derived credit-trend
      constant, macropru bounds, every literal promoted in 5.3, the two
      crisis-constant notes (4.2), and `CREDIT_GAP_CRISIS_THRESHOLD`'s false
      note.
- [ ] 10.10 Write `docs/14` — the report
