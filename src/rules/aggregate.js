/**
 * AGGREGATION  [question A3] — THE CENTRE OF THE MODEL.
 *
 * Every lever routes through here. The prototype used an ad-hoc additive
 * demand term, which is why it had no equilibrium to sit at and drifted
 * forever.
 */
import { P } from '../params.js';

/**
 *   demand = C + I + G + printed + NX - crisis_drag   (% of potential)
 *   gap    = demand - 100
 *   output = potential * (1 + gap/100), capped above by the capacity ceiling
 *
 * THE ONE CONDITIONAL THAT MATTERS MOST IN THE WHOLE MODEL: a rate cut with
 * slack creates jobs; the identical cut at full employment creates only
 * inflation. Same action, opposite result.
 *
 * That asymmetry lives right here. Above capacity, extra demand cannot become
 * output — the OUTPUT response is capped, but the UNCAPPED gap is what
 * prices.js reads, so the excess flows to prices instead of vanishing.
 *
 * MAX_CAPACITY_OVERHEAT is the sharpest nonlinearity in the model and it used
 * to be a bare 4.0 in this file. The audit brief read its effect as a zero
 * lower bound on the rate dial, because low rates and a hot economy coincide
 * (docs/07 M2). It is a named parameter now so it is visible from the
 * research record.
 *
 * TWO COMPONENTS THAT USED TO BE COMPUTED AND THROWN AWAY:
 *  - money_printed. Printing is monetised SPENDING — "govt spends without
 *    taxing or borrowing" — so it buys things, here, and the deficit
 *    identity in fiscal.js cancels it out on the financing side. It used to
 *    reach demand only by shrinking the deficit and therefore crowding
 *    investment IN, which is why printing did nothing with slack and worked
 *    at capacity: the exact inverse of the lesson (docs/07 L3).
 *  - crisis_drag. The ~9% peak-to-trough demand collapse of a financial
 *    crisis was computed every tick by crisis.js and read by nothing, so a
 *    crash cost 0.7pp of unemployment and no recession at all (docs/07 L7).
 */
export function aggregateDemand(s, trace) {
  // An external demand shock fades; it does not reprice the economy forever.
  // Decayed BEFORE the gap is formed, so the value the identity check reads
  // at the end of the tick is exactly the value that went into the gap.
  // lint-allow-literal: 0.5 is the DEFINITION of a half-life, not a coefficient —
  // it is what "half" means. The half-life itself is the parameter.
  s.net_exports *= Math.pow(0.5, 1 / P.FOREIGN_DEMAND_SHOCK_HALFLIFE.value);

  const terms = {
    'households buying things': s.consumption,
    'businesses building things': s.investment,
    'government spending': s.govt_purchases,
    'spending paid for with printed money': s.money_printed,
    'foreign demand': s.net_exports,
    'the crash — demand that simply stopped': -s.crisis_drag,
    'capacity (what we can actually make)': -100,
  };
  const gap = Object.values(terms).reduce((a, b) => a + b, 0);

  s.output_gap = gap;                       // UNCAPPED — prices.js reads this
  const realised = Math.min(gap, P.MAX_CAPACITY_OVERHEAT.value);
  s.output = s.potential_output * (1 + realised / 100);

  trace.record('output_gap', terms, gap, {
    realised_as_output: realised,
    spilled_into_prices: gap - realised,
    ceiling: P.MAX_CAPACITY_OVERHEAT.value,
  });
}
