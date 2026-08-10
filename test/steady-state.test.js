/**
 * THE MILESTONE TEST. Do not proceed past it.
 *
 * A model that will not sit still is unplayable, and every bug you find later
 * will be this bug. The prototype failed this: left alone it drifted to a
 * permanent +0.6% output gap and a 12pp credit gap — past the BIS danger line,
 * with the player asleep, which destroyed the Bubble scenario.
 *
 * WHO WRITES THIS: you (the harness). It fails until the rules exist.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../src/state.js';
import { run } from '../src/engine.js';

// events: false — 'no input' means no shocks either, or this measures luck.
const QUIET = { events: false };

const TOLERANCE = {
  output_gap: 0.01,        // pp
  credit_to_gdp_gap: 0.05, // pp — the prototype reached 12
  inflation: 0.02,
  unemployment: 0.02,
  govt_debt: 0.5,
};

// Credibility is deliberately NOT in that list. 200 months of on-target
// inflation SHOULD build trust — that is the model working, not drift. It is
// asserted separately below, and it disturbs nothing else because kappa only
// multiplies the output gap, which is zero at rest.

test('200 ticks of no input and nothing drifts', () => {
  const s = newState();
  const start = { ...s };
  run(s, 200, QUIET);
  for (const [key, tol] of Object.entries(TOLERANCE)) {
    assert.ok(Math.abs(s[key] - start[key]) < tol,
      `${key} drifted from ${start[key]} to ${s[key]} over 200 ticks ` +
      `(tolerance ${tol}). The model has no equilibrium to sit at.`);
  }
});

test('credibility rises when the target is hit, and slowly', () => {
  const s = newState();
  const before = s.credibility;
  run(s, 200, QUIET);
  assert.ok(s.credibility > before, 'hitting the target for 200 months built no trust');
  assert.ok(s.credibility - before < 0.25,
    `credibility rebuilt ${(s.credibility - before).toFixed(3)} in 200 months — ` +
    `too fast. It should fall ~3x quicker than it rebuilds.`);
});

test('the credit gap does not open on its own', () => {
  // This one is load-bearing for the Bubble scenario: if the baseline gap
  // drifts, "every gauge looks healthy and you still die" stops being true.
  const s = newState();
  run(s, 400, QUIET);
  assert.ok(Math.abs(s.credit_to_gdp_gap) < 0.1,
    `credit gap reached ${s.credit_to_gdp_gap}pp with no player input`);
});
