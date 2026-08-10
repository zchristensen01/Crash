/**
 * VALIDATION, NOT CALIBRATION.  (decision A3, docs/05)
 *
 * The reduced-form multipliers in parameters.py are NOT model terms — using
 * them alongside a structural C+I+G block would count the same channel twice.
 * They are targets: shock the assembled model and check what it produces.
 *
 * WHERE THE MODEL LANDS OUTSIDE A RANGE, THAT IS A FINDING TO SURFACE, NOT A
 * NUMBER TO TUNE TO. Ramey & Zubairy dispute the state-dependence outright.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { P } from '../src/params.js';
import { newState } from '../src/state.js';
import { run } from '../src/engine.js';

// events: false — a random oil shock landing in one arm of a comparison
// and not the other would make every multiplier reading noise.
const OPTS = { assertEveryTick: false, events: false };

/**
 * A regime has to be ESTABLISHED, not asserted. Setting `output_gap: -4` on a
 * fresh state does nothing — aggregateDemand recomputes it from C+I+G on the
 * first tick and labour pulls unemployment back to the Okun target. So drive
 * the economy there with a sustained policy and let it settle first.
 */
function settle(policy, months = 36) {
  const s = newState();
  Object.assign(s, policy);
  run(s, months, OPTS);
  return s;
}

/** Cumulative output response to a sustained +1% of GDP spending shock. */
function multiplierFrom(policy, years) {
  const base = settle(policy);
  const shocked = settle(policy);
  shocked.govt_spending += 1;
  shocked.govt_purchases += 1;
  run(base, years * 12, OPTS);
  run(shocked, years * 12, OPTS);
  return (shocked.output - base.output) / base.output * 100;
}

test('recession multiplier lands in the published range', () => {
  const m = multiplierFrom({ policy_rate: 8 }, 2);   // settles to a ~-4.5% gap
  const p = P.FISCAL_MULT_RECESSION;
  assert.ok(m >= p.low && m <= p.high,
    `model gives ${m.toFixed(2)}, literature says ${p.low}-${p.high}. ` +
    `Investigate before adjusting — this may be a real finding.`);
});

test('expansion multiplier lands in the published range', () => {
  const m = multiplierFrom({ policy_rate: 1.8 }, 2);
  const p = P.FISCAL_MULT_EXPANSION;
  assert.ok(m >= p.low && m <= p.high,
    `model gives ${m.toFixed(2)}, literature says ${p.low}-${p.high}`);
});

test('the multiplier is larger in a slump than in a boom', () => {
  // The state-dependence should EMERGE from the rising MPC, not be asserted.
  // Ramey & Zubairy dispute that it exists at all — if this ever fails,
  // read it as evidence about the model, not as a broken test.
  const slump = multiplierFrom({ policy_rate: 8 }, 2);
  const boom = multiplierFrom({ policy_rate: 1.8 }, 2);
  assert.ok(slump > boom,
    `slump ${slump.toFixed(2)} <= boom ${boom.toFixed(2)} — the ` +
    `unemployment-dependent MPC is not coming through`);
});

test('THE QE LESSON: printing into slack with a credible CB barely bites', () => {
  // The prototype produced 20%+ here, which inverts the lesson entirely.
  // This is the acceptance test for the monetisation gate in money.js.
  const s = settle({ policy_rate: 8 });        // genuine slack
  assert.ok(s.output_gap < -2, 'the test failed to establish slack');
  s.money_printed = 5;
  run(s, 36, OPTS);
  assert.ok(s.monetisation_passthrough < 0.5,
    `direct pass-through was ${s.monetisation_passthrough.toFixed(2)}pp with ` +
    `idle capacity and an anchored central bank — the gate is not working`);
});

test('printing with no slack and no credibility goes straight to prices', () => {
  const s = newState();
  s.credibility = 0.2;                          // nobody believes the target
  s.money_printed = 5;
  run(s, 12, OPTS);
  assert.ok(s.monetisation_passthrough > 1.5,
    `pass-through only ${s.monetisation_passthrough.toFixed(2)}pp with an ` +
    `unanchored central bank and no slack — the gate is stuck shut`);
});

test('automatic stabilisers absorb a meaningful share of a shock', () => {
  const base = newState();
  const hit = newState();
  run(base, 1, OPTS);
  hit.consumption -= 5;                         // a demand shock
  run(hit, 1, OPTS);
  const marketFall = 5;
  const disposableFall = base.disposable_income - hit.disposable_income;
  const absorbed = 1 - disposableFall / marketFall;
  const p = P.AUTO_STABILISER_ABSORPTION;
  assert.ok(absorbed > 0.2 && absorbed <= 1.0,
    `stabilisers absorbed ${(absorbed * 100).toFixed(0)}% — literature says ` +
    `${p.low * 100}-${p.high * 100}%`);
});
