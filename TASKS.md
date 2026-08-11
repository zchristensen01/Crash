# TASKS

Tracker for the fourth audit. Full detail, reasoning and acceptance criteria:
**`docs/13-fourth-audit-plan.md`**. Source brief: `4th-audit-brief.md`.

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

**The standing rule earned its place.** `docs/12` measured a real bifurcation
and attributed it to the expectations block. Phase 2 closed it by fixing
transmission and never touched expectations. When you state a mechanism, state
the experiment that isolates it.

## Phase 3 — Section B: the asset–credit loop

- [ ] 3.1 Fix the asset-price semi-elasticity's units
      **CARRIED FROM 2.2:** the wealth channel is **85% of the residual
      knife-edge**. Steepest local response −149.2pp/pp as built vs
      **−22.5 with `WEALTH_EFFECT = 0`**. The acceptance test for this already
      exists and is self-calibrating — `A-TABLE: the knife-edge is the wealth
      channel` in `test/transmission.test.js` compares the live model against
      the model with the channel switched off, so it needs no target number.
- [ ] 3.2 Give the credit↔collateral loop a balancing term, or state its gain
      **CARRIED FROM 1.1:** the loop costs exactly **0.638pp of stable range** —
      a permanent peg diverges below 1.5777 as built, below 0.9398 with
      `ASSET_PRICE_CREDIT_CHANNEL = 0`. Below 0.94 it diverges either way and
      that is Fisher, not the loop (Correction 5).
      **TWO settings diverge through it, not one:** `policy_rate = 1.5` AND
      `qe = 30`. A fix aimed only at the rate case will leave the guard red.
      **DO NOT go green by adding the loop to `UNBALANCED_LOOPS`.** It is not
      in the register though `credit.js:200` claims in a comment that it is
      deliberate — resolving that contradiction is part of this task, but
      declaring it is only permitted together with a demonstration that loop
      gain is below one, and such a loop would not diverge anyway.
      **STILL UNVERIFIED:** docs/13 Phase 0 flagged B1's claim that
      `credit.js:218`'s EMA comment "describes a guard that is not there" as
      READ, NOT MEASURED. Nobody has checked it yet. Check before quoting it.
- [ ] 3.3 Bound consumption physically
- [ ] 3.4 Replace the +12%/month asset growth clamp
- [ ] 3.5 Turn the divergence guard green
      **CURRENT STATE:** a 1pp cut reaches **A/F 1.323e11** at m480 (was
      2.873e11 pre-Phase-2 — Section A halved it and did not fix it, confirming
      the two sections are independent).
      Note the frontier printout changed when 2.4 raised the ceiling: the rate
      dial now shows 14/19 settings diverging rather than 13/19, because the
      declared range now extends to 50 and the extra settings diverge through
      the **declared** `debt_service_spiral`. That is not a regression.

## Phase 4 — Re-measure everything **(HARD GATE)**

- [ ] 4.1 Re-solve the two crisis amplification constants
      **ALREADY WAITING FOR YOU:** `THE CRASH ARC: the unemployment cost of a
      banking crisis` is a `todo` gated explicitly on this task — unemployment
      peaks +1.93pp against a published 2–5 since the A1 split. The companion
      test `THE DECONVOLUTION CONSTANTS ARE MEASUREMENTS` still PASSES, so the
      constants have not yet drifted past its tolerance; they will after
      Phase 3, which is why re-solving now would mean doing it twice.
- [ ] 4.2 Record that they are calibration constants, not measurements
- [ ] 4.3 Regenerate cause-effect, report, IRF, paths
      **`docs/11-cause-and-effect.md` HAS NOT BEEN REGENERATED IN THIS PASS AT
      ALL** — it still dates from the third audit (commit a2b7ce0), so every
      number in it predates the transmission split, the derived ceiling and the
      closed bifurcation. It is the single most stale artefact in the repo.
      `TEST-RESULTS.md` WAS regenerated at 2.5/2.6 (149 tests, 14 open) and
      will need doing again after Phase 3.
- [ ] 4.4 Re-measure OPEN #1 and OPEN #9
      **#9 IS ALREADY MEASURED AND THE PLAN'S EXPECTATION WAS WRONG.** The plan
      says the shortfall is "partly the lag burying the response beyond the
      24-month window", so A1 should have moved it. It did not: 0.1227pp at 24
      months, against the 0.122 recorded before. But the response is not
      missing, it is SLOW — 0.0586 at 12m, 0.1227 at 24m, 0.1756 at 36m and
      **0.2192 at 48m, which is inside the published 0.2–0.4.** The slowness no
      longer lives in the rate; it lives in the investment partial adjustment
      and the Phillips curve. Its `todo` message still carries the old text and
      needs rewriting with these four numbers.
      **#1** — US 2008-12's rewritten message now states that the too-fast
      healing is downstream of Section B rather than Section A.

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
- [ ] 5.4 Derive the credit trend speed
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
- [ ] 6.2 **Historical scenarios: play the moment**
- [ ] 6.3 Separate housing from equities
- [ ] 6.4 Demographics
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

- [ ] 8.1 Display `crisis_prob`
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
