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
  const ulcPressure = 0.5 * (s.ulc_growth - s.expected_inflation) *
                      (s.spiral_active ? 2.0 : 1.0);

  const terms = {
    'what people already expect': s.expected_inflation,
    'demand above what we can make': kappa * s.output_gap,
    'wage costs beyond productivity': ulcPressure,
    'supply shocks (oil, war, shortages)': s.supply_shock,
    'money printing': s.monetisation_passthrough,
  };
  const total = Object.values(terms).reduce((a, b) => a + b, 0);
  s.inflation = Math.max(-4, total);

  trace.record('inflation', { ...terms,
    'deflation floor': s.inflation - total,
  }, s.inflation, {
    phillips_slope: kappa,
    slope_note: kappa < 0.1 ? 'anchored — demand barely moves prices'
                            : 'UNANCHORED — demand now moves prices 4x harder',
  });

  s.price_level *= 1 + annualRateToMonthlyLinear(s.inflation / 100);
  s.supply_shock *= 0.85;              // shocks fade
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
  const wQ = clamp(P.EXPECTATION_ADAPTIVE_WEIGHT.value * (1 + 0.15 * excess), 0, 0.95);
  const w = quarterlyToMonthly(wQ, true) * (1 - s.credibility * 0.5);

  const before = s.expected_inflation;
  const toActual = w * (s.inflation - before);
  const toTarget = (1 - w) * 0.08 * s.credibility * (s.inflation_target - before);

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
  const lostToUndershoot = -decayM * under / 3;      // the sign trap, fixed
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
