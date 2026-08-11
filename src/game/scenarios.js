/**
 * SCENARIOS — starting states. Data, not code.
 * Values from research 3.3 (docs/05 §3.3) and docs/01 §H.
 *
 * EVERY SCENARIO MUST SATISFY THE SAME ACCOUNTING IDENTITIES as the baseline:
 *   deficit = spending + transfers + debt*yield/100 - tax_rate
 * An inconsistent starting vector drifts from tick 1 and the run teaches
 * nothing. test/scenarios.test.js enforces this — the deficit in each block
 * below is SOLVED from the other four, not chosen.
 *
 * A regime also has to be DRIVEN, not asserted. Setting output_gap directly
 * does nothing: aggregateDemand recomputes it from C+I+G on tick 1. So each
 * scenario sets the policy and conditions that PRODUCE its regime.
 */
export const SCENARIOS = {
  calm: {
    label: 'Calm',
    describe: 'Everything at healthy defaults. Nothing is wrong.',
    trap: 'Boredom. You stimulate for no reason and create the next problem.',
    overrides: {},
  },

  overheating: {
    label: 'Overheating',
    describe: 'Inflation 6%, unemployment 3.5%, rates far too low.',
    trap: 'Hiking hurts before it helps. Unemployment responds in 18 months, ' +
          'inflation in 24 — you will be told you failed long before it works.',
    overrides: {
      policy_rate: 1.0, yield_10y: 1.75,
      inflation: 6.0, expected_inflation: 5.0, credibility: 0.60,
      unemployment: 3.5, wage_growth: 5.5,
      deficit: 2.0,                       // 22 + 3 + 1.75 - 24.75
    },
  },

  recession: {
    label: 'Recession',
    describe: 'A crash two years ago. Unemployment 7.5%, inflation near zero, ' +
              'rates already on the floor, banks still repairing.',
    trap: 'The rate dial is already dead. Fiscal is the only lever that works, ' +
          'and it is the one that raises debt.',
    // DRIVEN, NOT ASSERTED — and it was asserted. The old version set
    // unemployment: 9.0 with a stimulative 0.5% rate and nothing producing a
    // demand shortfall, so the output gap was POSITIVE from month 1 and
    // unemployment was back under 5% by month 6. The scenario was never in
    // recession and its trap was never tested (docs/07 M6). This is a
    // balance-sheet recession: a crash that landed six months ago, its
    // transitory demand collapse still unwinding, assets 30% below
    // fundamental, spreads wide and banks near their capital floor. All of
    // that heals on its own over about five years, slowly, which is exactly
    // the argument the scenario is for.
    overrides: {
      policy_rate: 0.0, yield_10y: 0.75,
      inflation: 0.2, expected_inflation: 1.0,
      unemployment: 7.5, wage_growth: 1.0,
      crisis_active: true, crisis_months: 6, transitory_shock: 12,
      asset_prices: 70, asset_fundamental: 100,
      credit_spread: 4.0, bank_capital_ratio: 11,
      transfers: 5.0, transfers_base: 5.0,
      consumer_confidence: 40,
      deficit: 3.0,                       // 22 + 5 + 0.75 - 24.75
    },
  },

  stagflation: {
    label: 'Stagflation',
    describe: 'Inflation 9% AND unemployment 8%. Capacity just fell 3%.',
    trap: 'NO GOOD ANSWER. Every tool makes one problem worse while fixing ' +
          'the other. You are choosing which group of people to hurt.',
    // DRIVEN BY A REAL CAPACITY LOSS, not by an asserted unemployment rate.
    // `scar: 3` is the "capacity just fell 3%" in the description — it is
    // subtracted from potential output in supply.js — and the natural rate
    // rises with it, because a shock that destroys capacity destroys matches
    // too (NAIRU estimates rose to 6-7% through the 1970s). The standing
    // supply_shock is a live cost-push that squeezes real incomes through the
    // price brake in fiscal.js, which is what makes this STAGflation rather
    // than a plain inflation problem.
    //
    // IT DOES NOT STAY IN THE BOX, and that is not a defect. The shock fades
    // over about a quarter, expectations are already at 7% and the rate is
    // below them, so an economy left alone reflates and then hyperinflates.
    // Holding STAGFLATION for a year would require the model to be stable at
    // 9% inflation with a passive central bank, and the Taylor principle says
    // it must not be. You get roughly one quarter of "no good answer" before
    // the answer becomes obvious and expensive.
    overrides: {
      policy_rate: 5.0, yield_10y: 5.75,
      inflation: 9.0, expected_inflation: 7.0, credibility: 0.35,
      natural_unemployment: 6.5, unemployment: 8.5, wage_growth: 7.5,
      supply_shock: 6.0, scar: 3.0, potential_growth: 0.5,
      transfers: 4.0, transfers_base: 4.0,
      approval: 45,
      deficit: 7.0,                       // 22 + 4 + 5.75 - 24.75
    },
  },

  debt_trap: {
    label: 'Debt trap',
    describe: 'Debt 140% of GDP, yields 7%, growth 1%.',
    trap: 'Interest costs grow faster than the economy. Every year of delay ' +
          'makes the consolidation larger.',
    overrides: {
      govt_debt: 140, yield_10y: 7.0, foreign_share: 0.60,
      potential_growth: 1.0,
      deficit: 10.05,                     // 22 + 3 + 9.8 - 24.75
    },
  },

  bubble: {
    label: 'Bubble',
    describe: 'Every visible gauge is healthy. Credit is 6pp above trend.',
    trap: 'THE BEST TEACHING TOOL IN THE SET. Growth, jobs, inflation and ' +
          'public mood all look fine. Only the credit gap is warning you — ' +
          'and leverage looks SAFE the whole time, because inflated ' +
          'collateral flatters it.',
    // CHEAP MONEY AND A TIGHT BUDGET, which is what a credit bubble actually
    // looks like. The rate is 1pp BELOW neutral, because that is what feeds
    // the credit impulse; the demand boom that would otherwise create is
    // offset by a tax rate 2.75pp above baseline, leaving the budget in
    // slight surplus. That is not a contrivance — Ireland and Spain both ran
    // fiscal surpluses through their housing booms, flattered by transaction
    // taxes, and both read it as prudence.
    //
    // The previous version put the rate at neutral to stop inflation
    // drifting, and it did not work: inflation crossed 3% by month three and
    // reached 4.7% by year four, so the most visible gauge on the screen was
    // shouting while the scenario claimed everything looked fine (docs/07
    // M6). Here inflation stays at 2.6-2.7% for the whole build-up.
    //
    // HONEST NOTE, and it contradicts docs/01 §H. That document says of this
    // scenario "you still die in four years". The research does not support
    // certainty: Schularick & Taylor put crisis risk at ~3.5pp per SD of
    // excess credit, so a large gap means roughly 5-14% ANNUAL risk — a
    // serious, compounding gamble over a term, not a death sentence. Coding
    // it as certain death would mean tuning to a dramatic target instead of
    // reporting the finding, which is the one thing this project keeps
    // telling itself not to do.
    overrides: {
      policy_rate: 1.5, yield_10y: 2.25,     // BELOW neutral — see the note
      tax_rate: 27.5,                        // ...and a surplus to offset it
      private_credit_gdp: 156, private_credit: 156, credit_trend: 150,
      credit_to_gdp_gap: 6.0,
      asset_prices: 180, asset_fundamental: 100,
      unemployment: 4.2, inflation: 2.2, approval: 72,
      deficit: -0.25,                     // 22 + 3 + 2.25 - 27.5
    },
  },
};
