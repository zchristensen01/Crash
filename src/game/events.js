/**
 * EVENTS — shocks. Data, not code.
 *
 * `chance` is an ANNUAL probability; the engine converts it via
 * units.annualProbToMonthly. Drawing on an annual figure once a month would
 * make every event ~12x more likely than intended.
 *
 * SUPPLY SHOCKS SET s.supply_shock, which is a real cost-push term in the
 * Phillips curve. The prototype poked expected_inflation directly, which
 * bypasses the whole transmission mechanism and makes an oil shock behave
 * like a credibility shock — a different thing with a different cure.
 */
import { P } from '../params.js';

export const EVENTS = [
  {
    key: 'oil_shock',
    name: 'Oil price spike',
    chance: 12,
    when: () => true,
    apply: (s) => {
      // ENERGY_TO_CPI: 0.04pp of headline CPI per 10% energy rise. A ~60%
      // spike is roughly 2.4pp, arriving fast (1-2 months).
      s.supply_shock += 2.4;
      s.approval -= 4;
    },
    text: 'Oil prices jump. Everything that moves costs more. Inflation is ' +
      'up and cooling it with rates would cost jobs — there is no clean ' +
      'answer here. This is how stagflation starts.',
  },
  {
    key: 'tech_boom',
    name: 'Productivity boom',
    chance: 10,
    when: () => true,
    apply: (s) => {
      s.tfp *= 1.015;
      s.approval += 3;
    },
    text: 'A wave of new technology lands. The country can genuinely make ' +
      'more now — which means more demand WITHOUT more inflation. This is ' +
      'the one free lunch in the model.',
  },
  {
    key: 'bank_wobble',
    name: 'Bank wobble',
    chance: 15,
    when: (s) => s.credit_to_gdp_gap > 5 || s.bank_capital_ratio < 11,
    apply: (s) => {
      s.credit_spread += 0.8;
      s.bank_capital_ratio -= 1.0;
      s.approval -= 6;
    },
    text: 'A mid-sized bank nearly fails. Nothing has broken yet, but ' +
      'lending just got more expensive and everyone is looking for the next ' +
      'weak spot.',
  },
  {
    key: 'financial_crisis',
    name: 'FINANCIAL CRISIS',
    chance: null,                       // driven by s.crisis_prob, not fixed
    when: (s) => !s.crisis_active,
    probability: (s) => s.crisis_prob,
    apply: (s) => {
      s.crisis_active = true;
      s.crisis_months = 0;
      s.recap_promptness = 0;
      s.asset_prices *= 0.7;
      s.credit_spread += 3.0;
      s.approval -= 15;
    },
    text: 'THE CRASH. Asset prices collapse, borrowers go underwater, banks ' +
      'stop lending. Growth, jobs and inflation all looked fine right up ' +
      'until now — the credit gap was the only gauge warning you. Output ' +
      'will not fully recover: about a tenth of it is gone for good.',
  },
  {
    key: 'export_slump',
    name: 'Export slump',
    chance: 12,
    when: () => true,
    apply: (s) => {
      s.consumption -= 1.2;
      s.approval -= 4;
    },
    text: 'Your biggest trading partner hits a recession and stops buying.',
  },
  {
    key: 'confidence_slump',
    name: 'Confidence slump',
    chance: 10,
    when: (s) => s.consumer_confidence > 45,
    apply: (s) => { s.consumer_confidence -= 12; },
    text: 'Something spooked people — a headline, an election, a war ' +
      'somewhere. Spending pulls back for no reason the numbers explain.',
  },
];
