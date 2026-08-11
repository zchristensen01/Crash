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
import { P } from '../src/params.js';
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

test('A WOBBLE IN A STRETCHED SYSTEM IS A DIFFERENT EVENT (docs/12 M3)', () => {
  // bank_wobble was one of three shocks the player could not detect: -0.19pp
  // of output in `bubble`, -0.28pp in `calm`, and IDENTICAL at every capital
  // position, because a flat -1.0pp hit to a ratio that rebuilds toward 13%
  // never reached BANK_CAPITAL_MINIMUM and never armed the delever trigger.
  const wobble = EVENTS.find((e) => e.key === 'bank_wobble');
  const measure = (overrides, settle) => {
    const base = world({ overrides, assert: false });
    const hit = world({ overrides, assert: false });
    advance(base, settle); advance(hit, settle);
    const creditGap = hit.s.credit_to_gdp_gap;
    wobble.apply(hit.s);
    let worst = 0, minCapital = Infinity;
    for (let m = 0; m < 24; m++) {
      advance(base, 1); advance(hit, 1);
      const d = (hit.s.output - base.s.output) / base.s.output * 100;
      if (d < worst) worst = d;
      minCapital = Math.min(minCapital, hit.s.bank_capital_ratio);
    }
    return { creditGap, worst, minCapital };
  };
  const calm = measure({}, 36);
  const stretched = measure(SCENARIOS.bubble.overrides, 72);

  assert.ok(stretched.creditGap > calm.creditGap + 5, 'the two states are not different');
  assert.ok(stretched.worst < calm.worst * 2.5,
    `the same wobble cost ${calm.worst.toFixed(2)}pp in a sound system and ` +
    `${stretched.worst.toFixed(2)}pp in one with a ${stretched.creditGap.toFixed(1)}pp ` +
    `credit gap — the state-dependence IS the lesson`);
  assert.ok(calm.minCapital > P.BANK_CAPITAL_MINIMUM.value,
    'a wobble in a sound system must not arm the doom loop');
  assert.ok(stretched.minCapital < P.BANK_CAPITAL_MINIMUM.value,
    `bank capital bottomed at ${stretched.minCapital.toFixed(2)}% in a stretched ` +
    `system, above the ${P.BANK_CAPITAL_MINIMUM.value}% floor — the quantity leg of ` +
    `the doom loop still never arms`);
});

test('no event is invisible to the player', () => {
  // The standing bar. confidence_slump failed it at -0.17pp of output — and at
  // -0.34pp with CONFIDENCE_INDEP_PREDICTIVE at the TOP of its contested
  // [0, 0.2] range — so it was folded into export_slump rather than being kept
  // alive by inflating a contested coefficient (docs/12 M3). An event the
  // player cannot detect teaches that events do not matter.
  //
  // oil_shock is exempt on output and checked on inflation instead: its whole
  // point is +2.4pp of prices with output roughly flat, which is what makes it
  // the only genuinely stagflationary shock in the set.
  for (const ev of EVENTS) {
    if (ev.key === 'financial_crisis') continue;          // measured in crisis.test.js
    const overrides = (ev.key === 'bank_wobble') ? SCENARIOS.bubble.overrides : {};
    const base = world({ overrides, assert: false });
    const hit = world({ overrides, assert: false });
    advance(base, 36); advance(hit, 36);
    ev.apply(hit.s);
    let biggest = 0;
    for (let m = 0; m < 24; m++) {
      advance(base, 1); advance(hit, 1);
      const dY = Math.abs((hit.s.output - base.s.output) / base.s.output * 100);
      const dPi = Math.abs(hit.s.inflation - base.s.inflation);
      biggest = Math.max(biggest, dY, dPi);
    }
    assert.ok(biggest > 0.3,
      `${ev.key} moves output or inflation by at most ${biggest.toFixed(3)}pp over ` +
      `two years. Either give it a mechanism or delete it — do not leave a ` +
      `1-in-${(100 / ev.chance).toFixed(0)}-year event the player cannot detect.`);
  }
});
