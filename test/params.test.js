/**
 * PARAMETER AND KERNEL TESTS — these PASS TODAY.
 * They guard the research record and the kernel calibration, both of which
 * are done. Everything else in test/ fails until its module is written.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { P, START, LAGS_MONTHS, KERNELS, KERNEL_SHAPE_K } from '../src/params.js';

const CONFIDENCE = new Set(['strong', 'moderate', 'weak', 'contested', 'judgement']);

test('every parameter has a value inside its range', () => {
  for (const [name, p] of Object.entries(P)) {
    assert.ok(p.low <= p.value && p.value <= p.high,
      `${name}: ${p.value} outside [${p.low}, ${p.high}] — low/high may be inverted`);
  }
});

test('every parameter has a unit, a source and a known confidence level', () => {
  for (const [name, p] of Object.entries(P)) {
    assert.ok(p.unit?.trim(), `${name}: missing unit (always a bug)`);
    assert.ok(p.source?.trim(), `${name}: missing source`);
    assert.ok(CONFIDENCE.has(p.confidence), `${name}: bad confidence '${p.confidence}'`);
  }
});

test('the deleted double-count has not crept back', () => {
  // A hard 0% wage floor AND a 0.20 strength multiplier model one friction
  // twice. Research 1.6 resolved this; WAGE_RIGIDITY_SHARE carries it alone.
  assert.ok(!('CLASSICAL_WAGE_CORRECTION_STRENGTH' in P),
    'CLASSICAL_WAGE_CORRECTION_STRENGTH is back — see docs/02 Self-correction 4');
});

test('kernels are normalised and peak on the documented month', () => {
  for (const [channel, weights] of Object.entries(KERNELS)) {
    const total = weights.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `${channel}: weights sum to ${total}, not 1`);

    const peak = weights.indexOf(Math.max(...weights)) + 1;
    assert.equal(peak, LAGS_MONTHS[channel],
      `${channel}: kernel peaks at month ${peak} but LAGS_MONTHS says ` +
      `${LAGS_MONTHS[channel]}. theta must be peak/(k-1), not peak/k — see ` +
      `the [PASS2 FIX] note in parameters.py.`);
  }
});

test('every fitted kernel shape has a lag entry', () => {
  for (const channel of Object.keys(KERNEL_SHAPE_K)) {
    assert.ok(channel in LAGS_MONTHS, `KERNEL_SHAPE_K['${channel}'] has no lag`);
  }
});

test('START satisfies the accounting identities', () => {
  const s = START;
  const g = (s.potential_growth + 2.0) / 100;          // nominal growth

  const interest = s.govt_debt * s.yield_10y / 100;
  const deficit = s.govt_spending + s.transfers + interest - s.tax_rate;
  assert.ok(Math.abs(deficit - s.deficit) < 1e-9,
    `budget-implied deficit ${deficit} != START.deficit ${s.deficit}`);
  assert.ok(Math.abs(deficit - s.govt_debt * g) < 1e-9,
    `deficit ${deficit} does not hold debt at ${s.govt_debt}% (needs ${s.govt_debt * g})`);

  assert.ok(Math.abs(s.policy_rate - (s.neutral_real_rate + 2.0)) < 1e-9,
    'policy rate != r* + target');
  assert.ok(Math.abs(s.yield_10y - (s.policy_rate + s.term_premium)) < 1e-9,
    'yield != policy rate + term premium');

  const iy = (0.06 + s.potential_growth / 100) * s.capital_output_ratio * 100;
  assert.ok(Math.abs(iy - s.investment_share) < 1e-9,
    `investment share ${s.investment_share}% will not hold K/Y at ` +
    `${s.capital_output_ratio} — needs ${iy.toFixed(2)}%. NB the textbook ` +
    `I = delta*K gives 18% and is the ZERO-growth case.`);

  assert.equal(s.output_gap, 0, 'a steady state has no output gap');
  assert.equal(s.credit_to_gdp_gap, 0, 'a steady state has no credit gap');
  assert.equal(s.unemployment, s.natural_unemployment, 'unemployment != natural');
});
