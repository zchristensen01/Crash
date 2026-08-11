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
import { applyDialChange } from './dials.js';

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
  return clamp(smoothed, P.SS_ELB.value, 25);
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
