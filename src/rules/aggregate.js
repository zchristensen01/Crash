/**
 * AGGREGATION  [question A3] — THE CENTRE OF THE MODEL.
 *
 * Every lever routes through here. The prototype used an ad-hoc additive
 * demand term, which is why it had no equilibrium to sit at and drifted
 * forever.
 */
import { clamp } from '../units.js';

/**
 *   demand = C + I + G + NX          (all as % of potential; NX = 0 in v1)
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
 */
export function aggregateDemand(s, trace) {
  const MAX_OVERHEAT = 4.0;    // % above potential that can physically be made

  const terms = {
    'households buying things': s.consumption,
    'businesses building things': s.investment,
    'government spending': s.govt_purchases,
    'net exports': s.net_exports,
    'capacity (what we can actually make)': -100,
  };
  const gap = s.consumption + s.investment + s.govt_purchases + s.net_exports - 100;

  s.output_gap = gap;                       // UNCAPPED — prices.js reads this
  const realised = Math.min(gap, MAX_OVERHEAT);
  s.output = s.potential_output * (1 + realised / 100);

  trace.record('output_gap', terms, gap, {
    realised_as_output: realised,
    spilled_into_prices: gap - realised,
  });
}
