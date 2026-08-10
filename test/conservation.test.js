/**
 * Accounting identities hold every tick, in every regime, including crises.
 * A failure here is a bug in a rule. The invariant is never the thing to relax.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../src/state.js';
import { run } from '../src/engine.js';
import { checkInvariants } from '../src/invariants.js';

test('invariants hold across 200 quiet ticks', () => {
  const s = newState();
  assert.doesNotThrow(() => run(s, 200, { assertEveryTick: true, events: false }));
});

test('invariants hold under a violent policy path', () => {
  // Stress it: slam the dials around and confirm the books still balance.
  const s = newState();
  assert.doesNotThrow(() => run(s, 96, { assertEveryTick: true, chaos: true, events: false }));
});

test('checkInvariants actually catches a broken book', () => {
  const s = newState();
  const prev = { ...s };
  s.govt_debt += 50;                    // impossible in one tick
  assert.throws(() => checkInvariants(s, prev, 1),
    'the invariant check passed a 50pp unexplained jump in debt');
});
