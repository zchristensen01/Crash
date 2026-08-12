/**
 * SENTIMENT  [research 3.1-3.2]
 *
 * The first pass concluded these had "zero empirical basis" and were "not
 * really economics". That was a search error, not a finding — they had been
 * looked for in the wrong literature. Economic voting and consumer sentiment
 * are both mature fields.
 *
 * Runs LAST because confidence mostly reads the world rather than moving it.
 */
import { P } from '../params.js';
import { clamp, yoyGrowth } from '../units.js';

/**
 * Confidence is ~80% an echo of fundamentals (Carroll-Fuhrer-Wilcox 1994;
 * Ludvigson 2004). Only the orthogonal RESIDUAL is causal for consumption,
 * and its incremental power is small. The prototype's strong unsourced
 * mood->demand channel was the direct cause of its steady-state drift, so
 * this one deliberately does very little.
 */
export function updateConfidence(s, trace) {
  // judgement, the whole block. Consumer confidence is a SURVEY INDEX on an
  // arbitrary scale, so there is no natural-units coefficient to source: 60 is
  // a neutral reading on a 0-100 scale and the weights are chosen so the index
  // spans roughly 30-80 across the states the game reaches. What matters
  // causally is not this index but `confidence_residual` below, which is the
  // orthogonal part, scaled by the SOURCED CONFIDENCE_FUNDAMENTAL_LOAD — so an
  // error in these weights moves a gauge and barely moves the economy. That is
  // deliberate: the prototype's strong unsourced mood->demand channel caused
  // its steady-state drift.
  const CONF_NEUTRAL = 60;          // judgement: neutral on a 0-100 survey scale
  const CONF_W_UNEMPLOYMENT = 2.0;  // judgement, see above
  const CONF_W_INFLATION = 1.0;     // judgement, see above
  const CONF_W_OUTPUT_GAP = 0.5;    // judgement, see above
  const CONF_W_ASSETS = 0.05;       // judgement, see above
  const CONF_ADJUSTMENT_SPEED = 0.3;// judgement: surveys move within a quarter
  const fundamentals = CONF_NEUTRAL
    - CONF_W_UNEMPLOYMENT * (s.unemployment - s.natural_unemployment)
    - CONF_W_INFLATION * Math.max(0, s.inflation - s.inflation_target)
    + CONF_W_OUTPUT_GAP * s.output_gap
    + CONF_W_ASSETS * (s.asset_prices - s.asset_fundamental);

  const before = s.consumer_confidence;
  s.consumer_confidence = clamp(
    before + CONF_ADJUSTMENT_SPEED * (fundamentals - before), 0, 100);

  // The part fundamentals do NOT explain. This alone feeds consumption.
  s.confidence_residual = (1 - P.CONFIDENCE_FUNDAMENTAL_LOAD.value) *
                          (s.consumer_confidence - fundamentals);

  // Firms read a different economy from households: order books and the cost
  // of credit rather than jobs and the price of food. docs/01 lists it;
  // nothing computed it. It is a gauge, like consumer_confidence — the
  // orthogonal residual is the only part with causal power and that is
  // wired to consumption above.
  // judgement, same scale argument as consumer confidence above, and this one
  // is read by NOTHING — it is a pure gauge. Firms weight the cost of credit
  // heavily (6.0 on the spread against 2.0 on the user cost) because a spread
  // move is a change in availability as well as price.
  const BIZ_NEUTRAL = 60;           // judgement: neutral on a 0-100 survey scale
  const BIZ_W_OUTPUT_GAP = 4.0;     // judgement, see above
  const BIZ_W_SPREAD = 6.0;         // judgement, see above
  const BIZ_W_USER_COST = 2.0;      // judgement, see above
  s.business_confidence = clamp(BIZ_NEUTRAL + BIZ_W_OUTPUT_GAP * s.output_gap
    - BIZ_W_SPREAD * (s.credit_spread - s.credit_spread_ss)
    // AGAINST THE STEADY-STATE USER COST, not against a real interest rate
    // (4th audit 5.13, open_items B7). `user_cost` carries depreciation and
    // `market_real_rate_ss` does not, so this term used to read a permanent
    // -2.0 x DEPRECIATION_RATE x 100 = -12 points and the gauge settled at
    // 48.000 forever while `consumer_confidence` settled at its declared 60.
    // `s.user_cost_ss` is the same anchor updateInvestment measures its
    // stance against, so the two cannot drift apart.
    - BIZ_W_USER_COST * (s.user_cost - s.user_cost_ss), 0, 100);

  // The misery index, as docs/01 defines it. NOT what approval is driven off:
  // Di Tella, MacCulloch & Oswald reject the 1:1 weighting, so approval uses
  // APPROVAL_MISERY_WEIGHT and this is a display quantity only.
  s.misery = Math.max(0, s.inflation) + s.unemployment;

  trace.record('consumer_confidence', {
    'where it was': before,
    'catching up with the actual economy': s.consumer_confidence - before,
  }, s.consumer_confidence, {
    orthogonal_residual: s.confidence_residual,
    business_confidence: s.business_confidence,
    note: 'mostly an echo of the real numbers — treat as near-decoration',
  });
}

/**
 * Your health bar, and now sourced.
 *
 * UNEMPLOYMENT HURTS ~1.7x MORE THAN INFLATION. Di Tella, MacCulloch & Oswald
 * (AER 2001) statistically REJECT equality of the two coefficients — the
 * misery index is not 1:1. Never drive approval off inflation + unemployment.
 *
 * MYOPIA IS REAL AND IT CHANGES STRATEGY. Voters weight the recent economy
 * far more heavily (Achen & Bartels), which makes "let it burn until year 7,
 * then reflate" genuinely viable in a fixed-term game. That is a real lesson
 * about democratic incentives — it is NOT to be patched out.
 */
/**
 * The two approval weights that are NOT sourced.
 *
 * judgement, both. APPROVAL_MISERY_WEIGHT and APPROVAL_INCOME_GROWTH_COEF are
 * estimated (Di Tella, MacCulloch & Oswald), and they carry the unemployment
 * and income legs. These two do not have an equivalent. Inflation enters at
 * 1.0 point of approval per pp above target, and ONE-SIDED — below target
 * voters do not reward you, which is the same asymmetry the credibility block
 * has. Tax resentment is 0.15 per pp on the ANNOUNCED rate, small on purpose:
 * it is a political reaction and it must not become a second fiscal channel.
 */
const APPROVAL_W_INFLATION = 1.0;    // judgement, see above
const APPROVAL_W_TAX = 0.15;         // judgement, see above

export function updateApproval(s, trace) {
  const incomeGrowth = yoyGrowth(s.history.real_income);
  const w = P.APPROVAL_MISERY_WEIGHT.value;

  const terms = {
    'people feeling better off': P.APPROVAL_INCOME_GROWTH_COEF.value *
      (incomeGrowth - s.potential_growth),
    'unemployment': -w * (s.unemployment - s.natural_unemployment),
    'cost of living': -APPROVAL_W_INFLATION * Math.max(0, s.inflation - s.inflation_target),
    // lint-allow-dial: voters resent the tax rate that was ANNOUNCED, not the one
    // that has finished arriving in pay packets. The political reaction is to the
    // budget speech; tax_rate_effective is what the economics responds to.
    'tax resentment': -APPROVAL_W_TAX * (s.tax_rate - s.tax_rate_ss),
  };
  const target = s.approval_base + Object.values(terms).reduce((a, b) => a + b, 0);

  const before = s.approval;
  // Recency weighting: approval moves quickly toward how things feel NOW.
  const speed = 1 - P.APPROVAL_HORIZON.value;
  const raw = before + speed * (target - before);
  s.approval = clamp(raw, 0, 100);

  trace.record('approval', {
    'where it was': before,
    ...Object.fromEntries(Object.entries(terms).map(([k, v]) => [k, v * speed])),
    'baseline pull': speed * (s.approval_base - before),
    'bounded to 0-100': s.approval - raw,
  }, s.approval, {
    note: 'voters weight the last year far more than the four before it',
    unemployment_hurts_x_more_than_inflation: P.APPROVAL_MISERY_WEIGHT.value,
  });
}
