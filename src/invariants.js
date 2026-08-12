/**
 * RUNTIME INVARIANTS — checked every tick, not at the end.
 * Failing loudly on tick 3 beats debugging silent drift on tick 300, which is
 * precisely how the prototype's central defect hid.
 *
 * These are accounting identities. If one fails, a rule has a bug — the
 * invariant is never the thing to relax.
 *
 * [AUDIT docs/07 M13] Four were missing. The capital law of motion and the
 * credit stock-flow identity both already held to machine precision, so
 * adding them costs nothing and pins two rules that nothing else pinned. The
 * price level had no tie to inflation at all. And the demand components had
 * no plausibility band, so investment could sit against its clamp — a rule
 * silently saturating rather than failing — with nothing to say so.
 */
import { P } from './params.js';
import { annualRateToMonthlyLinear, annualToMonthlyFlow } from './units.js';

export const INVARIANT_TOLERANCE = 1e-6;

/**
 * THE PLAUSIBILITY BAND FOR EACH DEMAND COMPONENT, AND THERE IS NOW ONE COPY
 * OF IT [4th audit 5.10, open_items D2].
 *
 * Check 8 below asserts these, `updateConsumption` and `updateInvestment` clamp
 * to them, and the `govt_spending` dial's own maximum is the third of them.
 * All three used to be written out separately — the same numbers in two or
 * three files, with a comment in each saying "taken from the invariant so
 * there is one source", which is a description of intent rather than a
 * mechanism. Move one and the others had to be moved by hand.
 *
 * They are JUDGEMENT and absurdity bounds rather than calibration, which is
 * why they are here and not in `parameters.py`: 95% of potential leaves 5% for
 * investment, government and trade combined, no economy has ever invested 45%
 * of output for long, and nothing real should come near any of them. They
 * exist so a rule that saturates fails loudly instead of reading as stable on
 * every summary statistic.
 *
 * NOT SHARED WITH `tax_rate`, whose dial also happens to run 0-70. That is a
 * different quantity that coincides on a number, and wiring them together
 * because they look alike is the class of error B2 and 5.5 both were.
 */
export const DEMAND_BOUNDS = {
  consumption: [10, 95],
  investment: [2, 45],
  govt_purchases: [0, 70],
};

function fail(name, lhs, rhs, tick) {
  throw new Error(
    `invariant '${name}' violated at tick ${tick}: ` +
    `${lhs.toFixed(9)} != ${rhs.toFixed(9)} (diff ${(lhs - rhs).toExponential(2)})`);
}

export function checkInvariants(s, prev, tick) {
  // 1. Output identity — the A3 aggregation must close. Printed money is
  //    SPENDING and appears here; crisis_drag is demand that stopped.
  const demand = s.consumption + s.investment + s.govt_purchases +
                 s.money_printed + s.net_exports - s.crisis_drag;
  if (Math.abs((demand - 100) - s.output_gap) > 1e-9) {
    fail('output = C+I+G+printed+NX-drag', demand - 100, s.output_gap, tick);
  }

  // 2. Budget identity. Printing appears twice and cancels: it buys things
  //    (term 1) and it is not borrowed (term 2). That cancellation IS the
  //    "govt spends without taxing or borrowing" lesson, so keep it visible.
  const deficit = s.govt_spending + s.money_printed + s.transfers
                + s.interest_cost - s.tax_revenue - s.money_printed;
  if (Math.abs(deficit - s.deficit) > 1e-9) {
    fail('deficit = spending + printed + transfers + interest - revenue - printed',
         deficit, s.deficit, tick);
  }

  // 3. Debt accumulation matches the deficit and the erosion term.
  const nominalGrowth = annualRateToMonthlyLinear((prev.potential_growth + s.inflation) / 100);
  const expected = prev.govt_debt + annualToMonthlyFlow(s.deficit)
                 - prev.govt_debt * nominalGrowth;
  if (s.govt_debt > 0 && Math.abs(s.govt_debt - expected) > 1e-6) {
    fail('debt accumulation', s.govt_debt, expected, tick);
  }

  // 4. Capital law of motion. Investment is LAST tick's, because supply runs
  //    before the demand block:
  //        K[t] = (1-delta_m)K[t-1] + (I[t-1]/100 * Y*[t-1])/12
  //
  //    INVESTMENT IS A SHARE OF POTENTIAL, NOT A LEVEL [4th audit 5.7], and
  //    this identity carried the same unit error as the rule it pins — which
  //    is exactly why it did not catch it. Two copies of one wrong formula
  //    agree with each other perfectly. It DID catch the fix, on tick 2, which
  //    is the invariant doing its job in the only direction it could.
  //
  //    Potential is also last tick's: updatePotentialOutput computes the
  //    investment slice before it overwrites s.potential_output, so the value
  //    it multiplies by is the ceiling the economy had when the spending
  //    happened.
  const deltaM = annualRateToMonthlyLinear(P.DEPRECIATION_RATE.value);
  const expectedK = prev.capital_stock * (1 - deltaM)
                  + annualToMonthlyFlow(prev.investment / 100 * prev.potential_output);
  if (Math.abs(s.capital_stock - expectedK) > 1e-6) {
    fail('capital law of motion', s.capital_stock, expectedK, tick);
  }

  // 5. Credit stock against its own flow. This is what keeps credit/GDP
  //    stationary at the steady state, and the credit gap is the one gauge
  //    the bubble scenario depends on.
  const creditG = annualRateToMonthlyLinear(
    (s.credit_growth_annual - (s.potential_growth + s.inflation)) / 100);
  const expectedCredit = Math.max(20, prev.private_credit * (1 + creditG) - s.write_offs);
  if (Math.abs(s.private_credit - expectedCredit) > 1e-6) {
    fail('credit stock = credit[t-1] * (1 + growth - nominal growth) - write-offs',
         s.private_credit, expectedCredit, tick);
  }

  // 6. The price level is cumulative inflation and nothing else. It is a
  //    display quantity, which is exactly why it needs pinning: a display
  //    that drifts from the number it claims to accumulate is worse than no
  //    display at all.
  const expectedP = prev.price_level *
                    (1 + annualRateToMonthlyLinear(s.inflation / 100));
  if (Math.abs(s.price_level - expectedP) > 1e-6) {
    fail('price level = cumulative inflation', s.price_level, expectedP, tick);
  }

  // 7. Bounds. These catch a rule that has gone numerically insane.
  const bounds = [
    ['unemployment', s.unemployment, 0, 100],
    ['credibility', s.credibility, 0, 1],
    ['policy_rate', s.policy_rate, P.SS_ELB.value - 1e-9, 100],
    ['price_level', s.price_level, 1e-6, Infinity],
    ['potential_output', s.potential_output, 1e-6, Infinity],
    ['asset_prices', s.asset_prices, 1e-6, Infinity],
    ['bank_capital_ratio', s.bank_capital_ratio, 0, 30],
    ['velocity', s.velocity, 0.2, Infinity],
    // The transmitted drivers. A rule assigning to one of these is the bug
    // the whole pipeline redesign exists to prevent, and it would show up
    // here first as a driver that stopped tracking its dial.
    ['policy_rate_demand', s.policy_rate_demand, -100, 100],
    ['policy_rate_markets', s.policy_rate_markets, -100, 100],
    ['tax_rate_effective', s.tax_rate_effective, -1e-9, 100],
    ['qe_stock', s.qe_stock, -1e-9, 100],
  ];
  for (const [name, v, lo, hi] of bounds) {
    if (!Number.isFinite(v) || v < lo || v > hi) {
      throw new Error(`invariant: ${name} = ${v} outside [${lo}, ${hi}] at tick ${tick}`);
    }
  }

  // 8. Demand components stay individually plausible. A component pinned
  //    against its clamp is a rule saturating rather than failing, and
  //    saturation reads as stability on every summary statistic.
  const components = Object.entries(DEMAND_BOUNDS)
    .map(([name, [lo, hi]]) => [name, s[name], lo, hi]);
  for (const [name, v, lo, hi] of components) {
    if (!(v >= lo && v <= hi)) {
      throw new Error(
        `invariant: demand component ${name} = ${v?.toFixed?.(3) ?? v} outside ` +
        `[${lo}, ${hi}] at tick ${tick} — a rule is saturating, not balancing`);
    }
  }
}
