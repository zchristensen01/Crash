/**
 * APP — mounts widgets, binds keys, owns the loop.
 * Wiring only. Every number on screen comes from the model; every gauge and
 * dial is generated from the data arrays in src/game/.
 */
import { INDICATORS } from '../game/indicators.js';
import { DIALS, applyDialChange } from '../game/dials.js';
import { SCENARIOS } from '../game/scenarios.js';
import { pendingEndings } from '../game/endings.js';
import { makeClock, SPEEDS, SPEED_ORDER } from '../game/clock.js';
import { newSession, sessionTick, restartSession, calendar, TERM_MONTHS } from '../game/session.js';
import { mountGauge } from './widgets/gauge.js';
import { mountDial } from './widgets/dial.js';
import { mountPipeline } from './widgets/pipeline.js';
import { mountRegime } from './widgets/regime.js';
import { mountWhy } from './widgets/why.js';
import { drawLine, CHART_COLORS } from './chart.js';

const CHARTS = [
  { key: 'inflation', label: 'Inflation %', range: [-3, 15], marker: 2 },
  { key: 'unemployment', label: 'Unemployment %', range: [0, 18], marker: 5 },
  { key: 'credit_gap', label: 'Credit gap (pp above trend)', range: [-6, 18], marker: 9 },
];

let booted = false;

export function boot() {
  // Idempotent. The module auto-boots at the bottom, so a second call — from
  // a test, or from anything that imports this twice — would mount a whole
  // second set of gauges and dials over the first.
  if (booted) return;
  booted = true;

  const $ = (sel) => document.querySelector(sel);
  let session = newSession(undefined, 'calm');

  // ---- static chrome -------------------------------------------------
  const scenarioPicker = document.createElement('select');
  scenarioPicker.className = 'scenario-picker';
  scenarioPicker.setAttribute('aria-label', 'Scenario');
  for (const [key, sc] of Object.entries(SCENARIOS)) {
    scenarioPicker.append(new Option(sc.label, key));
  }
  $('#seed-readout').append(scenarioPicker);

  const seedLabel = document.createElement('span');
  seedLabel.className = 'seed';
  $('#seed-readout').append(seedLabel);

  const speedBox = $('#speed-controls');
  const speedButtons = SPEED_ORDER.map((name) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name === 'paused' ? '❚❚' : name;
    b.addEventListener('click', () => setSpeed(name));
    speedBox.append(b);
    return { name, el: b };
  });

  const restartBtn = document.createElement('button');
  restartBtn.type = 'button';
  restartBtn.className = 'restart';
  restartBtn.textContent = 'restart (same seed)';
  restartBtn.addEventListener('click', () => doRestart(true));
  speedBox.append(restartBtn);

  // ---- widgets -------------------------------------------------------
  const whyPanel = mountWhy($('#why-panel'), {});
  const openWhy = (ind) => { setSpeed('paused'); whyPanel.open(ind, session.trace); };

  const gauges = INDICATORS.map((indicator) => ({
    indicator,
    view: mountGauge(indicator.tier === 'watched' ? $('#watched') : $('#gauges'),
      { indicator, onOpenWhy: openWhy }),
  }));

  const dials = DIALS.map((dial) => ({
    dial,
    view: mountDial($('#dials'), {
      dial,
      onChange: (key, value) => {
        applyDialChange(session.state, session.pipeline, key, value);
        render();
      },
    }),
  }));

  const chartCanvases = CHARTS.map((c) => {
    const fig = document.createElement('figure');
    const canvas = document.createElement('canvas');
    fig.append(canvas);
    $('#charts').append(fig);
    return { ...c, canvas };
  });

  const regimeView = mountRegime($('#regime'), {});
  const pipelineView = mountPipeline($('#pipeline'), {});

  const banner = document.createElement('p');
  banner.className = 'banner';
  $('#warnings').append(banner);
  const warnBox = document.createElement('div');
  warnBox.className = 'warn-box';
  $('#warnings').append(warnBox);

  $('#keys').textContent =
    '[space] pause/play   [+ −] speed   [w] why   [r] restart same seed   ' +
    '[n] new seed   click any number for the maths behind it';

  // ---- loop ----------------------------------------------------------
  function setSpeed(name) {
    session.speed = name;
    for (const b of speedButtons) b.el.dataset.active = String(b.name === name);
  }

  function doRestart(sameSeed) {
    session = restartSession(session, { sameSeed, scenarioKey: scenarioPicker.value });
    setSpeed('paused');
    render();
  }

  scenarioPicker.addEventListener('change', () => doRestart(false));

  const clock = makeClock({
    getSpeed: () => session.speed,
    onTick: () => {
      const keepGoing = sessionTick(session);
      // Auto-pause on an event, a countdown starting, or an ending. You
      // should never lose because you blinked.
      if (!keepGoing) setSpeed('paused');
      return keepGoing;
    },
    onRender: render,
  });

  function render() {
    const s = session.state;
    const cal = calendar(s.tick);
    $('#clock-readout').textContent = `${cal.label} · ${cal.term} · month ${s.tick}/${TERM_MONTHS}`;
    seedLabel.textContent = `seed ${session.seed}`;

    for (const g of gauges) g.view.update(s, session.ghost);
    for (const d of dials) d.view.update(s);
    regimeView.update(s);
    pipelineView.update(session.pipeline.pending(s.tick));

    for (const c of chartCanvases) {
      drawLine(c.canvas, {
        values: s.history[c.key],
        ghost: session.ghost?.[c.key],
        range: c.range,
        marker: c.marker,
        label: c.label,
      });
    }

    banner.textContent = session.error
      ? `MODEL ERROR — ${session.error}`
      : session.over
        ? (session.over.kind === 'lost'
            ? `GAME OVER — ${session.over.ending.title}. ${session.message}`
            : `SURVIVED. Score ${session.scored.total}. ${describeScore(session.scored)}`)
        : session.message || '';
    banner.dataset.kind = session.error ? 'error'
      : session.over?.kind === 'lost' ? 'lost'
      : session.over ? 'won' : 'info';

    warnBox.innerHTML = '';
    for (const w of pendingEndings(s)) {
      const el = document.createElement('p');
      el.className = 'warn';
      // A countdown you can still beat, not a trapdoor.
      el.textContent = `⚠ ${w.title} in ${w.monthsRemaining} months`;
      warnBox.append(el);
    }
  }

  function describeScore(sc) {
    return Object.entries(sc.breakdown).map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`).join(', ');
  }

  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select')) return;
    const i = SPEED_ORDER.indexOf(session.speed);
    if (e.code === 'Space') { e.preventDefault(); setSpeed(session.speed === 'paused' ? '1x' : 'paused'); }
    else if (e.key === '+' || e.key === '=') setSpeed(SPEED_ORDER[Math.min(i + 1, SPEED_ORDER.length - 1)]);
    else if (e.key === '-') setSpeed(SPEED_ORDER[Math.max(i - 1, 0)]);
    else if (e.key === 'w') openWhy(INDICATORS[1]);
    else if (e.key === 'r') doRestart(true);
    else if (e.key === 'n') doRestart(false);
  });

  window.addEventListener('resize', render);
  setSpeed('paused');
  render();
  clock.start();
}

// Boot once the DOM exists. The bundle is injected at the end of <body>, so
// this is already true — but a deferred script or a future <head> move would
// break it silently otherwise.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
