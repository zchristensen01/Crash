/**
 * SHARED TEST HARNESS.
 *
 * Not a test file — `node --test test/*.test.js` will not pick it up.
 *
 * Two conventions the docs/07 audit established, and both of them changed
 * answers that the previous tests had been getting wrong:
 *
 * 1. SET THE OUTPUT GAP WITH AN EXTERNAL DEMAND SHOCK, not with the policy
 *    rate. net_exports is additive in aggregate.js and read by nothing else in
 *    src/rules/, so it moves the gap and nothing else. Setting the gap with
 *    the rate confounds the state with the lever under test, and it silently
 *    means "a recession the central bank has chosen not to fight". The shock
 *    decays on FOREIGN_DEMAND_SHOCK_HALFLIFE, so a standing one has to be
 *    held — that is what `advance` does.
 *
 * 2. MOVE A DIAL WITH applyDialChange, ALWAYS. Assigning s.policy_rate moves
 *    the setting and nothing else: the transmission lives in the transmitted
 *    driver fields, which only the pipeline writes. A test that assigns
 *    directly measures an economy whose central bank has no effect.
 */
import { newState } from '../src/state.js';
import { tick } from '../src/engine.js';
import { Trace } from '../src/trace.js';
import { LagPipeline } from '../src/lags.js';
import { makeRng } from '../src/rng.js';
import { applyDialChange } from '../src/game/dials.js';
import { applyAutopilot } from '../src/game/autopilot.js';
import { P } from '../src/params.js';

const NX_DECAY = Math.pow(0.5, 1 / P.FOREIGN_DEMAND_SHOCK_HALFLIFE.value);

/**
 * @param {object} [o]
 * @param {number} [o.externalDemand] standing net-exports shock, held every tick
 * @param {boolean} [o.taylor] run a rule-following central bank
 * @param {boolean} [o.assert] check invariants every tick
 * @param {object}  [o.overrides] newState overrides (a scenario, usually)
 */
export function world({ externalDemand = 0, taylor = false, assert: check = true,
                        overrides = {}, seed = 1, events = false } = {}) {
  return {
    s: newState(overrides),
    trace: new Trace(false),
    pipeline: new LagPipeline(),
    rng: makeRng(seed),
    nx: externalDemand,
    opts: {
      events, assertEveryTick: check, endings: false,
      ...(taylor ? { autopilot: applyAutopilot } : {}),
    },
  };
}

export function advance(w, months) {
  for (let i = 0; i < months; i++) {
    if (w.nx !== 0) w.s.net_exports = w.nx / NX_DECAY;
    tick(w.s, w.trace, w.pipeline, w.rng, w.opts);
  }
  return w.s;
}

export function dial(w, key, value) {
  applyDialChange(w.s, w.pipeline, key, value);
}

export function nudge(w, key, delta) {
  applyDialChange(w.s, w.pipeline, key, w.s[key] + delta);
}

/**
 * Settle two identical worlds, apply `shock` to one, run both on, and return
 * the difference. The only honest way to read a response out of a model with
 * this many loops.
 */
export function compare({ shock, prepare, months = 24, settle = 36, ...opts }) {
  const base = world(opts);
  const shocked = world(opts);
  // `prepare` runs on BOTH arms, before settling: it is how you put the
  // economy in a particular state (a policy rate, a scenario) without that
  // state itself becoming the thing being measured.
  if (prepare) { prepare(base); prepare(shocked); }
  advance(base, settle);
  advance(shocked, settle);
  const start = { ...base.s };
  shock(shocked);
  advance(base, months);
  advance(shocked, months);
  const d = (k) => shocked.s[k] - base.s[k];
  return {
    start, base: base.s, shocked: shocked.s, d,
    dOutput: d('output'), dInflation: d('inflation'), dUnemp: d('unemployment'),
    outputShare: d('output') / (d('output') + d('inflation')),
  };
}
