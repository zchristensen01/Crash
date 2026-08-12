# TASKS

Tracker for the fourth audit. Full detail, reasoning and acceptance criteria:
**`docs/13-fourth-audit-plan.md`**. Source brief: `4th-audit-brief.md`.

**Anything found and NOT fixed, not finished, or not understood is in
[`open_items.md`](open_items.md)** — concerns, deliberate omissions, things a
later phase must re-verify, and tooling hazards. Read it before trusting a
number from any document.

`[ ]` todo `[~]` in progress `[x]` done `[-]` deliberately not doing

**COVERAGE INVARIANT: every `OPEN` or `PARTIAL` entry in `open_items.md` has a
numbered task here.** Checked at the end of Phase 5 — A1→6.1, A2→11.1, A3→7.3,
A4→5.8, A5→5.7, B3→11.2, B4→6.3, B5→5.1, B6→11.4, C1→6.5, C2→11.3, D1→5.9,
D2→5.10, D4→6.3, E4→5.12, E5→7.4, E6→5.11, A6→5.1 (blocked on 11.1), B7→5.13,
B8→5.14, A7→11.5, E7→5.15, E8→5.16, E9→5.17, E10→5.18. The entries with no task are the ones that want none: `FIXED` (A4,
A5, B1, D1, D2, E1, E2, E8, E9, E10), `WATCH` (D3, D5, E3) and `DELIBERATE` (B2).
**There are no audit reports.** A finding goes in `open_items.md` with its
reproduction; the work it implies goes here as a task; the reasoning goes in
`docs/13`'s "As built" block next to the change. See 10.10.

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
      **SUPERSEDED — see Phase 5 verification.** 3.1 moved it again, to
      **1.96 / -1.77%**, and neither `docs/02` (which said 1.83) nor
      `TAYLOR_INFLATION`'s note (1.80) was updated. Phase 4's hard gate passed
      over both.
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

Recorded here and against the individual tasks. **Twenty-seven** corrections to the
plan so far; all live in `docs/13` as "As built" blocks under the task that
produced them.

| # | correction | where it bites |
|---|---|---|
| 4 | E1 as worded can never be green — the model has levels that must compound and two loops that must diverge | 1.1, 3.5 |
| 5 | B1's attribution is right at 1.5 and wrong in general: the credit channel MOVES the divergence frontier by 0.638pp, it does not create it | 3.2 |
| 6 | A2's clamp inconsistency was behaviour-neutral (0.00e+0) — a lie the code told about itself, not a leak | closed |
| 7 | **Phase 0's own Correction 1 table is wrong** — every "dial max 40" row was measured through a hidden clamp at 25 | closed, but shows Phase 0 is not above re-verification |
| 8 | The plan's shape for A1 violates a rule `dials.js` already states (an effect size is not a driver) | closed |
| 9 | 2.2's acceptance criterion is grid-dependent and ranks the smoothest curve worst | closed |
| 12 | **The transmitted Taylor response has been 1.96 since 3.1**; `docs/02` said 1.83, `TAYLOR_INFLATION` said 1.80, and the Phase 4 HARD GATE passed over both | closed |
| 13 | 5.2 is TWO defects — a dial read (21x) and a maturity error (25x); and `docs/11` §1/§3-§7 had never been regenerated | closed |
| 14 | D3's literal counts were read, not run — `crisis.js` is out by 8x | closed |
| 15 | 5.5's "wire it or correct the note" offers a repair that would have been a unit error | closed |
| 16 | D5 names two dead START fields; there are four | closed |
| 17 | **`supply.js` adds a percent-of-potential flow to a capital STOCK** — capacity grows at 0.93%/yr against a stated 1.5 | closed by 5.7 |
| 18 | Correction 17's blast radius was wrong: **four quantities moved, not "every measurement"** — the model is almost entirely ratio-invariant, which is the same fact as nothing having caught it | closed |
| 19 | `investment_share` did NOT need re-deriving. **`DEPRECIATION_RATE` and `SS_DEPRECIATION` needed equalising** — both notes already said so and the values violated it | closed |
| 20 | **The plan has no task for the bond yield at all**, and 5.1 cannot ship without one. The repair is an expected AVERAGE short rate, not a Fisher term — which is why the steady state needed no re-solve | closed by 5.8 |
| 21 | Two tests were asserting the yield defect; one **conflated speed with size**, requiring near one-for-one pass-through under a comment about markets repricing *fast* | closed |
| 22 | **5.8 did not unblock 5.1 and A4 was never the blocker** — `overheating` stops hyperinflating with the old yield (3.13%) and the new one (3.83%) alike | closed |
| 27 | **The `SOLVED_FROM_MODEL` guard could not report drift** — its only check lived in a `todo` that fails by design. Third instance of a guard answering a different question from the one it is read as answering | closed by 5.18 |
| 26 | **`docs/11`'s fingerprint could be defeated by `--stamp`** — it hashes the MODEL, not the DOCUMENT, which is the mechanism behind Correction 13b | closed by 5.17 |
| 25 | D2 undercounted: the demand bound was stated **three** times, not twice — the `govt_spending` dial's ceiling is check 8's third band | closed by 5.10 |
| 24 | D1's own estimate of the rate threshold was wrong — "18–20"; it is **20.00–20.25**. The ceiling of 50 survived a full re-derivation | closed by 5.9 |
| 23 | **5.1 is blocked on A2.** The obvious diagnosis (a shrinking transfer acting as an inflation tax) was REFUTED by freezing the transfer: 3.17 vs 3.27. It is the one-off propensity cut, and underneath it a −3.9% real rate held 200 months moves investment 0.8pp | **OPEN — open_items A6** |

**Both claims docs/13 flagged as READ, NOT MEASURED are now checked.**
`credit.js:218`'s EMA comment was measured in 3.2 and the brief was right.
D3's numeric-literal counts were measured in 5.3 and **the brief is wrong** —
credit 21 not 23, prices 10 not 16, **crisis 2 not 16**.

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
      **Re-verified in Phase 5 verification: A/F is still 1.12; the credit gap
      is now 11.79**, moved by 5.4's slower trend, not by anything in the loop.

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

### Phase 5 verification (before continuing) — **five stale numbers, one inverted claim**

- [x] V3 Re-verify the handover claims. **Three of four reproduce; one does not.**
      `npm test` 160/143/0/17, lint + `build --check` + `cause-effect --check`
      clean, all 17 `todo`s failing (none stale-passing). Steady state exact:
      output_gap `0.000000000`, inflation `2.000000000`, consumption
      `55.500000000`. A/F at m480 under a permanent 1pp cut **1.120e+0** ✓.
      Loop gain below one at all four operating points (7.639e-3, 9.741e-3,
      8.943e-3, 7.108e-3) ✓.
      **The transmitted Taylor response is 1.96, not 1.83.** Bisected: 2.3
      measured **1.80** and wrote it into `TAYLOR_INFLATION`'s note; the
      carry-forward commit measured **1.83** and wrote it into `docs/02` — two
      documents citing one measurement with different numbers — and **3.1
      moved the real value to 1.96 / −1.77%** with neither updated. Phase 4's
      "re-measure everything" HARD GATE passed over both. See **Correction 12**.
- [x] V4 **`TAYLOR_INFLATION`'s note had inverted.** It said raising the
      coefficient "does not work anyway (177.62% at m48 against 242.34%)".
      Both numbers were taken while transmission was broken. Re-measured:
      raising it to 1.0 takes `stagflation` under the rule from **7.12% →
      3.24% at m48** and **3.15% → 1.42% at m96**. The coefficient now has
      plenty of traction; the reason to leave it alone is rule 4, not
      impotence. `docs/02` carried the same inverted claim. Both rewritten.
- [x] V5 **`open_items.md` A2 — the headline table — had two cells that were
      never measured.** It said sacrifice ratio 0.38 (real: **0.35** since 3.1;
      0.38 was the 2.5 value) and `TAX_SHOCK_TO_GDP` 0.46 (real: **0.487**
      since 3.1, 0.492 before — 0.46 matches no commit in this pass). In the
      document whose header promises "measured, not read". The finding is
      unharmed, which is why nobody re-ran them.
- [x] V6 Four stale numbers inside live `todo` messages, which `report.mjs`
      copies verbatim into `TEST-RESULTS.md`: `TAX_SHOCK_TO_GDP` said 0.33
      (0.487); the UK episode said peak m11 / 8.63% at 4y / 16.38% / 0.64pp /
      ratio 0.38 (m10 / 7.59% / 16.17% / 0.66pp / 0.35); `crisis.test.js` gave
      the SAME endogenous-propagation measurement as 3.22% in one message and
      3.65% in another (re-measured with `CRISIS_HYSTERESIS_SCAR = 0`:
      **3.6468%**) and cited `CRISIS_IMPULSE_AMPLIFICATION = 2.196`, the value
      4.1 explicitly REJECTED (it is 2.1855); and the m96 rebound said −4.37%
      (**−4.63%**). All corrected.
- [x] V7 `test/divergence.test.js`'s history table stopped at 3.1. 5.4's
      slower credit trend moved the m480 gap **6.79 → 11.79** with A/F
      unchanged at 1.12. Row added with the reason, since a bare jump in a
      divergence guard reads as a regression.

- [~] 5.1 Recycle government interest income to households
      **BUILT TWICE, MEASURED TWICE, REVERTED TWICE — and the second attempt
      found the real blocker, which is not the one recorded.** See
      `open_items` **A6**.
      The mechanism is right and the plan is right to ask for it (D1).
      `interest_cost` is subtracted in `updateBudget` and appears in **no
      income term**, so **2.27pp of household income vanishes every month** in
      `calm`. A government bond is somebody's asset; paying interest to your
      own citizens moves money, it does not destroy it, and that is why 250%
      debt is survivable in Japan. The arithmetic works and reproduces B5's
      recipe exactly: `apc_ss` **0.709265 → 0.692945**, `apc_bondholder =
      (apc_ss − HAND_TO_MOUTH_SHARE)/(1 − HAND_TO_MOUTH_SHARE)` = **0.561350**,
      steady state exact to 9dp with no new parameter.
      **5.8 WAS SUPPOSED TO UNBLOCK IT AND DID NOT.** With the Fisher term in,
      `overheating` still stops hyperinflating: **3.83% against 380.50%**. The
      previous pass measured 3.13% with the old yield. Both fail, so **A4 was
      never the cause.**
      **THE ISOLATING EXPERIMENT REFUTED THE OBVIOUS HYPOTHESIS.** The
      plausible story — inflation erodes the debt, the transfer shrinks, income
      falls — is worth a tenth of a point: freezing the transfer for 200 months
      gives 3.17% against 3.27% free. It is the **one-off level cut**.
      Recycling raises canonical household income 78.25 → 80.525, so `apc_ss`
      MUST fall; but `apc_ss` is canonical and the transfer is not.
      `overheating` opens with a coupon of 1.75 against 3.25, so it takes the
      lower propensity with **1.22** of interest instead of 2.275, loses
      **0.57pp of consumption**, and its opening gap moves **+0.2 → −0.44**.
      **WHAT IS UNDERNEATH IT IS A2.** A **−3.9% real rate held for two hundred
      months** moves investment 22.65 → 23.48 and the gap peaks at +2.2 before
      falling back. `overheating`'s divergence was being carried by the income
      error; with the accounting right, the demand block cannot produce it.
      Rule 6 says the same thing: that scenario's regime is **asserted, not
      driven** — the defect docs/07 M6 found in `recession`.
      **ORDER: 11.1 (A2) → re-derive `overheating`'s vector → 5.1 → 5.5's
      wiring.** Do not attempt it again before A2, and do not close it by
      re-tuning `overheating` to hyperinflate: that is rule 3 applied to a
      scenario instead of a coefficient.

- [x] 5.2 Private debt maturity — **and it was TWO defects, not one**
      New `PRIVATE_DEBT_REPRICING_YEARS` = 3.0 [1.0, 8.0], `weak`, the private
      analogue of `DEBT_AVERAGE_MATURITY_YEARS`. New state field
      `private_debt_rate` (documented in `docs/01`), walking toward
      `market_rate` at 1/3 a year exactly as `average_coupon` walks toward
      `yield_10y`. Steady state exact to 9dp.
      **DECOMPOSED, because the old line got two things wrong and the plan
      names one.** A 3pp hike's FIRST-MONTH move in the default rate:
      `0.67538pp` as built (the DIAL, whole stock) -> **`0.03160`** reading the
      transmitted rate -> **`0.00125`** with the maturity. **The dial read was
      21x of it and the maturity a further 25x**, 540x in total. Fixing only
      the maturity would have left the burden answering the announcement.
      The stock catches up **2.8% at m1, 22.4% at m12, 43.1% at m24, 73.9% at
      m60**; the 50% crossing is m30 against a pure-exponential 25.
      **THE `todo` IS NOW A PASSING ASSERTION — 17 todos -> 16.** Its old bar
      (|Δ| < 1e-4, i.e. exactly zero on impact) was NOT restored: that asserts
      no private debt is floating-rate, which is false and is a different
      error. Replaced by the shape — impact is 0.19% of the five-year response,
      the burden at 3yr is 2.30x the burden at 1yr — plus **the isolating
      experiment**: set the repricing time to one month and the impact response
      returns, 25.4x. `tools/lint.mjs`'s `lint-allow-dial` exception is gone.
      **DOCS/11 WAS FAR MORE STALE THAN ITS FINGERPRINT SUGGESTED** — see
      Correction 13. §1's kernel table had never been regenerated since the
      document was written and described the PRE-2.1 model; §5 said the Taylor
      rule loses `stagflation` to hyperinflation at m24 when 2.4 established it
      wins; §7 still called the closed bifurcation "the biggest hole". All of
      §1 and §3–§7 rebuilt and re-stamped. **open_items B1 is closed.**
- [x] 5.3 Lint check (f): numeric literals in `src/rules/`
      **COUNTED AGAINST THE TREE, AND THE BRIEF'S NUMBERS ARE WRONG.** D3 says
      credit 23 / prices 16 / crisis 16. Measured: **credit 21, prices 10,
      crisis 2** — an eightfold overstatement on the last. Raw occurrences
      **84**; after excluding `trace.record` scope (display, the same carve-out
      check (e) makes) and array indices, **71 actionable across 11 files**.
      Now **zero**: lint clean at 6 checks.
      **THE TRIAGE, and the split is the plan's own.** 12 promoted to
      `parameters.py` (131 -> 143 params) — every one of them decides a GATE or
      an ENDING, which is what the plan said to prioritise: the whole of
      `updateCrisisRisk`'s arithmetic (`CREDIT_GAP_WARNING`,
      `CREDIT_GAP_ONE_SD`, `CRISIS_PROB_SD_CAP`, `ASSET_BOOM_THRESHOLD`,
      `CRISIS_PROB_RZONE_UPLIFT`, `CRISIS_PROB_MAX`), the debt-crisis trigger
      (`DEBT_SERVICE_PANIC_SHARE`, `BOND_YIELD_PANIC_SLOPE` — the plan's `8`),
      the hyperinflation engine (`VELOCITY_FLIGHT_CONVEXITY`,
      `PRINTING_CREDIBILITY_EROSION` — the plan's `0.0015`), and
      `DEFAULT_RATE_BASELINE`. The remaining ~46 are named locally with an
      explicit `judgement` label and a reason.
      **`DEFAULT_RATE_BASELINE` IS THE FIND: the same `1.0` in FIVE places** —
      the baseline default term, the zero point of the spread's loans-going-bad
      term, the zero point of write-offs, `newState`'s opening `default_rate`
      and `loan_losses_ss`. The whole "only losses above normal times eat
      capital" design needs all five to agree. **And the check nearly missed
      it**: comparing numerically rather than textually so `1.0` and `1` are
      treated alike also made this coefficient allowed.
      **BEHAVIOUR-NEUTRAL, MEASURED:** all six scenarios x 96 months x 22
      fields **byte-identical to 15 significant figures**, and `docs/11`'s
      1464-number fingerprint is unmoved (`86c1b104fab5561d`).
      All three failure modes verified to fire: a new bare literal, a marker
      with a too-short reason, and a **stale** marker — the third did not fire
      on the first attempt and the check was fixed.
- [x] 5.4 Derive the credit trend speed
      `0.20` was a bare literal with no derivation, under a comment citing an HP
      filter it does not resemble. Promoted to **`CREDIT_TREND_CATCHUP` =
      0.127/year** [0.090, 0.253], derived by matching the half-power cutoff of
      the model's one-sided exponential trend to the HP filter at the stated
      lambda, Ravn-Uhlig-scaled quarterly->monthly (400,000 x 3^4 = 32.4m).
      Half-life 3.5 -> 5.5 years.
      **The brief says the meter is 3-4x too fast. Measured, it is 1.58x.**
      Its "10-15 year trend time constant" does not follow from lambda=400,000
      by any matching I could reproduce — the implied cutoff PERIOD is 49 years.
      **A structural caveat that matters more than the number:** the BIS trend
      is a LOCAL LINEAR trend with a slope state; this one is level-only and
      lags any trend permanently. Fitting them empirically on the model's own
      credit paths gives 0.598/0.010/0.468/0.010 across four scenarios — no
      single speed makes them equivalent, because they are not the same filter.
      **Bubble: peak gap 9.82 -> 12.00, m96 3.37 -> 6.20.** Better, not fixed.
      Reaching 14.5 needs 0.05-0.06, which the derivation does not support and
      rule 3 forbids reaching for.

- [x] 5.5 Fix `CREDIT_GAP_CRISIS_THRESHOLD`'s note and `HAND_TO_MOUTH_SHARE`
      **THE NOTE WAS FALSE AND THE OBVIOUS REPAIR WOULD HAVE BEEN A UNIT
      ERROR.** It claimed the parameter "also serves as `leverage_max` in the
      asset-price fire-sale term". It never did — `leverage_max` was a bare
      `1.35` in `state.js` — and the two **could not be the same number**:
      `CREDIT_GAP_CRISIS_THRESHOLD` is **9 percentage points of credit/GDP
      above trend** and `leverage_max` is a **dimensionless debt-to-collateral
      ratio**. Wiring them together, which is what "wire it or correct the
      note" invites, would have been B2's error again. Note corrected with the
      reason recorded, and the literal promoted to its own
      **`FIRESALE_LEVERAGE_TRIGGER`** = 1.35 [1.15, 1.60], `judgement` — the
      third of the three fire-sale numbers to carry that label.
      **`HAND_TO_MOUTH_SHARE`: DEFERRED, and the register is tightened so it
      could not have been anything else.** It was read in exactly one place —
      `consumption.js:104`, inside `trace.record`'s extras — which satisfied
      the register's grep while doing no work. `sourceOfRules()` now
      paren-matches out `trace.record(...)` and `trace.note(...)` before
      deciding, the same carve-out lint checks (e) and (f) make. Measured, it
      is **the only parameter in the model read solely inside a trace**, so the
      tightening caught exactly what it was aimed at and nothing else.
      `RATE_PASSTHROUGH_TO_BORROWERS` and the `SS_*` anchors are unaffected —
      they are consumed in `parameters.py` and were never read from `src/`.
      The DEFERRED entry carries **B5's recipe verbatim** so 5.1 can pick it up.
      **Behaviour-neutral:** six scenarios x 96 months x 22 fields identical.
      Both directions of the tightened register verified to fire.
      **Found on the way — check (f) has a blind spot:** it walks `src/rules/`
      only, which is why `leverage_max` escaped it. **254 literals sit outside
      that scope**, the largest blocks being `ui/chart.js` (53),
      `game/scenarios.js` (49) and `game/indicators.js` (42). Most are
      presentation, but `scenarios.js` is DATA the model is calibrated against
      and `invariants.js` (21) holds the bounds. Recorded as open_items E6.
- [x] 5.6 Wire or defer `participation` and `gdp_growth_annual`
      **THE TASK NAMES TWO DEAD FIELDS AND THERE ARE FOUR.** Measured against
      `START`'s 36 fields: `gdp_growth_annual`, `participation`,
      `current_account` and `fx_change` are read by nothing.
      `current_account` and `fx_change` were found by counting, not by reading
      the task.
      **`gdp_growth_annual` WIRED**, and from the expression that already
      existed: `pushHistory` computes `yoyGrowth(h.output)` into
      `history.growth` every tick and the state field sat frozen at its START
      value beside it — two representations of one quantity. Assigned from the
      history so there is one source. Reads 0 for twelve months by
      construction. **`participation` DEFERRED to 6.4** — it is a share of a
      working-age population and the model has no population, so there is
      nothing for 63% to be 63% of. **`current_account` and `fx_change`
      DEFERRED** to the open economy (decision A5).
      **THE STRUCTURAL FIX: a `START_DEFERRED` register**, enforced in both
      directions by `test/params.test.js` exactly as `DEFERRED` and
      `SOLVED_FROM_MODEL` are. `DEFERRED` covers `P` entries and **nothing
      covered `START`**, so a starting-vector field could be carried,
      documented and read by nothing with no test noticing. Both directions
      verified to fire. **The first version of the test was wrong** — it
      counted mentions, and START's keys are SPREAD into `s`, so a field read
      exactly once appears once; it flagged `capital_output_ratio`,
      `labour_share` and `term_premium`, all three properly wired. Now: wired
      = read somewhere, or assigned by something.
      **AND WIRING THE DEAD FIELD IMMEDIATELY FOUND A MODEL DEFECT — see
      open_items A5, which is the biggest thing in Phase 5.** `gdp_growth_annual`
      reads **1.056%** at rest against a `potential_growth` of 1.5.
      `supply.js:25` adds `annualToMonthlyFlow(s.investment)` — a PERCENT OF
      POTENTIAL — to `capital_stock`, a LEVEL. Predicted and measured: K
      converges to a constant `I/δ` = 22.5/0.065 = **346.15** (measured
      346.154), long-run growth decays to `gA` = **0.930%** (measured 0.9345),
      K/Y falls 3.0 -> 2.05 by m600. Isolated by scaling the flow by
      `potential_output`: growth returns to 1.493% and K/Y to 2.83.
      **NOT FIXED HERE** — it moves potential output in every scenario and is a
      Phase-3-sized task with its own gate.

### Defects found during Phase 5 that the plan does not contain

Each has a matching `open_items.md` entry with the reproduction. These are
tasks, not notes — the pass found them and did not fix them.

- [x] 5.7 **The capital law of motion treated a share as a level** — `open_items` A5
      `supply.js` added `annualToMonthlyFlow(s.investment)` — a PERCENT OF
      POTENTIAL — to `capital_stock`, a LEVEL, so the investment flow feeding
      the capital stock was frozen at its month-zero value while potential grew
      away from 100. Predicted and measured, all three exact: K converged to a
      constant `I/δ` = 22.5/0.065 = **346.15** (346.154 at m2400); growth
      decayed to `gA` = **0.930%** (0.9345% at m1200); K/Y fell 3.0 → **2.05**
      by m600. Now **K/Y 2.999923 and growth 1.5107%** against a stated 1.5.
      **A SECOND DEFECT UNDER IT, AND THE CODE STATED THE RULE IT BROKE.**
      `DEPRECIATION_RATE` was 0.065 against `SS_DEPRECIATION`'s 0.06, while its
      own note ended *"Keep them equal"* and `SS_DEPRECIATION`'s said it
      *"supersedes the old 0.065"*. Equalised at 0.06 — **which is what makes
      `investment_share = 22.5` correct**, so it did NOT need re-deriving to
      24.0 as this task's original entry predicted. `test/params.test.js` now
      reads the parameter instead of a hardcoded 0.06, and a new test asserts
      the two rates are equal.
      **THE INVARIANT CAUGHT THE FIX, ON TICK 2** — `invariants.js` check 4
      carried the *same* unit error, which is why it had never caught the
      defect: two copies of one wrong formula agree perfectly. Both corrected.
      **THE BLAST RADIUS WAS FAR SMALLER THAN PREDICTED, and that is the
      finding.** Across all six scenarios at m96 **only four quantities moved**:
      `potential_output`, `capital_stock`, `gdp_growth_annual` and `approval`.
      Every ratio is identical to 4dp. **The model is almost entirely
      ratio-invariant, which is exactly why nothing caught this for its whole
      life** — and `approval` is the one thing a player would have felt, because
      it reads year-on-year REAL INCOME, a level.
      **RE-MEASURED, NOT LEFT:** `CRISIS_IMPULSE_AMPLIFICATION` re-solved
      **2.1855 → 2.0461** (compulsory — `SOLVED_FROM_MODEL`), trough −9.000 at
      month 12; endogenous propagation 3.65 → **3.82**; UK sacrifice ratio
      0.35 → **0.36**; `TAX_SHOCK_TO_GDP` 0.487 → **0.484**; transmitted Taylor
      response 1.96 → **1.94**; `RATE_TO_INFLATION` @24m 0.1227 → **0.0797**,
      which halved because a hike used to be measured against a sagging
      ceiling. `docs/11` regenerated and re-stamped `5133ba7bc882334a`.
      **`test/steady-state.test.js` GAINED THE LEVEL ASSERTION IT NEVER HAD.**
      Every quantity it checked was a ratio, a rate or a percent of potential,
      and all of them are invariant when output and potential drift together —
      the milestone test was blind to an entire class of defect. It now asserts
      that potential grows at `potential_growth` and that K/Y stays where START
      solved it.

- [x] 5.8 The long yield is an AVERAGE — `open_items` A4, **and 5.1 is unblocked**
      `updateBondYield` read `expectedShort = s.policy_rate` for a term labelled
      *"expected path of the policy rate"*, so a ten-year bond was a one-day
      bond with a term premium bolted on and there was **no Fisher effect
      anywhere**. Measured in `overheating` pegged at 1.0%: the yield went
      1.45 → 0.73 → **0.00** as inflation ran 6.7 → 29.5 → **380.5**.
      **THE FIX IS NOT A FISHER TERM, WHICH IS WHY IT WAS POSSIBLE.** A4
      recorded the trap: `START`'s 3.25 = 2.5 + 0.75 already assumes the policy
      rate carries expected inflation, so ADDING it double-counts under a
      responding central bank and forces a steady-state re-solve. Pricing the
      expected AVERAGE short rate over the bond's life does not:
      `w·policy_rate + (1−w)·(r* + expected_inflation)`. **At rest both legs
      are 2.5, so the yield is 3.25 for ANY w** — steady state unmoved by
      construction, verified exact to 9dp. Under a peg they diverge and the
      yield follows inflation at exactly **1 − w = 0.6100** per point, measured
      to 1e-6. Now 4.68 → 17.71 → 227.15 in the same run.
      New `YIELD_POLICY_RATE_WEIGHT` = 0.39 [0.21, 0.54], **derived** from a
      3-year policy-rate reversion half-life [1.5, 5] over a 10-year horizon:
      `w = (1 − e^(−λT))/(λT)`, `λ = ln2/H`. The range is the half-life's.
      **TWO TESTS WERE ASSERTING THE OLD DEFECT** and were rewritten to test
      their own mechanisms rather than a contaminated level. The hike test
      required the 10-year to move **> 2.5pp on a 3pp hike** — nearly
      one-for-one, which no bond market shows; it now asserts SPEED (m1 equals
      m6 to 0.02pp) and SIZE (1.17pp = 0.39 × 3) separately, because the old
      bar conflated them. The Japan test required the yield stay under 2.0%; it
      now asserts the RISK PREMIUM against the pure debt-level term, because
      the yield legitimately carries an inflation expectation that episode
      should not have — the known deflation `todo` two tests down. Ownership is
      intact: **2.448pp** of risk premium between 7% and 75% held abroad.
      **Contained on purpose:** it does not reach private borrowers.
      `sovereign_premium_felt` passes on `max(0, risk_premium)`, and that is
      the debt, foreign and panic terms only.
      **IT DID NOT UNBLOCK 5.1, AND THIS ENTRY CLAIMED IT WOULD.** 5.1 was
      rebuilt on top of it and `overheating` still stops hyperinflating —
      **3.83% against 380.50%**, where the previous pass measured 3.13% with
      the OLD yield. Both fail, so the missing Fisher term was never the cause.
      The fix stands on its own merits. See `open_items` A6.
      **`stagflation` under the Taylor rule now ends OVERHEATING at 3.2%**
      rather than GOLDILOCKS at 2.9% — the rule still wins by a mile (against
      673%) and the higher long yield makes the win slower. `docs/11` §5
      updated and re-stamped `8f20248ce93b453a`.

- [ ] 5.13 `business_confidence` compares a user cost against a real rate — `open_items` B7
      **BLOCKS 8.10.** The gauge is declared 60 and settles at exactly
      **48.000** at a flawless steady state, forever. The whole 12-point gap is
      `BIZ_W_USER_COST × (user_cost − market_real_rate_ss)` = 2.0 × 6.000, and
      6.000 is exactly `DEPRECIATION_RATE × 100`: a user cost OF CAPITAL
      compared against a real INTEREST RATE. `consumer_confidence` settles at
      exactly its neutral 60, which is what makes the 48 legible as an error.
      Nothing reads it today, and **8.10 exists to display it** — a gauge that
      lies at rest is the `price_level` invariant's own argument one file over.
- [ ] 5.14 Measure the monetary validation targets on BOTH arms — `open_items` B8
      `MONETARY_ASYMMETRY_RATIO = 1.5` makes cuts transmit at 1/1.5 of hikes,
      on purpose. Both monetary validation tests shock with a HIKE and negate.
      `RATE_TO_INFLATION` @24m is **0.0795 on the hike arm and 0.2230 on the
      cut arm** against a published 0.2–0.4 — **the arm decides the verdict**.
      `RATE_TO_OUTPUT` is 0.4154 / 0.3074 and passes either way, which is why
      nobody looked. **Not licence to switch arms** (that is tuning to pass);
      the fix is to report the average and state the asymmetry separately,
      because a one-sided model measurement against a two-sided published
      estimate is not like-for-like.

- [x] 5.9 Re-derive the rate ceiling — **50 survived it** — `open_items` D1
      2.4 derived `max: 50` as a fixed point over 360 runs with events on,
      before 3.1 removed the wealth-channel overshoot. Re-run: six scenarios x
      60 seeds, events ON, recording what the rule **asks for** rather than
      what it gets — `s.dial_truncated` is cleared at the end of the tick (V2),
      so the request has to be captured at source by wrapping the autopilot.

      | ceiling | p90 | p99 | max | out of control at m96 |
      |---|---|---|---|---|
      | 20 | 22.1 | 153.1 | 165.3 | 41/360 |
      | 30 | 26.9 | 117.5 | 156.2 | 9/360 |
      | 40 | 26.9 | 41.2 | 82.8 | 1/360 |
      | **50** | 26.9 | 44.5 | **51.4** | **0/360** |
      | 60 | 26.9 | 44.5 | 56.2 | 0/360 |

      **Same shape, same answer, tails an order of magnitude smaller** — the
      max request at a ceiling of 20 was 13117.6 and is 165.3. The residual is
      restated: the worst event sequence now asks **51.4%** and is refused by
      1.4pp once in 360 runs, against 50.7% and 0.7pp.
      Without events it reproduces 2.4 almost exactly: bit-identical across all
      six from **28** up, never refused above **26.92**, `stagflation` stabilises
      between **20.00 and 20.25**.
      **D1's own estimate was wrong** — it said the threshold moved to "18–20";
      it is 20.00–20.25, so 2.4's 21.13 came down rather than into the teens.
      A2 is intact: refused **86/96** months at a ceiling of 20 against 0/96 at
      50, and `stagflation` ends at **22.65%** against 3.16%.
      **A derivation that survives the model moving under it is worth more than
      one that was never checked** — which is the whole argument for D1 having
      been raised. Tables in `dials.js`, `autopilot.js` and the autopilot test
      all replaced; the stale 1020.91% / 29.55% / 5.49% figures are gone.

- [ ] 5.15 `s.dial_truncated` is unreadable outside the tick, and a comment
      claims otherwise — `open_items` E7
      `engine.js` says *"the state field is what the UI reads on the spot; this
      is what the why panel reads afterwards, and both paths have to work."*
      Measured: the field is `null` the moment `tick()` returns, and **nothing
      in `src/ui/` or `src/game/` reads it at all**. There is one path, not
      two; the surviving record is `dial_truncated_count`. Either give the UI
      the read the comment promises (that is 8.5's job) or correct the comment
      — but not neither.
      **It is also a measurement trap that has already worked**: 5.9's first
      ceiling sweep read the applied rate as a fallback and silently reported
      the ceiling as the request, producing a max of exactly 20.0/25.0/30.0 at
      each candidate. Plausible and meaningless.

- [x] 5.10 The bounds stated twice — **there were THREE copies** — `open_items` D2
      `updateConsumption` clamped to `[10, 95]` and `invariants.js` check 8
      asserted the same band; `updateInvestment` clamped to `[2, 45]` and check
      8 asserted that too. **D2 missed the third: the `govt_spending` dial's
      `min: 0, max: 70` is check 8's `govt_purchases` band**, since
      `govt_purchases` tracks that dial. Each copy carried a comment saying the
      numbers were "taken from the invariant so there is one source" — intent
      with no mechanism. All three now read `DEMAND_BOUNDS`, exported from
      `invariants.js`.
      **Not tidiness.** A rule clamp WIDER than its invariant makes the model
      throw on a state it generated itself; NARROWER and the invariant can
      never fire, so the saturation it exists to catch is invisible. Equality
      is the only safe relation and it is now structural.
      Guarded by a test that exercises it rather than restating it:
      `stagflation` pins investment at its ceiling for **51 of 96 months** with
      invariants on every tick. **Both drift modes verified**: a wider rule
      clamp throws `investment = 45.050 outside [2, 45] at tick 46`; a dial
      ceiling at 80 fails the equality directly.
      **`tax_rate`'s dial also runs 0-70 and is deliberately NOT wired in** — a
      different quantity that coincides on a number, and merging them because
      they look alike is the class of error B2 and 5.5 both were.
      Behaviour-neutral: six scenarios x 96 months identical, `docs/11`'s
      fingerprint unmoved.

- [x] 5.16 `TEST-RESULTS.md` is byte-stable and counts its own numbers — `open_items` E8
      Found by checking whether the committed artefact matched a fresh run —
      the thing it exists for. **It matched, and it did not**: regenerating on
      an idle machine gave **334 differing lines, none of them a measurement**.
      All were `duration_ms` timings pasted in with the raw TAP stream. An
      artefact meant to be compared across passes could not distinguish *the
      model moved* from *the machine was busy*.
      Stripped in both forms. The first fix caught only `  duration_ms: 3.94`
      and missed the summary `# duration_ms 845.7`, leaving it stable except
      for one line — **worse than unstable, because it looks stable until you
      diff it.** Verified byte-identical across two consecutive runs.
      **The header also carried a hand-typed count**: "~126 sourced parameters"
      against an actual **145**, in the file whose header promises "the output
      of running the model, not a description of it". Now counted from `P` and
      `RULES` at generation time.

- [x] 5.17 `cause-effect.mjs` WRITES and CHECKS docs/11's tables — `open_items` E9
      **The fingerprint could be defeated by running `--stamp`**, because it
      hashes the model's measurements rather than the document's contents.
      Falsify a cell, stamp, and `--check` passed. **That is exactly how §1 and
      §3–§7 survived the Phase 4 HARD GATE** — 4.3 regenerated §2, stamped, and
      the check was green for the rest of the audit while §1's kernel table
      still described the pre-2.1 model.
      The tool's comment weighed fingerprint against full generation and chose
      the fingerprint, because most of docs/11's value is its prose. That is
      right and is kept. **The third option it did not consider is what
      shipped: check the tables, leave the prose.**
      `--check` now verifies **all seven** pasted tables cell by cell;
      `--write` rewrites the six that are verbatim and re-stamps, replacing the
      throwaway scratchpad script the splicing had been done with. §4 is
      checked but not written — its header is hand-widened for readability, so
      the comparison is on **numbers**, which go stale, not formatting, which
      is the document's business.
      **Both defeats verified to fire**: a falsified cell in a writable table
      is caught after `--stamp` and repaired by `--write`; a falsified cell in
      the hand-maintained table is caught and reported as hand-maintained.
      **A bug in the first version, worth recording**: `measuredTables()`
      captured `console.log` calls, but several sections print a whole block in
      ONE call, so a per-element `^--` match found nothing and every table was
      silently reported as unmeasured. `fingerprint()` joins before matching
      and so never had to care.
      **STILL UNCOVERED:** the numbers quoted inline in the prose. Every
      stale-number defect this audit found was in prose — that is 5.12 / E4.

- [x] 5.18 The `SOLVED_FROM_MODEL` guard could not report drift — `open_items` E10
      The register's header says its constants **"must be RE-SOLVED whenever
      the model changes"**, and nothing enforced it. The only check on
      `CRISIS_IMPULSE_AMPLIFICATION` sat inside a `todo` that **fails by
      design** because of its other half (`CRISIS_SCAR_AMPLIFICATION`,
      deliberately unsolved, C2). So the constant that IS meant to reconcile
      could drift arbitrarily and the result read `not ok … # TODO` before and
      after, character for character.
      **Not hypothetical**: 5.7 took the realised amplification to **2.1155
      against a declared 2.1855**, and it was re-solved only because the
      register was read and remembered — the exact failure mode a register
      exists to remove.
      Split into a **hard** test; only the scar half stays `todo`. Verified by
      setting the constant to 2.4461, which now fails.
      **The class is the finding and it is three deep** — a guard read as
      answering one question while structurally answering another: `docs/11`'s
      fingerprint (E9), this register (E10), `s.dial_truncated`'s "both paths
      have to work" (E7). Every tripwire deserves the question *what would have
      to be true for this to pass while the thing it guards is broken?*

- [ ] 5.11 Extend lint check (f)- [ ] 5.11 Extend lint check (f) past `src/rules/` — `open_items` E6
      `leverage_max`'s bare `1.35` escaped 5.3 because check (f) walks
      `src/rules/` only. **254 undeclared literals sit outside that scope:**
      `ui/chart.js` 53, `game/scenarios.js` **49**, `game/indicators.js` 42,
      `invariants.js` **21**, `game/events.js` 16, `game/dials.js` 13.
      Most of `ui/` is presentation and should stay out. The two that matter
      are `scenarios.js` — DATA the model is calibrated against — and
      `invariants.js`, which holds the bounds 5.10 is about. `game/events.js`
      and `game/endings.js` decide what happens to the player.
      **`test/` is a third scope**, and 5.7's hardcoded `0.06` is why it matters.

- [ ] 5.12 A tripwire for numbers re-typed into prose — `open_items` E4
      **Every generated artefact in this project has a `--check` and every
      number re-typed into prose has none**, and Phase 5's verification found
      five stale prose numbers and one inverted claim in an afternoon. The
      worst: `docs/02` calls the transmitted Taylor response "the most
      important single fact about this model's dynamics", it has been **1.96**
      since 3.1, and the document said 1.83 while `TAYLOR_INFLATION`'s note
      said 1.80 — past a HARD GATE whose stated job was to re-measure
      everything.
      Not obviously fixable by a tool: prose numbers have no schema. The
      cheapest partial guard is a convention — quote a number in prose ONLY
      with the command that regenerates it beside it — which `open_items.md`
      already claims to follow and did not. A stronger one: a `docs/`-wide
      sweep that extracts `**N.NN**` patterns near a named quantity and asks
      the tool for the current value.


## Phase 6 — What to add

- [ ] 6.1 Macroprudential dial: the countercyclical capital buffer
      **NOW HALF OF AN ANSWER TO A LIVE REGRESSION** — `open_items` A1. 3.1
      left the `bubble` scenario deflating on its own. Current path, no player
      input: the credit gap runs **9.16 (m24) → 11.65 (m48) → 11.05 (m72) →
      7.08 (m96)**, peaking at **11.98 in month 58**, where it used to climb
      monotonically to 14.10. 5.4 recovered part of it by deriving the trend
      speed and 5.2 a little more (a slower debt-service leg means the credit
      loop's balancing counterpart arrives later), and **the shape is
      unchanged: it still peaks and unwinds inside the term.** A bubble the
      player cannot act on was already a spectacle rather than a decision; one
      that resolves itself teaches that ignoring it works. See the `todo` in
      `test/scenarios.test.js`.
      **Do 5.7 first.** The remaining gap is partly structural — the BIS trend
      carries a slope state and this one does not — and 5.7 changes the
      denominator (`potential_output`) that credit/GDP is measured against.
- [ ] 6.2 **Historical scenarios: play the moment**
- [ ] 6.3 Separate housing from equities — **and it is the real fix for `open_items` B4**
      One `ASSET_PRICE_MEANREVERSION` serves two sourced horizons: equity is
      *"cumulative ~1yr"*, housing *"2–5yr"*. Equity implies ~0.08 (outside the
      published [0.01, 0.05]); housing implies 0.028–0.038 (inside it). Left at
      0.02 and recorded rather than tuned, and the consequence is measured:
      **the model delivers 0.94% of a 4.60% level response at 12 months** —
      right in the long run, slow to get there.
      **`open_items` D4 is the same shape one block over:** one
      `PRIVATE_DEBT_REPRICING_YEARS` cannot carry the US prepayment asymmetry
      (fast when rates FALL, locked when they rise). If this task splits the
      asset legs, look at whether the same split is wanted there.
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
      **UNBLOCKED: 5.4 HAS LANDED**, and it got part of the way. The
      credit-gap gauge was a broken bubble detector — mean-reverting far faster
      than the HP filter it claims to approximate, so it under-read persistent
      booms, which is the exact situation it exists for. `CREDIT_TREND_CATCHUP`
      is now derived (0.127/yr) and the brief's "3–4x too fast" was measured at
      **1.58x**. What remains is structural and no speed fixes it: the BIS
      trend carries a slope state and this one is level-only. **So the wedge
      may now be built on the gauge, but 6.1 is still the other half** — a
      bubble the player cannot act on is a spectacle. And `crisis_prob`'s own
      arithmetic is only declared as of 5.3; read `CREDIT_GAP_WARNING`,
      `CREDIT_GAP_ONE_SD` and `CRISIS_PROB_RZONE_UPLIFT` before putting that
      number on screen.
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
- [ ] 7.3 **Diagnose why a rate cut buys LESS inflation the hotter the economy**
      `open_items` A3, and nobody has explained it. Below the capacity ceiling
      the inflation response to a 1pp cut **falls** as the output gap rises,
      then jumps at the ceiling: 0.105 at a zero gap, 0.061 at +1.98, 0.033 at
      +3.02, then 0.055 at +4.08. **Verified pre-existing** — identical before
      and after Phase 3 — but backwards on its face. It also made the
      capacity-cliff test a coin toss for as long as it has existed: it passed
      by 0.004 and failed by 0.006 across an unrelated change.
- [ ] 7.4 Sweep the judgement set, starting with `updateCreditSpread` — `open_items` E5
      **Four of that function's six terms are judgement** with no source — the
      weights on leverage (0.8), collateral (0.5), realised defaults (0.3) and
      the 30%/month adjustment speed — against two sourced. 5.3 labelled them;
      it did not resolve them. It matters more than most judgement blocks
      because `credit_spread` is inside `market_rate`, which is what every
      private borrower pays, and since 5.2 it also sets the rate the whole
      private debt STOCK walks toward. Fold into 7.1's Monte Carlo rather than
      inventing ranges for them.
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

## Phase 11 — The demand block **(the pass's largest finding, and the plan has nothing for it)**

Not in the fourth-audit brief and not in `docs/13`. It is **one finding seen
five ways**, and every one of them is the same shape: *every real quantity
moves too little for the price change that caused it.*

| | model | literature |
|---|---|---|
| UK 1979-83 sacrifice ratio | **0.35** | Ball 1994: 2–4 |
| `TAX_SHOCK_TO_GDP` | **0.487** | Romer-Romer: 2–3 |
| austerity paradox | absent at every playable gap | — |
| endogenous crisis propagation | **3.65** | was 8.4 of Cerra-Saxena's 10 |
| post-crisis rebound | 46% of the trough with BOTH amplifiers off | Cerra-Saxena: none |

- [ ] 11.1 Diagnose it — `open_items` A2 — **AND IT NOW BLOCKS 5.1**
      Promoted from "the strongest candidate for the next pass" to a blocker
      for a Phase 5 task. The sixth sighting is the one that breaks something:
      `overheating` pegs the rate at 1.0% against 5-6% expected inflation, and
      a **−3.9% real rate held for two hundred months** moves investment 22.65
      → 23.48 with the output gap peaking at +2.2 before falling back. The
      scenario converges to 1.8% instead of diverging. It only ever diverged
      because the model destroys 2.27pp of household income a month (A6).
      **It is not a calibration problem**, and 4.1 proved that from the other
      side: `CRISIS_SCAR_AMPLIFICATION` re-solves to 1.06–1.26 against a
      published [2.0, 4.5], and forcing it there would make the exogenous
      capacity cut supply 7.9–9.5 of Cerra-Saxena's 10 while the model supplies
      almost nothing. **The refusal is the finding.**
      Start with the multiplier chain: `disposable_income → yd_permanent
      (5%/month) → consumption → output → market_income`. `apc_ss` is 0.709 and
      the transitory MPC is 0.35, both sourced; what is not obviously sourced
      is the 5%/month permanent-income speed (5.3 labelled it judgement) and
      whether the income-expenditure loop closes at all within a term.
      **Do 5.7 first** — the capital-units defect is in the supply block and
      changes the denominator every one of these is measured against.
- [ ] 11.5 The capacity ceiling is a hard switch, and a scenario's lesson sits
      0.6pp from it — `open_items` A7
      Sweeping a standing demand shift through `overheating`, month-96
      inflation goes **4.05% at d = −0.51 and 39.20% at d = −0.48**. A 0.03pp
      change, 35 percentage points of inflation, nothing in between. The
      isolating experiment names it: peak output gap **2.177 vs 10.348** —
      the scenario diverges if and only if the gap climbs past
      `MAX_CAPACITY_OVERHEAT` = 4 inside the term.
      **This is `docs/12`'s bifurcation in the inflationary direction.** Phase 2
      closed the disinflationary one and moved it to the Fisher point; nobody
      has measured this one. It is not the same defect — that was a lag on the
      wrong quantity, this is a real threshold behaving as designed — but it
      has the same shape and the same consequence.
      **The question is whether a hard ceiling is the right shape**, or whether
      it should be a steep ramp the way `monetaryEasingScale` and the Okun
      coefficient became after docs/07 L6 established step-in-the-playable-
      range as a defect class. `docs/02` already calls it the model's only
      genuine discontinuity, so this is a deliberate design decision to
      re-open, not an oversight. **Do not close it by moving `overheating`
      away from the edge** — that is A6's job and it does not remove the
      bifurcation.
- [ ] 11.2 Okun: unemployment does not follow output into a crash — `open_items` B3
      The crash trough is **exactly** on target (−9.0000% against
      `CRISIS_OUTPUT_TROUGH`) while unemployment peaks at **+1.86pp against a
      published 2–5**. The output hole is the right depth and the labour market
      does not follow it in. Probably 11.1 seen from the labour side.
      `TEST-RESULTS.md`'s OPEN on the output→employment lag is related.
- [ ] 11.3 Re-solve `CRISIS_SCAR_AMPLIFICATION` — `open_items` C2
      **Only after 11.1**, and 4.2's `SOLVED_FROM_MODEL` register is what makes
      that safe: the constant is DEFINED by a solve, so it must be re-solved
      whenever the demand block changes, and the register fails until it is.
- [ ] 11.4 Re-derive `debt_trap`'s starting vector — `open_items` B6
      Two of its own tests sit on very thin margins — *"the real economy
      responds to the yield at all"* passed on an output gap of 0.63 and failed
      at −0.11 under a change that was not aimed at it. A scenario whose central
      claim survives on a tenth of a percentage point will keep breaking.

## Phase 10 — Documentation (throughout, not at the end)

- [ ] 10.1 Rewrite `docs/10` wholesale
      **CARRY FORWARD the section 4.2 added** — "Two numbers in this model are
      not evidence, and one of them is the crash". It is the only place the
      epistemic status of the crash magnitude is written down for a reader.
- [~] 10.2 Regenerate `docs/11` — **tables done, prose PARTLY done**
      Regenerated in 4.3 and again in 5.4; all six section-2 dial tables are
      current and the doc carries a fingerprint of all 1464 measured numbers,
      checked by `npm test`. **STILL OUTSTANDING: the prose in sections 1 and
      3-7 has never been checked number-by-number** (open_items B1). The
      fingerprint asserts the doc was generated against this model; it does not
      assert every sentence was re-read.
      **CLOSED IN 5.2.** All of §1 and §3–§7 were regenerated and the prose
      corrected — and three sections were not merely stale, they taught the
      opposite of what the model does: §1's kernel table had **never** been
      regenerated since the file was created and described the pre-2.1 model,
      §5 said the Taylor rule LOSES `stagflation`, and §7 still called the
      closed bifurcation "the biggest hole". Re-stamped `86c1b104fab5561d`.
      The one block still flagged unverified is `debt_trap`'s five-row policy
      table in §5, marked in place as not re-run.
- [~] 10.3 Regenerate `TEST-RESULTS.md` — done repeatedly, redo at the end
      `node tools/report.mjs`. Currently **162 tests, 146 pass, 0 fail, 16
      open** — 5.2 closed one `todo` and added two assertions, 5.6 added one.
      **Its `todo` prose is a live staleness surface:** `report.mjs` copies
      those messages verbatim, so a stale number in a `todo` is published. Phase
      5's verification found four. Re-read them, do not just re-run the tool.
- [ ] 10.4 Update `docs/02`
      **PARTLY DONE:** 2.3 added a new section, "THE MOST IMPORTANT SINGLE FACT
      ABOUT THIS MODEL'S DYNAMICS", carrying the 0.37 → **1.96** transmitted
      Taylor response (it said 1.83 until Phase 5 verification re-ran it, and
      the counterfactual sentence under it had inverted — raising
      `TAYLOR_INFLATION` DOES work now). STILL OUTSTANDING: Part 5's bracketed months-to-peak
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
      tests, fourteen todo"). Both have drifted again since — currently **144
      parameters and 162 tests, 16 todo**. Redo at the end rather than chasing
      it, and note the README mentions neither `tools/build.mjs --check` nor
      `tools/cause-effect.mjs --check`, which are two of the three tripwires.
- [ ] 10.9 Update `parameters.py`
      **PARTLY DONE:** `RATE_PASSTHROUGH_TO_BORROWERS` and
      `INVESTMENT_ADJUSTMENT_SPEED` added with range/confidence/source;
      `TAYLOR_INFLATION`'s note now carries the transmitted-response finding;
      `INVESTMENT_RATE_ELASTICITY`'s note records that its peak is produced
      rather than imposed. **5.2, 5.3, 5.4 and 5.5 landed the bulk of the
      rest:** `CREDIT_TREND_CATCHUP`, `PRIVATE_DEBT_REPRICING_YEARS`, the
      twelve literals 5.3 promoted, `FIRESALE_LEVERAGE_TRIGGER`, and
      `CREDIT_GAP_CRISIS_THRESHOLD`'s false note — corrected in place with the
      false claim quoted rather than quietly deleted. **STILL OUTSTANDING:**
      macropru bounds (6.1), and `investment_share`'s re-derivation from 22.5
      to 24.0 (5.7).
- [-] 10.10 Write `docs/14` — the report — **NOT DOING, and the report is deleted**
      Written, then removed on instruction: **this project does not want audit
      reports.** A report is a document about the work rather than the work,
      and this pass has spent most of its effort correcting exactly that class
      of document. Everything actionable in it now lives in this file as a
      numbered task — 5.7-5.12 and Phase 11 — and every finding lives in
      `open_items.md` with its reproduction. Nothing was lost: the reasoning is
      in `docs/13`'s "As built" blocks and in the commit messages, both of
      which sit next to the change they describe. **Do not write docs/14.**
