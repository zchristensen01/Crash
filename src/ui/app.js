/**
 * APP — mounts widgets, binds keys, owns the loop.
 * Wiring only. Every number comes from the model; every gauge, dial, shock
 * and ending is generated from the data arrays in src/game/.
 */
import { INDICATORS } from '../game/indicators.js';
import { DIALS, applyDialChange } from '../game/dials.js';
import { SCENARIOS } from '../game/scenarios.js';
import { pendingEndings } from '../game/endings.js';
import { makeClock, SPEED_ORDER } from '../game/clock.js';
import { newSession, sessionTick, restartSession, calendar, TERM_MONTHS } from '../game/session.js';
import { define } from '../game/glossary.js';
import { installTooltips, explain } from './widgets/tooltip.js';
import { mountTransport } from './widgets/transport.js';
import { mountGauge } from './widgets/gauge.js';
import { mountDial } from './widgets/dial.js';
import { mountPipeline } from './widgets/pipeline.js';
import { mountRegime } from './widgets/regime.js';
import { mountWhy } from './widgets/why.js';
import { mountGameOver } from './widgets/gameover.js';
import { drawLine } from './chart.js';

/** Ranges are tight enough that the line uses the box, and every one names
 *  what it is measured against. */
const CHARTS = [
  { key: 'inflation', label: 'Inflation', range: [-2, 12], marker: 2,
    markerLabel: 'target', danger: { above: 6 }, fmt: (v) => `${v.toFixed(1)}%` },
  { key: 'unemployment', label: 'Unemployment', range: [0, 16], marker: 5,
    markerLabel: 'normal', danger: { above: 9 }, fmt: (v) => `${v.toFixed(1)}%` },
  { key: 'credit_gap', label: 'Credit gap', range: [-6, 16], marker: 9,
    markerLabel: 'danger', danger: { above: 9 }, fmt: (v) => `${v.toFixed(1)}pp` },
];

const PLAY_SPEEDS = SPEED_ORDER.filter((s) => s !== 'paused');

let booted = false;

export function boot() {
  // Idempotent: the module auto-boots below, so a second call would mount a
  // whole second set of gauges and dials on top of the first.
  if (booted) return;
  booted = true;

  const $ = (sel) => document.querySelector(sel);
  let session = newSession(undefined, 'calm');

  installTooltips(document.body);

  // ---- chrome --------------------------------------------------------
  function togglePlay() {
    if (session.over) return;
    session.playing = !session.playing;
    render();
  }

  const transport = mountTransport($('#transport'), {
    speeds: PLAY_SPEEDS,
    onTogglePlay: togglePlay,
    onSpeed: (name) => { session.speed = name; session.playing = true; render(); },
  });

  const scenarioPicker = document.createElement('select');
  scenarioPicker.className = 'scenario-picker';
  scenarioPicker.setAttribute('aria-label', 'Scenario');
  for (const [key, sc] of Object.entries(SCENARIOS)) scenarioPicker.append(new Option(sc.label, key));
  scenarioPicker.addEventListener('change', () => doRestart(false));
  explain(scenarioPicker, 'The situation you inherit. Each one is a different ' +
    'kind of trouble, and the obvious move is wrong in most of them.');

  const seedLabel = document.createElement('span');
  seedLabel.className = 'seed';
  explain(seedLabel, define('seed'));

  const restartBtn = document.createElement('button');
  restartBtn.type = 'button';
  restartBtn.className = 'restart';
  restartBtn.textContent = 'restart';
  restartBtn.addEventListener('click', () => doRestart(true));
  explain(restartBtn, define('ghost'));

  $('#seed-readout').append(scenarioPicker, restartBtn, seedLabel);
  explain($('#clock-readout'), define('term'));
  explain($('#watched-head'), 'These two are the reason this game exists. ' +
    'Every other gauge tells you about today; these two tell you about the ' +
    'trouble that has not arrived yet.');

  // ---- widgets -------------------------------------------------------
  const whyPanel = mountWhy($('#why-panel'), {});
  const overPanel = mountGameOver($('#over-panel'), { onRetry: (sameSeed) => doRestart(sameSeed) });

  // Opening the why panel pauses so you can read — and RESTORES the speed
  // when you close it. The first version paused and never resumed, which read
  // as the game resetting itself every time you clicked a number.
  let resumeAfterRead = false;
  const openWhy = (ind) => {
    resumeAfterRead = session.playing;
    session.playing = false;
    whyPanel.open(ind, session.trace);
    render();
  };
  $('#why-panel').addEventListener('close', () => {
    if (resumeAfterRead && !session.over) session.playing = true;
    resumeAfterRead = false;
    render();
  });

  const gauges = INDICATORS.map((indicator) => ({
    view: mountGauge(indicator.tier === 'watched' ? $('#watched') : $('#gauges'),
      { indicator, onOpenWhy: openWhy }),
  }));

  const dials = DIALS.map((dial) => ({
    view: mountDial($('#dials'), {
      dial,
      onChange: (key, value) => { applyDialChange(session.state, session.pipeline, key, value); render(); },
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

  $('#keys').textContent =
    '[space] play/pause   [1 2 3] speed   [w] why   [r] restart same world   ' +
    '[n] new world   ·   hover anything for what it means, click a number for the maths';

  // ---- loop ----------------------------------------------------------
  function doRestart(sameSeed) {
    overPanel.close();
    session = restartSession(session, { sameSeed, scenarioKey: scenarioPicker.value });
    render();
  }

  const clock = makeClock({
    getSpeed: () => (session.playing && !session.over ? session.speed : 'paused'),
    onTick: () => {
      const keepGoing = sessionTick(session);
      if (!keepGoing) {
        // Auto-pause on a shock, a countdown starting, or an ending. You
        // should never lose because you blinked.
        session.playing = false;
        if (session.over) overPanel.open(session);
      }
      return keepGoing;
    },
    onRender: render,
  });

  function render() {
    const s = session.state;
    const cal = calendar(s.tick);
    $('#clock-readout').textContent = `${cal.label} · ${cal.term}`;
    seedLabel.textContent = `world ${session.seed}`;
    transport.update(session, TERM_MONTHS);

    for (const g of gauges) g.view.update(s);
    for (const d of dials) d.view.update(s);
    regimeView.update(s);
    pipelineView.update(session.pipeline.pending(s.tick));

    for (const c of chartCanvases) {
      drawLine(c.canvas, {
        values: s.history[c.key],
        ghost: session.ghost?.[c.key],
        range: c.range, marker: c.marker, markerLabel: c.markerLabel,
        danger: c.danger, label: c.label, fmt: c.fmt,
      });
    }

    // Alerts, loudest first. Countdowns are the win/lose condition made
    // visible: a clock you can still beat, not a trapdoor.
    const alerts = $('#alerts');
    alerts.innerHTML = '';
    const add = (kind, text) => {
      const el = document.createElement('p');
      el.className = 'alert';
      el.dataset.kind = kind;
      el.textContent = text;
      alerts.append(el);
    };
    if (session.error) add('danger', `MODEL ERROR — ${session.error}`);
    for (const w of pendingEndings(s)) {
      add('danger', `⚠ ${w.title} in ${w.monthsRemaining} months — break the condition and the clock resets`);
    }
    if (s.fired_event && !session.over) add('event', `${s.fired_event.name} — ${s.fired_event.text}`);
    else if (s.tick === 0 && session.scenario) add('warn', `${session.scenario.describe}  ${session.scenario.trap}`);
  }

  window.addEventListener('keydown', (e) => {
    if (e.target.matches?.('input, select, button')) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.key >= '1' && e.key <= '3') { session.speed = PLAY_SPEEDS[Number(e.key) - 1]; session.playing = true; render(); }
    else if (e.key === 'w') openWhy(INDICATORS[1]);
    else if (e.key === 'r') doRestart(true);
    else if (e.key === 'n') doRestart(false);
  });

  window.addEventListener('resize', render);
  render();
  clock.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
