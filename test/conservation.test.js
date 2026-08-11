/**
 * Accounting identities hold every tick, in every regime, including crises.
 * A failure here is a bug in a rule. The invariant is never the thing to relax.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../src/state.js';
import { run } from '../src/engine.js';
import { checkInvariants } from '../src/invariants.js';
import { tick } from '../src/engine.js';
import { Trace } from '../src/trace.js';
import { LagPipeline } from '../src/lags.js';
import { makeRng } from '../src/rng.js';
import { SCENARIOS } from '../src/game/scenarios.js';

test('invariants hold across 200 quiet ticks', () => {
  const s = newState();
  assert.doesNotThrow(() => run(s, 200, { assertEveryTick: true, events: false }));
});

test('invariants hold under a violent policy path', () => {
  // Stress it: slam the dials around and confirm the books still balance.
  const s = newState();
  assert.doesNotThrow(() => run(s, 96, { assertEveryTick: true, chaos: true, events: false }));
});

test('checkInvariants actually catches a broken book', () => {
  const s = newState();
  const prev = { ...s };
  s.govt_debt += 50;                    // impossible in one tick
  assert.throws(() => checkInvariants(s, prev, 1),
    'the invariant check passed a 50pp unexplained jump in debt');
});

/**
 * DEMAND COMPONENTS ARE PHYSICALLY BOUNDED, BOTH OF THEM [4th audit B3].
 *
 * updateInvestment has clamped to [2, 45] since the first audit. Consumption
 * had no bound at all, and the asymmetry was never deliberate — it only bites
 * outside the 96-month term or in a spiral, and every long-horizon run in this
 * suite sets assertEveryTick: false, so invariants.js check 8's [10, 95] band
 * never fired. An invariant that only holds while you are watching is not a
 * bound.
 *
 * Measured in `overheating` with no player input before the fix: households
 * consumed 431.66% of potential output at month 96 while their disposable
 * income was MINUS 26.47.
 */
test('no demand component can leave the physically possible range, ever', () => {
  const worst = {};
  for (const key of Object.keys(SCENARIOS)) {
    const s = newState(SCENARIOS[key].overrides);
    // 240 months, invariants OFF — the configuration in which this went unseen.
    run(s, 240, { assertEveryTick: false, events: false, endings: false, findNaN: false });
    for (const k of ['consumption', 'investment', 'govt_purchases']) {
      if (!worst[k] || s[k] > worst[k].v) worst[k] = { v: s[k], key };
    }
  }
  console.log('  worst case over 240 months, all six scenarios: ' +
    Object.entries(worst).map(([k, x]) => `${k} ${x.v.toFixed(1)} (${x.key})`).join(', '));

  assert.ok(worst.consumption.v <= 95 + 1e-9,
    `consumption reached ${worst.consumption.v.toFixed(2)}% of potential output in ` +
    `${worst.consumption.key}. Investment is clamped to 45 with a note that no ` +
    `economy invests more than that; consumption needs the same discipline, and ` +
    `the number is invariants.js check 8's own band.`);
  assert.ok(worst.investment.v <= 45 + 1e-9,
    `investment reached ${worst.investment.v.toFixed(2)}%`);
});

test('the consumption bound is recorded as a trace term the player can see', () => {
  // Investment's clamp has always been traced. Consumption's had nothing to
  // trace because it had no clamp, and a bound that bites invisibly is how a
  // saturating rule reads as a stable one on every summary statistic.
  const s = newState(SCENARIOS.overheating.overrides);
  const trace = new Trace(true);
  const pipeline = new LagPipeline();
  const rng = makeRng(1);
  let bit = false;
  for (let m = 0; m < 120; m++) {
    tick(s, trace, pipeline, rng,
      { events: false, endings: false, assertEveryTick: false, findNaN: false });
    const entry = trace.get('consumption');
    if (entry && Math.abs(entry.terms['bounded to a physically possible range']) > 1e-9) bit = true;
  }
  assert.ok(bit,
    'the consumption bound never bit in 120 months of overheating, so this test ' +
    'is not exercising it — either the bound moved or the scenario stopped ' +
    'reaching it');
});
