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
  // INVESTMENT IS A SHARE AND THE CAPITAL STOCK IS A LEVEL [4th audit 5.7].
  //
  // This was `annualToMonthlyFlow(s.investment)`. `s.investment` is a PERCENT
  // OF POTENTIAL OUTPUT — this model's convention for every flow, stated at
  // the top of state.js: "potential_output is the only level" — and it was
  // being added to `capital_stock`, which is a level. So the investment flow
  // feeding the stock was FROZEN at its month-zero value while potential grew
  // away from 100. Same class as the asset-price semi-elasticity of B2: a
  // share used where a level belongs.
  //
  // Three consequences, all measured before the fix and all exact:
  //
  //   K converged to a CONSTANT I/delta, not to a growing path
  //       predicted 22.5/0.065 = 346.15, measured 346.154 at m2400
  //   potential growth decayed to the TFP term alone
  //       predicted gA = g*(1-alpha) = 0.930%, measured 0.9345% at m1200
  //   K/Y fell without bound from 3.0
  //       2.89 at m96, 2.66 at m240, 2.05 at m600
  //
  // NOTHING CAUGHT IT FOR THE WHOLE LIFE OF THE MODEL, and the reason is worth
  // keeping: test/steady-state.test.js checks output_gap (a ratio), inflation
  // (a rate) and consumption (a percent of potential), and ALL THREE ARE
  // INVARIANT to this defect because output and potential drift together. The
  // gate that exists to catch drift cannot see a common drift in the level.
  // It surfaced only when 5.6 wired `gdp_growth_annual`, which had been
  // carried in START as a frozen 1.5 and read by nothing — so the model had no
  // real-growth number anywhere for anyone to look at. There is a level
  // assertion in that test file now.
  const investM = annualToMonthlyFlow(s.investment / 100 * s.potential_output);

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
