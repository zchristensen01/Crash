/**
 * EVENTS MUST NOT BREAK THE BOOKS.
 *
 * docs/07 M1: `export_slump` did `s.consumption -= 1.2` and events fired AFTER
 * the rules, so aggregateDemand had already set the output gap from the old
 * consumption and the C+I+G identity failed on the spot. session.js runs with
 * assertEveryTick: true, so the shipped game stopped mid-term with an engine
 * error in 38.8% of 8-year sessions — 64% on the default scenario.
 *
 * It survived every test because every conservation test passed events:false.
 * These do not.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS } from '../src/game/events.js';
import { PIPELINE_TARGETS } from '../src/game/dials.js';
import { SCENARIOS } from '../src/game/scenarios.js';
import { newState } from '../src/state.js';
import { run } from '../src/engine.js';
import { world, advance } from './harness.mjs';

test('every event leaves the accounting identities intact', () => {
  for (const ev of EVENTS) {
    const w = world({ assert: true });
    advance(w, 6);
    ev.apply(w.s);
    assert.doesNotThrow(() => advance(w, 3),
      `'${ev.key}' broke an invariant. An event may only touch state that no ` +
      `rule recomputes from scratch — otherwise the shock is discarded AND ` +
      `the books stop balancing between the two.`);
  }
});

test('every event actually changes something that survives the tick', () => {
  const watched = ['supply_shock', 'net_exports', 'asset_prices', 'credit_spread',
    'bank_capital_ratio', 'consumer_confidence', 'approval', 'tfp', 'crisis_active'];
  for (const ev of EVENTS) {
    const a = world(); const b = world();
    advance(a, 6); advance(b, 6);
    ev.apply(b.s);
    advance(a, 1); advance(b, 1);
    const moved = watched.filter((k) => a.s[k] !== b.s[k]);
    assert.ok(moved.length > 0,
      `'${ev.key}' left no trace one tick later — the rules overwrote it, ` +
      `which is what happened to export_slump for the model's whole life`);
  }
});

test('no event writes a pipeline target', () => {
  // Same class of bug from the other end: an event that pokes a transmitted
  // driver desynchronises it from its dial permanently.
  for (const ev of EVENTS) {
    const w = world();
    advance(w, 6);
    const before = [...PIPELINE_TARGETS].map((k) => w.s[k]);
    ev.apply(w.s);
    const after = [...PIPELINE_TARGETS].map((k) => w.s[k]);
    assert.deepEqual(after, before,
      `'${ev.key}' wrote a transmitted policy driver`);
  }
});

test('full terms with shocks on and invariants armed, across every scenario', () => {
  // The exact configuration the shipped game runs (session.js). This is the
  // test whose absence let a 38.8% crash rate ship.
  for (const [key, sc] of Object.entries(SCENARIOS)) {
    for (let seed = 1; seed <= 25; seed++) {
      const s = newState(sc.overrides);
      assert.doesNotThrow(() => run(s, 96, { seed, assertEveryTick: true }),
        `${key}, seed ${seed}`);
    }
  }
});
