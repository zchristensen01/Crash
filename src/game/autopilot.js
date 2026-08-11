/**
 * AUTOPILOT — a Taylor-rule central bank.
 *
 * NOT part of the model. The player is the central bank; this is what a
 * rule-follower would have done, and it exists for three reasons:
 *   1. Headless tests need SOME policy. With a fixed nominal rate, any
 *      scenario starting above target diverges — a falling real rate feeds
 *      demand feeds inflation feeds a lower real rate. That is the Taylor
 *      principle, and parameters.py:TAYLOR_INFLATION documents it: the
 *      response to inflation must exceed 1.0 or inflation is unstable.
 *      A scenario blowing up with no policy is the model being RIGHT.
 *   2. It is the benchmark to score a player against — "the rule would have
 *      kept approval at 61; you got 48."
 *   3. It demonstrates the rule is not magic. It still loses the stagflation
 *      scenario, because no rule handles a supply shock well.
 */
import { P } from '../params.js';
import { clamp } from '../units.js';
import { DIALS, applyDialChange } from './dials.js';

/**
 * THE RATE DIAL IS THE ONLY SOURCE OF ITS OWN BOUNDS.
 *
 * This used to be a bare `25` while dials.js said `max: 20`, and
 * applyDialChange truncated the difference in silence: the rule asked for up
 * to 25% and could never get more than 20%, and nothing anywhere reported it
 * (4th audit brief A2). Measured, the two clamps are behaviour-identical —
 * max path difference 0.00e+0 across all six scenarios over 96 months —
 * because the smoothing term reads back s.policy_rate, which applyDialChange
 * has already truncated, so the higher internal ceiling can never persist for
 * even one month. It was a lie the code told about itself rather than a live
 * defect, which is exactly why it survived: nothing it did could be measured.
 *
 * THE NUMBER ITSELF IS STILL WRONG and is deliberately not fixed here. The
 * binding constraint is `max_expected_inflation + a positive real rate`, and
 * that requirement moves sharply once the transmission lag is split (Phase
 * 2.1). Choosing it now would be guessing; it is derived in Phase 2.4.
 * Measured today, `stagflation` under this rule sits pegged at the ceiling for
 * 87 of its 96 months.
 */
const RATE_DIAL = DIALS.find((d) => d.key === 'policy_rate');

/**
 *   i* = r* + pi + A*(pi - target) + B*gap,  smoothed, floored at the ELB
 *
 * Total response to inflation is 1 + A = 1.5, which is what puts it above the
 * unity threshold the Taylor principle requires.
 */
export function taylorRate(s) {
  const target = P.SS_INFLATION_TARGET.value;
  const desired = s.neutral_real_rate + s.inflation
    + P.TAYLOR_INFLATION.value * (s.inflation - target)
    + P.TAYLOR_OUTPUT.value * s.output_gap;

  const rho = P.TAYLOR_SMOOTHING.value;          // central banks move in steps
  const smoothed = rho * s.policy_rate + (1 - rho) * desired;
  return clamp(smoothed, RATE_DIAL.min, RATE_DIAL.max);
}

/**
 * Apply the rule in place. Pass as `opts.autopilot` to engine.run().
 *
 * It goes through applyDialChange for the same reason the player does: that
 * is where the transmission lag is scheduled. Assigning s.policy_rate
 * directly moves the setting and nothing else, so a benchmark built that way
 * would be a central bank whose decisions never reach the economy.
 */
export function applyAutopilot(s, pipeline) {
  applyDialChange(s, pipeline, 'policy_rate', taylorRate(s));
}
