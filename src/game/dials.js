/**
 * DIALS — what the player controls. Data, not code.
 * Add an entry and the UI generates the control.
 *
 * The bounds and lag channels here are economics, not layout. In particular
 * the rate floors at the EFFECTIVE LOWER BOUND (-0.75%), not at zero — the
 * bound is negative, and the fact that it exists at all is one of the lessons.
 */
import { P } from '../params.js';

export const DIALS = [
  {
    key: 'policy_rate',
    label: 'Rate',
    min: P.SS_ELB.value, max: 20, step: 0.25, unit: '%',
    neutral: 2.5,                       // r* + target: neither helps nor hurts
    help: 'Interest rate. LOW makes borrowing cheap — more spending, more ' +
      'inflation. HIGH cools everything down and costs jobs. It takes about ' +
      'a year to move output and TWO to move inflation. Near the bottom of ' +
      'its range it stops working: that is the lower bound, and it is why ' +
      'QE exists.',
  },
  {
    key: 'tax_rate',
    label: 'Tax',
    min: 0, max: 70, step: 0.25, unit: '% of GDP',
    neutral: 24.75,
    // The last sentence used to promise that revenue "may not even rise".
    // It always rises, at every playable gap, and it was never going to do
    // otherwise: the sign flip needs a tax multiplier above Romer-Romer's
    // (docs/12 L2). What the model DOES deliver is the leak, so that is what
    // the player is now told. Never promise the player a mechanism the model
    // does not have — they will run the experiment.
    help: 'Tax take. HIGH leaves less in people\'s pockets but pays down ' +
      'debt. LOW lets people spend, but the deficit grows. Raise it in a ' +
      'recession and you collect noticeably less than you legislated — you ' +
      'are taxing a smaller economy, and the deeper the slump the more of ' +
      'the rise disappears.',
  },
  {
    key: 'govt_spending',
    label: 'Spend',
    min: 0, max: 70, step: 0.25, unit: '% of GDP',
    neutral: 22.0,
    help: 'Government spending. The FASTEST lever you have — it adds demand ' +
      'almost immediately, which is why it is the crisis tool. Paid for by ' +
      'tax, debt, or printing. After a crash, spending in the first year is ' +
      'read as recapitalising the banks, and it halves the permanent scar.',
  },
  {
    key: 'money_printed',
    label: 'Print',
    min: 0, max: 15, step: 0.25, unit: '% of GDP',
    neutral: 0,
    help: 'Spend money you created instead of money you borrowed or taxed. ' +
      'Free money, no debt! Try it. Watch what happens — and watch WHEN it ' +
      'happens, because it depends entirely on whether there is spare ' +
      'capacity for the extra spending to use.',
  },
  {
    key: 'qe',
    label: 'QE',
    min: 0, max: 30, step: 1, unit: '% of GDP',
    neutral: 0,
    help: 'Buy government bonds with newly created reserves. This does NOT ' +
      'spend anything — it pushes long rates down when the short rate has ' +
      'already run out of room. Small per pound, and it works at the lower ' +
      'bound, which is the only reason anyone does it.',
  },
];

/**
 * The state fields the lag pipeline is allowed to land in.
 *
 * THE RULE, and it is enforced in engine.js: a pipeline target is a
 * TRANSMITTED DRIVER — the dial as the economy has actually felt it so far —
 * and no rule may assign to one. The pipeline used to schedule into
 * `consumption` and `investment`, which updateConsumption and updateInvestment
 * recompute from scratch a few lines later, so every scheduled effect was
 * silently discarded and the model had no lags at all. docs/07 L1.
 */
export const PIPELINE_TARGETS = new Set([
  'policy_rate_demand',
  'policy_rate_markets',
  'tax_rate_effective',
  'qe_stock',
]);

/**
 * What each transmitted driver is called on screen. The pipeline panel is
 * written for someone who has never taken an economics class, and
 * `-> policy_rate_demand` is a field name, not an explanation.
 */
export const TRANSMISSION_LABELS = {
  policy_rate_demand: 'what businesses pay to borrow',
  policy_rate_markets: 'stock and house prices',
  tax_rate_effective: 'what comes out of pay packets',
  qe_stock: 'long-term borrowing costs',
};

/**
 * Apply a dial change. THIS IS WHERE THE LAG LIVES.
 *
 * The dial's own value moves immediately — that is just the setting. What is
 * scheduled into the pipeline is the CONSEQUENCE, months out. Confusing those
 * two is exactly what the pipeline panel exists to prevent.
 *
 * Kernels are normalised to sum to 1, so scheduling the DELTA OF THE DRIVER
 * walks the transmitted field to the dial's new value and stops there. That
 * is why these are level deltas and not effect sizes: an effect size has to
 * be estimated twice (once here, once in the rule) and the two then have to
 * be kept from double-counting. A driver only exists once.
 *
 * @param {Object} s @param {LagPipeline} pipeline
 * @param {string} key @param {number} newValue
 */
export function applyDialChange(s, pipeline, key, newValue) {
  const dial = DIALS.find((d) => d.key === key);
  if (!dial) throw new Error(`dials: unknown dial '${key}'`);

  const old = s[key];
  s[key] = Math.max(dial.min, Math.min(dial.max, newValue));
  const delta = s[key] - old;
  if (delta === 0) return;

  const sign = delta > 0 ? '+' : '';
  const label = `${dial.label.toLowerCase()} ${sign}${delta.toFixed(2)}pp`;

  if (key === 'policy_rate') {
    // Two speeds, because the doc lists two chains and they are not the same
    // length: markets reprice in a month, the real economy takes three
    // quarters. The sign asymmetry and the lower bound are NOT applied here —
    // they are properties of the STANCE, not of the increment, and scaling
    // increments makes a cut-then-hike round trip ratchet the stance
    // permanently tighter. See monetaryEasingScale in rules/investment.js.
    pipeline.schedule('policy_rate_demand', delta, 'rate_to_investment', label, s.tick);
    pipeline.schedule('policy_rate_markets', delta, 'rate_to_asset_prices', label, s.tick);

  } else if (key === 'tax_rate') {
    // Withholding and settlement delay — AUTOSTAB_TAX_LAG, ~3 months, which
    // is also where doc 02 puts tax -> consumption.
    pipeline.schedule('tax_rate_effective', delta, 'tax_to_consumption', label, s.tick);

  } else if (key === 'govt_spending') {
    // The fastest lever: purchases ARE demand, and they land at once. The
    // induced consumption that used to be scheduled here is now structural —
    // spending raises output, output raises household income, income raises
    // consumption. That is the multiplier, and it did not exist before.
    s.govt_purchases = s.govt_spending;

  } else if (key === 'qe') {
    pipeline.schedule('qe_stock', delta, 'qe_to_yield', label, s.tick);
  }
  // money_printed acts through aggregate.js (it buys things) and money.js
  // (the credibility-and-slack gate on its inflation pass-through) each tick.
  // There is nothing to schedule.
}
