/**
 * UI SMOKE TEST — boots the whole interface against a minimal DOM.
 *
 * This does not check that anything LOOKS right. It checks that the wiring
 * holds: every selector matches, every widget mounts, the clock ticks the
 * model, dials schedule into the lag pipeline, and the why panel finds a
 * trace entry for every gauge. Those are the failures that would otherwise
 * only show up as a blank page and a console error.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDOM } from './dom-shim.mjs';

const shell = readFileSync('src/ui/shell.html', 'utf8');
const dom = installDOM(shell);

const { boot } = await import('../src/ui/app.js');
const { INDICATORS } = await import('../src/game/indicators.js');
const { DIALS, applyDialChange } = await import('../src/game/dials.js');
const restartMod = await import('../src/game/session.js');
const { newSession, sessionTick } = restartMod;
const { LagPipeline } = await import('../src/lags.js');

test('the whole UI boots without throwing', () => {
  assert.doesNotThrow(() => boot());
});

test('every shell container the app needs exists', () => {
  for (const id of ['#topbar', '#clock-readout', '#speed-controls', '#seed-readout',
    '#gauges', '#watched', '#charts', '#regime', '#dials', '#pipeline',
    '#warnings', '#why-panel', '#keys']) {
    assert.ok(document.querySelector(id), `shell.html is missing ${id}`);
  }
});

test('a gauge mounts for every indicator', () => {
  const mounted = document.querySelector('#gauges').children.length
                + document.querySelector('#watched').children.length;
  assert.equal(mounted, INDICATORS.length);
});

test('a dial mounts for every dial', () => {
  assert.equal(document.querySelector('#dials').children.length, DIALS.length);
});

test('every gauge can open a why panel with real terms', () => {
  // A gauge whose traceKey names nothing renders an empty panel, which reads
  // as a broken feature rather than a missing one.
  const session = newSession(1, 'calm');
  sessionTick(session);
  for (const ind of INDICATORS) {
    const entry = session.trace.get(ind.traceKey);
    assert.ok(entry, `${ind.key}: no trace entry for traceKey '${ind.traceKey}'`);
    assert.ok(Object.keys(entry.terms).length > 0, `${ind.key}: trace entry has no terms`);
  }
});

test('every gauge has a history series to draw', () => {
  const session = newSession(1, 'calm');
  for (let i = 0; i < 14; i++) sessionTick(session);
  for (const ind of INDICATORS) {
    const h = session.state.history[ind.historyKey];
    assert.ok(Array.isArray(h) && h.length > 12,
      `${ind.key}: historyKey '${ind.historyKey}' has no series`);
  }
});

test('moving a dial schedules an effect instead of applying it', () => {
  // The entire point of the pipeline panel: the setting moves now, the
  // consequence lands months later.
  const session = newSession(1, 'calm');
  const before = session.state.investment;
  applyDialChange(session.state, session.pipeline, 'policy_rate', 5.0);
  assert.equal(session.state.policy_rate, 5.0, 'the dial itself should move immediately');
  assert.equal(session.state.investment, before, 'the effect must NOT land in the same tick');
  assert.ok(session.pipeline.pending(session.state.tick).length > 0,
    'nothing was queued — the lag pipeline is not wired');
});

test('a session runs a full term without throwing', () => {
  const session = newSession(40317, 'calm');
  for (let i = 0; i < 96 && !session.over; i++) sessionTick(session);
  assert.equal(session.error, null, `model error during play: ${session.error}`);
  assert.ok(session.over, 'a 96-month term should end');
});

test('restarting on the same seed keeps the previous run as a ghost', () => {
  const { restartSession } = require_restart();
  const a = newSession(777, 'calm');
  for (let i = 0; i < 12; i++) sessionTick(a);
  const b = restartSession(a, { sameSeed: true });
  assert.equal(b.seed, a.seed, 'same-seed restart changed the seed');
  assert.ok(b.ghost?.inflation?.length > 0, 'no ghost history carried over');
  assert.equal(b.state.tick, 0, 'restart did not reset the clock');
});

function require_restart() { return restartMod; }
