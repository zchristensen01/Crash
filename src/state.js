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
  s.crisis_drag = 0;
  s.money_printed = s.money_printed ?? 0;
  s.qe = s.qe ?? 0;

  s.tax_revenue = s.tax_rate;
  // Household MARKET income is what the economy actually produced, not its
  // capacity. Writing the constant 100 here was one line, and it removed the
  // income-expenditure multiplier, left the automatic stabilisers with no
  // shock to absorb, made the austerity paradox algebraically impossible and
  // made households RICHER in a slump (docs/07 L4). At the steady state
  // output = potential, so this is still 100 and the steady state is unmoved.
  s.market_income = 100 * s.output / s.potential_output;
  // The price brake: a cost-push shock is a real income cut. docs/02
  // Self-correction 1, and it was missing entirely.
  s.supply_cost = P.SUPPLY_SHOCK_INCOME_LOSS.value * Math.max(0, s.supply_shock);
  s.disposable_income = s.market_income - s.tax_revenue + s.transfers - s.supply_cost;
  // The rate actually PAID on the outstanding stock, which is not this
  // month's market yield: only 1/DEBT_AVERAGE_MATURITY_YEARS of the debt
  // refinances each year (docs/12 M2). Equal to the yield at the start, so
  // every scenario opens internally consistent and the steady state is
  // unmoved.
  s.average_coupon = s.yield_10y;

  // The CYCLICALLY-ADJUSTED PRIMARY deficit: what would be borrowed at
  // potential, before interest. This is what crowding out reads, so it needs
  // its own steady-state anchor — comparing it against the headline
  // deficit_ss leaves a permanent 3.25pp wedge (the interest bill) and the
  // model crowds investment IN forever, at rest.
  s.structural_deficit = s.deficit - s.govt_debt * s.average_coupon / 100;
  s.structural_deficit_felt = s.structural_deficit;
  s.autostab_tax = 0;                      // lagged stabiliser legs
  s.autostab_benefit = 0;

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

  // Prices. price_level is the cost of living relative to the month you took
  // office — a display quantity, asserted against cumulative inflation in
  // invariants.js. wage_level and money_supply used to sit here too and were
  // read by nothing at all; see docs/07 M3.
  s.price_level = 100;
  s.monetisation_passthrough = 0;
  s.kappa_effective = P.PHILLIPS_KAPPA_ANCHORED.value;

  // Credit and assets. asset_prices is a REAL index — constant in steady
  // state, so leverage and the fire-sale gate are stationary.
  s.private_credit = s.private_credit_gdp;
  s.credit_trend = s.private_credit_gdp;
  s.asset_fundamental = s.asset_prices;
  s.default_rate = 1.0;
  s.loan_losses = 0;                       // set by updateDefaults
  s.credit_impulse = 0;
  s.write_offs = 0;
  s.fire_sale_spent = 0;
  s.crisis_prob = 0;
  s.crisis_active = false;
  s.crisis_months = 0;
  s.recap_promptness = 0;
  // Cumulative extra public spending since the crash, in pp-YEARS of GDP —
  // an injected QUANTITY, which is what RECAP_FULL_RESPONSE is denominated in.
  // crisis.js integrates the spending rate into this; comparing the rate
  // itself against the parameter let a one-month gesture outscore a year-long
  // programme that spent 2.4x more (docs/12 L1).
  s.recap_spent = 0;
  s.transitory_shock = 0;
  // Set when a crash lands, and declared here so a SCENARIO can start
  // mid-crisis without crisis.js reading undefined.
  s.potential_at_crisis = s.potential_output;
  s.crisis_spending_baseline = s.govt_spending + s.money_printed;
  s.scar = 0;
  // Where the scar is HEADED. It is revisable for RECAP_WINDOW_MONTHS and then
  // fixed, while `scar` walks toward it over CRISIS_YEARS_TO_RECOVER. Split in
  // two because the scar used to land in full on month one, which turned a
  // horizon measurement into a contribution to the trough (docs/12 §2).
  // Re-derived below the override block, because a scenario may set `scar`.
  s.scar_target = 0;

  // Sentiment. business_confidence and misery are listed as derived in
  // docs/01 and nothing computed them; sentiment.js does now.
  s.confidence_residual = 0;
  s.business_confidence = 60;
  s.misery = s.inflation + s.unemployment;
  s.fiscal_space = 100;                    // set by updateBudget
  s.approval_base = s.approval;
  s.hiring_momentum = 0;

  // Banks. The floor they defend is BANK_CAPITAL_MINIMUM; the ratio they
  // REBUILD toward is the canonical healthy level, like apc_ss and for the
  // same reason. Taking it from the scenario's own start would mean a
  // scenario that begins with a damaged banking system has redefined
  // "healthy" to mean "damaged", so the spread would price no stress and
  // retained earnings would have nothing to rebuild.
  s.bank_capital_ss = START.bank_capital_ratio;
  s.bank_capital_shortfall = 0;

  // Steady-state anchors. Rules compare against these, never against raw
  // levels — a risk premium on the debt LEVEL would add 3pp to the yield at
  // the steady state and nothing would balance.
  s.inflation_target = P.SS_INFLATION_TARGET.value;
  // NEUTRAL IS r* + TARGET. It is NOT wherever this scenario happens to start.
  // Taking it from s.policy_rate meant a scenario opening at a 10% rate
  // against 7% expected inflation declared its own stance neutral and then
  // computed a real user cost 5pp BELOW it — so the tightest starting policy
  // in the set read as a large monetary easing, and the stagflation scenario
  // boomed out of its own regime inside a month. Every anchor below that
  // mixes a rate with inflation_target has to be built the same way.
  s.policy_rate_ss = s.neutral_real_rate + s.inflation_target;
  s.credit_spread_ss = s.credit_spread;
  s.tax_rate_ss = s.tax_rate;
  s.deficit_ss = s.deficit;
  s.structural_deficit_ss = s.structural_deficit;
  s.transfers_base = s.transfers;
  // Leverage is a NORMALISED ratio, 1.0 at the steady state: how much
  // borrowing has run up relative to what backs it. Using raw
  // credit(%GDP)/asset(index) gives 1.5 at the steady state and the
  // fire-sale gate fires on tick 1.
  // Both anchors are the SCENARIO's own starting values, so leverage is 1.0
  // in every scenario and the 1.35 gate means the same thing in all of them.
  // Anchoring the numerator on the canonical START while the denominator
  // moved with the scenario put the bubble at leverage 0.75 — 45% of the way
  // to the gate BELOW where it starts — and made forced selling unreachable
  // in all six scenarios over a full term (docs/07 M4).
  s.credit_ss = s.private_credit;
  s.asset_prices_ss = s.asset_prices;
  s.leverage = 1.0;
  s.leverage_ss = 1.0;
  s.leverage_max = 1.35;                   // fire-sale gate: 35% above normal
  // The MARKET real rate, which includes the spread, has its own baseline.
  // Comparing it to r* (a policy-rate concept) leaves a permanent 1.5pp wedge
  // and credit shrinks forever. Built from NEUTRAL, for the same reason as
  // policy_rate_ss above.
  s.market_real_rate_ss = s.neutral_real_rate + s.credit_spread_ss;
  s.dsr_ss = s.private_credit_gdp * (s.policy_rate + s.credit_spread) / 100;
  // Normal-times loan losses. Banks earn interest and retain profits, so only
  // losses ABOVE this baseline eat capital. Without the baseline, capital
  // bleeds from 13% to ~9.6% at rest and ratchets the spread up 0.6pp.
  s.loan_losses_ss = (1.0 / 100) * P.LOSS_GIVEN_DEFAULT.value * s.private_credit;
  s.credit_growth_annual = s.potential_growth + s.inflation;
  s.ulc_growth = s.inflation_target;
  s.spiral_active = false;
  // BUILT FROM NEUTRAL, like every other anchor that mixes a rate with the
  // inflation target (docs/12 M1). This read s.policy_rate — the rate the
  // SCENARIO happens to open at — which is precisely the class of error
  // docs/08 §8 fixed for policy_rate_ss and market_real_rate_ss two dozen
  // lines above, and it was missed here. velocity_v0 is the rate at which
  // velocity is NORMAL, so anchoring it on the opening rate declared "normal
  // velocity" to mean "velocity at whatever rate this scenario starts at",
  // and velocity multiplies the monetisation pass-through. The same printing
  // then bought a different amount of inflation in `recession` than in
  // `stagflation` for a reason that is not economics. Asserted across all six
  // scenarios by test/scenarios.test.js.
  s.velocity_v0 = P.VELOCITY_INTEREST_SEMIELAST.value *
                  Math.log(1 + s.policy_rate_ss / 100);

  // POLICY TRANSMISSION. The dial is what you SET; these are what the economy
  // has actually FELT so far. applyDialChange schedules the difference into
  // the lag pipeline on the channel's kernel, and the engine walks these
  // toward the dial. No rule may assign to them — test/lags.test.js checks
  // that, because the whole pipeline used to be overwritten by the rules
  // before it could act (docs/07 L1).
  s.policy_rate_demand = s.policy_rate;    // rate_to_investment, peaks 9m
  s.policy_rate_markets = s.policy_rate;   // rate_to_asset_prices, peaks 1m
  s.tax_rate_effective = s.tax_rate;       // tax_to_consumption, peaks 3m
  s.qe_stock = s.qe;                       // qe_to_yield, peaks 2m

  // Written by a rule but read before their producer runs, or read by the UI.
  // Declared here because `undefined` in arithmetic is NaN that propagates
  // silently until an invariant catches it several rules later — and one of
  // these (interest_cost, read by updateBondYield two rules before
  // updateBudget writes it) was live: it survived only because NaN > 0.25 is
  // false. See docs/07 M11.
  s.mpc_effective = P.MPC_BASE.value;
  s.market_rate = s.policy_rate + s.credit_spread;
  s.user_cost = s.market_rate - s.expected_inflation + P.DEPRECIATION_RATE.value * 100;
  s.okun_beta_effective = P.OKUN_BETA.value;
  s.risk_premium = 0;
  s.interest_cost = s.govt_debt * s.average_coupon / 100;
  s.qe_rate_relief = 0;
  // How much of the SOVEREIGN risk premium private borrowers are paying.
  // Zero in every scenario but debt_trap, where it is the whole mechanism.
  s.sovereign_premium_felt = 0;
  s.fired_event = null;
  s.ending_counters = {};

  // Histories for charts and YoY
  s.history = { output: [], growth: [], inflation: [], unemployment: [],
                approval: [], credit_gap: [], output_gap: [], real_income: [],
                govt_debt: [], credibility: [] };

  // Explicit overrides win over anything derived above. Without this a
  // scenario cannot set credit_trend, asset_fundamental or any other field
  // that newState computes for itself, and the scenario silently reverts.
  Object.assign(s, overrides);

  // Derived FROM a field a scenario is allowed to override, so it has to be
  // computed after the overrides land. A scenario that opens mid-damage
  // (stagflation carries a 3% capacity loss) must not have that damage
  // silently unwind the first time updateCrisisRecovery runs.
  s.scar_target = overrides.scar_target ?? s.scar;
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
  // disposable_income is already a % of potential and already carries the
  // output move (market income tracks output). Multiplying by output again
  // would count the cycle twice; the level conversion is potential_output.
  h.real_income.push(s.disposable_income * s.potential_output / 100);
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
