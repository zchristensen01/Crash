/**
 * Every scenario must be internally consistent AND survivable by SOME policy.
 * A scenario that cannot be won teaches helplessness, not economics — except
 * stagflation, which is allowed to have no clean answer. That is its lesson.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/game/scenarios.js';
import { newState, regime } from '../src/state.js';
import { P } from '../src/params.js';
import { run } from '../src/engine.js';
import { applyAutopilot } from '../src/game/autopilot.js';

test('every scenario starts internally consistent', () => {
  for (const [key, sc] of Object.entries(SCENARIOS)) {
    const s = newState(sc.overrides);
    const g = (s.potential_growth + s.inflation) / 100;
    const interest = s.govt_debt * s.yield_10y / 100;
    const deficit = s.govt_spending + s.transfers + interest - s.tax_rate;
    assert.ok(Math.abs(deficit - s.deficit) < 0.01,
      `${key}: budget-implied deficit ${deficit.toFixed(2)} != ${s.deficit}. ` +
      `An inconsistent start drifts from tick 1 and the run teaches nothing.`);
  }
});

test('the bubble scenario looks healthy on every gauge except the credit gap', () => {
  // The best teaching tool in the set, and it only works if this holds.
  const s = newState(SCENARIOS.bubble?.overrides);
  assert.ok(s.inflation < 3 && s.unemployment < 6 && s.approval > 50,
    'the bubble scenario should look fine everywhere the player is looking');
  assert.ok(s.credit_to_gdp_gap > 3,
    'the credit gap should already be warning');
});

test('the bubble hides for four years — the design promise', () => {
  // THE POINT OF THE WHOLE SCENARIO. If the headline gauges start looking bad
  // early, the player hikes, and the thing it was built to teach never
  // happens. Every visible number must stay healthy while the credit gap
  // crosses the BIS danger line.
  //
  // INFLATION IS IN THIS LIST NOW. It was not, and the previous scenario
  // crossed 3% by month three and reached 4.7% by year four — the most
  // visible gauge on the screen shouting while the test called it hidden
  // (docs/07 M6). An unasserted promise is not a promise.
  const s = newState(SCENARIOS.bubble.overrides);
  for (let year = 1; year <= 4; year++) {
    run(s, 12, { assertEveryTick: false });
    assert.ok(s.inflation < 3, `year ${year}: inflation ${s.inflation.toFixed(1)}% is visibly bad`);
    assert.ok(s.unemployment < 6, `year ${year}: unemployment ${s.unemployment.toFixed(1)} is visibly bad`);
    assert.ok(s.approval > 55, `year ${year}: approval ${s.approval.toFixed(0)} is visibly bad`);
    assert.ok(regime(s) === 'GOLDILOCKS',
      `year ${year}: the regime box reads ${regime(s)}, which tells the player ` +
      `to act on something other than the credit gap`);
  }
  assert.ok(s.credit_to_gdp_gap > 9,
    `after 4 years the credit gap is only ${s.credit_to_gdp_gap.toFixed(1)}pp — ` +
    `it must cross the 9pp BIS line while everything else looks fine`);
});

test('every scenario starts in, and stays a quarter in, its advertised regime', () => {
  // "A regime also has to be DRIVEN, not asserted" — scenarios.js says it and
  // nothing enforced it. The recession scenario asserted unemployment 9% with
  // a stimulative rate and no demand shortfall, so its output gap was
  // POSITIVE from month one and unemployment was under 5% by month six. Its
  // trap — that the rate dial is already dead — was never tested (docs/07 M6).
  const expected = {
    calm: 'GOLDILOCKS',
    overheating: 'OVERHEATING',
    recession: 'RECESSION',
    stagflation: 'STAGFLATION',
    debt_trap: 'GOLDILOCKS',        // the debt is the problem, not the cycle
    bubble: 'GOLDILOCKS',           // by design: nothing visible is wrong
  };
  // A QUARTER, not a year, and that is the honest window. A scenario is a
  // starting POSITION; where it goes is the game. Stagflation in particular
  // cannot hold its box for a year, because holding it would require the
  // model to be stable at 9% inflation with a passive central bank — and the
  // Taylor principle says it must not be. What has to be true is that the
  // player arrives in the regime the scenario advertises and gets long enough
  // to read the board.
  for (const [key, sc] of Object.entries(SCENARIOS)) {
    const s = newState(sc.overrides);
    assert.equal(regime(s), expected[key], `${key} does not even START in its regime`);
    run(s, 3, { assertEveryTick: false, events: false });
    assert.equal(regime(s), expected[key],
      `${key} drifted out of ${expected[key]} within a quarter with no player ` +
      `input: gap ${s.output_gap.toFixed(1)}, inflation ${s.inflation.toFixed(1)}, ` +
      `unemployment ${s.unemployment.toFixed(1)}`);
  }
});

test('the recession scenario has the rate dial genuinely dead', () => {
  // Its stated trap. Worth asserting, because the previous version had 2pp of
  // room and an economy that recovered on its own inside six months.
  const s = newState(SCENARIOS.recession.overrides);
  run(s, 12, { assertEveryTick: false, events: false });
  assert.ok(s.output_gap < -3, `the gap is ${s.output_gap.toFixed(1)} after a year`);
  assert.ok(s.policy_rate - P.SS_ELB.value < 1.0,
    `there is still ${(s.policy_rate - P.SS_ELB.value).toFixed(2)}pp of room on the ` +
    `rate dial — the scenario's whole trap is that there is not`);
});

test('no scenario produces absurd numbers inside a term', () => {
  // The linearised stability test is blind to this: both the fire-sale and
  // collateral terms sit at a max(0, ...) kink AT the steady state, so a loop
  // that is explosive only AWAY from rest reads as perfectly stable there.
  // This caught the credit-asset loop going vertical in the bubble scenario.
  for (const [key, sc] of Object.entries(SCENARIOS)) {
    // Run under a Taylor-rule central bank. With NO policy at all, a
    // scenario starting above target must diverge — that is the Taylor
    // principle working, not a bug. What has to hold is that a rule-following
    // central bank keeps every scenario numerically sane.
    const s = newState(sc.overrides);
    run(s, 96, { assertEveryTick: false, autopilot: applyAutopilot });
    for (const k of ['inflation', 'asset_prices', 'output_gap', 'govt_debt']) {
      assert.ok(Number.isFinite(s[k]) && Math.abs(s[k]) < 1e4,
        `${key}: ${k} reached ${s[k]} within a term` +
        (s.ending ? ` (ended in ${s.ending.title})` : ''));
    }
  }
});
