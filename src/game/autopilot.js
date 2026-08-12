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
 *   3. It demonstrates the rule is not magic — but it is not helpless either.
 *      **It now WINS `stagflation`**: 5.69% inflation at month 48, 1.91% at
 *      month 96, and it is refused its own request in 0 of the 96 months.
 *
 * THIS COMMENT HAS BEEN WRONG TWICE AND IS THE THIRD VERSION. It used to read
 * "it still loses the stagflation scenario, because no rule handles a supply
 * shock well" — a defeat written into a comment and then read back as a design
 * property, which is rule 6 pointing the other way, and it protected the
 * defect underneath it for three passes. The second version recorded the loss
 * as a measurement (29.55% at m48) and named the cause. Both are now history,
 * because the cause was fixed.
 *
 * THE EXPERIMENT THAT ISOLATED IT, and it now runs in the other direction:
 * put the ceiling back to 20 and change nothing else — the supply shock, the
 * 3% capacity loss, the 9% opening inflation, the smoothing and
 * TAYLOR_INFLATION all identical.
 *
 *      ceiling 50 (derived 2.4, re-derived 5.9)   7.89 @m48 /  3.16 @m96  refused  0/96
 *      ceiling 20 (as it was)                     19.25 @m48 / 22.65 @m96  refused 86/96
 *
 * The shock never moved. What beat the rule was the instrument: for 86 of 96
 * months it was holding a dial it had already run out of, and once expected
 * inflation passes the ceiling no setting of the dial produces a positive real
 * rate at all. test/autopilot.test.js runs both arms so this cannot rot again.
 *
 * BOTH ARMS ARE MUCH TAMER SINCE PHASE 3, AND THE CONCLUSION IS NOT. The
 * ceiling-20 arm reached 1020.91% at m96 when 2.4 measured it and reaches
 * 22.65% now, because 3.1 removed the asset-price overshoot. It is still an
 * order of magnitude above target, still refused in 86 of 96 months, and the
 * ceiling-50 arm still lands on target. 5.9 re-ran the whole derivation for
 * exactly this reason (open_items D1) and 50 survived it.
 *
 * TWO CHANGES GOT IT THERE, and both were structural rather than coefficients:
 *   A1 (2.1) split the rate lag off the investment-response lag — worth ~213pp
 *      of month-48 inflation on its own, from 242.34 to 29.55 as measured then.
 *   A2 (2.4) derived the ceiling as a fixed point instead of picking it, 20 -> 50.
 *
 * What the rule still cannot do is the LOWER bound. In `recession` it asks to
 * go below the ELB in 31 of 96 months and cannot, because that bound is
 * physics rather than layout. That is the honest remaining sense in which the
 * rule is not magic, and it is why QE exists.
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
