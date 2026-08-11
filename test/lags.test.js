/**
 * THE LAG PIPELINE ACTUALLY TRANSMITS.
 *
 * docs/07 L1: for the whole life of the model, every effect scheduled into
 * LagPipeline was overwritten by the rule that owns the field a few lines
 * later. Scheduling 1000pp of GDP into demand moved consumption and
 * investment by exactly zero. 0 of 21 kernel channels affected anything, the
 * "most important widget on screen" showed the player a queue of effects that
 * never arrived, and the monetary sign asymmetry — which is applied only on
 * that path — came out inverted as a result.
 *
 * These tests exist so that cannot come back quietly.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { newState } from '../src/state.js';
import { PIPELINE_TARGETS, DIALS } from '../src/game/dials.js';
import { world, advance, dial, nudge, compare } from './harness.mjs';

test('a dial move reaches the transmitted driver and converges to the dial', () => {
  const w = world();
  advance(w, 12);
  dial(w, 'policy_rate', 5.0);
  assert.equal(w.s.policy_rate, 5.0, 'the setting moves at once');
  assert.ok(w.s.policy_rate_demand < 2.6,
    `the economy has already felt ${w.s.policy_rate_demand} of a move made this tick`);
  advance(w, 48);
  assert.ok(Math.abs(w.s.policy_rate_demand - 5.0) < 0.01,
    `after four years the transmitted rate is ${w.s.policy_rate_demand}, not 5.0 — ` +
    `the kernel must sum to 1 and the landed amounts must survive the rules`);
});

test('markets feel a rate move faster than the real economy', () => {
  // docs/02 lists these as separate chains: assets [1m], investment [4-9m].
  const w = world();
  advance(w, 12);
  dial(w, 'policy_rate', 4.0);
  advance(w, 3);
  assert.ok(w.s.policy_rate_markets - 2.5 > (w.s.policy_rate_demand - 2.5) * 2,
    `three months in, markets have felt ${(w.s.policy_rate_markets - 2.5).toFixed(2)}pp ` +
    `and the real economy ${(w.s.policy_rate_demand - 2.5).toFixed(2)}pp — ` +
    `these should not be the same chain`);
});

test('the output response to a rate move is LAGGED, not instant', () => {
  // The lag IS the lesson. Before the fix, 24% of the eventual 12-month
  // response landed in month one and 65% by month three.
  const at = (m) => compare({ shock: (w) => nudge(w, 'policy_rate', -1), months: m }).dOutput;
  const m1 = at(1), m12 = at(12);
  assert.ok(m1 / m12 < 0.05,
    `month 1 already delivered ${(100 * m1 / m12).toFixed(0)}% of the 12-month ` +
    `response — the transmission is effectively instant`);
  assert.ok(m12 > 0.2, `12-month response is only ${m12.toFixed(3)} — nothing transmitted`);
});

test('the pipeline refuses to schedule into a field a rule owns', () => {
  const w = world();
  w.pipeline.schedule('consumption', 5, 'spending_to_output', 'probe', w.s.tick);
  assert.throws(() => advance(w, 2), /not a transmitted driver/,
    'scheduling into a rule-owned field must fail loudly, not silently vanish');
});

test('no rule assigns to a pipeline target', () => {
  // The static half of the same guarantee. A rule that writes one of these
  // clobbers the lag on the tick it lands, which is exactly the original bug
  // and is invisible in any single-tick test.
  const files = readdirSync(new URL('../src/rules/', import.meta.url))
    .filter((f) => f.endsWith('.js') && f !== 'index.js');
  for (const f of files) {
    const src = readFileSync(new URL(`../src/rules/${f}`, import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const target of PIPELINE_TARGETS) {
      assert.ok(!new RegExp(`\\bs\\.${target}\\s*(?:\\+|-|\\*|/)?=(?!=)`).test(src),
        `src/rules/${f} assigns to '${target}', which the lag pipeline writes. ` +
        `The rule will overwrite every landed effect — see docs/07 L1.`);
    }
  }
});

test('every declared pipeline target exists on a fresh state', () => {
  const s = newState();
  for (const target of PIPELINE_TARGETS) {
    assert.ok(Number.isFinite(s[target]),
      `newState() has no '${target}' — a landed effect would add to undefined`);
  }
});

test('the Taylor autopilot faces the same lags the player does', () => {
  // It used to assign s.policy_rate directly, which after the pipeline
  // redesign would mean a benchmark central bank whose decisions never reach
  // the economy at all.
  const w = world({ taylor: true, externalDemand: 3 });
  advance(w, 6);
  assert.ok(w.s.policy_rate > 2.6, 'the rule did not respond to a demand boom');
  assert.ok(w.s.policy_rate_demand < w.s.policy_rate,
    'the rule-follower is getting instant transmission the player does not get');
  // And it does catch up, once the rule stops moving. A permanent wedge here
  // would mean the transmitted rate is not a distributed lag of the dial but
  // some scaled thing that drifts — the asymmetry and the lower bound are
  // deliberately kept OUT of this path for exactly that reason.
  advance(w, 174);
  assert.ok(Math.abs(w.s.policy_rate_demand - w.s.policy_rate) < 0.1,
    `settled rule at ${w.s.policy_rate.toFixed(2)}%, economy has felt ` +
    `${w.s.policy_rate_demand.toFixed(2)}% — the transmitted rate must converge`);
});

test('every dial either schedules a lag or is documented as immediate', () => {
  const immediate = new Set(['govt_spending', 'money_printed']);
  for (const d of DIALS) {
    const w = world();
    advance(w, 6);
    const before = w.pipeline.pending(w.s.tick).length;
    nudge(w, d.key, d.key === 'tax_rate' ? 2 : d.step * 4);
    const after = w.pipeline.pending(w.s.tick).length;
    if (immediate.has(d.key)) {
      assert.equal(after, before, `${d.key} scheduled something but is meant to be immediate`);
    } else {
      assert.ok(after > before, `${d.key} queued nothing — its lag is not wired`);
    }
  }
});
