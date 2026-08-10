/**
 * SUPPLY — the ceiling  [question A4]
 *
 * potential_output is the answer to "why can't we just print money". You can
 * hand everyone a million dollars. You cannot hand them a million loaves of
 * bread that don't exist.
 */
import { P } from '../params.js';
import { annualRateToMonthlyLinear, annualToMonthlyFlow } from '../units.js';

/**
 * Cobb-Douglas potential output, the capital law of motion, productivity.
 *
 *   K[t] = (1-delta_m)K[t-1] + I_m          delta, I linear monthly
 *   Y*   = A * K^alpha * L^(1-alpha)        alpha = 1 - labour share
 *
 * RESOLVES THE OPEN IDENTITY from parameters.py §2. With K/Y constant,
 * output per worker grows at potential growth, so labour productivity growth
 * is 1.5%/yr and steady-state wage growth is target + 1.5 = 3.5%, not the
 * 3.0% START previously carried. TFP growth is the residual,
 * g_A = 1.5 * (1 - alpha) = 0.93%/yr.
 */
export function updatePotentialOutput(s, trace) {
  const deltaM = annualRateToMonthlyLinear(P.DEPRECIATION_RATE.value);
  const investM = annualToMonthlyFlow(s.investment);   // % of potential, monthly

  const depreciation = -deltaM * s.capital_stock;
  const kBefore = s.capital_stock;
  trace.record('capital_stock', {
    'wear and obsolescence': depreciation,
    'new investment': investM,
  }, depreciation + investM);
  s.capital_stock = kBefore + depreciation + investM;

  // TFP grows at the residual after capital deepening.
  const gA = s.potential_growth * (1 - s.alpha);
  s.tfp *= 1 + annualRateToMonthlyLinear(gA / 100);

  // Labour supply: constant in v1 (no migration or demographics dialled).
  const potentialEmployment = s.labour_force * (1 - s.natural_unemployment / 100);

  const before = s.potential_output;
  s.potential_output = s.tfp * Math.pow(s.capital_stock, s.alpha) *
                       Math.pow(potentialEmployment, 1 - s.alpha) - s.scar;

  s.labour_productivity = s.potential_output / potentialEmployment;
  s.productivity_growth = s.potential_growth;

  trace.record('potential_output', {
    'previous ceiling': before,
    'more machines and buildings': s.potential_output - before,
  }, s.potential_output);
}
