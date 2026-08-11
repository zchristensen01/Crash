/**
 * THE BUBBLE LOOP'S GAIN — measured at four operating points, because at one
 * of them it says nothing.
 *
 * THE LOOP: excess credit growth lifts asset prices
 * (ASSET_PRICE_CREDIT_CHANNEL in updateAssetPrices), richer collateral
 * supports more borrowing (CREDIT_COLLATERAL_FEEDBACK in updateCreditGap), and
 * that is more excess credit growth. Their product is the gain.
 *
 * WHY THIS FILE EXISTS RATHER THAN A LINE IN stability.test.js. That test
 * takes the spectral radius of the core block's Jacobian AT THE STEADY STATE,
 * and it passed throughout the period when a permanent 1pp rate cut sent
 * asset/fundamental to 2.87e11. Measured on the pre-fix tree, amplification of
 * a credit_impulse perturbation over 96 months:
 *
 *     steady state          0.0130      stable
 *     1pp cut, settled      0.0169      stable
 *     2pp cut, settled    315.5195      EXPLOSIVE
 *
 * Two percentage points from the point of linearisation, the same loop has a
 * gain four orders of magnitude larger. A Jacobian at the fixed point cannot
 * see that, and no amount of care in computing it would have helped.
 *
 * THE MECHANISM, and the fourth audit's first attempt at naming it was WRONG.
 * The 1.1 divergence guard originally attributed the blindness to the crash
 * meter's thresholds (`gap - 3.0`, `A/F > 1.25` at credit.js:318-322). Those
 * gate updateCrisisProbability — the DISPLAY — and have nothing to do with the
 * loop. The real kink is `Math.max(0, credit_growth_annual - nominalGrowth)`
 * in updateAssetPrices: excess credit growth is exactly zero at the steady
 * state and the forward leg of the loop is switched off there, one-sidedly, at
 * precisely the point a linearisation evaluates it. That was read from the
 * source rather than measured, which is the error this project's standing rule
 * exists to prevent, and it is corrected here by the table above — which is a
 * measurement of the whole loop and does not depend on naming the kink at all.
 *
 * The gain is now below one everywhere, and the operating point barely matters
 * (0.0071 to 0.0097). What closed it was fixing the asset-price semi-elasticity's
 * units (3.1), not touching either coefficient of the loop — both sit at their
 * published central values.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../src/state.js';
import { tick } from '../src/engine.js';
import { Trace } from '../src/trace.js';
import { LagPipeline } from '../src/lags.js';
import { makeRng } from '../src/rng.js';
import { applyDialChange } from '../src/game/dials.js';

const OPTS = { events: false, endings: false, assertEveryTick: false, findNaN: false };

function settled(cut, months) {
  const w = { s: newState(), t: new Trace(false), p: new LagPipeline(), g: makeRng(1) };
  if (cut) applyDialChange(w.s, w.p, 'policy_rate', 2.5 - cut);
  for (let m = 0; m < months; m++) tick(w.s, w.t, w.p, w.g, OPTS);
  return w;
}

/** Amplification of a credit_impulse perturbation over `n` months. */
function amplification(cut, settleMonths, n, eps = 1e-4) {
  const a = settled(cut, settleMonths);
  const b = settled(cut, settleMonths);
  b.s.credit_impulse += eps;
  for (let m = 0; m < n; m++) { tick(a.s, a.t, a.p, a.g, OPTS); tick(b.s, b.t, b.p, b.g, OPTS); }
  return (b.s.credit_impulse - a.s.credit_impulse) / eps;
}

const POINTS = [
  { label: 'steady state', cut: 0, settle: 60 },
  { label: '1pp cut, 24m', cut: 1, settle: 24 },
  { label: '1pp cut, 96m', cut: 1, settle: 96 },
  { label: '2pp cut, 96m', cut: 2, settle: 96 },
];

test('the bubble loop has gain below one AT EVERY OPERATING POINT, not just at rest', () => {
  const rows = POINTS.map((pt) => {
    const w = settled(pt.cut, pt.settle);
    return {
      ...pt,
      excess: w.s.credit_growth_annual - (w.s.potential_growth + w.s.inflation),
      g96: amplification(pt.cut, pt.settle, 96),
    };
  });
  console.log('  loop gain (96-month amplification of a credit_impulse shock):');
  for (const r of rows) {
    console.log(`    ${r.label.padEnd(14)} excess credit growth ` +
      `${r.excess.toFixed(3).padStart(7)}  ->  gain ${r.g96.toExponential(3)}`);
  }

  // The forward leg is gated on excess credit growth being positive, so a
  // sweep that never leaves the steady state is not testing the loop at all.
  assert.ok(rows.some((r) => r.excess > 0.1),
    'no operating point in this sweep has excess credit growth, so the loop is ' +
    'switched off in all of them and the gains below mean nothing. The sweep ' +
    'has stopped reaching the state it exists to test.');

  for (const r of rows) {
    assert.ok(r.g96 < 1,
      `at "${r.label}" a credit_impulse shock amplifies ${r.g96.toExponential(3)}x ` +
      `over 96 months. Gain above one is a bubble loop with no equilibrium, and ` +
      `it was 315.52x here before the asset-price units were fixed. Do not close ` +
      `this by shrinking CREDIT_COLLATERAL_FEEDBACK or ASSET_PRICE_CREDIT_CHANNEL ` +
      `— both sit at their published central values and the defect has never ` +
      `been in either of them.`);
  }
});

test('the loop\'s balancing counterpart is the debt-service burden, and it binds', () => {
  // credit.js used to claim the loop "has no balancing counterpart — that is
  // the whole point of it". It has one, it is sourced, and this is it:
  // credit -> debt service -> defaults (DEFAULT_RATE_DSR) -> bank capital ->
  // spread -> real market rate -> back into the impulse.
  const w = settled(2, 720);
  const dsr = w.s.private_credit * (w.s.policy_rate + w.s.credit_spread) / 100;
  console.log(`  2pp cut held 60 years: credit/GDP ${w.s.private_credit.toFixed(1)}%, ` +
    `spread ${w.s.credit_spread.toFixed(2)}pp, default rate ${w.s.default_rate.toFixed(2)}%, ` +
    `debt service ${(dsr / w.s.dsr_ss).toFixed(2)}x its baseline`);

  assert.ok(Number.isFinite(w.s.private_credit) && w.s.private_credit < 500,
    `credit/GDP reached ${w.s.private_credit.toFixed(1)}% under a permanent 2pp cut`);
  assert.ok(dsr > w.s.dsr_ss,
    `the debt-service burden is ${(dsr / w.s.dsr_ss).toFixed(3)}x its baseline after ` +
    `sixty years of a 2pp cut. If it is not above one the counterpart is not ` +
    `binding, and whatever is bounding credit is something else.`);
  assert.ok(w.s.credit_spread > w.s.credit_spread_ss,
    `the credit spread is ${w.s.credit_spread.toFixed(2)}pp against a baseline of ` +
    `${w.s.credit_spread_ss.toFixed(2)}pp — the defaults the extra borrowing ` +
    `causes have to show up in the price of credit, or the counterpart has no ` +
    `route back into the impulse`);
});

test('credit/GDP integrates the impulse — the EMA is a filter, not a guard', () => {
  // The other false claim: "Without this the impulse integrates and credit/GDP
  // has no finite equilibrium under any sustained policy." An EMA of a
  // sustained input converges to that input, so a standing impulse passes
  // through undiminished. What bounds credit/GDP is the debt-service term
  // above; what makes the GAP look tame is credit_trend chasing the stock.
  const w = { s: newState(), t: new Trace(false), p: new LagPipeline(), g: makeRng(1) };
  applyDialChange(w.s, w.p, 'policy_rate', 1.5);
  const at = {};
  for (let m = 1; m <= 480; m++) {
    tick(w.s, w.t, w.p, w.g, OPTS);
    if ([96, 240, 480].includes(m)) at[m] = { credit: w.s.private_credit, impulse: w.s.credit_impulse };
  }
  console.log(`  permanent 1pp cut: credit/GDP 150.0 -> ${at[96].credit.toFixed(1)} (m96) -> ` +
    `${at[240].credit.toFixed(1)} (m240) -> ${at[480].credit.toFixed(1)} (m480), ` +
    `impulse still ${at[480].impulse.toFixed(3)}`);
  assert.ok(at[240].credit > at[96].credit && at[96].credit > 150,
    `credit/GDP is ${at[96].credit.toFixed(1)} at m96 and ${at[240].credit.toFixed(1)} at ` +
    `m240. A sustained easing has to raise the credit stock relative to GDP — if ` +
    `it no longer does, the EMA has acquired the guard its comment used to claim ` +
    `and the comment needs rewriting the other way.`);
});
