/**
 * CONSUMPTION  [question A1] — the largest component of demand.
 */
import { P } from '../params.js';
import { quarterlyToMonthly, clamp } from '../units.js';
import { DEMAND_BOUNDS } from '../invariants.js';

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
  // judgement: absurdity bounds on a propensity, not calibration. A marginal
  // propensity to consume is a fraction by definition, so the quarterly clamp
  // is "strictly inside [0, 1]" and the monthly one is "strictly inside the
  // quarterly figure". Neither binds anywhere the model reaches — MPC_BASE is
  // 0.5 and MPC_UNEMPLOYMENT_SLOPE would need an unemployment move of 20pp to
  // reach either edge. They exist so a NaN or a runaway shows up as a stuck
  // value rather than as a negative propensity three rules downstream.
  const MPC_Q_MIN = 0.05, MPC_Q_MAX = 0.95;   // judgement, see above
  const MPC_M_MIN = 0.01, MPC_M_MAX = 0.6;    // judgement, see above
  const mpc = clamp(quarterlyToMonthly(clamp(mpcQ, MPC_Q_MIN, MPC_Q_MAX), true),
                    MPC_M_MIN, MPC_M_MAX);
  s.mpc_effective = mpc;

  // Permanent income: a slow adjustment toward current disposable income.
  // judgement: 5% a month is a ~13-month mean lag on the perceived-permanent
  // level. Friedman's permanent-income hypothesis fixes the SHAPE — households
  // consume out of a smoothed income concept — and gives no adjustment speed;
  // the empirical literature spans roughly one to five years depending on
  // whether it is estimated on micro panels or aggregate consumption. Not
  // promoted to parameters.py because a range that wide would be a fiction of
  // precision. It matters: it is why a tax cut's consumption response builds
  // over quarters in docs/11 §2 instead of landing at once.
  const YD_PERMANENT_SPEED = 0.05;   // judgement, see above
  s.yd_permanent += YD_PERMANENT_SPEED * (s.disposable_income - s.yd_permanent);

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

  // BOUNDED, AS INVESTMENT ALREADY WAS [4th audit B3].
  //
  // updateInvestment has clamped to [2, 45] since the first audit, with the
  // note that no economy invests more than ~45% of output. Consumption had no
  // bound at all, and the asymmetry was not deliberate — it was simply never
  // noticed, because it only bites outside the 96-month term or in a spiral.
  // Measured in `overheating` with no player input, before this: households
  // consumed 431.66% of potential output at month 96 while their disposable
  // income was MINUS 26.47. Every penny of it was the wealth term. The audit
  // brief found the same thing at 315.80% before Phase 2 and 3.1 shrank it;
  // shrinking is not bounding.
  //
  // THE NUMBERS ARE THE PROJECT'S OWN. invariants.js check 8 already declares
  // [10, 95] as the plausible band for consumption — it simply never fired,
  // because every long-horizon run in the suite sets assertEveryTick: false,
  // and an invariant that only holds when you are watching is not a bound.
  // Using the same pair keeps one number rather than two. JUDGEMENT, and
  // labelled as such: 95% of potential leaves 5% for investment, government
  // and trade combined, which no economy has ever managed. It is an absurdity
  // bound, not a calibration — nothing real should come near it.
  // ONE COPY, IMPORTED [4th audit 5.10]. This used to be two local constants
  // under a comment saying they were "the same band as invariants.js check 8",
  // which was true and was not a mechanism — nothing stopped them drifting.
  const [CONSUMPTION_MIN, CONSUMPTION_MAX] = DEMAND_BOUNDS.consumption;
  const raw = permanent + transitory + wealth + mood;
  s.consumption = clamp(raw, CONSUMPTION_MIN, CONSUMPTION_MAX);
  trace.record('consumption', {
    ...terms,
    // Recorded so the player can SEE it bite, the way investment's does.
    'bounded to a physically possible range': s.consumption - raw,
  }, s.consumption,
  { mpc_annualised: mpcQ, hand_to_mouth: P.HAND_TO_MOUTH_SHARE.value });
}
