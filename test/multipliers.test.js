/**
 * VALIDATION, NOT CALIBRATION.  (decision A3, docs/05)
 *
 * The reduced-form multipliers in parameters.py are NOT model terms — using
 * them alongside a structural C+I+G block would count the same channel twice.
 * They are targets: shock the assembled model and check what it produces.
 *
 * WHERE THE MODEL LANDS OUTSIDE A RANGE, THAT IS A FINDING TO SURFACE, NOT A
 * NUMBER TO TUNE TO. Ramey & Zubairy dispute the state-dependence outright.
 *
 * TWO THINGS ABOUT THE EXPERIMENTAL DESIGN, both changed by the docs/07 audit
 * and both of which changed the answer:
 *
 * 1. THE GAP IS SET WITH AN EXTERNAL DEMAND SHOCK, not with the policy rate.
 *    Using the rate confounds the state with the lever, and it means the
 *    "recession" is one the central bank has chosen not to fight. net_exports
 *    is additive in aggregate.js and read by nothing else in src/rules/, so it
 *    moves the gap and nothing else. It decays, so it has to be held.
 *
 * 2. THE CENTRAL BANK RESPONDS. Published multipliers are estimated on
 *    economies with working central banks; a fixed-nominal-rate multiplier is
 *    a different and much larger object (2.1 versus 0.69 here, at the same
 *    starting gap). Measuring the fixed-rate version against a range built
 *    from the responding one is comparing two different quantities.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { P } from '../src/params.js';
import { newState } from '../src/state.js';
import { tick } from '../src/engine.js';
import { Trace } from '../src/trace.js';
import { LagPipeline } from '../src/lags.js';
import { makeRng } from '../src/rng.js';
import { applyAutopilot } from '../src/game/autopilot.js';

// events: false — a random oil shock landing in one arm of a comparison
// and not the other would make every multiplier reading noise.
const NX_DECAY = Math.pow(0.5, 1 / P.FOREIGN_DEMAND_SHOCK_HALFLIFE.value);

function world(externalDemand, { taylor = true } = {}) {
  return {
    s: newState(),
    trace: new Trace(false),
    pipeline: new LagPipeline(),
    rng: makeRng(1),
    nx: externalDemand,
    opts: {
      events: false, assertEveryTick: false, endings: false,
      ...(taylor ? { autopilot: applyAutopilot } : {}),
    },
  };
}

function advance(w, months) {
  for (let i = 0; i < months; i++) {
    w.s.net_exports = w.nx / NX_DECAY;      // hold the standing shock
    tick(w.s, w.trace, w.pipeline, w.rng, w.opts);
  }
  return w.s;
}

/** Cumulative output response to a sustained +1% of GDP spending shock. */
function multiplierFrom(externalDemand, years, opts) {
  const base = world(externalDemand, opts);
  const shocked = world(externalDemand, opts);
  advance(base, 36);
  advance(shocked, 36);
  const startGap = base.s.output_gap;
  shocked.s.govt_spending += 1;
  shocked.s.govt_purchases += 1;
  advance(base, years * 12);
  advance(shocked, years * 12);
  return {
    startGap,
    multiplier: (shocked.s.output - base.s.output) / base.s.output * 100,
    dInflation: shocked.s.inflation - base.s.inflation,
  };
}

test('recession multiplier lands in the published range', () => {
  const r = multiplierFrom(-3.5, 2);
  assert.ok(r.startGap < -3, `the test failed to establish a recession: gap ${r.startGap}`);
  const p = P.FISCAL_MULT_RECESSION;
  assert.ok(r.multiplier >= p.low && r.multiplier <= p.high,
    `model gives ${r.multiplier.toFixed(2)} at a ${r.startGap.toFixed(1)}% gap, ` +
    `literature says ${p.low}-${p.high}. Investigate before adjusting — this ` +
    `may be a real finding.`);
});

test('expansion multiplier lands in the published range', () => {
  const r = multiplierFrom(2, 2);
  assert.ok(r.startGap > 0.5, `the test failed to establish a boom: gap ${r.startGap}`);
  const p = P.FISCAL_MULT_EXPANSION;
  assert.ok(r.multiplier >= p.low && r.multiplier <= p.high,
    `model gives ${r.multiplier.toFixed(2)} at a +${r.startGap.toFixed(1)}% gap, ` +
    `literature says ${p.low}-${p.high}`);
});

test('the multiplier is larger in a slump than in a boom', () => {
  // The state-dependence should EMERGE from the rising MPC and the slack
  // switch on crowding out, not be asserted. Ramey & Zubairy dispute that it
  // exists at all — if this ever fails, read it as evidence about the model,
  // not as a broken test.
  const slump = multiplierFrom(-3.5, 2).multiplier;
  const boom = multiplierFrom(2, 2).multiplier;
  assert.ok(slump > boom,
    `slump ${slump.toFixed(2)} <= boom ${boom.toFixed(2)} — the ` +
    `state-dependence is not coming through`);
});

test('the same spending buys more OUTPUT with slack and more PRICES without', () => {
  // docs/02: "IF output_gap < 0: output up, inflation barely moves. IF
  // output_gap >= 0: output flat, prices up." The audit found the split was
  // the real conditional and the doc's binary was not what the model did;
  // this is the split, asserted.
  const slump = multiplierFrom(-3.5, 2);
  const boom = multiplierFrom(2, 2);
  const share = (r) => r.multiplier / (r.multiplier + r.dInflation);
  assert.ok(share(slump) > share(boom) + 0.1,
    `output share ${share(slump).toFixed(2)} with slack vs ` +
    `${share(boom).toFixed(2)} at capacity — the conditional is not there`);
});

test('holding the rate fixed makes the multiplier much larger', () => {
  // Not a defect: it is the ZLB/fixed-rate multiplier, and it is why the
  // published ranges (estimated on economies with responsive central banks)
  // are the wrong yardstick for a fixed-rate experiment. Asserted so nobody
  // reintroduces the fixed-rate measurement and then tunes to close the gap.
  // Measured at potential, where the capacity ceiling is not binding on
  // either arm — above it the fixed-rate economy has already run out of room
  // and the comparison measures the cap instead.
  const responding = multiplierFrom(0, 2).multiplier;
  const fixed = multiplierFrom(0, 2, { taylor: false }).multiplier;
  assert.ok(fixed > responding,
    `fixed-rate ${fixed.toFixed(2)} <= responding ${responding.toFixed(2)}`);
});

test('THE QE LESSON: printing into slack with a credible CB barely bites', () => {
  // The prototype produced 20%+ here, which inverts the lesson entirely.
  // This is the acceptance test for the monetisation gate in money.js.
  const w = world(-3.5);
  advance(w, 36);
  assert.ok(w.s.output_gap < -2, 'the test failed to establish slack');
  w.s.money_printed = 5;
  advance(w, 36);
  assert.ok(w.s.monetisation_passthrough < 0.5,
    `direct pass-through was ${w.s.monetisation_passthrough.toFixed(2)}pp with ` +
    `idle capacity and an anchored central bank — the gate is not working`);
});

test('printing with no slack and no credibility goes straight to prices', () => {
  const w = world(0, { taylor: false });
  w.s.credibility = 0.2;                        // nobody believes the target
  w.s.money_printed = 5;
  advance(w, 12);
  assert.ok(w.s.monetisation_passthrough > 1.5,
    `pass-through only ${w.s.monetisation_passthrough.toFixed(2)}pp with an ` +
    `unanchored central bank and no slack — the gate is stuck shut`);
});

test('printing buys real things when there is slack to buy them with', () => {
  // docs/02 DIAL 5. The audit found this inverted: printing did nothing with
  // slack and worked at capacity, because its only route into demand was
  // shrinking the deficit and crowding investment in (docs/07 L3).
  const measure = (nx) => {
    const base = world(nx, { taylor: false });
    const printed = world(nx, { taylor: false });
    advance(base, 36); advance(printed, 36);
    printed.s.money_printed = 2;
    advance(base, 24); advance(printed, 24);
    return {
      dOutput: printed.s.output - base.s.output,
      dInflation: printed.s.inflation - base.s.inflation,
    };
  };
  const slack = measure(-3.5), hot = measure(2);
  assert.ok(slack.dOutput > hot.dOutput,
    `printing moved output ${slack.dOutput.toFixed(2)} with slack vs ` +
    `${hot.dOutput.toFixed(2)} at capacity — DIAL 5 is still inverted`);
  assert.ok(hot.dInflation > slack.dInflation,
    `printing moved inflation ${hot.dInflation.toFixed(2)} at capacity vs ` +
    `${slack.dInflation.toFixed(2)} with slack`);
});
