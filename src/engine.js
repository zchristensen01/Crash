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
import { DIALS, applyDialChange, PIPELINE_TARGETS } from './game/dials.js';
import { annualProbToMonthly } from './units.js';

/** Fields checked for finiteness after every rule. */
const NUMERIC_GUARD = ['output', 'output_gap', 'potential_output', 'inflation',
  'expected_inflation', 'credibility', 'unemployment', 'consumption',
  'investment', 'asset_prices', 'leverage', 'credit_spread', 'private_credit',
  'govt_debt', 'yield_10y', 'capital_stock', 'wage_growth', 'velocity',
  'policy_rate_demand', 'policy_rate_markets', 'tax_rate_effective', 'qe_stock'];

/**
 * Advance the world one month.
 *
 * ORDER, and every line of it is a decision:
 *   1. policy      — the player, or the Taylor autopilot, moves a dial
 *   2. shocks      — a month's news arrives at the START of the month, so the
 *                    rules price it in the same month. Running events AFTER
 *                    the rules meant an event touching a demand component
 *                    broke the C+I+G identity on the spot and threw: 38.8% of
 *                    real 8-year sessions died that way (docs/07 M1).
 *   3. lag landing — effects scheduled months ago arrive, into transmitted
 *                    driver fields that no rule assigns
 *   4. rules       — the model
 *   5. history, endings, invariants
 */
export function tick(s, trace, pipeline, rng, opts = {}) {
  trace.reset();
  const prev = { ...s };

  // A policy reaction, if one is configured. In the real game this is the
  // player; headless it is the Taylor rule. Without either, any scenario
  // starting above target diverges — correctly (see game/autopilot.js).
  // It is handed the pipeline because a rule-following central bank faces
  // exactly the same transmission lags the player does.
  if (opts.autopilot) opts.autopilot(s, pipeline);
  if (opts.chaos) chaosPolicy(s, pipeline, rng);

  // A dial request the dial's own bounds refused. Noted BEFORE it is cleared,
  // and cleared at the END of the tick rather than the start — the player
  // moves a dial BETWEEN ticks, so clearing first threw their truncation away
  // before the trace could ever see it and only the autopilot's was ever
  // recorded. The state field is what the UI reads on the spot; this is what
  // the why panel reads afterwards, and both paths have to work.
  if (s.dial_truncated) {
    const t = s.dial_truncated;
    trace.note(`${t.key} request truncated by the dial's own bound`,
      { requested: t.requested, applied: t.applied, times_so_far: s.dial_truncated_count });
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

  const landed = pipeline.collect(s.tick);
  for (const [target, amount] of Object.entries(landed)) {
    if (!PIPELINE_TARGETS.has(target)) {
      throw new Error(
        `pipeline: '${target}' is not a transmitted driver. Scheduling into a ` +
        `field a rule assigns means the rule overwrites it and the lag never ` +
        `lands — see docs/07 L1. Add it to PIPELINE_TARGETS and to newState.`);
    }
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

  pushHistory(s);
  s.tick += 1;

  // Endings are checked HERE, not in run(), so anything driving the model
  // directly — the demo, the UI clock — ends a game properly. When this lived
  // in run(), the demo sailed past hyperinflation to 2254% inflation.
  if (opts.endings !== false) checkEndings(s);

  if (opts.assertEveryTick !== false) checkInvariants(s, prev, s.tick);

  // Last, so the record spans exactly one month and the next thing to write it
  // is the player. dial_truncated_count is cumulative and is NOT cleared.
  s.dial_truncated = null;
}

/**
 * A player who slams the dials at random. `opts.chaos` was passed by
 * test/conservation.test.js's "violent policy path" test for months while
 * nothing read it, so that test was a quiet run with a loud name (docs/07
 * M10). It goes through applyDialChange, because that is the only correct way
 * to move a dial, and it is the path most likely to break an identity.
 */
function chaosPolicy(s, pipeline, rng) {
  if (rng() > 0.25) return;                    // roughly one move a quarter
  const dial = DIALS[Math.floor(rng() * DIALS.length)];
  const span = dial.max - dial.min;
  const target = dial.min + rng() * span;
  const step = Math.max(dial.step, span / 20);
  const move = Math.sign(target - s[dial.key]) * step * (1 + Math.floor(rng() * 4));
  applyDialChange(s, pipeline, dial.key, s[dial.key] + move);
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
