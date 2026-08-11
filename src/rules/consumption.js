/**
 * CONSUMPTION  [question A1] — the largest component of demand.
 */
import { P } from '../params.js';
import { quarterlyToMonthly, clamp } from '../units.js';

/**
 *   C = APC * permanent income
 *     + MPC(u) * (current income - permanent income)     transitory
 *     + WEALTH_EFFECT * (assets - fundamental)
 *     + small confidence residual
 *
 *   MPC(u) = MPC_BASE + MPC_UNEMPLOYMENT_SLOPE * (u - u*)
 *
 * Why the MPC rises with unemployment: constrained households spend more of
 * what you give them. That is why stimulus works better in a slump, and it is
 * how the state-dependent fiscal multiplier now arises STRUCTURALLY rather
 * than being asserted (decision A3).
 *
 * The confidence channel is deliberately tiny. Pass 2 found confidence is
 * ~80% an echo of fundamentals, so only the orthogonal residual enters, at
 * CONFIDENCE_INDEP_PREDICTIVE (0.1). The prototype's strong unsourced
 * mood->demand channel was the direct cause of its steady-state drift.
 */
export function updateConsumption(s, trace) {
  const mpcQ = P.MPC_BASE.value +
    P.MPC_UNEMPLOYMENT_SLOPE.value * (s.unemployment - s.natural_unemployment);
  const mpc = clamp(quarterlyToMonthly(clamp(mpcQ, 0.05, 0.95), true), 0.01, 0.6);
  s.mpc_effective = mpc;

  // Permanent income: a slow adjustment toward current disposable income.
  s.yd_permanent += 0.05 * (s.disposable_income - s.yd_permanent);

  const permanent = s.apc_ss * s.yd_permanent;
  const transitory = mpc * (s.disposable_income - s.yd_permanent);

  // WEALTH_EFFECT is cents of consumption per DOLLAR OF WEALTH, and this used
  // to apply it straight to a difference in INDEX POINTS — the unit
  // conversion was simply missing, and the magnitude was right only by
  // coincidence (docs/07 hygiene). ASSET_WEALTH_TO_GDP is that conversion:
  // years of output of paper wealth per 100 index points. It is 1.0, so the
  // numbers are unchanged; what changes is that the scale is now stated,
  // sourced and testable rather than implied by an accident.
  const paperWealth = (s.asset_prices - s.asset_fundamental) *
                      P.ASSET_WEALTH_TO_GDP.value;
  const wealth = P.WEALTH_EFFECT.value * paperWealth;
  const mood = P.CONFIDENCE_INDEP_PREDICTIVE.value * s.confidence_residual;

  const terms = {
    'spending out of normal income': permanent,
    'spending out of a windfall or shortfall': transitory,
    'feeling richer or poorer (asset prices)': wealth,
    'confidence, beyond what the numbers explain': mood,
  };
  s.consumption = permanent + transitory + wealth + mood;
  trace.record('consumption', terms, s.consumption,
    { mpc_annualised: mpcQ, hand_to_mouth: P.HAND_TO_MOUTH_SHARE.value });
}
