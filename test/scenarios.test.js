/**
 * Every scenario must be internally consistent AND survivable by SOME policy.
 * A scenario that cannot be won teaches helplessness, not economics — except
 * stagflation, which is allowed to have no clean answer. That is its lesson.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/game/scenarios.js';
import { newState } from '../src/state.js';
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
  const s = newState(SCENARIOS.bubble.overrides);
  for (let year = 1; year <= 4; year++) {
    run(s, 12, { assertEveryTick: false });
    assert.ok(s.unemployment < 6, `year ${year}: unemployment ${s.unemployment.toFixed(1)} is visibly bad`);
    assert.ok(s.approval > 55, `year ${year}: approval ${s.approval.toFixed(0)} is visibly bad`);
  }
  assert.ok(s.credit_to_gdp_gap > 9,
    `after 4 years the credit gap is only ${s.credit_to_gdp_gap.toFixed(1)}pp — ` +
    `it must cross the 9pp BIS line while everything else looks fine`);
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
