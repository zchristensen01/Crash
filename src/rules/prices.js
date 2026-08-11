/**
 * PRICES, EXPECTATIONS, CREDIBILITY.
 *
 * Credibility is the switch that sets the Phillips slope and decides whether
 * expectations drift home on their own or chase whatever inflation just did.
 * It is the difference between a central bank that can talk inflation down
 * and one that has to crush the economy to prove a point.
 */
import { P } from '../params.js';
import { lerp, clamp, quarterlyToMonthly, annualRateToMonthlyLinear } from '../units.js';

/**
 *   kappa = lerp(0.05 anchored, 0.20 unanchored, 1 - credibility)
 *   inflation = expected + kappa*gap + ULC pressure + supply shock + printing
 *
 * A 3% output gap with an anchored central bank adds ~0.15pp. Almost nothing.
 * That is not an error — it is what happened from the 1990s to 2019, and it
 * is why "low unemployment causes inflation" stopped being useful advice.
 * Real surges come from supply shocks and unanchoring, not the gap term.
 */
export function updateInflation(s, trace) {
  const kappa = lerp(P.PHILLIPS_KAPPA_ANCHORED.value,
                     P.PHILLIPS_KAPPA_UNANCHORED.value, 1 - s.credibility);
  s.kappa_effective = kappa;

  // ULC pressure enters only as a DEVIATION from expected inflation, or the
  // wage block would double-count what expectations already carry.
  //
  // judgement: half of an excess unit-labour-cost move reaches prices within
  // the month, doubling once the spiral gate is open. The labour SHARE of
  // value added is about 0.6 and is sourced (`labour_share`), which is the
  // arithmetic upper bound on pass-through in one period; 0.5 sits just under
  // it and the remainder is margin absorption, which this model does not
  // carry a markup block to derive. The doubling is the only thing
  // `spiral_active` does to prices, and WAGE_PRICE_SPIRAL_CREDIBILITY_GATE
  // sources when the gate opens, not how much harder it bites.
  const ULC_PASSTHROUGH = 0.5;      // judgement, see above
  const ULC_SPIRAL_MULTIPLIER = 2.0;  // judgement, see above
  const ulcPressure = ULC_PASSTHROUGH * (s.ulc_growth - s.expected_inflation) *
                      (s.spiral_active ? ULC_SPIRAL_MULTIPLIER : 1);

  const terms = {
    'what people already expect': s.expected_inflation,
    'demand above what we can make': kappa * s.output_gap,
    'wage costs beyond productivity': ulcPressure,
    'supply shocks (oil, war, shortages)': s.supply_shock,
    'money printing': s.monetisation_passthrough,
  };
  const total = Object.values(terms).reduce((a, b) => a + b, 0);
  // judgement: absurdity floor. The deepest sustained deflation in a modern
  // advanced economy is Japan's, at a fraction of a point a year; the Great
  // Depression reached about -10% in the US at its worst quarter. -4% is past
  // anything this model is calibrated over and exists so a deflationary
  // spiral stays readable rather than running to a negative price level.
  const DEFLATION_FLOOR = -4;   // judgement, see above
  s.inflation = Math.max(DEFLATION_FLOOR, total);

  trace.record('inflation', { ...terms,
    'deflation floor': s.inflation - total,
  }, s.inflation, {
    phillips_slope: kappa,
    slope_note: kappa < 0.1 ? 'anchored — demand barely moves prices'
                            : 'UNANCHORED — demand now moves prices 4x harder',
  });

  s.price_level *= 1 + annualRateToMonthlyLinear(s.inflation / 100);
  // judgement: a supply shock loses 15% of itself a month, a ~4-month
  // half-life. Oil-price and shipping-cost shocks are commonly modelled as
  // persistent AR(1)s with quarterly coefficients around 0.6-0.9 and nothing
  // pins the monthly figure for a composite "supply shock" that stands for
  // oil, war and shortages at once. It decides how long a stagflation lasts
  // without any policy at all, which is why it is named rather than buried.
  const SUPPLY_SHOCK_DECAY = 0.85;   // judgement, see above
  s.supply_shock *= SUPPLY_SHOCK_DECAY;              // shocks fade
}

/**
 *   w = ADAPTIVE_WEIGHT * (1 + rise with the level of inflation)
 *   expected = w*inflation + (1-w)*target
 *
 * The weight RISES WITH INFLATION — expectations become more backward-looking
 * when inflation is high, a second amplifier stacked on the credibility
 * switch. Pass 2 confirms 0.30 as a central value but not as a constant.
 */
export function updateExpectations(s, trace) {
  const excess = Math.max(0, s.inflation - s.inflation_target);
  // judgement, all three. EXPECTATION_ADAPTIVE_WEIGHT is the sourced backward
  // -looking weight at target; these say how it changes AWAY from target, and
  // that state dependence is the shape the anchoring literature establishes
  // qualitatively and does not quantify. STATE_DEPENDENCE is the steepness
  // (15% more backward-looking per pp of excess inflation), CEILING stops the
  // weight reaching 1.0 where expectations would be purely adaptive and the
  // target would mean nothing, and CREDIBILITY_DAMPING is how much a credible
  // central bank suppresses the whole adaptive term.
  const EXPECTATION_STATE_DEPENDENCE = 0.15;   // judgement, see above
  const EXPECTATION_WEIGHT_CEILING = 0.95;     // judgement, see above
  const EXPECTATION_CREDIBILITY_DAMPING = 0.5; // judgement, see above
  const wQ = clamp(P.EXPECTATION_ADAPTIVE_WEIGHT.value *
                   (1 + EXPECTATION_STATE_DEPENDENCE * excess),
                   0, EXPECTATION_WEIGHT_CEILING);
  const w = quarterlyToMonthly(wQ, true) *
            (1 - s.credibility * EXPECTATION_CREDIBILITY_DAMPING);

  const before = s.expected_inflation;
  const toActual = w * (s.inflation - before);
  // judgement: the forward-looking half closes 8% of the distance to target a
  // month, scaled by credibility. This is the model's ENTIRE anchoring
  // mechanism and it has no source, because the object the literature
  // measures — a survey or breakeven expectation — is what this is trying to
  // reproduce rather than an input to it. It is deliberately weak: strong
  // enough that a credible central bank pulls expectations home over a couple
  // of years, weak enough that it cannot rescue a run that has got away.
  // See open_items C1 — a proper forward-guidance block would replace this.
  const EXPECTATION_TARGET_PULL = 0.08;   // judgement, see above
  const toTarget = (1 - w) * EXPECTATION_TARGET_PULL * s.credibility *
                   (s.inflation_target - before);

  s.expected_inflation = before + toActual + toTarget;

  trace.record('expected_inflation', {
    'where expectations were': before,
    'chasing actual inflation': toActual,
    'pulled back to the 2% target': toTarget,
  }, s.expected_inflation, {
    backward_looking_weight: w,
    note: 'a credible central bank does this work for free',
  });
}

/**
 *   decay 0.05/qtr vs repair 0.017/qtr — roughly 3:1.
 *
 * Losing credibility is much faster than regaining it, which is the entire
 * reason central bankers hike into visible pain rather than waiting for
 * proof. The prototype used 0.02/0.010: directionally right, far too
 * symmetric.
 *
 * SIGN TRAP, and the prototype fell into it: the erosion uses a SIGNED miss.
 * With abs(), engineering deflation to -4% destroyed credibility exactly as
 * fast as causing 8% inflation — punishing the cure identically to the
 * disease. Undershooting costs something, but a third as much.
 */
export function updateCredibility(s, trace) {
  const tol = P.CREDIBILITY_MISS_TOLERANCE.value;
  const miss = s.inflation - s.inflation_target;
  const over = Math.max(0, miss - tol);
  const under = Math.max(0, -miss - tol);

  const decayM = quarterlyToMonthly(P.CREDIBILITY_DECAY.value, false);
  const repairM = quarterlyToMonthly(P.CREDIBILITY_REPAIR.value, false);

  const lostToOvershoot = -decayM * over;
  // judgement: undershooting the target costs a third as much credibility as
  // overshooting it. The asymmetry is the finding — a central bank that
  // misses low is thought soft rather than dishonest — and the literature
  // (Japan, the euro area post-2013) establishes the direction, not the ratio.
  const UNDERSHOOT_CREDIBILITY_RATIO = 3;   // judgement, see above
  const lostToUndershoot = -decayM * under / UNDERSHOOT_CREDIBILITY_RATIO;
  const regained = (over === 0 && under === 0) ? repairM * (1 - s.credibility) : 0;

  const before = s.credibility;
  const raw = before + lostToOvershoot + lostToUndershoot + regained;
  s.credibility = clamp(raw, 0, 1);

  trace.record('credibility', {
    'where it was': before,
    'inflation running above target': lostToOvershoot,
    'inflation running below target': lostToUndershoot,
    'rebuilt by hitting the target': regained,
    'bounded to 0-1': s.credibility - raw,
  }, s.credibility, {
    note: 'falls ~3x faster than it rebuilds — that asymmetry is why central ' +
          'bankers hike into visible pain rather than waiting for proof',
  });
}
