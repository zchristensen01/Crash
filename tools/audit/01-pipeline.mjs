/**
 * PROBE 1 — does anything scheduled into the lag pipeline survive the rules?
 */
import { newState } from '../../src/state.js';
import { tick, run } from '../../src/engine.js';
import { Trace } from '../../src/trace.js';
import { LagPipeline } from '../../src/lags.js';
import { makeRng } from '../../src/rng.js';
import { applyDialChange } from '../../src/game/dials.js';

const OPTS = { events: false, assertEveryTick: false, endings: false };

function fresh() {
  const s = newState();
  const trace = new Trace(false);
  const pipeline = new LagPipeline();
  const rng = makeRng(1);
  return { s, trace, pipeline, rng };
}

function runFor(ctx, n) {
  for (let i = 0; i < n; i++) tick(ctx.s, ctx.trace, ctx.pipeline, ctx.rng, OPTS);
}

// settle both arms first
const base = fresh();  runFor(base, 24);
const shock = fresh(); runFor(shock, 24);

console.log('--- after settling, baseline ---');
console.log('output', base.s.output.toFixed(6), 'C', base.s.consumption.toFixed(6),
            'I', base.s.investment.toFixed(6), 'rate', base.s.policy_rate);

// Move the rate dial THE CORRECT WAY (applyDialChange), -1pp.
applyDialChange(shock.s, shock.pipeline, 'policy_rate', shock.s.policy_rate - 1.0);
console.log('\npipeline pending immediately after a -1pp rate move:');
console.log(shock.pipeline.pending(shock.s.tick));

const rows = [];
for (let m = 1; m <= 36; m++) {
  runFor(base, 1);
  runFor(shock, 1);
  rows.push({ m,
    dOutput: +(shock.s.output - base.s.output).toFixed(4),
    dC: +(shock.s.consumption - base.s.consumption).toFixed(4),
    dI: +(shock.s.investment - base.s.investment).toFixed(4),
    dK: +(shock.s.capital_stock - base.s.capital_stock).toFixed(4),
    dInfl: +(shock.s.inflation - base.s.inflation).toFixed(4),
  });
}
console.log('\n--- -1pp rate cut via applyDialChange, deltas vs baseline ---');
console.table(rows.filter(r => r.m <= 12 || r.m % 6 === 0));

// Now the same cut but with the pipeline effects DELETED, to isolate their contribution.
const noPipe = fresh(); runFor(noPipe, 24);
noPipe.s.policy_rate -= 1.0;    // move the dial with no scheduling at all
const base2 = fresh(); runFor(base2, 24);
const rows2 = [];
for (let m = 1; m <= 36; m++) {
  runFor(base2, 1);
  runFor(noPipe, 1);
  rows2.push({ m,
    dOutput: +(noPipe.s.output - base2.s.output).toFixed(4),
    dC: +(noPipe.s.consumption - base2.s.consumption).toFixed(4),
    dI: +(noPipe.s.investment - base2.s.investment).toFixed(4),
    dK: +(noPipe.s.capital_stock - base2.s.capital_stock).toFixed(4),
  });
}
console.log('\n--- SAME cut, dial moved directly with NO pipeline scheduling ---');
console.table(rows2.filter(r => r.m <= 12 || r.m % 6 === 0));

console.log('\nDIFFERENCE the pipeline made to output at m=36:',
  ((shock.s.output - base.s.output) - (noPipe.s.output - base2.s.output)).toExponential(3));
console.log('DIFFERENCE the pipeline made to capital at m=36:',
  ((shock.s.capital_stock - base.s.capital_stock) - (noPipe.s.capital_stock - base2.s.capital_stock)).toExponential(3));
