/**
 * INVESTMENT  [question A2] — the most rate-sensitive component of demand.
 */
import { P } from '../params.js';
import { clamp, lerp } from '../units.js';

/**
 * How much of a monetary EASING actually reaches the economy.
 *
 *   easing scale = 1/MONETARY_ASYMMETRY_RATIO   x  recession damping
 *                                               x  lower-bound effectiveness
 *
 * Both factors apply to the STANCE — how far the transmitted rate sits below
 * neutral — and not to the increment that got it there. Scaling increments
 * looks equivalent and is not: cut 1pp, hike 1pp back, and an increment-scaled
 * model ends up 0.33pp tighter than it started, forever.
 *
 * ASYMMETRY: cutting is pushing a string, hiking is pulling a rope (Tenreyro &
 * Thwaites 2016; Barnichon & Matthes). Before this the asymmetry existed only
 * on the discarded pipeline path, and what the model actually produced was
 * cuts 1.38x STRONGER than hikes — the folklore, backwards (docs/07 L8).
 *
 * LOWER BOUND: ZLB_RATE_EFFECTIVENESS is 0 with strong confidence — at the
 * bound, cuts do essentially nothing and fiscal has to take over. The model
 * had no rate-level dependence at all: the response was bit-identical from a
 * 10% policy rate down to -0.74% (docs/07 M2). Note this damps EASING only.
 * Hiking away from the bound works fine, which is the asymmetry that makes
 * the bound dangerous rather than merely inconvenient.
 */
export function monetaryEasingScale(s) {
  const asymmetry = 1 / P.MONETARY_ASYMMETRY_RATIO.value;
  // Ramped, not switched. A step here is the same class of defect as the old
  // Okun switch: it puts a discontinuity in the middle of the range the
  // player actually occupies, and the response jumps across it.
  const inRecession = lerp(1.0, 0.75, clamp(-s.output_gap / 3, 0, 1));
  const room = clamp((s.policy_rate - P.SS_ELB.value) / P.ZLB_EFFECTIVE_BAND.value, 0, 1);
  const atBound = lerp(P.ZLB_RATE_EFFECTIVENESS.value, 1, room);
  return asymmetry * inRecession * atBound;
}

/**
 *   user_cost = market_rate - expected_inflation + delta
 *   I = I_ss * (1 - elasticity * (user_cost - user_cost_ss) * easing_scale)
 *            + accelerator * output_gap
 *            - CROWDING_OUT * deficit_excess * (1 - slack)
 *
 * FOUR THINGS THE LITERATURE IS EMPHATIC ABOUT:
 *  1. The rate effect is not instant. What enters here is
 *     policy_rate_demand — the rate the demand side has actually FELT, which
 *     the lag pipeline walks toward the dial on the rate_to_investment kernel
 *     (peak 9 months). The dial's own value appears in exactly one place
 *     below, and only to ask how much room is left above the lower bound.
 *  2. The external finance premium IS the credit spread, and it enters ONCE,
 *     through user_cost. There used to be a second term,
 *     -FINANCIAL_ACCELERATOR_STRENGTH * (spread - spread_ss), which is the
 *     same regressor with a second coefficient and added 89% to the credit
 *     channel (docs/07 section C). Christensen & Dib find the accelerator
 *     significant for investment but "relatively minor" for total output; two
 *     coefficients on one spread is how a model gets the large output
 *     multiplier they warn against.
 *  3. Crowding out is near ZERO under slack and at the lower bound, and can
 *     even crowd in. It is commonly overstated in public argument — and it
 *     was overstated HERE, as the only structural amplifier any demand lever
 *     had, which is what inverted the slack conditional (docs/07 L2).
 *  4. Cuts are weaker than hikes — monetaryEasingScale, above.
 */
export function updateInvestment(s, trace) {
  s.market_rate = s.policy_rate_demand + s.credit_spread - s.qe_rate_relief;
  s.user_cost = s.market_rate - s.expected_inflation +
                P.DEPRECIATION_RATE.value * 100;

  const userCostSS = s.policy_rate_ss + s.credit_spread_ss -
                     s.inflation_target + P.DEPRECIATION_RATE.value * 100;

  const stance = s.user_cost - userCostSS;
  const scale = stance < 0 ? monetaryEasingScale(s) : 1;
  const rateTerm = -s.investment_share *
    (P.INVESTMENT_RATE_ELASTICITY.value / 100) * stance * scale;

  // Accelerator: firms build when demand is already strong.
  const accelerator = 0.15 * s.output_gap;

  // Crowding out, switched off by slack and at the lower bound. It reads the
  // CYCLICALLY-ADJUSTED deficit: borrowing that only happened because the
  // economy shrank is the stabilisers working, not a discretionary claim on
  // savings, and reading the headline deficit here turned crowding out into
  // the model's dominant amplifier pointing the wrong way (docs/07 L2).
  const slack = clamp(-s.output_gap / 2, 0, 1);
  const atELB = s.policy_rate <= P.SS_ELB.value + 0.26;
  const deficitExcess = s.structural_deficit_felt - s.structural_deficit_ss;
  const crowding = (atELB ? 0 : -P.CROWDING_OUT.value * deficitExcess * (1 - slack));

  const terms = {
    'baseline investment': s.investment_share,
    'cost of borrowing': rateTerm,
    'demand already strong (accelerator)': accelerator,
    'government borrowing crowding it out': crowding,
  };
  // Bounded BOTH ways. The floor is obvious; the ceiling is not, and its
  // absence was a live bug: under hyperinflation the real user cost goes
  // deeply negative, and an unbounded rate term drove investment to 700% of
  // GDP, which exploded the capital stock and then potential output itself.
  // No economy invests more than ~45% of output in a year.
  const raw = s.investment_share + rateTerm + accelerator + crowding;
  s.investment = clamp(raw, 2, 45);
  trace.record('investment', { ...terms,
    'bounded to a physically possible range': s.investment - raw,
  }, s.investment, {
    user_cost: s.user_cost,
    rate_felt_so_far: s.policy_rate_demand,
    rate_on_the_dial: s.policy_rate,
    easing_effectiveness: stance < 0 ? scale : null,
    at_lower_bound: atELB,
  });
}
