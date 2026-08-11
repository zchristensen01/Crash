/** Shared harness for audit probes. */
const R = '../../src/';
export const { newState, regime } = await import(R + 'state.js');
export const { tick, run } = await import(R + 'engine.js');
export const { Trace } = await import(R + 'trace.js');
export const { LagPipeline } = await import(R + 'lags.js');
export const { makeRng } = await import(R + 'rng.js');
export const { P, KERNELS, LAGS_MONTHS, START } = await import(R + 'params.js');
export const { DIALS, applyDialChange } = await import(R + 'game/dials.js');
export const { SCENARIOS } = await import(R + 'game/scenarios.js');
export const { EVENTS } = await import(R + 'game/events.js');
export const { applyAutopilot } = await import(R + 'game/autopilot.js');
export const { RULES } = await import(R + 'rules/index.js');
export const { checkInvariants } = await import(R + 'invariants.js');

export const OPTS = { events: false, assertEveryTick: false, endings: false };

export function ctx(overrides = {}, seed = 1) {
  return {
    s: newState(overrides),
    trace: new Trace(false),
    pipeline: new LagPipeline(),
    rng: makeRng(seed),
  };
}
export function step(c, n = 1, opts = OPTS) {
  for (let i = 0; i < n; i++) tick(c.s, c.trace, c.pipeline, c.rng, opts);
  return c.s;
}

/**
 * net_exports is the clean gap instrument — additive in aggregate.js, read by
 * nothing else in src/rules/ — but it now DECAYS on
 * FOREIGN_DEMAND_SHOCK_HALFLIFE, because an export slump that never fades
 * would reprice the economy forever. To hold a standing external demand
 * shock, top it back up each tick, pre-multiplied so the value the gap
 * actually sees is exactly `nx`.
 */
const NX_DECAY = Math.pow(0.5, 1 / P.FOREIGN_DEMAND_SHOCK_HALFLIFE.value);

export function stepHolding(c, n, nx, opts = OPTS) {
  for (let i = 0; i < n; i++) {
    c.s.net_exports = nx / NX_DECAY;
    tick(c.s, c.trace, c.pipeline, c.rng, opts);
  }
  return c.s;
}
export const f = (x, d = 3) => (typeof x === 'number' ? x.toFixed(d) : String(x));
