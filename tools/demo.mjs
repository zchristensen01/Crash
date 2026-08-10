/**
 * HEADLESS DEMO — run the economy in the terminal, before any UI exists.
 *
 *     npm run demo                    calm, 8 years, you touch nothing
 *     npm run demo bubble             any key from src/game/scenarios.js
 *     npm run demo bubble 42          ...with a specific seed
 *     npm run demo bubble 42 taylor   ...with a rule-following central bank
 *
 * DEFAULT IS DOING NOTHING, because that is the honest baseline: it shows
 * what the scenario does to you if you never notice. Add `taylor` to see what
 * a rule-following central bank would have done instead — that is the
 * benchmark to score yourself against, and it still loses stagflation.
 *
 * This is a TOOL, not the interface. It exists so the model can be inspected
 * and trusted while the browser UI is still being built.
 */
import { newState } from '../src/state.js';
import { tick } from '../src/engine.js';
import { Trace } from '../src/trace.js';
import { LagPipeline } from '../src/lags.js';
import { makeRng } from '../src/rng.js';
import { SCENARIOS } from '../src/game/scenarios.js';
import { INDICATORS } from '../src/game/indicators.js';
import { applyAutopilot } from '../src/game/autopilot.js';
import { pendingEndings } from '../src/game/endings.js';
import { regime } from '../src/state.js';

const key = process.argv[2] || 'calm';
const seed = Number(process.argv[3] || 40317);
const useTaylor = process.argv.includes('taylor');
const sc = SCENARIOS[key];
if (!sc) {
  console.error(`unknown scenario '${key}'. Try: ${Object.keys(SCENARIOS).join(', ')}`);
  process.exit(1);
}

const s = newState(sc.overrides);
const trace = new Trace(false);
const pipeline = new LagPipeline();
const rng = makeRng(seed);

console.log(`\n  ${sc.label.toUpperCase()} — seed ${seed}` +
            `  [${useTaylor ? 'Taylor-rule central bank' : 'you touch nothing'}]`);
console.log(`  ${sc.describe}`);
console.log(`  TRAP: ${sc.trap}\n`);

const cols = INDICATORS.map((i) => i.label.slice(0, 9).padStart(11)).join('');
console.log('  month' + cols + '   regime');
console.log('  ' + '-'.repeat(6 + cols.length + 16));

for (let m = 1; m <= 96; m++) {
  tick(s, trace, pipeline, rng, {
    assertEveryTick: false,
    autopilot: useTaylor ? applyAutopilot : undefined,
  });

  if (s.fired_event) {
    console.log(`\n  [ ${s.fired_event.name} ] month ${m}`);
    console.log('  ' + s.fired_event.text.replace(/(.{68}\s)/g, '$1\n  ') + '\n');
  }

  if (m % 6 === 0 || s.ending) {
    const row = INDICATORS.map((i) => i.fmt(i.get(s)).padStart(11)).join('');
    console.log('  ' + String(m).padStart(5) + row + '   ' + regime(s));
  }

  const warn = pendingEndings(s);
  if (warn.length && m % 6 === 0) {
    for (const w of warn) console.log(`         ⚠ ${w.title} in ${w.monthsRemaining} months`);
  }

  if (s.ending) {
    console.log(`\n  GAME OVER — ${s.ending.title} at month ${m}\n`);
    console.log('  ' + s.ending.lesson.replace(/(.{68}\s)/g, '$1\n  ') + '\n');
    process.exit(0);
  }
}
console.log(`\n  SURVIVED THE TERM. Final approval ${s.approval.toFixed(0)}, ` +
            `debt ${s.govt_debt.toFixed(0)}%, credit gap ${s.credit_to_gdp_gap.toFixed(1)}pp\n`);
