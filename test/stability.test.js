/**
 * STABILITY — an engineering risk, not an economics one.
 *
 * ~108 parameters and at least four reinforcing loops:
 *   credibility -> kappa -> inflation -> credibility
 *   credit -> asset prices -> collateral -> credit
 *   spread -> investment -> output -> defaults -> spread
 *   expectations -> wages -> prices -> expectations
 *
 * A system of that shape can be explosive and will not announce itself
 * politely. RUN THIS BEFORE TUNING FOR PLAYABILITY.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../src/state.js';
import { run } from '../src/engine.js';

/**
 * govt_debt is deliberately EXCLUDED from the core block. The debt-service
 * spiral (debt -> yield -> interest -> deficit -> debt) is listed in
 * parameters.py UNBALANCED_LOOPS as having no balancing counterpart, and
 * docs/02 Self-correction 5 says the brake is "forced consolidation" — which
 * is not modelled, because in this game the player IS the government. A debt
 * path that runs away when you ignore it is the debt-crisis ending working.
 * Its divergence rate is bounded separately below.
 */
const CORE = ['output_gap', 'inflation', 'expected_inflation', 'credibility',
  'unemployment', 'credit_to_gdp_gap', 'asset_prices', 'credit_spread'];

function jacobian(keys) {
  const eps = 1e-4;
  return keys.map((_, j) => keys.map((_, i) => {
    const s = newState(); s[keys[j]] += eps;
    const base = newState();
    run(s, 1, { assertEveryTick: false, events: false }); run(base, 1, { assertEveryTick: false, events: false });
    return (s[keys[i]] - base[keys[i]]) / eps;
  }));
}

function spectralRadius(J) {
  let v = J.map(() => 1), lambda = 0;
  for (let it = 0; it < 800; it++) {
    const w = J.map((row) => row.reduce((a, x, k) => a + x * v[k], 0));
    const norm = Math.hypot(...w);
    if (norm === 0) return 0;
    v = w.map((x) => x / norm);
    lambda = norm;
  }
  return lambda;
}

test('the core macro block is stable around the steady state', () => {
  const lambda = spectralRadius(jacobian(CORE));
  assert.ok(lambda < 1.0,
    `spectral radius ${lambda.toFixed(4)} >= 1 — the assembled system is ` +
    `explosive. Find the loop before tuning anything for feel.`);
});

test('the debt loop diverges, but slowly enough to be playable', () => {
  // Divergent BY DESIGN. What matters is the timescale: a small shock must
  // not become a crisis inside a term through arithmetic alone.
  const eps = 1e-4;
  const s = newState(); s.govt_debt += eps;
  const base = newState();
  run(s, 1, { assertEveryTick: false, events: false }); run(base, 1, { assertEveryTick: false, events: false });
  const perTick = (s.govt_debt - base.govt_debt) / eps;

  assert.ok(perTick > 1.0,
    'the debt-service spiral has stopped diverging — the debt-crisis ending ' +
    'is now unreachable and Self-correction 5 has no teeth');

  const overATerm = Math.pow(perTick, 96);
  assert.ok(overATerm < 3.0,
    `a 1pp debt shock compounds ${overATerm.toFixed(2)}x over a 96-month ` +
    `term. Faster than ~3x and the player cannot recover from an early ` +
    `mistake, which is punishing rather than instructive.`);
});

test('a one-off demand shock decays rather than compounding', () => {
  const s = newState();
  s.consumption += 1.0;
  run(s, 120, { assertEveryTick: false, events: false });
  assert.ok(Math.abs(s.output_gap) < 0.1,
    `a 1pp demand shock left a ${s.output_gap.toFixed(3)}pp gap after 10 years`);
});
