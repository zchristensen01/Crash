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
    describe: 'Unemployment 9%, inflation 0.5%, rates already near zero.',
    trap: 'The rate dial is already dead. Fiscal is the only lever that works, ' +
          'and it is the one that raises debt.',
    overrides: {
      policy_rate: 0.5, yield_10y: 1.25,
      inflation: 0.5, expected_inflation: 1.0,
      unemployment: 9.0, wage_growth: 1.0,
      transfers: 5.0, transfers_base: 5.0,
      consumer_confidence: 40,
      deficit: 3.5,                       // 22 + 5 + 1.25 - 24.75
    },
  },

  stagflation: {
    label: 'Stagflation',
    describe: 'Inflation 9% AND unemployment 8%. Capacity just fell 3%.',
    trap: 'NO GOOD ANSWER. Every tool makes one problem worse while fixing ' +
          'the other. You are choosing which group of people to hurt.',
    overrides: {
      policy_rate: 5.0, yield_10y: 5.75,
      inflation: 9.0, expected_inflation: 7.0, credibility: 0.35,
      unemployment: 8.0, wage_growth: 7.5,
      supply_shock: 4.0, potential_growth: 0.5,
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
    // The rate starts at NEUTRAL deliberately. Below neutral, inflation
    // drifts up within a year, the player hikes for that reason, and the
    // scenario stops testing what it is for: whether you notice the one
    // gauge that is warning you while every other one is fine.
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
      policy_rate: 2.5, yield_10y: 3.25,     // NEUTRAL — see the note below
      private_credit_gdp: 156, private_credit: 156, credit_trend: 150,
      credit_to_gdp_gap: 6.0,
      asset_prices: 160, asset_fundamental: 100,
      unemployment: 4.2, inflation: 2.2, approval: 72,
      deficit: 3.5,                       // 22 + 3 + 3.25 - 24.75
    },
  },
};
