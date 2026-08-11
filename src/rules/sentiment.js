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
  const fundamentals = 60
    - 2.0 * (s.unemployment - s.natural_unemployment)
    - 1.0 * Math.max(0, s.inflation - s.inflation_target)
    + 0.5 * s.output_gap
    + 0.05 * (s.asset_prices - s.asset_fundamental);

  const before = s.consumer_confidence;
  s.consumer_confidence = clamp(before + 0.3 * (fundamentals - before), 0, 100);

  // The part fundamentals do NOT explain. This alone feeds consumption.
  s.confidence_residual = (1 - P.CONFIDENCE_FUNDAMENTAL_LOAD.value) *
                          (s.consumer_confidence - fundamentals);

  // Firms read a different economy from households: order books and the cost
  // of credit rather than jobs and the price of food. docs/01 lists it;
  // nothing computed it. It is a gauge, like consumer_confidence — the
  // orthogonal residual is the only part with causal power and that is
  // wired to consumption above.
  s.business_confidence = clamp(60 + 4.0 * s.output_gap
    - 6.0 * (s.credit_spread - s.credit_spread_ss)
    - 2.0 * (s.user_cost - s.market_real_rate_ss), 0, 100);

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
export function updateApproval(s, trace) {
  const incomeGrowth = yoyGrowth(s.history.real_income);
  const w = P.APPROVAL_MISERY_WEIGHT.value;

  const terms = {
    'people feeling better off': P.APPROVAL_INCOME_GROWTH_COEF.value *
      (incomeGrowth - s.potential_growth),
    'unemployment': -w * (s.unemployment - s.natural_unemployment),
    'cost of living': -1.0 * Math.max(0, s.inflation - s.inflation_target),
    'tax resentment': -0.15 * (s.tax_rate - s.tax_rate_ss),
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
