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
import { taylorRate } from '../src/game/autopilot.js';
import { DIALS } from '../src/game/dials.js';

const RATE = DIALS.find((d) => d.key === 'policy_rate');

/**
 * THE ASSERTION IS IN BOTH DIRECTIONS, and that is the whole point.
 *
 * "The autopilot must not ask for more than the dial can give" alone is
 * satisfiable by clamping the rule to 5%, which would be a far worse bug wearing
 * a passing test. So: the rule must never leave the dial's range, AND it must
 * be able to reach both ends of it. The two together pin the clamps together
 * without pinning either to a number, which is what lets Phase 2.4 move the
 * ceiling without touching this file.
 */
test('the autopilot\'s clamp and the rate dial\'s bounds agree, in both directions', () => {
  const seen = [];
  // A wide, deliberately absurd sweep of the states the rule could ever face.
  for (const inflation of [-10, -4, 0, 2, 5, 10, 20, 40, 100, 400]) {
    for (const gap of [-50, -10, 0, 10, 50]) {
      for (const rate of [RATE.min, 0, 2.5, 10, RATE.max]) {
        const s = newState({ inflation, policy_rate: rate });
        s.output_gap = gap;
        const r = taylorRate(s);
        assert.ok(Number.isFinite(r), `taylorRate returned ${r}`);
        assert.ok(r >= RATE.min - 1e-9 && r <= RATE.max + 1e-9,
          `taylorRate asked for ${r.toFixed(2)}% at inflation ${inflation}, gap ` +
          `${gap}, rate ${rate}. The dial is [${RATE.min}, ${RATE.max}], so ` +
          `applyDialChange would truncate it in silence — brief A2, and the ` +
          `reason the rule could never win stagflation.`);
        seen.push(r);
      }
    }
  }
  const hi = Math.max(...seen), lo = Math.min(...seen);
  assert.ok(hi > RATE.max - 1e-6,
    `the rule never reaches the dial's ceiling (${hi.toFixed(2)} of ` +
    `${RATE.max}) — its clamp is TIGHTER than the dial's, which is the same ` +
    `defect pointing the other way: the player has room the benchmark refuses ` +
    `to use, so the benchmark is not the rule it claims to be.`);
  assert.ok(lo < RATE.min + 1e-6,
    `the rule never reaches the effective lower bound (${lo.toFixed(2)} of ` +
    `${RATE.min}). The ELB is economics and one of the lessons; a benchmark ` +
    `that stops short of it cannot demonstrate it.`);
});

/**
 * The static half. The behavioural test above passes if the two numbers happen
 * to agree today; this one fails if they are two numbers at all. docs/07 L1
 * survived three passes because a duplicated fact drifted.
 */
test('the autopilot does not carry its own copy of the dial\'s bounds', () => {
  const src = readFileSync(new URL('../src/game/autopilot.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const clampCall = src.match(/clamp\(\s*smoothed\s*,([^)]*)\)/);
  assert.ok(clampCall, 'the smoothing clamp could not be found in autopilot.js');
  assert.ok(!/\d/.test(clampCall[1]),
    `the autopilot clamps the smoothed rate with a numeric literal: ` +
    `clamp(smoothed,${clampCall[1]}). The dial's bounds live in dials.js and ` +
    `must be read from there — a second copy is how autopilot.js came to ask ` +
    `for 25% while the dial capped at 20% (brief A2).`);
});
