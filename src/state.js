/**
 * STATE.
 *
 * CONVENTION THAT MAKES THE IDENTITIES CLOSE: every demand component, tax,
 * transfer and flow is carried as a PERCENT OF POTENTIAL OUTPUT, not as a
 * level. potential_output is the only level. So C + I + G = 100 exactly at
 * the steady state, and the accounting is readable at a glance.
 *
 * Rates (inflation, unemployment, yields) are ANNUALISED PERCENTS throughout,
 * because that is how they are reported and how the player reads them.
 * Conversion to monthly happens inside rules, via units.js, never in state.
 */
import { START, P } from './params.js';
import { yoyGrowth } from './units.js';

export function newState(overrides = {}) {
  const s = { ...START, ...overrides };

  s.tick = 0;
  s.potential_output = 100;
  s.output = 100;

  // Demand components as % of potential. C is SOLVED from the identity so the
  // steady state closes for any tax/spend setting, rather than hardcoded.
  s.govt_purchases = s.govt_spending;
  s.investment = s.investment_share;
  s.net_exports = 0;                       // v1 is closed — decision A5

  s.tax_revenue = s.tax_rate;
  s.disposable_income = 100 - s.tax_revenue + s.transfers;

  // The average propensity to consume is a BEHAVIOURAL CONSTANT derived from
  // the CANONICAL baseline — never from the overridden state. Solving it per
  // scenario makes consumption the residual of the accounting identity, so
  // raising G mechanically cuts C by the same amount and the fiscal
  // multiplier is structurally zero. That was silent and total.
  const baseC = 100 - START.govt_spending - START.investment_share;
  const baseYD = 100 - START.tax_rate + START.transfers;
  s.apc_ss = baseC / baseYD;                        // ~0.709
  s.consumption = s.apc_ss * s.disposable_income;   // behavioural, not residual
  s.yd_permanent = s.disposable_income;

  // Supply side. Cobb-Douglas TFP is solved so Y* = 100 at K = 3*Y, L = 95.
  s.capital_stock = s.capital_output_ratio * 100;
  s.labour_force = 100;
  s.employment = s.labour_force * (1 - s.unemployment / 100);
  s.alpha = 1 - s.labour_share;
  s.tfp = 100 / (Math.pow(s.capital_stock, s.alpha) *
                 Math.pow(s.employment, 1 - s.alpha));
  s.labour_productivity = s.output / s.employment;
  s.productivity_growth = s.potential_growth;   // resolved in supply.js

  // Prices and money
  s.price_level = 100;
  s.wage_level = 100;
  s.money_supply = 100;
  s.monetisation_passthrough = 0;
  s.kappa_effective = P.PHILLIPS_KAPPA_ANCHORED.value;
  s.money_printed = s.money_printed ?? 0;

  // Credit and assets. asset_prices is a REAL index — constant in steady
  // state, so leverage and the fire-sale gate are stationary.
  s.private_credit = s.private_credit_gdp;
  s.credit_trend = s.private_credit_gdp;
  s.asset_fundamental = s.asset_prices;
  s.default_rate = 1.0;
  s.crisis_prob = 0;
  s.crisis_active = false;
  s.scar = 0;

  // Sentiment
  s.confidence_residual = 0;
  s.approval_base = s.approval;
  s.hiring_momentum = 0;

  // Steady-state anchors. Rules compare against these, never against raw
  // levels — a risk premium on the debt LEVEL would add 3pp to the yield at
  // the steady state and nothing would balance.
  s.inflation_target = P.SS_INFLATION_TARGET.value;
  s.policy_rate_ss = s.policy_rate;
  s.credit_spread_ss = s.credit_spread;
  s.tax_rate_ss = s.tax_rate;
  s.deficit_ss = s.deficit;
  s.transfers_base = s.transfers;
  // Leverage is a NORMALISED ratio, 1.0 at the steady state: how much
  // borrowing has run up relative to what backs it. Using raw
  // credit(%GDP)/asset(index) gives 1.5 at the steady state and the
  // fire-sale gate fires on tick 1.
  s.credit_ss = START.private_credit_gdp;   // canonical, like apc_ss
  s.leverage = 1.0;
  s.leverage_ss = 1.0;
  s.leverage_max = 1.35;                   // fire-sale gate: 35% above normal
  // The MARKET real rate, which includes the spread, has its own baseline.
  // Comparing it to r* (a policy-rate concept) leaves a permanent 1.5pp wedge
  // and credit shrinks forever.
  s.market_real_rate_ss = s.policy_rate + s.credit_spread - s.inflation_target;
  s.dsr_ss = s.private_credit_gdp * (s.policy_rate + s.credit_spread) / 100;
  // Normal-times loan losses. Banks earn interest and retain profits, so only
  // losses ABOVE this baseline eat capital. Without the baseline, capital
  // bleeds from 13% to ~9.6% at rest and ratchets the spread up 0.6pp.
  s.loan_losses_ss = (1.0 / 100) * P.LOSS_GIVEN_DEFAULT.value * s.private_credit;
  s.credit_growth_annual = s.potential_growth + s.inflation;
  s.ulc_growth = s.inflation_target;
  s.spiral_active = false;
  s.crisis_drag = 0;
  s.velocity_v0 = P.VELOCITY_INTEREST_SEMIELAST.value * Math.log(1 + s.policy_rate / 100);

  // Histories for charts and YoY
  s.history = { output: [], growth: [], inflation: [], unemployment: [],
                approval: [], credit_gap: [], output_gap: [], real_income: [],
                govt_debt: [], credibility: [] };

  // Explicit overrides win over anything derived above. Without this a
  // scenario cannot set credit_trend, asset_fundamental or any other field
  // that newState computes for itself, and the scenario silently reverts.
  Object.assign(s, overrides);
  return s;
}

export function pushHistory(s) {
  const MAX = 130;                        // >12 months for YoY, capped
  const h = s.history;
  h.output.push(s.output);
  h.inflation.push(s.inflation);
  h.unemployment.push(s.unemployment);
  h.approval.push(s.approval);
  h.credit_gap.push(s.credit_to_gdp_gap);
  h.output_gap.push(s.output_gap);
  h.real_income.push(s.disposable_income * s.output / 100);
  h.govt_debt.push(s.govt_debt);
  h.credibility.push(s.credibility);
  h.growth.push(yoyGrowth(h.output));
  for (const k of Object.keys(h)) if (h[k].length > MAX) h[k].shift();
}

/** docs/02 Part 4. The dial that matters depends on which box you're in. */
export function regime(s) {
  const hot = s.inflation > 3.0;
  const slack = s.unemployment > s.natural_unemployment + 1.0;
  if (hot && slack) return 'STAGFLATION';
  if (hot) return 'OVERHEATING';
  if (slack) return 'RECESSION';
  return 'GOLDILOCKS';
}
