/**
 * Accounting identities hold every tick, in every regime, including crises.
 * A failure here is a bug in a rule. The invariant is never the thing to relax.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../src/state.js';
import { run } from '../src/engine.js';
import { checkInvariants, DEMAND_BOUNDS } from '../src/invariants.js';
import { tick } from '../src/engine.js';
import { Trace } from '../src/trace.js';
import { LagPipeline } from '../src/lags.js';
import { makeRng } from '../src/rng.js';
import { SCENARIOS } from '../src/game/scenarios.js';
import { DIALS } from '../src/game/dials.js';

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
      // debt_trap overflows govt_debt to Infinity at month 191 — the DECLARED
      // debt_service_spiral, 117 months after the debt-crisis ending would
      // have ended a real game at month 74. Identical before and after the
      // 3.4 asset bound; it is double precision giving out on a loop that is
      // supposed to run away, not a defect. Skipped rather than chased.
      if (!Number.isFinite(s[k])) continue;
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
  // 240 months, and `stagflation` rather than `overheating`, because the 3.4
  // asset-level bound pushed the wealth term down far enough that consumption
  // no longer reaches its own ceiling inside ten years. Measured: the bound
  // bites in 125 of 240 months here and 90 of 240 in overheating. Two
  // absurdity bounds in series, and the tighter one binds first — which is
  // the right ordering and worth knowing.
  const s = newState(SCENARIOS.stagflation.overrides);
  const trace = new Trace(true);
  const pipeline = new LagPipeline();
  const rng = makeRng(1);
  let bit = false;
  for (let m = 0; m < 240; m++) {
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

test('the asset-price bound is on the LEVEL, so a spiral cannot outrun it', () => {
  // B4: the old bound was clamp(gPct, -30, 12) on the monthly MOVE, which is a
  // growth floor once a spiral is running rather than a bound. Measured before
  // the change: the +12%/month ceiling bound for 48 consecutive months in
  // stagflation and asset/fundamental reached 1534.67.
  const worst = {};
  for (const key of Object.keys(SCENARIOS)) {
    const s = newState(SCENARIOS[key].overrides);
    run(s, 240, { assertEveryTick: false, events: false, endings: false, findNaN: false });
    const af = s.asset_prices / s.asset_fundamental;
    if (Number.isFinite(af) && (!worst.af || af > worst.af)) { worst.af = af; worst.key = key; }
  }
  console.log(`  worst asset/fundamental over 240 months, all six scenarios: ` +
    `${worst.af.toFixed(2)} (${worst.key})`);
  assert.ok(worst.af <= 10 + 1e-9,
    `asset/fundamental reached ${worst.af.toFixed(2)} in ${worst.key}. A clamp on ` +
    `the monthly move does not bound a compounding level — it only sets how fast ` +
    `the spiral runs. The bound is on the deviation for exactly this reason.`);
});

/**
 * A RULE'S CLAMP AND THE INVARIANT THAT CHECKS IT ARE ONE NUMBER
 * [4th audit 5.10, open_items D2].
 *
 * `updateConsumption` clamps to [10, 95] and check 8 asserts the same band;
 * `updateInvestment` clamps to [2, 45] and check 8 asserts that too; and the
 * `govt_spending` dial's own ceiling is check 8's third band. All three used
 * to be written out separately, each under a comment saying the numbers were
 * "taken from the invariant so there is one source" — a description of intent
 * with no mechanism behind it. They now come from `DEMAND_BOUNDS`.
 *
 * WHY IT MATTERS RATHER THAN BEING TIDINESS: if a rule's clamp were ever WIDER
 * than the invariant that checks it, the rule could produce a value the
 * invariant rejects, and the model would throw on a state the model itself
 * generated. If it were NARROWER, the invariant could never fire and the
 * saturation it exists to catch would be invisible. Equality is the only safe
 * relation and it is now structural.
 *
 * The run below is the one that exercises it: `stagflation` pins investment
 * against its ceiling for 51 of 96 months with invariants checked every tick,
 * so a clamp wider than the band would throw here rather than in a later pass.
 */
test('the demand clamps and check 8 are the same numbers, and a pinned run proves it', () => {
  // 1. The dial that feeds govt_purchases carries the same ceiling.
  const spend = DIALS.find((d) => d.key === 'govt_spending');
  assert.deepEqual([spend.min, spend.max], DEMAND_BOUNDS.govt_purchases,
    `the govt_spending dial runs [${spend.min}, ${spend.max}] and check 8 asserts ` +
    `[${DEMAND_BOUNDS.govt_purchases}]. govt_purchases tracks this dial, so a dial ` +
    `wider than the invariant lets the player produce a state the model rejects.`);

  // 2. A run that actually reaches a bound, with invariants on every tick.
  const s = newState(SCENARIOS.stagflation.overrides);
  let pinned = 0;
  for (let m = 1; m <= 96; m++) {
    run(s, 1, { events: false, endings: false });      // assertEveryTick defaults on
    if (s.investment >= DEMAND_BOUNDS.investment[1] - 1e-9) pinned += 1;
  }
  assert.ok(pinned > 20,
    `investment pinned against its ceiling in only ${pinned} of 96 months of ` +
    `stagflation, so this test is no longer exercising a clamp at all and the ` +
    `equality above is unverified by behaviour. Find a run that saturates.`);
  assert.ok(s.investment <= DEMAND_BOUNDS.investment[1],
    `investment left its own clamp at ${s.investment}`);
});
