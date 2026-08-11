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
 *
 * AN EVENT MAY ONLY TOUCH A FIELD THAT NO RULE ASSIGNS. Events fire at the
 * START of the tick now (engine.js), so a rule downstream will see the shock
 * and price it in the same month — but if the event writes a field a rule
 * recomputes from scratch, the shock is discarded and, worse, the accounting
 * identity breaks between the two. `export_slump` did exactly that with
 * `consumption`, and it killed 38.8% of real 8-year sessions with a thrown
 * invariant error (docs/07 M1). test/events.test.js checks every event.
 */
import { P } from '../params.js';

export const EVENTS = [
  {
    key: 'oil_shock',
    name: 'Oil price spike',
    chance: 12,
    when: () => true,
    apply: (s) => {
      // 2.4pp of headline CPI, arriving fast (1-2 months), for a ~60% spike.
      //
      // NOT derived from ENERGY_TO_CPI, and that is deliberate. The parameter
      // says 0.04pp per 10% energy rise, which makes a 60% spike worth
      // 0.24pp — a tenth of this. Energy is roughly 7% of an advanced-economy
      // CPI basket, so 0.04 looks like a transcription error for 0.4, which
      // would give exactly 2.4. Resolving that needs the source, not a
      // keystroke, and this project's standing rule is that a parameter
      // disagreement is a finding to surface rather than a number to bend to
      // fit the model. Registered in parameters.py CONFLICTS['ENERGY_TO_CPI']
      // and asserted still-open by test/validation.test.js.
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
      // Snapshot the fiscal stance AT the crash. Everything spent above this
      // inside RECAP_WINDOW_MONTHS counts as recapitalising the banks and
      // shrinks the permanent scar (crisis.js). Recorded here rather than on
      // the first tick of the crisis, because a player who reacts within the
      // same month would otherwise have their own response baked into the
      // baseline and score zero for it.
      s.crisis_spending_baseline = s.govt_spending + s.money_printed;
      s.potential_at_crisis = s.potential_output;
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
      // Foreign demand, not domestic consumption. v1 is closed by decision
      // A5 so net_exports rests at zero, but a trading partner falling into
      // recession is exactly an external demand shock — and net_exports is
      // the one demand component no rule recomputes, so the shock survives
      // the tick and the C+I+G identity still closes. It fades on
      // FOREIGN_DEMAND_SHOCK_HALFLIFE in aggregate.js.
      s.net_exports -= 1.2;
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
