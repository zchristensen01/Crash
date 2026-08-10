/**
 * SESSION — run state, restart, seeds, ghost runs, scoring.
 */
import { newState } from '../state.js';
import { tick } from '../engine.js';
import { Trace } from '../trace.js';
import { LagPipeline } from '../lags.js';
import { makeRng, newSeed } from '../rng.js';
import { SCENARIOS } from './scenarios.js';
import { pendingEndings } from './endings.js';
import { MONTHS_PER_YEAR } from '../units.js';

/** 96 ticks = 8 years. Survive it and you're scored. */
export const TERM_MONTHS = 96;

export function newSession(seed, scenarioKey) {
  const key = scenarioKey && SCENARIOS[scenarioKey] ? scenarioKey : 'calm';
  const chosenSeed = Number.isFinite(seed) ? seed : newSeed(makeRng(Date.now() & 0x7fffffff));
  const state = newState(SCENARIOS[key].overrides);
  return {
    seed: chosenSeed,
    scenarioKey: key,
    scenario: SCENARIOS[key],
    state,
    trace: new Trace(true),
    pipeline: new LagPipeline(),
    rng: makeRng(chosenSeed),
    ghost: null,
    playing: false,
    speed: '1x',
    message: `${SCENARIOS[key].describe}  ${SCENARIOS[key].trap}`,
    error: null,
    over: null,
    scored: null,
    misery: 0,
    approvalSum: 0,
    dangerMonths: 0,
  };
}

/**
 * Advance one month and decide whether the clock should keep running.
 * @returns {boolean} false to auto-pause
 *
 * AUTO-PAUSE ON: an event firing, an ending countdown starting, and the end
 * of the term. You should never lose because you blinked.
 */
export function sessionTick(session) {
  if (session.over) return false;

  const s = session.state;
  const warnedBefore = pendingEndings(s).length;

  try {
    tick(s, session.trace, session.pipeline, session.rng, { assertEveryTick: true });
  } catch (err) {
    // Surface it and stop. A model error is worth seeing, not swallowing.
    session.error = err.message;
    return false;
  }

  session.approvalSum += s.approval;
  session.misery += Math.max(0, s.inflation - 2) + Math.max(0, s.unemployment - 5);
  if (s.credit_to_gdp_gap > 9 || s.inflation > 6 || s.unemployment > 9) session.dangerMonths += 1;

  if (s.ending) {
    session.over = { kind: 'lost', ending: s.ending };
    session.message = s.ending.lesson;
    return false;
  }
  if (s.tick >= TERM_MONTHS) {
    session.over = { kind: 'survived' };
    session.scored = scoreRun(session);
    session.message = 'You made it. Eight years, no collapse.';
    return false;
  }
  if (s.fired_event) {
    session.message = `${s.fired_event.name} — ${s.fired_event.text}`;
    return false;
  }
  if (pendingEndings(s).length > warnedBefore) return false;

  return true;
}

/**
 * Restart. Keeps the previous run's history as a GHOST unless the seed
 * changes — same seed means both runs face an identical world, so the only
 * variable is what you did. That is the entire learning mechanism.
 */
export function restartSession(session, opts) {
  const sameSeed = opts?.sameSeed !== false;
  const key = opts?.scenarioKey || session.scenarioKey;
  const seed = sameSeed ? session.seed : newSeed(session.rng);
  const next = newSession(seed, key);
  if (sameSeed && key === session.scenarioKey && session.state.tick > 6) {
    next.ghost = session.state.history;
  }
  return next;
}

/**
 * Average approval, minus time spent in danger bands, minus accumulated
 * misery. Always show the breakdown — a bare number teaches nothing.
 */
export function scoreRun(session) {
  const months = Math.max(1, session.state.tick);
  const avgApproval = session.approvalSum / months;
  const dangerPenalty = (session.dangerMonths / months) * 40;
  const miseryPenalty = (session.misery / months) * 3;
  return {
    total: Math.round(avgApproval - dangerPenalty - miseryPenalty),
    breakdown: {
      'average approval': Math.round(avgApproval),
      'months in a danger band': -Math.round(dangerPenalty),
      'accumulated misery (inflation + unemployment)': -Math.round(miseryPenalty),
    },
  };
}

/** "Mar 2028 · Yr 3" — a date reads better than a tick count. */
export function calendar(tickCount) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = Math.floor(tickCount / MONTHS_PER_YEAR);
  return {
    label: `${MONTHS[tickCount % MONTHS_PER_YEAR]} ${2028 + year}`,
    term: `Yr ${year + 1}`,
    month: tickCount,
  };
}
