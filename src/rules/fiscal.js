/**
 * GOVERNMENT — yields, stabilisers, the budget  [research 1.2, 2.5]
 */
import { P } from '../params.js';
import { clamp, annualRateToMonthlyLinear, annualToMonthlyFlow } from '../units.js';

/**
 *   yield = expected short rate + term premium + risk premium
 *   risk = slope*(debt - debt_ss)
 *        + slope*foreign_mult*foreign_share*max(0, debt - threshold)
 *        + panic
 *
 * NOTE the risk premium is on debt RELATIVE TO THE BASELINE, not the level.
 * On the level, 100% debt would add 3pp to the yield at the steady state and
 * nothing would balance.
 *
 * WHAT MAKES A YIELD GO NONLINEAR IS OWNERSHIP AND CURRENCY, NOT THE LEVEL:
 *   own currency, domestically held  -> linear, low yields at 250% (JAPAN)
 *   foreign-held, above threshold    -> 3x multiplier + panic  (PERIPHERY)
 * A model that can only do one teaches that high debt is either always fine
 * or always fatal. Both are wrong, and the difference is the lesson.
 *
 * BOND_YIELD_DEBT_SLOPE is in PERCENTAGE POINTS (0.03pp = 3bp). Do not add a
 * /100 — the research report did, and it was a 100x error.
 */
export function updateBondYield(s, trace) {
  const slope = P.BOND_YIELD_DEBT_SLOPE.value;
  const excessDebt = s.govt_debt - P.SS_DEBT_GDP.value;

  const debtTerm = slope * excessDebt;

  const overThreshold = Math.max(0, s.govt_debt - P.BOND_YIELD_NONLINEAR_THRESHOLD.value);
  const foreignTerm = slope * P.BOND_YIELD_FOREIGN_MULTIPLIER.value *
                      s.foreign_share * overThreshold;

  // Panic: self-fulfilling repricing once interest costs eat the budget.
  const interestShare = s.interest_cost / Math.max(1, s.tax_revenue);
  const panic = interestShare > 0.25 ? 8 * (interestShare - 0.25) : 0;

  const expectedShort = s.policy_rate;
  const terms = {
    'expected path of the policy rate': expectedShort,
    'term premium (lending for 10 years)': s.term_premium,
    'government debt level': debtTerm,
    'debt held by foreigners': foreignTerm,
    'market losing confidence': panic,
  };
  const rawYield = Object.values(terms).reduce((a, b) => a + b, 0);
  s.yield_10y = Math.max(0, rawYield);
  s.risk_premium = debtTerm + foreignTerm + panic;

  trace.record('yield_10y', { ...terms,
    'floor at zero': s.yield_10y - rawYield,
  }, s.yield_10y, {
    note: s.foreign_share < 0.4
      ? 'own currency, domestically held — the market is patient'
      : 'foreign-financed — this is where a country reprices suddenly',
  });
}

/**
 * The half of fiscal policy that happens with no decision from you, and that
 * most people have no idea exists. It belongs in the `why` panel.
 *
 * Progressive income tax is the LARGEST channel; unemployment benefits are
 * the MOST TIMELY. Together they reproduce AUTO_STABILISER_ABSORPTION ~0.60.
 */
export function updateAutoStabilisers(s, trace) {
  const taxTerms = {
    'tax at the normal rate': s.tax_rate,
    'progressive tax falling as incomes fall':
      P.AUTOSTAB_TAX_ELASTICITY.value * (s.tax_rate / 100) * s.output_gap,
  };
  s.tax_revenue = Object.values(taxTerms).reduce((a, b) => a + b, 0);
  trace.record('tax_revenue', taxTerms, s.tax_revenue);

  const extraUnemployed = s.unemployment - s.natural_unemployment;
  const transferTerms = {
    'normal transfers': s.transfers_base ?? s.transfers,
    'unemployment benefits rising automatically':
      -P.AUTOSTAB_BENEFIT_ELASTICITY.value * 0.1 * extraUnemployed,
  };
  s.transfers = Object.values(transferTerms).reduce((a, b) => a + b, 0);
  trace.record('transfers', transferTerms, s.transfers);

  s.disposable_income = 100 - s.tax_revenue + s.transfers;
}

/**
 *   deficit = spending + transfers + interest - revenue - printed
 *   debt[t] = debt[t-1]*(1 - nominal_growth) + deficit
 *
 * Inflation and growth quietly erode the real debt burden. That term is why
 * a country can outgrow its debt without ever repaying it.
 *
 * THE AUSTERITY PARADOX falls out of the structural block rather than being
 * special-cased: raise taxes into a recession, output falls, and revenue may
 * not rise at all because you are taxing a smaller economy.
 */
export function updateBudget(s, trace) {
  s.interest_cost = s.govt_debt * s.yield_10y / 100;

  const deficitTerms = {
    'government spending': s.govt_spending,
    'transfers and benefits': s.transfers,
    'interest on existing debt': s.interest_cost,
    'tax revenue': -s.tax_revenue,
    'paid for by printing': -s.money_printed,
  };
  s.deficit = Object.values(deficitTerms).reduce((a, b) => a + b, 0);
  trace.record('deficit', deficitTerms, s.deficit);

  const nominalGrowth = s.potential_growth + s.inflation;
  const erosion = -s.govt_debt * annualRateToMonthlyLinear(nominalGrowth / 100);
  const borrowing = annualToMonthlyFlow(s.deficit);

  trace.record('govt_debt', {
    'what we already owed': s.govt_debt,
    'new borrowing this month': borrowing,
    'eroded by growth and inflation': erosion,
  }, s.govt_debt + borrowing + erosion);

  s.govt_debt = Math.max(0, s.govt_debt + borrowing + erosion);
}
