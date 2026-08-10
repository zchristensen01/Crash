/**
 * THE ENGINE. One tick = one month.
 *
 * Events and endings are NOT here — they live in game/, because they are game
 * design and this is economics. Keeping that boundary is what lets the model
 * be tested headlessly.
 */
import { RULES } from './rules/index.js';
import { Trace } from './trace.js';
import { LagPipeline } from './lags.js';
import { pushHistory } from './state.js';
import { checkInvariants } from './invariants.js';
import { makeRng } from './rng.js';
import { checkEndings } from './game/endings.js';
import { EVENTS } from './game/events.js';
import { annualProbToMonthly } from './units.js';

/** Fields checked for finiteness after every rule. */
const NUMERIC_GUARD = ['output', 'output_gap', 'potential_output', 'inflation',
  'expected_inflation', 'credibility', 'unemployment', 'consumption',
  'investment', 'asset_prices', 'leverage', 'credit_spread', 'private_credit',
  'govt_debt', 'yield_10y', 'capital_stock', 'wage_growth', 'velocity'];

/**
 * Advance the world one month.
 * Order matters: landed lag effects are applied BEFORE the rules run, so the
 * rules see the full picture rather than a half-updated one.
 */
export function tick(s, trace, pipeline, rng, opts = {}) {
  trace.reset();
  const prev = { ...s };

  // A policy reaction, if one is configured. In the real game this is the
  // player; headless it is the Taylor rule. Without either, any scenario
  // starting above target diverges — correctly (see game/autopilot.js).
  if (opts.autopilot) opts.autopilot(s);

  const landed = pipeline.collect(s.tick);
  for (const [target, amount] of Object.entries(landed)) {
    s[target] = (s[target] || 0) + amount;
  }
  if (Object.keys(landed).length) trace.note('landed this month', landed);

  for (const rule of RULES) {
    rule(s, trace, { pipeline, rng, opts });
    // Name the rule that produced a non-finite value. Without this, a NaN
    // surfaces several rules later as an unreadable cascade — every downstream
    // variable is NaN and the origin is invisible.
    if (opts.findNaN !== false) {
      for (const k of NUMERIC_GUARD) {
        if (!Number.isFinite(s[k])) {
          throw new Error(`rule '${rule.name}' produced ${s[k]} in '${k}' at tick ${s.tick}`);
        }
      }
    }
  }

  // Shocks. Probabilities are ANNUAL in the data and converted here, once.
  s.fired_event = null;
  if (opts.events !== false) {
    for (const ev of EVENTS) {
      if (!ev.when(s)) continue;
      const annual = ev.probability ? ev.probability(s) : ev.chance;
      if (!annual) continue;
      if (rng() < annualProbToMonthly(annual)) {
        ev.apply(s);
        s.fired_event = ev;
        break;                    // at most one shock a month
      }
    }
  }

  pushHistory(s);
  s.tick += 1;

  // Endings are checked HERE, not in run(), so anything driving the model
  // directly — the demo, the UI clock — ends a game properly. When this lived
  // in run(), the demo sailed past hyperinflation to 2254% inflation.
  if (opts.endings !== false) checkEndings(s);

  if (opts.assertEveryTick !== false) checkInvariants(s, prev, s.tick);
}

/** Run N ticks with no player input. The workhorse of every test. */
export function run(s, n, opts = {}) {
  const trace = new Trace(opts.strictTrace !== false);
  const pipeline = opts.pipeline || new LagPipeline();
  const rng = opts.rng || makeRng(opts.seed ?? 1);
  const snapshots = [];
  for (let i = 0; i < n; i++) {
    tick(s, trace, pipeline, rng, opts);
    if (opts.keepSnapshots) snapshots.push({ ...s });
    // Endings terminate the run. Several loops in this model are deliberately
    // unbalanced, so without this a losing position keeps computing until it
    // overflows — which reads as a bug rather than as losing.
    if (opts.stopOnEnding !== false && s.ending) break;
  }
  return snapshots;
}
