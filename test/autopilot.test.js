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
  assert.ok(counts.stagflation > 60,
    `stagflation truncated in only ${counts.stagflation} of 96 months. If this ` +
    `has fallen, the ceiling problem has moved and Phase 2.4's derivation ` +
    `needs re-running — this number is the reason that task exists.`);
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
test('the Taylor rule loses stagflation to the CEILING, not to the supply shock', () => {
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
    const built = play();
    rate.max = 40;
    const lifted = play();

    console.log(`  stagflation under the Taylor rule: ceiling ${original} -> ` +
      `${built[48].toFixed(2)}% @m48, ${built[96].toExponential(2)}% @m96 ` +
      `(refused ${built.truncated}/96); ceiling 40 -> ${lifted[48].toFixed(2)}% @m48, ` +
      `${lifted[96].toFixed(2)}% @m96 (refused ${lifted.truncated}/96)`);

    // Measured at m96, not m48. The A1 transmission split took the m48 figure
    // from 242.34% to 29.55% — the largest single effect in this pass — so a
    // month-48 threshold now measures how much of A1 has landed rather than
    // whether the rule wins. By the end of the term it still diverges.
    assert.ok(built[96] > 100,
      `the rule now holds stagflation to ${built[96].toFixed(2)}% at month 96 as ` +
      `built, having been at 1020.91%. If this has been fixed, say so in ` +
      `autopilot.js's header — the comment there states the loss as a measured ` +
      `fact and it must not become stale the way its predecessor did.`);

    assert.ok(lifted[48] < 20 && lifted[96] < 20,
      `raising ONLY the dial's ceiling to 40 leaves inflation at ` +
      `${lifted[48].toFixed(2)}% at m48 and ${lifted[96].toFixed(2)}% at m96. The ` +
      `claim in autopilot.js — that the rule loses to the instrument and not to ` +
      `the shock — rests on this arm winning with the shock untouched.`);

    assert.equal(lifted.truncated, 0,
      `at a ceiling of 40 the rule was still refused ${lifted.truncated} times. ` +
      `Phase 2.4 derives the ceiling from exactly this: the lowest bound the ` +
      `rule never has to be refused at.`);

    assert.ok(built.truncated > 60,
      `the rule was refused its request in only ${built.truncated} of 96 months`);
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
