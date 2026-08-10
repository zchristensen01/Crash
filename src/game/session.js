/**
 * SESSION — run state, restart, seeds, ghost runs.
 * WHO WRITES THIS: you.
 */

/**
 * @param {number} [seed] omit to generate one
 * @param {string} [scenario] key into SCENARIOS
 * @returns {Object} session
 *
 * GHOST RUNS ARE THE POINT (docs/00 §3). On restart, keep the previous run's
 * history and hand it to the charts as a faint second line. Same seed by
 * default, so the two runs face an identical world and every restart becomes
 * a controlled experiment: the only variable is what you did.
 *
 * This is the mechanism by which anyone actually learns from a failed run,
 * and it is worth more than any amount of explanatory text.
 */
export function newSession(seed, scenario) {
  throw new Error('session.newSession: not implemented');
}

/**
 * Score a survived term: average approval, minus time in each danger band,
 * minus accumulated misery. @returns {{total:number, breakdown:Object}}
 * Show the breakdown, never just the number.
 */
export function score(session) {
  throw new Error('session.score: not implemented');
}
