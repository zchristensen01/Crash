/**
 * INVESTMENT  [question A2] — the most rate-sensitive component of demand.
 */
import { P } from '../params.js';
import { clamp, lerp } from '../units.js';
import { DEMAND_BOUNDS } from '../invariants.js';

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
  // judgement: a cut works about a quarter less well in a deep slump than at
  // potential, ramped in over three points of gap. The DIRECTION is sourced —
  // the same balance-sheet and confidence story behind MONETARY_ASYMMETRY_RATIO
  // — and neither the depth nor the ramp width is. Kept small deliberately:
  // MONETARY_ASYMMETRY_RATIO and ZLB_RATE_EFFECTIVENESS are the two sourced
  // scalings on this line and this one must not swamp them.
  const RECESSION_EASING_FLOOR = 0.75;   // judgement, see above
  const RECESSION_RAMP_GAP = 3;          // judgement: pp of gap to reach it
  const inRecession = lerp(1.0, RECESSION_EASING_FLOOR,
                           clamp(-s.output_gap / RECESSION_RAMP_GAP, 0, 1));
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
  // judgement: the flexible-accelerator mechanism is textbook and its
  // magnitude in an aggregate model is not. 0.15pp of investment per pp of gap
  // is deliberately at the weak end — this term competes with the rate channel
  // for the same movement, and INVESTMENT_RATE_ELASTICITY is the sourced one.
  // A larger value would make investment mostly an echo of the output gap and
  // the model would stop being able to tell demand from the cost of capital.
  const ACCELERATOR_STRENGTH = 0.15;   // judgement, see above
  const accelerator = ACCELERATOR_STRENGTH * s.output_gap;

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
  // judgement: crowding out fades to nothing by two points of slack. Same
  // shape and same lack of a source as RECESSION_RAMP_GAP above; the sourced
  // claim is that crowding out is absent when saving is idle, not the width of
  // the ramp. Ramped rather than switched (docs/07 L6).
  const CROWDING_OUT_SLACK_BAND = 2;   // judgement, see above
  const slack = clamp(-s.output_gap / CROWDING_OUT_SLACK_BAND, 0, 1);
  const elbRoom = clamp((s.policy_rate_demand - P.SS_ELB.value) /
                        P.ZLB_EFFECTIVE_BAND.value, 0, 1);
  const deficitExcess = s.structural_deficit_felt - s.structural_deficit_ss;
  const crowding = -P.CROWDING_OUT.value * deficitExcess * (1 - slack) * elbRoom;

  // WHAT THE FIRM WANTS TO SPEND. Not what it spends this month — see below.
  const desired = s.investment_share + rateTerm + accelerator + crowding;

  // THE SLOW HALF OF THE MONETARY LAG, AND THE HALF THE MODEL WAS MISSING
  // [4th audit A1].
  //
  // Capital spending is planned, ordered and built. A firm that decides today
  // to invest less does not spend less today, so investment closes a fraction
  // of the gap to `desired` each month rather than jumping to it. That is a
  // QUANTITY responding slowly to a PRICE, which is the thing the published
  // 9-month impulse response actually measures.
  //
  // The model used to get this delay by lagging the RATE on that same impulse
  // response, so the reduced form was both the input and the coefficient. Now
  // the rate arrives fast (rate_to_borrowing_cost, ~1 quarter, what the
  // pass-through literature measures) and the delay lives here, where the
  // decision is. LAGS_MONTHS['rate_to_investment'] is no longer scheduled
  // anywhere: it is what the combination is MEASURED AGAINST in
  // test/transmission.test.js.
  //
  // IT APPLIES TO THE WHOLE LEVEL, not just the rate term. Adjustment costs
  // are a property of capital spending and do not care why the firm changed
  // its mind, so the accelerator and the crowding-out response are damped by
  // the same friction. Applying it to the rate term alone would say a firm can
  // retool overnight for a fiscal reason but not for a monetary one.
  //
  // The steady state is untouched by construction: desired == investment there,
  // so the adjustment term is exactly zero.
  const speed = P.INVESTMENT_ADJUSTMENT_SPEED.value;
  const adjustment = speed * (desired - s.investment);
  const raw = s.investment + adjustment;

  const terms = {
    'what it was spending': s.investment,
    'cost of borrowing': speed * rateTerm,
    'demand already strong (accelerator)': speed * accelerator,
    'government borrowing crowding it out': speed * crowding,
    'still catching up to last month\'s decision':
      speed * (s.investment_share - s.investment),
  };
  // Bounded BOTH ways. The floor is obvious; the ceiling is not, and its
  // absence was a live bug: under hyperinflation the real user cost goes
  // deeply negative, and an unbounded rate term drove investment to 700% of
  // GDP, which exploded the capital stock and then potential output itself.
  // No economy invests more than ~45% of output in a year.
  // judgement: absurdity bounds, and the numbers are invariants.js check 8's
  // own band so there is one source rather than two (open_items D2). No
  // economy has ever invested 45% of output in a year for long, and none has
  // sustained 2%; both exist so a divergent run stays readable.
  // ONE COPY, IMPORTED [4th audit 5.10] — see DEMAND_BOUNDS.
  const [INVESTMENT_MIN, INVESTMENT_MAX] = DEMAND_BOUNDS.investment;
  s.investment = clamp(raw, INVESTMENT_MIN, INVESTMENT_MAX);
  trace.record('investment', { ...terms,
    'bounded to a physically possible range': s.investment - raw,
  }, s.investment, {
    user_cost: s.user_cost,
    rate_felt_so_far: s.policy_rate_demand,
    rate_on_the_dial: s.policy_rate,
    what_it_wants_to_spend: desired,
    easing_effectiveness: stance < 0 ? scale : null,
    crowding_out_effectiveness: elbRoom,
  });
}
