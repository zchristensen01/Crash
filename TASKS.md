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

## Phase 3 — Section B: the asset–credit loop

- [ ] 3.1 Fix the asset-price semi-elasticity's units
- [ ] 3.2 Give the credit↔collateral loop a balancing term, or state its gain
- [ ] 3.3 Bound consumption physically
- [ ] 3.4 Replace the +12%/month asset growth clamp
- [ ] 3.5 Turn the divergence guard green

## Phase 4 — Re-measure everything **(HARD GATE)**

- [ ] 4.1 Re-solve the two crisis amplification constants
- [ ] 4.2 Record that they are calibration constants, not measurements
- [ ] 4.3 Regenerate cause-effect, report, IRF, paths
- [ ] 4.4 Re-measure OPEN #1 and OPEN #9

## Phase 5 — Correctness and hygiene

- [ ] 5.1 Recycle government interest income to households
- [ ] 5.2 Private debt maturity
- [ ] 5.3 Lint check (f): numeric literals in `src/rules/`
- [ ] 5.4 Derive the credit trend speed
- [ ] 5.5 Fix `CREDIT_GAP_CRISIS_THRESHOLD`'s note and `HAND_TO_MOUTH_SHARE`
- [ ] 5.6 Wire or defer `participation` and `gdp_growth_annual`

## Phase 6 — What to add

- [ ] 6.1 Macroprudential dial: the countercyclical capital buffer
- [ ] 6.2 **Historical scenarios: play the moment**
- [ ] 6.3 Separate housing from equities
- [ ] 6.4 Demographics
- [-] 6.5 Forward guidance — deferred again, for the right reason

## Phase 7 — Validation

- [ ] 7.1 Uncertainty propagation (Monte Carlo)
- [ ] 7.2 Step-size independence

## Phase 8 — Interface

- [ ] 8.1 Display `crisis_prob`
- [ ] 8.2 Add an output-gap gauge
- [ ] 8.3 Display `price_level`
- [ ] 8.4 Real wage growth
- [ ] 8.5 Make every recorded trace reachable
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
- [ ] 10.2 Regenerate `docs/11`
- [ ] 10.3 Regenerate `TEST-RESULTS.md`
- [ ] 10.4 Update `docs/02`
- [ ] 10.5 Update `docs/01`
- [ ] 10.6 Add `docs/00`'s fourth revisions section
- [ ] 10.7 Update `docs/09`
- [ ] 10.8 Fix `README.md`'s counts
- [ ] 10.9 Update `parameters.py`
- [ ] 10.10 Write `docs/14` — the report
