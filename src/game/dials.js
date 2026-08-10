/**
 * DIALS — what the player controls. Data, not code.
 * Add an entry and the UI generates the control.
 *
 * The bounds and lag channels here are economics, not layout. In particular
 * the rate floors at the EFFECTIVE LOWER BOUND (-0.75%), not at zero — the
 * bound is negative, and the fact that it exists at all is one of the lessons.
 */
import { P } from '../params.js';
import { signAsymmetry } from '../kernels.js';

export const DIALS = [
  {
    key: 'policy_rate',
    label: 'Rate',
    min: P.SS_ELB.value, max: 20, step: 0.25, unit: '%',
    neutral: 2.5,                       // r* + target: neither helps nor hurts
    help: 'Interest rate. LOW makes borrowing cheap — more spending, more ' +
      'inflation. HIGH cools everything down and costs jobs. It takes about ' +
      'a year to move output and TWO to move inflation.',
  },
  {
    key: 'tax_rate',
    label: 'Tax',
    min: 0, max: 70, step: 0.25, unit: '% of GDP',
    neutral: 24.75,
    help: 'Tax take. HIGH leaves less in people\'s pockets but pays down ' +
      'debt. LOW lets people spend, but the deficit grows. Raise it in a ' +
      'recession and revenue may not even rise — you are taxing a smaller ' +
      'economy.',
  },
  {
    key: 'govt_spending',
    label: 'Spend',
    min: 0, max: 70, step: 0.25, unit: '% of GDP',
    neutral: 22.0,
    help: 'Government spending. The FASTEST lever you have — it adds demand ' +
      'almost immediately, which is why it is the crisis tool. Paid for by ' +
      'tax, debt, or printing.',
  },
  {
    key: 'money_printed',
    label: 'Print',
    min: 0, max: 15, step: 0.25, unit: '% of GDP',
    neutral: 0,
    help: 'Print money instead of borrowing it. Free money, no debt! Try it. ' +
      'Watch what happens — and watch WHEN it happens, because it depends ' +
      'entirely on whether there is spare capacity.',
  },
];

/**
 * Apply a dial change. THIS IS WHERE THE LAG LIVES.
 *
 * The dial's own value moves immediately — that is just the setting. What is
 * scheduled into the pipeline is the CONSEQUENCE, months out. Confusing those
 * two is exactly what the pipeline panel exists to prevent.
 *
 * @param {Object} s @param {LagPipeline} pipeline
 * @param {string} key @param {number} newValue
 */
export function applyDialChange(s, pipeline, key, newValue) {
  const dial = DIALS.find((d) => d.key === key);
  if (!dial) throw new Error(`dials: unknown dial '${key}'`);

  const old = s[key];
  const delta = newValue - old;
  s[key] = Math.max(dial.min, Math.min(dial.max, newValue));
  if (delta === 0) return;

  const sign = delta > 0 ? '+' : '';
  const label = `${dial.label.toLowerCase()} ${sign}${delta.toFixed(2)}pp`;

  if (key === 'policy_rate') {
    // Cuts are weaker than hikes (Tenreyro & Thwaites). Everything monetary
    // routes through that asymmetry before it is scheduled.
    const inRecession = s.output_gap < -1.5;
    const scale = signAsymmetry(delta, inRecession);

    pipeline.schedule('investment',
      -delta * P.INVESTMENT_RATE_ELASTICITY.value * scale,
      'rate_to_investment', label, s.tick);

    pipeline.schedule('consumption',
      -delta * 0.25 * scale, 'rate_to_output', label, s.tick);

  } else if (key === 'govt_spending') {
    // The fastest lever. Its own purchases land almost at once; the induced
    // consumption follows on the spending-to-output kernel.
    s.govt_purchases = s.govt_spending;
    pipeline.schedule('consumption', delta * 0.4, 'spending_to_output', label, s.tick);

  } else if (key === 'tax_rate') {
    pipeline.schedule('consumption', -delta * 0.5, 'tax_to_consumption', label, s.tick);
  }
  // money_printed acts through money.js each tick, gated by credibility and
  // slack — there is nothing to schedule.
}
