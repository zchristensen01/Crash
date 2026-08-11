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
 *
 * `room` READS THE TRANSMITTED RATE, NOT THE DIAL (docs/12 L5). It used to
 * read s.policy_rate, and that inverted the model's central lesson in exactly
 * the regime the lesson is for. At the bound the whole easing stance is
 * suppressed; moving the DIAL up by 1pp moved `room` from 0.500 to 1.000 in
 * one month, while the economy had felt 0.007pp of it — so the suppressed
 * easing all counted at once and A HIKE RAISED OUTPUT for two quarters
 * (`recession`, +1pp: dY +0.08 at month 1, +0.08 at month 3, negative only
 * from month 6). The question this term asks is not "how much room has the
 * central bank left" — it multiplies the stance the economy has ALREADY
 * FELT, so it is asking whether the interest-rate channel is dead at the
 * rates actually facing borrowers. That is a property of policy_rate_demand.
 * Reading it that way also gives the better story: the first part of a cut
 * toward the floor works, and the last part does not.
 */
export function monetaryEasingScale(s) {
  const asymmetry = 1 / P.MONETARY_ASYMMETRY_RATIO.value;
  // Ramped, not switched. A step here is the same class of defect as the old
  // Okun switch: it puts a discontinuity in the middle of the range the
  // player actually occupies, and the response jumps across it.
  const inRecession = lerp(1.0, 0.75, clamp(-s.output_gap / 3, 0, 1));
  const room = clamp((s.policy_rate_demand - P.SS_ELB.value) /
                     P.ZLB_EFFECTIVE_BAND.value, 0, 1);
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
 *     (peak 9 months). SINCE docs/12, s.policy_rate — the DIAL — IS NOT READ
 *     ANYWHERE IN THIS FILE. The two places it survived (the ELB gate on
 *     crowding out, and `room` in monetaryEasingScale) were both instantaneous
 *     channels from the slider to the economy, and both inverted a lesson.
 *     tools/lint.mjs enforces the absence.
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
  // THE SOVEREIGN CEILING (docs/12 M2). The government's risk premium is a
  // floor under what everybody else pays: banks hold the sovereign, and a
  // corporate rarely borrows cheaper than the state it is domiciled in. Before
  // this, yield_10y was read in exactly two places — the government's own
  // interest bill and the debt-crisis ending — so the private economy could
  // not tell the difference between 3% and 7% sovereign borrowing costs, and
  // `debt_trap` had no mechanism at all.
  //
  // It passes the RISK PREMIUM, not the yield: the yield also contains the
  // expected policy rate, which arrives separately and correctly through
  // policy_rate_demand, and adding the whole yield would count it twice.
  // s.risk_premium is a month stale — updateBondYield runs after this — which
  // is the right sign of error for a channel that works through bank funding
  // costs and loan repricing.
  //
  // AND IT IS ONE-SIDED, because the literature is. Every cited estimate is a
  // CEILING: a corporate rarely borrows cheaper than the state it is domiciled
  // in, and the papers measure downgrades and spread blowouts, not the reverse.
  // Coded two-sided it also created a loop with no counterpart — in `bubble`,
  // debt falls below the baseline, the risk premium goes negative, private
  // borrowing gets subsidised, investment rises, revenue rises, debt falls
  // further. That pushed the bubble's inflation from 2.97% to 3.04% in year 3
  // and broke the scenario's design promise that every visible gauge stays
  // healthy. A sovereign paying less than average does not hand its companies
  // a discount; it just stops charging them a penalty.
  s.sovereign_premium_felt = P.SOVEREIGN_TO_CORPORATE_PASSTHROUGH.value *
                             Math.max(0, s.risk_premium);
  s.market_rate = s.policy_rate_demand + s.credit_spread - s.qe_rate_relief +
                  s.sovereign_premium_felt;
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
  //
  // AND RAMPED ON THE TRANSMITTED RATE, NOT THE DIAL (docs/12 L3). This was
  // `s.policy_rate <= SS_ELB + 0.26` — three defects in one line. It read the
  // DIAL, so dragging the slider to the floor switched crowding out off
  // entirely one month later, while the economy had felt 0.02pp of a 3pp cut:
  // a free, instantaneous change in the fiscal multiplier, in a model whose
  // whole thesis is that nothing is instant. The 0.26 was an unsourced magic
  // number (one dial step plus epsilon). And it was a hard STEP sitting inside
  // the playable range, which docs/07 L6 established as a defect class — while
  // monetaryEasingScale twelve lines above already ramps the same bound over
  // the same band. Crowding out is about the cost of funds the economy is
  // actually facing, so it reads policy_rate_demand and fades over the same
  // ZLB_EFFECTIVE_BAND.
  const slack = clamp(-s.output_gap / 2, 0, 1);
  const elbRoom = clamp((s.policy_rate_demand - P.SS_ELB.value) /
                        P.ZLB_EFFECTIVE_BAND.value, 0, 1);
  const deficitExcess = s.structural_deficit_felt - s.structural_deficit_ss;
  const crowding = -P.CROWDING_OUT.value * deficitExcess * (1 - slack) * elbRoom;

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
    crowding_out_effectiveness: elbRoom,
  });
}
