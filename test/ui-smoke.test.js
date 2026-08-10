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
const glossaryMod = await import('../src/game/glossary.js');
const restartMod = await import('../src/game/session.js');
const { newSession, sessionTick } = restartMod;
const { LagPipeline } = await import('../src/lags.js');

test('the whole UI boots without throwing', () => {
  assert.doesNotThrow(() => boot());
});

test('every shell container the app needs exists', () => {
  for (const id of ['#topbar', '#clock-readout', '#transport', '#seed-readout',
    '#gauges', '#watched', '#charts', '#regime', '#dials', '#pipeline',
    '#alerts', '#why-panel', '#over-panel', '#keys']) {
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

// --- behaviours that regressed in the first playtest -------------------

test('the game starts paused, at 1x, with play as the visible action', () => {
  const s = newSession(1, 'calm');
  assert.equal(s.playing, false, 'should start paused so you can read the situation');
  assert.equal(s.speed, '1x', 'speed should default to 1x, not to "paused"');
});

test('pausing does not throw away the chosen speed', () => {
  // The first version had one row of four buttons, so pausing meant losing
  // your speed and there was never a visible play button.
  const s = newSession(1, 'calm');
  s.speed = '10x';
  s.playing = true;
  s.playing = false;
  assert.equal(s.speed, '10x', 'speed must survive a pause');
});

test('every gauge and every dial has a plain-English definition', () => {
  const { define } = require_glossary();
  for (const ind of INDICATORS) {
    assert.ok(define(ind.label), `no glossary entry for the gauge "${ind.label}"`);
  }
  for (const d of DIALS) {
    assert.ok(define(d.label), `no glossary entry for the dial "${d.label}"`);
  }
});

test('every gauge can say whether it is getting worse', () => {
  for (const ind of INDICATORS) {
    assert.equal(typeof ind.badness, 'function', `${ind.key} has no badness()`);
    // Higher badness must mean a worse situation, or the trend arrow lies.
    const worse = ind.key === 'inflation' ? 9 : ind.key === 'approval' ? 5
      : ind.key === 'growth' ? -4 : ind.key === 'credibility' ? 0.1 : 99;
    const better = ind.key === 'inflation' ? 2 : ind.key === 'approval' ? 80
      : ind.key === 'growth' ? 3 : ind.key === 'credibility' ? 0.95 : 0;
    assert.ok(ind.badness(worse) > ind.badness(better),
      `${ind.key}: badness() does not increase as the situation deteriorates`);
  }
});

test('a passive calm run reaches the end of the term and is scored', () => {
  // "You never seem to win or lose" — the win path has to actually arrive.
  const s = newSession(40317, 'calm');
  for (let i = 0; i < 200 && !s.over; i++) sessionTick(s);
  assert.ok(s.over, 'a calm run never ended');
  assert.equal(s.over.kind, 'survived', `calm ended in ${s.over.ending?.title}`);
  assert.ok(Number.isFinite(s.scored.total), 'survived without a score');
});

test('a losing run reaches a named ending with a lesson', () => {
  const s = newSession(7, 'stagflation');
  for (let i = 0; i < 200 && !s.over; i++) sessionTick(s);
  assert.equal(s.over.kind, 'lost', 'stagflation with no policy should not survive');
  assert.ok(s.over.ending.title && s.over.ending.lesson.length > 40,
    'an ending must carry the lesson — that is the whole point of losing');
});

function require_glossary() { return glossaryMod; }
