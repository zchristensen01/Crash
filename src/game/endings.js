/**
 * ENDINGS — ways to lose. Data plus one checker.
 *
 * EVERY ENDING IS A SUSTAINED CONDITION, never an instantaneous trip. A game
 * that ends on a single spike teaches you to fear noise instead of trends,
 * and the prototype's instantaneous thresholds did exactly that.
 *
 * These also make the model well-behaved. Several loops in it are
 * deliberately unbalanced (parameters.py UNBALANCED_LOOPS) — the debt-service
 * spiral in particular has no brake, because the brake is meant to be YOU.
 * Left running, debt reaches Infinity around tick 73. The ending is what
 * turns that from a numerical blowup into a lesson.
 */
export const ENDINGS = [
  {
    key: 'hyperinflation',
    title: 'HYPERINFLATION',
    test: (s) => s.inflation > 25,
    months: 6,
    lesson: 'Money stopped meaning anything. Once people EXPECT high ' +
      'inflation they price it in ahead of time and it feeds itself. You ' +
      'have to break expectations early, and it always hurts to do it.',
  },
  {
    key: 'depression',
    title: 'DEPRESSION',
    test: (s) => s.unemployment > 14,
    months: 12,
    lesson: 'You squeezed demand so hard the jobs went with it. Firms fire ' +
      'in weeks and hire over quarters, so by the time you saw it you were ' +
      'already a year late.',
  },
  {
    key: 'debt_crisis',
    title: 'DEBT CRISIS',
    test: (s) => s.govt_debt > 200 && s.yield_10y > 12,
    months: 3,
    lesson: 'Nobody will lend to you any more. High debt plus high rates ' +
      'means the debt grows on its own — and raising rates to fight ' +
      'inflation makes it worse. There was no year in which this was easy ' +
      'to fix; there were several in which it was easier than now.',
  },
  {
    key: 'voted_out',
    title: 'THROWN OUT OF OFFICE',
    test: (s) => s.approval <= 5,
    months: 3,
    lesson: 'The numbers may have been recovering. People vote on how the ' +
      'last year FELT, not on your five-year plan. That constraint is real ' +
      'and it is why good policy often does not happen.',
  },
];

/**
 * Advance each ending's countdown and return the one that fired, if any.
 * @returns {{ending:Object, monthsRemaining:number}|null}
 *
 * s.ending_counters holds months-so-far per ending. A condition that breaks
 * resets its counter to zero — which is what makes the on-screen countdown
 * ("hyperinflation in 4 months") something the player can actually beat.
 */
export function checkEndings(s) {
  s.ending_counters = s.ending_counters || {};
  for (const e of ENDINGS) {
    s.ending_counters[e.key] = e.test(s) ? (s.ending_counters[e.key] || 0) + 1 : 0;
    if (s.ending_counters[e.key] >= e.months) {
      s.ending = e;
      return { ending: e, monthsRemaining: 0 };
    }
  }
  return null;
}

/** Endings whose countdown is running, for the warning panel. */
export function pendingEndings(s) {
  return ENDINGS
    .filter((e) => (s.ending_counters?.[e.key] || 0) > 0)
    .map((e) => ({ title: e.title, monthsRemaining: e.months - s.ending_counters[e.key] }));
}
