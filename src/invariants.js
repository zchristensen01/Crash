/**
 * RUNTIME INVARIANTS — checked every tick, not at the end.
 * Failing loudly on tick 3 beats debugging silent drift on tick 300, which is
 * precisely how the prototype's central defect hid.
 *
 * These are accounting identities. If one fails, a rule has a bug — the
 * invariant is never the thing to relax.
 */
import { P } from './params.js';
import { annualRateToMonthlyLinear, annualToMonthlyFlow } from './units.js';

export const INVARIANT_TOLERANCE = 1e-6;

function fail(name, lhs, rhs, tick) {
  throw new Error(
    `invariant '${name}' violated at tick ${tick}: ` +
    `${lhs.toFixed(9)} != ${rhs.toFixed(9)} (diff ${(lhs - rhs).toExponential(2)})`);
}

export function checkInvariants(s, prev, tick) {
  // 1. Output identity — the A3 aggregation must close.
  const demand = s.consumption + s.investment + s.govt_purchases + s.net_exports;
  if (Math.abs((demand - 100) - s.output_gap) > 1e-9) {
    fail('output = C+I+G+NX', demand - 100, s.output_gap, tick);
  }

  // 2. Budget identity.
  const deficit = s.govt_spending + s.transfers + s.interest_cost
                - s.tax_revenue - s.money_printed;
  if (Math.abs(deficit - s.deficit) > 1e-9) {
    fail('deficit = spending + transfers + interest - revenue - printed',
         deficit, s.deficit, tick);
  }

  // 3. Debt accumulation matches the deficit and the erosion term.
  const nominalGrowth = annualRateToMonthlyLinear((prev.potential_growth + s.inflation) / 100);
  const expected = prev.govt_debt + annualToMonthlyFlow(s.deficit)
                 - prev.govt_debt * nominalGrowth;
  if (s.govt_debt > 0 && Math.abs(s.govt_debt - expected) > 1e-6) {
    fail('debt accumulation', s.govt_debt, expected, tick);
  }

  // 4. Bounds. These catch a rule that has gone numerically insane.
  const bounds = [
    ['unemployment', s.unemployment, 0, 100],
    ['credibility', s.credibility, 0, 1],
    ['policy_rate', s.policy_rate, P.SS_ELB.value - 1e-9, 100],
    ['price_level', s.price_level, 1e-6, Infinity],
    ['potential_output', s.potential_output, 1e-6, Infinity],
    ['asset_prices', s.asset_prices, 1e-6, Infinity],
  ];
  for (const [name, v, lo, hi] of bounds) {
    if (!Number.isFinite(v) || v < lo || v > hi) {
      throw new Error(`invariant: ${name} = ${v} outside [${lo}, ${hi}] at tick ${tick}`);
    }
  }
}
