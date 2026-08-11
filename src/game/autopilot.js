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
 *   3. It demonstrates the rule is not magic. It loses `stagflation` as built
 *      — inflation 242% at month 48, 22711% at month 96 — and the reason is
 *      NOT the supply shock.
 *
 * That last clause used to read "because no rule handles a supply shock well",
 * which was a defeat written into a comment and then read back as a design
 * property. Rule 6 says a regime must be DRIVEN, not asserted; this was the
 * same error pointing the other way, and it protected the defect underneath it
 * for three passes.
 *
 * THE EXPERIMENT THAT ISOLATES IT. Raise the rate dial's ceiling from 20 to 40
 * and change nothing else — the supply shock, the 3% capacity loss, the 9%
 * opening inflation, the smoothing and TAYLOR_INFLATION all identical:
 *
 *      as built (ceiling 20)     inflation  242.34 @ m48,  22711.39 @ m96
 *      ceiling 40                inflation    7.48 @ m48,     -3.37 @ m96
 *
 * The rule wins. The shock never moved, so the shock was never what beat it.
 * What beat it was the instrument: the rule is refused its own request in 87
 * of the 96 months, so it spends the scenario holding a dial it has already
 * run out of. Raising TAYLOR_INFLATION to the top of its sourced range (1.0)
 * without touching the ceiling still loses — 177.62 @ m48 — so this is not a
 * gain problem either.
 *
 * The honest version of "the rule is not magic" is therefore about the LAG and
 * the CEILING, not about supply shocks: a rule that cannot deliver a positive
 * real rate cannot stabilise anything, and one that delivers it a year late
 * has already lost the expectations race. Phase 2.4 derives the ceiling.
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
