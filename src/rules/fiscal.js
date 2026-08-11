/**
 * GOVERNMENT — yields, stabilisers, the budget  [research 1.2, 2.5]
 */
import { P, LAGS_MONTHS } from '../params.js';
import { clamp, annualRateToMonthlyLinear, annualToMonthlyFlow } from '../units.js';

/**
 * The share of tax revenue eaten by interest at which the market starts
 * repricing the debt on its own. Used twice: once as the trigger for the
 * panic term in the yield, once as the zero point of fiscal_space, and those
 * two must be the same number or the gauge lies about the cliff.
 *
 * PROMOTED to DEBT_SERVICE_PANIC_SHARE in 5.3. A local const kept the two
 * uses consistent with each other and not with anything else; it now has a
 * range, a confidence and a source like every other coefficient. Aliased here
 * because the name reads better at the two call sites than `P.…value` does.
 */
const INTEREST_PANIC_SHARE = P.DEBT_SERVICE_PANIC_SHARE.value;

/**
 *   yield = expected short rate + term premium - QE + risk premium
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
 *
 * QE_TO_YIELD is in BASIS POINTS per 1% of GDP purchased, so it does need the
 * /100. It was unread until the lower bound was implemented, at which point
 * the rate dial acquired a dead zone with nothing behind it — doc 02 calls
 * the ZLB "the entire reason QE was invented", and now it is.
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
  const panic = interestShare > INTEREST_PANIC_SHARE
    ? P.BOND_YIELD_PANIC_SLOPE.value * (interestShare - INTEREST_PANIC_SHARE) : 0;

  // Portfolio balance: buying the bonds pushes their yield down, and the
  // whole curve with it. Small per pound — the literature median is ~50bp for
  // a full programme — and it does not care where the policy rate is.
  s.qe_rate_relief = P.QE_TO_YIELD.value / 100 * s.qe_stock;

  // lint-allow-dial: bond markets price the ANNOUNCED path of the policy rate, and
  // they price it the day it is announced. This is the one place in the model where
  // reading the slider directly is the correct economics rather than a leak.
  const expectedShort = s.policy_rate;
  const terms = {
    'expected path of the policy rate': expectedShort,
    'term premium (lending for 10 years)': s.term_premium,
    'bonds bought by the central bank (QE)': -s.qe_rate_relief,
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
    risk_premium: s.risk_premium,
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
 * the MOST TIMELY. Together they reproduce AUTO_STABILISER_ABSORPTION ~0.60,
 * which test/validation.test.js now checks — it used to be checked by a test
 * that applied its shock to a variable the next rule overwrote, and therefore
 * measured absorption of exactly 1.000000000 (docs/07 L4).
 *
 * BOTH LEGS ARE LAGGED, on AUTOSTAB_TAX_LAG (3 months, withholding and
 * settlement) and AUTOSTAB_BENEFIT_LAG (1 month, the fastest channel in the
 * model). Both parameters were previously unread and the stabilisers fired
 * instantly.
 */
export function updateAutoStabilisers(s, trace) {
  // A first-order lag with mean `months`. Written out rather than routed
  // through the pipeline because these are automatic — nobody schedules them,
  // and they would clutter the panel of things the PLAYER has in flight.
  const towards = (current, target, months) =>
    current + (target - current) / Math.max(1, months);

  const taxTarget = P.AUTOSTAB_TAX_ELASTICITY.value *
                    (s.tax_rate_effective / 100) * s.output_gap;
  s.autostab_tax = towards(s.autostab_tax, taxTarget, P.AUTOSTAB_TAX_LAG.value);

  const taxTerms = {
    'tax at the normal rate': s.tax_rate_effective,
    'progressive tax falling as incomes fall': s.autostab_tax,
  };
  s.tax_revenue = Object.values(taxTerms).reduce((a, b) => a + b, 0);
  trace.record('tax_revenue', taxTerms, s.tax_revenue, {
    rate_on_the_dial: s.tax_rate,
    rate_actually_collected: s.tax_rate_effective,
  });

  // A true elasticity needs a base to be an elasticity OF. The base is
  // UNEMPLOYMENT_BENEFIT_SHARE; the code used to multiply a NEGATIVE
  // elasticity by an invented 0.1 and negate the result — two compensating
  // sign errors around a magnitude nobody had derived (docs/07 hygiene).
  // judgement: a DIVISION GUARD, not an economic floor. natural_unemployment
  // is the denominator, and a scenario is free to set it to zero; 0.5% is
  // below any natural rate ever estimated for an advanced economy, so this
  // cannot bind on a real vector and exists only to stop a divide-by-zero
  // becoming an Infinity in the benefit bill.
  const NATURAL_U_FLOOR = 0.5;   // judgement: division guard, see above
  const excessUnemployed = (s.unemployment - s.natural_unemployment) /
                           Math.max(NATURAL_U_FLOOR, s.natural_unemployment);
  const benefitTarget = P.UNEMPLOYMENT_BENEFIT_SHARE.value *
                        P.AUTOSTAB_BENEFIT_ELASTICITY.value * excessUnemployed;
  s.autostab_benefit = towards(s.autostab_benefit, benefitTarget,
                               P.AUTOSTAB_BENEFIT_LAG.value);

  const transferTerms = {
    'normal transfers': s.transfers_base ?? s.transfers,
    'unemployment benefits rising automatically': s.autostab_benefit,
  };
  s.transfers = Object.values(transferTerms).reduce((a, b) => a + b, 0);
  trace.record('transfers', transferTerms, s.transfers);

  // MARKET INCOME IS WHAT THE ECONOMY ACTUALLY PRODUCED. This was the
  // constant 100 — capacity, not output — and that one line removed the
  // income-expenditure multiplier, left the stabilisers with no shock to
  // absorb, made the austerity paradox algebraically impossible, and made
  // households better off in a recession (docs/07 L4). At the steady state
  // output = potential, so the value here is still 100.
  s.market_income = 100 * s.output / s.potential_output;

  // THE PRICE BRAKE, docs/02 Self-correction 1, and it was not in the model.
  // A cost-push shock raises prices without raising anyone's income, so real
  // spending power falls one-for-one — that is what makes a supply shock
  // STAGflationary instead of merely inflationary. Without it an oil shock
  // was a pure price event and the stagflation scenario boomed out of its own
  // regime in six months (docs/07 L4 follow-on).
  s.supply_cost = P.SUPPLY_SHOCK_INCOME_LOSS.value * Math.max(0, s.supply_shock);
  s.disposable_income = s.market_income - s.tax_revenue + s.transfers - s.supply_cost;

  trace.record('disposable_income', {
    'what the economy produced': s.market_income,
    'tax': -s.tax_revenue,
    'transfers and benefits': s.transfers,
    'prices rising faster than pay': -s.supply_cost,
  }, s.disposable_income);
}

/**
 *   deficit = spending + printed + transfers + interest - revenue - printed
 *   debt[t] = debt[t-1]*(1 - nominal_growth) + deficit
 *
 * Printing appears TWICE and cancels, and that is the whole point of it:
 * money-financed purchases are real spending (aggregate.js counts them) that
 * adds nothing to the debt. "Govt spends without taxing or borrowing." The
 * two lines are kept separate rather than simplified away because the `why`
 * panel is where a player discovers that free money is spending, not a
 * discount.
 *
 * Inflation and growth quietly erode the real debt burden. That term is why
 * a country can outgrow its debt without ever repaying it.
 *
 * THE AUSTERITY PARADOX falls out of the structural block rather than being
 * special-cased: raise taxes into a recession, output falls, household income
 * falls with it, and revenue may not rise at all because you are taxing a
 * smaller economy. That last clause only became true when market income
 * stopped being a constant.
 */
export function updateBudget(s, trace) {
  // DEBT HAS A MATURITY, AND ONLY THE MATURING SLICE REPRICES (docs/12 M2).
  // This was `govt_debt * yield_10y / 100` — the whole stock, at this month's
  // ten-year yield, every month. A country carrying 140% of GDP of debt issued
  // over decades does not refinance all of it in January. It refinances
  // 1/DEBT_AVERAGE_MATURITY_YEARS of it a year, so the rate it actually PAYS
  // walks toward the market yield over about seven years.
  //
  // This is what gives a debt trap a window rather than a knife-edge: hiking
  // does not bite the interest bill on impact, and cutting does not rescue it.
  // The window closing slowly, while it still looks survivable, is the lesson —
  // and it is why every year of delay makes the consolidation larger.
  const rollover = annualRateToMonthlyLinear(1 / P.DEBT_AVERAGE_MATURITY_YEARS.value);
  const prevCoupon = s.average_coupon;
  s.average_coupon += rollover * (s.yield_10y - prevCoupon);
  s.interest_cost = s.govt_debt * s.average_coupon / 100;
  // Split the way a finance ministry would: how much of this month's bill is
  // the debt we already had at the rate we were already paying, and how much
  // is the slice that just refinanced at today's rate. The second number is
  // the one that answers "why is the interest bill still rising when I cut".
  trace.record('interest_cost', {
    'the debt we had, at the rate we were already paying': s.govt_debt * prevCoupon / 100,
    'the slice that refinanced at today\'s market rate':
      s.govt_debt * (s.average_coupon - prevCoupon) / 100,
  }, s.interest_cost, {
    market_yield_today: s.yield_10y,
    share_refinanced_this_month: rollover,
    note: Math.abs(s.yield_10y - s.average_coupon) < 0.05
      ? 'the stock has caught up with the market'
      : s.yield_10y > s.average_coupon
        ? 'still rolling onto more expensive debt — this bill is going up for years'
        : 'still rolling off expensive debt — the saving arrives slowly',
  });

  const deficitTerms = {
    'government spending': s.govt_spending,
    'spending paid for with printed money': s.money_printed,
    'transfers and benefits': s.transfers,
    'interest on existing debt': s.interest_cost,
    'tax revenue': -s.tax_revenue,
    'paid for by printing, not borrowing': -s.money_printed,
  };
  s.deficit = Object.values(deficitTerms).reduce((a, b) => a + b, 0);
  trace.record('deficit', deficitTerms, s.deficit);

  // THE CYCLICALLY-ADJUSTED DEFICIT — what the government would be borrowing
  // if the economy were at potential. It is the standard measure of the
  // fiscal STANCE for a reason, and crowding out is a statement about the
  // stance: the cyclical part of the deficit is the automatic stabilisers
  // doing their job, not a discretionary claim on savings.
  //
  // investment.js used the headline deficit, and that made crowding out run
  // BACKWARDS as an amplifier. Any demand expansion raises output, raises the
  // tax take, shrinks the headline deficit and therefore crowds investment
  // IN — so every lever got stronger the hotter the economy already was, and
  // the model's most important conditional came out inverted (docs/07 L2).
  //
  // PRIMARY, i.e. before interest, and that matters too. Debt service is
  // largely a transfer to domestic bondholders rather than a fresh claim on
  // savings, and doc 02 already lists "interest_cost -> less room for
  // anything else" as its own chain. Leaving interest in made a rate cut
  // reduce the government's interest bill, shrink the deficit and crowd
  // investment IN — a second, purely monetary amplifier on the same term.
  const cyclical = s.autostab_benefit - s.autostab_tax;
  s.structural_deficit = s.deficit - cyclical - s.interest_cost;

  // AND IT REACHES INVESTMENT WITH A LAG. Crowding out is the yield channel —
  // more issuance, higher long rates, less investment — so it arrives on the
  // same timescale as any other rate effect, not instantly. Applied on
  // impact it made a tax CUT lower output for its first fifteen months,
  // because the crowding leg landed at once while the consumption leg was
  // still climbing through permanent income. Sign errors of that kind are
  // the whole reason for docs/07.
  s.structural_deficit_felt +=
    (s.structural_deficit - s.structural_deficit_felt) / LAGS_MONTHS.rate_to_investment;
  trace.record('structural_deficit', {
    'deficit as reported': s.deficit,
    'the part that is just the cycle': -cyclical,
    'interest on debt already issued': -s.interest_cost,
  }, s.structural_deficit, { felt_by_investors_so_far: s.structural_deficit_felt });

  const nominalGrowth = s.potential_growth + s.inflation;
  const erosion = -s.govt_debt * annualRateToMonthlyLinear(nominalGrowth / 100);
  const borrowing = annualToMonthlyFlow(s.deficit);

  trace.record('govt_debt', {
    'what we already owed': s.govt_debt,
    'new borrowing this month': borrowing,
    'eroded by growth and inflation': erosion,
  }, s.govt_debt + borrowing + erosion);

  s.govt_debt = Math.max(0, s.govt_debt + borrowing + erosion);

  // How much room is left before the debt service crowds out everything else.
  // docs/01 lists this as a derived variable; nothing computed it.
  const interestShare = s.interest_cost / Math.max(1, s.tax_revenue);
  s.fiscal_space = clamp(100 * (1 - interestShare / INTEREST_PANIC_SHARE), 0, 100);
}
