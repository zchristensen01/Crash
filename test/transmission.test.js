/**
 * THE CONDITIONALS THE GAME EXISTS TO TEACH.
 *
 * Six of these ran backwards before the docs/07 audit, and every one of them
 * passed the 47-test suite that existed at the time. What they have in common
 * is that none of them can be checked at a single point: they are statements
 * about how a response CHANGES with the state, so they need two measurements
 * and a comparison, or a sweep.
 *
 * The other thing they have in common is hard switches. Three separate
 * findings — stimulus raising unemployment, the boom/slump employment
 * asymmetry, and a jump in the rate response — were all a step function
 * sitting in the middle of the range the player occupies. The sweeps at the
 * bottom are here to catch the next one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { P } from '../src/params.js';
import { world, advance, dial, nudge, compare } from './harness.mjs';

const cut = (nx, months = 24) =>
  compare({ externalDemand: nx, shock: (w) => nudge(w, 'policy_rate', -1), months });
const spend = (nx, months = 24) =>
  compare({ externalDemand: nx, shock: (w) => { w.s.govt_spending += 1; w.s.govt_purchases += 1; }, months });

test('a rate cut does more for OUTPUT with slack than at capacity', () => {
  // docs/02: "the single most important conditional in the whole model".
  // Measured before the fix: 0.94 with a -6% gap versus 2.04 at zero. The
  // cause was crowding out reading the headline deficit, so every demand
  // expansion shrank the deficit and crowded investment back in — an
  // amplifier that switches OFF exactly when there is slack.
  const slack = cut(-3), hot = cut(2);
  assert.ok(slack.outputShare > hot.outputShare + 0.1,
    `output share ${slack.outputShare.toFixed(2)} with slack vs ` +
    `${hot.outputShare.toFixed(2)} at capacity`);
  assert.ok(hot.dInflation > slack.dInflation,
    `the same cut must buy more inflation at capacity: ` +
    `${hot.dInflation.toFixed(2)} vs ${slack.dInflation.toFixed(2)}`);
});

test('a cut is weaker than the equivalent hike', () => {
  // Tenreyro & Thwaites: pushing a string versus pulling a rope, at ~1/1.5.
  // monetaryEasingScale applies it to the STANCE, not the increment, so a
  // cut-then-hike round trip cannot ratchet the stance permanently tighter.
  const c = compare({ shock: (w) => nudge(w, 'policy_rate', -1), months: 1 });
  const h = compare({ shock: (w) => nudge(w, 'policy_rate', +1), months: 1 });
  const ratio = Math.abs(c.dOutput / h.dOutput);
  const target = 1 / P.MONETARY_ASYMMETRY_RATIO.value;
  assert.ok(Math.abs(ratio - target) < 0.05,
    `|cut|/|hike| on impact is ${ratio.toFixed(3)}, expected ~${target.toFixed(3)}`);
});

test('a cut-then-hike round trip leaves the stance where it started', () => {
  const w = world();
  advance(w, 12);
  const before = w.s.policy_rate_demand;
  nudge(w, 'policy_rate', -1);
  advance(w, 24);
  nudge(w, 'policy_rate', +1);
  advance(w, 48);
  assert.ok(Math.abs(w.s.policy_rate_demand - before) < 0.01,
    `stance drifted to ${w.s.policy_rate_demand} from ${before} over a round trip`);
});

test('THE LOWER BOUND: easing stops working as the rate approaches it', () => {
  // docs/07 M2: there was no rate-level dependence anywhere. The response was
  // bit-identical from a 10% policy rate down to -0.74%, and the damping the
  // audit brief read as a lower bound was the capacity ceiling.
  const from = (rate) => compare({
    prepare: (w) => dial(w, 'policy_rate', rate),   // BOTH arms
    settle: 60,
    shock: (w) => nudge(w, 'policy_rate', -0.5),
    months: 24,
  });
  const normal = from(4).dOutput;
  const atBound = from(P.SS_ELB.value + 0.25).dOutput;
  assert.ok(atBound < normal * 0.4,
    `a cut at the bound moved output ${atBound.toFixed(3)} against ` +
    `${normal.toFixed(3)} well away from it — ZLB_RATE_EFFECTIVENESS is ${P.ZLB_RATE_EFFECTIVENESS.value}`);
});

test('QE still works when the rate dial has run out of room', () => {
  // Which is the entire reason it exists (docs/02 Part 3).
  const atFloor = (shock) => compare({
    prepare: (w) => dial(w, 'policy_rate', P.SS_ELB.value + 0.25),
    settle: 60,
    shock,
    months: 24,
  });
  const moreCutting = atFloor((w) => nudge(w, 'policy_rate', -0.25)).dOutput;
  const qe = atFloor((w) => dial(w, 'qe', 15)).dOutput;
  assert.ok(qe > moreCutting,
    `QE moved output ${qe.toFixed(3)} and one more cut moved ${moreCutting.toFixed(3)} — ` +
    `at the bound the second lever has to be the one that works`);
});

test('unemployment rises faster than it falls', () => {
  // docs/02 Asymmetry 2, and docs/07 L5 found it inverted 3:1 the wrong way:
  // a one-sided Okun switch gave a boom triple the employment swing of an
  // equal slump. The asymmetry belongs in FIRING_SPEED vs HIRING_SPEED.
  const down = compare({ shock: (w) => { w.nx = -3; }, months: 9 });
  const up = compare({ shock: (w) => { w.nx = +3; }, months: 9 });
  const rise = down.dUnemp, fall = -up.dUnemp;
  assert.ok(rise / fall > 1.0,
    `unemployment rose ${rise.toFixed(3)} on a -3 shock and fell ${fall.toFixed(3)} ` +
    `on a +3 shock — ratio ${(rise / fall).toFixed(2)}, must exceed 1`);
});

test('SWEEP: more spending never raises unemployment, at any starting gap', () => {
  // docs/07 L6. A hard Okun switch at output_gap = -2 meant +1pp of spending
  // RAISED unemployment for every start between -3.0 and -2.2. A two-point
  // comparison misses this entirely; only a sweep finds it.
  for (let nx = -5; nx <= 3; nx += 0.5) {
    const r = spend(nx, 24);
    assert.ok(r.dUnemp <= 1e-6,
      `starting gap ${r.start.output_gap.toFixed(2)}: +1pp of spending moved ` +
      `unemployment by ${r.dUnemp.toFixed(4)}`);
  }
});

test('SWEEP: no step changes in the response to a rate cut', () => {
  // A discontinuity in the middle of the playable range is the signature of
  // all three of the switch bugs the audit found. Neighbouring starting
  // states must give neighbouring answers.
  const grid = [];
  for (let nx = -4; nx <= 1; nx += 0.5) {
    const r = cut(nx, 12);
    grid.push({ gap: r.start.output_gap, dOutput: r.dOutput });
  }
  for (let i = 1; i < grid.length; i++) {
    const jump = Math.abs(grid[i].dOutput - grid[i - 1].dOutput);
    const scale = Math.max(0.05, Math.abs(grid[i - 1].dOutput));
    assert.ok(jump < scale * 0.4,
      `the response jumps from ${grid[i - 1].dOutput.toFixed(3)} at a ` +
      `${grid[i - 1].gap.toFixed(1)}% gap to ${grid[i].dOutput.toFixed(3)} at ` +
      `${grid[i].gap.toFixed(1)}% — there is a switch in there`);
  }
});

test('the ONE cliff in the model is the capacity ceiling, and it is where it says', () => {
  // MAX_CAPACITY_OVERHEAT. Demand above it cannot become output, so the
  // response to any demand lever collapses — correctly, and this is the
  // switch the audit brief mistook for a zero lower bound on the rate dial,
  // because low rates and a hot economy travel together (docs/07 M2).
  const below = cut(1, 12);
  const above = cut(2, 12);
  assert.ok(below.start.output_gap < P.MAX_CAPACITY_OVERHEAT.value &&
            above.start.output_gap > P.MAX_CAPACITY_OVERHEAT.value,
    'the test failed to straddle the ceiling');
  assert.ok(above.dOutput < below.dOutput * 0.2,
    `above the ceiling a cut still moved output ${above.dOutput.toFixed(3)} ` +
    `against ${below.dOutput.toFixed(3)} below it`);
  assert.ok(above.dInflation > below.dInflation,
    'demand blocked from becoming output has to show up in prices');
});
