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
import { readFileSync } from 'node:fs';
import { citedIn } from './citations.mjs';
import { SCENARIOS } from '../src/game/scenarios.js';
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
  // MEASURED JUST EITHER SIDE OF THE CEILING, because the lesson is the
  // DISCONTINUITY and nothing else here is. Below the ceiling the inflation
  // response to a cut DECLINES as the economy heats up — 0.105 at a zero gap,
  // 0.061 at +2, 0.033 at +3 — and then jumps at the ceiling and climbs again.
  // That declining stretch is pre-existing and unrelated: it is identical
  // before and after the 3.1 asset-price fix. Comparing a point at +2 with one
  // at +4 therefore straddles both effects at once, and used to pass by 0.004
  // and now fails by 0.006 — a coin toss dressed as a lesson. Just-below
  // against just-above isolates the cliff, and it is a 65% jump.
  const below = cut(1.5, 12);
  const above = cut(2, 12);
  assert.ok(below.start.output_gap < P.MAX_CAPACITY_OVERHEAT.value &&
            above.start.output_gap > P.MAX_CAPACITY_OVERHEAT.value,
    'the test failed to straddle the ceiling');
  assert.ok(above.dOutput < below.dOutput * 0.2,
    `above the ceiling a cut still moved output ${above.dOutput.toFixed(3)} ` +
    `against ${below.dOutput.toFixed(3)} below it`);
  assert.ok(above.dInflation > below.dInflation,
    `demand blocked from becoming output has to show up in prices: a cut at a ` +
    `${above.start.output_gap.toFixed(2)}% gap moved inflation ` +
    `${above.dInflation.toFixed(4)} against ${below.dInflation.toFixed(4)} at ` +
    `${below.start.output_gap.toFixed(2)}%`);
});

/* ------------------------------------------------------------------------
 * THE DIAL IS NOT THE STANCE — the transmitted-driver rule, enforced on the
 * two channels where it had leaked (docs/12 L3 and L5).
 *
 * Both were the same shape: a rule read s.policy_rate, the SLIDER, to decide
 * how a mechanism behaves. That hands the player an INSTANTANEOUS change in
 * the structure of the economy, in a model whose entire thesis is that nothing
 * is instant. Both inverted a lesson, and neither showed up in any existing
 * test because both only bite within ZLB_EFFECTIVE_BAND of the lower bound —
 * which is the recession scenario, the post-crash state, and Japan.
 * ---------------------------------------------------------------------- */

test('L5: HIKING AT THE LOWER BOUND MUST NOT RAISE OUTPUT', () => {
  // monetaryEasingScale's `room` read the dial. At the bound the whole easing
  // stance is suppressed; moving the DIAL up 1pp took `room` from 0.500 to
  // 1.000 in one month while the economy had felt 0.007pp of it, so all the
  // suppressed easing counted at once. Measured before the fix, from the
  // `recession` scenario's opening rate of 0.00: +1pp bought dY +0.08 at month
  // 1 and +0.08 at month 3, turning negative only at month 6.
  // What survives is a genuine second-order term of the OPPOSITE size class:
  // +1.05e-4% at month 1 for a 1pp hike, from crowding-IN strengthening as the
  // transmitted rate leaves the bound. That is 1/800th of the defect and it is
  // gone by month 2, so the assertions are about materiality and shape rather
  // than about the sign of a rounding-scale number.
  for (const hike of [0.25, 0.75, 1.0, 2.0]) {
    const base = world({ overrides: SCENARIOS.recession.overrides });
    const hit = world({ overrides: SCENARIOS.recession.overrides });
    advance(base, 6); advance(hit, 6);
    nudge(hit, 'policy_rate', hike);
    let prev = Infinity;
    for (let m = 1; m <= 24; m++) {
      advance(base, 1); advance(hit, 1);
      const dY = (hit.s.output - base.s.output) / base.s.output * 100;
      if (m === 1) {
        assert.ok(Math.abs(dY) < 0.005,
          `a +${hike}pp hike moved output ${dY.toFixed(4)}% in its FIRST month. ` +
          `Nothing about a rate move is instant; a material month-1 response means ` +
          `a rule is reading the dial instead of a transmitted driver.`);
      } else {
        assert.ok(dY < 0,
          `a +${hike}pp HIKE from the bound RAISED output by ${dY.toFixed(4)}% at month ${m}`);
      }
      assert.ok(dY <= prev + 1e-9,
        `a +${hike}pp hike's output cost got SMALLER between month ${m - 1} and ${m} ` +
        `(${prev.toFixed(4)} -> ${dY.toFixed(4)}) — tightening must accumulate`);
      prev = dY;
    }
  }
});

test('L3: the fiscal multiplier has no step in it as the rate falls to the bound', () => {
  // investment.js gated crowding out on `s.policy_rate <= SS_ELB + 0.26` — a
  // hard step, on the dial, with an unsourced magic number. Measured before
  // the fix, at a gap held at zero by an offsetting external demand shock, the
  // 24-month multiplier jumped 1.392 -> 1.998 across a SINGLE 0.1pp dial
  // click. It now ramps over ZLB_EFFECTIVE_BAND on the transmitted rate.
  //
  // The gap is held with net_exports, never with the rate: setting the state
  // with the lever under test is what made the first attempt at this sweep
  // read the capacity ceiling instead (harness.mjs convention 1).
  const gapAt = (rate, nx) => {
    try {
      const w = world({ externalDemand: nx, assert: false });
      advance(w, 6); dial(w, 'policy_rate', rate); advance(w, 90);
      return Number.isFinite(w.s.output_gap) ? w.s.output_gap : Infinity;
    } catch { return Infinity; }
  };
  const solveNx = (rate) => {
    let lo = -12, hi = 8;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (gapAt(rate, mid) < 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const multiplierAt = (rate) => {
    const nx = solveNx(rate);
    const prep = (w) => { advance(w, 6); dial(w, 'policy_rate', rate); advance(w, 90); };
    const base = world({ externalDemand: nx, assert: false });
    const hit = world({ externalDemand: nx, assert: false });
    prep(base); prep(hit);
    const y0 = base.s.output;
    nudge(hit, 'govt_spending', +1);
    advance(base, 24); advance(hit, 24);
    return (hit.s.output - base.s.output) / y0 * 100;
  };
  let prev = null;
  for (let r = 0.4; r >= P.SS_ELB.value - 1e-9; r -= 0.1) {
    const m = multiplierAt(Math.round(r * 100) / 100);
    if (prev !== null) {
      assert.ok(m >= prev - 1e-6,
        `the multiplier FELL from ${prev.toFixed(4)} to ${m.toFixed(4)} as the rate ` +
        `fell to ${r.toFixed(2)} — crowding out must weaken toward the bound`);
      assert.ok(m - prev < 0.15,
        `the multiplier jumped ${(m - prev).toFixed(4)} across one 0.1pp step at ` +
        `rate ${r.toFixed(2)} — that is a switch, not a ramp`);
    }
    prev = m;
  }
});

test('investment.js reads the rate DIAL only to display it', () => {
  // The structural version of the two findings above, and the cheapest to
  // keep: the dial's value has no business in the arithmetic of a demand rule.
  // It is still legitimate INSIDE a trace, where showing the dial next to the
  // transmitted rate is the whole teaching point of the pipeline panel — so
  // the test allows exactly that one line and nothing else.
  // tools/lint.mjs runs the same check across all of src/rules/.
  const src = readFileSync(new URL('../src/rules/investment.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const reads = (src.match(/^.*\bs\.policy_rate\b(?!_).*$/gm) || [])
    .filter((line) => !/rate_on_the_dial:\s*s\.policy_rate,?\s*$/.test(line.trim()));
  assert.deepEqual(reads, [],
    's.policy_rate — the dial — is used in arithmetic inside investment.js. ' +
    'Demand rules read policy_rate_demand; the dial may only be displayed.');
});

/* ----------------------------------------------------------------------
 * THE A-TABLE — the disinflation response curve, measured from the model.
 *
 * The fourth audit brief's Section A leads with a decomposition: from 8%
 * inflation and 7% expected, move the rate once and read inflation at month
 * 60. As built it produced 555.73 at a 5% rate and 1.76 at 9% — "the model
 * does not disinflate gradually, it either stabilises or diverges".
 *
 * TWO THINGS THIS MEASURES, and the second one is the point.
 *
 * 1. WHERE THE THRESHOLD IS. Fisher says a nominal peg stabilises when it
 *    delivers a positive real rate — here expected_inflation + neutral_real =
 *    7.5%. Before the A1 split the model needed 8-9%, because the player had
 *    to overshoot by ~2pp to pay for a year in which the economy felt nothing
 *    while expectations kept climbing. It now needs 6-7%.
 *
 * 2. HOW SHARP THE THRESHOLD IS — the knife-edge itself. This is measured as
 *    the steepest LOCAL SENSITIVITY, |d(inflation at m60) / d(policy rate)|,
 *    on a 0.25pp grid.
 *
 * ON A 0.25 GRID, NOT A 1pp ONE, and that matters: the whole finding sits
 * between grid points otherwise. Ground rule 2.
 * ---------------------------------------------------------------------- */

const A_TABLE_START = {
  inflation: 8, expected_inflation: 7, credibility: 0.5,
  policy_rate: 2.5, yield_10y: 3.25,
};

/** inflation at month 60 after a single rate move at month 0. */
function disinflationCurve({ noWealth = false } = {}) {
  const saved = P.WEALTH_EFFECT.value;
  if (noWealth) P.WEALTH_EFFECT.value = 0;
  try {
    const rates = [], inflation = [];
    for (let r = 5; r <= 12.0001; r += 0.25) {
      const rate = Number(r.toFixed(2));
      const w = world({ assert: false, overrides: A_TABLE_START });
      dial(w, 'policy_rate', rate);
      advance(w, 60);
      rates.push(rate);
      inflation.push(w.s.inflation);
    }
    const slopes = inflation.slice(1).map((v, i) => (v - inflation[i]) / 0.25);
    let steepest = 0, steepestAt = 0;
    slopes.forEach((v, i) => { if (Math.abs(v) > Math.abs(steepest)) { steepest = v; steepestAt = rates[i]; } });
    return { rates, inflation, slopes, steepest, steepestAt };
  } finally {
    P.WEALTH_EFFECT.value = saved;
  }
}

test('A-TABLE: the disinflation response is monotone and its threshold is where Fisher puts it', () => {
  const c = disinflationCurve();
  const at = (r) => c.inflation[c.rates.indexOf(r)];

  console.log(`  disinflation curve @m60: ` +
    [5, 6, 7, 8, 9, 10, 12].map((r) => `${r}%:${at(r).toFixed(1)}`).join(' '));
  console.log(`  steepest ${c.steepest.toFixed(1)}pp of inflation per pp of policy, at ${c.steepestAt}%`);

  for (let i = 1; i < c.inflation.length; i++) {
    assert.ok(c.inflation[i] <= c.inflation[i - 1] + 1e-9,
      `the curve is not monotone: a higher rate at ${c.rates[i]}% left MORE ` +
      `inflation (${c.inflation[i].toFixed(2)}) than ${c.rates[i - 1]}% ` +
      `(${c.inflation[i - 1].toFixed(2)}). Tightening more must never inflate more.`);
  }

  // The threshold sits at expected_inflation + neutral_real = 7.5. Asserting
  // the BRACKET, not a number: the model must stabilise by 7.5% and must not
  // already be stable at 5%, which would mean a nominal peg 2.5pp below the
  // Fisher point was somehow fine.
  assert.ok(at(7.5) < 10,
    `inflation is ${at(7.5).toFixed(2)}% at m60 from a 7.5% peg. That is ` +
    `expected_inflation + neutral_real — the point at which the arithmetic ` +
    `says a peg stops feeding itself — and the model still diverges there.`);
  assert.ok(at(5) > 10,
    `a 5% peg against 7% expected inflation left only ${at(5).toFixed(2)}% at ` +
    `m60. A nominal rate 2.5pp below the Fisher point must not be stable; if it ` +
    `is, the Taylor principle has stopped operating and that is a bigger ` +
    `finding than the knife-edge.`);
});

test('A-TABLE: the knife-edge is the wealth channel, and it is still there', {
  todo: 'PHASE 3 CLOSES THIS. Measured as the steepest local sensitivity on a ' +
    '0.25pp grid, |d inflation@m60 / d policy rate|: ' +
    'pre-A1 as built -366.7 at 7.75% (slope ratio 138x); ' +
    'post-A1 as built -149.2 at 6.25% (slope ratio 80x); ' +
    'post-A1 with no wealth channel -22.5 at 5.50% (slope ratio 19x). ' +
    'Splitting the transmission lag halved the knife-edge and moved it toward ' +
    'the Fisher point, but did not remove it. Switching WEALTH_EFFECT off ' +
    'removes 85% of what is left, which is the isolating experiment: the ' +
    'residual bifurcation is the asset-wealth channel, and that is Section B. ' +
    'The target below is not a picked number — it is what the model itself ' +
    'does with the offending channel switched off, re-measured on every run.',
}, () => {
  const live = disinflationCurve();
  const off = disinflationCurve({ noWealth: true });
  console.log(`  steepest slope: as built ${live.steepest.toFixed(1)} at ` +
    `${live.steepestAt}%; wealth channel off ${off.steepest.toFixed(1)} at ${off.steepestAt}%`);
  assert.ok(Math.abs(live.steepest) <= Math.abs(off.steepest) * 1.1,
    `the live model's steepest response is ${Math.abs(live.steepest).toFixed(1)}pp ` +
    `of inflation per pp of policy, against ${Math.abs(off.steepest).toFixed(1)} ` +
    `with WEALTH_EFFECT switched off. The wealth channel is contributing ` +
    `${(Math.abs(live.steepest) / Math.abs(off.steepest)).toFixed(1)}x the ` +
    `curvature of the rest of the model put together.`);
});

test('A-TABLE: the A1 split made the response curve measurably smoother', () => {
  // A REGRESSION GUARD, not an acceptance. The pre-A1 tree measured -366.7pp
  // per pp at 7.75%; if this climbs back above 200 something has undone the
  // transmission split.
  const c = disinflationCurve();
  assert.ok(Math.abs(c.steepest) < 200,
    `the steepest response is ${Math.abs(c.steepest).toFixed(1)}pp of inflation ` +
    `per pp of policy. Before the A1 transmission split it was 366.7 and after ` +
    `it was 149.2 — above 200 means the rate is being lagged on the investment ` +
    `response again.`);
});

/**
 * THE EFFECTIVE TRANSMITTED TAYLOR RESPONSE.
 *
 * The single most important fact about this model's dynamics, and nothing
 * anywhere recorded it until the fourth audit.
 *
 * The Taylor principle says the response to inflation must exceed one or
 * inflation is unstable. On the DIAL the model satisfies it by construction:
 * 1 + TAYLOR_INFLATION = 1.5. But the principle is about the rate the economy
 * FEELS, and before the A1 split those were different numbers: over months
 * 3-12 of `stagflation` under the rule, inflation rose 9.92pp while the
 * transmitted rate rose 3.67pp — an effective response of 0.37, far below
 * unity. THE DIAL SATISFIED THE PRINCIPLE AND TRANSMISSION VIOLATED IT. That
 * is the whole of why the model bifurcated, and it is invisible from the dial.
 *
 * A rule can be above unity on paper and below it in effect. Only the effect
 * stabilises anything.
 */
test('the TRANSMITTED Taylor response clears unity, not just the dial one', () => {
  const w = world({ assert: false, taylor: true,
                    overrides: SCENARIOS.stagflation.overrides });
  const h = [];
  for (let m = 1; m <= 24; m++) {
    advance(w, 1);
    h.push({ inflation: w.s.inflation, dial: w.s.policy_rate,
             felt: w.s.policy_rate_demand, expected: w.s.expected_inflation });
  }
  const at = (m) => h[m - 1];
  const dPi = at(12).inflation - at(3).inflation;
  const onTheDial = (at(12).dial - at(3).dial) / dPi;
  const transmitted = (at(12).felt - at(3).felt) / dPi;
  const realFelt = at(12).felt - at(12).expected;

  console.log(`  stagflation m3->m12: inflation +${dPi.toFixed(2)}pp; response on the ` +
    `DIAL ${onTheDial.toFixed(2)}, TRANSMITTED ${transmitted.toFixed(2)} ` +
    `(0.37 before the A1 split); real rate felt at m12 ${realFelt.toFixed(2)}% (-14.50 before)`);

  assert.ok(dPi > 0,
    `inflation fell ${(-dPi).toFixed(2)}pp over months 3-12 of stagflation, so ` +
    `there is no rising-inflation window to measure the response over. Pick a ` +
    `different window rather than reporting a ratio with a negative denominator.`);
  assert.ok(transmitted > 1.0,
    `the TRANSMITTED response to inflation is ${transmitted.toFixed(2)}, below ` +
    `unity, while the dial's is ${onTheDial.toFixed(2)}. The Taylor principle is ` +
    `satisfied where it is announced and violated where it acts — that is the ` +
    `mechanism behind the whole of Section A, and it was 0.37 before the ` +
    `transmission lag was split off the rate.`);

  // DECLARED CITATIONS [5.12, open_items E4]. This number is written out by
  // hand in two other places, and both of them were wrong for four commits:
  // 2.3 wrote 1.80 into TAYLOR_INFLATION's note, the carry-forward wrote 1.83
  // into docs/02, and 3.1 moved the real value with neither updated — past a
  // HARD GATE whose stated job was to re-measure everything (Correction 12).
  // A test that PRINTS a number does not test the number written down
  // somewhere else, so the copies are named here and checked.
  citedIn('the transmitted Taylor response', transmitted.toFixed(2), [
    { file: 'docs/02-causal-map.md', near: /^\s*effective response/,
      what: 'docs/02 calls this "the most important single fact about this model\'s dynamics"' },
    { file: 'parameters.py', near: /IT IS NOW [\d.]+ over the same window/,
      what: "TAYLOR_INFLATION's note" },
  ]);
});
