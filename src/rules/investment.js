/**
 * INVESTMENT  [question A2] — the most rate-sensitive component of demand.
 */
import { P } from '../params.js';
import { clamp } from '../units.js';

/**
 *   user_cost = market_rate - expected_inflation + delta
 *   I = I_ss * (1 - elasticity * (user_cost - user_cost_ss))
 *            + accelerator * output_gap
 *            - FINANCIAL_ACCELERATOR * (spread - spread_ss)
 *            - CROWDING_OUT * deficit_excess * (1 - slack)
 *
 * FOUR THINGS THE LITERATURE IS EMPHATIC ABOUT:
 *  1. The rate effect is not instant — it arrives through the lag pipeline on
 *     'rate_to_investment' (peak 9 months), applied by the engine. What is
 *     computed here is the LEVEL implied by conditions that have already
 *     landed.
 *  2. FINANCIAL_ACCELERATOR_STRENGTH multiplies INVESTMENT ONLY. Christensen
 *     & Dib find it significant for investment but "relatively minor" for
 *     total output. A large output multiplier here is the classic error.
 *  3. Crowding out is near ZERO under slack and at the lower bound, and can
 *     even crowd in. It is commonly overstated in public argument.
 *  4. Cuts are weaker than hikes — handled in kernels.signAsymmetry where the
 *     rate shock is scheduled.
 */
export function updateInvestment(s, trace) {
  s.market_rate = s.policy_rate + s.credit_spread;
  s.user_cost = s.market_rate - s.expected_inflation +
                P.DEPRECIATION_RATE.value * 100;

  const userCostSS = s.policy_rate_ss + s.credit_spread_ss -
                     s.inflation_target + P.DEPRECIATION_RATE.value * 100;

  const rateTerm = -s.investment_share *
    (P.INVESTMENT_RATE_ELASTICITY.value / 100) * (s.user_cost - userCostSS);

  // Accelerator: firms build when demand is already strong.
  const accelerator = 0.15 * s.output_gap;

  const finance = -P.FINANCIAL_ACCELERATOR_STRENGTH.value *
                  (s.credit_spread - s.credit_spread_ss);

  // Crowding out, switched off by slack and at the lower bound.
  const slack = clamp(-s.output_gap / 2, 0, 1);
  const atELB = s.policy_rate <= P.SS_ELB.value + 0.26;
  const deficitExcess = s.deficit - s.deficit_ss;
  const crowding = (atELB ? 0 : -P.CROWDING_OUT.value * deficitExcess * (1 - slack));

  const terms = {
    'baseline investment': s.investment_share,
    'cost of borrowing': rateTerm,
    'demand already strong (accelerator)': accelerator,
    'credit conditions': finance,
    'government borrowing crowding it out': crowding,
  };
  // Bounded BOTH ways. The floor is obvious; the ceiling is not, and its
  // absence was a live bug: under hyperinflation the real user cost goes
  // deeply negative, and an unbounded rate term drove investment to 700% of
  // GDP, which exploded the capital stock and then potential output itself.
  // No economy invests more than ~45% of output in a year.
  const raw = s.investment_share + rateTerm + accelerator + finance + crowding;
  s.investment = clamp(raw, 2, 45);
  trace.record('investment', { ...terms,
    'bounded to a physically possible range': s.investment - raw,
  }, s.investment, { user_cost: s.user_cost, at_lower_bound: atELB });
}
