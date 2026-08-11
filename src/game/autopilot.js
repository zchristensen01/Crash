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
 *   3. It demonstrates the rule is not magic. It still loses `stagflation` as
 *      built — 29.55% inflation at month 48 and 1020.91% by month 96 — and the
 *      reason is NOT the supply shock.
 *
 * That last clause used to read "because no rule handles a supply shock well",
 * which was a defeat written into a comment and then read back as a design
 * property. Rule 6 says a regime must be DRIVEN, not asserted; this was the
 * same error pointing the other way, and it protected the defect underneath it
 * for three passes.
 *
 * THE EXPERIMENT THAT ISOLATES IT. Change one thing at a time and leave the
 * supply shock, the 3% capacity loss and the 9% opening inflation alone.
 * Measured, inflation at m48 / m96, and the months the dial refused the rule:
 *
 *      as built (ceiling 20)          29.55 / 1020.91    refused 86/96
 *      ceiling 40                      5.69 /    1.91    refused  0/96
 *      no smoothing (rho 0)            6.31 /    3.33    refused 14/96
 *      TAYLOR_INFLATION 1.0            10.22 /    1.66   refused 37/96
 *      no supply shock at all          5.26 /    2.93    refused  0/96
 *
 * Every arm that touches the INSTRUMENT wins. The arm that removes the SHOCK
 * wins by no more than they do, so the shock was never what beat it.
 *
 * Before the A1 transmission split these numbers were 242.34 / 22711.39 as
 * built, and only the ceiling arm won. Splitting the rate lag from the
 * investment-response lag is worth ~213pp of month-48 inflation here on its
 * own, which is the single largest effect measured in this pass.
 *
 * What is left is the CEILING: the rule is refused its own request in 86 of 96
 * months, and lifting it to 40 wins with ZERO refusals. Phase 2.4 derives it.
 */
import { P } from '../params.js';
import { applyDialChange } from './dials.js';

/**
 *   i* = r* + pi + A*(pi - target) + B*gap,  smoothed
 *
 * Total response to inflation is 1 + A = 1.5, which is what puts it above the
 * unity threshold the Taylor principle requires.
 *
 * THIS RETURNS A REQUEST, NOT A SETTING, AND IT IS DELIBERATELY UNBOUNDED.
 *
 * It used to end `clamp(smoothed, P.SS_ELB.value, 25)` while dials.js said
 * `max: 20`, so the rule asked for up to 25% and could never get more than
 * 20% — and applyDialChange truncated the difference in silence (4th audit
 * brief A2). The obvious repair is to clamp here to the dial's own bounds
 * instead of a second copy of them. That is wrong, and measurably so: it
 * makes the rule's own ceiling absorb the truncation, so the dial never sees
 * it and the telemetry that exists to report it never fires. The saturation
 * does not go away, it just stops being visible from anywhere.
 *
 * So the bounds are enforced in exactly ONE place — applyDialChange, which is
 * where every dial move goes and where the truncation is reported. All three
 * arrangements produce an identical path (max difference 0.00e+0 across all
 * six scenarios over 96 months), because the smoothing term reads back
 * s.policy_rate, which the dial has already truncated. Only this one says so
 * out loud. Measured, the rule is refused its own request in 87 of
 * `stagflation`'s 96 months and 30 of `recession`'s — the ceiling in one
 * direction and the effective lower bound in the other, and nothing in the
 * project reported either before.
 *
 * THE CEILING ITSELF IS STILL WRONG and is deliberately not fixed here. The
 * binding constraint is `max_expected_inflation + a positive real rate`, and
 * that requirement moves sharply once the transmission lag is split (Phase
 * 2.1). Choosing it now would be guessing; it is derived in Phase 2.4.
 */
export function taylorRate(s) {
  const target = P.SS_INFLATION_TARGET.value;
  const desired = s.neutral_real_rate + s.inflation
    + P.TAYLOR_INFLATION.value * (s.inflation - target)
    + P.TAYLOR_OUTPUT.value * s.output_gap;

  const rho = P.TAYLOR_SMOOTHING.value;          // central banks move in steps
  return rho * s.policy_rate + (1 - rho) * desired;
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
