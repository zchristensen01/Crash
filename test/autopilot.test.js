/**
 * THE AUTOPILOT — the Taylor-rule benchmark.
 *
 * Not part of the model, but it is what every headless test uses for policy,
 * so a defect in it reads as a defect in the economics. The fourth audit brief
 * found two: the rule asked for a rate the dial could not deliver and nothing
 * reported the truncation (A2), and the file asserted its own defeat in a
 * comment instead of measuring it (A4).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newState } from '../src/state.js';
import { taylorRate, applyAutopilot } from '../src/game/autopilot.js';
import { DIALS, applyDialChange } from '../src/game/dials.js';
import { LagPipeline } from '../src/lags.js';
import { Trace } from '../src/trace.js';
import { makeRng } from '../src/rng.js';
import { tick } from '../src/engine.js';
import { SCENARIOS } from '../src/game/scenarios.js';

const RATE = DIALS.find((d) => d.key === 'policy_rate');

/**
 * THE ASSERTION IS IN BOTH DIRECTIONS, and that is the whole point.
 *
 * "The autopilot must not ask for more than the dial can give" is on its own
 * satisfiable by clamping the rule to 5%, which would be a far worse bug
 * wearing a passing test. So both directions are pinned:
 *
 *   - what the rule ACHIEVES is always inside the dial's range, and reaches
 *     both ends of it; and
 *   - what the rule ASKS FOR is free to leave the range, because that is the
 *     only way the truncation can be seen from anywhere.
 *
 * Neither is pinned to a number, which is what lets Phase 2.4 move the ceiling
 * by editing dials.js alone.
 */
test('the rate the autopilot achieves stays in the dial\'s range and reaches both ends', () => {
  const achieved = [];
  // A wide, deliberately absurd sweep of the states the rule could ever face.
  for (const inflation of [-10, -4, 0, 2, 5, 10, 20, 40, 100, 400]) {
    for (const gap of [-50, -10, 0, 10, 50]) {
      for (const rate of [RATE.min, 0, 2.5, 10, RATE.max]) {
        const s = newState({ inflation, policy_rate: rate });
        s.output_gap = gap;
        assert.ok(Number.isFinite(taylorRate(s)), `taylorRate returned ${taylorRate(s)}`);
        applyAutopilot(s, new LagPipeline());
        assert.ok(s.policy_rate >= RATE.min - 1e-9 && s.policy_rate <= RATE.max + 1e-9,
          `the autopilot set the rate to ${s.policy_rate.toFixed(2)}% at inflation ` +
          `${inflation}, gap ${gap}. The dial is [${RATE.min}, ${RATE.max}].`);
        achieved.push(s.policy_rate);
      }
    }
  }
  const hi = Math.max(...achieved), lo = Math.min(...achieved);
  assert.ok(hi > RATE.max - 1e-6,
    `the rule never reaches the dial's ceiling (${hi.toFixed(2)} of ${RATE.max}) ` +
    `— something is TIGHTER than the dial, which is the A2 defect pointing the ` +
    `other way: the player has room the benchmark refuses to use, so the ` +
    `benchmark is not the rule it claims to be.`);
  assert.ok(lo < RATE.min + 1e-6,
    `the rule never reaches the effective lower bound (${lo.toFixed(2)} of ` +
    `${RATE.min}). The ELB is economics and one of the lessons; a benchmark ` +
    `that stops short of it cannot demonstrate it.`);
});

/**
 * The static half, and the stronger one. The behavioural test above passes if
 * two copies of the bounds happen to agree today; this one fails if there are
 * two copies at all. docs/07 L1 survived three passes because a duplicated
 * fact drifted.
 *
 * It also pins the shape the truncation telemetry depends on. Clamping inside
 * taylorRate — even to the dial's own bounds, read from DIALS — makes the
 * rule's own ceiling swallow the request before applyDialChange can report it,
 * and the count below silently goes to zero while the saturation is unchanged.
 * That is not hypothetical; it is what the first attempt at this did.
 */
test('the autopilot enforces no bounds of its own — the dial is the only one', () => {
  const src = readFileSync(new URL('../src/game/autopilot.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  assert.ok(!/\bclamp\s*\(/.test(src),
    'autopilot.js clamps. The rate dial\'s bounds belong to dials.js and are ' +
    'enforced by applyDialChange, which is also the only place that reports a ' +
    'truncated request. A clamp here hides the request from the telemetry ' +
    'written to catch it (brief A2).');
  assert.ok(!/\bSS_ELB\b/.test(src),
    'autopilot.js names the effective lower bound. That is the rate dial\'s ' +
    'min and applyDialChange applies it.');
});

/**
 * 1.3 — A TRUNCATED DIAL REQUEST IS REPORTED.
 *
 * The cheap guard that would have surfaced the A2 inconsistency without an
 * audit. A dial pinned against its own bound reads exactly like a converged
 * one on every summary statistic in the project — same mean, same variance,
 * same final value — so the only defence is to say so at the moment it
 * happens. It happened in silence for three passes.
 */
test('a dial request the bounds refuse is reported, not swallowed', () => {
  const s = newState();
  const pipeline = new LagPipeline();
  const rate = DIALS.find((d) => d.key === 'policy_rate');

  applyDialChange(s, pipeline, 'policy_rate', rate.max + 5);
  assert.equal(s.policy_rate, rate.max, 'the bound must still bite');
  assert.ok(s.dial_truncated, 'the dial silently swallowed a request past its maximum');
  assert.equal(s.dial_truncated.requested, rate.max + 5);
  assert.equal(s.dial_truncated.applied, rate.max);
  assert.equal(s.dial_truncated_count, 1);

  applyDialChange(s, pipeline, 'policy_rate', rate.min - 5);
  assert.equal(s.dial_truncated_count, 2, 'the floor must report too — the ELB is a lesson');

  // A move the bounds accept must NOT report. A telemetry channel that fires
  // on every ordinary move is one the next reader learns to ignore. The
  // RECORD is per-month and is cleared by the tick, not by the next accepted
  // move — a player who pushes the rate into its stop and then adjusts
  // spending should still be told about the rate.
  applyDialChange(s, pipeline, 'policy_rate', 3.0);
  assert.equal(s.dial_truncated_count, 2);
});

test('the truncation count makes a saturated benchmark visible in one number', () => {
  // THE POINT OF THE COUNT, and the measurement behind Phase 2.4. Nothing in
  // the project reported this before: the rule spends most of the game asking
  // for a rate the dial cannot deliver, and every A-table figure taken with
  // the autopilot on is therefore read off a saturated instrument.
  const counts = {};
  for (const key of Object.keys(SCENARIOS)) {
    const s = newState(SCENARIOS[key].overrides);
    const trace = new Trace(false);
    const pipeline = new LagPipeline();
    const rng = makeRng(1);
    for (let m = 0; m < 96; m++) {
      tick(s, trace, pipeline, rng, {
        events: false, endings: false, assertEveryTick: false,
        autopilot: applyAutopilot,
      });
    }
    counts[key] = s.dial_truncated_count;
  }
  console.log(`  months the Taylor rule was refused its own request, of 96: ` +
    Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', '));
  // stagflation used to be 87/96 against a ceiling of 20. Phase 2.4 derived
  // the ceiling as a fixed point and it is now 0/96 — the UPPER bound has
  // stopped binding anywhere. What remains is the lower one, which is physics.
  assert.equal(counts.stagflation, 0,
    `the rule was refused ${counts.stagflation} times in stagflation. The ` +
    `ceiling was derived in Phase 2.4 so that it never has to be — if this is ` +
    `back above zero, either the ceiling has been lowered or the demand block ` +
    `has moved enough that the derivation needs re-running.`);
  assert.ok(counts.recession > 0,
    `the rule was never refused in recession. It should be: the scenario opens ` +
    `with the rate on the floor and a large negative gap, so the rule asks to ` +
    `go below the effective lower bound and cannot. That is the ELB binding, ` +
    `it is one of the lessons the game exists to teach, and until this counter ` +
    `existed nothing in the project reported it either.`);
  assert.equal(counts.calm, 0,
    `the rule hit a dial bound ${counts.calm} times in calm, where it should ` +
    `never leave the neighbourhood of neutral`);
});

/**
 * 1.4 — THE ASSERTED DEFEAT, REPLACED BY THE MEASUREMENT.
 *
 * autopilot.js used to claim it lost `stagflation` "because no rule handles a
 * supply shock well". That is a defeat written into a comment and read back as
 * a design property — rule 6 pointing the other way — and it sat on top of the
 * real cause for three passes.
 *
 * This test IS the replacement. A comment cannot be run; this can, and it
 * fails the moment either half of the claim stops being true.
 *
 * It mutates the dial's ceiling, which is normally forbidden — but that is
 * precisely the isolating experiment (rule 9): one thing changes, and it is
 * the instrument rather than the economy. The shock, the capacity loss, the
 * opening inflation, the smoothing and the gain are identical in both arms.
 */
test('the Taylor rule wins stagflation at the derived ceiling and loses at 20', () => {
  const rate = DIALS.find((d) => d.key === 'policy_rate');
  const original = rate.max;

  const play = () => {
    const s = newState(SCENARIOS.stagflation.overrides);
    const trace = new Trace(false);
    const pipeline = new LagPipeline();
    const rng = makeRng(1);
    const out = {};
    for (let m = 1; m <= 96; m++) {
      tick(s, trace, pipeline, rng, {
        events: false, endings: false, assertEveryTick: false, findNaN: false,
        autopilot: applyAutopilot,
      });
      if (m === 48 || m === 96) out[m] = s.inflation;
    }
    return { ...out, truncated: s.dial_truncated_count };
  };

  try {
    const derived = play();
    rate.max = 20;
    const old = play();

    console.log(`  stagflation under the Taylor rule: ceiling ${original} -> ` +
      `${derived[48].toFixed(2)}% @m48, ${derived[96].toFixed(2)}% @m96 ` +
      `(refused ${derived.truncated}/96); ceiling 20 -> ${old[48].toFixed(2)}% @m48, ` +
      `${old[96].toExponential(2)}% @m96 (refused ${old.truncated}/96)`);

    // THE RULE WINS, at the ceiling Phase 2.4 derived.
    assert.ok(derived[48] < 20 && derived[96] < 20,
      `the rule left inflation at ${derived[48].toFixed(2)}% at m48 and ` +
      `${derived[96].toFixed(2)}% at m96. A Taylor rule handles a one-off supply ` +
      `shock adequately in every standard model, and autopilot.js's header now ` +
      `states that it does here too.`);
    assert.equal(derived.truncated, 0,
      `the rule was still refused ${derived.truncated} times at the derived ` +
      `ceiling. 2.4 derived it as the fixed point at which it never has to be.`);

    // AND IT LOSES AT A LOW ENOUGH CEILING, WITH THE SHOCK UNTOUCHED. This is
    // the isolating experiment that killed "no rule handles a supply shock
    // well": the only thing that differs between the arms is the bound on the
    // instrument.
    //
    // THE THRESHOLD MOVED WHEN 3.1 FIXED THE ASSET-PRICE UNITS, and the sweep
    // is here rather than a second fixed point because of it. A ceiling of 20
    // used to leave inflation at 1020.91% by m96 when 2.4 measured it. Measured
    // across the whole range now, inflation at m96:
    //
    //      ceiling  8  ->  619.9     ceiling 20  ->  22.65
    //      ceiling 12  ->  532.3     ceiling 21  ->   5.18
    //      ceiling 16  ->  379.6     ceiling 50  ->   3.16
    //
    // Monotone, and the loss is real below ~20. The stabilisation threshold is
    // between 20.00 and 20.25 (22.65 -> 8.70), against the 21.13 2.4 recorded
    // and the "18-20" open_items D1 estimated mid-Phase-3.
    //
    // THE DERIVATION WAS RE-RUN IN 5.9 AND 50 SURVIVED IT (D1 is closed). Six
    // scenarios x 60 seeds, events ON, recording what the rule ASKS for:
    //
    //      ceiling   p90     p99      max     runs out of control at m96
    //         20    22.1   153.1    165.3            41/360
    //         30    26.9   117.5    156.2             9/360
    //         40    26.9    41.2     82.8             1/360
    //         50    26.9    44.5     51.4             0/360
    //         60    26.9    44.5     56.2             0/360
    //
    // Same shape as 2.4's, with tails an order of magnitude smaller — the max
    // request at a ceiling of 20 was 13117.6 and is 165.3 — and the same
    // answer. See src/game/dials.js for the full table.
    const swept = [];
    for (const c of [8, 12, 16, 20]) {
      rate.max = c;
      swept.push({ c, infl: play()[96] });
    }
    console.log('  by ceiling, inflation @m96: ' +
      swept.map((x) => `${x.c}:${x.infl > 1e4 ? x.infl.toExponential(1) : x.infl.toFixed(1)}`).join(' '));
    for (let i = 1; i < swept.length; i++) {
      assert.ok(swept[i].infl < swept[i - 1].infl,
        `a HIGHER ceiling (${swept[i].c}) left MORE inflation ` +
        `(${swept[i].infl.toFixed(2)}%) than a lower one (${swept[i - 1].c}, ` +
        `${swept[i - 1].infl.toFixed(2)}%). The rule's success has to depend ` +
        `monotonically on how much instrument it is given, or A2 is not a finding.`);
    }
    assert.ok(swept[0].infl > 100,
      `at a ceiling of 8 the rule still held inflation to ${swept[0].infl.toFixed(2)}%, ` +
      `so no bound on the instrument can beat it and A2's finding has evaporated.`);
  } finally {
    rate.max = original;
  }
});

/**
 * BOTH PATHS REACH THE TRACE, and only one of them used to.
 *
 * The player moves a dial BETWEEN ticks; the autopilot moves it inside one.
 * The first version of this cleared s.dial_truncated at the START of the tick,
 * which threw the player's truncation away before trace.note could see it — so
 * the only truncations ever recorded were the benchmark's, and the case the
 * feature exists for was the one it missed. Found by verification, not by the
 * suite, because the state field alone still looked right.
 */
test('a truncation reaches the trace whether the player or the autopilot caused it', () => {
  const seenBy = (mover) => {
    const s = newState();
    const trace = new Trace(true);
    const pipeline = new LagPipeline();
    const rng = makeRng(1);
    const opts = { events: false, endings: false, assertEveryTick: false };
    mover(s, pipeline, opts);
    tick(s, trace, pipeline, rng, opts);
    const notes = [...trace.entries.keys()].filter((k) => k.includes('truncated'));
    return { notes, cleared: s.dial_truncated };
  };

  // The player: a dial move made between ticks, before the tick runs.
  const player = seenBy((s, pipeline) => {
    applyDialChange(s, pipeline, 'policy_rate', 99);
  });
  assert.equal(player.notes.length, 1,
    'a truncated PLAYER move left no trace entry. The player is the only one ' +
    'who moves a dial in the real game, so this is the case that matters.');

  // The autopilot: a dial move made inside the tick.
  const auto = seenBy((s, _p, opts) => {
    s.inflation = 400;
    opts.autopilot = applyAutopilot;
  });
  assert.equal(auto.notes.length, 1, 'a truncated AUTOPILOT move left no trace entry');

  // And the record spans exactly one month.
  assert.equal(player.cleared, null,
    'dial_truncated survived the tick that reported it, so next month it would ' +
    'be reported a second time');
});
