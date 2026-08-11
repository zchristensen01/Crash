/**
 * WAGES  [research 1.6]
 */
import { P } from '../params.js';

/**
 * How far above target expected inflation must sit before the spiral gate can
 * open, in percentage points.
 *
 * judgement: the sourced part of this gate is
 * WAGE_PRICE_SPIRAL_CREDIBILITY_GATE and the acceleration condition — Alvarez
 * et al. find spirals need expectations to have come unmoored AND inflation to
 * be still rising. Neither the paper nor any other gives a margin above target
 * at which "unmoored" begins. 2pp doubles the 2% target, which is the reading
 * this model takes, and it is a judgement rather than a measurement.
 */
const SPIRAL_EXPECTATION_MARGIN = 2;

/**
 *   desired = expected_inflation + slope(u)*(u* - u) + productivity_growth
 *
 * slope(u) is a KINK, not a line: roughly flat above WAGE_PC_KINK (5%
 * unemployment), steepening sharply below. Running the economy hot is nearly
 * free until it suddenly isn't. A linear slope loses the whole lesson.
 *
 * DOWNWARD NOMINAL RIGIDITY, modelled EXACTLY ONCE:
 *   actual = (1-f)*desired + f*max(0, desired),  f = WAGE_RIGIDITY_SHARE
 * A share f of workers cannot take a nominal cut this period; the rest adjust
 * freely. This replaces BOTH the old hard 0% floor and the 0.20 multiplier,
 * which counted one friction twice. That weakness is why recessions linger
 * instead of self-curing, and it is the argument for intervention.
 *
 * THE WAGE-PRICE SPIRAL IS RARE. Alvarez et al. (IMF 2022): of 79 episodes of
 * accelerating wages AND prices since the 1960s, only a minority kept
 * accelerating after eight quarters. It is gated, not the default engine.
 */
export function updateWages(s, trace) {
  const gap = s.natural_unemployment - s.unemployment;
  const belowKink = s.unemployment < P.WAGE_PC_KINK.value;
  const slope = belowKink ? P.WAGE_PC_SLOPE.high : P.WAGE_PC_SLOPE.low;

  const terms = {
    'expected inflation': P.WAGE_PC_EXPECTED_INFL.value * s.expected_inflation,
    'tightness of the labour market': slope * gap,
    'productivity': P.WAGE_PC_PRODUCTIVITY.value * s.productivity_growth,
  };
  const desired = Object.values(terms).reduce((a, b) => a + b, 0);

  const f = P.WAGE_RIGIDITY_SHARE.value;
  const actual = (1 - f) * desired + f * Math.max(0, desired);
  const rigidity = actual - desired;

  s.wage_growth = actual;

  // Unit labour cost growth is what actually pressures prices.
  s.ulc_growth = actual - s.productivity_growth;

  // Spiral gate: all three conditions, or it fizzles.
  const prevInflation = s.history.inflation.at(-2);
  const accelerating = prevInflation !== undefined && s.inflation > prevInflation;
  s.spiral_active =
    s.credibility < P.WAGE_PRICE_SPIRAL_CREDIBILITY_GATE.value &&
    s.expected_inflation > s.inflation_target + SPIRAL_EXPECTATION_MARGIN &&
    accelerating;

  trace.record('wage_growth', { ...terms,
    'workers who cannot take a pay cut': rigidity,
  }, actual, {
    slope_in_use: slope,
    below_kink: belowKink,
    spiral_active: s.spiral_active,
    note: 'the spiral is rare — gated, not the default engine',
  });
}
